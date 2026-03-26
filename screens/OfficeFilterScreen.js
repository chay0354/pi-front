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
import {LinearGradient} from 'expo-linear-gradient';

const BG = '#2B2A39';
const HEADER_ICON = require('../assets/type-icon-global.png');

const OfficeFilterScreen = ({initialFilter, onClose, onSave}) => {
  const [area, setArea] = useState(initialFilter?.minArea ?? 50);
  const [rooms, setRooms] = useState(initialFilter?.minRooms ?? 2);
  const [wholeFloor, setWholeFloor] = useState(initialFilter?.wholeFloor ?? false);
  const [parking, setParking] = useState(initialFilter?.parking ?? false);
  const [elevator, setElevator] = useState(initialFilter?.elevator ?? false);
  const [mamad, setMamad] = useState(initialFilter?.mamad ?? false);

  useEffect(() => {
    if (initialFilter == null) {
      setArea(50);
      setRooms(2);
      setWholeFloor(false);
      setParking(false);
      setElevator(false);
      setMamad(false);
      return;
    }
    setArea(initialFilter.minArea ?? 50);
    setRooms(initialFilter.minRooms ?? 2);
    setWholeFloor(!!initialFilter.wholeFloor);
    setParking(!!initialFilter.parking);
    setElevator(!!initialFilter.elevator);
    setMamad(!!initialFilter.mamad);
  }, [initialFilter]);

  const handleSave = () => {
    if (onSave) {
      onSave({
        minArea: area,
        minRooms: rooms,
        wholeFloor,
        parking,
        elevator,
        mamad,
      });
    }
    if (onClose) onClose();
  };

  const handleClear = () => {
    if (onSave) onSave(null);
    if (onClose) onClose();
  };

  const StepperRow = ({label, value, suffix = '', onMinus, onPlus}) => (
    <View style={styles.inputRow}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.counterInput}>
        <TouchableOpacity style={styles.counterButtonLeft} onPress={onPlus}>
          <Text style={styles.counterButton}>+</Text>
        </TouchableOpacity>
        <View style={styles.counterDivider} />
        <View style={styles.counterValueContainer}>
          <Text style={styles.counterValue}>
            {value}
            {suffix}
          </Text>
        </View>
        <View style={styles.counterDivider} />
        <TouchableOpacity style={styles.counterButtonRight} onPress={onMinus}>
          <Text style={styles.counterButton}>-</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const CheckRow = ({label, checked, onToggle}) => (
    <TouchableOpacity
      style={styles.amenityOption}
      onPress={onToggle}
      activeOpacity={0.8}>
      <Text style={styles.amenityText}>{label}</Text>
      <View style={styles.radioSpacer} />
      {checked ? (
        <LinearGradient
          colors={['#FEE787', '#BD9947', '#9C6522']}
          locations={[0.0456, 0.5076, 0.8831]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.radioButtonGradient}>
          <Image
            source={require('../assets/checkbox-selected.png')}
            style={styles.radioButtonSelected}
            resizeMode="contain"
            pointerEvents="none"
          />
        </LinearGradient>
      ) : (
        <View style={styles.radioButton} />
      )}
    </TouchableOpacity>
  );

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
            source={HEADER_ICON}
            style={styles.headerIcon}
            resizeMode="contain"
          />
          <Text style={styles.title}>סוג</Text>
        </View>

        <StepperRow
          label="גודל המשרד"
          value={area}
          suffix=' מ״ר'
          onMinus={() => setArea(Math.max(10, area - 10))}
          onPlus={() => setArea(area + 10)}
        />
        <StepperRow
          label="מספר חדרים"
          value={rooms}
          onMinus={() => setRooms(Math.max(0, rooms - 1))}
          onPlus={() => setRooms(rooms + 1)}
        />

        <CheckRow
          label="קומה שלמה"
          checked={wholeFloor}
          onToggle={() => setWholeFloor(!wholeFloor)}
        />
        <CheckRow label="חניה" checked={parking} onToggle={() => setParking(!parking)} />
        <CheckRow label="מעלית" checked={elevator} onToggle={() => setElevator(!elevator)} />
        <CheckRow label='ממ״ד' checked={mamad} onToggle={() => setMamad(!mamad)} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtnWrap} onPress={handleSave} activeOpacity={0.9}>
          <LinearGradient
            colors={['#FEE787', '#BD9947', '#9C6522']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.saveGradient}>
            <Text style={styles.saveText}>שמור</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearWrap} onPress={handleClear}>
          <Text style={styles.clearText}>נקה</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: BG},
  backBtn: {position: 'absolute', top: 50, right: 20, zIndex: 10},
  scroll: {flex: 1},
  scrollContent: {paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24},
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
  header: {alignItems: 'center', marginBottom: 28},
  headerIcon: {width: 48, height: 48},
  title: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    marginTop: 8,
  },
  inputRow: {marginBottom: 20},
  inputLabel: {color: '#fff', fontSize: 16, marginBottom: 10, textAlign: 'right'},
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
    borderTopLeftRadius: 32,
    borderBottomLeftRadius: 32,
  },
  counterButtonRight: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 32,
    borderBottomRightRadius: 32,
  },
  counterButton: {color: '#fff', fontSize: 24, fontWeight: '600'},
  counterDivider: {width: 1, height: '100%', backgroundColor: '#8C85B3'},
  counterValueContainer: {
    flex: 2,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {color: '#fff', fontSize: 18, fontWeight: '600'},
  amenityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 12,
  },
  amenityText: {color: '#fff', fontSize: 16},
  radioSpacer: {width: 15},
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
  radioButtonSelected: {width: 17, height: 17},
  saveBtnWrap: {width: '100%', alignItems: 'center'},
  saveGradient: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    color: '#1B1A22',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    fontWeight: '600',
  },
  clearWrap: {marginTop: 16, alignItems: 'center'},
  clearText: {color: '#fff', fontSize: 16, textDecorationLine: 'underline'},
});

export default OfficeFilterScreen;
