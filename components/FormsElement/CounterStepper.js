import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {Colors} from '../../constants/styles';
import {forceLtrStyle} from '../../utils/rtlLayout';

/**
 * Figma "כמות" stepper — pill border #8C85B3, + | value | − in LTR geometry.
 * Used on ad upload forms (פרטים כלליים, מחיר, area/rooms/floor, etc.).
 */
export const CounterStepper = ({
  value,
  onChangeText,
  onBlur,
  onSubmitEditing,
  onIncrement,
  onDecrement,
  suffix,
  suffixAfter = true,
  suffixStyle,
  inputRef,
  editable = true,
  style,
  inputWidth,
}) => {
  const resolvedWidth =
    inputWidth != null
      ? inputWidth
      : Math.max(20, String(value ?? '').length * 11);

  return (
    <View style={[styles.pill, forceLtrStyle, style]}>
      <TouchableOpacity
        style={styles.sideButton}
        onPress={onIncrement}
        accessibilityRole="button"
        accessibilityLabel="Increase">
        <Text style={styles.plusIcon}>+</Text>
      </TouchableOpacity>

      <Pressable
        style={styles.center}
        onPress={() => editable && inputRef?.current?.focus?.()}>
        <View style={styles.valueRow}>
          {!suffixAfter && suffix ? (
            <Text style={[styles.suffix, suffixStyle]}>{suffix}</Text>
          ) : null}
          {editable ? (
            <TextInput
              ref={inputRef}
              style={[styles.valueInput, {width: resolvedWidth}]}
              value={String(value ?? '')}
              onChangeText={onChangeText}
              onBlur={onBlur}
              onSubmitEditing={onSubmitEditing}
              keyboardType="numeric"
              returnKeyType="done"
              textAlign="center"
              showSoftInputOnFocus
            />
          ) : (
            <Text style={styles.valueText}>{String(value ?? '')}</Text>
          )}
          {suffixAfter && suffix ? (
            <Text style={[styles.suffix, suffixStyle]}>{suffix}</Text>
          ) : null}
        </View>
      </Pressable>

      <TouchableOpacity
        style={styles.sideButton}
        onPress={onDecrement}
        accessibilityRole="button"
        accessibilityLabel="Decrease">
        <Text style={styles.minusIcon}>−</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: '#8C85B3',
    paddingHorizontal: 10,
    overflow: 'hidden',
    backgroundColor: '#2B2A39',
  },
  sideButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#343243',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueInput: {
    color: Colors.whiteGeneral,
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    lineHeight: 24,
    minWidth: 0,
    textAlign: 'center',
    paddingVertical: 0,
  },
  valueText: {
    color: Colors.whiteGeneral,
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    lineHeight: 24,
    textAlign: 'center',
  },
  suffix: {
    color: Colors.whiteGeneral,
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    marginLeft: 6,
  },
  plusIcon: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
  },
  minusIcon: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    lineHeight: 24,
  },
});
