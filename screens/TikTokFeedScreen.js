import React, {useRef, useState, useEffect} from 'react';
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
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Colors} from '../constants/styles';
import {getListings} from '../utils/api';
import {categoryImages} from '../utils/constant';

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
  onOpenPostEditor,
  uploadedListings = [],
  selectedCategory = null,
}) => {
  const scrollViewRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [dbListings, setDbListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Force refresh when this changes
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

  // Initialize scroll position on mount
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: 0,
        animated: false,
      });
    }
  }, []);

  // Fetch listings from database (all users can see all published listings)
  // Filter by selectedCategory if provided
  // Refetch when selectedCategory changes or when refreshKey changes
  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoadingListings(true);
        const categoryToFetch = selectedCategory
          ? parseInt(selectedCategory)
          : undefined;

        const result = await getListings({
          status: 'published',
          category: categoryToFetch,
        });

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

              return {
                id: listing.id,
                type: video ? 'video' : 'images',
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
                price: `₪${parseFloat(listing.price || listing.budget || 0).toLocaleString()}`,
                purpose: listing.purpose === 'rent' ? 'להשכרה' : 'למכירה',
                description: listing.description || '',
                propertyType:
                  listing.property_type === 'office' ? 'משרד' : 'קומה שלמה',
                area: listing.area,
                rooms: listing.rooms,
                floor: listing.floor,
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
              };
            });

          // Backend already filters by category, but double-check client-side
          const filteredListings = selectedCategory
            ? transformedListings.filter(listing => {
                const matches = listing.category === parseInt(selectedCategory);
                if (!matches) {
                  console.log(
                    `Listing ${listing.id} category ${listing.category} doesn't match selected ${selectedCategory}`,
                  );
                }
                return matches;
              })
            : transformedListings;

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
      } finally {
        setLoadingListings(false);
      }
    };

    fetchListings();
  }, [selectedCategory, refreshKey]);

  // Map tik image numbers to require statements
  const getTikImage = num => {
    return categoryImages[num] || categoryImages[1];
  };

  // Use database listings as primary source (they persist after refresh)
  // When a category is selected, show ONLY database listings (no mock data)
  // Database listings are already filtered by category from the API
  const uploadedVideos = [
    ...dbListings, // Listings from database (all users) - PRIMARY SOURCE
  ];

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
            onPress={() => onOpenOfficeListing(selectedCategory)}
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
        </View>
      </>
    );
  }
  const categoryId = Number(selectedCategory);
  const isLandCategory = categoryId === 7; // קרקעות
  const isBnbCategory = categoryId === 5; // BnB
  const isPartnersCategory = categoryId === 3; // שותפים
  const sidebarSource = isLandCategory
    ? require('../assets/lands/Frame 1261158717 (2).png')
    : isBnbCategory
      ? require('../assets/Frame 1261158717 (3).png')
      : isPartnersCategory
        ? require('../assets/par/Frame 1261158717 (4).png')
        : require('../assets/sidebar-new.png');
  const bottomBarSource = isLandCategory
    ? require('../assets/lands/Frame 2 (2).png')
    : isPartnersCategory
      ? require('../assets/par/Frame 2 (3).png')
      : require('../assets/bottom-bar-new.png');

  return (
    <View style={styles.container}>
      {/* Sidebar - lands: assets/lands; BnB: Frame (3); partners: assets/par; rest: sidebar-new */}
      <View style={styles.sidebar}>
        <Image
          source={sidebarSource}
          style={styles.sidebarImage}
          resizeMode="contain"
        />
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

              // Display images with swipe or collage functionality
              return (
                <ImageSwiper
                  key={video.id}
                  images={video.images}
                  screenHeight={screenHeight}
                  video={video}
                  displayOption={displayMode}
                />
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

      {/* Action Icons and Text - Bottom Right */}
      <View style={styles.actionIconsContainer}>
        <View style={styles.propertyInfo}>
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.actionIconButton}>
              <Image
                source={require('../assets/tiktok-heart-icon.svg')}
                style={styles.actionIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
            {videos[currentIndex]?.category === 3 ? (
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
            )}
          </View>
          {videos[currentIndex]?.category === 3 ? (
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
          )}
        </View>
      </View>

      {/* Bottom Bar - lands (קרקעות) uses assets/lands, rest use bottom-bar-new */}
      {!showBottomSheet && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.bottomBarImageTouchable}
            onPress={() => setShowBottomSheet(true)}
            activeOpacity={1}>
            <Image
              source={bottomBarSource}
              style={styles.bottomBarImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Sheet */}
      {showBottomSheet && (
        <View style={styles.bottomSheet}>
          <View style={styles.bottomSheetHandle} />
          <TouchableOpacity
            style={styles.bottomSheetOption}
            onPress={() => {
              setShowBottomSheet(false);
              if (onOpenOfficeListing) {
                onOpenOfficeListing(selectedCategory); // Pass the selected category
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
    alignSelf: 'center',
    overflow: 'hidden',
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
    bottom: -8,
    left: 0,
    right: 0,
    width: '100%',
    height: 80,
    backgroundColor: '#1E1D27',
    zIndex: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBarImageTouchable: {
    width: '88%',
    height: 68,
    alignSelf: 'center',
  },
  bottomBarImage: {
    width: '100%',
    height: '100%',
  },
  sidebar: {
    position: 'absolute',
    left: 10,
    top: 200,
    bottom: 80,
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 100,
  },
  sidebarImage: {
    width: 58,
    flex: 1,
    minHeight: 200,
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
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
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
