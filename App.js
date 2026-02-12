import React, {useState, useEffect} from 'react';
import {StyleSheet, View, ActivityIndicator} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AdsForm,
  HomeScreen,
  SettingsScreen,
  SuccessScreen,
  TikTokFeedScreen,
  OfficeListingScreen,
  PostEditorScreen,
  SubscriptionScreen,
  SubscriptionFormScreen,
  VerificationScreen,
  VerificationCodeScreen,
  LoginScreen,
  UserRegistrationScreen,
} from './screens';
import {ContextHook} from './hooks/ContextHook';
import {subscriptionTypes} from './utils/constant';
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
  const [tikTokFeedRefreshKey, setTikTokFeedRefreshKey] = useState(0); // Force refresh of TikTok feed

  // Load user data from AsyncStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('pi_current_user');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);
          setCurrentScreen(screenName.home);
          // setCurrentScreen(screenName.adsForm);
        } else {
          setCurrentScreen(screenName.login);
        }
      } catch (error) {
        setCurrentScreen(screenName.login);
      }
    };

    loadUser();
  }, []);

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
          <HomeScreen
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
            onOpenPostEditor={category => {
              if (category) setSelectedCategory(category);
              setCurrentScreen(screenName.postEditor);
            }}
            uploadedListings={uploadedListings}
            selectedCategory={selectedCategory}
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
            initialCategory={selectedCategory} // Pass the selected category
            onClose={() => setCurrentScreen(screenName.tikTokFeed)}
            onPublish={async listingData => {
              // Listing is already saved to database via createListing API
              // Ensure selectedCategory matches the published listing's category
              if (
                listingData.category &&
                listingData.category !== selectedCategory
              ) {
                setSelectedCategory(listingData.category.toString());
              }
              // Trigger refresh of TikTok feed to show new listing
              // Small delay to ensure database has updated
              setTimeout(() => {
                setTikTokFeedRefreshKey(prev => prev + 1);
              }, 1500); // Increased delay to ensure DB is updated
              // Navigate back to TikTok feed with same category
              setCurrentScreen(screenName.tikTokFeed);
            }}
          />
        )}
        {currentScreen === screenName.officeListing && (
          <OfficeListingScreen
            initialCategory={selectedCategory} // Pass the selected category
            onClose={() => setCurrentScreen(screenName.tikTokFeed)}
            onPublish={async listingData => {
              // Listing is already saved to database via createListing API
              // Ensure selectedCategory matches the published listing's category
              if (
                listingData.category &&
                listingData.category !== selectedCategory
              ) {
                setSelectedCategory(listingData.category.toString());
              }
              // Trigger refresh of TikTok feed to show new listing
              // Small delay to ensure database has updated
              setTimeout(() => {
                setTikTokFeedRefreshKey(prev => prev + 1);
              }, 1500); // Increased delay to ensure DB is updated
              // Navigate back to TikTok feed with same category
              setCurrentScreen(screenName.tikTokFeed);
            }}
          />
        )}
        {currentScreen === screenName.settings && (
          <SettingsScreen
            onClose={() => setCurrentScreen(screenName.home)}
            onOpenSubscription={type => {
              if (type === subscriptionTypes.company) {
                setCurrentScreen(screenName.subscriptionCompany);
              } else if (type === subscriptionTypes.professional) {
                setCurrentScreen(screenName.subscriptionProfessional);
              } else {
                setCurrentScreen(screenName.subscription);
              }
            }}
            onLogout={() => {
              setCurrentUser(null);
            }}
            onOpenLogin={() => setCurrentScreen(screenName.login)}
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
            onStart={() =>
              setCurrentScreen(screenName.subscriptionFormProfessional)
            }
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
            onClose={() =>
              setCurrentScreen(screenName.subscriptionProfessional)
            }
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
              setSubscriptionData({...subscriptionData, subscription});
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
              setSubscriptionData({...subscriptionData, subscription});
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
              setSubscriptionData({...subscriptionData, subscription});
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
