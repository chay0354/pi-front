import {useCallback, useEffect, useState} from 'react';
import {mdiCheck, mdiChevronLeft, mdiContentCopy} from '@mdi/js';
import MdiIcon from '../publish/MdiIcon';
import {createAgencyMemberReplacementCode, getAgencyMembers} from '../api/client';
import {getUserProfileImageUrl} from './lib/userProfileImage';
import {ProfileAvatar} from './ProfileParts';
import {agencyMemberDisplayName, safeAgencyDisplayText} from './lib/agencyMemberDisplay';
import AgencyMemberListingsScreen from './AgencyMemberListingsScreen';
import styles from './AgencyMembersScreen.module.css';

export default function AgencyMembersScreen({
  currentUser,
  onClose,
  onViewListing,
  onEditListing,
  onEditPost,
  refreshKey = 0,
}) {
  const [members, setMembers] = useState([]);
  const [seatLimit, setSeatLimit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openMember, setOpenMember] = useState(null);
  const [replacementMember, setReplacementMember] = useState(null);
  const [replacementCode, setReplacementCode] = useState('');
  const [replacementExpiresAt, setReplacementExpiresAt] = useState(null);
  const [replacementLoading, setReplacementLoading] = useState(false);
  const [replacementError, setReplacementError] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!currentUser) return;
    setError(null);
    try {
      const res = await getAgencyMembers(currentUser);
      setMembers(Array.isArray(res?.members) ? res.members : []);
      setSeatLimit(res?.seatLimit ?? null);
    } catch (e) {
      setError(e?.message || 'טעינת המשווקים נכשלה');
    }
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const closeReplacementModal = () => {
    if (replacementLoading) return;
    setReplacementMember(null);
    setReplacementCode('');
    setReplacementExpiresAt(null);
    setReplacementError(null);
    setCopied(false);
  };

  const openReplacementCode = async member => {
    if (!member?.id || replacementLoading) return;
    setReplacementMember(member);
    setReplacementCode('');
    setReplacementExpiresAt(null);
    setReplacementError(null);
    setCopied(false);
    setReplacementLoading(true);
    try {
      const res = await createAgencyMemberReplacementCode(currentUser, member.id);
      setReplacementCode(String(res?.code || ''));
      setReplacementExpiresAt(res?.expires_at || null);
    } catch (e) {
      setReplacementError(e?.message || 'יצירת קוד ההחלפה נכשלה');
    } finally {
      setReplacementLoading(false);
    }
  };

  const copyReplacementCode = async () => {
    if (!replacementCode) return;
    try {
      await navigator.clipboard.writeText(replacementCode);
      setCopied(true);
    } catch {
      window.alert('לא ניתן להעתיק את הקוד');
    }
  };

  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'Escape') return;
      if (replacementMember) {
        e.stopPropagation();
        closeReplacementModal();
        return;
      }
      if (openMember || document.querySelector('[data-account-modal]')) return;
      e.stopPropagation();
      onClose?.();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose, replacementMember, replacementLoading, openMember]);

  if (openMember) {
    return (
      <AgencyMemberListingsScreen
        member={openMember}
        currentUser={currentUser}
        refreshKey={refreshKey}
        onClose={() => setOpenMember(null)}
        onViewListing={onViewListing}
        onEditListing={onEditListing}
        onEditPost={onEditPost}
      />
    );
  }

  const seats = Number(seatLimit);

  return (
    <div className={styles.screen} dir="rtl">
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={onClose} aria-label="חזור">
          <MdiIcon path={mdiChevronLeft} size={34} color="#fff" />
        </button>
        <h1>ניהול משווקים</h1>
        <span className={styles.backBtn} />
      </header>
      {loading ? (
        <p className={styles.center}>טוען...</p>
      ) : (
        <div className={styles.list}>
          {Number.isFinite(seats) && seats > 0 ? (
            <p className={styles.seats}>
              {members.length} מתוך {seats} משתמשים
            </p>
          ) : null}
          {error ? <p className={styles.error}>{error}</p> : null}
          {!error && members.length === 0 ? (
            <p className={styles.empty}>עדיין אין משווקים בסוכנות. צרו קוד הצטרפות ושתפו אותו עם הצוות.</p>
          ) : null}
          {members.map(member => {
            const name = agencyMemberDisplayName(member);
            return (
              <div key={member.id} className={styles.row}>
                <button type="button" className={styles.rowMain} onClick={() => setOpenMember(member)}>
                  <ProfileAvatar uri={getUserProfileImageUrl(member) || undefined} size={60} subscriptionType={member?.subscription_type} />
                  <span className={styles.texts}>
                    <span className={styles.name}>{name}</span>
                    <span className={styles.email}>{safeAgencyDisplayText(member?.email)}</span>
                  </span>
                </button>
                <button type="button" className={styles.replace} aria-label={`החלף את ${name}`} onClick={() => openReplacementCode(member)}>
                  החלף
                </button>
                <button type="button" className={styles.chevron} aria-label={name} onClick={() => setOpenMember(member)}>
                  <MdiIcon path={mdiChevronLeft} size={28} color="rgba(255,255,255,0.5)" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {replacementMember ? (
        <div className={styles.overlay} data-account-modal="" onClick={closeReplacementModal}>
          <div className={styles.card} role="dialog" onClick={e => e.stopPropagation()}>
            <h2>החלפת משווק</h2>
            <p className={styles.memberGold}>{agencyMemberDisplayName(replacementMember)}</p>
            {replacementLoading ? (
              <p className={styles.center}>טוען...</p>
            ) : replacementError ? (
              <>
                <p className={styles.error}>{replacementError}</p>
                <button type="button" className={styles.retry} onClick={() => openReplacementCode(replacementMember)}>
                  נסה שוב
                </button>
              </>
            ) : (
              <>
                <p className={styles.explain}>
                  מסרו את הקוד למשווק החדש. הוא יזין אותו במסך ההצטרפות לסוכנות. הקוד חד־פעמי ותקף ל־24 שעות.
                </p>
                <p className={styles.code}>{replacementCode}</p>
                <button type="button" className={styles.copy} onClick={copyReplacementCode}>
                  <MdiIcon path={copied ? mdiCheck : mdiContentCopy} size={22} color="#1E1D27" />
                  {copied ? 'הקוד הועתק' : 'העתק קוד'}
                </button>
                <p className={styles.warning}>
                  לאחר השימוש בקוד, הכניסה של המשווק הקודם תבוטל. המודעות, הפוסטים, הסיפורים והשיחות יישארו בחשבון ויעברו למשווק החדש.
                </p>
                {replacementExpiresAt ? <p className={styles.expiry}>תוקף: 24 שעות</p> : null}
              </>
            )}
            <button type="button" className={styles.close} disabled={replacementLoading} onClick={closeReplacementModal}>
              סגור
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
