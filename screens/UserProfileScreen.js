import React, {useState, useRef, useEffect, useCallback} from 'react';
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
  Share,
} from 'react-native';
import {MaterialCommunityIcons, SimpleLineIcons} from '@expo/vector-icons';
import {SvgXml} from 'react-native-svg';
import {Colors} from '../constants/styles';
import {
  getSubscription,
  getListings,
  askSmartInfo,
  clearSubscription404Cache,
  getReviews,
  submitReview,
  getFollowStatus,
  getFollowStats,
  sendFollowRequest,
  toSubscriptionId,
  likeListing,
  unlikeListing,
} from '../utils/api';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadTikTokLikedState,
  persistLikedListingIds,
  persistUnseenLikedCount,
} from '../utils/tikTokLikedStorage';
import {LinearGradient} from 'expo-linear-gradient';
import {Divider} from '../components';
import LocationMap from '../components/LocationMap';
import RatingImprovePicker from '../components/RatingImprovePicker';
import {isAdsListingRecord} from '../utils/listingShape';
import {
  formatCompanyApartmentsLabel,
  formatCompanyBuildingsLabel,
  formatCompanyFloorsLabel,
} from '../utils/listingGridCardFigma';
import {getUserProfileImageUrl} from '../utils/userProfileImage';
import {
  HERO_NAV_BACK_XML,
  HERO_NAV_HEART_LIKED_XML,
  HERO_NAV_HEART_XML,
  HERO_NAV_SHARE_XML,
} from '../utils/heroNavFigmaIcons';
import ProfileAvatar from '../components/ProfileAvatar';
import BnbListingProfileContent from '../components/BnbListingProfileContent';

const TEAL = '#2DD4BF';
const GOLD = '#ffc40a';
const CARD_BG = '#252436';
/** Preview on profile: first N cards; full list opens via קרא עוד (Figma 10:31152). */
const MAX_VISIBLE_REVIEWS = 5;
const CONSTRUCTION_STATUS_STEPS = [
  {name: 'on_paper', title: 'על הנייר'},
  {name: 'beginning_of_construction', title: 'תחילת בנייה'},
  {name: 'middle_of_construction', title: 'אמצע בנייה'},
  {name: 'built', title: 'בנוי'},
];

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const LAST_AD_IMAGE_HEIGHT = 320;
const SMART_BTN_SIZE = Math.floor((SCREEN_WIDTH - 48 - 10) / 2); // 2 cols, padding 24*2, gap 10

/** Last-ad hero when no gallery images: fallback if remote logo/avatar URL fails to load (common on web). */
const lastAdImageEndPlaceholder = require('../assets/improve/end.png');
/** Pi badge: always bundle — web `{ uri: origin + '/pi-badge.png' }` often 404s or breaks on subpaths. */
const piBadgeSource = require('../assets/pi-badge.png');
const piBadgeSourceRing = require('../assets/pi-badge-ring.png');
const logoPiAi = require('../assets/paiailogo.png');

const isWeb = Platform.OS === 'web';
const baseUrl =
  isWeb && typeof window !== 'undefined' ? window.location.origin : '';
const contactPhoneIconSource =
  isWeb && typeof window !== 'undefined'
    ? {uri: `${baseUrl}/conections-icons/image.png`}
    : require('../assets/callIcon.png');
const contactEmailIconSource =
  isWeb && typeof window !== 'undefined'
    ? {uri: `${baseUrl}/conections-icons/image%20copy.png`}
    : require('../assets/email-icon.png');
/** `index` 0…4 = rating 1…5 — use `../assets/starts/1.png` … `5.png` (web: same paths under /starts/). */
const ratingStarSources =
  isWeb && typeof window !== 'undefined'
    ? [1, 2, 3, 4, 5].map(i => ({uri: `${baseUrl}/starts/${i}.png`}))
    : [
        require('../assets/starts/1.png'),
        require('../assets/starts/2.png'),
        require('../assets/starts/3.png'),
        require('../assets/starts/4.png'),
        require('../assets/starts/5.png'),
      ];
function getStarSource(index) {
  const i = Math.min(4, Math.max(0, index));
  return ratingStarSources[i];
}

const buttonSources = isWeb
  ? [1, 2, 3, 4, 5, 6, 7, 8].map(i => ({uri: `${baseUrl}/ai-icon-${i}.png`}))
  : [
      require('../assets/ai-icon-2.png'),
      require('../assets/ai-icon-1.png'),
      require('../assets/ai-icon-4.png'),
      require('../assets/ai-icon-3.png'),
      require('../assets/ai-icon-6.png'),
      require('../assets/ai-icon-5.png'),
      require('../assets/ai-icon-8.png'),
      require('../assets/ai-icon-7.png'),
    ];

const SMART_BUTTONS = [
  {label: 'תחבורה', key: 'transport'},
  {label: 'מחיר ממוצע', key: 'avgprice'},
  {label: 'ביטחון', key: 'security'},
  {label: 'מוסדות', key: 'institutions'},
  {label: 'בתי ספר', key: 'schools'},
  {label: 'החיים בשכונה', key: 'neighborhood'},
  {label: 'מטרדים', key: 'pests'},
  {label: 'מרכזי קניות', key: 'shopping'},
];

function isPostListingRecord(item) {
  if (!item) return false;
  const type = String(
    item.propertyType ||
      item.property_type ||
      item.propertyTypeRaw ||
      item.apartmentTypeId ||
      '',
  ).toLowerCase();
  const description = String(item.description || item.desc || '').trim();
  if (
    type === 'post' ||
    type === 'posts' ||
    type === 'feed_post' ||
    type.includes('post') ||
    description.toLowerCase() === 'post' ||
    description === 'פוסט' ||
    item.feed_post === true ||
    item.feed_post === 'true' ||
    item.feed_post === 't' ||
    item.isPostEntry === true
  ) {
    return true;
  }
  const urls = [
    item.main_image_url,
    item.image_url,
    item.image,
    ...(Array.isArray(item.images)
      ? item.images.map(i =>
          i && typeof i === 'object' ? i.uri || i.image_url : i,
        )
      : []),
    ...(Array.isArray(item.listing_images)
      ? item.listing_images.map(i =>
          i && typeof i === 'object' ? i.image_url || i.uri : i,
        )
      : []),
  ].filter(Boolean);
  return urls.some(u => /post_\d/i.test(String(u)));
}

// apr-details layout (assets/apr-details): (1)=מ"ר, (2)=קומה, (3)=מעלית, (4)=ממ"ד, (5)=כניסה מיידית,
// (6)=חדרים, (7)=מרפסת, (8)=משופץ, (10)=חנייה. Web: public/apr-details/{n}.png
const featureIconFileNumByKey = {
  area: 1,
  floor: 2,
  elevator: 3,
  mamad: 4,
  immediate: 5,
  rooms: 6,
  balcony: 7,
  condition: 8,
  parking: 10,
};
const featureIconAssetsByNum = {
  1: require('../assets/apr-details/icons_1.png'),
  2: require('../assets/apr-details/icons_2.png'),
  3: require('../assets/apr-details/icons_3.png'),
  4: require('../assets/apr-details/icons_4.png'),
  5: require('../assets/apr-details/icons_5.png'),
  6: require('../assets/apr-details/icons_6.png'),
  7: require('../assets/apr-details/icons_7.png'),
  8: require('../assets/apr-details/icons_8.png'),
  10: require('../assets/apr-details/icons_10.png'),
};
function getFeatureIconSource(key) {
  const num = featureIconFileNumByKey[key] ?? 1;
  const asset = featureIconAssetsByNum[num] ?? featureIconAssetsByNum[1];
  return isWeb ? {uri: `${baseUrl}/apr-details/${num}.png`} : asset;
}
function getProjectOfferIconName(key) {
  const k =
    key === '3rooms' || key === '4rooms' || key === '5rooms'
      ? '3-5rooms'
      : key || '3-5rooms';
  if (k === 'garden') return require('../assets/company/garden-house.png');
  if (k === 'penthouses') return require('../assets/company/penthouse.png');
  if (k === 'private') return require('../assets/company/private-house.png');
  return require('../assets/company/rooms.png');
}

const UserProfileScreen = ({
  onClose,
  onCall,
  onMessage,
  user = null,
  currentUser = null,
  onOpenLogin = null,
  onOpenUserRegistration = null,
  onOpenAllListings = null,
  onOpenFollowHub = null,
  onOpenCompanyReport = null,
  onOpenAllReviews = null,
  /** Same as Settings Pi Chat row: server unread + 1 until Pi welcome message was opened once */
  unreadChatCount = 0,
}) => {
  const insets = useSafeAreaInsets();
  const top = insets.top;
  const bottom = insets.bottom;
  // user = listing from feed: has creator_name, creator_email, profileImageUrl, subscription_id, owner_id (from GET /api/listings). If creator_* missing, we fetch by subscription_id (getSubscription).
  const isListingFromFeed =
    user && (isAdsListingRecord(user) || isPostListingRecord(user));
  const profile =
    !isListingFromFeed && user
      ? user
      : {
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
    // console.log('[UserProfile] Incoming listing (user):', {
    //   listingId: user?.id,
    //   creator_name: user?.creator_name,
    //   creator_email: user?.creator_email,
    //   subscription_id: user?.subscription_id,
    //   owner_id: user?.owner_id,
    //   business_name: user?.business_name,
    //   name: user?.name,
    //   email: user?.email,
    //   profileImageUrl: user?.profileImageUrl != null ? '(set)' : null,
    // });
  }

  // When feed didn't return creator, fetch by subscription_id / owner_id
  const [resolvedCreator, setResolvedCreator] = useState(null);
  const [userListings, setUserListings] = useState([]);
  const [userListingsLoading, setUserListingsLoading] = useState(false);
  useEffect(() => {
    setResolvedCreator(null);
  }, [user?.id, creatorId]);
  useEffect(() => {
    if (!isListingFromFeed || !creatorId) {
      if (__DEV__ && isListingFromFeed) {
        // console.log(
        //   '[UserProfile] Skip fetch: creatorId=',
        //   creatorId,
        //   '(no subscription_id/owner_id on listing)',
        // );
      }
      return;
    }
    // Clear 404 cache so we refetch when opening profile (e.g. get updated description)
    clearSubscription404Cache(creatorId);
    // Always fetch subscription when we have creatorId so we get types, activity_regions, description, etc. from the table
    // if (__DEV__)
    //   console.log(
    //     '[UserProfile] Fetching subscription for creatorId=',
    //     creatorId,
    //   );
    let cancelled = false;
    getSubscription(creatorId)
      .then(data => {
        if (cancelled || !data?.subscription) return;
        const s = data.subscription;
        const type = (s.subscription_type || '').toLowerCase();
        let name = null;
        if (type === 'company')
          name = s.business_name || s.name || s.contact_person_name || null;
        else if (type === 'broker')
          name =
            s.broker_office_name || s.name || s.contact_person_name || null;
        else name = s.name || s.business_name || s.contact_person_name || null;
        let activityRegions = null;
        if (s.activity_regions != null) {
          if (Array.isArray(s.activity_regions))
            activityRegions = s.activity_regions;
          else if (typeof s.activity_regions === 'string') {
            try {
              const parsed = JSON.parse(s.activity_regions);
              activityRegions = Array.isArray(parsed)
                ? parsed
                : s.activity_regions
                    .split(',')
                    .map(x => String(x).trim())
                    .filter(Boolean);
            } catch (_) {
              activityRegions = s.activity_regions
                .split(',')
                .map(x => String(x).trim())
                .filter(Boolean);
            }
          }
        }
        let types = null;
        if (s.types != null) {
          if (Array.isArray(s.types)) types = s.types;
          else if (typeof s.types === 'string') {
            try {
              const parsed = JSON.parse(s.types);
              types = Array.isArray(parsed)
                ? parsed
                : s.types
                    .split(',')
                    .map(x => String(x).trim())
                    .filter(Boolean);
            } catch (_) {
              types = s.types
                .split(',')
                .map(x => String(x).trim())
                .filter(Boolean);
            }
          }
        }
        let specializations = null;
        if (s.specializations != null) {
          if (Array.isArray(s.specializations))
            specializations = s.specializations;
          else if (typeof s.specializations === 'string') {
            try {
              const parsed = JSON.parse(s.specializations);
              specializations = Array.isArray(parsed)
                ? parsed
                : s.specializations
                    .split(',')
                    .map(x => String(x).trim())
                    .filter(Boolean);
            } catch (_) {
              specializations = s.specializations
                .split(',')
                .map(x => String(x).trim())
                .filter(Boolean);
            }
          }
        }
        // description: read from subscription (same as other fields; try possible column names)
        const descVal = s.description ?? s.bio ?? s.desc ?? s.about ?? null;
        const description =
          descVal != null && String(descVal).trim()
            ? String(descVal).trim()
            : null;
        // if (__DEV__)
        // console.log(
        //   '[UserProfile] getSubscription subscription keys:',
        //   Object.keys(s),
        //   'description:',
        //   s.description,
        //   'descVal:',
        //   descVal,
        //   'set description:',
        //   description,
        // );
        const phones = [s.phone, s.mobile_phone, s.office_phone].filter(
          p => p != null && String(p).trim(),
        );
        setResolvedCreator({
          name: name || null,
          email: s.email || null,
          business_address:
            s.business_address && String(s.business_address).trim()
              ? String(s.business_address).trim()
              : null,
          company_logo_url:
            s.company_logo_url && String(s.company_logo_url).trim()
              ? String(s.company_logo_url).trim()
              : null,
          companyLogoUrl:
            s.company_logo_url && String(s.company_logo_url).trim()
              ? String(s.company_logo_url).trim()
              : null,
          profilePictureUrl: s.profile_picture_url || null,
          activity_regions:
            activityRegions && activityRegions.length > 0
              ? activityRegions
              : null,
          types: types && types.length > 0 ? types : null,
          specializations:
            specializations && specializations.length > 0
              ? specializations
              : null,
          description: description || null,
          phones: phones.length > 0 ? phones : null,
          subscription_type: (s.subscription_type || '').toLowerCase() || null,
        });
      })
      .catch(err => {
        // if (__DEV__)
        //   console.warn(
        //     '[UserProfile] getSubscription error:',
        //     err?.message || err,
        //   );
      });
    return () => {
      cancelled = true;
    };
  }, [isListingFromFeed, creatorId, user?.id]);

  // Fetch this user's listings for "הנכסים שלי" section
  useEffect(() => {
    if (!creatorId) {
      setUserListings([]);
      return;
    }
    let cancelled = false;
    setUserListingsLoading(true);
    getListings({subscription_id: creatorId})
      .then(result => {
        if (cancelled || !result?.success) return;
        setUserListings(Array.isArray(result.listings) ? result.listings : []);
      })
      .catch(() => {
        if (!cancelled) setUserListings([]);
      })
      .finally(() => {
        if (!cancelled) setUserListingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
      .then(result => {
        if (cancelled || !result?.success) return;
        setReviews(Array.isArray(result.reviews) ? result.reviews : []);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [creatorId]);

  const showAlert = (title, message) => {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.alert
    ) {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // Display name and image for current user by subscription type (broker, company, professional, user)
  const getReviewerDisplayName = u => {
    if (!u) return null;
    const t = (u.subscription_type || u.subscriptionType || '').toLowerCase();
    let name = null;
    if (t === 'company')
      name = u.business_name || u.name || u.contact_person_name || null;
    else if (t === 'broker')
      name = u.broker_office_name || u.name || u.contact_person_name || null;
    else if (t === 'professional')
      name = u.name || u.business_name || u.contact_person_name || null;
    else
      name =
        u.name ||
        u.contact_person_name ||
        u.business_name ||
        u.broker_office_name ||
        u.creator_name ||
        u.email ||
        null;
    return name && String(name).trim() ? String(name).trim() : null;
  };
  const getReviewerImageUrl = u => {
    if (!u) return null;
    const url =
      u.profile_picture_url ||
      u.profilePictureUrl ||
      u.profile_image_url ||
      u.profileImageUrl ||
      u.company_logo_url ||
      u.creator_profile_image_url ||
      null;
    return url && String(url).trim() ? String(url).trim() : null;
  };

  const handleRate = async () => {
    // console.log('[UserProfile] handleRate called', {
    //   selectedRating,
    //   creatorId,
    //   submitReviewLoading,
    //   hasCurrentUser: !!(currentUser?.id || currentUser?.email),
    // });
    if (selectedRating < 1 || selectedRating > 5) {
      showAlert('בחר דירוג', 'נא לבחור מספר כוכבים (1–5) לפני שליחת הדירוג.');
      return;
    }
    if (!creatorId) {
      showAlert('שגיאה', 'לא ניתן לשלוח דירוג עבור פרופיל זה.');
      return;
    }
    if (!currentUser?.id && !currentUser?.email) {
      const goToRegistration = onOpenUserRegistration || onOpenLogin;
      if (goToRegistration) {
        if (Platform.OS === 'web') {
          if (
            window.confirm(
              'כדי לדרג ולהוסיף ביקורת יש לפתוח חשבון או להתחבר. לעבור לדף הפתיחה?',
            )
          ) {
            goToRegistration();
          }
        } else {
          Alert.alert(
            'נדרשת התחברות',
            'כדי לדרג ולהוסיף ביקורת יש לפתוח חשבון או להתחבר.',
            [
              {text: 'ביטול', style: 'cancel'},
              {text: 'פתח חשבון / התחבר', onPress: goToRegistration},
            ],
          );
        }
      } else {
        showAlert(
          'נדרשת התחברות',
          'כדי לדרג ולהוסיף ביקורת יש לפתוח חשבון או להתחבר.',
        );
      }
      return;
    }
    const reviewerName = getReviewerDisplayName(currentUser);
    const reviewerImageUrl = getReviewerImageUrl(currentUser);
    const rawId =
      currentUser?.id && String(currentUser.id).trim()
        ? String(currentUser.id).trim()
        : null;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const reviewerSubscriptionId =
      rawId && uuidRegex.test(rawId) ? rawId : null;
    const reviewListingId =
      user?.id != null &&
      isAdsListingRecord(user) &&
      !isPostListingRecord(user) &&
      uuidRegex.test(String(user.id).trim())
        ? String(user.id).trim()
        : null;
    setSubmitReviewLoading(true);
    try {
      const result = await submitReview(
        creatorId,
        selectedRating,
        reviewComment,
        reviewerName,
        reviewerImageUrl,
        reviewerSubscriptionId,
        reviewListingId,
      );
      setSubmitReviewLoading(false);
      if (result.success) {
        setReviewComment('');
        setSelectedRating(0);
        const refetch = await getReviews(creatorId);
        if (refetch.success && Array.isArray(refetch.reviews))
          setReviews(refetch.reviews);
        showAlert('נשלח', 'הדירוג נשלח בהצלחה.');
      } else {
        showAlert('שגיאה', result.error || 'לא ניתן לשלוח דירוג. נסה שוב.');
      }
    } catch (err) {
      setSubmitReviewLoading(false);
      showAlert('שגיאה', err?.message || 'לא ניתן לשלוח דירוג. נסה שוב.');
    }
  };

  const formatReviewDate = dateStr => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime())
        ? ''
        : d.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
    } catch (_) {
      return '';
    }
  };

  // Treat placeholder creator (מתווך / broker-placeholder@...) as missing – show "משתמש", hide email
  const isPlaceholderCreator = (name, email) => {
    const n = (name && String(name).trim()) || '';
    const e = (email && String(email).trim()) || '';
    return (
      (n === 'מתווך' &&
        (e === 'broker-placeholder@example.com' ||
          e.includes('placeholder'))) ||
      e.includes('@placeholder.local')
    );
  };
  const rawNameFromSource =
    user?.business_name ||
    user?.creator_name ||
    user?.name ||
    user?.agent_name ||
    user?.contact_person_name ||
    user?.broker_office_name ||
    resolvedCreator?.name ||
    (isListingFromFeed ? '' : profile.name);
  const rawEmailFromSource =
    user?.creator_email ||
    user?.email ||
    resolvedCreator?.email ||
    (isListingFromFeed ? '' : profile.email);
  const rawName = isPlaceholderCreator(rawNameFromSource, rawEmailFromSource)
    ? isListingFromFeed
      ? ''
      : rawNameFromSource
    : rawNameFromSource;
  const rawEmail = isPlaceholderCreator(rawNameFromSource, rawEmailFromSource)
    ? isListingFromFeed
      ? ''
      : rawEmailFromSource
    : rawEmailFromSource;
  const displayName =
    rawName && String(rawName).trim()
      ? String(rawName).trim()
      : isListingFromFeed
        ? 'משתמש'
        : profile.name;
  const displayEmail =
    rawEmail && String(rawEmail).trim()
      ? String(rawEmail).trim()
      : isListingFromFeed
        ? null
        : profile.email;
  const displayImageRaw =
    user?.profileImageUrl ||
    user?.profile_image_url ||
    user?.profile_picture_url ||
    user?.creator_profile_image_url ||
    user?.creator_image_url ||
    resolvedCreator?.profilePictureUrl ||
    profile.profileImageUrl;
  const displayImage =
    typeof displayImageRaw === 'string' ? displayImageRaw.trim() : '';
  const displayImageSource = displayImage ? {uri: displayImage} : null;
  const logoImageRaw =
    user?.company_logo_url ||
    user?.companyLogoUrl ||
    user?.logo_url ||
    user?.business_logo_url ||
    user?.bnb_business_logo_url ||
    resolvedCreator?.company_logo_url ||
    resolvedCreator?.companyLogoUrl ||
    profile?.company_logo_url;
  const logoImage =
    typeof logoImageRaw === 'string' ? logoImageRaw.trim() : '';
  // Hero avatar: for listings opened from the feed, use the same URL order as TikTok
  // (getUserProfileImageUrl: personal / creator before company logo). Otherwise company
  // logo wins here and looks different from the feed/list card.
  const displayLogoSource = (() => {
    if (isListingFromFeed) {
      const unified = getUserProfileImageUrl(user);
      if (unified) return {uri: unified};
    }
    if (logoImage) return {uri: logoImage};
    return displayImageSource;
  })();
  const contactLogoRaw =
    user?.company_logo_url ||
    user?.companyLogoUrl ||
    user?.logo_url ||
    user?.business_logo_url ||
    resolvedCreator?.company_logo_url ||
    resolvedCreator?.companyLogoUrl ||
    profile?.company_logo_url;
  const contactLogo =
    typeof contactLogoRaw === 'string' ? contactLogoRaw.trim() : '';
  const contactPhones =
    resolvedCreator?.phones && resolvedCreator.phones.length > 0
      ? resolvedCreator.phones
      : [];
  const contactEmail = displayEmail;
  const primaryContactPhone =
    contactPhones.length > 0 ? String(contactPhones[0]).trim() : '070-234-234';

  const copyContactDetails = () => {
    const lines = [...contactPhones, contactEmail].filter(Boolean);
    const text = lines.join('\n');
    if (!text) return;
    if (
      Platform.OS === 'web' &&
      typeof navigator !== 'undefined' &&
      navigator.clipboard?.writeText
    ) {
      navigator.clipboard.writeText(text);
      Alert.alert('הועתק', 'פרטי ההתקשרות הועתקו ללוח');
    } else {
      Alert.alert('פרטי התקשרות', text);
    }
  };
  const handleChatPress = () => {
    if (!currentUser && typeof onOpenUserRegistration === 'function') {
      onOpenUserRegistration();
      return;
    }
    if (typeof onMessage === 'function') onMessage();
  };
  const handleCallPress = () => {
    if (typeof onCall === 'function') onCall();
  };
  const handleReportPress = () => {
    const st = String(
      resolvedCreator?.subscription_type || user?.subscription_type || '',
    ).toLowerCase();
    const canReport =
      st === 'company' ||
      st === 'professional' ||
      st === 'broker';
    if (canReport && typeof onOpenCompanyReport === 'function') {
      onOpenCompanyReport();
      return;
    }
    Alert.alert('דיווח', 'הדיווח נשלח בהצלחה.');
  };
  const handleProfileShare = () => {
    const title = String(displayName || '').trim() || 'פרופיל';
    if (
      Platform.OS === 'web' &&
      typeof navigator !== 'undefined' &&
      navigator.share
    ) {
      const url =
        typeof window !== 'undefined' && window.location?.href
          ? window.location.href
          : '';
      navigator.share({title, text: title, url}).catch(() => {});
      return;
    }
    if (
      Platform.OS === 'web' &&
      typeof navigator !== 'undefined' &&
      navigator.clipboard?.writeText
    ) {
      const url =
        typeof window !== 'undefined' && window.location?.href
          ? window.location.href
          : '';
      if (url) {
        navigator.clipboard.writeText(url);
        return;
      }
    }
    const url =
      typeof window !== 'undefined' && window.location?.href
        ? window.location.href
        : '';
    Share.share(
      url ? {message: `${title}\n${url}`, title} : {message: title, title},
    ).catch(() => {});
  };

  if (__DEV__ && isListingFromFeed) {
    // console.log('[UserProfile] Resolved display:', {
    //   rawName,
    //   rawEmail,
    //   displayName,
    //   displayEmail: displayEmail ?? '(hidden)',
    // });
  }

  // Last ad: when opened from feed, the current listing is the "last ad"; else prefer first full listing from userListings (has project_offers), then profile.properties[0]
  const lastAd = (() => {
    if (isListingFromFeed) return user;
    const adsOnly = userListings.filter(l => !isPostListingRecord(l));
    if (adsOnly.length > 0) {
      const L = adsOnly[0];
      const images =
        L.listing_images && L.listing_images.length > 0
          ? L.listing_images.map(img =>
              img && typeof img === 'object' && img.image_url
                ? {uri: img.image_url}
                : typeof img === 'string'
                  ? {uri: img}
                  : img,
            )
          : L.images && L.images.length > 0
            ? L.images
            : [];
      return {...L, images};
    }
    if (profile.properties && profile.properties[0]) {
      const p = profile.properties[0];
      return {
        images: p.image ? [{uri: p.image}] : [],
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

  /** Profile ad hero: still images only (slideshow); never use listing video URLs on profile. */
  const lastAdImages = (() => {
    if (!lastAd) return [];
    const isVideoLikeUrl = u => {
      const s = String(u || '').trim().toLowerCase();
      if (!s) return true;
      if (/\.(mp4|webm|mov|m4v|mkv)(\?|#|$)/i.test(s)) return true;
      if (/\/videos?\//i.test(s)) return true;
      return false;
    };
    const pushStill = (arr, u) => {
      const s = String(u || '').trim();
      if (!s || /^text-post-placeholder$/i.test(s) || isVideoLikeUrl(s)) return;
      arr.push({uri: s});
    };
    const fromRows = rows => {
      const out = [];
      for (const img of rows) {
        const u =
          img && typeof img === 'object'
            ? img.uri || img.image_url
            : typeof img === 'string'
              ? img
              : null;
        if (u) pushStill(out, u);
      }
      return out;
    };
    if (lastAd.listing_images && lastAd.listing_images.length > 0) {
      const x = fromRows(lastAd.listing_images);
      if (x.length > 0) return x;
    }
    if (lastAd.images && lastAd.images.length > 0) {
      const x = fromRows(lastAd.images);
      if (x.length > 0) return x;
    }
    return [];
  })();
  const openedFromPost = isPostListingRecord(user);
  const recentPostGridImages = (() => {
    if (!openedFromPost) return [];
    const rows = Array.isArray(userListings) ? [...userListings] : [];
    if (user && isPostListingRecord(user)) {
      rows.unshift(user);
    }
    const postRows = rows.filter(isPostListingRecord);
    const seenIds = new Set();
    const uniquePostRows = postRows.filter(row => {
      const id = String(row?.id || '').trim();
      if (!id) return true;
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });
    uniquePostRows.sort((a, b) => {
      const ta = new Date(a?.created_at || a?.createdAt || 0).getTime();
      const tb = new Date(b?.created_at || b?.createdAt || 0).getTime();
      return tb - ta;
    });
    const isPlaceholderUri = u =>
      !u || /^text-post-placeholder$/i.test(String(u).trim());
    const firstImageFor = item => {
      const listingImgs = Array.isArray(item?.listing_images) ? item.listing_images : [];
      for (const img of listingImgs) {
        const uri =
          img && typeof img === 'object'
            ? String(img.image_url || img.uri || '').trim()
            : String(img || '').trim();
        if (!isPlaceholderUri(uri)) return {uri};
      }
      const directImgs = Array.isArray(item?.images) ? item.images : [];
      for (const img of directImgs) {
        const uri =
          img && typeof img === 'object'
            ? String(img.uri || img.image_url || '').trim()
            : String(img || '').trim();
        if (!isPlaceholderUri(uri)) return {uri};
      }
      const directUri = String(item?.main_image_url || item?.image_url || '').trim();
      if (!isPlaceholderUri(directUri)) return {uri: directUri};
      const videoUri = (() => {
        if (item?.video && typeof item.video === 'object') {
          return (
            String(item.video.uri || item.video.url || '').trim() ||
            null
          );
        }
        if (typeof item?.video === 'string') return String(item.video).trim() || null;
        if (item?.video_url) return String(item.video_url).trim() || null;
        const lv = Array.isArray(item?.listing_videos) ? item.listing_videos : [];
        for (const v of lv) {
          if (v && typeof v === 'object' && v.video_url) {
            return String(v.video_url).trim();
          }
        }
        return null;
      })();
      if (videoUri) return {uri: videoUri, isVideo: true};
      return null;
    };
    return uniquePostRows.map(firstImageFor).filter(Boolean);
  })();

  /** >6: show all tiles (page ScrollView scrolls). ≤6: keep 2×3 grid with empty placeholders. */
  const postGridDisplayItems =
    recentPostGridImages.length > 6
      ? recentPostGridImages
      : Array.from({length: 6}, (_, i) => recentPostGridImages[i] || null);

  const [lastAdImageIndex, setLastAdImageIndex] = useState(0);
  const lastAdCarouselRef = useRef(null);
  const lastAdCardWidth = SCREEN_WIDTH;
  const [smartInfoText, setSmartInfoText] = useState('');
  const [smartInfoLoading, setSmartInfoLoading] = useState(false);
  const adAddress = lastAd?.address || lastAd?.location || '';
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [submitReviewLoading, setSubmitReviewLoading] = useState(false);
  const [fullScreenImageModalVisible, setFullScreenImageModalVisible] =
    useState(false);
  const [fullScreenImageIndex, setFullScreenImageIndex] = useState(0);
  const fullScreenCarouselRef = useRef(null);

  const viewedSubscriptionId = toSubscriptionId(
    resolvedCreator?.id || user?.subscription_id || user?.owner_id || profile?.id,
  );
  const currentSubscriptionId = toSubscriptionId(currentUser?.id);
  const isOwnProfile =
    !!viewedSubscriptionId &&
    !!currentSubscriptionId &&
    viewedSubscriptionId === currentSubscriptionId;
  const [followStatus, setFollowStatus] = useState({
    isFollowing: false,
    hasPendingRequest: false,
  });
  /** False only after we know follow state (avoids showing + for one frame, then hiding when already following). */
  const [followStatusLoading, setFollowStatusLoading] = useState(true);
  const [followStats, setFollowStats] = useState({
    likes: null,
    followers: null,
    following: null,
    pendingRequests: 0,
  });
  const [followStatsLoading, setFollowStatsLoading] = useState(true);
  const [sendingFollowRequest, setSendingFollowRequest] = useState(false);
  const [lastAdHeroImageFailed, setLastAdHeroImageFailed] = useState(false);

  useEffect(() => {
    setLastAdHeroImageFailed(false);
  }, [displayImage, logoImage]);

  useEffect(() => {
    let cancelled = false;
    if (!viewedSubscriptionId) {
      setFollowStatsLoading(false);
      return undefined;
    }
    setFollowStatsLoading(true);
    getFollowStats(viewedSubscriptionId)
      .then(data => {
        if (cancelled) return;
        const stats = data?.stats || {};
        setFollowStats({
          likes: Number(stats.likes || 0),
          followers: Number(stats.followers || 0),
          following: Number(stats.following || 0),
          pendingRequests: Number(stats.pending_requests || 0),
        });
        setFollowStatsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFollowStats({
          likes: 0,
          followers: 0,
          following: 0,
          pendingRequests: 0,
        });
        setFollowStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewedSubscriptionId, reviews.length]);

  useEffect(() => {
    let cancelled = false;
    if (!viewedSubscriptionId || !currentSubscriptionId || viewedSubscriptionId === currentSubscriptionId) {
      setFollowStatus({isFollowing: false, hasPendingRequest: false});
      setFollowStatusLoading(false);
      return undefined;
    }
    setFollowStatusLoading(true);
    getFollowStatus(currentSubscriptionId, viewedSubscriptionId)
      .then(data => {
        if (cancelled) return;
        setFollowStatus({
          isFollowing: !!data?.is_following,
          hasPendingRequest: !!data?.has_pending_request,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setFollowStatus({isFollowing: false, hasPendingRequest: false});
      })
      .finally(() => {
        if (!cancelled) {
          setFollowStatusLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [currentSubscriptionId, viewedSubscriptionId]);

  const likesCount = followStats.likes;
  const followersCount = followStats.followers;
  const followingCount = followStats.following;
  const formatStatCount = value =>
    followStatsLoading || value == null ? '—' : String(value);
  const viewerLoggedIn = !!(
    currentUser &&
    String(currentUser.email || '')
      .trim()
  );
  const shouldShowFollowPlus =
    !!viewedSubscriptionId &&
    !isOwnProfile &&
    (viewerLoggedIn
      ? !followStatusLoading &&
        !!currentSubscriptionId &&
        !followStatus.isFollowing &&
        !followStatus.hasPendingRequest
      : true);

  const handleSendFollowRequest = async () => {
    if (!viewerLoggedIn) {
      if (typeof onOpenUserRegistration === 'function') {
        onOpenUserRegistration();
      }
      return;
    }
    if (!currentSubscriptionId || !viewedSubscriptionId || sendingFollowRequest) return;
    setSendingFollowRequest(true);
    try {
      await sendFollowRequest(currentSubscriptionId, viewedSubscriptionId);
      setFollowStatus(prev => ({...prev, hasPendingRequest: true}));
      setFollowStats(prev => ({
        ...prev,
        pendingRequests: isOwnProfile ? prev.pendingRequests : prev.pendingRequests + 1,
      }));
    } catch (e) {
      Alert.alert('', e?.message || 'לא הצלחנו לשלוח בקשת מעקב');
    } finally {
      setSendingFollowRequest(false);
    }
  };

  // Broker profile card data (real user details with fallbacks)
  const brokerProfession =
    user?.profession ?? user?.title ?? profile.profession ?? 'מתווך נדל״ן';
  // Resolve a non-empty address from a chain of candidates.
  // Treats null/undefined, empty strings, and known placeholder copy
  // ("מיקום לא זמין") as falsy so the chain falls through to a real value.
  const ADDRESS_PLACEHOLDERS = new Set(['', 'מיקום לא זמין', 'מיקום לא צוין']);
  const firstNonEmpty = (...values) => {
    for (const v of values) {
      const s = v == null ? '' : String(v).trim();
      if (s && !ADDRESS_PLACEHOLDERS.has(s)) return s;
    }
    return '';
  };
  const brokerAddress = user?._fromTikTokPost
    ? firstNonEmpty(
        resolvedCreator?.business_address,
        user?.creator_business_address,
        user?.business_address,
        user?.address,
        user?.location,
        lastAd?.address,
        lastAd?.location,
        profile.address,
      )
    : firstNonEmpty(
        resolvedCreator?.business_address,
        user?.address,
        user?.location,
        lastAd?.address,
        lastAd?.location,
        profile.address,
      );
  const profileSubscriptionType = (
    resolvedCreator?.subscription_type ||
    user?.subscription_type ||
    ''
  ).toLowerCase();
  const isCompany = profileSubscriptionType === 'company';
  const isBroker = profileSubscriptionType === 'broker';
  const isProfessional = profileSubscriptionType === 'professional';
  const isRegularUserAccount = !isCompany && !isBroker && !isProfessional;
  const isRegularUserAdView =
    isRegularUserAccount && isListingFromFeed && !openedFromPost;
  /** BnB ad from feed (category 5, not a post) — dedicated Figma 5:413003 layout only for this case */
  const listingCategoryNum = Number(user?.category ?? lastAd?.category ?? 0);
  const isBnbListingAdProfile =
    isListingFromFeed && !openedFromPost && listingCategoryNum === 5;
  const showLocationMap = isListingFromFeed && !openedFromPost;
  const showTikTokProfessionalHeader = user?._fromTikTokPost && isProfessional;
  /** Company profile opened from Selected Projects (פרויקטים נבחרים) → company listing → profile. */
  const openedFromCompaniesDirectory = Boolean(user?._fromCompanyProjects);
  /** Same flow + listing record (hero nav, favorite on listing id). */
  const fromCompanyProjects = Boolean(
    isListingFromFeed && openedFromCompaniesDirectory,
  );
  const companyListingId =
    fromCompanyProjects && user?.id != null ? String(user.id) : null;
  const [companyHeroFavorited, setCompanyHeroFavorited] = useState(false);
  const companyHeroLikePendingRef = useRef(false);
  useEffect(() => {
    if (!companyListingId || !currentUser?.id) {
      setCompanyHeroFavorited(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const st = await loadTikTokLikedState(String(currentUser.id));
        if (!cancelled) {
          setCompanyHeroFavorited(
            st.likedListingIds.has(companyListingId),
          );
        }
      } catch {
        if (!cancelled) setCompanyHeroFavorited(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyListingId, currentUser?.id]);
  const handleCompanyHeroToggleFavorite = useCallback(async () => {
    if (!companyListingId) return;
    if (!currentUser?.id) {
      if (typeof onOpenUserRegistration === 'function') {
        onOpenUserRegistration();
      }
      return;
    }
    if (companyHeroLikePendingRef.current) return;
    const userId = String(currentUser.id);
    const willFav = !companyHeroFavorited;
    companyHeroLikePendingRef.current = true;

    const readLikedSet = async () => {
      const st = await loadTikTokLikedState(userId);
      return new Set(
        [...st.likedListingIds].map(x => String(x)),
      );
    };
    const writeLikedSet = async set => {
      await persistLikedListingIds(userId, set);
    };

    setCompanyHeroFavorited(willFav);
    try {
      const s = await readLikedSet();
      if (willFav) s.add(companyListingId);
      else s.delete(companyListingId);
      await writeLikedSet(s);
      const stU = await loadTikTokLikedState(userId);
      const prevU = stU.unseenLikedCount;
      const nextU = willFav ? prevU + 1 : Math.max(0, prevU - 1);
      await persistUnseenLikedCount(userId, nextU);

      if (willFav) await likeListing(companyListingId, userId);
      else await unlikeListing(companyListingId, userId);
    } catch (e) {
      console.warn('Company profile favorite failed', e?.message);
      setCompanyHeroFavorited(!willFav);
      try {
        const s = await readLikedSet();
        if (willFav) s.delete(companyListingId);
        else s.add(companyListingId);
        await writeLikedSet(s);
        const stU = await loadTikTokLikedState(userId);
        const u = stU.unseenLikedCount;
        const backU = willFav ? Math.max(0, u - 1) : u + 1;
        await persistUnseenLikedCount(userId, backU);
      } catch {
        // ignore
      }
    } finally {
      companyHeroLikePendingRef.current = false;
    }
  }, [
    companyListingId,
    companyHeroFavorited,
    currentUser?.id,
    onOpenUserRegistration,
  ]);
  const hideCompanyPostSpecialtiesBlock = user?._fromTikTokPost && isCompany;
  /** Company: show פרוייקטים נבחרים after אודות (strip is between bio and פרטי התקשרות) when from companies directory or TikTok company post. */
  const showCompanySelectedProjectsStrip =
    isCompany &&
    (openedFromCompaniesDirectory ||
      (user?._fromTikTokPost && openedFromPost));
  // Professionals: no listings section.
  const hideMyPropertiesSection =
    isProfessional ||
    (openedFromPost && isProfessional) ||
    (isCompany && !showCompanySelectedProjectsStrip);
  const showCompanyPostSpecialties = openedFromPost && isCompany;
  const firstListingWithGeneral = userListings.find(
    l => l.general_details && typeof l.general_details === 'object',
  );
  const gd = firstListingWithGeneral?.general_details;
  const companyBuildingCount =
    gd?.building_count != null ? Number(gd.building_count) : 0;
  const companyFloorCount =
    gd?.floor_count != null ? Number(gd.floor_count) : 0;
  const companyApartmentCount =
    gd?.apartment_count != null ? Number(gd.apartment_count) : 0;
  const specialtiesRaw =
    user?.creator_specialties ??
    user?.specialties ??
    user?.specialties_list ??
    resolvedCreator?.specializations ??
    profile.specialties;
  const brokerSpecialties = Array.isArray(specialtiesRaw)
    ? specialtiesRaw
    : typeof specialtiesRaw === 'string'
      ? specialtiesRaw
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : [];
  const activityRegionsRaw =
    user?.creator_activity_regions ??
    user?.activity_regions ??
    resolvedCreator?.activity_regions ??
    profile?.activity_regions;
  const activityRegions = Array.isArray(activityRegionsRaw)
    ? activityRegionsRaw
    : typeof activityRegionsRaw === 'string'
      ? (() => {
          try {
            const p = JSON.parse(activityRegionsRaw);
            return Array.isArray(p)
              ? p
              : activityRegionsRaw
                  .split(',')
                  .map(s => s.trim())
                  .filter(Boolean);
          } catch (_) {
            return activityRegionsRaw
              .split(',')
              .map(s => s.trim())
              .filter(Boolean);
          }
        })()
      : [];
  // התמחויות: use types from table (creator_types / types) instead of activity_regions
  const typesRaw =
    user?.creator_types ??
    user?.types ??
    resolvedCreator?.types ??
    profile?.types;
  const typesArray = Array.isArray(typesRaw)
    ? typesRaw
    : typeof typesRaw === 'string'
      ? (() => {
          try {
            const p = JSON.parse(typesRaw);
            return Array.isArray(p)
              ? p
              : typesRaw
                  .split(',')
                  .map(s => s.trim())
                  .filter(Boolean);
          } catch (_) {
            return typesRaw
              .split(',')
              .map(s => s.trim())
              .filter(Boolean);
          }
        })()
      : [];
  const brokerBioRaw =
    user?.creator_bio ??
    user?.bio ??
    user?.creator_description ??
    resolvedCreator?.description ??
    resolvedCreator?.bio ??
    profile?.bio ??
    profile?.description ??
    null;
  const brokerBioTrimmed =
    brokerBioRaw != null ? String(brokerBioRaw).trim() : '';
  // Show whatever is stored (even if it's the broker name – DB may have name in description field)
  const brokerBio = brokerBioTrimmed || null;

  const brokerPiRating =
    user?.pi_value ?? lastAd?.pi_value ?? profile?.pi_value ?? 5;

  // Average of star ratings from reviews (1–5), always whole number; fallback to rounded broker Pi
  const displayPiRating = React.useMemo(() => {
    const clampPi = n => {
      const x = Math.round(Number(n));
      if (Number.isNaN(x) || !Number.isFinite(x)) return 5;
      return Math.min(5, Math.max(1, x));
    };
    if (!reviews || reviews.length === 0) return clampPi(brokerPiRating);
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const avg = sum / reviews.length;
    return clampPi(avg);
  }, [reviews, brokerPiRating]);

  // Filter out display name from tags so it doesn't appear as a specialty/region
  const tagLabel = s =>
    (typeof s === 'string' ? s : (s?.label ?? s?.name ?? String(s))).trim();
  const filteredActivityRegions = (
    activityRegions.length > 0 ? activityRegions : brokerSpecialties
  ).filter(s => tagLabel(s) !== displayName);
  const filteredSpecialties = (
    activityRegions.length > 0 ? activityRegions : brokerSpecialties
  ).filter(s => tagLabel(s) !== displayName);
  // For overlay התמחויות: prefer types from table; fallback to activity_regions, then specializations (so something shows even if types column is missing or empty)
  const overlaySource =
    typesArray.length > 0
      ? typesArray
      : activityRegions.length > 0
        ? activityRegions
        : brokerSpecialties;
  const overlayActivityRegions = overlaySource.filter(
    s => tagLabel(s) !== displayName,
  );
  // if (__DEV__) {
  //   console.log('[UserProfile] התמחויות:', {
  //     types: {
  //       fromListing: user?.creator_types ?? user?.types,
  //       fromResolved: resolvedCreator?.types,
  //       typesArray,
  //     },
  //     activity_regions: {
  //       fromResolved: resolvedCreator?.activity_regions,
  //       parsed: activityRegions,
  //     },
  //     specializations: {
  //       fromResolved: resolvedCreator?.specializations,
  //       brokerSpecialties,
  //     },
  //     used: overlayActivityRegions.length
  //       ? typesArray.length
  //         ? 'types'
  //         : activityRegions.length
  //           ? 'activity_regions'
  //           : 'specializations'
  //       : 'none',
  //     overlayActivityRegions,
  //   });
  // }

  // Always show 9 property features in design order; use "ללא [field name]" when no data.
  const adFeatures = React.useMemo(() => {
    if (!lastAd) return [];
    const am =
      lastAd.amenities && typeof lastAd.amenities === 'object'
        ? lastAd.amenities
        : null;
    const r =
      lastAd.rooms != null && lastAd.rooms !== '' ? Number(lastAd.rooms) : null;
    const a =
      lastAd.area != null && lastAd.area !== '' ? Number(lastAd.area) : null;
    const f =
      lastAd.floor != null && lastAd.floor !== '' ? Number(lastAd.floor) : null;
    const cond = lastAd.condition && String(lastAd.condition).trim();
    const condLabel = cond
      ? cond === 'renovated' || cond === 'משופץ'
        ? 'משופץ'
        : cond === 'new' || cond === 'חדש'
          ? 'חדש'
          : cond === 'old' || cond === 'ישן'
            ? 'ישן'
            : cond
      : null;
    const parking = am ? (am.parking ?? am.parking_spaces) : null;
    return [
      {iconKey: 'area', label: a != null && !isNaN(a) ? `${a} מ"ר` : 'ללא מ"ר'},
      {
        iconKey: 'rooms',
        label: r != null && !isNaN(r) ? `${r} חדרים` : 'ללא חדרים',
      },
      {
        iconKey: 'floor',
        label: f != null && !isNaN(f) ? `קומה ${f}` : 'ללא קומה',
      },
      {
        iconKey: 'balcony',
        label: am && (am.balcony || am.mirpeset) ? 'מרפסת' : 'ללא מרפסת',
      },
      {
        iconKey: 'elevator',
        label: am && (am.elevator || am.maala) ? 'מעלית' : 'ללא מעלית',
      },
      {
        iconKey: 'parking',
        label:
          parking != null
            ? typeof parking === 'number'
              ? `חנייה ${parking}`
              : 'חנייה'
            : 'ללא חנייה',
      },
      {
        iconKey: 'mamad',
        label: am && (am.mamad || am.mamad_room) ? 'ממ"ד' : 'ללא ממ"ד',
      },
      {iconKey: 'condition', label: condLabel || 'ללא מצב'},
      {
        iconKey: 'immediate',
        label:
          am && (am.immediate_entry || am.entry_immediate)
            ? 'כניסה מיידית'
            : 'ללא כניסה מיידית',
      },
    ];
  }, [lastAd]);

  const projectOffersCards = React.useMemo(() => {
    if (!isCompany || !lastAd) return [];
    const raw = lastAd.project_offers ?? lastAd.projectOffers;
    const po = raw && typeof raw === 'object' ? raw : {};
    const n = v => (v != null && !isNaN(Number(v)) ? Number(v) : null);
    const allCards = [
      {
        key: '3rooms',
        title: '3 חדרים',
        iconKey: '3-5rooms',
        area: n(po.rooms_3_area),
        price: n(po.rooms_3_price),
        rooms: null,
      },
      {
        key: '4rooms',
        title: '4 חדרים',
        iconKey: '3-5rooms',
        area: n(po.rooms_4_area),
        price: n(po.rooms_4_price),
        rooms: null,
      },
      {
        key: '5rooms',
        title: '5 חדרים',
        iconKey: '3-5rooms',
        area: n(po.rooms_5_area),
        price: n(po.rooms_5_price),
        rooms: null,
      },
      {
        key: 'garden',
        title: 'דירות גן',
        iconKey: 'garden',
        area: n(po.garden_area),
        price: n(po.garden_price),
        rooms: n(po.garden_rooms),
      },
      {
        key: 'penthouses',
        title: 'נטהאוזים',
        iconKey: 'penthouses',
        area: n(po.penthouse_area),
        price: n(po.penthouse_price),
        rooms: n(po.penthouse_rooms),
      },
      {
        key: 'private',
        title: 'בתים פרטיים',
        iconKey: 'private',
        area: n(po.private_area),
        price: n(po.private_price),
        rooms: n(po.private_rooms),
      },
    ];
    const hasValue = c =>
      (c.area != null && c.area > 0) ||
      (c.price != null && c.price > 0) ||
      (c.rooms != null && c.rooms > 0);
    return allCards.filter(hasValue);
  }, [isCompany, lastAd]);

  useEffect(() => {
    if (lastAdImages.length <= 1) return;
    const t = setInterval(() => {
      setLastAdImageIndex(prev => {
        const next = (prev + 1) % lastAdImages.length;
        lastAdCarouselRef.current?.scrollToOffset({
          offset: next * lastAdCardWidth,
          animated: true,
        });
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [lastAdImages.length, lastAdCardWidth]);

  const visibleReviews =
    reviews.length > MAX_VISIBLE_REVIEWS
      ? reviews.slice(0, MAX_VISIBLE_REVIEWS)
      : reviews;

  const renderPiRating = () => {
    if (isRegularUserAdView) return null;
    return (
      <View style={styles.lastAdPiBadge}>
        <Text style={styles.lastAdPiText}>{String(displayPiRating)}</Text>
        {/* <Text style={styles.lastAdPiText}>{5}</Text> */}
        <Image
          source={displayPiRating > 4 ? piBadgeSourceRing : piBadgeSource}
          style={styles.lastAdPiBadgeImage}
          resizeMode="cover"
        />
      </View>
    );
  };

  /** Pinned top nav for any open-from–TikTok-feed / listing: inner hero + scroll back used to move away while scrolling. */
  const showFixedCompanyHero = Boolean(
    isListingFromFeed && fromCompanyProjects && lastAd,
  );
  const showFixedProHero = Boolean(
    isListingFromFeed &&
      lastAd &&
      isProfessional &&
      !showTikTokProfessionalHeader &&
      !fromCompanyProjects,
  );
  const showFixedBackOnly = Boolean(
    isListingFromFeed &&
      !fromCompanyProjects &&
      (!isProfessional || showTikTokProfessionalHeader) &&
      !showFixedProHero,
  );
  const useFixedListingTopNav =
    showFixedCompanyHero || showFixedProHero || showFixedBackOnly;

  const heroNavPaddingTop = showFixedCompanyHero ? top + 8 : top + 10;

  return (
    <View
      style={[
        styles.container,
        {paddingTop: useFixedListingTopNav ? 0 : top + 10},
      ]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {paddingBottom: Math.max(80, bottom + 32)},
        ]}
        showsVerticalScrollIndicator={false}>
        {(!isProfessional || showTikTokProfessionalHeader) &&
          !fromCompanyProjects &&
          !useFixedListingTopNav && (
          <TouchableOpacity
            onPress={onClose}
            style={styles.backBtn}
            hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
          </TouchableOpacity>
        )}

        {(!isProfessional || showTikTokProfessionalHeader) &&
          !fromCompanyProjects && (
        <View style={styles.profileBlock}>
          <View style={styles.avatarWrap}>
            <ProfileAvatar
              uri={displayLogoSource?.uri}
              name={displayName}
              size={78}
              imageStyle={
                Platform.OS === 'web' ? {objectFit: 'cover'} : undefined
              }
            />
            {shouldShowFollowPlus ? (
              <TouchableOpacity
                onPress={handleSendFollowRequest}
                style={styles.avatarBadge}
                disabled={sendingFollowRequest}
                activeOpacity={0.8}>
                {sendingFollowRequest ? (
                  <Text style={styles.avatarBadgeSending}>...</Text>
                ) : (
                  <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          {displayEmail != null && displayEmail !== '' ? (
            <Text style={styles.userEmail}>{displayEmail}</Text>
          ) : null}
          {!isBnbListingAdProfile ? (
            <View style={styles.statsRow}>
              <TouchableOpacity
                style={styles.stat}
                activeOpacity={0.8}
                onPress={() =>
                  typeof onOpenFollowHub === 'function' &&
                  onOpenFollowHub('requests')
                }>
                <Text style={styles.statNumber}>{formatStatCount(likesCount)}</Text>
                <Text style={styles.statLabel}>לייקים</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stat}
                activeOpacity={0.8}
                onPress={() =>
                  typeof onOpenFollowHub === 'function' &&
                  onOpenFollowHub('followers')
                }>
                <Text style={styles.statNumber}>{formatStatCount(followersCount)}</Text>
                <Text style={styles.statLabel}>עוקבים</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stat}
                activeOpacity={0.8}
                onPress={() =>
                  typeof onOpenFollowHub === 'function' &&
                  onOpenFollowHub('following')
                }>
                <Text style={styles.statNumber}>{formatStatCount(followingCount)}</Text>
                <Text style={styles.statLabel}>עוקב</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
        )}

        {(!isProfessional || showTikTokProfessionalHeader) &&
          !fromCompanyProjects && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => {
              if (isOwnProfile) return;
              typeof onCall === 'function' && onCall();
            }}
            activeOpacity={0.8}
            disabled={isOwnProfile}
            style={[styles.actionBtnTouch, isOwnProfile && styles.actionBtnDisabled]}>
            <Image
              source={require('../assets/callWithText.png')}
              style={styles.actionBtnImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (isOwnProfile) return;
              if (
                !currentUser &&
                typeof onOpenUserRegistration === 'function'
              ) {
                onOpenUserRegistration();
              } else if (typeof onMessage === 'function') {
                onMessage();
              }
            }}
            activeOpacity={0.8}
            disabled={isOwnProfile}
            style={[styles.actionBtnTouch, isOwnProfile && styles.actionBtnDisabled]}>
            <Image
              source={require('../assets/chatWithText.png')}
              style={styles.actionBtnImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
        )}

        {/* Last ad card - full width, no bubble */}
        {lastAd && (
          <View style={styles.lastAdCard}>
            <View
              style={
                openedFromPost ? styles.lastAdImageWrapGridMode : styles.lastAdImageWrap
              }>
              {openedFromPost ? (
                <View style={styles.lastAdGrid}>
                  {postGridDisplayItems.map((item, i) => {
                      if (!item) {
                        return (
                          <View
                            key={`post-grid-ph-${i}`}
                            style={[
                              styles.lastAdGridItem,
                              styles.lastAdGridPlaceholderCell,
                            ]}>
                            <MaterialCommunityIcons
                              name="camera-outline"
                              size={24}
                              color="rgba(255,255,255,0.45)"
                            />
                          </View>
                        );
                      }
                      if (item.isVideo) {
                        return (
                          <TouchableOpacity
                            key={`post-grid-v-${item.uri || i}-${i}`}
                            style={styles.lastAdGridItem}
                            activeOpacity={0.85}
                            onPress={() => {}}>
                            <View style={[styles.lastAdGridImage, styles.lastAdGridVideoCell]}>
                              <MaterialCommunityIcons
                                name="play-circle"
                                size={36}
                                color="rgba(255,255,255,0.85)"
                              />
                            </View>
                          </TouchableOpacity>
                        );
                      }
                      return (
                        <TouchableOpacity
                          key={`post-grid-img-${item.uri}-${i}`}
                          style={styles.lastAdGridItem}
                          activeOpacity={0.85}
                          onPress={() => {}}>
                          <Image
                            source={{uri: item.uri}}
                            style={styles.lastAdGridImage}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      );
                    })}
                </View>
              ) : lastAdImages.length > 0 ? (
                <>
                  <FlatList
                    ref={lastAdCarouselRef}
                    data={lastAdImages}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={e => {
                      const i = Math.round(
                        e.nativeEvent.contentOffset.x / lastAdCardWidth,
                      );
                      setLastAdImageIndex(i);
                    }}
                    renderItem={({item}) => (
                      <Image
                        source={item}
                        style={[styles.lastAdImage, {width: lastAdCardWidth}]}
                        resizeMode="cover"
                      />
                    )}
                    keyExtractor={(_, i) => String(i)}
                  />
                  {lastAdImages.length > 1 && (
                    <View style={styles.lastAdDots}>
                      {lastAdImages.slice(0, 5).map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.lastAdDot,
                            i === lastAdImageIndex && styles.lastAdDotActive,
                          ]}
                        />
                      ))}
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.lastAdExpandWrap}
                    onPress={() => {
                      setFullScreenImageIndex(lastAdImageIndex);
                      setFullScreenImageModalVisible(true);
                    }}
                    activeOpacity={0.8}>
                    <Image
                      source={require('../assets/full_screen.png')}
                      style={styles.expandIcon}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                </>
              ) : (
                <View
                  style={[styles.lastAdImage, styles.lastAdImagePlaceholder]}>
                  {displayLogoSource && !lastAdHeroImageFailed ? (
                    <Image
                      source={displayLogoSource}
                      style={[styles.lastAdImage, {width: lastAdCardWidth}]}
                      resizeMode="cover"
                      onError={() => setLastAdHeroImageFailed(true)}
                    />
                  ) : (
                    <Image
                      source={lastAdImageEndPlaceholder}
                      style={[styles.lastAdImage, {width: lastAdCardWidth}]}
                      resizeMode="cover"
                    />
                  )}
                </View>
              )}
            </View>

            {!openedFromPost && (isBnbListingAdProfile || !isProfessional) && (
            <View style={styles.lastAdBody}>
              {isBnbListingAdProfile ? (
                <BnbListingProfileContent
                  listing={lastAd}
                  mapAddress={firstNonEmpty(
                    lastAd?.address,
                    lastAd?.location,
                    user?.address,
                    brokerAddress,
                  )}
                  onReportPress={handleReportPress}
                />
              ) : (
              <>
              <View style={styles.lastAdPiAndPurposeRow}>
                {renderPiRating() || <View />}
                {isCompany ? (
                  <Image
                    source={require('../assets/pre-sale.png')}
                    style={styles.preSaleBadgeImage}
                    resizeMode="contain"
                  />
                ) : isProfessional ? (
                  <Text style={styles.lastAdProfessionalName} numberOfLines={1}>
                    {displayName}
                  </Text>
                ) : (
                  <View style={styles.lastAdPurposeTag}>
                    <Text style={styles.lastAdPurposeText}>
                      {lastAd.purpose || 'להשכרה'}
                    </Text>
                  </View>
                )}
              </View>
              {!isProfessional && (
                <View style={styles.lastAdPriceRow}>
                  <Text style={styles.lastAdPrice}>
                    {isCompany ? 'אביב המקור' : lastAd.price || '₪5,000'}
                  </Text>
                </View>
              )}
              {(() => {
                const addr = firstNonEmpty(
                  user?._fromTikTokPost ? user?.creator_business_address : null,
                  user?._fromTikTokPost ? user?.business_address : null,
                  lastAd.address,
                  lastAd.location,
                );
                if (!addr) return null;
                return (
                  <View style={styles.lastAdLocationRow}>
                    <Text style={styles.lastAdLocationText}>{addr}</Text>
                    <SimpleLineIcons
                      name="location-pin"
                      size={18}
                      color="rgba(255,255,255,0.9)"
                    />
                  </View>
                );
              })()}
              {isBroker && (
                <View style={styles.lastAdDivider} />
              )}
              {isCompany && (
                <View style={styles.companyStatsRow}>
                  <View style={styles.companyStatItem}>
                    <Image
                      source={require('../assets/building_icon.png')}
                      style={styles.companyStatIconImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.companyStatText}>
                      {formatCompanyBuildingsLabel(companyBuildingCount)}
                    </Text>
                  </View>
                  <View style={styles.companyStatItem}>
                    <Image
                      source={require('../assets/floor_icon.png')}
                      style={styles.companyStatIconImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.companyStatText}>
                      {formatCompanyFloorsLabel(companyFloorCount)}
                    </Text>
                  </View>
                  <View style={styles.companyStatItem}>
                    <Image
                      source={require('../assets/apartment_icon.png')}
                      style={styles.companyStatIconImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.companyStatText}>
                      {formatCompanyApartmentsLabel(companyApartmentCount)}
                    </Text>
                  </View>
                </View>
              )}
              {isCompany && <View style={styles.lastAdDivider} />}
              {isRegularUserAdView ? (
                <>
                  <View style={styles.lastAdDivider} />
                  <Text style={styles.lastAdDescription} numberOfLines={6}>
                    {String(lastAd.description || '').trim() || 'אין תיאור'}
                  </Text>
                </>
              ) : (
                <>
                  <View style={styles.lastAdPostedBy}>
                    <Text style={styles.lastAdPostedByLabel}>פורסם ע"י</Text>
                    <View style={styles.brokerCardBottomLocation}>
                      <Text style={styles.lastAdPostedByName}>{displayName}</Text>
                      {lastAd.profileImageUrl || displayImage ? (
                        <Image
                          source={{uri: lastAd.profileImageUrl || displayImage}}
                          style={styles.lastAdPostedByAvatar}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.lastAdPostedByAvatar,
                            styles.lastAdPostedByAvatarPlaceholder,
                          ]}>
                          <MaterialCommunityIcons
                            name="account"
                            size={14}
                            color="#fff"
                          />
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={styles.lastAdDescription} numberOfLines={6}>
                    {lastAd.description ||
                      'דירה מרווחת ומוארת בלב תל אביב. קרובה למרכזי בילוי, תחבורה ציבורית ופארקים. משופצת מהיסוד עם חומרים איכותיים. הזדמנות שלא תחזור!'}
                  </Text>
                </>
              )}
              <View style={styles.lastAdDivider} />
              {isBroker ? (
                <>
                  <View style={styles.lastAdFeaturesGrid}>
                    {adFeatures.map((item, index) => (
                      <View
                        key={`feat-${item.iconKey}-${index}`}
                        style={styles.lastAdFeatureChip}>
                        <Text style={styles.smartInfoBtnLabel}>
                          {item.label}
                        </Text>
                        <Image
                          source={getFeatureIconSource(item.iconKey)}
                          style={styles.smartInfoBtnIcon}
                          resizeMode="contain"
                        />
                      </View>
                    ))}
                  </View>
                  <View style={styles.lastAdDividerWhite} />
                </>
              ) : isCompany && projectOffersCards.length > 0 ? (
                <>
                  <View style={styles.projectOffersSection}>
                    <Text style={styles.projectOffersTitle}>הפרויקט מציע</Text>
                    {projectOffersCards.map(card => {
                      const areaStr =
                        card.area != null
                          ? `גודל: ${card.area} מ"ר`
                          : 'גודל: —';
                      const priceStr =
                        card.price != null
                          ? `החל מ-${Number(card.price).toLocaleString('he-IL')}₪`
                          : null;
                      const roomsStr =
                        card.rooms != null ? `מס' חדרים: ${card.rooms}` : null;
                      const isSimple = card.rooms == null;
                      const detailsLine = isSimple
                        ? `${areaStr} | ${priceStr || 'החל מ-—₪'}`
                        : [areaStr, roomsStr].filter(Boolean).join(' | ');
                      return (
                        <View key={card.key} style={styles.projectOfferCard}>
                          <View style={styles.projectOfferCardHeader}>
                            <Image
                              source={getProjectOfferIconName(card.iconKey)}
                              style={styles.companyStatIconImage}
                              resizeMode="contain"
                            />
                            <Text style={styles.projectOfferCardTitle}>
                              {card.title}
                            </Text>
                          </View>
                          <Text style={styles.projectOfferCardDetails}>
                            {detailsLine}
                          </Text>
                          {!isSimple && (
                            <Text style={styles.projectOfferCardPrice}>
                              {priceStr || 'החל מ-—₪'}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                  <View style={styles.lastAdDividerWhite} />
                  <View style={styles.constructionStatusBlock}>
                    <Text style={styles.constructionStatusTitle}>
                      מצב בנייה
                    </Text>
                    <View style={styles.constructionStatusRow}>
                      {CONSTRUCTION_STATUS_STEPS.map((step, index) => {
                        const status = (lastAd?.construction_status ?? '')
                          .toString()
                          .toLowerCase();
                        const isSelected =
                          status === (step.name || '').toLowerCase();
                        const isNotLast =
                          index < CONSTRUCTION_STATUS_STEPS.length - 1;
                        return (
                          <React.Fragment key={step.name}>
                            <View style={styles.constructionStatusStep}>
                              {isSelected ? (
                                <Image
                                  source={require('../assets/profile/check.png')}
                                  style={styles.constructionStatusCheckImage}
                                  resizeMode="contain"
                                />
                              ) : (
                                <View style={styles.constructionStatusCircle} />
                              )}
                              <Text
                                style={[
                                  styles.constructionStatusLabel,
                                  isSelected &&
                                    styles.constructionStatusLabelActive,
                                ]}>
                                {step.title}
                              </Text>
                            </View>
                            {isNotLast ? (
                              <View
                                style={styles.constructionStatusDottedLine}
                              />
                            ) : null}
                          </React.Fragment>
                        );
                      })}
                    </View>
                    <View style={styles.lastAdDivider} />
                  </View>
                </>
              ) : (
                <>
                  {isCompany ? (
                    <>
                      <View style={styles.constructionStatusBlock}>
                        <Text style={styles.constructionStatusTitle}>
                          מצב בנייה
                        </Text>
                        <View style={styles.constructionStatusRow}>
                          {CONSTRUCTION_STATUS_STEPS.map((step, index) => {
                            const status = (lastAd?.construction_status ?? '')
                              .toString()
                              .toLowerCase();
                            const isSelected =
                              status === (step.name || '').toLowerCase();
                            const isNotLast =
                              index < CONSTRUCTION_STATUS_STEPS.length - 1;
                            return (
                              <React.Fragment key={step.name}>
                                <View style={styles.constructionStatusStep}>
                                  {isSelected ? (
                                    <Image
                                      source={require('../assets/profile/check.png')}
                                      style={styles.constructionStatusCheckImage}
                                      resizeMode="contain"
                                    />
                                  ) : (
                                    <View
                                      style={styles.constructionStatusCircle}
                                    />
                                  )}
                                  <Text
                                    style={[
                                      styles.constructionStatusLabel,
                                      isSelected &&
                                        styles.constructionStatusLabelActive,
                                    ]}>
                                    {step.title}
                                  </Text>
                                </View>
                                {isNotLast ? (
                                  <View
                                    style={styles.constructionStatusDottedLine}
                                  />
                                ) : null}
                              </React.Fragment>
                            );
                          })}
                        </View>
                      </View>
                      <View style={styles.lastAdDividerWhite} />
                    </>
                  ) : null}
                  {isRegularUserAdView ? (
                    <>
                      <View style={styles.lastAdFeaturesGrid}>
                        {adFeatures.map((item, index) => (
                          <View
                            key={`feat-regular-${item.iconKey}-${index}`}
                            style={styles.lastAdFeatureChip}>
                            <Text style={styles.smartInfoBtnLabel}>
                              {item.label}
                            </Text>
                            <Image
                              source={getFeatureIconSource(item.iconKey)}
                              style={styles.smartInfoBtnIcon}
                              resizeMode="contain"
                            />
                          </View>
                        ))}
                      </View>
                      <View style={styles.lastAdDividerWhite} />
                    </>
                  ) : null}
                  {/* <View style={styles.lastAdDividerWhite} /> */}
                  {/* <View style={styles.lastAdFeaturesGrid}>
                    {adFeatures.map((item, index) => (
                      <View
                        key={`feat-${item.iconKey}-${index}`}
                        style={styles.lastAdFeatureChip}>
                        <Image
                          source={getFeatureIconSource(item.iconKey)}
                          style={styles.smartInfoBtnIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.smartInfoBtnLabel}>
                          {item.label}
                        </Text>
                      </View>
                    ))}
                  </View> */}
                </>
              )}
              {!isBroker && !isCompany && !isRegularUserAdView ? (
                <View style={styles.lastAdDividerWhite} />
              ) : null}
              {showLocationMap ? (
                <LocationMap
                  address={lastAd.address || lastAd.location || brokerAddress}
                  containerStyle={styles.locationMapContainer}
                />
              ) : null}
              </>
              )}
            </View>
            )}
          </View>
        )}

        {!openedFromPost && !isProfessional && !isBnbListingAdProfile && (
          <>
            <View style={styles.profileDivider} />
            {/* PiAi smart info at bottom: logo, intro text, 8 buttons (PNGs from ai except image.png) */}
            <View style={styles.smartInfoBlock}>
              <Image
                source={logoPiAi}
                style={styles.smartInfoLogo}
                resizeMode="contain"
              />
              <Text style={styles.smartInfoIntro}>
                קבל מידע חכם על סביבת הנכס בלחיצת כפתור
              </Text>
              <View style={styles.smartInfoGrid}>
                {SMART_BUTTONS.map((item, index) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.smartInfoBtn,
                      smartInfoLoading && styles.smartInfoBtnDisabled,
                    ]}
                    onPress={async () => {
                      if (smartInfoLoading) return;
                      setSmartInfoLoading(true);
                      setSmartInfoText('');
                      const result = await askSmartInfo(
                        item.key,
                        item.label,
                        adAddress,
                      );
                      setSmartInfoLoading(false);
                      if (result.success && result.text)
                        setSmartInfoText(result.text);
                      else if (result.text) setSmartInfoText(result.text);
                    }}
                    activeOpacity={0.8}
                    disabled={smartInfoLoading}>
                    <Text style={styles.smartInfoBtnLabel}>{item.label}</Text>
                    <Image
                      source={buttonSources[index]}
                      style={styles.smartInfoBtnIcon}
                      resizeMode="contain"
                    />
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
                // editable={false}
              />
            </View>
          </>
        )}

        {/* Broker block + My Properties – same scroll as whole screen */}
        {!isRegularUserAdView &&
          !openedFromPost &&
          !isProfessional &&
          !isBnbListingAdProfile && (
          <View style={styles.brokerCardOverlayLine} />
        )}
        {!isRegularUserAdView && !isBnbListingAdProfile && (
        <View style={styles.brokerCardBottom}>
          {!isCompany || showCompanyPostSpecialties ? (
            <>
              <View style={styles.brokerCardBottomHeader}>
                {renderPiRating()}
                <View style={styles.brokerCardBottomNameBlock}>
                  <Text style={styles.brokerCardBottomName}>{displayName}</Text>
                </View>
              </View>
              {brokerAddress ? (
                <View style={styles.brokerCardBottomLocationRow}>
                  <Text style={styles.brokerCardBottomAddress}>
                    {brokerAddress}
                  </Text>
                  <SimpleLineIcons
                    name="location-pin"
                    size={16}
                    color="#FFFFFF"
                  />
                </View>
              ) : null}
              {user?._fromTikTokPost && isBroker && openedFromPost ? (
                <View style={styles.brokerCardBottomSectionDivider} />
              ) : null}
              {!user?._fromTikTokPost && !isBroker && (
                <View style={styles.brokerCardBottomSectionDivider} />
              )}
              {!hideCompanyPostSpecialtiesBlock && (
                <>
                  <Text style={styles.brokerCardBottomSectionTitle}>התמחויות</Text>
                  <View style={styles.brokerCardBottomTags}>
                    {overlayActivityRegions.length > 0 ? (
                      overlayActivityRegions.map((s, i) => (
                        <View key={i} style={styles.brokerCardBottomTag}>
                          <Text style={styles.brokerCardBottomTagText}>
                            {typeof s === 'string'
                              ? s
                              : (s?.label ?? s?.name ?? String(s))}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.brokerCardBottomTagEmpty}>
                        אין התמחויות
                      </Text>
                    )}
                  </View>
                </>
              )}
              {!user?._fromTikTokPost && (
                <View style={styles.brokerCardBottomContentDivider} />
              )}
            </>
          ) : null}
          {isCompany && (!showCompanyPostSpecialties || user?._fromTikTokPost) ? (
            <>
              {showCompanyPostSpecialties ? (
                <View style={styles.brokerCardBottomContentDivider} />
              ) : null}
              <Text style={styles.brokerCardBottomAboutTitle}>אודות החברה</Text>
            </>
          ) : null}
          <Text style={styles.brokerCardBottomBio}>
            {brokerBio && String(brokerBio).trim() ? brokerBio : 'אין תיאור'}
          </Text>
          {!hideMyPropertiesSection && <View style={styles.brokerCardBottomDivider} />}
        </View>
        )}

        {!isRegularUserAdView &&
          !hideMyPropertiesSection &&
          !isBnbListingAdProfile && (
        <View style={styles.myPropertiesSection}>
          <View style={styles.myPropertiesHeader}>
            <Text style={styles.myPropertiesTitle}>
              {isCompany ? 'פרוייקטים נבחרים' : 'הנכסים שלי'}
            </Text>
            {isCompany ? (
              openedFromCompaniesDirectory ? (
                <TouchableOpacity
                  onPress={() =>
                    typeof onClose === 'function' ? onClose() : undefined
                  }
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="לכל הפרוייקטים שלנו">
                  <Text style={styles.myPropertiesSeeAllText}>
                    לכל הפרוייקטים שלנו
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() =>
                    typeof onOpenAllListings === 'function' && creatorId
                      ? onOpenAllListings(creatorId)
                      : undefined
                  }
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="לכל הפרוייקטים שלנו">
                  <Text style={styles.myPropertiesSeeAllText}>
                    לכל הפרוייקטים שלנו
                  </Text>
                </TouchableOpacity>
              )
            ) : (
              <TouchableOpacity
                onPress={() =>
                  typeof onOpenAllListings === 'function' && creatorId
                    ? onOpenAllListings(creatorId)
                    : undefined
                }
                activeOpacity={0.7}>
                <Text style={styles.myPropertiesSeeAllText}>
                  לכל הנכסים שלי
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {userListingsLoading ? (
            <View style={styles.myPropertiesListPlaceholder}>
              <Text style={styles.myPropertiesPlaceholderText}>טוען...</Text>
            </View>
          ) : userListings.length === 0 ? (
            <View style={styles.myPropertiesListPlaceholder}>
              <Text style={styles.myPropertiesPlaceholderText}>
                אין נכסים להצגה
              </Text>
            </View>
          ) : (
            <FlatList
              data={userListings.filter(l => !isPostListingRecord(l))}
              horizontal
              inverted
              showsHorizontalScrollIndicator={false}
              style={styles.myPropertiesFlatList}
              contentContainerStyle={styles.myPropertiesListContent}
              keyExtractor={item => String(item.id)}
              renderItem={({item}) => {
                const imgs = item.listing_images || [];
                const firstImg = imgs[0]?.image_url;
                const purposeRaw = item.purpose || item.search_purpose || '';
                const listingCategory = Number(item.category);
                const purposeLabel =
                  listingCategory === 5
                    ? 'BNB'
                    : purposeRaw === 'sale' ||
                        String(purposeRaw).toLowerCase() === 'sale' ||
                        purposeRaw === 'מכירה'
                      ? 'למכירה'
                      : 'להשכרה';
                const priceNum = item.price != null ? Number(item.price) : null;
                const priceStr =
                  priceNum != null && !isNaN(priceNum)
                    ? `₪${Math.round(priceNum).toLocaleString('he-IL')}`
                    : '—';
                const location =
                  (
                    item.address ||
                    item.land_address ||
                    item.search_address ||
                    ''
                  ).trim() || '—';
                return (
                  <View style={styles.myPropertiesCard}>
                    <View style={styles.myPropertiesCardImageWrap}>
                      {firstImg ? (
                        <Image
                          source={{uri: firstImg}}
                          style={styles.myPropertiesCardImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.myPropertiesCardImage,
                            styles.myPropertiesCardImagePlaceholder,
                          ]}>
                          <MaterialCommunityIcons
                            name="image-outline"
                            size={40}
                            color="rgba(255,255,255,0.4)"
                          />
                        </View>
                      )}
                      {isCompany ? (
                        <Image
                          source={require('../assets/pre-sale.png')}
                          style={styles.myPropertiesCardBadgeImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.myPropertiesCardBadge}>
                          <Text style={styles.myPropertiesCardBadgeText}>
                            {purposeLabel}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.myPropertiesCardBottom}>
                      <Text style={styles.myPropertiesCardPrice}>
                        {priceStr}
                      </Text>
                      <Text
                        style={styles.myPropertiesCardLocation}
                        numberOfLines={1}>
                        {location}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
        )}

        {/* Contact Details – פרטי התקשרות */}
        {!isRegularUserAdView && !isBnbListingAdProfile && (
          <View style={styles.contactDetailsDivider} />
        )}
        {!isRegularUserAdView && !isBnbListingAdProfile && (
        <View style={styles.contactDetailsSection}>
          <Text style={styles.contactDetailsTitle}>פרטי התקשרות</Text>
          <View style={styles.contactDetailsContent}>
            <View style={styles.contactDetailsRight}>
              <ProfileAvatar
                uri={contactLogo || undefined}
                name={displayName}
                size={100}
                style={styles.contactDetailsProfileAvatar}
                imageStyle={
                  Platform.OS === 'web' ? {objectFit: 'cover'} : undefined
                }
              />
              <Text style={styles.contactDetailsAgencyName}>{displayName}</Text>
              {isCompany && (
                <TouchableOpacity
                  style={[styles.contactDetailsRow]}
                  onPress={() => {}}>
                  <Text style={styles.contactDetailsLink}>{contactEmail}</Text>
                  <Image
                    source={require('../assets/web-icon.png')}
                    style={styles.contactDetailsIconImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              )}
              {contactPhones.map((phone, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.contactDetailsRow}
                  onPress={() => {}}>
                  <Text style={styles.contactDetailsLink}>
                    {String(phone).trim()}
                  </Text>
                  <Image
                    source={contactPhoneIconSource}
                    style={styles.contactDetailsIconImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              ))}
              {contactEmail ? (
                <TouchableOpacity
                  style={[styles.contactDetailsRow, {marginBottom: 0}]}
                  onPress={() => {}}>
                  <Text style={styles.contactDetailsLink}>{contactEmail}</Text>
                  <Image
                    source={contactEmailIconSource}
                    style={styles.contactDetailsIconImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.contactDetailsCopyBtn}
              onPress={copyContactDetails}>
              <MaterialCommunityIcons
                name="content-copy"
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        </View>
        )}
        {!isRegularUserAdView && !isBnbListingAdProfile && (
          <View style={styles.contactDetailsDivider} />
        )}

        {/* Rating & Reviews – כמות כוכבי פאי / ביקורות (לא מציגים דירוג עצמי בפרופיל שלך) */}
        {!isRegularUserAdView && !isBnbListingAdProfile ? (
        <View style={styles.reviewsSection}>
          {!isOwnProfile ? (
            <>
              <Text style={styles.reviewsPiTitle}>
                כמה כוכבי פאי היית נותן על השירות שקיבלת?
              </Text>
              <RatingImprovePicker
                value={selectedRating}
                onChange={setSelectedRating}
              />
              <Pressable
                onPress={() => {
                  handleRate();
                }}
                disabled={submitReviewLoading}
                style={({pressed}) => [
                  styles.reviewsRateBtnWrap,
                  pressed && styles.reviewsRateBtnPressed,
                ]}>
                <LinearGradient
                  colors={['#FEE787', '#BD9947', '#9C6522']}
                  locations={[0.04, 0.51, 0.88]}
                  start={{x: 0.4, y: 0}}
                  end={{x: 0.4, y: 1}}
                  style={styles.reviewsRateBtnGradient}
                >
                  <Text style={styles.reviewsRateBtnLabel}>דרג</Text>
                </LinearGradient>
              </Pressable>
            </>
          ) : null}

          <Text style={styles.reviewsListTitle}>ביקורות</Text>
          {!isOwnProfile ? (
            <TextInput
              style={styles.reviewsInput}
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="הוסף ביקורת"
              placeholderTextColor="rgba(255,255,255,0.4)"
            />
          ) : null}
          {reviewsLoading ? (
            <Text style={styles.reviewsPlaceholder}>טוען ביקורות...</Text>
          ) : reviews.length === 0 ? (
            <Text style={styles.reviewsPlaceholder}>אין עדיין ביקורות</Text>
          ) : (
            visibleReviews.map(r => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <View style={styles.reviewCardAvatarWrap}>
                    {r.reviewer_image_url ? (
                      <Image
                        source={{uri: r.reviewer_image_url}}
                        style={styles.reviewCardAvatar}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.reviewCardAvatar,
                          styles.avatarPlaceholder,
                        ]}>
                        <MaterialCommunityIcons
                          name="account"
                          size={24}
                          color="rgba(255,255,255,0.6)"
                        />
                      </View>
                    )}

                    <Image
                      source={getStarSource(
                        Math.min(5, Math.max(1, Number(r.rating) || 1)) - 1,
                      )}
                      style={[
                        r.rating === 1
                          ? styles.reviewCardStarBadgeImage1
                          : Number(r.rating) === 5
                            ? styles.reviewCardStarBadgeImage5
                            : styles.reviewCardStarBadgeImage,
                      ]}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.contactDetailsRight}>
                    <Text style={styles.reviewCardName}>
                      {r.reviewer_name || 'משתמש'}
                    </Text>
                    <Text style={styles.reviewCardDate}>
                      {formatReviewDate(r.created_at)}
                    </Text>
                  </View>
                </View>
                {r.comment ? (
                  <Text style={styles.reviewCardBody}>{r.comment}</Text>
                ) : null}
              </View>
            ))
          )}
          {!reviewsLoading && reviews.length > 0 ? (
            <View style={styles.readMoreWrap}>
              <Pressable
                onPress={() => {
                  if (typeof onOpenAllReviews === 'function') {
                    onOpenAllReviews(reviews);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel="כל הביקורות">
                <Text style={styles.readMoreText}>קרא עוד</Text>
              </Pressable>
              <View style={styles.contactDetailsDivider} />
            </View>
          ) : null}
          <View style={styles.profileCtaSection}>
            <TouchableOpacity
              style={styles.profileCtaWarningBtn}
              onPress={handleReportPress}
              activeOpacity={0.85}>
              <Text style={styles.profileCtaWarningText}>דווח</Text>
              <MaterialCommunityIcons
                name="alert-outline"
                size={22}
                color="#F7F3E6"
              />
            </TouchableOpacity>
            {(isCompany || isProfessional) && !user?._fromTikTokPost && (
              <>
                <View style={styles.profilePiChatWrap}>
                  <TouchableOpacity
                    style={styles.profileCtaChatImageOnlyBtn}
                    onPress={handleChatPress}
                    activeOpacity={0.85}>
                    <Image
                      source={require('../assets/menu/pichat.png')}
                      style={styles.profileCtaChatImageOnlyAsset}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                  {unreadChatCount > 0 ? (
                    <View
                      style={styles.profilePiChatBadge}
                      pointerEvents="none"
                      accessibilityRole="text"
                      accessibilityLabel={`הודעות חדשות: ${unreadChatCount > 99 ? 'יותר מ־99' : unreadChatCount}`}>
                      <Text style={styles.profilePiChatBadgeText} numberOfLines={1}>
                        {unreadChatCount > 99 ? '99+' : String(unreadChatCount)}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={styles.profileCtaPhoneBtn}
                  onPress={handleCallPress}
                  activeOpacity={0.85}>
                  <Text
                    style={styles.profileCtaPhoneText}
                    numberOfLines={1}
                    ellipsizeMode="tail">
                    פנייה בטלפון {primaryContactPhone}
                  </Text>
                  <Image
                    source={require('../assets/phone.png')}
                    style={styles.profileCtaPhoneIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        ) : isRegularUserAdView && !isBnbListingAdProfile ? (
          <View style={styles.profileCtaSection}>
            <TouchableOpacity
              style={styles.profileCtaWarningBtn}
              onPress={handleReportPress}
              activeOpacity={0.85}>
              <Text style={styles.profileCtaWarningText}>דווח</Text>
              <MaterialCommunityIcons
                name="alert-outline"
                size={22}
                color="#F7F3E6"
              />
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      {useFixedListingTopNav && (
        <View
          style={[
            styles.listingHeroNavFixed,
            showFixedBackOnly && styles.listingHeroNavBackOnly,
            {paddingTop: heroNavPaddingTop},
          ]}
          pointerEvents="box-none"
          collapsable={false}>
          {showFixedCompanyHero ? (
            <>
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.8}
                style={styles.heroCircleBtn}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <SvgXml xml={HERO_NAV_BACK_XML} width={11} height={16} />
              </TouchableOpacity>
              <View style={styles.heroTopBarRight}>
                <TouchableOpacity
                  onPress={handleCompanyHeroToggleFavorite}
                  activeOpacity={0.8}
                  style={styles.heroCircleBtn}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                  <SvgXml
                    xml={
                      companyHeroFavorited
                        ? HERO_NAV_HEART_LIKED_XML
                        : HERO_NAV_HEART_XML
                    }
                    width={20}
                    height={19}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleProfileShare}
                  activeOpacity={0.8}
                  style={styles.heroCircleBtn}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                  <SvgXml xml={HERO_NAV_SHARE_XML} width={24} height={24} />
                </TouchableOpacity>
              </View>
            </>
          ) : showFixedProHero ? (
            <>
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.8}
                style={styles.heroCircleBtn}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={22}
                  color="#fff"
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (
                    Platform.OS === 'web' &&
                    typeof navigator !== 'undefined' &&
                    navigator.share
                  ) {
                    navigator
                      .share({
                        title: displayName || '',
                        url:
                          typeof window !== 'undefined'
                            ? window.location.href
                            : '',
                      })
                      .catch(() => {});
                  }
                }}
                activeOpacity={0.8}
                style={styles.heroCircleBtn}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <MaterialCommunityIcons
                  name="share-variant"
                  size={20}
                  color="#fff"
                />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPress={onClose}
              style={styles.backBtn}
              hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}>
              <MaterialCommunityIcons
                name="chevron-left"
                size={28}
                color="#fff"
              />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Full-screen image slider modal */}
      {fullScreenImageModalVisible && lastAdImages.length > 0 && (
        <View style={styles.fullScreenImageModal}>
          <TouchableOpacity
            style={[styles.fullScreenImageCloseBtn, {top: insets.top + 10}]}
            onPress={() => setFullScreenImageModalVisible(false)}
            activeOpacity={0.8}>
            <MaterialCommunityIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <FlatList
            ref={fullScreenCarouselRef}
            data={lastAdImages}
            horizontal
            pagingEnabled
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={fullScreenImageIndex}
            getItemLayout={(data, index) => ({
              length: Dimensions.get('window').width,
              offset: Dimensions.get('window').width * index,
              index,
            })}
            onMomentumScrollEnd={e => {
              const i = Math.round(
                e.nativeEvent.contentOffset.x / Dimensions.get('window').width,
              );
              setFullScreenImageIndex(i);
            }}
            renderItem={({item}) => (
              <View
                style={{
                  width: Dimensions.get('window').width,
                  height: Dimensions.get('window').height,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: '#000',
                }}>
                <Image
                  source={item}
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                  resizeMode="contain"
                />
              </View>
            )}
            keyExtractor={(_, i) => String(i)}
          />

          {/* Image counter and dots at bottom */}
          <View style={styles.fullScreenImageCounter}>
            <Text style={styles.fullScreenImageCounterText}>
              {fullScreenImageIndex + 1} / {lastAdImages.length}
            </Text>
          </View>

          {lastAdImages.length > 1 && (
            <View style={styles.fullScreenImageDots}>
              {lastAdImages.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    setFullScreenImageIndex(i);
                    fullScreenCarouselRef.current?.scrollToIndex({
                      index: i,
                      animated: true,
                    });
                  }}
                  style={[
                    styles.fullScreenImageDot,
                    i === fullScreenImageIndex &&
                      styles.fullScreenImageDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mainDeepBlue,
    position: 'relative',
    ...Platform.select({
      web: {
        minHeight: '100%',
        width: '100%',
      },
      default: {},
    }),
  },
  scroll: {flex: 1, zIndex: 0},
  scrollContent: {paddingBottom: 80},
  backBtn: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 10,
    top: 0,
    zIndex: 100,
  },
  profileBlock: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E1D27',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadgeSending: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
  },
  userName: {
    color: '#F7F3E6',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'Rubik-Medium',
  },
  userEmail: {
    color: Colors.grey200,
    fontSize: 14,
    marginBottom: 25,
    fontFamily: 'Rubik-Regular',
    color: '#FFFFFFCC',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 65,
    marginBottom: 25,
  },
  stat: {alignItems: 'center'},
  statNumber: {
    color: '#F7F3E6',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
  },
  statLabel: {
    color: '#FFFFFFCC',
    fontFamily: 'Rubik-Regular',
    fontSize: 12,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: Colors.mainDeepBlue,
    marginBottom: 26,
  },
  actionBtnTouch: {},
  actionBtnImage: {width: 107, height: 59},
  actionBtnDisabled: {opacity: 0.45},
  profileDivider: {
    height: 1,
    backgroundColor: '#373548',
    marginBottom: 16,
    alignSelf: 'stretch',
    marginHorizontal: 24,
  },
  myPropertiesSection: {marginTop: 20, marginBottom: 24, paddingHorizontal: 0},
  myPropertiesHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  myPropertiesTitle: {
    color: '#D2D0DC',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  myPropertiesSeeAllText: {
    color: GOLD,
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
  },
  myPropertiesListContent: {paddingHorizontal: 12},
  myPropertiesListPlaceholder: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  myPropertiesPlaceholderText: {color: Colors.grey200, fontSize: 14},
  myPropertiesCard: {
    width: Math.round(SCREEN_WIDTH * 0.52),
    marginHorizontal: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: CARD_BG,
  },
  myPropertiesCardImageWrap: {
    position: 'relative',
    width: '100%',
    height: 105,
  },
  myPropertiesCardImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  myPropertiesCardImagePlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myPropertiesCardBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#fff',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  myPropertiesCardBadgeImage: {
    width: 90,
    height: 32,
    position: 'absolute',
    top: 6,
    right: 6,
  },
  myPropertiesCardBadgeText: {
    color: '#1E1D27',
    fontSize: 12,
    fontFamily: 'Rubik-Medium',
  },
  myPropertiesCardBottom: {paddingVertical: 12, paddingHorizontal: 12},
  myPropertiesCardPrice: {
    color: '#F7F3E6',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    textAlign: 'right',
    marginBottom: 5,
  },
  myPropertiesCardLocation: {
    color: '#FFFFFFCC',
    fontSize: 12,
    textAlign: 'right',
    fontFamily: 'Rubik-Regular',
  },
  smartInfoBlock: {
    paddingHorizontal: 24,
    paddingTop: 10,
    marginBottom: 10,
    alignItems: 'center',
    zIndex: 1,
  },
  smartInfoLogo: {
    width: 87,
    height: 35,
    marginBottom: 25,
  },
  smartInfoIntro: {
    color: '#fff',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  smartInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  smartInfoBtn: {
    flexDirection: 'row',
    width: '48.5%',
    height: 52,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    backgroundColor: CARD_BG,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  smartInfoBtnDisabled: {opacity: 0.6},
  smartInfoBtnIcon: {width: 22, height: 22},
  smartInfoBtnLabel: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Rubik-Regular',
  },
  smartInfoTextEntry: {
    width: '100%',
    height: 240,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 16,
    color: '#fff',
    fontSize: 14,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#8C85B3',
    ...(Platform.OS === 'web' ? {scrollbarColor: '#555 #1e1d27'} : {}),
  },

  brokerCardOverlayLine: {
    height: 1,
    backgroundColor: '#373548',
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 12,
  },
  brokerCardBottom: {
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  brokerCardBottomHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    gap: 24,
    width: '100%',
    marginBottom: 4,
  },
  brokerCardBottomSectionDivider: {
    height: 1,
    backgroundColor: '#373548',
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  brokerCardBottomNameBlock: {
    flex: 1,
    alignItems: 'flex-end',
  },
  brokerCardBottomName: {
    color: '#F7F3E6',
    fontSize: 28,
    lineHeight: 31,
    fontFamily: 'Rubik-SemiBold',
    textAlign: 'right',
  },
  brokerCardBottomLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    width: '100%',
    marginBottom: 8,
  },
  brokerCardBottomLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  brokerCardBottomAddress: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 32,
    textAlign: 'right',
    fontFamily: 'Rubik-Regular',
  },
  companyStatsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    alignSelf: 'stretch',
    marginVertical: 10,
    paddingHorizontal: 0,
  },
  companyStatItem: {flexDirection: 'row-reverse', alignItems: 'center', gap: 6},
  companyStatIconImage: {width: 26, height: 26},
  companyStatText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
  },
  brokerCardBottomSectionTitle: {
    color: '#D2D0DC',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    marginBottom: 24,
    textAlign: 'right',
  },
  brokerCardBottomAboutTitle: {
    color: '#D2D0DC',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    marginBottom: 6,
    textAlign: 'right',
  },
  brokerCardBottomTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 12,
    alignSelf: 'flex-end',
  },
  brokerCardBottomTag: {
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 35,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  brokerCardBottomTagText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
  },
  brokerCardBottomTagEmpty: {
    color: Colors.grey200,
    fontSize: 13,
    fontStyle: 'italic',
  },
  brokerCardBottomBio: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 32,
    textAlign: 'right',
    fontFamily: 'Rubik-Regular',
  },
  brokerCardBottomContentDivider: {
    height: 1,
    backgroundColor: '#373548',
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  brokerCardBottomDivider: {
    height: 1,
    backgroundColor: '#373548',
    alignSelf: 'stretch',
    marginTop: 12,
  },
  myPropertiesFlatList: {height: 170},
  contactDetailsDivider: {
    height: 1,
    backgroundColor: '#373548',
    marginHorizontal: 24,
    marginVertical: 16,
  },
  contactDetailsSection: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    paddingBottom: 24,
  },
  contactDetailsTitle: {
    color: '#D2D0DC',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
    marginBottom: 16,
  },
  contactDetailsContent: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  contactDetailsRight: {flex: 1, alignItems: 'flex-end'},
  contactDetailsProfileAvatar: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  contactDetailsAgencyName: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
    marginBottom: 14,
  },
  contactDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  contactDetailsLink: {
    color: '#fff',
    fontFamily: 'Rubik-Regular',
    fontSize: 16,
    textDecorationLine: 'underline',
    marginRight: 8,
  },
  contactDetailsIconImage: {
    width: 24,
    height: 24,
  },
  contactDetailsCopyBtn: {
    alignSelf: 'flex-end',
  },
  reviewsSection: {paddingHorizontal: 10, paddingBottom: 32},
  reviewsPiTitle: {
    color: '#D2D0DC',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
    marginBottom: 14,
  },
  readMoreWrap: {
    marginBottom: 14,
  },
  readMoreText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  profileCtaSection: {
    marginHorizontal: 12,
    marginBottom: 12,
    gap: 14,
  },
  profileCtaWarningBtn: {
    height: 40,
    borderRadius: 28,
    backgroundColor: '#4D4966',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  profileCtaWarningText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
  },
  profileCtaGoldBtn: {
    height: 52,
    borderRadius: 28,
    backgroundColor: '#D8B04D',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  profileCtaGoldText: {
    color: '#1E1D27',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
  },
  profileCtaChatBadgeLogo: {
    width: 85,
    height: 38,
  },
  profilePiChatWrap: {
    width: '100%',
    position: 'relative',
    alignSelf: 'stretch',
    overflow: 'visible',
  },
  profilePiChatBadge: {
    position: 'absolute',
    top: -2,
    right: 2,
    minWidth: 24,
    height: 24,
    minHeight: 24,
    borderRadius: 12,
    backgroundColor: '#5EEAD4',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    zIndex: 10,
    elevation: 6,
    shadowColor: '#5EEAD4',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.5,
    shadowRadius: 5,
    borderWidth: 2,
    borderColor: '#1E1D27',
  },
  profilePiChatBadgeText: {
    color: '#1a1a2e',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Rubik-Medium',
    includeFontPadding: false,
    textAlign: 'center',
  },
  profileCtaChatImageOnlyBtn: {
    width: '100%',
    height: 52,
    minHeight: 52,
    maxHeight: 52,
    alignSelf: 'stretch',
    borderRadius: 28,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCtaChatImageOnlyAsset: {
    width: '100%',
    height: 52,
    maxHeight: 52,
  },
  profileCtaPhoneBtn: {
    width: '100%',
    height: 52,
    minHeight: 52,
    maxHeight: 52,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#00F5FF',
    backgroundColor: '#4D4966',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    alignSelf: 'stretch',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {boxSizing: 'border-box'} : {}),
  },
  profileCtaPhoneText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Rubik-Medium',
    flexShrink: 1,
  },
  profileCtaPhoneIcon: {
    width: 26,
    height: 26,
  },
  reviewsRateBtnWrap: {
    marginTop: 28,
    marginBottom: 24,
    alignSelf: 'center',
    width: '80%',
    alignItems: 'center',
  },
  reviewsRateBtnPressed: {opacity: 0.85},
  reviewsRateBtnGradient: {
    height: 44,
    borderRadius: 846,
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewsRateBtnLabel: {
    color: '#1E1D27',
    fontSize: 20,
    fontFamily: 'Rubik-Medium',
    letterSpacing: 0.2,
  },
  reviewsListTitle: {
    color: '#D2D0DC',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Rubik-Regular',
  },
  reviewsInput: {
    borderWidth: 1,
    borderColor: '#8C85B3',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: '#fff',
    fontSize: 14,
    textAlign: 'right',
    height: 52,
    marginBottom: 30,
    marginHorizontal: 12,
  },
  reviewsPlaceholder: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 16,
  },
  reviewCard: {
    backgroundColor: '#2B2A39',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    marginHorizontal: 12,
  },
  reviewCardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewCardAvatarWrap: {
    position: 'relative',
    marginLeft: 12,
    width: 60,
    alignItems: 'center',
  },
  reviewCardAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  reviewCardStarBadgeImage1: {
    width: 35,
    height: 35,
    position: 'absolute',
    bottom: -12,
    left: '50%',
    marginLeft: -17.5,
  },
  /** 5★ in ביקורות only — larger than 2–4★ badge. */
  reviewCardStarBadgeImage5: {
    width: 36,
    height: 36,
    position: 'absolute',
    bottom: -10,
    left: '50%',
    marginLeft: -18,
  },
  reviewCardStarBadgeImage: {
    width: 25,
    height: 25,
    position: 'absolute',
    bottom: -7,
    left: '50%',
    marginLeft: -12.5,
  },
  reviewCardName: {
    color: '#F7F3E6',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    textAlign: 'right',
  },
  reviewCardDate: {
    color: '#D2D0DC',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
    fontFamily: 'Rubik-Regular',
  },
  reviewCardBody: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'right',
    fontFamily: 'Rubik-Regular',
    marginTop: 10,
  },

  lastAdCard: {
    width: '100%',
    backgroundColor: Colors.mainDeepBlue,
    marginBottom: 24,
  },
  lastAdImageWrap: {
    width: SCREEN_WIDTH,
    height: LAST_AD_IMAGE_HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroTopBarOverlay: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  /**
   * Pinned over ScrollView (sibling, rendered after ScrollView so it always stacks on top).
   * Use `absolute` on web+native so the bar is not in the document scroll; `fixed` breaks when
   * any ancestor uses transform (common in RN Web).
   */
  listingHeroNavFixed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    minHeight: 48,
    zIndex: 10000,
    elevation: 24,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      web: {
        pointerEvents: 'box-none',
      },
      default: {},
    }),
  },
  listingHeroNavBackOnly: {
    justifyContent: 'flex-start',
  },
  heroCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 1000,
    backgroundColor: 'rgba(39,38,47,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTopBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  lastAdImageWrapGridMode: {
    width: SCREEN_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  lastAdImage: {height: LAST_AD_IMAGE_HEIGHT},
  lastAdGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // aspectRatio = width/height; below 1 yields taller cells than 1:1 (opened-from-post grid).
  lastAdGridItem: {
    width: '33.3333%',
    aspectRatio: 0.78,
    // Tight gutter: was 4 — smaller gaps between tiles and less inset on left/right of the grid.
    paddingVertical: 2,
    paddingHorizontal: 1,
  },
  lastAdGridPlaceholderCell: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2B2A39',
  },
  lastAdGridImage: {
    width: '100%',
    height: '100%',
  },
  lastAdGridVideoCell: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1D27',
  },
  lastAdImagePlaceholder: {alignItems: 'center', justifyContent: 'center'},
  lastAdPiAndPurposeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  lastAdPiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  lastAdPiBadgeImage: {
    width: 85,
    height: 85,
    position: 'absolute',
    marginLeft: -7,
    top: -35,
  },
  lastAdPiText: {
    color: '#FFD275',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
  },
  lastAdDots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  lastAdDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  lastAdDotActive: {
    backgroundColor: GOLD,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lastAdExpandWrap: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandIcon: {
    width: 18,
    height: 18,
    tintColor: '#fff',
  },
  lastAdBody: {
    paddingHorizontal: 16,
    paddingTop: 25,
    paddingBottom: 16,
    alignItems: 'flex-end',
  },
  preSaleBadgeImage: {
    width: 115,
    height: 40,
  },
  lastAdPurposeTag: {
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  lastAdPurposeText: {
    color: '#1E1D27',
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
  },
  lastAdProfessionalName: {
    color: '#F7F3E6',
    fontSize: 28,
    fontFamily: 'Rubik-SemiBold',
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: 12,
  },
  lastAdPriceRow: {
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  lastAdPrice: {
    color: '#F7F3E6',
    fontSize: 28,
    fontFamily: 'Rubik-SemiBold',
    textAlign: 'right',
  },
  lastAdLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginBottom: 10,
  },
  lastAdLocationText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    textAlign: 'right',
    fontFamily: 'Rubik-Regular',
  },
  lastAdDivider: {
    height: 1,
    backgroundColor: '#373548',
    marginVertical: 12,
    alignSelf: 'stretch',
  },
  locationMapContainer: {alignSelf: 'stretch', width: '100%'},
  constructionStatusBlock: {
    marginBottom: 12,
    alignSelf: 'stretch',
    width: '100%',
    alignItems: 'flex-end',
  },
  constructionStatusTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'right',
  },
  constructionStatusRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'nowrap',
    width: '100%',
    alignSelf: 'stretch',
  },
  constructionStatusStep: {alignItems: 'center', minWidth: 48},
  constructionStatusCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  constructionStatusCheckImage: {
    width: 24,
    height: 24,
  },
  constructionStatusLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  constructionStatusLabelActive: {color: GOLD, fontWeight: '600'},
  constructionStatusDottedLine: {
    flex: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: 18,
  },
  lastAdPostedBy: {alignItems: 'flex-end', marginBottom: 8},
  lastAdPostedByLabel: {
    color: '#D2D0DC',
    fontSize: 11,
    textAlign: 'right',
    marginBottom: 7,
    fontFamily: 'Rubik-Regular',
  },
  lastAdPostedByName: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  lastAdPostedByAvatar: {width: 24, height: 24, borderRadius: 12},
  lastAdPostedByAvatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastAdDescription: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'right',
    fontFamily: 'Rubik-Regular',
  },
  lastAdDividerWhite: {
    height: 1,
    backgroundColor: '#373548',
    marginVertical: 16,
    alignSelf: 'stretch',
  },
  lastAdFeaturesGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 0,
  },
  lastAdFeatureChip: {
    width: '48.5%',
    height: 52,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  projectOffersSection: {
    marginTop: 0,
    marginBottom: 0,
    width: '100%',
    alignSelf: 'stretch',
  },
  projectOffersTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
    marginBottom: 12,
  },
  projectOfferCard: {
    backgroundColor: '#2B2A39',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'flex-end',
  },
  projectOfferCardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  projectOfferCardTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  projectOfferCardDetails: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'right',
    fontFamily: 'Rubik-Regular',
    marginBottom: 4,
  },
  projectOfferCardPrice: {
    color: '#F7F3E6',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  fullScreenImageModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20000,
  },
  fullScreenImageCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },
  fullScreenImageCounter: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fullScreenImageCounterText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fullScreenImageDots: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  fullScreenImageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  fullScreenImageDotActive: {
    backgroundColor: GOLD,
    width: 12,
    height: 8,
    borderRadius: 4,
  },
});

export default UserProfileScreen;
