import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Image,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Colors } from '../constants/styles';

// Image Swiper Component for multiple photos
const ImageSwiper = ({ images, screenHeight, video }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: currentImageIndex * Dimensions.get('window').width,
        animated: true,
      });
    }
  }, [currentImageIndex]);

  const handleScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const viewWidth = Dimensions.get('window').width;
    const newIndex = Math.round(contentOffsetX / viewWidth);
    if (newIndex !== currentImageIndex) {
      setCurrentImageIndex(newIndex);
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
        }
      ]}
    >
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.imageSwiper}
      >
        {images.map((image, index) => (
          <View key={index} style={styles.swiperImageContainer}>
            <Image
              source={{ uri: image.uri }}
              style={styles.swiperImage}
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
                index === currentImageIndex && styles.indicatorDotActive
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
const TikTokFeedScreen = ({ onClose, onOpenOfficeListing, uploadedListings = [] }) => {
  const scrollViewRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
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

    const subscription = Dimensions.addEventListener('change', updateDimensions);
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

  // Map tik image numbers to require statements
  const getTikImage = (num) => {
    const imageMap = {
      1: require('../assets/tik1.png'),
      2: require('../assets/tik2.png'),
      3: require('../assets/tik3.png'),
      4: require('../assets/tik4.png'),
      5: require('../assets/tik5.png'),
      6: require('../assets/tik6.png'),
      7: require('../assets/tik7.png'),
      8: require('../assets/tik8.png'),
      9: require('../assets/tik9.png'),
      10: require('../assets/tik10.png'),
      11: require('../assets/tik11.png'),
    };
    return imageMap[num] || imageMap[1];
  };

  // Combine uploaded listings with mock data
  const uploadedVideos = uploadedListings.map((listing, index) => ({
    id: `uploaded-${index}`,
    type: listing.video ? 'video' : 'images',
    video: listing.video,
    images: listing.mainImage ? [listing.mainImage, ...listing.additionalImages.filter(img => img)] : listing.additionalImages.filter(img => img),
    location: listing.address || 'תל אביב',
    price: `₪${listing.price?.toLocaleString() || '0'}`,
    purpose: listing.purpose === 'rent' ? 'להשכרה' : 'למכירה',
    description: listing.description || '',
    propertyType: listing.propertyType === 'office' ? 'משרד' : 'קומה שלמה',
    area: listing.area,
    rooms: listing.rooms,
    floor: listing.floor,
    isUploaded: true,
  }));

  // Mock video data with all tik images
  const mockVideos = [
    {
      id: 1,
      image: 1,
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
      title: 'בית פרטי עם גינה',
      description: 'בית משפחתי עם חצר גדולה',
      location: 'רמת גן, ז\'בוטינסקי',
      price: '₪8,500',
      likes: 3456,
      views: 12345,
    },
    {
      id: 5,
      image: 5,
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
      title: 'נטהאוז עם גג',
      description: 'נוף 360 מעלות',
      location: 'תל אביב, רחוב בן יהודה',
      price: '₪18,000',
      likes: 5678,
      views: 23456,
    },
  ];

  // Combine uploaded and mock videos
  const videos = [...uploadedVideos, ...mockVideos];

  const scrollToIndex = (index) => {
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

  return (
    <View style={styles.container}>
      {/* Sidebar icons */}
      <View style={styles.sidebar}>
        <Image
          source={require('../assets/tiktok-sidebar-profile.png')}
          style={styles.sidebarProfile}
          resizeMode="contain"
        />
        <Image
          source={require('../assets/tiktok-sidebar1.png')}
          style={styles.sidebarIcon}
          resizeMode="contain"
        />
        <Image
          source={require('../assets/tiktok-sidebar2.png')}
          style={styles.sidebarIcon}
          resizeMode="contain"
        />
        <Image
          source={require('../assets/tiktok-sidebar3.png')}
          style={styles.sidebarIcon}
          resizeMode="contain"
        />
        <Image
          source={require('../assets/tiktok-sidebar4.png')}
          style={styles.sidebarIcon}
          resizeMode="contain"
        />
        <Image
          source={require('../assets/tiktok-sidebar5.png')}
          style={styles.sidebarIcon}
          resizeMode="contain"
        />
        <Image
          source={require('../assets/tiktok-sidebar6.png')}
          style={styles.sidebarIcon}
          resizeMode="contain"
        />
      </View>

      {/* Navigation buttons */}
      <View style={styles.navigationButtons}>
        <TouchableOpacity 
          style={[
            styles.navButton, 
            styles.navButtonUp,
            currentIndex === 0 && styles.navButtonDisabled
          ]} 
          onPress={handlePrevious}
          disabled={currentIndex === 0}
        >
          <Text style={styles.navButtonText}>▲</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.navButton, 
            styles.navButtonDown,
            currentIndex === videos.length - 1 && styles.navButtonDisabled
          ]} 
          onPress={handleNext}
          disabled={currentIndex === videos.length - 1}
        >
          <Text style={styles.navButtonText}>▼</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        style={[styles.scrollView, { height: screenHeight }]}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={false}
        bounces={false}
      >
        {videos.map((video, index) => {
          // Handle uploaded content
          if (video.isUploaded) {
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
                    }
                  ]}
                >
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
                    <Text style={styles.videoPlaceholder}>Video: {video.video.name}</Text>
                  )}
                </View>
              );
            } else if (video.images && video.images.length > 0) {
              // Display images with swipe functionality
              return (
                <ImageSwiper
                  key={video.id}
                  images={video.images}
                  screenHeight={screenHeight}
                  video={video}
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
                }
              ]}
            >
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
            <View style={styles.forRentButton}>
              <Text style={styles.forRentText}>להשכרה</Text>
            </View>
          </View>
          <Text style={styles.priceText}>{videos[currentIndex]?.price || '₪5,000'}</Text>
          <View style={styles.locationContainer}>
            <Text style={styles.locationText}>{videos[currentIndex]?.location || 'תל אביב, רוטשילד 54'}</Text>
            <Image
              source={require('../assets/tiktok-location-icon.svg')}
              style={styles.locationIcon}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>

      {/* Bottom Bar */}
      {!showBottomSheet && (
        <View style={styles.bottomBar}>
        <View style={styles.iconsContainer}>
          <Image
            source={require('../assets/tiktok-icon1.png')}
            style={styles.icon}
            resizeMode="contain"
          />
          <Image
            source={require('../assets/tiktok-icon2.png')}
            style={styles.icon}
            resizeMode="contain"
          />
          <TouchableOpacity onPress={() => setShowBottomSheet(!showBottomSheet)}>
            <Image
              source={require('../assets/tiktok-icon3.png')}
              style={styles.icon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Image
            source={require('../assets/tiktok-icon4.png')}
            style={styles.icon}
            resizeMode="contain"
          />
          <Image
            source={require('../assets/tiktok-icon5.png')}
            style={styles.icon}
            resizeMode="contain"
          />
        </View>
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
                onOpenOfficeListing();
              }
            }}
          >
            <Text style={styles.bottomSheetArrow}>‹</Text>
            <View style={styles.bottomSheetOptionContent}>
              <View style={styles.bottomSheetTextContainer}>
                <Text style={styles.bottomSheetTitle}>משרד</Text>
                <Text style={styles.bottomSheetSubtitle}>פרסם משרד למכירה או השכרה</Text>
              </View>
              <Image
                source={require('../assets/post-office-icon.png')}
                style={styles.bottomSheetIcon}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>
          
          <View style={styles.bottomSheetDivider} />
          
          <TouchableOpacity style={styles.bottomSheetOption}>
            <Text style={styles.bottomSheetArrow}>‹</Text>
            <View style={styles.bottomSheetOptionContent}>
              <View style={styles.bottomSheetTextContainer}>
                <Text style={styles.bottomSheetTitle}>פוסט</Text>
                <Text style={styles.bottomSheetSubtitle}>שתף מידע או עדכון עם הקהילה</Text>
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
    textShadowOffset: { width: 0, height: 1 },
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
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  videoDescription: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
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
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  price: {
    color: Colors.yellowIcons,
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  views: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  navigationButtons: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -60 }],
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
  bottomBarImage: {
    width: '100%',
    height: '100%',
  },
  sidebar: {
    position: 'absolute',
    left: 10,
    top: 220,
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 100,
  },
  sidebarProfile: {
    width: 60,
    height: 60,
    marginBottom: 20,
  },
  sidebarIcon: {
    width: 40,
    height: 40,
    marginBottom: 20,
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
    textShadowOffset: { width: 0, height: 1 },
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
    textShadowOffset: { width: 0, height: 1 },
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
  swiperImage: {
    width: '100%',
    height: '100%',
    maxWidth: Dimensions.get('window').width,
    maxHeight: Dimensions.get('window').height,
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
});

export default TikTokFeedScreen;
