import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View, TouchableOpacity, TextInput} from 'react-native';
import {Title} from './Title';
import {Divider} from './Divider';
import {Colors} from '../../constants/styles';

export const CountUpdate = ({
  title,
  count,
  setCount,
  isArea = false,
  isLast = false,
  isDivider = true,
  min = 0,
  required = true,
  variant = 'default',
  counterInputStyle,
  containerStyle,
  deviderStyle,
}) => {
  const safeSetCount = typeof setCount === 'function' ? setCount : () => {};
  const minVal = typeof min === 'number' ? min : 0;
  const [draft, setDraft] = useState(String(Math.max(minVal, Number(count ?? 0))));
  const inputWidth = Math.max(20, String(draft || '').length * 11);

  useEffect(() => {
    setDraft(String(Math.max(minVal, Number(count ?? 0))));
  }, [count, minVal]);

  const commitDraft = () => {
    const digitsOnly = String(draft || '').replace(/[^\d]/g, '');
    const nextVal = Number.parseInt(digitsOnly || String(minVal), 10);
    if (Number.isNaN(nextVal)) {
      setDraft(String(Math.max(minVal, Number(count ?? 0))));
      return;
    }
    const clamped = Math.max(minVal, nextVal);
    safeSetCount(clamped);
    setDraft(String(clamped));
  };

  const counterPill = (
    <View
      style={[
        styles.counterInput,
        variant === 'figmaOffice' && styles.counterInputFigma,
        counterInputStyle,
      ]}>
        <TouchableOpacity
          style={styles.counterButtonLeft}
          onPress={() => safeSetCount(Math.max(minVal, (count ?? 0) - 1))}>
          <Text style={styles.counterButtonMinus}>−</Text>
        </TouchableOpacity>
        <View style={styles.counterDivider} />
        <View style={styles.counterValueContainer}>
          <View style={styles.counterValueRow}>
            {isArea ? <Text style={styles.counterValueSuffix}>מ"ר</Text> : null}
            <TextInput
              style={[
                styles.counterValueInput,
                variant === 'figmaOffice' && styles.counterValueInputFigma,
                {width: inputWidth},
              ]}
              value={draft}
              onChangeText={setDraft}
              onBlur={commitDraft}
              onSubmitEditing={commitDraft}
              keyboardType="numeric"
              returnKeyType="done"
              textAlign="center"
            />
          </View>
        </View>
        <View style={styles.counterDivider} />
        <TouchableOpacity
          style={styles.counterButtonRight}
          onPress={() => safeSetCount((count ?? 0) + 1)}>
          <Text style={styles.counterButtonPlus}>+</Text>
        </TouchableOpacity>
      </View>
  );

  if (variant === 'figmaOffice') {
    return (
      <View style={[{marginBottom: isLast ? 0 : 0}, containerStyle]}>
        {title ? (
          <View style={styles.figmaOfficeLabelRow}>
            <Text style={styles.figmaOfficeLabelText}>{title}</Text>
            {required ? (
              <Text style={styles.figmaOfficeStar}>*</Text>
            ) : null}
          </View>
        ) : null}
        {counterPill}
        {isDivider && <Divider style={deviderStyle} />}
      </View>
    );
  }

  return (
    <View style={[{marginBottom: isLast ? 0 : 20}, containerStyle]}>
      {title ? (
        <Title
          text={title}
          required={required}
          textStyle={{marginBottom: 15}}
        />
      ) : null}
      {counterPill}
      {isDivider && <Divider style={deviderStyle} />}
    </View>
  );
};

const styles = StyleSheet.create({
  counterInput: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: '#2B2A39',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#8C85B3',
    overflow: 'hidden',
    marginBottom: 22,
  },
  counterInputFigma: {
    marginBottom: 0,
  },
  figmaOfficeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 20,
  },
  figmaOfficeLabelText: {
    color: Colors.whiteGeneral,
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  figmaOfficeStar: {
    color: Colors.yellowIcons,
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
  },
  counterButtonLeft: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 32,
    borderBottomLeftRadius: 32,
  },
  counterButtonRight: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 32,
    borderBottomRightRadius: 32,
  },
  counterButton: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
  },
  counterButtonMinus: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Rubik-Medium',
  },
  counterButtonPlus: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
  counterDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#343243',
  },
  counterValueContainer: {
    flex: 2,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  counterValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValueInput: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    minWidth: 0,
    textAlign: 'center',
    paddingVertical: 0,
  },
  counterValueInputFigma: {
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    lineHeight: 24,
  },
  counterValueSuffix: {
    color: '#fff',
    fontSize: 16,
    marginRight: 6,
    fontWeight: '500',
  },
});
