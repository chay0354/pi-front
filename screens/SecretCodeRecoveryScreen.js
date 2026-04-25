import React, {useState} from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Colors} from '../constants/styles';
import {recoverSubscriberCodeByEmail} from '../utils/api';

const KEY_ICON = require('../assets/menu/key.png');

/**
 * שחזור קוד סודי – enter email, send מספר מנוי by mail
 */
const SecretCodeRecoveryScreen = ({onClose, onSent}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('שגיאה', 'אנא הזן כתובת מייל');
      return;
    }
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed.toLowerCase());
    if (!ok) {
      Alert.alert('שגיאה', 'אנא הזן כתובת מייל תקינה');
      return;
    }
    setLoading(true);
    try {
      await recoverSubscriberCodeByEmail(trimmed);
      if (onSent) onSent(trimmed);
    } catch (e) {
      Alert.alert('שגיאה', e.message || 'נכשל בשליחה. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const canSend = email.trim().length > 0 && !loading;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} hitSlop={12}>
            <Text style={styles.backChevron}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>שחזור קוד סודי</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.card}>
          <View style={styles.keyIconWrap}>
            <Image source={KEY_ICON} style={styles.keyImage} resizeMode="contain" />
          </View>
          <Text style={styles.cardTitle}>שכחת את הקוד?</Text>
          <Text style={styles.cardBody}>
            לא נורא, הזן את כתובת המייל המשויכת לחשבונך, ואנו נשלח לך את קוד המנוי שלך.
          </Text>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="כתובת מייל"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textAlign="center"
            />
            {email.trim().length > 0 ? (
              <TouchableOpacity
                onPress={() => setEmail('')}
                style={styles.clearBtn}
                hitSlop={10}
                activeOpacity={0.7}>
                <Text style={styles.clearBtnText}>×</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {email.trim().length === 0 ? (
            <Text style={styles.promo}>הזן מייל לקבלת קוד חינם לחצי  שנה</Text>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!canSend}
            onPress={handleSend}
            style={[styles.btnWrap, !canSend && styles.btnWrapDisabled]}>
            <LinearGradient
              colors={canSend ? ['#FEE787', '#BD9947', '#9C6522'] : ['#4d4966', '#4d4966']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.btnGradient}>
              {loading ? (
                <ActivityIndicator color="#1e1d27" />
              ) : (
                <Text style={[styles.btnText, !canSend && styles.btnTextDisabled]}>שלח</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.blue100,
    width: '100%',
    maxWidth: 414,
    alignSelf: 'center',
  },
  scroll: {
    paddingTop: Platform.OS === 'web' ? 44 : 52,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backChevron: {
    color: Colors.white100,
    fontSize: 34,
    fontWeight: '300',
    marginTop: -4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: Colors.white100,
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
  },
  headerSpacer: {width: 44},
  card: {
    backgroundColor: '#2b2a39',
    borderRadius: 12,
    padding: 24,
    alignItems: 'stretch',
    minHeight: 373,
    justifyContent: 'center',
  },
  keyIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
    height: 40,
    width: 40,
    alignSelf: 'center',
  },
  keyImage: {
    width: 40,
    height: 40,
  },
  cardTitle: {
    color: '#F7F3E6',
    fontSize: 22,
    lineHeight: 26,
    fontFamily: 'Rubik-SemiBold',
    textAlign: 'center',
    marginBottom: 20,
  },
  cardBody: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#8c85b3',
    borderRadius: 1000,
    height: 52,
    paddingHorizontal: 16,
    color: Colors.white100,
    fontSize: 20,
    letterSpacing: 0.2,
    backgroundColor: '#2b2a39',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  clearBtn: {
    position: 'absolute',
    left: 16,
    top: 0,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    width: 20,
  },
  clearBtnText: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 34,
    fontWeight: '300',
  },
  promo: {
    color: '#E39513',
    fontSize: 14,
    letterSpacing: 0.14,
    textAlign: 'right',
    marginBottom: 20,
  },
  btnWrap: {
    borderRadius: 1000,
    overflow: 'hidden',
  },
  btnWrapDisabled: {
    opacity: 0.4,
  },
  btnGradient: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 1000,
  },
  btnText: {
    color: '#1e1d27',
    fontSize: 20,
    lineHeight: 20,
    fontFamily: 'Rubik-Medium',
    letterSpacing: 0.2,
  },
  btnTextDisabled: {
    color: '#FFFFFF',
  },
});

export default SecretCodeRecoveryScreen;
