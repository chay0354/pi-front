import React, {useState} from 'react';
import {StyleSheet, Text, View, TouchableOpacity} from 'react-native';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {Colors, Spacing, FontSizes} from '../../constants/styles';
import {RadioWithText} from './RadioWithText';
import {CountUpdate} from './CountUpdate';
import {forceLtrStyle} from '../../utils/rtlLayout';

export const ProposedLand = ({
  unit: unitProp,
  setUnit: setUnitProp,
  area: areaProp,
  setArea: setAreaProp,
}) => {
  const [unitLocal, setUnitLocal] = useState('dunam');
  const [valueLocal, setValueLocal] = useState(0.5);
  const unit = unitProp ?? unitLocal;
  const value = areaProp ?? valueLocal;
  const setUnit = setUnitProp ?? setUnitLocal;
  const setValue = setAreaProp ?? setValueLocal;

  return (
    <FormContainer>
      <Title text="קרקע מוצעת" required />
      <View style={styles.radioRow}>
        <Text style={styles.subLabel}>שטח הקרקע *</Text>
        <View style={[styles.unitRow, forceLtrStyle]}>
          <RadioWithText
            key={1}
            isNotLastIndex={false}
            title={'מ"ר'}
            name={'sqm'}
            setName={setUnit}
            index={1}
            isSelected={unit === 'sqm'}
            inline
            radioOptionStyle={{paddingTop: 0}}
          />
          <RadioWithText
            key={0}
            isNotLastIndex={false}
            title={'דונם'}
            name={'dunam'}
            setName={setUnit}
            index={0}
            isSelected={unit === 'dunam'}
            inline
            radioOptionStyle={{paddingTop: 0}}
            containerStyle={{marginLeft: 20}}
          />
        </View>
      </View>

      <CountUpdate
        count={value}
        setCount={setValue}
        isLast={true}
        isDivider={false}
        counterInputStyle={{marginBottom: 0}}
      />
    </FormContainer>
  );
};

const styles = StyleSheet.create({
  subLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.fs14,
    fontFamily: 'Rubik-Regular',
    marginRight: 12,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
});
