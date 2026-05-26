import {StyleSheet, Text, View, I18nManager} from 'react-native';
import React from 'react';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {CountUpdate} from './CountUpdate';
import {RadioWithText} from './RadioWithText';
import {RadioButton} from './RadioButton';
import AmenityQuantityPill from '../AmenityQuantityPill';
import {Divider} from './Divider';
import {flexEnd, flexStart} from '../../utils/rtlLayout';

export const GeneralDetails = ({
  area,
  setArea,
  rooms,
  setRooms,
  floor,
  setFloor,
  amenities,
  toggleAmenity,
  setAmenityQuantity,
  amenitiesWithQuantity,
  isArea,
  isRooms,
  isFloor,
  amenitiesData,
  optionSecondValues,
  setOptionSecondValue,
  counterData,
}) => {
  const inputLabelSpacing = {marginLeft: 12};
  const safeSetOptionSecondValue =
    typeof setOptionSecondValue === 'function'
      ? setOptionSecondValue
      : () => {};

  const hasCounterFields = Array.isArray(counterData) && counterData.length > 0;

  return (
    <FormContainer>
      {hasCounterFields ? (
        <>
          <Text style={[styles.sectionHeading, {alignSelf: flexStart}]}>
            פרטים כלליים
          </Text>
          {counterData.map((counter, index) => (
            <View key={counter.title || String(index)}>
              <CountUpdate
                title={counter.title}
                count={counter.value ?? counter.count ?? 0}
                setCount={counter.setCount}
                isLast
                isDivider={false}
                isArea={counter.isArea}
                min={counter.min}
                containerStyle={{marginBottom: 0}}
              />
              {index < counterData.length - 1 ? (
                <Divider style={styles.counterSeparator} />
              ) : null}
            </View>
          ))}
          {amenitiesData.length > 0 ? (
            <Divider style={styles.beforeAmenities} />
          ) : null}
        </>
      ) : (
        <Title text={'פרטים כלליים'} />
      )}

      {/* Amenities */}
      {amenitiesData.map((amenity, index) => {
        const amenityKey = amenity?.title || amenity;
        const isSelected = !!amenities[amenity?.title || amenity];
        const hasOption = amenity?.option?.length > 0;
        const hasDistance = amenity?.distance;
        const hasOptionSecond = amenity?.optionSecond?.option?.length > 0;
        const optionSecondKey = amenity?.optionSecond?.title || amenityKey;
        const quantity = hasOption
          ? amenities[amenity?.title || amenity] || 0
          : null;
        const isNotLastIndex = index !== amenitiesData.length - 1;
        return (
          <View key={amenityKey}>
            {/* Amenity label and checkbox */}
            <RadioWithText
              isNotLastIndex={isNotLastIndex}
              title={amenity?.title || amenity}
              name={amenityKey}
              setName={toggleAmenity}
              index={index}
              isSelected={isSelected}
              useFigmaStyleIcon
              styleDevider={{marginTop: 20}}>
              {/* Quantity selector for amenities that need it - below the amenity row */}
              {hasOption && isSelected && (
                <View
                  style={[
                    styles.amenityQuantitySelector,
                    {justifyContent: flexEnd},
                  ]}>
                  {amenity.option.map(qty => (
                    <AmenityQuantityPill
                      key={qty}
                      qty={qty}
                      selected={quantity === qty}
                      onPress={() => setAmenityQuantity(amenityKey, qty)}
                      style={styles.amenityQuantityButtonContainer}
                      inactiveBorderColor="#8C85B3"
                    />
                  ))}
                </View>
              )}

              {/* Secondary option selector - below quantity selector */}
              {hasOptionSecond && isSelected && (
                <View style={styles.amenityOptionSecondContainer}>
                  <Title text={amenity.optionSecond.title} />
                  <RadioButton
                    data={amenity.optionSecond.option.map(opt => ({
                      name: opt,
                      title: opt,
                    }))}
                    condition={optionSecondValues?.[optionSecondKey] || ''}
                    setCondition={value =>
                      safeSetOptionSecondValue(optionSecondKey, value)
                    }
                  />
                </View>
              )}

              {
                /* Distance input */
                hasDistance && isSelected && (
                  <View style={styles.amenityOptionSecondContainer}>
                    <Title
                      text={'גודל מרפסת'}
                      textStyle={[styles.inputLabel, inputLabelSpacing]}
                    />
                    <CountUpdate
                      isArea={true}
                      count={area}
                      setCount={setArea}
                      isDivider={false}
                      isLast={true}
                      counterInputStyle={{marginBottom: 0}}
                    />
                  </View>
                )
              }
            </RadioWithText>
          </View>
        );
      })}
    </FormContainer>
  );
};

const styles = StyleSheet.create({
  sectionHeading: {
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    color: 'rgba(210, 208, 220, 0.98)',
    marginBottom: 24,
  },
  counterSeparator: {
    height: 1,
    backgroundColor: '#343243',
    marginVertical: 20,
  },
  beforeAmenities: {
    height: 1,
    backgroundColor: '#343243',
    marginTop: 4,
    marginBottom: 12,
  },
  amenityQuantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  amenityQuantityButtonContainer: {
    marginRight: 16,
  },
  amenityOptionSecondContainer: {
    marginTop: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginLeft: 12,
    marginBottom: 0,
    color: '#D2D0DC',
    marginBottom: 10,
  },
});
