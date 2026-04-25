import React, {useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  useWindowDimensions,
  PanResponder,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CalendarModal} from '../components/FormsElement/CalendarModal';
import {FigmaCheckbox} from '../components/FigmaCheckbox';

const BG = '#2B2A39';
const DIVIDER = '#373548';
const INPUT_BORDER = '#8C85B3';
const GOLD = ['#FEE787', '#BD9947', '#9C6522'];
const MAX_PRICE_DEFAULT = 10000000;
const MAX_PRICE_BNB = 10000;
// Initial max value displayed when no filter has been saved yet. The slider
// can still be dragged all the way up to `maxPriceCap`.
const INITIAL_MAX_PRICE = 1000;
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

const PriceFilterScreen = ({initialFilter, onClose, onSave, selectedCategory}) => {
  const insets = useSafeAreaInsets();
  const {height: screenHeight} = useWindowDimensions();
  const compact = screenHeight < 760;
  const isBnb = selectedCategory === 5 || selectedCategory === '5';
  const maxPriceCap = isBnb ? MAX_PRICE_BNB : MAX_PRICE_DEFAULT;

  const [minPrice, setMinPrice] = useState(
    Math.max(0, Math.min(initialFilter?.minPrice ?? 0, maxPriceCap)),
  );
  const [maxPrice, setMaxPrice] = useState(
    Math.max(
      0,
      Math.min(initialFilter?.maxPrice ?? INITIAL_MAX_PRICE, maxPriceCap),
    ),
  );
  const [checkInDate, setCheckInDate] = useState(toIsoDate(initialFilter?.checkInDate));
  const [checkOutDate, setCheckOutDate] = useState(toIsoDate(initialFilter?.checkOutDate));
  const [freeCancellation, setFreeCancellation] = useState(
    initialFilter?.freeCancellation === true,
  );
  const [hotDealOnly, setHotDealOnly] = useState(initialFilter?.hotDealOnly === true);
  const [calendarTarget, setCalendarTarget] = useState(null);

  const [sliderWidth, setSliderWidth] = useState(1);
  const activeThumbRef = useRef(null);
  const sliderRef = useRef(null);
  const minPriceRef = useRef(minPrice);
  const maxPriceRef = useRef(maxPrice);
  minPriceRef.current = minPrice;
  maxPriceRef.current = maxPrice;
  const bottomInset = Math.max(insets.bottom, 8);

  const minPercent = useMemo(() => (minPrice / maxPriceCap) * 100, [minPrice, maxPriceCap]);
  const maxPercent = useMemo(() => (maxPrice / maxPriceCap) * 100, [maxPrice, maxPriceCap]);

  const updateFromPercent = (percent, isMin) => {
    const maxP = maxPriceRef.current;
    const minP = minPriceRef.current;
    const value = Math.round((percent / 100) * maxPriceCap);
    if (isMin) {
      setMinPrice(Math.max(0, Math.min(value, maxP - 1)));
      return;
    }
    setMaxPrice(Math.min(maxPriceCap, Math.max(value, minP + 1)));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: evt => {
        const touch = evt.nativeEvent.touches?.[0] || evt.nativeEvent;
        const rect = sliderRef.current?.getBoundingClientRect?.();
        const locationX =
          rect && touch.pageX != null
            ? touch.pageX - rect.left
            : (touch.locationX ?? 0);
        const w = sliderWidth || 1;
        const percent = Math.max(0, Math.min(100, (locationX / w) * 100));
        const minP = (minPriceRef.current / maxPriceCap) * 100;
        const maxP = (maxPriceRef.current / maxPriceCap) * 100;
        activeThumbRef.current =
          Math.abs(percent - minP) < Math.abs(percent - maxP) ? 'min' : 'max';
      },
      onPanResponderMove: evt => {
        const thumb = activeThumbRef.current;
        if (!thumb) return;
        const touch = evt.nativeEvent.touches?.[0] || evt.nativeEvent;
        const rect = sliderRef.current?.getBoundingClientRect?.();
        const locationX =
          rect && touch.pageX != null
            ? touch.pageX - rect.left
            : (touch.locationX ?? 0);
        const w = sliderWidth || 1;
        const percent = Math.max(0, Math.min(100, (locationX / w) * 100));
        updateFromPercent(percent, thumb === 'min');
      },
      onPanResponderRelease: () => {
        activeThumbRef.current = null;
      },
    }),
  ).current;

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
    setMinPrice(0);
    setMaxPrice(Math.min(INITIAL_MAX_PRICE, maxPriceCap));
    setCheckInDate(null);
    setCheckOutDate(null);
    setFreeCancellation(false);
    setHotDealOnly(false);
  };

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
        showsVerticalScrollIndicator={false}>
        <View style={[styles.header, compact && styles.headerCompact]}>
          <Image source={MENU_ICON} style={styles.headerIcon} resizeMode="contain" />
          <Text style={styles.title}>מחיר</Text>
        </View>

        <View style={styles.priceInputsRow}>
          <View style={styles.priceInputGroup}>
            <View style={styles.pricePill}>
              <Text style={styles.pricePillText}>{formatPrice(maxPrice)} +</Text>
            </View>
          </View>
          <Text style={styles.priceDash}>-</Text>
          <View style={styles.priceInputGroup}>
            <View style={styles.pricePill}>
              <Text style={styles.pricePillText}>{formatPrice(minPrice)}</Text>
            </View>
          </View>
        </View>

        <View
          ref={sliderRef}
          style={styles.sliderContainer}
          onLayout={e => {
            const w = e.nativeEvent.layout.width;
            if (w > 0) setSliderWidth(w);
          }}
          {...panResponder.panHandlers}>
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
          <View style={[styles.sliderThumb, {left: `${minPercent}%`}]} pointerEvents="none">
            <View style={styles.sliderThumbCore} />
          </View>
          <View style={[styles.sliderThumb, {left: `${maxPercent}%`}]} pointerEvents="none">
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
                <Text style={styles.dateText}>{formatDateForDisplay(checkInDate)}</Text>
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
                <Text style={styles.dateText}>{formatDateForDisplay(checkOutDate)}</Text>
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
              אופציה זו תמצא לכם את התמורה הכי משתלמת ביחס למחיר המוצע ומחירי מבצע.
            </Text>
          </>
        ) : null}

        <View style={[styles.footer, compact && styles.footerCompact]}>
          <TouchableOpacity style={styles.saveBtnWrap} onPress={handleSave} activeOpacity={0.9}>
            <LinearGradient
              colors={GOLD}
              start={{x: 0.5, y: 0}}
              end={{x: 0.5, y: 1}}
              style={styles.saveBtnGradient}>
              <Text style={styles.saveBtnText}>שמור</Text>
            </LinearGradient>
          </TouchableOpacity>
          {!isBnb ? (
            <TouchableOpacity style={styles.clearWrap} onPress={handleClear}>
              <Text style={styles.clearText}>נקה</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
      {isBnb ? (
        <CalendarModal
          visible={calendarTarget != null}
          onClose={() => setCalendarTarget(null)}
          onSelect={isoDate => {
            if (calendarTarget === 'checkIn') setCheckInDate(toIsoDate(isoDate));
            if (calendarTarget === 'checkOut') setCheckOutDate(toIsoDate(isoDate));
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
    flexGrow: 1,
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
  priceInputsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  priceInputGroup: {
    flex: 1,
  },
  pricePill: {
    height: 52,
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
  },
  pricePillText: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Rubik-Medium',
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
    textAlign: 'right',
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
    justifyContent: 'flex-start',
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
    textAlign: 'right',
  },
  hotDealDescription: {
    color: '#9E9DA4',
    fontFamily: 'Rubik-Regular',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'right',
    marginBottom: 8,
    paddingRight: 32,
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
  clearWrap: {alignItems: 'center', paddingVertical: 6},
  clearText: {
    color: '#FFFFFF',
    fontFamily: 'Rubik-Regular',
    fontSize: 18,
    textDecorationLine: 'underline',
  },
});

export default PriceFilterScreen;
