import {StyleSheet, Text, View} from 'react-native';
import {Title} from './Title';
import {InputBox} from './InputBox';
import {PhoneInput} from './PhoneInput';
import {TextAreaBox} from './TextAreaBox';

export const ContactDetails = ({}) => {
  return (
    <View style={styles.container}>
      <Title text="פרטי התקשרות" />
      <InputBox
        // value={address}
        // setValue={setAddress}
        title={'שם פרטי ומשפחה'}
        required={true}
        placeholder={'הזן שם פרטי ומשפחה'}
      />
      <InputBox
        // value={address}
        // setValue={setAddress}
        title={'כתובת המקום'}
        required={true}
        placeholder={'הזן עיר, רחוב ומספר'}
      />
      <InputBox
        // value={address}
        // setValue={setAddress}
        title={'כתובת מייל'}
        required={true}
        placeholder={'הזן כתובת מייל'}
      />
      <PhoneInput />

      <TextAreaBox
        // value={description}
        // setValue={setDescription}
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
});
