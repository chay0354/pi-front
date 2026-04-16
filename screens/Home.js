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
import {getStoriesFeed} from '../utils/api';

const TRIPLE_TAP_WINDOW_MS = 700;

const Home = ({
  onOpenSettings,
  onOpenTikTokFeed,
  onOpenSelectedProjects,
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
        <View style={styles.sectionTop}>
          <TouchableOpacity onPress={onOpenSettings} style={styles.menuButton}>
            <Image source={require('../assets/menu.png')} style={styles.menu} />
          </TouchableOpacity>
          <Pressable
            onPress={onLogoPress}
            style={({pressed}) => [styles.logoPressWrap, pressed && styles.logoPressed]}
            accessibilityLabel="לוגו הבית"
            accessibilityHint="לחיצה שלוש פעמים פותחת את Pi AI">
            <Image
              source={require('../assets/homeLogo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Pressable>
          <View style={styles.carouselWrap}>
            <Carusel
              categoriesList={categoriesList}
              onCategorySelect={category => {
                if (onOpenTikTokFeed) {
                  onOpenTikTokFeed(category);
                }
              }}
            />
          </View>
        </View>
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
          <View style={styles.projectSection}>
            <View style={styles.profileBarHeader}>
              <TouchableOpacity
                onPress={() => onOpenSelectedProjects?.()}
                style={styles.profileBarHeaderButton}>
                <Text style={styles.profileBarHeaderButtonText}>חפשו עוד</Text>
              </TouchableOpacity>
              <Text style={styles.profileBarHeaderText}>
                פרויקטים נבחרים
              </Text>
            </View>
            <View style={styles.projectCardWrap}>
              <View style={styles.videoContainer}>
                <Image
                  source={require('../assets/project_image.gif')}
                  style={styles.projectImage}
                  resizeMode="cover"
                />
                <Image
                  source={require('../assets/videoLogo.png')}
                  style={styles.videoLogo}
                  resizeMode="contain"
                />
              </View>
              <Image
                source={require('../assets/popular.png')}
                style={styles.popularLogo}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>
        <View style={styles.profileBarSection}>
          <View style={styles.profileBarHeader}>
            <TouchableOpacity
              onPress={() => onOpenSelectedProjects?.()}
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
  safeArea: {
    flex: 1,
  },
  sectionTop: {
    height: 318,
  },
  menuButton: {
    position: 'absolute',
    top: 16,
    right: 24,
    zIndex: 2,
  },
  menu: {
    width: 32,
    height: 32,
  },
  logoPressWrap: {
    alignSelf: 'center',
    marginTop: 0,
  },
  logo: {
    width: 140,
    height: 122,
  },
  logoPressed: {
    opacity: 0.92,
  },
  carouselWrap: {
    width: 366,
    alignSelf: 'center',
    marginTop: 18,
  },
  content: {
    paddingTop: 8,
  },
  projectSection: {
    paddingHorizontal: 16,
  },
  videoContainer: {
    width: 366,
    height: 252,
    backgroundColor: '#E0DEF7',
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 67.068,
    shadowOffset: {width: 0, height: 3.832},
    elevation: 8,
  },
  projectCardWrap: {
    width: 366,
    alignSelf: 'center',
    position: 'relative',
  },
  projectImage: {
    width: '100%',
    height: '100%',
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
    right: -15,
    top: 5,
    width: 95,
    height: 48,
  },
  profileBarSection: {
    paddingTop: 32,
    paddingBottom: 8,
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
