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
import {Video, ResizeMode} from 'expo-av';
import Carusel from '../components/Carusel';
import {TouchableOpacity} from 'react-native';
import HomeStoryStrip from '../components/HomeStoryStrip';
import StoryViewerModal from '../components/StoryViewerModal';
import PiAiSearchModal from '../components/PiAiSearchModal';
import {getListings, getStoriesFeed} from '../utils/api';
import {
  listingHasHeroMedia,
  resolveListingHeroMedia,
} from '../utils/listingGridCardFigma';

import {userCategories} from '../utils/constant';
import {flexStart} from '../utils/rtlLayout';

const FALLBACK_PROJECT_IMAGE = require('../assets/category1.png');

const isFeedPostListing = listing =>
  listing?.feed_post === true ||
  listing?.feed_post === 'true' ||
  listing?.feed_post === 't';

const pickRandomCompanyProjectListing = listings => {
  const candidates = (Array.isArray(listings) ? listings : []).filter(
    listing =>
      !isFeedPostListing(listing) &&
      String(listing?.subscription_type || '').trim().toLowerCase() ===
        'company' &&
      listingHasHeroMedia(listing),
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)] || null;
};

const FeatureHeroMedia = memo(function FeatureHeroMedia({
  media,
  loading,
  paused,
  fallbackSource,
}) {
  const webVideoRef = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = webVideoRef.current;
    if (!el || media?.type !== 'video') return;
    if (paused) {
      el.pause();
      return;
    }
    const playPromise = el.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  }, [paused, media?.type, media?.uri]);

  if (loading) {
    return (
      <View style={[styles.projectImage, styles.projectImagePlaceholder]} />
    );
  }

  if (media?.type === 'video' && media.uri) {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.projectImage}>
          {media.posterUri ? (
            <Image
              source={{uri: media.posterUri}}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : null}
          <video
            ref={webVideoRef}
            src={media.uri}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 16,
            }}
            autoPlay={!paused}
            muted
            loop
            playsInline
            preload="auto"
          />
        </View>
      );
    }

    return (
      <View style={styles.projectImage}>
        {media.posterUri ? (
          <Image
            source={{uri: media.posterUri}}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : null}
        <Video
          key={media.uri}
          source={{uri: media.uri}}
          style={StyleSheet.absoluteFillObject}
          resizeMode={ResizeMode.COVER}
          shouldPlay={!paused}
          isMuted
          isLooping
          useNativeControls={false}
          onError={() => {}}
        />
      </View>
    );
  }

  if (media?.type === 'image' && media.uri) {
    return (
      <Image
        source={{uri: media.uri}}
        style={styles.projectImage}
        resizeMode="cover"
        fadeDuration={0}
      />
    );
  }

  return (
    <Image
      source={fallbackSource}
      style={styles.projectImage}
      resizeMode="cover"
      fadeDuration={0}
    />
  );
});

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
  onOpenFeatureListing,
  onOpenStoryProfile,
  carouselCategoryId = null,
  reopenAi = false,
  aiSnapshot = null,
  onAiReopenConsumed,
  onAiSnapshotChange,
  unreadChatCount = 0,
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
  const [featureListing, setFeatureListing] = useState(null);
  const [featureMediaLoading, setFeatureMediaLoading] = useState(true);
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

  const loadFeatureProjectImage = useCallback(async () => {
    setFeatureMediaLoading(true);
    try {
      const res = await getListings({
        status: 'published',
        category: 1,
        subscription_type: 'company',
      });
      setFeatureListing(pickRandomCompanyProjectListing(res?.listings));
    } catch (_) {
      setFeatureListing(null);
    } finally {
      setFeatureMediaLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      loadStories();
      loadFeatureProjectImage();
    });
    return () => task.cancel();
  }, [loadStories, loadFeatureProjectImage]);

  const featureMedia = featureListing
    ? resolveListingHeroMedia(featureListing)
    : null;

  const handleOpenFeatureListing = useCallback(() => {
    if (!featureListing || typeof onOpenFeatureListing !== 'function') return;
    onOpenFeatureListing(featureListing);
  }, [featureListing, onOpenFeatureListing]);

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
      <TouchableOpacity
        onPress={onOpenSettings}
        activeOpacity={0.85}
        style={styles.menuWrap}
        hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
        accessibilityRole="button"
        accessibilityLabel="תפריט">
        <Image source={require('../assets/menu.png')} style={styles.menu} />
        {unreadChatCount > 0 ? (
          <View
            style={styles.menuBadge}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            <MaterialCommunityIcons name="send" size={13} color="#1a1a2e" />
          </View>
        ) : null}
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onLogoPress}
        accessibilityRole="button"
        accessibilityLabel="Pi AI">
        <Image source={require('../assets/homeLogo.png')} style={styles.logo} />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.carouselWrap}>
          <Carusel
            categoriesList={userCategories}
            initialCategoryId={carouselCategoryId}
            onCategorySelect={handleCategorySelect}
          />
        </View>
        <View style={styles.projectsSectionHeader}>
          <Text style={styles.profileBarHeaderText}>פרויקטים נבחרים</Text>
          <TouchableOpacity
            onPress={() => onOpenSelectedProjects?.()}
            style={styles.profileBarHeaderButton}>
            <Text style={styles.profileBarHeaderButtonText}>חפשו עוד</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.projectCardSlot}>
          <TouchableOpacity
            activeOpacity={featureListing ? 0.92 : 1}
            disabled={!featureListing || featureMediaLoading}
            onPress={handleOpenFeatureListing}
            style={styles.projectCardWrap}
            accessibilityRole="button"
            accessibilityLabel="פתח מודעת פרויקט">
            <View style={styles.videoContainer}>
              <FeatureHeroMedia
                media={featureMedia}
                loading={featureMediaLoading}
                paused={flipped}
                fallbackSource={FALLBACK_PROJECT_IMAGE}
              />
            </View>
            <Image
              source={require('../assets/popular.png')}
              style={styles.popularLogo}
              resizeMode="contain"
            />
          </TouchableOpacity>
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
            <Text style={styles.profileBarHeaderButtonText}>חפשו עוד</Text>
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

const PROJECT_CARD_EXTRA_HEIGHT = 28;

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
  menuWrap: {
    alignSelf: flexStart,
    marginTop: 20,
    marginStart: 26,
    position: 'relative',
  },
  menu: {
    width: 28,
    height: 20,
  },
  // Top-right of hamburger (forceRTL swaps left/right → `left` = physical right).
  menuBadge: {
    position: 'absolute',
    top: -8,
    left: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#5EEAD4',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    elevation: 6,
    shadowColor: '#5EEAD4',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.5,
    shadowRadius: 5,
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
  carouselWrap: {
    marginBottom: -PROJECT_CARD_EXTRA_HEIGHT,
  },
  projectsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
    zIndex: 2,
  },
  projectCardSlot: {
    flex: 1,
    marginHorizontal: 20,
  },
  projectCardWrap: {
    flex: 1,
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
  projectImagePlaceholder: {
    backgroundColor: '#2B2A39',
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
