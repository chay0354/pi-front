import {useEffect, useRef, useState} from 'react';
import {MortgageIcon} from '../components/figma/home.generated';
import {AppraisalIcon, ArchitectIcon, BrokerIcon, InteriorIcon, LawyerIcon} from './promoIcons';
import {isReduceMotion} from '../a11y/prefs';
import styles from '../screens/HomeScreen.module.css';

const ROTATE_MS = 4000;
const FADE_MS = 280;

const SLIDES = [
  {type: 'יועץ משכנתאות', question: 'מחפשים יועצי משכנתאות?', Icon: MortgageIcon},
  {type: 'אדריכלות', question: 'מחפשים אדריכלים?', Icon: ArchitectIcon},
  {type: 'תיווך', question: 'מחפשים מתווכים?', Icon: BrokerIcon},
  {type: 'עיצוב פנים', question: 'מחפשים מעצבי פנים לבית שלכם?', Icon: InteriorIcon},
  {type: 'שמאות', question: 'מחפשים שמאי מקרקעין?', Icon: AppraisalIcon},
  {type: 'עורך דין', question: 'מחפשים עורך דין בתחום הנדל״ן?', Icon: LawyerIcon},
];

/** Cycles the six professional cards; click opens the directory filtered to the one on screen. */
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
