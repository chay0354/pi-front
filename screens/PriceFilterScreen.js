import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  useWindowDimensions,
  PanResponder,
  Platform,
  I18nManager,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import FilterSaveButton from '../components/FilterSaveButton';
import {CalendarModal} from '../components/FormsElement/CalendarModal';
import {FigmaCheckbox} from '../components/FigmaCheckbox';
import {flexEnd} from '../index';

const BG = '#2B2A39';
const DIVIDER = '#373548';
const INPUT_BORDER = '#8C85B3';
const MAX_PRICE_DEFAULT = 10000000;
const MAX_PRICE_BNB = 10000;
/** Non–BnB: slider and taps move in 1,000,000 increments (aligns with מחיר ± in forms). */
const PRICE_SLIDER_STEP = 1000000;
const BNB_PRICE_SLIDER_STEP = 100;
// BnB: default max (₪/night) when no saved filter. Non-BnB uses `MAX_PRICE_DEFAULT` (0–10M+).
const INITIAL_MAX_PRICE_BNB = 1000;
const MENU_ICON = require('../assets/buttom-bar/price.png');
const CALENDAR_ICON = require('../assets/calendarIcon.png');

const formatPrice = n => `₪${Math.max(0, Number(n) || 0).toLocaleString()}`;

const toIsoDate = value => {
  if (!value) return null;
  const text = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};

const formatDateForDisplay = isoDate => {
  const safe = toIsoDate(isoDate);
  if (!safe) return 'DD.MM.YY';
  const [year, month, day] = safe.split('-');
  return `${day}.${month}.${year.slice(2)}`;
};

function getSliderPercentFromEvent(nativeEvent, trackWidth, sliderViewRef) {
  const w = trackWidth > 0 ? trackWidth : 1;
  const ne = nativeEvent;
  if (typeof ne.locationX === 'number' && !Number.isNaN(ne.locationX)) {
    return Math.max(0, Math.min(100, (ne.locationX / w) * 100));
  }
  const node = sliderViewRef && sliderViewRef.current;
  const touch = ne.touches?.[0] || ne;
  if (
    node &&
    typeof node.getBoundingClientRect === 'function' &&
    (touch?.clientX != null || touch?.pageX != null)
  ) {
    const rect = node.getBoundingClientRect();
    const x = (touch.clientX != null ? touch.clientX : touch.pageX) - rect.left;
    return Math.max(0, Math.min(100, (x / (rect.width || w)) * 100));
  }
  return 0;
}

const PriceFilterScreen = ({
  initialFilter,
  onClose,
  onSave,
  selectedCategory,
}) => {
  const insets = useSafeAreaInsets();
  const {height: screenHeight} = useWindowDimensions();
  const compact = screenHeight < 760;
  const isBnb = selectedCategory === 5 || selectedCategory === '5';
  const maxPriceCap = isBnb ? MAX_PRICE_BNB : MAX_PRICE_DEFAULT;

  const [minPrice, setMinPrice] = useState(
    Math.max(0, Math.min(initialFilter?.minPrice ?? 0, maxPriceCap)),
  );
  const [maxPrice, setMaxPrice] = useState(() => {
    if (initialFilter?.maxPrice != null) {
      return Math.max(0, Math.min(Number(initialFilter.maxPrice), maxPriceCap));
    }
    // No saved price filter: default 0 to 10,000,000+ (non-BnB) or BnB default scale.
    return isBnb ? Math.min(INITIAL_MAX_PRICE_BNB, maxPriceCap) : maxPriceCap;
  });
  const [checkInDate, setCheckInDate] = useState(
    toIsoDate(initialFilter?.checkInDate),
  );
  const [checkOutDate, setCheckOutDate] = useState(
    toIsoDate(initialFilter?.checkOutDate),
  );
  const [freeCancellation, setFreeCancellation] = useState(
    initialFilter?.freeCancellation === true,
  );
  const [hotDealOnly, setHotDealOnly] = useState(
    initialFilter?.hotDealOnly === true,
  );
  const [calendarTarget, setCalendarTarget] = useState(null);

  const [minFocused, setMinFocused] = useState(false);
  const [maxFocused, setMaxFocused] = useState(false);
  const [minDraft, setMinDraft] = useState('');
  const [maxDraft, setMaxDraft] = useState('');
  const [sliderWidth, setSliderWidth] = useState(1);
  const sliderWidthRef = useRef(1);
  const activeThumbRef = useRef(null);
  const sliderRef = useRef(null);
  const minPriceRef = useRef(minPrice);
  const maxPriceRef = useRef(maxPrice);
  minPriceRef.current = minPrice;
  maxPriceRef.current = maxPrice;
  const bottomInset = Math.max(insets.bottom, 8);

  const minPercent = useMemo(
    () => (minPrice / maxPriceCap) * 100,
    [minPrice, maxPriceCap],
  );
  const maxPercent = useMemo(
    () => (maxPrice / maxPriceCap) * 100,
    [maxPrice, maxPriceCap],
  );

  const applyPriceFromPercent = useCallback(
    (percent, isMin) => {
      const cap = maxPriceCap;
      const minGap = isBnb ? 1 : PRICE_SLIDER_STEP;
      let value = (percent / 100) * cap;
      if (isBnb) {
        value =
          Math.round(value / BNB_PRICE_SLIDER_STEP) * BNB_PRICE_SLIDER_STEP;
      } else {
        value = Math.round(value / PRICE_SLIDER_STEP) * PRICE_SLIDER_STEP;
      }
      value = Math.max(0, Math.min(cap, value));
      const minP = minPriceRef.current;
      const maxP = maxPriceRef.current;
      if (isMin) {
        setMinPrice(Math.max(0, Math.min(value, Math.max(0, maxP - minGap))));
        return;
      }
      setMaxPrice(Math.min(cap, Math.max(value, minP + minGap)));
    },
    [isBnb, maxPriceCap],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: evt => {
          const w = sliderWidthRef.current;
          const percent = getSliderPercentFromEvent(
            evt.nativeEvent,
            w,
            sliderRef,
          );
          const cap = maxPriceCap;
          const minP = (minPriceRef.current / cap) * 100;
          const maxP = (maxPriceRef.current / cap) * 100;
          const nearestMin =
            Math.abs(percent - minP) < Math.abs(percent - maxP);
          activeThumbRef.current = nearestMin ? 'min' : 'max';
          applyPriceFromPercent(percent, activeThumbRef.current === 'min');
        },
        onPanResponderMove: evt => {
          const thumb = activeThumbRef.current;
          if (!thumb) return;
          const w = sliderWidthRef.current;
          const percent = getSliderPercentFromEvent(
            evt.nativeEvent,
            w,
            sliderRef,
          );
          applyPriceFromPercent(percent, thumb === 'min');
        },
        onPanResponderRelease: () => {
          activeThumbRef.current = null;
        },
      }),
    [applyPriceFromPercent, maxPriceCap],
  );

  const handleSave = () => {
    onSave?.({
      minPrice,
      maxPrice,
      ...(isBnb
        ? {
            checkInDate,
            checkOutDate,
            freeCancellation,
            hotDealOnly,
          }
        : {}),
    });
    onClose?.();
  };

  const handleClear = () => {
    onSave?.(null);
    onClose?.();
  };

  const digitsOnly = text =>
    String(text ?? '')
      .replace(/[^\d]/g, '')
      .slice(0, 10);

  const commitMinDraft = () => {
    const n = minDraft === '' ? 0 : Number(minDraft);
    const safe = Number.isFinite(n) ? n : 0;
    const maxP = maxPriceRef.current;
    const minGap = isBnb ? 1 : PRICE_SLIDER_STEP;
    let next = Math.max(0, Math.min(safe, Math.max(0, maxP - minGap)));
    if (!isBnb) {
      next = Math.round(next / PRICE_SLIDER_STEP) * PRICE_SLIDER_STEP;
      next = Math.max(0, Math.min(next, Math.max(0, maxP - minGap)));
    }
    setMinPrice(next);
    setMinDraft('');
    setMinFocused(false);
  };

  const commitMaxDraft = () => {
    const n = maxDraft === '' ? 0 : Number(maxDraft);
    const safe = Number.isFinite(n) ? n : 0;
    const minP = minPriceRef.current;
    const minGap = isBnb ? 1 : PRICE_SLIDER_STEP;
    let next = Math.min(maxPriceCap, Math.max(safe, minP + minGap));
    if (!isBnb) {
      next = Math.round(next / PRICE_SLIDER_STEP) * PRICE_SLIDER_STEP;
      next = Math.min(maxPriceCap, Math.max(next, minP + minGap));
    }
    setMaxPrice(next);
    setMaxDraft('');
    setMaxFocused(false);
  };

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
        showsVerticalScrollIndicator={false}>
        <View style={[styles.header, compact && styles.headerCompact]}>
          <Image
            source={MENU_ICON}
            style={styles.headerIcon}
            resizeMode="contain"
          />
          <Text style={styles.title}>מחיר</Text>
        </View>

        <View style={styles.priceInputsRowBleed}>
          <View style={styles.priceInputsRow}>
            <View style={styles.priceInputGroup}>
              <View style={styles.pricePill}>
                <Text style={styles.pricePillPrefix}>
                  {!isBnb && (Number(maxPrice) || 0) === MAX_PRICE_DEFAULT
                    ? '+ ₪'
                    : '₪'}
                </Text>
                <TextInput
                  value={
                    maxFocused
                      ? maxDraft
                      : Math.max(0, Number(maxPrice) || 0).toLocaleString()
                  }
                  onFocus={() => {
                    setMaxFocused(true);
                    setMaxDraft(String(Math.max(0, Number(maxPrice) || 0)));
                  }}
                  onChangeText={text => setMaxDraft(digitsOnly(text))}
                  onBlur={commitMaxDraft}
                  onSubmitEditing={commitMaxDraft}
                  keyboardType="numeric"
                  inputMode="numeric"
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={styles.pricePillInput}
                  textAlign={'left'}
                  selectTextOnFocus
                  returnKeyType="done"
                />
              </View>
            </View>
            <Text style={styles.priceDash}>-</Text>
            <View style={styles.priceInputGroup}>
              <View style={styles.pricePill}>
                <Text style={styles.pricePillPrefix}>₪</Text>
                <TextInput
                  value={
                    minFocused
                      ? minDraft
                      : Math.max(0, Number(minPrice) || 0).toLocaleString()
                  }
                  onFocus={() => {
                    setMinFocused(true);
                    setMinDraft(String(Math.max(0, Number(minPrice) || 0)));
                  }}
                  onChangeText={text => setMinDraft(digitsOnly(text))}
                  onBlur={commitMinDraft}
                  onSubmitEditing={commitMinDraft}
                  keyboardType="numeric"
                  inputMode="numeric"
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={styles.pricePillInput}
                  textAlign={'left'}
                  selectTextOnFocus
                  returnKeyType="done"
                />
              </View>
            </View>
          </View>
        </View>

        <View
          ref={sliderRef}
          style={styles.sliderContainer}
          onLayout={e => {
            const w = e.nativeEvent.layout.width;
            if (w > 0) {
              sliderWidthRef.current = w;
              setSliderWidth(w);
            }
          }}
          {...panResponder.panHandlers}
          collapsable={false}>
          <View style={styles.sliderTrack}>
            <View
              style={[
                styles.sliderTrackFill,
                {
                  left: `${minPercent}%`,
                  width: `${Math.max(0, maxPercent - minPercent)}%`,
                },
              ]}
            />
          </View>
          <View
            style={[styles.sliderThumb, {left: `${minPercent}%`}]}
            pointerEvents="none">
            <View style={styles.sliderThumbCore} />
          </View>
          <View
            style={[styles.sliderThumb, {left: `${maxPercent}%`}]}
            pointerEvents="none">
            <View style={styles.sliderThumbCore} />
          </View>
        </View>

        {isBnb ? (
          <>
            <View style={styles.divider} />
            <View style={styles.dateSection}>
              <Text style={styles.dateLabel}>
                <Text style={styles.requiredAsterisk}>*</Text>
                תאריך כניסה
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.datePill}
                onPress={() => setCalendarTarget('checkIn')}>
                <Text style={styles.dateText}>
                  {formatDateForDisplay(checkInDate)}
                </Text>
                <Image source={CALENDAR_ICON} style={styles.dateIcon} />
              </TouchableOpacity>
            </View>
            <View style={styles.dateSection}>
              <Text style={styles.dateLabel}>
                <Text style={styles.requiredAsterisk}>*</Text>
                תאריך יציאה
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.datePill}
                onPress={() => setCalendarTarget('checkOut')}>
                <Text style={styles.dateText}>
                  {formatDateForDisplay(checkOutDate)}
                </Text>
                <Image source={CALENDAR_ICON} style={styles.dateIcon} />
              </TouchableOpacity>
            </View>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setFreeCancellation(prev => !prev)}
              activeOpacity={0.8}>
              <Text style={styles.toggleLabel}>ביטול ללא קנס</Text>
              <FigmaCheckbox checked={freeCancellation} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleRow, styles.hotDealRow]}
              onPress={() => setHotDealOnly(prev => !prev)}
              activeOpacity={0.8}>
              <Text style={styles.toggleLabel}>דיל משתלם</Text>
              <FigmaCheckbox checked={hotDealOnly} />
            </TouchableOpacity>
            <Text style={styles.hotDealDescription}>
              אופציה זו תמצא לכם את התמורה הכי משתלמת ביחס למחיר המוצע ומחירי
              מבצע.
            </Text>
          </>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          compact && styles.footerCompact,
          {paddingBottom: bottomInset + 8},
        ]}>
        <FilterSaveButton onPress={handleSave} style={styles.saveBtnWrap} />
        {!isBnb ? (
          <TouchableOpacity style={styles.clearWrap} onPress={handleClear}>
            <Text style={styles.clearText}>נקה</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {isBnb ? (
        <CalendarModal
          visible={calendarTarget != null}
          onClose={() => setCalendarTarget(null)}
          onSelect={isoDate => {
            if (calendarTarget === 'checkIn')
              setCheckInDate(toIsoDate(isoDate));
            if (calendarTarget === 'checkOut')
              setCheckOutDate(toIsoDate(isoDate));
          }}
        />
      ) : null}
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
  scrollContent: {
    paddingHorizontal: 24,
  },
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
  priceInputsRowBleed: {
    marginHorizontal: -16,
    alignSelf: 'stretch',
  },
  priceInputsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  priceInputGroup: {
    flex: 1,
    minWidth: 0,
  },
  pricePill: {
    height: 52,
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    alignItems: 'center',
    flexDirection: 'row-reverse',
    paddingHorizontal: 16,
    gap: 6,
    overflow: 'hidden',
  },
  pricePillText: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Rubik-Medium',
  },
  pricePillPrefix: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Rubik-Medium',
  },
  pricePillInput: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    color: '#fff',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Rubik-Medium',
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? {outlineStyle: 'none'} : {}),
  },
  priceDash: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Rubik-Regular',
    marginTop: 14,
  },
  sliderContainer: {
    width: '100%',
    height: 42,
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 24,
  },
  sliderTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 1000,
    overflow: 'visible',
  },
  sliderTrackFill: {
    position: 'absolute',
    top: 0,
    height: 4,
    borderRadius: 1000,
    backgroundColor: '#FFCF4B',
  },
  sliderThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    marginLeft: -11,
    top: 10,
  },
  sliderThumbCore: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFCF4B',
    borderWidth: 1,
    borderColor: '#F3C13D',
  },
  divider: {
    height: 1,
    backgroundColor: '#252434',
    marginBottom: 24,
  },
  dateSection: {
    marginBottom: 24,
  },
  dateLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    marginBottom: 20,
  },
  requiredAsterisk: {
    color: '#FFC40A',
  },
  datePill: {
    height: 52,
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  dateText: {
    color: '#FFFFFF',
    fontFamily: 'Rubik-Regular',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  dateIcon: {
    width: 24,
    height: 24,
    marginLeft: 8,
  },
  toggleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: flexEnd,
    gap: 8,
    marginBottom: 20,
  },
  hotDealRow: {
    marginBottom: 10,
  },
  toggleLabel: {
    color: '#FFFFFF',
    fontFamily: 'Rubik-Regular',
    fontSize: 18,
    textAlign: 'left',
  },
  hotDealDescription: {
    color: '#9E9DA4',
    fontFamily: 'Rubik-Regular',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'left',
    marginBottom: 8,
    paddingRight: 32,
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
  clearWrap: {alignItems: 'center', paddingVertical: 6},
  clearText: {
    color: '#FFFFFF',
    fontFamily: 'Rubik-Regular',
    fontSize: 18,
    textDecorationLine: 'underline',
  },
});

export default PriceFilterScreen;
