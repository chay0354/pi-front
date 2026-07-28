import {StyleSheet, Text, View} from 'react-native';
import {Title} from './Title';
import {InputBox} from './InputBox';
import {PhoneInput} from './PhoneInput';
import {TextAreaBox} from './TextAreaBox';
import {BnbBusinessLogoUpload} from './BnbBusinessLogoUpload';

export const ContactDetails = ({
  showBnbBusinessLogo = false,
  isBnbBusinessHost = false,
  bnbBusinessLogo = null,
  onBnbBusinessLogoPress,
  bnbBusinessLogoInputRef,
  onBnbBusinessLogoWebFileChange,
  contactFullName = '',
  setContactFullName,
  address = '',
  setAddress,
  contactEmail = '',
  setContactEmail,
  phone = '',
  setPhone,
  description = '',
  setDescription,
}) => {
  const safeSetContactFullName =
    typeof setContactFullName === 'function' ? setContactFullName : () => {};
  const safeSetAddress = typeof setAddress === 'function' ? setAddress : () => {};
  const safeSetContactEmail =
    typeof setContactEmail === 'function' ? setContactEmail : () => {};
  const safeSetPhone = typeof setPhone === 'function' ? setPhone : () => {};
  const safeSetDescription =
    typeof setDescription === 'function' ? setDescription : () => {};

  return (
    <View style={styles.container}>
      <Title text="פרטי התקשרות" />
      {showBnbBusinessLogo && (
        <BnbBusinessLogoUpload
          logo={bnbBusinessLogo}
          onPress={onBnbBusinessLogoPress}
          inputRef={bnbBusinessLogoInputRef}
          onWebFileChange={onBnbBusinessLogoWebFileChange}
        />
      )}
      <InputBox
        value={contactFullName}
        setValue={safeSetContactFullName}
        title={isBnbBusinessHost ? 'שם בית העסק' : 'שם פרטי ומשפחה'}
        required={true}
        placeholder={
          isBnbBusinessHost ? 'הזן שם בית העסק' : 'הזן שם פרטי ומשפחה'
        }
      />
      <InputBox
        value={address}
        setValue={safeSetAddress}
        title={'כתובת המקום'}
        required={true}
        placeholder={'הזן עיר, רחוב ומספר'}
      />
      <InputBox
        value={contactEmail}
        setValue={safeSetContactEmail}
        title={'כתובת מייל'}
        required={true}
        placeholder={'הזן כתובת מייל'}
      />
      <PhoneInput phone={phone} setPhone={safeSetPhone} />

      <TextAreaBox
        value={description}
        setValue={safeSetDescription}
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
