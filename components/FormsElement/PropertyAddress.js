import {StyleSheet, View} from 'react-native';
import {InputBox} from './InputBox';
import {PhoneInput} from './PhoneInput';
import {TextAreaBox} from './TextAreaBox';
import {Title} from './Title';
import {uploadProjectWording} from '../../utils/constant';

export const PropertyAddress = ({
  projectName,
  setProjectName,
  address,
  setAddress,
  phone,
  setPhone,
  description,
  setDescription,
  subscriptionType = null,
}) => {
  const nameLabel = uploadProjectWording('שם הפרויקט', subscriptionType);
  const addressLabel = uploadProjectWording('כתובת הפרויקט', subscriptionType);
  const descriptionLabel = uploadProjectWording('תיאור הפרויקט', subscriptionType);

  return (
    <View style={styles.container}>
      <Title text={'פרטי כתובת הנכס'} />
      <InputBox
        value={projectName}
        setValue={setProjectName}
        title={nameLabel}
        required={true}
        placeholder={'הזן שם'}
      />
      <InputBox
        value={address}
        setValue={setAddress}
        title={addressLabel}
        required={true}
        placeholder={'הזן עיר, רחוב ומספר'}
      />

      <PhoneInput phone={phone} setPhone={setPhone} />
      <TextAreaBox
        value={description}
        setValue={setDescription}
        title={descriptionLabel}
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
