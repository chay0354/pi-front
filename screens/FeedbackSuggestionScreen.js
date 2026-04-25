import React, {useContext, useState} from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import Svg, {Defs, LinearGradient as SvgLinearGradient, Path, Stop} from 'react-native-svg';
import {Colors} from '../constants/styles';
import {ContextHook} from '../hooks/ContextHook';
import {submitImprovementFeedback, toSubscriptionId} from '../utils/api';

const TEAL = '#2DD4BF';

// Local SVG rating stars — instant state changes, identical sizing, no remote fetch.
const STAR_PATH =
  'M13.5449 0.760714C14.2554 -0.25357 15.7446 -0.253572 16.4551 0.760712L20.4041 7.29935C20.6303 7.62228 20.9553 7.86099 21.3291 7.97861L28.7463 10.0321C29.9203 10.4015 30.3805 11.8329 29.6456 12.8292L24.669 18.367C24.435 18.6842 24.3109 19.0704 24.3157 19.4661L25.2912 28.1747C25.3063 29.4173 24.1015 30.3019 22.9369 29.9034L15.5717 27.6881C15.2009 27.5612 14.7991 27.5612 14.4283 27.6881L7.06314 29.9034C5.89846 30.3019 4.69366 29.4173 4.7088 28.1747L5.68432 19.4661C5.68914 19.0704 5.56497 18.6842 5.33097 18.367L0.354447 12.8292C-0.380505 11.8329 0.079687 10.4015 1.25372 10.0321L8.67086 7.97861C9.04466 7.86099 9.36975 7.62228 9.59594 7.29935L13.5449 0.760714Z';
/** Gold gradient used across the Figma design system (ratings, gold pills, rings). */
const STAR_GRADIENT_COLORS = ['#FEE787', '#BD9947', '#9C6522'];
const STAR_OUTLINE_COLOR = '#8C85B3';
const STAR_SIZE = 34.892;

const RatingStar = ({active}) => {
  const gradientId = 'rating-star-grad-active';
  return (
    <Svg width={STAR_SIZE} height={STAR_SIZE} viewBox="-2 -2 34 34">
      {active ? (
        <Defs>
          <SvgLinearGradient
            id={gradientId}
            x1="0"
            y1="0"
            x2="30"
            y2="30"
            gradientUnits="userSpaceOnUse">
            <Stop offset="0.0456" stopColor={STAR_GRADIENT_COLORS[0]} />
            <Stop offset="0.5076" stopColor={STAR_GRADIENT_COLORS[1]} />
            <Stop offset="0.8831" stopColor={STAR_GRADIENT_COLORS[2]} />
          </SvgLinearGradient>
        </Defs>
      ) : null}
      <Path
        d={STAR_PATH}
        fill={active ? `url(#${gradientId})` : 'transparent'}
        stroke={active ? 'transparent' : STAR_OUTLINE_COLOR}
        strokeWidth={active ? 0 : 1.5}
      />
    </Svg>
  );
};

/**
 * הצעות לשיפור — rating + text, then thank-you step
 */
const FeedbackSuggestionScreen = ({onClose}) => {
  const {currentUser} = useContext(ContextHook);
  const [step, setStep] = useState('form');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting || rating < 1 || !message.trim()) return;
    setSubmitting(true);
    const creatorName =
      (currentUser?.name && String(currentUser.name).trim()) ||
      (currentUser?.contact_person_name &&
        String(currentUser.contact_person_name).trim()) ||
      (currentUser?.business_name && String(currentUser.business_name).trim()) ||
      (currentUser?.broker_office_name &&
        String(currentUser.broker_office_name).trim()) ||
      null;
    const result = await submitImprovementFeedback({
      rating,
      improvementText: message,
      creatorSubscriptionId: toSubscriptionId(currentUser?.id),
      creatorEmail: currentUser?.email || null,
      creatorName,
      creatorSubscriptionType: currentUser?.subscription_type || null,
      creatorSubscriberNumber: currentUser?.subscriber_number || null,
      sourceScreen: 'feedbackSuggestion',
    });
    setSubmitting(false);
    if (!result.success) {
      Alert.alert('', 'לא הצלחנו לשלוח את המשוב. נסה שוב.');
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
          <Text style={styles.rateHint}>דרג את החווייה שלך</Text>

          <View style={styles.starsSection}>
            <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => {
              const active = rating >= star;
              return (
                <TouchableOpacity
                  key={star}
                  onPressIn={() => setRating(star)}
                  onPress={() => setRating(star)}
                  style={styles.starHit}
                  hitSlop={8}
                  activeOpacity={0.8}>
                  <View style={styles.starStack}>
                    <RatingStar rank={star} active={active} />
                    <View style={styles.starNumberWrap} pointerEvents="none">
                      <Text
                        style={[styles.starNumber, active && styles.starNumberActive]}>
                        {star}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
            </View>
          </View>

          <Text style={styles.feedbackHint}>
            נשמח לשמוע מה חשבת ואיך נוכל להשתפר.
          </Text>

          <TextInput
            style={styles.textArea}
            placeholder="כתוב משוב"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
            textAlign="right"
          />

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSubmit}
            disabled={submitting || rating < 1 || !message.trim()}
            style={[
              styles.submitBtn,
              (submitting || rating < 1 || !message.trim()) && styles.submitBtnDisabled,
            ]}>
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
    paddingTop: Platform.OS === 'web' ? 43 : 50,
    paddingHorizontal: 24,
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
  },
  question: {
    color: '#F7F3E6',
    fontSize: 28,
    lineHeight: 31,
    fontFamily: 'Rubik-SemiBold',
    textAlign: 'center',
    marginBottom: 12,
  },
  rateHint: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 32,
    textAlign: 'center',
    marginBottom: 12,
  },
  starsSection: {
    paddingHorizontal: 0,
    marginBottom: 24,
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: 270,
  },
  starHit: {
    width: 54.892,
    height: 54.892,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starStack: {
    width: 34.892,
    height: 34.892,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starNumberWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starNumber: {
    color: '#E0B040',
    fontSize: 16,
    lineHeight: 18,
    textAlign: 'center',
    fontFamily: 'Rubik-Regular',
    includeFontPadding: false,
  },
  starNumberActive: {
    color: '#1e1d27',
    fontFamily: 'Rubik-Medium',
  },
  feedbackHint: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 32,
    textAlign: 'center',
    marginBottom: 18,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#8c85b3',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 16,
    color: Colors.white100,
    fontSize: 20,
    lineHeight: 24,
    minHeight: 98,
    backgroundColor: '#2b2a39',
    marginBottom: 18,
    letterSpacing: 0.2,
  },
  submitBtn: {
    backgroundColor: '#4d4966',
    borderRadius: 1000,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: Colors.white100,
    fontSize: 20,
    fontFamily: 'Rubik-Medium',
    letterSpacing: 0.2,
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
