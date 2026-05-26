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
  I18nManager,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import FilterSaveButton from '../components/FilterSaveButton';
import AmenityQuantityPill from '../components/AmenityQuantityPill';
import {flexStart, forceLtrStyle} from '../utils/rtlLayout';

const BG = '#2B2A39';
const DIVIDER = '#373548';
const INPUT_BORDER = '#8C85B3';

const MENU_ICON = require('../assets/buttom-bar/rooms_number.png');
const FILTER_CHECK = require('../assets/filter-check.png');

const RoomsFilterScreen = ({
  initialFilter,
  onClose,
  onSave,
  selectedCategory,
}) => {
  const insets = useSafeAreaInsets();
  const {height: screenHeight} = useWindowDimensions();
  const compact = screenHeight < 760;
  const isBnb = selectedCategory === 5 || selectedCategory === '5';

  const [area, setArea] = useState(initialFilter?.area ?? 60);
  const [rooms, setRooms] = useState(initialFilter?.rooms ?? 2);
  const [floor, setFloor] = useState(initialFilter?.floor ?? 2);
  const [parkingEnabled, setParkingEnabled] = useState(
    initialFilter != null && initialFilter.parking != null,
  );
  const [parkingValue, setParkingValue] = useState(initialFilter?.parking ?? 1);
  const [balconyEnabled, setBalconyEnabled] = useState(
    initialFilter != null && initialFilter.balcony != null,
  );
  const [balconyValue, setBalconyValue] = useState(initialFilter?.balcony ?? 1);
  const [elevator, setElevator] = useState(initialFilter?.elevator ?? false);
  const [mamad, setMamad] = useState(initialFilter?.mamad ?? false);
  const [freeParking, setFreeParking] = useState(
    initialFilter?.freeParking ?? false,
  );
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
          elevator: elevator || null,
          mamad: null,
          freeParking: freeParking || null,
        });
      } else {
        onSave({
          area,
          rooms,
          floor,
          parking: parkingEnabled ? parkingValue : null,
          balcony: balconyEnabled ? balconyValue : null,
          elevator: elevator || null,
          mamad: mamad || null,
          freeParking: null,
        });
      }
    }
    onClose?.();
  };

  const handleClear = () => {
    if (onSave) onSave(null);
    onClose?.();
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
            {!!suffix && (
              <Text style={styles.counterValueSuffix}>{suffix}</Text>
            )}
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
    <TouchableOpacity
      style={styles.amenityOption}
      onPress={onToggle}
      activeOpacity={0.8}>
      <View style={styles.checkboxWrap}>
        {checked ? (
          <Image
            source={FILTER_CHECK}
            style={styles.filterCheckImage}
            resizeMode="contain"
            accessibilityLabel="מסומן"
          />
        ) : (
          <View style={styles.checkboxCircle} />
        )}
      </View>
      <Text style={styles.amenityText}>{label}</Text>
    </TouchableOpacity>
  );

  const OptionPills = ({selected, onSelect}) => (
    <View style={styles.amenityQuantitySelector}>
      {[4, 3, 2, 1].map(qty => (
        <AmenityQuantityPill
          key={qty}
          qty={qty}
          selected={selected === qty}
          onPress={() => onSelect(qty)}
          style={styles.amenityQuantityButtonContainer}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={{height: insets.top}} />
      <View style={styles.topRail}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onClose}
          style={styles.handlePressArea}>
          <View style={styles.handle} />
        </TouchableOpacity>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: compact ? 16 : 24,
            paddingBottom: compact ? 16 : 24,
          },
        ]}
        scrollEnabled
        showsVerticalScrollIndicator={false}>
        <View style={[styles.header, compact && styles.headerCompact]}>
          <Image
            source={MENU_ICON}
            style={styles.headerIcon}
            resizeMode="contain"
          />
          <Text style={styles.title}>חדרים</Text>
        </View>

        {!isBnb && (
          <StepperRow
            label="שטח הנכס"
            value={area}
            suffix='מ"ר'
            onMinus={() => setArea(v => Math.max(1, v - 1))}
            onPlus={() => setArea(v => v + 1)}
            onCommitValue={next => setArea(Math.max(1, next))}
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
            <CheckRow
              label='ממ"ד'
              checked={mamad}
              onToggle={() => setMamad(!mamad)}
            />
            <View style={styles.divider} />
          </>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          compact && styles.footerCompact,
          {paddingBottom: bottomInset + 8},
        ]}>
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
  scrollContent: {paddingHorizontal: 24, paddingTop: 24},
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
    textAlign: 'left',
  },
  counterInput: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    overflow: 'hidden',
    ...forceLtrStyle,
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
    justifyContent: flexStart,
    paddingVertical: 10,
  },
  amenityText: {color: '#fff', fontSize: 18, fontFamily: 'Rubik-Regular'},
  checkboxWrap: {
    width: 24,
    height: 24,
    marginRight: 10,
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
  /** Full control: golden ring + check from `filter-check.png` (checked state only). */
  filterCheckImage: {
    width: 22,
    height: 22,
  },
  amenityQuantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    justifyContent: flexStart,
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
    justifyContent: flexStart,
  },
  amenityQuantityButtonSelected: {
    borderRadius: 846.154,
    width: 56,
    height: 40,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
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
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  footerCompact: {paddingTop: 8},
  saveBtnWrap: {marginBottom: 12, width: '100%'},
  clearWrap: {alignItems: 'center'},
  clearText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textDecorationLine: 'underline',
  },
});

export default RoomsFilterScreen;
