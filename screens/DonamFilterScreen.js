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
const MIN_DONAM = 0.5;
const MAX_DONAM = 500;
const STEP = 0.5;

const DonamFilterScreen = ({initialFilter, onClose, onSave}) => {
  const [minDonam, setMinDonam] = useState(initialFilter?.minDonam ?? 1);
  const [maxDonam, setMaxDonam] = useState(initialFilter?.maxDonam ?? 2);

  useEffect(() => {
    if (initialFilter?.minDonam != null && initialFilter?.maxDonam != null) {
      setMinDonam(Number(initialFilter.minDonam));
      setMaxDonam(Number(initialFilter.maxDonam));
    } else {
      setMinDonam(1);
      setMaxDonam(2);
    }
  }, [initialFilter]);

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
                <Text style={styles.counterValue}>{display(minDonam)}</Text>
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
                <Text style={styles.counterValue}>{display(maxDonam)}</Text>
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
  counterValue: { color: '#fff', fontSize: 18, fontWeight: '600' },
  saveBtnWrap: { marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnImage: { width: '100%', height: 54 },
  clearWrap: { alignItems: 'center' },
  clearText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, textDecorationLine: 'underline' },
});

export default DonamFilterScreen;
