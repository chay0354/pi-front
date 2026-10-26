import checkboxSelected from '../../assets/mobile/checkbox-selected.png';
import {cx} from '../lib/rnStyle';
import styles from './fields.module.css';

/** Pill radios in LTR geometry (first option on the physical left, check circle on the right edge). */
export const RadioButton = ({data, condition, setCondition}) => {
  return (
    <div dir="ltr" className={styles.rbRow} style={{gap: data.length > 2 ? 7 : 13}}>
      {data.map((item, index) => {
        const selected = condition === item.name;
        return (
          <button
            type="button"
            key={index}
            onClick={() => setCondition?.(item.name)}
            className={styles.rbItem}
            aria-pressed={selected}>
            <span className={cx(styles.rbPill, selected && styles.rbPillSelected)}>
              <span className={selected ? styles.rbTextSelected : styles.rbText}>{item.title}</span>
              {selected ? (
                <span className={styles.rbCircleOn}>
                  <img className={styles.rbCheck} src={checkboxSelected} alt="" />
                </span>
              ) : (
                <span className={styles.rbCircleOff} />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};
