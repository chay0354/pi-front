import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  TextInput,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import FilterSaveButton from '../components/FilterSaveButton';

const BG = '#1a1926';
const INPUT_BORDER = '#8C85B3';
const COUNTER_DIVIDER = '#343243';
const METER_STEP = 1;
const MIN_METER = 1;
const MAX_METER = 999999;
const DEFAULT_METER = 50;

const MeterFilterScreen = ({initialFilter, onClose, onSave}) => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  const [meterValue, setMeterValue] = useState(
    initialFilter?.meter != null
      ? Number(initialFilter.meter)
      : DEFAULT_METER,
  );
  const [meterDraft, setMeterDraft] = useState(
    initialFilter?.meter != null
      ? String(Number(initialFilter.meter))
      : String(DEFAULT_METER),
  );
  const meterInputWidth = Math.max(20, String(meterDraft || '').length * 11);

  useEffect(() => {
    const next =
      initialFilter?.meter != null ? Number(initialFilter.meter) : null;
    if (next != null) {
      setMeterValue(next);
      setMeterDraft(String(next));
    } else {
      setMeterValue(DEFAULT_METER);
      setMeterDraft(String(DEFAULT_METER));
    }
  }, [initialFilter]);

  const commitMeterDraft = () => {
    const normalized = String(meterDraft ?? '').replace(/[^\d]/g, '');
    if (!normalized) {
      setMeterValue(null);
      setMeterDraft('');
      return;
    }
    const parsed = Number.parseInt(normalized, 10);
    if (!Number.isFinite(parsed)) {
      setMeterDraft(meterValue != null ? String(meterValue) : '');
      return;
    }
    const clamped = Math.max(MIN_METER, Math.min(MAX_METER, parsed));
    setMeterValue(clamped);
    setMeterDraft(String(clamped));
  };

  const handleSave = () => {
    const normalized = String(meterDraft ?? '').replace(/[^\d]/g, '');
    if (!normalized) {
      onSave?.({meter: null});
      onClose?.();
      return;
    }
    const parsed = Number.parseInt(normalized, 10);
    if (!Number.isFinite(parsed)) {
      onSave?.({meter: null});
      onClose?.();
      return;
    }
    const clamped = Math.max(MIN_METER, Math.min(MAX_METER, parsed));
    setMeterValue(clamped);
    setMeterDraft(String(clamped));
    onSave?.({meter: clamped});
    onClose?.();
  };

  const handleClear = () => {
    setMeterValue(null);
    if (onSave) {
      onSave({meter: null});
    }
    if (onClose) onClose();
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRail}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onClose}
          style={styles.handlePressArea}>
          <View style={styles.handleBar} />
        </TouchableOpacity>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image
            source={require('../assets/tiktok/meter-new.png')}
            style={styles.headerIcon}
            resizeMode="contain"
          />
          <Text style={styles.title}>מטר</Text>
        </View>

        {/* Same layout as Rooms StepperRow: +  |  value מ"ר  |  − */}
        <View style={styles.meterRow}>
          <View style={styles.counterInput}>
            <TouchableOpacity
              style={styles.counterButtonLeft}
              onPress={() =>
                setMeterValue(v => {
                  const base = v == null ? MIN_METER : v;
                  const next = Math.min(MAX_METER, base + METER_STEP);
                  setMeterDraft(String(next));
                  return next;
                })
              }>
              <Text style={styles.counterButton}>+</Text>
            </TouchableOpacity>
            <View style={styles.counterDivider} />
            <View style={styles.counterValueContainer}>
              <TextInput
                value={meterDraft}
                onChangeText={setMeterDraft}
                onBlur={commitMeterDraft}
                onSubmitEditing={commitMeterDraft}
                keyboardType="numeric"
                returnKeyType="done"
                placeholder="ללא סינון"
                placeholderTextColor="rgba(255,255,255,0.6)"
                style={[styles.counterValueInput, {width: meterInputWidth}]}
                textAlign="center"
              />
              <Text style={styles.counterValueSuffix}>מ"ר</Text>
            </View>
            <View style={styles.counterDivider} />
            <TouchableOpacity
              style={styles.counterButtonRight}
              onPress={() =>
                setMeterValue(v => {
                  if (v == null) return null;
                  const next = v - METER_STEP;
                  if (next < MIN_METER) {
                    setMeterDraft('');
                    return null;
                  }
                  setMeterDraft(String(next));
                  return next;
                })
              }>
              <Text style={styles.counterButton}>−</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, {paddingBottom: bottomInset + 8}]}>
        <FilterSaveButton onPress={handleSave} style={styles.saveBtnWrap} />
        <TouchableOpacity style={styles.clearWrap} onPress={handleClear}>
          <Text style={styles.clearText}>נקה</Text>
        </TouchableOpacity>
      </View>
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
  },
  topRail: {
    height: 37,
    borderBottomWidth: 1,
    borderBottomColor: '#373548',
    alignItems: 'center',
    justifyContent: 'center',
  },
  handlePressArea: {
    width: 42,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: '#373548',
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#464646',
    borderRadius: 3,
  },
  header: { alignItems: 'center', marginBottom: 28 },
  headerIcon: { width: 36, height: 36 },
  title: { color: '#fff', fontSize: 18, fontFamily: 'Rubik-Medium', marginTop: 8 },
  meterRow: { marginBottom: 32 },
  /** Matches `RoomsFilterScreen` StepperRow counter (height 52, pill border, no fill). */
  counterInput: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    overflow: 'hidden',
  },
  counterButtonLeft: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButtonRight: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButton: {
    color: '#fff',
    fontSize: 30,
    fontFamily: 'Rubik-Regular',
    lineHeight: 30,
  },
  counterDivider: {width: 1, height: '100%', backgroundColor: COUNTER_DIVIDER},
  counterValueContainer: {
    flex: 2,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  counterValueInput: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    minWidth: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlign: 'center',
  },
  counterValueSuffix: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
  },
  saveBtnWrap: { marginBottom: 12, width: '100%' },
  clearWrap: { alignItems: 'center' },
  clearText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, textDecorationLine: 'underline' },
});

export default MeterFilterScreen;
