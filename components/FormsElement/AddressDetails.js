import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import {Title} from './Title';
import {Colors} from '../../constants/styles';
import {InputBox} from './InputBox';
import {TextAreaBox} from './TextAreaBox';
import {PhoneInput} from './PhoneInput';

export const AddressDetails = ({
  address,
  setAddress,
  phone,
  setPhone,
  description,
  setDescription,
}) => {
  return (
    <View style={styles.container}>
      {/* Address Section */}
      <Title text={'פרטי כתובת הנכס'} />

      <InputBox
        value={address}
        setValue={setAddress}
        title={'כתובת הנכס'}
        required={true}
        placeholder={'הזן עיר, רחוב ומספר'}
      />

      {/* Phone Section */}
      <PhoneInput phone={phone} setPhone={setPhone} />

      {/* Description Section */}
      <TextAreaBox
        value={description}
        setValue={setDescription}
        title={'תיאור'}
        required={true}
        placeholder={'כתוב תיאור'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  section: {
    marginBottom: 22,
  },
  inputLabel: {fontSize: 14, marginRight: 12, marginBottom: 0},
});
