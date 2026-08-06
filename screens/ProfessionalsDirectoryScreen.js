import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {Video, ResizeMode} from 'expo-av';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {getProfessionalsDirectory, toSubscriptionId} from '../utils/api';
import {muxThumbnailUri, resolveAdVideoUri} from '../utils/videoPlayback';
import {
  PROFESSIONAL_FILTER_TYPES,
  getProfessionalSpecializationsForTypes,
  professionalMatchesTypeFilter,
} from '../utils/constant';
import {ProfileAvatar} from '../components';
import FilterSaveButton from '../components/FilterSaveButton';
import {flexEnd, flexStart, forceLtrStyle, forceRtlStyle} from '../utils/rtlLayout';

/** Pi badge layout is always LTR (number then star) — isolate from RTL card rows. */
const piBadgeLtrDirection =
  Platform.OS === 'web' ? {direction: 'ltr'} : null;

/** Web StyleSheet omits `direction`; apply on list rows so flex order matches native RTL. */
const listRtlDirection =
  Platform.OS === 'web' ? {direction: 'rtl'} : null;

const imgBackArrow =
  'https://www.figma.com/api/mcp/asset/7f09ed22-4005-48ed-88bc-b516005535ca';
const imgSearchOutline =
  'https://www.figma.com/api/mcp/asset/64d5a467-13ce-4fb9-ac0f-e97f15e3998f';
const imgSearchFill =
  'https://www.figma.com/api/mcp/asset/ef9a7923-13e3-4c40-87a5-ed642b1040cd';
const imgViewToggleLeftIcon = require('../assets/swiperleft.png');
const imgViewToggleRightIcon = require('../assets/swipereight.png');

/** Neutral sort (לא ממוין לפי דירוג): שני חיצים + דירוג */
const imgSortTwoArrows = require('../assets/profile/2-arows.png');
/** גבוה→נמוך (desc) / נמוך→גבוה (asc) */
const imgSortArrowUp = require('../assets/profile/arow-up.png');
const imgSortArrowDown = require('../assets/profile/arow-down.png');
const piBadgeSource = require('../assets/pi-badge.png');
const piBadgeSourceRing = require('../assets/pi-badge-ring.png');
const imgLocationPro = require('../assets/pros/location-pro.png');
const imgProfileRing =
  'https://www.figma.com/api/mcp/asset/9daf687f-169f-43ec-baf8-8539b1ebca51';
const imgProMessagesButton = require('../assets/pros/pro-messges.png');
/** Same gold bar asset pattern as filter sheets (`FilterSaveButton`); replace PNG if artwork should read חפש not שמור */
const SEARCH_BUTTON_PNG = require('../assets/buy-rent/search.png');

/** Reserve scroll padding so chips aren’t hidden under the pinned footer (~נקה + חפש strip). */
const SETTINGS_FOOTER_SCROLL_PADDING = 162;

const isBrokerDirectoryItem = professional =>
  String(professional?.subscription_type || '')
    .trim()
    .toLowerCase() === 'broker';

const collectTypes = professional => {
  if (isBrokerDirectoryItem(professional)) {
    return ['תיווך'];
  }
  return (Array.isArray(professional?.types) ? professional.types : [])
    .map(v => String(v || '').trim())
    .filter(Boolean);
};

/** Pros: התמחויות. Brokers: אזורי פעילות (same chip row under the address). */
const collectTags = professional => {
  const fromRegions = Array.isArray(professional?.activity_regions)
    ? professional.activity_regions
    : [];
  const fromSpecs = Array.isArray(professional?.specializations)
    ? professional.specializations
    : [];
  const source = isBrokerDirectoryItem(professional)
    ? fromRegions.length > 0
      ? fromRegions
      : fromSpecs
    : fromSpecs;
  return source
    .map(v => String(v || '').trim())
    .filter(Boolean)
    .slice(0, 3);
};

/** Mux HLS (or raw MP4 fallback) for a professional's intro video, if any. */
const resolveProfessionalVideoUri = professional => {
  if (!professional) return null;
  return resolveAdVideoUri({
    video_url: professional.video_url,
    video_hls_url: professional.video_hls_url,
    video_playback_url: professional.video_playback_url,
    video_status: professional.video_status,
  });
};

const formatRating = value => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return '5';
  return String(Math.round(num));
};
const getRatingValue = value => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 5;
  return num;
};

const ProfessionalPiRatingBadge = ({rating, variant = 'list'}) => {
  const ratingValue = getRatingValue(rating);
  const ratingText = formatRating(rating);
  const badgeSource = ratingValue > 4 ? piBadgeSourceRing : piBadgeSource;
  const isList = variant === 'list';

  return (
    <View
      style={[
        isList ? styles.listPiBadgeWrap : styles.cardPiBadgeWrap,
        piBadgeLtrDirection,
      ]}
      pointerEvents="box-none">
      <Text style={isList ? styles.listPiBadgeText : styles.cardPiBadgeText}>
        {ratingText}
      </Text>
      <Image
        source={badgeSource}
        style={isList ? styles.listPiBadgeImage : styles.cardPiBadgeImage}
        resizeMode="cover"
        accessibilityLabel="דירוג Pi"
      />
    </View>
  );
};

const isOwnProfessionalAccount = (professional, currentUser) => {
  if (!professional || !currentUser) return false;
  const mySubId = toSubscriptionId(
    currentUser?.id || currentUser?.subscription_id || currentUser?.owner_id,
  );
  const theirSubId = toSubscriptionId(
    professional?.id ||
      professional?.subscription_id ||
      professional?.owner_id,
  );
  const myEmail = String(currentUser?.email || '')
    .trim()
    .toLowerCase();
  const theirEmail = String(
    professional?.email || professional?.creator_email || '',
  )
    .trim()
    .toLowerCase();
  return (
    !!mySubId &&
    !!theirSubId &&
    mySubId === theirSubId &&
    (!myEmail || !theirEmail || myEmail === theirEmail)
  );
};

const ProfessionalCard = ({
  professional,
  onPress,
  onPressMessage,
  muted = true,
  onToggleMute,
  isOwnAccount = false,
  /** Only the on-screen card should decode/play — others show a still poster. */
  isVideoActive = false,
}) => {
  const tags = collectTags(professional);
  const types = collectTypes(professional);
  const mediaUrl = professional?.profile_image_url || null;
  const videoUri = resolveProfessionalVideoUri(professional);
  const posterUri =
    (videoUri && muxThumbnailUri(videoUri, {width: 480, time: 0})) ||
    mediaUrl ||
    null;
  const title = String(
    professional?.display_name ||
      (isBrokerDirectoryItem(professional) ? 'תיווך' : 'בעל מקצוע'),
  ).trim();
  const address = String(professional?.address || 'מיקום לא זמין').trim();
  const description = String(professional?.bio || 'ללא תיאור').trim();
  const webVideoRef = useCallback(
    node => {
      if (!node) return;
      node.muted = muted;
      if (isVideoActive) {
        const playPromise = node.play?.();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
      } else {
        node.pause?.();
      }
    },
    [muted, isVideoActive],
  );

  const renderMedia = () => {
    if (videoUri && isVideoActive) {
      if (Platform.OS === 'web') {
        return (
          <video
            ref={webVideoRef}
            src={videoUri}
            style={styles.cardMediaWebVideo}
            autoPlay
            muted={muted}
            loop
            playsInline
            poster={posterUri || undefined}
          />
        );
      }
      return (
        <Video
          key={videoUri}
          source={{uri: videoUri}}
          style={styles.cardMediaImage}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isMuted={muted}
          isLooping
          useNativeControls={false}
        />
      );
    }
    if (posterUri || mediaUrl) {
      return (
        <Image
          source={{uri: posterUri || mediaUrl}}
          style={styles.cardMediaImage}
          resizeMode="cover"
        />
      );
    }
    return <View style={[styles.cardMediaImage, styles.cardMediaFallback]} />;
  };

  return (
    <TouchableOpacity
      style={styles.cardShell}
      onPress={onPress}
      activeOpacity={0.9}>
      <View style={styles.cardMedia}>
        {renderMedia()}
        <LinearGradient
          colors={['rgba(129,129,129,0)', 'rgba(0,0,0,0.5)']}
          start={{x: 0.5, y: 0}}
          end={{x: 0.5, y: 1}}
          style={styles.cardMediaOverlay}
          pointerEvents="none"
        />
        {videoUri && isVideoActive ? (
          <TouchableOpacity
            style={styles.cardMuteButton}
            onPress={e => {
              e?.stopPropagation?.();
              onToggleMute?.();
            }}
            activeOpacity={0.85}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            accessibilityRole="button"
            accessibilityLabel={muted ? 'הפעל קול' : 'השתק'}>
            <MaterialCommunityIcons
              name={muted ? 'volume-off' : 'volume-high'}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardHeaderWrap}>
          <View style={styles.cardTitleAddressCol}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {title}
            </Text>
            {types.length > 0 ? (
              <View style={[styles.typesRow, listRtlDirection]}>
                {types.map(type => (
                  <View key={type} style={styles.tagChip}>
                    <Text style={styles.tagText} numberOfLines={1}>
                      {type}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            {!isBrokerDirectoryItem(professional) ? (
              <View style={styles.addressRow}>
                <View style={styles.pinIconWrap}>
                  <Image
                    source={imgLocationPro}
                    style={styles.pinIconLayer}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.addressText} numberOfLines={1}>
                  {address}
                </Text>
              </View>
            ) : null}
          </View>
          <ProfessionalPiRatingBadge
            rating={professional?.average_rating}
            variant="card"
          />
        </View>

        <View style={styles.tagsRow}>
          {tags.map(tag => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText} numberOfLines={1}>
                {tag}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.descriptionText} numberOfLines={1}>
          {description}
        </Text>

        <TouchableOpacity
          activeOpacity={isOwnAccount ? 1 : 0.85}
          disabled={isOwnAccount}
          onPress={e => {
            e?.stopPropagation?.();
            if (isOwnAccount) return;
            onPressMessage?.(professional);
          }}>
          <Image
            source={imgProMessagesButton}
            style={styles.messageBtnImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const ProfessionalListCard = ({professional, onPress}) => {
  const tags = collectTags(professional);
  const types = collectTypes(professional);
  const mediaUrl = professional?.profile_image_url || null;
  const title = String(
    professional?.display_name ||
      (isBrokerDirectoryItem(professional) ? 'תיווך' : 'בעל מקצוע'),
  ).trim();
  const address = String(professional?.address || 'מיקום לא זמין').trim();
  const avatarSubscriptionType = isBrokerDirectoryItem(professional)
    ? 'broker'
    : 'professional';

  return (
    <TouchableOpacity
      style={[styles.listCardShell, listRtlDirection]}
      onPress={onPress}
      activeOpacity={0.9}>
      <View style={[styles.listCardTopRow, listRtlDirection]}>
        <ProfileAvatar
          uri={mediaUrl}
          name={title}
          size={78}
          subscriptionType={avatarSubscriptionType}
        />
        <View style={[styles.listInfoCol, listRtlDirection]}>
          <View style={[styles.listTitleRow, listRtlDirection]}>
            <View style={[styles.listTitleTypesCol, listRtlDirection]}>
              <Text style={styles.listTitleText} numberOfLines={1}>
                {title}
              </Text>
              {types.length > 0 ? (
                <View style={[styles.listTypesRow, listRtlDirection]}>
                  {types.map(type => (
                    <View key={type} style={styles.listTagChip}>
                      <Text style={styles.listTagText} numberOfLines={1}>
                        {type}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
            <ProfessionalPiRatingBadge
              rating={professional?.average_rating}
              variant="list"
            />
          </View>

          {!isBrokerDirectoryItem(professional) ? (
            <View style={[styles.listAddressRow, listRtlDirection]}>
              <View style={styles.listPinIconWrap}>
                <Image
                  source={imgLocationPro}
                  style={styles.listPinIconLayer}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.listAddressText} numberOfLines={1}>
                {address}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={[styles.listTagsRow, listRtlDirection]}>
        {tags.map(tag => (
          <View key={tag} style={styles.listTagChip}>
            <Text style={styles.listTagText} numberOfLines={1}>
              {tag}
            </Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
};

const ProfessionalsDirectoryScreen = ({
  onClose,
  onOpenProfessional,
  onMessageProfessional,
  currentUser = null,
}) => {
  const insets = useSafeAreaInsets();
  const settingsScrollBottomPad =
    SETTINGS_FOOTER_SCROLL_PADDING + Math.max(0, insets.bottom);

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [professionals, setProfessionals] = useState([]);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('cards');
  /** Only one professional card video may be unmuted at a time. */
  const [unmutedVideoId, setUnmutedVideoId] = useState(null);
  /** Only the most-visible card mounts/plays a Video — prevents device freeze. */
  const [activeVideoId, setActiveVideoId] = useState(null);
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 55,
    minimumViewTime: 100,
  }).current;
  const onViewableItemsChanged = useRef(({viewableItems}) => {
    if (viewModeRef.current !== 'cards') {
      setActiveVideoId(null);
      return;
    }
    const active = (viewableItems || []).find(entry =>
      resolveProfessionalVideoUri(entry?.item),
    );
    const nextId = active?.item?.id ?? null;
    setActiveVideoId(nextId);
    setUnmutedVideoId(prev =>
      prev != null && String(prev) === String(nextId) ? prev : null,
    );
  }).current;
  const [showSearchSettings, setShowSearchSettings] = useState(false);
  const [draftLocation, setDraftLocation] = useState('');
  const [appliedLocation, setAppliedLocation] = useState('');
  const [draftTypeFilters, setDraftTypeFilters] = useState([]);
  const [draftExpertiseFilters, setDraftExpertiseFilters] = useState([]);
  const [appliedTypeFilters, setAppliedTypeFilters] = useState([]);
  const [appliedExpertiseFilters, setAppliedExpertiseFilters] = useState([]);
  const [ratingSortMode, setRatingSortMode] = useState('none'); // none -> desc -> asc

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProfessionalsDirectory();
      setProfessionals(
        Array.isArray(res?.professionals) ? res.professionals : [],
      );
    } catch (e) {
      setError(e.message || 'טעינה נכשלה');
      setProfessionals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = String(query || '')
      .trim()
      .toLowerCase();
    const base = professionals.filter(item => {
      const itemTypes = collectTypes(item);
      const itemTags = [
        ...(Array.isArray(item?.specializations) ? item.specializations : []),
        ...(Array.isArray(item?.activity_regions) ? item.activity_regions : []),
      ];
      const haystack = [
        item?.display_name,
        item?.address,
        item?.bio,
        isBrokerDirectoryItem(item) ? 'תיווך' : '',
        ...itemTags,
        ...itemTypes,
      ]
        .map(v => String(v || '').toLowerCase())
        .join(' ');
      if (q && !haystack.includes(q)) return false;

      const locationQuery = String(appliedLocation || '')
        .trim()
        .toLowerCase();
      if (locationQuery) {
        const locationHaystack = [
          item?.address,
          item?.display_name,
          item?.bio,
          ...itemTags,
        ]
          .map(v => String(v || '').toLowerCase())
          .join(' ');
        if (!locationHaystack.includes(locationQuery)) return false;
      }

      // Type chips are professional סוג filters — brokers always stay in the
      // directory (shown as תיווך) and are not excluded by those filters.
      if (appliedTypeFilters.length > 0 && !isBrokerDirectoryItem(item)) {
        if (
          !appliedTypeFilters.some(filterType =>
            professionalMatchesTypeFilter(filterType, itemTypes),
          )
        ) {
          return false;
        }
      }

      if (appliedExpertiseFilters.length > 0) {
        const expertiseSet = new Set(
          itemTags.map(v => String(v || '').trim()),
        );
        if (!appliedExpertiseFilters.some(tag => expertiseSet.has(tag)))
          return false;
      }

      return true;
    });
    if (ratingSortMode === 'none') return base;
    const sorted = [...base].sort((a, b) => {
      const aRating = getRatingValue(a?.average_rating);
      const bRating = getRatingValue(b?.average_rating);
      return ratingSortMode === 'desc' ? bRating - aRating : aRating - bRating;
    });
    return sorted;
  }, [
    professionals,
    query,
    appliedLocation,
    appliedTypeFilters,
    appliedExpertiseFilters,
    ratingSortMode,
  ]);

  const toggleRatingSort = () => {
    setRatingSortMode(prev =>
      prev === 'none' ? 'desc' : prev === 'desc' ? 'asc' : 'none',
    );
  };
  const typeOptions = PROFESSIONAL_FILTER_TYPES;

  const expertiseOptions = useMemo(
    () => getProfessionalSpecializationsForTypes(draftTypeFilters),
    [draftTypeFilters],
  );

  const toggleDraftFilter = (value, kind) => {
    if (kind === 'type') {
      setDraftTypeFilters(prev => {
        const next = prev.includes(value)
          ? prev.filter(v => v !== value)
          : [...prev, value];
        const validSpecs = new Set(
          getProfessionalSpecializationsForTypes(next),
        );
        setDraftExpertiseFilters(prevExp =>
          prevExp.filter(spec => validSpecs.has(spec)),
        );
        return next;
      });
      return;
    }
    setDraftExpertiseFilters(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value],
    );
  };

  const openSearchSettings = () => {
    setDraftLocation(appliedLocation);
    setDraftTypeFilters(appliedTypeFilters);
    setDraftExpertiseFilters(appliedExpertiseFilters);
    setShowSearchSettings(true);
  };

  const applySearchSettings = () => {
    setAppliedLocation(draftLocation.trim());
    setAppliedTypeFilters(draftTypeFilters);
    setAppliedExpertiseFilters(draftExpertiseFilters);
    setShowSearchSettings(false);
  };

  const clearSearchSettings = () => {
    setDraftLocation('');
    setDraftTypeFilters([]);
    setDraftExpertiseFilters([]);
    setAppliedLocation('');
    setAppliedTypeFilters([]);
    setAppliedExpertiseFilters([]);
  };

  const hasAppliedSearchFilters = useMemo(
    () =>
      String(appliedLocation || '').trim().length > 0 ||
      appliedTypeFilters.length > 0 ||
      appliedExpertiseFilters.length > 0,
    [appliedLocation, appliedTypeFilters, appliedExpertiseFilters],
  );

  return (
    <View style={styles.safe}>
      <View style={[styles.topNav, {paddingTop: insets.top}]}>
        <View style={styles.titleRow}>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.85}
            style={styles.backButton}
            hitSlop={12}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={28}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>בעלי מקצוע בתחום הנדל״ן</Text>
          <View style={styles.titleRightSpacer} />
        </View>

        <View style={styles.searchField}>
          <View style={styles.searchInputGroup}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
              textAlign="right"
              placeholder="סוג, שם העסק, התמחות, עיר"
              placeholderTextColor="rgba(255,255,255,0.35)"
            />
            <MaterialCommunityIcons
              name="magnify"
              size={22}
              color="rgba(255,255,255,0.55)"
            />
          </View>
          <TouchableOpacity
            onPress={openSearchSettings}
            activeOpacity={0.85}
            style={styles.searchFilterBtn}
            accessibilityLabel={
              hasAppliedSearchFilters
                ? 'סינון פעיל — פתח הגדרות חיפוש'
                : 'פתח הגדרות חיפוש'
            }>
            <MaterialCommunityIcons
              name="tune-vertical"
              size={22}
              color="#FFFFFF"
            />
            {hasAppliedSearchFilters ? (
              <View
                style={styles.searchFilterAppliedDot}
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            ) : null}
          </TouchableOpacity>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.sortPill, styles.sortPillImageOnly]}
            onPress={toggleRatingSort}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={
              ratingSortMode === 'none'
                ? 'מיין לפי דירוג'
                : ratingSortMode === 'desc'
                  ? 'ממוין לפי דירוג גבוה לנמוך'
                  : 'ממוין לפי דירוג נמוך לגבוה'
            }>
            <Image
              source={
                ratingSortMode === 'none'
                  ? imgSortTwoArrows
                  : ratingSortMode === 'desc'
                    ? imgSortArrowUp
                    : imgSortArrowDown
              }
              style={styles.sortPillFullImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View style={styles.viewToggle}>
            <View style={styles.viewToggleRightInactive}>
              <TouchableOpacity
                onPress={() => {
                  setUnmutedVideoId(null);
                  setActiveVideoId(null);
                  setViewMode(prev => (prev === 'cards' ? 'list' : 'cards'));
                }}
                activeOpacity={0.9}>
                <Image
                  source={
                    viewMode === 'cards'
                      ? imgViewToggleRightIcon
                      : imgViewToggleLeftIcon
                  }
                  style={styles.cardsIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FFC40A" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} activeOpacity={0.85}>
            <Text style={styles.retryText}>נסה שוב</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>לא נמצאו בעלי מקצוע</Text>
        </View>
      ) : (
        <FlatList
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          data={filtered}
          keyExtractor={item => String(item.id)}
          extraData={`${viewMode}:${activeVideoId}:${unmutedVideoId}`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          // Keep a small window mounted; off-screen cards must not keep Video alive.
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          renderItem={({item}) => {
            const isOwnAccount = isOwnProfessionalAccount(item, currentUser);
            if (viewMode === 'cards') {
              return (
                <ProfessionalCard
                  professional={item}
                  isOwnAccount={isOwnAccount}
                  isVideoActive={
                    String(activeVideoId) === String(item.id)
                  }
                  muted={String(unmutedVideoId) !== String(item.id)}
                  onToggleMute={() =>
                    setUnmutedVideoId(prev =>
                      String(prev) === String(item.id) ? null : item.id,
                    )
                  }
                  onPress={() => onOpenProfessional?.(item)}
                  onPressMessage={() => {
                    if (isOwnAccount) return;
                    onMessageProfessional?.(item);
                  }}
                />
              );
            }
            return (
              <ProfessionalListCard
                professional={item}
                onPress={() => onOpenProfessional?.(item)}
              />
            );
          }}
        />
      )}

      {showSearchSettings ? (
        <View style={[styles.settingsOverlay, {paddingTop: insets.top}]}>
          <View style={styles.settingsMain}>
            <View style={styles.settingsTop}>
              <View style={styles.settingsTitleRow}>
                <TouchableOpacity
                  onPress={() => setShowSearchSettings(false)}
                  activeOpacity={0.85}
                  style={styles.settingsBackBtn}
                  hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
                  accessibilityRole="button"
                  accessibilityLabel="חזרה">
                  <MaterialCommunityIcons
                    name="chevron-left"
                    size={28}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
                <Text style={styles.settingsTitle}>הגדרות חיפוש</Text>
                <View style={styles.titleRightSpacer} />
              </View>
            </View>

            <ScrollView
              style={styles.settingsScrollFlex}
              contentContainerStyle={[
                styles.settingsContent,
                {paddingBottom: settingsScrollBottomPad},
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>מיקום</Text>
                <View style={styles.settingsInputWrap}>
                  <TextInput
                    value={draftLocation}
                    onChangeText={setDraftLocation}
                    placeholder=""
                    placeholderTextColor="#FFFFFF"
                    style={styles.settingsInput}
                    textAlign="right"
                  />
                </View>
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>סוג</Text>
                <View style={styles.settingsChipWrap}>
                  {typeOptions.map(tag => {
                    const active = draftTypeFilters.includes(tag);
                    return (
                      <TouchableOpacity
                        key={`type-${tag}`}
                        style={[
                          styles.settingsChip,
                          active && styles.settingsChipActive,
                        ]}
                        onPress={() => toggleDraftFilter(tag, 'type')}
                        activeOpacity={0.85}>
                        <Text
                          style={[
                            styles.settingsChipText,
                            active && styles.settingsChipTextActive,
                          ]}>
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>התמחות</Text>
                {draftTypeFilters.length === 0 ? (
                  <Text style={styles.settingsHintText}>
                    בחר סוג כדי לראות התמחויות רלוונטיות
                  </Text>
                ) : (
                  <View style={styles.settingsChipWrap}>
                    {expertiseOptions.map(tag => {
                      const active = draftExpertiseFilters.includes(tag);
                      return (
                        <TouchableOpacity
                          key={`expertise-${tag}`}
                          style={[
                            styles.settingsChip,
                            active && styles.settingsChipActive,
                          ]}
                          onPress={() => toggleDraftFilter(tag, 'expertise')}
                          activeOpacity={0.85}>
                          <Text
                            style={[
                              styles.settingsChipText,
                              active && styles.settingsChipTextActive,
                            ]}>
                            {tag}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            </ScrollView>
          </View>

          <View
            style={[
              styles.settingsBottom,
              {paddingBottom: Math.max(8, insets.bottom + 4)},
            ]}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={clearSearchSettings}
              activeOpacity={0.9}>
              <Text style={styles.clearBtnText}>נקה תוצאות</Text>
            </TouchableOpacity>
            <FilterSaveButton
              source={SEARCH_BUTTON_PNG}
              accessibilityLabel="חפש"
              onPress={applySearchSettings}
              style={styles.searchBtnWrap}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1F1E27',
    alignSelf: 'center',
    ...Platform.select({
      web: {
        minHeight: '100vh',
      },
      default: {},
    }),
  },
  topNav: {
    backgroundColor: '#1E1D27',
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: {width: 0, height: 10},
    elevation: 5,
  },
  titleRow: {
    height: 40,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 9,
    height: 11,
  },
  screenTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
  },
  titleRightSpacer: {
    width: 24,
    height: 24,
  },
  searchField: {
    height: 52,
    borderWidth: 1,
    borderColor: '#8C85B3',
    borderRadius: 1000,
    paddingLeft: 10,
    paddingRight: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchActionIcon: {
    width: 24,
    height: 24,
  },
  searchFilterBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  /** Figma 10:23125 — cyan dot on filter icon when settings filters are applied. */
  searchFilterAppliedDot: {
    position: 'absolute',
    top: 1,
    right: 0,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34F3E0',
  },
  searchInputGroup: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    letterSpacing: 0.2,
    lineHeight: 22,
    paddingVertical: 0,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  controlsRow: {
    width: '100%',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sortPill: {
    minWidth: 56,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Full-bleed PNG (2 arrows / up / down + דירוג) */
  sortPillImageOnly: {
    paddingHorizontal: 0,
    paddingVertical: 2,
    minWidth: 56,
    minHeight: 32,
  },
  sortPillFullImage: {
    width: 56,
    height: 28,
  },
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewToggleRight: {
    borderRadius: 8,
    padding: 2,
  },
  viewToggleRightInactive: {
    backgroundColor: '#2B2A39',
    borderRadius: 8,
    padding: 2,
  },
  listIcon: {
    width: 56,
    height: 28,
  },
  cardsIcon: {
    width: 56,
    height: 28,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 70,
    paddingTop: 10,
    gap: 16,
  },
  cardShell: {
    borderRadius: 16,
    overflow: 'hidden',
    width: "100%",
    alignSelf: 'center',
    backgroundColor: '#2B2A39',
  },
  listCardShell: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#2B2A39',
    padding: 20,
    gap: 20,
    ...forceRtlStyle,
  },
  listCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    ...forceRtlStyle,
  },
  listInfoCol: {
    flex: 1,
    minWidth: 0,
    gap: 16,
    ...forceRtlStyle,
  },
  listTitleRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    ...forceRtlStyle,
  },
  listTitleTypesCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    alignSelf: 'stretch',
    ...forceRtlStyle,
  },
  listPiBadgeWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
    position: 'relative',
    minWidth: 48,
    minHeight: 48,
    ...forceLtrStyle,
  },
  listPiBadgeText: {
    color: '#FFD275',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0.16,
    fontFamily: 'Rubik-Medium',
    // right: 28,
    top: 4,
    zIndex: 1,
    // Vertically center the number on the star (was sitting slightly low).
    transform: [{translateY: -5}],
  },
  listPiBadgeImage: {
    width: 72,
    height: 72,
    position: 'absolute',
    marginLeft: -7,
    top: -20,
    ...(Platform.OS === 'web' ? {objectFit: 'cover'} : {}),
  },
  listTitleText: {
    color: '#F7F3E6',
    textAlign: Platform.OS === 'web' ? 'right' : 'left',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Rubik-Medium',
    alignSelf: 'stretch',
  },
  listTypesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: flexStart,
    alignSelf: 'stretch',
    ...forceRtlStyle,
  },
  listAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    alignSelf: 'stretch',
    gap: 4,
    ...forceRtlStyle,
  },
  listAddressText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.5447,
    fontFamily: 'Rubik-Regular',
    textAlign: Platform.OS === 'web' ? 'right' : 'left',
    flexShrink: 1,
  },
  listPinIconWrap: {
    width: 20,
    height: 20,
    position: 'relative',
  },
  listPinIconLayer: {
    ...StyleSheet.absoluteFillObject,
    width: 20,
    height: 20,
  },
  listProfileWrap: {
    width: 78,
    height: 78,
    position: 'relative',
  },
  listProfileRing: {
    width: 78,
    height: 78,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  listProfileImage: {
    position: 'absolute',
    left: 6,
    top: 6,
    width: 66,
    height: 66,
    borderRadius: 1000,
  },
  listTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: flexStart,
    ...forceRtlStyle,
  },
  listTagChip: {
    height: 28.143,
    borderRadius: 35.714,
    borderWidth: 0.714,
    borderColor: '#FFFFFF',
    paddingHorizontal: 9.286,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTagText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  cardMedia: {
    height: 212,
    position: 'relative',
    backgroundColor: '#1E1D27',
    overflow: 'hidden',
  },
  cardMediaImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E1D27',
  },
  cardMediaWebVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    backgroundColor: '#1E1D27',
  },
  cardMediaFallback: {
    backgroundColor: '#5A5670',
  },
  cardMediaOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  speakerIcon: {
    position: 'absolute',
    left: 18,
    top: 208,
    width: 24,
    height: 24,
  },
  cardMuteButton: {
    position: 'absolute',
    left: 18,
    bottom: 20,
    width: 24,
    height: 24,
    zIndex: 12,
    elevation: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  timelineProgress: {
    width: '38%',
    height: 4,
    borderRadius: 20.456,
  },
  cardContent: {
    backgroundColor: '#2B2A39',
    borderWidth: 1,
    borderColor: '#2B2A39',
    padding: 14,
    paddingBottom: 16,
    gap: 16,
    minHeight: 244,
    justifyContent: 'space-between',
  },
  cardHeaderWrap: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
    justifyContent: flexStart,
  },
  cardTitleAddressCol: {
    flex: 1,
    alignItems: flexStart,
    justifyContent: 'center',
    gap: 12,
  },
  cardPiBadgeWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
    position: 'relative',
    minWidth: 48,
    minHeight: 48,
    ...forceLtrStyle,
  },
  cardPiBadgeText: {
    color: '#FFD275',
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Medium',
    zIndex: 1,
    // right: 28,
    top: 4,
    // Vertically center the number on the star (was sitting slightly low).
    transform: [{translateY: -6}],
  },
  cardPiBadgeImage: {
    width: 72,
    height: 72,
    position: 'absolute',
    marginLeft: -7,
    top: -20,
    ...(Platform.OS === 'web' ? {objectFit: 'cover'} : {}),
  },
  cardTitle: {
    color: '#F7F3E6',
    fontSize: 28,
    lineHeight: 31,
    fontFamily: 'Rubik-SemiBold',
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  typesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: flexStart,
    gap: 6,
    alignSelf: 'stretch',
    ...forceRtlStyle,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 4,
  },
  addressText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.5447,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
  },
  pinIconWrap: {
    width: 18,
    height: 18,
    position: 'relative',
  },
  pinIconLayer: {
    ...StyleSheet.absoluteFillObject,
    width: 18,
    height: 18,
  },
  tagsRow: {
    flexDirection: 'row',
    justifyContent: flexStart,
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    height: 23,
    borderRadius: 30,
    borderWidth: 0.714,
    borderColor: '#FFFFFF',
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
  },
  descriptionText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
  },
  messageBtnImage: {
    width: '100%',
    height: 40,
    alignSelf: 'stretch',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#C8C8C8',
    marginBottom: 12,
    fontFamily: 'Rubik-Regular',
  },
  retryText: {
    color: '#FFC40A',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
  },
  emptyText: {
    marginTop: 40,
    color: '#C8C8C8',
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
  },
  settingsOverlay: {
    /** Web: `fixed` + `100vh` pins to the viewport; `absolute` was tied to a short parent so the footer sat off-screen until page scroll. */
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    zIndex: 5000,
    backgroundColor: '#1F1E27',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    ...Platform.select({
      web: {
        height: '100vh',
        maxHeight: '100vh',
      },
      default: {},
    }),
  },
  settingsMain: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#1F1E27',
  },
  settingsTop: {
    paddingHorizontal: 24,
    paddingTop: 11,
    paddingBottom: 10,
  },
  settingsTitleRow: {
    minHeight: 44,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsBackBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
  },
  settingsScrollFlex: {
    flex: 1,
    minHeight: 0,
  },
  settingsContent: {
    paddingHorizontal: 24,
    gap: 16,
    flexGrow: 0,
  },
  settingsSection: {
    gap: 12,
    alignItems: flexStart,
  },
  settingsSectionTitle: {
    color: '#D2D0DC',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
  },
  settingsHintText: {
    color: '#8C85B3',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
  },
  settingsInputWrap: {
    width: '100%',
    height: 52,
    borderWidth: 1,
    borderColor: '#8C85B3',
    borderRadius: 1000,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  settingsInput: {
    color: '#FFFFFF',
    fontSize: 20,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  settingsChipWrap: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: flexStart,
    gap: 6,
  },
  settingsChip: {
    height: 27.143,
    borderWidth: 0.714,
    borderColor: '#FFFFFF',
    borderRadius: 35.714,
    paddingHorizontal: 9.286,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsChipActive: {
    borderColor: '#FFC40A',
  },
  settingsChipText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
  },
  settingsChipTextActive: {
    color: '#FFC40A',
  },
  settingsBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    paddingTop: 8,
    paddingHorizontal: 24,
    gap: 7,
    alignItems: 'center',
    backgroundColor: '#1F1E27',
  },
  clearBtn: {
    width: '100%',
    height: 44,
    borderRadius: 1000,
    backgroundColor: '#4D4966',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Medium',
  },
  searchBtnWrap: {
    width: '100%',
  },
});

export default ProfessionalsDirectoryScreen;
