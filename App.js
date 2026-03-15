import React, {useState, useEffect, useRef} from 'react';
import {StyleSheet, View, ActivityIndicator} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AdsForm,
  HomeScreen,
  Home,
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
  MeterFilterScreen,
  DonamFilterScreen,
  PreferencesFilterScreen,
  EditPublishAdScreen,
  ChatScreen,
  ChatListScreen,
  UserProfileScreen,
  SubscriptionScreen,
  SubscriptionFormScreen,
  VerificationScreen,
  VerificationCodeScreen,
  LoginScreen,
  UserRegistrationScreen,
} from './screens';
import {ContextHook} from './hooks/ContextHook';
import {subscriptionTypes} from './utils/constant';
import {getChatUnreadCount} from './utils/api';
import {useFonts} from 'expo-font';
import {fonts} from './utils/fonts';

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
  editPublishAd: 'editPublishAd',
  chatList: 'chatList',
  chat: 'chat',
  userProfile: 'userProfile',
};

/**
 * Main App Component
 * Entry point for the PI Real Estate application
 */
export default function App() {
  const [fontsLoaded] = useFonts(fonts);
  const [currentScreen, setCurrentScreen] = useState(screenName.login);
  const [subscriptionData, setSubscriptionData] = useState(null); // Store subscription data between screens
  const [currentUser, setCurrentUser] = useState(null); // Store current logged-in user data
  const [uploadedListings, setUploadedListings] = useState([]); // Store uploaded listings for TikTok feed (temporary, for immediate display)
  const [selectedCategory, setSelectedCategory] = useState(null); // Store selected category for TikTok feed
  const [editingListing, setEditingListing] = useState(null); // When editing an ad from EditPublishAdScreen
  const [sharedListingForChat, setSharedListingForChat] = useState(null); // When opening chat from share
  const [chatReturnScreen, setChatReturnScreen] = useState(screenName.settings); // Where to return when closing chat
  const [selectedConversation, setSelectedConversation] = useState(null); // Conversation opened from chat list
  const [unreadChatCount, setUnreadChatCount] = useState(0); // Unread message count for chat badge (real messages only)
  const [piWelcomeRead, setPiWelcomeRead] = useState(false); // Until user opens Pi welcome once, count it as 1 unread
  const lastOpenedChatAtRef = useRef(null); // ISO timestamp; unread = messages after this
  const [tikTokFeedRefreshKey, setTikTokFeedRefreshKey] = useState(0); // Force refresh of TikTok feed
  const [profileUser, setProfileUser] = useState(null); // User to show on UserProfileScreen when opened from feed
  const [chatListRefreshKey, setChatListRefreshKey] = useState(0); // Bump when sending a message so chat list refetches
  // Feed filters (price, rooms, city, apartment type) – applied client-side in TikTokFeedScreen
  const [feedFilters, setFeedFilters] = useState({
    price: null,       // null | { minPrice, maxPrice }
    rooms: null,       // null | { area, rooms, floor, parking, balcony, elevator, mamad }
    city: null,        // null | { purpose, city, street, distanceKm, immediateEntry }
    apartmentType: null, // null | string (apartment type id)
    type: null,          // null | string (global category "סוג" type id)
    meter: null,         // null | number (מסחר category: min sq meters)
    donam: null,         // null | { minDonam, maxDonam } for קרקעות
    preferences: null,   // null | object { gender, ageMin, ageMax, nonSmoker, students, ... }
  });

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

  // Fetch unread count (messages after last opened chat) when on settings so the badge is correct
  useEffect(() => {
    if (!currentUser?.id || currentScreen !== screenName.settings) return;
    const after = lastOpenedChatAtRef.current || undefined;
    const email = currentUser?.email ? String(currentUser.email).trim().toLowerCase() : null;
    if (email) getChatUnreadCount(email, after).then(({ count }) => setUnreadChatCount(count));
  }, [currentUser?.email, currentScreen]);

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

  return (
    <ContextHook.Provider value={{currentUser, setCurrentUser}}>
      <View style={styles.container}>
        {currentScreen === screenName.home && (
          <Home
            onOpenSettings={() => setCurrentScreen(screenName.settings)}
            onOpenTikTokFeed={category => {
              setSelectedCategory(category);
              setCurrentScreen(screenName.tikTokFeed);
            }}
          />
        )}
        {currentScreen === screenName.tikTokFeed && (
          <TikTokFeedScreen
            key={tikTokFeedRefreshKey} // Force remount when refreshKey changes
            onClose={() => {
              setSelectedCategory(null);
              setCurrentScreen(screenName.home);
            }}
            onOpenOfficeListing={category => {
              if (category) setSelectedCategory(category);
              if (!currentUser) {
                setCurrentScreen(screenName.userRegistration);
              } else {
                setCurrentScreen(screenName.adsForm);
              }
            }}
            onOpenEditPublishAdWithCategory={category => {
              if (category != null) setSelectedCategory(String(category));
              setCurrentScreen(screenName.editPublishAd);
            }}
            onOpenPostEditor={category => {
              if (category) setSelectedCategory(category);
              setCurrentScreen(screenName.postEditor);
            }}
            onOpenCityFilter={() => setCurrentScreen(screenName.cityFilter)}
            onOpenApartmentTypeFilter={() => setCurrentScreen(screenName.apartmentTypeFilter)}
            onOpenTypeFilter={() => setCurrentScreen(screenName.typeFilter)}
            onOpenRoomsFilter={() => setCurrentScreen(screenName.roomsFilter)}
            onOpenMeterFilter={() => setCurrentScreen(screenName.meterFilter)}
            onOpenDonamFilter={() => setCurrentScreen(screenName.donamFilter)}
            onOpenPreferencesFilter={() => setCurrentScreen(screenName.preferencesFilter)}
            onOpenPriceFilter={() => setCurrentScreen(screenName.priceFilter)}
            onOpenUserProfile={user => {
              setProfileUser(user);
              setCurrentScreen(screenName.userProfile);
            }}
            uploadedListings={uploadedListings}
            selectedCategory={selectedCategory}
            feedFilters={feedFilters}
            currentUser={currentUser}
          />
        )}
        {currentScreen === screenName.userProfile && (
          <UserProfileScreen
            onClose={() => setCurrentScreen(screenName.tikTokFeed)}
            onCall={() => {}}
            onMessage={() => {
              const u = profileUser;
              const displayName = u?.creator_name || u?.name || u?.agent_name || u?.contact_person_name || u?.business_name || u?.broker_office_name || 'משתמש';
              const otherEmail = (u?.creator_email || u?.email || '').trim().toLowerCase() || null;
              const conversation = {
                id: otherEmail || u?.subscription_id || u?.id || 'profile',
                name: displayName,
                preview: '',
                time: '',
                profileImageUrl: u?.profileImageUrl || u?.profile_image_url || u?.creator_profile_image_url || null,
              };
              setSelectedConversation(conversation);
              setChatReturnScreen(screenName.userProfile);
              setCurrentScreen(screenName.chat);
            }}
            user={profileUser}
          />
        )}
        {currentScreen === screenName.cityFilter && (
          <CityFilterScreen
            initialFilter={feedFilters.city}
            onClose={() => setCurrentScreen(screenName.tikTokFeed)}
            onSave={filter => {
              setFeedFilters(prev => ({...prev, city: filter}));
              setCurrentScreen(screenName.tikTokFeed);
            }}
          />
        )}
        {currentScreen === screenName.apartmentTypeFilter && (
          <ApartmentTypeFilterScreen
            initialFilter={feedFilters.apartmentType}
            onClose={() => setCurrentScreen(screenName.tikTokFeed)}
            onSave={filter => {
              setFeedFilters(prev => ({...prev, apartmentType: filter?.apartmentType ?? null}));
              setCurrentScreen(screenName.tikTokFeed);
            }}
          />
        )}
        {currentScreen === screenName.roomsFilter && (
          <RoomsFilterScreen
            initialFilter={feedFilters.rooms}
            onClose={() => setCurrentScreen(screenName.tikTokFeed)}
            onSave={filter => {
              setFeedFilters(prev => ({...prev, rooms: filter}));
              setCurrentScreen(screenName.tikTokFeed);
            }}
          />
        )}
        {currentScreen === screenName.priceFilter && (
          <PriceFilterScreen
            initialFilter={feedFilters.price}
            onClose={() => setCurrentScreen(screenName.tikTokFeed)}
            onSave={filter => {
              setFeedFilters(prev => ({...prev, price: filter}));
              setCurrentScreen(screenName.tikTokFeed);
            }}
          />
        )}
        {currentScreen === screenName.typeFilter && (
          <TypeFilterScreen
            initialFilter={feedFilters.type}
            onClose={() => setCurrentScreen(screenName.tikTokFeed)}
            onSave={filter => {
              setFeedFilters(prev => ({...prev, type: filter?.type ?? null}));
              setCurrentScreen(screenName.tikTokFeed);
            }}
          />
        )}
        {currentScreen === screenName.meterFilter && (
          <MeterFilterScreen
            initialFilter={feedFilters.meter != null ? {meter: feedFilters.meter} : null}
            onClose={() => setCurrentScreen(screenName.tikTokFeed)}
            onSave={filter => {
              setFeedFilters(prev => ({...prev, meter: filter?.meter ?? null}));
              setCurrentScreen(screenName.tikTokFeed);
            }}
          />
        )}
        {currentScreen === screenName.donamFilter && (
          <DonamFilterScreen
            initialFilter={feedFilters.donam}
            onClose={() => setCurrentScreen(screenName.tikTokFeed)}
            onSave={filter => {
              setFeedFilters(prev => ({...prev, donam: filter && (filter.minDonam != null || filter.maxDonam != null) ? filter : null}));
              setCurrentScreen(screenName.tikTokFeed);
            }}
          />
        )}
        {currentScreen === screenName.preferencesFilter && (
          <PreferencesFilterScreen
            initialFilter={feedFilters.preferences}
            onClose={() => setCurrentScreen(screenName.tikTokFeed)}
            onSave={filter => {
              setFeedFilters(prev => ({...prev, preferences: filter ?? null}));
              setCurrentScreen(screenName.tikTokFeed);
            }}
          />
        )}
        {currentScreen === screenName.postEditor && (
          <PostEditorScreen
            selectedCategory={selectedCategory}
            currentUser={currentUser}
            onClose={() => setCurrentScreen(screenName.tikTokFeed)}
            onPublish={async () => {
              setCurrentScreen(screenName.tikTokFeed);
              setTimeout(() => {
                setTikTokFeedRefreshKey(prev => prev + 1);
              }, 800);
            }}
          />
        )}
        {currentScreen === screenName.adsForm && (
          <AdsForm
            initialCategory={selectedCategory}
            initialListing={editingListing}
            onClose={() => {
              if (editingListing) {
                setEditingListing(null);
                setCurrentScreen(screenName.editPublishAd);
              } else {
                setCurrentScreen(screenName.tikTokFeed);
              }
            }}
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
              setEditingListing(null);
              setTimeout(() => setTikTokFeedRefreshKey(prev => prev + 1), 1500);
              setCurrentScreen(editingListing ? screenName.editPublishAd : screenName.tikTokFeed);
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
            onOpenEditPublishAd={() => setCurrentScreen(screenName.editPublishAd)}
            onOpenChat={async () => {
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
          />
        )}
        {currentScreen === screenName.editPublishAd && (
          <EditPublishAdScreen
            onClose={() => setCurrentScreen(screenName.settings)}
            uploadedListings={uploadedListings}
            currentUser={currentUser}
            initialCategoryId={selectedCategory ? parseInt(selectedCategory, 10) : 8}
            onCreateAd={categoryId => {
              setSelectedCategory(String(categoryId));
              setCurrentScreen(screenName.adsForm);
            }}
            onEditAd={listing => {
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
            onClose={() => setCurrentScreen(chatReturnScreen)}
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
            onClose={() => setCurrentScreen(screenName.settings)}
            onLoginSuccess={subscription => {
              setCurrentUser(subscription);
              setCurrentScreen(screenName.home);
            }}
          />
        )}
        {currentScreen === screenName.userRegistration && (
          <UserRegistrationScreen
            selectedCategory={selectedCategory}
            onSuccess={user => {
              setCurrentUser(user);
              setCurrentScreen(screenName.adsForm);
            }}
            onCancel={() => setCurrentScreen(screenName.tikTokFeed)}
            onOpenLogin={() => setCurrentScreen(screenName.login)}
          />
        )}
        {currentScreen === screenName.subscription && (
          <SubscriptionScreen
            onClose={() => setCurrentScreen(screenName.settings)}
            onStart={() => setCurrentScreen(screenName.subscriptionForm)}
            subscriptionType={subscriptionTypes.broker}
          />
        )}
        {currentScreen === screenName.subscriptionCompany && (
          <SubscriptionScreen
            onClose={() => setCurrentScreen(screenName.settings)}
            onStart={() => setCurrentScreen(screenName.subscriptionFormCompany)}
            subscriptionType={subscriptionTypes.company}
          />
        )}
        {currentScreen === screenName.subscriptionProfessional && (
          <SubscriptionScreen
            onClose={() => setCurrentScreen(screenName.settings)}
            onStart={() => setCurrentScreen(screenName.subscriptionFormProfessional)}
            subscriptionType={subscriptionTypes.professional}
          />
        )}
        {currentScreen === screenName.subscriptionForm && (
          <SubscriptionFormScreen
            onClose={() => setCurrentScreen(screenName.subscription)}
            onNext={(subscriptionId, email, verificationCode) => {
              setSubscriptionData({subscriptionId, email, verificationCode});
              setCurrentScreen(screenName.verification);
            }}
            subscriptionType={subscriptionTypes.broker}
          />
        )}
        {currentScreen === screenName.subscriptionFormCompany && (
          <SubscriptionFormScreen
            onClose={() => setCurrentScreen(screenName.subscriptionCompany)}
            onNext={(subscriptionId, email, verificationCode) => {
              setSubscriptionData({subscriptionId, email, verificationCode});
              setCurrentScreen(screenName.verificationCompany);
            }}
            subscriptionType={subscriptionTypes.company}
          />
        )}
        {currentScreen === screenName.subscriptionFormProfessional && (
          <SubscriptionFormScreen
            onClose={() => setCurrentScreen(screenName.subscriptionProfessional)}
            onNext={(subscriptionId, email, verificationCode) => {
              setSubscriptionData({subscriptionId, email, verificationCode});
              setCurrentScreen(screenName.verificationProfessional);
            }}
            subscriptionType={subscriptionTypes.professional}
          />
        )}
        {currentScreen === screenName.verification && (
          <VerificationScreen
            onClose={() => setCurrentScreen(screenName.subscriptionForm)}
            onNext={() => setCurrentScreen(screenName.verificationCode)}
            subscriptionType={subscriptionTypes.broker}
            email={subscriptionData?.email}
            subscriptionId={subscriptionData?.subscriptionId}
          />
        )}
        {currentScreen === screenName.verificationCompany && (
          <VerificationScreen
            onClose={() => setCurrentScreen(screenName.subscriptionFormCompany)}
            onNext={() => setCurrentScreen(screenName.verificationCodeCompany)}
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
              setCurrentScreen(screenName.success);
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
              setCurrentScreen(screenName.successCompany);
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
              setCurrentScreen(screenName.successProfessional);
            }}
            subscriptionType={subscriptionTypes.professional}
            email={subscriptionData?.email}
            subscriptionId={subscriptionData?.subscriptionId}
          />
        )}
        {currentScreen === screenName.success && (
          <SuccessScreen
            onClose={() => setCurrentScreen(screenName.verificationCode)}
            onGoHome={() => {
              // Store user data after successful verification
              if (subscriptionData?.subscription) {
                setCurrentUser(subscriptionData.subscription);
              }
              setSubscriptionData(null);
              setCurrentScreen(screenName.home);
            }}
            onStartPublishing={() => {
              // Store user data after successful verification
              if (subscriptionData?.subscription) {
                setCurrentUser(subscriptionData.subscription);
              }
              setSubscriptionData(null);
              setCurrentScreen(screenName.home);
            }}
            subscriptionType={subscriptionTypes.broker}
            subscription={subscriptionData?.subscription}
          />
        )}
        {currentScreen === screenName.successCompany && (
          <SuccessScreen
            onClose={() => setCurrentScreen(screenName.verificationCodeCompany)}
            onGoHome={() => {
              // Store user data after successful verification
              if (subscriptionData?.subscription) {
                setCurrentUser(subscriptionData.subscription);
              }
              setSubscriptionData(null);
              setCurrentScreen(screenName.home);
            }}
            onStartPublishing={() => {
              // Store user data after successful verification
              if (subscriptionData?.subscription) {
                setCurrentUser(subscriptionData.subscription);
              }
              setSubscriptionData(null);
              setCurrentScreen(screenName.home);
            }}
            subscriptionType={subscriptionTypes.company}
            subscription={subscriptionData?.subscription}
          />
        )}
        {currentScreen === screenName.successProfessional && (
          <SuccessScreen
            onClose={() =>
              setCurrentScreen(screenName.verificationCodeProfessional)
            }
            onGoHome={() => {
              // Store user data after successful verification
              if (subscriptionData?.subscription) {
                setCurrentUser(subscriptionData.subscription);
              }
              setSubscriptionData(null);
              setCurrentScreen(screenName.home);
            }}
            onStartPublishing={() => {
              // Store user data after successful verification
              if (subscriptionData?.subscription) {
                setCurrentUser(subscriptionData.subscription);
              }
              setSubscriptionData(null);
              setCurrentScreen(screenName.home);
            }}
            subscriptionType={subscriptionTypes.professional}
            subscription={subscriptionData?.subscription}
          />
        )}
      </View>
    </ContextHook.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1d27',
  },
});
