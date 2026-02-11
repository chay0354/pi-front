import {StyleSheet, Text, View} from 'react-native';
import React from 'react';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {CountUpdate} from './CountUpdate';
import {DateSelection} from './DateSelection';

export const AccommodationOffers = () => {
  return (
    <FormContainer>
      <Title text={'האירוח מציע'} />
      <CountUpdate title={'מספר אורחים'} count={0} setCount={() => {}} />
      <DateSelection
        title={'תאריך כניסה'}
        date={'20.12.25'}
        onPress={() => {}}
        isDivider={true}
      />
      <DateSelection
        style={{marginTop: 20}}
        title={'תאריך יציאה'}
        date={'20.12.25'}
        onPress={() => {}}
      />
    </FormContainer>
  );
};

const styles = StyleSheet.create({});
