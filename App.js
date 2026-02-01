import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';
import SubscriptionScreen from './screens/SubscriptionScreen';
import SubscriptionFormScreen from './screens/SubscriptionFormScreen';
import VerificationScreen from './screens/VerificationScreen';
import VerificationCodeScreen from './screens/VerificationCodeScreen';
import SuccessScreen from './screens/SuccessScreen';
import LoginScreen from './screens/LoginScreen';
import TikTokFeedScreen from './screens/TikTokFeedScreen';
import OfficeListingScreen from './screens/OfficeListingScreen';

/**
 * Main App Component
 * Entry point for the PI Real Estate application
 */
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [subscriptionData, setSubscriptionData] = useState(null); // Store subscription data between screens
  const [currentUser, setCurrentUser] = useState(null); // Store current logged-in user data
  const [uploadedListings, setUploadedListings] = useState([]); // Store uploaded listings for TikTok feed (temporary, for immediate display)
  const [selectedCategory, setSelectedCategory] = useState(null); // Store selected category for TikTok feed
  const [tikTokFeedRefreshKey, setTikTokFeedRefreshKey] = useState(0); // Force refresh of TikTok feed
  
  // Load user data from localStorage on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedUser = localStorage.getItem('pi_current_user');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          console.log('Loaded user from localStorage:', user);
          setCurrentUser(user);
        }
      }
    } catch (error) {
      console.error('Error loading user from localStorage:', error);
    }
  }, []);
  
  // Save user data to localStorage whenever it changes
  useEffect(() => {
    if (currentUser) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('pi_current_user', JSON.stringify(currentUser));
          console.log('Saved user to localStorage:', currentUser);
        }
      } catch (error) {
        console.error('Error saving user to localStorage:', error);
      }
    } else {
      // Clear localStorage when currentUser is null
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem('pi_current_user');
          console.log('Cleared user from localStorage');
        }
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
  }, [currentUser]);
  
  // Debug logging
  useEffect(() => {
    console.log('Current screen:', currentScreen);
    console.log('Subscription data:', subscriptionData);
    console.log('Current user:', currentUser);
    if (currentUser) {
      console.log('Current user subscriber number:', currentUser.subscriber_number);
      console.log('Current user name:', currentUser.name || currentUser.agent_name || currentUser.contact_person_name);
      console.log('Current user email:', currentUser.email);
    }
  }, [currentScreen, subscriptionData, currentUser]);

  return (
    <View style={styles.container}>
      {currentScreen === 'home' && (
        <HomeScreen 
          onOpenSettings={() => setCurrentScreen('settings')}
          onOpenTikTokFeed={(category) => {
            setSelectedCategory(category);
            setCurrentScreen('tikTokFeed');
          }}
        />
      )}
      {currentScreen === 'tikTokFeed' && (
        <TikTokFeedScreen 
          key={tikTokFeedRefreshKey} // Force remount when refreshKey changes
          onClose={() => {
            setSelectedCategory(null);
            setCurrentScreen('home');
          }}
          onOpenOfficeListing={(category) => {
            // Store the category so OfficeListingScreen can use it
            if (category) {
              setSelectedCategory(category);
            }
            setCurrentScreen('officeListing');
          }}
          uploadedListings={uploadedListings}
          selectedCategory={selectedCategory}
        />
      )}
      {currentScreen === 'officeListing' && (
        <OfficeListingScreen 
          initialCategory={selectedCategory} // Pass the selected category
          onClose={() => setCurrentScreen('tikTokFeed')}
          onPublish={async (listingData) => {
            console.log('✅ Listing published, category:', listingData.category);
            console.log('📂 [App] Listing saved with category:', listingData.category, ', selectedCategory:', selectedCategory);
            // Listing is already saved to database via createListing API
            // Ensure selectedCategory matches the published listing's category
            if (listingData.category && listingData.category !== selectedCategory) {
              console.log('📂 [App] Updating selectedCategory from', selectedCategory, 'to', listingData.category);
              setSelectedCategory(listingData.category.toString());
            }
            // Trigger refresh of TikTok feed to show new listing
            // Small delay to ensure database has updated
            setTimeout(() => {
              console.log('🔄 Refreshing TikTok feed for category:', selectedCategory || listingData.category);
              setTikTokFeedRefreshKey(prev => prev + 1);
            }, 1500); // Increased delay to ensure DB is updated
            // Navigate back to TikTok feed with same category
            setCurrentScreen('tikTokFeed');
          }}
        />
      )}
      {currentScreen === 'settings' && (
        <SettingsScreen
          onClose={() => setCurrentScreen('home')}
          onOpenSubscription={(type) => {
            if (type === 'company') {
              setCurrentScreen('subscriptionCompany');
            } else if (type === 'professional') {
              setCurrentScreen('subscriptionProfessional');
            } else {
              setCurrentScreen('subscription');
            }
          }}
          currentUser={currentUser}
          onLogout={() => {
            setCurrentUser(null);
            console.log('User logged out from App');
          }}
          onOpenLogin={() => setCurrentScreen('login')}
        />
      )}
      {currentScreen === 'login' && (
        <LoginScreen
          onClose={() => setCurrentScreen('settings')}
          onLoginSuccess={(subscription) => {
            console.log('Login successful, setting current user:', subscription);
            setCurrentUser(subscription);
            setCurrentScreen('settings');
          }}
        />
      )}
      {currentScreen === 'subscription' && (
        <SubscriptionScreen
          onClose={() => setCurrentScreen('settings')}
          onStart={() => setCurrentScreen('subscriptionForm')}
          subscriptionType="broker"
        />
      )}
      {currentScreen === 'subscriptionCompany' && (
        <SubscriptionScreen
          onClose={() => setCurrentScreen('settings')}
          onStart={() => setCurrentScreen('subscriptionFormCompany')}
          subscriptionType="company"
        />
      )}
      {currentScreen === 'subscriptionProfessional' && (
        <SubscriptionScreen
          onClose={() => setCurrentScreen('settings')}
          onStart={() => setCurrentScreen('subscriptionFormProfessional')}
          subscriptionType="professional"
        />
      )}
      {currentScreen === 'subscriptionForm' && (
        <SubscriptionFormScreen
          onClose={() => setCurrentScreen('subscription')}
          onNext={(subscriptionId, email, verificationCode) => {
            setSubscriptionData({ subscriptionId, email, verificationCode });
            setCurrentScreen('verification');
          }}
          subscriptionType="broker"
        />
      )}
      {currentScreen === 'subscriptionFormCompany' && (
        <SubscriptionFormScreen
          onClose={() => setCurrentScreen('subscriptionCompany')}
          onNext={(subscriptionId, email, verificationCode) => {
            setSubscriptionData({ subscriptionId, email, verificationCode });
            setCurrentScreen('verificationCompany');
          }}
          subscriptionType="company"
        />
      )}
      {currentScreen === 'subscriptionFormProfessional' && (
        <SubscriptionFormScreen
          onClose={() => setCurrentScreen('subscriptionProfessional')}
          onNext={(subscriptionId, email, verificationCode) => {
            setSubscriptionData({ subscriptionId, email, verificationCode });
            setCurrentScreen('verificationProfessional');
          }}
          subscriptionType="professional"
        />
      )}
      {currentScreen === 'verification' && (
        <VerificationScreen
          onClose={() => setCurrentScreen('subscriptionForm')}
          onNext={() => setCurrentScreen('verificationCode')}
          subscriptionType="broker"
          email={subscriptionData?.email}
          subscriptionId={subscriptionData?.subscriptionId}
        />
      )}
      {currentScreen === 'verificationCompany' && (
        <VerificationScreen
          onClose={() => setCurrentScreen('subscriptionFormCompany')}
          onNext={() => setCurrentScreen('verificationCodeCompany')}
          subscriptionType="company"
          email={subscriptionData?.email}
          subscriptionId={subscriptionData?.subscriptionId}
        />
      )}
      {currentScreen === 'verificationProfessional' && (
        <VerificationScreen
          onClose={() => setCurrentScreen('subscriptionFormProfessional')}
          onNext={() => setCurrentScreen('verificationCodeProfessional')}
          subscriptionType="professional"
          email={subscriptionData?.email}
          subscriptionId={subscriptionData?.subscriptionId}
        />
      )}
      {currentScreen === 'verificationCode' && (
        <VerificationCodeScreen
          onClose={() => setCurrentScreen('verification')}
          onNext={(subscription) => {
            setSubscriptionData({ ...subscriptionData, subscription });
            setCurrentScreen('success');
          }}
          subscriptionType="broker"
          email={subscriptionData?.email}
          subscriptionId={subscriptionData?.subscriptionId}
        />
      )}
      {currentScreen === 'verificationCodeCompany' && (
        <VerificationCodeScreen
          onClose={() => setCurrentScreen('verificationCompany')}
          onNext={(subscription) => {
            setSubscriptionData({ ...subscriptionData, subscription });
            setCurrentScreen('successCompany');
          }}
          subscriptionType="company"
          email={subscriptionData?.email}
          subscriptionId={subscriptionData?.subscriptionId}
        />
      )}
      {currentScreen === 'verificationCodeProfessional' && (
        <VerificationCodeScreen
          onClose={() => setCurrentScreen('verificationProfessional')}
          onNext={(subscription) => {
            setSubscriptionData({ ...subscriptionData, subscription });
            setCurrentScreen('successProfessional');
          }}
          subscriptionType="professional"
          email={subscriptionData?.email}
          subscriptionId={subscriptionData?.subscriptionId}
        />
      )}
      {currentScreen === 'success' && (
        <SuccessScreen
          onClose={() => setCurrentScreen('verificationCode')}
          onGoHome={() => {
            // Store user data after successful verification
            if (subscriptionData?.subscription) {
              setCurrentUser(subscriptionData.subscription);
            }
            setSubscriptionData(null);
            setCurrentScreen('home');
          }}
          onStartPublishing={() => {
            // Store user data after successful verification
            if (subscriptionData?.subscription) {
              setCurrentUser(subscriptionData.subscription);
            }
            setSubscriptionData(null);
            setCurrentScreen('home');
          }}
          subscriptionType="broker"
          subscription={subscriptionData?.subscription}
        />
      )}
      {currentScreen === 'successCompany' && (
        <SuccessScreen
          onClose={() => setCurrentScreen('verificationCodeCompany')}
          onGoHome={() => {
            // Store user data after successful verification
            if (subscriptionData?.subscription) {
              console.log('Storing user data (company):', subscriptionData.subscription);
              setCurrentUser(subscriptionData.subscription);
            }
            setSubscriptionData(null);
            setCurrentScreen('home');
          }}
          onStartPublishing={() => {
            // Store user data after successful verification
            if (subscriptionData?.subscription) {
              console.log('Storing user data (company):', subscriptionData.subscription);
              setCurrentUser(subscriptionData.subscription);
            }
            setSubscriptionData(null);
            setCurrentScreen('home');
          }}
          subscriptionType="company"
          subscription={subscriptionData?.subscription}
        />
      )}
      {currentScreen === 'successProfessional' && (
        <SuccessScreen
          onClose={() => setCurrentScreen('verificationCodeProfessional')}
          onGoHome={() => {
            // Store user data after successful verification
            if (subscriptionData?.subscription) {
              console.log('Storing user data (professional):', subscriptionData.subscription);
              setCurrentUser(subscriptionData.subscription);
            }
            setSubscriptionData(null);
            setCurrentScreen('home');
          }}
          onStartPublishing={() => {
            // Store user data after successful verification
            if (subscriptionData?.subscription) {
              console.log('Storing user data (professional):', subscriptionData.subscription);
              setCurrentUser(subscriptionData.subscription);
            }
            setSubscriptionData(null);
            setCurrentScreen('home');
          }}
          subscriptionType="professional"
          subscription={subscriptionData?.subscription}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1d27',
  },
});
