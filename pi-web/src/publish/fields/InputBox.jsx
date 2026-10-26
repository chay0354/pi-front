import {Colors} from '../lib/styles';
import {toWebStyle} from '../lib/rnStyle';
import {Title} from './Title';
import styles from './fields.module.css';

const inputLabel = {fontSize: 14, marginBottom: 0, color: '#D2D0DC'};

export const InputBox = ({value, setValue, title, required, placeholder, inputBoxContainerStyle}) => {
  const labelSideSpacing = {marginLeft: 12};
  return (
    <div className={styles.inputSection} style={toWebStyle(inputBoxContainerStyle)}>
      <Title
        text={title}
        required={required}
        textStyle={[inputLabel, labelSideSpacing]}
        starStyle={{color: Colors.textSecondary}}
      />
      <input
        type="text"
        dir="rtl"
        className={styles.textInput}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={e => setValue?.(e.target.value)}
      />
    </div>
  );
};
