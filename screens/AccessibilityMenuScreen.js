import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Colors, FontSizes} from '../constants/styles';
import {useAccessibility} from '../hooks/AccessibilityContext';
import {
  DEFAULT_ACCESSIBILITY_PREFS,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  stepFontScale,
} from '../utils/accessibilityPrefs';

const A11Y_EMAIL = 'info@pi2701.co.il';

const ToggleRow = ({label, description, value, onToggle, last = false}) => (
  <TouchableOpacity
    style={[styles.row, !last && styles.rowDivider]}
    onPress={onToggle}
    activeOpacity={0.8}
    accessibilityRole="switch"
    accessibilityState={{checked: value}}
    accessibilityLabel={label}
    accessibilityHint={description}>
    <MaterialCommunityIcons
      name={value ? 'toggle-switch' : 'toggle-switch-off-outline'}
      size={36}
      color={value ? '#FEE787' : '#8C85B3'}
    />
    <View style={styles.rowTextCol}>
      <Text style={styles.rowTitle}>{label}</Text>
      {description ? <Text style={styles.rowHint}>{description}</Text> : null}
    </View>
  </TouchableOpacity>
);

const prefsEqual = (a, b) =>
  a.fontScale === b.fontScale &&
  a.highContrast === b.highContrast &&
  a.readableFont === b.readableFont &&
  a.highlightLinks === b.highlightLinks &&
  a.reduceMotion === b.reduceMotion;

/**
 * תפריט נגישות — התאמות תצוגה לפי תקן ישראלי 5568 / WCAG 2.0 AA.
 */
const AccessibilityMenuScreen = ({onClose, onOpenStatement}) => {
  const insets = useSafeAreaInsets();
  const {prefs, applyPrefs, resetPrefs} = useAccessibility();
  const [draft, setDraft] = useState(prefs);

  useEffect(() => {
    setDraft(prefs);
  }, [prefs]);

  const percent = Math.round(draft.fontScale * 100);
  const canShrink = draft.fontScale > FONT_SCALE_MIN + 0.001;
  const canGrow = draft.fontScale < FONT_SCALE_MAX - 0.001;
  const isDirty = useMemo(() => !prefsEqual(draft, prefs), [draft, prefs]);

  const openAccessibilityMail = async () => {
    const url = `mailto:${A11Y_EMAIL}?subject=${encodeURIComponent(
      'פנייה בנושא נגישות — פאי 2701',
    )}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (can) {
        await Linking.openURL(url);
      } else {
        Alert.alert('נגישות', A11Y_EMAIL);
      }
    } catch (_) {
      Alert.alert('נגישות', A11Y_EMAIL);
    }
  };

  const handleSave = () => {
    if (isDirty) {
      applyPrefs(draft);
    }
    Alert.alert('נגישות', 'ההגדרות נשמרו וחלות עכשיו בכל המסכים.');
  };

  const handleReset = () => {
    setDraft({...DEFAULT_ACCESSIBILITY_PREFS});
    resetPrefs();
    Alert.alert('נגישות', 'ההגדרות אופסו לכל המסכים.');
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {paddingTop: insets.top + 10, paddingBottom: 24},
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.backBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="חזרה">
            <Text style={styles.backChevron}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} accessibilityRole="header">
            נגישות
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={styles.lead}>
          בחרו את ההתאמות ולחצו שמור. ההגדרות נשמרות במכשיר וחלות על כל המסכים
          באפליקציה, בהתאם לתקן הישראלי 5568 ול־WCAG 2.0 ברמה AA.
        </Text>

        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>התאמות תצוגה</Text>

            <View style={[styles.row, styles.rowDivider]}>
              <View style={styles.fontStepper}>
                <TouchableOpacity
                  style={[styles.fontBtn, !canShrink && styles.fontBtnDisabled]}
                  onPress={() =>
                    setDraft(prev => ({
                      ...prev,
                      fontScale: stepFontScale(prev.fontScale, -1),
                    }))
                  }
                  disabled={!canShrink}
                  accessibilityRole="button"
                  accessibilityLabel="הקטן טקסט">
                  <Text style={styles.fontBtnLabel}>א−</Text>
                </TouchableOpacity>
                <Text
                  style={styles.fontValue}
                  accessibilityLabel={`גודל טקסט ${percent} אחוז`}>
                  {percent}%
                </Text>
                <TouchableOpacity
                  style={[styles.fontBtn, !canGrow && styles.fontBtnDisabled]}
                  onPress={() =>
                    setDraft(prev => ({
                      ...prev,
                      fontScale: stepFontScale(prev.fontScale, 1),
                    }))
                  }
                  disabled={!canGrow}
                  accessibilityRole="button"
                  accessibilityLabel="הגדל טקסט">
                  <Text style={styles.fontBtnLabel}>א+</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>גודל טקסט</Text>
                <Text style={styles.rowHint}>הגדלה או הקטנה של הכתב במערכת</Text>
              </View>
            </View>

            <ToggleRow
              label="ניגודיות גבוהה"
              description="רקע כהה וטקסט בהיר לקריאה ברורה יותר"
              value={draft.highContrast}
              onToggle={() =>
                setDraft(prev => ({...prev, highContrast: !prev.highContrast}))
              }
            />
            <ToggleRow
              label="גופן קריא"
              description="ריווח אותיות מוגדל לקריאה נוחה יותר"
              value={draft.readableFont}
              onToggle={() =>
                setDraft(prev => ({...prev, readableFont: !prev.readableFont}))
              }
            />
            <ToggleRow
              label="הדגשת קישורים"
              description="קו תחתון ומסגרת סביב קישורים"
              value={draft.highlightLinks}
              onToggle={() =>
                setDraft(prev => ({
                  ...prev,
                  highlightLinks: !prev.highlightLinks,
                }))
              }
            />
            <ToggleRow
              label="עצירת אנימציות"
              description="מפחית תנועה אוטומטית במסך"
              value={draft.reduceMotion}
              onToggle={() =>
                setDraft(prev => ({...prev, reduceMotion: !prev.reduceMotion}))
              }
              last
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>מידע ופניות</Text>
            <TouchableOpacity
              style={[styles.row, styles.rowDivider]}
              onPress={onOpenStatement}
              activeOpacity={0.8}
              accessibilityRole="link"
              accessibilityLabel="הצהרת נגישות">
              <MaterialCommunityIcons
                name="chevron-left"
                size={22}
                color="#C9C7D6"
              />
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>הצהרת נגישות</Text>
                <Text style={styles.rowHint}>
                  תקן ישראלי 5568, WCAG 2.0 AA ופרטי אחראית הנגישות
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.row}
              onPress={openAccessibilityMail}
              activeOpacity={0.8}
              accessibilityRole="link"
              accessibilityLabel="פנייה לאחראית נגישות">
              <MaterialCommunityIcons
                name="email-outline"
                size={22}
                color="#C9C7D6"
              />
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>פנייה בנושא נגישות</Text>
                <Text style={styles.rowHint}>
                  אחראית נגישות: מלי אשכנזי · {A11Y_EMAIL}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.resetBtn}
          onPress={handleReset}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="איפוס הגדרות נגישות">
          <Text style={styles.resetText}>איפוס הגדרות</Text>
        </TouchableOpacity>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {paddingBottom: Math.max(insets.bottom, 12) + 8},
        ]}>
        <TouchableOpacity
          style={[styles.saveBtn, !isDirty && styles.saveBtnIdle]}
          onPress={handleSave}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="שמור הגדרות נגישות">
          <Text style={styles.saveBtnText}>שמור</Text>
        </TouchableOpacity>
      </View>
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
  scroll: {flex: 1},
  content: {
    paddingHorizontal: 24,
    gap: 20,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backChevron: {
    fontSize: 28,
    color: Colors.white100,
    fontWeight: '300',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    color: Colors.white100,
    fontFamily: 'Rubik-Medium',
  },
  headerSpacer: {width: 40},
  lead: {
    color: '#C9C7D6',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  section: {width: '100%'},
  card: {
    backgroundColor: '#2b2a39',
    borderRadius: 12,
    padding: 18,
    gap: 4,
  },
  cardTitle: {
    fontSize: FontSizes.fs18,
    color: Colors.textSecondary,
    fontFamily: 'Rubik-Regular',
    marginBottom: 8,
    textAlign: 'left',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#222132',
  },
  rowTextCol: {
    flex: 1,
  },
  rowTitle: {
    color: Colors.white100,
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  rowHint: {
    color: '#8C85B3',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  fontStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fontBtn: {
    minWidth: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#4D4966',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  fontBtnDisabled: {opacity: 0.35},
  fontBtnLabel: {
    color: '#FEE787',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
  fontValue: {
    color: Colors.white100,
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    minWidth: 44,
    textAlign: 'center',
  },
  resetBtn: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  resetText: {
    color: '#FEE787',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    textDecorationLine: 'underline',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2b2a39',
    backgroundColor: Colors.blue100,
  },
  saveBtn: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#FEE787',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnIdle: {
    opacity: 0.72,
  },
  saveBtnText: {
    color: '#1e1d27',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
  },
});

export default AccessibilityMenuScreen;
