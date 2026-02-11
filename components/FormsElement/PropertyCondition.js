import {StyleSheet, Text, View} from 'react-native';
import React from 'react';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioButton} from './RadioButton';

export const PropertyCondition = ({condition, setCondition}) => {
  return (
    <FormContainer>
      <Title text={'מצב הנכס'} required />
      <RadioButton
        data={[
          {name: 'new', title: 'חדש'}, // set title
          {name: 'renovated', title: 'משופץ'},
          {name: 'old', title: 'ישן'},
        ]}
        condition={condition}
        setCondition={setCondition}
      />
    </FormContainer>
  );
};

const styles = StyleSheet.create({});
