import React, {useRef, useState, useEffect, useMemo} from 'react';
import {
  View,
  ScrollView,
  Image,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  PanResponder,
  Animated,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Colors} from '../constants/styles';
import {
  getListings,
  recordListingView,
  likeListing,
  unlikeListing,
  likePost,
  unlikePost,
  getPostComments,
  addPostComment,
  reactToPostComment,
  clearPostCommentReaction,
  getReviews,
} from '../utils/api';
import {getUserProfileImageUrl} from '../utils/userProfileImage';
import {categoryImages, subscriptionTypes} from '../utils/constant';

// Sidebar filter buttons: each filters ads by type (maps to API subscription_type / has_video)
// Top bar center filters - icons from assets/top-filters
const TOP_BAR_FILTERS = [
  {id: 'pics', icon: require('../assets/top-filters/pics.png')},
  {id: 'list', icon: require('../assets/top-filters/list.png')},
  {id: 'video', icon: require('../assets/top-filters/video.png')},
  {id: 'liked', icon: require('../assets/top-filters/liked.png')},
];

const TIKTOK_OVERLAY_ICONS = {
  heart: require('../assets/tiktok-heart-icon.svg'),
  location: require('../assets/tiktok/location.png'),
  preSaleBadge: require('../assets/pre-sale.png'),
  postLike: require('../assets/tiktok/likes.png'),
  postComment: require('../assets/tiktok/comments.png'),
  postShare: require('../assets/tiktok/shere.png'),
  postView: require('../assets/tiktok/views.png'),
  companyHome: require('../assets/tiktok/company-home.png'),
  companyDoor: require('../assets/tiktok/צילום_מסך_2026-04-09_160628-removebg-preview.png'),
  companyStairs: require('../assets/tiktok/צילום_מסך_2026-04-09_160920-removebg-preview.png'),
  companyBuilding: require('../assets/tiktok/צילום_מסך_2026-04-09_161056-removebg-preview.png'),
  commentsCardHeart: require('../assets/tiktok/comment-like.png'),
  commentsCardHeartLiked: require('../assets/tiktok/comment-like-active.png'),
  commentsCardReply: require('../assets/tiktok/comments-card-reply.png'),
  commentsCamera: require('../assets/tiktok/cam-comments.png'),
  commentsDislike: require('../assets/tiktok/dislike.png'),
  ratingOneToFour: require('../assets/tiktok/1-4hurt.png'),
  ratingFiveStars: require('../assets/tiktok/5stars.png'),
};

const COMMENT_REACTIONS = ['😂', '😅', '😁', '🥰', '🥹', '😊'];
const ACTIVE_FILTER_COLOR = '#FFC40A';
const FIGMA_TYPE_ICON = {
  uri: 'https://www.figma.com/api/mcp/asset/0e00760a-32a6-4ead-ad3e-78a69ca1de80',
};

// Bottom bar: 5 icons with labels (assets from buttom-bar). On global category, apartment item shows "סוג" + menu icon.
const BOTTOM_BAR_ITEMS = [
  {id: 'price', label: 'מחיר', icon: require('../assets/buttom-bar/price.png'), isPost: false},
  {id: 'rooms', label: 'חדרים', icon: require('../assets/buttom-bar/rooms_number.png'), iconCommerce: require('../assets/meter.png'), labelCommerce: 'מטר', iconLand: FIGMA_TYPE_ICON, labelLand: 'סוג', iconPartners: require('../assets/haadafot.png'), labelPartners: 'העדפות', isPost: false},
  {id: 'post', label: 'פרסם', icon: require('../assets/buttom-bar/post.png'), isPost: true},
  {
    id: 'apartment',
    label: 'סוג דירה',
    icon: require('../assets/buttom-bar/appartment_type.png'),
    iconGlobal: FIGMA_TYPE_ICON,
    labelGlobal: 'סוג',
    iconOffices: FIGMA_TYPE_ICON,
    labelOffices: 'סוג',
    iconLandDonam: require('../assets/donam.png'),
    labelLandDonam: 'דונם',
    isPost: false,
  },
  {id: 'city', label: 'עיר', icon: require('../assets/buttom-bar/city.png'), isPost: false},
];

// Icons from assets/side-filters
const SIDEBAR_FILTERS = [
  {id: 'personal', label: 'פרטי', subscription_type: 'user', icon: require('../assets/side-filters/private.png')},
  {id: 'broker', label: 'תיווך', subscription_type: 'broker', icon: require('../assets/side-filters/broker.png')},
  {id: 'renderings', label: 'הדמיות', has_video: true, icon: require('../assets/side-filters/animation.png')},
  {id: 'new', label: 'חדשות', icon: require('../assets/side-filters/new.png')},
  {id: 'posts', label: 'פוסטים', icon: require('../assets/side-filters/posts.png')},
  {id: 'service', label: 'נותני שירות', subscription_type: 'professional', icon: require('../assets/side-filters/services.png')},
];

// שותפים (category 3): dedicated sidebar — icons from assets/partners-filters
const PARTNERS_SIDEBAR_FILTERS = [
  {
    id: 'partners_enter',
    label: 'מחפש להיכנס',
    search_purpose: 'enter',
    icon: require('../assets/partners-filters/looking-to-get-in.png'),
  },
  {
    id: 'partners_bring_in',
    label: 'מחפש להכניס',
    search_purpose: 'bring_in',
    icon: require('../assets/partners-filters/looking-for-somone-for-my-apaprtment.png'),
  },
  {
    id: 'partners_partner',
    label: 'מחפש שותף',
    search_purpose: 'partner',
    icon: require('../assets/partners-filters/looking-for-patner.png'),
  },
  {
    id: 'partners_posts',
    label: 'פוסטים',
    feed_post: true,
    icon: require('../assets/partners-filters/posts.png'),
  },
  {
    id: 'partners_professional',
    label: 'נותני שירות',
    subscription_type: 'professional',
    icon: require('../assets/partners-filters/profetional.png'),
  },
];

// BnB (category 5): אופי האירוח + פוסטים — icons from assets/bnb-filters
const BNB_SIDEBAR_FILTERS = [
  {
    id: 'bnb_landscapes',
    label: 'נופים',
    hospitality_nature: 'landscapes',
    icon: require('../assets/bnb-filters/view.png'),
  },
  {
    id: 'bnb_beach',
    label: 'על הים',
    hospitality_nature: 'on_the_beach',
    icon: require('../assets/bnb-filters/on-the-sea.png'),
  },
  {
    id: 'bnb_pool',
    label: 'עם בריכה',
    hospitality_nature: 'with_pool',
    icon: require('../assets/bnb-filters/pool.png'),
  },
  {
    id: 'bnb_nature',
    label: 'טבע',
    hospitality_nature: 'nature',
    icon: require('../assets/bnb-filters/neture.png'),
  },
  {
    id: 'bnb_experiences',
    label: 'חוויות',
    hospitality_nature: 'experiences',
    icon: require('../assets/bnb-filters/expiriance.png'),
  },
  {
    id: 'bnb_rural',
    label: 'כפרי',
    hospitality_nature: 'rural',
    icon: require('../assets/bnb-filters/vilage.png'),
  },
  {
    id: 'bnb_desert',
    label: 'מדבר',
    hospitality_nature: 'desert',
    icon: require('../assets/bnb-filters/desert.png'),
  },
  {
    id: 'bnb_posts',
    label: 'פוסטים',
    feed_post: true,
    icon: require('../assets/bnb-filters/posts.png'),
  },
];

// Image Swiper Component for multiple photos - supports slideshow and collage
const ImageSwiper = ({
  images,
  screenHeight,
  video,
  displayOption = 'slideshow',
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (scrollViewRef.current && displayOption === 'slideshow') {
      scrollViewRef.current.scrollTo({
        x: currentImageIndex * Dimensions.get('window').width,
        animated: true,
      });
    }
  }, [currentImageIndex, displayOption]);

  const handleScroll = event => {
    if (displayOption === 'slideshow') {
      const contentOffsetX = event.nativeEvent.contentOffset.x;
      const viewWidth = Dimensions.get('window').width;
      const newIndex = Math.round(contentOffsetX / viewWidth);
      if (newIndex !== currentImageIndex) {
        setCurrentImageIndex(newIndex);
      }
    }
  };

  // Collage view - show all images in a grid with specific layouts for 1-5 images
  if (displayOption === 'collage' && images.length > 0) {
    const imageCount = Math.min(images.length, 5); // Support up to 5 images
    const screenWidth = Dimensions.get('window').width;

    // Define specific layouts for each image count
    const getImageLayout = index => {
      switch (imageCount) {
        case 1:
          // Single image: Full screen - centered with contain mode
          return {
            width: screenWidth,
            height: screenHeight,
            top: 0,
            left: 0,
          };

        case 2:
          // Two images: Side by side
          return {
            width: screenWidth / 2,
            height: screenHeight,
            top: 0,
            left: index * (screenWidth / 2),
          };

        case 3:
          // Three images: One large on top, two small below
          if (index === 0) {
            return {
              width: screenWidth,
              height: screenHeight / 2,
              top: 0,
              left: 0,
            };
          } else {
            return {
              width: screenWidth / 2,
              height: screenHeight / 2,
              top: screenHeight / 2,
              left: (index - 1) * (screenWidth / 2),
            };
          }

        case 4:
          // Four images: 2x2 grid
          const isTopRow = index < 2;
          return {
            width: screenWidth / 2,
            height: screenHeight / 2,
            top: isTopRow ? 0 : screenHeight / 2,
            left: (index % 2) * (screenWidth / 2),
          };

        case 5:
          // Five images: 2 stacked on left + 3 stacked on right.
          // Index map: [0,1] on left column, [2,3,4] on right column.
          if (index <= 1) {
            const leftHeight = screenHeight / 2;
            return {
              width: screenWidth / 2,
              height: leftHeight,
              top: index * leftHeight,
              left: 0,
            };
          }
          const rightIndex = index - 2; // 0,1,2
          const rightHeight = screenHeight / 3;
          return {
            width: screenWidth / 2,
            height: rightHeight,
            top: rightIndex * rightHeight,
            left: screenWidth / 2,
          };

        default:
          // Fallback: Equal grid
          const cols = Math.ceil(Math.sqrt(imageCount));
          const rows = Math.ceil(imageCount / cols);
          return {
            width: screenWidth / cols,
            height: screenHeight / rows,
            top: Math.floor(index / cols) * (screenHeight / rows),
            left: (index % cols) * (screenWidth / cols),
          };
      }
    };

    return (
      <View
        style={[
          styles.videoItem,
          {
            height: screenHeight,
            minHeight: screenHeight,
            maxHeight: screenHeight,
            position: 'relative',
          },
        ]}>
        <View style={styles.collageContainer}>
          {images.slice(0, 5).map((image, index) => {
            const layout = getImageLayout(index);
            return (
              <View
                key={index}
                style={[
                  styles.collageImageContainer,
                  {
                    position: 'absolute',
                    width: layout.width,
                    height: layout.height,
                    top: layout.top,
                    left: layout.left,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#000',
                    borderWidth: imageCount > 1 ? 2 : 0,
                    borderColor: '#1E1D27',
                  },
                ]}>
                <Image
                  source={{uri: image.uri}}
                  style={[
                    imageCount === 1
                      ? styles.collageImageSingle
                      : styles.collageImage,
                    imageCount === 1 && {
                      maxWidth: layout.width,
                      maxHeight: layout.height,
                    },
                  ]}
                  resizeMode={imageCount === 1 ? 'contain' : 'cover'}
                />
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // Slideshow view - swipe horizontally between images
  // For single images, ensure they're centered and fully visible
  const isSingleImage = images.length === 1;

  return (
    <View
      style={[
        styles.videoItem,
        {
          height: screenHeight,
          minHeight: screenHeight,
          maxHeight: screenHeight,
          justifyContent: isSingleImage ? 'center' : 'flex-start',
          alignItems: isSingleImage ? 'center' : 'flex-start',
        },
      ]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.imageSwiper}
        scrollEnabled={!isSingleImage} // Disable scrolling for single image
      >
        {images.map((image, index) => (
          <View
            key={index}
            style={[
              styles.swiperImageContainer,
              isSingleImage && styles.swiperImageContainerSingle,
            ]}>
            <Image
              source={{uri: image.uri}}
              style={[
                styles.swiperImage,
                isSingleImage && styles.swiperImageSingle,
              ]}
              resizeMode="contain"
            />
          </View>
        ))}
      </ScrollView>
      {images.length > 1 && (
        <View style={styles.imageIndicator}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicatorDot,
                index === currentImageIndex && styles.indicatorDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

/**
 * TikTokFeedScreen Component
 * Vertical scrolling feed with TikTok-like behavior
 * Only one video/image visible at a time, snaps to each item
 */
const TikTokFeedScreen = ({
  onClose,
  onOpenOfficeListing,
  onOpenEditPublishAdWithCategory,
  onOpenPostEditor,
  onOpenCityFilter,
  onOpenApartmentTypeFilter,
  onOpenTypeFilter,
  onOpenOfficeFilter,
  onOpenRoomsFilter,
  onOpenMeterFilter,
  onOpenDonamFilter,
  onOpenPreferencesFilter,
  onOpenPriceFilter,
  onOpenUserProfile,
  uploadedListings = [],
  selectedCategory = null,
  feedFilters = {},
  currentUser = null,
}) => {
  const isFilterValueActive = value => {
    if (value == null) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'boolean') return value;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return false;
  };

  const scrollViewRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const bottomSheetTranslateY = useRef(new Animated.Value(0)).current;
  const bottomSheetUseNativeDriver = Platform.OS !== 'web';
  const [dbListings, setDbListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [listingsError, setListingsError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // Force refresh when this changes
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const SIDEBAR_INTRO_MAX_DOWN_FALLBACK = 420;
  const SIDEBAR_HIDE_BOTTOM_COUNT = 2;
  const SIDEBAR_FILTER_HEIGHT_FALLBACK = 64;
  const sidebarDragY = useRef(new Animated.Value(SIDEBAR_INTRO_MAX_DOWN_FALLBACK)).current;
  const sidebarDragOffset = useRef(SIDEBAR_INTRO_MAX_DOWN_FALLBACK); // keep in sync for pan responder
  const [sidebarViewportHeight, setSidebarViewportHeight] = useState(0);
  const [sidebarProfileHeight, setSidebarProfileHeight] = useState(60);
  const [sidebarFilterHeight, setSidebarFilterHeight] = useState(
    SIDEBAR_FILTER_HEIGHT_FALLBACK,
  );
  const [sidebarFilterLayouts, setSidebarFilterLayouts] = useState({});
  const [selectedSidebarFilter, setSelectedSidebarFilter] = useState(null); // id from SIDEBAR_FILTERS or null = all
  const [selectedTopBarFilter, setSelectedTopBarFilter] = useState(null); // 'pics' | 'video' | 'liked' | null; list does nothing
  const [likedListingIds, setLikedListingIds] = useState(new Set()); // persisted to AsyncStorage
  const [likedPostIds, setLikedPostIds] = useState(new Set()); // persisted to AsyncStorage
  const postLikePendingIdsRef = useRef(new Set()); // prevent duplicate taps/race requests per post
  const [showUserSearchPanel, setShowUserSearchPanel] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [failedSearchAvatarKeys, setFailedSearchAvatarKeys] = useState(new Set());
  const [userRatingByProfileId, setUserRatingByProfileId] = useState({});
  const [allUsersSearchListings, setAllUsersSearchListings] = useState([]);
  const [showCommentsSheet, setShowCommentsSheet] = useState(false);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const lastViewedListingIdRef = useRef(null); // avoid recording same view twice
  const [dimensions, setDimensions] = useState({
    height: Dimensions.get('window').height,
    width: Dimensions.get('window').width,
  });
  const feedScrollY = useRef(new Animated.Value(0)).current;
  const overlayBaseY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        height: Dimensions.get('window').height,
        width: Dimensions.get('window').width,
      });
    };

    const subscription = Dimensions.addEventListener(
      'change',
      updateDimensions,
    );
    return () => subscription?.remove();
  }, []);

  const screenHeight = dimensions.height;
  const screenWidth = dimensions.width;
  const feedOverlayTranslateY = useMemo(
    () => Animated.subtract(overlayBaseY, feedScrollY),
    [overlayBaseY, feedScrollY],
  );

  // גלובל (4) ומגזר דתי (6): טעינת כל הקטגוריות מה-API, סינון לפי מחיר/חדרים/סוג/עיר בצד לקוח
  const isAggregateCategoryFeed =
    selectedCategory === 4 ||
    selectedCategory === '4' ||
    selectedCategory === 6 ||
    selectedCategory === '6';
  const categoryId = Number(selectedCategory);
  const isLandCategory = categoryId === 7; // קרקעות
  const isBnbCategory = categoryId === 5; // BnB
  const isPartnersCategory = categoryId === 3; // שותפים
  const sidebarFiltersForFeed =
    isPartnersCategory && !isAggregateCategoryFeed
      ? PARTNERS_SIDEBAR_FILTERS
      : isBnbCategory && !isAggregateCategoryFeed
        ? BNB_SIDEBAR_FILTERS
        : SIDEBAR_FILTERS;
  const sidebarFilterCount = sidebarFiltersForFeed.length;
  const firstFilterTop = sidebarFilterLayouts[0]?.y;
  const sidebarIntroMaxDown = useMemo(() => {
    if (sidebarViewportHeight <= 0) {
      return SIDEBAR_INTRO_MAX_DOWN_FALLBACK;
    }
    if (Number.isFinite(firstFilterTop) && firstFilterTop > 0) {
      return Math.max(0, sidebarViewportHeight - firstFilterTop);
    }
    if (sidebarProfileHeight <= 0) {
      return SIDEBAR_INTRO_MAX_DOWN_FALLBACK;
    }
    // Stage 1: keep only the profile image visible in the clipped sidebar viewport.
    return Math.max(0, sidebarViewportHeight - sidebarProfileHeight);
  }, [sidebarViewportHeight, sidebarProfileHeight, firstFilterTop]);
  const SIDEBAR_DRAG_HIDE_BOTTOM_2 = useMemo(() => {
    if (sidebarViewportHeight <= 0 || sidebarFilterCount === 0) {
      return 150;
    }
    const lastVisibleFilterIndex = sidebarFilterCount - SIDEBAR_HIDE_BOTTOM_COUNT - 1;
    const lastVisibleLayout = sidebarFilterLayouts[lastVisibleFilterIndex];
    if (
      lastVisibleFilterIndex >= 0 &&
      lastVisibleLayout &&
      Number.isFinite(lastVisibleLayout.y) &&
      Number.isFinite(lastVisibleLayout.height)
    ) {
      const lastVisibleBottom =
        Number(lastVisibleLayout.y) + Number(lastVisibleLayout.height);
      return Math.max(0, sidebarViewportHeight - lastVisibleBottom);
    }
    const safeFilterHeight =
      sidebarFilterHeight > 0 ? sidebarFilterHeight : SIDEBAR_FILTER_HEIGHT_FALLBACK;
    const visibleFiltersAfterIntro = Math.max(0, sidebarFilterCount - SIDEBAR_HIDE_BOTTOM_COUNT);
    const targetVisibleHeight =
      sidebarProfileHeight + visibleFiltersAfterIntro * safeFilterHeight;
    // Stage 3: move down until only the last 2 filter rows are clipped below.
    return Math.max(0, sidebarViewportHeight - targetVisibleHeight);
  }, [
    sidebarViewportHeight,
    sidebarFilterCount,
    sidebarFilterHeight,
    sidebarProfileHeight,
    sidebarFilterLayouts,
  ]);
  const sidebarDragMaxDown = Math.max(
    sidebarIntroMaxDown,
    SIDEBAR_DRAG_HIDE_BOTTOM_2,
  );
  const isSidebarMeasurementReady =
    sidebarViewportHeight > 0 && sidebarProfileHeight > 0;

  const closeSheetAndOpenListing = opts => {
    setShowBottomSheet(false);
    const isCompanyOrBroker =
      currentUser?.subscription_type === subscriptionTypes.company ||
      currentUser?.subscription_type === subscriptionTypes.broker;
    if (isCompanyOrBroker) {
      onOpenEditPublishAdWithCategory?.(selectedCategory, opts);
    } else {
      onOpenOfficeListing?.(selectedCategory, opts);
    }
  };

  // Load liked listing IDs from AsyncStorage on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [rawAds, rawPosts] = await Promise.all([
          AsyncStorage.getItem('tikTokFeedLikedIds'),
          AsyncStorage.getItem('tikTokFeedLikedPostIds'),
        ]);
        const ids = rawAds ? JSON.parse(rawAds) : [];
        const postIds = rawPosts ? JSON.parse(rawPosts) : [];
        setLikedListingIds(new Set(Array.isArray(ids) ? ids : []));
        setLikedPostIds(new Set(Array.isArray(postIds) ? postIds : []));
      } catch (e) {
        console.warn('Failed to load liked ids', e);
      }
    };
    load();
  }, []);
  // Persist/restore post comments by post id so comments remain tied to each post
  useEffect(() => {
    const loadComments = async () => {
      try {
        const raw = await AsyncStorage.getItem('tikTokPostCommentsByPostId');
        const parsed = raw ? JSON.parse(raw) : {};
        if (parsed && typeof parsed === 'object') {
          setCommentsByPost(parsed);
        }
      } catch (e) {
        console.warn('Failed to load post comments cache', e);
      }
    };
    loadComments();
  }, []);
  useEffect(() => {
    AsyncStorage.setItem(
      'tikTokPostCommentsByPostId',
      JSON.stringify(commentsByPost || {}),
    ).catch(() => {});
  }, [commentsByPost]);

  // Initialize scroll position on mount
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: 0,
        animated: false,
      });
    }
  }, []);

  // Auto-scroll sidebar intro once when TikTok feed opens:
  // (1) profile only, (2) all visible, (3) hide bottom 2 filters.
  const sidebarIntroDone = useRef(false);
  const useNativeDriver = Platform.OS !== 'web'; // web does not support native driver
  useEffect(() => {
    if (selectedTopBarFilter === 'list' || sidebarIntroDone.current) return;
    if (!isSidebarMeasurementReady) return;
    sidebarIntroDone.current = true;
    sidebarDragY.setValue(sidebarIntroMaxDown);
    sidebarDragOffset.current = sidebarIntroMaxDown;
    const scrollDuration = 900; // ms per scroll (slower)
    const waitBetweenParts = 1000; // 1 sec between each part
    const startDelay = 500; // ms before starting so user sees "all hidden"
    const timer = setTimeout(() => {
      Animated.sequence([
        Animated.delay(waitBetweenParts), // wait 1s after part 1 (all hidden)
        Animated.timing(sidebarDragY, {
          toValue: 0,
          duration: scrollDuration,
          useNativeDriver,
        }),
        Animated.delay(waitBetweenParts), // wait 1s after part 2 (all visible)
        Animated.timing(sidebarDragY, {
          toValue: SIDEBAR_DRAG_HIDE_BOTTOM_2,
          duration: scrollDuration,
          useNativeDriver,
        }),
      ]).start(() => {
        sidebarDragOffset.current = SIDEBAR_DRAG_HIDE_BOTTOM_2;
      });
    }, startDelay);
    return () => clearTimeout(timer);
  }, [
    selectedTopBarFilter,
    sidebarDragY,
    useNativeDriver,
    sidebarIntroMaxDown,
    SIDEBAR_DRAG_HIDE_BOTTOM_2,
    isSidebarMeasurementReady,
  ]);

  // Fetch listings from database (all users can see all published listings)
  // Filter by selectedCategory and selectedSidebarFilter if provided
  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoadingListings(true);
        const categoryToFetch =
          selectedCategory && !isAggregateCategoryFeed
            ? parseInt(selectedCategory, 10)
            : undefined;
        const partnersFilter =
          categoryToFetch === 3
            ? PARTNERS_SIDEBAR_FILTERS.find(f => f.id === selectedSidebarFilter)
            : null;
        const bnbFilter =
          categoryToFetch === 5
            ? BNB_SIDEBAR_FILTERS.find(f => f.id === selectedSidebarFilter)
            : null;
        const legacySidebarFilter =
          categoryToFetch !== 3 && categoryToFetch !== 5
            ? SIDEBAR_FILTERS.find(f => f.id === selectedSidebarFilter)
            : null;
        const subscriptionType =
          partnersFilter?.subscription_type ??
          bnbFilter?.subscription_type ??
          legacySidebarFilter?.subscription_type;
        const sidebarCondition = legacySidebarFilter?.condition;
        const hasVideo =
          legacySidebarFilter?.has_video === true || selectedTopBarFilter === 'video';

        const result = await getListings({
          status: 'published',
          category: categoryToFetch,
          ...(subscriptionType != null && {subscription_type: subscriptionType}),
          ...(hasVideo && {has_video: true}),
          ...(sidebarCondition != null &&
            String(sidebarCondition).trim() !== '' && {
              condition: String(sidebarCondition).trim().toLowerCase(),
            }),
          ...(partnersFilter?.search_purpose && {
            search_purpose: partnersFilter.search_purpose,
          }),
          ...(partnersFilter?.feed_post === true && {feed_post: true}),
          ...(bnbFilter?.hospitality_nature && {
            hospitality_nature: bnbFilter.hospitality_nature,
          }),
          ...(bnbFilter?.feed_post === true && {feed_post: true}),
          // Keep user_id only for liked-state and personalized ordering.
          ...(currentUser?.id != null && {user_id: String(currentUser.id)}),
        });

        if (result.offline) {
          setListingsError(result.message || 'Could not load listings. Check your connection.');
        } else {
          setListingsError(null);
        }
        console.log('✅ [TikTokFeedScreen] getListings returned:', result);

          console.log('✅ Fetched listings result:', result);
        console.log('📊 Result structure:', {
          success: result.success,
          listingsCount: result.listings?.length || 0,
          hasListings: !!result.listings,
        });

        if (result.listings && result.listings.length > 0) {
          console.log('📋 First listing details:', {
            id: result.listings[0].id,
            category: result.listings[0].category,
            images: result.listings[0].listing_images?.length || 0,
            videos: result.listings[0].listing_videos?.length || 0,
            imageUrls:
              result.listings[0].listing_images?.map(img => img.image_url) ||
              [],
          });
        }

        if (result.success && result.listings) {
          console.log(`Received ${result.listings.length} listings from API`);
          console.log('Sample listing:', result.listings[0]);

          // Transform database listings to video format (include posts with image, video, or text only)
          const transformedListings = result.listings
            .filter(listing => {
              const images = listing.listing_images || [];
              const videos = listing.listing_videos || [];
              const hasMedia = images.length > 0 || videos.length > 0;
              const hasDescription =
                listing.description && String(listing.description).trim().length > 0;
              const include =
                hasMedia || hasDescription;
              if (!include) {
                console.log(
                  `Skipping listing ${listing.id} - no images, videos, or description`,
                );
              }
              return include;
            })
            .map(listing => {
              const images = listing.listing_images || [];
              const mainImage = images.find(img => img.image_type === 'main');
              const additionalImages = images.filter(
                img => img.image_type === 'additional',
              );
              const video = listing.listing_videos && listing.listing_videos[0];
              const rawPropertyType = String(listing.property_type || '').toLowerCase();

              // Build images array - must have at least one image
              let imagesArray = [];
              if (mainImage && mainImage.image_url) {
                imagesArray = [{uri: mainImage.image_url}];
                if (additionalImages.length > 0) {
                  imagesArray = [
                    ...imagesArray,
                    ...additionalImages
                      .filter(img => img.image_url)
                      .map(img => ({uri: img.image_url})),
                  ];
                }
              } else if (additionalImages.length > 0) {
                imagesArray = additionalImages
                  .filter(img => img.image_url)
                  .map(img => ({uri: img.image_url}));
              }

              const listingCategory = parseInt(listing.category) || 1;

              // Category 3 specific fields
              const searchPurposeLabels = {
                enter: 'מחפש להיכנס',
                bring_in: 'מחפש להכניס',
                partner: 'מחפש שותף',
              };

              const apartmentTypeLabels = {
                regular: 'דירה רגילה',
                studio: 'דירת סטודיו',
                garden: 'דירת גן',
                duplex: 'דופלקס',
                penthouse: 'נטהאוז',
                private: 'בית פרטי',
              };

              const isTextOnly =
                imagesArray.length === 0 &&
                !(listing.listing_videos && listing.listing_videos.length > 0) &&
                listing.description &&
                String(listing.description).trim().length > 0;

              const hasVideo = !!(video && video.video_url);
              const hasImages = imagesArray.length > 0;
              const showVideoFirst =
                hasVideo &&
                (hasImages
                  ? (listing.feed_display_priority || 'video') === 'video'
                  : true);
              const displayType = showVideoFirst ? 'video' : 'images';
              const mediaUrls = [
                mainImage?.image_url,
                ...(additionalImages || []).map(img => img?.image_url),
                video?.video_url,
              ]
                .filter(Boolean)
                .map(u => String(u));
              const hasPostMediaMarker = mediaUrls.some(url =>
                /(?:^|[-_/])post(?:[-_/]|\.|$)/i.test(url),
              );
              const isPostByType =
                rawPropertyType.includes('post') ||
                listing.feed_post === true ||
                listing.feed_post === 'true' ||
                listing.feed_post === 't';
              const isPostListing = isPostByType || hasPostMediaMarker;

              return {
                id: listing.id,
                subscription_type: listing.subscription_type || null,
                feed_post: isPostListing,
                type: displayType,
                video: video && video.video_url ? {uri: video.video_url} : null,
                images:
                  imagesArray.length > 0
                    ? imagesArray
                    : isTextOnly
                      ? [{uri: 'text-post-placeholder'}]
                      : imagesArray,
                isTextOnlyPost: !!isTextOnly,
                displayOption: listing.display_option || 'slideshow', // 'collage' or 'slideshow'
                location: listing.address || 'תל אביב',
                address: listing.address || '', // for city/location filter
                rawPrice: parseFloat(listing.price || listing.budget || 0) || 0,
                price: `₪${parseFloat(listing.price || listing.budget || 0).toLocaleString()}`,
                purpose: listing.purpose === 'rent' ? 'להשכרה' : 'למכירה',
                listingPurpose: listing.purpose === 'rent' ? 'rent' : 'sale',
                planApproval: listing.plan_approval ?? null,
                landInMortgage: listing.land_in_mortgage ?? null,
                permit: listing.permit ?? null,
                agriculturalLand: listing.agricultural_land ?? null,
                landOwnership: listing.land_ownership ?? null,
                description: listing.description || '',
                propertyType:
                  rawPropertyType === 'office'
                    ? 'משרד'
                    : isPostListing
                      ? 'post'
                      : 'קומה שלמה',
                propertyTypeRaw: rawPropertyType,
                isPostEntry: isPostListing,
                apartmentTypeId: listing.property_type || listing.apartment_type || listing.preferred_apartment_type || null,
                area: listing.area,
                rooms: listing.rooms,
                floor: listing.floor,
                condition: listing.condition || null,
                amenities: listing.amenities && typeof listing.amenities === 'object' ? listing.amenities : null,
                category: listingCategory,
                // Category 3 specific fields
                searchPurpose: listing.search_purpose
                  ? searchPurposeLabels[listing.search_purpose]
                  : null,
                preferredApartmentType: listing.preferred_apartment_type
                  ? apartmentTypeLabels[listing.preferred_apartment_type]
                  : null,
                preferredGender:
                  listing.preferred_gender === 'female'
                    ? 'אישה'
                    : listing.preferred_gender === 'male'
                      ? 'גבר'
                      : null,
                preferredAgeMin: listing.preferred_age_min,
                preferredAgeMax: listing.preferred_age_max,
                preferences: listing.preferences || {},
                budget: listing.budget,
                isUploaded: true,
                fromDatabase: true,
                profileImageUrl: getUserProfileImageUrl(listing),
                creator_name: listing.creator_name || null,
                creator_email: listing.creator_email || null,
                creator_specialties: listing.creator_specialties || null,
                creator_bio: listing.creator_bio || null,
                subscription_id: listing.subscription_id || null,
                owner_id: listing.owner_id || null,
                overlayX: listing.overlay_x != null ? Number(listing.overlay_x) : 80,
                overlayY: listing.overlay_y != null ? Number(listing.overlay_y) : 80,
                view_count: listing.view_count != null ? Number(listing.view_count) : 0,
                like_count: listing.like_count != null ? Number(listing.like_count) : 0,
                post_like_count:
                  listing.post_like_count != null
                    ? Number(listing.post_like_count)
                    : listing.like_count != null
                      ? Number(listing.like_count)
                      : 0,
                comment_count:
                  listing.comment_count != null ? Number(listing.comment_count) : 0,
                share_count:
                  listing.share_count != null ? Number(listing.share_count) : 0,
                liked: listing.liked === true,
                saleAtPresale:
                  listing.sale_at_presale === true ||
                  listing.sale_at_presale === 'true' ||
                  listing.sale_at_presale === 't',
                companyBuildingCount:
                  listing.general_details &&
                  typeof listing.general_details === 'object' &&
                  Number.isFinite(Number(listing.general_details.building_count))
                    ? Number(listing.general_details.building_count)
                    : null,
                companyFloorCount:
                  listing.general_details &&
                  typeof listing.general_details === 'object' &&
                  Number.isFinite(Number(listing.general_details.floor_count))
                    ? Number(listing.general_details.floor_count)
                    : null,
                companyApartmentCount:
                  listing.general_details &&
                  typeof listing.general_details === 'object' &&
                  Number.isFinite(Number(listing.general_details.apartment_count))
                    ? Number(listing.general_details.apartment_count)
                    : null,
              };
            });

          // Apply top bar filter: pics = only images, video = already from API; liked is applied at display time
          let afterTopBar = transformedListings;
          if (selectedTopBarFilter === 'pics') {
            afterTopBar = transformedListings.filter(l => l.type === 'images');
          }
          // Backend already filters by category, but double-check client-side (skip for גלובל / מגזר דתי)
          const filteredListings =
            selectedCategory && !isAggregateCategoryFeed
              ? afterTopBar.filter(listing => {
                  const matches =
                    listing.category === parseInt(selectedCategory, 10);
                  if (!matches) {
                    console.log(
                      `Listing ${listing.id} category ${listing.category} doesn't match selected ${selectedCategory}`,
                    );
                  }
                  return matches;
                })
              : afterTopBar;

          console.log(
            `Loaded ${filteredListings.length} listings for category ${selectedCategory || 'all'}`,
          );
          console.log(
            'Listings details:',
            filteredListings.map(l => ({
              id: l.id,
              category: l.category,
              imagesCount: l.images.length,
              hasVideo: !!l.video,
            })),
          );
          setDbListings(filteredListings);
          // Sync server liked state into local sets (add/remove) so yellow state stays consistent.
          // If no logged-in user, keep local cached likes.
          if (currentUser?.id != null) {
            setLikedListingIds(prev => {
              const next = new Set(prev);
              filteredListings.forEach(l => {
                if (l?.id == null) return;
                if (isPostVideo(l)) return;
                if (l.liked === true) next.add(l.id);
                else if (l.liked === false) next.delete(l.id);
              });
              AsyncStorage.setItem('tikTokFeedLikedIds', JSON.stringify([...next])).catch(() => {});
              return next;
            });
            setLikedPostIds(prev => {
              const next = new Set(prev);
              filteredListings.forEach(l => {
                if (l?.id == null) return;
                if (!isPostVideo(l)) return;
                if (l.liked === true) next.add(l.id);
                else if (l.liked === false) next.delete(l.id);
              });
              AsyncStorage.setItem('tikTokFeedLikedPostIds', JSON.stringify([...next])).catch(() => {});
              return next;
            });
          }
        } else {
          console.log(
            'No listings found or result was not successful. Result:',
            result,
          );
          setDbListings([]);
        }
      } catch (error) {
        console.error('❌ Error fetching listings from database:', error);
        console.error('Error details:', error.message, error.stack);
        setDbListings([]);
        setListingsError(error?.message || 'Failed to fetch listings');
      } finally {
        setLoadingListings(false);
      }
    };

    fetchListings();
  }, [selectedCategory, selectedSidebarFilter, selectedTopBarFilter, refreshKey, currentUser?.id]);

  // Map tik image numbers to require statements
  const getTikImage = num => {
    return categoryImages[num] || categoryImages[1];
  };

  const formatCount = (n) => {
    const num = Number(n) || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(num);
  };
  const hasMeaningfulPostDescription = (desc) => {
    const text = String(desc || '').trim();
    if (!text) return false;
    const normalized = text.toLowerCase();
    return normalized !== 'פוסט' && normalized !== 'post';
  };
  const formatCommentTime = (iso) => {
    if (!iso) return 'לפני רגע';
    const ts = new Date(iso).getTime();
    if (!Number.isFinite(ts)) return 'לפני רגע';
    const deltaSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (deltaSec < 60) return 'לפני רגע';
    const mins = Math.floor(deltaSec / 60);
    if (mins < 60) return `לפני ${mins} דק׳`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `לפני ${hours} שעות`;
    const days = Math.floor(hours / 24);
    return `לפני ${days} ימים`;
  };

  const isItemLiked = item => {
    if (!item || item.id == null) return false;
    return isPostVideo(item) ? likedPostIds.has(item.id) : likedListingIds.has(item.id);
  };

  // Toggle ad like
  const toggleAdLiked = async (listingId) => {
    if (listingId == null) return;
    const isCurrentlyLiked = likedListingIds.has(listingId);
    const willBeLiked = !isCurrentlyLiked;
    const userId = currentUser?.id != null ? String(currentUser.id) : null;

    if (userId) {
      try {
        if (willBeLiked) await likeListing(listingId, userId);
        else await unlikeListing(listingId, userId);
      } catch (e) {
        console.warn('Like/unlike API failed:', e.message);
        return;
      }
    }

    setLikedListingIds(prev => {
      const next = new Set(prev);
      if (next.has(listingId)) next.delete(listingId);
      else next.add(listingId);
      AsyncStorage.setItem('tikTokFeedLikedIds', JSON.stringify([...next])).catch(() => {});
      return next;
    });
    // Optimistically update like_count in dbListings so UI updates immediately
    setDbListings(prev =>
      prev.map(l =>
        l.id === listingId
          ? { ...l, like_count: Math.max(0, (l.like_count || 0) + (willBeLiked ? 1 : -1)) }
          : l
      )
    );
  };
  // Toggle post like (separate table/counter from ads)
  const togglePostLiked = async (listingId) => {
    if (listingId == null) return;
    const listingKey = String(listingId);
    if (postLikePendingIdsRef.current.has(listingKey)) return;
    postLikePendingIdsRef.current.add(listingKey);
    const isCurrentlyLiked = likedPostIds.has(listingId);
    const willBeLiked = !isCurrentlyLiked;
    const userId = currentUser?.id != null ? String(currentUser.id) : null;

    // Optimistic UI update (toggle on/off)
    setLikedPostIds(prev => {
      const next = new Set(prev);
      if (next.has(listingId)) next.delete(listingId);
      else next.add(listingId);
      AsyncStorage.setItem('tikTokFeedLikedPostIds', JSON.stringify([...next])).catch(() => {});
      return next;
    });
    // Optimistically update post_like_count
    setDbListings(prev =>
      prev.map(l =>
        l.id === listingId
          ? {
              ...l,
              post_like_count: Math.max(
                0,
                (l.post_like_count || 0) + (willBeLiked ? 1 : -1),
              ),
            }
          : l
      )
    );

    if (!userId) {
      postLikePendingIdsRef.current.delete(listingKey);
      return;
    }

    try {
      if (willBeLiked) await likePost(listingId, userId);
      else await unlikePost(listingId, userId);
    } catch (e) {
      console.warn('Post like/unlike API failed:', e.message);
      // Revert optimistic update if server call fails
      setLikedPostIds(prev => {
        const next = new Set(prev);
        if (willBeLiked) next.delete(listingId);
        else next.add(listingId);
        AsyncStorage.setItem('tikTokFeedLikedPostIds', JSON.stringify([...next])).catch(() => {});
        return next;
      });
      setDbListings(prev =>
        prev.map(l =>
          l.id === listingId
            ? {
                ...l,
                post_like_count: Math.max(
                  0,
                  (l.post_like_count || 0) + (willBeLiked ? -1 : 1),
                ),
              }
            : l
        )
      );
    } finally {
      postLikePendingIdsRef.current.delete(listingKey);
    }
  };

  const toggleLiked = (item) => {
    if (!item || item.id == null) return;
    if (isPostVideo(item)) {
      return togglePostLiked(item.id);
    }
    return toggleAdLiked(item.id);
  };
  const openCommentsForPost = async (item) => {
    if (!item?.id) return;
    setActiveCommentsPostId(item.id);
    setShowCommentsSheet(true);
    setCommentsLoading(true);
    try {
      const userId = currentUser?.id != null ? String(currentUser.id) : null;
      const result = await getPostComments(item.id, userId);
      const comments = Array.isArray(result?.comments) ? result.comments : [];
      setCommentsByPost(prev => {
        const local = Array.isArray(prev[item.id]) ? prev[item.id] : [];
        const byKey = new Map();
        [...comments, ...local].forEach(c => {
          const key =
            c?.id != null
              ? `id:${String(c.id)}`
              : `tmp:${String(c?.comment_text || '')}:${String(c?.created_at || '')}`;
          if (!byKey.has(key)) byKey.set(key, c);
        });
        return {...prev, [item.id]: [...byKey.values()]};
      });
      setDbListings(prev =>
        prev.map(l =>
          l.id === item.id
            ? {...l, comment_count: Math.max(Number(l.comment_count || 0), comments.length)}
            : l,
        ),
      );
    } catch (e) {
      console.warn('Failed loading post comments:', e.message);
      setCommentsByPost(prev => ({...prev, [item.id]: prev[item.id] || []}));
    } finally {
      setCommentsLoading(false);
    }
  };
  const submitPostComment = async () => {
    const postId = activeCommentsPostId;
    const userId = currentUser?.id != null ? String(currentUser.id) : null;
    const text = String(newCommentText || '').trim();
    if (!postId || !text) return;
    const optimistic = {
      id: `local-${Date.now()}`,
      comment_text: text,
      commenter_name:
        currentUser?.name ||
        currentUser?.contact_person_name ||
        currentUser?.business_name ||
        'משתמש',
      commenter_image_url:
        currentUser?.profile_picture_url || currentUser?.company_logo_url || null,
      created_at: new Date().toISOString(),
      likes_count: 0,
      dislikes_count: 0,
      my_reaction: null,
      is_local_only: !userId,
    };
    setNewCommentText('');
    setCommentsByPost(prev => ({
      ...prev,
      [postId]: [optimistic, ...(prev[postId] || [])],
    }));
    setDbListings(prev =>
      prev.map(l =>
        l.id === postId
          ? {...l, comment_count: Math.max(0, Number(l.comment_count || 0) + 1)}
          : l,
      ),
    );
    if (!userId) return;
    try {
      const result = await addPostComment(postId, userId, text);
      if (result?.comment) {
        setCommentsByPost(prev => ({
          ...prev,
          [postId]: (prev[postId] || []).map(c =>
            c.id === optimistic.id ? result.comment : c,
          ),
        }));
      }
    } catch (e) {
      console.warn('Failed adding comment:', e.message);
      // keep optimistic local comment so it remains saved per post
    }
  };
  const toggleCommentReaction = async (commentId, reactionType) => {
    const postId = activeCommentsPostId;
    const userId = currentUser?.id != null ? String(currentUser.id) : null;
    if (!postId || !commentId || !userId) return;
    const commentIdText = String(commentId);
    const isLocalOnlyComment = commentIdText.startsWith('local-');
    const list = commentsByPost[postId] || [];
    const current = list.find(c => String(c.id) === String(commentId));
    const prevReaction = current?.my_reaction || null;
    const nextReaction = prevReaction === reactionType ? null : reactionType;

    // optimistic
    setCommentsByPost(prev => ({
      ...prev,
      [postId]: (prev[postId] || []).map(c => {
        if (String(c.id) !== String(commentId)) return c;
        const likes = Number(c.likes_count || 0);
        const dislikes = Number(c.dislikes_count || 0);
        let nextLikes = likes;
        let nextDislikes = dislikes;
        if (prevReaction === 'like') nextLikes = Math.max(0, nextLikes - 1);
        if (prevReaction === 'dislike') nextDislikes = Math.max(0, nextDislikes - 1);
        if (nextReaction === 'like') nextLikes += 1;
        if (nextReaction === 'dislike') nextDislikes += 1;
        return {
          ...c,
          my_reaction: nextReaction,
          likes_count: nextLikes,
          dislikes_count: nextDislikes,
        };
      }),
    }));
    if (isLocalOnlyComment) {
      // Local optimistic comments do not exist in DB yet, so keep reaction local-only.
      return;
    }
    try {
      if (nextReaction == null) {
        await clearPostCommentReaction(postId, commentId, userId);
      } else {
        await reactToPostComment(postId, commentId, userId, nextReaction);
      }
    } catch (e) {
      console.warn('Comment reaction failed:', e.message);
      // revert on failure
      setCommentsByPost(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).map(c => {
          if (String(c.id) !== String(commentId)) return c;
          const likes = Number(c.likes_count || 0);
          const dislikes = Number(c.dislikes_count || 0);
          let nextLikes = likes;
          let nextDislikes = dislikes;
          if (nextReaction === 'like') nextLikes = Math.max(0, nextLikes - 1);
          if (nextReaction === 'dislike') nextDislikes = Math.max(0, nextDislikes - 1);
          if (prevReaction === 'like') nextLikes += 1;
          if (prevReaction === 'dislike') nextDislikes += 1;
          return {
            ...c,
            my_reaction: prevReaction,
            likes_count: nextLikes,
            dislikes_count: nextDislikes,
          };
        }),
      }));
    }
  };

  // Use database listings as primary source (they persist after refresh)
  // When a category is selected, show ONLY database listings (no mock data)
  // Top bar "liked" filter applied at display time so liking/unliking updates without refetch
  // Apply feed filters (price, rooms, city, apartment type) when set
  const applyFeedFilters = (list) => {
    let out = list;
    if (feedFilters.price != null) {
      const {minPrice = 0, maxPrice = 10000000} = feedFilters.price;
      out = out.filter(l => (l.rawPrice != null && l.rawPrice >= minPrice && l.rawPrice <= maxPrice));
    }
    if (feedFilters.rooms != null) {
      const {rooms, area, floor} = feedFilters.rooms;
      out = out.filter(l => {
        if (rooms != null && (l.rooms == null || Number(l.rooms) < rooms)) return false;
        if (area != null && (l.area == null || Number(l.area) < area)) return false;
        if (floor != null && (l.floor == null || Number(l.floor) < floor)) return false;
        return true;
      });
    }
    const officeCategoryActive =
      selectedCategory != null &&
      selectedCategory !== '' &&
      Number(selectedCategory) === 2;
    if (
      officeCategoryActive &&
      feedFilters.office != null &&
      typeof feedFilters.office === 'object'
    ) {
      const o = feedFilters.office;
      const amenityOn = (l, keys) => {
        const a = l.amenities;
        if (!a || typeof a !== 'object') return false;
        return keys.some(k => {
          const v = a[k];
          return v === true || (typeof v === 'number' && v > 0);
        });
      };
      if (o.minArea != null) {
        out = out.filter(
          l => l.area != null && Number(l.area) >= Number(o.minArea),
        );
      }
      if (o.minRooms != null) {
        out = out.filter(
          l => l.rooms != null && Number(l.rooms) >= Number(o.minRooms),
        );
      }
      if (o.wholeFloor === true) {
        out = out.filter(l => (l.apartmentTypeId || '') === 'whole_floor');
      }
      if (o.parking === true) {
        out = out.filter(l => amenityOn(l, ['חניה', 'חנייה']));
      }
      if (o.elevator === true) {
        out = out.filter(l => amenityOn(l, ['מעלית']));
      }
      if (o.mamad === true) {
        out = out.filter(l => amenityOn(l, ['ממ״ד', 'ממ"ד']));
      }
    }
    if (feedFilters.city != null) {
      const c = feedFilters.city;
      const cityStr = String(c.city || '').trim().toLowerCase();
      const streetStr = String(c.street || '').trim().toLowerCase();
      const locationTokens = `${cityStr} ${streetStr}`
        .split(/\s+/)
        .map(token => token.trim())
        .filter(Boolean);
      const hasLocation = locationTokens.length > 0;
      const purpose = c.purpose;
      if (
        hasLocation &&
        (purpose === 'rent' || purpose === 'sale')
      ) {
        out = out.filter(
          l => (l.listingPurpose || 'sale') === purpose,
        );
      }
      if (hasLocation) {
        out = out.filter(l => {
          const locationText = String(
            l.address ||
              l.location ||
              l.search_address ||
              l.land_address ||
              '',
          ).toLowerCase();
          // Treat city/street as the same location-search input: all typed words must match.
          return locationTokens.every(token => locationText.includes(token));
        });
      }
    }
    if (feedFilters.apartmentType != null && feedFilters.apartmentType !== '') {
      const apt = feedFilters.apartmentType;
      const matchId = apt === 'apartment' ? 'regular' : apt; // UI 'apartment' = API 'regular'
      out = out.filter(l => (l.apartmentTypeId || '') === matchId || (l.apartmentTypeId || '') === apt);
    }
    if (
      feedFilters.meter != null &&
      feedFilters.meter !== '' &&
      Number.isFinite(Number(feedFilters.meter))
    ) {
      const minMeter = Number(feedFilters.meter);
      out = out.filter(
        l => l.area != null && Number(l.area) >= minMeter,
      );
    }
    const selectedTypes = Array.isArray(feedFilters.type)
      ? feedFilters.type
          .map(v => String(v || '').trim())
          .filter(Boolean)
      : feedFilters.type != null && String(feedFilters.type).trim() !== ''
        ? [String(feedFilters.type).trim()]
        : [];
    if (selectedTypes.length > 0) {
      const landFeed =
        selectedCategory === 7 || selectedCategory === '7';
      if (landFeed) {
        const landPredicates = {
          own_private: l => l.landOwnership === 'private',
          own_administration: l => l.landOwnership === 'administration',
          agri_yes: l => l.agriculturalLand === 'yes',
          agri_not: l => l.agriculturalLand === 'not',
          plan_happy: l => l.planApproval === 'happy',
          plan_nothing: l => l.planApproval === 'nothing',
          plan_there_is: l => l.planApproval === 'there_is',
          mortgage_not: l => l.landInMortgage === 'not',
          mortgage_yes: l => l.landInMortgage === 'yes',
          permit_nothing: l => l.permit === 'nothing',
          permit_there_is: l => l.permit === 'there_is',
        };
        out = out.filter(l =>
          selectedTypes.some(typeId => {
            const pred = landPredicates[typeId];
            return typeof pred === 'function' ? pred(l) : false;
          }),
        );
      } else {
        const commercePropertyTypes = new Set([
          'store',
          'shopping_center',
          'industrial_buildings',
          'warehouse',
          'commercial_space',
          'whole_floor',
        ]);
        const typeToCategory = {
          offices: 2,
          commercial: 8,
          land: 7,
          apartments: 10,
          penthouses: 10,
          private_houses: 10,
          villas: 10,
          estates: 10,
          multi_family: 10,
        };
        out = out.filter(l =>
          selectedTypes.some(typeId => {
            if (commercePropertyTypes.has(typeId)) {
              return (l.apartmentTypeId || '') === typeId;
            }
            const cat = typeToCategory[typeId];
            return cat != null ? Number(l.category) === cat : false;
          }),
        );
      }
    }
    if (feedFilters.donam != null && (feedFilters.donam.minDonam != null || feedFilters.donam.maxDonam != null)) {
      const minDonam = Number(feedFilters.donam.minDonam ?? 0);
      const maxDonam = Number(feedFilters.donam.maxDonam ?? 999999);
      const minSqm = minDonam * 1000; // 1 dunam = 1000 m²
      const maxSqm = maxDonam * 1000;
      out = out.filter(l => l.area != null && Number(l.area) >= minSqm && Number(l.area) <= maxSqm);
    }
    if (feedFilters.preferences != null && feedFilters.preferences !== '') {
      const pref = feedFilters.preferences;
      if (typeof pref === 'object') {
        if (pref.gender === 'female') out = out.filter(l => l.preferredGender === 'אישה');
        else if (pref.gender === 'male') out = out.filter(l => l.preferredGender === 'גבר');
        if (pref.ageMin != null || pref.ageMax != null) {
          const minAge = Number(pref.ageMin ?? 0);
          const maxAge = Number(pref.ageMax ?? 999);
          out = out.filter(l => l.age != null && Number(l.age) >= minAge && Number(l.age) <= maxAge);
        }
        // nonSmoker, students, stableJob, occasionalJob, immediateEntry: apply when listing exposes these
      } else {
        if (pref === 'gender_female') out = out.filter(l => l.preferredGender === 'אישה');
        else if (pref === 'gender_male') out = out.filter(l => l.preferredGender === 'גבר');
      }
    }
    return out;
  };
  const baseList = selectedTopBarFilter === 'liked'
    ? dbListings.filter(l => isItemLiked(l))
    : dbListings;
  const uploadedVideos = applyFeedFilters(baseList);

  // Mock video data - only used when NO category is selected (for general browsing)
  // When a category is opened, show ONLY database content
  const allMockVideos = [
    {
      id: 1,
      image: 1,
      category: 1,
      title: 'דירה מרווחת בתל אביב',
      description: 'דירה 4 חדרים עם מרפסת גדולה',
      location: 'תל אביב, רוטשילד 54',
      price: '₪5,000',
      likes: 1234,
      views: 5678,
    },
    {
      id: 2,
      image: 2,
      category: 2,
      title: 'נטהאוז יוקרתי',
      description: 'נוף פנורמי לעיר',
      location: 'תל אביב, דיזנגוף',
      price: '₪12,000',
      likes: 2345,
      views: 8901,
    },
    {
      id: 3,
      image: 3,
      category: 3,
      title: 'דירת סטודיו מודרנית',
      description: 'עיצוב מינימליסטי ונוח',
      location: 'תל אביב, פלורנטין',
      price: '₪3,500',
      likes: 987,
      views: 3456,
    },
    {
      id: 4,
      image: 4,
      category: 4,
      title: 'בית פרטי עם גינה',
      description: 'בית משפחתי עם חצר גדולה',
      location: "רמת גן, ז'בוטינסקי",
      price: '₪8,500',
      likes: 3456,
      views: 12345,
    },
    {
      id: 5,
      image: 5,
      category: 5,
      title: 'דירת גן בקומה ראשונה',
      description: 'גישה ישירה לגינה',
      location: 'תל אביב, נווה צדק',
      price: '₪6,200',
      likes: 1876,
      views: 6789,
    },
    {
      id: 6,
      image: 6,
      category: 6,
      title: 'דופלקס יוקרתי',
      description: '2 קומות עם גג',
      location: 'תל אביב, רמת אביב',
      price: '₪15,000',
      likes: 4567,
      views: 15678,
    },
    {
      id: 7,
      image: 7,
      category: 7,
      title: 'דירה עם מרפסת שמש',
      description: 'נוף לים',
      location: 'תל אביב, חוף הים',
      price: '₪7,800',
      likes: 2341,
      views: 9012,
    },
    {
      id: 8,
      image: 8,
      category: 8,
      title: 'לופט תעשייתי',
      description: 'תקרות גבוהות וחלונות גדולים',
      location: 'תל אביב, נחלת בנימין',
      price: '₪9,500',
      likes: 3124,
      views: 11234,
    },
    {
      id: 9,
      image: 9,
      category: 9,
      title: 'דירה משופצת',
      description: 'שיפוץ מלא וחדש',
      location: 'תל אביב, רחוב אלנבי',
      price: '₪4,500',
      likes: 1567,
      views: 5678,
    },
    {
      id: 10,
      image: 10,
      category: 10,
      title: 'דירת 5 חדרים',
      description: 'מתאימה למשפחה גדולה',
      location: 'רמת גן, ביאליק',
      price: '₪10,000',
      likes: 2789,
      views: 9876,
    },
    {
      id: 11,
      image: 11,
      category: 11,
      title: 'נטהאוז עם גג',
      description: 'נוף 360 מעלות',
      location: 'תל אביב, רחוב בן יהודה',
      price: '₪18,000',
      likes: 5678,
      views: 23456,
    },
  ];

  // When a category is selected, show ONLY database listings (no mock data)
  // When no category is selected, show database listings + mock videos for general browsing
  const videos = selectedCategory
    ? uploadedVideos // Only DB content when category is selected
    : [...uploadedVideos, ...allMockVideos]; // DB + mock when browsing all

  console.log(
    `📊 Total videos to display: ${videos.length} (${uploadedVideos.length} from DB${selectedCategory ? '' : `, ${allMockVideos.length} mock`})`,
  );
  if (selectedCategory) {
    console.log(
      `📂 Showing ONLY database listings for category: ${selectedCategory}`,
    );
  }

  // Record a view when user lands on a DB listing (once per listing per session)
  useEffect(() => {
    const item = videos[currentIndex];
    if (item?.fromDatabase && item?.id && item.id !== lastViewedListingIdRef.current) {
      lastViewedListingIdRef.current = item.id;
      recordListingView(item.id);
    }
  }, [currentIndex, videos]);

  // Define scroll handlers and panResponder before any early return (hooks must run every render)
  const scrollToIndex = index => {
    if (index >= 0 && index < videos.length && scrollViewRef.current) {
      const targetY = index * screenHeight;
      scrollViewRef.current.scrollTo({
        y: targetY,
        animated: true,
      });
      setCurrentIndex(index);
    }
  };

  const handleNext = () => {
    if (currentIndex < videos.length - 1) {
      scrollToIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      scrollToIndex(currentIndex - 1);
    }
  };
  useEffect(() => {
    overlayBaseY.setValue(currentIndex * screenHeight);
  }, [currentIndex, screenHeight, overlayBaseY]);

  const SWIPE_THRESHOLD = 40;
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const {dy} = gestureState;
          return Math.abs(dy) > 15;
        },
        onPanResponderRelease: (_, gestureState) => {
          const {dy} = gestureState;
          if (dy < -SWIPE_THRESHOLD) {
            handleNext();
          } else if (dy > SWIPE_THRESHOLD) {
            handlePrevious();
          }
        },
      }),
    [handleNext, handlePrevious],
  );

  const BOTTOM_SHEET_DRAG_CLOSE_THRESHOLD = 56;
  const bottomSheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const {dy, dx} = gestureState;
          return dy > 8 && dy > Math.abs(dx) * 0.55;
        },
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          const {dy, dx} = gestureState;
          return dy > 8 && dy > Math.abs(dx) * 0.55;
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            bottomSheetTranslateY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          const {dy, vy} = gestureState;
          const shouldClose =
            dy > BOTTOM_SHEET_DRAG_CLOSE_THRESHOLD || vy > 1.1;
          if (shouldClose) {
            Animated.timing(bottomSheetTranslateY, {
              toValue: 480,
              duration: 220,
              useNativeDriver: bottomSheetUseNativeDriver,
            }).start(() => {
              bottomSheetTranslateY.setValue(0);
              setShowBottomSheet(false);
            });
          } else {
            Animated.spring(bottomSheetTranslateY, {
              toValue: 0,
              friction: 9,
              useNativeDriver: bottomSheetUseNativeDriver,
            }).start();
          }
        },
      }),
    [bottomSheetTranslateY, bottomSheetUseNativeDriver],
  );

  useEffect(() => {
    if (showBottomSheet) {
      bottomSheetTranslateY.setValue(0);
    }
  }, [showBottomSheet, bottomSheetTranslateY]);

  // Sidebar drag: hold and swipe up/down; bottom icons disappear off screen when dragged down
  // Max down equals the intro/profile-only stage.
  const SIDEBAR_DRAG_MAX_DOWN = sidebarDragMaxDown;
  // When all icons are visible (top), don't allow scrolling up past that
  const SIDEBAR_DRAG_MAX_UP = 0;
  const sidebarPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const {dy} = gestureState;
          return Math.abs(dy) > 8;
        },
        onPanResponderMove: (_, gestureState) => {
          const {dy} = gestureState;
          const next = Math.max(
            SIDEBAR_DRAG_MAX_UP,
            Math.min(SIDEBAR_DRAG_MAX_DOWN, sidebarDragOffset.current + dy),
          );
          sidebarDragY.setValue(next);
        },
        onPanResponderRelease: (_, gestureState) => {
          const {dy} = gestureState;
          const next = Math.max(
            SIDEBAR_DRAG_MAX_UP,
            Math.min(SIDEBAR_DRAG_MAX_DOWN, sidebarDragOffset.current + dy),
          );
          sidebarDragOffset.current = next;
        },
      }),
    [sidebarDragY],
  );

  // Show loading indicator while fetching (only on initial load)
  if (loadingListings && dbListings.length === 0 && videos.length === 0) {
    return (
      <View
        style={[
          styles.container,
          {justifyContent: 'center', alignItems: 'center'},
        ]}>
        <ActivityIndicator size="large" color={Colors.yellowIcons} />
        <Text style={{color: '#fff', marginTop: 20}}>טוען רשימות...</Text>
      </View>
    );
  }

  // Show empty state if no videos
  if (videos.length === 0 && !loadingListings) {
    return (
      <>
        {/* Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
        </View>
        <View
          style={[
            styles.container,
            {justifyContent: 'center', alignItems: 'center'},
          ]}>
          {listingsError ? (
            <>
              <Text
                style={{
                  color: '#fff',
                  fontSize: 18,
                  textAlign: 'center',
                  padding: 20,
                }}>
                שגיאה בטעינת הרשימות
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setListingsError(null);
                  setRefreshKey(k => k + 1);
                }}
                style={{
                  marginTop: 20,
                  padding: 15,
                  backgroundColor: Colors.yellowIcons,
                  borderRadius: 8,
                }}>
                <Text style={{color: '#000', fontWeight: 'bold'}}>
                  נסה שוב
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text
                style={{
                  color: '#fff',
                  fontSize: 18,
                  textAlign: 'center',
                  padding: 20,
                }}>
                אין רשימות זמינות בקטגוריה זו
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const isCompanyOrBroker =
                    currentUser?.subscription_type === subscriptionTypes.company ||
                    currentUser?.subscription_type === subscriptionTypes.broker;
                  if (isCompanyOrBroker && onOpenEditPublishAdWithCategory) {
                    onOpenEditPublishAdWithCategory(selectedCategory);
                  } else if (onOpenOfficeListing) {
                    onOpenOfficeListing(selectedCategory);
                  }
                }}
                style={{
                  marginTop: 20,
                  padding: 15,
                  backgroundColor: Colors.yellowIcons,
                  borderRadius: 8,
                }}>
                <Text style={{color: '#000', fontWeight: 'bold'}}>
                  פרסם רשימה חדשה
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </>
    );
  }
  const bottomBarSource = isLandCategory
    ? require('../assets/lands/Frame 2 (2).png')
    : isPartnersCategory
      ? require('../assets/par/Frame 2 (3).png')
      : require('../assets/bottom-bar-new.png');
  function isPostVideo(video) {
    if (!video) return false;
    const type = String(
      video.propertyType || video.propertyTypeRaw || video.apartmentTypeId || '',
    ).toLowerCase();
    const imageUris = Array.isArray(video.images)
      ? video.images.map(img => String(img?.uri || ''))
      : [];
    const mediaUris = [...imageUris, String(video.video?.uri || '')].filter(Boolean);
    const hasPostMediaMarker = mediaUris.some(url =>
      /(?:^|[-_/])post(?:[-_/]|\.|$)/i.test(url),
    );
    return (
      type === 'post' ||
      type === 'posts' ||
      type === 'feed_post' ||
      type.includes('post') ||
      video.feed_post === true ||
      video.isTextOnlyPost === true ||
      video.isPostEntry === true ||
      hasPostMediaMarker
    );
  }
  const sidebarProfileUrl = getUserProfileImageUrl(videos[currentIndex]);
  const currentVideo = videos[currentIndex] || null;
  const isPostListing = isPostVideo(currentVideo);
  const currentComments = commentsByPost[activeCommentsPostId] || [];
  const activeCommentsVideo = videos.find(v => v.id === activeCommentsPostId) || null;
  const getDisplayedCommentCount = listing => {
    if (!listing?.id) return 0;
    const serverCount = Number(listing.comment_count || 0);
    const loadedCount = Array.isArray(commentsByPost[listing.id])
      ? commentsByPost[listing.id].length
      : 0;
    return Math.max(serverCount, loadedCount);
  };
  const isCompanyListing =
    currentVideo &&
    !isPostVideo(currentVideo) &&
    String(currentVideo.subscription_type || '').toLowerCase() ===
      subscriptionTypes.company;
  const isBrokerListing =
    currentVideo &&
    !isPostVideo(currentVideo) &&
    String(currentVideo.subscription_type || '').toLowerCase() ===
      subscriptionTypes.broker;
  const brokerPurposeText = String(
    currentVideo?.purpose || currentVideo?.searchPurpose || 'למכירה',
  ).trim();
  const brokerLocationText = String(
    currentVideo?.location || currentVideo?.address || 'מיקום לא זמין',
  ).trim();
  const brokerPriceText = (() => {
    const explicit = String(currentVideo?.price || '').trim();
    if (explicit) return explicit;
    const raw = Number(
      currentVideo?.rawPrice ??
        currentVideo?.price_raw ??
        currentVideo?.price_value ??
        currentVideo?.price ??
        0,
    );
    if (Number.isFinite(raw) && raw > 0) return `₪${raw.toLocaleString()}`;
    return '₪0';
  })();
  const companyAddressLines = isCompanyListing
    ? String(currentVideo?.location || currentVideo?.address || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : [];
  const companyPrimaryAddress = companyAddressLines[0] || '';
  const companySecondaryAddress = companyAddressLines.slice(1).join(', ');
  const companyBuildingsCount = Math.max(
    1,
    Number(currentVideo?.companyBuildingCount) || 1,
  );
  const companyFloorsCount = Math.max(
    0,
    Number(currentVideo?.companyFloorCount) || 0,
  );
  const companyApartmentsCount = Math.max(
    0,
    Number(currentVideo?.companyApartmentCount) || 0,
  );
  const userSearchSourceListings =
    showUserSearchPanel && allUsersSearchListings.length > 0
      ? allUsersSearchListings
      : dbListings;

  const userSearchItems = (() => {
    const normalizeList = value => {
      if (Array.isArray(value)) return value.map(v => String(v || '').trim()).filter(Boolean);
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return parsed.map(v => String(v || '').trim()).filter(Boolean);
          }
        } catch (_) {
          // keep fallback split below
        }
        return value
          .split(',')
          .map(v => String(v || '').trim())
          .filter(Boolean);
      }
      return [];
    };
    const getSubtitle = listing => {
      const specialties = normalizeList(listing?.creator_specialties);
      const creatorTypes = normalizeList(listing?.creator_types);
      if (specialties[0]) return specialties[0];
      if (creatorTypes[0]) return creatorTypes[0];
      const subType = String(listing?.subscription_type || '').toLowerCase();
      if (subType === subscriptionTypes.company) return 'חברה';
      if (subType === subscriptionTypes.broker) return 'תיווך';
      if (subType === subscriptionTypes.professional) return 'נותן שירות';
      return 'משתמש';
    };

    const byKey = new Map();
    (userSearchSourceListings || []).forEach(listing => {
      const keyRaw =
        listing?.subscription_id ||
        listing?.owner_id ||
        listing?.creator_email ||
        listing?.creator_name;
      const name = String(listing?.creator_name || '').trim();
      if (!keyRaw || !name) return;
      const key = String(keyRaw).toLowerCase();
      const existing = byKey.get(key);
      const avatar =
        getUserProfileImageUrl(listing) ||
        listing?.profileImageUrl ||
        listing?.creator_profile_image_url ||
        listing?.profile_image_url ||
        null;
      const subtitle = getSubtitle(listing);
      if (!existing) {
        byKey.set(key, {
          key,
          name,
          subtitle,
          avatar,
          count: 1,
          ratingTargetId: listing?.subscription_id || null,
          listing,
        });
        return;
      }
      existing.count += 1;
      if ((!existing.avatar || failedSearchAvatarKeys.has(existing.key)) && avatar) {
        existing.avatar = avatar;
      }
      if ((!existing.subtitle || existing.subtitle === 'משתמש') && subtitle) {
        existing.subtitle = subtitle;
      }
      if (!existing.ratingTargetId && listing?.subscription_id) {
        existing.ratingTargetId = listing.subscription_id;
      }
    });

    const q = String(userSearchQuery || '').trim().toLowerCase();
    const items = [...byKey.values()]
      .filter(item => {
        if (!q) return true;
        return (
          String(item.name || '').toLowerCase().includes(q) ||
          String(item.subtitle || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'he'));
    return items;
  })();

  const loadAllUsersForSearch = async () => {
    try {
      const userId = currentUser?.id != null ? String(currentUser.id) : null;
      const result = await getListings({
        status: 'published',
        ...(userId ? {user_id: userId} : {}),
      });
      const fullList = Array.isArray(result?.listings) ? result.listings : [];
      if (fullList.length > 0) {
        setAllUsersSearchListings(fullList);
        const targets = [...new Set(
          fullList
            .map(item => item?.subscription_id)
            .filter(v => typeof v === 'string' && v.trim() !== ''),
        )];
        await preloadUserRatingsForTargets(targets);
      }
    } catch (e) {
      console.warn('Failed loading all users for search:', e?.message || e);
    }
  };

  const preloadUserRatingsForTargets = async targets => {
    if (!Array.isArray(targets) || targets.length === 0) return;
    for (const profileId of targets) {
      if (Object.prototype.hasOwnProperty.call(userRatingByProfileId, profileId)) continue;
      try {
        const res = await getReviews(profileId);
        const rows = Array.isArray(res?.reviews) ? res.reviews : [];
        const ratingValues = rows
          .map(r => Number(r?.rating))
          .filter(n => Number.isFinite(n) && n > 0);
        const avg =
          ratingValues.length > 0
            ? Number(
                (
                  ratingValues.reduce((sum, n) => sum + n, 0) / ratingValues.length
                ).toFixed(1),
              )
            : null;
        setUserRatingByProfileId(prev => ({...prev, [profileId]: avg}));
      } catch (_) {
        setUserRatingByProfileId(prev => ({...prev, [profileId]: null}));
      }
    }
  };

  const preloadUserRatingsForSearch = async () => {
    const targets = [...new Set(
      userSearchItems
        .map(item => item?.ratingTargetId)
        .filter(v => typeof v === 'string' && v.trim() !== ''),
    )];
    await preloadUserRatingsForTargets(targets);
  };

  return (
    <View style={styles.container}>
      {/* Top bar - back, center filters (spacer keeps filters centered) */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBarSideBtn}
          hitSlop={12}
          onPress={() => {
            if (showUserSearchPanel) {
              setShowUserSearchPanel(false);
              setUserSearchQuery('');
              setFailedSearchAvatarKeys(new Set());
              return;
            }
            onClose?.();
          }}>
          <MaterialCommunityIcons name="chevron-left" size={22} color="#fff" />
        </TouchableOpacity>
        {showUserSearchPanel ? (
          <View style={styles.userSearchInputWrap}>
            <TouchableOpacity
              style={styles.userSearchClearBtn}
              onPress={() => setUserSearchQuery('')}
              hitSlop={8}
              activeOpacity={0.8}>
              <MaterialCommunityIcons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <TextInput
              style={styles.userSearchInput}
              value={userSearchQuery}
              onChangeText={setUserSearchQuery}
              placeholder="חיפוש משתמש"
              placeholderTextColor="rgba(255,255,255,0.75)"
              textAlign="right"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        ) : (
          <View style={styles.topBarCenter}>
            {TOP_BAR_FILTERS.map((f) => {
              const topSelected = selectedTopBarFilter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={styles.topBarFilterBtn}
                  hitSlop={8}
                  onPress={() => setSelectedTopBarFilter(prev => (prev === f.id ? null : f.id))}>
                  <Image
                    source={f.icon}
                    style={[styles.topBarFilterIcon, topSelected && styles.filterIconSelectedTint]}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {showUserSearchPanel ? (
          <View style={styles.topBarSideBtn} />
        ) : (
          <TouchableOpacity
            style={styles.topBarSideBtn}
            hitSlop={12}
            activeOpacity={0.8}
            onPress={() => {
              setFailedSearchAvatarKeys(new Set());
              setShowUserSearchPanel(true);
              loadAllUsersForSearch();
              preloadUserRatingsForSearch();
            }}>
            <MaterialCommunityIcons name="magnify" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {showUserSearchPanel && (
        <View style={styles.userSearchPanel}>
          <ScrollView
            style={styles.userSearchList}
            contentContainerStyle={styles.userSearchListContent}
            showsVerticalScrollIndicator={false}>
            {userSearchItems.length === 0 ? (
              <View style={styles.userSearchEmptyWrap}>
                <Text style={styles.userSearchEmptyText}>לא נמצאו משתמשים</Text>
              </View>
            ) : (
              userSearchItems.map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.userSearchRow}
                  activeOpacity={0.8}
                  onPress={() => {
                    setShowUserSearchPanel(false);
                    setUserSearchQuery('');
                    onOpenUserProfile?.(item.listing || null);
                  }}>
                  <View style={styles.userSearchTextWrap}>
                    <Text style={styles.userSearchName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.userSearchMetaRow}>
                      <Text style={styles.userSearchMetaText} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                      {(() => {
                        const ratingValue = item.ratingTargetId
                          ? Number(userRatingByProfileId[item.ratingTargetId])
                          : NaN;
                        if (!Number.isFinite(ratingValue) || ratingValue <= 0) return null;
                        const isFiveStars = ratingValue >= 5;
                        return (
                          <>
                            {isFiveStars ? (
                              <View style={styles.userSearchRatingGlowWrap}>
                                <Image
                                  source={TIKTOK_OVERLAY_ICONS.ratingFiveStars}
                                  style={styles.userSearchRatingIcon}
                                  resizeMode="contain"
                                />
                              </View>
                            ) : ratingValue <= 4 ? (
                              <Image
                                source={TIKTOK_OVERLAY_ICONS.ratingOneToFour}
                                style={styles.userSearchRatingIcon}
                                resizeMode="contain"
                              />
                            ) : (
                              <MaterialCommunityIcons name="star" size={14} color="#FFC40A" />
                            )}
                            <Text style={styles.userSearchMetaCount}>
                              {String(Math.round(ratingValue))}
                            </Text>
                          </>
                        );
                      })()}
                    </View>
                  </View>
                  {item.avatar && !failedSearchAvatarKeys.has(item.key) ? (
                    <Image
                      source={{uri: item.avatar}}
                      style={styles.userSearchAvatar}
                      onError={() =>
                        setFailedSearchAvatarKeys(prev => {
                          const next = new Set(prev);
                          next.add(item.key);
                          return next;
                        })
                      }
                    />
                  ) : (
                    <View style={[styles.userSearchAvatar, styles.userSearchAvatarPlaceholder]}>
                      <MaterialCommunityIcons name="account" size={20} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* List view: scrollable cards when list icon is selected */}
      {!showUserSearchPanel && selectedTopBarFilter === 'list' && (
        <ScrollView
          style={styles.listScrollView}
          contentContainerStyle={styles.listScrollContent}
          showsVerticalScrollIndicator={false}>
          {videos.map((listing, index) => {
            // images array is already [{uri: url}, ...] from transformed listings
            const firstImg = listing.images && listing.images.length > 0 ? listing.images[0] : null;
            const isPlaceholderUri = firstImg && (firstImg.uri === 'text-post-placeholder' || !firstImg.uri);
            const imgSrc =
              firstImg && !isPlaceholderUri
                ? firstImg
                : listing.image
                  ? typeof listing.image === 'number'
                    ? listing.image
                    : {uri: listing.image}
                : null;
            const hasMultipleImages = listing.images && listing.images.length > 1;
            const listCardProfileUrl = getUserProfileImageUrl(listing);
            return (
              <TouchableOpacity
                key={listing.id}
                style={styles.listCard}
                onPress={() => {
                  setSelectedTopBarFilter(null);
                  setCurrentIndex(index);
                }}
                activeOpacity={0.9}>
                <View style={styles.listCardImageWrap}>
                  {imgSrc ? (
                    <Image source={imgSrc} style={styles.listCardImage} resizeMode="contain" />
                  ) : (
                    <View style={[styles.listCardImage, styles.listCardImagePlaceholder]}>
                      <MaterialCommunityIcons name="image-off" size={48} color="rgba(255,255,255,0.3)" />
                    </View>
                  )}
                  {hasMultipleImages && (
                    <View style={styles.listCardDots}>
                      {listing.images.slice(0, 5).map((_, i) => (
                        <View
                          key={i}
                          style={[styles.listCardDot, i === 0 && styles.listCardDotActive]}
                        />
                      ))}
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.listCardProfile}
                    onPress={() => onOpenUserProfile?.(listing)}
                    activeOpacity={0.8}>
                    {listCardProfileUrl ? (
                      <Image
                        source={{uri: listCardProfileUrl}}
                        style={styles.listCardProfileImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.listCardProfileImg, styles.listCardProfilePlaceholder]}>
                        <MaterialCommunityIcons name="account" size={20} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
                <View style={styles.listCardBody}>
                  <View style={styles.listCardPurposeRow}>
                    <Text style={styles.listCardPurposeText}>{listing.purpose || 'להשכרה'}</Text>
                    <TouchableOpacity
                      onPress={() => toggleLiked(listing)}
                      hitSlop={12}
                      style={styles.listCardHeart}>
                      <MaterialCommunityIcons
                        name={isItemLiked(listing) ? 'heart' : 'heart-outline'}
                        size={22}
                        color={isItemLiked(listing) ? '#ff4757' : '#fff'}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.listCardAddress} numberOfLines={2}>
                    {listing.location || listing.address || 'תל אביב'}
                  </Text>
                  <View style={styles.listCardLocationRow}>
                    <MaterialCommunityIcons name="map-marker" size={14} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.listCardLocationText} numberOfLines={1}>
                      {listing.location || 'תל אביב, רוטשילד 54'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Feed view: sidebar, nav, full-screen items */}
      {!showUserSearchPanel && selectedTopBarFilter !== 'list' && (
      <>
      {/* Sidebar - draggable: hold and swipe up/down; bottom icons disappear off screen when dragged down */}
      <Animated.View
        style={[
          styles.sidebar,
          sidebarCollapsed && {top: 360},
          {transform: [{translateY: feedOverlayTranslateY}]},
        ]}
        {...sidebarPanResponder.panHandlers}>
        <View
          style={[
            styles.sidebarImageWrap,
            sidebarCollapsed && styles.sidebarImageWrapCollapsed,
          ]}
          onLayout={event => {
            const h = event?.nativeEvent?.layout?.height;
            if (h > 0) setSidebarViewportHeight(h);
          }}>
          <Animated.View
            style={[
              styles.sidebarDragContent,
              { transform: [{ translateY: sidebarDragY }] },
            ]}>
            {/* Profile pic of current ad uploader. Tap passes full listing (with creator_*, subscription_id from API) to UserProfileScreen. */}
            <TouchableOpacity
              style={styles.sidebarProfileWrap}
              onPress={() => onOpenUserProfile?.(videos[currentIndex] ?? null)}
              activeOpacity={0.8}
              onLayout={event => {
                const h = event?.nativeEvent?.layout?.height;
                if (h > 0) setSidebarProfileHeight(h);
              }}>
              <View style={styles.sidebarProfileRing}>
                {sidebarProfileUrl ? (
                  <Image
                    source={{uri: sidebarProfileUrl}}
                    style={styles.sidebarProfilePic}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.sidebarProfilePic, styles.sidebarProfilePlaceholder]}>
                    <MaterialCommunityIcons name="account" size={28} color="#fff" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
            {sidebarFiltersForFeed.map((filter, index) => {
              const isSelected = selectedSidebarFilter === filter.id;
              const labelWords = String(filter.label || '')
                .trim()
                .split(/\s+/)
                .filter(Boolean);
              const labelText =
                labelWords.length === 2
                  ? `${labelWords[0]}\n${labelWords[1]}`
                  : filter.label;
              return (
                <TouchableOpacity
                  key={filter.id}
                  style={styles.sidebarFilterBtn}
                  onPress={() => setSelectedSidebarFilter(prev => prev === filter.id ? null : filter.id)}
                  activeOpacity={0.7}
                  onLayout={event => {
                    const layout = event?.nativeEvent?.layout;
                    if (!layout) return;
                    const {y, height} = layout;
                    if (!Number.isFinite(y) || !Number.isFinite(height) || height <= 0) return;
                    if (index === 0) setSidebarFilterHeight(height);
                    setSidebarFilterLayouts(prev => {
                      const existing = prev[index];
                      if (existing && existing.y === y && existing.height === height) {
                        return prev;
                      }
                      return {
                        ...prev,
                        [index]: {y, height},
                      };
                    });
                  }}>
                  <Image
                    source={filter.icon}
                    style={[styles.sidebarFilterIcon, isSelected && styles.filterIconSelectedTint]}
                    resizeMode="contain"
                  />
                  <Text
                    style={[
                      styles.sidebarFilterLabel,
                      isSelected && styles.sidebarFilterLabelSelected,
                    ]}>
                    {labelText}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        </View>
      </Animated.View>

      {/* Navigation buttons */}
      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={[
            styles.navButton,
            styles.navButtonUp,
            currentIndex === 0 && styles.navButtonDisabled,
          ]}
          onPress={handlePrevious}
          disabled={currentIndex === 0}>
          <Text style={styles.navButtonText}>▲</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.navButtonDown,
            currentIndex === videos.length - 1 && styles.navButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={currentIndex === videos.length - 1}>
          <Text style={styles.navButtonText}>▼</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.scrollView, {height: screenHeight}]} {...panResponder.panHandlers}>
        <Animated.ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          style={[styles.scrollView, {height: screenHeight}]}
          contentContainerStyle={styles.scrollContent}
          onScroll={Animated.event(
            [{nativeEvent: {contentOffset: {y: feedScrollY}}}],
            {useNativeDriver: false},
          )}
          scrollEventThrottle={16}
          onMomentumScrollEnd={event => {
            const y = event?.nativeEvent?.contentOffset?.y ?? 0;
            const nextIndex = Math.max(
              0,
              Math.min(videos.length - 1, Math.round(y / Math.max(1, screenHeight))),
            );
            setCurrentIndex(nextIndex);
          }}
          scrollEnabled={false}
          bounces={false}>
          {videos.map((video, index) => {
          // Handle uploaded content
          if (video.isUploaded) {
            // Text-only post (from post editor with no image/video)
            if (video.isTextOnlyPost && video.description) {
              return (
                <View
                  key={video.id}
                  style={[
                    styles.videoItem,
                    {
                      height: screenHeight,
                      minHeight: screenHeight,
                      maxHeight: screenHeight,
                    },
                  ]}>
                  <LinearGradient
                    colors={['#2a1a4a', '#1a0d2e', '#0d0620']}
                    style={styles.textPostCardGradient}>
                    <Text style={styles.textPostCardDescription} numberOfLines={10}>
                      {video.description}
                    </Text>
                  </LinearGradient>
                </View>
              );
            }
            // Priority 1: If there's a video, show only the video
            if (video.type === 'video' && video.video) {
              // Display video
              return (
                <View
                  key={video.id}
                  style={[
                    styles.videoItem,
                    {
                      height: screenHeight,
                      minHeight: screenHeight,
                      maxHeight: screenHeight,
                    },
                  ]}>
                  {Platform.OS === 'web' ? (
                    <video
                      src={video.video.uri}
                      style={styles.videoElement}
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  ) : (
                    <Text style={styles.videoPlaceholder}>
                      Video: {video.video.name}
                    </Text>
                  )}
                </View>
              );
            }
            // Priority 2: If there are images (and no video), show images based on displayOption
            else if (video.images && video.images.length > 0) {
              // Only use displayOption if there's more than 1 image
              const displayMode =
                video.images.length > 1
                  ? video.displayOption || 'slideshow'
                  : 'slideshow'; // Single image always uses slideshow (no need for collage)

              const isPostWithOverlay =
                isPostVideo(video) &&
                hasMeaningfulPostDescription(video.description);

              // Display images with swipe or collage; for posts with text, show description over image
              return (
                <View
                  key={video.id}
                  style={[
                    styles.videoItem,
                    {
                      height: screenHeight,
                      minHeight: screenHeight,
                      maxHeight: screenHeight,
                      position: 'relative',
                    },
                  ]}>
                  <ImageSwiper
                    images={video.images}
                    screenHeight={screenHeight}
                    video={video}
                    displayOption={displayMode}
                  />
                  {isPostWithOverlay && (
                    <View
                      style={[
                        styles.postDescriptionOverlay,
                        {
                          left: video.overlayX ?? 80,
                          top: video.overlayY ?? 80,
                          pointerEvents: 'none',
                        },
                      ]}>
                      <Text style={styles.postDescriptionOverlayText} numberOfLines={6}>
                        {video.description}
                      </Text>
                    </View>
                  )}
                </View>
              );
            }
          }

          // Handle mock data (existing images)
          return (
            <View
              key={video.id}
              style={[
                styles.videoItem,
                {
                  height: screenHeight,
                  minHeight: screenHeight,
                  maxHeight: screenHeight,
                },
              ]}>
              <View style={styles.videoImageContainer}>
                <Image
                  source={getTikImage(video.image)}
                  style={styles.videoImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          );
        })}
        </Animated.ScrollView>
      </View>

      {/* Action overlay - default listing style + special company listing style */}
      <Animated.View
        style={[
          styles.actionIconsContainer,
          {transform: [{translateY: feedOverlayTranslateY}]},
        ]}>
        {isCompanyListing ? (
          <View style={styles.companyOverlayInfo}>
            <View style={styles.companyTopRow}>
              <TouchableOpacity
                style={styles.actionIconButton}
                onPress={() => toggleLiked(currentVideo)}>
                <Image
                  source={TIKTOK_OVERLAY_ICONS.heart}
                  style={[
                    styles.actionIcon,
                    isItemLiked(currentVideo) && styles.actionIconLiked,
                  ]}
                  tintColor={isItemLiked(currentVideo) ? '#ff3b5c' : undefined}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <Image
                source={TIKTOK_OVERLAY_ICONS.preSaleBadge}
                style={styles.companyPreSaleBadge}
                resizeMode="contain"
              />
            </View>
            <View style={styles.companyAddressWrap}>
              <Text style={styles.companyAddressText} numberOfLines={2}>
                {companyPrimaryAddress}
                {companySecondaryAddress ? `,\n${companySecondaryAddress}` : ''}
              </Text>
            </View>
            <View style={styles.companyStatsRow}>
              <View style={styles.companyStatItem}>
                <Text style={styles.companyStatText}>{companyApartmentsCount} דירות</Text>
                <Image source={TIKTOK_OVERLAY_ICONS.companyDoor} style={styles.companyStatIcon} />
              </View>
              <View style={styles.companyStatItem}>
                <Text style={styles.companyStatText}>{companyFloorsCount} קומות</Text>
                <Image source={TIKTOK_OVERLAY_ICONS.companyStairs} style={styles.companyStatIcon} />
              </View>
              <View style={styles.companyStatItem}>
                <Text style={styles.companyStatText}>בניין {companyBuildingsCount}</Text>
                <Image source={TIKTOK_OVERLAY_ICONS.companyBuilding} style={styles.companyStatIcon} />
              </View>
            </View>
          </View>
        ) : isPostListing ? (
          <View style={styles.postActionsInfo}>
            <View style={styles.postActionsRow}>
              <TouchableOpacity
                style={styles.postActionItem}
                onPress={() => toggleLiked(currentVideo)}
                activeOpacity={0.85}>
                <Image
                  source={TIKTOK_OVERLAY_ICONS.postLike}
                  style={styles.postActionIcon}
                  tintColor={isItemLiked(currentVideo) ? '#FFC40A' : undefined}
                  resizeMode="contain"
                />
                <Text style={styles.postActionCountText}>
                  {formatCount(currentVideo?.post_like_count ?? 0)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.postActionItem}
                onPress={() => openCommentsForPost(currentVideo)}
                activeOpacity={0.85}>
                <Image
                  source={TIKTOK_OVERLAY_ICONS.postComment}
                  style={styles.postActionIcon}
                  resizeMode="contain"
                />
                <Text style={styles.postActionCountText}>
                  {formatCount(getDisplayedCommentCount(currentVideo))}
                </Text>
              </TouchableOpacity>
              <View style={styles.postActionItem}>
                <Image
                  source={TIKTOK_OVERLAY_ICONS.postShare}
                  style={styles.postActionIcon}
                  resizeMode="contain"
                />
                <Text style={styles.postActionCountText}>
                  {formatCount(currentVideo?.share_count ?? 0)}
                </Text>
              </View>
              <View style={styles.postActionItem}>
                <Image
                  source={TIKTOK_OVERLAY_ICONS.postView}
                  style={styles.postActionIcon}
                  resizeMode="contain"
                />
                <Text style={styles.postActionCountText}>
                  {formatCount(currentVideo?.view_count ?? 0)}
                </Text>
              </View>
            </View>
          </View>
        ) : isBrokerListing ? (
          <View style={styles.brokerOverlayInfo}>
            <View style={styles.brokerTopRow}>
              <TouchableOpacity
                style={[styles.actionIconButton, styles.brokerHeartButton]}
                onPress={() => toggleLiked(videos[currentIndex])}>
                <Image
                  source={TIKTOK_OVERLAY_ICONS.heart}
                  style={[
                    styles.actionIcon,
                    styles.brokerActionIcon,
                    isItemLiked(videos[currentIndex]) && styles.actionIconLiked,
                  ]}
                  tintColor={isItemLiked(videos[currentIndex]) ? '#ff3b5c' : undefined}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <View style={styles.brokerPurposePill}>
                <Text style={styles.brokerPurposeText}>{brokerPurposeText}</Text>
              </View>
            </View>
            <Text style={styles.brokerPriceText} numberOfLines={1}>
              {brokerPriceText}
            </Text>
            <View style={styles.brokerLocationRow}>
              <Text style={styles.brokerLocationText} numberOfLines={1}>
                {brokerLocationText}
              </Text>
              <Image
                source={TIKTOK_OVERLAY_ICONS.location}
                style={styles.brokerLocationIcon}
                resizeMode="contain"
              />
            </View>
          </View>
        ) : (
          <View style={styles.propertyInfo}>
            <View style={styles.topRow}>
              <TouchableOpacity
                style={styles.actionIconButton}
                onPress={() => toggleLiked(videos[currentIndex])}>
                <Image
                  source={TIKTOK_OVERLAY_ICONS.heart}
                  style={[
                    styles.actionIcon,
                    isItemLiked(videos[currentIndex]) && styles.actionIconLiked,
                  ]}
                  tintColor={isItemLiked(videos[currentIndex]) ? '#ff3b5c' : undefined}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              {!isPostVideo(videos[currentIndex]) && (
                videos[currentIndex]?.category === 3 ? (
                  <View style={styles.forRentButton}>
                    <Text style={styles.forRentText}>
                      {videos[currentIndex]?.searchPurpose || 'מטרת החיפוש'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.forRentButton}>
                    <Text style={styles.forRentText}>
                      {videos[currentIndex]?.purpose || 'להשכרה'}
                    </Text>
                  </View>
                )
              )}
            </View>
            {!isPostVideo(videos[currentIndex]) &&
              (videos[currentIndex]?.category === 3 ? (
                <View style={styles.locationContainer}>
                  <Text style={styles.locationText}>
                    {videos[currentIndex]?.preferredApartmentType
                      ? `${videos[currentIndex].preferredApartmentType}`
                      : ''}
                    {videos[currentIndex]?.preferredGender
                      ? ` • ${videos[currentIndex].preferredGender}`
                      : ''}
                    {videos[currentIndex]?.preferredAgeMin &&
                    videos[currentIndex]?.preferredAgeMax
                      ? ` • גיל ${videos[currentIndex].preferredAgeMin}-${videos[currentIndex].preferredAgeMax}`
                      : ''}
                  </Text>
                </View>
              ) : (
                <View style={styles.locationContainer}>
                  <Text style={styles.locationText}>
                    {videos[currentIndex]?.location || 'תל אביב, רוטשילד 54'}
                  </Text>
                  <Image
                    source={TIKTOK_OVERLAY_ICONS.location}
                    style={styles.locationIcon}
                    resizeMode="contain"
                  />
                </View>
              ))}
            {videos[currentIndex]?.fromDatabase && (
              <View style={styles.viewsLikesRow}>
                <Text style={styles.viewsLikesText}>
                  {formatCount(videos[currentIndex]?.view_count ?? 0)} צפיות
                </Text>
                <Text style={styles.viewsLikesDot}> • </Text>
                <Text style={styles.viewsLikesText}>
                  {formatCount(videos[currentIndex]?.like_count ?? 0)} לייקים
                </Text>
              </View>
            )}
          </View>
        )}
      </Animated.View>
      </>
      )}

      {/* Bottom Bar - 5 icons: on global category, apartment item shows "סוג" + menu icon */}
      {!showUserSearchPanel && !showBottomSheet && !showCommentsSheet && (
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarRow}>
            {(() => {
              const categoryNum =
                selectedCategory != null && selectedCategory !== ''
                  ? Number(selectedCategory)
                  : NaN;
              const isOffices = categoryNum === 2;
              const selectedTypeIds = Array.isArray(feedFilters?.type)
                ? feedFilters.type.map(v => String(v || '').trim()).filter(Boolean)
                : feedFilters?.type != null && String(feedFilters.type).trim() !== ''
                  ? [String(feedFilters.type).trim()]
                  : [];
              const residentialTypeIds = new Set([
                'apartments',
                'private_houses',
                'estates',
                'villas',
                'hotels',
                'hotel',
              ]);
              const officeCommercialTypeIds = new Set([
                'offices',
                'commercial',
                'land',
                'store',
                'shopping_center',
                'industrial_buildings',
                'warehouse',
                'commercial_space',
                'whole_floor',
              ]);
              const hasResidentialTypeSelected = selectedTypeIds.some(t =>
                residentialTypeIds.has(t),
              );
              const hasOfficeOrCommercialTypeSelected = selectedTypeIds.some(t =>
                officeCommercialTypeIds.has(t),
              );
              return BOTTOM_BAR_ITEMS.map((item) => {
              // גלובל (4), BNB (5), and מסחר (8): show "סוג" + type icon and open Type filter; קרקעות (7): apartment slot shows "דונם"
              const isGlobal = selectedCategory == null || selectedCategory === '' || selectedCategory === 4 || selectedCategory === '4' || selectedCategory === 5 || selectedCategory === '5' || selectedCategory === 8 || selectedCategory === '8';
              const isLand = selectedCategory === 7 || selectedCategory === '7';
              const useGlobalStyle = item.id === 'apartment' && isGlobal && item.iconGlobal;
              const useLandDonamStyle = item.id === 'apartment' && isLand && item.iconLandDonam;
              // מסחר (8): rooms slot shows "מטר"; קרקעות (7): rooms slot shows "סוג"; שותפים (3): rooms slot shows "העדפות"
              const isCommerce = selectedCategory === 8 || selectedCategory === '8';
              const isPartners = selectedCategory === 3 || selectedCategory === '3';
              const useMeterFromTypeSelection =
                item.id === 'rooms' &&
                !isCommerce &&
                !isLand &&
                !isPartners &&
                !hasResidentialTypeSelected &&
                hasOfficeOrCommercialTypeSelected;
              const useCommerceStyle =
                item.id === 'rooms' &&
                (isCommerce || useMeterFromTypeSelection) &&
                item.iconCommerce;
              const useLandStyle = item.id === 'rooms' && isLand && item.iconLand;
              const usePartnersStyle = item.id === 'rooms' && isPartners && item.iconPartners;
              const useOfficesStyle = item.id === 'apartment' && isOffices;
              const iconSource = usePartnersStyle
                ? item.iconPartners
                : useLandDonamStyle
                  ? item.iconLandDonam
                  : useLandStyle
                    ? item.iconLand
                    : useCommerceStyle
                      ? item.iconCommerce
                      : useOfficesStyle
                        ? item.iconOffices
                        : useGlobalStyle
                          ? item.iconGlobal
                          : item.icon;
              const label = usePartnersStyle
                ? item.labelPartners || item.label
                : useLandDonamStyle
                  ? item.labelLandDonam || item.label
                  : useLandStyle
                    ? item.labelLand || item.label
                    : useCommerceStyle
                      ? item.labelCommerce || item.label
                      : useOfficesStyle
                        ? item.labelOffices || item.label
                        : useGlobalStyle
                          ? item.labelGlobal || item.label
                          : item.label;
              const activeFilterKey = (() => {
                if (item.id === 'price') return 'price';
                if (item.id === 'city') return 'city';
                if (item.id === 'apartment') {
                  if (useLandDonamStyle) return 'donam';
                  if (useGlobalStyle) return 'type';
                  if (useOfficesStyle) return 'office';
                  return 'apartmentType';
                }
                if (item.id === 'rooms') {
                  if (usePartnersStyle) return 'preferences';
                  if (useLandStyle) return 'type';
                  if (useCommerceStyle) return 'meter';
                  return 'rooms';
                }
                return null;
              })();
              const isBottomFilterActive =
                !item.isPost &&
                activeFilterKey != null &&
                isFilterValueActive(feedFilters?.[activeFilterKey]);
              const canTintActiveIcon = true;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.bottomBarItem, item.isPost && styles.bottomBarItemPost]}
                  onPress={() => {
                    if (item.isPost) setShowBottomSheet(true);
                    if (item.id === 'city' && onOpenCityFilter) onOpenCityFilter();
                    if (item.id === 'apartment') {
                      if (useLandDonamStyle && onOpenDonamFilter) onOpenDonamFilter();
                      else if (useGlobalStyle && onOpenTypeFilter) onOpenTypeFilter();
                      else if (useOfficesStyle && onOpenOfficeFilter) onOpenOfficeFilter();
                      else if (onOpenApartmentTypeFilter) onOpenApartmentTypeFilter();
                    }
                    if (item.id === 'rooms') {
                      if (usePartnersStyle && onOpenPreferencesFilter) onOpenPreferencesFilter();
                      else if (useLandStyle && onOpenTypeFilter) onOpenTypeFilter();
                      else if (useCommerceStyle && onOpenMeterFilter) onOpenMeterFilter();
                      else if (onOpenRoomsFilter) onOpenRoomsFilter();
                    }
                    if (item.id === 'price' && onOpenPriceFilter) onOpenPriceFilter();
                  }}
                  activeOpacity={0.8}>
                  <View style={[styles.bottomBarIconWrap, item.isPost && styles.bottomBarIconWrapPost]}>
                    <Image
                      source={iconSource}
                      style={[
                        styles.bottomBarIcon,
                        item.isPost && styles.bottomBarIconPost,
                        (useGlobalStyle ||
                          useOfficesStyle ||
                          useLandStyle ||
                          useLandDonamStyle ||
                          usePartnersStyle) && styles.bottomBarIconGlobal,
                        isBottomFilterActive && canTintActiveIcon && styles.bottomBarIconActive,
                      ]}
                      tintColor={
                        isBottomFilterActive && canTintActiveIcon
                          ? ACTIVE_FILTER_COLOR
                          : undefined
                      }
                      resizeMode="contain"
                    />
                  </View>
                  <Text
                    style={[
                      styles.bottomBarLabel,
                      item.isPost && styles.bottomBarLabelPost,
                      isBottomFilterActive && styles.bottomBarLabelActive,
                    ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            });
            })()}
          </View>
        </View>
      )}

      {/* Bottom Sheet */}
      {showBottomSheet && (
        <Animated.View
          style={[
            styles.bottomSheet,
            {transform: [{translateY: bottomSheetTranslateY}]},
          ]}>
          <View
            style={styles.bottomSheetHandleWrap}
            {...bottomSheetPanResponder.panHandlers}>
            <View style={styles.bottomSheetHandle} />
          </View>
          {selectedCategory === 5 || selectedCategory === '5' ? (
            <>
              <TouchableOpacity
                style={styles.bottomSheetOption}
                onPress={() => closeSheetAndOpenListing({bnbHostType: 'private'})}
                activeOpacity={0.85}>
                <Text style={styles.bottomSheetArrow}>‹</Text>
                <View style={styles.bottomSheetOptionContent}>
                  <View style={styles.bottomSheetTextContainer}>
                    <Text style={styles.bottomSheetTitle}>פרסם כפרטי</Text>
                    <Text style={styles.bottomSheetSubtitle}>
                      פרסם חדר או אתר נופש פרטי
                    </Text>
                  </View>
                  <Image
                    source={require('../assets/ad-uplaud/bnb-private.png')}
                    style={styles.bottomSheetIcon}
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>
              <View style={styles.bottomSheetDivider} />
              <TouchableOpacity
                style={styles.bottomSheetOption}
                onPress={() => closeSheetAndOpenListing({bnbHostType: 'business'})}
                activeOpacity={0.85}>
                <Text style={styles.bottomSheetArrow}>‹</Text>
                <View style={styles.bottomSheetOptionContent}>
                  <View style={styles.bottomSheetTextContainer}>
                    <Text style={styles.bottomSheetTitle}>פרסם כעסק</Text>
                    <Text style={styles.bottomSheetSubtitle}>
                      פרסם חדר או אתר נופש עסקי
                    </Text>
                  </View>
                  <Image
                    source={require('../assets/ad-uplaud/bnb-bussiness.png')}
                    style={styles.bottomSheetIcon}
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.bottomSheetOption}
              onPress={() => closeSheetAndOpenListing()}
              activeOpacity={0.85}>
              <Text style={styles.bottomSheetArrow}>‹</Text>
              <View style={styles.bottomSheetOptionContent}>
                <View style={styles.bottomSheetTextContainer}>
                  {selectedCategory === 10 || selectedCategory === '10' ? (
                    <>
                      <Text style={styles.bottomSheetTitle}>פרויקט</Text>
                      <Text style={styles.bottomSheetSubtitle}>
                        פרסם נכס למכירה או השכרה
                      </Text>
                    </>
                  ) : selectedCategory === 3 || selectedCategory === '3' ? (
                    <>
                      <Text style={styles.bottomSheetTitle}>פרסם מודעה</Text>
                      <Text style={styles.bottomSheetSubtitle}>
                        צור מודעה כדי להיכנס, להכניס או למצוא שותף
                      </Text>
                    </>
                  ) : selectedCategory === 7 || selectedCategory === '7' ? (
                    <>
                      <Text style={styles.bottomSheetTitle}>קרקע</Text>
                      <Text style={styles.bottomSheetSubtitle}>
                        פרסם קרקע למכירה או השכרה
                      </Text>
                    </>
                  ) : selectedCategory === 8 || selectedCategory === '8' ? (
                    <>
                      <Text style={styles.bottomSheetTitle}>נכס מסחרי</Text>
                      <Text style={styles.bottomSheetSubtitle}>
                        פרסם נכס מסחרי למכירה או השכרה
                      </Text>
                    </>
                  ) : selectedCategory === 4 ||
                    selectedCategory === '4' ||
                    selectedCategory === 6 ||
                    selectedCategory === '6' ||
                    selectedCategory === 12 ||
                    selectedCategory === '12' ? (
                    <>
                      <Text style={styles.bottomSheetTitle}>נכס</Text>
                      <Text style={styles.bottomSheetSubtitle}>
                        פרסם נכס למכירה או השכרה
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.bottomSheetTitle}>משרד</Text>
                      <Text style={styles.bottomSheetSubtitle}>
                        פרסם משרד למכירה או השכרה
                      </Text>
                    </>
                  )}
                </View>
                <Image
                  source={
                    selectedCategory === 10 || selectedCategory === '10'
                      ? require('../assets/ad-uplaud/appartments.png')
                      : selectedCategory === 3 || selectedCategory === '3'
                        ? require('../assets/image22221.png')
                        : selectedCategory === 7 || selectedCategory === '7'
                          ? require('../assets/categories/image-copy.png')
                          : selectedCategory === 8 || selectedCategory === '8'
                            ? require('../assets/categories/image.png')
                            : selectedCategory === 4 ||
                                selectedCategory === '4' ||
                                selectedCategory === 6 ||
                                selectedCategory === '6' ||
                                selectedCategory === 12 ||
                                selectedCategory === '12'
                              ? require('../assets/categories/exclusive-post-icon.png')
                              : require('../assets/post-office-icon.png')
                  }
                  style={styles.bottomSheetIcon}
                  resizeMode="contain"
                />
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.bottomSheetDivider} />

          <TouchableOpacity
            style={styles.bottomSheetOption}
            onPress={() => {
              setShowBottomSheet(false);
              if (onOpenPostEditor) {
                onOpenPostEditor(selectedCategory);
              }
            }}>
            <Text style={styles.bottomSheetArrow}>‹</Text>
            <View style={styles.bottomSheetOptionContent}>
              <View style={styles.bottomSheetTextContainer}>
                <Text style={styles.bottomSheetTitle}>פוסט</Text>
                <Text style={styles.bottomSheetSubtitle}>
                  שתף מידע או עדכון עם הקהילה
                </Text>
              </View>
              <Image
                source={require('../assets/ad-uplaud/posts.png')}
                style={styles.bottomSheetIcon}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {showCommentsSheet && (
        <View style={styles.commentsSheetOverlay}>
          <TouchableOpacity
            style={styles.commentsBackdrop}
            activeOpacity={1}
            onPress={() => setShowCommentsSheet(false)}
          />
          <View style={[styles.commentsSheet, {height: screenHeight * 0.8}]}>
            <View style={styles.commentsTopHeader}>
              <View style={styles.commentsHandle} />
            </View>
            <View style={styles.commentsCountBar}>
              <Text style={styles.commentsTitle}>
                {formatCount(getDisplayedCommentCount(activeCommentsVideo))} תגובות
              </Text>
            </View>
            <View style={styles.commentsListFrame}>
              <ScrollView
                style={styles.commentsList}
                contentContainerStyle={styles.commentsListContent}
                showsVerticalScrollIndicator={false}>
                {commentsLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  currentComments.map(comment => (
                    <View key={String(comment.id)} style={styles.commentCard}>
                      <View style={styles.commentHeader}>
                        <View style={styles.commentAuthorWrap}>
                          <Text style={styles.commentAuthorText}>
                            {comment.commenter_name || 'משתמש'}
                          </Text>
                          <Text style={styles.commentDateText}>
                            {new Date(comment.created_at || Date.now()).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </Text>
                        </View>
                        {comment.commenter_image_url ? (
                          <Image
                            source={{uri: comment.commenter_image_url}}
                            style={styles.commentAvatar}
                          />
                        ) : (
                          <View style={[styles.commentAvatar, styles.commentAvatarPlaceholder]} />
                        )}
                      </View>
                      <Text style={styles.commentBodyText}>{comment.comment_text || ''}</Text>
                      <View style={styles.commentCardFooter}>
                        <Text style={styles.commentWhenText}>
                          {formatCommentTime(comment.created_at)}
                        </Text>
                        <View style={styles.commentActionsWrap}>
                          <TouchableOpacity
                            style={styles.commentLikeWrap}
                            onPress={() => toggleCommentReaction(comment.id, 'like')}
                            activeOpacity={0.85}>
                            <Image
                              source={
                                comment.my_reaction === 'like'
                                  ? TIKTOK_OVERLAY_ICONS.commentsCardHeartLiked
                                  : TIKTOK_OVERLAY_ICONS.commentsCardHeart
                              }
                              style={[
                                styles.commentActionIcon,
                                comment.my_reaction === 'like' && styles.commentActionIconActive,
                              ]}
                              resizeMode="contain"
                            />
                            <Text style={styles.commentLikeCountText}>
                              {formatCount(comment.likes_count ?? 0)}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.commentLikeWrap}
                            onPress={() => toggleCommentReaction(comment.id, 'dislike')}
                            activeOpacity={0.85}>
                          <Image
                            source={TIKTOK_OVERLAY_ICONS.commentsDislike}
                            style={[
                              styles.commentActionIcon,
                              styles.commentDislikeIcon,
                              comment.my_reaction === 'dislike' && styles.commentActionIconActive,
                            ]}
                            resizeMode="contain"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
            <View style={styles.commentsBottomSection}>
              <View style={styles.reactionsRow}>
                {COMMENT_REACTIONS.map(emoji => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.reactionBtn}
                    activeOpacity={0.8}
                    onPress={() => setNewCommentText(prev => `${prev || ''}${emoji}`)}>
                    <Text style={styles.reactionText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.commentInputRow}>
                <TouchableOpacity style={styles.cameraBtn} activeOpacity={0.85}>
                  <Image
                    source={TIKTOK_OVERLAY_ICONS.commentsCamera}
                    style={styles.cameraIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <TextInput
                  value={newCommentText}
                  onChangeText={setNewCommentText}
                  placeholder="כתוב הודעה"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={styles.commentInput}
                  textAlign="right"
                  returnKeyType="send"
                  onSubmitEditing={submitPostComment}
                />
              </View>
              <View style={styles.commentsHomeIndicatorWrap}>
                <View style={styles.commentsHomeIndicator} />
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
    height: '100%',
    width: '100%',
    maxWidth: 414,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 26,
    backgroundColor: '#1E1D27',
    zIndex: 200,
  },
  topBarSideBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 8,
  },
  topBarFilterBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  topBarFilterIcon: {
    width: 20,
    height: 20,
  },
  /** Selected feed filter: tint only the PNG strokes (#FFC40A), no extra background */
  filterIconSelectedTint: {
    tintColor: '#FFC40A',
  },
  userSearchInputWrap: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#FFC40A',
    borderRadius: 20,
    backgroundColor: '#1E1D27',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginHorizontal: 8,
  },
  userSearchClearBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  userSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 20,
    fontFamily: 'Rubik-Regular',
    paddingVertical: 0,
  },
  userSearchPanel: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1E1D27',
    zIndex: 190,
  },
  userSearchList: {
    flex: 1,
  },
  userSearchListContent: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  userSearchRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  userSearchTextWrap: {
    flex: 1,
    marginRight: 12,
    alignItems: 'flex-end',
  },
  userSearchName: {
    color: '#FFFFFF',
    fontSize: 25,
    lineHeight: 25,
    fontFamily: 'Rubik-Medium',
    textAlign: 'right',
  },
  userSearchMetaRow: {
    marginTop: 2,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  userSearchMetaText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 17,
    lineHeight: 17,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
    maxWidth: 220,
  },
  userSearchMetaCount: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 17,
    fontFamily: 'Rubik-Regular',
  },
  userSearchRatingIcon: {
    width: 14,
    height: 14,
  },
  userSearchRatingGlowWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,196,10,0.24)',
    shadowColor: '#FFC40A',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 0},
    elevation: 8,
  },
  userSearchAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#FFC40A',
  },
  userSearchAvatarPlaceholder: {
    backgroundColor: '#343347',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userSearchEmptyWrap: {
    paddingTop: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userSearchEmptyText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
  },
  listScrollView: {
    flex: 1,
    marginTop: 80,
    width: '100%',
    maxWidth: 414,
    backgroundColor: '#0d1117',
  },
  listScrollContent: {
    paddingBottom: 100,
    paddingHorizontal: 8,
    paddingTop: 16,
    backgroundColor: '#0d1117',
  },
  listCard: {
    width: '100%',
    maxWidth: 414,
    marginBottom: 16,
    backgroundColor: '#161b22',
    borderRadius: 16,
    overflow: 'hidden',
  },
  listCardImageWrap: {
    width: '100%',
    height: 220,
    backgroundColor: '#000',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCardImage: {
    width: '100%',
    height: '100%',
  },
  listCardImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listCardDots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  listCardDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  listCardDotActive: {
    backgroundColor: Colors.yellowIcons || '#FFD700',
  },
  listCardProfile: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.9)',
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  listCardProfileImg: {
    width: '100%',
    height: '100%',
  },
  listCardProfilePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listCardBody: {
    backgroundColor: '#161b22',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  listCardPurposeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  listCardPurposeText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
  },
  listCardHeart: {
    padding: 4,
  },
  listCardAddress: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    marginBottom: 6,
    textAlign: 'right',
  },
  listCardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  listCardLocationText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#000',
  },
  backButton: {
    marginRight: 15,
  },
  backArrow: {
    color: '#fff',
    fontSize: 32,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
  },
  scrollView: {
    width: '100%',
    height: '100%',
    maxWidth: 414,
    margin: 0,
    padding: 0,
  },
  scrollContent: {
    width: '100%',
    maxWidth: 414,
    flexDirection: 'column',
    margin: 0,
    padding: 0,
    paddingBottom: 80,
  },
  videoItem: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    width: '100%',
    maxWidth: 414,
    margin: 0,
    padding: 0,
    borderWidth: 0,
  },
  textPostCardGradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  textPostCardDescription: {
    color: '#fff',
    fontSize: 22,
    textAlign: 'center',
  },
  postDescriptionOverlay: {
    position: 'absolute',
    maxWidth: '75%',
    zIndex: 30,
    elevation: 30,
  },
  postDescriptionOverlayText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
    textAlign: 'right',
  },
  videoImageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoImage: {
    width: '100%',
    height: '100%',
    maxWidth: Dimensions.get('window').width,
    maxHeight: Dimensions.get('window').height,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  rightActions: {
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconText: {
    fontSize: 24,
  },
  actionCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  bottomInfo: {
    flex: 1,
    paddingRight: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  videoDescription: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  location: {
    color: '#fff',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  price: {
    color: Colors.yellowIcons,
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  views: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  navigationButtons: {
    position: 'absolute',
    right: 20,
    display: 'none',
    top: '50%',
    transform: [{translateY: -60}],
    alignItems: 'center',
    zIndex: 100,
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  navButtonUp: {
    marginBottom: 20,
  },
  navButtonDown: {
    marginTop: 20,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  iconsContainer: {
    width: '100%',
    maxWidth: 414,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: '100%',
  },
  icon: {
    width: 45,
    height: 45,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: 80,
    backgroundColor: '#1E1D27',
    zIndex: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '92%',
    maxWidth: 380,
  },
  bottomBarItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    minWidth: 48,
  },
  bottomBarItemPost: {
    marginTop: -14,
  },
  bottomBarIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  bottomBarIconWrapPost: {
    width: 48,
    height: 48,
    marginTop: 5,
  },
  bottomBarIcon: {
    width: 22,
    height: 22,
  },
  bottomBarIconGlobal: {
    width: 28,
    height: 28,
  },
  bottomBarIconPost: {
    width: 40,
    height: 40,
  },
  bottomBarLabel: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
  },
  bottomBarLabelActive: {
    color: ACTIVE_FILTER_COLOR,
  },
  bottomBarIconActive: {
    tintColor: ACTIVE_FILTER_COLOR,
  },
  bottomBarLabelPost: {
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0,
  },
  sidebar: {
    position: 'absolute',
    left: 10,
    top: 115,
    bottom: 80,
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 100,
  },
  sidebarImageWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 0,
  },
  sidebarDragContent: {
    alignItems: 'center',
    width: '100%',
  },
  sidebarImageWrapCollapsed: {
    flex: 0,
    height: '48%',
    minHeight: 200,
  },
  sidebarImage: {
    width: 58,
    minHeight: 200,
  },
  sidebarArrowBtn: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  sidebarArrowText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  sidebarFilterBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  sidebarFilterIcon: {
    width: 28,
    height: 28,
    marginBottom: 4,
  },
  sidebarFilterLabel: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 15,
    maxWidth: 72,
  },
  sidebarFilterLabelSelected: {
    color: '#FFC40A',
  },
  sidebarProfileWrap: {
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarProfileRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#FFC40A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarProfilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  sidebarProfilePlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarProfile: {
    width: 60,
    height: 60,
    marginBottom: 20,
  },
  sidebarIcon: {
    width: 38,
    height: 38,
    marginBottom: 16,
  },
  actionIconsContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    flexDirection: 'column',
    alignItems: 'flex-end',
    zIndex: 100,
  },
  propertyInfo: {
    alignItems: 'flex-end',
  },
  companyOverlayInfo: {
    alignItems: 'flex-end',
    width: 366,
    maxWidth: '96%',
  },
  companyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 14,
    marginBottom: 12,
  },
  companyTagPill: {
    minHeight: 38,
    borderRadius: 20,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  companyTagText: {
    color: '#1E1D27',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
  },
  companyTagIcon: {
    width: 25,
    height: 21,
  },
  companyPreSaleBadge: {
    width: 115,
    height: 40,
  },
  companyAddressWrap: {
    marginBottom: 10,
    width: '100%',
  },
  companyAddressText: {
    color: '#F7F3E6',
    fontSize: 24,
    fontFamily: 'Rubik-SemiBold',
    lineHeight: 31,
    textAlign: 'right',
  },
  companyStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  companyStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  companyStatText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    lineHeight: 22,
  },
  companyStatIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  brokerOverlayInfo: {
    width: 334,
    alignItems: 'flex-end',
  },
  brokerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 14,
    marginBottom: 16,
  },
  brokerActionIcon: {
    width: 32,
    height: 32,
  },
  brokerHeartButton: {
    marginRight: 0,
    marginLeft: 6,
  },
  brokerPurposePill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 1000,
    paddingHorizontal: 6,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brokerPurposeText: {
    color: '#1E1D27',
    fontSize: 14,
    lineHeight: 16,
    fontFamily: 'Rubik-Medium',
    letterSpacing: 0.5447,
    textAlign: 'right',
  },
  brokerPriceText: {
    color: '#F7F3E6',
    fontSize: 24,
    lineHeight: 31,
    fontFamily: 'Rubik-SemiBold',
    textAlign: 'right',
    width: '100%',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  brokerLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
    gap: 4,
  },
  brokerLocationText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 32,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  brokerLocationIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  postActionsInfo: {
    width: 334,
    maxWidth: '96%',
    alignItems: 'flex-end',
  },
  postActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  postActionItem: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  postActionIcon: {
    width: 32,
    height: 32,
  },
  postActionCountText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 16,
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
  },
  commentsSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 500,
    justifyContent: 'flex-end',
  },
  commentsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  commentsSheet: {
    width: '100%',
    maxWidth: 414,
    height: 654,
    backgroundColor: '#2B2A39',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  commentsTopHeader: {
    height: 37,
    backgroundColor: '#262531',
    borderBottomWidth: 1,
    borderBottomColor: '#373548',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsCountBar: {
    height: 50,
    backgroundColor: '#262531',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsHandle: {
    width: 40,
    height: 5,
    borderRadius: 3.123,
    backgroundColor: '#464646',
  },
  commentsTitle: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
  },
  commentsList: {
    width: '100%',
  },
  commentsListFrame: {
    width: '100%',
    maxWidth: 350,
    flex: 1,
    minHeight: 0,
    alignSelf: 'center',
    marginBottom: 171,
  },
  commentsListContent: {
    paddingBottom: 16,
    gap: 20,
  },
  commentCard: {
    minHeight: 140,
    borderRadius: 23.231,
    backgroundColor: '#373548',
    paddingHorizontal: 18.585,
    paddingVertical: 18.585,
    gap: 20,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  commentAuthorWrap: {
    alignItems: 'flex-end',
    width: 293.2,
  },
  commentAuthorText: {
    color: '#F7F3E6',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Rubik-Medium',
  },
  commentDateText: {
    color: '#D2D0DC',
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.5447,
    marginTop: 2,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6d6e87',
    borderWidth: 0.513,
    borderColor: '#FFF3CA',
  },
  commentAvatarPlaceholder: {
    backgroundColor: '#6d6e87',
  },
  commentBodyText: {
    color: '#fff',
    fontSize: 20,
    lineHeight: 20,
    letterSpacing: 0.2,
    textAlign: 'right',
    fontFamily: 'Rubik-Regular',
  },
  commentCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentWhenText: {
    color: '#A5A5A5',
    fontSize: 18,
    lineHeight: 18,
    fontFamily: 'Rubik-Regular',
  },
  commentActionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
  },
  commentLikeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9.292,
  },
  commentActionIcon: {
    width: 24,
    height: 24,
  },
  commentActionIconActive: {
    opacity: 1,
  },
  commentDislikeIcon: {
    height: 24,
  },
  commentLikeCountText: {
    color: '#fff',
    fontSize: 20,
    lineHeight: 20,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Regular',
  },
  commentsBottomSection: {
    width: '100%',
    height: 171,
    backgroundColor: '#1E1D27',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  reactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#373548',
  },
  reactionBtn: {
    padding: 10,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionText: {
    fontSize: 32,
    lineHeight: 34,
    color: '#fff',
    letterSpacing: 0.32,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 16,
    paddingBottom: 14,
    justifyContent: 'space-between',
    width: '100%',
  },
  cameraBtn: {
    width: 24,
    height: 24,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    width: 24,
    height: 24,
  },
  commentInput: {
    flex: 1,
    minWidth: 0,
    height: 48,
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: '#8C85B3',
    backgroundColor: 'transparent',
    color: '#fff',
    paddingHorizontal: 16,
    fontSize: 20,
    letterSpacing: 0.2,
    textAlign: 'right',
  },
  commentsHomeIndicatorWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
  },
  commentsHomeIndicator: {
    width: 138,
    height: 5,
    borderRadius: 3.123,
    backgroundColor: '#fff',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionIconButton: {
    marginRight: 15,
  },
  actionIcon: {
    width: 40,
    height: 40,
  },
  actionIconLiked: {},
  forRentButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forRentText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  priceText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    width: 18,
    height: 18,
    marginRight: 5,
  },
  locationText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  viewsLikesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  viewsLikesText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  viewsLikesDot: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    maxWidth: 414,
    backgroundColor: '#2B2A39',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
    zIndex: 300,
  },
  bottomSheetHandleWrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginBottom: 8,
    minHeight: 52,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  bottomSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  bottomSheetOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bottomSheetTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 15,
  },
  bottomSheetTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 5,
  },
  bottomSheetSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  bottomSheetIcon: {
    width: 50,
    height: 50,
  },
  bottomSheetArrow: {
    color: '#fff',
    fontSize: 24,
    marginRight: 10,
  },
  bottomSheetDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 5,
  },
  videoElement: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  videoPlaceholder: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  imageSwiper: {
    width: '100%',
    height: '100%',
  },
  swiperImageContainer: {
    width: Dimensions.get('window').width,
    height: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swiperImageContainerSingle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  swiperImage: {
    width: '100%',
    height: '100%',
    maxWidth: Dimensions.get('window').width,
    maxHeight: Dimensions.get('window').height,
  },
  swiperImageSingle: {
    width: '100%',
    height: '100%',
    maxWidth: Dimensions.get('window').width,
    maxHeight: Dimensions.get('window').height,
    alignSelf: 'center',
  },
  imageIndicator: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  indicatorDotActive: {
    backgroundColor: '#fff',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  collageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    position: 'relative',
  },
  collageImageContainer: {
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  collageImage: {
    width: '100%',
    height: '100%',
  },
  collageImageSingle: {
    width: '100%',
    height: '100%',
    maxWidth: '100%',
    maxHeight: '100%',
  },
});

export default TikTokFeedScreen;
