import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';

const BG = '#1a1926';
const BORDER = 'rgba(255,255,255,0.2)';
const MIN_METER = 10;
const MAX_METER = 1000;

const MeterFilterScreen = ({initialFilter, onClose, onSave}) => {
  const [meterValue, setMeterValue] = useState(
    initialFilter?.meter != null ? Number(initialFilter.meter) : null,
  );

  useEffect(() => {
    setMeterValue(
      initialFilter?.meter != null ? Number(initialFilter.meter) : null,
    );
  }, [initialFilter]);

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
      <TouchableOpacity style={styles.backBtn} onPress={onClose} hitSlop={12}>
        <MaterialCommunityIcons name="chevron-right" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.handleBar} />
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
              <Text style={styles.counterValue}>
                {meterValue == null
                  ? 'ללא סינון'
                  : `${meterValue} מ"ר`}
              </Text>
            </View>
            <View style={styles.counterDivider} />
            <TouchableOpacity
              style={styles.counterButtonRight}
              onPress={() =>
                setMeterValue(v => {
                  const base = v == null ? MIN_METER - 10 : v;
                  return Math.min(MAX_METER, base + 10);
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
  counterValue: { color: '#fff', fontSize: 18, fontWeight: '600' },
  saveBtnWrap: { marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnImage: { width: '100%', height: 54 },
  clearWrap: { alignItems: 'center' },
  clearText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, textDecorationLine: 'underline' },
});

export default MeterFilterScreen;
