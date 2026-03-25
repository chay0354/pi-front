import React, {useState} from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Colors, BorderRadius, Spacing} from '../constants/styles';

const TEAL = '#2DD4BF';

const isWeb = Platform.OS === 'web';
const baseUrl = isWeb && typeof window !== 'undefined' ? window.location.origin : '';

/** Pressed / selected stars (yellow, numbered) — native: require; web: public/starts (see UserProfileScreen) */
const pressedStarImages = [
  require('../assets/starts/1.png'),
  require('../assets/starts/2.png'),
  require('../assets/starts/3.png'),
  require('../assets/starts/4.png'),
  require('../assets/starts/5.png'),
];
const pressedStarWebSources =
  isWeb && typeof window !== 'undefined'
    ? [1, 2, 3, 4, 5].map(i => ({uri: `${baseUrl}/starts/${i}.png`}))
    : null;

/** Not pressed (outline) — native: require; web: public/not-pressed-starts/outline-*.png */
const notPressedStarImages = [
  require('../assets/not-pressed-starts/outline-1.png'),
  require('../assets/not-pressed-starts/outline-2.png'),
  require('../assets/not-pressed-starts/outline-3.png'),
  require('../assets/not-pressed-starts/outline-4.png'),
  require('../assets/not-pressed-starts/outline-5.png'),
];
const notPressedStarWebSources =
  isWeb && typeof window !== 'undefined'
    ? [1, 2, 3, 4, 5].map(i => ({
        uri: `${baseUrl}/not-pressed-starts/outline-${i}.png`,
      }))
    : null;

function getPressedStarSource(index) {
  const i = Math.min(4, Math.max(0, index));
  if (pressedStarWebSources) return pressedStarWebSources[i];
  return pressedStarImages[i];
}

function getNotPressedStarSource(index) {
  const i = Math.min(4, Math.max(0, index));
  if (notPressedStarWebSources) return notPressedStarWebSources[i];
  return notPressedStarImages[i];
}

/**
 * הצעות לשיפור — rating + text, then thank-you step
 */
const FeedbackSuggestionScreen = ({onClose}) => {
  const [step, setStep] = useState('form');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (rating < 1) {
      Alert.alert('', 'אנא דרג את החוויה (1–5 כוכבים)');
      return;
    }
    setStep('thanks');
  };

  if (step === 'thanks') {
    return (
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn} hitSlop={12}>
              <Text style={styles.backChevron}>{'‹'}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>הצעות לשיפור</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.card}>
            <View style={styles.successIconWrap}>
              <Text style={styles.successCheck}>✓</Text>
            </View>
            <Text style={styles.thanksTitle}>!תודה רבה</Text>
            <Text style={styles.thanksSub}>
              המשוב שלך חשוב לנו ועוזר לנו להשתפר
            </Text>

            <TouchableOpacity activeOpacity={0.85} onPress={onClose} style={styles.btnWrap}>
              <LinearGradient
                colors={['#c9a227', '#8b6914']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.btnGradientGold}>
                <Text style={styles.btnTextGold}>חזור</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>הצעות לשיפור</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.card}>
          <Text style={styles.question}>נהנית מהחוויה?</Text>
          <Text style={styles.rateHint}>דרג את החוויה שלך</Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => {
              const active = rating >= star;
              const source = active
                ? getPressedStarSource(star - 1)
                : getNotPressedStarSource(star - 1);
              return (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starHit}
                  hitSlop={8}
                  activeOpacity={0.8}>
                  <Image source={source} style={styles.starImg} resizeMode="contain" />
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.feedbackHint}>
            נשמח לשמוע מה חשבת ואיך נוכל להשתפר.
          </Text>

          <TextInput
            style={styles.textArea}
            placeholder="כתוב משוב"
            placeholderTextColor={Colors.grey200}
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
            textAlign="right"
          />

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSubmit}
            style={styles.submitBtn}>
            <Text style={styles.submitBtnText}>שלח משוב</Text>
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
    marginBottom: 24,
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
  question: {
    color: Colors.white100,
    fontSize: 22,
    fontFamily: 'Rubik-Bold',
    textAlign: 'right',
    marginBottom: 8,
  },
  rateHint: {
    color: Colors.white100,
    fontSize: 15,
    textAlign: 'right',
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  starHit: {
    padding: 4,
  },
  starImg: {
    width: 48,
    height: 48,
  },
  feedbackHint: {
    color: Colors.white100,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'right',
    marginBottom: 16,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#8c85b3',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: Colors.white100,
    fontSize: 16,
    minHeight: 120,
    backgroundColor: '#23222c',
    marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: '#3d3c48',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: Colors.white100,
    fontSize: 17,
    fontFamily: 'Rubik-Bold',
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: TEAL,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successCheck: {
    color: '#1e1d27',
    fontSize: 36,
    fontWeight: '700',
  },
  thanksTitle: {
    color: Colors.white100,
    fontSize: 24,
    fontFamily: 'Rubik-Bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  thanksSub: {
    color: Colors.white100,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  btnWrap: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  btnGradientGold: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
  },
  btnTextGold: {
    color: '#1e1d27',
    fontSize: 18,
    fontFamily: 'Rubik-Bold',
  },
});

export default FeedbackSuggestionScreen;
