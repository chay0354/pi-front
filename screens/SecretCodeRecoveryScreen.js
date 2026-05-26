import React, {useEffect, useState} from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors} from '../constants/styles';
import {recoverPasswordByEmail} from '../utils/api';
import {flexEnd} from '../utils/rtlLayout';

const KEY_ICON = require('../assets/menu/key.png');

/**
 * שכחתי סיסמה – sends to the logged-in account email only (no typing).
 */
const SecretCodeRecoveryScreen = ({onClose, onSent, userEmail = ''}) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const accountEmail = String(userEmail || '').trim();

  useEffect(() => {
    if (!accountEmail) {
      Alert.alert('שגיאה', 'לא נמצא מייל בחשבון המחובר.', [
        {text: 'אישור', onPress: () => onClose && onClose()},
      ]);
    }
  }, [accountEmail, onClose]);

  const handleSend = async () => {
    if (!accountEmail) return;
    setLoading(true);
    try {
      await recoverPasswordByEmail(accountEmail);
      if (onSent) onSent(accountEmail);
    } catch (e) {
      Alert.alert('שגיאה', e.message || 'נכשל בשליחה. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const canSend = Boolean(accountEmail) && !loading;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingTop: insets.top + 10}]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.backBtn}
            hitSlop={12}>
            <Text style={styles.backChevron}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>שכחתי סיסמה</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.card}>
          <View style={styles.keyIconWrap}>
            <Image
              source={KEY_ICON}
              style={styles.keyImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.cardTitle}>שכחתי סיסמה</Text>
          <Text style={styles.cardBody}>
            לחץ שלח וישלח אלייך מייל עם הסיסמה העדכנית שלך לכתובת המייל של
            החשבון המחובר:
          </Text>

          <View style={styles.emailReadOnlyWrap}>
            <Text style={styles.emailReadOnly} numberOfLines={2}>
              {accountEmail || '—'}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!canSend}
            onPress={handleSend}
            style={[styles.btnWrap, !canSend && styles.btnWrapDisabled]}>
            <LinearGradient
              colors={
                canSend
                  ? ['#FEE787', '#BD9947', '#9C6522']
                  : ['#4d4966', '#4d4966']
              }
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.btnGradient}>
              {loading ? (
                <ActivityIndicator color="#1e1d27" />
              ) : (
                <Text
                  style={[styles.btnText, !canSend && styles.btnTextDisabled]}>
                  שלח
                </Text>
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
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: flexEnd,
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
    marginBottom: 16,
  },
  emailReadOnlyWrap: {
    width: '100%',
    minHeight: 52,
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: '#ffc40a',
    backgroundColor: 'rgba(255,196,10,0.08)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 20,
    justifyContent: 'center',
  },
  emailReadOnly: {
    color: Colors.white100,
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
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
