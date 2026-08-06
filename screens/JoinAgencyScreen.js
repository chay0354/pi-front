import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors} from '../constants/styles';
import {joinAgencyWithCode} from '../utils/api';
import {hebrewTextAlign} from '../utils/rtlLayout';

const BLUE_100 = '#1e1d27';
const CONTENT_MAX = 366;
const MIN_PASSWORD_LENGTH = 8;

/**
 * הצטרף לסוכנות קיימת — a marketer registers under a manager's invite code.
 * On success the account is a verified `project_marketer` with a parent agency.
 */
const JoinAgencyScreen = ({onClose, onJoined}) => {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit =
    email.trim() && password.length >= MIN_PASSWORD_LENGTH && code.trim();

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await joinAgencyWithCode({
        email: email.trim(),
        password,
        name: name.trim() || null,
        code: code.trim().toUpperCase(),
      });
      onJoined?.(res?.subscription || null, res?.agency || null);
    } catch (e) {
      setError(e?.message || 'ההצטרפות נכשלה, נסה שוב');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require('../assets/subscription-background.png')}
        style={styles.bgImage}
        resizeMode="cover">
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(30,29,39,0.15)', 'rgba(30,29,39,0.55)', BLUE_100]}
          locations={[0.12, 0.42, 1]}
          style={StyleSheet.absoluteFill}
        />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={[
              styles.content,
              {
                paddingTop: Math.max(insets.top, 12) + 8,
                paddingBottom: Math.max(insets.bottom, 28),
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.backButton}
                accessibilityRole="button"
                accessibilityLabel="חזור"
                hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}>
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={24}
                  color={Colors.white100}
                />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>הצטרפות לסוכנות</Text>
              <View style={styles.headerSpacer} />
            </View>

            <Text style={styles.lead}>
              הזינו את פרטי החשבון והקוד שקיבלתם ממנהל הסוכנות
            </Text>

            {error ? (
              <View style={styles.errorNotice}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>שם מלא</Text>
              <TextInput
                style={styles.input}
                placeholder="הזן שם מלא"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={name}
                onChangeText={setName}
                textAlign="right"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                שם משתמש (מייל) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="הזן כתובת מייל"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                textAlign="right"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                סיסמה <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder={`לפחות ${MIN_PASSWORD_LENGTH} תווים`}
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                textAlign="right"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                קוד הצטרפות <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="הזן את הקוד"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={code}
                onChangeText={t => setCode(t.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                textAlign="center"
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!canSubmit || submitting}
              onPress={handleSubmit}
              style={[
                styles.submitButton,
                (!canSubmit || submitting) && styles.submitButtonDisabled,
              ]}>
              {submitting ? (
                <ActivityIndicator color="#1E1D27" />
              ) : (
                <Text style={styles.submitText}>הצטרף לסוכנות</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: BLUE_100},
  flex: {flex: 1},
  bgImage: {flex: 1, width: '100%'},
  content: {paddingHorizontal: 20, alignItems: 'center'},
  header: {
    width: '100%',
    maxWidth: CONTENT_MAX,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {padding: 4},
  headerTitle: {
    flex: 1,
    color: Colors.white100,
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  headerSpacer: {width: 32},
  lead: {
    width: '100%',
    maxWidth: CONTENT_MAX,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    lineHeight: 21,
    fontFamily: 'Rubik-Regular',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    marginBottom: 18,
  },
  errorNotice: {
    width: '100%',
    maxWidth: CONTENT_MAX,
    backgroundColor: 'rgba(220,70,70,0.18)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#FFD9D9',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
  },
  field: {width: '100%', maxWidth: CONTENT_MAX, marginBottom: 14},
  label: {
    color: Colors.white100,
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    marginBottom: 6,
  },
  required: {color: '#FFBF3E'},
  input: {
    width: '100%',
    height: 46,
    borderRadius: 10,
    backgroundColor: '#2b2a39',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 14,
    color: Colors.white100,
    fontSize: 15,
    fontFamily: 'Rubik-Regular',
    writingDirection: 'rtl',
  },
  codeInput: {
    letterSpacing: 4,
    fontFamily: 'Rubik-Medium',
    fontSize: 18,
  },
  submitButton: {
    width: '100%',
    maxWidth: CONTENT_MAX,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFBF3E',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {backgroundColor: 'rgba(255,191,62,0.35)'},
  submitText: {
    color: '#1E1D27',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    writingDirection: 'rtl',
  },
});

export default JoinAgencyScreen;
