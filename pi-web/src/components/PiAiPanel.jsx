import {useEffect, useMemo, useState} from 'react';
import iconClose from '../assets/figma/filter-panel/close.svg';
import divider from '../assets/figma/filter-panel/divider.svg';
import imgPiAiLogo from '../assets/figma/home/23cb0.svg';
import {isFeedPost, toFeedItem} from '../feed/listingRules';
import {usePiAiSearch} from '../feed/usePiAiSearch';
import {useProfileNav} from '../profile/navigation';
import GridCard from './GridCard';
import popup from './FilterPopup.module.css';
import styles from './PiAiPanel.module.css';

/** Mobile formatResultsCountHe. */
function resultsCount(n) {
  if (n === 1) return 'נמצאה תוצאה אחת';
  return `נמצאו ${n} תוצאות`;
}

/**
 * Mobile PiAiSearchModal as the docked left panel of the filter sheets: describe what you
 * want, Pi AI ranks the whole catalog, and the matching ads are listed right in the panel.
 */
export default function PiAiPanel({onClose}) {
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const search = usePiAiSearch(query);
  const loading = search.status === 'loading';
  const items = useMemo(() => search.rows.filter(row => !isFeedPost(row)).map(toFeedItem), [search.rows]);
  const nav = useProfileNav();

  useEffect(() => {
    if (!nav.active) return undefined;
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, nav.active]);

  const submit = () => {
    if (loading) return;
    setQuery(draft.trim());
  };

  return (
    <>
      <div className={popup.backdrop} onClick={onClose} aria-hidden />
      <section className={popup.popup} role="dialog" aria-label="Pi AI">
        <header className={popup.header}>
          <span className={popup.headerSpacer} aria-hidden />
          <img src={imgPiAiLogo} alt="Pi AI" width={87} height={35} />
          <button type="button" className={popup.close} aria-label="סגור" onClick={onClose}>
            <img src={iconClose} alt="" />
          </button>
        </header>
        <div className={popup.slot}>
          <div className={popup.topDivider} aria-hidden>
            <img src={divider} alt="" />
          </div>
          <input
            className={popup.text}
            value={draft}
            placeholder="תמצא לי דירה,משרד,צימר,שותף"
            aria-label="מה לחפש?"
            autoFocus
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
          <div className={`${popup.body} ${styles.body}`} aria-busy={loading}>

            {search.status === 'idle' && (
              <div className={styles.welcome}>
                <p className={styles.welcomeTitle} dir="auto">
                  תארו מה אתם מחפשים
                </p>
                <p className={styles.welcomeExample} dir="auto">
                  דירת 3 חדרים בתל אביב להשכרה עם נוף לים…
                </p>
              </div>
            )}

            {loading && (
              <div className={popup.loading} role="status">
                <span className={popup.spinner} aria-hidden />
                <span className={popup.loadingText} dir="auto">
                  {search.message || 'מחפש...'}
                </span>
              </div>
            )}

            {(search.status === 'ready' || search.status === 'error') && (
              <>
                {search.status === 'ready' && (
                  <p className={styles.count} dir="auto">
                    {resultsCount(items.length)}
                  </p>
                )}
                {search.message && (
                  <p className={styles.hint} dir="auto">
                    {search.message}
                  </p>
                )}
                {items.map(item => (
                  <GridCard
                    key={item.id}
                    item={item}
                    className={styles.card}
                    onOpen={() => nav.open(item.raw)}
                  />
                ))}
              </>
            )}
          </div>
        </div>
        <footer className={popup.footer}>
          <button type="button" className={popup.save} onClick={submit} disabled={loading}>
            {loading ? 'מחפש...' : 'חפש'}
          </button>
          <button
            type="button"
            className={popup.clear}
            disabled={loading}
            onClick={() => {
              setDraft('');
              setQuery('');
            }}>
            נקה
          </button>
        </footer>
      </section>
    </>
  );
}
