import React, {useState, useEffect, useRef, useCallback} from 'react';
import {StyleSheet, View, ActivityIndicator, Text, Alert, AppState, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AdsForm,
  HomeScreen,
  Home,
  SelectedProjectsScreen,
  ProfessionalsDirectoryScreen,
  ProfessionalFlyerScreen,
  CompanyProjectsScreen,
  CompanyReportScreen,
  SettingsScreen,
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
} from './screens';
import CompanyReportSuccessModal from './components/CompanyReportSuccessModal';
import {ContextHook} from './hooks/ContextHook';
import {PresenceProvider} from './hooks/PresenceContext';
import {subscriptionTypes} from './utils/constant';
import {getChatUnreadCount, getListings} from './utils/api';
import {getUserProfileImageUrl, normalizeUserProfileAliases} from './utils/userProfileImage';
import {getChatListingCategoryLabel} from './utils/chatListingCategory';
import {isAdsListingRecord} from './utils/listingShape';
import {enrichListingForUserProfile} from './utils/enrichListingForUserProfile';
import {
  pickTopViewedListingForProfile,
  mergeHubRowIntoListingPayload,
} from './utils/pickTopViewedListingForProfile';
import {useFonts} from 'expo-font';
import {fonts} from './utils/fonts';
import {SafeAreaProvider} from 'react-native-safe-area-context';

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
  termsOfUse: 'termsOfUse',
  accessibilityStatement: 'accessibilityStatement',
  selectedProjects: 'selectedProjects',
  professionalsDirectory: 'professionalsDirectory',
  professionalFlyer: 'professionalFlyer',
  companyProjects: 'companyProjects',
  companyReport: 'companyReport',
  /** Figma 10:31152 — full ביקורות list from profile "קרא עוד". */
  profileReviews: 'profileReviews',
};

const INITIAL_FEED_FILTERS = {
  price: null, // null | { minPrice, maxPrice }
  rooms: null, // null | { area, rooms, floor, parking, balcony, elevator, mamad }
  city: null, // null | { purpose, city, street, distanceKm, immediateEntry }
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
  const city = String(f.city || '').trim();
  const street = String(f.street || '').trim();
  const hasLoc = city !== '' || street !== '';
  const imm = f.immediateEntry === true;
  const p = f.purpose;
  const hasPurpose = p === 'rent' || p === 'sale';
  if (!hasLoc && !imm && !hasPurpose) return null;
  return f;
}

/** `onSave(null)` or merge from RoomsFilterScreen. */
function normalizeRoomsFeedFilter(f) {
  return f == null ? null : f;
}

/** Same key as TikTokFeedScreen — opening feed from Home always starts on default (pics). */
const TIKTOK_TOP_BAR_FILTER_STORAGE_KEY = 'tikTokFeedSelectedTopBarFilter';
const DEFAULT_TIKTOK_TOP_FILTER = 'pics';

/**
 * Main App Component
 * Entry point for the PI Real Estate application
 */
export default function App() {
  const [fontsLoaded] = useFonts(fonts);
  const [currentScreen, setCurrentScreen] = useState(screenName.login);
  const [subscriptionData, setSubscriptionData] = useState(null); // Store subscription data between screens
  const [currentUser, setCurrentUserState] = useState(null); // Store current logged-in user data
  const setCurrentUser = useCallback((u) => {
    if (u == null) {
      setCurrentUserState(null);
      return;
    }
    if (typeof u === 'function') {
      setCurrentUserState((prev) => {
        const next = u(prev);
        return next == null ? null : normalizeUserProfileAliases(next);
      });
      return;
    }
    setCurrentUserState(normalizeUserProfileAliases(u));
  }, []);
  const [uploadedListings, setUploadedListings] = useState([]); // Store uploaded listings for TikTok feed (temporary, for immediate display)
  const [selectedCategory, setSelectedCategory] = useState(null); // Store selected category for TikTok feed
  // Explicit category context when opening Edit/Publish from TikTok feed
  const [editPublishSourceCategory, setEditPublishSourceCategory] = useState(null);
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
  const [profileUser, setProfileUser] = useState(null); // User to show on UserProfileScreen when opened from feed
  const [profileReturnScreen, setProfileReturnScreen] = useState(screenName.tikTokFeed);
  const [followHubInitialTab, setFollowHubInitialTab] = useState('followers');
  const [followHubReturnScreen, setFollowHubReturnScreen] = useState(screenName.userProfile);
  /** Where to go when closing Favorites (Settings vs home vs feed). */
  const [favoritesReturnScreen, setFavoritesReturnScreen] = useState(screenName.home);
  /** null = all categories; number = favorites only in that listing category (from TikTok feed). */
  const [favoritesCategoryFilter, setFavoritesCategoryFilter] = useState(null);
  /** Bumped when opening TikTok with user search from Favorites (same as feed magnify). */
  const [tikTokUserSearchOpenTrigger, setTikTokUserSearchOpenTrigger] = useState(0);
  const [companyProjectsContext, setCompanyProjectsContext] = useState(null);
  /** Payload when opening דווח על חברה from UserProfileScreen (company only). */
  const [companyReportPayload, setCompanyReportPayload] = useState(null);
  /** Figma: 15:10070 company / 10:35338 professional — after report submit. */
  const [showCompanyReportSuccess, setShowCompanyReportSuccess] = useState(false);
  /** Reviews passed from UserProfileScreen when opening Figma full reviews page. */
  const [profileReviewsList, setProfileReviewsList] = useState(null);
  const [returnToScreenAfterAuth, setReturnToScreenAfterAuth] = useState(null);
  // 'userProfile' | 'home' | 'settings' | 'tikTokFeed' | 'favorites' | null
  const [chatListRefreshKey, setChatListRefreshKey] = useState(0); // Bump when sending a message so chat list refetches
  const [secretRecoveryEmail, setSecretRecoveryEmail] = useState(''); // Email shown on שחזור קוד סודי success screen
  const [postEditorConfig, setPostEditorConfig] = useState(() => ({
    publishTarget: 'post',
    returnScreen: screenName.tikTokFeed,
    /** DB listing category for the next publish; null = fall back to selectedCategory in PostEditor */
    listingCategoryId: null,
  }));
  // Feed filters (price, rooms, city, apartment type) – applied client-side in TikTokFeedScreen
  const [feedFilters, setFeedFilters] = useState(INITIAL_FEED_FILTERS);
  /** Filter modals return here on save/cancel (TikTok feed vs Favorites). */
  const [screenAfterFilter, setScreenAfterFilter] = useState(screenName.tikTokFeed);
  const lastScreenRef = useRef(currentScreen);

  const resetFeedFilters = useCallback(() => {
    setFeedFilters(INITIAL_FEED_FILTERS);
  }, []);

  /** Merges one key into `feedFilters` (does not wipe other filters; use when saving a single filter sheet). */
  const setFeedFilterKey = useCallback((key, value) => {
    setFeedFilters(prev => ({...prev, [key]: value}));
  }, []);

  const CHAT_LAST_OPENED_KEY = 'pi_chat_last_opened';
  // Per-user key (id or email) so every new user sees "1 unread" until they open Pi welcome once
  const piWelcomeReadKey = (user) => {
    const id = user?.id != null ? String(user.id).trim() : '';
    const email = user?.email != null ? String(user.email).trim().toLowerCase() : '';
    return `pi_welcome_read_${id || email || 'anon'}`;
  };

  // Load user data and last-opened-chat from AsyncStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('pi_current_user');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);
          setCurrentScreen(screenName.home);
          const last = await AsyncStorage.getItem(CHAT_LAST_OPENED_KEY);
          if (last) lastOpenedChatAtRef.current = last;
          const read = await AsyncStorage.getItem(piWelcomeReadKey(user));
          setPiWelcomeRead(read === 'true');
        } else {
          setCurrentScreen(screenName.login);
        }
      } catch (error) {
        setCurrentScreen(screenName.login);
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
    AsyncStorage.getItem(piWelcomeReadKey(currentUser)).then((read) => {
      setPiWelcomeRead(read === 'true');
    }).catch(() => {});
  }, [currentUser?.id, currentUser?.email]);

  const refreshUnreadChatCount = useCallback(async () => {
    const email = currentUser?.email ? String(currentUser.email).trim().toLowerCase() : null;
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
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && currentUser?.email) refreshUnreadChatCount();
    });
    return () => sub.remove();
  }, [currentUser?.email, refreshUnreadChatCount]);

  // Save user data to AsyncStorage whenever it changes
  useEffect(() => {
    const saveUser = async () => {
      if (currentUser) {
        try {
          await AsyncStorage.setItem(
            'pi_current_user',
            JSON.stringify(currentUser),
          );
        } catch (error) {}
      } else {
        // Clear AsyncStorage when currentUser is null
        try {
          await AsyncStorage.removeItem('pi_current_user');
        } catch (error) {}
      }
    };

    saveUser();
  }, [currentUser]);

  // Leaving TikTok and coming back should start with clean filters.
  useEffect(() => {
    const prevScreen = lastScreenRef.current;
    const filterScreens = new Set([
      screenName.cityFilter,
      screenName.apartmentTypeFilter,
      screenName.roomsFilter,
      screenName.priceFilter,
      screenName.typeFilter,
      screenName.meterFilter,
      screenName.donamFilter,
      screenName.preferencesFilter,
      screenName.officeFilter,
    ]);
    if (
      currentScreen === screenName.tikTokFeed &&
      prevScreen !== screenName.tikTokFeed &&
      !filterScreens.has(prevScreen)
    ) {
      resetFeedFilters();
    }
    lastScreenRef.current = currentScreen;
  }, [currentScreen, resetFeedFilters]);

  const openUserProfileFromFollowHubRow = useCallback(async row => {
    if (!row?.id || row.is_self) return;
    const sid = String(row.id).trim();
    if (!sid) return;
    setProfileReturnScreen(screenName.home);
    try {
      const res = await getListings({
        status: 'published',
        subscription_id: sid,
      });
      const list = Array.isArray(res?.listings) ? res.listings : [];
      const top = pickTopViewedListingForProfile(list);
      if (top) {
        const merged = mergeHubRowIntoListingPayload(row, top);
        const enriched = enrichListingForUserProfile(merged);
        setProfileUser({...enriched, _fromTikTokPost: true});
      } else {
        setProfileUser({
          subscription_id: sid,
          owner_id: sid,
          creator_name: row.name,
          name: row.name,
          creator_email: null,
          creator_profile_image_url: row.image_url || null,
          profile_picture_url: row.image_url || null,
        });
      }
      setCurrentScreen(screenName.userProfile);
    } catch (e) {
      Alert.alert('', e?.message || 'שגיאה בטעינת הפרופיל');
    }
  }, []);

  const openCompanyReportFromProfile = useCallback(() => {
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
    if (!isCompany && !isProfessional && !isBroker) {
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
      reportSubjectType: isCompany ? 'company' : isBroker ? 'broker' : 'professional',
    });
    setShowCompanyReportSuccess(false);
    setCurrentScreen(screenName.companyReport);
  }, [profileUser]);

  const openProfileReviewsFromProfile = useCallback(list => {
    setProfileReviewsList(Array.isArray(list) ? list : []);
    setCurrentScreen(screenName.profileReviews);
  }, []);

  const closeProfileReviewsList = useCallback(() => {
    setProfileReviewsList(null);
    setCurrentScreen(screenName.userProfile);
  }, []);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#1e1d27',
        }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  const presenceUserEmail =
    currentUser?.email != null && String(currentUser.email).trim() !== ''
      ? String(currentUser.email).trim().toLowerCase()
      : null;

  return (
    <ContextHook.Provider value={{currentUser, setCurrentUser}}>
      <PresenceProvider userEmail={presenceUserEmail}>
      <SafeAreaProvider>
      <View style={styles.container}>
        {/* Dev build indicator – timestamp updates when bundle rebuilds; if it changes after refresh, new code loaded */}
        {__DEV__ && typeof window !== 'undefined' && (
          <View style={{ position: 'absolute', bottom: 4, left: 4, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
            <Text style={{ color: '#2DD4BF', fontSize: 10 }}>load {Date.now()}</Text>
          </View>
        )}
        {currentScreen === screenName.home && (
          <Home
            onOpenSelectedProjects={() =>
              setCurrentScreen(screenName.selectedProjects)
            }
            onOpenProfessionalsDirectory={() =>
              setCurrentScreen(screenName.professionalsDirectory)
            }
            onOpenSettings={() => setCurrentScreen(screenName.settings)}
            onOpenTikTokFeed={async category => {
              setSelectedCategory(category);
              // Favorites "open user search" bumps tikTokUserSearchOpenTrigger; if we only reset
              // on unmount, that value stays >0 and the next feed mount runs the effect that opens
              // the search panel. Home category buttons must always land on default feed (pics), not
              // search or favorites.
              setTikTokUserSearchOpenTrigger(0);
              setTikTokFeedRefreshKey(k => k + 1);
              try {
                await AsyncStorage.setItem(
                  TIKTOK_TOP_BAR_FILTER_STORAGE_KEY,
                  DEFAULT_TIKTOK_TOP_FILTER,
                );
              } catch (_) {}
              setCurrentScreen(screenName.tikTokFeed);
            }}
            onOpenUserProfile={listing => {
              setProfileReturnScreen(screenName.home);
              setProfileUser(listing);
              setCurrentScreen(screenName.userProfile);
            }}
          />
        )}
        {currentScreen === screenName.tikTokFeed && (
          <TikTokFeedScreen
            key={tikTokFeedRefreshKey} // Force remount when refreshKey changes
            onClose={() => {
              setSelectedCategory(null);
              setBnbPublishHostType(null);
              resetFeedFilters();
              setTikTokUserSearchOpenTrigger(0);
              setCurrentScreen(screenName.home);
            }}
            onOpenOfficeListing={(category, opts) => {
              if (category) setSelectedCategory(category);
              setBnbPublishHostType(opts?.bnbHostType ?? null);
              if (!currentUser) {
                setReturnToScreenAfterAuth('tikTokFeed');
                setCurrentScreen(screenName.userRegistration);
              } else {
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
              setBnbPublishHostType(opts?.bnbHostType ?? null);
              setCurrentScreen(screenName.editPublishAd);
            }}
            onOpenPostEditor={category => {
              if (!currentUser) {
                setReturnToScreenAfterAuth('tikTokFeed');
                setCurrentScreen(screenName.userRegistration);
                return;
              }
              const raw =
                category != null && String(category).trim() !== ''
                  ? parseInt(String(category).trim(), 10)
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
              setProfileUser(
                user && typeof user === 'object'
                  ? {...user, _fromTikTokPost: true}
                  : user,
              );
              // Clear App-level trigger so remounting the feed after profile back does not run
              // TikTokFeedScreen's userSearchOpenTrigger effect (e.g. after Favorites→feed search).
              // Without this, back from profile wrongly reopens the user-search panel instead of the feed you had.
              setTikTokUserSearchOpenTrigger(0);
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
                categoryFromFeed != null && String(categoryFromFeed).trim() !== ''
                  ? parseInt(String(categoryFromFeed), 10)
                  : NaN;
              setFavoritesCategoryFilter(
                !Number.isNaN(n) && n > 0 ? n : null,
              );
              setCurrentScreen(screenName.favorites);
            }}
            onShareToConversation={(conv, post) => {
              if (!conv || !post) return;
              setSharedListingForChat(post);
              setSelectedConversation({
                id: conv.id || conv.otherUserEmail || null,
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
            uploadedListings={uploadedListings}
            selectedCategory={selectedCategory}
            feedFilters={feedFilters}
            currentUser={currentUser}
            userSearchOpenTrigger={tikTokUserSearchOpenTrigger}
            onUserSearchBackToDefaultFeed={() => setTikTokUserSearchOpenTrigger(0)}
          />
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
              setCurrentScreen(screenName.companyProjects);
            }}
          />
        )}
        {currentScreen === screenName.professionalsDirectory && (
          <ProfessionalsDirectoryScreen
            onClose={() => setCurrentScreen(screenName.home)}
            onOpenProfessional={professional => {
              setProfileReturnScreen(screenName.professionalsDirectory);
              setProfileUser({
                ...professional,
                subscription_id: professional?.id || null,
                owner_id: professional?.id || null,
                creator_name: professional?.display_name || professional?.name || null,
                creator_profile_image_url: professional?.profile_image_url || null,
                profile_picture_url: professional?.profile_image_url || null,
                subscription_type: subscriptionTypes.professional,
              });
              setCurrentScreen(screenName.userProfile);
            }}
            onMessageProfessional={professional => {
              const u = {
                ...professional,
                creator_name: professional?.display_name || professional?.name || null,
                creator_profile_image_url: professional?.profile_image_url || null,
                profile_picture_url: professional?.profile_image_url || null,
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
                (u?.creator_email || u?.email || '').trim().toLowerCase() || null;
              const fromFeedListing = isAdsListingRecord(u);
              const listingId = fromFeedListing ? String(u.id).trim() : null;
              const listingCategoryLabel = fromFeedListing
                ? getChatListingCategoryLabel(u?.category)
                : null;
              const conversation = {
                id: otherEmail || u?.subscription_id || u?.id || 'profile',
                name: displayName,
                preview: '',
                time: '',
                profileImageUrl: getUserProfileImageUrl(u),
                ...(listingId
                  ? {listingId, listingCategoryLabel: listingCategoryLabel || null}
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
            onClose={() => setCurrentScreen(screenName.professionalsDirectory)}
            onMessage={() => {
              const u = profileUser;
              const displayName = u?.creator_name || u?.display_name || u?.name || u?.agent_name || u?.contact_person_name || u?.business_name || u?.broker_office_name || 'משתמש';
              const otherEmail = (u?.creator_email || u?.email || '').trim().toLowerCase() || null;
              const fromFeedListing = isAdsListingRecord(u);
              const listingId = fromFeedListing ? String(u.id).trim() : null;
              const listingCategoryLabel = fromFeedListing ? getChatListingCategoryLabel(u?.category) : null;
              const conversation = {
                id: otherEmail || u?.subscription_id || u?.id || 'profile',
                name: displayName,
                preview: '',
                time: '',
                profileImageUrl: getUserProfileImageUrl(u),
                ...(listingId ? {listingId, listingCategoryLabel: listingCategoryLabel || null} : {}),
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
        {currentScreen === screenName.companyProjects && companyProjectsContext && (
          <CompanyProjectsScreen
            companyId={companyProjectsContext.id}
            companyName={companyProjectsContext.name}
            onClose={() => {
              setCompanyProjectsContext(null);
              setCurrentScreen(screenName.selectedProjects);
            }}
            onOpenListing={listing => {
              setProfileReturnScreen(screenName.companyProjects);
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
              setProfileUser({
                ...listing,
                _fromCompanyProjects: true,
                subscription_id: listing.subscription_id || ctx?.id,
                owner_id: listing.owner_id || ctx?.id,
                business_name: listing.business_name || ctx?.name,
                creator_name: listing.creator_name || ctx?.name,
                creator_profile_image_url: companyPic,
                company_logo_url: listing.company_logo_url || ctx?.logo_url || null,
                profile_picture_url:
                  listing.profile_picture_url || ctx?.logo_url || null,
              });
              setCurrentScreen(screenName.userProfile);
            }}
          />
        )}
        {currentScreen === screenName.userProfile && (
          <UserProfileScreen
            onClose={() => setCurrentScreen(profileReturnScreen)}
            onCall={() => {}}
            onMessage={() => {
              const u = profileUser;
              const displayName = u?.creator_name || u?.name || u?.agent_name || u?.contact_person_name || u?.business_name || u?.broker_office_name || 'משתמש';
              const otherEmail = (u?.creator_email || u?.email || '').trim().toLowerCase() || null;
              const fromFeedListing = isAdsListingRecord(u);
              const listingId = fromFeedListing ? String(u.id).trim() : null;
              const listingCategoryLabel = fromFeedListing ? getChatListingCategoryLabel(u?.category) : null;
              const conversation = {
                id: otherEmail || u?.subscription_id || u?.id || 'profile',
                name: displayName,
                preview: '',
                time: '',
                profileImageUrl: getUserProfileImageUrl(u),
                ...(listingId ? {listingId, listingCategoryLabel: listingCategoryLabel || null} : {}),
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
            onOpenAllListings={() => setCurrentScreen(screenName.userListings)}
            onOpenFollowHub={tab => {
              setFollowHubInitialTab(tab || 'followers');
              setFollowHubReturnScreen(screenName.userProfile);
              setCurrentScreen(screenName.followHub);
            }}
            onOpenCompanyReport={openCompanyReportFromProfile}
            onOpenAllReviews={openProfileReviewsFromProfile}
            unreadChatCount={
              currentUser ? unreadChatCount + (piWelcomeRead ? 0 : 1) : 0
            }
          />
        )}
        {currentScreen === screenName.profileReviews && profileReviewsList && (
          <ProfileReviewsScreen
            reviews={profileReviewsList}
            onClose={closeProfileReviewsList}
          />
        )}
        {currentScreen === screenName.companyReport && companyReportPayload && (
          <CompanyReportScreen
            reportedSubscriptionId={companyReportPayload.reportedSubscriptionId}
            reportedListingId={companyReportPayload.reportedListingId}
            companyDisplayName={companyReportPayload.companyDisplayName}
            reportSubjectType={
              companyReportPayload.reportSubjectType === 'broker'
                ? 'broker'
                : companyReportPayload.reportSubjectType === 'professional'
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
        {currentScreen === screenName.followHub && (
          <FollowHubScreen
            onClose={() => setCurrentScreen(followHubReturnScreen)}
            currentUser={currentUser}
            profileUser={profileUser}
            initialTab={followHubInitialTab}
            onOpenUserProfile={openUserProfileFromFollowHubRow}
          />
        )}
        {currentScreen === screenName.userListings && (
          <UserListingsScreen
            creatorId={profileUser?.subscription_id || profileUser?.owner_id}
            displayName={profileUser?.creator_name || profileUser?.name || profileUser?.agent_name || profileUser?.business_name || ''}
            onClose={() => setCurrentScreen(screenName.userProfile)}
            onOpenListing={listing => {
              setProfileReturnScreen(screenName.userListings);
              setProfileUser(enrichListingForUserProfile(listing));
              setCurrentScreen(screenName.userProfile);
            }}
          />
        )}
        {currentScreen === screenName.cityFilter && (
          <CityFilterScreen
            initialFilter={feedFilters.city}
            selectedCategory={selectedCategory}
            onClose={() => setCurrentScreen(screenAfterFilter)}
            onSave={filter => {
              setFeedFilters(prev => ({
                ...prev,
                city: normalizeCityFeedFilter(filter),
              }));
              setCurrentScreen(screenAfterFilter);
            }}
          />
        )}
        {currentScreen === screenName.apartmentTypeFilter && (
          <ApartmentTypeFilterScreen
            initialFilter={feedFilters.apartmentType}
            selectedCategory={selectedCategory}
            onClose={() => setCurrentScreen(screenAfterFilter)}
            onSave={filter => {
              const raw = filter?.apartmentType;
              const next =
                raw == null ||
                raw === '' ||
                (Array.isArray(raw) && raw.length === 0)
                  ? null
                  : raw;
              setFeedFilters(prev => ({...prev, apartmentType: next}));
              setCurrentScreen(screenAfterFilter);
            }}
          />
        )}
        {currentScreen === screenName.roomsFilter && (
          <RoomsFilterScreen
            initialFilter={feedFilters.rooms}
            selectedCategory={selectedCategory}
            onClose={() => setCurrentScreen(screenAfterFilter)}
            onSave={filter => {
              setFeedFilters(prev => ({
                ...prev,
                rooms: normalizeRoomsFeedFilter(filter),
              }));
              setCurrentScreen(screenAfterFilter);
            }}
          />
        )}
        {currentScreen === screenName.priceFilter && (
          <PriceFilterScreen
            initialFilter={feedFilters.price}
            selectedCategory={selectedCategory}
            onClose={() => setCurrentScreen(screenAfterFilter)}
            onSave={filter => {
              setFeedFilterKey('price', filter);
              setCurrentScreen(screenAfterFilter);
            }}
          />
        )}
        {currentScreen === screenName.typeFilter && (
          <TypeFilterScreen
            initialFilter={feedFilters.type}
            selectedCategory={selectedCategory}
            onClose={() => setCurrentScreen(screenAfterFilter)}
            onSave={filter => {
              setFeedFilterKey('type', filter?.type ?? null);
              setCurrentScreen(screenAfterFilter);
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
                        : o.minArea ?? 50,
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
            onClose={() => setCurrentScreen(screenAfterFilter)}
            onSave={filter => {
              setFeedFilterKey('office', filter ?? null);
              setFeedFilterKey('meter', null);
              setCurrentScreen(screenAfterFilter);
            }}
          />
        )}
        {currentScreen === screenName.meterFilter && (
          <MeterFilterScreen
            initialFilter={feedFilters.meter != null ? {meter: feedFilters.meter} : null}
            onClose={() => setCurrentScreen(screenAfterFilter)}
            onSave={filter => {
              setFeedFilterKey('meter', filter?.meter ?? null);
              setCurrentScreen(screenAfterFilter);
            }}
          />
        )}
        {currentScreen === screenName.donamFilter && (
          <DonamFilterScreen
            initialFilter={feedFilters.donam}
            onClose={() => setCurrentScreen(screenAfterFilter)}
            onSave={filter => {
              setFeedFilterKey(
                'donam',
                filter && (filter.minDonam != null || filter.maxDonam != null)
                  ? filter
                  : null,
              );
              setCurrentScreen(screenAfterFilter);
            }}
          />
        )}
        {currentScreen === screenName.preferencesFilter && (
          <PreferencesFilterScreen
            initialFilter={feedFilters.preferences}
            onClose={() => setCurrentScreen(screenAfterFilter)}
            onSave={filter => {
              setFeedFilterKey('preferences', filter ?? null);
              setCurrentScreen(screenAfterFilter);
            }}
          />
        )}
        {currentScreen === screenName.postEditor && (
          <PostEditorScreen
            publishTarget={postEditorConfig.publishTarget}
            selectedCategory={selectedCategory}
            publishCategoryId={postEditorConfig.listingCategoryId}
            currentUser={currentUser}
            onClose={() =>
              setCurrentScreen(postEditorConfig.returnScreen)
            }
            onPublish={() => {
              if (postEditorConfig.publishTarget === 'post') {
                setTimeout(() => {
                  setTikTokFeedRefreshKey(prev => prev + 1);
                }, 800);
              }
            }}
          />
        )}
        {currentScreen === screenName.adsForm && (
          <AdsForm
            initialCategory={selectedCategory}
            initialListing={editingListing}
            initialBnbHostType={editingListing ? null : bnbPublishHostType}
            onOpenPostEditor={listingCategoryId => {
              if (!currentUser) {
                setReturnToScreenAfterAuth('adsForm');
                setCurrentScreen(screenName.userRegistration);
                return;
              }
              const n =
                listingCategoryId != null &&
                String(listingCategoryId).trim() !== ''
                  ? parseInt(String(listingCategoryId).trim(), 10)
                  : NaN;
              const listingCat =
                Number.isFinite(n) && n > 0 ? n : null;
              setPostEditorConfig({
                publishTarget: 'post',
                returnScreen: screenName.adsForm,
                listingCategoryId: listingCat,
              });
              if (listingCat != null) {
                setSelectedCategory(String(listingCat));
              }
              setCurrentScreen(screenName.postEditor);
            }}
            onClose={() => {
              setBnbPublishHostType(null);
              if (editingListing) {
                setEditingListing(null);
                setCurrentScreen(screenName.editPublishAd);
              } else {
                setCurrentScreen(screenName.tikTokFeed);
              }
            }}
            onPublish={async listingData => {
              const wasEditing = !!editingListing;
              if (
                listingData.category &&
                listingData.category !== selectedCategory
              ) {
                setSelectedCategory(listingData.category.toString());
              }
              const images = [];
              if (listingData.mainImage) images.push(listingData.mainImage);
              if (listingData.additionalImages?.length) images.push(...listingData.additionalImages);
              setUploadedListings(prev => [
                ...prev,
                {
                  id: listingData.id,
                  category: listingData.category,
                  images,
                  price: listingData.price ?? listingData.budget,
                },
              ]);
              setEditingListing(null);
              setTimeout(() => setTikTokFeedRefreshKey(prev => prev + 1), 1500);
              setCurrentScreen(wasEditing ? screenName.editPublishAd : screenName.tikTokFeed);
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
              if (listingData.additionalImages?.length) images.push(...listingData.additionalImages);
              setUploadedListings(prev => [
                ...prev,
                {
                  id: listingData.id,
                  category: listingData.category,
                  images,
                  price: listingData.price ?? listingData.budget,
                },
              ]);
              setTimeout(() => setTikTokFeedRefreshKey(prev => prev + 1), 1500);
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
            unreadChatCount={currentUser ? unreadChatCount + (piWelcomeRead ? 0 : 1) : 0}
            onOpenSubscription={type => {
              if (type === subscriptionTypes.company) {
                setCurrentScreen(screenName.subscriptionCompany);
              } else if (type === subscriptionTypes.professional) {
                setCurrentScreen(screenName.subscriptionProfessional);
              } else {
                setCurrentScreen(screenName.subscription);
              }
            }}
            onLogout={() => setCurrentUser(null)}
            onOpenLogin={() => setCurrentScreen(screenName.login)}
            onOpenSecretCodeRecovery={() => {
              if (!currentUser) {
                setReturnToScreenAfterAuth('settings');
                setCurrentScreen(screenName.userRegistration);
                return;
              }
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
              const openOwnProfile = async () => {
                let profilePayload = currentUser;
                try {
                  const mySubId = currentUser?.id ? String(currentUser.id).trim() : '';
                  if (mySubId) {
                    const res = await getListings({
                      status: 'published',
                      subscription_id: mySubId,
                    });
                    const myListings = Array.isArray(res?.listings)
                      ? res.listings.filter(
                          item => String(item?.subscription_id || '').trim() === mySubId,
                        )
                      : [];
                    const top = pickTopViewedListingForProfile(myListings);
                    if (top) {
                      const base = {
                        ...top,
                        subscription_id: top.subscription_id || mySubId,
                        owner_id: top.owner_id || mySubId,
                        creator_name:
                          top.creator_name ||
                          currentUser?.name ||
                          currentUser?.contact_person_name ||
                          currentUser?.business_name ||
                          currentUser?.broker_office_name ||
                          null,
                        creator_email:
                          top.creator_email ||
                          (currentUser?.email
                            ? String(currentUser.email).trim().toLowerCase()
                            : null),
                        creator_profile_image_url:
                          top.creator_profile_image_url ||
                          currentUser?.profile_picture_url ||
                          currentUser?.company_logo_url ||
                          null,
                        profile_picture_url:
                          top.profile_picture_url ||
                          currentUser?.profile_picture_url ||
                          currentUser?.company_logo_url ||
                          null,
                        company_logo_url:
                          top.company_logo_url || currentUser?.company_logo_url || null,
                        subscription_type:
                          top.subscription_type || currentUser?.subscription_type || null,
                      };
                      profilePayload = {
                        ...enrichListingForUserProfile(base),
                        _fromTikTokPost: true,
                      };
                    }
                  }
                } catch (_) {
                  // Fallback to currentUser payload if listings request fails.
                }
                setProfileReturnScreen(screenName.settings);
                setProfileUser(profilePayload);
                setCurrentScreen(screenName.userProfile);
              };
              openOwnProfile();
            }}
          />
        )}
        {currentScreen === screenName.termsOfUse && (
          <TermsOfUseScreen onClose={() => setCurrentScreen(screenName.settings)} />
        )}
        {currentScreen === screenName.accessibilityStatement && (
          <AccessibilityStatementScreen
            onClose={() => setCurrentScreen(screenName.settings)}
          />
        )}
        {currentScreen === screenName.feedbackSuggestion && (
          <FeedbackSuggestionScreen onClose={() => setCurrentScreen(screenName.settings)} />
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
            onClose={() => setCurrentScreen(screenName.settings)}
            onSent={em => {
              setSecretRecoveryEmail(em);
              setCurrentScreen(screenName.secretCodeRecoverySent);
            }}
          />
        )}
        {currentScreen === screenName.secretCodeRecoverySent && (
          <SecretCodeRecoverySentScreen
            email={secretRecoveryEmail}
            onBack={() => setCurrentScreen(screenName.settings)}
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
            onClose={() => {
              setBnbPublishHostType(null);
              setEditPublishSourceCategory(null);
              setCurrentScreen(screenName.settings);
            }}
            uploadedListings={uploadedListings}
            currentUser={currentUser}
            initialCategoryId={
              editPublishSourceCategory != null
                ? Number(editPublishSourceCategory)
                : selectedCategory
                  ? parseInt(selectedCategory, 10)
                  : 8
            }
            onOpenListingAnalysis={() => setCurrentScreen(screenName.listingAnalysis)}
            onCreateAd={(categoryId, opts) => {
              setSelectedCategory(String(categoryId));
              setEditPublishSourceCategory(Number(categoryId));
              setBnbPublishHostType(opts?.bnbHostType ?? null);
              setCurrentScreen(screenName.adsForm);
            }}
            onCreatePost={categoryId => {
              const n =
                categoryId != null && String(categoryId).trim() !== ''
                  ? parseInt(String(categoryId).trim(), 10)
                  : NaN;
              const listingCat =
                Number.isFinite(n) && n > 0 ? n : null;
              if (listingCat != null) {
                setSelectedCategory(String(listingCat));
              }
              setPostEditorConfig({
                publishTarget: 'post',
                returnScreen: screenName.editPublishAd,
                listingCategoryId: listingCat,
              });
              setCurrentScreen(screenName.postEditor);
            }}
            onEditAd={listing => {
              setBnbPublishHostType(null);
              setEditPublishSourceCategory(null);
              if (listing?.category != null) setSelectedCategory(String(listing.category));
              setEditingListing(listing ?? null);
              setCurrentScreen(screenName.adsForm);
            }}
            onBoost={listing => {
              if (typeof alert !== 'undefined') alert('הקפצה – יישום בהמשך');
            }}
            onShare={listing => {
              setSharedListingForChat(listing ?? null);
              setChatReturnScreen(screenName.editPublishAd);
              setCurrentScreen(screenName.chat);
            }}
            onFreeze={async listing => {
              try {
                const { updateListingFreeze } = await import('./utils/api');
                await updateListingFreeze(listing?.id ?? listing?.ad_number, true);
              } catch (e) {
                if (typeof alert !== 'undefined') alert(e?.message || 'שגיאה בהקפאת המודעה');
              }
            }}
            onUnfreeze={async listing => {
              try {
                const { updateListingFreeze } = await import('./utils/api');
                await updateListingFreeze(listing?.id ?? listing?.ad_number, false);
              } catch (e) {
                if (typeof alert !== 'undefined') alert(e?.message || 'שגיאה בביטול הקפאה');
              }
            }}
            onRemove={listing => {
              if (typeof alert !== 'undefined') alert('הסרה – יישום בהמשך');
            }}
          />
        )}
        {currentScreen === screenName.chatList && (
          <ChatListScreen
            onClose={() => {
              resetFeedFilters();
              setCurrentScreen(screenName.home);
            }}
            currentUser={currentUser}
            refreshKey={chatListRefreshKey}
            onOpenChat={conv => {
              setSelectedConversation(conv);
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
              setCurrentScreen(chatReturnScreen);
            }}
            sharedListing={sharedListingForChat}
            conversation={selectedConversation}
            currentUser={currentUser}
            onMessageSent={() => setChatListRefreshKey(k => k + 1)}
            onOpenPost={() => {
              setSharedListingForChat(null);
              setSelectedConversation(null);
              setChatListRefreshKey(k => k + 1);
              setCurrentScreen(screenName.tikTokFeed);
            }}
            onPiWelcomeOpened={async () => {
              setPiWelcomeRead(true);
              if (currentUser) {
                try {
                  await AsyncStorage.setItem(piWelcomeReadKey(currentUser), 'true');
                } catch (_) {}
              }
            }}
          />
        )}
        {currentScreen === screenName.login && (
          <LoginScreen
            onClose={() => {
              setReturnToScreenAfterAuth(null);
              setCurrentScreen(screenName.settings);
            }}
            onSkipToHome={() => {
              setReturnToScreenAfterAuth(null);
              setCurrentScreen(screenName.home);
            }}
            onLoginSuccess={subscription => {
              setCurrentUser(subscription);
              if (returnToScreenAfterAuth === 'userProfile') {
                setReturnToScreenAfterAuth(null);
                setCurrentScreen(screenName.userProfile);
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
              if (back === 'userProfile') {
                setCurrentScreen(screenName.userProfile);
              } else if (back === 'home') {
                setCurrentScreen(screenName.home);
              } else if (back === 'settings') {
                setCurrentScreen(screenName.settings);
              } else if (back === 'tikTokFeed') {
                setCurrentScreen(screenName.tikTokFeed);
              } else if (back === 'favorites') {
                setCurrentScreen(screenName.favorites);
              } else {
                setCurrentScreen(screenName.adsForm);
              }
            }}
            onCancel={() => {
              const back = returnToScreenAfterAuth;
              setReturnToScreenAfterAuth(null);
              if (back === 'home') {
                setCurrentScreen(screenName.home);
              } else if (back === 'settings') {
                setCurrentScreen(screenName.settings);
              } else if (back === 'favorites') {
                setCurrentScreen(screenName.favorites);
              } else if (back === 'adsForm') {
                setCurrentScreen(screenName.adsForm);
              } else {
                setCurrentScreen(screenName.tikTokFeed);
              }
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
            onStart={() => setCurrentScreen(screenName.subscriptionFormCompany)}
            subscriptionType={subscriptionTypes.company}
            currentUser={currentUser}
          />
        )}
        {currentScreen === screenName.subscriptionProfessional && (
          <SubscriptionScreen
            onClose={() => setCurrentScreen(screenName.settings)}
            onStart={() => setCurrentScreen(screenName.subscriptionFormProfessional)}
            subscriptionType={subscriptionTypes.professional}
            currentUser={currentUser}
          />
        )}
        {currentScreen === screenName.subscriptionForm && (
          <SubscriptionFormScreen
            onClose={() => setCurrentScreen(screenName.subscription)}
            onNext={(subscriptionId, email, verificationCode, localProfileImage) => {
              setSubscriptionData({subscriptionId, email, verificationCode, localProfileImage});
              setCurrentScreen(screenName.verification);
            }}
            subscriptionType={subscriptionTypes.broker}
          />
        )}
        {currentScreen === screenName.subscriptionFormCompany && (
          <SubscriptionFormScreen
            onClose={() => setCurrentScreen(screenName.subscriptionCompany)}
            onNext={(subscriptionId, email, verificationCode, localProfileImage) => {
              setSubscriptionData({subscriptionId, email, verificationCode, localProfileImage});
              setCurrentScreen(screenName.verificationCompany);
            }}
            subscriptionType={subscriptionTypes.company}
          />
        )}
        {currentScreen === screenName.subscriptionFormProfessional && (
          <SubscriptionFormScreen
            onClose={() => setCurrentScreen(screenName.subscriptionProfessional)}
            onNext={(subscriptionId, email, verificationCode, localProfileImage) => {
              setSubscriptionData({subscriptionId, email, verificationCode, localProfileImage});
              setCurrentScreen(screenName.verificationProfessional);
            }}
            subscriptionType={subscriptionTypes.professional}
          />
        )}
        {currentScreen === screenName.verification && (
          <VerificationScreen
            onClose={() => setCurrentScreen(screenName.subscriptionForm)}
            onNext={() => setCurrentScreen(screenName.verificationCode)}
            onSkipVerifiedTest={subscription => {
              setSubscriptionData(prev => ({ ...prev, subscription }));
              setCurrentScreen(screenName.ratingIntro);
            }}
            subscriptionType={subscriptionTypes.broker}
            email={subscriptionData?.email}
            subscriptionId={subscriptionData?.subscriptionId}
          />
        )}
        {currentScreen === screenName.verificationCompany && (
          <VerificationScreen
            onClose={() => setCurrentScreen(screenName.subscriptionFormCompany)}
            onNext={() => setCurrentScreen(screenName.verificationCodeCompany)}
            onSkipVerifiedTest={subscription => {
              setSubscriptionData(prev => ({ ...prev, subscription }));
              setCurrentScreen(screenName.ratingIntroCompany);
            }}
            subscriptionType={subscriptionTypes.company}
            email={subscriptionData?.email}
            subscriptionId={subscriptionData?.subscriptionId}
          />
        )}
        {currentScreen === screenName.verificationProfessional && (
          <VerificationScreen
            onClose={() =>
              setCurrentScreen(screenName.subscriptionFormProfessional)
            }
            onNext={() =>
              setCurrentScreen(screenName.verificationCodeProfessional)
            }
            onSkipVerifiedTest={subscription => {
              setSubscriptionData(prev => ({ ...prev, subscription }));
              setCurrentScreen(screenName.ratingIntroProfessional);
            }}
            subscriptionType={subscriptionTypes.professional}
            email={subscriptionData?.email}
            subscriptionId={subscriptionData?.subscriptionId}
          />
        )}
        {currentScreen === screenName.verificationCode && (
          <VerificationCodeScreen
            onClose={() => setCurrentScreen(screenName.verification)}
            onNext={subscription => {
              setSubscriptionData(prev => ({ ...prev, subscription }));
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
              setSubscriptionData(prev => ({ ...prev, subscription }));
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
              setSubscriptionData(prev => ({ ...prev, subscription }));
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
            onClose={() => setCurrentScreen(screenName.verificationCodeCompany)}
            onContinue={() => setCurrentScreen(screenName.successCompany)}
            subscriptionType={subscriptionTypes.company}
          />
        )}
        {currentScreen === screenName.ratingIntroProfessional && (
          <SubscriptionRatingIntroScreen
            onClose={() =>
              setCurrentScreen(screenName.verificationCodeProfessional)
            }
            onContinue={() => setCurrentScreen(screenName.successProfessional)}
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
            onClose={() => setCurrentScreen(screenName.verificationCodeCompany)}
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
      </View>
      </SafeAreaProvider>
      </PresenceProvider>
    </ContextHook.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1d27',
  },
});
