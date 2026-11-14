import React from 'react';
import {StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {Colors} from '../../constants/styles';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {normalizeVirtualTourUrl} from '../../utils/virtualTour';
import {hebrewTextAlign} from '../../utils/rtlLayout';

/** Optional project visualization / 3D tour link (company projects). */
export const VirtualTourUrl = ({value, setValue}) => {
  const trimmed = String(value || '').trim();
  const invalid = trimmed !== '' && normalizeVirtualTourUrl(trimmed) === null;
  return (
    <FormContainer>
      <Title text="הדמיה / סיור וירטואלי" textStyle={{marginBottom: 6}} />
      <Text style={styles.hint}>
        הדביקו קישור להדמיה או לסיור התלת-ממדי של הפרויקט (למשל Matterport,
        YouTube). ההדמיה תוצג בעמוד הפרויקט.
      </Text>
      <View style={[styles.inputWrap, invalid && styles.inputWrapError]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          placeholder="https://"
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          textContentType="URL"
          returnKeyType="done"
          textAlign="right"
        />
        {trimmed ? (
          <TouchableOpacity
            onPress={() => setValue('')}
            style={styles.clear}
            accessibilityLabel="ניקוי קישור ההדמיה"
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {invalid ? (
        <Text style={styles.error}>
          הקישור אינו תקין. הדביקו קישור שמתחיל ב-https://
        </Text>
      ) : null}
    </FormContainer>
  );
};

const styles = StyleSheet.create({
  hint: {
    color: '#D2D0DC',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Rubik-Regular',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1D27',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#8C85B3',
    height: 52,
    paddingHorizontal: 15,
  },
  inputWrapError: {
    borderColor: '#FF6B6B',
  },
  input: {
    flex: 1,
    height: '100%',
    color: Colors.whiteGeneral,
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  clear: {
    marginStart: 8,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  error: {
    color: '#FF6B6B',
    fontSize: 13,
    fontFamily: 'Rubik-Regular',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    marginTop: 8,
  },
});
