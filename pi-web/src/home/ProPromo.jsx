import {useEffect, useRef, useState} from 'react';
import {mdiClipboardSearch, mdiHandshake, mdiScaleBalance, mdiSofa} from '@mdi/js';
import {MortgageIcon} from '../components/figma/home.generated';
import MdiIcon from '../publish/MdiIcon';
import {isReduceMotion} from '../a11y/prefs';
import imgMortgageGlass from '../assets/figma/home/f4405.svg';
import styles from '../screens/HomeScreen.module.css';

const ROTATE_MS = 4000;
const FADE_MS = 280;

function GlyphIcon({path}) {
  return (
    <span className={styles.promoIcon} aria-hidden>
      <span className={styles.promoDisc} />
      <img className={styles.promoGlass} src={imgMortgageGlass} alt="" />
      <MdiIcon path={path} size={52} color="#FFC40A" className={styles.promoGlyph} />
    </span>
  );
}

const SLIDES = [
  {type: 'יועץ משכנתאות', question: 'מחפשים יועצי משכנתאות?', Icon: MortgageIcon},
  {type: 'מלווה משקיעים', question: 'מחפשים מלווים למשקיעים?', Icon: () => <GlyphIcon path={mdiHandshake} />},
  {type: 'עורך דין', question: 'מחפשים עורכי דין?', Icon: () => <GlyphIcon path={mdiScaleBalance} />},
  {type: 'שמאות', question: 'מחפשים שמאים?', Icon: () => <GlyphIcon path={mdiClipboardSearch} />},
  {type: 'עיצוב פנים', question: 'מחפשים מעצבי פנים?', Icon: () => <GlyphIcon path={mdiSofa} />},
];

/** Cycles five professional types; click opens the directory filtered to the one on screen. */
export default function ProPromo({onOpen}) {
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const paused = useRef(false);

  useEffect(() => {
    const tick = () => {
      if (paused.current) return;
      if (isReduceMotion()) {
        setIndex(i => (i + 1) % SLIDES.length);
        return;
      }
      setFading(true);
      window.setTimeout(() => {
        setIndex(i => (i + 1) % SLIDES.length);
        setFading(false);
      }, FADE_MS);
    };
    const id = window.setInterval(tick, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  const slide = SLIDES[index];
  const Icon = slide.Icon;

  return (
    <button
      type="button"
      className={styles.mortgage}
      aria-label={slide.question}
      onMouseEnter={() => {
        paused.current = true;
      }}
      onMouseLeave={() => {
        paused.current = false;
      }}
      onClick={() => onOpen?.(slide.type)}>
      <span className={`${styles.mortgageInner} ${fading ? styles.mortgageFade : ''}`}>
        <Icon />
        <p className={styles.mortgageText} dir="auto">
          {slide.question}
        </p>
      </span>
    </button>
  );
}
