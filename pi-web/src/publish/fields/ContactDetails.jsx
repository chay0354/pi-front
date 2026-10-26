import {Title} from './Title';
import {InputBox} from './InputBox';
import {PhoneInput} from './PhoneInput';
import {TextAreaBox} from './TextAreaBox';
import {BnbBusinessLogoUpload} from './BnbBusinessLogoUpload';
import styles from './fields.module.css';

const noop = () => {};
const fn = f => (typeof f === 'function' ? f : noop);

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
}) => (
  <div dir="rtl" className={styles.plainSection}>
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
      setValue={fn(setContactFullName)}
      title={isBnbBusinessHost ? 'שם בית העסק' : 'שם פרטי ומשפחה'}
      required
      placeholder={isBnbBusinessHost ? 'הזן שם בית העסק' : 'הזן שם פרטי ומשפחה'}
    />
    <InputBox value={address} setValue={fn(setAddress)} title="כתובת המקום" required placeholder="הזן עיר, רחוב ומספר" />
    <InputBox
      value={contactEmail}
      setValue={fn(setContactEmail)}
      title="כתובת מייל"
      required
      placeholder="הזן כתובת מייל"
    />
    <PhoneInput phone={phone} setPhone={fn(setPhone)} />

    <TextAreaBox value={description} setValue={fn(setDescription)} title="תיאור" required placeholder="כתוב תיאור" />
  </div>
);
