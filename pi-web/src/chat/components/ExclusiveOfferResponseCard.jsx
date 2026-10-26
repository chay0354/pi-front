import {
  mdiCheck,
  mdiClose,
  mdiHomeCityOutline,
  mdiMapMarkerOutline,
} from '@mdi/js';
import MdiIcon from '../../publish/MdiIcon';
import {flexStart} from '../../publish/lib/rtlLayout';
import styles from './ExclusiveOfferResponseCard.module.css';

const GOLD_GRADIENT =
  'linear-gradient(180deg, #FFE56A 4.5%, #F7C63A 50.8%, #E5A80F 88.3%)';

export function formatPrice(n) {
  if (n == null || !Number.isFinite(Number(n))) return null;
  try {
    return `₪${Number(n).toLocaleString('he-IL')}`;
  } catch {
    return `₪${Number(n)}`;
  }
}

/**
 * Figma 8:9989 — listing summary + exclusivity period + accept / reject (owner only).
 */
export default function ExclusiveOfferResponseCard({
  purposeLabel,
  priceFormatted,
  addressLine,
  imageUri,
  monthsCommitted,
  decisionStatus,
  loading,
  onAccept,
  onReject,
  offerKind = 'exclusive',
}) {
  const st = String(decisionStatus || 'pending')
    .trim()
    .toLowerCase();
  const isAccepted = st === 'accepted';
  const isRejected = st === 'rejected';
  const isCollab = String(offerKind || '').trim().toLowerCase() === 'collab';

  const pill = purposeLabel || 'למכירה';
  const months =
    monthsCommitted != null && Number.isFinite(Number(monthsCommitted))
      ? Number(monthsCommitted)
      : null;

  return (
    <div className={styles.wrap}>
      <div className={styles.topCard}>
        <div className={styles.topTextCol} style={{alignItems: flexStart}}>
          <div className={styles.whitePill} style={{alignSelf: flexStart}}>
            <span className={styles.whitePillText}>{pill}</span>
          </div>
          {priceFormatted ? <div className={styles.price}>{priceFormatted}</div> : null}
          <div className={styles.addrRow} style={{justifyContent: flexStart}}>
            <MdiIcon path={mdiMapMarkerOutline} size={26} color="#fff" />
            <span className={styles.address}>{addressLine || '—'}</span>
          </div>
        </div>
        <div className={styles.thumbWrap}>
          {imageUri ? (
            <img className={styles.thumb} src={imageUri} alt="" />
          ) : (
            <div className={styles.thumbPlaceholder}>
              <MdiIcon path={mdiHomeCityOutline} size={42} color="rgba(255,255,255,0.35)" />
            </div>
          )}
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.bottomCard}>
        <p className={styles.periodText}>
          {isCollab
            ? months != null
              ? `תקופת השת״פ המוצעת: ${months} חודשים`
              : 'תקופת השת״פ המוצעת'
            : months != null
              ? `תקופת הבלעדיות המוצעת: ${months} חודשים`
              : 'תקופת הבלעדיות המוצעת'}
        </p>
        <div className={styles.btnRow}>
          <button
            type="button"
            className={`${styles.gradHit} ${isAccepted ? styles.gradHitSelected : ''}`}
            onClick={onAccept}
            disabled={loading}
            aria-label="אשר בקשה"
            style={{backgroundImage: GOLD_GRADIENT}}>
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              <>
                <span className={styles.gradBtnText}>אשר בקשה</span>
                <MdiIcon path={mdiCheck} size={29} color="#1e1d27" />
              </>
            )}
          </button>
          <button
            type="button"
            className={`${styles.gradHit} ${isRejected ? styles.gradHitSelected : ''}`}
            onClick={onReject}
            disabled={loading}
            aria-label="דחה בקשה"
            style={{backgroundImage: GOLD_GRADIENT}}>
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              <>
                <span className={styles.gradBtnText}>דחה בקשה</span>
                <MdiIcon path={mdiClose} size={26} color="#1e1d27" />
              </>
            )}
          </button>
        </div>
        {isRejected ? (
          <p className={styles.decisionHint}>כרגע דחית את הבקשה — ניתן לאשר מחדש</p>
        ) : isAccepted ? (
          <p className={styles.decisionHint}>כרגע אישרת את הבקשה — ניתן לדחות מחדש</p>
        ) : null}
      </div>
    </div>
  );
}
