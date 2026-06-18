import {
  StyleSheet,
  Text,
  View,
  Image,
  Animated,
  Platform,
  InteractionManager,
} from 'react-native';
import React, {useCallback, useEffect, useRef, useState, memo} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import Carusel from '../components/Carusel';
import {TouchableOpacity} from 'react-native';
import HomeStoryStrip from '../components/HomeStoryStrip';
import StoryViewerModal from '../components/StoryViewerModal';
import PiAiSearchModal from '../components/PiAiSearchModal';
import {getStoriesFeed} from '../utils/api';

import {userCategories} from '../utils/constant';
import {flexStart} from '../utils/rtlLayout';

/**
 * Hero: static PNG on Android (smooth decode). Web + iOS use optimized
 * project_image.gif (~3MB, 640×441, 30 frames) — run scripts/compress-project-gif.sh to rebuild.
 */
const PROJECT_FEATURE_IMAGE = require('../assets/project_image.gif');

const HomeBackground = memo(function HomeBackground({children}) {
  return (
    <View style={styles.background}>
      <Image
        source={require('../assets/background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
        fadeDuration={0}
      />
      {children}
    </View>
  );
});

const Home = ({
  onOpenSettings,
  onOpenTikTokFeed,
  onOpenSelectedProjects,
  onOpenProfessionalsDirectory,
  onOpenUserProfile,
  onOpenStoryProfile,
  carouselCategoryId = null,
  reopenAi = false,
  aiSnapshot = null,
  onAiReopenConsumed,
  onAiSnapshotChange,
}) => {
  const insets = useSafeAreaInsets();
  const [storyRings, setStoryRings] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [viewerRing, setViewerRing] = useState(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  // Start already flipped to the Pi AI back face when returning from a listing
  // that was opened out of the Pi AI results.
  const flipProgress = useRef(new Animated.Value(reopenAi ? 1 : 0)).current;
  const flippedRef = useRef(reopenAi);
  const [flipped, setFlipped] = useState(reopenAi);
  const flipAnimRef = useRef(null);
  const [aiMounted, setAiMounted] = useState(reopenAi);
  // Project feature card starts muted (matches Figma node 7:40660).
  const [projectMuted, setProjectMuted] = useState(true);
  const logoTapCountRef = useRef(0);
  const logoTapResetTimerRef = useRef(null);

  // Consume the one-shot reopen flag once we've restored the flipped state.
  useEffect(() => {
    if (reopenAi) {
      onAiReopenConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const LOGO_TAPS_TO_OPEN_AI = 3;
  const LOGO_TAP_RESET_MS = 700;

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
    const task = InteractionManager.runAfterInteractions(() => {
      loadStories();
    });
    return () => task.cancel();
  }, [loadStories]);

  const toggleFlip = useCallback(() => {
    if (flipAnimRef.current) flipAnimRef.current.stop();
    const target = flippedRef.current ? 0 : 1;
    if (target === 1) {
      setAiMounted(true);
    }
    flippedRef.current = !flippedRef.current;
    setFlipped(flippedRef.current);
    flipAnimRef.current = Animated.timing(flipProgress, {
      toValue: target,
      duration: 650,
      // Layout-thread animation so perspective + rotateY + backfaceVisibility
      // render reliably on iOS/Android (native driver skips 3D flip).
      useNativeDriver: false,
    });
    flipAnimRef.current.start();
  }, [flipProgress]);

  const onLogoPress = useCallback(() => {
    logoTapCountRef.current += 1;
    if (logoTapResetTimerRef.current) {
      clearTimeout(logoTapResetTimerRef.current);
    }
    if (logoTapCountRef.current >= LOGO_TAPS_TO_OPEN_AI) {
      logoTapCountRef.current = 0;
      logoTapResetTimerRef.current = null;
      toggleFlip();
      return;
    }
    logoTapResetTimerRef.current = setTimeout(() => {
      logoTapCountRef.current = 0;
      logoTapResetTimerRef.current = null;
    }, LOGO_TAP_RESET_MS);
  }, [toggleFlip]);

  useEffect(
    () => () => {
      if (logoTapResetTimerRef.current) {
        clearTimeout(logoTapResetTimerRef.current);
      }
    },
    [],
  );

  const frontRotate = flipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backRotate = flipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });
  const frontOpacity = flipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const backOpacity = flipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
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

  const handleOpenStoryProfile = useCallback(
    ring => {
      if (!ring?.subscription_id) return;
      setViewerVisible(false);
      setViewerRing(null);
      onOpenStoryProfile?.(ring);
    },
    [onOpenStoryProfile],
  );

  /** Next ring in strip order (right → left on the home row). */
  const handleAdvanceToNextUser = useCallback(() => {
    if (!viewerRing) {
      handleCloseViewer();
      return;
    }
    const currentIndex = storyRings.findIndex(
      r => String(r.subscription_id) === String(viewerRing.subscription_id),
    );
    for (let i = currentIndex + 1; i < storyRings.length; i++) {
      if (storyRings[i]?.slides?.length) {
        setViewerRing(storyRings[i]);
        return;
      }
    }
    handleCloseViewer();
  }, [viewerRing, storyRings, handleCloseViewer]);

  const handleCategorySelect = useCallback(
    category => {
      onOpenTikTokFeed?.(category);
    },
    [onOpenTikTokFeed],
  );

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
        <Image source={require('../assets/homeLogo.png')} style={styles.logo} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Carusel
          categoriesList={userCategories}
          initialCategoryId={carouselCategoryId}
          onCategorySelect={handleCategorySelect}
        />
        <View style={[styles.profileBarHeader, {marginTop: 8}]}>
          <Text style={styles.profileBarHeaderText}>פרויקטים נבחרים</Text>
          <TouchableOpacity
            onPress={() => onOpenSelectedProjects?.()}
            style={styles.profileBarHeaderButton}>
            <Text style={styles.profileBarHeaderButtonText}>חפשו עוד</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.projectCardWrap}>
          <View style={styles.videoContainer}>
            <Image
              source={PROJECT_FEATURE_IMAGE}
              style={styles.projectImage}
              resizeMode="cover"
              fadeDuration={0}
            />
            <Image
              source={require('../assets/videoLogo.png')}
              style={styles.videoLogo}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.muteBtn}
              activeOpacity={0.8}
              onPress={() => setProjectMuted(m => !m)}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              accessibilityRole="button"
              accessibilityLabel={projectMuted ? 'בטל השתקה' : 'השתק'}>
              <MaterialCommunityIcons
                name={projectMuted ? 'volume-mute' : 'volume-high'}
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
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
          <Text style={styles.profileBarHeaderText}>
            בעלי מקצוע בתחום הנדל״ן
          </Text>
          <TouchableOpacity
            onPress={() => onOpenProfessionalsDirectory?.()}
            style={styles.profileBarHeaderButton}>
            <Text
              style={[
                styles.profileBarHeaderButtonText,
                styles.profileBarHeaderButtonTextAlt,
              ]}>
              חפשו עוד
            </Text>
          </TouchableOpacity>
        </View>
        <HomeStoryStrip
          rings={storyRings}
          loading={storiesLoading}
          onRingPress={handleOpenRing}
        />
      </View>
    </>
  );

  const handleAiOpenProfile = useCallback(
    listing => {
      // Keep the AI search flipped open in the background so that closing the
      // listing returns to the results list (App restores it on home remount).
      onOpenUserProfile?.(listing);
    },
    [onOpenUserProfile],
  );

  const backFace = aiMounted ? (
    <PiAiSearchModal
      embedded
      visible={flipped}
      onClose={toggleFlip}
      onOpenUserProfile={handleAiOpenProfile}
      initialSnapshot={aiSnapshot}
      onSnapshotChange={onAiSnapshotChange}
    />
  ) : null;

  // 3D card flip on native; web keeps a crossfade (horizontal carousels break in 3D).
  const use3dFlip = Platform.OS !== 'web';
  const frontTransform = use3dFlip
    ? [{perspective: 1200}, {rotateY: frontRotate}]
    : undefined;
  const backTransform = use3dFlip
    ? [{perspective: 1200}, {rotateY: backRotate}]
    : undefined;

  return (
    <HomeBackground>
      <View style={styles.backgroundClip}>
        <View
          style={[
            styles.safeArea,
            {paddingTop: insets.top, paddingBottom: insets.bottom / 2},
          ]}>
          <View style={styles.flipRoot}>
            <Animated.View
              pointerEvents={flipped ? 'none' : 'auto'}
              collapsable={false}
              renderToHardwareTextureAndroid={false}
              style={[
                styles.flipFace,
                use3dFlip ? styles.flipFace3d : null,
                {
                  opacity: use3dFlip ? 1 : frontOpacity,
                  ...(frontTransform ? {transform: frontTransform} : {}),
                },
              ]}>
              {frontFace}
            </Animated.View>
            {aiMounted ? (
              <Animated.View
                pointerEvents={flipped ? 'auto' : 'none'}
                collapsable={false}
                renderToHardwareTextureAndroid={false}
                style={[
                  styles.flipFace,
                  use3dFlip ? styles.flipFace3dBack : null,
                  {
                    opacity: use3dFlip ? 1 : backOpacity,
                    ...(backTransform ? {transform: backTransform} : {}),
                  },
                ]}>
                {backFace}
              </Animated.View>
            ) : null}
          </View>

          <StoryViewerModal
            visible={viewerVisible}
            ring={viewerRing}
            onClose={handleCloseViewer}
            onAdvanceToNextUser={handleAdvanceToNextUser}
            onOpenProfile={handleOpenStoryProfile}
          />
        </View>
      </View>
    </HomeBackground>
  );
};

export default memo(Home);

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  backgroundClip: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  menu: {
    alignSelf: flexStart,
    width: 28,
    height: 20,
    marginTop: 20,
    marginStart: 26,
  },
  safeArea: {
    flex: 1,
    overflow: 'hidden',
  },
  logo: {
    alignSelf: 'center',
    width: 130,
    height: 122,
    marginTop: -48,
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
    right: 10,
    top: 10,
    width: 45,
    height: 45,
    resizeMode: 'contain',
  },
  // Mute toggle bottom-left of the feature card (Figma node I7:40660;391:18915).
  // Under forceRTL the left/right props are swapped, so `right` = physical left.
  muteBtn: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularLogo: {
    position: 'absolute',
    left: -16,
    top: 5,
    width: 95,
    height: 48,
    resizeMode: 'contain',
  },
  profileBar: {
    paddingTop: 4,
    paddingBottom: 10,
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
  /** Second חפשו עוד (בעלי מקצוע) — distinct color from the gold one above. */
  profileBarHeaderButtonTextAlt: {
    color: '#D2D0DC',
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
    overflow: 'hidden',
  },
  flipFace3d: {
    backfaceVisibility: 'hidden',
  },
  flipFace3dBack: {
    backfaceVisibility: 'hidden',
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
