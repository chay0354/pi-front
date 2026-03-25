import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  Animated,
  Easing,
} from 'react-native';
import {Colors, BorderRadius} from '../constants/styles';
import {getListings} from '../utils/api';
import {
  rankListingsByQuery,
  buildAnswerText,
} from '../utils/piAiMatchListings';

const {width: WIN_W, height: WIN_H} = Dimensions.get('window');

/**
 * Almost full-screen “Pi AI” modal: describe a property, search all published listings, text answer.
 */
const PiAiSearchModal = ({visible, onClose}) => {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const spinAnim = useRef(new Animated.Value(0)).current;
  const sheetScale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    if (!visible) {
      spinAnim.setValue(0);
      sheetScale.setValue(0.94);
      return;
    }

    spinAnim.setValue(0);
    sheetScale.setValue(0.94);

    const spin = Animated.timing(spinAnim, {
      toValue: 1,
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    const pop = Animated.spring(sheetScale, {
      toValue: 1,
      friction: 7,
      tension: 80,
      useNativeDriver: true,
    });

    Animated.parallel([spin, pop]).start();
  }, [visible, spinAnim, sheetScale]);

  const sheetSpin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const runSearch = useCallback(async () => {
    const q = query.trim();
    setError('');
    setAnswer('');
    if (!q) {
      setAnswer(
        'תאר בקצרה איזה נכס אתה מחפש (עיר, מחיר, חדרים, סוג נכס), ואז לחץ שוב על חיפוש.',
      );
      return;
    }

    setLoading(true);
    try {
      const result = await getListings({status: 'published'});
      const listings = result?.listings || [];
      const rankedResult = rankListingsByQuery(q, listings, {topN: 6});
      const text = buildAnswerText(q, rankedResult, listings.length);
      setAnswer(text);
    } catch (e) {
      setError(e?.message || 'שגיאה בטעינת המודעות. בדוק חיבור לשרת.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleClose = () => {
    setError('');
    setAnswer('');
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}>
          <Animated.View
            style={[
              styles.sheet,
              {
                transform: [
                  {scale: sheetScale},
                  {rotate: sheetSpin},
                ],
              },
            ]}>
            <View style={styles.headerRow}>
              <View style={styles.headerLogoWrap} pointerEvents="none">
                <Image
                  source={require('../assets/pi-ai.png')}
                  style={styles.headerLogo}
                  resizeMode="contain"
                  accessibilityLabel="Pi AI"
                />
              </View>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={12}
                style={styles.closeBtn}
                accessibilityLabel="סגור">
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>
              תאר איזה נכס אתה מחפש — נחפש בכל המודעות במערכת ונסכם את ההתאמות
              הקרובות ביותר.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="לדוגמה: דירת 4 חדרים בתל אביב עד 3 מיליון, למכירה…"
              placeholderTextColor={Colors.grey200}
              value={query}
              onChangeText={setQuery}
              multiline
              textAlignVertical="top"
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.searchBtn, loading && styles.searchBtnDisabled]}
              onPress={runSearch}
              disabled={loading}
              activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color="#1e1d27" />
              ) : (
                <Text style={styles.searchBtnText}>חיפוש</Text>
              )}
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <ScrollView
              style={styles.answerScroll}
              contentContainerStyle={styles.answerContent}
              keyboardShouldPersistTaps="handled">
              {answer ? (
                <Text style={styles.answerText}>{answer}</Text>
              ) : (
                !loading && (
                  <Text style={styles.hintText}>
                    התוצאה תופיע כאן לאחר החיפוש (טקסט בלבד, לפי דמיון למילות
                    מפתח במודעות).
                  </Text>
                )
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const SHEET_W = Math.min(WIN_W - 24, 520);
const SHEET_H = Math.min(WIN_H * 0.9, WIN_H - 24);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  keyboardWrap: {
    width: '100%',
    maxWidth: SHEET_W,
    maxHeight: SHEET_H,
  },
  sheet: {
    width: '100%',
    maxHeight: SHEET_H,
    backgroundColor: '#2a2838',
    borderRadius: BorderRadius.roundCorner2XL,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,196,10,0.35)',
  },
  headerRow: {
    position: 'relative',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerLogoWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 200,
    height: 48,
    maxWidth: '85%',
  },
  closeBtn: {
    position: 'absolute',
    end: 0,
    top: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  closeBtnText: {
    color: Colors.white100,
    fontSize: 18,
    fontWeight: '400',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  input: {
    minHeight: 100,
    maxHeight: 140,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.roundCornerXL,
    padding: 12,
    color: Colors.white100,
    fontSize: 15,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  searchBtn: {
    backgroundColor: Colors.yellowTextCTA,
    paddingVertical: 14,
    borderRadius: BorderRadius.roundCornerXL,
    alignItems: 'center',
    marginBottom: 10,
  },
  searchBtnDisabled: {
    opacity: 0.7,
  },
  searchBtnText: {
    color: '#1e1d27',
    fontSize: 17,
    fontWeight: '700',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 8,
  },
  answerScroll: {
    flexGrow: 0,
    maxHeight: SHEET_H * 0.42,
    minHeight: 120,
  },
  answerContent: {
    paddingBottom: 8,
  },
  answerText: {
    color: Colors.white100,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  hintText: {
    color: Colors.grey200,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default PiAiSearchModal;
