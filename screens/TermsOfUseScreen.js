import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {TERMS_OF_USE_HEBREW} from './termsOfUseContent';
import {hasAcceptedTerms} from '../utils/onboardingStorage';

/** Figma 280:9201 — gold gradient pill (top→bottom). */
const GOLD_GRADIENT = ['#FFE56A', '#F7C63A', '#E5A80F'];
const GOLD_GRADIENT_LOCS = [0.0456, 0.5076, 0.8831];

/** Inline link phrase → scrolls to the privacy section below. */
const PRIVACY_LINK_TEXT = 'מדיניות הפרטיות של החברה';
/** Heading of the privacy section inside the terms body (note original spelling). */
const PRIVACY_SECTION_HEADING = 'שימוש החברה במידע ומדינות הפרטיות';

/** Split the terms text into: before-link, link, after-link-up-to-privacy, privacy-section. */
function buildTermsSegments() {
  const text = TERMS_OF_USE_HEBREW;
  const sectionIdx = text.indexOf(PRIVACY_SECTION_HEADING);
  const head = sectionIdx >= 0 ? text.slice(0, sectionIdx) : text;
  const privacySection = sectionIdx >= 0 ? text.slice(sectionIdx) : '';
  const linkIdx = head.indexOf(PRIVACY_LINK_TEXT);
  if (linkIdx < 0) {
    return {beforeLink: head, link: '', afterLink: '', privacySection};
  }
  return {
    beforeLink: head.slice(0, linkIdx),
    link: PRIVACY_LINK_TEXT,
    afterLink: head.slice(linkIdx + PRIVACY_LINK_TEXT.length),
    privacySection,
  };
}

const TERMS_SEGMENTS = buildTermsSegments();

/**
 * Full terms of use — black text on white, RTL Hebrew.
 * mode="accept": after onboarding the user MUST tick the checkbox and press סגור
 * to continue; there is no way to leave without accepting (no back, hardware back blocked).
 * mode="view" (default): opened from Settings with a back button, no acceptance gate.
 */
const TermsOfUseScreen = ({onClose, mode = 'view', onAccept}) => {
  const insets = useSafeAreaInsets();
  const isAcceptMode = mode === 'accept';
  const [agreed, setAgreed] = useState(false);
  const scrollRef = useRef(null);
  const privacyYRef = useRef(0);

  const scrollToPrivacy = () => {
    scrollRef.current?.scrollTo({y: Math.max(privacyYRef.current - 12, 0), animated: true});
  };

  // If the user already accepted (e.g. opened from Settings), pre-fill the checkbox.
  useEffect(() => {
    let active = true;
    hasAcceptedTerms().then(accepted => {
      if (active && accepted) setAgreed(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // In accept mode (onboarding gate), block the Android hardware back so it can't be skipped.
  useEffect(() => {
    if (!isAcceptMode) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [isAcceptMode]);

  const handleAccept = () => {
    if (!agreed) return;
    if (onAccept) {
      onAccept();
    } else {
      onClose?.();
    }
  };

  return (
    <View style={[styles.root, {writingDirection: 'rtl'}]}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, {paddingTop: insets.top}]}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.backBtn} />
          <Text style={styles.headerTitle} numberOfLines={2}>
            תנאי שימוש — פאי 2701
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={styles.body}>
          {TERMS_SEGMENTS.beforeLink}
          {TERMS_SEGMENTS.link ? (
            <Text style={styles.link} onPress={scrollToPrivacy}>
              {TERMS_SEGMENTS.link}
            </Text>
          ) : null}
          {TERMS_SEGMENTS.afterLink}
        </Text>

        {TERMS_SEGMENTS.privacySection ? (
          <View
            onLayout={e => {
              privacyYRef.current = e.nativeEvent.layout.y;
            }}>
            <Text style={styles.body}>{TERMS_SEGMENTS.privacySection}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, {paddingBottom: insets.bottom + 24}]}>
        <View style={styles.footerInner}>
            <TouchableOpacity
              style={styles.checkboxRow}
              activeOpacity={0.8}
              onPress={() => setAgreed(prev => !prev)}>
              <Text style={styles.checkboxLabel}>
                אני מסכים לתנאי השימוש ולמדיניות הפרטיות
              </Text>
              <View
                style={[
                  styles.checkbox,
                  agreed && styles.checkboxChecked,
                ]}>
                {agreed ? (
                  <MaterialCommunityIcons
                    name="check"
                    size={14}
                    color="#1E1D27"
                  />
                ) : null}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleAccept}
              disabled={!agreed}
              style={[styles.ctaWrap, !agreed && styles.ctaDisabled]}>
              <LinearGradient
                colors={GOLD_GRADIENT}
                locations={GOLD_GRADIENT_LOCS}
                start={{x: 0.5, y: 0}}
                end={{x: 0.5, y: 1}}
                style={styles.cta}>
                <Text style={styles.ctaText}>סגור</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backChevron: {
    fontSize: 28,
    color: '#000000',
    fontWeight: '300',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  headerSpacer: {
    width: 40,
  },
  body: {
    color: '#000000',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'left',
    writingDirection: 'rtl',
    backgroundColor: '#ffffff',
  },
  link: {
    color: '#2D7DF0',
    textDecorationLine: 'underline',
  },
  footer: {
    backgroundColor: '#1E1D27',
    paddingTop: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  footerInner: {
    width: 296,
    gap: 24,
    alignItems: 'center',
  },
  checkboxRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 14,
  },
  checkboxLabel: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.54,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#E7992D',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#FEE787',
    borderColor: '#FEE787',
  },
  ctaWrap: {
    width: 292,
    height: 44,
    borderRadius: 846,
    overflow: 'hidden',
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  cta: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#1E1D27',
    fontSize: 20,
    fontWeight: '500',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});

export default TermsOfUseScreen;
