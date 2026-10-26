import arrowUp from '../assets/figma/feed/arrow-up.svg';
import arrowDown from '../assets/figma/feed/arrow-down.svg';
import styles from './FeedArrows.module.css';

export default function FeedArrows({onPrev, onNext, canPrev, canNext}) {
  return (
    <div className={styles.arrows}>
      <button type="button" className={styles.arrow} aria-label="המודעה הקודמת" onClick={onPrev} disabled={!canPrev}>
        <img className={styles.up} src={arrowUp} alt="" width={36} height={36} />
      </button>
      <button type="button" className={styles.arrow} aria-label="המודעה הבאה" onClick={onNext} disabled={!canNext}>
        <img className={styles.down} src={arrowDown} alt="" width={36} height={36} />
      </button>
    </div>
  );
}
