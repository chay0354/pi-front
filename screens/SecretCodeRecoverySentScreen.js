import React from 'react';
import {View, ScrollView, Text, TouchableOpacity, StyleSheet, Platform, Image} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Colors, BorderRadius, Spacing} from '../constants/styles';

/**
 * Confirmation after requesting מספר מנוי by email
 */
const SecretCodeRecoverySentScreen = ({email, onBack}) => {
  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={12}>
            <Text style={styles.backChevron}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>שחזור קוד סודי</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.card}>
          <KeyIcon />
          <Text style={styles.cardTitle}>הקוד בדרך אליך!</Text>
          <Text style={styles.subLine}>שלחנו את קוד המנוי שלך לכתובת</Text>
          <Text style={styles.emailBold}>{email || ''}</Text>
          <Text style={styles.hint}>
            אנא בדוק את תיבת הדואר הנכנס שלך (וגם את תיקיית הספאם).
          </Text>

          <TouchableOpacity activeOpacity={0.85} onPress={onBack} style={styles.btnWrap}>
            <LinearGradient
              colors={['#c9a227', '#8b6914']}
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
    paddingTop: Platform.OS === 'web' ? 48 : 56,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backChevron: {
    color: Colors.white100,
    fontSize: 36,
    fontWeight: '300',
    marginTop: -4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: Colors.white100,
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
  },
  headerSpacer: {width: 44},
  card: {
    backgroundColor: '#2a2933',
    borderRadius: BorderRadius.roundCorner2XL || 20,
    padding: 24,
    alignItems: 'stretch',
  },
  keyImageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    height: 72,
  },
  keyImage: {
    width: 72,
    height: 72,
  },
  cardTitle: {
    color: Colors.white100,
    fontSize: 22,
    fontFamily: 'Rubik-Bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  subLine: {
    color: Colors.white100,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  emailBold: {
    color: Colors.white100,
    fontSize: 18,
    fontFamily: 'Rubik-Bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  hint: {
    color: Colors.grey200,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  btnWrap: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  btnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
  },
  btnText: {
    color: '#1e1d27',
    fontSize: 18,
    fontFamily: 'Rubik-Bold',
  },
});

export default SecretCodeRecoverySentScreen;
