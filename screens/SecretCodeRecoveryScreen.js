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
import {Colors, BorderRadius, Spacing} from '../constants/styles';
import {recoverSubscriberCodeByEmail} from '../utils/api';

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
          <View style={styles.keyImageWrap}>
            <Image
              source={require('../assets/key.png')}
              style={styles.keyImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.cardTitle}>שכחת את הקוד?</Text>
          <Text style={styles.cardBody}>
            לא נורא, הזן את כתובת המייל המשויכת לחשבונך, ואנו נשלח לך את קוד המנוי שלך.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="כתובת מייל"
            placeholderTextColor={Colors.grey200}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textAlign="right"
          />

          <Text style={styles.promo}>הזן מייל לקבלת קוד חינם לחצי שנה</Text>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!canSend}
            onPress={handleSend}
            style={[styles.btnWrap, !canSend && styles.btnWrapDisabled]}>
            <LinearGradient
              colors={canSend ? ['#c9a227', '#8b6914'] : ['#4a4a55', '#3a3a44']}
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
    marginBottom: 12,
  },
  cardBody: {
    color: Colors.grey200,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#8c85b3',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    color: Colors.white100,
    fontSize: 16,
    marginBottom: 10,
    backgroundColor: '#23222c',
  },
  promo: {
    color: Colors.yellowIcons,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
  },
  btnWrap: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  btnWrapDisabled: {
    opacity: 0.85,
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
  btnTextDisabled: {
    color: '#888',
  },
});

export default SecretCodeRecoveryScreen;
