import {cx, toWebStyle} from '../lib/rnStyle';
import styles from './fields.module.css';

export const FormContainer = ({children, style, className}) => {
  return (
    <div dir="rtl" className={cx(styles.formContainer, className)} style={toWebStyle(style)}>
      {children}
    </div>
  );
};
