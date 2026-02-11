import {StyleSheet, Text, View} from 'react-native';
import {InputBox} from './InputBox';
import {PhoneInput} from './PhoneInput';
import {TextAreaBox} from './TextAreaBox';
import {Title} from './Title';

export const LandAddress = ({
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
      <Title text={'פרטי כתובת הקרקע'} />
      <InputBox
        value={address}
        setValue={setAddress}
        title={'כתובת הקרקע'}
        required={true}
        placeholder={'הזן עיר, רחוב ומספר'}
      />
      <View style={styles.inputContainer}>
        <InputBox
          value={address}
          setValue={setAddress}
          title={'חלקה'}
          required={true}
          placeholder={'הזן מספר חלקה'}
          inputBoxContainerStyle={styles.flexInput}
        />
        <InputBox
          value={address}
          setValue={setAddress}
          title={'גוש'}
          required={true}
          placeholder={'הזן מספר גוש'}
          inputBoxContainerStyle={styles.flexInput}
        />
      </View>
      {/* Phone Section */}
      <PhoneInput phone={phone} setPhone={setPhone} />
      {/* Description Section */}
      <TextAreaBox
        value={description}
        setValue={setDescription}
        title={'תיאור הפרויקט'}
        required={true}
        placeholder={'כתוב תיאור'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'space-between',
  },
  flexInput: {
    flex: 1,
  },
});
