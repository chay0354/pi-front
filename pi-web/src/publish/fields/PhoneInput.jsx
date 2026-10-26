import {Colors} from '../lib/styles';
import {Title} from './Title';
import styles from './fields.module.css';

const inputLabel = {fontSize: 14, marginRight: 12, marginBottom: 0, color: '#D2D0DC'};

export const PhoneInput = ({phone, setPhone}) => {
  return (
    <div className={styles.inputSection}>
      <Title text={'טלפון'} required textStyle={inputLabel} starStyle={{color: Colors.textSecondary}} />
      <div className={styles.phoneInput}>
        <input
          type="tel"
          inputMode="tel"
          dir="ltr"
          className={styles.phoneTextInput}
          placeholder="00 000 0000"
          value={phone ?? ''}
          onChange={e => setPhone?.(e.target.value)}
        />
      </div>
    </div>
  );
};
