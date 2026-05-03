import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';

/** Figma 15:10070 — success icon: profile/like.png (40×40). */
const BG = '#2B2A39';
const CREAM = '#F7F3E6';
const GOLD_GRADIENT = ['#FEE787', '#BD9947', '#9C6522'];
const GOLD_GRADIENT_LOCATIONS = [0.0456, 0.5076, 0.8831];

const CompanyReportSuccessModal = ({visible, onDismiss}) => {
  const {width: winW} = useWindowDimensions();
  const maxW = Math.min(366, winW - 48);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}>
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onDismiss}
          accessibilityLabel="סגור"
        />
        <View style={[styles.card, {width: maxW}]}>
          <Image
            source={require('../assets/profile/like.png')}
            style={styles.icon}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <Text style={styles.title}>הדיווח התקבל</Text>
          <View style={styles.bodyWrap}>
            <Text style={styles.bodyLine}>תודה רבה על שיתוף הפעולה!</Text>
            <Text style={[styles.bodyLine, styles.bodyLineSecond]}>
              אנו מאד מעריכים שהקדשת מזמנך.
            </Text>
          </View>
          <Pressable
            onPress={onDismiss}
            style={styles.btnOuter}
            accessibilityRole="button"
            accessibilityLabel="המשך">
            <LinearGradient
              colors={GOLD_GRADIENT}
              locations={GOLD_GRADIENT_LOCATIONS}
              start={{x: 0.5, y: 0}}
              end={{x: 0.5, y: 1}}
              style={styles.btnGradient}>
              <Text style={styles.btnText}>המשך</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    zIndex: 1,
    backgroundColor: BG,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
  },
  icon: {
    width: 40,
    height: 40,
    marginBottom: 33,
  },
  title: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 28,
    lineHeight: 31,
    color: CREAM,
    textAlign: 'center',
    marginBottom: 33,
  },
  bodyWrap: {
    alignItems: 'center',
    marginBottom: 33,
  },
  bodyLineSecond: {
    marginTop: 4,
  },
  bodyLine: {
    fontFamily: 'Rubik-Regular',
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  btnOuter: {
    width: '100%',
    maxWidth: 306,
    borderRadius: 1000,
    overflow: 'hidden',
  },
  btnGradient: {
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  btnText: {
    fontFamily: 'Rubik-Medium',
    fontSize: 20,
    letterSpacing: 0.2,
    color: '#1E1D27',
  },
});

export default CompanyReportSuccessModal;
