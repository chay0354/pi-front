import React, {useContext, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {ProfileAvatar} from '../components';
import {VideoPreviewThumb} from '../components/FormsElement/VideoPreviewThumb';
import {ContextHook} from '../hooks/ContextHook';
import {subscriptionTypes, shouldShowProfileGoldRing} from '../utils/constant';
import {
  getUserProfilePhotoUrl,
  getUserCompanyLogoUrl,
} from '../utils/userProfileImage';
import {updateSubscriptionProfile, uploadProfilePicture, uploadFile} from '../utils/api';
import {hebrewTextAlign} from '../utils/rtlLayout';
import {ensureMediaLibraryPermission, AD_VIDEO_PICKER_OPTIONS} from '../utils/mediaLibraryPermission';
import CircleImageCropModal from '../components/CircleImageCropModal';

const BG = '#27262F';
const CARD_BG = '#2B2A39';
const INPUT_BG = '#1E1D27';
const DIVIDER = '#373548';
const GOLD_GRADIENT = ['#FEE787', '#BD9947', '#9C6522'];
const GOLD_GRADIENT_LOCATIONS = [0.0456, 0.5076, 0.8831];
const TEXT_SECONDARY = 'rgba(255,255,255,0.55)';
const PLACEHOLDER = 'rgba(255,255,255,0.35)';
/** Camera badge on yellow/gold rings (broker / company / professional) — unchanged. */
const CAMERA_BADGE_TEAL = '#5EEAD4';
/** Camera badge on blue/teal rings (regular user) — system orange. */
const CAMERA_BADGE_ORANGE = '#E8B34D';

/** Field definitions per account type. Each: {key, label, placeholder, keyboardType?, multiline?} */
function getFieldsForType(type) {
  const t = String(type || '').toLowerCase();
  const about = {
    key: 'description',
    label: 'אודות',
    placeholder: 'ספר/י קצת על עצמך',
    multiline: true,
  };
  if (
    t === subscriptionTypes.company ||
    t === subscriptionTypes.projectMarketer
  ) {
    const isMarketer = t === subscriptionTypes.projectMarketer;
    const orgNameLabel = isMarketer ? 'שם המשווק' : 'שם החברה';
    return [
      {key: 'business_name', label: orgNameLabel, placeholder: orgNameLabel},
      {
        key: 'contact_person_name',
        label: 'איש קשר',
        placeholder: 'שם איש הקשר',
      },
      {
        key: 'mobile_phone',
        label: 'טלפון נייד',
        placeholder: 'מספר טלפון נייד',
        keyboardType: 'phone-pad',
      },
      {
        key: 'office_phone',
        label: 'טלפון משרד',
        placeholder: 'מספר טלפון משרד',
        keyboardType: 'phone-pad',
      },
      {
        key: 'company_website',
        label: 'אתר אינטרנט',
        placeholder: 'https://',
        keyboardType: 'url',
      },
      {key: 'business_address', label: 'כתובת', placeholder: 'כתובת העסק'},
      about,
    ];
  }
  if (t === subscriptionTypes.broker) {
    return [
      {key: 'name', label: 'שם איש קשר', placeholder: 'שם מלא'},
      {key: 'broker_office_name', label: 'שם המשרד', placeholder: 'שם המשרד'},
      {
        key: 'brokerage_license_number',
        label: 'מספר רישיון תיווך',
        placeholder: 'מספר רישיון',
      },
      {
        key: 'mobile_phone',
        label: 'טלפון נייד',
        placeholder: 'מספר טלפון נייד',
        keyboardType: 'phone-pad',
      },
      {
        key: 'office_phone',
        label: 'טלפון משרד',
        placeholder: 'מספר טלפון משרד',
        keyboardType: 'phone-pad',
      },
      about,
    ];
  }
  if (t === subscriptionTypes.professional) {
    return [
      {key: 'name', label: 'שם מלא', placeholder: 'שם מלא'},
      {
        key: 'mobile_phone',
        label: 'טלפון נייד',
        placeholder: 'מספר טלפון נייד',
        keyboardType: 'phone-pad',
      },
      {key: 'business_address', label: 'כתובת', placeholder: 'כתובת'},
      about,
    ];
  }
  // Regular user (default)
  return [
    {key: 'name', label: 'שם מלא', placeholder: 'שם מלא'},
    {
      key: 'phone',
      label: 'טלפון',
      placeholder: 'מספר טלפון',
      keyboardType: 'phone-pad',
    },
    {key: 'business_address', label: 'כתובת', placeholder: 'רחוב, עיר'},
    about,
  ];
}

const EditProfileScreen = ({onClose, onSaved}) => {
  const insets = useSafeAreaInsets();
  const {currentUser, setCurrentUser} = useContext(ContextHook);

  const type = currentUser?.subscription_type || subscriptionTypes.user;
  const subTypeLower = String(type).toLowerCase();
  // Project marketers register with a logo like companies, so they share the layout.
  const isCompany =
    subTypeLower === subscriptionTypes.company ||
    subTypeLower === subscriptionTypes.projectMarketer;
  const hasGoldRing = shouldShowProfileGoldRing(subTypeLower);
  /** Yellow ring → keep teal camera; blue/teal ring → system orange. */
  const cameraBadgeColor = hasGoldRing ? CAMERA_BADGE_TEAL : CAMERA_BADGE_ORANGE;
  const canEditProfileVideo =
    subTypeLower === subscriptionTypes.broker ||
    subTypeLower === subscriptionTypes.professional;
  // Company brand image lives in company_logo_url; everyone else uses profile_picture_url.
  const photoFieldKey = isCompany ? 'company_logo_url' : 'profile_picture_url';

  const fields = useMemo(() => getFieldsForType(type), [type]);

  const [form, setForm] = useState(() => {
    const initial = {};
    fields.forEach(f => {
      initial[f.key] =
        currentUser?.[f.key] != null ? String(currentUser[f.key]) : '';
    });
    return initial;
  });
  const [photoUrl, setPhotoUrl] = useState(() =>
    isCompany
      ? getUserCompanyLogoUrl(currentUser) || getUserProfilePhotoUrl(currentUser)
      : getUserProfilePhotoUrl(currentUser) ||
        getUserCompanyLogoUrl(currentUser),
  );
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profileVideoUrl, setProfileVideoUrl] = useState(() =>
    currentUser?.video_url && String(currentUser.video_url).trim()
      ? String(currentUser.video_url).trim()
      : null,
  );
  const [pendingProfileVideo, setPendingProfileVideo] = useState(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cropUri, setCropUri] = useState(null);
  const [cropVisible, setCropVisible] = useState(false);

  const displayName =
    currentUser?.name ||
    currentUser?.contact_person_name ||
    currentUser?.business_name ||
    currentUser?.broker_office_name ||
    'משתמש';

  const setField = (key, value) =>
    setForm(prev => ({...prev, [key]: value}));

  const buildPickedVideoFile = asset => ({
    uri: asset.uri,
    type: asset.type || asset.mimeType || 'video/mp4',
    name: asset.fileName || asset.filename || `video-${Date.now()}.mp4`,
    file: asset,
  });

  const profileVideoPreviewUri =
    pendingProfileVideo?.uri || profileVideoUrl || null;

  const handlePickProfileVideo = async () => {
    if (uploadingVideo || saving || uploadingPhoto) return;
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/*';
      input.onchange = e => {
        const file = e.target.files?.[0];
        if (file) {
          setPendingProfileVideo({
            uri: URL.createObjectURL(file),
            type: file.type,
            name: file.name || `video-${Date.now()}.mp4`,
            file,
          });
        }
      };
      input.click();
      return;
    }
    try {
      const permitted = await ensureMediaLibraryPermission();
      if (!permitted) return;
      const result = await ImagePicker.launchImageLibraryAsync(
        AD_VIDEO_PICKER_OPTIONS,
      );
      if (!result.canceled && result.assets?.[0]) {
        setPendingProfileVideo(buildPickedVideoFile(result.assets[0]));
      }
    } catch (err) {
      Alert.alert('שגיאה', `לא ניתן לבחור סרטון: ${err.message}`);
    }
  };

  const handleRemoveProfileVideo = () => {
    if (uploadingVideo || saving) return;
    setPendingProfileVideo(null);
    setProfileVideoUrl(null);
  };

  const uploadPicked = async picked => {
    if (!picked) return;
    setUploadingPhoto(true);
    try {
      const uploaded = await uploadProfilePicture(picked);
      if (uploaded?.url) {
        setPhotoUrl(uploaded.url);
      } else {
        throw new Error('לא התקבלה כתובת תמונה');
      }
    } catch (err) {
      Alert.alert('שגיאה', err?.message || 'העלאת התמונה נכשלה, נסה/י שוב.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const openPhotoCropper = uri => {
    if (!uri) return;
    setCropUri(uri);
    setCropVisible(true);
  };

  const handlePhotoCropConfirm = async result => {
    setCropVisible(false);
    setCropUri(null);
    if (!result?.uri) return;
    await uploadPicked({
      uri: result.uri,
      type: 'image/jpeg',
      name: `profile-${Date.now()}.jpg`,
    });
  };

  const handlePhotoCropCancel = () => {
    setCropVisible(false);
    setCropUri(null);
  };

  const handlePickPhoto = async () => {
    if (uploadingPhoto || saving) return;
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = e => {
        const file = e.target.files?.[0];
        if (file) openPhotoCropper(URL.createObjectURL(file));
      };
      input.click();
      return;
    }
    try {
      const permitted = await ensureMediaLibraryPermission();
      if (!permitted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });
      if (!result.canceled && result.assets?.[0]) {
        openPhotoCropper(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('שגיאה', `לא ניתן לבחור תמונה: ${err.message}`);
    }
  };

  const handleSave = async () => {
    if (saving || uploadingPhoto || uploadingVideo) return;
    const subId = currentUser?.id || currentUser?.subscription_id;
    if (!subId) {
      Alert.alert('שגיאה', 'לא ניתן לזהות את המשתמש.');
      return;
    }
    const payload = {};
    fields.forEach(f => {
      payload[f.key] = form[f.key] != null ? String(form[f.key]).trim() : '';
    });
    payload[photoFieldKey] = photoUrl || '';

    let nextVideoUrl = profileVideoUrl;
    if (canEditProfileVideo && pendingProfileVideo) {
      setUploadingVideo(true);
      try {
        const uploaded = await uploadFile(pendingProfileVideo, 'profile-videos', {
          timeoutMs: 180000,
        });
        if (uploaded?.url) {
          nextVideoUrl = uploaded.url;
          setProfileVideoUrl(uploaded.url);
          setPendingProfileVideo(null);
        } else {
          throw new Error('לא התקבלה כתובת סרטון');
        }
      } catch (err) {
        Alert.alert('שגיאה', err?.message || 'העלאת הסרטון נכשלה, נסה/י שוב.');
        setUploadingVideo(false);
        return;
      } finally {
        setUploadingVideo(false);
      }
    }

    const currentVideo =
      currentUser?.video_url && String(currentUser.video_url).trim()
        ? String(currentUser.video_url).trim()
        : null;
    if (canEditProfileVideo && nextVideoUrl !== currentVideo) {
      payload.video_url = nextVideoUrl || null;
    }

    setSaving(true);
    try {
      const res = await updateSubscriptionProfile(subId, payload);
      const updated = res?.subscription || null;
      setCurrentUser(prev =>
        prev ? {...prev, ...(updated || payload)} : prev,
      );
      if (typeof onSaved === 'function') onSaved(updated);
      Alert.alert('נשמר', 'הפרופיל עודכן בהצלחה.', [
        {text: 'אישור', onPress: () => onClose && onClose()},
      ]);
    } catch (err) {
      Alert.alert('שגיאה', err?.message || 'שמירת הפרופיל נכשלה, נסה/י שוב.');
    } finally {
      setSaving(false);
    }
  };

  const subscriberNumber =
    currentUser?.subscriber_number != null &&
    String(currentUser.subscriber_number).trim() !== ''
      ? String(currentUser.subscriber_number)
      : '';

  return (
    <View style={styles.container}>
      <View style={[styles.header, {paddingTop: insets.top + 12}]}>
        <TouchableOpacity
          onPress={() => onClose && onClose()}
          style={styles.headerBtn}
          hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>עריכת פרופיל</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Avatar with change button */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handlePickPhoto}
              style={styles.avatarWrap}>
              <ProfileAvatar
                uri={photoUrl}
                name={displayName}
                size={104}
                subscriptionType={currentUser}
                fallbackResizeMode="contain"
              />
              <View
                style={[
                  styles.avatarEditBadge,
                  {backgroundColor: cameraBadgeColor},
                ]}>
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#1E1D27" />
                ) : (
                  <MaterialCommunityIcons
                    name="camera"
                    size={18}
                    color="#1E1D27"
                  />
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.7}>
              <Text style={styles.changePhotoText}>שינוי תמונה</Text>
            </TouchableOpacity>
          </View>

          {canEditProfileVideo ? (
            <View style={styles.videoSection}>
              <Text style={styles.fieldLabel}>סרטון פרופיל</Text>
              {profileVideoPreviewUri ? (
                <View style={styles.videoPreviewContainer}>
                  <TouchableOpacity
                    activeOpacity={0.92}
                    onPress={handlePickProfileVideo}
                    style={styles.videoPreviewFrame}>
                    <VideoPreviewThumb
                      uri={profileVideoPreviewUri}
                      style={styles.videoPreviewFill}
                    />
                  </TouchableOpacity>
                  {uploadingVideo ? (
                    <View style={styles.videoUploadOverlay}>
                      <ActivityIndicator size="small" color="#FEE787" />
                    </View>
                  ) : null}
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handlePickProfileVideo}
                  style={styles.videoUploadPlaceholder}
                  activeOpacity={0.85}>
                  <MaterialCommunityIcons
                    name="video-outline"
                    size={28}
                    color="rgba(255,255,255,0.4)"
                  />
                  <Text style={styles.videoUploadText}>העלאת סרטון פרופיל</Text>
                </TouchableOpacity>
              )}
              <View style={styles.videoActionsRow}>
                <TouchableOpacity
                  onPress={handlePickProfileVideo}
                  activeOpacity={0.7}
                  disabled={uploadingVideo || saving}>
                  <Text style={styles.changeVideoLinkText}>
                    {profileVideoPreviewUri ? 'החלפת סרטון' : 'בחירת סרטון'}
                  </Text>
                </TouchableOpacity>
                {profileVideoPreviewUri ? (
                  <TouchableOpacity
                    onPress={handleRemoveProfileVideo}
                    activeOpacity={0.7}
                    disabled={uploadingVideo || saving}
                    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                    <Text style={styles.removeVideoText}>הסרת סרטון</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Read-only email */}
          {currentUser?.email ? (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>אימייל</Text>
              <View style={[styles.input, styles.inputReadonly]}>
                <Text style={styles.readonlyText} numberOfLines={1}>
                  {currentUser.email}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Editable fields */}
          {fields.map(f => (
            <View key={f.key} style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <TextInput
                style={[styles.input, f.multiline && styles.inputMultiline]}
                value={form[f.key]}
                onChangeText={t => setField(f.key, t)}
                placeholder={f.placeholder}
                placeholderTextColor={PLACEHOLDER}
                keyboardType={f.keyboardType || 'default'}
                multiline={!!f.multiline}
                editable={!saving}
              />
            </View>
          ))}

          {/* Read-only subscriber number */}
          {subscriberNumber ? (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>מספר מנוי</Text>
              <View style={[styles.input, styles.inputReadonly]}>
                <Text style={styles.readonlyText}>{subscriberNumber}</Text>
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={saving || uploadingPhoto || uploadingVideo}
            style={styles.saveBtnWrap}>
            <LinearGradient
              colors={GOLD_GRADIENT}
              locations={GOLD_GRADIENT_LOCATIONS}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={[
                styles.saveBtn,
                (saving || uploadingPhoto || uploadingVideo) &&
                  styles.saveBtnDisabled,
              ]}>
              {saving || uploadingVideo ? (
                <ActivityIndicator size="small" color="#1E1D27" />
              ) : (
                <Text style={styles.saveBtnText}>שמירה</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onClose && onClose()}
            activeOpacity={0.7}
            style={styles.cancelBtn}>
            <Text style={styles.cancelText}>ביטול</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <CircleImageCropModal
        visible={cropVisible}
        imageUri={cropUri}
        onCancel={handlePhotoCropCancel}
        onConfirm={handlePhotoCropConfirm}
        title={isCompany ? 'חתוך את לוגו החברה' : 'חתוך את תמונת הפרופיל'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: BG},
  flex: {flex: 1},
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
    backgroundColor: CARD_BG,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
  },
  scroll: {flex: 1},
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: BG,
  },
  changePhotoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    textAlign: 'center',
  },
  changeVideoLinkText: {
    color: '#E8B34D',
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    textAlign: 'center',
  },
  videoSection: {
    alignItems: 'stretch',
    marginBottom: 20,
  },
  videoPreviewContainer: {
    width: '100%',
    height: 96,
    marginBottom: 8,
    position: 'relative',
    alignSelf: 'center',
    maxWidth: 220,
  },
  videoPreviewFrame: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: INPUT_BG,
  },
  videoPreviewFill: {
    width: '100%',
    height: '100%',
  },
  videoUploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
  },
  videoUploadPlaceholder: {
    width: '100%',
    maxWidth: 220,
    height: 72,
    alignSelf: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DIVIDER,
    borderStyle: 'dashed',
    backgroundColor: INPUT_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 4,
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  videoUploadText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
  },
  videoActionsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 2,
  },
  removeVideoText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    textAlign: 'center',
  },
  fieldBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontFamily: 'Rubik-Regular',
    marginBottom: 6,
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
  },
  input: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DIVIDER,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 11,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Rubik-Regular',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  inputReadonly: {
    backgroundColor: 'rgba(30,29,39,0.55)',
    justifyContent: 'center',
  },
  readonlyText: {
    color: TEXT_SECONDARY,
    fontSize: 15,
    fontFamily: 'Rubik-Regular',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
  },
  saveBtnWrap: {
    marginTop: 12,
  },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: '#1E1D27',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    fontWeight: '700',
  },
  cancelBtn: {
    marginTop: 14,
    alignItems: 'center',
  },
  cancelText: {
    color: TEXT_SECONDARY,
    fontSize: 15,
    fontFamily: 'Rubik-Regular',
  },
});

export default EditProfileScreen;
