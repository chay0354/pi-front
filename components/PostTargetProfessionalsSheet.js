import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Platform,
  Dimensions,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {PROFESSIONAL_FILTER_TYPES} from '../utils/constant';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');
const SHEET_HEIGHT = Math.min(560, Math.round(SCREEN_HEIGHT * 0.72));

const GOLD_GRADIENT = ['#FEE787', '#BD9947', '#9C6522'];
const GOLD_GRADIENT_LOCATIONS = [0.0456, 0.5076, 0.8831];

/**
 * Shown right before a new feed post is published. Lets the poster tag the post
 * with professional types so matching `professional` subscriptions get a chat
 * notification from the system "עדכונים על פוסטים רלוונטים" account.
 */
const PostTargetProfessionalsSheet = ({visible, onSkip, onConfirm, submitting = false}) => {
  const insets = useSafeAreaInsets();
  const [selectedTypes, setSelectedTypes] = useState([]);
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const overlay = useRef(new Animated.Value(0)).current;
  const baseSheetPaddingBottom = Platform.OS === 'ios' ? 28 : 16;
  const sheetPaddingBottom =
    insets.bottom > 0
      ? baseSheetPaddingBottom + insets.bottom
      : baseSheetPaddingBottom;

  useEffect(() => {
    if (!visible) return;
    setSelectedTypes([]);
    Animated.parallel([
      Animated.timing(overlay, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, overlay, translateY]);

  const toggleType = type => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type],
    );
  };

  const handleSkip = () => {
    if (submitting) return;
    if (typeof onSkip === 'function') onSkip();
  };

  const handleConfirm = () => {
    if (submitting) return;
    if (typeof onConfirm === 'function') onConfirm(selectedTypes);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleSkip}
      statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.overlay, {opacity: overlay}]}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleSkip}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {transform: [{translateY}], paddingBottom: sheetPaddingBottom},
          ]}>
          <View style={styles.grabberWrap}>
            <View style={styles.grabber} />
          </View>

          <Text style={styles.title}>הפוסט הזה רלוונטי לבעלי מקצוע?</Text>
          <Text style={[styles.subtitle, {textAlign: 'left'}]}>
            בחר אחד או יותר מהתחומים הבאים ובעלי מקצוע רשומים בתחום יקבלו הודעה
            בצ׳אט על הפוסט שלך, או המשך לפרסום בלי לתייג
          </Text>

          <ScrollView
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsWrap}
            showsVerticalScrollIndicator={false}>
            {PROFESSIONAL_FILTER_TYPES.map(type => {
              const isSelected = selectedTypes.includes(type);
              return (
                <TouchableOpacity
                  key={type}
                  activeOpacity={0.85}
                  disabled={submitting}
                  onPress={() => toggleType(type)}
                  style={styles.chipTouchable}>
                  {isSelected ? (
                    <LinearGradient
                      colors={GOLD_GRADIENT}
                      locations={GOLD_GRADIENT_LOCATIONS}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 1}}
                      style={styles.chipSelected}>
                      <MaterialCommunityIcons
                        name="check"
                        size={14}
                        color="#1E1D27"
                      />
                      <Text style={styles.chipSelectedText}>{type}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>{type}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={submitting}
              onPress={handleSkip}
              style={styles.skipBtn}>
              <Text style={styles.skipBtnText}>לא, המשך לפרסום</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={submitting || selectedTypes.length === 0}
              onPress={handleConfirm}
              style={[
                styles.confirmBtnWrap,
                selectedTypes.length === 0 && styles.confirmBtnWrapDisabled,
              ]}>
              <LinearGradient
                colors={GOLD_GRADIENT}
                locations={GOLD_GRADIENT_LOCATIONS}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.confirmBtn}>
                <Text style={styles.confirmBtnText}>פרסם ושלח לבעלי מקצוע</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    backgroundColor: '#1E1D27',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  grabberWrap: {alignItems: 'center', paddingVertical: 6},
  grabber: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
    marginTop: 10,
    writingDirection: 'rtl',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 16,
    writingDirection: 'rtl',
  },
  chipsScroll: {flex: 1},
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 8,
  },
  chipTouchable: {},
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#2B2A39',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  chipText: {
    color: '#fff',
    fontSize: 14,
    writingDirection: 'rtl',
  },
  chipSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  chipSelectedText: {
    color: '#1E1D27',
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    writingDirection: 'rtl',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  skipBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#2B2A39',
  },
  skipBtnText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    writingDirection: 'rtl',
  },
  confirmBtnWrap: {
    flex: 1.4,
    borderRadius: 14,
    overflow: 'hidden',
  },
  confirmBtnWrapDisabled: {
    opacity: 0.45,
  },
  confirmBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  confirmBtnText: {
    color: '#1E1D27',
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    writingDirection: 'rtl',
  },
});

export default PostTargetProfessionalsSheet;
