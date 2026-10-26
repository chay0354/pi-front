import {useEffect, useMemo, useState} from 'react';
import {mdiChevronLeft, mdiChevronRight} from '@mdi/js';
import MdiIcon from '../MdiIcon';
import {cx} from '../lib/rnStyle';
import styles from './CalendarModal.module.css';

const MONTH_NAMES = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
];
const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const DAY_NAMES_SHORT = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

const pad = n => String(n).padStart(2, '0');
const toDateString = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** Month grid starting on Sunday (react-native-calendars `firstDay={0}`, `hideExtraDays`). */
function buildMonth(year, month) {
  const lead = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let d = 1; d <= days; d += 1) cells.push(d);
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Bottom-sheet month picker (mobile: react-native-calendars `Calendar` in a slide-up `Modal`). */
export const CalendarModal = ({visible, onClose, onSelect}) =>
  visible ? <CalendarSheet onClose={onClose} onSelect={onSelect} /> : null;

function CalendarSheet({onClose, onSelect}) {
  const [todayString] = useState(() => {
    const now = new Date();
    return toDateString(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return {year: now.getFullYear(), month: now.getMonth()};
  });

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const weeks = useMemo(() => buildMonth(cursor.year, cursor.month), [cursor]);

  const shiftMonth = delta =>
    setCursor(({year, month}) => {
      const d = new Date(year, month + delta, 1);
      return {year: d.getFullYear(), month: d.getMonth()};
    });

  return (
    <div className={styles.backdrop} onClick={onClose} data-account-modal="" role="presentation">
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label="בחירת תאריך"
        dir="rtl"
        onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <button type="button" className={styles.arrow} onClick={() => shiftMonth(-1)} aria-label="החודש הקודם">
            <MdiIcon path={mdiChevronRight} size={31} color="#00adf5" />
          </button>
          <span className={styles.monthTitle}>
            {MONTH_NAMES[cursor.month]} {cursor.year}
          </span>
          <button type="button" className={styles.arrow} onClick={() => shiftMonth(1)} aria-label="החודש הבא">
            <MdiIcon path={mdiChevronLeft} size={31} color="#00adf5" />
          </button>
        </div>
        <div className={styles.weekRow}>
          {DAY_NAMES_SHORT.map((label, i) => (
            <abbr key={label} className={styles.dayName} title={DAY_NAMES[i]}>
              {label}
            </abbr>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className={styles.weekRow}>
            {week.map((day, di) => {
              if (!day) return <span key={di} className={styles.dayCell} />;
              const dateString = toDateString(cursor.year, cursor.month, day);
              return (
                <span key={di} className={styles.dayCell}>
                  <button
                    type="button"
                    className={cx(styles.day, dateString === todayString && styles.today)}
                    onClick={() => {
                      if (onSelect) onSelect(dateString);
                      if (onClose) onClose();
                    }}>
                    {day}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
