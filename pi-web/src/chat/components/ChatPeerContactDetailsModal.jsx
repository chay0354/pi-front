import {useEffect} from 'react';
import {mdiChevronLeft} from '@mdi/js';
import MdiIcon from '../../publish/MdiIcon';
import {ProfileAvatar} from '../../profile/ProfileParts';
import {DEFAULT_PI_PROFILE_AVATAR} from '../../profile/lib/userProfileImage';
import phoneAsset from '../../assets/mobile/pi-chat/phone.png';
import styles from './ChatPeerContactDetailsModal.module.css';

const toTelUrl = raw => {
  if (raw == null || !String(raw).trim()) return null;
  const cleaned = String(raw).replace(/[^\d+]/g, '');
  if (!cleaned || cleaned === '+') return null;
  return `tel:${cleaned}`;
};

export default function ChatPeerContactDetailsModal({
  visible,
  onClose,
  displayName,
  avatarUri,
  phone,
  subscriptionType,
}) {
  const name =
    displayName != null && String(displayName).trim() ? String(displayName).trim() : 'משתמש';
  const tel = phone != null && String(phone).trim() ? String(phone).trim() : null;
  const telUrl = tel ? toTelUrl(tel) : null;

  useEffect(() => {
    if (!visible) return undefined;
    const onKey = e => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose?.();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [visible, onClose]);

  const handleDial = () => {
    if (!telUrl) return;
    try {
      window.location.href = telUrl;
    } catch {
      window.alert('לא ניתן לחייג כעת');
    }
  };

  if (!visible) return null;

  return (
    <div
      className={styles.root}
      data-account-modal=""
      role="dialog"
      aria-modal="true"
      aria-label="פרטי קשר">
      <div className={styles.topNav}>
        <div className={styles.navRow}>
          <button
            type="button"
            className={styles.backHit}
            onClick={onClose}
            aria-label="חזור">
            <MdiIcon path={mdiChevronLeft} size={36} color="#fff" />
          </button>
          <div className={styles.navTitleSlot}>
            <h2 className={styles.navTitle}>פרטי קשר</h2>
          </div>
          <div className={styles.navTrailing} />
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.profileBlock}>
          <ProfileAvatar
            uri={avatarUri || null}
            placeholderImage={DEFAULT_PI_PROFILE_AVATAR}
            size={152}
            subscriptionType={subscriptionType}
          />
          <p className={styles.displayName}>{name}</p>
        </div>

        {tel ? (
          <div className={styles.phoneBlock}>
            <img className={styles.phoneIcon} src={phoneAsset} alt="" />
            <span className={styles.phoneLabel}>טלפון נייד</span>
            <button type="button" className={styles.phoneValue} onClick={handleDial}>
              {tel}
            </button>
          </div>
        ) : (
          <p className={styles.noPhone}>אין מספר טלפון זמין</p>
        )}
      </div>
    </div>
  );
}
