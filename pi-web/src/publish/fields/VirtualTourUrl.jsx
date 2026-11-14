import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {normalizeVirtualTourUrl} from '../lib/virtualTour';
import styles from './fields.module.css';

/** Optional project visualization / 3D tour link (company projects). */
export const VirtualTourUrl = ({value, setValue}) => {
  const trimmed = String(value || '').trim();
  const invalid = trimmed !== '' && normalizeVirtualTourUrl(trimmed) === null;
  return (
    <FormContainer>
      <Title text="הדמיה / סיור וירטואלי" textStyle={{marginBottom: 8}} />
      <p className={styles.tourHint}>
        הדביקו קישור להדמיה או לסיור התלת-ממדי של הפרויקט (למשל Matterport, YouTube). ההדמיה תוצג בעמוד הפרויקט.
      </p>
      <div className={styles.tourInputWrap}>
        <input
          type="url"
          dir="ltr"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          className={`${styles.textInput} ${styles.tourInput} ${invalid ? styles.tourInputError : ''}`}
          placeholder="https://"
          value={value ?? ''}
          onChange={e => setValue?.(e.target.value)}
          aria-label="קישור להדמיה או לסיור וירטואלי"
          aria-invalid={invalid || undefined}
        />
        {trimmed ? (
          <button type="button" className={styles.tourClear} onClick={() => setValue?.('')} aria-label="ניקוי קישור ההדמיה">
            ✕
          </button>
        ) : null}
      </div>
      {invalid ? <p className={styles.tourError}>הקישור אינו תקין. הדביקו קישור שמתחיל ב-https://</p> : null}
    </FormContainer>
  );
};
