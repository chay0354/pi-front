import React, {useState} from 'react';
import {StyleSheet, Text, View, TouchableOpacity} from 'react-native';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {Colors, Spacing, FontSizes} from '../../constants/styles';
import {RadioWithText} from './RadioWithText';
import {CountUpdate} from './CountUpdate';

export const ProposedLand = () => {
  const [unit, setUnit] = useState('dunam'); // 'dunam' or 'sqm'
  const [value, setValue] = useState(0.5);

  const inc = () => setValue(prev => Math.round((prev + 0.5) * 10) / 10);
  const dec = () =>
    setValue(prev => Math.max(0, Math.round((prev - 0.5) * 10) / 10));

  return (
    <FormContainer>
      <Title text="קרקע מוצעת" required />
      <View style={styles.radioRow}>
        <Text style={styles.subLabel}>שטח הקרקע *</Text>
        <View style={{flexDirection: 'row'}}>
          <RadioWithText
            key={1}
            isNotLastIndex={false}
            title={'מ"ר'}
            name={'sqm'}
            setName={setUnit}
            index={1}
            isSelected={unit === 'sqm'}
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
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
});
