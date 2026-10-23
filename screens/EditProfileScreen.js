import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
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
  Dimensions,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  ProfileAvatar,
  PROFILE_RING_COLORS,
  PROFILE_RING_LOCATIONS,
} from '../components';
import {VideoPreviewThumb} from '../components/FormsElement/VideoPreviewThumb';
import {ContextHook} from '../hooks/ContextHook';
import {
  subscriptionTypes,
  isB2BSubscriptionType,
  getProfessionalSpecializationsForTypes,
  usesOrgLogoAsAvatar,
} from '../utils/constant';
import {
  getUserProfilePhotoUrl,
  getUserCompanyLogoUrl,
  buildProfilePhotoSavePayload,
} from '../utils/userProfileImage';
import {updateSubscriptionProfile, uploadProfilePicture, uploadFile} from '../utils/api';
import {hebrewTextAlign} from '../utils/rtlLayout';
import {ensureMediaLibraryPermission, AD_VIDEO_PICKER_OPTIONS} from '../utils/mediaLibraryPermission';
import {
  resolveProfileDisplayName,
  getProfileEditFields,
  hydrateProfileEditForm,
  applyProfilePhoneSync,
  canEditSeparateCompanyLogo,
  getProfileBusinessNameFieldKey,
} from '../utils/profileFields';
import CircleImageCropModal from '../components/CircleImageCropModal';
import {FigmaCheckbox} from '../components/FigmaCheckbox';
import {
  directoryCardMediaFrame,
  parseDirectoryVideoCrop,
} from '../utils/directoryCoverFrame';
import {useKeyboardInset} from '../utils/formKeyboardScroll';

const BG = '#27262F';
const CARD_BG = '#2B2A39';
const INPUT_BG = '#1E1D27';
const DIVIDER = '#373548';
const TEXT_SECONDARY = 'rgba(255,255,255,0.55)';
const PLACEHOLDER = 'rgba(255,255,255,0.35)';

const EditProfileScreen = ({onClose, onSaved}) => {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  const scrollRef = useRef(null);
  const scrollYRef = useRef(0);
  const focusedFieldKeyRef = useRef(null);
  const inputRefs = useRef({});
  const {currentUser, setCurrentUser} = useContext(ContextHook);

  const type = currentUser?.subscription_type || subscriptionTypes.user;
  const subTypeLower = String(type).toLowerCase();
  /** Company + משווק: logo only — no separate profile photo or video. */
  const logoOnlyProfile = usesOrgLogoAsAvatar(subTypeLower);
  const canEditProfilePhoto = !logoOnlyProfile;
  const canEditHorizontalCover =
    subTypeLower === subscriptionTypes.broker ||
    subTypeLower === subscriptionTypes.professional;
  const canEditProfileVideo =
    isB2BSubscriptionType(subTypeLower) && !logoOnlyProfile;
  const canEditCompanyLogo = canEditSeparateCompanyLogo(
    subTypeLower,
    currentUser,
  );
  const businessNameFieldKey = getProfileBusinessNameFieldKey(type, currentUser);

  const fields = useMemo(
    () => getProfileEditFields(type, currentUser),
    [type, currentUser],
  );

  const [form, setForm] = useState(() =>
    hydrateProfileEditForm(currentUser, getProfileEditFields(type, currentUser)),
  );
  const [photoUrl, setPhotoUrl] = useState(
    () =>
      getUserProfilePhotoUrl(currentUser) ||
      getUserCompanyLogoUrl(currentUser),
  );
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoSourceUri, setPhotoSourceUri] = useState(null);
  const [directoryCoverUrl, setDirectoryCoverUrl] = useState(() =>
    currentUser?.directory_cover_url &&
    String(currentUser.directory_cover_url).trim()
      ? String(currentUser.directory_cover_url).trim()
      : null,
  );
  const [directoryVideoCrop, setDirectoryVideoCrop] = useState(() =>
    parseDirectoryVideoCrop(currentUser?.directory_video_crop),
  );
  const [profileVideoUrl, setProfileVideoUrl] = useState(() =>
    currentUser?.video_url && String(currentUser.video_url).trim()
      ? String(currentUser.video_url).trim()
      : null,
  );
  const [pendingProfileVideo, setPendingProfileVideo] = useState(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState(() =>
    getUserCompanyLogoUrl(currentUser),
  );
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [cropUri, setCropUri] = useState(null);
  const [cropVisible, setCropVisible] = useState(false);
  const [cropTarget, setCropTarget] = useState('profile');
  const cropTargetRef = useRef('profile');

  const displayName = resolveProfileDisplayName(currentUser);

  const setField = (key, value) =>
    setForm(prev => ({...prev, [key]: value}));

  const scrollFocusedIntoView = useCallback(
    event => {
      const target = event?.target;
      const run = () => {
        if (!scrollRef.current) return;
        const keyboardHeight = Math.max(0, keyboardInset || 0);
        const visibleBottom =
          Dimensions.get('window').height -
          keyboardHeight -
          Math.max(insets.bottom, 12) -
          28;
        if (typeof target?.measureInWindow !== 'function') {
          scrollRef.current.scrollToEnd?.({animated: true});
          return;
        }
        target.measureInWindow((_x, fieldTop, _w, fieldHeight) => {
          const fieldBottom = fieldTop + (fieldHeight || 0);
          if (fieldBottom <= visibleBottom) return;
          scrollRef.current.scrollTo({
            y: scrollYRef.current + (fieldBottom - visibleBottom) + 24,
            animated: true,
          });
        });
      };
      requestAnimationFrame(run);
      setTimeout(run, Platform.OS === 'android' ? 280 : 100);
      if (Platform.OS === 'android') setTimeout(run, 450);
    },
    [keyboardInset, insets.bottom],
  );

  useEffect(() => {
    if (keyboardInset <= 0 || !focusedFieldKeyRef.current) return;
    const target = inputRefs.current[focusedFieldKeyRef.current];
    if (target) scrollFocusedIntoView({target});
  }, [keyboardInset, scrollFocusedIntoView]);

  const buildPickedVideoFile = asset => ({
    uri: asset.uri,
    type: asset.type || asset.mimeType || 'video/mp4',
    name: asset.fileName || asset.filename || `video-${Date.now()}.mp4`,
    file: asset,
  });

  const profileVideoPreviewUri =
    pendingProfileVideo?.uri || profileVideoUrl || null;

  const handlePickProfileVideo = async () => {
    if (uploadingVideo || saving || uploadingPhoto || uploadingLogo) return;
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/*';
      input.onchange = e => {
        const file = e.target.files?.[0];
        if (file) {
          setDirectoryVideoCrop(null);
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
        setDirectoryVideoCrop(null);
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
    setDirectoryVideoCrop(null);
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

  const uploadCoverPicked = async picked => {
    if (!picked) return;
    setUploadingPhoto(true);
    try {
      const uploaded = await uploadProfilePicture(picked);
      if (uploaded?.url) {
        setDirectoryCoverUrl(uploaded.url);
      } else {
        throw new Error('לא התקבלה כתובת תמונה');
      }
    } catch (err) {
      Alert.alert('שגיאה', err?.message || 'העלאת התמונה נכשלה, נסה/י שוב.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const uploadLogoPicked = async picked => {
    if (!picked) return;
    setUploadingLogo(true);
    try {
      const uploaded = await uploadFile(picked, 'company-logos');
      if (uploaded?.url) {
        setLogoUrl(uploaded.url);
      } else {
        throw new Error('לא התקבלה כתובת לוגו');
      }
    } catch (err) {
      Alert.alert('שגיאה', err?.message || 'העלאת הלוגו נכשלה, נסה/י שוב.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const openPhotoCropper = (uri, target = 'profile') => {
    if (!uri) return;
    if (target === 'profile' || (target === 'cover' && !photoSourceUri)) {
      if (target === 'profile' && uri !== photoSourceUri && uri !== photoUrl) {
        setDirectoryCoverUrl(null);
      }
      setPhotoSourceUri(uri);
    }
    cropTargetRef.current = target;
    setCropTarget(target);
    setCropUri(uri);
    setCropVisible(true);
  };

  const handlePhotoCropConfirm = async result => {
    const target = cropTargetRef.current;
    setCropVisible(false);
    setCropUri(null);
    if (target === 'video') {
      if (result?.crop) setDirectoryVideoCrop(result.crop);
      else if (result?.error) Alert.alert('שגיאה', result.error);
      return;
    }
    if (!result?.uri) {
      if (result?.error) {
        Alert.alert('שגיאה', result.error);
      }
      return;
    }
    const picked = {
      uri: result.uri,
      type: 'image/jpeg',
      name: `${target === 'logo' ? 'logo' : 'profile'}-${Date.now()}.jpg`,
    };
    if (target === 'logo') {
      await uploadLogoPicked(picked);
      return;
    }
    if (target === 'cover') {
      await uploadCoverPicked(picked);
      return;
    }
    await uploadPicked(picked);
  };

  const handlePhotoCropCancel = () => {
    setCropVisible(false);
    setCropUri(null);
  };

  const handlePickImage = async (target = 'profile') => {
    if (uploadingPhoto || uploadingLogo || saving) return;
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = e => {
        const file = e.target.files?.[0];
        if (file) openPhotoCropper(URL.createObjectURL(file), target);
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
        openPhotoCropper(result.assets[0].uri, target);
      }
    } catch (err) {
      Alert.alert(
        'שגיאה',
        target === 'logo'
          ? `לא ניתן לבחור לוגו: ${err.message}`
          : `לא ניתן לבחור תמונה: ${err.message}`,
      );
    }
  };

  const handlePickPhoto = () => handlePickImage('profile');
  const handlePickLogo = () => handlePickImage('logo');

  const handleSave = async () => {
    if (saving || uploadingPhoto || uploadingVideo || uploadingLogo) return;
    const subId = currentUser?.id || currentUser?.subscription_id;
    if (!subId) {
      Alert.alert('שגיאה', 'לא ניתן לזהות את המשתמש.');
      return;
    }
    const missing = fields.filter(
      f => f.required && !String(form[f.key] ?? '').trim(),
    );
    if (missing.length > 0) {
      Alert.alert(
        'שדות חובה',
        `אנא מלא/י: ${missing.map(f => f.label).join(', ')}`,
      );
      return;
    }
    const payload = {};
    fields.forEach(f => {
      if (f.readOnly) return;
      if (f.type === 'toggle') {
        payload[f.key] = form[f.key] === true;
        return;
      }
      if (
        f.type === 'chips' ||
        f.key === 'activity_regions' ||
        f.key === 'types' ||
        f.key === 'specializations'
      ) {
        payload[f.key] = Array.isArray(form[f.key])
          ? form[f.key].map(v => String(v).trim()).filter(Boolean)
          : [];
        return;
      }
      payload[f.key] = form[f.key] != null ? String(form[f.key]).trim() : '';
    });
    if (canEditProfilePhoto) {
      Object.assign(payload, buildProfilePhotoSavePayload(photoUrl));
    }
    if (canEditHorizontalCover) {
      payload.directory_cover_url = directoryCoverUrl || null;
      payload.directory_video_crop = directoryVideoCrop || null;
    }
    if (canEditCompanyLogo && logoUrl) {
      payload.company_logo_url = logoUrl;
    }
    applyProfilePhoneSync(payload, type);

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
      const photoPatch = canEditProfilePhoto
        ? buildProfilePhotoSavePayload(photoUrl)
        : {};
      const logoPatch =
        canEditCompanyLogo && logoUrl
          ? {company_logo_url: logoUrl, companyLogoUrl: logoUrl}
          : {};
      setCurrentUser(prev =>
        prev
          ? {...prev, ...(updated || payload), ...photoPatch, ...logoPatch}
          : prev,
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 12}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                Math.max(48, insets.bottom + 24) + keyboardInset + 96,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          onScroll={event => {
            scrollYRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}>
          {/* Avatar — company/marketer show logo only (edited in לוגו חברה). */}
          <View style={styles.avatarSection}>
            {canEditProfilePhoto ? (
              <>
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
                  <View style={styles.avatarEditBadgeWrap}>
                    {uploadingPhoto ? (
                      <View style={styles.avatarEditBadge}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      </View>
                    ) : (
                      <View style={styles.avatarEditBadge}>
                        <MaterialCommunityIcons
                          name="camera"
                          size={13}
                          color="#FFFFFF"
                        />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.7}>
                  <Text style={styles.changePhotoText}>
                    {photoUrl ? 'שינוי תמונה' : 'העלאת תמונה'}
                  </Text>
                </TouchableOpacity>
                {canEditHorizontalCover && (photoSourceUri || photoUrl) ? (
                  <TouchableOpacity
                    onPress={() => {
                      const source = photoSourceUri || photoUrl;
                      if (!source) {
                        handlePickImage('cover');
                        return;
                      }
                      openPhotoCropper(source, 'cover');
                    }}
                    activeOpacity={0.7}>
                    <Text style={styles.changePhotoText}>עריכת תצוגה אופקית</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : (
              <View style={styles.avatarWrap}>
                <ProfileAvatar
                  uri={logoUrl || photoUrl}
                  name={displayName}
                  size={104}
                  subscriptionType={currentUser}
                  fallbackResizeMode="contain"
                />
              </View>
            )}
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
                    onPress={() => {
                      cropTargetRef.current = 'video';
                      setCropTarget('video');
                      setCropUri(profileVideoPreviewUri);
                      setCropVisible(true);
                    }}
                    activeOpacity={0.7}
                    disabled={uploadingVideo || saving}>
                    <Text style={styles.horizontalEditLinkText}>
                      עריכת תצוגה אופקית
                    </Text>
                  </TouchableOpacity>
                ) : null}
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
            <View key={f.key}>
            <View style={styles.fieldBlock}>
              {f.type === 'toggle' ? null : (
                <Text style={styles.fieldLabel}>
                  {f.label}
                  {f.required ? (
                    <Text style={styles.requiredMark}> *</Text>
                  ) : null}
                </Text>
              )}
              {f.type === 'toggle' ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={saving}
                  onPress={() => setField(f.key, form[f.key] !== true)}
                  style={styles.toggleRow}
                  accessibilityRole="checkbox"
                  accessibilityState={{checked: form[f.key] === true}}>
                  <FigmaCheckbox checked={form[f.key] === true} />
                  <View style={styles.toggleTextWrap}>
                    <Text style={styles.toggleLabel}>{f.label}</Text>
                    {f.hint ? (
                      <Text style={styles.toggleHint}>{f.hint}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ) : f.readOnly ? (
                <View style={[styles.input, styles.inputReadonly]}>
                  <Text
                    style={[styles.readonlyText, styles.inputLtrValue]}
                    numberOfLines={1}>
                    {form[f.key] || '—'}
                  </Text>
                </View>
              ) : f.type === 'chips' ? (
                (() => {
                  const chipOptions =
                    f.optionsFrom === 'professionalTypes'
                      ? getProfessionalSpecializationsForTypes(
                          Array.isArray(form.types) ? form.types : [],
                        )
                      : f.options || [];
                  if (chipOptions.length === 0) {
                    return (
                      <Text style={styles.chipEmptyHint}>
                        {f.emptyHint || 'אין אפשרויות'}
                      </Text>
                    );
                  }
                  return (
                    <View style={styles.chipsWrap}>
                      {chipOptions.map(option => {
                        const selected = Array.isArray(form[f.key])
                          ? form[f.key].includes(option)
                          : false;
                        return (
                          <TouchableOpacity
                            key={option}
                            activeOpacity={0.8}
                            disabled={saving}
                            onPress={() => {
                              const current = Array.isArray(form[f.key])
                                ? form[f.key]
                                : [];
                              const next =
                                f.key === 'types'
                                  ? selected
                                    ? []
                                    : [option]
                                  : selected
                                    ? current.filter(v => v !== option)
                                    : [...current, option];
                              if (f.key === 'types') {
                                const valid = new Set(
                                  getProfessionalSpecializationsForTypes(next),
                                );
                                const specs = (
                                  Array.isArray(form.specializations)
                                    ? form.specializations
                                    : []
                                ).filter(s => valid.has(s));
                                setForm(prev => ({
                                  ...prev,
                                  types: next,
                                  specializations: specs,
                                }));
                                return;
                              }
                              setField(f.key, next);
                            }}
                            style={[
                              styles.chip,
                              selected && styles.chipSelected,
                            ]}>
                            <Text
                              style={[
                                styles.chipText,
                                selected && styles.chipTextSelected,
                              ]}>
                              {option}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })()
              ) : (
                <TextInput
                  style={[
                    styles.input,
                    f.multiline && styles.inputMultiline,
                    (f.keyboardType === 'phone-pad' ||
                      f.keyboardType === 'url') &&
                      styles.inputLtrValue,
                  ]}
                  ref={el => {
                    inputRefs.current[f.key] = el;
                  }}
                  value={form[f.key]}
                  onChangeText={t => setField(f.key, t)}
                  onFocus={event => {
                    focusedFieldKeyRef.current = f.key;
                    scrollFocusedIntoView(event);
                  }}
                  onBlur={() => {
                    if (focusedFieldKeyRef.current === f.key) {
                      focusedFieldKeyRef.current = null;
                    }
                  }}
                  onContentSizeChange={
                    f.multiline
                      ? () => {
                          if (focusedFieldKeyRef.current !== f.key) return;
                          scrollFocusedIntoView({
                            target: inputRefs.current[f.key],
                          });
                        }
                      : undefined
                  }
                  placeholder={f.placeholder}
                  placeholderTextColor={PLACEHOLDER}
                  keyboardType={f.keyboardType || 'default'}
                  multiline={!!f.multiline}
                  editable={!saving}
                />
              )}
            </View>
            {canEditCompanyLogo && f.key === businessNameFieldKey ? (
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>לוגו חברה</Text>
                <View style={styles.logoRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handlePickLogo}
                    disabled={uploadingLogo || saving}
                    style={styles.logoAvatarWrap}>
                    <ProfileAvatar
                      uri={logoUrl}
                      name={
                        (businessNameFieldKey && form[businessNameFieldKey]) ||
                        displayName
                      }
                      size={100}
                      subscriptionType={currentUser}
                      fallbackResizeMode="contain"
                    />
                    <View style={styles.logoEditBadgeWrap}>
                      {uploadingLogo ? (
                        <View style={styles.logoCameraBadge}>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        </View>
                      ) : (
                        <View style={styles.logoCameraBadge}>
                          <MaterialCommunityIcons
                            name="camera"
                            size={13}
                            color="#FFFFFF"
                          />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handlePickLogo}
                    activeOpacity={0.7}
                    disabled={uploadingLogo || saving}>
                    <Text style={styles.changePhotoText}>
                      {logoUrl ? 'שינוי לוגו חברה' : 'העלאת לוגו חברה'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
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
            disabled={
              saving || uploadingPhoto || uploadingVideo || uploadingLogo
            }
            style={styles.saveBtnWrap}>
            <LinearGradient
              colors={PROFILE_RING_COLORS}
              locations={PROFILE_RING_LOCATIONS}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={[
                styles.saveBtn,
                (saving || uploadingPhoto || uploadingVideo || uploadingLogo) &&
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
        key={`${cropTarget}-${cropUri || 'closed'}`}
        visible={cropVisible}
        imageUri={cropUri}
        onCancel={handlePhotoCropCancel}
        onConfirm={handlePhotoCropConfirm}
        title={
          cropTarget === 'logo'
            ? 'חתוך את לוגו החברה'
            : cropTarget === 'cover' || cropTarget === 'video'
              ? 'עריכת תצוגה אופקית'
              : 'חתוך את תמונת הפרופיל'
        }
        media={cropTarget === 'video' ? 'video' : 'image'}
        shape={
          cropTarget === 'cover' || cropTarget === 'video' ? 'rect' : 'circle'
        }
        frameWidth={
          cropTarget === 'cover' || cropTarget === 'video'
            ? directoryCardMediaFrame().width
            : undefined
        }
        frameHeight={
          cropTarget === 'cover' || cropTarget === 'video'
            ? directoryCardMediaFrame().height
            : undefined
        }
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
  avatarEditBadgeWrap: {
    position: 'absolute',
    bottom: 2,
    // forceRTL flips left/right. Physical right matches the upload badge.
    ...(Platform.OS === 'web' ? {right: 2} : {left: 2}),
  },
  avatarEditBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    textAlign: 'center',
  },
  logoRow: {
    // forceRTL: `row` starts on the physical right — `row-reverse` put the logo on the left.
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 14,
    width: '100%',
  },
  logoAvatarWrap: {
    position: 'relative',
  },
  logoEditBadgeWrap: {
    position: 'absolute',
    bottom: 2,
    ...(Platform.OS === 'web' ? {right: 2} : {left: 2}),
  },
  logoCameraBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeVideoLinkText: {
    color: '#E8B34D',
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    textAlign: 'center',
  },
  horizontalEditLinkText: {
    color: '#FFFFFF',
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
    flexWrap: 'wrap',
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
  chipsWrap: {
    // Hebrew chips start on the physical right.
    // Android RTL + row-reverse packed the first chip to the left; `row` starts on the right.
    // iOS row-reverse under an LTR lock starts on the right (plain `row` would start on the left).
    flexDirection: Platform.OS === 'ios' ? 'row-reverse' : 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
    justifyContent: 'flex-start',
    ...(Platform.OS === 'ios' ? {direction: 'ltr'} : null),
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: DIVIDER,
    backgroundColor: INPUT_BG,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    borderColor: '#E8B34D',
    backgroundColor: 'rgba(232,179,77,0.18)',
  },
  chipText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontFamily: 'Rubik-Regular',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'Rubik-Medium',
  },
  chipEmptyHint: {
    color: PLACEHOLDER,
    fontSize: 13,
    fontFamily: 'Rubik-Regular',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
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
  /** Phone numbers and URLs: an RTL run throws a leading "+" or "https://"
   * to the far end of the value. Keep the glyph order LTR, still right-aligned. */
  inputLtrValue: {
    writingDirection: 'ltr',
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
  requiredMark: {
    color: '#F7C63A',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Rubik-Medium',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
  },
  toggleHint: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
    marginTop: 2,
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
