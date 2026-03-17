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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Colors} from '../constants/styles';
import {getListings, recordListingView, likeListing, unlikeListing} from '../utils/api';
import {categoryImages, subscriptionTypes} from '../utils/constant';

// Sidebar filter buttons: each filters ads by type (maps to API subscription_type / has_video)
// Top bar center filters - icons from assets/top-filters
const TOP_BAR_FILTERS = [
  {id: 'pics', icon: require('../assets/top-filters/pics.png')},
  {id: 'list', icon: require('../assets/top-filters/list.png')},
  {id: 'video', icon: require('../assets/top-filters/video.png')},
  {id: 'liked', icon: require('../assets/top-filters/liked.png')},
];

// Bottom bar: 5 icons with labels (assets from buttom-bar). On global category, apartment item shows "סוג" + menu icon.
const BOTTOM_BAR_ITEMS = [
  {id: 'price', label: 'מחיר', icon: require('../assets/buttom-bar/price.png'), isPost: false},
  {id: 'rooms', label: 'חדרים', icon: require('../assets/buttom-bar/rooms_number.png'), iconCommerce: require('../assets/meter.png'), labelCommerce: 'מטר', iconLand: require('../assets/type-icon-global.png'), labelLand: 'סוג', iconPartners: require('../assets/haadafot.png'), labelPartners: 'העדפות', isPost: false},
  {id: 'post', label: 'פרסם', icon: require('../assets/buttom-bar/post.png'), isPost: true},
  {id: 'apartment', label: 'סוג דירה', icon: require('../assets/buttom-bar/appartment_type.png'), iconGlobal: require('../assets/type-icon-global.png'), labelGlobal: 'סוג', iconLandDonam: require('../assets/donam.png'), labelLandDonam: 'דונם', isPost: false},
  {id: 'city', label: 'עיר', icon: require('../assets/buttom-bar/city.png'), isPost: false},
];

// Icons from assets/side-filters
const SIDEBAR_FILTERS = [
  {id: 'personal', label: 'פרטי', subscription_type: 'user', icon: require('../assets/side-filters/private.png')},
  {id: 'broker', label: 'תיווך', subscription_type: 'broker', icon: require('../assets/side-filters/broker.png')},
  {id: 'renderings', label: 'הדמיות', has_video: true, icon: require('../assets/side-filters/animation.png')},
  {id: 'new', label: 'חדשות', icon: require('../assets/side-filters/new.png')},
  {id: 'posts', label: 'פוסטים', icon: require('../assets/side-filters/posts.png')},
  {id: 'service', label: 'נותני שירות', subscription_type: ['professional', 'company'], icon: require('../assets/side-filters/services.png')},
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
          // Five images: One large on left, 4 small on right (2x2 grid)
          if (index === 0) {
            // Large image on left - full height, half width
            return {
              width: screenWidth / 2,
              height: screenHeight,
              top: 0,
              left: 0,
            };
          } else {
            // 4 small images on right in 2x2 grid
            const smallIndex = index - 1; // 0, 1, 2, 3
            const col = smallIndex % 2; // 0 or 1
            const row = Math.floor(smallIndex / 2); // 0 or 1
            const rightHalfWidth = screenWidth / 2;
            const smallImageWidth = rightHalfWidth / 2; // Each small image is quarter of screen width
            const smallImageHeight = screenHeight / 2;

            return {
              width: smallImageWidth,
              height: smallImageHeight,
              top: row * smallImageHeight,
              left: screenWidth / 2 + col * smallImageWidth,
            };
          }

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
  const scrollViewRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [dbListings, setDbListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [listingsError, setListingsError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // Force refresh when this changes
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Start sidebar fully scrolled down (all filters hidden) for intro animation
  const SIDEBAR_INTRO_MAX_DOWN = 420;
  const sidebarDragY = useRef(new Animated.Value(SIDEBAR_INTRO_MAX_DOWN)).current;
  const sidebarDragOffset = useRef(SIDEBAR_INTRO_MAX_DOWN); // keep in sync for pan responder
  const [selectedSidebarFilter, setSelectedSidebarFilter] = useState(null); // id from SIDEBAR_FILTERS or null = all
  const [selectedTopBarFilter, setSelectedTopBarFilter] = useState(null); // 'pics' | 'video' | 'liked' | null; list does nothing
  const [likedListingIds, setLikedListingIds] = useState(new Set()); // persisted to AsyncStorage
  const lastViewedListingIdRef = useRef(null); // avoid recording same view twice
  const [dimensions, setDimensions] = useState({
    height: Dimensions.get('window').height,
    width: Dimensions.get('window').width,
  });

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

  // Load liked listing IDs from AsyncStorage on mount
  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem('tikTokFeedLikedIds');
        const ids = raw ? JSON.parse(raw) : [];
        setLikedListingIds(new Set(Array.isArray(ids) ? ids : []));
      } catch (e) {
        console.warn('Failed to load liked ids', e);
      }
    };
    load();
  }, []);

  // Initialize scroll position on mount
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: 0,
        animated: false,
      });
    }
  }, []);

  // Auto-scroll sidebar intro once when TikTok feed opens: (1) start fully down, (2) scroll up to show all, (3) scroll down to hide bottom 2
  const sidebarIntroDone = useRef(false);
  const SIDEBAR_DRAG_HIDE_BOTTOM_2 = 150; // part 3: scroll further down (~4 items hidden)
  const useNativeDriver = Platform.OS !== 'web'; // web does not support native driver
  useEffect(() => {
    if (selectedTopBarFilter === 'list' || sidebarIntroDone.current) return;
    sidebarIntroDone.current = true;
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
  }, [selectedTopBarFilter, sidebarDragY, useNativeDriver]);

  // Fetch listings from database (all users can see all published listings)
  // Filter by selectedCategory and selectedSidebarFilter if provided
  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoadingListings(true);
        const categoryToFetch = selectedCategory
          ? parseInt(selectedCategory)
          : undefined;
        const sidebarFilter = SIDEBAR_FILTERS.find(f => f.id === selectedSidebarFilter);
        const subscriptionType = sidebarFilter?.subscription_type;
        const hasVideo =
          sidebarFilter?.has_video === true || selectedTopBarFilter === 'video';

        const result = await getListings({
          status: 'published',
          category: categoryToFetch,
          ...(subscriptionType != null && {subscription_type: subscriptionType}),
          ...(hasVideo && {has_video: true}),
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

              return {
                id: listing.id,
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
                description: listing.description || '',
                propertyType:
                  listing.property_type === 'office'
                    ? 'משרד'
                    : listing.property_type === 'post'
                      ? 'post'
                      : 'קומה שלמה',
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
                profileImageUrl: listing.profile_image_url || listing.creator_profile_image_url || null,
                creator_name: listing.creator_name || null,
                creator_email: listing.creator_email || null,
                overlayX: listing.overlay_x != null ? Number(listing.overlay_x) : 80,
                overlayY: listing.overlay_y != null ? Number(listing.overlay_y) : 80,
                view_count: listing.view_count != null ? Number(listing.view_count) : 0,
                like_count: listing.like_count != null ? Number(listing.like_count) : 0,
                liked: listing.liked === true,
              };
            });

          // Apply top bar filter: pics = only images, video = already from API; liked is applied at display time
          let afterTopBar = transformedListings;
          if (selectedTopBarFilter === 'pics') {
            afterTopBar = transformedListings.filter(l => l.type === 'images');
          }
          // Backend already filters by category, but double-check client-side
          const filteredListings = selectedCategory
            ? afterTopBar.filter(listing => {
                const matches = listing.category === parseInt(selectedCategory);
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
          // Sync server liked state into local set (so heart and "liked" filter stay correct)
          setLikedListingIds(prev => {
            const next = new Set(prev);
            filteredListings.forEach(l => { if (l.liked) next.add(l.id); });
            return next;
          });
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

  // Toggle like: update server when logged in, always update local state and AsyncStorage
  const toggleLiked = async (listingId) => {
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
    if (feedFilters.city != null && feedFilters.city.city) {
      const cityStr = String(feedFilters.city.city || '').trim().toLowerCase();
      if (cityStr) {
        out = out.filter(l => (l.address || l.location || '').toLowerCase().includes(cityStr));
      }
    }
    if (feedFilters.apartmentType != null && feedFilters.apartmentType !== '') {
      const apt = feedFilters.apartmentType;
      const matchId = apt === 'apartment' ? 'regular' : apt; // UI 'apartment' = API 'regular'
      out = out.filter(l => (l.apartmentTypeId || '') === matchId || (l.apartmentTypeId || '') === apt);
    }
    if (feedFilters.meter != null) {
      const minMeter = Number(feedFilters.meter);
      out = out.filter(l => l.area != null && Number(l.area) >= minMeter);
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
    ? dbListings.filter(l => likedListingIds.has(l.id))
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

  const BOTTOM_SHEET_DRAG_CLOSE_THRESHOLD = 40;
  const bottomSheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const {dy} = gestureState;
          return dy > 10;
        },
        onPanResponderRelease: (_, gestureState) => {
          const {dy} = gestureState;
          if (dy > BOTTOM_SHEET_DRAG_CLOSE_THRESHOLD) {
            setShowBottomSheet(false);
          }
        },
      }),
    [],
  );

  // Sidebar drag: hold and swipe up/down; bottom icons disappear off screen when dragged down
  // Slightly more than the 6 filter items height so it can scroll a little more down when only profile is visible
  const SIDEBAR_DRAG_MAX_DOWN = 420;
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
  const categoryId = Number(selectedCategory);
  const isLandCategory = categoryId === 7; // קרקעות
  const isBnbCategory = categoryId === 5; // BnB
  const isPartnersCategory = categoryId === 3; // שותפים
  const bottomBarSource = isLandCategory
    ? require('../assets/lands/Frame 2 (2).png')
    : isPartnersCategory
      ? require('../assets/par/Frame 2 (3).png')
      : require('../assets/bottom-bar-new.png');

  return (
    <View style={styles.container}>
      {/* Top bar - back, center filters, search */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBarSideBtn} hitSlop={12} onPress={onClose}>
          <MaterialCommunityIcons name="chevron-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          {TOP_BAR_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.topBarFilterBtn, selectedTopBarFilter === f.id && styles.topBarFilterBtnSelected]}
              hitSlop={8}
              onPress={() => setSelectedTopBarFilter(prev => (prev === f.id ? null : f.id))}>
              <Image source={f.icon} style={styles.topBarFilterIcon} resizeMode="contain" />
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.topBarSideBtn} hitSlop={12}>
          <MaterialCommunityIcons name="magnify" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* List view: scrollable cards when list icon is selected */}
      {selectedTopBarFilter === 'list' && (
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
                  <View style={styles.listCardProfile}>
                    {listing.profileImageUrl ? (
                      <Image
                        source={{uri: listing.profileImageUrl}}
                        style={styles.listCardProfileImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.listCardProfileImg, styles.listCardProfilePlaceholder]}>
                        <MaterialCommunityIcons name="account" size={20} color="#fff" />
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.listCardBody}>
                  <View style={styles.listCardPurposeRow}>
                    <Text style={styles.listCardPurposeText}>{listing.purpose || 'להשכרה'}</Text>
                    <TouchableOpacity
                      onPress={() => toggleLiked(listing.id)}
                      hitSlop={12}
                      style={styles.listCardHeart}>
                      <MaterialCommunityIcons
                        name={likedListingIds.has(listing.id) ? 'heart' : 'heart-outline'}
                        size={22}
                        color={likedListingIds.has(listing.id) ? '#ff4757' : '#fff'}
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
      {selectedTopBarFilter !== 'list' && (
      <>
      {/* Sidebar - draggable: hold and swipe up/down; bottom icons disappear off screen when dragged down */}
      <View
        style={[
          styles.sidebar,
          sidebarCollapsed && {top: 360},
        ]}
        {...sidebarPanResponder.panHandlers}>
        <View
          style={[
            styles.sidebarImageWrap,
            sidebarCollapsed && styles.sidebarImageWrapCollapsed,
          ]}>
          <Animated.View
            style={[
              styles.sidebarDragContent,
              { transform: [{ translateY: sidebarDragY }] },
            ]}>
            {/* Profile pic of current ad uploader – tap opens UserProfileScreen */}
            <TouchableOpacity
              style={styles.sidebarProfileWrap}
              onPress={() => onOpenUserProfile?.(videos[currentIndex] ?? null)}
              activeOpacity={0.8}>
              {videos[currentIndex]?.profileImageUrl ? (
                <Image
                  source={{uri: videos[currentIndex].profileImageUrl}}
                  style={styles.sidebarProfilePic}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.sidebarProfilePic, styles.sidebarProfilePlaceholder]}>
                  <MaterialCommunityIcons name="account" size={28} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            {SIDEBAR_FILTERS.map((filter) => {
              const isSelected = selectedSidebarFilter === filter.id;
              return (
                <TouchableOpacity
                  key={filter.id}
                  style={[styles.sidebarFilterBtn, isSelected && styles.sidebarFilterBtnSelected]}
                  onPress={() => setSelectedSidebarFilter(prev => prev === filter.id ? null : filter.id)}
                  activeOpacity={0.7}>
                  <Image
                    source={filter.icon}
                    style={styles.sidebarFilterIcon}
                    resizeMode="contain"
                  />
                  <Text style={[styles.sidebarFilterLabel, isSelected && styles.sidebarFilterLabelSelected]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        </View>
      </View>

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
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          style={[styles.scrollView, {height: screenHeight}]}
          contentContainerStyle={styles.scrollContent}
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
                video.propertyType === 'post' &&
                video.description &&
                String(video.description).trim().length > 0;

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
                        },
                      ]}
                      pointerEvents="none">
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
        </ScrollView>
      </View>

      {/* Action Icons and Text - Bottom Right (posts: heart only; listings: purpose + location) */}
      <View style={styles.actionIconsContainer}>
        <View style={styles.propertyInfo}>
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.actionIconButton}
              onPress={() => toggleLiked(videos[currentIndex]?.id)}>
              <Image
                source={require('../assets/tiktok-heart-icon.svg')}
                style={[
                  styles.actionIcon,
                  likedListingIds.has(videos[currentIndex]?.id) && styles.actionIconLiked,
                ]}
                tintColor={likedListingIds.has(videos[currentIndex]?.id) ? '#ff3b5c' : undefined}
                resizeMode="contain"
              />
            </TouchableOpacity>
            {videos[currentIndex]?.propertyType !== 'post' && (
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
          {videos[currentIndex]?.propertyType !== 'post' &&
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
                  source={require('../assets/tiktok-location-icon.svg')}
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
      </View>
      </>
      )}

      {/* Bottom Bar - 5 icons: on global category, apartment item shows "סוג" + menu icon */}
      {!showBottomSheet && (
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarRow}>
            {BOTTOM_BAR_ITEMS.map((item) => {
              // גלובל (4), BNB (5), and מסחר (8): show "סוג" + type icon and open Type filter; קרקעות (7): apartment slot shows "דונם"
              const isGlobal = selectedCategory == null || selectedCategory === '' || selectedCategory === 4 || selectedCategory === '4' || selectedCategory === 5 || selectedCategory === '5' || selectedCategory === 8 || selectedCategory === '8';
              const isLand = selectedCategory === 7 || selectedCategory === '7';
              const useGlobalStyle = item.id === 'apartment' && isGlobal && item.iconGlobal;
              const useLandDonamStyle = item.id === 'apartment' && isLand && item.iconLandDonam;
              // מסחר (8): rooms slot shows "מטר"; קרקעות (7): rooms slot shows "סוג"; שותפים (3): rooms slot shows "העדפות"
              const isCommerce = selectedCategory === 8 || selectedCategory === '8';
              const isPartners = selectedCategory === 3 || selectedCategory === '3';
              const useCommerceStyle = item.id === 'rooms' && isCommerce && item.iconCommerce;
              const useLandStyle = item.id === 'rooms' && isLand && item.iconLand;
              const usePartnersStyle = item.id === 'rooms' && isPartners && item.iconPartners;
              const iconSource = usePartnersStyle ? item.iconPartners : (useLandDonamStyle ? item.iconLandDonam : (useLandStyle ? item.iconLand : (useCommerceStyle ? item.iconCommerce : (useGlobalStyle ? item.iconGlobal : item.icon))));
              const label = usePartnersStyle ? (item.labelPartners || item.label) : (useLandDonamStyle ? (item.labelLandDonam || item.label) : (useLandStyle ? (item.labelLand || item.label) : (useCommerceStyle ? (item.labelCommerce || item.label) : (useGlobalStyle ? (item.labelGlobal || item.label) : item.label))));
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
                        (useGlobalStyle || useLandStyle || useLandDonamStyle || usePartnersStyle) && styles.bottomBarIconGlobal,
                      ]}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={[styles.bottomBarLabel, item.isPost && styles.bottomBarLabelPost]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Bottom Sheet */}
      {showBottomSheet && (
        <View style={styles.bottomSheet}>
          <View
            style={styles.bottomSheetHandleWrap}
            {...bottomSheetPanResponder.panHandlers}>
            <View style={styles.bottomSheetHandle} />
          </View>
          <TouchableOpacity
            style={styles.bottomSheetOption}
            onPress={() => {
              setShowBottomSheet(false);
              const isCompanyOrBroker =
                currentUser?.subscription_type === subscriptionTypes.company ||
                currentUser?.subscription_type === subscriptionTypes.broker;
              // Company/broker always go to ערוך/פרסם מודעה (Edit/Publish), never to יצירת מודעה (Create)
              if (isCompanyOrBroker) {
                if (onOpenEditPublishAdWithCategory) {
                  onOpenEditPublishAdWithCategory(selectedCategory);
                }
              } else if (onOpenOfficeListing) {
                onOpenOfficeListing(selectedCategory);
              }
            }}>
            <Text style={styles.bottomSheetArrow}>‹</Text>
            <View style={styles.bottomSheetOptionContent}>
              <View style={styles.bottomSheetTextContainer}>
                {selectedCategory === 3 ? (
                  <>
                    <Text style={styles.bottomSheetTitle}>שותפים</Text>
                    <Text style={styles.bottomSheetSubtitle}>
                      פרסם חיפוש שותף או דירת שותפים
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
                  selectedCategory === 3
                    ? require('../assets/image22221.png')
                    : require('../assets/post-office-icon.png')
                }
                style={styles.bottomSheetIcon}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>

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
                source={require('../assets/post-community-icon.png')}
                style={styles.bottomSheetIcon}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  topBarFilterBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarFilterIcon: {
    width: 20,
    height: 20,
  },
  topBarFilterBtnSelected: {
    opacity: 0.7,
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
  sidebarFilterBtnSelected: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
  },
  sidebarFilterIcon: {
    width: 22,
    height: 22,
    marginBottom: 4,
  },
  sidebarFilterLabel: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  sidebarFilterLabelSelected: {
    color: '#B8A9FF',
  },
  sidebarProfileWrap: {
    marginBottom: 12,
  },
  sidebarProfilePic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    top: -1,
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
    backgroundColor: '#1E1D27',
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
    paddingVertical: 12,
    marginBottom: 8,
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
    borderWidth: 1,
    borderColor: '#000',
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
