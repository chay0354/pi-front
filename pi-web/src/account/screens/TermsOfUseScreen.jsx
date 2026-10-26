import {useRef, useState} from 'react';
import {Icon} from '../AccountUi';
import {TERMS_OF_USE_HEBREW} from '../termsOfUseContent';
import styles from './TermsOfUseScreen.module.css';

const PRIVACY_LINK_TEXT = 'מדיניות הפרטיות של החברה';
/** Heading of the privacy section inside the terms body (original spelling). */
const PRIVACY_SECTION_HEADING = 'שימוש החברה במידע ומדינות הפרטיות';
const TERMS_ACCEPTED_KEY = 'pi_terms_accepted';

function buildTermsSegments() {
  const text = TERMS_OF_USE_HEBREW;
  const sectionIdx = text.indexOf(PRIVACY_SECTION_HEADING);
  const head = sectionIdx >= 0 ? text.slice(0, sectionIdx) : text;
  const privacySection = sectionIdx >= 0 ? text.slice(sectionIdx) : '';
  const linkIdx = head.indexOf(PRIVACY_LINK_TEXT);
  if (linkIdx < 0) return {beforeLink: head, link: '', afterLink: '', privacySection};
  return {
    beforeLink: head.slice(0, linkIdx),
    link: PRIVACY_LINK_TEXT,
    afterLink: head.slice(linkIdx + PRIVACY_LINK_TEXT.length),
    privacySection,
  };
}

const TERMS_SEGMENTS = buildTermsSegments();

const readAccepted = () => {
  try {
    return window.localStorage.getItem(TERMS_ACCEPTED_KEY) === '1';
  } catch {
    return false;
  }
};

/** תנאי שימוש — black on white; the footer gate needs the checkbox before סגור. */
export default function TermsOfUseScreen({onClose}) {
  const [agreed, setAgreed] = useState(readAccepted);
  const scrollRef = useRef(null);
  const privacyRef = useRef(null);

  const scrollToPrivacy = () => {
    const scroller = scrollRef.current;
    const target = privacyRef.current;
    if (!scroller || !target) return;
    scroller.scrollTo({top: Math.max(target.offsetTop - 24, 0), behavior: 'smooth'});
  };

  const handleAccept = () => {
    if (!agreed) return;
    try {
      window.localStorage.setItem(TERMS_ACCEPTED_KEY, '1');
    } catch {
      /* storage unavailable */
    }
    onClose?.();
  };

  return (
    <div className={styles.root}>
      <div ref={scrollRef} className={styles.scroll}>
        <article className={styles.doc}>
          <h1 className={styles.title}>תנאי שימוש — פאי 2701</h1>
          <p className={styles.body}>
            {TERMS_SEGMENTS.beforeLink}
            {TERMS_SEGMENTS.link ? (
              <button type="button" className={styles.link} onClick={scrollToPrivacy}>
                {TERMS_SEGMENTS.link}
              </button>
            ) : null}
            {TERMS_SEGMENTS.afterLink}
          </p>
          {TERMS_SEGMENTS.privacySection ? (
            <p ref={privacyRef} className={styles.body}>
              {TERMS_SEGMENTS.privacySection}
            </p>
          ) : null}
        </article>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <button type="button" role="checkbox" aria-checked={agreed} className={styles.checkRow} onClick={() => setAgreed(v => !v)}>
            <span className={`${styles.checkbox} ${agreed ? styles.checkboxOn : ''}`}>
              {agreed ? <Icon name="check" size={16} color="#1E1D27" /> : null}
            </span>
            <span className={styles.checkLabel}>אני מסכים לתנאי השימוש ולמדיניות הפרטיות</span>
          </button>
          <button type="button" className={styles.cta} disabled={!agreed} onClick={handleAccept}>
            סגור
          </button>
        </div>
      </footer>
    </div>
  );
}
