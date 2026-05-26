import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  I18nManager,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {FigmaCheckbox} from '../components/FigmaCheckbox';
import {submitCompanyReport} from '../utils/api';
import {flexStart} from '../utils/rtlLayout';

// Figma 15:9841 — חברה | 10:35105 — professional | 34:9182 — broker
const BG = '#2B2A39';
const DIVIDER = '#373548';
const TEXT_SECONDARY = '#D2D0DC';
const INPUT_BORDER = '#8C85B3';
const PLACEHOLDER = 'rgba(255,255,255,0.35)';
const GOLD_GRADIENT = ['#FEE787', '#BD9947', '#9C6522'];
const GOLD_GRADIENT_LOCATIONS = [0.0456, 0.5076, 0.8831];

const REASONS_COMPANY = [
  {key: 'construction_quality', label: 'בעיות באיכות הבנייה'},
  {
    key: 'delivery_deadline',
    label: 'החברה לא עמדה בזמני מסירת הפרויקט ללקוח',
  },
  {
    key: 'apartment_spec',
    label: 'החברה לא עמדה במפרט הדירה שהובטח',
  },
  {
    key: 'plan_changed_no_notice',
    label: 'החברה שינתה את התכנון בלי לעדכן את הלקוח',
  },
  {
    key: 'marketing_promises',
    label: 'החברה לא עמדה בהבטחותיה השיווקיות (למשל נוף לים)',
  },
  {key: 'other', label: 'סיבה אחרת'},
];

const REASONS_PROFESSIONAL = [
  {key: 'fictitious_listing', label: 'המודעה פיקטיבית'},
  {key: 'listing_error', label: 'מצאתי טעות במודעה'},
  {key: 'listing_not_current', label: 'המודעה אינה אקטואלית'},
  {key: 'wrong_phone_in_listing', label: 'מספר הטלפון במודעה שגוי'},
  {key: 'offensive_content', label: 'המודעה בעלת תוכן פוגעני'},
  {key: 'other', label: 'סיבה אחרת'},
];

const REASONS_BROKER = [
  {key: 'fictitious_listing', label: 'המודעה פיקטיבית'},
  {key: 'listing_error', label: 'מצאתי טעות במודעה'},
  {key: 'listing_not_current', label: 'המודעה אינה אקטואלית'},
  {key: 'wrong_phone_in_listing', label: 'מספר הטלפון במודעה שגוי'},
  {key: 'offensive_content', label: 'המודעה בעלת תוכן פוגעני'},
  {
    key: 'broker_exclusivity_deadline',
    label: 'המתווך לא עמד בזמני מכירה של בלעדיות',
  },
  {
    key: 'price_or_details_mismatch',
    label: 'המחיר או אחד מפרטי המודעה שונים ממה שפורסם בפועל',
  },
  {
    key: 'business_listing_as_private',
    label: 'מודעה עסקית (מתווך/סוכן) המופיעה כמודעה פרטית',
  },
  {key: 'other', label: 'סיבה אחרת'},
];

function reasonsConfigForSubject(reportSubjectType) {
  if (reportSubjectType === 'broker') return REASONS_BROKER;
  if (reportSubjectType === 'professional') return REASONS_PROFESSIONAL;
  return REASONS_COMPANY;
}

function emailLooksValid(s) {
  const t = String(s || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

const CompanyReportScreen = ({
  onClose,
  /** Called after report is saved; parent should navigate back and show success UI. */
  onSubmittedSuccessfully,
  reportedSubscriptionId,
  reportedListingId = null,
  companyDisplayName = '',
  /** 'company' | 'professional' | 'broker' — reasons list and API subject_type */
  reportSubjectType = 'company',
  currentUser = null,
}) => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);

  const reasonsList = useMemo(
    () => reasonsConfigForSubject(reportSubjectType),
    [reportSubjectType],
  );

  const [reasons, setReasons] = useState(() =>
    Object.fromEntries(
      reasonsConfigForSubject(reportSubjectType).map(r => [r.key, false]),
    ),
  );

  useEffect(() => {
    setReasons(Object.fromEntries(reasonsList.map(r => [r.key, false])));
  }, [reasonsList]);
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const u = currentUser;
    if (!u || typeof u !== 'object') return;
    const name =
      u.name ||
      u.contact_person_name ||
      u.business_name ||
      u.broker_office_name ||
      '';
    const email = u.email ? String(u.email).trim() : '';
    const phone = u.phone ? String(u.phone).trim() : '';
    setReporterName(prev => (prev.trim() ? prev : name));
    setReporterEmail(prev => (prev.trim() ? prev : email));
    setReporterPhone(prev => (prev.trim() ? prev : phone));
  }, [currentUser]);

  const selectedKeys = useMemo(
    () => reasonsList.filter(r => reasons[r.key]).map(r => r.key),
    [reasons, reasonsList],
  );

  const screenTitle = useMemo(() => {
    if (reportSubjectType === 'broker') {
      return 'דווח על מתווך זה';
    }
    if (reportSubjectType === 'professional') {
      const n = String(companyDisplayName || '').trim();
      return n ? `דווח על ${n}` : 'דווח על מתווך זו';
    }
    return 'דווח על חברה זו';
  }, [reportSubjectType, companyDisplayName]);

  const toggleReason = useCallback(key => {
    setReasons(prev => ({...prev, [key]: !prev[key]}));
  }, []);

  const canSubmit = useMemo(() => {
    const hasReasonOrDesc =
      selectedKeys.length > 0 || String(description).trim().length > 0;
    return (
      hasReasonOrDesc &&
      String(reporterName).trim().length > 0 &&
      emailLooksValid(reporterEmail)
    );
  }, [selectedKeys.length, description, reporterName, reporterEmail]);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    if (!emailLooksValid(reporterEmail)) {
      Alert.alert('', 'נא להזין כתובת דוא״ל תקינה');
      return;
    }
    setSubmitting(true);
    const reporterSubscriptionId =
      currentUser?.id && String(currentUser.id).trim()
        ? String(currentUser.id).trim()
        : null;
    const res = await submitCompanyReport({
      subjectType:
        reportSubjectType === 'broker'
          ? 'broker'
          : reportSubjectType === 'professional'
            ? 'professional'
            : 'company',
      reportedSubscriptionId,
      reportedListingId,
      companyDisplayName,
      reasonKeys: selectedKeys,
      description: String(description).trim(),
      reporterName: String(reporterName).trim(),
      reporterPhone: String(reporterPhone).trim() || null,
      reporterEmail: String(reporterEmail).trim(),
      reporterSubscriptionId,
    });
    setSubmitting(false);
    if (res.success) {
      if (typeof onSubmittedSuccessfully === 'function') {
        onSubmittedSuccessfully();
      } else {
        onClose?.();
      }
      return;
    }
    Alert.alert('', res.error || 'שגיאה בשליחת הדיווח');
  };

  return (
    <View style={[styles.container, {paddingBottom: bottomInset}]}>
      <View style={{height: insets.top}} />
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onClose}
        style={styles.topRail}
        accessibilityRole="button"
        accessibilityLabel="סגור">
        <View style={styles.handleBar} />
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>{screenTitle}</Text>

        <View style={styles.reasonsBlock}>
          {reasonsList.map(r => (
            <TouchableOpacity
              key={r.key}
              style={styles.checkRow}
              onPress={() => toggleReason(r.key)}
              activeOpacity={0.8}>
              <FigmaCheckbox checked={reasons[r.key]} />
              <Text style={styles.checkLabel}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider} />

        <Text style={styles.fieldLabel}>תיאור</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="פרט את הבעיה שמצאת"
          placeholderTextColor={PLACEHOLDER}
          multiline
          textAlign="right"
          textAlignVertical="top"
        />

        <Text style={styles.fieldLabel}>שם</Text>
        <TextInput
          style={styles.inputPill}
          value={reporterName}
          onChangeText={setReporterName}
          placeholder="השם המלא שלך"
          placeholderTextColor={PLACEHOLDER}
          textAlign="right"
          autoCapitalize="words"
        />

        <Text style={styles.fieldLabel}>מספר טלפון</Text>
        <TextInput
          style={styles.inputPill}
          value={reporterPhone}
          onChangeText={setReporterPhone}
          placeholder="הזן מספר טלפון"
          placeholderTextColor={PLACEHOLDER}
          textAlign="rihgt"
          keyboardType="phone-pad"
        />

        <Text style={styles.fieldLabel}>דוא״ל לקבלת תשובה</Text>
        <TextInput
          style={styles.inputPill}
          value={reporterEmail}
          onChangeText={setReporterEmail}
          placeholder="example@email.com"
          placeholderTextColor={PLACEHOLDER}
          textAlign="right"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[
            styles.sendWrap,
            (!canSubmit || submitting) && styles.sendDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          activeOpacity={0.9}>
          <LinearGradient
            colors={GOLD_GRADIENT}
            locations={GOLD_GRADIENT_LOCATIONS}
            start={{x: 0.5, y: 0}}
            end={{x: 0.5, y: 1}}
            style={styles.sendGradient}>
            {submitting ? (
              <ActivityIndicator color="#1E1D27" />
            ) : (
              <Text style={styles.sendText}>שלח דיווח</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    maxWidth: 414,
    width: '100%',
    alignSelf: 'center',
  },
  topRail: {
    height: 37,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#464646',
    borderRadius: 3,
  },
  scroll: {flex: 1},
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
    gap: 0,
  },
  screenTitle: {
    color: TEXT_SECONDARY,
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    marginBottom: 32,
  },
  reasonsBlock: {gap: 32, marginBottom: 26},
  checkRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 8,
  },
  checkLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DIVIDER,
    marginBottom: 26,
    alignSelf: 'stretch',
  },
  fieldLabel: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    marginBottom: 10,
    paddingRight: 16,
    letterSpacing: 0.14,
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 18,
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Rubik-Regular',
    marginBottom: 28,
    writingDirection: 'rtl',
  },
  inputPill: {
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 1000,
    height: 52,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Rubik-Regular',
    marginBottom: 28,
    writingDirection: 'rtl',
  },
  sendWrap: {
    width: '100%',
    marginTop: 8,
    borderRadius: 1000,
    overflow: 'hidden',
    minHeight: 44,
  },
  sendDisabled: {opacity: 0.45},
  sendGradient: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  sendText: {
    fontSize: 20,
    fontFamily: 'Rubik-Medium',
    color: '#1E1D27',
    letterSpacing: 0.2,
  },
});

export default CompanyReportScreen;
