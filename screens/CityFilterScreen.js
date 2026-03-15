import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  I18nManager,
  Image,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';

const BG = '#1a1926';
const BORDER = 'rgba(255,255,255,0.2)';
const GOLD_START = '#D4AF37';
const GOLD_END = '#B8960C';

const DISTANCE_OPTIONS = [100, 80, 60, 40, 20];

const CityFilterScreen = ({initialFilter, onClose, onSave}) => {
  const [purpose, setPurpose] = useState(initialFilter?.purpose ?? 'rent'); // 'rent' | 'sale'
  const [city, setCity] = useState(initialFilter?.city ?? '');
  const [street, setStreet] = useState(initialFilter?.street ?? '');
  const [distanceKm, setDistanceKm] = useState(initialFilter?.distanceKm ?? 20);
  const [immediateEntry, setImmediateEntry] = useState(initialFilter?.immediateEntry ?? false);

  const handleSave = () => {
    if (onSave) {
      onSave({purpose, city, street, distanceKm, immediateEntry});
    }
    if (onClose) onClose();
  };

  const handleClear = () => {
    setPurpose('rent');
    setCity('');
    setStreet('');
    setDistanceKm(20);
    setImmediateEntry(false);
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
        {/* Header: icon + title */}
        <View style={styles.header}>
          <Image
            source={require('../assets/buttom-bar/city.png')}
            style={styles.headerIcon}
            resizeMode="contain"
          />
          <Text style={styles.title}>עיר</Text>
        </View>

        {/* Toggle: show one image at a time for selected option (למכירה = sell, להשכרה = rent) */}
        <TouchableOpacity
          style={styles.toggleWrap}
          onPress={() => setPurpose(purpose === 'rent' ? 'sale' : 'rent')}
          activeOpacity={0.9}>
          <Image
            source={purpose === 'rent' ? require('../assets/buy-rent/rent.png') : require('../assets/buy-rent/sell.png')}
            style={styles.toggleImage}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* City input */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>עיר</Text>
          <TextInput
            style={styles.input}
            placeholder="הזן שם עיר"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={city}
            onChangeText={setCity}
            textAlign={I18nManager.isRTL ? 'right' : 'right'}
          />
        </View>

        {/* Street input */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>רחוב</Text>
          <TextInput
            style={styles.input}
            placeholder="הזן שם רחוב"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={street}
            onChangeText={setStreet}
            textAlign={I18nManager.isRTL ? 'right' : 'right'}
          />
        </View>

        {/* Distance slider */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>מרחק ממני (ק"מ)</Text>
          <View style={styles.sliderTrackWrap}>
            <View style={styles.sliderMarkers}>
              {DISTANCE_OPTIONS.map((km) => (
                <TouchableOpacity
                  key={km}
                  onPress={() => setDistanceKm(km)}
                  style={styles.sliderMarkerTouch}>
                  <Text style={styles.sliderMarkerText}>{km}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.sliderTrack}>
              <View
                style={[
                  styles.sliderThumb,
                  {
                    left: `${(DISTANCE_OPTIONS.indexOf(distanceKm) / (DISTANCE_OPTIONS.length - 1)) * 100}%`,
                    marginLeft: -8,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Immediate entry checkbox */}
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setImmediateEntry(!immediateEntry)}
          activeOpacity={0.8}>
          <Text style={styles.checkLabel}>כניסה מיידית</Text>
          <View style={[styles.checkbox, immediateEntry && styles.checkboxChecked]}>
            {immediateEntry ? (
              <MaterialCommunityIcons name="check" size={18} color="#1a1926" />
            ) : null}
          </View>
        </TouchableOpacity>
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
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    backgroundColor: BG,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  headerIcon: {
    width: 36,
    height: 37,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    marginTop: 8,
  },
  toggleWrap: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleImage: {
    width: '100%',
    height: 55,
  },
  fieldWrap: {
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 16,
  },
  sliderTrackWrap: {
    marginTop: 8,
  },
  sliderMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sliderMarkerText: {
    color: '#fff',
    fontSize: 12,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: BORDER,
    borderRadius: 2,
    position: 'relative',
  },
  sliderThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: GOLD_START,
  },
  sliderMarkerTouch: {
    padding: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 32,
    gap: 16,
    marginLeft: 40,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#fff',
  },
  checkLabel: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
  },
  saveBtnWrap: {
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnImage: {
    width: '100%',
    height: 54,
  },
  clearWrap: {
    alignItems: 'center',
  },
  clearText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});

export default CityFilterScreen;
