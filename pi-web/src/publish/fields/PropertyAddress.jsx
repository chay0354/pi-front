import {InputBox} from './InputBox';
import {PhoneInput} from './PhoneInput';
import {TextAreaBox} from './TextAreaBox';
import {Title} from './Title';
import {uploadProjectWording} from '../lib/publishRules';
import styles from './fields.module.css';

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
    <div dir="rtl" className={styles.plainSectionNoTop}>
      <Title text="פרטי כתובת הנכס" />
      <InputBox value={projectName} setValue={setProjectName} title={nameLabel} required placeholder="הזן שם" />
      <InputBox value={address} setValue={setAddress} title={addressLabel} required placeholder="הזן עיר, רחוב ומספר" />

      <PhoneInput phone={phone} setPhone={setPhone} />
      <TextAreaBox value={description} setValue={setDescription} title={descriptionLabel} required placeholder="כתוב תיאור" />
    </div>
  );
};
