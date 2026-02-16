import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  Platform,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  PanResponder,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {Colors} from '../constants/styles';
import {uploadFile, createListing, toSubscriptionId} from '../utils/api';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const TEXT_CANVAS_HEIGHT = SCREEN_HEIGHT * 0.82;

const TAB_TEXT = 'טקסט';
const TAB_CAMERA = 'מצלמה';
const PLACEHOLDER = 'כתוב משהו...!';
const STYLES = ['סטייל 1', 'סטייל 2', 'סטייל 3', 'סטייל 4', 'סטייל 5'];
const DURATIONS = ['90s', '60s', '30s'];

const FILTER_OPTIONS = [
  {id: 'none', label: 'ללא'},
  {id: 'grayscale', label: 'שחור-לבן'},
  {id: 'sepia', label: 'ספיה'},
  {id: 'vintage', label: 'וינטג'},
  {id: 'cool', label: 'קר'},
  {id: 'warm', label: 'חם'},
];

const FILTER_STYLES_WEB = {
  none: null,
  grayscale: 'grayscale(1)',
  sepia: 'sepia(0.8)',
  vintage: 'sepia(0.5) contrast(1.1) saturate(0.8)',
  cool: 'hue-rotate(180deg) saturate(0.8)',
  warm: 'sepia(0.3) saturate(1.2)',
};

const TEXT_MODE_BACKGROUNDS = [
  ['#2a1a4a', '#1a0d2e', '#0d0620'],
  ['#1a3a2a', '#0d2e1a', '#062012'],
  ['#3a2a1a', '#2e1a0d', '#201206'],
  ['#2a1a3a', '#1a0d2e', '#120620'],
  ['#1a2a3a', '#0d1a2e', '#061220'],
];

/**
 * Social media style post editor: Text mode + Camera/Media mode.
 * Matches reference: tabs טקסט | מצלמה, text composer with styles, media capture with durations and publish.
 */
const PostEditorScreen = ({
  onClose,
  onPublish,
  selectedCategory = null,
  currentUser = null,
}) => {
  const [activeTab, setActiveTab] = useState(TAB_TEXT);
  const [textContent, setTextContent] = useState('');
  const [selectedStyleIndex, setSelectedStyleIndex] = useState(0);
  const [mediaUri, setMediaUri] = useState(null);
  const [mediaType, setMediaType] = useState(null); // 'image' | 'video'
  const [videoDuration, setVideoDuration] = useState(60);
  const [publishing, setPublishing] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [overlayText, setOverlayText] = useState('');
  const [overlayX, setOverlayX] = useState(80);
  const [overlayY, setOverlayY] = useState(80);
  const overlayPosRef = useRef({x: 80, y: 80});
  const dragStartRef = useRef({x: 80, y: 80});
  const lastTapTimeRef = useRef(0);
  const overlayMovedRef = useRef(false);
  const [isEditingOverlay, setIsEditingOverlay] = useState(false);
  const [textModeOverlayText, setTextModeOverlayText] = useState('');
  const [textModeOverlayX, setTextModeOverlayX] = useState(80);
  const [textModeOverlayY, setTextModeOverlayY] = useState(80);
  const [isEditingTextModeOverlay, setIsEditingTextModeOverlay] = useState(false);
  const textModePosRef = useRef({x: 80, y: 80});
  const textModeDragStartRef = useRef({x: 80, y: 80});
  const textModeLastTapRef = useRef(0);
  const textModeMovedRef = useRef(false);

  useEffect(() => {
    overlayPosRef.current = {x: overlayX, y: overlayY};
  }, [overlayX, overlayY]);

  const overlayPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartRef.current = {
          x: overlayPosRef.current.x,
          y: overlayPosRef.current.y,
        };
        overlayMovedRef.current = false;
      },
      onPanResponderMove: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5) {
          overlayMovedRef.current = true;
        }
        const x = dragStartRef.current.x + gestureState.dx;
        const y = dragStartRef.current.y + gestureState.dy;
        overlayPosRef.current = {x, y};
        setOverlayX(x);
        setOverlayY(y);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!overlayMovedRef.current && Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10) {
          const now = Date.now();
          if (now - lastTapTimeRef.current < 450) {
            setIsEditingOverlay(true);
            lastTapTimeRef.current = 0;
            return;
          }
          lastTapTimeRef.current = now;
        }
      },
    }),
  ).current;

  useEffect(() => {
    textModePosRef.current = {x: textModeOverlayX, y: textModeOverlayY};
  }, [textModeOverlayX, textModeOverlayY]);

  const textModePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        textModeDragStartRef.current = {
          x: textModePosRef.current.x,
          y: textModePosRef.current.y,
        };
        textModeMovedRef.current = false;
      },
      onPanResponderMove: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5) {
          textModeMovedRef.current = true;
        }
        const x = textModeDragStartRef.current.x + gestureState.dx;
        const y = textModeDragStartRef.current.y + gestureState.dy;
        textModePosRef.current = {x, y};
        setTextModeOverlayX(x);
        setTextModeOverlayY(y);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!textModeMovedRef.current && Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10) {
          const now = Date.now();
          if (now - textModeLastTapRef.current < 450) {
            setIsEditingTextModeOverlay(true);
            textModeLastTapRef.current = 0;
            return;
          }
          textModeLastTapRef.current = now;
        }
      },
    }),
  ).current;

  const pickImageOrVideo = async (allowVideo = true) => {
    try {
      const types = allowVideo
        ? ImagePicker.MediaTypeOptions.All
        : ImagePicker.MediaTypeOptions.Images;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: types,
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: videoDuration,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setMediaUri(asset.uri);
        setMediaType(asset.type === 'video' ? 'video' : 'image');
        setIsVideoMode(false);
      }
    } catch (e) {
      if (Platform.OS !== 'web') {
        const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          alert('נדרשת הרשאה לגישה לספריית המדיה');
          return;
        }
      }
    }
  };

  const canPublish =
    mediaUri ||
    (activeTab === TAB_TEXT ? textModeOverlayText : textContent.trim());

  const handlePublish = async () => {
    if (!currentUser && canPublish) {
      alert('יש להתחבר כדי לפרסם');
      return;
    }
    setPublishing(true);
    try {
      let mainImageUrl = null;
      let videoUrl = null;

      if (mediaUri && mediaType === 'image') {
        const formData = new FormData();
        if (Platform.OS === 'web') {
          const res = await fetch(mediaUri);
          const blob = await res.blob();
          const file = new File([blob], 'post-image.jpg', {type: 'image/jpeg'});
          formData.append('file', file);
        } else {
          formData.append('file', {
            uri: mediaUri,
            name: 'post-image.jpg',
            type: 'image/jpeg',
          });
        }
        formData.append('folder', 'listings/images');
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/upload`, {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (data.success && data.url) mainImageUrl = data.url;
      } else if (mediaUri && mediaType === 'video') {
        const formData = new FormData();
        if (Platform.OS === 'web') {
          const res = await fetch(mediaUri);
          const blob = await res.blob();
          const file = new File([blob], 'post-video.mp4', {type: 'video/mp4'});
          formData.append('file', file);
        } else {
          formData.append('file', {
            uri: mediaUri,
            name: 'post-video.mp4',
            type: 'video/mp4',
          });
        }
        formData.append('folder', 'listings/videos');
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/upload`, {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (data.success && data.url) videoUrl = data.url;
      }

      const description =
        (activeTab === TAB_TEXT ? textModeOverlayText : textContent.trim()) ||
        (mediaUri ? 'פוסט עם מדיה' : '');
      const listingData = {
        status: 'published',
        subscriptionType: currentUser?.subscription_type || null,
        subscriptionId: toSubscriptionId(currentUser?.id) || null,
        category: selectedCategory != null ? parseInt(selectedCategory, 10) : 1,
        description,
        mainImageUrl: mainImageUrl || null,
        additionalImageUrls: [],
        videoUrl: videoUrl || null,
        listing_type: 'post',
        propertyType: 'post',
        area: null,
        rooms: null,
        floor: null,
        purpose: 'post',
        price: null,
        address: null,
        phone: null,
      };

      await createListing(listingData);
      if (onPublish) onPublish();
      if (onClose) onClose();
    } catch (err) {
      alert(err.message || 'שגיאה בפרסום');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.backBtn}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.tabs}>
          <TouchableOpacity
            onPress={() => setActiveTab(TAB_TEXT)}
            style={[styles.tab, activeTab === TAB_TEXT && styles.tabActive]}>
            <Text
              style={[
                styles.tabText,
                activeTab === TAB_TEXT && styles.tabTextActive,
              ]}>
              {TAB_TEXT}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab(TAB_CAMERA)}
            style={[styles.tab, activeTab === TAB_CAMERA && styles.tabActive]}>
            <Text
              style={[
                styles.tabText,
                activeTab === TAB_CAMERA && styles.tabTextActive,
              ]}>
              {TAB_CAMERA}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={handlePublish}
          disabled={publishing || !canPublish}
          style={[styles.publishBtn, !canPublish && styles.publishBtnDisabled]}>
          <Image
            source={require('../assets/camera/postbutton.png')}
            style={styles.publishBtnImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {activeTab === TAB_TEXT ? (
        <KeyboardAvoidingView
          style={styles.flex1}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
          <View style={styles.textModeContainer}>
            <View style={[styles.textModeCanvasWrap, {height: TEXT_CANVAS_HEIGHT}]}>
              <LinearGradient
                colors={TEXT_MODE_BACKGROUNDS[selectedStyleIndex] || TEXT_MODE_BACKGROUNDS[0]}
                style={styles.textModeCanvas}>
                {textModeOverlayText ? (
                  <View
                    style={[
                      styles.overlayTextDraggable,
                      {
                        left: textModeOverlayX,
                        top: textModeOverlayY,
                      },
                    ]}
                    {...(!isEditingTextModeOverlay
                      ? textModePanResponder.panHandlers
                      : {})}>
                    {isEditingTextModeOverlay ? (
                      <TextInput
                        style={styles.overlayTextInputInline}
                        value={textModeOverlayText}
                        onChangeText={setTextModeOverlayText}
                        onBlur={() => setIsEditingTextModeOverlay(false)}
                        placeholder="טקסט"
                        placeholderTextColor="rgba(255,255,255,0.6)"
                        autoFocus
                        selectTextOnFocus
                        maxLength={100}
                      />
                    ) : (
                      <Text style={styles.overlayText}>{textModeOverlayText}</Text>
                    )}
                  </View>
                ) : null}
              </LinearGradient>
            </View>
            <View style={styles.textModeOverlayRows} pointerEvents="box-none">
              <View style={styles.styleRow} pointerEvents="box-none">
                {STYLES.map((label, i) => (
                  <TouchableOpacity
                    key={label}
                    onPress={() => setSelectedStyleIndex(i)}
                    style={[
                      styles.styleBtn,
                      selectedStyleIndex === i && styles.styleBtnActive,
                    ]}>
                    <Text
                      style={[
                        styles.styleBtnText,
                        selectedStyleIndex === i && styles.styleBtnTextActive,
                      ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.formatRow}>
                <TouchableOpacity
                  style={[styles.formatBtn, styles.formatBtnAa]}
                  onPress={() => {
                    if (textModeOverlayText) {
                      setTextModeOverlayText('');
                    } else {
                      setTextModeOverlayText('text');
                      setTextModeOverlayX(80);
                      setTextModeOverlayY(80);
                      textModePosRef.current = {x: 80, y: 80};
                    }
                  }}>
                  <Image
                    source={require('../assets/editors/textAa.png')}
                    style={styles.formatBtnIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.formatBtnCircle}
                  onPress={() => {}}
                  activeOpacity={0.7}>
                  <Image
                    source={require('../assets/editors/Action icons.png')}
                    style={styles.formatBtnIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.formatBtnLines}
                  onPress={() => {}}
                  activeOpacity={0.7}>
                  <Image
                    source={require('../assets/editors/align.png')}
                    style={styles.formatBtnIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.formatBtnA}
                  onPress={() => {}}
                  activeOpacity={0.7}>
                  <Image
                    source={require('../assets/editors/text.png')}
                    style={styles.formatBtnIconSmall}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.cameraContainer}>
          {mediaUri ? (
            <View style={styles.mediaPreview}>
              {mediaType === 'image' ? (
                <Image
                  source={{uri: mediaUri}}
                  style={[
                    styles.mediaImage,
                    Platform.OS === 'web' &&
                      FILTER_STYLES_WEB[selectedFilter] && {
                        filter: FILTER_STYLES_WEB[selectedFilter],
                      },
                  ]}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.videoPlaceholder}>
                  <Text style={styles.videoPlaceholderText}>וידאו נבחר</Text>
                </View>
              )}
              {overlayText ? (
                <View
                  style={[
                    styles.overlayTextDraggable,
                    {left: overlayX, top: overlayY},
                  ]}
                  {...(!isEditingOverlay ? overlayPanResponder.panHandlers : {})}>
                  {isEditingOverlay ? (
                    <TextInput
                      style={styles.overlayTextInputInline}
                      value={overlayText}
                      onChangeText={setOverlayText}
                      onBlur={() => setIsEditingOverlay(false)}
                      placeholder="טקסט"
                      placeholderTextColor="rgba(255,255,255,0.6)"
                      autoFocus
                      selectTextOnFocus
                      maxLength={100}
                    />
                  ) : (
                    <Text style={styles.overlayText}>{overlayText}</Text>
                  )}
                </View>
              ) : null}
              <TouchableOpacity
                onPress={() => setMediaUri(null)}
                style={styles.changeMediaBtn}>
                <Text style={styles.changeMediaBtnText}>החלף מדיה</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => pickImageOrVideo(true)}
              style={styles.cameraPlaceholder}>
              <Text style={styles.cameraPlaceholderText}>
                לחץ לבחירת תמונה או וידאו
              </Text>
              <Text style={styles.cameraPlaceholderSub}>או צלם עכשיו</Text>
            </TouchableOpacity>
          )}
          {!mediaUri && (
            <View style={styles.cameraControls}>
              <View style={styles.durationRow}>
                {DURATIONS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() =>
                      setVideoDuration(parseInt(d.replace('s', ''), 10))
                    }
                    style={[
                      styles.durationBtn,
                      videoDuration === parseInt(d.replace('s', ''), 10) &&
                        styles.durationBtnActive,
                    ]}>
                    <Text style={styles.durationBtnText}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.captureRow}>
                <TouchableOpacity style={styles.captureLabel}>
                  <Image
                    source={require('../assets/camera/changephoto.png')}
                    style={styles.captureLabelImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => pickImageOrVideo(true)}
                  style={styles.shutterBtn}>
                  <Image
                    source={
                      isRecording
                        ? require('../assets/camera/videoruning.png')
                        : isVideoMode
                          ? require('../assets/camera/camera.png')
                          : require('../assets/camera/cameraphoto.png')
                    }
                    style={styles.shutterBtnImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.flipBtn}
                  onPress={() => setIsVideoMode(prev => !prev)}
                  activeOpacity={0.6}>
                  <Image
                    source={require('../assets/camera/switchpic.png')}
                    style={styles.flipBtnImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
          <View style={styles.cameraSideIcons}>
            {!mediaUri && (
              <TouchableOpacity
                style={[styles.sideIcon, flashOn && styles.sideIconActive]}
                onPress={() => setFlashOn(prev => !prev)}
                activeOpacity={0.7}>
                <Image
                  source={require('../assets/camera/flash.png')}
                  style={styles.sideIconImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.sideIcon,
                selectedFilter !== 'none' && styles.sideIconActive,
              ]}
              onPress={() => setShowFilterModal(true)}
              activeOpacity={0.7}>
              <Image
                source={require('../assets/camera/lines.png')}
                style={styles.sideIconImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
            {mediaUri && (
              <TouchableOpacity
                style={[styles.sideIcon, overlayText ? styles.sideIconActive : null]}
                onPress={() => {
                  if (overlayText) {
                    setOverlayText('');
                  } else {
                    setOverlayText('text');
                    setOverlayX(80);
                    setOverlayY(80);
                    overlayPosRef.current = {x: 80, y: 80};
                  }
                }}
                activeOpacity={0.7}>
                <Image
                  source={require('../assets/camera/text.png')}
                  style={styles.sideIconImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}
          </View>

          <Modal
            visible={showFilterModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowFilterModal(false)}>
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setShowFilterModal(false)}>
              <TouchableOpacity
                style={styles.modalContent}
                activeOpacity={1}
                onPress={() => {}}
                onStartShouldSetResponder={() => true}>
                <Text style={styles.modalTitle}>בחר פילטר</Text>
                {FILTER_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.filterOption,
                      selectedFilter === opt.id && styles.filterOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedFilter(opt.id);
                      setShowFilterModal(false);
                    }}>
                    <Text
                      style={[
                        styles.filterOptionText,
                        selectedFilter === opt.id && styles.filterOptionTextActive,
                      ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowFilterModal(false)}>
                  <Text style={styles.modalCloseBtnText}>סגור</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </Pressable>
          </Modal>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    maxWidth: 414,
    alignSelf: 'center',
    width: '100%',
  },
  flex1: {flex: 1},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 50 : 44,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backBtn: {padding: 4},
  backArrow: {color: '#fff', fontSize: 28, fontWeight: '300'},
  tabs: {flexDirection: 'row', alignItems: 'center', gap: 8},
  tab: {paddingVertical: 6, paddingHorizontal: 12},
  tabActive: {},
  tabText: {color: 'rgba(255,255,255,0.6)', fontSize: 16},
  tabTextActive: {color: '#fff', fontWeight: '600'},
  publishBtn: {
    backgroundColor: 'transparent',
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  publishBtnDisabled: {opacity: 0.5},
  publishBtnImage: {width: 64, height: 42},
  publishBtnText: {color: '#1e1d27', fontWeight: '700', fontSize: 16},
  scroll: {flex: 1},
  scrollContent: {padding: 16, paddingBottom: 40},
  textModeContainer: {
    flex: 1,
    position: 'relative',
  },
  textModeOverlayRows: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
    alignItems: 'center',
  },
  textEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  closeEditorBtn: {marginRight: 12},
  closeEditorX: {color: '#fff', fontSize: 20},
  editorIcons: {flexDirection: 'row', alignItems: 'center', gap: 12},
  editorIconBtn: {padding: 6},
  editorIconText: {color: '#fff', fontSize: 16},
  textModeCanvasWrap: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  textModeCanvas: {
    flex: 1,
    borderRadius: 16,
    position: 'relative',
  },
  gradientEditor: {
    minHeight: 180,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  textInput: {
    color: '#fff',
    fontSize: 18,
    minHeight: 140,
    padding: 0,
  },
  editorIconBtnActive: {
    backgroundColor: 'rgba(255,196,10,0.3)',
    borderRadius: 8,
  },
  formatBtnActive: {
    backgroundColor: 'rgba(255,196,10,0.35)',
  },
  styleRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    marginBottom: 16,
    justifyContent: 'center',
  },
  styleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  styleBtnActive: {backgroundColor: 'rgba(255,196,10,0.3)'},
  styleBtnText: {color: 'rgba(255,255,255,0.7)', fontSize: 13},
  styleBtnTextActive: {color: '#fff'},
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 48,
    backgroundColor: '#2B2A39',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  formatBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formatBtnAa: {
    backgroundColor: 'transparent',
  },
  formatBtnIcon: {width: 50, height: 50},
  formatBtnIconSmall: {width: 38, height: 38},
  formatBtnTextAa: {
    color: '#1e1d27',
    fontSize: 18,
    fontWeight: '700',
  },
  formatBtnCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {outlineStyle: 'none'}),
  },
  formatBtnGradientInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  formatBtnLines: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    ...(Platform.OS === 'web' && {outlineStyle: 'none'}),
  },
  formatBtnLine: {
    width: 20,
    height: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  formatBtnLineShort: {width: 14},
  formatBtnLineShortest: {width: 10},
  formatBtnA: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {outlineStyle: 'none'}),
  },
  formatBtnTextA: {color: '#fff', fontSize: 18, fontWeight: '700'},
  formatBtnText: {color: Colors.yellowIcons, fontSize: 18},
  cameraContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(30,29,39,0.9)',
    margin: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cameraPlaceholderText: {color: '#fff', fontSize: 18, marginBottom: 8},
  cameraPlaceholderSub: {color: 'rgba(255,255,255,0.6)', fontSize: 14},
  mediaPreview: {
    flex: 1,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaImage: {width: '100%', height: '100%', borderRadius: 16},
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
  },
  videoPlaceholderText: {color: '#fff', fontSize: 18},
  changeMediaBtn: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    zIndex: 10,
    elevation: 10,
  },
  changeMediaBtnText: {color: '#fff', fontSize: 14},
  overlayTextDraggable: {
    position: 'absolute',
    padding: 12,
    minWidth: 48,
    zIndex: 20,
    elevation: 20,
    ...(Platform.OS === 'web' && {cursor: 'grab'}),
  },
  overlayText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
    textAlign: 'center',
  },
  overlayTextInputInline: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    padding: 0,
    minWidth: 60,
    backgroundColor: 'transparent',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
    textAlign: 'center',
    ...(Platform.OS === 'web' && {outlineStyle: 'none'}),
  },
  cameraControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 32,
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    gap: 16,
  },
  durationRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  durationBtn: {
    width: 48,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBtnActive: {backgroundColor: Colors.yellowIcons},
  durationBtnText: {color: '#fff', fontSize: 12},
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 16,
  },
  captureLabel: {padding: 8},
  captureLabelText: {color: 'rgba(255,255,255,0.8)', fontSize: 14},
  captureLabelImage: {width: 36, height: 36},
  shutterBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  shutterBtnImage: {width: 80, height: 80},
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  shutterInnerVideoMode: {
    backgroundColor: 'rgba(229,57,53,0.95)',
  },
  flipBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  flipBtnImage: {width: 36, height: 36},
  flipBtnText: {color: '#fff', fontSize: 24},
  cameraSideIcons: {
    position: 'absolute',
    right: 12,
    top: 16,
    flexDirection: 'column',
    gap: 20,
  },
  sideIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideIconText: {color: '#fff', fontSize: 18},
  sideIconImage: {width: 30, height: 30},
  sideIconActive: {
    backgroundColor: Colors.yellowIcons,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1E1D27',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalCloseBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: {color: Colors.yellowIcons, fontSize: 16},
  filterOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 8,
  },
  filterOptionActive: {
    backgroundColor: 'rgba(255,196,10,0.25)',
  },
  filterOptionText: {color: 'rgba(255,255,255,0.9)', fontSize: 16},
  filterOptionTextActive: {color: Colors.yellowIcons, fontWeight: '600'},
  overlayTextInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalPrimaryBtn: {
    flex: 1,
    backgroundColor: Colors.yellowIcons,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {color: '#1e1d27', fontWeight: '700', fontSize: 16},
  modalSecondaryBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSecondaryBtnText: {color: '#fff', fontSize: 16},
});

export default PostEditorScreen;
