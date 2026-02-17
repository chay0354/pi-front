import {
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
} from 'react-native';
import React, {useContext} from 'react';
import Carusel from '../components/Carusel';
import {ContextHook} from '../hooks/ContextHook';
import {
  brokerCategories,
  companyCategories,
  subscriptionTypes,
  userCategories,
} from '../utils/constant';
import ProfilePic from '../components/ProfilePic';
import {TouchableOpacity} from 'react-native';

const Home = ({onOpenSettings, onOpenTikTokFeed}) => {
  const {currentUser} = useContext(ContextHook);
  const categoriesList =
    currentUser?.subscription_type === subscriptionTypes.user
      ? userCategories
      : currentUser?.subscription_type === subscriptionTypes.broker
        ? brokerCategories
        : companyCategories;
  const profilePicItems = [
    {
      profilePic: require('../assets/userProfile.png'),
      name: 'עו״ד אבישג צוברי',
    },
    {
      profilePic: require('../assets/userProfile.png'),
      name: 'עו״ד אבישג צוברי',
    },
    {
      profilePic: require('../assets/userProfile.png'),
      name: 'עו״ד אבישג צוברי',
    },
    {
      profilePic: require('../assets/userProfile.png'),
      name: 'עו״ד אבישג צוברי',
    },
    {
      profilePic: require('../assets/userProfile.png'),
      name: 'עו״ד אבישג צוברי',
    },
    {
      profilePic: require('../assets/userProfile.png'),
      name: 'עו״ד אבישג צוברי',
    },
    {
      profilePic: require('../assets/userProfile.png'),
      name: 'עו״ד אבישג צוברי',
    },
    {
      profilePic: require('../assets/userProfile.png'),
      name: 'עו״ד אבישג צוברי',
    },
  ];
  return (
    <ImageBackground
      source={require('../assets/background.png')}
      style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity onPress={onOpenSettings}>
          <Image source={require('../assets/menu.png')} style={styles.menu} />
        </TouchableOpacity>
        <Image source={require('../assets/homeLogo.png')} style={styles.logo} />
        <View style={styles.content}>
          <Carusel
            onCategorySelect={category => {
              if (onOpenTikTokFeed) {
                onOpenTikTokFeed(category);
              }
            }}
          />
          <View style={[styles.profileBarHeader, {marginTop: 20}]}>
            <TouchableOpacity
              onPress={() => {
                console.log('חפשו עוד');
              }}
              style={styles.profileBarHeaderButton}>
              <Text style={styles.profileBarHeaderButtonText}>חפשו עוד</Text>
            </TouchableOpacity>
            <Text style={styles.profileBarHeaderText}>
              בעלי מקצוע בתחום הנדל״ן
            </Text>
          </View>
          <View style={styles.videoContainer}>
            <Image
              source={require('../assets/project_image.gif')}
              style={{width: '100%', height: '100%', borderRadius: 16}}
              resizeMode="cover"
            />
            <Image
              source={require('../assets/videoLogo.png')}
              style={styles.videoLogo}
            />
            <Image
              source={require('../assets/popular.png')}
              style={styles.popularLogo}
            />
          </View>
        </View>
        <View style={styles.profileBar}>
          <View style={styles.profileBarHeader}>
            <TouchableOpacity
              onPress={() => {
                console.log('חפשו עוד');
              }}
              style={styles.profileBarHeaderButton}>
              <Text style={styles.profileBarHeaderButtonText}>חפשו עוד</Text>
            </TouchableOpacity>
            <Text style={styles.profileBarHeaderText}>
              בעלי מקצוע בתחום הנדל״ן
            </Text>
          </View>
          <ScrollView
            horizontal
            contentContainerStyle={styles.profileListContentContainer}
            showsHorizontalScrollIndicator={false}>
            {profilePicItems.map((item, index) => (
              <ProfilePic key={index} item={item} />
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default Home;

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  menu: {
    alignSelf: 'flex-end',
    width: 28,
    height: 20,
    marginTop: 20,
    marginRight: 26,
  },
  safeArea: {
    flex: 1,
  },
  logo: {
    alignSelf: 'center',
    width: 130,
    height: 122,
    marginTop: -40,
    resizeMode: 'contain',
  },
  content: {
    flex: 1,
  },
  videoContainer: {
    flex: 1,
    marginHorizontal: 20,
  },
  videoLogo: {
    position: 'absolute',
    left: 10,
    top: 10,
    width: 45,
    height: 45,
    resizeMode: 'contain',
  },
  popularLogo: {
    position: 'absolute',
    right: -16,
    top: 5,
    width: 95,
    height: 48,
    resizeMode: 'contain',
  },
  profileBar: {
    paddingVertical: 10,
  },
  profileBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  profileBarHeaderButton: {
    paddingVertical: 5,
  },
  profileBarHeaderButtonText: {
    color: '#FFC40A',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
  },
  profileBarHeaderText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
  },
  profileListContentContainer: {
    gap: 17,
    paddingHorizontal: 20,
  },
});
