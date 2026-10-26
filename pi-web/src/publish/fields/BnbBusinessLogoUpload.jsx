import {useId} from 'react';
import {mdiPlus} from '@mdi/js';
import MdiIcon from '../MdiIcon';
import {GOLD_GRADIENT_COLORS, GOLD_GRADIENT_LOCATIONS} from '../lib/goldGradient';
import {Colors} from '../lib/styles';
import {stopClick} from '../lib/rnStyle';
import styles from './fields.module.css';

const PROFILE_RING_COLORS = GOLD_GRADIENT_COLORS;
const PROFILE_RING_LOCATIONS = GOLD_GRADIENT_LOCATIONS;

const RING_RATIO = 3.5 / 82;
const GAP_RATIO = 2 / 82;
const SIZE = 120;

/**
 * Circular logo placeholder for BnB "business" flow only — gold gradient ring, לוגו label, + control.
 */
export const BnbBusinessLogoUpload = ({logo, onPress, inputRef, onWebFileChange}) => {
  const gradientId = `bnbLogoRing-${useId().replace(/:/g, '')}`;
  const ringWidth = Math.max(1, SIZE * RING_RATIO);
  const gap = Math.max(0, SIZE * GAP_RATIO);
  const inset = ringWidth + gap;
  const circleRadius = (SIZE - ringWidth) / 2;

  return (
    <div className={styles.bnbLogoWrap}>
      <button type="button" onClick={onPress} aria-label="העלאת לוגו עסקי" className={styles.bnbLogoTouch}>
        <svg width={SIZE} height={SIZE} className={styles.bnbLogoRing} aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              {PROFILE_RING_COLORS.map((color, i) => (
                <stop
                  key={`${gradientId}-${i}`}
                  offset={PROFILE_RING_LOCATIONS[i] ?? i / Math.max(1, PROFILE_RING_COLORS.length - 1)}
                  stopColor={color}
                />
              ))}
            </linearGradient>
          </defs>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={circleRadius}
            stroke={`url(#${gradientId})`}
            strokeWidth={ringWidth}
            fill="none"
          />
        </svg>
        <span className={styles.bnbLogoInner} style={{inset}}>
          {logo?.uri ? (
            <img src={logo.uri} alt="" className={styles.bnbLogoImage} />
          ) : (
            <span className={styles.bnbLogoPlaceholder}>לוגו</span>
          )}
        </span>
      </button>
      <button type="button" className={styles.bnbLogoFab} onClick={onPress} aria-label="העלאת לוגו עסקי">
        <MdiIcon path={mdiPlus} size={22} color={Colors.whiteGeneral} />
      </button>
      {inputRef && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{display: 'none'}}
          onChange={onWebFileChange}
          onClick={stopClick}
        />
      )}
    </div>
  );
};
