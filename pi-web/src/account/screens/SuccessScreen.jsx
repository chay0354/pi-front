import {useState} from 'react';
import {AccountScreen, Icon, PrimaryButton, TextLink, Wizard} from '../AccountUi';
import {DEFAULT_MONTHLY_LISTING_QUOTA, getHeaderTitle, subscriptionTypes} from '../constants';
import {getUserProfileImageUrl} from '../../profile/lib/userProfileImage';
import successFallback from '../../assets/account/profile-pic-success.png';
import styles from './SubscriptionScreens.module.css';

/** Wizard step 3 — "הרישום בוצע בהצלחה!" with the subscriber number. */
export default function SuccessScreen({
  subscriptionType = subscriptionTypes.broker,
  subscription,
  localProfileImage = null,
  onClose,
  onGoHome,
  onStartPublishing,
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const resolvedType = String(subscription?.subscription_type || subscriptionType || '').toLowerCase();
  const isCompany =
    subscriptionType === subscriptionTypes.company ||
    subscriptionType === subscriptionTypes.projectMarketer ||
    resolvedType === 'company' ||
    resolvedType === subscriptionTypes.projectMarketer;
  const isBroker = subscriptionType === subscriptionTypes.broker || resolvedType === 'broker';
  const companyLogoUrl = subscription?.company_logo_url || subscription?.companyLogoUrl || null;
  const serverImageUrl = isCompany
    ? companyLogoUrl || getUserProfileImageUrl(subscription)
    : getUserProfileImageUrl(subscription);
  const picUrl = serverImageUrl || localProfileImage || null;
  const displayName =
    subscription?.business_name ||
    subscription?.broker_office_name ||
    subscription?.name ||
    subscription?.contact_person_name ||
    'קבוצת אביב';
  const displayEmail = subscription?.email || 'amirlevi@gmail.com';
  const subscriberNumber = subscription?.subscriber_number || '112345235';
  const monthlyQuota =
    Number(subscription?.max_published_listings ?? subscription?.maxPublishedListings) || DEFAULT_MONTHLY_LISTING_QUOTA;

  return (
    <AccountScreen title={getHeaderTitle(subscriptionType)} onBack={onClose} width={460} header={<Wizard step={3} />}>
      <div className={styles.successProfile}>
        <span className={styles.successAvatar}>
          <img src={picUrl && !imgFailed ? picUrl : successFallback} alt="" onError={() => setImgFailed(true)} />
          <span className={styles.successBadge}>
            <Icon name="check" size={18} color="#15e3ff" />
          </span>
        </span>
        <span className={styles.successName}>{displayName}</span>
        <span className={styles.successEmail}>{displayEmail}</span>
      </div>

      <div className={styles.successTitleBlock}>
        <h2 className={styles.heroHeadline}>הרישום בוצע בהצלחה!</h2>
        {isBroker ? (
          <p className={styles.successSubtitle}>
            ניתן לפרסם עד {monthlyQuota} מודעות בכל הקטגוריות
            {subscription?.promo_code ? ' (קופון הופעל)' : ''}
          </p>
        ) : null}
      </div>

      <div className={styles.subscriberCard}>
        <span className={styles.subscriberLabel}>מספר מנוי</span>
        <span className={styles.subscriberNumber} dir="ltr">
          {subscriberNumber}
        </span>
      </div>

      <div className={styles.actions}>
        <PrimaryButton onClick={onStartPublishing}>התחל לפרסם מודעות</PrimaryButton>
        <TextLink onClick={onGoHome}>קח אותי לעמוד הבית</TextLink>
      </div>
    </AccountScreen>
  );
}
