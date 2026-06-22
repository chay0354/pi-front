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
import {ContextHook} from '../hooks/ContextHook';
import {subscriptionTypes} from '../utils/constant';
import {
  getUserProfilePhotoUrl,
  getUserCompanyLogoUrl,
} from '../utils/userProfileImage';
import {updateSubscriptionProfile, uploadProfilePicture} from '../utils/api';
import {hebrewTextAlign} from '../utils/rtlLayout';

const BG = '#27262F';
const CARD_BG = '#2B2A39';
const INPUT_BG = '#1E1D27';
const DIVIDER = '#373548';
const GOLD_GRADIENT = ['#FEE787', '#BD9947', '#9C6522'];
const GOLD_GRADIENT_LOCATIONS = [0.0456, 0.5076, 0.8831];
const TEXT_SECONDARY = 'rgba(255,255,255,0.55)';
const PLACEHOLDER = 'rgba(255,255,255,0.35)';

/** Field definitions per account type. Each: {key, label, placeholder, keyboardType?, multiline?} */
function getFieldsForType(type) {
  const t = String(type || '').toLowerCase();
  const about = {
    key: 'description',
    label: 'אודות',
    placeholder: 'ספר/י קצת על עצמך',
    multiline: true,
  };
  if (t === subscriptionTypes.company) {
    return [
      {key: 'business_name', label: 'שם החברה', placeholder: 'שם החברה'},
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
  const isCompany = String(type).toLowerCase() === subscriptionTypes.company;
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
  const [saving, setSaving] = useState(false);

  const displayName =
    currentUser?.name ||
    currentUser?.contact_person_name ||
    currentUser?.business_name ||
    currentUser?.broker_office_name ||
    'משתמש';

  const setField = (key, value) =>
    setForm(prev => ({...prev, [key]: value}));

  const buildPickedImageFile = (asset, namePrefix = 'profile') => ({
    uri: asset.uri,
    type: asset.type || asset.mimeType || 'image/jpeg',
    name: asset.fileName || asset.filename || `${namePrefix}-${Date.now()}.jpg`,
    file: asset,
  });

  const openWebImagePicker = onPicked => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = e => {
      const file = e.target.files?.[0];
      if (file) {
        onPicked({
          uri: URL.createObjectURL(file),
          type: file.type,
          name: file.name || `profile-${Date.now()}.jpg`,
          file,
        });
      }
    };
    input.click();
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

  const handlePickPhoto = async () => {
    if (uploadingPhoto || saving) return;
    if (Platform.OS === 'web') {
      openWebImagePicker(uploadPicked);
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('נדרשת הרשאה', 'נדרשת הרשאה לגישה לתמונות.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        await uploadPicked(buildPickedImageFile(result.assets[0]));
      }
    } catch (err) {
      Alert.alert('שגיאה', `לא ניתן לבחור תמונה: ${err.message}`);
    }
  };

  const handleSave = async () => {
    if (saving || uploadingPhoto) return;
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
                fallbackResizeMode="contain"
              />
              <View style={styles.avatarEditBadge}>
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
            disabled={saving || uploadingPhoto}
            style={styles.saveBtnWrap}>
            <LinearGradient
              colors={GOLD_GRADIENT}
              locations={GOLD_GRADIENT_LOCATIONS}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={[
                styles.saveBtn,
                (saving || uploadingPhoto) && styles.saveBtnDisabled,
              ]}>
              {saving ? (
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
    backgroundColor: '#E8B34D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: BG,
  },
  changePhotoText: {
    color: '#E8B34D',
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
