import React, {useState} from 'react';
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

const BG = '#1a1926';
const BORDER = 'rgba(255,255,255,0.2)';
const GOLD = ['#FEE787', '#BD9947', '#9C6522'];
const GOLD_LOCATIONS = [0.0456, 0.5076, 0.8831];

const RoomsFilterScreen = ({initialFilter, onClose, onSave}) => {
  const [area, setArea] = useState(initialFilter?.area ?? 60);
  const [rooms, setRooms] = useState(initialFilter?.rooms ?? 2);
  const [floor, setFloor] = useState(initialFilter?.floor ?? 2);
  const [parkingEnabled, setParkingEnabled] = useState(
    initialFilter == null ? true : initialFilter.parking != null,
  );
  const [parkingValue, setParkingValue] = useState(initialFilter?.parking ?? 1);
  const [balconyEnabled, setBalconyEnabled] = useState(
    initialFilter == null ? true : initialFilter.balcony != null,
  );
  const [balconyValue, setBalconyValue] = useState(initialFilter?.balcony ?? 1);
  const [elevator, setElevator] = useState(initialFilter?.elevator ?? true);
  const [mamad, setMamad] = useState(initialFilter?.mamad ?? true);

  const handleSave = () => {
    if (onSave) {
      onSave({
        area,
        rooms,
        floor,
        parking: parkingEnabled ? parkingValue : null,
        balcony: balconyEnabled ? balconyValue : null,
        elevator,
        mamad,
      });
    }
    if (onClose) onClose();
  };

  const handleClear = () => {
    setArea(60);
    setRooms(2);
    setFloor(2);
    setParkingEnabled(false);
    setParkingValue(1);
    setBalconyEnabled(false);
    setBalconyValue(1);
    setElevator(false);
    setMamad(false);
  };

  // Counter/stepper: same as OfficeListingScreen (inputRow + counterInput) one-to-one
  const StepperRow = ({label, value, suffix = '', onMinus, onPlus}) => (
    <View style={styles.inputRow}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.counterInput}>
        <TouchableOpacity
          style={styles.counterButtonLeft}
          onPress={onPlus}>
          <Text style={styles.counterButton}>+</Text>
        </TouchableOpacity>
        <View style={styles.counterDivider} />
        <View style={styles.counterValueContainer}>
          <Text style={styles.counterValue}>{value}{suffix}</Text>
        </View>
        <View style={styles.counterDivider} />
        <TouchableOpacity
          style={styles.counterButtonRight}
          onPress={onMinus}>
          <Text style={styles.counterButton}>-</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Checkbox row: same as OfficeListingScreen (amenityOption + radioButtonGradient/radioButton) one-to-one
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
          />
        </LinearGradient>
      ) : (
        <View style={styles.radioButton} />
      )}
    </TouchableOpacity>
  );

  // Quantity pills: same as OfficeListingScreen (amenityQuantitySelector) one-to-one
  const OptionPills = ({selected, onSelect}) => (
    <View style={styles.amenityQuantitySelector}>
      {[4, 3, 2, 1].map(qty => (
        <TouchableOpacity
          key={qty}
          onPress={() => onSelect(qty)}
          style={styles.amenityQuantityButtonContainer}>
          {selected === qty ? (
            <LinearGradient
              colors={['#FEE787', '#BD9947', '#9C6522']}
              locations={[0.0456, 0.5076, 0.8831]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.amenityQuantityButtonSelected}>
              <Text style={styles.amenityQuantityTextSelected}>{qty}</Text>
              <View style={styles.amenityQuantityDotSelected}>
                <LinearGradient
                  colors={['#FEE787', '#BD9947', '#9C6522']}
                  locations={[0.0456, 0.5076, 0.8831]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.amenityQuantityDotInner}
                />
              </View>
            </LinearGradient>
          ) : (
            <View style={styles.amenityQuantityButton}>
              <Text style={styles.amenityQuantityText}>{qty}</Text>
              <View style={styles.amenityQuantityDot} />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
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
        {/* Handle bar */}
        <View style={styles.handleBar} />
        {/* Header: icon + חדרים */}
        <View style={styles.header}>
          <Image
            source={require('../assets/buttom-bar/rooms_number.png')}
            style={styles.headerIcon}
            resizeMode="contain"
          />
          <Text style={styles.title}>חדרים</Text>
        </View>

        <StepperRow
          label="שטח הנכס"
          value={area}
          suffix=' מ"ר'
          onMinus={() => setArea(Math.max(10, area - 10))}
          onPlus={() => setArea(area + 10)}
        />
        <StepperRow
          label="מספר חדרים"
          value={rooms}
          onMinus={() => setRooms(Math.max(1, rooms - 1))}
          onPlus={() => setRooms(rooms + 1)}
        />
        <StepperRow
          label="קומה"
          value={floor}
          onMinus={() => setFloor(Math.max(0, floor - 1))}
          onPlus={() => setFloor(floor + 1)}
        />

        <CheckRow label="חנייה" checked={parkingEnabled} onToggle={() => setParkingEnabled(!parkingEnabled)} />
        {parkingEnabled && <OptionPills selected={parkingValue} onSelect={setParkingValue} />}

        <CheckRow label="מרפסת" checked={balconyEnabled} onToggle={() => setBalconyEnabled(!balconyEnabled)} />
        {balconyEnabled && <OptionPills selected={balconyValue} onSelect={setBalconyValue} />}

        <CheckRow label="מעלית" checked={elevator} onToggle={() => setElevator(!elevator)} />
        <CheckRow label='ממ"ד' checked={mamad} onToggle={() => setMamad(!mamad)} />
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
  // Same as OfficeListingScreen counter/input (one-to-one copy)
  inputRow: { marginBottom: 20 },
  inputLabel: { color: '#fff', fontSize: 16, marginBottom: 10 },
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
  counterButton: { color: '#fff', fontSize: 24, fontWeight: '600' },
  counterDivider: { width: 1, height: '100%', backgroundColor: '#8C85B3' },
  counterValueContainer: {
    flex: 2,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: { color: '#fff', fontSize: 18, fontWeight: '600' },
  // Same as OfficeListingScreen amenity checkbox row (one-to-one copy)
  amenityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 12,
  },
  amenityText: { color: '#fff', fontSize: 16 },
  radioSpacer: { width: 15 },
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
  radioButtonSelected: { width: 17, height: 17 },
  // Same as OfficeListingScreen amenity quantity pills (one-to-one copy)
  amenityQuantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    justifyContent: 'flex-end',
  },
  amenityQuantityButtonContainer: {
    marginLeft: 8,
  },
  amenityQuantityButton: {
    backgroundColor: '#2B2A39',
    borderWidth: 1,
    borderColor: '#8C85B3',
    borderRadius: 846.154,
    width: 56,
    height: 40,
    paddingHorizontal: 8,
    paddingVertical: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  amenityQuantityButtonSelected: {
    borderRadius: 846.154,
    width: 56,
    height: 40,
    paddingHorizontal: 8,
    paddingVertical: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  amenityQuantityText: {
    color: '#fff',
    fontSize: 14,
  },
  amenityQuantityTextSelected: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  amenityQuantityDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#8C85B3',
    marginLeft: 6,
  },
  amenityQuantityDotSelected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1A1B3A',
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amenityQuantityDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  saveBtnWrap: { marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnImage: { width: '100%', height: 54 },
  clearWrap: { alignItems: 'center' },
  clearText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, textDecorationLine: 'underline' },
});

export default RoomsFilterScreen;
