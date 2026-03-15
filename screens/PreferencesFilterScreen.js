import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  PanResponder,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';

const BG = '#1a1926';
const BORDER = 'rgba(255,255,255,0.2)';
const MIN_AGE = 18;
const MAX_AGE = 100;

const PreferencesFilterScreen = ({initialFilter, onClose, onSave}) => {
  const [gender, setGender] = useState(initialFilter?.gender ?? 'female');
  const [ageMin, setAgeMin] = useState(initialFilter?.ageMin ?? 20);
  const [ageMax, setAgeMax] = useState(initialFilter?.ageMax ?? 30);
  const [nonSmoker, setNonSmoker] = useState(initialFilter?.nonSmoker ?? false);
  const [students, setStudents] = useState(initialFilter?.students ?? false);
  const [stableJob, setStableJob] = useState(initialFilter?.stableJob ?? false);
  const [occasionalJob, setOccasionalJob] = useState(initialFilter?.occasionalJob ?? false);
  const [immediateEntry, setImmediateEntry] = useState(initialFilter?.immediateEntry ?? false);

  const [sliderWidth, setSliderWidth] = useState(Dimensions.get('window').width - 48);
  const activeThumbRef = useRef(null);
  const sliderRef = useRef(null);
  const ageMinRef = useRef(ageMin);
  const ageMaxRef = useRef(ageMax);
  ageMinRef.current = ageMin;
  ageMaxRef.current = ageMax;

  const minPercent = ((ageMin - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100;
  const maxPercent = ((ageMax - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100;

  const updateFromPercent = (percent, isMin) => {
    const value = MIN_AGE + (percent / 100) * (MAX_AGE - MIN_AGE);
    const rounded = Math.round(value);
    const maxA = ageMaxRef.current;
    const minA = ageMinRef.current;
    if (isMin) setAgeMin(Math.max(MIN_AGE, Math.min(rounded, maxA - 1)));
    else setAgeMax(Math.min(MAX_AGE, Math.max(rounded, minA + 1)));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: evt => {
        const touch = evt.nativeEvent.touches?.[0] || evt.nativeEvent;
        const rect = sliderRef.current?.getBoundingClientRect?.();
        const locationX = rect && touch.pageX != null ? touch.pageX - rect.left : (touch.locationX ?? 0);
        const w = sliderWidth || 1;
        const percent = Math.max(0, Math.min(100, (locationX / w) * 100));
        const minP = ((ageMinRef.current - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100;
        const maxP = ((ageMaxRef.current - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100;
        const minDist = Math.abs(percent - minP);
        const maxDist = Math.abs(percent - maxP);
        activeThumbRef.current = minDist < maxDist ? 'min' : 'max';
      },
      onPanResponderMove: evt => {
        const thumb = activeThumbRef.current;
        if (!thumb) return;
        const touch = evt.nativeEvent.touches?.[0] || evt.nativeEvent;
        const rect = sliderRef.current?.getBoundingClientRect?.();
        const locationX = rect && touch.pageX != null ? touch.pageX - rect.left : (touch.locationX ?? 0);
        const w = sliderWidth || 1;
        const percent = Math.max(0, Math.min(100, (locationX / w) * 100));
        updateFromPercent(percent, thumb === 'min');
      },
      onPanResponderRelease: () => { activeThumbRef.current = null; },
    }),
  ).current;

  const handleSave = () => {
    if (onSave) {
      onSave({
        gender,
        ageMin,
        ageMax,
        nonSmoker,
        students,
        stableJob,
        occasionalJob,
        immediateEntry,
      });
    }
    if (onClose) onClose();
  };

  const handleClear = () => {
    setGender('female');
    setAgeMin(20);
    setAgeMax(30);
    setNonSmoker(false);
    setStudents(false);
    setStableJob(false);
    setOccasionalJob(false);
    setImmediateEntry(false);
  };

  const CheckRow = ({label, checked, onToggle}) => (
    <TouchableOpacity style={styles.checkRow} onPress={onToggle} activeOpacity={0.8}>
      <Text style={styles.checkLabel}>{label}</Text>
      <View style={styles.radioSpacer} />
      {checked ? (
        <LinearGradient
          colors={['#FEE787', '#BD9947', '#9C6522']}
          locations={[0.0456, 0.5076, 0.8831]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.radioButtonGradient}>
          <Image source={require('../assets/checkbox-selected.png')} style={styles.radioButtonSelected} resizeMode="contain" />
        </LinearGradient>
      ) : (
        <View style={styles.radioButton} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={onClose} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
        <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.handleBar} />
        <View style={styles.header}>
          <Image source={require('../assets/haadafot.png')} style={styles.headerIcon} resizeMode="contain" />
          <Text style={styles.title}>העדפות</Text>
        </View>

        {/* מין - Gender: two pills with radio */}
        <Text style={styles.sectionLabel}>מין</Text>
        <View style={styles.genderRow}>
          <TouchableOpacity
            style={[styles.genderPill, gender === 'female' && styles.genderPillSelected]}
            onPress={() => setGender('female')}
            activeOpacity={0.8}>
            <Text style={styles.genderText}>אישה</Text>
            <View style={[styles.genderRadio, gender === 'female' && styles.genderRadioSelected]}>
              {gender === 'female' ? <View style={styles.genderRadioInner} /> : null}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genderPill, gender === 'male' && styles.genderPillSelected]}
            onPress={() => setGender('male')}
            activeOpacity={0.8}>
            <Text style={styles.genderText}>גבר</Text>
            <View style={[styles.genderRadio, gender === 'male' && styles.genderRadioSelected]}>
              {gender === 'male' ? <View style={styles.genderRadioInner} /> : null}
            </View>
          </TouchableOpacity>
        </View>

        {/* גיל מועדף - Preferred Age */}
        <Text style={styles.sectionLabel}>גיל מועדף</Text>
        <Text style={styles.ageRangeText}>{ageMin} – {ageMax}</Text>
        <View
          ref={sliderRef}
          style={styles.sliderContainer}
          onLayout={e => { const w = e.nativeEvent.layout.width; if (w > 0) setSliderWidth(w); }}
          {...panResponder.panHandlers}>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderTrackFill, { left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }]} />
          </View>
          <View style={[styles.sliderThumb, { left: `${minPercent}%` }]} pointerEvents="none" />
          <View style={[styles.sliderThumb, { left: `${maxPercent}%` }]} pointerEvents="none" />
        </View>

        {/* Checkbox list */}
        <View style={styles.divider} />
        <CheckRow label="ללא מעשנים" checked={nonSmoker} onToggle={() => setNonSmoker(!nonSmoker)} />
        <CheckRow label="סטודנטים" checked={students} onToggle={() => setStudents(!students)} />
        <CheckRow label="בעלי עבודה מסודרת" checked={stableJob} onToggle={() => setStableJob(!stableJob)} />
        <CheckRow label="בעלי עבודה מזדמנת" checked={occasionalJob} onToggle={() => setOccasionalJob(!occasionalJob)} />
        <CheckRow label="כניסה מיידית" checked={immediateEntry} onToggle={() => setImmediateEntry(!immediateEntry)} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtnWrap} onPress={handleSave} activeOpacity={0.9}>
          <Image source={require('../assets/buy-rent/save.png')} style={styles.saveBtnImage} resizeMode="contain" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearWrap} onPress={handleClear}>
          <Text style={styles.clearText}>נקה</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  backBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    backgroundColor: BG,
  },
  handleBar: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    marginBottom: 16,
  },
  header: { alignItems: 'center', marginBottom: 24 },
  headerIcon: { width: 36, height: 36 },
  title: { color: '#fff', fontSize: 18, fontFamily: 'Rubik-Medium', marginTop: 8 },
  sectionLabel: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    marginBottom: 12,
    textAlign: 'right',
  },
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  genderPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    backgroundColor: '#2B2A39',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#8C85B3',
    paddingHorizontal: 16,
  },
  genderPillSelected: { borderColor: '#D4AF37' },
  genderText: { color: '#fff', fontSize: 16 },
  genderRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderRadioSelected: { borderColor: '#fff' },
  genderRadioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  ageRangeText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'right',
  },
  sliderContainer: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 24,
  },
  sliderTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    position: 'relative',
    overflow: 'visible',
  },
  sliderTrackFill: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 3,
    top: 0,
  },
  sliderThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#D4AF37',
    marginLeft: -11,
    top: 9,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 16,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 12,
  },
  checkLabel: { color: '#fff', fontSize: 16 },
  radioSpacer: { width: 15 },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'transparent',
  },
  radioButtonGradient: {
    width: 23,
    height: 23,
    borderRadius: 11.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCA447',
    backgroundColor: '#27262F',
  },
  radioButtonSelected: { width: 17, height: 17 },
  saveBtnWrap: { marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnImage: { width: '100%', height: 54 },
  clearWrap: { alignItems: 'center' },
  clearText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, textDecorationLine: 'underline' },
});

export default PreferencesFilterScreen;
