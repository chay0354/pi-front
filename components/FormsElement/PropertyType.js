import React from 'react';
import {StyleSheet, Text, View, TouchableOpacity, Image} from 'react-native';
import {FormContainer} from './FormContainer';
import {RadioIcon} from './RadioIcon';
import {Title} from './Title';
import {Divider} from './Divider';
import {Colors} from '../../constants/styles';
import {RadioWithText} from './RadioWithText';

export const PropertyType = ({
  propertyType,
  setPropertyType,
  propertyTypes = [],
  title,
}) => {
  return (
    <FormContainer>
      <Title
        text={title || 'סוג הנכס'}
        required
        textStyle={{marginBottom: 0}}
      />
      <View>
        {propertyTypes.map((item, index) => {
          const isNotLastIndex = index !== propertyTypes.length - 1;
          return (
            <RadioWithText
              key={index}
              isNotLastIndex={isNotLastIndex}
              title={item.title}
              name={item.name}
              setName={setPropertyType}
              index={index}
              isSelected={item.name === propertyType}
            />
          );
        })}
      </View>
    </FormContainer>
  );
};

const styles = StyleSheet.create({});
