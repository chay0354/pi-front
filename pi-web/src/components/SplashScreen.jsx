import {useEffect, useRef, useState} from 'react';
import {isReduceMotion} from '../a11y/prefs';
import splashBack from '../assets/figma/splash/back.png';
import homeLogo from '../assets/homeLogo.png';
import styles from './SplashScreen.module.css';

const TAGLINE = 'It’s Just Simple!';
const HOLD_MS = 2300;
/** Tagline leaves first so the logo travels alone, like the app intro. */
const TAG_OUT_MS = 450;
/** Same as the app's HomeIntroModal MOVE_MS. */
const FLY_MS = 1800;
const HEADER_LOGO = 'button[aria-label="Pi 2701"] img';

/** Boot splash: logo settles, the tagline writes itself, then the logo flies into the header. */
export default function SplashScreen() {
  const logoRef = useRef(null);
  const [phase, setPhase] = useState('show');
  const [flying, setFlying] = useState(false);

  useEffect(() => {
    const reduce = isReduceMotion();
    const timers = [];
    let target = null;
    const reveal = () => {
      if (target) target.style.visibility = '';
    };
    const later = (fn, ms) => timers.push(window.setTimeout(fn, ms));

    if (reduce) {
      later(() => setPhase('out'), 400);
      later(() => setPhase('gone'), 600);
    } else {
      later(() => setPhase('tagOut'), HOLD_MS);
      later(() => {
        const logo = logoRef.current;
        target = document.querySelector(HEADER_LOGO);
        const start = logo?.getBoundingClientRect();
        const end = target?.getBoundingClientRect();
        if (start && end && start.width > 8 && end.width > 8) {
          // The header logo stays hidden until this one lands on it, so only one logo is ever on screen.
          target.style.visibility = 'hidden';
          const dx = end.left + end.width / 2 - (start.left + start.width / 2);
          const dy = end.top + end.height / 2 - (start.top + start.height / 2);
          const scale = end.width / start.width;
          // Web Animations, not a CSS transition: swapping the entrance keyframes for a transition skips the move.
          logo.getAnimations().forEach(animation => animation.cancel());
          logo.animate(
            [{transform: 'none'}, {transform: `translate(${dx}px, ${dy}px) scale(${scale})`}],
            {duration: FLY_MS, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards'},
          );
          setFlying(true);
        }
        setPhase('out');
      }, HOLD_MS + TAG_OUT_MS);
      later(() => {
        reveal();
        requestAnimationFrame(() => requestAnimationFrame(() => setPhase('gone')));
      }, HOLD_MS + TAG_OUT_MS + FLY_MS);
    }
    return () => {
      timers.forEach(window.clearTimeout);
      reveal();
    };
  }, []);

  if (phase === 'gone') return null;

  const phaseClass = phase === 'out' ? styles.out : phase === 'tagOut' ? styles.tagOut : '';

  return (
    <div className={`${styles.splash} ${phaseClass}`} role="presentation">
      <div className={styles.veil} aria-hidden />
      <div className={styles.back} aria-hidden>
        <img src={splashBack} alt="" />
        <div className={styles.backFade} />
      </div>
      <div className={styles.center}>
        <img
          ref={logoRef}
          className={`${styles.logo} ${flying ? styles.fly : ''}`}
          src={homeLogo}
          alt="Pi 2701"
        />
        <p className={styles.tagline} dir="ltr">
          <span className={styles.srOnly}>{TAGLINE}</span>
          <span aria-hidden>
            {TAGLINE.split('').map((char, index) => (
              <span key={`${char}-${index}`} className={styles.letter} style={{animationDelay: `${0.55 + index * 0.05}s`}}>
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </span>
        </p>
      </div>
    </div>
  );
}
