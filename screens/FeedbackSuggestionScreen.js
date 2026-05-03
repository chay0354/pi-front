import React, {useContext, useState} from 'react';
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
import {Colors} from '../constants/styles';
import {ContextHook} from '../hooks/ContextHook';
import {submitImprovementFeedback, toSubscriptionId} from '../utils/api';
import RatingImprovePicker from '../components/RatingImprovePicker';
import {resolveBundledAssetSource} from '../utils/bundledAsset';

const thanksEndImage = require('../assets/improve/end.png');
const sendButtonImage = require('../assets/improve/send-button.png');

/**
 * On web, RN's Image (background-based div) often does not paint inside touchables;
 * a plain <img> with the bundled URI is reliable.
 */
const BundledPng = ({source, style, resizeMode = 'contain'}) => {
  if (Platform.OS === 'web') {
    const flat = StyleSheet.flatten(style) || {};
    const resolved = resolveBundledAssetSource(source) || {};
    const {uri, width: iw, height: ih} = resolved;
    if (!uri) {
      return <Image source={source} style={style} resizeMode={resizeMode} />;
    }
    const objectFit = resizeMode === 'cover' ? 'cover' : 'contain';
    const boxHeight = flat.height != null ? flat.height : flat.minHeight;
    return (
      <img
        alt=""
        src={uri}
        width={typeof iw === 'number' ? iw : undefined}
        height={typeof ih === 'number' ? ih : undefined}
        draggable={false}
        style={{
          display: 'block',
          boxSizing: 'border-box',
          width: flat.width ?? '100%',
          height: boxHeight,
          minHeight: flat.minHeight,
          maxWidth: flat.maxWidth,
          objectFit,
          userSelect: 'none',
          pointerEvents: 'none',
          opacity: flat.opacity == null ? 1 : flat.opacity,
        }}
      />
    );
  }
  return <Image source={source} style={style} resizeMode={resizeMode} />;
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

  const hasFeedbackText = message.trim() !== '';
  const showImageSendButton = hasFeedbackText && rating >= 1;
  const sendDisabled = submitting || rating < 1 || !hasFeedbackText;

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

          <TouchableOpacity
            activeOpacity={0.92}
            onPress={onClose}
            style={styles.thanksEndTap}
            accessibilityRole="button"
            accessibilityLabel="חזור">
            <View style={styles.thanksEndImageShell}>
              <BundledPng
                source={thanksEndImage}
                style={styles.thanksEndImage}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>
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

          <RatingImprovePicker
            value={rating}
            onChange={setRating}
            style={styles.ratingPicker}
          />

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
            activeOpacity={0.88}
            onPress={handleSubmit}
            disabled={sendDisabled}
            style={styles.submitBtnOuter}
            accessibilityRole="button"
            accessibilityLabel="שלח משוב"
            accessibilityState={{disabled: sendDisabled}}>
            {showImageSendButton ? (
              <View style={styles.sendButtonImageShell}>
                <BundledPng
                  source={sendButtonImage}
                  style={[
                    styles.sendButtonImage,
                    submitting && styles.sendButtonImageDisabled,
                  ]}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View
                style={[
                  styles.submitBtn,
                  (submitting || rating < 1 || !hasFeedbackText) &&
                    styles.submitBtnDisabled,
                ]}>
                <Text style={styles.submitBtnText}>שלח משוב</Text>
              </View>
            )}
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
  /** Single bar image (improve/0..5); matches profile review picker. */
  ratingPicker: {
    width: 270,
    maxWidth: '100%',
    alignSelf: 'center',
    marginBottom: 24,
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
  submitBtnOuter: {
    width: '100%',
  },
  /** Fixed box so web does not collapse the CTA under TouchableOpacity. */
  sendButtonImageShell: {
    width: '100%',
    height: 56,
    position: 'relative',
  },
  sendButtonImage: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    width: '100%',
    height: 56,
    zIndex: 0,
    ...Platform.select({web: {display: 'block', userSelect: 'none'}, default: {}}),
  },
  sendButtonImageDisabled: {
    opacity: 0.45,
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
  /** Thanks step: no card — image sits on root (blue) background. */
  thanksEndTap: {
    width: '100%',
    alignItems: 'center',
  },
  thanksEndImageShell: {
    width: '100%',
    maxWidth: 330,
    minHeight: 280,
    alignSelf: 'center',
  },
  thanksEndImage: {
    width: '100%',
    minHeight: 280,
  },
});

export default FeedbackSuggestionScreen;
