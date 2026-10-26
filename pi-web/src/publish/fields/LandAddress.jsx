import {InputBox} from './InputBox';
import {PhoneInput} from './PhoneInput';
import {TextAreaBox} from './TextAreaBox';
import {Title} from './Title';
import styles from './fields.module.css';

const flexInput = {flex: 1, minWidth: 0};

export const LandAddress = ({
  address,
  setAddress,
  landParcel,
  setLandParcel,
  landBlock,
  setLandBlock,
  phone,
  setPhone,
  description,
  setDescription,
}) => (
  <div dir="rtl" className={styles.plainSectionNoTop}>
    <Title text="פרטי כתובת הקרקע" />
    <InputBox value={address} setValue={setAddress} title="כתובת הקרקע" required placeholder="הזן עיר, רחוב ומספר" />
    <div className={styles.laInputRow}>
      <InputBox
        value={landParcel}
        setValue={setLandParcel}
        title="חלקה"
        required
        placeholder="הזן מספר חלקה"
        inputBoxContainerStyle={flexInput}
      />
      <InputBox
        value={landBlock}
        setValue={setLandBlock}
        title="גוש"
        required
        placeholder="הזן מספר גוש"
        inputBoxContainerStyle={flexInput}
      />
    </div>
    <PhoneInput phone={phone} setPhone={setPhone} />
    <TextAreaBox value={description} setValue={setDescription} title="תיאור הקרקע" required placeholder="כתוב תיאור" />
  </div>
);
