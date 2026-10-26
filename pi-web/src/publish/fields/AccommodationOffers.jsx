import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {CountUpdate} from './CountUpdate';
import {DateSelection} from './DateSelection';

const noop = () => {};

export const AccommodationOffers = ({
  guestCount = 0,
  setGuestCount,
  checkInDate = null,
  setCheckInDate,
  checkOutDate = null,
  setCheckOutDate,
}) => (
  <FormContainer>
    <Title text="האירוח מציע" />
    <CountUpdate
      title="מספר אורחים"
      count={guestCount}
      setCount={typeof setGuestCount === 'function' ? setGuestCount : noop}
      min={1}
    />
    <DateSelection
      title="תאריך כניסה"
      date={checkInDate || '20.12.25'}
      onPress={typeof setCheckInDate === 'function' ? setCheckInDate : noop}
      isDivider
    />
    <DateSelection
      style={{marginTop: 20}}
      title="תאריך יציאה"
      date={checkOutDate || '20.12.25'}
      onPress={typeof setCheckOutDate === 'function' ? setCheckOutDate : noop}
    />
  </FormContainer>
);
