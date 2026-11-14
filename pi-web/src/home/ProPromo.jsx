import {useEffect, useRef, useState} from 'react';
import {MortgageIcon} from '../components/figma/home.generated';
import {isReduceMotion} from '../a11y/prefs';
import imgMortgageGlass from '../assets/figma/home/f4405.svg';
import imgMortgageSpark from '../assets/figma/home/a8c10.svg';
import imgMortgageDotA from '../assets/figma/home/dc770.svg';
import imgMortgageDotB from '../assets/figma/home/44e57.svg';
import styles from '../screens/HomeScreen.module.css';

const ROTATE_MS = 4000;
const FADE_MS = 280;
const STROKE = '#FFC40A';
const FILL = '#2B2A39';

/** Same frame as the mortgage icon: glass, a symbol in the lens, a second mark under it, spark and dots. */
function PromoMark({glyph, extra}) {
  return (
    <span className={styles.promoIcon} aria-hidden>
      <img className={styles.promoGlass} src={imgMortgageGlass} alt="" />
      <span className={styles.promoGlyph}>{glyph}</span>
      <span className={styles.promoExtra}>{extra}</span>
      <img className={styles.promoSpark} src={imgMortgageSpark} alt="" />
      <img className={styles.promoDotA} src={imgMortgageDotA} alt="" />
      <img className={styles.promoDotB} src={imgMortgageDotB} alt="" />
    </span>
  );
}

function Glyph({id, width, height, viewBox, children}) {
  return (
    <svg viewBox={viewBox} width={width} height={height} fill="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2={width} y2={height * 0.35} gradientUnits="userSpaceOnUse">
          <stop stopColor="#34F3E0" />
          <stop offset="1" stopColor="#04CFE1" />
        </linearGradient>
      </defs>
      {children}
    </svg>
  );
}

function InvestorIcon() {
  return (
    <PromoMark
      glyph={
        <Glyph id="pi-investor" width={30} height={30} viewBox="0 0 32 32">
          <circle cx="16" cy="9.2" r="4.4" fill={FILL} stroke={STROKE} strokeWidth="1.875" />
          <path
            d="M6.4 26.4c1-7.6 4.2-11.2 9.6-11.2s8.6 3.6 9.6 11.2"
            fill={FILL}
            stroke="url(#pi-investor)"
            strokeWidth="1.875"
            strokeLinecap="round"
          />
        </Glyph>
      }
      extra={
        <Glyph id="pi-investor-bars" width={54} height={32} viewBox="0 0 54 32">
          <path d="M3 26.5V17c0-1.1.9-2 2-2h5.2c1.1 0 2 .9 2 2v9.5" fill={FILL} stroke="url(#pi-investor-bars)" strokeWidth="1.875" strokeLinejoin="round" />
          <path d="M16.4 26.5V11.2c0-1.1.9-2 2-2h5.2c1.1 0 2 .9 2 2v15.3" fill={FILL} stroke={STROKE} strokeWidth="1.875" strokeLinejoin="round" />
          <path d="M29.8 26.5V5.6c0-1.1.9-2 2-2H37c1.1 0 2 .9 2 2v20.9" fill={FILL} stroke="url(#pi-investor-bars)" strokeWidth="1.875" strokeLinejoin="round" />
          <path d="M1.6 26.5h39" stroke={STROKE} strokeWidth="1.875" strokeLinecap="round" />
        </Glyph>
      }
    />
  );
}

function LawyerIcon() {
  return (
    <PromoMark
      glyph={
        <Glyph id="pi-lawyer" width={32} height={30} viewBox="0 0 32 32">
          <circle cx="16" cy="4.6" r="2" fill={STROKE} />
          <path d="M16 6.6V12" stroke="url(#pi-lawyer)" strokeWidth="1.875" strokeLinecap="round" />
          <path d="M4.8 12.4h22.4" stroke={STROKE} strokeWidth="1.875" strokeLinecap="round" />
          <path d="M4.8 12.4 1.6 20.6h6.4L4.8 12.4Z" fill={FILL} stroke={STROKE} strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M27.2 12.4 24 20.6h6.4L27.2 12.4Z" fill={FILL} stroke="url(#pi-lawyer)" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M16 12.4v12.2" stroke="url(#pi-lawyer)" strokeWidth="1.875" strokeLinecap="round" />
          <path d="M10.2 26.8h11.6" stroke={STROKE} strokeWidth="1.875" strokeLinecap="round" />
        </Glyph>
      }
      extra={
        <Glyph id="pi-lawyer-book" width={40} height={26} viewBox="0 0 40 26">
          <path
            d="M20 7.2C16.2 4.6 10.4 3.6 4 4.8v14.2c6.2-1.2 11.4-.4 16 2.4 4.6-2.8 9.8-3.6 16-2.4V4.8C29.6 3.6 23.8 4.6 20 7.2Z"
            fill={FILL}
            stroke="url(#pi-lawyer-book)"
            strokeWidth="1.875"
            strokeLinejoin="round"
          />
          <path d="M20 7.2v14.2" stroke={STROKE} strokeWidth="1.875" strokeLinecap="round" />
        </Glyph>
      }
    />
  );
}

function AppraisalIcon() {
  return (
    <PromoMark
      glyph={
        <Glyph id="pi-appraisal" width={30} height={32} viewBox="0 0 32 34">
          <rect x="6.2" y="6.4" width="19.6" height="24.2" rx="2.4" fill={FILL} stroke="url(#pi-appraisal)" strokeWidth="1.875" />
          <rect x="11.4" y="3.2" width="9.2" height="5.2" rx="1.4" fill={FILL} stroke={STROKE} strokeWidth="1.7" />
          <path d="M10.4 15.2h11.2M10.4 19.6h11.2M10.4 24h7" stroke={STROKE} strokeWidth="1.7" strokeLinecap="round" />
        </Glyph>
      }
      extra={
        <Glyph id="pi-appraisal-seal" width={28} height={28} viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="9.2" fill={FILL} stroke={STROKE} strokeWidth="1.875" />
          <path d="M9.2 14.4 12.4 17.6 18.8 10.6" stroke="url(#pi-appraisal-seal)" strokeWidth="1.875" strokeLinecap="round" strokeLinejoin="round" />
        </Glyph>
      }
    />
  );
}

function InteriorIcon() {
  return (
    <PromoMark
      glyph={
        <Glyph id="pi-interior" width={34} height={30} viewBox="0 0 36 32">
          <path d="M8.4 13.2V9.4A2 2 0 0 1 10.4 7.4h15.2a2 2 0 0 1 2 2v3.8" stroke="url(#pi-interior)" strokeWidth="1.875" strokeLinecap="round" />
          <path d="M4.6 14.6h26.8v7.4a1.8 1.8 0 0 1-1.8 1.8H6.4a1.8 1.8 0 0 1-1.8-1.8v-7.4Z" fill={FILL} stroke={STROKE} strokeWidth="1.875" strokeLinejoin="round" />
          <path d="M4.6 16.8C2.8 16.8 1.6 15.6 1.6 14s1.2-2.8 3-2.8v5.6Z" fill={FILL} stroke={STROKE} strokeWidth="1.55" strokeLinejoin="round" />
          <path d="M31.4 16.8c1.8 0 3-1.2 3-2.8s-1.2-2.8-3-2.8v5.6Z" fill={FILL} stroke="url(#pi-interior)" strokeWidth="1.55" strokeLinejoin="round" />
          <path d="M9.2 23.8v3.2M26.8 23.8v3.2" stroke={STROKE} strokeWidth="1.875" strokeLinecap="round" />
        </Glyph>
      }
      extra={
        <Glyph id="pi-interior-plant" width={28} height={30} viewBox="0 0 28 30">
          <path d="M9.2 17.2h9.6l-1.2 8H10.4l-1.2-8Z" fill={FILL} stroke={STROKE} strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M14 17.2V9.2" stroke="url(#pi-interior-plant)" strokeWidth="1.875" strokeLinecap="round" />
          <path d="M14 13.2C9.6 13.2 7.4 10.6 7.2 7.6c3.4.2 6.2 2.2 6.8 5.6Z" fill={FILL} stroke="url(#pi-interior-plant)" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M14 12.4c4-.4 6.6-2.8 6.8-5.6-3 .8-5.4 2.8-6.8 5.6Z" fill={FILL} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round" />
        </Glyph>
      }
    />
  );
}

const SLIDES = [
  {type: 'יועץ משכנתאות', question: 'מחפשים יועצי משכנתאות?', Icon: MortgageIcon},
  {type: 'מלווה משקיעים', question: 'מחפשים מלווים למשקיעים?', Icon: InvestorIcon},
  {type: 'עורך דין', question: 'מחפשים עורכי דין?', Icon: LawyerIcon},
  {type: 'שמאות', question: 'מחפשים שמאים?', Icon: AppraisalIcon},
  {type: 'עיצוב פנים', question: 'מחפשים מעצבי פנים?', Icon: InteriorIcon},
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
