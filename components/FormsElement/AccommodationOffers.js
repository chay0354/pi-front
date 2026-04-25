import {StyleSheet, Text, View} from 'react-native';
import React from 'react';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {CountUpdate} from './CountUpdate';
import {DateSelection} from './DateSelection';

export const AccommodationOffers = ({
  guestCount = 0,
  setGuestCount,
  checkInDate = null,
  setCheckInDate,
  checkOutDate = null,
  setCheckOutDate,
}) => {
  const safeSetGuestCount =
    typeof setGuestCount === 'function' ? setGuestCount : () => {};
  const safeSetCheckInDate =
    typeof setCheckInDate === 'function' ? setCheckInDate : () => {};
  const safeSetCheckOutDate =
    typeof setCheckOutDate === 'function' ? setCheckOutDate : () => {};

  return (
    <FormContainer>
      <Title text={'האירוח מציע'} />
      <CountUpdate
        title={'מספר אורחים'}
        count={guestCount}
        setCount={safeSetGuestCount}
        min={1}
      />
      <DateSelection
        title={'תאריך כניסה'}
        date={checkInDate || '20.12.25'}
        onPress={safeSetCheckInDate}
        isDivider={true}
      />
      <DateSelection
        style={{marginTop: 20}}
        title={'תאריך יציאה'}
        date={checkOutDate || '20.12.25'}
        onPress={safeSetCheckOutDate}
      />
    </FormContainer>
  );
};

const styles = StyleSheet.create({});
