import {Fragment, useEffect, useState} from 'react';
import {getCurrentUser, getFollowHubRows, toSubscriptionId} from '../api/client';
import {useSession} from '../auth/session';
import {ProfileAvatar} from '../profile/ProfileParts';
import {isMarketingManager, subscriptionTypes} from '../profile/lib/constant';
import {resolveProfileDisplayName} from '../profile/lib/profileFields';
import {
  DEFAULT_PI_PROFILE_AVATAR,
  getUserCompanyLogoUrl,
  getUserProfileImageUrl,
} from '../profile/lib/userProfileImage';
import imgChevron from '../assets/figma/menu/3330a.svg';
import imgDivider from '../assets/figma/menu/e0c08.svg';
import imgLine from '../assets/figma/menu/76b87.svg';
import imgClose from '../assets/figma/menu/27aa0.svg';
import imgPiChatBubble from '../assets/figma/menu/5c5a4.svg';
import imgPiChatPlane from '../assets/figma/menu/e3ec2.svg';
import imgPiChatPi from '../assets/figma/menu/8de32.svg';
import iconEdit from '../assets/figma/menu/b7a41.svg';
import iconFavorites from '../assets/figma/menu/0bb8f.svg';
import iconCompany from '../assets/figma/menu/4f264.svg';
import iconBrokerGroup from '../assets/figma/menu/28d68.svg';
import iconProfessional from '../assets/figma/menu/0a7b1.svg';
import iconSecret from '../assets/figma/menu/c9575.svg';
import iconFeedback from '../assets/figma/menu/0a16a.svg';
import iconTerms from '../assets/figma/menu/f005a.svg';
import iconAccessibility from '../assets/figma/menu/e2a44.svg';
import iconContact from '../assets/figma/menu/7e515.svg';
import iconCancel from '../assets/figma/menu/aebc8.svg';
import iconLogout from '../assets/figma/menu/cfc65.svg';
import iconUpdates from '../assets/menu/updates.png';
import iconCompanySmall from '../assets/menu/subscription-company-icon.png';
import iconBrokerSmall from '../assets/menu/subscription-broker-icon.png';
import pencilIcon from '../assets/menu/pencil-icon.png';
import logo from '../assets/menu/logo.png';
import slogan from '../assets/menu/its-just-simple.png';
import PropertyAlertsDialog from './PropertyAlertsDialog';
import styles from './SideMenu.module.css';

/** Mobile SettingsScreen LEGAL_DEFAULTS — an empty URL shows the “בקרוב” alert. */
const LEGAL_DEFAULTS = {
  termsOfUseUrl: '',
  accessibilityStatementUrl: '',
  supportEmail: 'support@pi.co.il',
  transactionCancellationUrl: '',
};

const MENU_ICONS = {
  edit: iconEdit,
  updates: iconUpdates,
  favorites: iconFavorites,
  company: iconCompany,
  professional: iconProfessional,
  secret: iconSecret,
  feedback: iconFeedback,
  terms: iconTerms,
  accessibility: iconAccessibility,
  contact: iconContact,
  cancel: iconCancel,
  logout: iconLogout,
};

const showAlert = (title, message) => window.alert(title ? `${title}\n\n${message}` : message);

function openUrlOrPlaceholder(url, titleHebrew) {
  const u = url && String(url).trim();
  if (!u) {
    showAlert(titleHebrew, 'התוכן יהיה זמין בקרוב.');
    return;
  }
  const win = window.open(u, '_blank', 'noopener,noreferrer');
  if (!win) showAlert(titleHebrew, 'לא ניתן לפתוח את הקישור.');
}

function MenuIcon({type}) {
  if (type === 'projectMarketer') {
    return (
      <span className={styles.iconDual}>
        <img src={iconCompanySmall} alt="" width={22} height={22} />
        <img src={iconBrokerSmall} alt="" width={22} height={22} />
      </span>
    );
  }
  if (type === 'broker') {
    return (
      <span className={`${styles.icon} ${styles.iconBroker}`}>
        <img src={iconBrokerGroup} alt="" width={23.5} height={27.1644} />
      </span>
    );
  }
  if (type === 'updates') {
    return (
      <span className={styles.icon}>
        <img src={MENU_ICONS.updates} alt="" width={24} height={24} />
      </span>
    );
  }
  return <img className={styles.icon} src={MENU_ICONS[type]} alt="" width={28} height={28} />;
}

function Section({title, items, separator = imgDivider}) {
  const visible = items.filter(Boolean);
  return (
    <section className={styles.card}>
      {title ? <h2 className={styles.cardTitle}>{title}</h2> : null}
      <div className={styles.list}>
        {visible.map((item, i) => (
          <Fragment key={item.label}>
            {i > 0 ? <img className={styles.divider} src={separator} alt="" width={282} height={1} /> : null}
            <button type="button" className={styles.item} onClick={item.onPress}>
              <span className={styles.itemLabel}>
                <MenuIcon type={item.icon} />
                <span className={styles.itemText}>{item.label}</span>
              </span>
              {item.chevron === false ? null : (
                <img className={styles.chevron} src={imgChevron} alt="" width={11} height={16} />
              )}
            </button>
          </Fragment>
        ))}
      </div>
    </section>
  );
}

function PiChatButton({unreadChatCount, onPress}) {
  return (
    <button type="button" className={styles.chatBar} onClick={onPress}>
      <span className={styles.chatBarText}>הודעות</span>
      <span className={styles.piChat} aria-hidden>
        <img className={styles.piChatBubble} src={imgPiChatBubble} alt="" width={77} height={34.4138} />
        <img className={styles.piChatPlane} src={imgPiChatPlane} alt="" width={15.4} height={8.89443} />
        <img className={styles.piChatPi} src={imgPiChatPi} alt="" width={26.6994} height={18.1172} />
        <span className={styles.piChatText}>Chat</span>
      </span>
      {unreadChatCount > 0 ? (
        <span
          className={styles.chatBadge}
          role="status"
          aria-label={`הודעות חדשות: ${unreadChatCount > 99 ? 'יותר מ־99' : unreadChatCount}`}>
          {unreadChatCount > 99 ? '99+' : String(unreadChatCount)}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Web side drawer for the mobile SettingsScreen (Figma node 244:24762).
 * Every entry and visibility rule follows the mobile screen; handlers come from App like mobile App.js.
 */
export default function SideMenu({
  onClose,
  onOpenEditPublishAd,
  onOpenChat,
  onOpenSubscription,
  onLogout,
  onOpenLogin,
  onOpenSecretCodeRecovery,
  onOpenFavorites,
  onOpenFeedback,
  onOpenTermsOfUse,
  onOpenAccessibilityStatement,
  onOpenAccessibilityMenu,
  onOpenOwnProfile,
  onEditProfile,
  onOpenFollowHub,
  onOpenAgencyJoinCode,
  onOpenAgencyMembers,
  unreadChatCount = 0,
  termsOfUseUrl = LEGAL_DEFAULTS.termsOfUseUrl,
  accessibilityStatementUrl = LEGAL_DEFAULTS.accessibilityStatementUrl,
  supportEmail = LEGAL_DEFAULTS.supportEmail,
  transactionCancellationUrl = LEGAL_DEFAULTS.transactionCancellationUrl,
}) {
  const {currentUser, setCurrentUser} = useSession();
  const isLoggedBroker = currentUser?.subscription_type === subscriptionTypes.broker;
  const isLoggedProfessional = currentUser?.subscription_type === subscriptionTypes.professional;
  const isLoggedCompany = currentUser?.subscription_type === subscriptionTypes.company;
  const isLoggedProjectMarketer = currentUser?.subscription_type === subscriptionTypes.projectMarketer;
  const isMarketingManagerUser = isMarketingManager(currentUser);
  const [followingPreviewRows, setFollowingPreviewRows] = useState([]);
  const [followingPreviewLoading, setFollowingPreviewLoading] = useState(false);
  const [propertyAlertsOpen, setPropertyAlertsOpen] = useState(false);
  const viewerId = toSubscriptionId(currentUser?.id || currentUser?.subscription_id || currentUser?.owner_id);

  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'Escape') return;
      if (propertyAlertsOpen) {
        setPropertyAlertsOpen(false);
        return;
      }
      onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, propertyAlertsOpen]);

  // Refresh the subscription so profile_picture_url / company_logo_url are not stale vs storage.
  useEffect(() => {
    const email = currentUser?.email && String(currentUser.email).trim();
    if (!email) return undefined;
    let cancelled = false;
    getCurrentUser(email)
      .then(data => {
        if (cancelled || !data?.success || !data.subscription) return;
        const sub = data.subscription;
        setCurrentUser(prev => {
          if (!prev) return prev;
          const same =
            String(prev.email || '').trim().toLowerCase() === String(sub.email || '').trim().toLowerCase();
          return same ? {...prev, ...sub} : prev;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentUser?.email, setCurrentUser]);

  useEffect(() => {
    if (!viewerId) {
      setFollowingPreviewRows([]);
      setFollowingPreviewLoading(false);
      return undefined;
    }
    let cancelled = false;
    setFollowingPreviewLoading(true);
    getFollowHubRows({userId: viewerId, viewerId, tab: 'following', q: ''})
      .then(data => {
        if (!cancelled) setFollowingPreviewRows((data?.rows || []).slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setFollowingPreviewRows([]);
      })
      .finally(() => {
        if (!cancelled) setFollowingPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewerId]);

  const handleLogout = () => {
    setCurrentUser(null);
    onLogout?.();
  };

  const openContact = () => {
    const email = supportEmail && String(supportEmail).trim();
    if (!email) {
      showAlert('צור קשר', 'התוכן יהיה זמין בקרוב.');
      return;
    }
    window.location.href = `mailto:${email}`;
  };

  const displayName = currentUser ? resolveProfileDisplayName(currentUser) : '';
  const photoUrl = currentUser ? getUserProfileImageUrl(currentUser) : null;
  const companyLogoUrl = currentUser ? getUserCompanyLogoUrl(currentUser) : null;
  const subscriberNumber =
    currentUser &&
    currentUser.subscription_type !== subscriptionTypes.user &&
    currentUser.subscriber_number != null &&
    String(currentUser.subscriber_number).trim() !== ''
      ? String(currentUser.subscriber_number)
      : null;

  const adsItems = [
    {label: 'ערוך / פרסם', icon: 'edit', onPress: onOpenEditPublishAd},
    isLoggedBroker && {
      label: 'עדכון נכסים חדשים שעולים',
      icon: 'updates',
      onPress: () => setPropertyAlertsOpen(true),
    },
    isMarketingManagerUser && {label: 'צור קוד הצטרפות', icon: 'secret', onPress: () => onOpenAgencyJoinCode?.()},
    isMarketingManagerUser && {label: 'ניהול משווקים', icon: 'projectMarketer', onPress: () => onOpenAgencyMembers?.()},
    {label: 'מועדפים', icon: 'favorites', onPress: () => onOpenFavorites?.()},
  ];

  const subscriptionItems = [
    {label: 'מנוי לחברות', icon: 'company', onPress: () => onOpenSubscription?.(subscriptionTypes.company)},
    {label: 'מנוי למתווכים', icon: 'broker', onPress: () => onOpenSubscription?.(subscriptionTypes.broker)},
    {
      label: 'מנוי לבעלי מקצוע',
      icon: 'professional',
      onPress: () => onOpenSubscription?.(subscriptionTypes.professional),
    },
    {
      label: 'מנוי למשווקי פרויקטים',
      icon: 'projectMarketer',
      onPress: () => onOpenSubscription?.(subscriptionTypes.projectMarketer),
    },
  ];

  const isLoggedB2B = isLoggedBroker || isLoggedProfessional || isLoggedCompany || isLoggedProjectMarketer;
  const generalItems = [
    currentUser &&
      currentUser.email &&
      isLoggedB2B && {label: 'שכחתי סיסמה', icon: 'secret', onPress: () => onOpenSecretCodeRecovery?.()},
    {label: 'הצעות לשיפור', icon: 'feedback', onPress: () => onOpenFeedback?.()},
    {
      label: 'תנאי שימוש',
      icon: 'terms',
      onPress: () => {
        if (termsOfUseUrl && String(termsOfUseUrl).trim()) openUrlOrPlaceholder(termsOfUseUrl, 'תנאי שימוש');
        else if (onOpenTermsOfUse) onOpenTermsOfUse();
        else openUrlOrPlaceholder('', 'תנאי שימוש');
      },
    },
    {
      label: 'הצהרת נגישות',
      icon: 'accessibility',
      onPress: () => {
        if (accessibilityStatementUrl && String(accessibilityStatementUrl).trim()) {
          openUrlOrPlaceholder(accessibilityStatementUrl, 'הצהרת נגישות');
        } else if (onOpenAccessibilityStatement) onOpenAccessibilityStatement();
        else openUrlOrPlaceholder('', 'הצהרת נגישות');
      },
    },
    {label: 'צור קשר', icon: 'contact', onPress: openContact},
    {
      label: 'ביטול עסקה',
      icon: 'cancel',
      onPress: () => openUrlOrPlaceholder(transactionCancellationUrl, 'ביטול עסקה'),
    },
    currentUser
      ? {label: 'התנתק', icon: 'logout', onPress: handleLogout, chevron: false}
      : {label: 'התחבר', icon: 'secret', onPress: onOpenLogin},
  ];

  return (
    <div className={styles.root}>
      <button type="button" className={styles.backdrop} aria-label="סגירת התפריט" tabIndex={-1} onClick={onClose} />
      <aside className={styles.panel} role="dialog" aria-modal="true" aria-label="תפריט">
        <header className={styles.header}>
          <button type="button" className={styles.closeButton} aria-label="סגירה" onClick={onClose}>
            <img src={imgClose} alt="" width={24} height={24} />
          </button>
          <div className={styles.logoSection}>
            <img src={logo} alt="Pi 2701" width={82} height={78} />
            <img src={slogan} alt="It’s Just Simple!" width={135} height={17} />
          </div>
        </header>

        {currentUser ? (
          <div className={styles.profileCard}>
            <div className={styles.profileRow}>
              <button
                type="button"
                className={styles.profileAvatarButton}
                aria-label="הפרופיל שלי"
                onClick={() => onOpenOwnProfile?.()}>
                <ProfileAvatar
                  uri={photoUrl}
                  fallbackUri={companyLogoUrl}
                  size={82}
                  subscriptionType={currentUser}
                />
              </button>
              <div className={styles.profileInfo}>
                <p className={styles.profileName}>{displayName}</p>
                {currentUser.email ? <p className={styles.profileEmail}>{currentUser.email}</p> : null}
              </div>
              <button
                type="button"
                className={styles.editIconButton}
                aria-label="עריכת פרופיל"
                onClick={() => onEditProfile?.()}>
                <img className={styles.profileEditIcon} src={pencilIcon} alt="" width={26.667} height={26.667} />
              </button>
            </div>
            {subscriberNumber ? (
              <>
                <div className={styles.profileDivider} />
                <div className={styles.profileBottom}>
                  <span>מספר מנוי</span>
                  <span>{subscriberNumber}</span>
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        <PiChatButton unreadChatCount={unreadChatCount} onPress={onOpenChat} />

        {currentUser && viewerId ? (
          <button type="button" className={styles.followingPreview} onClick={() => onOpenFollowHub?.('following')}>
            <span className={styles.followingTitle}>במעקב</span>
            <span className={styles.followingAvatars}>
              {followingPreviewLoading ? (
                <span className={styles.followingHint}>...</span>
              ) : followingPreviewRows.length === 0 ? (
                <span className={styles.followingHint}>אין עדיין מעקבים</span>
              ) : (
                followingPreviewRows.map((row, idx) => (
                  <span key={row?.id || row?.subscription_id || `following-preview-${idx}`} className={styles.followingAvatar}>
                    <img
                      src={
                        row?.image_url ||
                        getUserProfileImageUrl(row) ||
                        row?.profile_image_url ||
                        row?.profile_picture_url ||
                        DEFAULT_PI_PROFILE_AVATAR
                      }
                      alt=""
                      onError={e => {
                        if (e.currentTarget.src !== DEFAULT_PI_PROFILE_AVATAR) e.currentTarget.src = DEFAULT_PI_PROFILE_AVATAR;
                      }}
                    />
                  </span>
                ))
              )}
            </span>
          </button>
        ) : null}

        <div className={styles.sections}>
          <Section title="ניהול המודעות" items={adsItems} separator={imgLine} />
          {!currentUser ? <Section title="מנויים" items={subscriptionItems} /> : null}
          <Section title="כללי" items={generalItems} />
          <Section
            items={[
              {
                label: 'נגישות',
                icon: 'accessibility',
                onPress: () =>
                  onOpenAccessibilityMenu ? onOpenAccessibilityMenu() : onOpenAccessibilityStatement?.(),
              },
            ]}
          />
        </div>
      </aside>
      {propertyAlertsOpen && viewerId ? (
        <PropertyAlertsDialog
          subscriptionId={viewerId}
          email={currentUser?.email || ''}
          onClose={() => setPropertyAlertsOpen(false)}
        />
      ) : null}
    </div>
  );
}
