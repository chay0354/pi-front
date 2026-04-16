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

const BG = '#2B2A39';
const DIVIDER = '#373548';
const INPUT_BORDER = '#8C85B3';
const GOLD = ['#FEE787', '#BD9947', '#9C6522'];
const MAX_PRICE = 10000000;

// Figma asset (node 12:75198)
const MENU_ICON =
  'https://www.figma.com/api/mcp/asset/703cc13b-492e-40a5-b899-18d2b59ec983';
const SLIDER_KNOB =
  'https://www.figma.com/api/mcp/asset/27b1e6ab-cf3a-4723-a5e3-f643da4dfdd9';

const formatPrice = n =>
  n >= 1000000 ? `₪${(n / 1000000).toFixed(0)}M` : `₪${(n || 0).toLocaleString()}`;

const PriceFilterScreen = ({initialFilter, onClose, onSave}) => {
  const insets = useSafeAreaInsets();
  const {height: screenHeight} = useWindowDimensions();
  const compact = screenHeight < 760;
  const [minPrice, setMinPrice] = useState(initialFilter?.minPrice ?? 0);
  const [maxPrice, setMaxPrice] = useState(initialFilter?.maxPrice ?? MAX_PRICE);
  const [sliderWidth, setSliderWidth] = useState(1);
  const activeThumbRef = useRef(null);
  const sliderRef = useRef(null);
  const minPriceRef = useRef(minPrice);
  const maxPriceRef = useRef(maxPrice);
  minPriceRef.current = minPrice;
  maxPriceRef.current = maxPrice;
  const bottomInset = Math.max(insets.bottom, 8);

  const minPercent = useMemo(() => (minPrice / MAX_PRICE) * 100, [minPrice]);
  const maxPercent = useMemo(() => (maxPrice / MAX_PRICE) * 100, [maxPrice]);

  const updateFromPercent = (percent, isMin) => {
    const maxP = maxPriceRef.current;
    const minP = minPriceRef.current;
    const value = Math.round((percent / 100) * MAX_PRICE);
    if (isMin) setMinPrice(Math.max(0, Math.min(value, maxP - 1)));
    else setMaxPrice(Math.min(MAX_PRICE, Math.max(value, minP + 1)));
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
        const minP = (minPriceRef.current / MAX_PRICE) * 100;
        const maxP = (maxPriceRef.current / MAX_PRICE) * 100;
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
    onSave?.({minPrice, maxPrice});
    onClose?.();
  };

  const handleClear = () => {
    setMinPrice(0);
    setMaxPrice(MAX_PRICE);
  };

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
          <Text style={styles.title}>מחיר</Text>
        </View>

        <View style={styles.priceInputsRow}>
          <View style={styles.pricePill}>
            <Text style={styles.pricePillText}>{formatPrice(maxPrice)} +</Text>
          </View>
          <Text style={styles.priceDash}>-</Text>
          <View style={styles.pricePill}>
            <Text style={styles.pricePillText}>{formatPrice(minPrice)}</Text>
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
            <Image source={{uri: SLIDER_KNOB}} style={styles.sliderThumbImage} resizeMode="contain" />
          </View>
          <View style={[styles.sliderThumb, {left: `${maxPercent}%`}]} pointerEvents="none">
            <Image source={{uri: SLIDER_KNOB}} style={styles.sliderThumbImage} resizeMode="contain" />
          </View>
        </View>

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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  pricePill: {
    flex: 1,
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
    fontFamily: 'Rubik-Medium',
  },
  priceDash: {color: 'rgba(255,255,255,0.5)', fontSize: 18, fontFamily: 'Rubik-Regular'},
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
    backgroundColor: '#D2D0DC',
    borderRadius: 1000,
    overflow: 'visible',
  },
  sliderTrackFill: {
    position: 'absolute',
    top: 0,
    height: 4,
    borderRadius: 1000,
    backgroundColor: '#D2D0DC',
  },
  sliderThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    marginLeft: -11,
    top: 10,
  },
  sliderThumbImage: {width: 22, height: 22},
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
