import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from 'react';
import {
  StyleSheet,
  View,
  Image,
  Text,
  Alert,
  AppState,
  Platform,
  Linking,
  BackHandler,
} from 'react-native';
import {forceRtlStyle} from './utils/rtlLayout';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineBanner from './components/OfflineBanner';
import {
  getCurrentUser as getCurrentUserFromStorage,
  setCurrentUserStorage,
  clearCurrentUserStorage,
} from './utils/secureUserStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingFlow from './components/OnboardingOverlay';
import SplashHomeIntroOverlay from './components/SplashHomeIntroOverlay';
import {
  hasCompletedOnboarding,
  markOnboardingCompleted,
  hasAcceptedTerms,
  markTermsAccepted,
} from './utils/onboardingStorage';
import {
  AdsForm,
  Home,
  SelectedProjectsScreen,
  ProfessionalsDirectoryScreen,
  ProfessionalFlyerScreen,
  CompanyProjectsScreen,
  CompanyReportScreen,
  SettingsScreen,
  EditProfileScreen,
  SuccessScreen,
  TikTokFeedScreen,
  OfficeListingScreen,
  PostEditorScreen,
  CityFilterScreen,
  ApartmentTypeFilterScreen,
  RoomsFilterScreen,
  PriceFilterScreen,
  TypeFilterScreen,
  OfficeFilterScreen,
  MeterFilterScreen,
  DonamFilterScreen,
  PreferencesFilterScreen,
  EditPublishAdScreen,
  ListingAnalysisScreen,
  ChatScreen,
  ChatListScreen,
  UserProfileScreen,
  ProfileReviewsScreen,
  FollowHubScreen,
  UserListingsScreen,
  SubscriptionScreen,
  SubscriptionFormScreen,
  SubscriptionRatingIntroScreen,
  VerificationScreen,
  VerificationCodeScreen,
  LoginScreen,
  UserRegistrationScreen,
  SecretCodeRecoveryScreen,
  SecretCodeRecoverySentScreen,
  FavoritesScreen,
  FeedbackSuggestionScreen,
  TermsOfUseScreen,
  AccessibilityStatementScreen,
  ProjectMarketerPlanScreen,
  JoinAgencyScreen,
  AgencyJoinCodeScreen,
  AgencyMembersScreen,
  AgencyMemberListingsScreen,
} from './screens';
import CompanyReportSuccessModal from './components/CompanyReportSuccessModal';
import PublishSuccessToast from './components/PublishSuccessToast';
import {ContextHook} from './hooks/ContextHook';
import {PresenceProvider} from './hooks/PresenceContext';
import {
  subscriptionTypes,
  DEFAULT_HOME_CAROUSEL_CATEGORY_ID,
  canAccessListingAnalysis,
  DEFAULT_POST_DESCRIPTION,
  OPEN_HOUSE_POST_DESCRIPTION,
  OPEN_HOUSE_POST_KIND,
  isOpenHouseListing,
  isOpenHousePostDescription,
  tikTokPostsSidebarFilterForCategory,
} from './utils/constant';
import {
  getChatUnreadCount,
  getListings,
  getCurrentUser,
  toSubscriptionId,
  resolveSubscriptionId,
} from './utils/api';
import {resolveSalesImageEditorListing} from './utils/postTextOverlay';
import {
  getUserProfileImageUrl,
  normalizeUserProfileAliases,
} from './utils/userProfileImage';
import {getChatListingCategoryLabel} from './utils/chatListingCategory';
import {normalizeConversationForOpen} from './utils/chatDefaults';
import {
  isAdsListingRecord,
  isFeedPostListingRecord,
} from './utils/listingShape';
import {enrichListingForUserProfile} from './utils/enrichListingForUserProfile';
import {
  pickTopViewedListingForProfile,
  mergeHubRowIntoListingPayload,
  isPostListingRecord,
} from './utils/pickTopViewedListingForProfile';
import {useFonts, loadAsync as loadFontsAsync} from 'expo-font';
import {criticalFonts, deferredFonts} from './utils/fonts';
import {schedulePreloadAppAssets} from './utils/preloadAppAssets';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

const AppBootLoading = () => {
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Hand off from native splash straight to the JS boot screen.
      SplashScreen.hideAsync().catch(() => {});
    }
  }, []);
  return (
    <View style={styles.bootRoot}>
      <Image
        source={require('./assets/SplashScreen.png')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
    </View>
  );
};

const screenName = {
  home: 'home',
  tikTokFeed: 'tikTokFeed',
  adsForm: 'adsForm',
  officeListing: 'officeListing',
  settings: 'settings',
  login: 'login',
  subscription: 'subscription',
  subscriptionCompany: 'subscriptionCompany',
  subscriptionProfessional: 'subscriptionProfessional',
  subscriptionForm: 'subscriptionForm',
  subscriptionFormCompany: 'subscriptionFormCompany',
  subscriptionFormProfessional: 'subscriptionFormProfessional',
  verification: 'verification',
  verificationCompany: 'verificationCompany',
  verificationProfessional: 'verificationProfessional',
  verificationCode: 'verificationCode',
  verificationCodeCompany: 'verificationCodeCompany',
  verificationCodeProfessional: 'verificationCodeProfessional',
  ratingIntro: 'ratingIntro',
  ratingIntroCompany: 'ratingIntroCompany',
  ratingIntroProfessional: 'ratingIntroProfessional',
  success: 'success',
  successCompany: 'successCompany',
  successProfessional: 'successProfessional',
  /** משווק פרויקטים — plan picker, then the company-style subscription flow. */
  projectMarketerPlan: 'projectMarketerPlan',
  subscriptionProjectMarketer: 'subscriptionProjectMarketer',
  subscriptionFormProjectMarketer: 'subscriptionFormProjectMarketer',
  verificationProjectMarketer: 'verificationProjectMarketer',
  verificationCodeProjectMarketer: 'verificationCodeProjectMarketer',
  ratingIntroProjectMarketer: 'ratingIntroProjectMarketer',
  successProjectMarketer: 'successProjectMarketer',
  joinAgency: 'joinAgency',
  agencyJoinCode: 'agencyJoinCode',
  agencyMembers: 'agencyMembers',
  agencyMemberListings: 'agencyMemberListings',
  userRegistration: 'userRegistration',
  postEditor: 'postEditor',
  cityFilter: 'cityFilter',
  apartmentTypeFilter: 'apartmentTypeFilter',
  roomsFilter: 'roomsFilter',
  priceFilter: 'priceFilter',
  typeFilter: 'typeFilter',
  meterFilter: 'meterFilter',
  donamFilter: 'donamFilter',
  preferencesFilter: 'preferencesFilter',
  officeFilter: 'officeFilter',
  editPublishAd: 'editPublishAd',
  listingAnalysis: 'listingAnalysis',
  chatList: 'chatList',
  chat: 'chat',
  userProfile: 'userProfile',
  followHub: 'followHub',
  userListings: 'userListings',
  secretCodeRecovery: 'secretCodeRecovery',
  secretCodeRecoverySent: 'secretCodeRecoverySent',
  favorites: 'favorites',
  feedbackSuggestion: 'feedbackSuggestion',
  termsOfUse: 'termsOfUse',
  accessibilityStatement: 'accessibilityStatement',
  selectedProjects: 'selectedProjects',
  professionalsDirectory: 'professionalsDirectory',
  professionalFlyer: 'professionalFlyer',
  companyProjects: 'companyProjects',
  companyReport: 'companyReport',
  /** Figma 10:31152 — full ביקורות list from profile "קרא עוד". */
  profileReviews: 'profileReviews',
  editProfile: 'editProfile',
};

/** Opened from TikTok feed — keep feed mounted so back restores scroll position. */
const TIKTOK_PROFILE_STACK_SCREENS = new Set([
  screenName.userProfile,
  screenName.profileReviews,
  screenName.followHub,
  screenName.userListings,
  screenName.companyReport,
  screenName.companyProjects,
]);

const INITIAL_FEED_FILTERS = {
  price: null, // null | { minPrice, maxPrice }
  rooms: null, // null | { area, rooms, floor, parking, balcony, elevator, mamad }
  city: null, // null | { purpose, city, street, distanceKm, regions, immediateEntry }
  apartmentType: null, // null | string | string[] (multi-select: OR)
  type: null, // null | string (global category "סוג" type id)
  meter: null, // null | number (מסחר category: min sq meters)
  donam: null, // null | { minDonam, maxDonam } for קרקעות
  office: null, // null | { minArea, minRooms, wholeFloor, parking, elevator, mamad } — משרדים (2)
  preferences: null, // null | object { gender, ageMin, ageMax, nonSmoker, students, ... }
};

/** Drop city filter when nothing is set (נקה + שמור); same idea as empty apartmentType. */
function normalizeCityFeedFilter(f) {
  if (f == null) return null;
  const country = String(f.country || '').trim();
  const city = String(f.city || '').trim();
  const street = String(f.street || '').trim();
  const hasLoc = country !== '' || city !== '' || street !== '';
  const regions = Array.isArray(f.regions)
    ? f.regions.map(r => String(r || '').trim()).filter(Boolean)
    : [];
  const hasRegions = regions.length > 0;
  const imm = f.immediateEntry === true;
  const p = f.purpose;
  const hasPurpose = p === 'rent' || p === 'sale';
  const hasDistance =
    f.distanceKm != null && Number.isFinite(Number(f.distanceKm));
  if (!hasLoc && !imm && !hasPurpose && !hasRegions && !hasDistance)
    return null;
  return {
    ...f,
    country: country || null,
    city: city || null,
    street: street || null,
    purpose: hasPurpose ? p : null,
    distanceKm: hasDistance ? Number(f.distanceKm) : null,
    regions: hasRegions ? regions : null,
    immediateEntry: imm ? true : null,
  };
}

/** `onSave(null)` or merge from RoomsFilterScreen. */
function normalizeRoomsFeedFilter(f) {
  return f == null ? null : f;
}

/** Same key as TikTokFeedScreen — opening feed from Home always starts on default (pics). */
const TIKTOK_TOP_BAR_FILTER_STORAGE_KEY = 'tikTokFeedSelectedTopBarFilter';
const TIKTOK_SIDEBAR_FILTERS_STORAGE_KEY = 'tikTokSidebarFiltersByCategory';
const DEFAULT_TIKTOK_TOP_FILTER = 'pics';

/**
 * Main App Component
 * Entry point for the PI Real Estate application
 */
function App() {
  const [fontsLoaded] = useFonts(criticalFonts);

  useEffect(() => {
    if (!fontsLoaded) return undefined;
    loadFontsAsync(deferredFonts).catch(() => {});
    return schedulePreloadAppAssets();
  }, [fontsLoaded]);

  const [appBootstrapDone, setAppBootstrapDone] = useState(false);
  /** One-shot splash → home intro after onboarding + terms (Figma). */
  const [showSplashIntro, setShowSplashIntro] = useState(false);
  const [homeIntroReady, setHomeIntroReady] = useState(false);
  // Marked true the moment the Home intro animation starts (not when it
  // finishes) so it can never replay — Home unmounts/remounts every time the
  // user navigates away and back (currentScreen !== home), which would
  // otherwise recompute showIntroModal as true again on every return visit.
  const [hasShownHomeIntro, setHasShownHomeIntro] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  /** After onboarding: must accept terms before using the app. */
  const [showTermsGate, setShowTermsGate] = useState(false);
  const [currentScreen, setCurrentScreen] = useState(screenName.home);

  useLayoutEffect(() => {
    if (!fontsLoaded || !appBootstrapDone) return;
    // Android hides native splash in AppBootLoading; iOS waits for intro gate.
    if (Platform.OS === 'android' || !showSplashIntro) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [
    fontsLoaded,
    appBootstrapDone,
    showSplashIntro,
    showOnboarding,
    showTermsGate,
  ]);

  const handleSplashOverlayFirstPaint = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Real navigation history — fixes back/close getting stuck oscillating
  // between two screens (e.g. chat <-> userProfile) when each screen's
  // single "return to" variable ends up pointing at the other. The
  // per-screen XReturnScreen state vars elsewhere are kept as a fallback
  // for direct entry points (deep link, notification, etc.) where history
  // is empty, but goBack() always prefers true history when available.
  const screenHistoryRef = useRef([screenName.home]);
  const isGoingBackRef = useRef(false);

  useEffect(() => {
    if (isGoingBackRef.current) {
      isGoingBackRef.current = false;
      return;
    }
    const history = screenHistoryRef.current;
    if (history[history.length - 1] !== currentScreen) {
      history.push(currentScreen);
      if (history.length > 30) history.shift();
    }
  }, [currentScreen]);

  const goBack = useCallback(
    (fallback = screenName.home) => {
      const history = screenHistoryRef.current;
      history.pop(); // drop the entry for the screen we're leaving (top === currentScreen)
      // Peek (don't pop) the target — it must stay on top so the history's
      // invariant (top === currentScreen) still holds after we navigate there.
      // Popping it here too was the bug: it caused every second back-press
      // to skip a screen instead of unwinding one level at a time.
      let target = history[history.length - 1];
      while (target != null && target === currentScreen) {
        history.pop();
        target = history[history.length - 1];
      }
      isGoingBackRef.current = true;
      setCurrentScreen(target || fallback);
    },
    [currentScreen],
  );

  /** Navigate away without leaving the current screen on the back stack. */
  const replaceCurrentScreen = useCallback(nextScreen => {
    const history = screenHistoryRef.current;
    if (history.length > 0) history.pop();
    isGoingBackRef.current = true;
    setCurrentScreen(nextScreen);
  }, []);

  const finishPublishedListing = useCallback(
    ({returnScreen, categoryId, listingPreview, isUpdate = false}) => {
      const catNum =
        categoryId != null ? parseInt(String(categoryId), 10) : NaN;
      const resolvedCat = Number.isFinite(catNum) ? catNum : null;
      if (resolvedCat != null) {
        setSelectedCategory(String(resolvedCat));
      }
      if (returnScreen === screenName.editPublishAd) {
        setEditPublishSourceCategory(
          resolvedCat != null ? resolvedCat : editPublishSourceCategory,
        );
        setEditPublishRestoreStrip(true);
      }
      if (listingPreview) {
        setUploadedListings(prev => [...prev, listingPreview]);
      }
      setEditingListing(null);
      setBnbPublishHostType(null);
      setPostEditorConfig(prev => ({...prev, editingListing: null}));
      setEditPublishRefreshKey(k => k + 1);
      setTimeout(() => setTikTokFeedRefreshKey(k => k + 1), 800);
      replaceCurrentScreen(returnScreen);
      setPublishSuccessMessage(
        isUpdate
          ? 'המודעה שלך עודכנה בהצלחה'
          : 'המודעה שלכם פורסמה בהצלחה!',
      );
      setPublishSuccessVisible(true);
    },
    [editPublishSourceCategory, replaceCurrentScreen],
  );

  /** Map auth return token → screen name (fallback when history is empty). */
  const authReturnFallbackScreen = useCallback((back, defaultScreen) => {
    if (back === 'home') return screenName.home;
    if (back === 'settings') return screenName.settings;
    if (back === 'favorites') return screenName.favorites;
    if (back === 'adsForm') return screenName.adsForm;
    if (back === 'userProfile') return screenName.userProfile;
    if (back === 'tikTokFeed') return screenName.tikTokFeed;
    return defaultScreen;
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const onBackPress = () => {
      if (currentScreen === screenName.home) {
        return false; // let the OS handle it (minimize/exit confirmation)
      }
      goBack();
      return true;
    };
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );
    return () => subscription.remove();
  }, [currentScreen, goBack]);

  const [subscriptionData, setSubscriptionData] = useState(null); // Store subscription data between screens
  /** משווק פרויקטים plan chosen on the picker; forwarded to the registration form. */
  const [marketerPlan, setMarketerPlan] = useState(null);
  /** Team member a marketing manager is currently inspecting (ניהול משווקים). */
  const [agencyMember, setAgencyMember] = useState(null);
  const [currentUser, setCurrentUserState] = useState(null); // Store current logged-in user data
  const setCurrentUser = useCallback(u => {
    if (u == null) {
      setCurrentUserState(null);
      return;
    }
    if (typeof u === 'function') {
      setCurrentUserState(prev => {
        const next = u(prev);
        return next == null ? null : normalizeUserProfileAliases(next);
      });
      return;
    }
    setCurrentUserState(normalizeUserProfileAliases(u));
  }, []);
  const [uploadedListings, setUploadedListings] = useState([]); // Store uploaded listings for TikTok feed (temporary, for immediate display)
  const [selectedCategory, setSelectedCategory] = useState(null); // Store selected category for TikTok feed
  /** Home carousel category — restored when returning from TikTok (not hardcoded to דירות). */
  const [homeCarouselCategoryId, setHomeCarouselCategoryId] = useState(
    DEFAULT_HOME_CAROUSEL_CATEGORY_ID,
  );
  // Explicit category context when opening Edit/Publish from TikTok feed
  const [editPublishSourceCategory, setEditPublishSourceCategory] =
    useState(null);
  /** When true, skip category-strip intro and scroll to saved category (in-flow return only). */
  const [editPublishRestoreStrip, setEditPublishRestoreStrip] = useState(false);
  /** BnB (category 5): 'private' | 'business' from feed bottom sheet; cleared when leaving AdsForm */
  const [bnbPublishHostType, setBnbPublishHostType] = useState(null);
  const [editingListing, setEditingListing] = useState(null); // When editing an ad from EditPublishAdScreen
  const [sharedListingForChat, setSharedListingForChat] = useState(null); // When opening chat from share
  const [chatReturnScreen, setChatReturnScreen] = useState(screenName.settings); // Where to return when closing chat
  const [selectedConversation, setSelectedConversation] = useState(null); // Conversation opened from chat list
  const [unreadChatCount, setUnreadChatCount] = useState(0); // Unread message count for chat badge (real messages only)
  const [piWelcomeRead, setPiWelcomeRead] = useState(false); // Until user opens Pi welcome once, count it as 1 unread
  const lastOpenedChatAtRef = useRef(null); // ISO timestamp; unread = messages after this
  const [tikTokFeedRefreshKey, setTikTokFeedRefreshKey] = useState(0); // Force refresh of TikTok feed
  /** After profile post-grid tap: scroll TikTok feed to this listing id, then clear. */
  const [tikTokFocusListingId, setTikTokFocusListingId] = useState(null);
  /** Profile post grid → user-only posts feed (subscription + optional avatar). */
  const [tikTokProfilePostsScope, setTikTokProfilePostsScope] = useState(null);
  /** Where TikTok back button returns (home vs profile). */
  const [tikTokReturnScreen, setTikTokReturnScreen] = useState(screenName.home);
  const [profileUser, setProfileUser] = useState(null); // User to show on UserProfileScreen when opened from feed
  /** Subscription-level profile to restore after opening an ad from הנכסים שלי carousel. */
  const [profileOverviewSnapshot, setProfileOverviewSnapshot] = useState(null);
  /** Changes when drilling into a specific ad so UserProfile remounts at top. */
  const [profileListingFocusKey, setProfileListingFocusKey] = useState('');
  const [profileReturnScreen, setProfileReturnScreen] = useState(
    screenName.tikTokFeed,
  );
  const [followHubInitialTab, setFollowHubInitialTab] = useState('followers');
  const [followHubReturnScreen, setFollowHubReturnScreen] = useState(
    screenName.userProfile,
  );
  /** Where to go when closing Favorites (Settings vs home vs feed). */
  const [favoritesReturnScreen, setFavoritesReturnScreen] = useState(
    screenName.home,
  );
  /** null = all categories; number = favorites only in that listing category (from TikTok feed). */
  const [favoritesCategoryFilter, setFavoritesCategoryFilter] = useState(null);
  /** Bumped when opening TikTok with user search from Favorites (same as feed magnify). */
  const [tikTokUserSearchOpenTrigger, setTikTokUserSearchOpenTrigger] =
    useState(0);
  const [companyProjectsContext, setCompanyProjectsContext] = useState(null);
  /** Where CompanyProjectsScreen back returns (selectedProjects vs userProfile). */
  const [companyProjectsReturnScreen, setCompanyProjectsReturnScreen] =
    useState(screenName.selectedProjects);
  /** Payload when opening דווח על חברה from UserProfileScreen (company only). */
  const [companyReportPayload, setCompanyReportPayload] = useState(null);
  /** Figma: 15:10070 company / 10:35338 professional — after report submit. */
  const [showCompanyReportSuccess, setShowCompanyReportSuccess] =
    useState(false);
  /** Reviews passed from UserProfileScreen when opening Figma full reviews page. */
  const [profileReviewsList, setProfileReviewsList] = useState(null);
  /** One-shot: reopen the Pi AI search (home flip back face) when next showing home. */
  const [piAiReopen, setPiAiReopen] = useState(false);
  /** Snapshot of the Pi AI search (query/results/layout) so returning restores the list. */
  const [piAiSnapshot, setPiAiSnapshot] = useState(null);
  const [returnToScreenAfterAuth, setReturnToScreenAfterAuth] = useState(null);
  // 'userProfile' | 'home' | 'settings' | 'tikTokFeed' | 'favorites' | null
  const [chatListRefreshKey, setChatListRefreshKey] = useState(0); // Bump when sending a message so chat list refetches
  const [secretRecoveryEmail, setSecretRecoveryEmail] = useState(''); // Email shown on שכחתי סיסמה success screen
  const [secretRecoveryTargetEmail, setSecretRecoveryTargetEmail] =
    useState('');
  const [secretRecoveryReturnScreen, setSecretRecoveryReturnScreen] = useState(
    screenName.settings,
  );
  const [postEditorConfig, setPostEditorConfig] = useState(() => ({
    publishTarget: 'post',
    returnScreen: screenName.tikTokFeed,
    /** DB listing category for the next publish; null = fall back to selectedCategory in PostEditor */
    listingCategoryId: null,
    /** Existing feed post when editing from EditPublishAdScreen. */
    editingListing: null,
    /** Sales-image edit: do not create a new story slide on finish. */
    skipStoryPublish: false,
    /** Stored in `ads.description` when publishing a feed post (פוסט vs בית פתוח). */
    postDescriptionLabel: DEFAULT_POST_DESCRIPTION,
  }));
  const [editPublishRefreshKey, setEditPublishRefreshKey] = useState(0);
  /** Where AdsForm returns after cancel or successful publish. */
  const [adsFormReturnScreen, setAdsFormReturnScreen] = useState(
    screenName.tikTokFeed,
  );
  const [publishSuccessVisible, setPublishSuccessVisible] = useState(false);
  const [publishSuccessMessage, setPublishSuccessMessage] = useState(
    'המודעה שלכם פורסמה בהצלחה!',
  );
  /** Sales image composed in PostEditor before returning to AdsForm. */
  const [adsFormPendingSalesImage, setAdsFormPendingSalesImage] =
    useState(null);
  // Feed filters (price, rooms, city, apartment type) – applied client-side in TikTokFeedScreen
  const [feedFilters, setFeedFilters] = useState(INITIAL_FEED_FILTERS);
  /** Sidebar chip filters keyed by feed category id — survives profile/chat navigation. */
  const [sidebarFiltersByCategory, setSidebarFiltersByCategory] = useState({});
  /** Filter modals return here on save/cancel (TikTok feed vs Favorites). */
  const [screenAfterFilter, setScreenAfterFilter] = useState(
    screenName.tikTokFeed,
  );
  const lastScreenRef = useRef(currentScreen);

  const resetFeedFilters = useCallback(() => {
    setFeedFilters(INITIAL_FEED_FILTERS);
  }, []);

  /** Merges one key into `feedFilters` (does not wipe other filters; use when saving a single filter sheet). */
  const setFeedFilterKey = useCallback((key, value) => {
    setFeedFilters(prev => ({...prev, [key]: value}));
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(TIKTOK_SIDEBAR_FILTERS_STORAGE_KEY)
      .then(raw => {
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            setSidebarFiltersByCategory(parsed);
          }
        } catch (_) {}
      })
      .catch(() => {});
  }, []);

  const handleSidebarFilterChange = useCallback((category, filterId) => {
    const catKey =
      category != null && String(category).trim() !== ''
        ? String(category).trim()
        : 'all';
    setSidebarFiltersByCategory(prev => {
      const next = {...prev};
      if (filterId == null || String(filterId).trim() === '') {
        delete next[catKey];
      } else {
        next[catKey] = String(filterId);
      }
      AsyncStorage.setItem(
        TIKTOK_SIDEBAR_FILTERS_STORAGE_KEY,
        JSON.stringify(next),
      ).catch(() => {});
      return next;
    });
  }, []);

  /** Open a feed post by id — sets category, פוסטים sidebar, and scroll focus. */
  const openListingInTikTokFeed = useCallback(
    (listing, {returnScreen = screenName.home} = {}) => {
      if (!listing?.id) return;
      const listingId = String(listing.id).trim();
      const rawCat =
        listing.category != null ? parseInt(String(listing.category), 10) : NaN;
      const isFeedPost =
        listing.feedPost === true ||
        listing.feed_post === true ||
        listing.feed_post === 'true' ||
        listing.feed_post === 't';
      if (Number.isFinite(rawCat) && rawCat > 0) {
        setSelectedCategory(String(rawCat));
        if (isFeedPost) {
          handleSidebarFilterChange(
            String(rawCat),
            tikTokPostsSidebarFilterForCategory(rawCat),
          );
        }
      }
      setTikTokProfilePostsScope(null);
      setTikTokFocusListingId(listingId);
      setTikTokUserSearchOpenTrigger(0);
      setTikTokReturnScreen(returnScreen);
      setTikTokFeedRefreshKey(k => k + 1);
      setCurrentScreen(screenName.tikTokFeed);
    },
    [handleSidebarFilterChange],
  );

  const CHAT_LAST_OPENED_KEY = 'pi_chat_last_opened';
  // Per-user key (id or email) so every new user sees "1 unread" until they open Pi welcome once
  const piWelcomeReadKey = user => {
    const id = user?.id != null ? String(user.id).trim() : '';
    const email =
      user?.email != null ? String(user.email).trim().toLowerCase() : '';
    return `pi_welcome_read_${id || email || 'anon'}`;
  };

  const handleOnboardingComplete = useCallback(async () => {
    try {
      await markOnboardingCompleted();
    } catch (_) {}
    setShowOnboarding(false);
    // After onboarding, gate the app behind terms acceptance (unless already accepted).
    try {
      const accepted = await hasAcceptedTerms();
      setShowTermsGate(!accepted);
    } catch (_) {
      setShowTermsGate(true);
    }
  }, []);

  const handleTermsAccepted = useCallback(async () => {
    try {
      await markTermsAccepted();
    } catch (_) {}
    setShowTermsGate(false);
  }, []);

  // Load user data, onboarding flag, and last-opened-chat from AsyncStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const [savedUser, onboardingDone, termsAccepted] = await Promise.all([
          getCurrentUserFromStorage(),
          hasCompletedOnboarding(),
          hasAcceptedTerms(),
        ]);

        if (savedUser) {
          const user = savedUser;
          setCurrentUser(user);
          setCurrentScreen(screenName.home);
          const last = await AsyncStorage.getItem(CHAT_LAST_OPENED_KEY);
          if (last) lastOpenedChatAtRef.current = last;
          const read = await AsyncStorage.getItem(piWelcomeReadKey(user));
          setPiWelcomeRead(read === 'true');
        } else {
          setCurrentScreen(screenName.home);
        }

        setShowOnboarding(!onboardingDone);
        // Onboarding already done previously but terms not yet accepted → show the gate.
        setShowTermsGate(onboardingDone && !termsAccepted);
        setShowSplashIntro(true);
        // setShowSplashIntro(onboardingDone && termsAccepted);
        setHomeIntroReady(false);
      } catch (error) {
        setCurrentScreen(screenName.home);
        setShowOnboarding(true);
        setShowSplashIntro(false);
      } finally {
        setAppBootstrapDone(true);
      }
    };

    loadUser();
  }, []);

  // When current user changes, load Pi welcome read flag for this user (by id or email)
  useEffect(() => {
    if (!currentUser) {
      setPiWelcomeRead(false);
      return;
    }
    AsyncStorage.getItem(piWelcomeReadKey(currentUser))
      .then(read => {
        setPiWelcomeRead(read === 'true');
      })
      .catch(() => {});
  }, [currentUser?.id, currentUser?.email]);

  const refreshUnreadChatCount = useCallback(async () => {
    const email = currentUser?.email
      ? String(currentUser.email).trim().toLowerCase()
      : null;
    if (!email) {
      setUnreadChatCount(0);
      return;
    }
    const after = lastOpenedChatAtRef.current || undefined;
    try {
      const {count} = await getChatUnreadCount(email, after);
      setUnreadChatCount(typeof count === 'number' ? count : 0);
    } catch {
      // keep previous count on transient failures
    }
  }, [currentUser?.email]);

  // Poll unread count while logged in so the PiChat badge stays current without opening Settings
  useEffect(() => {
    if (!currentUser?.email) {
      setUnreadChatCount(0);
      return undefined;
    }
    refreshUnreadChatCount();
    const intervalId = setInterval(refreshUnreadChatCount, 25000);
    return () => clearInterval(intervalId);
  }, [currentUser?.email, refreshUnreadChatCount]);

  // After sending a message or closing chat, refetch badge immediately
  useEffect(() => {
    if (!currentUser?.email || chatListRefreshKey === 0) return;
    refreshUnreadChatCount();
  }, [chatListRefreshKey, currentUser?.email, refreshUnreadChatCount]);

  // Refresh when opening Settings so the count is correct as soon as the screen appears
  useEffect(() => {
    if (currentScreen !== screenName.settings || !currentUser?.email) return;
    refreshUnreadChatCount();
  }, [currentScreen, currentUser?.email, refreshUnreadChatCount]);

  // When returning to the app (mobile), sync unread count
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active' && currentUser?.email) refreshUnreadChatCount();
    });
    return () => sub.remove();
  }, [currentUser?.email, refreshUnreadChatCount]);

  // Persist session to secure, encrypted storage (Keychain/Keystore) whenever it changes.
  useEffect(() => {
    const saveUser = async () => {
      if (currentUser) {
        try {
          await setCurrentUserStorage(currentUser);
        } catch (error) {}
      } else {
        try {
          await clearCurrentUserStorage();
        } catch (error) {}
      }
    };

    saveUser();
  }, [currentUser]);

  // Selected bottom filters persist across leaving/returning TikTok — just
  // track the previous screen (no longer reset on re-entry).
  useEffect(() => {
    lastScreenRef.current = currentScreen;
  }, [currentScreen]);

  const openUserProfileForSubscription = useCallback(
    async (sid, meta = {}, returnScreen = screenName.home) => {
      const subscriptionId = String(sid || '').trim();
      if (!subscriptionId) return;
      const row = {
        id: subscriptionId,
        name: meta.name || meta.display_name || '',
        image_url: meta.image_url || meta.profile_image_url || null,
      };
      setProfileReturnScreen(returnScreen);
      try {
        const res = await getListings({
          status: 'published',
          subscription_id: subscriptionId,
        });
        const list = Array.isArray(res?.listings) ? res.listings : [];
        const top = pickTopViewedListingForProfile(list, {preferAds: true});
        if (top) {
          const merged = mergeHubRowIntoListingPayload(row, top);
          const enriched = enrichListingForUserProfile(merged);
          setProfileUser({
            ...enriched,
            _fromTikTokPost: true,
            _forceListingAdProfile: !isPostListingRecord(enriched),
          });
        } else {
          setProfileUser({
            subscription_id: subscriptionId,
            owner_id: subscriptionId,
            creator_name: row.name,
            name: row.name,
            creator_email: null,
            creator_profile_image_url: row.image_url || null,
            profile_picture_url: row.image_url || null,
            profileImageUrl: row.image_url || null,
            _fromTikTokPost: true,
          });
        }
        setCurrentScreen(screenName.userProfile);
      } catch (e) {
        Alert.alert('', e?.message || 'שגיאה בטעינת הפרופיל');
      }
    },
    [],
  );

  const openUserProfileFromFollowHubRow = useCallback(
    async row => {
      if (!row?.id || row.is_self) return;
      await openUserProfileForSubscription(row.id, row, screenName.home);
    },
    [openUserProfileForSubscription],
  );

  const openUserProfileFromStoryRing = useCallback(
    async ring => {
      if (!ring?.subscription_id) return;
      await openUserProfileForSubscription(
        ring.subscription_id,
        {
          display_name: ring.display_name,
          profile_image_url: ring.profile_image_url,
        },
        screenName.home,
      );
    },
    [openUserProfileForSubscription],
  );

  const openUserProfileFromChatPeer = useCallback(
    async (peer = {}) => {
      const refRaw = peer?.userRef != null ? String(peer.userRef).trim() : '';
      const emailRaw =
        peer?.email != null
          ? String(peer.email).trim().toLowerCase()
          : refRaw.includes('@')
            ? refRaw.toLowerCase()
            : '';
      const meta = {
        name: peer?.name || '',
        display_name: peer?.name || '',
        image_url: peer?.profileImageUrl || null,
        profile_image_url: peer?.profileImageUrl || null,
      };
      let sid = toSubscriptionId(refRaw);
      if (!sid && emailRaw) {
        try {
          const res = await getCurrentUser(emailRaw);
          sid = toSubscriptionId(res?.subscription?.id);
        } catch (_) {}
      }
      if (!sid) {
        Alert.alert('', 'לא ניתן לפתוח פרופיל');
        return;
      }
      await openUserProfileForSubscription(sid, meta, screenName.chat);
    },
    [openUserProfileForSubscription],
  );

  const mergeListingWithProfileContext = useCallback(
    (listing, base, extras = {}) => {
      return {
        ...listing,
        ...extras,
        subscription_id:
          listing.subscription_id ||
          listing.owner_id ||
          base?.subscription_id ||
          base?.owner_id,
        owner_id:
          listing.owner_id ||
          listing.subscription_id ||
          base?.owner_id ||
          base?.subscription_id,
        creator_name:
          listing.creator_name ||
          base?.creator_name ||
          base?.name ||
          base?.business_name ||
          base?.broker_office_name,
        creator_email:
          listing.creator_email || base?.creator_email || base?.email,
        creator_profile_image_url:
          listing.creator_profile_image_url || getUserProfileImageUrl(base),
        company_logo_url:
          listing.company_logo_url || base?.company_logo_url || null,
        subscription_type:
          listing.subscription_type ||
          listing.creator_subscription_type ||
          base?.subscription_type,
      };
    },
    [],
  );

  const openListingAdProfile = useCallback(
    (listing, options = {}) => {
      const listingId = listing?.id != null ? String(listing.id).trim() : '';
      if (!listingId) return;

      const {
        returnScreen = screenName.userProfile,
        saveOverviewSnapshot = false,
        profileExtras = {},
      } = options;

      const base = profileUser;
      if (saveOverviewSnapshot && base && !isAdsListingRecord(base)) {
        setProfileOverviewSnapshot(base);
      }

      const merged = mergeListingWithProfileContext(
        listing,
        base,
        profileExtras,
      );
      setProfileReturnScreen(returnScreen);
      setProfileListingFocusKey(listingId);
      setProfileUser(enrichListingForUserProfile(merged));
      setCurrentScreen(screenName.userProfile);
    },
    [mergeListingWithProfileContext, profileUser],
  );

  const openTikTokFromHome = useCallback(async category => {
    setSelectedCategory(category);
    const catNum =
      category != null ? parseInt(String(category), 10) : NaN;
    if (Number.isFinite(catNum) && catNum > 0) {
      setHomeCarouselCategoryId(catNum);
    }
    setTikTokUserSearchOpenTrigger(0);
    setTikTokFocusListingId(null);
    setTikTokReturnScreen(screenName.home);
    try {
      await AsyncStorage.setItem(
        TIKTOK_TOP_BAR_FILTER_STORAGE_KEY,
        DEFAULT_TIKTOK_TOP_FILTER,
      );
    } catch (_) {}
    setCurrentScreen(screenName.tikTokFeed);
  }, []);

  const handleEditPublishCategoryChange = useCallback(categoryId => {
    const catNum =
      categoryId != null ? parseInt(String(categoryId), 10) : NaN;
    if (Number.isFinite(catNum) && catNum > 0) {
      setEditPublishSourceCategory(catNum);
    }
  }, []);

  const openCompanyReportFromProfile = useCallback(
    (forcedSubjectType = null) => {
      const u = profileUser;
      const sid = u?.subscription_id || u?.owner_id;
      if (!sid) {
        Alert.alert('', 'לא ניתן לשלוח דיווח');
        return;
      }
      const st = String(u?.subscription_type || '').toLowerCase();
      const isCompany = st === 'company';
      const isBroker = st === 'broker';
      const isProfessional = st === 'professional';
      // BnB ad profiles open the dedicated drawer for any host account type.
      if (
        forcedSubjectType !== 'bnb' &&
        !isCompany &&
        !isProfessional &&
        !isBroker
      ) {
        Alert.alert('', 'דיווח זה אינו זמין');
        return;
      }
      const displayName = String(
        u?.creator_name ||
          u?.business_name ||
          u?.name ||
          u?.display_name ||
          u?.agent_name ||
          '',
      ).trim();
      setCompanyReportPayload({
        reportedSubscriptionId: String(sid),
        reportedListingId: u?.id != null ? String(u.id) : null,
        companyDisplayName: displayName,
        reportSubjectType:
          forcedSubjectType === 'bnb'
            ? 'bnb'
            : isCompany
              ? 'company'
              : isBroker
                ? 'broker'
                : 'professional',
      });
      setShowCompanyReportSuccess(false);
      setCurrentScreen(screenName.companyReport);
    },
    [profileUser],
  );

  const openProfileReviewsFromProfile = useCallback(list => {
    setProfileReviewsList(Array.isArray(list) ? list : []);
    setCurrentScreen(screenName.profileReviews);
  }, []);

  const closeProfileReviewsList = useCallback(() => {
    setProfileReviewsList(null);
    setCurrentScreen(screenName.userProfile);
  }, []);

  if (!fontsLoaded || !appBootstrapDone) {
    return <AppBootLoading />;
  }

  const presenceUserEmail =
    currentUser?.email != null && String(currentUser.email).trim() !== ''
      ? String(currentUser.email).trim().toLowerCase()
      : null;

  const keepTikTokFeedMounted =
    currentScreen === screenName.tikTokFeed ||
    (profileReturnScreen === screenName.tikTokFeed &&
      TIKTOK_PROFILE_STACK_SCREENS.has(currentScreen));

  return (
    <ContextHook.Provider value={{currentUser, setCurrentUser}}>
      <PresenceProvider userEmail={presenceUserEmail}>
        <SafeAreaProvider>
          <View style={[styles.container, forceRtlStyle]}>
            <OfflineBanner />
            {/* Dev build indicator – timestamp updates when bundle rebuilds; if it changes after refresh, new code loaded */}
            {__DEV__ && typeof window !== 'undefined' && (
              <View
                style={{
                  position: 'absolute',
                  bottom: 4,
                  left: 4,
                  zIndex: 9999,
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}>
                <Text style={{color: '#2DD4BF', fontSize: 10}}>
                  load {Date.now()}
                </Text>
              </View>
            )}
            {(currentScreen === screenName.home ||
              currentScreen === screenName.tikTokFeed) && (
              <View
                style={[
                  styles.homeShell,
                  currentScreen === screenName.tikTokFeed &&
                    styles.homeShellCached,
                ]}
                pointerEvents={
                  currentScreen === screenName.home ? 'auto' : 'none'
                }>
                <Home
                  isScreenActive={currentScreen === screenName.home}
                  eagerLoad={
                    showSplashIntro && !showOnboarding && !showTermsGate
                  }
                  onInitialContentReady={() => setHomeIntroReady(true)}
                  showIntroModal={
                    !hasShownHomeIntro && !showOnboarding && !showTermsGate
                  }
                  onIntroModalShown={() => setHasShownHomeIntro(true)}
                  carouselCategoryId={homeCarouselCategoryId}
                  onOpenSelectedProjects={() =>
                    setCurrentScreen(screenName.selectedProjects)
                  }
                  onOpenProfessionalsDirectory={() =>
                    setCurrentScreen(screenName.professionalsDirectory)
                  }
                  onOpenSettings={() => setCurrentScreen(screenName.settings)}
                  onOpenTikTokFeed={openTikTokFromHome}
                  onComplete={() => {
                    setShowSplashIntro(false);
                    setHomeIntroReady(false);
                  }}
                  onOpenUserProfile={listing => {
                    // Opened from Pi AI results — remember to reopen the search
                    // (and restore its results) when we come back to home.
                    setProfileReturnScreen(screenName.home);
                    setPiAiReopen(true);
                    setProfileUser(listing);
                    setCurrentScreen(screenName.userProfile);
                  }}
                  onOpenFeatureListing={listing => {
                    openListingAdProfile(listing, {
                      returnScreen: screenName.home,
                      profileExtras: {
                        _fromTikTokPost: true,
                        _fromHomeFeatureProject: true,
                        _forceListingAdProfile: true,
                      },
                    });
                  }}
                  onOpenStoryProfile={openUserProfileFromStoryRing}
                  reopenAi={piAiReopen}
                  aiSnapshot={piAiReopen ? piAiSnapshot : null}
                  onAiReopenConsumed={() => setPiAiReopen(false)}
                  onAiSnapshotChange={setPiAiSnapshot}
                  unreadChatCount={
                    currentUser ? unreadChatCount + (piWelcomeRead ? 0 : 1) : 0
                  }
                />
                {/* {currentScreen === screenName.home &&
                showSplashIntro &&
                !showOnboarding &&
                !showTermsGate ? (
                  <SplashHomeIntroOverlay
                    readyToDismiss={homeIntroReady}
                    onComplete={() => {
                      setShowSplashIntro(false);
                      setHomeIntroReady(false);
                    }}
                    onOpenSettings={() => setCurrentScreen(screenName.settings)}
                    onOpenTikTokFeed={async category => {
                      setSelectedCategory(category);
                      // Favorites "open user search" bumps tikTokUserSearchOpenTrigger; if we only reset
                      // on unmount, that value stays >0 and the next feed mount runs the effect that opens
                      // the search panel. Home category buttons must always land on default feed (pics), not
                      // search or favorites.
                      setTikTokUserSearchOpenTrigger(0);
                      setTikTokFocusListingId(null);
                      setTikTokReturnScreen(screenName.home);
                      try {
                        await AsyncStorage.setItem(
                          TIKTOK_TOP_BAR_FILTER_STORAGE_KEY,
                          DEFAULT_TIKTOK_TOP_FILTER,
                        );
                      } catch (_) {}
                      setCurrentScreen(screenName.tikTokFeed);
                    }}
                    onOpenUserProfile={listing => {
                      // Opened from Pi AI results — remember to reopen the search
                      // (and restore its results) when we come back to home.
                      setProfileReturnScreen(screenName.home);
                      setPiAiReopen(true);
                      setProfileUser(listing);
                      setCurrentScreen(screenName.userProfile);
                    }}
                    onOpenFeatureListing={listing => {
                      openListingAdProfile(listing, {
                        returnScreen: screenName.home,
                        profileExtras: {
                          _fromTikTokPost: true,
                          _fromHomeFeatureProject: true,
                          _forceListingAdProfile: true,
                        },
                      });
                    }}
                    onOpenStoryProfile={openUserProfileFromStoryRing}
                    reopenAi={piAiReopen}
                    aiSnapshot={piAiReopen ? piAiSnapshot : null}
                    onAiReopenConsumed={() => setPiAiReopen(false)}
                    onAiSnapshotChange={setPiAiSnapshot}
                    unreadChatCount={
                      currentUser
                        ? unreadChatCount + (piWelcomeRead ? 0 : 1)
                        : 0
                    }
                  />
                ) : null} */}
              </View>
            )}
            {keepTikTokFeedMounted && (
              <View
                style={[
                  styles.tikTokShell,
                  currentScreen !== screenName.tikTokFeed &&
                    styles.tikTokShellCached,
                ]}
                pointerEvents={
                  currentScreen === screenName.tikTokFeed ? 'auto' : 'none'
                }>
                <TikTokFeedScreen
                  key={tikTokFeedRefreshKey} // Force remount when refreshKey changes
                  isScreenActive={currentScreen === screenName.tikTokFeed}
                  onClose={() => {
                    setBnbPublishHostType(null);
                    const catNum =
                      selectedCategory != null
                        ? parseInt(String(selectedCategory), 10)
                        : NaN;
                    if (Number.isFinite(catNum) && catNum > 0) {
                      setHomeCarouselCategoryId(catNum);
                    }
                    // Keep the selected bottom filters so they persist when the
                    // user leaves TikTok and comes back.
                    setTikTokUserSearchOpenTrigger(0);
                    setTikTokFocusListingId(null);
                    setTikTokProfilePostsScope(null);
                    const returnTo = tikTokReturnScreen;
                    setTikTokReturnScreen(screenName.home);
                    // goBack pops this feed off history — setCurrentScreen(returnTo)
                    // left tikTokFeed on the stack and caused profile ↔ post loops.
                    goBack(returnTo);
                  }}
                  onOpenOfficeListing={(category, opts) => {
                    if (category) setSelectedCategory(category);
                    setBnbPublishHostType(opts?.bnbHostType ?? null);
                    setEditingListing(null);
                    if (!currentUser) {
                      setReturnToScreenAfterAuth('tikTokFeed');
                      setCurrentScreen(screenName.userRegistration);
                    } else {
                      setAdsFormReturnScreen(screenName.tikTokFeed);
                      setCurrentScreen(screenName.adsForm);
                    }
                  }}
                  onOpenEditPublishAdWithCategory={(category, opts) => {
                    if (!currentUser) {
                      setReturnToScreenAfterAuth('tikTokFeed');
                      setCurrentScreen(screenName.userRegistration);
                      return;
                    }
                    if (category != null) setSelectedCategory(String(category));
                    setEditPublishSourceCategory(
                      category != null ? Number(category) : null,
                    );
                    setEditPublishRestoreStrip(true);
                    setBnbPublishHostType(opts?.bnbHostType ?? null);
                    setCurrentScreen(screenName.editPublishAd);
                  }}
                  onOpenPostEditor={arg => {
                    if (!currentUser) {
                      setReturnToScreenAfterAuth('tikTokFeed');
                      setCurrentScreen(screenName.userRegistration);
                      return;
                    }
                    const categoryRaw =
                      typeof arg === 'object' && arg != null
                        ? arg.category
                        : arg;
                    const openHouse =
                      typeof arg === 'object' && arg != null && arg.openHouse === true;
                    const raw =
                      categoryRaw != null && String(categoryRaw).trim() !== ''
                        ? parseInt(String(categoryRaw).trim(), 10)
                        : NaN;
                    const listingCat =
                      Number.isFinite(raw) && raw > 0 ? raw : null;
                    if (listingCat != null) {
                      setSelectedCategory(String(listingCat));
                    }
                    setPostEditorConfig({
                      publishTarget: 'post',
                      returnScreen: screenName.tikTokFeed,
                      listingCategoryId: listingCat,
                      editingListing: null,
                      postDescriptionLabel: openHouse
                        ? OPEN_HOUSE_POST_DESCRIPTION
                        : DEFAULT_POST_DESCRIPTION,
                    });
                    setCurrentScreen(screenName.postEditor);
                  }}
                  onOpenCityFilter={() => {
                    setScreenAfterFilter(screenName.tikTokFeed);
                    setCurrentScreen(screenName.cityFilter);
                  }}
                  onOpenApartmentTypeFilter={() => {
                    setScreenAfterFilter(screenName.tikTokFeed);
                    setCurrentScreen(screenName.apartmentTypeFilter);
                  }}
                  onOpenTypeFilter={() => {
                    setScreenAfterFilter(screenName.tikTokFeed);
                    setCurrentScreen(screenName.typeFilter);
                  }}
                  onOpenOfficeFilter={() => {
                    setScreenAfterFilter(screenName.tikTokFeed);
                    setCurrentScreen(screenName.officeFilter);
                  }}
                  onOpenRoomsFilter={() => {
                    setScreenAfterFilter(screenName.tikTokFeed);
                    setCurrentScreen(screenName.roomsFilter);
                  }}
                  onOpenMeterFilter={() => {
                    setScreenAfterFilter(screenName.tikTokFeed);
                    setCurrentScreen(screenName.meterFilter);
                  }}
                  onOpenDonamFilter={() => {
                    setScreenAfterFilter(screenName.tikTokFeed);
                    setCurrentScreen(screenName.donamFilter);
                  }}
                  onOpenPreferencesFilter={() => {
                    setScreenAfterFilter(screenName.tikTokFeed);
                    setCurrentScreen(screenName.preferencesFilter);
                  }}
                  onOpenPriceFilter={() => {
                    setScreenAfterFilter(screenName.tikTokFeed);
                    setCurrentScreen(screenName.priceFilter);
                  }}
                  onOpenUserProfile={user => {
                    setProfileReturnScreen(screenName.tikTokFeed);
                    // Clear App-level trigger so remounting the feed after profile back does not run
                    // TikTokFeedScreen's userSearchOpenTrigger effect (e.g. after Favorites→feed search).
                    // Without this, back from profile wrongly reopens the user-search panel instead of the feed you had.
                    setTikTokUserSearchOpenTrigger(0);
                    if (!user || typeof user !== 'object') {
                      setProfileListingFocusKey('');
                      setProfileUser(user);
                      setCurrentScreen(screenName.userProfile);
                      return;
                    }
                    const payload = {...user, _fromTikTokPost: true};
                    const isFeedPost =
                      payload.feed_post === true ||
                      payload.isPostEntry === true ||
                      String(
                        payload.propertyTypeRaw || payload.propertyType || '',
                      ).toLowerCase() === 'post';
                    if (isAdsListingRecord(payload) && !isFeedPost) {
                      openListingAdProfile(payload, {
                        returnScreen: screenName.tikTokFeed,
                        profileExtras: {_fromTikTokPost: true},
                      });
                      return;
                    }
                    setProfileListingFocusKey('');
                    setProfileUser(enrichListingForUserProfile(payload));
                    setCurrentScreen(screenName.userProfile);
                  }}
                  onOpenFavorites={categoryFromFeed => {
                    if (!currentUser) {
                      setReturnToScreenAfterAuth('tikTokFeed');
                      setCurrentScreen(screenName.userRegistration);
                      return;
                    }
                    setFavoritesReturnScreen(screenName.tikTokFeed);
                    const n =
                      categoryFromFeed != null &&
                      String(categoryFromFeed).trim() !== ''
                        ? parseInt(String(categoryFromFeed), 10)
                        : NaN;
                    setFavoritesCategoryFilter(
                      !Number.isNaN(n) && n > 0 ? n : null,
                    );
                    setCurrentScreen(screenName.favorites);
                  }}
                  onShareToConversation={(conv, post) => {
                    if (!conv || !post) return;
                    // Feed posts are not ads — never attach as sharedListing or
                    // the chat will show בלעדיות / שת״פ offer CTAs.
                    setSharedListingForChat(
                      isFeedPostListingRecord(post) ? null : post,
                    );
                    setSelectedConversation({
                      id: conv.otherUserEmail || conv.id || null,
                      conversationId: conv.conversationId || conv.id || null,
                      otherUserEmail: conv.otherUserEmail || null,
                      isGroup: conv.isGroup === true,
                      name: conv.name || 'משתמש',
                      preview: conv.preview || '',
                      time: conv.time || '',
                      profileImageUrl: conv.profileImageUrl || null,
                      listingId: conv.listingId || null,
                      listingCategoryLabel: conv.listingCategoryLabel || null,
                    });
                    setChatReturnScreen(screenName.tikTokFeed);
                    setCurrentScreen(screenName.chat);
                  }}
                  onOpenUserRegistration={() => {
                    setReturnToScreenAfterAuth('tikTokFeed');
                    setCurrentScreen(screenName.userRegistration);
                  }}
                  onOpenCompanyRegistration={() => {
                    setReturnToScreenAfterAuth('tikTokFeed');
                    setCurrentScreen(screenName.subscriptionCompany);
                  }}
                  uploadedListings={uploadedListings}
                  selectedCategory={selectedCategory}
                  feedFilters={feedFilters}
                  selectedSidebarFilter={
                    selectedCategory != null
                      ? (sidebarFiltersByCategory[String(selectedCategory)] ??
                        null)
                      : null
                  }
                  onSidebarFilterChange={filterId =>
                    handleSidebarFilterChange(selectedCategory, filterId)
                  }
                  currentUser={currentUser}
                  userSearchOpenTrigger={tikTokUserSearchOpenTrigger}
                  onUserSearchBackToDefaultFeed={() =>
                    setTikTokUserSearchOpenTrigger(0)
                  }
                  focusListingId={tikTokFocusListingId}
                  onFocusListingConsumed={() => setTikTokFocusListingId(null)}
                  profilePostsScope={tikTokProfilePostsScope}
                  onOpenPostInFeed={listing => {
                    if (!listing?.id) return;
                    openListingInTikTokFeed(listing, {
                      returnScreen: screenName.tikTokFeed,
                    });
                  }}
                />
              </View>
            )}
            {currentScreen === screenName.selectedProjects && (
              <SelectedProjectsScreen
                onClose={() => setCurrentScreen(screenName.home)}
                onOpenCompany={company => {
                  setCompanyProjectsContext({
                    id: company.id,
                    name: company.name,
                    logo_url: company.logo_url || null,
                  });
                  setCompanyProjectsReturnScreen(screenName.selectedProjects);
                  setCurrentScreen(screenName.companyProjects);
                }}
              />
            )}
            {currentScreen === screenName.professionalsDirectory && (
              <ProfessionalsDirectoryScreen
                currentUser={currentUser}
                onClose={() => setCurrentScreen(screenName.home)}
                onOpenProfessional={professional => {
                  const subType = String(
                    professional?.subscription_type || '',
                  )
                    .trim()
                    .toLowerCase();
                  setProfileReturnScreen(screenName.professionalsDirectory);
                  setProfileUser({
                    ...professional,
                    _fromProfessionalsDirectory: true,
                    _forceListingAdProfile: false,
                    subscription_id: professional?.id || null,
                    owner_id: professional?.id || null,
                    creator_name:
                      professional?.display_name || professional?.name || null,
                    creator_profile_image_url:
                      professional?.profile_image_url || null,
                    profile_picture_url:
                      professional?.profile_image_url || null,
                    // Brokers from this directory must stay brokers (מתווך + אזורי פעילות).
                    subscription_type:
                      subType === 'broker'
                        ? subscriptionTypes.broker
                        : subscriptionTypes.professional,
                    activity_regions:
                      professional?.activity_regions ||
                      (subType === 'broker'
                        ? professional?.specializations
                        : null),
                  });
                  setCurrentScreen(screenName.userProfile);
                }}
                onMessageProfessional={professional => {
                  const mySubId = toSubscriptionId(
                    currentUser?.id ||
                      currentUser?.subscription_id ||
                      currentUser?.owner_id,
                  );
                  const theirSubId = toSubscriptionId(
                    professional?.id ||
                      professional?.subscription_id ||
                      professional?.owner_id,
                  );
                  const myEmail = String(currentUser?.email || '')
                    .trim()
                    .toLowerCase();
                  const theirEmail = String(
                    professional?.email || professional?.creator_email || '',
                  )
                    .trim()
                    .toLowerCase();
                  const isOwn =
                    !!mySubId &&
                    !!theirSubId &&
                    mySubId === theirSubId &&
                    (!myEmail || !theirEmail || myEmail === theirEmail);
                  if (isOwn) return;

                  const u = {
                    ...professional,
                    creator_name:
                      professional?.display_name || professional?.name || null,
                    creator_profile_image_url:
                      professional?.profile_image_url || null,
                    profile_picture_url:
                      professional?.profile_image_url || null,
                    subscription_id: professional?.id || null,
                    owner_id: professional?.id || null,
                    subscription_type: subscriptionTypes.professional,
                  };
                  const displayName =
                    u?.creator_name ||
                    u?.display_name ||
                    u?.name ||
                    u?.agent_name ||
                    u?.contact_person_name ||
                    u?.business_name ||
                    u?.broker_office_name ||
                    'משתמש';
                  const otherEmail =
                    (u?.creator_email || u?.email || '').trim().toLowerCase() ||
                    null;
                  const otherPeerRef =
                    otherEmail ||
                    (u?.subscription_id != null
                      ? String(u.subscription_id).trim().toLowerCase()
                      : null) ||
                    (u?.id != null ? String(u.id).trim().toLowerCase() : null);
                  const fromFeedListing = isAdsListingRecord(u);
                  const listingId = fromFeedListing
                    ? String(u.id).trim()
                    : null;
                  const listingCategoryLabel = fromFeedListing
                    ? getChatListingCategoryLabel(u?.category)
                    : null;
                  const conversation = {
                    id: otherPeerRef || 'profile',
                    otherUserEmail: otherPeerRef,
                    name: displayName,
                    preview: '',
                    time: '',
                    profileImageUrl: getUserProfileImageUrl(u),
                    subscription_type:
                      u?.subscription_type ||
                      u?.subscriptionType ||
                      subscriptionTypes.professional,
                    subscriptionType:
                      u?.subscription_type ||
                      u?.subscriptionType ||
                      subscriptionTypes.professional,
                    ...(listingId
                      ? {
                          listingId,
                          listingCategoryLabel: listingCategoryLabel || null,
                        }
                      : {}),
                  };
                  setSharedListingForChat(fromFeedListing ? u : null);
                  setSelectedConversation(conversation);
                  setChatReturnScreen(screenName.professionalsDirectory);
                  setCurrentScreen(screenName.chat);
                }}
              />
            )}
            {currentScreen === screenName.professionalFlyer && (
              <ProfessionalFlyerScreen
                professional={profileUser}
                currentUser={currentUser}
                onClose={() =>
                  setCurrentScreen(screenName.professionalsDirectory)
                }
                onMessage={() => {
                  const u = profileUser;
                  const displayName =
                    u?.creator_name ||
                    u?.display_name ||
                    u?.name ||
                    u?.agent_name ||
                    u?.contact_person_name ||
                    u?.business_name ||
                    u?.broker_office_name ||
                    'משתמש';
                  const otherEmail =
                    (u?.creator_email || u?.email || '').trim().toLowerCase() ||
                    null;
                  const otherPeerRef =
                    otherEmail ||
                    (u?.subscription_id != null
                      ? String(u.subscription_id).trim().toLowerCase()
                      : null) ||
                    (u?.id != null ? String(u.id).trim().toLowerCase() : null);
                  const fromFeedListing = isAdsListingRecord(u);
                  const listingId = fromFeedListing
                    ? String(u.id).trim()
                    : null;
                  const listingCategoryLabel = fromFeedListing
                    ? getChatListingCategoryLabel(u?.category)
                    : null;
                  const conversation = {
                    id: otherPeerRef || 'profile',
                    otherUserEmail: otherPeerRef,
                    name: displayName,
                    preview: '',
                    time: '',
                    profileImageUrl: getUserProfileImageUrl(u),
                    subscription_type:
                      u?.subscription_type ||
                      u?.subscriptionType ||
                      subscriptionTypes.professional,
                    subscriptionType:
                      u?.subscription_type ||
                      u?.subscriptionType ||
                      subscriptionTypes.professional,
                    ...(listingId
                      ? {
                          listingId,
                          listingCategoryLabel: listingCategoryLabel || null,
                        }
                      : {}),
                  };
                  setSharedListingForChat(fromFeedListing ? u : null);
                  setSelectedConversation(conversation);
                  setChatReturnScreen(screenName.professionalFlyer);
                  setCurrentScreen(screenName.chat);
                }}
                onCall={phone => {
                  if (typeof alert !== 'undefined') {
                    alert(phone ? `פנייה בטלפון ${phone}` : 'אין מספר טלפון');
                  }
                }}
              />
            )}
            {currentScreen === screenName.companyProjects &&
              companyProjectsContext && (
                <CompanyProjectsScreen
                  companyId={companyProjectsContext.id}
                  companyName={companyProjectsContext.name}
                  onClose={() => {
                    const returnTo = companyProjectsReturnScreen;
                    setCompanyProjectsContext(null);
                    setCompanyProjectsReturnScreen(screenName.selectedProjects);
                    goBack(returnTo);
                  }}
                  onOpenListing={listing => {
                    const ctx = companyProjectsContext;
                    const fromListing =
                      listing.creator_profile_image_url ||
                      listing.company_logo_url ||
                      listing.profile_picture_url ||
                      listing.profile_image_url;
                    const companyPic =
                      (fromListing && String(fromListing).trim()) ||
                      (ctx?.logo_url && String(ctx.logo_url).trim()) ||
                      null;
                    openListingAdProfile(listing, {
                      returnScreen: screenName.companyProjects,
                      profileExtras: {
                        _fromCompanyProjects: true,
                        _forceListingAdProfile: true,
                        business_name:
                          listing.business_name || ctx?.name || null,
                        creator_name: listing.creator_name || ctx?.name || null,
                        creator_profile_image_url: companyPic,
                        company_logo_url:
                          listing.company_logo_url || ctx?.logo_url || null,
                        profile_picture_url:
                          listing.profile_picture_url || ctx?.logo_url || null,
                      },
                    });
                  }}
                />
              )}
            {currentScreen === screenName.userProfile && (
              <UserProfileScreen
                key={
                  profileListingFocusKey ||
                  String(
                    profileUser?.subscription_id ||
                      profileUser?.owner_id ||
                      profileUser?.id ||
                      'profile',
                  )
                }
                onClose={() => {
                  if (
                    profileOverviewSnapshot &&
                    isAdsListingRecord(profileUser)
                  ) {
                    setProfileUser(profileOverviewSnapshot);
                    setProfileOverviewSnapshot(null);
                    setProfileListingFocusKey('');
                    return;
                  }
                  setProfileOverviewSnapshot(null);
                  setProfileListingFocusKey('');
                  goBack(profileReturnScreen);
                }}
                onCall={phone => {
                  const u = profileUser;
                  const tel = String(
                    phone ||
                      u?.phone ||
                      u?.contact_details?.phone ||
                      u?.contact_details?.phones?.[0] ||
                      '',
                  ).trim();
                  if (!tel) {
                    Alert.alert('', 'אין מספר טלפון');
                    return;
                  }
                  const telUrl = `tel:${tel.replace(/[^\d+]/g, '')}`;
                  Linking.openURL(telUrl).catch(() => {
                    Alert.alert('', `פנייה בטלפון ${tel}`);
                  });
                }}
                onMessage={() => {
                  const u = profileUser;
                  const displayName =
                    u?.creator_name ||
                    u?.name ||
                    u?.agent_name ||
                    u?.contact_person_name ||
                    u?.business_name ||
                    u?.broker_office_name ||
                    'משתמש';
                  const otherEmail =
                    (u?.creator_email || u?.email || '').trim().toLowerCase() ||
                    null;
                  const otherPeerRef =
                    otherEmail ||
                    (u?.subscription_id != null
                      ? String(u.subscription_id).trim().toLowerCase()
                      : null) ||
                    (u?.id != null ? String(u.id).trim().toLowerCase() : null);
                  const fromFeedListing = isAdsListingRecord(u);
                  const listingId = fromFeedListing
                    ? String(u.id).trim()
                    : null;
                  const listingCategoryLabel = fromFeedListing
                    ? getChatListingCategoryLabel(u?.category)
                    : null;
                  const conversation = {
                    id: otherPeerRef || 'profile',
                    otherUserEmail: otherPeerRef,
                    name: displayName,
                    preview: '',
                    time: '',
                    profileImageUrl: getUserProfileImageUrl(u),
                    subscription_type:
                      u?.subscription_type || u?.subscriptionType || null,
                    subscriptionType:
                      u?.subscription_type || u?.subscriptionType || null,
                    ...(listingId
                      ? {
                          listingId,
                          listingCategoryLabel: listingCategoryLabel || null,
                        }
                      : {}),
                  };
                  setSharedListingForChat(fromFeedListing ? u : null);
                  setSelectedConversation(conversation);
                  setChatReturnScreen(screenName.userProfile);
                  setCurrentScreen(screenName.chat);
                }}
                user={profileUser}
                currentUser={currentUser}
                onOpenLogin={() => {
                  setReturnToScreenAfterAuth('userProfile');
                  setCurrentScreen(screenName.login);
                }}
                onOpenUserRegistration={() => {
                  setReturnToScreenAfterAuth('userProfile');
                  setCurrentScreen(screenName.userRegistration);
                }}
                onOpenAllListings={() =>
                  setCurrentScreen(screenName.userListings)
                }
                onOpenCompanyProjects={() => {
                  const sid = String(
                    profileUser?.subscription_id ||
                      profileUser?.owner_id ||
                      profileUser?.id ||
                      '',
                  ).trim();
                  if (!sid) return;
                  const name =
                    profileUser?.business_name ||
                    profileUser?.creator_name ||
                    profileUser?.name ||
                    '';
                  const logo =
                    profileUser?.company_logo_url ||
                    profileUser?.creator_profile_image_url ||
                    profileUser?.profile_picture_url ||
                    null;
                  setCompanyProjectsContext({
                    id: String(sid).trim(),
                    name,
                    logo_url: logo,
                  });
                  setCompanyProjectsReturnScreen(screenName.userProfile);
                  setCurrentScreen(screenName.companyProjects);
                }}
                onOpenFollowHub={tab => {
                  setFollowHubInitialTab(tab || 'followers');
                  setFollowHubReturnScreen(screenName.userProfile);
                  setCurrentScreen(screenName.followHub);
                }}
                onOpenCompanyReport={openCompanyReportFromProfile}
                onOpenAllReviews={openProfileReviewsFromProfile}
                onOpenPostInFeed={listing => {
                  if (!listing?.id) return;
                  const subId = String(
                    listing?.subscription_id ||
                      listing?.owner_id ||
                      profileUser?.subscription_id ||
                      profileUser?.owner_id ||
                      profileUser?.id ||
                      '',
                  ).trim();
                  if (!subId) return;
                  setTikTokProfilePostsScope({
                    subscriptionId: subId,
                    profileImageUrl: getUserProfileImageUrl(
                      profileUser || listing,
                    ),
                  });
                  setTikTokFocusListingId(String(listing.id).trim());
                  setTikTokUserSearchOpenTrigger(0);
                  setTikTokReturnScreen(screenName.userProfile);
                  setTikTokFeedRefreshKey(k => k + 1);
                  setCurrentScreen(screenName.tikTokFeed);
                }}
                onOpenListing={listing =>
                  openListingAdProfile(listing, {
                    returnScreen: screenName.userProfile,
                    saveOverviewSnapshot: true,
                  })
                }
              />
            )}
            {currentScreen === screenName.profileReviews &&
              profileReviewsList && (
                <ProfileReviewsScreen
                  reviews={profileReviewsList}
                  onClose={closeProfileReviewsList}
                />
              )}
            {currentScreen === screenName.companyReport &&
              companyReportPayload && (
                <CompanyReportScreen
                  reportedSubscriptionId={
                    companyReportPayload.reportedSubscriptionId
                  }
                  reportedListingId={companyReportPayload.reportedListingId}
                  companyDisplayName={companyReportPayload.companyDisplayName}
                  reportSubjectType={
                    companyReportPayload.reportSubjectType === 'broker'
                      ? 'broker'
                      : companyReportPayload.reportSubjectType === 'bnb'
                        ? 'bnb'
                        : companyReportPayload.reportSubjectType ===
                            'professional'
                          ? 'professional'
                          : 'company'
                  }
                  currentUser={currentUser}
                  onClose={() => {
                    setCompanyReportPayload(null);
                    setCurrentScreen(screenName.userProfile);
                  }}
                  onSubmittedSuccessfully={() => {
                    setCompanyReportPayload(null);
                    setCurrentScreen(screenName.userProfile);
                    setShowCompanyReportSuccess(true);
                  }}
                />
              )}
            <CompanyReportSuccessModal
              visible={showCompanyReportSuccess}
              onDismiss={() => setShowCompanyReportSuccess(false)}
            />
            <PublishSuccessToast
              visible={publishSuccessVisible}
              message={publishSuccessMessage}
              onDismiss={() => setPublishSuccessVisible(false)}
            />
            {currentScreen === screenName.followHub && (
              <FollowHubScreen
                onClose={() => goBack(followHubReturnScreen)}
                currentUser={currentUser}
                profileUser={profileUser}
                initialTab={followHubInitialTab}
                onOpenUserProfile={openUserProfileFromFollowHubRow}
              />
            )}
            {currentScreen === screenName.userListings && (
              <UserListingsScreen
                creatorId={
                  profileUser?.subscription_id || profileUser?.owner_id
                }
                displayName={
                  profileUser?.creator_name ||
                  profileUser?.name ||
                  profileUser?.agent_name ||
                  profileUser?.business_name ||
                  ''
                }
                onClose={() => goBack(screenName.userProfile)}
                onOpenListing={listing =>
                  openListingAdProfile(listing, {
                    returnScreen: screenName.userListings,
                  })
                }
              />
            )}
            {currentScreen === screenName.cityFilter && (
              <CityFilterScreen
                initialFilter={feedFilters.city}
                selectedCategory={selectedCategory}
                onClose={() => goBack(screenAfterFilter)}
                onSave={filter => {
                  setFeedFilters(prev => ({
                    ...prev,
                    city: normalizeCityFeedFilter(filter),
                  }));
                  // Navigation is via onClose — filter screens call both; a
                  // second goBack here would skip TikTok and land on Home.
                }}
              />
            )}
            {currentScreen === screenName.apartmentTypeFilter && (
              <ApartmentTypeFilterScreen
                initialFilter={feedFilters.apartmentType}
                selectedCategory={selectedCategory}
                onClose={() => goBack(screenAfterFilter)}
                onSave={filter => {
                  const raw = filter?.apartmentType;
                  const next =
                    raw == null ||
                    raw === '' ||
                    (Array.isArray(raw) && raw.length === 0)
                      ? null
                      : raw;
                  setFeedFilters(prev => ({...prev, apartmentType: next}));
                }}
              />
            )}
            {currentScreen === screenName.roomsFilter && (
              <RoomsFilterScreen
                initialFilter={feedFilters.rooms}
                selectedCategory={selectedCategory}
                onClose={() => goBack(screenAfterFilter)}
                onSave={filter => {
                  setFeedFilters(prev => ({
                    ...prev,
                    rooms: normalizeRoomsFeedFilter(filter),
                  }));
                }}
              />
            )}
            {currentScreen === screenName.priceFilter && (
              <PriceFilterScreen
                initialFilter={feedFilters.price}
                selectedCategory={selectedCategory}
                onClose={() => goBack(screenAfterFilter)}
                onSave={filter => {
                  setFeedFilterKey('price', filter);
                }}
              />
            )}
            {currentScreen === screenName.typeFilter && (
              <TypeFilterScreen
                initialFilter={feedFilters.type}
                selectedCategory={selectedCategory}
                onClose={() => goBack(screenAfterFilter)}
                onSave={filter => {
                  setFeedFilterKey('type', filter?.type ?? null);
                }}
              />
            )}
            {currentScreen === screenName.officeFilter && (
              <OfficeFilterScreen
                initialFilter={(() => {
                  const o = feedFilters.office;
                  if (o != null && typeof o === 'object' && !Array.isArray(o)) {
                    return {
                      minArea: 50,
                      minRooms: 2,
                      wholeFloor: false,
                      parking: false,
                      elevator: false,
                      mamad: false,
                      ...o,
                      minArea:
                        o.minArea != null
                          ? o.minArea
                          : feedFilters.meter != null
                            ? Number(feedFilters.meter)
                            : (o.minArea ?? 50),
                    };
                  }
                  if (feedFilters.meter != null) {
                    return {
                      minArea: Number(feedFilters.meter),
                      minRooms: 2,
                      wholeFloor: false,
                      parking: false,
                      elevator: false,
                      mamad: false,
                    };
                  }
                  return null;
                })()}
                onClose={() => goBack(screenAfterFilter)}
                onSave={filter => {
                  setFeedFilterKey('office', filter ?? null);
                  setFeedFilterKey('meter', null);
                }}
              />
            )}
            {currentScreen === screenName.meterFilter && (
              <MeterFilterScreen
                initialFilter={
                  feedFilters.meter != null ? {meter: feedFilters.meter} : null
                }
                onClose={() => goBack(screenAfterFilter)}
                onSave={filter => {
                  setFeedFilterKey('meter', filter?.meter ?? null);
                }}
              />
            )}
            {currentScreen === screenName.donamFilter && (
              <DonamFilterScreen
                initialFilter={feedFilters.donam}
                onClose={() => goBack(screenAfterFilter)}
                onSave={filter => {
                  setFeedFilterKey(
                    'donam',
                    filter &&
                      (filter.minDonam != null || filter.maxDonam != null)
                      ? filter
                      : null,
                  );
                }}
              />
            )}
            {currentScreen === screenName.preferencesFilter && (
              <PreferencesFilterScreen
                initialFilter={feedFilters.preferences}
                onClose={() => goBack(screenAfterFilter)}
                onSave={filter => {
                  setFeedFilterKey('preferences', filter ?? null);
                }}
              />
            )}
            {/** Keep AdsForm mounted while composing תמונה מכירתית so main image / draft fields aren't lost. */}
            {(currentScreen === screenName.adsForm ||
              (currentScreen === screenName.postEditor &&
                postEditorConfig.returnScreen === screenName.adsForm)) && (
              <View
                style={
                  currentScreen === screenName.adsForm
                    ? {flex: 1}
                    : {display: 'none'}
                }
                pointerEvents={
                  currentScreen === screenName.adsForm ? 'auto' : 'none'
                }
                collapsable={false}>
              <AdsForm
                initialCategory={selectedCategory}
                initialListing={editingListing}
                initialBnbHostType={editingListing ? null : bnbPublishHostType}
                pendingSalesImageFromEditor={adsFormPendingSalesImage}
                onPendingSalesImageConsumed={() =>
                  setAdsFormPendingSalesImage(null)
                }
                onOpenPostEditor={async arg => {
                  if (!currentUser) {
                    setReturnToScreenAfterAuth('adsForm');
                    setCurrentScreen(screenName.userRegistration);
                    return;
                  }
                  const categoryRaw =
                    typeof arg === 'object' && arg != null
                      ? arg.categoryId
                      : arg;
                  const n =
                    categoryRaw != null &&
                    String(categoryRaw).trim() !== ''
                      ? parseInt(String(categoryRaw).trim(), 10)
                      : NaN;
                  const listingCat = Number.isFinite(n) && n > 0 ? n : null;
                  const salesImageUrl =
                    typeof arg === 'object' && arg != null
                      ? arg.salesImageUrl
                      : null;
                  const salesEditorMeta =
                    typeof arg === 'object' && arg != null
                      ? arg.salesImageEditorMeta
                      : null;
                  const adListing =
                    typeof arg === 'object' && arg != null
                      ? arg.adListing
                      : null;
                  const trimmedSales =
                    salesImageUrl != null &&
                    String(salesImageUrl).trim() !== ''
                      ? String(salesImageUrl).trim()
                      : null;

                  let resolvedEditingListing = null;
                  if (trimmedSales) {
                    resolvedEditingListing =
                      await resolveSalesImageEditorListing({
                        salesImageUrl: trimmedSales,
                        subscriptionId: resolveSubscriptionId(currentUser),
                        editorMeta: salesEditorMeta,
                        adGeneralDetails: adListing?.general_details ?? null,
                      });
                  }

                  setPostEditorConfig({
                    publishTarget: 'story',
                    returnScreen: screenName.adsForm,
                    listingCategoryId: listingCat,
                    // Always defer story upload to ad Publish — so the story
                    // is created with the final sales image (incl. baked text).
                    skipStoryPublish: true,
                    editingListing: resolvedEditingListing,
                    postDescriptionLabel: DEFAULT_POST_DESCRIPTION,
                  });
                  if (listingCat != null) {
                    setSelectedCategory(String(listingCat));
                  }
                  setCurrentScreen(screenName.postEditor);
                }}
                onClose={() => {
                  setBnbPublishHostType(null);
                  setEditingListing(null);
                  goBack(adsFormReturnScreen);
                }}
                onPublish={listingData => {
                  const returnScreen = adsFormReturnScreen;
                  const categoryId =
                    listingData?.category != null
                      ? parseInt(String(listingData.category), 10)
                      : NaN;
                  const images = [];
                  if (listingData.mainImage) images.push(listingData.mainImage);
                  if (listingData.additionalImages?.length) {
                    images.push(...listingData.additionalImages);
                  }
                  finishPublishedListing({
                    returnScreen,
                    categoryId: Number.isFinite(categoryId) ? categoryId : null,
                    isUpdate: listingData?.isUpdate === true,
                    listingPreview: {
                      id: listingData.id,
                      category: listingData.category,
                      images,
                      price: listingData.price ?? listingData.budget,
                    },
                  });
                }}
              />
              </View>
            )}
            {currentScreen === screenName.postEditor && (
              <PostEditorScreen
                publishTarget={postEditorConfig.publishTarget}
                skipStoryPublish={postEditorConfig.skipStoryPublish === true}
                selectedCategory={selectedCategory}
                publishCategoryId={postEditorConfig.listingCategoryId}
                initialListing={postEditorConfig.editingListing}
                defaultPostDescription={postEditorConfig.postDescriptionLabel}
                currentUser={currentUser}
                onClose={() => {
                  setPostEditorConfig(prev => ({
                    ...prev,
                    editingListing: null,
                    skipStoryPublish: false,
                  }));
                  goBack(postEditorConfig.returnScreen);
                }}
                onPublish={payload => {
                  const returnScreen = postEditorConfig.returnScreen;

                  if (
                    returnScreen === screenName.adsForm &&
                    payload?.url &&
                    postEditorConfig.publishTarget === 'story'
                  ) {
                    // Story is always created on ad Publish (not here).
                    setAdsFormPendingSalesImage({
                      url: payload.url,
                      storyAlreadyCreated: false,
                      generalDetails: payload.generalDetails || null,
                      sourceImageUrl: payload.sourceImageUrl || null,
                    });
                    replaceCurrentScreen(screenName.adsForm);
                    return;
                  }

                  const categoryRaw =
                    payload?.category ?? postEditorConfig.listingCategoryId;
                  const categoryNum =
                    categoryRaw != null
                      ? parseInt(String(categoryRaw), 10)
                      : NaN;
                  const categoryId = Number.isFinite(categoryNum)
                    ? categoryNum
                    : null;

                  let listingPreview = null;
                  if (
                    returnScreen === screenName.editPublishAd &&
                    payload?.url &&
                    postEditorConfig.publishTarget === 'post' &&
                    !payload?.isEdit
                  ) {
                    listingPreview = {
                      id: payload.id,
                      category: categoryId ?? categoryRaw,
                      video_url: payload.isVideo ? payload.url : null,
                      images: payload.isVideo ? [] : [payload.url],
                      image: payload.isVideo ? null : payload.url,
                      description:
                        postEditorConfig.postDescriptionLabel ||
                        DEFAULT_POST_DESCRIPTION,
                      feed_post: true,
                      property_type: 'post',
                      general_details:
                        postEditorConfig.postDescriptionLabel ===
                        OPEN_HOUSE_POST_DESCRIPTION
                          ? {post_kind: OPEN_HOUSE_POST_KIND}
                          : payload?.generalDetails || null,
                    };
                  }

                  finishPublishedListing({
                    returnScreen,
                    categoryId,
                    listingPreview,
                  });
                }}
              />
            )}
            {currentScreen === screenName.officeListing && (
              <OfficeListingScreen
                initialCategory={selectedCategory} // Pass the selected category
                onClose={() => setCurrentScreen(screenName.tikTokFeed)}
                onPublish={async listingData => {
                  if (
                    listingData.category &&
                    listingData.category !== selectedCategory
                  ) {
                    setSelectedCategory(listingData.category.toString());
                  }
                  const images = [];
                  if (listingData.mainImage) images.push(listingData.mainImage);
                  if (listingData.additionalImages?.length)
                    images.push(...listingData.additionalImages);
                  setUploadedListings(prev => [
                    ...prev,
                    {
                      id: listingData.id,
                      category: listingData.category,
                      images,
                      price: listingData.price ?? listingData.budget,
                    },
                  ]);
                  setTimeout(
                    () => setTikTokFeedRefreshKey(prev => prev + 1),
                    1500,
                  );
                  setCurrentScreen(screenName.tikTokFeed);
                }}
              />
            )}
            {currentScreen === screenName.settings && (
              <SettingsScreen
                onClose={() => setCurrentScreen(screenName.home)}
                onOpenEditPublishAd={() => {
                  if (!currentUser) {
                    setReturnToScreenAfterAuth('settings');
                    setCurrentScreen(screenName.userRegistration);
                    return;
                  }
                  setBnbPublishHostType(null);
                  setEditPublishRestoreStrip(false);
                  setEditPublishSourceCategory(null);
                  setCurrentScreen(screenName.editPublishAd);
                }}
                onOpenChat={async () => {
                  if (!currentUser) {
                    setReturnToScreenAfterAuth('settings');
                    setCurrentScreen(screenName.userRegistration);
                    return;
                  }
                  setChatReturnScreen(screenName.settings);
                  setSharedListingForChat(null);
                  const now = new Date().toISOString();
                  lastOpenedChatAtRef.current = now;
                  try {
                    await AsyncStorage.setItem(CHAT_LAST_OPENED_KEY, now);
                  } catch (_) {}
                  setUnreadChatCount(0);
                  setChatListRefreshKey(k => k + 1);
                  setCurrentScreen(screenName.chatList);
                }}
                unreadChatCount={
                  currentUser ? unreadChatCount + (piWelcomeRead ? 0 : 1) : 0
                }
                onOpenSubscription={type => {
                  if (type === subscriptionTypes.company) {
                    setCurrentScreen(screenName.subscriptionCompany);
                  } else if (type === subscriptionTypes.professional) {
                    setCurrentScreen(screenName.subscriptionProfessional);
                  } else if (type === subscriptionTypes.projectMarketer) {
                    setMarketerPlan(null);
                    setCurrentScreen(screenName.projectMarketerPlan);
                  } else {
                    setCurrentScreen(screenName.subscription);
                  }
                }}
                onOpenAgencyJoinCode={() =>
                  setCurrentScreen(screenName.agencyJoinCode)
                }
                onOpenAgencyMembers={() => {
                  setAgencyMember(null);
                  setCurrentScreen(screenName.agencyMembers);
                }}
                onLogout={() => setCurrentUser(null)}
                onEditProfile={() => {
                  if (!currentUser) {
                    setReturnToScreenAfterAuth('settings');
                    setCurrentScreen(screenName.userRegistration);
                    return;
                  }
                  setCurrentScreen(screenName.editProfile);
                }}
                onOpenLogin={() => setCurrentScreen(screenName.login)}
                onOpenSecretCodeRecovery={() => {
                  if (!currentUser) {
                    setReturnToScreenAfterAuth('settings');
                    setCurrentScreen(screenName.userRegistration);
                    return;
                  }
                  setSecretRecoveryTargetEmail(
                    String(currentUser.email || '').trim(),
                  );
                  setSecretRecoveryReturnScreen(screenName.settings);
                  setCurrentScreen(screenName.secretCodeRecovery);
                }}
                onOpenFavorites={() => {
                  if (!currentUser) {
                    setReturnToScreenAfterAuth('settings');
                    setCurrentScreen(screenName.userRegistration);
                    return;
                  }
                  setFavoritesReturnScreen(screenName.settings);
                  setFavoritesCategoryFilter(null);
                  setCurrentScreen(screenName.favorites);
                }}
                onOpenFeedback={() => {
                  if (!currentUser) {
                    setReturnToScreenAfterAuth('settings');
                    setCurrentScreen(screenName.userRegistration);
                    return;
                  }
                  setCurrentScreen(screenName.feedbackSuggestion);
                }}
                onOpenTermsOfUse={() => setCurrentScreen(screenName.termsOfUse)}
                onOpenAccessibilityStatement={() =>
                  setCurrentScreen(screenName.accessibilityStatement)
                }
                onOpenFollowHub={tab => {
                  if (!currentUser) return;
                  setProfileUser(currentUser);
                  setFollowHubInitialTab(tab || 'following');
                  setFollowHubReturnScreen(screenName.settings);
                  setCurrentScreen(screenName.followHub);
                }}
                onOpenOwnProfile={() => {
                  if (!currentUser) return;
                  const mySubId = currentUser?.id
                    ? String(currentUser.id).trim()
                    : '';
                  setProfileReturnScreen(screenName.settings);
                  setProfileListingFocusKey('');
                  setProfileOverviewSnapshot(null);
                  setProfileUser({
                    ...currentUser,
                    subscription_id: mySubId || currentUser.subscription_id,
                    owner_id: mySubId || currentUser.owner_id,
                    // Own profile: posts-grid layout for every account type (not an ad).
                    _forceListingAdProfile: false,
                    _fromHomeFeatureProject: false,
                    _fromCompanyProjects: false,
                    _fromTikTokPost: false,
                    _fromProfessionalsDirectory: false,
                  });
                  setCurrentScreen(screenName.userProfile);
                }}
              />
            )}
            {currentScreen === screenName.editProfile && (
              <EditProfileScreen
                onClose={() => setCurrentScreen(screenName.settings)}
              />
            )}
            {currentScreen === screenName.termsOfUse && (
              <TermsOfUseScreen
                onClose={() => setCurrentScreen(screenName.settings)}
              />
            )}
            {currentScreen === screenName.accessibilityStatement && (
              <AccessibilityStatementScreen
                onClose={() => setCurrentScreen(screenName.settings)}
              />
            )}
            {currentScreen === screenName.feedbackSuggestion && (
              <FeedbackSuggestionScreen
                onClose={() => setCurrentScreen(screenName.settings)}
              />
            )}
            {currentScreen === screenName.favorites && (
              <FavoritesScreen
                categoryId={favoritesCategoryFilter}
                selectedCategory={
                  favoritesCategoryFilter != null
                    ? favoritesCategoryFilter
                    : selectedCategory
                }
                feedFilters={feedFilters}
                onOpenCityFilter={() => {
                  setScreenAfterFilter(screenName.favorites);
                  setCurrentScreen(screenName.cityFilter);
                }}
                onOpenApartmentTypeFilter={() => {
                  setScreenAfterFilter(screenName.favorites);
                  setCurrentScreen(screenName.apartmentTypeFilter);
                }}
                onOpenTypeFilter={() => {
                  setScreenAfterFilter(screenName.favorites);
                  setCurrentScreen(screenName.typeFilter);
                }}
                onOpenOfficeFilter={() => {
                  setScreenAfterFilter(screenName.favorites);
                  setCurrentScreen(screenName.officeFilter);
                }}
                onOpenRoomsFilter={() => {
                  setScreenAfterFilter(screenName.favorites);
                  setCurrentScreen(screenName.roomsFilter);
                }}
                onOpenMeterFilter={() => {
                  setScreenAfterFilter(screenName.favorites);
                  setCurrentScreen(screenName.meterFilter);
                }}
                onOpenDonamFilter={() => {
                  setScreenAfterFilter(screenName.favorites);
                  setCurrentScreen(screenName.donamFilter);
                }}
                onOpenPreferencesFilter={() => {
                  setScreenAfterFilter(screenName.favorites);
                  setCurrentScreen(screenName.preferencesFilter);
                }}
                onOpenPriceFilter={() => {
                  setScreenAfterFilter(screenName.favorites);
                  setCurrentScreen(screenName.priceFilter);
                }}
                onOpenEditPublishAdWithCategory={(category, opts) => {
                  if (!currentUser) {
                    setReturnToScreenAfterAuth('favorites');
                    setCurrentScreen(screenName.userRegistration);
                    return;
                  }
                  if (category != null) setSelectedCategory(String(category));
                  setEditPublishSourceCategory(
                    category != null ? Number(category) : null,
                  );
                  setEditPublishRestoreStrip(true);
                  setBnbPublishHostType(opts?.bnbHostType ?? null);
                  setCurrentScreen(screenName.editPublishAd);
                }}
                onBack={() => {
                  resetFeedFilters();
                  setCurrentScreen(screenName.home);
                }}
                onClose={() => {
                  // Do not clear feed filters (מחיר/עיר/חדרים/…) when returning to TikTok — only the
                  // Favorites top bar writes `tikTokFeedSelectedTopBarFilter` for pics/list/video/liked.
                  setCurrentScreen(favoritesReturnScreen);
                }}
                onNavigateToTikTokAfterTopBarFilter={() => {
                  setTikTokUserSearchOpenTrigger(0);
                  setTikTokFeedRefreshKey(k => k + 1);
                  setCurrentScreen(screenName.tikTokFeed);
                }}
                onOpenTikTokUserSearch={() => {
                  setTikTokUserSearchOpenTrigger(n => n + 1);
                  setCurrentScreen(screenName.tikTokFeed);
                }}
                onOpenListing={listing => {
                  setProfileReturnScreen(screenName.favorites);
                  setProfileUser(enrichListingForUserProfile(listing));
                  setCurrentScreen(screenName.userProfile);
                }}
              />
            )}
            {currentScreen === screenName.secretCodeRecovery && (
              <SecretCodeRecoveryScreen
                userEmail={
                  secretRecoveryTargetEmail ||
                  String(currentUser?.email || '').trim()
                }
                fromLogin={secretRecoveryReturnScreen === screenName.login}
                onClose={() =>
                  setCurrentScreen(
                    secretRecoveryReturnScreen || screenName.settings,
                  )
                }
                onSent={em => {
                  setSecretRecoveryEmail(em);
                  setCurrentScreen(screenName.secretCodeRecoverySent);
                }}
              />
            )}
            {currentScreen === screenName.secretCodeRecoverySent && (
              <SecretCodeRecoverySentScreen
                email={secretRecoveryEmail}
                onBack={() =>
                  setCurrentScreen(
                    secretRecoveryReturnScreen || screenName.settings,
                  )
                }
              />
            )}
            {currentScreen === screenName.listingAnalysis && (
              <ListingAnalysisScreen
                onClose={() => setCurrentScreen(screenName.editPublishAd)}
                currentUser={currentUser}
              />
            )}
            {currentScreen === screenName.editPublishAd && (
              <EditPublishAdScreen
                refreshKey={editPublishRefreshKey}
                onClose={() => {
                  setBnbPublishHostType(null);
                  setEditPublishRestoreStrip(false);
                  setEditPublishSourceCategory(null);
                  setCurrentScreen(screenName.settings);
                }}
                uploadedListings={uploadedListings}
                currentUser={currentUser}
                restoreCategoryStrip={editPublishRestoreStrip}
                initialCategoryId={
                  editPublishRestoreStrip && editPublishSourceCategory != null
                    ? Number(editPublishSourceCategory)
                    : null
                }
                onCategoryChange={handleEditPublishCategoryChange}
                onOpenListingAnalysis={() => {
                  if (canAccessListingAnalysis(currentUser?.subscription_type)) {
                    setEditPublishRestoreStrip(true);
                    setCurrentScreen(screenName.listingAnalysis);
                  }
                }}
                onCreateAd={(categoryId, opts) => {
                  setSelectedCategory(String(categoryId));
                  setEditPublishSourceCategory(Number(categoryId));
                  setEditPublishRestoreStrip(true);
                  setBnbPublishHostType(opts?.bnbHostType ?? null);
                  setEditingListing(null);
                  setAdsFormReturnScreen(screenName.editPublishAd);
                  setCurrentScreen(screenName.adsForm);
                }}
                onCreatePost={(categoryId, opts) => {
                  const n =
                    categoryId != null && String(categoryId).trim() !== ''
                      ? parseInt(String(categoryId).trim(), 10)
                      : NaN;
                  const listingCat = Number.isFinite(n) && n > 0 ? n : null;
                  if (listingCat != null) {
                    setSelectedCategory(String(listingCat));
                    setEditPublishSourceCategory(listingCat);
                  }
                  setEditPublishRestoreStrip(true);
                  setPostEditorConfig({
                    publishTarget: 'post',
                    returnScreen: screenName.editPublishAd,
                    listingCategoryId: listingCat,
                    editingListing: null,
                    postDescriptionLabel: opts?.openHouse
                      ? OPEN_HOUSE_POST_DESCRIPTION
                      : DEFAULT_POST_DESCRIPTION,
                  });
                  setCurrentScreen(screenName.postEditor);
                }}
                onEditPost={listing => {
                  const n =
                    listing?.category != null
                      ? parseInt(String(listing.category).trim(), 10)
                      : NaN;
                  const listingCat = Number.isFinite(n) && n > 0 ? n : null;
                  if (listingCat != null) {
                    setSelectedCategory(String(listingCat));
                    setEditPublishSourceCategory(listingCat);
                  }
                  setEditPublishRestoreStrip(true);
                  setPostEditorConfig({
                    publishTarget: 'post',
                    returnScreen: screenName.editPublishAd,
                    listingCategoryId: listingCat,
                    editingListing: listing ?? null,
                    postDescriptionLabel: isOpenHouseListing(listing)
                      ? OPEN_HOUSE_POST_DESCRIPTION
                      : DEFAULT_POST_DESCRIPTION,
                  });
                  setCurrentScreen(screenName.postEditor);
                }}
                onEditAd={listing => {
                  setBnbPublishHostType(null);
                  const listingCat =
                    listing?.category != null
                      ? parseInt(String(listing.category), 10)
                      : NaN;
                  if (Number.isFinite(listingCat)) {
                    setSelectedCategory(String(listingCat));
                    setEditPublishSourceCategory(listingCat);
                  }
                  setEditPublishRestoreStrip(true);
                  setEditingListing(listing ?? null);
                  setAdsFormReturnScreen(screenName.editPublishAd);
                  setCurrentScreen(screenName.adsForm);
                }}
                onBoost={listing => {
                  if (typeof alert !== 'undefined')
                    alert('הקפצה – יישום בהמשך');
                }}
                onShare={listing => {
                  setSharedListingForChat(listing ?? null);
                  setEditPublishRestoreStrip(true);
                  setChatReturnScreen(screenName.editPublishAd);
                  setCurrentScreen(screenName.chat);
                }}
                onFreeze={async listing => {
                  try {
                    const {updateListingFreeze} = await import('./utils/api');
                    await updateListingFreeze(
                      listing?.id ?? listing?.ad_number,
                      true,
                    );
                  } catch (e) {
                    if (typeof alert !== 'undefined')
                      alert(e?.message || 'שגיאה בהקפאת המודעה');
                  }
                }}
                onUnfreeze={async listing => {
                  try {
                    const {updateListingFreeze} = await import('./utils/api');
                    await updateListingFreeze(
                      listing?.id ?? listing?.ad_number,
                      false,
                    );
                  } catch (e) {
                    if (typeof alert !== 'undefined')
                      alert(e?.message || 'שגיאה בביטול הקפאה');
                  }
                }}
                onRemove={listing => {
                  const id = listing?.id ?? listing?.ad_number;
                  if (id == null) return;
                  const idStr = String(id);
                  setUploadedListings(prev =>
                    prev.filter(l => String(l.id ?? l.ad_number) !== idStr),
                  );
                }}
              />
            )}
            {currentScreen === screenName.chatList && (
              <ChatListScreen
                onClose={() => setCurrentScreen(screenName.settings)}
                currentUser={currentUser}
                refreshKey={chatListRefreshKey}
                piWelcomeRead={piWelcomeRead}
                onOpenChat={conv => {
                  setSharedListingForChat(null);
                  setSelectedConversation(normalizeConversationForOpen(conv));
                  setChatReturnScreen(screenName.chatList);
                  setCurrentScreen(screenName.chat);
                }}
              />
            )}
            {currentScreen === screenName.chat && (
              <ChatScreen
                onClose={() => {
                  setSharedListingForChat(null);
                  setSelectedConversation(null);
                  setChatListRefreshKey(k => k + 1);
                  goBack(chatReturnScreen);
                }}
                sharedListing={sharedListingForChat}
                conversation={selectedConversation}
                currentUser={currentUser}
                onMessageSent={() => setChatListRefreshKey(k => k + 1)}
                onOpenPost={listing => {
                  setSharedListingForChat(null);
                  openListingInTikTokFeed(
                    {
                      ...listing,
                      feedPost:
                        listing?.feedPost ??
                        listing?.feed_post ??
                        true,
                    },
                    {returnScreen: chatReturnScreen},
                  );
                  setChatListRefreshKey(k => k + 1);
                  requestAnimationFrame(() => setSelectedConversation(null));
                }}
                onPiWelcomeOpened={async () => {
                  setPiWelcomeRead(true);
                  if (currentUser) {
                    try {
                      await AsyncStorage.setItem(
                        piWelcomeReadKey(currentUser),
                        'true',
                      );
                    } catch (_) {}
                  }
                }}
                onOpenPeerProfile={openUserProfileFromChatPeer}
                onContactListingOwner={owner => {
                  const ownerEmail = (owner?.email || '')
                    .trim()
                    .toLowerCase();
                  if (!ownerEmail) return;
                  setSharedListingForChat(null);
                  setSelectedConversation({
                    id: ownerEmail,
                    otherUserEmail: ownerEmail,
                    name: owner?.name || 'משתמש',
                    profileImageUrl: owner?.profileImageUrl || null,
                    preview: '',
                    time: '',
                  });
                }}
              />
            )}
            {currentScreen === screenName.login && (
              <LoginScreen
                onClose={() => {
                  if (returnToScreenAfterAuth) {
                    goBack(
                      authReturnFallbackScreen(
                        returnToScreenAfterAuth,
                        screenName.userRegistration,
                      ),
                    );
                    return;
                  }
                  setReturnToScreenAfterAuth(null);
                  goBack(screenName.settings);
                }}
                onForgotPassword={forgotEmail => {
                  setSecretRecoveryTargetEmail(
                    String(forgotEmail || '').trim(),
                  );
                  setSecretRecoveryReturnScreen(screenName.login);
                  setCurrentScreen(screenName.secretCodeRecovery);
                }}
                onLoginSuccess={subscription => {
                  setCurrentUser(subscription);
                  const back = returnToScreenAfterAuth;
                  setReturnToScreenAfterAuth(null);
                  if (back) {
                    goBack(authReturnFallbackScreen(back, screenName.home));
                  } else {
                    setCurrentScreen(screenName.home);
                  }
                }}
              />
            )}
            {currentScreen === screenName.userRegistration && (
              <UserRegistrationScreen
                selectedCategory={selectedCategory}
                onSuccess={user => {
                  setCurrentUser(user);
                  const back = returnToScreenAfterAuth;
                  setReturnToScreenAfterAuth(null);
                  goBack(authReturnFallbackScreen(back, screenName.adsForm));
                }}
                onCancel={() => {
                  const back = returnToScreenAfterAuth;
                  setReturnToScreenAfterAuth(null);
                  goBack(authReturnFallbackScreen(back, screenName.tikTokFeed));
                }}
                onOpenLogin={() => setCurrentScreen(screenName.login)}
              />
            )}
            {currentScreen === screenName.subscription && (
              <SubscriptionScreen
                onClose={() => setCurrentScreen(screenName.settings)}
                onStart={() => setCurrentScreen(screenName.subscriptionForm)}
                subscriptionType={subscriptionTypes.broker}
                currentUser={currentUser}
              />
            )}
            {currentScreen === screenName.subscriptionCompany && (
              <SubscriptionScreen
                onClose={() => setCurrentScreen(screenName.settings)}
                onStart={() =>
                  setCurrentScreen(screenName.subscriptionFormCompany)
                }
                subscriptionType={subscriptionTypes.company}
                currentUser={currentUser}
              />
            )}
            {currentScreen === screenName.subscriptionProfessional && (
              <SubscriptionScreen
                onClose={() => setCurrentScreen(screenName.settings)}
                onStart={() =>
                  setCurrentScreen(screenName.subscriptionFormProfessional)
                }
                subscriptionType={subscriptionTypes.professional}
                currentUser={currentUser}
              />
            )}
            {currentScreen === screenName.subscriptionForm && (
              <SubscriptionFormScreen
                onClose={() => setCurrentScreen(screenName.subscription)}
                onNext={draft => {
                  setSubscriptionData(draft);
                  setCurrentScreen(screenName.verification);
                }}
                subscriptionType={subscriptionTypes.broker}
              />
            )}
            {currentScreen === screenName.subscriptionFormCompany && (
              <SubscriptionFormScreen
                onClose={() => setCurrentScreen(screenName.subscriptionCompany)}
                onNext={draft => {
                  setSubscriptionData(draft);
                  setCurrentScreen(screenName.verificationCompany);
                }}
                subscriptionType={subscriptionTypes.company}
              />
            )}
            {currentScreen === screenName.subscriptionFormProfessional && (
              <SubscriptionFormScreen
                onClose={() =>
                  setCurrentScreen(screenName.subscriptionProfessional)
                }
                onNext={draft => {
                  setSubscriptionData(draft);
                  setCurrentScreen(screenName.verificationProfessional);
                }}
                subscriptionType={subscriptionTypes.professional}
              />
            )}
            {currentScreen === screenName.verification && (
              <VerificationScreen
                onClose={() => setCurrentScreen(screenName.subscriptionForm)}
                onVerified={subscription => {
                  setSubscriptionData(prev => ({...prev, subscription}));
                  setCurrentScreen(screenName.ratingIntro);
                }}
                onSkipVerifiedTest={subscription => {
                  setSubscriptionData(prev => ({...prev, subscription}));
                  setCurrentScreen(screenName.ratingIntro);
                }}
                subscriptionType={subscriptionTypes.broker}
                email={subscriptionData?.email}
                subscriptionId={subscriptionData?.subscriptionId}
                pendingSubmit={subscriptionData?.pendingSubmit}
                localProfileImage={subscriptionData?.localProfileImage}
              />
            )}
            {currentScreen === screenName.verificationCompany && (
              <VerificationScreen
                onClose={() =>
                  setCurrentScreen(screenName.subscriptionFormCompany)
                }
                onVerified={subscription => {
                  setSubscriptionData(prev => ({...prev, subscription}));
                  setCurrentScreen(screenName.ratingIntroCompany);
                }}
                onSkipVerifiedTest={subscription => {
                  setSubscriptionData(prev => ({...prev, subscription}));
                  setCurrentScreen(screenName.ratingIntroCompany);
                }}
                subscriptionType={subscriptionTypes.company}
                email={subscriptionData?.email}
                subscriptionId={subscriptionData?.subscriptionId}
                pendingSubmit={subscriptionData?.pendingSubmit}
                localProfileImage={subscriptionData?.localProfileImage}
              />
            )}
            {currentScreen === screenName.verificationProfessional && (
              <VerificationScreen
                onClose={() =>
                  setCurrentScreen(screenName.subscriptionFormProfessional)
                }
                onVerified={subscription => {
                  setSubscriptionData(prev => ({...prev, subscription}));
                  setCurrentScreen(screenName.ratingIntroProfessional);
                }}
                onSkipVerifiedTest={subscription => {
                  setSubscriptionData(prev => ({...prev, subscription}));
                  setCurrentScreen(screenName.ratingIntroProfessional);
                }}
                subscriptionType={subscriptionTypes.professional}
                email={subscriptionData?.email}
                subscriptionId={subscriptionData?.subscriptionId}
                pendingSubmit={subscriptionData?.pendingSubmit}
                localProfileImage={subscriptionData?.localProfileImage}
              />
            )}
            {currentScreen === screenName.verificationCode && (
              <VerificationCodeScreen
                onClose={() => setCurrentScreen(screenName.verification)}
                onNext={subscription => {
                  setSubscriptionData(prev => ({...prev, subscription}));
                  setCurrentScreen(screenName.ratingIntro);
                }}
                subscriptionType={subscriptionTypes.broker}
                email={subscriptionData?.email}
                subscriptionId={subscriptionData?.subscriptionId}
              />
            )}
            {currentScreen === screenName.verificationCodeCompany && (
              <VerificationCodeScreen
                onClose={() => setCurrentScreen(screenName.verificationCompany)}
                onNext={subscription => {
                  setSubscriptionData(prev => ({...prev, subscription}));
                  setCurrentScreen(screenName.ratingIntroCompany);
                }}
                subscriptionType={subscriptionTypes.company}
                email={subscriptionData?.email}
                subscriptionId={subscriptionData?.subscriptionId}
              />
            )}
            {currentScreen === screenName.verificationCodeProfessional && (
              <VerificationCodeScreen
                onClose={() =>
                  setCurrentScreen(screenName.verificationProfessional)
                }
                onNext={subscription => {
                  setSubscriptionData(prev => ({...prev, subscription}));
                  setCurrentScreen(screenName.ratingIntroProfessional);
                }}
                subscriptionType={subscriptionTypes.professional}
                email={subscriptionData?.email}
                subscriptionId={subscriptionData?.subscriptionId}
              />
            )}
            {currentScreen === screenName.ratingIntro && (
              <SubscriptionRatingIntroScreen
                onClose={() => setCurrentScreen(screenName.verificationCode)}
                onContinue={() => setCurrentScreen(screenName.success)}
                subscriptionType={subscriptionTypes.broker}
              />
            )}
            {currentScreen === screenName.ratingIntroCompany && (
              <SubscriptionRatingIntroScreen
                onClose={() =>
                  setCurrentScreen(screenName.verificationCodeCompany)
                }
                onContinue={() => setCurrentScreen(screenName.successCompany)}
                subscriptionType={subscriptionTypes.company}
              />
            )}
            {currentScreen === screenName.ratingIntroProfessional && (
              <SubscriptionRatingIntroScreen
                onClose={() =>
                  setCurrentScreen(screenName.verificationCodeProfessional)
                }
                onContinue={() =>
                  setCurrentScreen(screenName.successProfessional)
                }
                subscriptionType={subscriptionTypes.professional}
              />
            )}
            {currentScreen === screenName.success && (
              <SuccessScreen
                onClose={() => setCurrentScreen(screenName.verificationCode)}
                onGoHome={() => {
                  if (subscriptionData?.subscription) {
                    setCurrentUser(subscriptionData.subscription);
                  }
                  setSubscriptionData(null);
                  setCurrentScreen(screenName.home);
                }}
                onStartPublishing={() => {
                  if (subscriptionData?.subscription) {
                    setCurrentUser(subscriptionData.subscription);
                  }
                  setSubscriptionData(null);
                  setCurrentScreen(screenName.home);
                }}
                subscriptionType={subscriptionTypes.broker}
                subscription={subscriptionData?.subscription}
                localProfileImage={subscriptionData?.localProfileImage}
              />
            )}
            {currentScreen === screenName.successCompany && (
              <SuccessScreen
                onClose={() =>
                  setCurrentScreen(screenName.verificationCodeCompany)
                }
                onGoHome={() => {
                  if (subscriptionData?.subscription) {
                    setCurrentUser(subscriptionData.subscription);
                  }
                  setSubscriptionData(null);
                  setCurrentScreen(screenName.home);
                }}
                onStartPublishing={() => {
                  if (subscriptionData?.subscription) {
                    setCurrentUser(subscriptionData.subscription);
                  }
                  setSubscriptionData(null);
                  setCurrentScreen(screenName.home);
                }}
                subscriptionType={subscriptionTypes.company}
                subscription={subscriptionData?.subscription}
                localProfileImage={subscriptionData?.localProfileImage}
              />
            )}
            {currentScreen === screenName.successProfessional && (
              <SuccessScreen
                onClose={() =>
                  setCurrentScreen(screenName.verificationCodeProfessional)
                }
                onGoHome={() => {
                  if (subscriptionData?.subscription) {
                    setCurrentUser(subscriptionData.subscription);
                  }
                  setSubscriptionData(null);
                  setCurrentScreen(screenName.home);
                }}
                onStartPublishing={() => {
                  if (subscriptionData?.subscription) {
                    setCurrentUser(subscriptionData.subscription);
                  }
                  setSubscriptionData(null);
                  setCurrentScreen(screenName.home);
                }}
                subscriptionType={subscriptionTypes.professional}
                subscription={subscriptionData?.subscription}
                localProfileImage={subscriptionData?.localProfileImage}
              />
            )}
            {currentScreen === screenName.projectMarketerPlan && (
              <ProjectMarketerPlanScreen
                onClose={() => setCurrentScreen(screenName.settings)}
                onSelectPlan={plan => {
                  setMarketerPlan(plan);
                  setCurrentScreen(screenName.subscriptionProjectMarketer);
                }}
                onJoinAgency={() => setCurrentScreen(screenName.joinAgency)}
              />
            )}
            {currentScreen === screenName.subscriptionProjectMarketer && (
              <SubscriptionScreen
                onClose={() =>
                  setCurrentScreen(screenName.projectMarketerPlan)
                }
                onStart={() =>
                  setCurrentScreen(screenName.subscriptionFormProjectMarketer)
                }
                subscriptionType={subscriptionTypes.projectMarketer}
                currentUser={currentUser}
              />
            )}
            {currentScreen === screenName.subscriptionFormProjectMarketer && (
              <SubscriptionFormScreen
                onClose={() =>
                  setCurrentScreen(screenName.subscriptionProjectMarketer)
                }
                onNext={draft => {
                  setSubscriptionData(draft);
                  setCurrentScreen(screenName.verificationProjectMarketer);
                }}
                subscriptionType={subscriptionTypes.projectMarketer}
                marketerPlan={marketerPlan}
              />
            )}
            {currentScreen === screenName.verificationProjectMarketer && (
              <VerificationScreen
                onClose={() =>
                  setCurrentScreen(screenName.subscriptionFormProjectMarketer)
                }
                onVerified={subscription => {
                  setSubscriptionData(prev => ({...prev, subscription}));
                  setCurrentScreen(screenName.ratingIntroProjectMarketer);
                }}
                onSkipVerifiedTest={subscription => {
                  setSubscriptionData(prev => ({...prev, subscription}));
                  setCurrentScreen(screenName.ratingIntroProjectMarketer);
                }}
                subscriptionType={subscriptionTypes.projectMarketer}
                email={subscriptionData?.email}
                subscriptionId={subscriptionData?.subscriptionId}
                pendingSubmit={subscriptionData?.pendingSubmit}
                localProfileImage={subscriptionData?.localProfileImage}
              />
            )}
            {currentScreen === screenName.verificationCodeProjectMarketer && (
              <VerificationCodeScreen
                onClose={() =>
                  setCurrentScreen(screenName.verificationProjectMarketer)
                }
                onNext={subscription => {
                  setSubscriptionData(prev => ({...prev, subscription}));
                  setCurrentScreen(screenName.ratingIntroProjectMarketer);
                }}
                subscriptionType={subscriptionTypes.projectMarketer}
                email={subscriptionData?.email}
                subscriptionId={subscriptionData?.subscriptionId}
              />
            )}
            {currentScreen === screenName.ratingIntroProjectMarketer && (
              <SubscriptionRatingIntroScreen
                onClose={() =>
                  setCurrentScreen(screenName.verificationCodeProjectMarketer)
                }
                onContinue={() =>
                  setCurrentScreen(screenName.successProjectMarketer)
                }
                subscriptionType={subscriptionTypes.projectMarketer}
              />
            )}
            {currentScreen === screenName.successProjectMarketer && (
              <SuccessScreen
                onClose={() =>
                  setCurrentScreen(screenName.verificationCodeProjectMarketer)
                }
                onGoHome={() => {
                  if (subscriptionData?.subscription) {
                    setCurrentUser(subscriptionData.subscription);
                  }
                  setSubscriptionData(null);
                  setMarketerPlan(null);
                  setCurrentScreen(screenName.home);
                }}
                onStartPublishing={() => {
                  if (subscriptionData?.subscription) {
                    setCurrentUser(subscriptionData.subscription);
                  }
                  setSubscriptionData(null);
                  setMarketerPlan(null);
                  setCurrentScreen(screenName.home);
                }}
                subscriptionType={subscriptionTypes.projectMarketer}
                subscription={subscriptionData?.subscription}
                localProfileImage={subscriptionData?.localProfileImage}
              />
            )}
            {currentScreen === screenName.joinAgency && (
              <JoinAgencyScreen
                onClose={() =>
                  setCurrentScreen(screenName.projectMarketerPlan)
                }
                onJoined={subscription => {
                  if (subscription) setCurrentUser(subscription);
                  setCurrentScreen(screenName.home);
                }}
              />
            )}
            {currentScreen === screenName.agencyJoinCode && (
              <AgencyJoinCodeScreen
                onClose={() => setCurrentScreen(screenName.settings)}
                currentUser={currentUser}
              />
            )}
            {currentScreen === screenName.agencyMembers && (
              <AgencyMembersScreen
                onClose={() => setCurrentScreen(screenName.settings)}
                currentUser={currentUser}
                onOpenMember={member => {
                  setAgencyMember(member);
                  setCurrentScreen(screenName.agencyMemberListings);
                }}
              />
            )}
            {currentScreen === screenName.agencyMemberListings && (
              <AgencyMemberListingsScreen
                onClose={() => setCurrentScreen(screenName.agencyMembers)}
                member={agencyMember}
                onViewListing={listing =>
                  openListingAdProfile(listing, {
                    returnScreen: screenName.agencyMemberListings,
                    profileExtras: {_forceListingAdProfile: true},
                  })
                }
                onEditListing={listing => {
                  setBnbPublishHostType(null);
                  const listingCat =
                    listing?.category != null
                      ? parseInt(String(listing.category), 10)
                      : NaN;
                  if (Number.isFinite(listingCat)) {
                    setSelectedCategory(String(listingCat));
                  }
                  setEditingListing(listing ?? null);
                  setAdsFormReturnScreen(screenName.agencyMemberListings);
                  setCurrentScreen(screenName.adsForm);
                }}
                onEditPost={listing => {
                  const n =
                    listing?.category != null
                      ? parseInt(String(listing.category).trim(), 10)
                      : NaN;
                  const listingCat = Number.isFinite(n) && n > 0 ? n : null;
                  if (listingCat != null) {
                    setSelectedCategory(String(listingCat));
                  }
                  setPostEditorConfig({
                    publishTarget: 'post',
                    returnScreen: screenName.agencyMemberListings,
                    listingCategoryId: listingCat,
                    editingListing: listing ?? null,
                    postDescriptionLabel: isOpenHouseListing(listing)
                      ? OPEN_HOUSE_POST_DESCRIPTION
                      : DEFAULT_POST_DESCRIPTION,
                  });
                  setCurrentScreen(screenName.postEditor);
                }}
              />
            )}
            {showOnboarding ? (
              <OnboardingFlow onComplete={handleOnboardingComplete} />
            ) : showTermsGate ? (
              <View style={styles.termsGateOverlay}>
                <TermsOfUseScreen
                  mode="accept"
                  onAccept={handleTermsAccepted}
                />
              </View>
            ) : null}
          </View>
        </SafeAreaProvider>
      </PresenceProvider>
    </ContextHook.Provider>
  );
}

export default function RootApp() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  bootRoot: {
    flex: 1,
    backgroundColor: '#1e1d27',
  },
  homeShell: {
    flex: 1,
  },
  /** Home stays mounted under TikTok so back is instant (no refetch). */
  homeShellCached: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    zIndex: 0,
  },
  tikTokShell: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  /** TikTok stays mounted under profile stack so back is instant (no scroll reset). */
  tikTokShellCached: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    zIndex: 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#1e1d27',
  },
  termsGateOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: '#ffffff',
  },
});
