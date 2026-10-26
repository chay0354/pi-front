import {ProfileAvatar} from '../profile/ProfileParts';
import styles from './StoryStrip.module.css';

export default function StoryStrip({rings, loading, onOpen}) {
  if (!loading && (!rings || rings.length === 0)) return null;
  return (
    <div className={styles.row} dir="ltr">
      {loading && rings.length === 0
        ? [0, 1, 2, 3, 4, 5].map(i => <span key={i} className={styles.placeholder} />)
        : rings.map(ring => (
            <button
              key={ring.subscription_id}
              type="button"
              className={styles.item}
              aria-label={`סטוריז של ${ring.display_name || 'משתמש'}`}
              onClick={() => onOpen?.(ring)}>
              <ProfileAvatar uri={ring.profile_image_url} size={76} subscriptionType={ring.subscription_type} />
              <span className={styles.name}>{ring.display_name || 'משתמש'}</span>
            </button>
          ))}
    </div>
  );
}
