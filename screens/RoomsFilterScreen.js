import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const BG = '#2B2A39';
const DIVIDER = '#373548';
const INPUT_BORDER = '#8C85B3';
const GOLD = ['#FEE787', '#BD9947', '#9C6522'];
const GOLD_LOCATIONS = [0.0456, 0.5076, 0.8831];

// Figma assets for node 12:75174
const CHECKBOX_ACTIVE =
  'https://www.figma.com/api/mcp/asset/725a7cfa-bcc5-4439-aa9c-e6bebc8f65b7';
const CHECKBOX_INACTIVE =
  'https://www.figma.com/api/mcp/asset/7700c88d-a12e-49e4-9406-f17594e99e75';
const CHECKBOX_CHECK =
  'https://www.figma.com/api/mcp/asset/4cadfe67-bbb4-4252-943e-e19f5267a121';
const MENU_ICON =
  'https://www.figma.com/api/mcp/asset/73e13e9b-5595-44df-aeb4-3fdee57a1710';

const RoomsFilterScreen = ({initialFilter, onClose, onSave}) => {
  const insets = useSafeAreaInsets();
  const {height: screenHeight} = useWindowDimensions();
  const compact = screenHeight < 760;
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
  const [mamad, setMamad] = useState(initialFilter?.mamad ?? false);
  const bottomInset = Math.max(insets.bottom, 8);

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
    onClose?.();
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

  const StepperRow = ({label, value, suffix = '', onMinus, onPlus}) => (
    <View style={styles.sectionWrap}>
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
          <Text style={styles.counterButton}>−</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />
    </View>
  );

  const CheckRow = ({label, checked, onToggle}) => (
    <TouchableOpacity style={styles.amenityOption} onPress={onToggle} activeOpacity={0.8}>
      <Text style={styles.amenityText}>{label}</Text>
      <View style={styles.checkboxWrap}>
        <Image
          source={{uri: checked ? CHECKBOX_ACTIVE : CHECKBOX_INACTIVE}}
          style={styles.checkboxImage}
          resizeMode="contain"
        />
        {checked && (
          <Image
            source={{uri: CHECKBOX_CHECK}}
            style={styles.checkboxCheck}
            resizeMode="contain"
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const OptionPills = ({selected, onSelect}) => (
    <View style={styles.amenityQuantitySelector}>
      {[4, 3, 2, 1].map(qty => (
        <TouchableOpacity
          key={qty}
          onPress={() => onSelect(qty)}
          style={styles.amenityQuantityButtonContainer}>
          {selected === qty ? (
            <LinearGradient
              colors={GOLD}
              locations={GOLD_LOCATIONS}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.amenityQuantityButtonSelected}>
              <Text style={styles.amenityQuantityTextSelected}>{qty}</Text>
              <View style={styles.amenityQuantityDotSelected}>
                <LinearGradient
                  colors={GOLD}
                  locations={GOLD_LOCATIONS}
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
      <View style={styles.topRail}>
        <Pressable
          onPress={onClose}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
          style={styles.handlePressArea}>
          <View style={styles.handle} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: compact ? 16 : 24,
            paddingBottom: bottomInset + (compact ? 20 : 52),
          },
        ]}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.header, compact && styles.headerCompact]}>
          <Image source={{uri: MENU_ICON}} style={styles.headerIcon} resizeMode="contain" />
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

        <CheckRow
          label="חנייה"
          checked={parkingEnabled}
          onToggle={() => setParkingEnabled(!parkingEnabled)}
        />
        {parkingEnabled && (
          <OptionPills selected={parkingValue} onSelect={setParkingValue} />
        )}
        <View style={styles.divider} />

        <CheckRow
          label="מרפסת"
          checked={balconyEnabled}
          onToggle={() => setBalconyEnabled(!balconyEnabled)}
        />
        {balconyEnabled && (
          <OptionPills selected={balconyValue} onSelect={setBalconyValue} />
        )}
        <View style={styles.divider} />

        <CheckRow
          label="מעלית"
          checked={elevator}
          onToggle={() => setElevator(!elevator)}
        />
        <View style={styles.divider} />

        <CheckRow label='ממ"ד' checked={mamad} onToggle={() => setMamad(!mamad)} />
        <View style={styles.divider} />

        <View style={[styles.footer, compact && styles.footerCompact]}>
          <TouchableOpacity
            style={styles.saveBtnWrap}
            onPress={handleSave}
            activeOpacity={0.9}>
            <LinearGradient
              colors={GOLD}
              locations={GOLD_LOCATIONS}
              start={{x: 0.5, y: 0}}
              end={{x: 0.5, y: 1}}
              style={styles.saveBtnGradient}>
              <Text style={styles.saveBtnText}>שמור</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearWrap} onPress={handleClear}>
            <Text style={styles.clearText}>נקה</Text>
          </TouchableOpacity>
        </View>
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
  },
  topRail: {
    height: 37,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handlePressArea: {
    width: 42,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#464646',
  },
  scroll: {flex: 1},
  scrollContent: {paddingHorizontal: 24, paddingTop: 24, flexGrow: 1},
  header: {alignItems: 'center', marginBottom: 24},
  headerCompact: {marginBottom: 16},
  headerIcon: {width: 24, height: 24},
  title: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.54,
    fontFamily: 'Rubik-Regular',
    marginTop: 10,
  },
  sectionWrap: {marginBottom: 8},
  inputLabel: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
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
  counterDivider: {width: 1, height: '100%', backgroundColor: '#343243'},
  counterValueContainer: {
    flex: 2,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {color: '#fff', fontSize: 18, fontFamily: 'Rubik-Medium'},
  divider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginTop: 20,
  },
  amenityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 10,
  },
  amenityText: {color: '#fff', fontSize: 18, fontFamily: 'Rubik-Regular'},
  checkboxWrap: {
    width: 24,
    height: 24,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxImage: {width: 24, height: 24},
  checkboxCheck: {position: 'absolute', width: 9, height: 7},
  amenityQuantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    justifyContent: 'flex-end',
  },
  amenityQuantityButtonContainer: {marginLeft: 8},
  amenityQuantityButton: {
    borderWidth: 1.5,
    borderColor: '#4D4966',
    borderRadius: 846.154,
    width: 56,
    height: 40,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  amenityQuantityButtonSelected: {
    borderRadius: 846.154,
    width: 56,
    height: 40,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  amenityQuantityText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
  },
  amenityQuantityTextSelected: {
    color: '#1E1D27',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
  },
  amenityQuantityDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#4D4966',
    marginLeft: 6,
  },
  amenityQuantityDotSelected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#27262F',
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amenityQuantityDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  footer: {marginTop: 'auto', alignItems: 'center'},
  footerCompact: {marginTop: 10},
  saveBtnWrap: {marginBottom: 12, width: '100%'},
  saveBtnGradient: {
    width: '100%',
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#1E1D27',
    fontSize: 20,
    fontFamily: 'Rubik-Medium',
    letterSpacing: 0.2,
  },
  clearWrap: {alignItems: 'center'},
  clearText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textDecorationLine: 'underline',
  },
});

export default RoomsFilterScreen;
