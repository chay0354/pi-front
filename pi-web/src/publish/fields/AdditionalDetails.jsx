import {Title} from './Title';
import {TextAreaBox} from './TextAreaBox';
import styles from './fields.module.css';

export const AdditionalDetails = ({description, setDescription}) => (
  <div dir="rtl" className={styles.plainSection}>
    <Title text="פרטים נוספים" />
    <TextAreaBox
      value={description}
      setValue={setDescription}
      title="פרטים נוספים"
      required
      placeholder="כתוב תיאור"
    />
  </div>
);
