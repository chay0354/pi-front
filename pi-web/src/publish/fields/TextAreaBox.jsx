import {useRef} from 'react';
import {Title} from './Title';
import {Colors} from '../lib/styles';
import {useFormScroll} from '../lib/formKeyboardScroll';
import styles from './fields.module.css';

const inputLabel = {fontSize: 14, marginBottom: 0, color: '#D2D0DC'};

export const TextAreaBox = ({title, required, value, setValue, placeholder, scrollOnFocus = true}) => {
  const labelSideSpacing = {marginLeft: 12};
  const wrapRef = useRef(null);
  const formScroll = useFormScroll();

  const handleFocus = () => {
    if (scrollOnFocus && formScroll?.scrollToField) {
      formScroll.scrollToField(wrapRef);
    }
  };

  return (
    <div ref={wrapRef}>
      <Title
        text={title}
        required={required}
        textStyle={[inputLabel, labelSideSpacing]}
        starStyle={{color: Colors.textSecondary}}
      />
      <textarea
        dir="rtl"
        className={styles.textArea}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={e => setValue?.(e.target.value)}
        onFocus={handleFocus}
      />
    </div>
  );
};
