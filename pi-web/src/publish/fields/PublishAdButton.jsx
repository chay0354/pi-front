import grayButton from '../../assets/mobile/ad-uplaud/button-gray.png';
import yellowButton from '../../assets/mobile/ad-uplaud/button-yelow.png';
import {cx, toWebStyle} from '../lib/rnStyle';
import styles from './PublishAdButton.module.css';

const GRAY_ASPECT = 1004 / 174;
const YELLOW_ASPECT = 990 / 162;

export function PublishAdButton({
  onPress,
  uploading = false,
  ready = false,
  /** When true, show "שמור שינויים" instead of the publish image button. */
  isEditing = false,
  style,
}) {
  const enabled = ready && !uploading;
  const aspectRatio = ready ? YELLOW_ASPECT : GRAY_ASPECT;
  const saveLabel = 'שמור שינויים';
  const saveLoadingLabel = 'שומר...';

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={!ready || uploading}
      aria-disabled={uploading || !ready}
      aria-busy={uploading}
      aria-label={isEditing ? (uploading ? 'שומר שינויים' : saveLabel) : uploading ? 'מפרסם מודעה' : 'פרסם'}
      className={cx(styles.touchable, enabled && styles.enabled, !enabled && !uploading && styles.notAllowed)}
      style={toWebStyle(style)}>
      <span className={cx(styles.imageWrap, uploading && styles.pulse)}>
        {uploading ? (
          <span className={styles.loadingShell} style={{aspectRatio: YELLOW_ASPECT}}>
            <span className={styles.loadingFillClip}>
              <span className={styles.loadingFillOuter} />
            </span>
            <span className={styles.loadingText}>{isEditing ? saveLoadingLabel : 'מפרסם...'}</span>
          </span>
        ) : isEditing ? (
          <span className={cx(styles.saveShell, ready ? styles.saveShellReady : styles.saveShellDisabled)} style={{aspectRatio}}>
            <span className={cx(styles.saveText, !ready && styles.saveTextDisabled)}>{saveLabel}</span>
          </span>
        ) : (
          <img src={ready ? yellowButton : grayButton} alt="" className={styles.image} style={{aspectRatio}} />
        )}
      </span>
    </button>
  );
}
