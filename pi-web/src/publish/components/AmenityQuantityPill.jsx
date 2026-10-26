import {cx, dp, toWebStyle} from '../lib/rnStyle';
import styles from './AmenityQuantityPill.module.css';

/**
 * Selected quantity pill (56×40 dp) — parking count, rooms, amenity qty, etc.
 * Figma: indicator circle on the left, number on the right (inside the pill), always LTR.
 * `textSize` is mobile dp; `style` is an RN-style object.
 */
export default function AmenityQuantityPill({
  qty,
  selected,
  onPress,
  style,
  textSize = 18,
  inactiveBorderColor = '#4D4966',
}) {
  return (
    <button
      type="button"
      className={styles.touch}
      style={toWebStyle(style)}
      onClick={onPress}
      aria-pressed={!!selected}>
      <span
        dir="ltr"
        className={cx(styles.pill, selected ? styles.pillSelected : styles.pillIdle)}
        style={selected ? undefined : {borderColor: inactiveBorderColor}}>
        {selected ? (
          <span className={styles.dotSelected}>
            <span className={styles.dotInner} />
          </span>
        ) : (
          <span className={styles.dot} style={{borderColor: inactiveBorderColor}} />
        )}
        <span className={selected ? styles.textSelected : styles.text} style={{fontSize: dp(textSize)}}>
          {qty}
        </span>
      </span>
    </button>
  );
}
