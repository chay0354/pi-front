import {
  ImageBackground,
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import React, {useContext, useCallback, useEffect, useRef, useState} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Carusel from '../components/Carusel';
import {TouchableOpacity} from 'react-native';
import HomeStoryStrip from '../components/HomeStoryStrip';
import StoryViewerModal from '../components/StoryViewerModal';
import PiAiSearchModal from '../components/PiAiSearchModal';
import {getStoriesFeed} from '../utils/api';

import {userCategories} from '../utils/constant';

const Home = ({
  onOpenSettings,
  onOpenTikTokFeed,
  onOpenSelectedProjects,
  onOpenProfessionalsDirectory,
  onOpenUserProfile,
}) => {
  const insets = useSafeAreaInsets();
  const [storyRings, setStoryRings] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [viewerRing, setViewerRing] = useState(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const flipProgress = useRef(new Animated.Value(0)).current;
  const flippedRef = useRef(false);
  const [flipped, setFlipped] = useState(false);
  const flipAnimRef = useRef(null);

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

  const toggleFlip = useCallback(() => {
    if (flipAnimRef.current) flipAnimRef.current.stop();
    const target = flippedRef.current ? 0 : 1;
    flippedRef.current = !flippedRef.current;
    setFlipped(flippedRef.current);
    flipAnimRef.current = Animated.timing(flipProgress, {
      toValue: target,
      duration: 650,
      useNativeDriver: Platform.OS !== 'web',
    });
    flipAnimRef.current.start();
  }, [flipProgress]);

  const onLogoPress = useCallback(() => {
    toggleFlip();
  }, [toggleFlip]);

  const frontRotate = flipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backRotate = flipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });
  const frontOpacity = flipProgress.interpolate({
    inputRange: [0, 0.499, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });
  const backOpacity = flipProgress.interpolate({
    inputRange: [0, 0.499, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

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

  const frontFace = (
    <>
      <TouchableOpacity onPress={onOpenSettings}>
        <Image source={require('../assets/menu.png')} style={styles.menu} />
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onLogoPress}
        accessibilityRole="button"
        accessibilityLabel="Pi AI">
        <Image
          source={require('../assets/homeLogo.png')}
          style={styles.logo}
        />
      </TouchableOpacity>

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
            onPress={() => onOpenSelectedProjects?.()}
            style={styles.profileBarHeaderButton}>
            <Text style={styles.profileBarHeaderButtonText}>חפשו עוד</Text>
          </TouchableOpacity>
          <Text style={styles.profileBarHeaderText}>פרויקטים נבחרים</Text>
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

      <View style={styles.profileBar}>
        <View style={styles.profileBarHeader}>
          <TouchableOpacity
            onPress={() => onOpenProfessionalsDirectory?.()}
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
    </>
  );

  const backFace = (
    <PiAiSearchModal
      embedded
      visible={flipped}
      onClose={toggleFlip}
      onOpenUserProfile={listing => {
        toggleFlip();
        onOpenUserProfile?.(listing);
      }}
    />
  );

  return (
    <ImageBackground
      source={require('../assets/background.png')}
      style={styles.background}>
      <View style={styles.backgroundClip}>
        <View style={[styles.safeArea, {paddingTop: insets.top}]}>
          <View style={styles.flipRoot}>
            <Animated.View
              pointerEvents={flipped ? 'none' : 'auto'}
              style={[
                styles.flipFace,
                {
                  opacity: frontOpacity,
                  transform: [{perspective: 1200}, {rotateY: frontRotate}],
                },
              ]}>
              {frontFace}
            </Animated.View>
            <Animated.View
              pointerEvents={flipped ? 'auto' : 'none'}
              style={[
                styles.flipFace,
                {
                  opacity: backOpacity,
                  transform: [{perspective: 1200}, {rotateY: backRotate}],
                },
              ]}>
              {backFace}
            </Animated.View>
          </View>

          <StoryViewerModal
            visible={viewerVisible}
            ring={viewerRing}
            onClose={handleCloseViewer}
          />
        </View>
      </View>
    </ImageBackground>
  );
};

export default Home;

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  backgroundClip: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
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
    overflow: 'hidden',
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
  projectCardWrap: {
    flex: 1,
    marginHorizontal: 20,
    position: 'relative',
    overflow: 'visible',
  },
  videoContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  projectImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
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
  flipRoot: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  flipFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backfaceVisibility: 'hidden',
    overflow: 'hidden',
  },
  backContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontFamily: 'Rubik-Medium',
    marginBottom: 10,
    textAlign: 'center',
  },
  backSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
  },
});
