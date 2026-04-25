import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const BG = '#2B2A39';
const DIVIDER = '#373548';
const INPUT_BORDER = '#8C85B3';
const GOLD = ['#FEE787', '#BD9947', '#9C6522'];
const GOLD_LOCATIONS = [0.0456, 0.5076, 0.8831];

const MENU_ICON = require('../assets/buttom-bar/rooms_number.png');

const RoomsFilterScreen = ({initialFilter, onClose, onSave, selectedCategory}) => {
  const insets = useSafeAreaInsets();
  const {height: screenHeight} = useWindowDimensions();
  const compact = screenHeight < 760;
  const isBnb = selectedCategory === 5 || selectedCategory === '5';
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
  const [freeParking, setFreeParking] = useState(initialFilter?.freeParking ?? false);
  const bottomInset = Math.max(insets.bottom, 8);

  const handleSave = () => {
    if (onSave) {
      if (isBnb) {
        onSave({
          rooms,
          area: null, // BnB UI has no area input in the design
          floor,
          parking: parkingEnabled ? parkingValue : null,
          balcony: null,
          elevator,
          mamad: null,
          freeParking,
        });
      } else {
        onSave({
          area,
          rooms,
          floor,
          parking: parkingEnabled ? parkingValue : null,
          balcony: balconyEnabled ? balconyValue : null,
          elevator,
          mamad,
          freeParking: null,
        });
      }
    }
    onClose?.();
  };

  const handleClear = () => {
    setRooms(2);
    setFloor(2);
    setParkingEnabled(false);
    setParkingValue(1);
    setElevator(false);
    setFreeParking(false);
    if (!isBnb) {
      setArea(60);
      setBalconyEnabled(false);
      setBalconyValue(1);
      setMamad(false);
    }
  };

  const StepperRow = ({
    label,
    value,
    suffix = '',
    onMinus,
    onPlus,
    onCommitValue,
  }) => {
    const [draft, setDraft] = useState(String(value ?? ''));
    const inputWidth = Math.max(20, String(draft || '').length * 11);

    React.useEffect(() => {
      setDraft(String(value ?? ''));
    }, [value]);

    const commitDraft = () => {
      const normalized = String(draft ?? '').replace(/[^\d]/g, '');
      if (!normalized) {
        setDraft(String(value ?? ''));
        return;
      }
      const parsed = Number.parseInt(normalized, 10);
      if (!Number.isFinite(parsed)) {
        setDraft(String(value ?? ''));
        return;
      }
      onCommitValue(parsed);
    };

    return (
      <View style={styles.sectionWrap}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={styles.counterInput}>
          <TouchableOpacity style={styles.counterButtonLeft} onPress={onPlus}>
            <Text style={styles.counterButton}>+</Text>
          </TouchableOpacity>
          <View style={styles.counterDivider} />
          <View style={styles.counterValueContainer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onBlur={commitDraft}
              onSubmitEditing={commitDraft}
              keyboardType="numeric"
              returnKeyType="done"
              style={[styles.counterValueInput, {width: inputWidth}]}
              textAlign="center"
            />
            {!!suffix && <Text style={styles.counterValueSuffix}>{suffix}</Text>}
          </View>
          <View style={styles.counterDivider} />
          <TouchableOpacity style={styles.counterButtonRight} onPress={onMinus}>
            <Text style={styles.counterButton}>−</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />
      </View>
    );
  };

  const CheckRow = ({label, checked, onToggle}) => (
    <TouchableOpacity style={styles.amenityOption} onPress={onToggle} activeOpacity={0.8}>
      <Text style={styles.amenityText}>{label}</Text>
      <View style={styles.checkboxWrap}>
        <View
          style={[
            styles.checkboxCircle,
            checked && styles.checkboxCircleChecked,
          ]}>
          {checked ? (
            <View style={styles.checkMarkWrap}>
              <View style={styles.checkMarkShort} />
              <View style={styles.checkMarkLong} />
            </View>
          ) : null}
        </View>
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
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onClose}
          style={styles.handlePressArea}>
          <View style={styles.handle} />
        </TouchableOpacity>
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
        scrollEnabled
        showsVerticalScrollIndicator={false}>
        <View style={[styles.header, compact && styles.headerCompact]}>
          <Image source={MENU_ICON} style={styles.headerIcon} resizeMode="contain" />
          <Text style={styles.title}>חדרים</Text>
        </View>

        {!isBnb && (
          <StepperRow
            label="שטח הנכס"
            value={area}
            suffix='מ"ר'
            onMinus={() => setArea(Math.max(10, area - 10))}
            onPlus={() => setArea(area + 10)}
            onCommitValue={next => setArea(Math.max(10, next))}
          />
        )}
        <StepperRow
          label="מספר חדרים"
          value={rooms}
          onMinus={() => setRooms(Math.max(1, rooms - 1))}
          onPlus={() => setRooms(rooms + 1)}
          onCommitValue={next => setRooms(Math.max(1, next))}
        />
        <StepperRow
          label="קומה"
          value={floor}
          onMinus={() => setFloor(Math.max(0, floor - 1))}
          onPlus={() => setFloor(floor + 1)}
          onCommitValue={next => setFloor(Math.max(0, next))}
        />

        <CheckRow
          label={isBnb ? 'כמות חנייה' : 'חנייה'}
          checked={parkingEnabled}
          onToggle={() => setParkingEnabled(!parkingEnabled)}
        />
        {parkingEnabled && (
          <OptionPills selected={parkingValue} onSelect={setParkingValue} />
        )}
        <View style={styles.divider} />

        {!isBnb && (
          <>
            <CheckRow
              label="מרפסת"
              checked={balconyEnabled}
              onToggle={() => setBalconyEnabled(!balconyEnabled)}
            />
            {balconyEnabled && (
              <OptionPills selected={balconyValue} onSelect={setBalconyValue} />
            )}
            <View style={styles.divider} />
          </>
        )}

        {isBnb && (
          <>
            <CheckRow
              label="חנייה בחינם"
              checked={freeParking}
              onToggle={() => setFreeParking(!freeParking)}
            />
            <View style={styles.divider} />
          </>
        )}
        <CheckRow
          label="מעלית"
          checked={elevator}
          onToggle={() => setElevator(!elevator)}
        />
        <View style={styles.divider} />

        {!isBnb && (
          <>
            <CheckRow label='ממ"ד' checked={mamad} onToggle={() => setMamad(!mamad)} />
            <View style={styles.divider} />
          </>
        )}

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
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#A5A5A5',
    backgroundColor: '#27262F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleChecked: {
    borderColor: '#FFC140',
  },
  checkMarkWrap: {
    width: 11,
    height: 8,
    position: 'relative',
  },
  checkMarkShort: {
    position: 'absolute',
    left: 1,
    bottom: 1,
    width: 4,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#FFC140',
    transform: [{rotate: '42deg'}],
  },
  checkMarkLong: {
    position: 'absolute',
    left: 3,
    bottom: 1,
    width: 8,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#FFC140',
    transform: [{rotate: '-45deg'}],
  },
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
