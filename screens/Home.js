import {
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import React, {useRef, useState, useCallback, useEffect} from 'react';
import Carusel from '../components/Carusel';
import {userCategories} from '../utils/constant';
import {TouchableOpacity, Pressable} from 'react-native';
import PiAiSearchModal from '../components/PiAiSearchModal';
import HomeStoryStrip from '../components/HomeStoryStrip';
import StoryViewerModal from '../components/StoryViewerModal';
import {getStoriesFeed, toSubscriptionId} from '../utils/api';

const TRIPLE_TAP_WINDOW_MS = 700;

const Home = ({
  onOpenSettings,
  onOpenTikTokFeed,
  currentUser,
  onOpenStoryUpload,
  onRequireLoginForStory,
}) => {
  const [piAiVisible, setPiAiVisible] = useState(false);
  const logoTapTimesRef = useRef([]);
  const [storyRings, setStoryRings] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [viewerRing, setViewerRing] = useState(null);
  const [viewerVisible, setViewerVisible] = useState(false);

  const loadStories = useCallback(async () => {
    setStoriesLoading(true);
    try {
      const res = await getStoriesFeed();
      setStoryRings(Array.isArray(res?.rings) ? res.rings : []);
    } catch (e) {
      setStoryRings([]);
    } finally {
      setStoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const onLogoPress = useCallback(() => {
    const now = Date.now();
    logoTapTimesRef.current = logoTapTimesRef.current.filter(
      t => now - t < TRIPLE_TAP_WINDOW_MS,
    );
    logoTapTimesRef.current.push(now);
    if (logoTapTimesRef.current.length >= 3) {
      logoTapTimesRef.current = [];
      setPiAiVisible(true);
    }
  }, []);

  const handleAddStory = useCallback(() => {
    const subId = toSubscriptionId(currentUser?.id);
    if (!currentUser || !subId) {
      onRequireLoginForStory?.();
      return;
    }
    onOpenStoryUpload?.();
  }, [currentUser, onOpenStoryUpload, onRequireLoginForStory]);

  const handleOpenRing = useCallback(ring => {
    if (!ring?.slides?.length) return;
    setViewerRing(ring);
    setViewerVisible(true);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setViewerVisible(false);
    setViewerRing(null);
    loadStories();
  }, [loadStories]);

  const categoriesList = userCategories;

  return (
    <ImageBackground
      source={require('../assets/background.png')}
      style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity onPress={onOpenSettings}>
          <Image source={require('../assets/menu.png')} style={styles.menu} />
        </TouchableOpacity>
        <Pressable
          onPress={onLogoPress}
          style={({pressed}) => [pressed && styles.logoPressed]}
          accessibilityLabel="לוגו הבית"
          accessibilityHint="לחיצה שלוש פעמים פותחת את Pi AI">
          <Image
            source={require('../assets/homeLogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Pressable>
        <PiAiSearchModal
          visible={piAiVisible}
          onClose={() => setPiAiVisible(false)}
        />
        <StoryViewerModal
          visible={viewerVisible}
          ring={viewerRing}
          onClose={handleCloseViewer}
        />
        <View style={styles.content}>
          <Carusel
            categoriesList={categoriesList}
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
              resizeMode="contain"
            />
            <Image
              source={require('../assets/popular.png')}
              style={styles.popularLogo}
              resizeMode="contain"
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
          <HomeStoryStrip
            rings={storyRings}
            loading={storiesLoading}
            onAddPress={handleAddStory}
            onRingPress={handleOpenRing}
          />
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
  },
  logoPressed: {
    opacity: 0.92,
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
  },
  popularLogo: {
    position: 'absolute',
    right: -16,
    top: 5,
    width: 95,
    height: 48,
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
});
