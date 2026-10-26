import {useState} from 'react';
import {Title} from './Title';
import {Divider} from './Divider';
import {Spacing} from '../lib/styles';
import {CalendarModal} from './CalendarModal';
import calendarIcon from '../../assets/mobile/calendarIcon.png';
import {toWebStyle} from '../lib/rnStyle';
import styles from './fields.module.css';

const formatDateForDisplay = rawDate => {
  if (!rawDate || typeof rawDate !== 'string') return rawDate;
  if (/^\d{2}\.\d{2}\.\d{2}$/.test(rawDate)) return rawDate;
  const parts = rawDate.split('-');
  if (parts.length !== 3) return rawDate;
  const [y, m, d] = parts;
  return `${d}.${m}.${y.slice(2)}`;
};

/** `onPress(isoDate)` fires with the picked `YYYY-MM-DD` (same as mobile). */
export const DateSelection = ({isDivider, date = '20.12.25', onPress, title, style}) => {
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState(date);
  const [syncedDate, setSyncedDate] = useState(date);
  if (date !== syncedDate) {
    setSyncedDate(date);
    if (date) setSelected(formatDateForDisplay(date));
  }

  const handleSelect = isoDate => {
    if (!isoDate) return;
    const parts = isoDate.split('-');
    if (parts.length !== 3) {
      setSelected(date);
    } else {
      const [y, m, d] = parts;
      setSelected(`${d}.${m}.${y.slice(2)}`);
    }
    if (typeof onPress === 'function') onPress(isoDate);
  };

  return (
    <div style={toWebStyle(style)}>
      <Title text={title} required />
      <button type="button" onClick={() => setVisible(true)} className={styles.datePill}>
        <img className={styles.dateIcon} src={calendarIcon} alt="" />
        <span className={styles.dateText}>{selected}</span>
      </button>
      {isDivider && <Divider style={{marginTop: Spacing.m3}} />}
      <CalendarModal visible={visible} onClose={() => setVisible(false)} onSelect={handleSelect} />
    </div>
  );
};
