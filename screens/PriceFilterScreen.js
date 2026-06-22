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
import FilterScreenBackBar from '../components/FilterScreenBackBar';
import {CalendarModal} from '../components/FormsElement/CalendarModal';
import {FigmaCheckbox} from '../components/FigmaCheckbox';
import {flexEnd, getRangeSliderPercentFromEvent} from '../utils/rtlLayout';

/**
 * RTL-visual slider helpers (price screen owns these locally so the shared helpers,
 * which compensate to LTR-visual, keep working for the other filter screens).
 *
 *   Native (Android/iOS): app forces RTL + swapLeftAndRightInRTL, so `left: X%`
 *     becomes `right: X%` automatically — 0% sits on the right.
 *   Web: <html dir="rtl"> doesn't flip absolute `left` — use `right` directly.
 */
const RANGE_SLIDER_THUMB_SIZE = 22;
const IS_WEB = Platform.OS === 'web';

function priceThumbStyle(percent) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  return IS_WEB
    ? {right: `${p}%`, marginRight: -RANGE_SLIDER_THUMB_SIZE / 2}
    : {left: `${p}%`, marginLeft: -RANGE_SLIDER_THUMB_SIZE / 2};
}

function priceFillStyle(minPercent, maxPercent) {
  const min = Math.max(0, Math.min(100, Number(minPercent) || 0));
  const max = Math.max(0, Math.min(100, Number(maxPercent) || 0));
  const w = Math.max(0, max - min);
  return IS_WEB
    ? {right: `${min}%`, width: `${w}%`}
    : {left: `${min}%`, width: `${w}%`};
}

/** Touch X is always LTR-physical; map to value% by flipping under RTL visual. */
const PRICE_SLIDER_IS_RTL_VISUAL = IS_WEB || I18nManager.isRTL;
const touchPercentToValuePercent = touchPercent =>
  PRICE_SLIDER_IS_RTL_VISUAL ? 100 - touchPercent : touchPercent;

const BG = '#2B2A39';
const DIVIDER = '#373548';
const INPUT_BORDER = '#8C85B3';
const MAX_PRICE_DEFAULT = 10000000;
const MAX_PRICE_LAND = 100000000;
const MAX_PRICE_BNB = 10000;
/** Non–BnB (except land): slider moves in ₪1,000 increments. Land keeps ₪1M steps on the 100M scale. */
const PRICE_SLIDER_STEP = 1000;
const PRICE_SLIDER_STEP_LAND = 1000000;
const BNB_PRICE_SLIDER_STEP = 100;
// BnB: default max (₪/night) when no saved filter. Non-BnB uses `MAX_PRICE_DEFAULT` (0–10M+).
const INITIAL_MAX_PRICE_BNB = 1000;
const MENU_ICON = require('../assets/buttom-bar/price.png');
const CALENDAR_ICON = require('../assets/calendarIcon.png');

// Use a regex-based formatter (instead of `Number.toLocaleString()` without an
// explicit locale) so prices always render with comma thousand separators
// like "₪1,234,567" — never the dot style that some device locales / Hermes
// builds produce (e.g. "1.234.567") which users read as a malformed decimal.
const formatPrice = n =>
  `₪${String(Math.round(Math.max(0, Number(n) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

/** Strip commas/spaces/₪ — manual entry is digits-only; commas are display-only when blurred. */
const parsePriceDigits = text => {
  const digits = String(text ?? '').replace(/[^\d]/g, '');
  if (!digits) return 0;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
};

const formatPriceDigits = n =>
  String(Math.round(Math.max(0, Number(n) || 0))).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ',',
  );

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
  const isLand = selectedCategory === 7 || selectedCategory === '7';
  const maxPriceCap = isBnb
    ? MAX_PRICE_BNB
    : isLand
      ? MAX_PRICE_LAND
      : MAX_PRICE_DEFAULT;
  const priceSliderStep = isBnb
    ? BNB_PRICE_SLIDER_STEP
    : isLand
      ? PRICE_SLIDER_STEP_LAND
      : PRICE_SLIDER_STEP;

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
  const sliderWindowXRef = useRef(0);
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
      const minGap = isBnb ? 1 : priceSliderStep;
      let value = (percent / 100) * cap;
      if (isBnb) {
        value =
          Math.round(value / BNB_PRICE_SLIDER_STEP) * BNB_PRICE_SLIDER_STEP;
      } else {
        value = Math.round(value / priceSliderStep) * priceSliderStep;
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
    [isBnb, maxPriceCap, priceSliderStep],
  );

  const syncSliderMeasure = useCallback(() => {
    const node = sliderRef.current;
    if (!node || typeof node.measureInWindow !== 'function') return;
    node.measureInWindow((x, _y, width) => {
      if (width > 0) {
        sliderWindowXRef.current = x;
        sliderWidthRef.current = width;
        setSliderWidth(width);
      }
    });
  }, []);

  const percentFromNativeEvent = useCallback(nativeEvent => {
    const raw = getRangeSliderPercentFromEvent(
      nativeEvent,
      sliderWidthRef.current,
      sliderWindowXRef.current,
      sliderRef,
    );
    return touchPercentToValuePercent(raw);
  }, []);

  const handleSliderPressAtPercent = useCallback(
    percent => {
      const cap = maxPriceCap;
      const minP = (minPriceRef.current / cap) * 100;
      const maxP = (maxPriceRef.current / cap) * 100;
      const nearestMin =
        Math.abs(percent - minP) < Math.abs(percent - maxP);
      activeThumbRef.current = nearestMin ? 'min' : 'max';
      applyPriceFromPercent(percent, activeThumbRef.current === 'min');
    },
    [applyPriceFromPercent, maxPriceCap],
  );

  const applyDragPercent = useCallback(
    percent => {
      const thumb = activeThumbRef.current;
      if (!thumb) return;
      applyPriceFromPercent(percent, thumb === 'min');
    },
    [applyPriceFromPercent],
  );

  const refreshMeasureThen = useCallback(
    (nativeEvent, onReady) => {
      const node = sliderRef.current;
      if (!node || typeof node.measureInWindow !== 'function') {
        onReady(percentFromNativeEvent(nativeEvent));
        return;
      }
      node.measureInWindow((x, _y, width) => {
        if (width > 0) {
          sliderWindowXRef.current = x;
          sliderWidthRef.current = width;
        }
        onReady(percentFromNativeEvent(nativeEvent));
      });
    },
    [percentFromNativeEvent],
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
          refreshMeasureThen(evt.nativeEvent, handleSliderPressAtPercent);
        },
        onPanResponderMove: evt => {
          if (!activeThumbRef.current) return;
          refreshMeasureThen(evt.nativeEvent, applyDragPercent);
        },
        onPanResponderRelease: () => {
          activeThumbRef.current = null;
        },
      }),
    [refreshMeasureThen, handleSliderPressAtPercent, applyDragPercent],
  );

  const digitsOnly = text => String(text ?? '').replace(/[^\d]/g, '').slice(0, 11);

  const clampMinPrice = useCallback(
    raw => {
      const safe = parsePriceDigits(raw);
      const maxP = maxPriceRef.current;
      const minGap = isBnb ? 1 : priceSliderStep;
      // Manual typing: keep exact digits (slider alone snaps to step in applyPriceFromPercent).
      return Math.max(0, Math.min(safe, Math.max(0, maxP - minGap)));
    },
    [isBnb, priceSliderStep],
  );

  const clampMaxPrice = useCallback(
    raw => {
      const safe = parsePriceDigits(raw);
      const minP = minPriceRef.current;
      const minGap = isBnb ? 1 : priceSliderStep;
      return Math.min(maxPriceCap, Math.max(safe, minP + minGap));
    },
    [isBnb, maxPriceCap, priceSliderStep],
  );

  const commitMinDraft = () => {
    const normalized = digitsOnly(minDraft);
    if (!normalized) {
      setMinDraft('');
      setMinFocused(false);
      return;
    }
    const next = clampMinPrice(minDraft);
    setMinPrice(next);
    setMinDraft('');
    setMinFocused(false);
  };

  const commitMaxDraft = () => {
    const normalized = digitsOnly(maxDraft);
    if (!normalized) {
      setMaxDraft('');
      setMaxFocused(false);
      return;
    }
    const next = clampMaxPrice(maxDraft);
    setMaxPrice(next);
    setMaxDraft('');
    setMaxFocused(false);
  };

  const handleSave = () => {
    const savedMin =
      minFocused && digitsOnly(minDraft)
        ? clampMinPrice(minDraft)
        : minPrice;
    const savedMax =
      maxFocused && digitsOnly(maxDraft)
        ? clampMaxPrice(maxDraft)
        : maxPrice;
    if (minFocused) {
      setMinPrice(savedMin);
      setMinDraft('');
      setMinFocused(false);
    }
    if (maxFocused) {
      setMaxPrice(savedMax);
      setMaxDraft('');
      setMaxFocused(false);
    }
    onSave?.({
      minPrice: savedMin,
      maxPrice: savedMax,
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

  return (
    <View style={styles.container}>
      <View style={{height: insets.top}} />
      <FilterScreenBackBar onClose={onClose} />

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
                <Text style={styles.pricePillPrefix}>₪</Text>
                <TextInput
                  value={
                    minFocused
                      ? minDraft
                      : formatPriceDigits(minPrice)
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
            <Text style={styles.priceDash}>-</Text>
            <View style={styles.priceInputGroup}>
              <View style={styles.pricePill}>
                <Text style={styles.pricePillPrefix}>₪</Text>
                <TextInput
                  value={
                    maxFocused
                      ? maxDraft
                      : formatPriceDigits(maxPrice)
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
                <Text style={styles.pricePillPrefix}>
                  {!isBnb && (Number(maxPrice) || 0) === maxPriceCap ? '+' : ''}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View
          ref={sliderRef}
          style={styles.sliderContainer}
          onLayout={() => {
            syncSliderMeasure();
          }}
          {...panResponder.panHandlers}
          collapsable={false}>
          <View style={styles.sliderTrack}>
            <View
              style={[
                styles.sliderTrackFill,
                priceFillStyle(minPercent, maxPercent),
              ]}
            />
          </View>
          <View
            style={[styles.sliderThumb, priceThumbStyle(minPercent)]}
            pointerEvents="none">
            <View style={styles.sliderThumbCore} />
          </View>
          <View
            style={[styles.sliderThumb, priceThumbStyle(maxPercent)]}
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
        <TouchableOpacity style={styles.clearWrap} onPress={handleClear}>
          <Text style={styles.clearText}>נקה</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
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
    flexDirection: 'row',
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
