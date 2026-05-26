import React from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  I18nManager,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors} from '../constants/styles';
import {flexEnd} from '../utils/rtlLayout';

const KEY_ICON = require('../assets/menu/key.png');

/**
 * Confirmation after forgot-password email was requested.
 */
const SecretCodeRecoverySentScreen = ({email, onBack}) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, {paddingTop: insets.top + 10}]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onBack}
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
          <Text style={styles.cardTitle}>הסיסמה בדרך אליך!</Text>
          <Text style={styles.subLine}>שלחנו אליך מייל עם הסיסמה לכתובת</Text>
          <Text style={styles.emailBold}>{email || ''}</Text>
          <Text style={styles.hint}>
            אנא בדוק את תיבת הדואר הנכנס שלך{'\n'}(וגם את תיקיית הספאם).
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onBack}
            style={styles.btnWrap}>
            <LinearGradient
              colors={['#FEE787', '#BD9947', '#9C6522']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.btnGradient}>
              <Text style={styles.btnText}>חזור</Text>
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
    fontSize: 28,
    lineHeight: 31,
    fontFamily: 'Rubik-SemiBold',
    textAlign: 'center',
    marginBottom: 24,
  },
  subLine: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 0,
  },
  emailBold: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
  hint: {
    color: '#9E9DA4',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.15,
    textAlign: 'center',
    marginBottom: 26,
  },
  btnWrap: {
    borderRadius: 1000,
    overflow: 'hidden',
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
    fontFamily: 'Rubik-Medium',
    letterSpacing: 0.2,
  },
});

export default SecretCodeRecoverySentScreen;
