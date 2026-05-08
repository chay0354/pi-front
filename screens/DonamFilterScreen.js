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
const MIN_DONAM = 0.5;
const MAX_DONAM = 500;
const STEP = 0.5;

const DonamFilterScreen = ({initialFilter, onClose, onSave}) => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  const [minDonam, setMinDonam] = useState(initialFilter?.minDonam ?? 1);
  const [maxDonam, setMaxDonam] = useState(initialFilter?.maxDonam ?? 2);
  const [minDraft, setMinDraft] = useState(String(initialFilter?.minDonam ?? 1));
  const [maxDraft, setMaxDraft] = useState(String(initialFilter?.maxDonam ?? 2));
  const minInputWidth = Math.max(20, String(minDraft || '').length * 11);
  const maxInputWidth = Math.max(20, String(maxDraft || '').length * 11);

  useEffect(() => {
    if (initialFilter?.minDonam != null && initialFilter?.maxDonam != null) {
      const nextMin = Number(initialFilter.minDonam);
      const nextMax = Number(initialFilter.maxDonam);
      setMinDonam(nextMin);
      setMaxDonam(nextMax);
      setMinDraft(String(nextMin));
      setMaxDraft(String(nextMax));
    } else {
      setMinDonam(1);
      setMaxDonam(2);
      setMinDraft('1');
      setMaxDraft('2');
    }
  }, [initialFilter]);

  useEffect(() => {
    setMinDraft(display(minDonam));
  }, [minDonam]);

  useEffect(() => {
    setMaxDraft(display(maxDonam));
  }, [maxDonam]);

  const handleSave = () => {
    if (onSave) {
      onSave({minDonam, maxDonam});
    }
    if (onClose) onClose();
  };

  const handleClear = () => {
    setMinDonam(1);
    setMaxDonam(2);
    if (onSave) {
      onSave(null);
    }
    if (onClose) onClose();
  };

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Number((v).toFixed(1))));
  const display = v => (v % 1 === 0 ? v.toString() : v.toFixed(1));

  const commitMinDraft = () => {
    const normalized = String(minDraft ?? '').replace(/[^0-9.]/g, '');
    const parsed = Number.parseFloat(normalized);
    if (!Number.isFinite(parsed)) {
      setMinDraft(display(minDonam));
      return;
    }
    const next = clamp(parsed, MIN_DONAM, maxDonam - STEP);
    setMinDonam(next);
    setMinDraft(display(next));
  };

  const commitMaxDraft = () => {
    const normalized = String(maxDraft ?? '').replace(/[^0-9.]/g, '');
    const parsed = Number.parseFloat(normalized);
    if (!Number.isFinite(parsed)) {
      setMaxDraft(display(maxDonam));
      return;
    }
    const next = clamp(parsed, minDonam + STEP, MAX_DONAM);
    setMaxDonam(next);
    setMaxDraft(display(next));
  };

  return (
    <View style={styles.container}>
      <View style={{height: insets.top}} />
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
            source={require('../assets/donam.png')}
            style={styles.headerIcon}
            resizeMode="contain"
          />
          <Text style={styles.title}>דונם</Text>
        </View>

        {/* Range: מ- (from) min pill | עד (until) max pill */}
        <View style={styles.rangeRow}>
          <View style={styles.donamField}>
            <Text style={styles.donamLabel}>מ-</Text>
            <View style={styles.counterInput}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setMinDonam(v => clamp(v - STEP, MIN_DONAM, maxDonam - STEP))}>
                <Text style={styles.counterButton}>-</Text>
              </TouchableOpacity>
              <View style={styles.counterValueContainer}>
                <TextInput
                  value={minDraft}
                  onChangeText={setMinDraft}
                  onBlur={commitMinDraft}
                  onSubmitEditing={commitMinDraft}
                  keyboardType="numeric"
                  returnKeyType="done"
                  style={[styles.counterValueInput, {width: minInputWidth}]}
                  textAlign="center"
                />
              </View>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setMinDonam(v => clamp(v + STEP, MIN_DONAM, maxDonam - STEP))}>
                <Text style={styles.counterButton}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.rangeDash}>-</Text>
          <View style={styles.donamField}>
            <Text style={styles.donamLabel}>עד</Text>
            <View style={styles.counterInput}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setMaxDonam(v => clamp(v - STEP, minDonam + STEP, MAX_DONAM))}>
                <Text style={styles.counterButton}>-</Text>
              </TouchableOpacity>
              <View style={styles.counterValueContainer}>
                <TextInput
                  value={maxDraft}
                  onChangeText={setMaxDraft}
                  onBlur={commitMaxDraft}
                  onSubmitEditing={commitMaxDraft}
                  keyboardType="numeric"
                  returnKeyType="done"
                  style={[styles.counterValueInput, {width: maxInputWidth}]}
                  textAlign="center"
                />
              </View>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setMaxDonam(v => clamp(v + STEP, minDonam + STEP, MAX_DONAM))}>
                <Text style={styles.counterButton}>+</Text>
              </TouchableOpacity>
            </View>
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
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 12,
  },
  donamField: { flex: 1 },
  donamLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'right',
  },
  rangeDash: { color: 'rgba(255,255,255,0.5)', fontSize: 18, marginBottom: 24 },
  counterInput: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: '#2B2A39',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#8C85B3',
    overflow: 'hidden',
  },
  counterBtn: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButton: { color: '#fff', fontSize: 22, fontWeight: '600' },
  counterValueContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValueInput: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    minWidth: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlign: 'center',
  },
  saveBtnWrap: { marginBottom: 12, width: '100%' },
  clearWrap: { alignItems: 'center' },
  clearText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, textDecorationLine: 'underline' },
});

export default DonamFilterScreen;
