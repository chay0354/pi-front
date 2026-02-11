import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {Colors} from '../constants/styles';
import {subscriptionTypes} from '../utils/constant';

/**
 * Regular user registration – shown when user without profile tries to publish an ad.
 * Matches design: title, subtitle, profile pic, name, email, phone, register button, Google/Apple, cancel, login.
 */
const UserRegistrationScreen = ({
  onSuccess,
  onCancel,
  onOpenLogin,
  selectedCategory,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const requestMediaPermission = async () => {
    if (Platform.OS !== 'web') {
      const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('נדרשת הרשאה', 'נדרשת הרשאה לספריית התמונות להעלאת תמונת פרופיל.');
      }
    }
  };

  useEffect(() => {
    requestMediaPermission();
  }, []);

  const pickProfileImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('שגיאה', 'לא ניתן לבחור תמונה. נסה שוב.');
    }
  };

  const removeProfileImage = () => {
    setProfileImage(null);
  };

  const handleRegister = async () => {
    setErrorMessage(null);
    const name = fullName.trim();
    const emailTrim = email.trim();
    const phoneTrim = phone.trim();

    if (!name) {
      setErrorMessage('אנא הזן שם מלא');
      return;
    }
    if (!emailTrim) {
      setErrorMessage('אנא הזן כתובת מייל');
      return;
    }
    if (!phoneTrim) {
      setErrorMessage('אנא הזן מספר טלפון');
      return;
    }

    setSubmitting(true);
    try {
      const user = {
        id: `user-${Date.now()}`,
        subscription_type: subscriptionTypes.user,
        name: name,
        email: emailTrim,
        phone: phoneTrim,
        profile_picture_url: profileImage?.uri || null,
        status: 'verified',
      };
      if (onSuccess) onSuccess(user);
    } catch (err) {
      setErrorMessage(err.message || 'אירעה שגיאה. נסה שוב.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>הירשם ופרסם מודעה</Text>
        <Text style={styles.subtitle}>בוא נתחיל – זה ייקח שניות בודדות</Text>

        {/* Profile picture */}
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.profileCircle}
            onPress={pickProfileImage}
            activeOpacity={0.8}>
            {profileImage ? (
              <Image
                source={{uri: profileImage.uri}}
                style={styles.profileImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profilePlaceholderText}>+</Text>
              </View>
            )}
            {profileImage ? (
              <TouchableOpacity
                style={styles.removeProfileButton}
                onPress={removeProfileImage}>
                <Text style={styles.removeProfileText}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </TouchableOpacity>
          <Text style={styles.profileLabel}>תמונת פרופיל</Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Full name */}
        <View style={styles.inputWrap}>
          <Text style={styles.label}>שם מלא</Text>
          <TextInput
            style={styles.input}
            placeholder="שם פרטי ומשפחה"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={fullName}
            onChangeText={setFullName}
            textAlign="right"
          />
        </View>

        {/* Email */}
        <View style={styles.inputWrap}>
          <Text style={styles.label}>כתובת מייל</Text>
          <TextInput
            style={styles.input}
            placeholder="example@gmail.com"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            textAlign="right"
          />
        </View>

        {/* Phone */}
        <View style={styles.inputWrap}>
          <Text style={styles.label}>טלפון</Text>
          <View style={styles.phoneRow}>
            <TouchableOpacity style={styles.countrySelector}>
              <Text style={styles.chevron}>▼</Text>
              <Text style={styles.flag}>🇮🇱</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.phoneInput}
              placeholder="00 000 0000"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              textAlign="right"
            />
          </View>
        </View>

        {/* Register button */}
        <TouchableOpacity
          onPress={handleRegister}
          disabled={submitting}
          style={styles.registerButtonWrap}
          activeOpacity={0.9}>
          <LinearGradient
            colors={['#FEE787', '#BD9947', '#9C6522']}
            locations={[0.05, 0.5, 0.88]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.registerButton}>
            {submitting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.registerButtonText}>הרשם ופרסם מודעה</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>או</Text>
          <View style={styles.orLine} />
        </View>

        {/* Google */}
        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => {}}
          activeOpacity={0.8}>
          <Text style={styles.socialButtonText}>הרשמה עם גוגל</Text>
        </TouchableOpacity>

        {/* Apple */}
        <TouchableOpacity
          style={[styles.socialButton, styles.socialButtonApple]}
          onPress={() => {}}
          activeOpacity={0.8}>
          <Text style={styles.socialButtonTextApple}>הרשמה עם אפל</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.footerCancel}>בטל הרשמה ופרסום מודעה</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onOpenLogin} style={styles.footerLoginWrap}>
            <Text style={styles.footerLogin}>מחפש להיכנס</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1d27',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 40,
    maxWidth: 414,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.whiteGeneral,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: '#2a2932',
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePlaceholderText: {
    fontSize: 40,
    color: Colors.textSecondary,
  },
  removeProfileButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeProfileText: {
    color: '#fff',
    fontSize: 16,
  },
  profileLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 10,
  },
  errorContainer: {
    backgroundColor: 'rgba(255,0,0,0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#ffcccc',
    fontSize: 14,
    textAlign: 'right',
  },
  inputWrap: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    backgroundColor: '#1E1D27',
    borderWidth: 1,
    borderColor: '#8C85B3',
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.whiteGeneral,
    height: 52,
    textAlign: 'right',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1D27',
    borderWidth: 1,
    borderColor: '#8C85B3',
    borderRadius: 25,
    height: 52,
    paddingLeft: 14,
    marginTop: 8,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  chevron: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginRight: 4,
  },
  flag: {
    fontSize: 20,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.whiteGeneral,
    paddingVertical: 14,
    paddingRight: 18,
    textAlign: 'right',
  },
  registerButtonWrap: {
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 25,
    overflow: 'hidden',
    minHeight: 56,
  },
  registerButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  orText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginHorizontal: 12,
  },
  socialButton: {
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  socialButtonApple: {
    backgroundColor: '#2a2932',
    borderWidth: 1,
    borderColor: '#8C85B3',
  },
  socialButtonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  socialButtonTextApple: {
    fontSize: 16,
    color: Colors.whiteGeneral,
    fontWeight: '600',
  },
  footer: {
    marginTop: 28,
    alignItems: 'center',
  },
  footerCancel: {
    fontSize: 14,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
    marginBottom: 12,
  },
  footerLoginWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLogin: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});

export default UserRegistrationScreen;
