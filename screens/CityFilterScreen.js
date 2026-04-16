import React, {useMemo, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  I18nManager,
  Image,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const BG = '#2B2A39';
const DIVIDER = '#373548';
const INPUT_BORDER = '#8C85B3';
const TEXT_SECONDARY = '#D2D0DC';
const TEXT_CLUE = 'rgba(255,255,255,0.35)';
const GOLD_GRADIENT = ['#FEE787', '#BD9947', '#9C6522'];

const DISTANCE_OPTIONS = [100, 80, 60, 40, 20];
const KNOB_SIZE = 22;

// Figma assets for node 12:74885
const FIGMA_CITY_ICON =
  'https://www.figma.com/api/mcp/asset/13afe24c-1fb9-46f9-bb9d-5da91ec3136d';
const FIGMA_CHECK_RING_ACTIVE =
  'https://www.figma.com/api/mcp/asset/54892c84-e74b-44a2-9a00-559a7c607372';
const FIGMA_CHECK_RING_INACTIVE =
  'https://www.figma.com/api/mcp/asset/0c9e7829-fbed-4ec7-becf-fbdfa40a81bd';
const FIGMA_CHECK_ICON =
  'https://www.figma.com/api/mcp/asset/ae64e01c-f6f7-47c6-98e9-4db8d08a5e26';
const FIGMA_SLIDER_KNOB =
  'https://www.figma.com/api/mcp/asset/0fd409e1-d3ef-4899-bbdd-b74517a62692';

const CityFilterScreen = ({initialFilter, onClose, onSave}) => {
  const insets = useSafeAreaInsets();
  const {height: screenHeight} = useWindowDimensions();
  const compact = screenHeight < 760;
  const [purpose, setPurpose] = useState(initialFilter?.purpose ?? 'rent'); // 'rent' | 'sale'
  const [city, setCity] = useState(initialFilter?.city ?? '');
  const [street, setStreet] = useState(initialFilter?.street ?? '');
  const [distanceKm, setDistanceKm] = useState(initialFilter?.distanceKm ?? 20);
  const [immediateEntry, setImmediateEntry] = useState(initialFilter?.immediateEntry ?? false);

  const thumbLeft = useMemo(() => {
    const idx = Math.max(0, DISTANCE_OPTIONS.indexOf(distanceKm));
    const ratio = idx / (DISTANCE_OPTIONS.length - 1);
    return `${ratio * 100}%`;
  }, [distanceKm]);

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
  const bottomInset = Math.max(insets.bottom, 8);

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
          <Image source={{uri: FIGMA_CITY_ICON}} style={styles.headerIcon} resizeMode="contain" />
          <Text style={styles.title}>עיר</Text>
        </View>

        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>עיר</Text>
        </View>
        <View style={styles.purposeList}>
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setPurpose('rent')}
            activeOpacity={0.8}>
            <Text style={styles.checkLabel}>להשכרה</Text>
            <View style={styles.checkboxImageWrap}>
              <Image
                source={{uri: purpose === 'rent' ? FIGMA_CHECK_RING_ACTIVE : FIGMA_CHECK_RING_INACTIVE}}
                style={styles.checkboxImage}
                resizeMode="contain"
              />
              {purpose === 'rent' && (
                <Image source={{uri: FIGMA_CHECK_ICON}} style={styles.checkboxCheck} resizeMode="contain" />
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setPurpose('sale')}
            activeOpacity={0.8}>
            <Text style={styles.checkLabel}>למכירה</Text>
            <View style={styles.checkboxImageWrap}>
              <Image
                source={{uri: purpose === 'sale' ? FIGMA_CHECK_RING_ACTIVE : FIGMA_CHECK_RING_INACTIVE}}
                style={styles.checkboxImage}
                resizeMode="contain"
              />
              {purpose === 'sale' && (
                <Image source={{uri: FIGMA_CHECK_ICON}} style={styles.checkboxCheck} resizeMode="contain" />
              )}
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />

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
        <View style={styles.divider} />

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
        <View style={styles.divider} />

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
              {DISTANCE_OPTIONS.map((_, idx) => (
                <View
                  key={`dot-${idx}`}
                  style={[
                    styles.sliderDot,
                    {
                      left: `${(idx / (DISTANCE_OPTIONS.length - 1)) * 100}%`,
                      marginLeft: -2,
                    },
                  ]}
                />
              ))}
              <View
                style={[
                  styles.sliderThumb,
                  {
                    left: thumbLeft,
                    marginLeft: -(KNOB_SIZE / 2),
                  },
                ]}>
                <Image source={{uri: FIGMA_SLIDER_KNOB}} style={styles.sliderThumbImage} resizeMode="contain" />
              </View>
            </View>
          </View>
        </View>
        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setImmediateEntry(!immediateEntry)}
          activeOpacity={0.8}>
          <Text style={styles.checkLabel}>כניסה מיידית</Text>
          <View style={styles.checkboxImageWrap}>
            <Image
              source={{uri: immediateEntry ? FIGMA_CHECK_RING_ACTIVE : FIGMA_CHECK_RING_INACTIVE}}
              style={styles.checkboxImage}
              resizeMode="contain"
            />
            {immediateEntry && (
              <Image source={{uri: FIGMA_CHECK_ICON}} style={styles.checkboxCheck} resizeMode="contain" />
            )}
          </View>
        </TouchableOpacity>

        <View style={[styles.footer, compact && styles.footerCompact]}>
          <TouchableOpacity style={styles.saveBtnWrap} onPress={handleSave} activeOpacity={0.9}>
            <LinearGradient
              colors={GOLD_GRADIENT}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  headerCompact: {
    marginBottom: 18,
  },
  headerIcon: {
    width: 24,
    height: 24,
  },
  title: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.54,
    fontFamily: 'Rubik-Regular',
    marginTop: 8,
  },
  sectionTitleRow: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 18,
  },
  sectionTitle: {
    color: TEXT_SECONDARY,
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    textAlign: 'right',
  },
  purposeList: {
    alignItems: 'flex-end',
    marginBottom: 18,
  },
  fieldWrap: {
    marginBottom: 18,
  },
  divider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginBottom: 20,
  },
  label: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    marginBottom: 8,
    textAlign: 'right',
    letterSpacing: 0.14,
  },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 999,
    height: 52,
    paddingVertical: 10,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 20,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Regular',
  },
  sliderTrackWrap: {
    marginTop: 10,
  },
  sliderMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 0,
  },
  sliderMarkerText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#D2D0DC',
    borderRadius: 2,
    position: 'relative',
  },
  sliderDot: {
    position: 'absolute',
    top: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D2D0DC',
  },
  sliderThumb: {
    position: 'absolute',
    top: -(KNOB_SIZE - 4) / 2,
    width: KNOB_SIZE,
    height: KNOB_SIZE,
  },
  sliderThumbImage: {width: KNOB_SIZE, height: KNOB_SIZE},
  sliderMarkerTouch: {
    padding: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 14,
    gap: 8,
  },
  checkboxImageWrap: {
    width: 24,
    height: 24,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxImage: {width: 24, height: 24},
  checkboxCheck: {position: 'absolute', width: 9, height: 7},
  checkLabel: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  footerCompact: {
    marginTop: 12,
  },
  saveBtnWrap: {
    marginBottom: 12,
    width: '100%',
  },
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
  clearWrap: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  clearText: {
    color: '#FFFFFF',
    fontFamily: 'Rubik-Regular',
    fontSize: 18,
    textDecorationLine: 'underline',
  },
});

export default CityFilterScreen;
