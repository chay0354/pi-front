import {toWebStyle} from '../lib/rnStyle';
import styles from './fields.module.css';

export const Divider = ({style}) => {
  return <div className={styles.divider} style={toWebStyle(style)} />;
};
