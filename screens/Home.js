import {
  StyleSheet,
  Text,
  View,
  Image,
  Animated,
  Platform,
  InteractionManager,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import Carusel from '../components/Carusel';
import {FeedVideoPlayer} from '../components/FeedVideoPlayer';
import HomeIntroModal, {
  getHomeHeaderLogoRect,
} from '../components/HomeIntroModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeStoryStrip from '../components/HomeStoryStrip';
import StoryViewerModal from '../components/StoryViewerModal';
import PiAiSearchModal from '../components/PiAiSearchModal';
import {getListings, getStoriesFeed} from '../utils/api';
import {firstVideoUrl} from '../utils/listingGridCardFigma';
import {cappedMuxUri, muxThumbnailUri} from '../utils/videoPlayback';
import {prefetchFeedVideoUri} from '../utils/feedVideoPreload';

import {
  userCategories,
  DEFAULT_HOME_CAROUSEL_CATEGORY_ID,
} from '../utils/constant';
import {flexStart, forceLtrStyle} from '../utils/rtlLayout';

const FALLBACK_PROJECT_IMAGE = require('../assets/category1.png');
const HOME_FEATURE_AD_STATE_KEY = 'homeFeatureAdRotationState';

const isFeedPostListing = listing =>
  listing?.feed_post === true ||
  listing?.feed_post === 'true' ||
  listing?.feed_post === 't';

const listingHasVideo = listing => !!firstVideoUrl(listing);

const pickRandomCompanyProjectListing = (listings, excludeId = null) => {
  const candidates = (Array.isArray(listings) ? listings : []).filter(
    listing =>
      !isFeedPostListing(listing) &&
      String(listing?.subscription_type || '')
        .trim()
        .toLowerCase() === 'company' &&
      listingHasVideo(listing),
  );
  if (candidates.length === 0) return null;
  let pool = candidates;
  if (excludeId != null && String(excludeId).trim() !== '') {
    const others = candidates.filter(
      listing => String(listing?.id) !== String(excludeId),
    );
    if (others.length > 0) pool = others;
  }
  return pool[Math.floor(Math.random() * pool.length)] || null;
};

const filterCompanyVideoListings = listings =>
  (Array.isArray(listings) ? listings : []).filter(
    listing =>
      !isFeedPostListing(listing) &&
      String(listing?.subscription_type || '')
        .trim()
        .toLowerCase() === 'company' &&
      listingHasVideo(listing),
  );

async function readFeatureAdRotationState() {
  try {
    const raw = await AsyncStorage.getItem(HOME_FEATURE_AD_STATE_KEY);
    if (!raw) return {listingId: null, playCount: 0};
    const parsed = JSON.parse(raw);
    // Prefer playCount (video loops). Fall back to legacy viewCount.
    const playCount = Math.max(
      0,
      Number(parsed?.playCount ?? parsed?.viewCount) || 0,
    );
    return {
      listingId:
        parsed?.listingId != null ? String(parsed.listingId) : null,
      playCount,
    };
  } catch {
    return {listingId: null, playCount: 0};
  }
}

async function writeFeatureAdRotationState(state) {
  try {
    await AsyncStorage.setItem(
      HOME_FEATURE_AD_STATE_KEY,
      JSON.stringify({
        listingId: state?.listingId != null ? String(state.listingId) : null,
        playCount: Math.max(0, Number(state?.playCount) || 0),
      }),
    );
  } catch {
    /* non-fatal */
  }
}

const resolveFeatureProjectVideoMedia = listing => {
  if (!listing) return null;
  const videoUri = firstVideoUrl(listing);
  if (!videoUri) return null;
  // Same Mux path as TikTok feed: capped HLS + first-frame poster.
  const uri = cappedMuxUri(videoUri, '540p');
  const posterUri = muxThumbnailUri(uri, {time: 0, width: 720}) || null;
  return {type: 'video', uri, posterUri};
};

const getFeatureProjectName = listing => {
  if (!listing) return '';
  return String(
    listing.project_name ||
      listing.property_name ||
      listing.business_name ||
      listing.creator_business_name ||
      '',
  ).trim();
};

/** Home featured ad — same Mux player stack as TikTok listing ads (fitWidth). */
const FeatureHeroMedia = memo(function FeatureHeroMedia({
  media,
  loading,
  paused,
  fallbackSource,
  isMuted = true,
  onProgressChange,
  onPlaybackComplete,
}) {
  if (loading) {
    return (
      <View style={[styles.projectImage, styles.projectImagePlaceholder]} />
    );
  }

  if (media?.type === 'video' && media.uri) {
    return (
      <FeedVideoPlayer
        uri={media.uri}
        posterUri={media.posterUri || ''}
        isActive={!paused}
        prewarm={paused}
        fitWidth
        muted={isMuted}
        style={styles.projectImage}
        onProgressChange={onProgressChange}
        onPlaybackComplete={onPlaybackComplete}
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
  carouselCategoryId = DEFAULT_HOME_CAROUSEL_CATEGORY_ID,
  reopenAi = false,
  aiSnapshot = null,
  onAiReopenConsumed,
  onAiSnapshotChange,
  unreadChatCount = 0,
  eagerLoad = false,
  isScreenActive = true,
  onInitialContentReady,
  onComplete,
  showIntroModal = false,
  onIntroModalShown,
  onIntroMoveStart,
}) => {
  const insets = useSafeAreaInsets();
  const {width: windowWidth} = useWindowDimensions();
  const logoImageRef = useRef(null);
  const [logoRevealed, setLogoRevealed] = useState(!showIntroModal);
  // Seed with layout math so the intro never animates to a stale/high measure.
  const [logoTargetLayout, setLogoTargetLayout] = useState(() =>
    getHomeHeaderLogoRect(windowWidth, insets.top),
  );

  useEffect(() => {
    setLogoTargetLayout(getHomeHeaderLogoRect(windowWidth, insets.top));
  }, [windowWidth, insets.top]);
  const [storyRings, setStoryRings] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(eagerLoad);
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
  const featureListingRef = useRef(null);
  const featureAdVisitRef = useRef(0);
  const prevScreenActiveRef = useRef(false);
  const [featureMuted, setFeatureMuted] = useState(true);
  const [featureProgress, setFeatureProgress] = useState(0);
  const logoTapCountRef = useRef(0);
  const logoTapResetTimerRef = useRef(null);
  const initialReadySentRef = useRef(false);
  const storiesRequestRef = useRef(0);

  // Consume the one-shot reopen flag once we've restored the flipped state.
  useEffect(() => {
    onComplete?.();
    if (reopenAi) {
      onAiReopenConsumed?.();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const LOGO_TAPS_TO_OPEN_AI = 3;
  const LOGO_TAP_RESET_MS = 700;

  const loadStories = useCallback(async ({silent = false} = {}) => {
    const requestId = ++storiesRequestRef.current;
    if (!silent) {
      setStoriesLoading(true);
    }
    try {
      const res = await getStoriesFeed({limit: 80});
      if (requestId !== storiesRequestRef.current) return;
      if (res?.success === false || !Array.isArray(res?.rings)) return;
      setStoryRings(res.rings);
    } catch (_) {
      /* keep the strip visible with the last good payload */
    } finally {
      if (requestId === storiesRequestRef.current && !silent) {
        setStoriesLoading(false);
      }
    }
  }, []);

  const loadFeatureAdListing = useCallback(async ({forceRotate = false} = {}) => {
    const visitId = ++featureAdVisitRef.current;
    setFeatureMediaLoading(true);
    try {
      const res = await getListings({
        status: 'published',
        category: 1,
        subscription_type: 'company',
      });
      if (visitId !== featureAdVisitRef.current) return;

      const candidates = filterCompanyVideoListings(res?.listings);
      const stored = await readFeatureAdRotationState();
      if (visitId !== featureAdVisitRef.current) return;

      let listingId = stored.listingId;
      const currentMissing =
        listingId &&
        !candidates.some(item => String(item.id) === String(listingId));
      const shouldRotate = forceRotate || currentMissing;

      let picked = null;
      if (!shouldRotate && listingId) {
        picked =
          candidates.find(item => String(item.id) === String(listingId)) ||
          null;
      }
      if (!picked) {
        picked = pickRandomCompanyProjectListing(
          candidates,
          shouldRotate ? listingId : null,
        );
        listingId = picked?.id != null ? String(picked.id) : null;
      }

      await writeFeatureAdRotationState({listingId, playCount: 0});
      if (visitId !== featureAdVisitRef.current) return;

      featureListingRef.current = picked;
      setFeatureListing(picked);
    } catch (_) {
      if (visitId !== featureAdVisitRef.current) return;
      featureListingRef.current = null;
      setFeatureListing(null);
    } finally {
      if (visitId === featureAdVisitRef.current) {
        setFeatureMediaLoading(false);
      }
    }
  }, []);

  const handleFeaturePlaybackComplete = useCallback(async () => {
    const currentId =
      featureListingRef.current?.id != null
        ? String(featureListingRef.current.id)
        : null;
    if (!currentId) return;

    const stored = await readFeatureAdRotationState();
    // Ignore stale completions after we've already rotated away.
    if (stored.listingId && stored.listingId !== currentId) return;

    loadFeatureAdListing({forceRotate: true});
  }, [loadFeatureAdListing]);

  useEffect(() => {
    if (!isScreenActive) {
      prevScreenActiveRef.current = false;
      return undefined;
    }
    const justActivated = !prevScreenActiveRef.current;
    prevScreenActiveRef.current = true;
    if (!justActivated) return undefined;

    const runVisit = () => {
      loadFeatureAdListing();
    };
    if (eagerLoad) {
      runVisit();
      return undefined;
    }
    const task = InteractionManager.runAfterInteractions(runVisit);
    return () => task.cancel();
  }, [isScreenActive, eagerLoad, loadFeatureAdListing]);

  useEffect(() => {
    if (eagerLoad) {
      loadStories();
      return undefined;
    }
    const task = InteractionManager.runAfterInteractions(() => {
      loadStories();
    });
    return () => task.cancel();
  }, [eagerLoad, loadStories]);

  useEffect(() => {
    if (!onInitialContentReady || initialReadySentRef.current) return;
    if (storiesLoading || featureMediaLoading) return;
    initialReadySentRef.current = true;
    onInitialContentReady();
  }, [storiesLoading, featureMediaLoading, onInitialContentReady]);

  const featureMedia = featureListing
    ? resolveFeatureProjectVideoMedia(featureListing)
    : null;

  // Warm poster + first video segments as soon as the ad is picked.
  useEffect(() => {
    if (!featureMedia?.uri) return;
    if (featureMedia.posterUri) {
      Image.prefetch(String(featureMedia.posterUri)).catch(() => {});
    }
    prefetchFeedVideoUri(featureMedia.uri);
  }, [featureMedia?.uri, featureMedia?.posterUri]);

  useEffect(() => {
    setFeatureMuted(true);
    setFeatureProgress(0);
  }, [featureMedia?.uri]);

  const handleFeatureProgressChange = useCallback(progress => {
    setFeatureProgress(progress);
  }, []);

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
    loadStories({silent: true});
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

  /** Next ring in strip order (left → right on the home row). */
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

  /** Previous ring in strip order (right → left on the home row). */
  const handleAdvanceToPrevUser = useCallback(() => {
    if (!viewerRing) return;
    const currentIndex = storyRings.findIndex(
      r => String(r.subscription_id) === String(viewerRing.subscription_id),
    );
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (storyRings[i]?.slides?.length) {
        setViewerRing(storyRings[i]);
        return;
      }
    }
  }, [viewerRing, storyRings]);

  const viewerRingIndex = useMemo(() => {
    if (!viewerRing?.subscription_id) return -1;
    return storyRings.findIndex(
      r => String(r.subscription_id) === String(viewerRing.subscription_id),
    );
  }, [viewerRing, storyRings]);

  const viewerPrevRing = useMemo(() => {
    if (viewerRingIndex <= 0) return null;
    for (let i = viewerRingIndex - 1; i >= 0; i--) {
      if (storyRings[i]?.slides?.length) return storyRings[i];
    }
    return null;
  }, [viewerRingIndex, storyRings]);

  const viewerNextRing = useMemo(() => {
    if (viewerRingIndex < 0) return null;
    for (let i = viewerRingIndex + 1; i < storyRings.length; i++) {
      if (storyRings[i]?.slides?.length) return storyRings[i];
    }
    return null;
  }, [viewerRingIndex, storyRings]);

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
            <Image
              source={require('../assets/chat/plane.png')}
              style={styles.menuBadgeImage}
              resizeMode="contain"
            />
          </View>
        ) : null}
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onLogoPress}
        accessibilityRole="button"
        accessibilityLabel="Pi AI">
        <Image
          ref={logoImageRef}
          source={require('../assets/homeLogo.png')}
          style={[styles.logo, !logoRevealed && styles.logoHidden]}
          onLayout={() => {
            // Optional refine — only accepted in HomeIntroModal when close to
            // the computed header rect (3D flip face can skew measureInWindow).
            requestAnimationFrame(() => {
              logoImageRef.current?.measureInWindow?.((x, y, width, height) => {
                if (width > 0 && height > 0) {
                  setLogoTargetLayout({x, y, width, height});
                }
              });
            });
          }}
        />
      </TouchableOpacity>

      <View style={styles.content}>
        <Carusel
          categoriesList={userCategories}
          initialCategoryId={carouselCategoryId}
          onCategorySelect={handleCategorySelect}
        />
        {/* Tight header: pull up toward the carousel so the project video
            card below gains the freed height (grows toward the top). */}
        <View
          style={[styles.profileBarHeader, {marginTop: -14, marginBottom: 2}]}>
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
                paused={flipped || !isScreenActive}
                fallbackSource={FALLBACK_PROJECT_IMAGE}
                isMuted={featureMuted}
                onProgressChange={handleFeatureProgressChange}
                onPlaybackComplete={handleFeaturePlaybackComplete}
              />
              {!featureMediaLoading ? (
                <>
                  <View style={styles.projectCardDim} pointerEvents="none" />
                  <LinearGradient
                    colors={['rgba(34,31,60,0.12)', 'rgba(34,31,60,0.62)']}
                    locations={[0.3, 1]}
                    style={styles.projectCardGradient}
                    pointerEvents="none"
                  />
                  <View style={styles.projectCardOverlay} pointerEvents="none">
                    <Text
                      style={styles.projectCardTitle}
                      numberOfLines={2}
                      accessibilityRole="header">
                      {getFeatureProjectName(featureListing) || 'פרויקט נבחר'}
                    </Text>
                    <Text style={styles.projectCardCta}>צפו בפרויקט</Text>
                  </View>
                  {featureMedia?.type === 'video' ? (
                    <View
                      style={styles.videoControlsLayer}
                      pointerEvents="box-none">
                      <TouchableOpacity
                        style={styles.muteButton}
                        onPress={() => setFeatureMuted(m => !m)}
                        activeOpacity={0.7}
                        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                        accessibilityRole="button"
                        accessibilityLabel={
                          featureMuted ? 'הפעלת שמע' : 'השתקת שמע'
                        }>
                        <MaterialCommunityIcons
                          name={featureMuted ? 'volume-off' : 'volume-high'}
                          size={24}
                          color="#FFFFFF"
                        />
                      </TouchableOpacity>
                      <View style={styles.timelineTrack} pointerEvents="none">
                        <LinearGradient
                          colors={['#FFE073', '#FFBA30']}
                          locations={[0.11129, 0.86618]}
                          start={{x: 0, y: 0}}
                          end={{x: 1, y: 0}}
                          style={[
                            styles.timelineProgress,
                            {
                              width: `${Math.max(0, Math.min(100, featureProgress * 100))}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ) : null}
                </>
              ) : null}
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
    <>
      <HomeIntroModal
        visible={showIntroModal}
        targetLayout={logoTargetLayout}
        insetsTop={insets.top}
        onShown={onIntroModalShown}
        onHidden={() => setLogoRevealed(true)}
        onIntroMoveStart={onIntroMoveStart}
      />
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
            prevRing={viewerPrevRing}
            nextRing={viewerNextRing}
            onClose={handleCloseViewer}
            onAdvanceToNextUser={handleAdvanceToNextUser}
            onAdvanceToPrevUser={handleAdvanceToPrevUser}
            onOpenProfile={handleOpenStoryProfile}
          />
        </View>
      </View>
      </HomeBackground>
    </>
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
    top: -10,
    left: -8,
    width: 26,
    height: 26,
    zIndex: 2,
    elevation: 6,
  },
  menuBadgeImage: {
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    overflow: 'hidden',
  },
  logo: {
    alignSelf: 'center',
    width: 130,
    height: 122,
    marginTop: -36,
    resizeMode: 'contain',
  },
  /** Hidden until splash intro logo lands here — same asset, seamless handoff. */
  logoHidden: {
    opacity: 0,
  },
  content: {
    flex: 1,
  },
  projectCardSlot: {
    flex: 1,
    marginHorizontal: 20,
  },
  projectCardWrap: {
    flex: 1,
    position: 'relative',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  videoContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  projectCardDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 16,
  },
  projectCardGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  projectCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  projectCardTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 26,
    fontFamily: 'Rubik-SemiBold',
    textAlign: 'center',
    marginBottom: 2,
  },
  projectCardCta: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 34,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
    textDecorationLine: 'underline',
    textDecorationColor: '#FFFFFF',
  },
  projectImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#2B2A39',
  },
  heroVideoClip: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 16,
  },
  projectImagePlaceholder: {
    backgroundColor: '#2B2A39',
  },
  videoControlsLayer: {
    ...StyleSheet.absoluteFillObject,
    ...forceLtrStyle,
    zIndex: 11,
    elevation: 11,
  },
  muteButton: {
    position: 'absolute',
    left: 18,
    bottom: 20,
    width: 24,
    height: 24,
    zIndex: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
  },
  timelineTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  timelineProgress: {
    height: 4,
    borderRadius: 20.456,
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
