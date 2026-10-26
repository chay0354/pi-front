import {FigmaCheckbox} from '../components/FigmaCheckbox';
import checkboxSelected from '../../assets/mobile/checkbox-selected.png';
import styles from './fields.module.css';

/**
 * Classic selected state matches list radios (e.g. סוג דירה): one gradient disc + checkbox PNG.
 *
 * @param {boolean} [useFigmaStyle] — TikTok / Figma glyph check; only for
 *   פרטים כלליים / הפרויקט מציע accordion rows.
 */
export const RadioIcon = ({isSelected, useFigmaStyle}) => {
  if (useFigmaStyle) {
    return <FigmaCheckbox checked={!!isSelected} size={24} />;
  }
  if (!isSelected) {
    return <span className={styles.radioIconOff} aria-hidden />;
  }
  return (
    <span className={styles.radioIconOn} aria-hidden>
      <img className={styles.radioIconCheck} src={checkboxSelected} alt="" />
    </span>
  );
};
