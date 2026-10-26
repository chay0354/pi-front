import {useEffect, useRef} from 'react';
import {Divider} from './Divider';
import {RadioIcon} from './RadioIcon';
import {cx, imageSrc, toWebStyle} from '../lib/rnStyle';
import styles from './fields.module.css';

const LONG_PRESS_MS = 450;

/** TouchableOpacity `onLongPress` + `delayLongPress` on a pointer device. */
function useLongPress(onLongPress) {
  const timerRef = useRef(null);
  const firedRef = useRef(false);
  const clear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };
  useEffect(() => clear, []);
  if (typeof onLongPress !== 'function') return {firedRef, handlers: {}};
  return {
    firedRef,
    handlers: {
      onPointerDown: e => {
        if (e.button !== 0) return;
        firedRef.current = false;
        clear();
        timerRef.current = setTimeout(() => {
          firedRef.current = true;
          onLongPress();
        }, LONG_PRESS_MS);
      },
      onPointerUp: clear,
      onPointerLeave: clear,
      onPointerCancel: clear,
      onContextMenu: e => {
        e.preventDefault();
        clear();
        firedRef.current = true;
        onLongPress();
      },
    },
  };
}

export const RadioWithText = ({
  isNotLastIndex,
  title,
  name,
  setName,
  isSelected,
  children,
  radioOptionStyle,
  styleDevider,
  containerStyle,
  radioSpacerStyle,
  isRequired,
  onLongPress,
  /** Figma/TikTok-style check — only פרטים כלליים / הפרויקט מציע accordions */
  useFigmaStyleIcon = false,
  /** Optional amenity / facility PNG shown between the check and the label */
  leftIcon,
  /** Compact row chip (e.g. מ״ר / דונם) — do not stretch to 100% width. */
  inline = false,
}) => {
  const {firedRef, handlers} = useLongPress(onLongPress);
  return (
    <div className={cx(inline && styles.rwtInlineWrap)} style={toWebStyle(containerStyle)}>
      <button
        type="button"
        className={cx(styles.rwtRow, inline && styles.rwtRowInline)}
        style={{
          paddingBottom: isNotLastIndex && !children ? 26 : 0,
          ...toWebStyle(radioOptionStyle),
        }}
        aria-pressed={!!isSelected}
        {...handlers}
        onClick={() => {
          if (firedRef.current) {
            firedRef.current = false;
            return;
          }
          setName?.(name);
        }}>
        <RadioIcon isSelected={isSelected} useFigmaStyle={useFigmaStyleIcon} />
        {leftIcon ? (
          <img className={styles.rwtLeftIcon} src={imageSrc(leftIcon)} alt="" />
        ) : (
          <span className={styles.rwtSpacer} style={toWebStyle(radioSpacerStyle)} />
        )}
        <span className={cx(styles.rwtText, inline && styles.rwtTextInline)}>
          {title}
          {isRequired && <span className={styles.requiredStar}>*</span>}
        </span>
      </button>
      {children}
      {isNotLastIndex && <Divider style={styleDevider} />}
    </div>
  );
};
