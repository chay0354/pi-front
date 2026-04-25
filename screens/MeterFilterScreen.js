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

const BG = '#1a1926';
const BORDER = 'rgba(255,255,255,0.2)';
const MIN_METER = 10;
const MAX_METER = 1000;

const MeterFilterScreen = ({initialFilter, onClose, onSave}) => {
  const [meterValue, setMeterValue] = useState(
    initialFilter?.meter != null ? Number(initialFilter.meter) : null,
  );
  const [meterDraft, setMeterDraft] = useState(
    initialFilter?.meter != null ? String(Number(initialFilter.meter)) : '',
  );
  const meterInputWidth = Math.max(20, String(meterDraft || '').length * 11);

  useEffect(() => {
    const next =
      initialFilter?.meter != null ? Number(initialFilter.meter) : null;
    setMeterValue(next);
    setMeterDraft(next != null ? String(next) : '');
  }, [initialFilter]);

  useEffect(() => {
    setMeterDraft(meterValue != null ? String(meterValue) : '');
  }, [meterValue]);

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
    if (onSave) {
      onSave({
        meter:
          meterValue != null && Number.isFinite(Number(meterValue))
            ? Number(meterValue)
            : null,
      });
    }
    if (onClose) onClose();
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image
            source={require('../assets/meter.png')}
            style={styles.headerIcon}
            resizeMode="contain"
          />
          <Text style={styles.title}>מטר</Text>
        </View>

        {/* Pill stepper: -  |  value מ"ר  |  + */}
        <View style={styles.meterRow}>
          <View style={styles.counterInput}>
            <TouchableOpacity
              style={styles.counterButtonLeft}
              onPress={() =>
                setMeterValue(v => {
                  if (v == null) return null;
                  const next = v - 10;
                  return next < MIN_METER ? null : next;
                })
              }>
              <Text style={styles.counterButton}>-</Text>
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
                  const base = v == null ? MIN_METER - 10 : v;
                  const next = Math.min(MAX_METER, base + 10);
                  setMeterDraft(String(next));
                  return next;
                })
              }>
              <Text style={styles.counterButton}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtnWrap} onPress={handleSave} activeOpacity={0.9}>
          <Image
            source={require('../assets/buy-rent/save.png')}
            style={styles.saveBtnImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
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
    paddingBottom: 40,
    backgroundColor: BG,
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
  counterInput: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    backgroundColor: '#2B2A39',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#8C85B3',
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
  counterButton: { color: '#fff', fontSize: 24, fontWeight: '600' },
  counterDivider: { width: 1, height: '100%', backgroundColor: '#8C85B3' },
  counterValueContainer: {
    flex: 2,
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
  counterValueSuffix: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginStart: 4,
  },
  saveBtnWrap: { marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnImage: { width: '100%', height: 54 },
  clearWrap: { alignItems: 'center' },
  clearText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, textDecorationLine: 'underline' },
});

export default MeterFilterScreen;
