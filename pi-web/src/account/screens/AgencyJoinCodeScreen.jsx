import {useCallback, useEffect, useState} from 'react';
import {createAgencyJoinCode, getAgencyJoinCode} from '../../api/client';
import {AccountScreen, Icon, Spinner, accountStyles as ui} from '../AccountUi';
import styles from './AgencyScreens.module.css';

/** צור קוד הצטרפות — a marketing manager issues an invite code for the team. */
export default function AgencyJoinCodeScreen({currentUser, onClose}) {
  const [code, setCode] = useState(null);
  const [seatLimit, setSeatLimit] = useState(null);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const applyResult = useCallback(res => {
    setCode(res?.code || null);
    setSeatLimit(res?.seatLimit ?? null);
    setMemberCount(res?.memberCount ?? 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getAgencyJoinCode(currentUser);
        if (!cancelled) applyResult(res);
      } catch (e) {
        if (!cancelled) setError(e?.message || 'טעינת הקוד נכשלה');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser, applyResult]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    setCopied(false);
    try {
      applyResult(await createAgencyJoinCode(currentUser));
    } catch (e) {
      setError(e?.message || 'יצירת הקוד נכשלה');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      /* clipboard blocked */
    }
  };

  const handleShare = async () => {
    if (!code) return;
    const message = `קוד ההצטרפות לסוכנות שלי בפאי 2701: ${code}`;
    if (navigator.share) {
      try {
        await navigator.share({text: message});
      } catch {
        /* share sheet dismissed */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      /* clipboard blocked */
    }
  };

  const seatsFull = seatLimit != null && memberCount >= seatLimit;

  return (
    <AccountScreen title="קוד הצטרפות" onBack={onClose} width={480}>
      <p className={styles.lead}>
        שתפו את הקוד עם המשווקים שלכם. בהרשמה הם יבחרו "הצטרף לסוכנות קיימת" ויזינו שם משתמש, סיסמה והקוד הזה.
      </p>

      {seatLimit ? (
        <p className={styles.seats}>
          {memberCount} מתוך {seatLimit} משתמשים בסוכנות
        </p>
      ) : null}

      {loading ? (
        <div className={styles.loader}>
          <Spinner />
        </div>
      ) : (
        <>
          <div className={styles.codeBox} dir="ltr">
            {code || '— — — —'}
          </div>

          {code ? (
            <div className={styles.codeActions}>
              <button type="button" className={`${ui.secondaryBtn} ${styles.secondary}`} onClick={handleCopy}>
                <Icon name={copied ? 'check' : 'copy'} size={20} />
                {copied ? 'הועתק' : 'העתק'}
              </button>
              <button type="button" className={`${ui.secondaryBtn} ${styles.secondary}`} onClick={handleShare}>
                <Icon name="share" size={20} />
                שתף
              </button>
            </div>
          ) : null}

          {seatsFull ? <p className={styles.warning}>הסוכנות מלאה — לא ניתן לצרף משווקים נוספים.</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}

          <button type="button" className={styles.primary} disabled={creating} onClick={handleCreate}>
            {creating ? <Spinner dark /> : code ? 'צור קוד חדש' : 'צור קוד הצטרפות'}
          </button>

          {code ? <p className={styles.note}>יצירת קוד חדש מבטלת את הקוד הקודם.</p> : null}
        </>
      )}
    </AccountScreen>
  );
}
