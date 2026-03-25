import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Dimensions,
  FlatList,
  Platform,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/styles';
import LocationMap from '../components/LocationMap';
import { getSubscription, getListings, askSmartInfo, clearSubscription404Cache, getReviews, submitReview } from '../utils/api';

const TEAL = '#2DD4BF';
const GOLD = '#ffc40a';
const CARD_BG = '#252436';
const CONSTRUCTION_STATUS_STEPS = [
  { name: 'on_paper', title: 'על הנייר' },
  { name: 'beginning_of_construction', title: 'תחילת בנייה' },
  { name: 'middle_of_construction', title: 'אמצע בנייה' },
  { name: 'built', title: 'בנוי' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LAST_AD_IMAGE_HEIGHT = 280;
const SMART_BTN_SIZE = Math.floor((SCREEN_WIDTH - 48 - 10) / 2); // 2 cols, padding 24*2, gap 10

/** Bundled placeholder when specific PNGs are not in repo (add assets under /public for web). */
const bundledImg = require('../assets/image-7.png');

const isWeb = Platform.OS === 'web';
const baseUrl = isWeb && typeof window !== 'undefined' ? window.location.origin : '';
const callSource = isWeb ? { uri: `${baseUrl}/call.png` } : bundledImg;
const messageSource = isWeb ? { uri: `${baseUrl}/message.png` } : bundledImg;
const piBadgeSource = isWeb ? { uri: `${baseUrl}/pi-badge.png` } : bundledImg;

const logoPiAi = bundledImg;
const contactPhoneIconSource = isWeb && typeof window !== 'undefined' ? { uri: `${baseUrl}/conections-icons/image.png` } : bundledImg;
const contactEmailIconSource = isWeb && typeof window !== 'undefined' ? { uri: `${baseUrl}/conections-icons/image%20copy.png` } : bundledImg;
const rateButtonImageSource = isWeb && typeof window !== 'undefined' ? { uri: `${baseUrl}/starts/image.png` } : bundledImg;
const ratingStarSources = isWeb && typeof window !== 'undefined'
  ? [1, 2, 3, 4, 5].map(i => ({ uri: `${baseUrl}/starts/${i}.png` }))
  : [bundledImg, bundledImg, bundledImg, bundledImg, bundledImg];
function getStarSource(index) {
  const i = Math.min(4, Math.max(0, index));
  return ratingStarSources[i];
}
const buttonSources = isWeb
  ? [1, 2, 3, 4, 5, 6, 7, 8].map(i => ({ uri: `${baseUrl}/ai-icon-${i}.png` }))
  : [bundledImg, bundledImg, bundledImg, bundledImg, bundledImg, bundledImg, bundledImg, bundledImg];
function getFeatureIconName(key) {
  const k = key || 'area';
  const map = {
    area: 'square-outline',
    floor: 'stairs',
    elevator: 'elevator-passenger',
    mamad: 'shield-home',
    immediate: 'door-arrow-right',
    rooms: 'door-open',
    balcony: 'view-grid-outline',
    condition: 'brush',
    parking: 'car-side',
  };
  return map[k] || 'help-box-outline';
}
function getProjectOfferIconName(key) {
  const k = key === '3rooms' || key === '4rooms' || key === '5rooms' ? '3-5rooms' : (key || '3-5rooms');
  if (k === 'garden') return 'tree-outline';
  if (k === 'penthouses') return 'city-variant-outline';
  if (k === 'private') return 'home-lock-outline';
  return 'home-variant-outline';
}
const SMART_BUTTONS = [
  { label: 'תחבורה', key: 'transport' },
  { label: 'ביטחון', key: 'security' },
  { label: 'בתי ספר', key: 'schools' },
  { label: 'מטרדים', key: 'pests' },
  { label: 'מחיר ממוצע', key: 'avgprice' },
  { label: 'מוסדות', key: 'institutions' },
  { label: 'החיים בשכונה', key: 'neighborhood' },
  { label: 'מרכזי קניות', key: 'shopping' },
];

const UserProfileScreen = ({
  onClose,
  onCall,
  onMessage,
  user = null,
  currentUser = null,
  onOpenLogin = null,
  onOpenUserRegistration = null,
  onOpenAllListings = null,
}) => {
  // user = listing from feed: has creator_name, creator_email, profileImageUrl, subscription_id, owner_id (from GET /api/listings). If creator_* missing, we fetch by subscription_id (getSubscription).
  const isListingFromFeed = user && (user.images || user.price || user.address);
  const profile = !isListingFromFeed && user ? user : {
    name: 'דוד לוי תיווך בע"מ',
    email: 'davidlevi@gmail.com',
    profileImageUrl: null,
    likes: 246,
    following: 626,
    followers: 257,
  };

  // [UserProfile] Log how we resolve user details (filter console by "UserProfile" to see)
  const creatorId = user?.subscription_id || user?.owner_id;
  if (__DEV__ && isListingFromFeed && user) {
    console.log('[UserProfile] Incoming listing (user):', {
      listingId: user?.id,
      creator_name: user?.creator_name,
      creator_email: user?.creator_email,
      subscription_id: user?.subscription_id,
      owner_id: user?.owner_id,
      business_name: user?.business_name,
      name: user?.name,
      email: user?.email,
      profileImageUrl: user?.profileImageUrl != null ? '(set)' : null,
    });
  }

  // When feed didn't return creator, fetch by subscription_id / owner_id
  const [resolvedCreator, setResolvedCreator] = useState(null);
  useEffect(() => {
    setResolvedCreator(null);
  }, [user?.id, creatorId]);
  useEffect(() => {
    if (!isListingFromFeed || !creatorId) {
      if (__DEV__ && isListingFromFeed) {
        console.log('[UserProfile] Skip fetch: creatorId=', creatorId, '(no subscription_id/owner_id on listing)');
      }
      return;
    }
    // Clear 404 cache so we refetch when opening profile (e.g. get updated description)
    clearSubscription404Cache(creatorId);
    // Always fetch subscription when we have creatorId so we get types, activity_regions, description, etc. from the table
    if (__DEV__) console.log('[UserProfile] Fetching subscription for creatorId=', creatorId);
    let cancelled = false;
    getSubscription(creatorId)
      .then((data) => {
        if (cancelled || !data?.subscription) return;
        const s = data.subscription;
        const type = (s.subscription_type || '').toLowerCase();
        let name = null;
        if (type === 'company') name = s.business_name || s.name || s.contact_person_name || null;
        else if (type === 'broker') name = s.broker_office_name || s.name || s.contact_person_name || null;
        else name = s.name || s.business_name || s.contact_person_name || null;
        let activityRegions = null;
        if (s.activity_regions != null) {
          if (Array.isArray(s.activity_regions)) activityRegions = s.activity_regions;
          else if (typeof s.activity_regions === 'string') {
            try {
              const parsed = JSON.parse(s.activity_regions);
              activityRegions = Array.isArray(parsed) ? parsed : s.activity_regions.split(',').map(x => String(x).trim()).filter(Boolean);
            } catch (_) {
              activityRegions = s.activity_regions.split(',').map(x => String(x).trim()).filter(Boolean);
            }
          }
        }
        let types = null;
        if (s.types != null) {
          if (Array.isArray(s.types)) types = s.types;
          else if (typeof s.types === 'string') {
            try {
              const parsed = JSON.parse(s.types);
              types = Array.isArray(parsed) ? parsed : s.types.split(',').map(x => String(x).trim()).filter(Boolean);
            } catch (_) {
              types = s.types.split(',').map(x => String(x).trim()).filter(Boolean);
            }
          }
        }
        let specializations = null;
        if (s.specializations != null) {
          if (Array.isArray(s.specializations)) specializations = s.specializations;
          else if (typeof s.specializations === 'string') {
            try {
              const parsed = JSON.parse(s.specializations);
              specializations = Array.isArray(parsed) ? parsed : s.specializations.split(',').map(x => String(x).trim()).filter(Boolean);
            } catch (_) {
              specializations = s.specializations.split(',').map(x => String(x).trim()).filter(Boolean);
            }
          }
        }
        // description: read from subscription (same as other fields; try possible column names)
        const descVal = s.description ?? s.bio ?? s.desc ?? s.about ?? null;
        const description = (descVal != null && String(descVal).trim()) ? String(descVal).trim() : null;
        if (__DEV__) console.log('[UserProfile] getSubscription subscription keys:', Object.keys(s), 'description:', s.description, 'descVal:', descVal, 'set description:', description);
        const phones = [s.phone, s.mobile_phone, s.office_phone].filter(p => p != null && String(p).trim());
        setResolvedCreator({
          name: name || null,
          email: s.email || null,
          profilePictureUrl: s.profile_picture_url || null,
          activity_regions: activityRegions && activityRegions.length > 0 ? activityRegions : null,
          types: types && types.length > 0 ? types : null,
          specializations: specializations && specializations.length > 0 ? specializations : null,
          description: description || null,
          phones: phones.length > 0 ? phones : null,
          subscription_type: (s.subscription_type || '').toLowerCase() || null,
        });
      })
      .catch((err) => {
        if (__DEV__) console.warn('[UserProfile] getSubscription error:', err?.message || err);
      });
    return () => { cancelled = true; };
  }, [isListingFromFeed, creatorId, user?.id]);

  // Fetch this user's listings for "הנכסים שלי" section
  useEffect(() => {
    if (!creatorId) {
      setUserListings([]);
      return;
    }
    let cancelled = false;
    setUserListingsLoading(true);
    getListings({ subscription_id: creatorId })
      .then((result) => {
        if (cancelled || !result?.success) return;
        setUserListings(Array.isArray(result.listings) ? result.listings : []);
      })
      .catch(() => {
        if (!cancelled) setUserListings([]);
      })
      .finally(() => {
        if (!cancelled) setUserListingsLoading(false);
      });
    return () => { cancelled = true; };
  }, [creatorId]);

  // Fetch reviews for this profile
  useEffect(() => {
    if (!creatorId) {
      setReviews([]);
      return;
    }
    let cancelled = false;
    setReviewsLoading(true);
    getReviews(creatorId)
      .then((result) => {
        if (cancelled || !result?.success) return;
        setReviews(Array.isArray(result.reviews) ? result.reviews : []);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => { cancelled = true; };
  }, [creatorId]);

  const showAlert = (title, message) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // Display name and image for current user by subscription type (broker, company, professional, user)
  const getReviewerDisplayName = (u) => {
    if (!u) return null;
    const t = (u.subscription_type || u.subscriptionType || '').toLowerCase();
    let name = null;
    if (t === 'company') name = u.business_name || u.name || u.contact_person_name || null;
    else if (t === 'broker') name = u.broker_office_name || u.name || u.contact_person_name || null;
    else if (t === 'professional') name = u.name || u.business_name || u.contact_person_name || null;
    else name = u.name || u.contact_person_name || u.business_name || u.broker_office_name || u.creator_name || u.email || null;
    return (name && String(name).trim()) ? String(name).trim() : null;
  };
  const getReviewerImageUrl = (u) => {
    if (!u) return null;
    const url = u.profile_picture_url || u.profilePictureUrl || u.profile_image_url || u.profileImageUrl || u.company_logo_url || u.creator_profile_image_url || null;
    return (url && String(url).trim()) ? String(url).trim() : null;
  };

  const handleRate = async () => {
    console.log('[UserProfile] handleRate called', { selectedRating, creatorId, submitReviewLoading, hasCurrentUser: !!(currentUser?.id || currentUser?.email) });
    if (selectedRating < 1 || selectedRating > 5) {
      showAlert('בחר דירוג', 'נא לבחור מספר כוכבים (1–5) לפני שליחת הדירוג.');
      return;
    }
    if (!creatorId) {
      showAlert('שגיאה', 'לא ניתן לשלוח דירוג עבור פרופיל זה.');
      return;
    }
    if (!currentUser?.id && !currentUser?.email) {
      console.log('[UserProfile] handleRate: not signed in, redirect to user registration');
      const goToRegistration = onOpenUserRegistration || onOpenLogin;
      if (goToRegistration) {
        if (Platform.OS === 'web') {
          if (window.confirm('כדי לדרג ולהוסיף ביקורת יש לפתוח חשבון או להתחבר. לעבור לדף הפתיחה?')) {
            goToRegistration();
          }
        } else {
          Alert.alert('נדרשת התחברות', 'כדי לדרג ולהוסיף ביקורת יש לפתוח חשבון או להתחבר.', [
            { text: 'ביטול', style: 'cancel' },
            { text: 'פתח חשבון / התחבר', onPress: goToRegistration },
          ]);
        }
      } else {
        showAlert('נדרשת התחברות', 'כדי לדרג ולהוסיף ביקורת יש לפתוח חשבון או להתחבר.');
      }
      return;
    }
    const reviewerName = getReviewerDisplayName(currentUser);
    const reviewerImageUrl = getReviewerImageUrl(currentUser);
    const rawId = (currentUser?.id && String(currentUser.id).trim()) ? String(currentUser.id).trim() : null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const reviewerSubscriptionId = rawId && uuidRegex.test(rawId) ? rawId : null;
    console.log('[UserProfile] handleRate: calling submitReview');
    setSubmitReviewLoading(true);
    try {
      const result = await submitReview(creatorId, selectedRating, reviewComment, reviewerName, reviewerImageUrl, reviewerSubscriptionId);
      console.log('[UserProfile] submitReview result', result);
      setSubmitReviewLoading(false);
      if (result.success) {
        setReviewComment('');
        setSelectedRating(0);
        const refetch = await getReviews(creatorId);
        if (refetch.success && Array.isArray(refetch.reviews)) setReviews(refetch.reviews);
        showAlert('נשלח', 'הדירוג נשלח בהצלחה.');
      } else {
        showAlert('שגיאה', result.error || 'לא ניתן לשלוח דירוג. נסה שוב.');
      }
    } catch (err) {
      console.log('[UserProfile] submitReview error', err);
      setSubmitReviewLoading(false);
      showAlert('שגיאה', err?.message || 'לא ניתן לשלוח דירוג. נסה שוב.');
    }
  };

  const formatReviewDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (_) { return ''; }
  };

  // Treat placeholder creator (מתווך / broker-placeholder@...) as missing – show "משתמש", hide email
  const isPlaceholderCreator = (name, email) => {
    const n = (name && String(name).trim()) || '';
    const e = (email && String(email).trim()) || '';
    return (n === 'מתווך' && (e === 'broker-placeholder@example.com' || e.includes('placeholder'))) || e.includes('@placeholder.local');
  };
  const rawNameFromSource = user?.business_name || user?.creator_name || user?.name || user?.agent_name || user?.contact_person_name || user?.broker_office_name || resolvedCreator?.name || (isListingFromFeed ? '' : profile.name);
  const rawEmailFromSource = user?.creator_email || user?.email || resolvedCreator?.email || (isListingFromFeed ? '' : profile.email);
  const rawName = isPlaceholderCreator(rawNameFromSource, rawEmailFromSource) ? (isListingFromFeed ? '' : rawNameFromSource) : rawNameFromSource;
  const rawEmail = isPlaceholderCreator(rawNameFromSource, rawEmailFromSource) ? (isListingFromFeed ? '' : rawEmailFromSource) : rawEmailFromSource;
  const displayName = rawName && String(rawName).trim() ? String(rawName).trim() : (isListingFromFeed ? 'משתמש' : profile.name);
  const displayEmail = rawEmail && String(rawEmail).trim() ? String(rawEmail).trim() : (isListingFromFeed ? null : profile.email);
  const displayImage = user?.profileImageUrl || user?.profile_image_url || user?.creator_profile_image_url || resolvedCreator?.profilePictureUrl || profile.profileImageUrl;
  const contactPhones = resolvedCreator?.phones && resolvedCreator.phones.length > 0 ? resolvedCreator.phones : [];
  const contactEmail = displayEmail;

  const copyContactDetails = () => {
    const lines = [...contactPhones, contactEmail].filter(Boolean);
    const text = lines.join('\n');
    if (!text) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      Alert.alert('הועתק', 'פרטי ההתקשרות הועתקו ללוח');
    } else {
      Alert.alert('פרטי התקשרות', text);
    }
  };

  if (__DEV__ && isListingFromFeed) {
    console.log('[UserProfile] Resolved display:', { rawName, rawEmail, displayName, displayEmail: displayEmail ?? '(hidden)' });
  }

  // Last ad: when opened from feed, the current listing is the "last ad"; else prefer first full listing from userListings (has project_offers), then profile.properties[0]
  const lastAd = (() => {
    if (isListingFromFeed) return user;
    if (userListings.length > 0) {
      const L = userListings[0];
      const images = (L.listing_images && L.listing_images.length > 0)
        ? L.listing_images.map(img => (img && typeof img === 'object' && img.image_url ? { uri: img.image_url } : typeof img === 'string' ? { uri: img } : img))
        : (L.images && L.images.length > 0 ? L.images : []);
      return { ...L, images };
    }
    if (profile.properties && profile.properties[0]) {
      const p = profile.properties[0];
      return {
        images: p.image ? [{ uri: p.image }] : [],
        price: p.price,
        address: p.address,
        purpose: p.status || 'להשכרה',
        description: '',
        creator_name: displayName,
        profileImageUrl: displayImage,
      };
    }
    return null;
  })();

  const lastAdImages = (() => {
    if (!lastAd) return [];
    if (lastAd.images && lastAd.images.length > 0) return lastAd.images.map(img => (typeof img === 'string' ? { uri: img } : img));
    if (lastAd.listing_images && lastAd.listing_images.length > 0) return lastAd.listing_images.map(img => (img && typeof img === 'object' && img.image_url ? { uri: img.image_url } : typeof img === 'string' ? { uri: img } : img));
    return [];
  })();
  const [lastAdImageIndex, setLastAdImageIndex] = useState(0);
  const lastAdCarouselRef = useRef(null);
  const lastAdCardWidth = SCREEN_WIDTH;
  const [smartInfoText, setSmartInfoText] = useState('');
  const [smartInfoLoading, setSmartInfoLoading] = useState(false);
  const adAddress = lastAd?.address || lastAd?.location || '';
  const [userListings, setUserListings] = useState([]);
  const [userListingsLoading, setUserListingsLoading] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [submitReviewLoading, setSubmitReviewLoading] = useState(false);

  const likesCount = user?.like_count ?? profile.likes ?? 0;
  const followersCount = profile.followers ?? 257;
  const followingCount = profile.following ?? 626;

  // Broker profile card data (real user details with fallbacks)
  const brokerProfession = user?.profession ?? user?.title ?? profile.profession ?? 'מתווך נדל״ן';
  const brokerAddress = user?.address ?? user?.location ?? lastAd?.address ?? lastAd?.location ?? profile.address ?? 'אבן גבירול 104, תל אביב';
  const profileSubscriptionType = (resolvedCreator?.subscription_type || user?.subscription_type || '').toLowerCase();
  const isCompany = profileSubscriptionType === 'company';
  const isBroker = profileSubscriptionType === 'broker';
  const firstListingWithGeneral = userListings.find(l => l.general_details && typeof l.general_details === 'object');
  const gd = firstListingWithGeneral?.general_details;
  const companyBuildingCount = gd?.building_count != null ? Number(gd.building_count) : 0;
  const companyFloorCount = gd?.floor_count != null ? Number(gd.floor_count) : 0;
  const companyApartmentCount = gd?.apartment_count != null ? Number(gd.apartment_count) : 0;
  const specialtiesRaw = user?.creator_specialties ?? user?.specialties ?? user?.specialties_list ?? resolvedCreator?.specializations ?? profile.specialties;
  const brokerSpecialties = Array.isArray(specialtiesRaw)
    ? specialtiesRaw
    : typeof specialtiesRaw === 'string'
      ? specialtiesRaw.split(',').map(s => s.trim()).filter(Boolean)
      : [];
  const activityRegionsRaw = user?.creator_activity_regions ?? user?.activity_regions ?? resolvedCreator?.activity_regions ?? profile?.activity_regions;
  const activityRegions = Array.isArray(activityRegionsRaw)
    ? activityRegionsRaw
    : typeof activityRegionsRaw === 'string'
      ? (() => { try { const p = JSON.parse(activityRegionsRaw); return Array.isArray(p) ? p : activityRegionsRaw.split(',').map(s => s.trim()).filter(Boolean); } catch (_) { return activityRegionsRaw.split(',').map(s => s.trim()).filter(Boolean); } })()
      : [];
  // התמחויות: use types from table (creator_types / types) instead of activity_regions
  const typesRaw = user?.creator_types ?? user?.types ?? resolvedCreator?.types ?? profile?.types;
  const typesArray = Array.isArray(typesRaw)
    ? typesRaw
    : typeof typesRaw === 'string'
      ? (() => { try { const p = JSON.parse(typesRaw); return Array.isArray(p) ? p : typesRaw.split(',').map(s => s.trim()).filter(Boolean); } catch (_) { return typesRaw.split(',').map(s => s.trim()).filter(Boolean); } })()
      : [];
  const brokerBioRaw = user?.creator_bio ?? user?.bio ?? user?.creator_description ?? resolvedCreator?.description ?? resolvedCreator?.bio ?? profile?.bio ?? profile?.description ?? null;
  const brokerBioTrimmed = brokerBioRaw != null ? String(brokerBioRaw).trim() : '';
  // Show whatever is stored (even if it's the broker name – DB may have name in description field)
  const brokerBio = brokerBioTrimmed || null;
  if (__DEV__) console.log('[UserProfile] description/bio:', { 'user.creator_bio': user?.creator_bio, 'resolvedCreator?.description': resolvedCreator?.description, brokerBioRaw, brokerBio });
  const brokerPiRating = user?.pi_value ?? lastAd?.pi_value ?? profile?.pi_value ?? 5;

  // Average of star ratings from reviews (1–5); fallback to brokerPiRating when no reviews
  const displayPiRating = React.useMemo(() => {
    if (!reviews || reviews.length === 0) return brokerPiRating;
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const avg = sum / reviews.length;
    return Math.round(avg * 10) / 10; // 1 decimal (e.g. 4.3)
  }, [reviews, brokerPiRating]);

  // Filter out display name from tags so it doesn't appear as a specialty/region
  const tagLabel = (s) => (typeof s === 'string' ? s : (s?.label ?? s?.name ?? String(s))).trim();
  const filteredActivityRegions = (activityRegions.length > 0 ? activityRegions : brokerSpecialties).filter(s => tagLabel(s) !== displayName);
  const filteredSpecialties = (activityRegions.length > 0 ? activityRegions : brokerSpecialties).filter(s => tagLabel(s) !== displayName);
  // For overlay התמחויות: prefer types from table; fallback to activity_regions, then specializations (so something shows even if types column is missing or empty)
  const overlaySource = typesArray.length > 0 ? typesArray : activityRegions.length > 0 ? activityRegions : brokerSpecialties;
  const overlayActivityRegions = overlaySource.filter(s => tagLabel(s) !== displayName);
  if (__DEV__) {
    console.log('[UserProfile] התמחויות:', {
      types: { fromListing: user?.creator_types ?? user?.types, fromResolved: resolvedCreator?.types, typesArray },
      activity_regions: { fromResolved: resolvedCreator?.activity_regions, parsed: activityRegions },
      specializations: { fromResolved: resolvedCreator?.specializations, brokerSpecialties },
      used: overlayActivityRegions.length ? (typesArray.length ? 'types' : activityRegions.length ? 'activity_regions' : 'specializations') : 'none',
      overlayActivityRegions,
    });
  }

  // Always show 9 property features in design order; use "ללא [field name]" when no data.
  const adFeatures = React.useMemo(() => {
    if (!lastAd) return [];
    const am = lastAd.amenities && typeof lastAd.amenities === 'object' ? lastAd.amenities : null;
    const r = lastAd.rooms != null && lastAd.rooms !== '' ? Number(lastAd.rooms) : null;
    const a = lastAd.area != null && lastAd.area !== '' ? Number(lastAd.area) : null;
    const f = lastAd.floor != null && lastAd.floor !== '' ? Number(lastAd.floor) : null;
    const cond = lastAd.condition && String(lastAd.condition).trim();
    const condLabel = cond ? (cond === 'renovated' || cond === 'משופץ' ? 'משופץ' : cond === 'new' || cond === 'חדש' ? 'חדש' : cond === 'old' || cond === 'ישן' ? 'ישן' : cond) : null;
    const parking = am ? (am.parking ?? am.parking_spaces) : null;
    return [
      { iconKey: 'rooms', label: r != null && !isNaN(r) ? `${r} חדרים` : 'ללא חדרים' },
      { iconKey: 'area', label: a != null && !isNaN(a) ? `${a} מ"ר` : 'ללא מ"ר' },
      { iconKey: 'balcony', label: am && (am.balcony || am.mirpeset) ? 'מרפסת' : 'ללא מרפסת' },
      { iconKey: 'floor', label: f != null && !isNaN(f) ? `קומה ${f}` : 'ללא קומה' },
      { iconKey: 'parking', label: parking != null ? (typeof parking === 'number' ? `חנייה ${parking}` : 'חנייה') : 'ללא חנייה' },
      { iconKey: 'elevator', label: am && (am.elevator || am.maala) ? 'מעלית' : 'ללא מעלית' },
      { iconKey: 'condition', label: condLabel || 'ללא מצב' },
      { iconKey: 'mamad', label: am && (am.mamad || am.mamad_room) ? 'ממ"ד' : 'ללא ממ"ד' },
      { iconKey: 'immediate', label: am && (am.immediate_entry || am.entry_immediate) ? 'כניסה מיידית' : 'ללא כניסה מיידית' },
    ];
  }, [lastAd]);

  const projectOffersCards = React.useMemo(() => {
    if (!isCompany || !lastAd) return [];
    const raw = lastAd.project_offers ?? lastAd.projectOffers;
    const po = raw && typeof raw === 'object' ? raw : {};
    const n = (v) => (v != null && !isNaN(Number(v)) ? Number(v) : null);
    const allCards = [
      { key: '3rooms', title: '3 חדרים', iconKey: '3-5rooms', area: n(po.rooms_3_area), price: n(po.rooms_3_price), rooms: null },
      { key: '4rooms', title: '4 חדרים', iconKey: '3-5rooms', area: n(po.rooms_4_area), price: n(po.rooms_4_price), rooms: null },
      { key: '5rooms', title: '5 חדרים', iconKey: '3-5rooms', area: n(po.rooms_5_area), price: n(po.rooms_5_price), rooms: null },
      { key: 'garden', title: 'דירות גן', iconKey: 'garden', area: n(po.garden_area), price: n(po.garden_price), rooms: n(po.garden_rooms) },
      { key: 'penthouses', title: 'נטהאוזים', iconKey: 'penthouses', area: n(po.penthouse_area), price: n(po.penthouse_price), rooms: n(po.penthouse_rooms) },
      { key: 'private', title: 'בתים פרטיים', iconKey: 'private', area: n(po.private_area), price: n(po.private_price), rooms: n(po.private_rooms) },
    ];
    const hasValue = (c) => (c.area != null && c.area > 0) || (c.price != null && c.price > 0) || (c.rooms != null && c.rooms > 0);
    return allCards.filter(hasValue);
  }, [isCompany, lastAd]);

  useEffect(() => {
    if (lastAdImages.length <= 1) return;
    const t = setInterval(() => {
      setLastAdImageIndex(prev => {
        const next = (prev + 1) % lastAdImages.length;
        lastAdCarouselRef.current?.scrollToOffset({ offset: next * lastAdCardWidth, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [lastAdImages.length, lastAdCardWidth]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileBlock}>
          <View style={styles.avatarWrap}>
            {displayImage ? (
              <Image source={{ uri: displayImage }} style={styles.avatar} resizeMode="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <MaterialCommunityIcons name="account" size={48} color="rgba(255,255,255,0.6)" />
              </View>
            )}
            <View style={styles.avatarBadge}>
              <MaterialCommunityIcons name="plus" size={16} color="#000" />
            </View>
          </View>
          <View style={styles.nameAndStatsRow}>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{String(likesCount)}</Text>
                <Text style={styles.statLabel}>לייקים</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{String(followersCount)}</Text>
                <Text style={styles.statLabel}>עוקבים</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{String(followingCount)}</Text>
                <Text style={styles.statLabel}>עוקב</Text>
              </View>
            </View>
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          {displayEmail != null && displayEmail !== '' ? (
            <Text style={styles.userEmail}>{displayEmail}</Text>
          ) : null}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => typeof onCall === 'function' && onCall()} activeOpacity={0.8} style={styles.actionBtnTouch}>
            <Image source={callSource} style={styles.actionBtnImage} resizeMode="contain" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (!currentUser && typeof onOpenUserRegistration === 'function') {
                onOpenUserRegistration();
              } else if (typeof onMessage === 'function') {
                onMessage();
              }
            }}
            activeOpacity={0.8}
            style={styles.actionBtnTouch}
          >
            <Image source={messageSource} style={styles.actionBtnImage} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        {/* Last ad card - full width, no bubble */}
        {lastAd && (
          <View style={styles.lastAdCard}>
            <View style={styles.lastAdImageWrap}>
              {lastAdImages.length > 0 ? (
                <>
                  <FlatList
                    ref={lastAdCarouselRef}
                    data={lastAdImages}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={e => {
                      const i = Math.round(e.nativeEvent.contentOffset.x / lastAdCardWidth);
                      setLastAdImageIndex(i);
                    }}
                    renderItem={({ item }) => (
                      <Image source={item} style={[styles.lastAdImage, { width: lastAdCardWidth }]} resizeMode="cover" />
                    )}
                    keyExtractor={(_, i) => String(i)}
                  />
                  {lastAdImages.length > 1 && (
                    <View style={styles.lastAdDots}>
                      {lastAdImages.slice(0, 5).map((_, i) => (
                        <View
                          key={i}
                          style={[styles.lastAdDot, i === lastAdImageIndex && styles.lastAdDotActive]}
                        />
                      ))}
                    </View>
                  )}
                  <View style={styles.lastAdExpandWrap}>
                    <MaterialCommunityIcons name="arrow-expand" size={20} color="#fff" />
                  </View>
                </>
              ) : (
                <View style={[styles.lastAdImage, styles.lastAdImagePlaceholder]}>
                  <MaterialCommunityIcons name="image-outline" size={64} color="rgba(255,255,255,0.3)" />
                </View>
              )}
            </View>

            <View style={styles.lastAdBody}>
              <View style={styles.lastAdPiAndPurposeRow}>
                <View style={styles.lastAdPiBadge}>
                  <Image source={piBadgeSource} style={styles.lastAdPiBadgeImage} resizeMode="contain" />
                  <Text style={styles.lastAdPiText}>{String(displayPiRating)}</Text>
                </View>
                <View style={styles.lastAdPurposeTag}>
                  <Text style={styles.lastAdPurposeText}>{lastAd.purpose || 'להשכרה'}</Text>
                </View>
              </View>
              <View style={styles.lastAdPriceRow}>
                <Text style={styles.lastAdPrice}>{lastAd.price || '₪5,000'}</Text>
              </View>
              <View style={styles.lastAdLocationRow}>
                <MaterialCommunityIcons name="map-marker" size={18} color="rgba(255,255,255,0.9)" />
                <Text style={styles.lastAdLocationText}>{lastAd.address || lastAd.location || 'תל אביב, אבן גבירול 104'}</Text>
              </View>
              {isCompany && (
                <View style={styles.companyStatsRow}>
                  <View style={styles.companyStatItem}>
                    <MaterialCommunityIcons name="office-building-outline" size={22} color={GOLD} style={styles.companyStatIconImage} />
                    <Text style={styles.companyStatText}>{companyBuildingCount} בניין</Text>
                  </View>
                  <View style={styles.companyStatItem}>
                    <MaterialCommunityIcons name="stairs" size={22} color={GOLD} style={styles.companyStatIconImage} />
                    <Text style={styles.companyStatText}>{companyFloorCount} קומות</Text>
                  </View>
                  <View style={styles.companyStatItem}>
                    <MaterialCommunityIcons name="door-open" size={22} color={GOLD} style={styles.companyStatIconImage} />
                    <Text style={styles.companyStatText}>{companyApartmentCount} דירות</Text>
                  </View>
                </View>
              )}
              <View style={styles.lastAdPostedBy}>
                <Text style={styles.lastAdPostedByLabel}>פורסם ע"י</Text>
                <View style={styles.lastAdPostedByRow}>
                  <Text style={styles.lastAdPostedByName}>{displayName}</Text>
                  {(lastAd.profileImageUrl || displayImage) ? (
                    <Image source={{ uri: lastAd.profileImageUrl || displayImage }} style={styles.lastAdPostedByAvatar} resizeMode="cover" />
                  ) : (
                    <View style={[styles.lastAdPostedByAvatar, styles.lastAdPostedByAvatarPlaceholder]}>
                      <MaterialCommunityIcons name="account" size={14} color="#fff" />
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.lastAdDescription} numberOfLines={6}>
                {lastAd.description || 'דירה מרווחת ומוארת בלב תל אביב. קרובה למרכזי בילוי, תחבורה ציבורית ופארקים. משופצת מהיסוד עם חומרים איכותיים. הזדמנות שלא תחזור!'}
              </Text>
              <View style={styles.lastAdDivider} />
              {isBroker ? (
                <>
                  <View style={styles.lastAdFeaturesGrid}>
                    {adFeatures.map((item, index) => (
                      <View key={`feat-${item.iconKey}-${index}`} style={styles.lastAdFeatureChip}>
                        <MaterialCommunityIcons name={getFeatureIconName(item.iconKey)} size={22} color={GOLD} style={styles.lastAdFeatureChipIcon} />
                        <Text style={styles.lastAdFeatureLabel}>{item.label}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.lastAdDividerWhite} />
                  {lastAd && (lastAd.address || lastAd.location) ? (
                    <LocationMap
                      address={lastAd.address || lastAd.location}
                      containerStyle={styles.locationMapContainer}
                    />
                  ) : null}
                </>
              ) : isCompany && projectOffersCards.length > 0 ? (
                <>
                  <View style={styles.projectOffersSection}>
                    <Text style={styles.projectOffersTitle}>הפרויקט מציע</Text>
                    {projectOffersCards.map((card) => {
                      const areaStr = card.area != null ? `גודל: ${card.area} מ"ר` : 'גודל: —';
                      const priceStr = card.price != null ? `החל מ-${Number(card.price).toLocaleString('he-IL')}₪` : null;
                      const roomsStr = card.rooms != null ? `מס' חדרים: ${card.rooms}` : null;
                      const isSimple = card.rooms == null;
                      const detailsLine = isSimple
                        ? `${areaStr} | ${priceStr || 'החל מ-—₪'}`
                        : [areaStr, roomsStr].filter(Boolean).join(' | ');
                      return (
                        <View key={card.key} style={styles.projectOfferCard}>
                          <View style={styles.projectOfferCardHeader}>
                            <MaterialCommunityIcons name={getProjectOfferIconName(card.iconKey)} size={28} color={GOLD} style={styles.projectOfferCardIcon} />
                            <Text style={styles.projectOfferCardTitle}>{card.title}</Text>
                          </View>
                          <Text style={styles.projectOfferCardDetails}>{detailsLine}</Text>
                          {!isSimple && <Text style={styles.projectOfferCardPrice}>{priceStr || 'החל מ-—₪'}</Text>}
                        </View>
                      );
                    })}
                  </View>
                  <View style={styles.lastAdDividerWhite} />
                  <View style={styles.constructionStatusBlock}>
                    <Text style={styles.constructionStatusTitle}>מצב בנייה</Text>
                    <View style={styles.constructionStatusRow}>
                      {CONSTRUCTION_STATUS_STEPS.map((step, index) => {
                        const status = (lastAd?.construction_status ?? '').toString().toLowerCase();
                        const isSelected = status === (step.name || '').toLowerCase();
                        const isNotLast = index < CONSTRUCTION_STATUS_STEPS.length - 1;
                        return (
                          <React.Fragment key={step.name}>
                            <View style={styles.constructionStatusStep}>
                              <View style={[styles.constructionStatusCircle, isSelected && styles.constructionStatusCircleActive]}>
                                {isSelected ? (
                                  <MaterialCommunityIcons name="check" size={12} color={GOLD} />
                                ) : null}
                              </View>
                              <Text style={[styles.constructionStatusLabel, isSelected && styles.constructionStatusLabelActive]}>{step.title}</Text>
                            </View>
                            {isNotLast ? <View style={styles.constructionStatusDottedLine} /> : null}
                          </React.Fragment>
                        );
                      })}
                    </View>
                  </View>
                  {lastAd && (lastAd.address || lastAd.location) ? (
                    <LocationMap
                      address={lastAd.address || lastAd.location}
                      containerStyle={styles.locationMapContainer}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  {isCompany ? (
                    <>
                      <View style={styles.constructionStatusBlock}>
                        <Text style={styles.constructionStatusTitle}>מצב בנייה</Text>
                        <View style={styles.constructionStatusRow}>
                          {CONSTRUCTION_STATUS_STEPS.map((step, index) => {
                            const status = (lastAd?.construction_status ?? '').toString().toLowerCase();
                            const isSelected = status === (step.name || '').toLowerCase();
                            const isNotLast = index < CONSTRUCTION_STATUS_STEPS.length - 1;
                            return (
                              <React.Fragment key={step.name}>
                                <View style={styles.constructionStatusStep}>
                                  <View style={[styles.constructionStatusCircle, isSelected && styles.constructionStatusCircleActive]}>
                                    {isSelected ? (
                                      <MaterialCommunityIcons name="check" size={12} color={GOLD} />
                                    ) : null}
                                  </View>
                                  <Text style={[styles.constructionStatusLabel, isSelected && styles.constructionStatusLabelActive]}>{step.title}</Text>
                                </View>
                                {isNotLast ? <View style={styles.constructionStatusDottedLine} /> : null}
                              </React.Fragment>
                            );
                          })}
                        </View>
                      </View>
                      <View style={styles.lastAdDividerWhite} />
                    </>
                  ) : null}
                  {lastAd && (lastAd.address || lastAd.location) ? (
                    <LocationMap
                      address={lastAd.address || lastAd.location}
                      containerStyle={styles.locationMapContainer}
                    />
                  ) : null}
                  <View style={styles.lastAdDividerWhite} />
                  <View style={styles.lastAdFeaturesGrid}>
                    {adFeatures.map((item, index) => (
                      <View key={`feat-${item.iconKey}-${index}`} style={styles.lastAdFeatureChip}>
                        <MaterialCommunityIcons name={getFeatureIconName(item.iconKey)} size={22} color={GOLD} style={styles.lastAdFeatureChipIcon} />
                        <Text style={styles.lastAdFeatureLabel}>{item.label}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
              {!isBroker && !isCompany ? <View style={styles.lastAdDividerWhite} /> : null}
            </View>
          </View>
        )}

        <View style={styles.profileDivider} />
        {/* PiAi smart info at bottom: logo, intro text, 8 buttons (PNGs from ai except image.png) */}
        <View style={styles.smartInfoBlock}>
          <Image source={logoPiAi} style={styles.smartInfoLogo} resizeMode="contain" />
          <Text style={styles.smartInfoIntro}>קבל מידע חכם על סביבת הנכס בלחיצת כפתור</Text>
          <View style={styles.smartInfoGrid}>
            {SMART_BUTTONS.map((item, index) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.smartInfoBtn, smartInfoLoading && styles.smartInfoBtnDisabled]}
                onPress={async () => {
                  if (smartInfoLoading) return;
                  setSmartInfoLoading(true);
                  setSmartInfoText('');
                  const result = await askSmartInfo(item.key, item.label, adAddress);
                  setSmartInfoLoading(false);
                  if (result.success && result.text) setSmartInfoText(result.text);
                  else if (result.text) setSmartInfoText(result.text);
                }}
                activeOpacity={0.8}
                disabled={smartInfoLoading}
              >
                <Text style={styles.smartInfoBtnLabel}>{item.label}</Text>
                <Image source={buttonSources[index]} style={styles.smartInfoBtnIcon} resizeMode="contain" />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            nativeID="smartInfoTextEntry"
            style={styles.smartInfoTextEntry}
            value={smartInfoText}
            onChangeText={setSmartInfoText}
            placeholder=""
            placeholderTextColor="rgba(255,255,255,0.4)"
            multiline
            editable={false}
          />
        </View>

        {/* Broker block + My Properties – same scroll as whole screen */}
        <View style={styles.brokerCardOverlayLine} />
        <View style={styles.brokerCardBottom}>
          {!isCompany ? (
            <>
              <View style={styles.brokerCardBottomHeader}>
                <View style={styles.brokerCardBottomNameBlock}>
                  <Text style={styles.brokerCardBottomName}>{displayName}</Text>
                  <View style={styles.brokerCardBottomLocation}>
                    <MaterialCommunityIcons name="map-marker" size={16} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.brokerCardBottomAddress}>{brokerAddress}</Text>
                  </View>
                </View>
                <View style={styles.brokerCardBottomPiWrap}>
                  <Image source={piBadgeSource} style={styles.brokerCardBottomPiImage} resizeMode="contain" />
                  <Text style={styles.brokerCardBottomPiValue}>{String(displayPiRating)}</Text>
                </View>
              </View>
              <Text style={styles.brokerCardBottomSectionTitle}>התמחויות</Text>
              <View style={styles.brokerCardBottomTags}>
                {overlayActivityRegions.length > 0 ? overlayActivityRegions.map((s, i) => (
                  <View key={i} style={styles.brokerCardBottomTag}>
                    <Text style={styles.brokerCardBottomTagText}>{typeof s === 'string' ? s : (s?.label ?? s?.name ?? String(s))}</Text>
                  </View>
                )) : (
                  <Text style={styles.brokerCardBottomTagEmpty}>אין התמחויות</Text>
                )}
              </View>
            </>
          ) : null}
          {isCompany ? (
            <Text style={styles.brokerCardBottomSectionTitle}>אודות החברה</Text>
          ) : null}
          <Text style={styles.brokerCardBottomBio}>{brokerBio && String(brokerBio).trim() ? brokerBio : 'אין תיאור'}</Text>
          <View style={styles.brokerCardBottomDivider} />
        </View>

        <View style={styles.myPropertiesSection}>
          <View style={styles.myPropertiesHeader}>
            <Text style={styles.myPropertiesTitle}>הנכסים שלי</Text>
            <TouchableOpacity
              onPress={() => typeof onOpenAllListings === 'function' && creatorId ? onOpenAllListings(creatorId) : undefined}
              activeOpacity={0.7}
              style={styles.myPropertiesSeeAll}
            >
              <Text style={styles.myPropertiesSeeAllText}>לכל הנכסים שלי</Text>
            </TouchableOpacity>
          </View>
          {userListingsLoading ? (
            <View style={styles.myPropertiesListPlaceholder}>
              <Text style={styles.myPropertiesPlaceholderText}>טוען...</Text>
            </View>
          ) : userListings.length === 0 ? (
            <View style={styles.myPropertiesListPlaceholder}>
              <Text style={styles.myPropertiesPlaceholderText}>אין נכסים להצגה</Text>
            </View>
          ) : (
            <FlatList
              data={userListings}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.myPropertiesFlatList}
              contentContainerStyle={[styles.myPropertiesListContent, styles.myPropertiesListContentRtl]}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => {
                const imgs = item.listing_images || [];
                const firstImg = imgs[0]?.image_url;
                const purposeRaw = item.purpose || item.search_purpose || '';
                const purposeLabel = purposeRaw === 'sale' || String(purposeRaw).toLowerCase() === 'sale' || purposeRaw === 'מכירה' ? 'למכירה' : 'להשכרה';
                const priceNum = item.price != null ? Number(item.price) : null;
                const priceStr = priceNum != null && !isNaN(priceNum) ? `₪${Math.round(priceNum).toLocaleString('he-IL')}` : '—';
                const location = (item.address || item.land_address || item.search_address || '').trim() || '—';
                return (
                  <View style={styles.myPropertiesCard}>
                    <View style={styles.myPropertiesCardImageWrap}>
                      {firstImg ? (
                        <Image source={{ uri: firstImg }} style={styles.myPropertiesCardImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.myPropertiesCardImage, styles.myPropertiesCardImagePlaceholder]}>
                          <MaterialCommunityIcons name="image-outline" size={40} color="rgba(255,255,255,0.4)" />
                        </View>
                      )}
                      <View style={styles.myPropertiesCardBadge}>
                        <Text style={styles.myPropertiesCardBadgeText}>{purposeLabel}</Text>
                      </View>
                    </View>
                    <View style={styles.myPropertiesCardBottom}>
                      <Text style={styles.myPropertiesCardPrice}>{priceStr}</Text>
                      <Text style={styles.myPropertiesCardLocation} numberOfLines={1}>{location}</Text>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>

        {/* Contact Details – פרטי התקשרות */}
        <View style={styles.contactDetailsDivider} />
        <View style={styles.contactDetailsSection}>
          <Text style={styles.contactDetailsTitle}>פרטי התקשרות</Text>
          <View style={styles.contactDetailsContent}>
            <View style={styles.contactDetailsRight}>
              <View style={styles.contactDetailsLogoWrap}>
                {displayImage ? (
                  <Image source={{ uri: displayImage }} style={styles.contactDetailsLogo} resizeMode="cover" />
                ) : (
                  <View style={styles.contactDetailsLogoPlaceholder}>
                    <MaterialCommunityIcons name="domain" size={32} color={GOLD} />
                    <Text style={styles.contactDetailsLogoText}>REAL ESTATE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.contactDetailsAgencyName}>{displayName}</Text>
              {contactPhones.map((phone, i) => (
                <TouchableOpacity key={i} style={styles.contactDetailsRow} onPress={() => {}}>
                  <View style={styles.contactDetailsIconWrap}>
                    <Image source={contactPhoneIconSource} style={styles.contactDetailsIconImage} resizeMode="contain" />
                  </View>
                  <Text style={styles.contactDetailsLink}>{String(phone).trim()}</Text>
                </TouchableOpacity>
              ))}
              {contactEmail ? (
                <TouchableOpacity style={styles.contactDetailsRow} onPress={() => {}}>
                  <View style={styles.contactDetailsIconWrap}>
                    <Image source={contactEmailIconSource} style={styles.contactDetailsIconImage} resizeMode="contain" />
                  </View>
                  <Text style={styles.contactDetailsLink}>{contactEmail}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity style={styles.contactDetailsCopyBtn} onPress={copyContactDetails}>
              <MaterialCommunityIcons name="content-copy" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.contactDetailsDivider} />

        {/* Rating & Reviews – כמות כוכבי פאי / ביקורות */}
        <View style={styles.reviewsSection}>
          <Text style={styles.reviewsPiTitle}>כמה כוכבי פאי היית נותן על השירות שקיבלת?</Text>
          <View style={styles.reviewsStarsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                style={[styles.reviewsStarBox, selectedRating === star && styles.reviewsStarBoxSelected]}
                onPress={() => setSelectedRating(star)}
                activeOpacity={0.8}
              >
                <Image
                  source={getStarSource(star - 1)}
                  style={star <= 4 ? styles.reviewsStarImageSmall : styles.reviewsStarImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ))}
          </View>
          <Pressable
            onPress={() => {
              console.log('[UserProfile] Rate button onPress fired', { disabled: submitReviewLoading });
              handleRate();
            }}
            disabled={submitReviewLoading}
            style={({ pressed }) => [styles.reviewsRateBtnWrap, pressed && styles.reviewsRateBtnPressed]}
          >
            <Image
              source={rateButtonImageSource}
              style={styles.reviewsRateBtnImage}
              resizeMode="contain"
              pointerEvents="none"
            />
          </Pressable>

          <Text style={styles.reviewsListTitle}>ביקורות</Text>
          <TextInput
            style={styles.reviewsInput}
            value={reviewComment}
            onChangeText={setReviewComment}
            placeholder="הוסף ביקורת"
            placeholderTextColor="rgba(255,255,255,0.4)"
            multiline
            numberOfLines={3}
          />
          {reviewsLoading ? (
            <Text style={styles.reviewsPlaceholder}>טוען ביקורות...</Text>
          ) : reviews.length === 0 ? (
            <Text style={styles.reviewsPlaceholder}>אין עדיין ביקורות</Text>
          ) : (
            reviews.map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <View style={styles.reviewCardAvatarWrap}>
                    {r.reviewer_image_url ? (
                      <Image source={{ uri: r.reviewer_image_url }} style={styles.reviewCardAvatar} resizeMode="cover" />
                    ) : (
                      <View style={[styles.reviewCardAvatar, styles.reviewCardAvatarPlaceholder]}>
                        <MaterialCommunityIcons name="account" size={24} color="rgba(255,255,255,0.6)" />
                      </View>
                    )}
                    <View style={styles.reviewCardStarBadge}>
                      <Image
                        source={getStarSource((Math.min(5, Math.max(1, Number(r.rating) || 1)) - 1))}
                        style={styles.reviewCardStarBadgeImage}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                  <View style={styles.reviewCardMeta}>
                    <Text style={styles.reviewCardName}>{r.reviewer_name || 'משתמש'}</Text>
                    <Text style={styles.reviewCardDate}>{formatReviewDate(r.created_at)}</Text>
                  </View>
                </View>
                {r.comment ? <Text style={styles.reviewCardBody}>{r.comment}</Text> : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.mainDeepBlue },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 80 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 8 },
  backBtn: { padding: 4, minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  profileBlock: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 24 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: GOLD },
  avatarPlaceholder: { backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  nameAndStatsRow: { flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: 16 },
  userName: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center', alignSelf: 'stretch', marginBottom: 8 },
  userEmail: { color: Colors.grey200, fontSize: 14, marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32 },
  stat: { alignItems: 'center' },
  statNumber: { color: '#fff', fontSize: 18, fontWeight: '700' },
  statLabel: { color: Colors.grey200, fontSize: 12, marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', paddingVertical: 8, paddingHorizontal: 24, backgroundColor: Colors.mainDeepBlue },
  actionBtnTouch: { padding: 0 },
  actionBtnImage: { width: 120, height: 46 },
  profileDivider: { height: 2, backgroundColor: '#555', marginVertical: 16, alignSelf: 'stretch', marginHorizontal: 24 },

  myPropertiesSection: { marginTop: 8, marginBottom: 24 },
  myPropertiesHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 12 },
  myPropertiesTitle: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'right' },
  myPropertiesSeeAll: { paddingVertical: 6, paddingHorizontal: 8 },
  myPropertiesSeeAllText: { color: GOLD, fontSize: 14, fontWeight: '600' },
  myPropertiesListContent: { paddingHorizontal: 24 },
  myPropertiesListContentRtl: { flexDirection: 'row-reverse' },
  myPropertiesListPlaceholder: { paddingVertical: 24, paddingHorizontal: 24, alignItems: 'center' },
  myPropertiesPlaceholderText: { color: Colors.grey200, fontSize: 14 },
  myPropertiesCard: { width: Math.round(SCREEN_WIDTH * 0.52), marginHorizontal: 10, borderRadius: 12, overflow: 'hidden', backgroundColor: CARD_BG },
  myPropertiesCardImageWrap: { position: 'relative', width: '100%', height: 72 },
  myPropertiesCardImage: { width: '100%', height: '100%', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  myPropertiesCardImagePlaceholder: { backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  myPropertiesCardBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: '#fff', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999 },
  myPropertiesCardBadgeText: { color: '#333', fontSize: 12, fontWeight: '600' },
  myPropertiesCardBottom: { paddingVertical: 12, paddingHorizontal: 12 },
  myPropertiesCardPrice: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'right', marginBottom: 2 },
  myPropertiesCardLocation: { color: Colors.grey200, fontSize: 12, textAlign: 'right' },

  smartInfoBlock: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24, marginBottom: 32, alignItems: 'center', zIndex: 1 },
  smartInfoLogo: { width: 110, height: 38, marginBottom: 12 },
  smartInfoIntro: { color: '#fff', fontSize: 15, textAlign: 'center', marginBottom: 20 },
  smartInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%', gap: 10 },
  smartInfoBtn: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: CARD_BG, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 10 },
  smartInfoBtnDisabled: { opacity: 0.6 },
  smartInfoBtnIcon: { width: 22, height: 22 },
  smartInfoBtnLabel: { color: '#fff', fontSize: 12, fontWeight: '600', flex: 1 },
  smartInfoTextEntry: {
    width: '100%',
    minHeight: 160,
    backgroundColor: Colors.mainDeepBlue,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 16,
    color: '#fff',
    fontSize: 14,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#555',
    ...(Platform.OS === 'web' ? { scrollbarColor: '#555 #1e1d27' } : {}),
  },

  brokerBlock: { paddingHorizontal: 24, marginBottom: 32 },
  brokerCardPiBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 0, paddingHorizontal: 0, marginBottom: 8 },
  brokerCardPiIcon: { width: 64, height: 64 },
  brokerCardPiText: { color: GOLD, fontSize: 16, fontWeight: '700' },
  brokerCardTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  brokerCardLocation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 16 },
  brokerCardAddress: { color: Colors.grey200, fontSize: 14, textAlign: 'right' },
  brokerCardSectionTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  brokerCardSpecialties: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  brokerCardTag: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  brokerCardTagText: { color: '#fff', fontSize: 13 },
  brokerCardBio: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 22, textAlign: 'right' },

  specialtiesSection: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, alignItems: 'flex-end' },
  specialtiesTitle: { color: 'rgba(255,255,255,0.95)', fontSize: 16, fontWeight: '600', marginBottom: 12, alignSelf: 'stretch', textAlign: 'right' },
  specialtiesBubblesRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 12, marginBottom: 16, alignSelf: 'stretch' },
  specialtyBubble: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 18, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  specialtyBubbleText: { color: '#fff', fontSize: 14, textAlign: 'center' },
  specialtiesBio: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 22, textAlign: 'right', alignSelf: 'stretch' },

  brokerCardOverlayLine: { height: 1, backgroundColor: '#555', marginHorizontal: 24, marginTop: 16, marginBottom: 12 },
  brokerCardBottom: {
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  brokerCardBottomHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12 },
  brokerCardBottomPiWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  brokerCardBottomPiImage: { width: 48, height: 48 },
  brokerCardBottomPiValue: { color: GOLD, fontSize: 18, fontWeight: '700' },
  brokerCardBottomNameBlock: { flex: 1, alignItems: 'flex-end', marginEnd: 12 },
  brokerCardBottomName: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'right', marginBottom: 4 },
  brokerCardBottomLocation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  brokerCardBottomAddress: { color: Colors.grey200, fontSize: 14, textAlign: 'right' },
  companyStatsRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', width: '100%', alignSelf: 'stretch', marginTop: 10, paddingHorizontal: 0 },
  companyStatItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  companyStatIconImage: { width: 24, height: 24 },
  companyStatText: { color: '#fff', fontSize: 14 },
  brokerCardBottomSectionTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 6, alignSelf: 'stretch', textAlign: 'right' },
  brokerCardBottomTags: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginBottom: 12, alignSelf: 'stretch' },
  brokerCardBottomTag: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  brokerCardBottomTagText: { color: '#fff', fontSize: 13 },
  brokerCardBottomTagEmpty: { color: Colors.grey200, fontSize: 13, fontStyle: 'italic' },
  brokerCardBottomBio: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 22, textAlign: 'right', alignSelf: 'stretch' },
  brokerCardBottomDivider: { height: 1, backgroundColor: '#555', alignSelf: 'stretch', marginTop: 12 },

  myPropertiesSection: { marginTop: 4, marginBottom: 8, paddingHorizontal: 0 },
  myPropertiesFlatList: { height: 136 },

  contactDetailsDivider: { height: 1, backgroundColor: '#555', marginHorizontal: 24, marginVertical: 16 },
  contactDetailsSection: { paddingHorizontal: 24, paddingVertical: 8, paddingBottom: 24 },
  contactDetailsTitle: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'right', marginBottom: 16 },
  contactDetailsContent: { flexDirection: 'row-reverse', alignItems: 'flex-start', justifyContent: 'space-between' },
  contactDetailsRight: { flex: 1, alignItems: 'flex-end' },
  contactDetailsLogoWrap: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: GOLD, overflow: 'hidden', marginBottom: 12, alignSelf: 'flex-end' },
  contactDetailsLogo: { width: '100%', height: '100%' },
  contactDetailsLogoPlaceholder: { width: '100%', height: '100%', backgroundColor: CARD_BG, alignItems: 'center', justifyContent: 'center' },
  contactDetailsLogoText: { color: GOLD, fontSize: 8, fontWeight: '600', marginTop: 4 },
  contactDetailsAgencyName: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'right', marginBottom: 14 },
  contactDetailsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 10 },
  contactDetailsLink: { color: '#fff', fontSize: 15, textDecorationLine: 'underline', marginRight: 8 },
  contactDetailsIconWrap: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  contactDetailsIcon: { marginLeft: 0 },
  contactDetailsIconImage: { width: 20, height: 20, marginLeft: 0 },
  contactDetailsCopyBtn: { padding: 0, minHeight: 20, justifyContent: 'center', marginLeft: 8 },

  reviewsSection: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32 },
  reviewsPiTitle: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'right', marginBottom: 14 },
  reviewsStarsRow: { flexDirection: 'row-reverse', justifyContent: 'space-around', marginBottom: 16 },
  reviewsStarBox: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  reviewsStarBoxSelected: { backgroundColor: 'rgba(255,196,10,0.25)' },
  reviewsStarImageSmall: { width: 26, height: 26 },
  reviewsStarImage: { width: 38, height: 38 },
  reviewsRateBtnWrap: { marginBottom: 24, alignSelf: 'stretch' },
  reviewsRateBtnPressed: { opacity: 0.85 },
  reviewsRateBtnImage: { width: '100%', aspectRatio: 732 / 88, borderRadius: 12 },
  reviewsRateBtn: { paddingVertical: 14, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  reviewsRateBtnText: { color: '#1a1a1a', fontSize: 16, fontWeight: '700' },
  reviewsListTitle: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'right', marginBottom: 10 },
  reviewsInput: { backgroundColor: CARD_BG, borderWidth: 1, borderColor: '#555', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, color: '#fff', fontSize: 14, textAlign: 'right', minHeight: 80, marginBottom: 16 },
  reviewsPlaceholder: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', marginVertical: 16 },
  reviewCard: { backgroundColor: CARD_BG, borderRadius: 12, padding: 14, marginBottom: 12 },
  reviewCardHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 10 },
  reviewCardAvatarWrap: { position: 'relative', marginLeft: 12 },
  reviewCardAvatar: { width: 44, height: 44, borderRadius: 22 },
  reviewCardAvatarPlaceholder: { backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  reviewCardStarBadge: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    marginLeft: -11,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  reviewCardStarBadgeImage: { width: 22, height: 22, backgroundColor: 'transparent' },
  reviewCardStarBadgeText: { color: '#1a1a1a', fontSize: 12, fontWeight: '700' },
  reviewCardMeta: { flex: 1, alignItems: 'flex-end' },
  reviewCardName: { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'right' },
  reviewCardDate: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2, textAlign: 'right' },
  reviewCardBody: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 22, textAlign: 'right' },

  lastAdCard: { width: '100%', backgroundColor: Colors.mainDeepBlue, marginBottom: 24 },
  lastAdImageWrap: { width: SCREEN_WIDTH, height: LAST_AD_IMAGE_HEIGHT, backgroundColor: 'rgba(255,255,255,0.08)' },
  lastAdImage: { height: LAST_AD_IMAGE_HEIGHT },
  lastAdImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  lastAdPiAndPurposeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 8 },
  lastAdPiBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 0, paddingHorizontal: 0 },
  lastAdPiBadgeImage: { width: 64, height: 64 },
  lastAdPiText: { color: GOLD, fontSize: 16, fontWeight: '700' },
  lastAdDots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  lastAdDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  lastAdDotActive: { backgroundColor: GOLD, width: 8, height: 8, borderRadius: 4 },
  lastAdExpandWrap: { position: 'absolute', bottom: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  lastAdBody: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, alignItems: 'flex-end' },
  lastAdPurposeTag: { backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  lastAdPurposeText: { color: '#1a1a1e', fontSize: 14, fontWeight: '600' },
  lastAdPriceRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 6 },
  lastAdPrice: { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'right' },
  lastAdLocationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 10 },
  lastAdLocationText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, textAlign: 'right' },
  lastAdDivider: { height: 2, backgroundColor: '#555', marginVertical: 12, alignSelf: 'stretch' },
  locationMapContainer: { alignSelf: 'stretch', width: '100%' },
  constructionStatusBlock: { marginBottom: 12, alignSelf: 'stretch', width: '100%', alignItems: 'flex-end' },
  constructionStatusTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', marginBottom: 10, textAlign: 'right' },
  constructionStatusRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'nowrap', width: '100%', alignSelf: 'stretch' },
  constructionStatusStep: { alignItems: 'center', minWidth: 48 },
  constructionStatusCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  constructionStatusCircleActive: { borderColor: GOLD, borderWidth: 1, backgroundColor: Colors.mainDeepBlue },
  constructionStatusLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 6, textAlign: 'center' },
  constructionStatusLabelActive: { color: GOLD, fontWeight: '600' },
  constructionStatusDottedLine: { width: 24, height: 0, borderTopWidth: 2, borderStyle: 'dotted', borderColor: 'rgba(255,255,255,0.35)', marginBottom: 18 },
  lastAdPostedBy: { alignItems: 'flex-end', marginBottom: 8 },
  lastAdPostedByLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'right', marginBottom: 4 },
  lastAdPostedByRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  lastAdPostedByName: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'right' },
  lastAdPostedByAvatar: { width: 24, height: 24, borderRadius: 12 },
  lastAdPostedByAvatarPlaceholder: { backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  lastAdDescription: { color: '#fff', fontSize: 14, lineHeight: 22, textAlign: 'right' },
  lastAdDividerWhite: { height: 2, backgroundColor: '#555', marginVertical: 16, alignSelf: 'stretch' },
  lastAdFeaturesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 0 },
  lastAdFeatureChip: { width: '48%', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, gap: 10 },
  lastAdFeatureIcon: { marginRight: 4 },
  lastAdFeatureChipIcon: { width: 22, height: 22, marginRight: 4 },
  lastAdFeatureLabel: { color: '#fff', fontSize: 14 },
  projectOffersSection: { marginTop: 0, marginBottom: 0, width: '100%', alignSelf: 'stretch' },
  projectOffersTitle: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'right', marginBottom: 12 },
  projectOfferCard: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10, width: '100%', alignSelf: 'stretch', alignItems: 'flex-end' },
  projectOfferCardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 6 },
  projectOfferCardIcon: { width: 24, height: 24 },
  projectOfferCardTitle: { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'right' },
  projectOfferCardDetails: { color: 'rgba(255,255,255,0.9)', fontSize: 13, textAlign: 'right', marginBottom: 4, alignSelf: 'stretch' },
  projectOfferCardPrice: { color: GOLD, fontSize: 13, fontWeight: '600', textAlign: 'right', alignSelf: 'stretch' },
});

export default UserProfileScreen;
