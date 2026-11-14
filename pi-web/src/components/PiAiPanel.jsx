import {useEffect, useRef, useState} from 'react';
import imgPiAiLogo from '../assets/figma/home/23cb0.svg';
import iconClose from '../assets/figma/piai/close.svg';
import iconLine from '../assets/figma/piai/line.svg';
import iconSend from '../assets/figma/piai/send.svg';
import iconApartment from '../assets/figma/piai/apartment.svg';
import iconVacation from '../assets/figma/piai/vacation.svg';
import iconPartners from '../assets/figma/piai/partners.svg';
import iconProfessional from '../assets/figma/piai/professional.svg';
import iconOffice from '../assets/figma/piai/office.svg';
import {useSession} from '../auth/session';
import {parsePiAiQuery} from '../feed/piAiMatchListings';
import {buildProfessionalReply} from '../feed/usePiAiProfessionals';
import {resolveProfileDisplayName} from '../profile/lib/profileFields';
import {getUserProfilePhotoUrl} from '../profile/lib/userProfileImage';
import {GuestAvatar, PiAvatar} from './figma/piAiChatAvatar';
import styles from './PiAiPanel.module.css';

const SUGGESTIONS = [
  {
    id: 'rent',
    title: 'דירה',
    detail: 'חפש לי דירה להשכרה באזור המרכז',
    query: 'דירה להשכרה באזור המרכז',
    icon: iconApartment,
  },
  {
    id: 'vacation',
    title: 'חופשה',
    detail: 'חפשה לי חופשה בצימר לסופ״ש הקרוב',
    query: 'חופשה בצימר',
    icon: iconVacation,
  },
  {
    id: 'partners',
    title: 'דירת שותפים',
    detail: 'חפש לי חדר פנוי בדירת שותפים באזור המרכז',
    query: 'דירת שותפים באזור המרכז',
    icon: iconPartners,
  },
  {
    id: 'pro',
    title: 'בעל מקצוע',
    detail: 'חפש לי עורך דין המתמחה בתחום הנדל״ן',
    query: 'אני מחפש בעל מקצוע בתחום הנדל״ן כמו עורך דין המתמחה בנדל״ן',
    icon: iconProfessional,
  },
  {
    id: 'office',
    title: 'משרד להשכרה',
    detail: 'חפש לי משרד להשכרה באזור המרכז',
    query: 'משרד להשכרה באזור המרכז',
    icon: iconOffice,
  },
];

function buildReply(query, count, fallback, kind) {
  if (kind === 'professionals') return fallback || buildProfessionalReply(query, count);
  if (fallback) return fallback;
  const parsed = parsePiAiQuery(query);
  const bits = [];
  if (parsed?.purpose === 'rent') bits.push('להשכרה');
  if (parsed?.purpose === 'sale') bits.push('למכירה');
  if (parsed?.city) bits.push(`ב${parsed.city}`);
  const extra = bits.join(' ');
  if (count === 0) return extra ? `לא מצאתי מודעות ${extra} שמתאימות. נסו לנסח אחרת.` : 'לא מצאתי התאמות. נסו לנסח אחרת.';
  if (count === 1) return extra ? `מצאתי מודעה אחת ${extra} שעשויה להתאים.` : 'מצאתי מודעה אחת שעשויה להתאים.';
  return extra ? `מצאתי לך ${count} מודעות ${extra} שעשויות להתאים.` : `מצאתי לך ${count} מודעות שעשויות להתאים.`;
}

function profileInitials(user) {
  const personal = String(user?.name || user?.contact_person_name || '').trim();
  const name = personal || resolveProfileDisplayName(user, {fallback: ''}).trim();
  const parts = name.split(/\s+/).filter(part => /[\p{L}]/u.test(part));
  const letter = part => part.match(/[\p{L}]/u)?.[0] || '';
  if (parts.length >= 2) return `${letter(parts[0])}${letter(parts[parts.length - 1])}`;
  if (parts.length === 1) return letter(parts[0]);
  return '';
}

function UserAvatar({user, photoUrl}) {
  if (!user) return <GuestAvatar />;
  if (photoUrl) {
    return (
      <span className={styles.userAvatar}>
        <img src={photoUrl} alt="" />
      </span>
    );
  }
  const initials = profileInitials(user);
  if (!initials) return <GuestAvatar />;
  return (
    <span className={styles.initialsAvatar} aria-hidden="true">
      <span>{initials}</span>
    </span>
  );
}

function clockNow() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function Composer({draft, setDraft, onSubmit, disabled, inputRef, hint}) {
  return (
    <form
      className={styles.composer}
      onSubmit={event => {
        event.preventDefault();
        onSubmit();
      }}>
      <input
        ref={inputRef}
        className={hint ? `${styles.composerInput} ${styles.composerHint}` : styles.composerInput}
        value={draft}
        placeholder={hint ? 'הינט לפני הקלדה' : 'אני מחפש דירה להשכרה'}
        aria-label={hint ? 'הינט לפני הקלדה' : 'אני מחפש דירה להשכרה'}
        disabled={disabled}
        onChange={event => setDraft(event.target.value)}
      />
      <button type="submit" className={styles.composerSend} aria-label="שלח" disabled={disabled || !draft.trim()}>
        <img src={iconSend} alt="" width={28} height={28} />
      </button>
    </form>
  );
}

/**
 * Left Pi AI sheet. On home it shows search suggestions over the page;
 * after a query it becomes the conversation next to the results grid.
 */
export default function PiAiPanel({draft, setDraft, query, search, resultCount = 0, kind = 'listings', onSearch, onClose}) {
  const inputRef = useRef(null);
  const bodyRef = useRef(null);
  const {currentUser} = useSession();
  const photoUrl = getUserProfilePhotoUrl(currentUser);
  const [turns, setTurns] = useState([]);
  const searched = turns.length > 0;
  const loading = search.status === 'loading';

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!query || search.query !== query || search.status === 'idle') return;
    const reply =
      search.status === 'ready' || search.status === 'error'
        ? buildReply(query, resultCount, search.message, kind)
        : search.message || 'מחפש עבורך…';
    const pending = search.status === 'loading';
    setTurns(prev => {
      const index = prev.findLastIndex(turn => turn.query === query && turn.pending);
      const target = index >= 0 ? index : prev.length - 1;
      const turn = prev[target];
      if (!turn || turn.query !== query || (turn.reply === reply && turn.pending === pending)) return prev;
      const next = prev.slice();
      next[target] = {...turn, reply, pending};
      return next;
    });
  }, [query, search.query, search.status, search.message, resultCount, kind]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);

  const submit = (value = draft) => {
    const next = String(value || '').trim();
    if (!next || loading) return;
    setTurns(prev => [...prev, {id: Date.now(), query: next, sentAt: clockNow(), reply: 'מחפש עבורך…', pending: true}]);
    setDraft('');
    onSearch(next);
  };

  return (
    <section className={styles.panel} role="dialog" aria-label="Pi AI">
      <div className={styles.stack}>
      <header className={styles.header}>
        <span className={styles.headerSpacer} aria-hidden />
        <img src={imgPiAiLogo} alt="Pi AI" width={87} height={35} />
        <button type="button" className={styles.close} aria-label="סגור" onClick={onClose}>
          <img src={iconClose} alt="" width={24} height={24} />
        </button>
      </header>
      <img className={styles.line} src={iconLine} alt="" width={437} height={1} />
      {!searched ? (
        <p className={styles.heading} dir="auto">
          הצעות לחיפוש עם פאי Ai
        </p>
      ) : null}

      <div className={styles.body} ref={bodyRef}>
        {!searched ? (
          <div className={styles.suggestions}>
            {SUGGESTIONS.map(item => (
              <button key={item.id} type="button" className={styles.suggestion} onClick={() => submit(item.query)}>
                <span className={styles.suggestionText}>
                  <span className={styles.suggestionTitle}>{item.title}</span>
                  <span className={styles.suggestionDetail}>{item.detail}</span>
                </span>
                <img src={item.icon} alt="" width={40} height={40} />
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.thread}>
            {turns.map(turn => (
              <div key={turn.id} className={styles.turn}>
                <div className={styles.userRow}>
                  <div className={styles.userBubble}>
                    <p className={styles.bubbleText} dir="auto">
                      {turn.query}
                    </p>
                    <time className={styles.userTime} dateTime={turn.sentAt}>{turn.sentAt}</time>
                  </div>
                  <UserAvatar user={currentUser} photoUrl={photoUrl} />
                </div>
                <div className={styles.aiRow} aria-busy={turn.pending}>
                  <div className={styles.aiBubble}>
                    <p className={styles.bubbleText} dir="auto">
                      {turn.reply}
                    </p>
                    <time className={styles.aiTime} dateTime={turn.sentAt}>{turn.sentAt}</time>
                  </div>
                  <span className={styles.aiAvatarPad}>
                    <PiAvatar />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      <Composer draft={draft} setDraft={setDraft} onSubmit={() => submit()} disabled={loading} inputRef={inputRef} hint={searched} />
    </section>
  );
}

