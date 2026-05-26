import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  I18nManager,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {SvgXml} from 'react-native-svg';
import {FigmaCheckbox} from '../components/FigmaCheckbox';
import FilterSaveButton from '../components/FilterSaveButton';
import {forceLtrStyle} from '../utils/rtlLayout';

const BG = '#2B2A39';
const TYPE_MENU_ICON_SVG = `<svg preserveAspectRatio="none" width="100%" height="100%" overflow="visible" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g><g><path d="M2 5C2 4.44772 2.44772 4 3 4H9C9.55228 4 10 4.44772 10 5V9C10 9.55228 9.55228 10 9 10H3C2.44772 10 2 9.55228 2 9V5Z" stroke="white" stroke-width="1.05682"/><path d="M16.6588 4.3085C17.0525 3.69618 17.9475 3.69618 18.3412 4.3085L21.0095 8.45924C21.4373 9.12475 20.9595 10 20.1683 10H14.8317C14.0405 10 13.5627 9.12475 13.9905 8.45924L16.6588 4.3085Z" stroke="white" stroke-width="1.14286"/></g><g><circle cx="6" cy="17.2422" r="3.5" stroke="white" stroke-width="1.05682"/><path d="M14.2071 16.5351L14.5607 16.8886L17.3891 14.0602L17.0355 13.7067L16.682 13.3531L13.8536 16.1815L14.2071 16.5351ZM18.4497 13.7067L18.0962 14.0602L20.9246 16.8886L21.2782 16.5351L21.6317 16.1815L18.8033 13.3531L18.4497 13.7067ZM21.2782 17.9493L20.9246 17.5957L18.0962 20.4242L18.4497 20.7777L18.8033 21.1313L21.6317 18.3028L21.2782 17.9493ZM17.0355 20.7777L17.3891 20.4242L14.5607 17.5957L14.2071 17.9493L13.8536 18.3028L16.682 21.1313L17.0355 20.7777ZM18.4497 20.7777L18.0962 20.4242C17.9009 20.6194 17.5843 20.6194 17.3891 20.4242L17.0355 20.7777L16.682 21.1313C17.2678 21.7171 18.2175 21.7171 18.8033 21.1313L18.4497 20.7777ZM21.2782 16.5351L20.9246 16.8886C21.1199 17.0839 21.1199 17.4005 20.9246 17.5957L21.2782 17.9493L21.6317 18.3028C22.2175 17.7171 22.2175 16.7673 21.6317 16.1815L21.2782 16.5351ZM17.0355 13.7067L17.3891 14.0602C17.5843 13.8649 17.9009 13.8649 18.0962 14.0602L18.4497 13.7067L18.8033 13.3531C18.2175 12.7673 17.2678 12.7673 16.682 13.3531L17.0355 13.7067ZM14.2071 16.5351L13.8536 16.1815C13.2678 16.7673 13.2678 17.7171 13.8536 18.3028L14.2071 17.9493L14.5607 17.5957C14.3654 17.4005 14.3654 17.0839 14.5607 16.8886L14.2071 16.5351Z" fill="white"/></g></g></svg>`;
const OfficeFilterScreen = ({initialFilter, onClose, onSave}) => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  const [area, setArea] = useState(initialFilter?.minArea ?? 50);
  const [rooms, setRooms] = useState(initialFilter?.minRooms ?? 2);
  const [wholeFloor, setWholeFloor] = useState(
    initialFilter?.wholeFloor ?? false,
  );
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

    useEffect(() => {
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
      <View style={styles.stepperField}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={styles.counterInput}>
          <TouchableOpacity style={styles.counterButtonLeft} onPress={onPlus}>
            <Text style={styles.counterButton}>+</Text>
          </TouchableOpacity>
          <View style={styles.counterDividerV} />
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
              <Text style={styles.counterValueSuffix}> {suffix}</Text>
            )}
          </View>
          <View style={styles.counterDividerV} />
          <TouchableOpacity style={styles.counterButtonRight} onPress={onMinus}>
            <Text style={styles.counterButton}>−</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const checkRingStyle = checked =>
    !checked
      ? {
          borderColor: '#8C85B3',
          borderWidth: 1,
          backgroundColor: 'transparent',
        }
      : undefined;

  /** Label first, checkbox on the end — Hebrew reads RTL so the mark sits to the “writing” end of the row (visually right on LTR web). */
  const CheckRow = ({label, checked, onToggle}) => (
    <TouchableOpacity
      style={styles.checkRow}
      onPress={onToggle}
      activeOpacity={0.8}
      accessibilityRole="checkbox"
      accessibilityState={{checked}}>
      <FigmaCheckbox
        checked={checked}
        size={24}
        style={checkRingStyle(checked)}
      />
      <Text style={styles.amenityText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={{height: insets.top}} />
      <View style={styles.topHandleWrap}>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
          style={styles.handlePressArea}
          activeOpacity={0.8}>
          <View style={styles.handleBar} />
        </TouchableOpacity>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <SvgXml
            xml={TYPE_MENU_ICON_SVG}
            width={24}
            height={24}
            style={styles.headerIcon}
          />
          <Text style={styles.title}>סוג</Text>
        </View>

        <View style={styles.stepperGroup}>
          <StepperRow
            label="גודל המשרד"
            value={area}
            suffix="מ״ר"
            onMinus={() => setArea(v => Math.max(1, v - 1))}
            onPlus={() => setArea(v => v + 1)}
            onCommitValue={next => setArea(Math.max(1, next))}
          />
          <StepperRow
            label="מספר חדרים"
            value={rooms}
            onMinus={() => setRooms(Math.max(0, rooms - 1))}
            onPlus={() => setRooms(rooms + 1)}
            onCommitValue={next => setRooms(Math.max(0, next))}
          />
        </View>

        <View style={styles.checkGroup}>
          <CheckRow
            label="קומה שלמה"
            checked={wholeFloor}
            onToggle={() => setWholeFloor(!wholeFloor)}
          />
          <CheckRow
            label="חניה"
            checked={parking}
            onToggle={() => setParking(!parking)}
          />
          <CheckRow
            label="מעלית"
            checked={elevator}
            onToggle={() => setElevator(!elevator)}
          />
          <CheckRow
            label="ממ״ד"
            checked={mamad}
            onToggle={() => setMamad(!mamad)}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, {paddingBottom: bottomInset + 8}]}>
        <FilterSaveButton onPress={handleSave} />
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
  topHandleWrap: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#373548',
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handlePressArea: {
    width: 42,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {flex: 1},
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
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
    borderRadius: 3.123,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    maxWidth: 366,
  },
  headerIcon: {width: 24, height: 24},
  title: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5447,
    fontFamily: 'Rubik-Regular',
    marginTop: 10,
  },
  stepperGroup: {
    width: '100%',
    maxWidth: 366,
    gap: 24,
  },
  stepperField: {width: '100%'},
  inputLabel: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 18,
    textAlign: 'left',
    marginBottom: 20,
    paddingRight: 16,
    minHeight: 24,
    fontFamily: 'Rubik-Regular',
  },
  counterInput: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: '#2B2A39',
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: '#8C85B3',
    overflow: 'hidden',
    paddingHorizontal: 0,
    ...forceLtrStyle,
  },
  counterButtonLeft: {
    width: 56,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButtonRight: {
    width: 56,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterDividerV: {width: 1, height: '100%', backgroundColor: '#343243'},
  counterButton: {
    color: '#fff',
    fontSize: 30,
    lineHeight: 32,
    fontFamily: 'Rubik-Regular',
  },
  counterValueContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  counterValueInput: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '500',
    fontFamily: 'Rubik-Medium',
    minWidth: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlign: 'center',
  },
  counterValueSuffix: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '500',
    fontFamily: 'Rubik-Medium',
  },
  checkGroup: {
    width: '100%',
    maxWidth: 366,
    marginTop: 24,
    gap: 16,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minHeight: 24,
    paddingVertical: 10,
    gap: 12,
  },
  amenityText: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    flex: 1,
    minWidth: 0,
  },
  clearWrap: {marginTop: 24, alignItems: 'center', marginBottom: 0},
  clearText: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 18,
    textDecorationLine: 'underline',
    fontFamily: 'Rubik-Regular',
  },
});

export default OfficeFilterScreen;
