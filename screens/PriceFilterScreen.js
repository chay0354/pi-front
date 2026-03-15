import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  PanResponder,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';

const BG = '#1a1926';
const MAX_PRICE = 10000000;

const formatPrice = n => (n >= 1000000 ? `₪${(n / 1000000).toFixed(0)}M` : `₪${(n || 0).toLocaleString()}`);

const PriceFilterScreen = ({initialFilter, onClose, onSave}) => {
  const [minPrice, setMinPrice] = useState(initialFilter?.minPrice ?? 0);
  const [maxPrice, setMaxPrice] = useState(initialFilter?.maxPrice ?? MAX_PRICE);
  const [sliderWidth, setSliderWidth] = useState(Dimensions.get('window').width - 48);
  const activeThumbRef = useRef(null);
  const sliderRef = useRef(null);
  const minPriceRef = useRef(minPrice);
  const maxPriceRef = useRef(maxPrice);
  minPriceRef.current = minPrice;
  maxPriceRef.current = maxPrice;

  const minPercent = (minPrice / MAX_PRICE) * 100;
  const maxPercent = (maxPrice / MAX_PRICE) * 100;

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
        const locationX = rect && touch.pageX != null ? touch.pageX - rect.left : (touch.locationX ?? 0);
        const w = sliderWidth || 1;
        const percent = Math.max(0, Math.min(100, (locationX / w) * 100));
        const minP = (minPriceRef.current / MAX_PRICE) * 100;
        const maxP = (maxPriceRef.current / MAX_PRICE) * 100;
        const minDist = Math.abs(percent - minP);
        const maxDist = Math.abs(percent - maxP);
        activeThumbRef.current = minDist < maxDist ? 'min' : 'max';
      },
      onPanResponderMove: evt => {
        const thumb = activeThumbRef.current;
        if (!thumb) return;
        const touch = evt.nativeEvent.touches?.[0] || evt.nativeEvent;
        const rect = sliderRef.current?.getBoundingClientRect?.();
        const locationX = rect && touch.pageX != null ? touch.pageX - rect.left : (touch.locationX ?? 0);
        const w = sliderWidth || 1;
        const percent = Math.max(0, Math.min(100, (locationX / w) * 100));
        updateFromPercent(percent, thumb === 'min');
      },
      onPanResponderRelease: () => { activeThumbRef.current = null; },
    }),
  ).current;

  const handleSave = () => {
    if (onSave) onSave({minPrice, maxPrice});
    if (onClose) onClose();
  };

  const handleClear = () => {
    setMinPrice(0);
    setMaxPrice(MAX_PRICE);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={onClose} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
        <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.handleBar} />
        <View style={styles.header}>
          <Image
            source={require('../assets/buttom-bar/price.png')}
            style={styles.headerIcon}
            resizeMode="contain"
          />
          <Text style={styles.title}>מחיר</Text>
        </View>

        {/* Two pill inputs: min — max */}
        <View style={styles.priceInputsRow}>
          <View style={styles.pricePill}>
            <Text style={styles.pricePillText}>{formatPrice(minPrice)}</Text>
          </View>
          <Text style={styles.priceDash}>-</Text>
          <View style={styles.pricePill}>
            <Text style={styles.pricePillText}>{formatPrice(maxPrice)} +</Text>
          </View>
        </View>

        {/* Gold range slider */}
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
                  width: `${maxPercent - minPercent}%`,
                },
              ]}
            />
          </View>
          <View style={[styles.sliderThumb, {left: `${minPercent}%`}]} pointerEvents="none" />
          <View style={[styles.sliderThumb, {left: `${maxPercent}%`}]} pointerEvents="none" />
        </View>
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
  priceInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  pricePill: {
    flex: 1,
    height: 52,
    backgroundColor: '#2B2A39',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#8C85B3',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
  },
  pricePillText: { color: 'rgba(255,255,255,0.9)', fontSize: 16 },
  priceDash: { color: 'rgba(255,255,255,0.5)', fontSize: 18 },
  sliderContainer: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 32,
  },
  sliderTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    position: 'relative',
    overflow: 'visible',
  },
  sliderTrackFill: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 3,
    top: 0,
  },
  sliderThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#D4AF37',
    marginLeft: -11,
    top: 9, // center 22px thumb on 6px track (track center = 20px in 40px container → top = 20 - 11)
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  saveBtnWrap: { marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnImage: { width: '100%', height: 54 },
  clearWrap: { alignItems: 'center' },
  clearText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, textDecorationLine: 'underline' },
});

export default PriceFilterScreen;
