import {Title} from './Title';
import {InputBox} from './InputBox';
import {TextAreaBox} from './TextAreaBox';
import {PhoneInput} from './PhoneInput';
import styles from './fields.module.css';

export const AddressDetails = ({address, setAddress, phone, setPhone, description, setDescription}) => (
  <div dir="rtl" className={styles.plainSection}>
    <Title text="פרטי כתובת הנכס" />

    <InputBox value={address} setValue={setAddress} title="כתובת הנכס" required placeholder="הזן עיר, רחוב ומספר" />

    <PhoneInput phone={phone} setPhone={setPhone} />

    <TextAreaBox value={description} setValue={setDescription} title="תיאור" required placeholder="כתוב תיאור" />
  </div>
);
