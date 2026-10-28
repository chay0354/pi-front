import {useEffect, useRef} from 'react';
import {
  mdiAccountMultipleOutline,
  mdiAccountTieOutline,
  mdiHomeOutline,
  mdiMagnify,
  mdiOfficeBuildingOutline,
  mdiSend,
  mdiStarFourPoints,
} from '@mdi/js';
import iconClose from '../assets/figma/filter-panel/close.svg';
import imgPiAiLogo from '../assets/figma/home/23cb0.svg';
import {parsePiAiQuery} from '../feed/piAiMatchListings';
import {buildProfessionalReply} from '../feed/usePiAiProfessionals';
import MdiIcon from '../publish/MdiIcon';
import styles from './PiAiPanel.module.css';

const SUGGESTIONS = [
  {
    id: 'rent',
    title: 'דירה',
    detail: 'לחפש לי דירה להשכרה באזור המרכז',
    query: 'דירה להשכרה',
    icon: mdiHomeOutline,
  },
  {
    id: 'search',
    title: 'חיפוש',
    detail: 'לחפש דירה באזור המרכז',
    query: 'דירה',
    icon: mdiMagnify,
  },
  {
    id: 'partners',
    title: 'דירת שותפים',
    detail: 'לחפש לי דירת שותפים באזור המרכז',
    query: 'דירת שותפים',
    icon: mdiAccountMultipleOutline,
  },
  {
    id: 'pro',
    title: 'בעל מקצוע',
    detail: 'לחפש לי עורך דין המתמחה בתחום הנדל״ן',
    query: 'אני מחפש בעל מקצוע בתחום הנדל״ן כמו עורך דין המתמחה בנדל״ן',
    icon: mdiAccountTieOutline,
  },
  {
    id: 'office',
    title: 'משרד להשכרה',
    detail: 'לחפש לי משרד להשכרה באזור המרכז',
    query: 'משרד להשכרה',
    icon: mdiOfficeBuildingOutline,
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

function Composer({draft, setDraft, onSubmit, disabled, inputRef}) {
  return (
    <form
      className={styles.composer}
      onSubmit={event => {
        event.preventDefault();
        onSubmit();
      }}>
      <input
        ref={inputRef}
        className={styles.composerInput}
        value={draft}
        placeholder="הקלידו לכאן ונתחיל"
        aria-label="הקלידו לכאן ונתחיל"
        disabled={disabled}
        onChange={event => setDraft(event.target.value)}
      />
      <button type="submit" className={styles.composerSend} aria-label="שלח" disabled={disabled || !draft.trim()}>
        <MdiIcon path={mdiSend} size={22} color="#FFC40A" />
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
  const searched = Boolean(query);
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

  const submit = (value = draft) => {
    const next = String(value || '').trim();
    if (!next || loading) return;
    setDraft(next);
    onSearch(next);
  };

  const reply =
    search.status === 'ready' || search.status === 'error'
      ? buildReply(query, resultCount, search.message, kind)
      : search.message;

  return (
    <section className={styles.panel} role="dialog" aria-label="Pi AI">
      <header className={styles.header}>
        <img src={imgPiAiLogo} alt="Pi AI" width={87} height={35} />
        <button type="button" className={styles.close} aria-label="סגור" onClick={onClose}>
          <img src={iconClose} alt="" />
        </button>
      </header>

      <p className={styles.heading} dir="auto">
        הצעות לחיפוש עם PiAi
      </p>

      <div className={styles.body}>
        {!searched ? (
          <div className={styles.suggestions}>
            {SUGGESTIONS.map(item => (
              <button key={item.id} type="button" className={styles.suggestion} onClick={() => submit(item.query)}>
                <span className={styles.suggestionIcon} aria-hidden>
                  <MdiIcon path={item.icon} size={26} color="#FFC40A" />
                </span>
                <span className={styles.suggestionText}>
                  <span className={styles.suggestionTitle}>{item.title}</span>
                  <span className={styles.suggestionDetail}>{item.detail}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.thread}>
            <div className={styles.userTurn}>
              <p className={styles.turnText} dir="auto">
                {query}
              </p>
              <span className={styles.turnIcon} aria-hidden>
                <MdiIcon path={mdiSend} size={18} color="#FFC40A" />
              </span>
            </div>
            <div className={styles.aiTurn} aria-busy={loading}>
              <span className={styles.turnIcon} aria-hidden>
                <MdiIcon path={mdiStarFourPoints} size={20} color="#FFC40A" />
              </span>
              {loading ? (
                <p className={styles.turnText} dir="auto">
                  {reply || 'מחפש עבורך…'}
                </p>
              ) : (
                <p className={styles.turnText} dir="auto">
                  {reply}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <Composer draft={draft} setDraft={setDraft} onSubmit={() => submit()} disabled={loading} inputRef={inputRef} />
    </section>
  );
}

export function PiAiQueryBar({query}) {
  if (!query) return null;
  return (
    <div className={styles.queryBar} dir="auto">
      {query}
    </div>
  );
}
