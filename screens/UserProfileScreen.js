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
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import {MaterialCommunityIcons, SimpleLineIcons} from '@expo/vector-icons';
import {Video, ResizeMode} from 'expo-av';
import * as Clipboard from 'expo-clipboard';
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
  cancelFollowRequest,
  unfollowUser,
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
import {pickTopViewedListingForProfile} from '../utils/pickTopViewedListingForProfile';
import {
  formatCompanyApartmentsLabel,
  formatCompanyBuildingsLabel,
  formatCompanyFloorsLabel,
  formatPriceHe,
  firstImageUrl,
  firstVideoUrl,
  displayPiRatingFromReviews,
} from '../utils/listingGridCardFigma';
import {resolveFeedVideoPosterUri} from '../utils/feedVideoPreload';
import {muxThumbnailUri} from '../utils/videoPlayback';
import {getUserProfileImageUrl} from '../utils/userProfileImage';
import {
  HERO_NAV_BACK_XML,
  HERO_NAV_HEART_LIKED_XML,
  HERO_NAV_HEART_XML,
  HERO_NAV_SHARE_XML,
} from '../utils/heroNavFigmaIcons';
import ProfileAvatar from '../components/ProfileAvatar';
import {FollowPlusBadge} from '../components/FollowPlusBadge';
import BnbListingProfileContent from '../components/BnbListingProfileContent';
import PartnersListingProfileContent from '../components/PartnersListingProfileContent';
import CompanyLandListingProfileContent from '../components/CompanyLandListingProfileContent';
import {parseLandBlockParcelFromListing} from '../utils/enrichListingForUserProfile';
import {buildProfileAdFeatureLabels} from '../utils/listingAmenities';
import {normalizeLandOfferParcels} from '../utils/landListingFields';
import {
  flexEnd,
  flexStart,
  forceLtrStyle,
  forceRtlStyle,
} from '../utils/rtlLayout';

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
const POST_GRID_COLUMNS = 3;
const POST_GRID_ROWS = 2;
const POST_GRID_PAGE_SIZE = POST_GRID_COLUMNS * POST_GRID_ROWS;
const POST_GRID_CELL_WIDTH = SCREEN_WIDTH / POST_GRID_COLUMNS;
const POST_GRID_ROW_HEIGHT = POST_GRID_CELL_WIDTH / 0.78;
const POST_GRID_PAGE_HEIGHT = POST_GRID_ROW_HEIGHT * POST_GRID_ROWS + 2;
const LAST_AD_IMAGE_HEIGHT = 320;
const SMART_BTN_SIZE = Math.floor((SCREEN_WIDTH - 48 - 10) / 2); // 2 cols, padding 24*2, gap 10

/** Last-ad hero when no gallery images: fallback if remote logo/avatar URL fails to load (common on web). */
const lastAdImageEndPlaceholder = require('../assets/improve/end.png');
/** Pi badge: always bundle — web `{ uri: origin + '/pi-badge.png' }` often 404s or breaks on subpaths. */
const piBadgeSource = require('../assets/pi-badge.png');
const piBadgeSourceRing = require('../assets/pi-badge-ring.png');
const logoPiAi = require('../assets/paiailogo.png');
const postGridViewIcon = require('../assets/tiktok/views.png');

const formatPostViewCount = n => {
  const num = Number(n) || 0;
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return String(num);
};

const getListingViewCount = listing =>
  Number(listing?.view_count ?? listing?.views ?? 0) || 0;

const isVideoLikeMediaUrl = url => {
  const s = String(url || '')
    .trim()
    .toLowerCase();
  if (!s) return true;
  if (/\.(mp4|webm|mov|m4v|mkv)(\?|#|$)/i.test(s)) return true;
  if (/\/videos?\//i.test(s)) return true;
  return false;
};

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
/** `index` 0…4 = rating 1…5 — reviews use `5old.png`; picker uses `5.png`. */
const ratingStarSources =
  isWeb && typeof window !== 'undefined'
    ? [1, 2, 3, 4]
        .map(i => ({uri: `${baseUrl}/starts/${i}.png`}))
        .concat([{uri: `${baseUrl}/starts/5old.png`}])
    : [
        require('../assets/starts/1.png'),
        require('../assets/starts/2.png'),
        require('../assets/starts/3.png'),
        require('../assets/starts/4.png'),
        require('../assets/starts/5old.png'),
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
  {label: 'מטרדים', key: 'nuisances'},
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
  /** Company profile: open that company's projects grid (same as home → פרויקטים נבחרים → company). */
  onOpenCompanyProjects = null,
  onOpenFollowHub = null,
  onOpenCompanyReport = null,
  onOpenAllReviews = null,
  /** Same as Settings Pi Chat row: server unread + 1 until Pi welcome message was opened once */
  unreadChatCount = 0,
  /** Profile post grid (6 tiles): open TikTok feed scrolled to that listing. */
  onOpenPostInFeed = null,
  /** הנכסים שלי / פרוייקטים נבחרים carousel: open that listing's ad profile. */
  onOpenListing = null,
}) => {
  const insets = useSafeAreaInsets();
  const top = insets.top;
  const bottom = insets.bottom;
  const scrollRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  // user = listing from feed: has creator_name, creator_email, profileImageUrl, subscription_id, owner_id (from GET /api/listings). If creator_* missing, we fetch by subscription_id (getSubscription).
  const isListingFromFeed =
    user &&
    !user._fromProfessionalsDirectory &&
    (isAdsListingRecord(user) || isPostListingRecord(user));
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

  // Never fall back to listing/post `user.id` as the creator — that can
  // mis-fetch subscription data when subscription_id / owner_id are missing.
  const creatorId = toSubscriptionId(
    user?.subscription_id ||
      user?.owner_id ||
      user?.creator_subscription_id ||
      (!isListingFromFeed && !isAdsListingRecord(user) && !isPostListingRecord(user)
        ? user?.id || profile?.id
        : null),
  );
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
    if (!creatorId) {
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
          id: creatorId,
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
  }, [creatorId, user?.id]);

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

  // Fetch reviews for broker / company / professional profiles only
  useEffect(() => {
    if (!creatorId) {
      setReviews([]);
      return;
    }
    const subType = (
      resolvedCreator?.subscription_type ||
      user?.subscription_type ||
      user?.creator_subscription_type ||
      ''
    ).toLowerCase();
    const rateable =
      subType === 'company' ||
      subType === 'broker' ||
      subType === 'professional';
    if (subType && !rateable) {
      setReviews([]);
      setReviewsLoading(false);
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
  }, [
    creatorId,
    resolvedCreator?.subscription_type,
    user?.subscription_type,
    user?.creator_subscription_type,
  ]);

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
  const getReviewerImageUrl = u => getUserProfileImageUrl(u);

  useEffect(() => {
    const onShow = event => {
      const nextHeight = event?.endCoordinates?.height ?? 0;
      setKeyboardHeight(nextHeight);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({animated: true});
      }, Platform.OS === 'ios' ? 80 : 200);
    };
    const onHide = () => setKeyboardHeight(0);

    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollReviewsIntoView = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({animated: true});
    }, Platform.OS === 'ios' ? 80 : 200);
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
    // Company accounts often only persist company_logo_url — still show it as avatar.
    user?.company_logo_url ||
    user?.companyLogoUrl ||
    resolvedCreator?.company_logo_url ||
    profile.profileImageUrl ||
    profile?.company_logo_url;
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
  const logoImage = typeof logoImageRaw === 'string' ? logoImageRaw.trim() : '';
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
  const contactPhones = (() => {
    if (resolvedCreator?.phones?.length > 0) {
      return resolvedCreator.phones;
    }
    const fromListing = [
      user?.phone,
      user?.contact_details?.phone,
      ...(Array.isArray(user?.contact_details?.phones)
        ? user.contact_details.phones
        : []),
    ]
      .map(p => (p != null ? String(p).trim() : ''))
      .filter(Boolean);
    return fromListing;
  })();
  const contactEmail = displayEmail;
  const primaryContactPhone =
    contactPhones.length > 0 ? String(contactPhones[0]).trim() : '';

  const viewedSubscriptionId = toSubscriptionId(
    resolvedCreator?.id ||
      user?.subscription_id ||
      user?.owner_id ||
      creatorId ||
      (!isListingFromFeed && !isAdsListingRecord(user) ? profile?.id : null),
  );
  const currentSubscriptionId = toSubscriptionId(
    currentUser?.id || currentUser?.subscription_id || currentUser?.owner_id,
  );
  const viewedProfileEmail = String(
    resolvedCreator?.email ||
      user?.creator_email ||
      user?.email ||
      profile?.email ||
      '',
  )
    .trim()
    .toLowerCase();
  const currentProfileEmail = String(currentUser?.email || '')
    .trim()
    .toLowerCase();
  const subscriptionIdsMatch =
    !!viewedSubscriptionId &&
    !!currentSubscriptionId &&
    viewedSubscriptionId === currentSubscriptionId;
  const profileEmailsMatch =
    !!viewedProfileEmail &&
    !!currentProfileEmail &&
    viewedProfileEmail === currentProfileEmail;
  const isOwnProfile =
    subscriptionIdsMatch &&
    (!viewedProfileEmail || !currentProfileEmail || profileEmailsMatch);

  const copyContactDetails = async () => {
    const lines = [...contactPhones, contactEmail].filter(Boolean);
    const text = lines.join('\n');
    if (!text) return;
    try {
      // expo-clipboard covers iOS/Android natively and falls back to the
      // browser clipboard API on web — previously native platforms never
      // actually copied anything, they only showed the text in an alert.
      await Clipboard.setStringAsync(text);
      Alert.alert('הועתק', 'פרטי ההתקשרות הועתקו ללוח');
    } catch (_) {
      Alert.alert('פרטי התקשרות', text);
    }
  };
  const handleChatPress = () => {
    if (isOwnProfile) return;
    if (!currentUser && typeof onOpenUserRegistration === 'function') {
      onOpenUserRegistration();
      return;
    }
    if (typeof onMessage === 'function') onMessage();
  };
  const handleCallPress = () => {
    if (isOwnProfile) return;
    if (typeof onCall === 'function') onCall(primaryContactPhone);
  };
  const handleReportPress = () => {
    // BnB ad profile: dedicated report drawer (Figma 5:413570) for any host type.
    if (isBnbListingAdProfile && typeof onOpenCompanyReport === 'function') {
      onOpenCompanyReport('bnb');
      return;
    }
    const st = String(
      resolvedCreator?.subscription_type || user?.subscription_type || '',
    ).toLowerCase();
    const canReport =
      st === 'company' || st === 'professional' || st === 'broker';
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

  // Last ad: when opened from feed, the current listing is the "last ad"; else prefer ads from userListings (own profile: top viewed ad, not posts).
  const lastAd = (() => {
    if (isListingFromFeed) {
      if (isOwnProfile && isPostListingRecord(user)) {
        // Own profile should never hero a post when ads exist — resolved below from userListings.
      } else {
        return user;
      }
    }
    const adsOnly = userListings.filter(l => !isPostListingRecord(l));
    if (adsOnly.length > 0) {
      const L = isOwnProfile
        ? pickTopViewedListingForProfile(adsOnly) || adsOnly[0]
        : adsOnly[0];
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

  /**
   * Profile ad hero gallery: video first (when present), then still images.
   * LTR swipe — video on the left, swipe left for photos.
   */
  const lastAdImages = (() => {
    if (!lastAd) return [];
    const isVideoLikeUrl = u => {
      const s = String(u || '')
        .trim()
        .toLowerCase();
      if (!s) return true;
      if (/\.(mp4|webm|mov|m4v|mkv)(\?|#|$)/i.test(s)) return true;
      if (/\/videos?\//i.test(s)) return true;
      return false;
    };
    const pushStill = (arr, u) => {
      const s = String(u || '').trim();
      if (!s || /^text-post-placeholder$/i.test(s) || isVideoLikeUrl(s)) return;
      if (arr.some(x => String(x.uri).trim() === s)) return;
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
    let stills = [];
    if (lastAd.listing_images && lastAd.listing_images.length > 0) {
      stills = fromRows(lastAd.listing_images);
    }
    if (stills.length === 0 && lastAd.images && lastAd.images.length > 0) {
      stills = fromRows(lastAd.images);
    }
    const mainStill = String(lastAd.main_image_url || '').trim();
    if (mainStill) pushStill(stills, mainStill);

    const videoUri = firstVideoUrl(lastAd);
    if (videoUri) {
      const posterUri =
        muxThumbnailUri(videoUri, {time: 0, width: 720}) ||
        resolveFeedVideoPosterUri(lastAd) ||
        stills[0]?.uri ||
        null;
      const filteredStills = stills.filter(
        s => String(s.uri || '').trim() !== String(videoUri).trim(),
      );
      return [
        {uri: videoUri, isVideo: true, posterUri},
        ...filteredStills,
      ];
    }
    return stills;
  })();
  const lastAdHasVideo = lastAdImages.some(item => item?.isVideo);
  const openedFromPost = isPostListingRecord(user);
  const recentPostGridImages = (() => {
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
    const pickStillPosterUri = item => {
      const fromFeed = resolveFeedVideoPosterUri(item);
      if (fromFeed && !isPlaceholderUri(fromFeed)) return fromFeed;
      const listingImgs = Array.isArray(item?.listing_images)
        ? item.listing_images
        : [];
      for (const img of listingImgs) {
        const uri =
          img && typeof img === 'object'
            ? String(img.image_url || img.uri || '').trim()
            : String(img || '').trim();
        if (!isPlaceholderUri(uri) && !isVideoLikeMediaUrl(uri)) return uri;
      }
      const directImgs = Array.isArray(item?.images) ? item.images : [];
      for (const img of directImgs) {
        const uri =
          img && typeof img === 'object'
            ? String(img.uri || img.image_url || '').trim()
            : String(img || '').trim();
        if (!isPlaceholderUri(uri) && !isVideoLikeMediaUrl(uri)) return uri;
      }
      for (const candidate of [
        item?.main_image_url,
        item?.image_url,
        item?.thumbnail_url,
        item?.cover_url,
        firstImageUrl(item),
      ]) {
        const uri = String(candidate || '').trim();
        if (!isPlaceholderUri(uri) && !isVideoLikeMediaUrl(uri)) return uri;
      }
      return null;
    };
    const firstImageFor = item => {
      const videoUri =
        firstVideoUrl(item) ||
        (item?.video && typeof item.video === 'object'
          ? String(item.video.uri || item.video.url || '').trim() || null
          : typeof item?.video === 'string'
            ? String(item.video).trim() || null
            : null);
      if (videoUri) {
        // First frame of the video itself (Mux thumbnail at time=0) beats a
        // listing photo — the grid preview matches what plays in the feed.
        const posterUri =
          muxThumbnailUri(videoUri, {time: 0, width: 480}) ||
          pickStillPosterUri(item);
        return {
          uri: videoUri,
          isVideo: true,
          posterUri,
        };
      }
      const stillUri = pickStillPosterUri(item);
      if (stillUri) return {uri: stillUri};
      return null;
    };
    return uniquePostRows
      .map(item => {
        const grid = firstImageFor(item);
        return grid ? {...grid, listingId: item?.id, listing: item} : null;
      })
      .filter(Boolean);
  })();

  const handlePostGridPress = useCallback(
    item => {
      const listing = item?.listing;
      if (!listing?.id || !onOpenPostInFeed) return;
      onOpenPostInFeed(listing);
    },
    [onOpenPostInFeed],
  );

  const handleMyPropertyPress = useCallback(
    listing => {
      const listingId =
        listing?.id != null ? String(listing.id).trim() : '';
      if (!listingId || typeof onOpenListing !== 'function') return;
      onOpenListing(listing);
    },
    [onOpenListing],
  );

  useEffect(() => {
    if (user?.id == null) return;
    setPostGridPageIndex(0);
    requestAnimationFrame(() => {
      postGridPagerRef.current?.scrollToIndex?.({index: 0, animated: false});
      scrollRef.current?.scrollTo({y: 0, animated: false});
    });
  }, [user?.id]);

  const postGridViewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const onPostGridViewableItemsChanged = useRef(({viewableItems}) => {
    const first = viewableItems?.[0];
    if (first?.index != null) {
      setPostGridPageIndex(first.index);
    }
  }).current;

  const handlePostGridScrollToIndexFailed = useCallback(info => {
    requestAnimationFrame(() => {
      postGridPagerRef.current?.scrollToIndex?.({
        index: info.index,
        animated: false,
      });
    });
  }, []);

  const renderPostGridCell = useCallback(
    (item, cellKey) => {
      if (!item) {
        return (
          <View key={cellKey} style={styles.lastAdGridItem}>
            <View
              style={[
                styles.lastAdGridItemInner,
                styles.lastAdGridPlaceholderCell,
              ]}>
              <MaterialCommunityIcons
                name="camera-outline"
                size={24}
                color="rgba(255,255,255,0.45)"
              />
            </View>
          </View>
        );
      }
      const viewCountLabel = formatPostViewCount(
        getListingViewCount(item.listing),
      );
      const viewBadge = (
        <View style={styles.postGridViewBadge} pointerEvents="none">
          <Image
            source={postGridViewIcon}
            style={styles.postGridViewIcon}
            resizeMode="contain"
          />
          <Text style={styles.postGridViewText}>{viewCountLabel}</Text>
        </View>
      );
      if (item.isVideo) {
        return (
          <TouchableOpacity
            key={cellKey}
            style={styles.lastAdGridItem}
            activeOpacity={0.85}
            onPress={() => handlePostGridPress(item)}>
            <View
              style={[styles.lastAdGridItemInner, styles.lastAdGridVideoCell]}>
              {/* Paused muted player: decodes the real first frame of the
                  video, so the preview is never black even when there's no
                  usable poster image. */}
              <Video
                source={{uri: item.uri}}
                style={StyleSheet.absoluteFill}
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
                isMuted
                positionMillis={0}
              />
              {item.posterUri ? (
                <Image
                  source={{uri: item.posterUri}}
                  style={styles.lastAdGridImage}
                  resizeMode="cover"
                />
              ) : null}
              <View
                style={[
                  styles.postGridVideoPlayOverlay,
                  item.posterUri
                    ? styles.postGridVideoPlayOverlayDim
                    : null,
                ]}
                pointerEvents="none">
                <MaterialCommunityIcons
                  name="play-circle"
                  size={36}
                  color="rgba(255,255,255,0.85)"
                />
              </View>
              {viewBadge}
            </View>
          </TouchableOpacity>
        );
      }
      return (
        <TouchableOpacity
          key={cellKey}
          style={styles.lastAdGridItem}
          activeOpacity={0.85}
          onPress={() => handlePostGridPress(item)}>
          <View style={styles.lastAdGridItemInner}>
            <Image
              source={{uri: item.uri}}
              style={styles.lastAdGridImage}
              resizeMode="cover"
            />
            {viewBadge}
          </View>
        </TouchableOpacity>
      );
    },
    [handlePostGridPress],
  );

  /** Always 2×3 per page; swipe horizontally for more pages when >6 posts. */
  const postGridPages = (() => {
    const posts = recentPostGridImages;
    if (posts.length === 0) {
      return [Array.from({length: POST_GRID_PAGE_SIZE}, () => null)];
    }
    const pages = [];
    for (let i = 0; i < posts.length; i += POST_GRID_PAGE_SIZE) {
      const slice = posts.slice(i, i + POST_GRID_PAGE_SIZE);
      const page = [...slice];
      while (page.length < POST_GRID_PAGE_SIZE) {
        page.push(null);
      }
      pages.push(page);
    }
    return pages;
  })();

  const [postGridPageIndex, setPostGridPageIndex] = useState(0);
  const postGridPagerRef = useRef(null);

  const renderProfilePostGridContent = () => (
    <View style={styles.lastAdPostGridPagerWrap}>
      <FlatList
        ref={postGridPagerRef}
        data={postGridPages}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        removeClippedSubviews={false}
        showsHorizontalScrollIndicator={false}
        style={[styles.lastAdPostGridPager, {height: POST_GRID_PAGE_HEIGHT}]}
        keyExtractor={(_, pageIndex) => `post-grid-page-${pageIndex}`}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        viewabilityConfig={postGridViewabilityConfig}
        onViewableItemsChanged={onPostGridViewableItemsChanged}
        onScrollToIndexFailed={handlePostGridScrollToIndexFailed}
        renderItem={({item: pageItems, index: pageIndex}) => (
          <View
            style={[
              styles.lastAdGridPage,
              {
                width: SCREEN_WIDTH,
                height: POST_GRID_PAGE_HEIGHT,
              },
            ]}>
            <View style={styles.lastAdGrid}>
              {pageItems.map((item, cellIndex) =>
                renderPostGridCell(
                  item,
                  `post-grid-${pageIndex}-${cellIndex}`,
                ),
              )}
            </View>
          </View>
        )}
      />
      {postGridPages.length > 1 ? (
        <View style={styles.postGridDots}>
          {postGridPages.map((_, i) => (
            <View
              key={`post-grid-dot-${i}`}
              style={[
                styles.postGridDot,
                i === postGridPageIndex && styles.postGridDotActive,
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );

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
  const [followPlusAnimating, setFollowPlusAnimating] = useState(false);
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
    const viewingOwnProfile =
      !!currentSubscriptionId &&
      viewedSubscriptionId === currentSubscriptionId;
    setFollowStatsLoading(true);
    getFollowStats(viewedSubscriptionId)
      .then(data => {
        if (cancelled) return;
        const stats = data?.stats || {};
        setFollowStats({
          likes: Number(stats.likes || 0),
          followers: Number(stats.followers || 0),
          following: Number(stats.following || 0),
          // Incoming follow requests are private — only show on your own profile.
          pendingRequests: viewingOwnProfile
            ? Number(stats.pending_requests || 0)
            : 0,
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
  }, [viewedSubscriptionId, currentSubscriptionId, reviews.length]);

  useEffect(() => {
    let cancelled = false;
    if (
      !viewedSubscriptionId ||
      !currentSubscriptionId ||
      viewedSubscriptionId === currentSubscriptionId
    ) {
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
  const hasPendingFollowRequests =
    isOwnProfile && !followStatsLoading && followStats.pendingRequests > 0;
  const renderProfileStatsRow = () => (
    <View style={styles.statsRow}>
      <TouchableOpacity
        style={styles.stat}
        activeOpacity={0.8}
        onPress={() =>
          typeof onOpenFollowHub === 'function' && onOpenFollowHub('likes')
        }>
        <Text style={styles.statNumber}>{formatStatCount(likesCount)}</Text>
        <Text style={styles.statLabel}>לייקים</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.stat}
        activeOpacity={0.8}
        onPress={() => {
          if (typeof onOpenFollowHub !== 'function') return;
          onOpenFollowHub(hasPendingFollowRequests ? 'requests' : 'followers');
        }}>
        <Text style={styles.statNumber}>{formatStatCount(followersCount)}</Text>
        <View style={styles.statLabelRow}>
          {hasPendingFollowRequests ? (
            <View
              style={styles.pendingFollowRequestDot}
              accessibilityLabel="בקשות מעקב ממתינות לאישור"
            />
          ) : null}
          <Text style={styles.statLabel}>עוקבים</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.stat}
        activeOpacity={0.8}
        onPress={() =>
          typeof onOpenFollowHub === 'function' && onOpenFollowHub('following')
        }>
        <Text style={styles.statNumber}>{formatStatCount(followingCount)}</Text>
        <Text style={styles.statLabel}>עוקב</Text>
      </TouchableOpacity>
    </View>
  );
  const viewerLoggedIn = !!(
    currentUser && String(currentUser.email || '').trim()
  );
  const profileSubscriptionType = (
    resolvedCreator?.subscription_type ||
    user?.subscription_type ||
    user?.creator_subscription_type ||
    lastAd?.subscription_type ||
    ''
  ).toLowerCase();
  const isCompany = profileSubscriptionType === 'company';
  const isBroker = profileSubscriptionType === 'broker';
  const isProfessional = profileSubscriptionType === 'professional';
  const isRegularUserAccount = !isCompany && !isBroker && !isProfessional;
  const shouldShowFollowPlus =
    !!viewedSubscriptionId &&
    !isOwnProfile &&
    (followPlusAnimating ||
      (viewerLoggedIn
        ? !followStatusLoading &&
          !!currentSubscriptionId &&
          !followStatus.isFollowing &&
          !followStatus.hasPendingRequest
        : true));

  const handleSendFollowRequest = async () => {
    if (!viewerLoggedIn) {
      if (typeof onOpenUserRegistration === 'function') {
        onOpenUserRegistration();
      }
      return false;
    }
    if (!currentSubscriptionId || !viewedSubscriptionId || sendingFollowRequest)
      return false;
    setSendingFollowRequest(true);
    try {
      await sendFollowRequest(currentSubscriptionId, viewedSubscriptionId);
      setFollowStatus(prev => ({...prev, hasPendingRequest: true}));
      return true;
    } catch (e) {
      Alert.alert('', e?.message || 'לא הצלחנו לשלוח בקשת מעקב');
      return false;
    } finally {
      setSendingFollowRequest(false);
    }
  };

  const handleCancelFollowRequest = async () => {
    if (!viewerLoggedIn) return;
    if (!currentSubscriptionId || !viewedSubscriptionId || sendingFollowRequest)
      return;
    setSendingFollowRequest(true);
    try {
      await cancelFollowRequest(currentSubscriptionId, viewedSubscriptionId);
      setFollowStatus(prev => ({...prev, hasPendingRequest: false}));
    } catch (e) {
      Alert.alert('', e?.message || 'לא הצלחנו לבטל את בקשת המעקב');
    } finally {
      setSendingFollowRequest(false);
    }
  };

  const handleCompanyFeedUnfollowPress = () => {
    if (!viewerLoggedIn || !currentSubscriptionId || !viewedSubscriptionId) {
      return;
    }
    Alert.alert(
      'ביטול מעקב',
      `להפסיק לעקוב אחרי ${displayName || 'המשתמש'}?`,
      [
        {text: 'ביטול', style: 'cancel'},
        {
          text: 'הפסק מעקב',
          style: 'destructive',
          onPress: async () => {
            if (sendingFollowRequest) return;
            setSendingFollowRequest(true);
            try {
              await unfollowUser(currentSubscriptionId, viewedSubscriptionId);
              setFollowStatus(prev => ({...prev, isFollowing: false}));
              setFollowStats(prev => ({
                ...prev,
                followers: Math.max(0, prev.followers - 1),
              }));
            } catch (e) {
              Alert.alert('', e?.message || 'לא הצלחנו לבטל מעקב');
            } finally {
              setSendingFollowRequest(false);
            }
          },
        },
      ],
    );
  };

  const renderCompanyFeedFollowAction = () => {
    if (!viewedSubscriptionId) return null;
    const busy = sendingFollowRequest;
    const loading = viewerLoggedIn && followStatusLoading;

    if (followStatus.isFollowing) {
      return (
        <TouchableOpacity
          onPress={handleCompanyFeedUnfollowPress}
          disabled={busy || loading}
          style={[
            styles.companyFeedFollowBtn,
            styles.companyFeedFollowBtnFollowing,
          ]}
          activeOpacity={0.8}>
          <Text style={styles.companyFeedFollowBtnText}>
            {busy ? '...' : 'עוקב'}
          </Text>
        </TouchableOpacity>
      );
    }

    if (followStatus.hasPendingRequest) {
      return (
        <View style={styles.companyFeedFollowCluster}>
          <View
            style={[
              styles.companyFeedFollowBtn,
              styles.companyFeedFollowBtnPending,
            ]}>
            <Text
              style={styles.companyFeedFollowBtnPendingText}
              numberOfLines={1}>
              ממתין לאישור
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleCancelFollowRequest}
            disabled={busy || loading}
            style={styles.companyFeedFollowCancelBtn}
            activeOpacity={0.8}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <MaterialCommunityIcons
              name="close"
              size={16}
              color="rgba(255,255,255,0.92)"
            />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TouchableOpacity
        onPress={handleSendFollowRequest}
        disabled={busy || loading}
        activeOpacity={0.85}
        style={styles.companyFeedFollowGoldWrap}>
        <LinearGradient
          colors={['#FEE787', '#BD9947', '#9C6522']}
          locations={[0.0456, 0.5076, 0.8831]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.companyFeedFollowGoldGradient}>
          <Text style={styles.companyFeedFollowGoldText}>
            {busy ? '...' : 'עקוב'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
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
  const showProfileRatingFeatures = !isRegularUserAccount;
  const isRegularUserAdView =
    isRegularUserAccount && isListingFromFeed && !openedFromPost;
  /** BnB ad from feed (category 5, not a post) — dedicated Figma 5:413003 layout only for this case */
  const listingCategoryNum = Number(user?.category ?? lastAd?.category ?? 0);
  const isBnbListingAdProfile =
    isListingFromFeed && !openedFromPost && listingCategoryNum === 5;
  /** שותפים ad from feed (category 3, not a post) — Figma 9:145202 layout only for this case */
  const isPartnersListingAdProfile =
    isListingFromFeed &&
    !openedFromPost &&
    listingCategoryNum === 3 &&
    !isPostListingRecord(lastAd || user);
  /** קרקעות ad from feed (category 7) — Figma land profile for company and broker only */
  const isLandListingAdProfile =
    isListingFromFeed &&
    !openedFromPost &&
    listingCategoryNum === 7 &&
    !isPostListingRecord(lastAd || user) &&
    (isCompany || isBroker);
  const isDedicatedListingAdProfile =
    isBnbListingAdProfile ||
    isPartnersListingAdProfile ||
    isLandListingAdProfile;
  /** Post grid + profile-only TikTok feed — any profile with posts, not only own or TikTok-post entry. */
  const showProfilePostGrid =
    !isDedicatedListingAdProfile && recentPostGridImages.length > 0;
  const openedFromProfessionalsDirectory = Boolean(
    user?._fromProfessionalsDirectory,
  );
  /**
   * Opened on a specific feed ad (TikTok swipe / list / home project) — show that ad,
   * not the 6-post grid. Professional directory rows often have `address` and get
   * misclassified as listings — never treat those as feed ads.
   */
  const openedFromFeedAdListing =
    isListingFromFeed &&
    !openedFromPost &&
    !openedFromProfessionalsDirectory;
  /** Explicit false from own-profile open must win over listing heuristics. */
  const forceListingAdProfile =
    user?._forceListingAdProfile === false
      ? false
      : Boolean(
          user?._forceListingAdProfile ||
            user?._fromHomeFeatureProject ||
            user?._fromCompanyProjects ||
            openedFromFeedAdListing,
        );
  /** Own profile (all account types): always 6-post grid layout — never the ad hero/body.
   * Exception: opened as a specific listing (home פרויקט נבחר / company projects / feed ad). */
  const showOwnProfilePostGridAtTop =
    isOwnProfile && !isDedicatedListingAdProfile && !forceListingAdProfile;
  /**
   * Figma 8:79136 — professional profile always uses the 6-post grid under
   * avatar/stats (own + other), never a listing hero between stats and posts.
   * Brokers opened from בעלי מקצוע directory use the same layout.
   */
  const showProfessionalFigmaProfile =
    (isProfessional || (isBroker && openedFromProfessionalsDirectory)) &&
    !isDedicatedListingAdProfile;
  const showProfessionalStandardPostGrid = showProfessionalFigmaProfile;
  const showProfilePostGridAtTop = showProfessionalStandardPostGrid
    ? true
    : isOwnProfile
      ? showOwnProfilePostGridAtTop
      : showProfilePostGrid &&
        !openedFromProfessionalsDirectory &&
        !forceListingAdProfile;
  /** Legacy directory path only — Figma pro layout keeps the grid at the top. */
  const showProfilePostGridAfterBio =
    !showProfessionalFigmaProfile &&
    openedFromProfessionalsDirectory &&
    isProfessional &&
    !isDedicatedListingAdProfile &&
    !showProfilePostGridAtTop;
  /** Posts-grid profile (incl. own profile): no ad smart-info / neighborhood tools. */
  const showPiAiSmartInfoBlock =
    !openedFromPost &&
    !showProfessionalFigmaProfile &&
    !isDedicatedListingAdProfile &&
    !showProfilePostGridAtTop;
  const showLandProfileContactAndReviews = isLandListingAdProfile;
  const showCompanyBnbProfileContactAndReviews =
    isCompany && isBnbListingAdProfile && isListingFromFeed && !openedFromPost;
  const showListingContactAndReviews =
    !isRegularUserAdView &&
    (showLandProfileContactAndReviews ||
      showCompanyBnbProfileContactAndReviews ||
      (!isDedicatedListingAdProfile || showProfileRatingFeatures));

  const landListingPayload = React.useMemo(() => {
    if (!isLandListingAdProfile || !lastAd) return lastAd;
    const ids = parseLandBlockParcelFromListing(lastAd);
    const parcels = normalizeLandOfferParcels(lastAd);
    return {
      ...lastAd,
      land_parcel: ids.land_parcel ?? lastAd.land_parcel ?? null,
      land_block: ids.land_block ?? lastAd.land_block ?? null,
      company_offers_land_sizes:
        parcels.length > 0
          ? parcels
          : (lastAd.company_offers_land_sizes ??
            lastAd.companyOffersLandSizes ??
            null),
    };
  }, [isLandListingAdProfile, lastAd]);
  const showLocationMap =
    isListingFromFeed && !openedFromPost && !isDedicatedListingAdProfile;
  /** Feed ad hero: hide listing address only on own profile overview (6-post grid),
   * not when drilling into a specific ad from TikTok/home/projects. */
  const showListingLocationOnAdHero =
    !isOwnProfile || forceListingAdProfile || isDedicatedListingAdProfile;
  const showTikTokProfessionalHeader = user?._fromTikTokPost && isProfessional;
  /** Company profile opened from Selected Projects (פרויקטים נבחרים) → company listing → profile. */
  const openedFromCompaniesDirectory = Boolean(user?._fromCompanyProjects);
  /** Same flow + listing record (hero nav, favorite on listing id). */
  const fromCompanyProjects = Boolean(
    isListingFromFeed && openedFromCompaniesDirectory,
  );
  /** Company feed listing (incl. BnB): fixed back / share / like top bar — not avatar/stats header. */
  const showCompanyFeedHeroTop = Boolean(
    isCompany &&
    isListingFromFeed &&
    lastAd &&
    !openedFromPost &&
    (isBnbListingAdProfile ||
      ((fromCompanyProjects ||
        user?._fromTikTokPost ||
        user?._fromHomeFeatureProject ||
        user?._forceListingAdProfile) &&
        (!isOwnProfile ||
          user?._fromHomeFeatureProject ||
          user?._fromCompanyProjects ||
          user?._forceListingAdProfile))),
  );
  /**
   * Figma 8:79136 — every professional profile (own + other) uses the standard
   * avatar / email / עוקבים-לייקים header. Company feed listings use hero like/share instead.
   */
  const showStandardProfileHeader = isProfessional
    ? !isDedicatedListingAdProfile
    : !(isCompany && (showCompanyFeedHeroTop || isBnbListingAdProfile));
  const companyListingId =
    showCompanyFeedHeroTop && (lastAd?.id ?? user?.id) != null
      ? String(lastAd?.id ?? user?.id)
      : null;
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
          setCompanyHeroFavorited(st.likedListingIds.has(companyListingId));
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
      return new Set([...st.likedListingIds].map(x => String(x)));
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
  // Professionals: no listings on other profiles; also hide on your own pro profile.
  // Regular users: no "הנכסים שלי" section at all (own profile included).
  const hideMyPropertiesSection =
    isProfessional ||
    isRegularUserAccount ||
    (isBroker && openedFromProfessionalsDirectory);
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
  // Types (סוג) — used for professionals next to the name.
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
  const specializationsRaw =
    user?.creator_specializations ??
    user?.specializations ??
    resolvedCreator?.specializations ??
    profile?.specializations;
  const specializationsArray = Array.isArray(specializationsRaw)
    ? specializationsRaw
    : typeof specializationsRaw === 'string'
      ? (() => {
          try {
            const p = JSON.parse(specializationsRaw);
            return Array.isArray(p)
              ? p
              : specializationsRaw
                  .split(',')
                  .map(s => s.trim())
                  .filter(Boolean);
          } catch (_) {
            return specializationsRaw
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

  const displayPiRating = React.useMemo(
    () =>
      displayPiRatingFromReviews(reviews, {
        pi_value: brokerPiRating,
        subscription_type: profileSubscriptionType,
      }),
    [reviews, brokerPiRating, profileSubscriptionType],
  );

  // Filter out display name from tags so it doesn't appear as a specialty/region
  const tagLabel = s =>
    (typeof s === 'string' ? s : (s?.label ?? s?.name ?? String(s))).trim();
  const filteredActivityRegions = activityRegions.filter(
    s => tagLabel(s) !== displayName,
  );
  const brokerSpecializationsDisplay = (
    specializationsArray.length > 0 ? specializationsArray : brokerSpecialties
  )
    .map(tagLabel)
    .filter(t => t && t !== displayName);
  const professionalTypesDisplay = typesArray
    .map(tagLabel)
    .filter(t => t && t !== displayName);
  const professionalSpecializationsDisplay = specializationsArray
    .map(tagLabel)
    .filter(t => t && t !== displayName);
  /**
   * סוג under the name — only when opened from בעלי מקצוע בתחום הנדל״ן.
   * Brokers always show "תיווך"; professionals show their types chips.
   */
  const directoryTypeLabels = openedFromProfessionalsDirectory
    ? isBroker
      ? ['תיווך']
      : professionalTypesDisplay
    : [];
  // Professionals → התמחויות from specializations.
  // Brokers → אזור פעילות from activity_regions (not under התמחויות).
  // Company → התמחויות from specializations only (never activity regions).
  const profileSpecialtyTags = isProfessional
    ? professionalSpecializationsDisplay
    : isBroker
      ? filteredActivityRegions.map(tagLabel).filter(Boolean)
      : brokerSpecializationsDisplay;
  const profileSpecialtySectionTitle = isBroker
    ? 'אזור פעילות'
    : 'התמחויות';
  const profileSpecialtyEmptyText = isBroker
    ? 'אין אזורי פעילות'
    : 'אין התמחויות';

  const renderProfessionalTypeTags = (labels, extraStyle) => {
    const list = Array.isArray(labels) ? labels : [];
    if (list.length === 0) return null;
    return (
      <View
        style={[
          styles.brokerCardBottomTags,
          styles.professionalTypeTags,
          extraStyle,
        ]}>
        {list.map((typeLabel, i) => (
          <View
            key={`pro-type-${i}-${typeLabel}`}
            style={styles.brokerCardBottomTag}>
            <Text style={styles.brokerCardBottomTagText}>{typeLabel}</Text>
          </View>
        ))}
      </View>
    );
  };
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
  const adFeatures = React.useMemo(
    () => buildProfileAdFeatureLabels(lastAd),
    [lastAd],
  );

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
    setLastAdImageIndex(0);
  }, [lastAd?.id]);

  // Auto-advance stills only — don't interrupt a playing hero video.
  useEffect(() => {
    if (lastAdImages.length <= 1 || lastAdHasVideo) return;
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
  }, [lastAdImages.length, lastAdCardWidth, lastAdHasVideo]);

  const visibleReviews =
    reviews.length > MAX_VISIBLE_REVIEWS
      ? reviews.slice(0, MAX_VISIBLE_REVIEWS)
      : reviews;

  const renderPiRating = () => {
    if (!showProfileRatingFeatures || isRegularUserAdView) return null;
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
  const showFixedCompanyHero = showCompanyFeedHeroTop;
  /** Figma pro profile uses the standard header — never the feed listing hero shell. */
  const showFixedProHero = false;
  const showFixedBackOnly = Boolean(
    isListingFromFeed &&
    !showCompanyFeedHeroTop &&
    !isOwnProfile &&
    (!isProfessional || showTikTokProfessionalHeader) &&
    !showFixedProHero,
  );
  const useFixedListingTopNav =
    showFixedCompanyHero || showFixedProHero || showFixedBackOnly;

  const heroNavPaddingTop = showFixedCompanyHero ? top + 8 : top + 10;

  /** Phone / Pi chat — bottom of פרטי התקשרות (never duplicate in the header row). */
  const showProfileMessagingCta =
    !isOwnProfile && showListingContactAndReviews;

  /** Phone / Pi chat only — never includes דווח (report always renders at scroll bottom). */
  const renderProfileMessagingCta = extraStyle => {
    if (!showProfileMessagingCta) return null;
    return (
      <View style={[styles.profileCtaSection, extraStyle]}>
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
          <Image
            source={require('../assets/phone.png')}
            style={styles.profileCtaPhoneIcon}
            resizeMode="contain"
          />
          <Text
            style={styles.profileCtaPhoneText}
            numberOfLines={1}
            ellipsizeMode="tail">
            פנייה בטלפון {primaryContactPhone}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  /** דווח — always the last scroll content when shown (all profile / listing types). */
  const showBottomReportButton = !isOwnProfile;
  const renderBottomReportButton = () => {
    if (!showBottomReportButton) return null;
    return (
      <View style={[styles.profileCtaSection, styles.profileReportBottomSection]}>
        <TouchableOpacity
          style={styles.profileCtaWarningBtn}
          onPress={handleReportPress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="דווח">
          <Text style={styles.profileCtaWarningText}>דווח</Text>
          <MaterialCommunityIcons
            name="alert-outline"
            size={22}
            color="#F7F3E6"
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, {paddingTop: heroNavPaddingTop}]}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={heroNavPaddingTop}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={Platform.OS === 'android'}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(
                bottom + 10,
                keyboardHeight > 0 ? keyboardHeight + 32 : bottom + 10,
              ),
            },
          ]}
          showsVerticalScrollIndicator={false}>
        {showStandardProfileHeader &&
          !showCompanyFeedHeroTop &&
          !useFixedListingTopNav && (
            <TouchableOpacity
              onPress={onClose}
              style={[styles.backBtn, {right: 10}]}
              hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}>
              <MaterialCommunityIcons
                name="chevron-left"
                size={28}
                color="#fff"
              />
            </TouchableOpacity>
          )}

        {showStandardProfileHeader &&
          !showCompanyFeedHeroTop && (
            <View style={styles.profileBlock}>
              <View style={styles.avatarWrap}>
                <ProfileAvatar
                  uri={displayLogoSource?.uri}
                  name={displayName}
                  size={78}
                  subscriptionType={resolvedCreator || user}
                  imageStyle={
                    Platform.OS === 'web' ? {objectFit: 'cover'} : undefined
                  }
                />
                {shouldShowFollowPlus ? (
                  <FollowPlusBadge
                    onPress={handleSendFollowRequest}
                    beforePress={() => {
                      if (!viewerLoggedIn) {
                        if (typeof onOpenUserRegistration === 'function') {
                          onOpenUserRegistration();
                        }
                        return false;
                      }
                      setFollowPlusAnimating(true);
                      return true;
                    }}
                    onAnimationComplete={() => setFollowPlusAnimating(false)}
                    style={styles.avatarBadge}
                    disabled={sendingFollowRequest}
                    iconSize={18}
                  />
                ) : null}
              </View>
              <Text style={styles.userName}>{displayName}</Text>
              {displayEmail != null && displayEmail !== '' ? (
                <Text style={styles.userEmail}>{displayEmail}</Text>
              ) : null}
              {renderProfileStatsRow()}
            </View>
          )}

        {/* הודעה / חייג — always for other users; only own profile hides them. */}
        {showStandardProfileHeader &&
          !showCompanyFeedHeroTop &&
          !isOwnProfile && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={handleCallPress}
                activeOpacity={0.8}
                style={styles.actionBtnTouch}>
                <Image
                  source={require('../assets/callWithText.png')}
                  style={styles.actionBtnImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleChatPress}
                activeOpacity={0.8}
                style={styles.actionBtnTouch}>
                <Image
                  source={require('../assets/chatWithText.png')}
                  style={styles.actionBtnImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          )}

        {/* Last ad card - full width, no bubble */}
        {(lastAd || showProfilePostGridAtTop) && (
          <View style={styles.lastAdCard}>
            <View
              style={
                showProfilePostGridAtTop
                  ? styles.lastAdImageWrapGridMode
                  : styles.lastAdImageWrap
              }>
              {showProfilePostGridAtTop ? (
                renderProfilePostGridContent()
              ) : lastAdImages.length > 0 ? (
                <>
                  <FlatList
                    ref={lastAdCarouselRef}
                    data={lastAdImages}
                    horizontal
                    pagingEnabled
                    style={forceLtrStyle}
                    contentContainerStyle={forceLtrStyle}
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={e => {
                      const i = Math.round(
                        e.nativeEvent.contentOffset.x / lastAdCardWidth,
                      );
                      setLastAdImageIndex(i);
                    }}
                    renderItem={({item, index}) => {
                      const slideStyle = [
                        styles.lastAdImage,
                        {width: lastAdCardWidth},
                      ];
                      if (item.isVideo) {
                        const isCurrent = index === lastAdImageIndex;
                        return (
                          <View style={slideStyle}>
                            <Video
                              source={{uri: item.uri}}
                              style={StyleSheet.absoluteFill}
                              resizeMode={ResizeMode.COVER}
                              shouldPlay={
                                isCurrent && !fullScreenImageModalVisible
                              }
                              isLooping
                              isMuted
                              useNativeControls={false}
                            />
                            {item.posterUri && !isCurrent ? (
                              <Image
                                source={{uri: item.posterUri}}
                                style={StyleSheet.absoluteFill}
                                resizeMode="cover"
                              />
                            ) : null}
                            <View
                              style={styles.lastAdHeroVideoBadge}
                              pointerEvents="none">
                              <MaterialCommunityIcons
                                name="play-circle"
                                size={28}
                                color="rgba(255,255,255,0.9)"
                              />
                            </View>
                          </View>
                        );
                      }
                      return (
                        <Image
                          source={{uri: item.uri}}
                          style={slideStyle}
                          resizeMode="cover"
                        />
                      );
                    }}
                    keyExtractor={(item, i) =>
                      item.isVideo ? `video-${i}` : `img-${i}-${item.uri}`
                    }
                  />
                  {lastAdImages.length > 1 && (
                    <View style={[styles.lastAdDots, forceLtrStyle]}>
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

            {!openedFromPost &&
              lastAd &&
              !showProfilePostGridAtTop &&
              (isDedicatedListingAdProfile || !isProfessional) && (
                <View style={styles.lastAdBody}>
                  {isBnbListingAdProfile ? (
                    <BnbListingProfileContent
                      listing={lastAd}
                      displayPiRating={isCompany ? displayPiRating : undefined}
                      mapAddress={firstNonEmpty(
                        lastAd?.address,
                        lastAd?.location,
                        lastAd?.search_address,
                        lastAd?.contact_details?.address,
                        user?.address,
                        brokerAddress,
                      )}
                      adAddress={adAddress}
                      hideReportButton
                    />
                  ) : isPartnersListingAdProfile ? (
                    <PartnersListingProfileContent
                      listing={lastAd}
                      displayName={displayName}
                      mapAddress={firstNonEmpty(
                        lastAd?.address,
                        lastAd?.location,
                        brokerAddress,
                      )}
                      adAddress={adAddress}
                      hideReportButton
                    />
                  ) : isLandListingAdProfile ? (
                    <CompanyLandListingProfileContent
                      listing={landListingPayload}
                      displayName={displayName}
                      displayPiRating={displayPiRating}
                      publisherAvatarUri={
                        lastAd?.profileImageUrl || displayImage || null
                      }
                      mapAddress={firstNonEmpty(
                        lastAd?.address,
                        lastAd?.location,
                        lastAd?.search_address,
                        lastAd?.land_address,
                        brokerAddress,
                      )}
                      adAddress={adAddress}
                      hideReportButton
                    />
                  ) : (
                    <>
                      <View style={styles.lastAdPiAndPurposeRow}>
                        {renderPiRating() || <View />}
                        {isProfessional ? (
                          <Text
                            style={styles.lastAdProfessionalName}
                            numberOfLines={1}>
                            {displayName}
                          </Text>
                        ) : isCompany ? (
                          <Image
                            source={require('../assets/pre-sale.png')}
                            style={styles.preSaleBadgeImage}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={styles.lastAdPurposeTag}>
                            <Text style={styles.lastAdPurposeText}>
                              {lastAd.purpose || 'להשכרה'}
                            </Text>
                          </View>
                        )}
                      </View>
                      {!isProfessional && (
                        <Text style={styles.lastAdPrice}>
                          {isCompany
                            ? String(
                                lastAd?.project_name ||
                                  lastAd?.projectName ||
                                  '',
                              ).trim() || formatPriceHe(lastAd)
                            : lastAd.price || '₪5,000'}
                        </Text>
                      )}
                      {(() => {
                        if (!showListingLocationOnAdHero) return null;
                        const addr = firstNonEmpty(
                          lastAd?.address,
                          lastAd?.location,
                          lastAd?.search_address,
                          lastAd?.land_address,
                          user?.address,
                          user?.location,
                          user?.search_address,
                          user?.land_address,
                          user?._fromTikTokPost
                            ? user?.creator_business_address
                            : null,
                          user?._fromTikTokPost ? user?.business_address : null,
                        );
                        if (!addr) return null;
                        return (
                          <View style={styles.lastAdLocationRow}>
                            <SimpleLineIcons
                              name="location-pin"
                              size={18}
                              color="rgba(255,255,255,0.9)"
                            />
                            <Text style={styles.lastAdLocationText}>
                              {addr}
                            </Text>
                          </View>
                        );
                      })()}
                      {isBroker && <View style={styles.lastAdDivider} />}
                      {isCompany && (
                        <View style={styles.companyStatsRow}>
                          <View style={styles.companyStatItem}>
                            <Image
                              source={require('../assets/building_icon.png')}
                              style={styles.companyStatIconImage}
                              resizeMode="contain"
                            />
                            <Text style={styles.companyStatText}>
                              {formatCompanyBuildingsLabel(
                                companyBuildingCount,
                              )}
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
                              {formatCompanyApartmentsLabel(
                                companyApartmentCount,
                              )}
                            </Text>
                          </View>
                        </View>
                      )}
                      {isCompany && <View style={styles.lastAdDivider} />}
                      {isRegularUserAdView ? (
                        <>
                          <View style={styles.lastAdDivider} />
                          <Text
                            style={styles.lastAdDescription}
                            numberOfLines={6}>
                            {String(lastAd.description || '').trim() ||
                              'אין תיאור'}
                          </Text>
                        </>
                      ) : (
                        <>
                          <View style={styles.lastAdPostedBy}>
                            <Text style={styles.lastAdPostedByLabel}>
                              פורסם ע"י
                            </Text>
                            <View style={styles.lastAdPostedByRow}>
                              <View
                                style={[
                                  styles.brokerCardBottomLocation,
                                  styles.lastAdPostedByPublisher,
                                ]}>
                                {lastAd.profileImageUrl || displayImage ? (
                                  <Image
                                    source={{
                                      uri:
                                        lastAd.profileImageUrl || displayImage,
                                    }}
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
                                <Text style={styles.lastAdPostedByName}>
                                  {displayName}
                                </Text>
                              </View>
                              {showCompanyFeedHeroTop && !isOwnProfile
                                ? renderCompanyFeedFollowAction()
                                : null}
                            </View>
                          </View>
                          <Text
                            style={styles.lastAdDescription}
                            numberOfLines={6}>
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
                          </View>
                          <View style={styles.lastAdDividerWhite} />
                        </>
                      ) : isCompany && projectOffersCards.length > 0 ? (
                        <>
                          <View style={styles.projectOffersSection}>
                            <Text style={styles.projectOffersTitle}>
                              הפרויקט מציע
                            </Text>
                            {projectOffersCards.map(card => {
                              const areaStr =
                                card.area != null
                                  ? `גודל: ${card.area} מ"ר`
                                  : 'גודל: —';
                              const priceStr =
                                card.price != null
                                  ? `החל מ-₪${Number(card.price).toLocaleString('he-IL')}`
                                  : null;
                              const roomsStr =
                                card.rooms != null
                                  ? `מס' חדרים: ${card.rooms}`
                                  : null;
                              const isSimple = card.rooms == null;
                              const detailsLine = isSimple
                                ? `${areaStr} | ${priceStr || 'החל מ-—₪'}`
                                : [areaStr, roomsStr]
                                    .filter(Boolean)
                                    .join(' | ');
                              return (
                                <View
                                  key={card.key}
                                  style={styles.projectOfferCard}>
                                  <View style={styles.projectOfferCardHeader}>
                                    <Image
                                      source={getProjectOfferIconName(
                                        card.iconKey,
                                      )}
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
                                const status = (
                                  lastAd?.construction_status ?? ''
                                )
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
                                          style={
                                            styles.constructionStatusCheckImage
                                          }
                                          resizeMode="contain"
                                        />
                                      ) : (
                                        <View
                                          style={
                                            styles.constructionStatusCircle
                                          }
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
                                        style={
                                          styles.constructionStatusDottedLine
                                        }
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
                                  {CONSTRUCTION_STATUS_STEPS.map(
                                    (step, index) => {
                                      const status = (
                                        lastAd?.construction_status ?? ''
                                      )
                                        .toString()
                                        .toLowerCase();
                                      const isSelected =
                                        status ===
                                        (step.name || '').toLowerCase();
                                      const isNotLast =
                                        index <
                                        CONSTRUCTION_STATUS_STEPS.length - 1;
                                      return (
                                        <React.Fragment key={step.name}>
                                          <View
                                            style={
                                              styles.constructionStatusStep
                                            }>
                                            {isSelected ? (
                                              <Image
                                                source={require('../assets/profile/check.png')}
                                                style={
                                                  styles.constructionStatusCheckImage
                                                }
                                                resizeMode="contain"
                                              />
                                            ) : (
                                              <View
                                                style={
                                                  styles.constructionStatusCircle
                                                }
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
                                              style={
                                                styles.constructionStatusDottedLine
                                              }
                                            />
                                          ) : null}
                                        </React.Fragment>
                                      );
                                    },
                                  )}
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
                                    <Image
                                      source={getFeatureIconSource(
                                        item.iconKey,
                                      )}
                                      style={styles.smartInfoBtnIcon}
                                      resizeMode="contain"
                                    />
                                    <Text style={styles.smartInfoBtnLabel}>
                                      {item.label}
                                    </Text>
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
                          address={firstNonEmpty(
                            lastAd?.address,
                            lastAd?.location,
                            lastAd?.search_address,
                            lastAd?.land_address,
                            brokerAddress,
                          )}
                          containerStyle={styles.locationMapContainer}
                        />
                      ) : null}
                    </>
                  )}
                </View>
              )}
          </View>
        )}

        {showPiAiSmartInfoBlock && (
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
                קבלו מידע חכם על סביבת הנכס בלחיצת כפתור
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
                    <Image
                      source={buttonSources[index]}
                      style={styles.smartInfoBtnIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.smartInfoBtnLabel}>{item.label}</Text>
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

        {/* Broker / professional details block + My Properties */}
        {showProfileRatingFeatures &&
          !openedFromPost &&
          !showProfessionalFigmaProfile &&
          !isDedicatedListingAdProfile && (
            <View style={styles.brokerCardOverlayLine} />
          )}
        {/*
          Figma 8:79136 professional order:
          header → buttons → 6 posts → name/rating/location/specialties/bio → contact → reviews.
          Reuses the same brokerCardBottom block as brokers/companies.
        */}
        {showProfileRatingFeatures && !isDedicatedListingAdProfile && (
          <View style={styles.brokerCardBottom}>
            {!isCompany || showCompanyPostSpecialties ? (
              <>
                <View style={styles.brokerCardBottomHeader}>
                  <View style={styles.brokerCardBottomNameBlock}>
                    <Text
                      style={
                        showProfessionalFigmaProfile
                          ? styles.proBrokerCardBottomName
                          : styles.brokerCardBottomName
                      }>
                      {displayName}
                    </Text>
                  </View>
                  {renderPiRating()}
                </View>
                {/* סוג under name — only from בעלי מקצוע בתחום הנדל״ן (brokers → תיווך). */}
                {openedFromProfessionalsDirectory
                  ? renderProfessionalTypeTags(directoryTypeLabels)
                  : !showProfessionalFigmaProfile &&
                      isProfessional &&
                      !showTikTokProfessionalHeader
                    ? renderProfessionalTypeTags(professionalTypesDisplay)
                    : null}
                {brokerAddress && !isOwnProfile ? (
                  <View style={styles.brokerCardBottomLocationRow}>
                    <SimpleLineIcons
                      name="location-pin"
                      size={16}
                      color="#FFFFFF"
                    />
                    <Text style={styles.brokerCardBottomAddress}>
                      {brokerAddress}
                    </Text>
                  </View>
                ) : null}
                {user?._fromTikTokPost && isBroker && openedFromPost ? (
                  <View style={styles.brokerCardBottomSectionDivider} />
                ) : null}
                {(showProfessionalFigmaProfile ||
                  (!user?._fromTikTokPost && !isBroker)) && (
                  <View style={styles.brokerCardBottomSectionDivider} />
                )}
                {!hideCompanyPostSpecialtiesBlock && (
                  <>
                    <Text style={styles.brokerCardBottomSectionTitle}>
                      {profileSpecialtySectionTitle}
                    </Text>
                    <View style={styles.brokerCardBottomTags}>
                      {profileSpecialtyTags.length > 0 ? (
                        profileSpecialtyTags.map((s, i) => (
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
                          {profileSpecialtyEmptyText}
                        </Text>
                      )}
                    </View>
                  </>
                )}
                {(showProfessionalFigmaProfile || !user?._fromTikTokPost) && (
                  <View style={styles.brokerCardBottomContentDivider} />
                )}
              </>
            ) : null}
            {isCompany &&
            (!showCompanyPostSpecialties || user?._fromTikTokPost) ? (
              <>
                {showCompanyPostSpecialties ? (
                  <View style={styles.brokerCardBottomContentDivider} />
                ) : null}
                <Text style={styles.brokerCardBottomAboutTitle}>
                  אודות החברה
                </Text>
              </>
            ) : null}
            <Text style={styles.brokerCardBottomBio}>
              {brokerBio && String(brokerBio).trim() ? brokerBio : 'אין תיאור'}
            </Text>
            {!hideMyPropertiesSection && (
              <View style={styles.brokerCardBottomDivider} />
            )}
          </View>
        )}

        {showProfilePostGridAfterBio ? (
          <View style={styles.lastAdCard}>
            <View style={styles.lastAdImageWrapGridMode}>
              {renderProfilePostGridContent()}
            </View>
          </View>
        ) : null}

        {(!isRegularUserAdView || isOwnProfile) &&
          !hideMyPropertiesSection &&
          !isDedicatedListingAdProfile && (
            <View style={styles.myPropertiesSection}>
              <View style={styles.myPropertiesHeader}>
                <Text style={styles.myPropertiesTitle}>
                  {isCompany ? 'הפרויקטים שלנו' : 'הנכסים שלי'}
                </Text>
                {isCompany ? (
                  <TouchableOpacity
                    onPress={() => {
                      if (
                        typeof onOpenCompanyProjects === 'function' &&
                        creatorId
                      ) {
                        onOpenCompanyProjects();
                      }
                    }}
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
                    activeOpacity={0.7}>
                    <Text style={styles.myPropertiesSeeAllText}>
                      לכל הנכסים שלי
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {userListingsLoading ? (
                <View style={styles.myPropertiesListPlaceholder}>
                  <Text style={styles.myPropertiesPlaceholderText}>
                    טוען...
                  </Text>
                </View>
              ) : userListings.length === 0 ? (
                <View style={styles.myPropertiesListPlaceholder}>
                  <Text style={styles.myPropertiesPlaceholderText}>
                    {isCompany ? 'אין פרויקטים להצגה' : 'אין נכסים להצגה'}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={userListings.filter(l => !isPostListingRecord(l))}
                  horizontal
                  nestedScrollEnabled
                  removeClippedSubviews={false}
                  showsHorizontalScrollIndicator={false}
                  style={styles.myPropertiesFlatList}
                  contentContainerStyle={styles.myPropertiesListContent}
                  keyExtractor={item => String(item.id)}
                  renderItem={({item}) => {
                    const imgs = item.listing_images || [];
                    const firstImg = imgs[0]?.image_url;
                    const purposeRaw =
                      item.purpose || item.search_purpose || '';
                    const listingCategory = Number(item.category);
                    const purposeLabel =
                      listingCategory === 5
                        ? 'BNB'
                        : purposeRaw === 'sale' ||
                            String(purposeRaw).toLowerCase() === 'sale' ||
                            purposeRaw === 'מכירה'
                          ? 'למכירה'
                          : 'להשכרה';
                    const priceNum =
                      item.price != null ? Number(item.price) : null;
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
                      <TouchableOpacity
                        style={styles.myPropertiesCard}
                        activeOpacity={0.85}
                        onPress={() => handleMyPropertyPress(item)}
                        accessibilityRole="button"
                        accessibilityLabel="פתח מודעה">
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
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </View>
          )}

        {/* Contact Details – פרטי התקשרות */}
        {!isRegularUserAdView && showListingContactAndReviews && (
          <View style={styles.contactDetailsDivider} />
        )}
        {!isRegularUserAdView && showListingContactAndReviews && (
          <View style={styles.contactDetailsSection}>
            <Text style={styles.contactDetailsTitle}>פרטי התקשרות</Text>
            <View style={styles.contactDetailsContent}>
              <View style={styles.contactDetailsRight}>
                <ProfileAvatar
                  uri={contactLogo || undefined}
                  name={displayName}
                  size={100}
                  subscriptionType={resolvedCreator || user}
                  style={styles.contactDetailsProfileAvatar}
                  imageStyle={
                    Platform.OS === 'web' ? {objectFit: 'cover'} : undefined
                  }
                />
                <Text style={styles.contactDetailsAgencyName}>
                  {displayName}
                </Text>
                {isCompany && (
                  <TouchableOpacity
                    style={[styles.contactDetailsRow]}
                    onPress={() => {}}>
                    <Image
                      source={require('../assets/web-icon.png')}
                      style={styles.contactDetailsIconImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.contactDetailsLink}>
                      {contactEmail}
                    </Text>
                  </TouchableOpacity>
                )}
                {contactPhones.map((phone, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.contactDetailsRow}
                    onPress={() => {}}>
                    <Image
                      source={contactPhoneIconSource}
                      style={styles.contactDetailsIconImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.contactDetailsLink}>
                      {String(phone).trim()}
                    </Text>
                  </TouchableOpacity>
                ))}
                {contactEmail ? (
                  <TouchableOpacity
                    style={[styles.contactDetailsRow, {marginBottom: 0}]}
                    onPress={() => {}}>
                    <Image
                      source={contactEmailIconSource}
                      style={styles.contactDetailsIconImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.contactDetailsLink}>
                      {contactEmail}
                    </Text>
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
            {renderProfileMessagingCta(styles.contactDetailsCtaSection)}
          </View>
        )}
        {!isRegularUserAdView && showListingContactAndReviews && (
          <View style={styles.contactDetailsDivider} />
        )}

        {/* Rating & Reviews – brokers / companies / professionals only */}
        {showProfileRatingFeatures && showListingContactAndReviews ? (
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
                    style={styles.reviewsRateBtnGradient}>
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
                onFocus={scrollReviewsIntoView}
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
                      <ProfileAvatar
                        uri={r.reviewer_image_url || undefined}
                        name={r.reviewer_name}
                        size={60}
                        subscriptionType={r.reviewer_subscription_type}
                        imageStyle={
                          Platform.OS === 'web' ? {objectFit: 'cover'} : undefined
                        }
                      />

                      <Image
                        source={getStarSource(
                          Math.min(5, Math.max(1, Number(r.rating) || 1)) - 1,
                        )}
                        style={[
                          r.rating === 1
                            ? styles.reviewCardStarBadgeImage1
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
          </View>
        ) : null}

        {/* דווח — always the last element in the profile scroll (all types). */}
        {renderBottomReportButton()}
        </ScrollView>
      </KeyboardAvoidingView>

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
            <View style={styles.heroNavFixedContent}>
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
            </View>
          ) : showFixedProHero ? (
            <>
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.8}
                style={[styles.heroCircleBtn, {top: 10}]}
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
                style={[styles.heroCircleBtn, {top: 10}]}
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
              activeOpacity={0.8}
              style={[styles.backBtn, {top: top + 10, left: 10}]}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
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
            keyExtractor={(item, i) =>
              item.isVideo ? `fs-video-${i}` : `fs-img-${i}-${item.uri}`
            }
            horizontal
            pagingEnabled
            style={forceLtrStyle}
            contentContainerStyle={forceLtrStyle}
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
            renderItem={({item, index}) => (
              <View
                style={{
                  width: Dimensions.get('window').width,
                  height: Dimensions.get('window').height,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: '#000',
                }}>
                {item.isVideo ? (
                  <Video
                    source={{uri: item.uri}}
                    style={{width: '100%', height: '100%'}}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={index === fullScreenImageIndex}
                    isLooping
                    isMuted={false}
                    useNativeControls
                  />
                ) : (
                  <Image
                    source={{uri: item.uri}}
                    style={{
                      width: '100%',
                      height: '100%',
                    }}
                    resizeMode="contain"
                  />
                )}
              </View>
            )}
          />

          {/* Image counter and dots at bottom */}
          <View style={styles.fullScreenImageCounter}>
            <Text style={styles.fullScreenImageCounterText}>
              {fullScreenImageIndex + 1} / {lastAdImages.length}
            </Text>
          </View>

          {lastAdImages.length > 1 && (
            <View style={[styles.fullScreenImageDots, forceLtrStyle]}>
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
    ...(Platform.OS === 'web' ? {right: -5} : {left: -5}),
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
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 65,
    marginBottom: 25,
  },
  stat: {alignItems: 'center'},
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  pendingFollowRequestDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.categoriesApartments,
  },
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
    flexDirection: 'row-reverse',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  myPropertiesTitle: {
    color: '#D2D0DC',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
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
    textAlign: 'left',
    marginBottom: 5,
  },
  myPropertiesCardLocation: {
    color: '#FFFFFFCC',
    fontSize: 12,
    textAlign: 'left',
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
    flexDirection: 'row-reverse',
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
    justifyContent: flexStart,
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
    writingDirection: 'rtl',
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
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 24,
    marginBottom: 4,
    ...forceRtlStyle,
  },
  proBrokerCardBottomName: {
    color: '#F7F3E6',
    fontSize: 32,
    lineHeight: 37,
    fontFamily: 'Rubik-SemiBold',
    textAlign: Platform.OS === 'web' ? 'right' : 'left',
    alignSelf: 'stretch',
  },
  professionalTypeTags: {
    justifyContent: flexStart,
    alignSelf: 'stretch',
    width: '100%',
    marginTop: 8,
    marginBottom: 4,
  },
  professionalHeaderTypeTags: {
    marginTop: 4,
    marginBottom: 8,
  },
  brokerCardBottomSectionDivider: {
    height: 1,
    backgroundColor: '#373548',
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  brokerCardBottomNameBlock: {
    flex: 1,
    minWidth: 0,
    ...forceRtlStyle,
  },
  brokerCardBottomName: {
    color: '#F7F3E6',
    fontSize: 28,
    lineHeight: 31,
    fontFamily: 'Rubik-SemiBold',
    textAlign: Platform.OS === 'web' ? 'right' : 'left',
    alignSelf: 'stretch',
  },
  brokerCardBottomLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 4,
    width: '100%',
    marginBottom: 8,
  },
  brokerCardBottomLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 6,
    alignSelf: 'stretch',
    ...forceRtlStyle,
  },
  brokerCardBottomAddress: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 32,
    textAlign: 'left',
    fontFamily: 'Rubik-Regular',
  },
  companyStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    alignSelf: 'stretch',
    marginVertical: 10,
    paddingHorizontal: 0,
  },
  companyStatItem: {flexDirection: 'row', alignItems: 'center', gap: 6},
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
    textAlign: Platform.OS === 'web' ? 'right' : 'left',
    alignSelf: 'stretch',
    width: '100%',
  },
  brokerCardBottomAboutTitle: {
    color: '#D2D0DC',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    marginBottom: 6,
    textAlign: 'left',
  },
  brokerCardBottomTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: flexStart,
    gap: 8,
    marginBottom: 12,
    alignSelf: 'stretch',
    width: '100%',
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
    textAlign: 'right',
  },
  brokerCardBottomBio: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 32,
    textAlign: 'left',
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
    textAlign: 'left',
    marginBottom: 16,
  },
  contactDetailsContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  contactDetailsRight: {flex: 1, alignItems: flexStart},
  contactDetailsProfileAvatar: {
    alignSelf: flexStart,
    marginBottom: 12,
  },
  contactDetailsAgencyName: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    marginBottom: 14,
  },
  contactDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    marginBottom: 10,
  },
  contactDetailsLink: {
    color: '#fff',
    fontFamily: 'Rubik-Regular',
    fontSize: 16,
    textDecorationLine: 'underline',
    marginLeft: 8,
  },
  contactDetailsIconImage: {
    width: 24,
    height: 24,
  },
  contactDetailsCopyBtn: {
    alignSelf: 'flex-end',
  },
  contactDetailsCtaSection: {
    marginTop: 20,
    marginHorizontal: 0,
    width: '100%',
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
  profileReportBottomSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  profileCtaWarningBtn: {
    height: 40,
    borderRadius: 28,
    backgroundColor: '#4D4966',
    flexDirection: 'row-reverse',
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
    left: 2,
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
    height: 60,
    minHeight: 60,
    maxHeight: 60,
    alignSelf: 'stretch',
    borderRadius: 28,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCtaChatImageOnlyAsset: {
    width: '100%',
    height: 60,
    maxHeight: 60,
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
    width: '94%',
    alignItems: 'center',
  },
  reviewsRateBtnPressed: {opacity: 0.85},
  reviewsRateBtnGradient: {
    height: 44,
    borderRadius: 846,
    width: '100%',
    // maxWidth: 320,
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
    writingDirection: 'rtl',
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewCardAvatarWrap: {
    position: 'relative',
    marginRight: 12,
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
    textAlign: 'left',
  },
  reviewCardDate: {
    color: '#D2D0DC',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'left',
    fontFamily: 'Rubik-Regular',
  },
  reviewCardBody: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'left',
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
    flexDirection: 'row-reverse',
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
    flexDirection: 'row-reverse',
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
    justifyContent: flexEnd,
  },
  heroNavFixedContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
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
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 16,
  },
  lastAdImageWrapGridMode: {
    width: SCREEN_WIDTH,
    backgroundColor: Colors.mainDeepBlue,
  },
  lastAdPostGridPagerWrap: {
    width: SCREEN_WIDTH,
  },
  lastAdPostGridPager: {
    width: SCREEN_WIDTH,
  },
  lastAdGridPage: {
    overflow: 'hidden',
  },
  lastAdImage: {height: LAST_AD_IMAGE_HEIGHT},
  lastAdGrid: {
    width: '100%',
    height: '100%',
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
  // Outer cell holds gutter padding; inner holds aspectRatio (padding+aspectRatio on one view clips bottoms).
  lastAdGridItem: {
    width: '33.3333%',
    padding: 1,
  },
  // aspectRatio = width/height; below 1 yields taller cells than 1:1 (opened-from-post grid).
  lastAdGridItemInner: {
    width: '100%',
    aspectRatio: 0.78,
    overflow: 'hidden',
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
  postGridViewBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    zIndex: 2,
  },
  postGridViewIcon: {
    width: 14,
    height: 14,
  },
  postGridViewText: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 13,
    fontFamily: 'Rubik-Medium',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  lastAdGridVideoCell: {
    backgroundColor: '#1E1D27',
  },
  postGridVideoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postGridVideoPlayOverlayDim: {
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  postGridDots: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    paddingBottom: 4,
  },
  postGridDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  postGridDotActive: {
    backgroundColor: GOLD,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lastAdImagePlaceholder: {alignItems: 'center', justifyContent: 'center'},
  lastAdPiAndPurposeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  lastAdPiBadge: {
    flexDirection: 'row-reverse',
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
    fontSize: 22,
    fontFamily: 'Rubik-Medium',
    // Number sat a little low vs the star — nudge it up to the star's optical center.
    transform: [{translateY: -3}],
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
  lastAdHeroVideoBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
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
    left: 16,
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
    alignItems: flexStart,
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
    textAlign: 'left',
    flexShrink: 1,
    marginLeft: 12,
  },
  lastAdPrice: {
    color: '#F7F3E6',
    fontSize: 28,
    fontFamily: 'Rubik-SemiBold',
    textAlign: 'left',
    marginBottom: 6,
  },
  lastAdLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 6,
    marginBottom: 10,
  },
  lastAdLocationText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    textAlign: 'left',
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
    alignItems: flexStart,
  },
  constructionStatusTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'left',
  },
  constructionStatusRow: {
    flexDirection: 'row',
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
  lastAdPostedBy: {
    marginBottom: 8,
    width: '100%',
    ...forceRtlStyle,
  },
  lastAdPostedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
    ...forceRtlStyle,
  },
  lastAdPostedByPublisher: {
    flex: 1,
    minWidth: 0,
  },
  companyFeedFollowCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  companyFeedFollowGoldWrap: {
    borderRadius: 1000,
    overflow: 'hidden',
    flexShrink: 0,
  },
  companyFeedFollowGoldGradient: {
    minWidth: 58,
    minHeight: 30,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyFeedFollowGoldText: {
    color: '#1E1D27',
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.54,
    fontFamily: 'Rubik-Medium',
  },
  companyFeedFollowBtn: {
    backgroundColor: '#4d4966',
    borderRadius: 1000,
    minWidth: 58,
    minHeight: 30,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  companyFeedFollowBtnFollowing: {
    opacity: 1,
  },
  companyFeedFollowBtnPending: {
    minWidth: 118,
    maxWidth: 140,
    paddingHorizontal: 8,
    opacity: 0.7,
  },
  companyFeedFollowBtnText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.54,
    fontFamily: 'Rubik-Regular',
  },
  companyFeedFollowBtnPendingText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
  },
  companyFeedFollowCancelBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  lastAdPostedByLabel: {
    color: '#D2D0DC',
    fontSize: 11,
    textAlign: Platform.OS === 'web' ? 'right' : 'left',
    alignSelf: 'stretch',
    marginBottom: 7,
    fontFamily: 'Rubik-Regular',
  },
  lastAdPostedByName: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: Platform.OS === 'web' ? 'right' : 'left',
    flex: 1,
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
    textAlign: 'left',
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
    justifyContent: flexStart,
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
    textAlign: 'left',
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
    alignItems: flexStart,
  },
  projectOfferCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  projectOfferCardTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
  },
  projectOfferCardDetails: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'left',
    fontFamily: 'Rubik-Regular',
    marginBottom: 4,
  },
  projectOfferCardPrice: {
    color: '#F7F3E6',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
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
