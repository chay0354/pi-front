import {StyleSheet, Text, View} from 'react-native';
import {InputBox} from './InputBox';
import {PhoneInput} from './PhoneInput';
import {TextAreaBox} from './TextAreaBox';
import {Title} from './Title';

export const PropertyAddress = ({
  projectName,
  setProjectName,
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
      <View style={styles.fieldSection}>
        <InputBox
          value={projectName}
          setValue={setProjectName}
          title={'שם הפרויקט'}
          required={true}
          placeholder={'הזן שם'}
        />
      </View>
      <View style={styles.fieldSection}>
        <InputBox
          value={address}
          setValue={setAddress}
          title={'כתובת הפרויקט'}
          required={true}
          placeholder={'הזן עיר, רחוב ומספר'}
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
  fieldSection: {
    marginBottom: 24,
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
