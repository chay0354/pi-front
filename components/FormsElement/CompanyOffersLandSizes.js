import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  I18nManager,
} from 'react-native';
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
  area: 0,
  price: 0,
});

/** Controlled by AdsForm (company category 7); parcels persist as `companyOffersLandSizes`. */
export const CompanyOffersLandSizes = ({lands, setLands}) => {
  const sideMargin = {marginLeft: 16};
  const subLabelSpacing = {marginLeft: 12};
  const optionSpacing = {marginRight: 20};
  const list = Array.isArray(lands) ? lands : [];

  const updateLand = (index, patch) => {
    if (typeof setLands !== 'function') {
      return;
    }
    setLands(prev =>
      (Array.isArray(prev) ? prev : []).map((l, i) =>
        i === index ? {...l, ...patch} : l,
      ),
    );
  };

  const addLand = () => {
    if (typeof setLands !== 'function') {
      return;
    }
    setLands(prev => [...(Array.isArray(prev) ? prev : []), createEmptyLand()]);
  };

  return (
    <FormContainer>
      <Title text="החברה מציעה קרקעות בגדלים של" required />
      {list.map((land, idx) => (
        <View key={idx}>
          <Text style={styles.landTitle}>קרקע {idx + 1}</Text>

          <View style={styles.radioRow}>
            <Text style={[styles.subLabel, subLabelSpacing]}>שטח הקרקע *</Text>
            <View style={styles.unitRow}>
              <RadioWithText
                key={1}
                isNotLastIndex={false}
                title={'מ"ר'}
                name={'sqm'}
                setName={() => updateLand(idx, {unit: 'sqm'})}
                index={1}
                isSelected={land.unit === 'sqm'}
                inline
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
                inline
                radioOptionStyle={{paddingTop: 0}}
                containerStyle={optionSpacing}
              />
            </View>
          </View>

          <CountUpdate
            count={land.area}
            setCount={value => updateLand(idx, {area: value})}
            isArea={true}
            isDivider={false}
            containerStyle={{marginBottom: 0}}
          />
          <Text
            style={[styles.subFields, {textAlign: 'left'}, sideMargin]}
            numberOfLines={1}>
            מחיר*
          </Text>
          <CardPriceField
            title={'מחיר'}
            price={land.price}
            setPrice={value => updateLand(idx, {price: value})}
          />
          <Divider style={{marginBottom: 15}} />
        </View>
      ))}

      <TouchableOpacity style={[styles.radioOption]} onPress={addLand}>
        <Text style={[styles.radioOptionText, {textAlign:'left'}]}>הוסף קרקע</Text>
        <View style={[styles.radioSpacer]} />
        <RadioIcon isSelected={false} />
      </TouchableOpacity>
    </FormContainer>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  landTitle: {
    color: Colors.whiteGeneral,
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    textAlign: 'left',
    marginBottom: 4,
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
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
  },
  subFields: {
    fontSize: 14,
    color: '#D2D0DC',
    marginBottom: 10,
    fontFamily: 'Rubik-Regular',
    flexShrink: 0,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOptionText: {
    color: Colors.whiteGeneral,
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
  },
  radioSpacer: {
    width: 8,
  },
});
