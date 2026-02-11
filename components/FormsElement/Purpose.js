import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioButton} from './RadioButton';

export const Purpose = ({purpose, setPurpose}) => {
  return (
    <FormContainer>
      <Title text={'מטרת הפרסום'} required />
      <RadioButton
        data={[
          {name: 'sale', title: 'למכירה'},
          {name: 'rent', title: 'להשכרה'},
        ]}
        condition={purpose}
        setCondition={setPurpose}
      />
    </FormContainer>
  );
};

const styles = StyleSheet.create({
  purposeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
