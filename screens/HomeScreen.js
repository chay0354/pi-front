import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Menu1 from '../components/Menu1';
import MenuIcon from '../components/MenuIcon';
import Carusel from '../components/Carusel';
import Search from '../components/Search';
import SectionName from '../components/SectionName';
import Default from '../components/Default';
import ProfilePic from '../components/ProfilePic';
import { Colors, Spacing, Shadows } from '../constants/styles';

/**
 * HomeScreen Component
 * Main home screen with categories, featured projects, and professionals
 */
const HomeScreen = ({ onOpenSettings, onOpenTikTokFeed }) => {
  // Profile pictures data for professionals section
  const [profilePicItems] = useState([
    {
      badge: false,
      badgeAmount: '-',
      profilePic: '/avatar2.png',
      prop: '',
      profilePicFlex: '',
      profilePicMinWidth: '',
      profilePicWidth: '',
    },
    {
      badge: false,
      badgeAmount: '-',
      profilePic: '/avatar3.png',
      prop: '',
      profilePicFlex: '',
      profilePicMinWidth: '',
      profilePicWidth: '',
    },
    {
      badge: false,
      badgeAmount: '-',
      profilePic: '/avatar4.png',
      prop: '',
      profilePicFlex: '',
      profilePicMinWidth: '',
      profilePicWidth: '',
    },
    {
      badge: false,
      badgeAmount: '-',
      profilePic: '/avatar1.png',
      prop: '',
      profilePicFlex: '',
      profilePicMinWidth: '',
      profilePicWidth: '',
    },
    {
      badge: false,
      badgeAmount: '-',
      profilePic: '/profile-pic3@2x.png',
      prop: 'טקסט של\nשם הפרופיל',
      profilePicFlex: 'unset',
      profilePicMinWidth: 'unset',
      profilePicWidth: '78px',
    },
    {
      badge: false,
      badgeAmount: '-',
      profilePic: '/profile-pic3@2x.png',
      prop: 'אפרים הלוי\nעו״ד לנדל״ן',
      profilePicFlex: 'unset',
      profilePicMinWidth: 'unset',
      profilePicWidth: '78px',
    },
    {
      badge: false,
      badgeAmount: '-',
      profilePic: '/profile-pic3@2x.png',
      prop: 'תמר ברוך\nעיצוב פנים',
      profilePicFlex: 'unset',
      profilePicMinWidth: 'unset',
      profilePicWidth: '78px',
    },
    {
      badge: false,
      badgeAmount: '-',
      profilePic: '/profile-pic3@2x.png',
      prop: 'מור תיווך\nונדל״ן ',
      profilePicFlex: 'unset',
      profilePicMinWidth: 'unset',
      profilePicWidth: '78px',
    },
  ]);

  return (
    <ScrollView
      style={styles.homeScreen}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Section with Logo */}
      <View style={styles.frame}>
        <View style={styles.frame2}>
          <View style={styles.headerNavigation}>
            <Image
              source={require('../assets/logo@2x.png')}
              style={styles.logoIcon}
              resizeMode="contain"
            />
          </View>
          <View style={styles.menuContainer}>
            <Menu1 />
          </View>
          <TouchableOpacity 
            onPress={onOpenSettings} 
            style={styles.settingsButton}
          >
            <Text style={styles.settingsIcon}>✕</Text>
          </TouchableOpacity>
          <MenuIcon variant="ללא נוטיפיקציה" />
        </View>
      </View>

      {/* Category Carousel */}
      <TouchableOpacity 
        style={styles.carouselContainer}
        onPress={onOpenTikTokFeed}
        activeOpacity={0.8}
      >
        <Carusel property1="דירות" />
      </TouchableOpacity>

      {/* Content Sections */}
      <View style={styles.contentSections}>
        {/* Featured Projects Section */}
        <View style={styles.section4}>
          {/* Featured Projects Header */}
          <View style={styles.featuredProjectsHeader}>
            <Text style={styles.searchMoreText}>חפשו עוד</Text>
            <Text style={styles.featuredProjectsText}>פרוייקטים נבחרים</Text>
          </View>
          <View style={styles.wrapperProjectImage}>
            <Image
              source={require('../assets/image.png')}
              style={styles.projectImageIcon}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Professionals Section - Only profile pictures, no text */}
        <View style={styles.professionalsContent}>
          {/* Professionals Header */}
          <View style={styles.professionalsHeader}>
            <Text style={styles.searchMoreText2}>חפשו עוד</Text>
            <Text style={styles.professionalsText}>בעלי מקצוע בתחום הנדל״ן</Text>
          </View>
          <View style={styles.buttons}>
            {profilePicItems.slice(0, 4).map((item, index) => (
              <ProfilePic
                key={index}
                badge={item.badge}
                badgeAmount={item.badgeAmount}
                profilePic={item.profilePic}
                prop=""
                profilePicFlex={item.profilePicFlex}
                profilePicMinWidth={item.profilePicMinWidth}
                profilePicWidth={item.profilePicWidth}
              />
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  homeScreen: {
    width: '100%',
    flex: 1,
    backgroundColor: Colors.blue100,
    height: '100%',
    maxWidth: 414,
    alignSelf: 'center',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 18,
    paddingBottom: 20,
    minHeight: '100%',
    maxWidth: 414,
    alignSelf: 'center',
    width: '100%',
  },
  frame: {
    alignSelf: 'stretch',
    display: 'flex',
    alignItems: 'flex-start',
    paddingBottom: 3,
    width: '100%',
  },
  frame2: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 20,
    position: 'relative',
    gap: 1,
    backgroundColor: Colors.blue100,
  },
  headerNavigation: {
    alignSelf: 'stretch',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15.9,
    gap: 0,
    zIndex: 1,
    width: '100%',
  },
  logoIcon: {
    height: 100,
    width: 110,
    alignSelf: 'center',
  },
  menuContainer: {
    position: 'absolute',
    top: 20,
    right: 24,
    zIndex: 2,
  },
  settingsButton: {
    position: 'absolute',
    top: 7,
    right: 24,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  settingsIcon: {
    fontSize: 24,
    color: Colors.white100,
    fontWeight: '300',
  },
  carouselContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  contentSections: {
    alignSelf: 'stretch',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingTop: 14,
    gap: 32,
    width: '100%',
  },
  section4: {
    width: '100%',
    position: 'relative',
    maxWidth: 414,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 0,
    paddingBottom: 20,
    marginTop: -10,
    overflow: 'hidden',
  },
  featuredProjectsHeader: {
    width: '100%',
    maxWidth: 414,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  searchMoreText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.yellowIcons,
    textShadowColor: 'rgba(255, 196, 10, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  featuredProjectsText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  wrapperProjectImage: {
    width: '100%',
    maxWidth: 414,
    alignSelf: 'center',
    boxShadow: '0px 3.8px 67.1px rgba(0, 0, 0, 0.35)',
    borderRadius: 16,
    overflow: 'hidden',
    height: 257,
  },
  projectImageIcon: {
    width: '100%',
    height: 350,
    marginTop: -30,
  },
  professionalsContent: {
    width: '100%',
    maxWidth: 414,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingLeft: 0,
    gap: Spacing.m3,
    alignSelf: 'center',
    marginTop: -20,
  },
  professionalsHeader: {
    width: '100%',
    maxWidth: 414,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  searchMoreText2: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.yellowIcons,
    textShadowColor: 'rgba(255, 196, 10, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  professionalsText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  searchGroup: {
    alignSelf: 'stretch',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    paddingVertical: 5,
    paddingRight: 397.9,
    gap: 10,
  },
  sectionName: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4.3,
  },
  parent: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  div: {
    height: 13,
    width: 9,
    position: 'relative',
    display: 'none',
  },
  div2: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  asterisk: {
    fontSize: 12,
    color: Colors.yellowIcons,
  },
  div3: {
    position: 'relative',
    color: Colors.textSecondary,
    fontSize: 18,
    fontFamily: 'Rubik',
  },
  iconsagent: {
    height: 28,
    width: 28,
    position: 'relative',
    display: 'none',
  },
  buttons: {
    alignSelf: 'stretch',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    gap: 16,
    paddingHorizontal: 24,
    overflowX: 'scroll',
  },
});

export default HomeScreen;
