import React, {useState} from 'react';
import {StyleSheet, Text, View, TouchableOpacity} from 'react-native';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {Divider} from './Divider';
import {RadioWithText} from './RadioWithText';
import {CountUpdate} from './CountUpdate';
import {PriceCount} from './PriceCount';
import {Colors, FontSizes} from '../../constants/styles';
import {CardPriceField} from './CardPriceField';
import {RadioIcon} from './RadioIcon';

const createEmptyLand = () => ({
  unit: 'dunam',
  area: 1,
  price: 2000000,
});

export const CompanyOffersLandSizes = () => {
  const [lands, setLands] = useState([createEmptyLand(), createEmptyLand()]);

  const updateLand = (index, patch) => {
    setLands(prev => prev.map((l, i) => (i === index ? {...l, ...patch} : l)));
  };

  const addLand = () => setLands(prev => [...prev, createEmptyLand()]);

  return (
    <FormContainer>
      <Title text="החברה מציעה קרקעות בגדלים של" required />
      {lands.map((land, idx) => (
        <View key={idx}>
          <RadioWithText
            title={`קרקע ${idx + 1}`}
            name={'dunam'}
            setName={() => updateLand(idx, {unit: 'dunam'})}
            index={0}
            isSelected={land.unit === 'dunam'}
            radioOptionStyle={{paddingTop: 0}}
          />

          <View style={styles.radioRow}>
            <Text style={styles.subLabel}>שטח הקרקע *</Text>
            <View style={{flexDirection: 'row'}}>
              <RadioWithText
                key={1}
                isNotLastIndex={false}
                title={'מ"ר'}
                name={'sqm'}
                setName={() => updateLand(idx, {unit: 'sqm'})}
                index={1}
                isSelected={land.unit === 'sqm'}
                radioOptionStyle={{paddingTop: 0}}
              />
              <RadioWithText
                key={0}
                isNotLastIndex={false}
                title={'דונם'}
                name={'dunam'}
                setName={() => updateLand(idx, {unit: 'dunam'})}
                index={0}
                isSelected={land.unit === 'dunam'}
                radioOptionStyle={{paddingTop: 0}}
                containerStyle={{marginLeft: 20}}
              />
            </View>
          </View>

          <CountUpdate
            title={''}
            count={land.area}
            setCount={value => updateLand(idx, {area: value})}
            isArea={true}
            isDivider={false}
            containerStyle={{marginBottom: 0}}
          />
          <Text style={styles.subFields}>מחיר*</Text>
          <CardPriceField
            title={'מחיר'}
            price={land.price}
            setPrice={value => updateLand(idx, {price: value})}
          />
          <Divider style={{marginBottom: 15}} />
        </View>
      ))}

      <TouchableOpacity style={[styles.radioOption]} onPress={addLand}>
        <Text style={styles.radioOptionText}>הוסף קרקע</Text>
        <View style={[styles.radioSpacer]} />
        <RadioIcon isSelected={false} />
      </TouchableOpacity>
    </FormContainer>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  landTitle: {
    color: Colors.whiteGeneral,
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    textAlign: 'right',
  },
  addButton: {
    marginHorizontal: 20,
    marginBottom: 30,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addButtonText: {
    color: Colors.whiteGeneral,
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
  },
  radioRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  subLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.fs14,
    fontFamily: 'Rubik-Regular',
    marginRight: 12,
  },
  subFields: {
    fontSize: 14,
    color: '#D2D0DC',
    marginBottom: 10,
    textAlign: 'right',
    marginRight: 16,
    fontFamily: 'Rubik-Regular',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  radioOptionText: {
    color: Colors.whiteGeneral,
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  radioSpacer: {
    width: 8,
  },
});
