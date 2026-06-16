import React, {useState} from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import {askSmartInfo} from '../utils/api';
import {flexStart} from '../utils/rtlLayout';

const SCREEN_W = Dimensions.get('window').width;
const CONTENT_W = Math.min(366, SCREEN_W - 48);
const CARD_BG = '#2B2A39';
const logoPiAi = require('../assets/paiailogo.png');

const isWeb = Platform.OS === 'web';
const baseUrl =
  isWeb && typeof window !== 'undefined' ? window.location.origin : '';
const buttonSources =
  isWeb && typeof window !== 'undefined'
    ? [1, 2, 3, 4, 5, 6, 7, 8].map(i => ({uri: `${baseUrl}/ai-icon-${i}.png`}))
    : [
        require('../assets/ai-icon-2.png'),
        require('../assets/ai-icon-1.png'),
        require('../assets/ai-icon-4.png'),
        require('../assets/ai-icon-3.png'),
        require('../assets/ai-icon-6.png'),
        require('../assets/ai-icon-5.png'),
        require('../assets/ai-icon-8.png'),
        require('../assets/ai-icon-7.png'),
      ];

const SMART_BUTTONS = [
  {label: 'תחבורה', key: 'transport'},
  {label: 'מחיר ממוצע', key: 'avgprice'},
  {label: 'ביטחון', key: 'security'},
  {label: 'מוסדות', key: 'institutions'},
  {label: 'בתי ספר', key: 'schools'},
  {label: 'החיים בשכונה', key: 'neighborhood'},
  {label: 'מטרדים', key: 'nuisances'},
  {label: 'מרכזי קניות', key: 'shopping'},
];

/** PiAi neighborhood block — Figma 9:145270 / bring-in profile section */
export default function PartnersSmartInfoBlock({adAddress = ''}) {
  const [smartInfoText, setSmartInfoText] = useState('');
  const [smartInfoLoading, setSmartInfoLoading] = useState(false);

  return (
    <View style={[styles.block, {width: CONTENT_W}]}>
      <Image source={logoPiAi} style={styles.logo} resizeMode="contain" />
      <Text style={styles.intro}>
        קבלו מידע חכם על סביבת הנכס בלחיצת כפתור
      </Text>
      <View style={styles.grid}>
        {SMART_BUTTONS.map((item, index) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.btn,
              smartInfoLoading && styles.btnDisabled,
            ]}
            onPress={async () => {
              if (smartInfoLoading) return;
              setSmartInfoLoading(true);
              setSmartInfoText('');
              const result = await askSmartInfo(
                item.key,
                item.label,
                adAddress,
              );
              setSmartInfoLoading(false);
              if (result.success && result.text) {
                setSmartInfoText(result.text);
              } else if (result.text) {
                setSmartInfoText(result.text);
              }
            }}
            activeOpacity={0.8}
            disabled={smartInfoLoading}>
            <Image
              source={buttonSources[index]}
              style={styles.btnIcon}
              resizeMode="contain"
            />
            <Text style={styles.btnLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        nativeID="partnersSmartInfoTextEntry"
        style={styles.textEntry}
        value={smartInfoText}
        onChangeText={setSmartInfoText}
        placeholder=""
        placeholderTextColor="rgba(255,255,255,0.4)"
        multiline
        textAlign="right"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignItems: 'center',
    alignSelf: flexStart,
    marginTop: 4,
    marginBottom: 8,
    width: '100%',
  },
  logo: {
    width: 79,
    height: 28,
    marginBottom: 34,
  },
  intro: {
    fontFamily: 'Rubik-Regular',
    fontSize: 16,
    lineHeight: 22,
    color: '#FFFFFF',
    textAlign: 'center',
    width: '100%',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    gap: 11,
  },
  btn: {
    flexDirection: 'row',
    width: '48%',
    minHeight: 50,
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 10,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  btnDisabled: {opacity: 0.6},
  btnIcon: {width: 28, height: 28},
  btnLabel: {
    fontFamily: 'Rubik-Regular',
    fontSize: 16,
    lineHeight: 22,
    color: '#FFFFFF',
    textAlign: 'left',
    flexShrink: 1,
  },
  textEntry: {
    width: '100%',
    height: 260,
    borderRadius: 24,
    paddingVertical: 17,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 24,
    textAlign: 'left',
    borderWidth: 1,
    borderColor: '#8C85B3',
    fontFamily: 'Rubik-Regular',
    marginTop: 16,
    writingDirection: 'rtl',
  },
});
