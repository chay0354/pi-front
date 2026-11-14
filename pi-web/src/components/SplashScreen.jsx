import {useEffect, useRef, useState} from 'react';
import {isReduceMotion} from '../a11y/prefs';
import splashBack from '../assets/figma/splash/back.png';
import homeLogo from '../assets/homeLogo.png';
import styles from './SplashScreen.module.css';

const TAGLINE = "it's just simple";
const HOLD_MS = 2100;
const FLY_MS = 950;

/** Boot splash: logo settles, the tagline writes itself, then the logo lands on the header. */
export default function SplashScreen() {
  const logoRef = useRef(null);
  const [phase, setPhase] = useState('show');
  const [flight, setFlight] = useState(null);

  useEffect(() => {
    const reduce = isReduceMotion();
    const hold = window.setTimeout(() => {
      const logo = logoRef.current;
      const target = document.querySelector('button[aria-label="Pi 2701"] img');
      const start = logo?.getBoundingClientRect();
      const end = target?.getBoundingClientRect();
      const canFly = !reduce && start && end && start.width > 8 && end.width > 8;
      if (canFly) {
        const dx = end.left + end.width / 2 - (start.left + start.width / 2);
        const dy = end.top + end.height / 2 - (start.top + start.height / 2);
        setFlight({dx, dy, scale: end.width / start.width});
      }
      setPhase('out');
    }, reduce ? 400 : HOLD_MS);
    const done = window.setTimeout(() => setPhase('gone'), (reduce ? 400 : HOLD_MS) + (reduce ? 200 : FLY_MS));
    return () => {
      window.clearTimeout(hold);
      window.clearTimeout(done);
    };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div className={`${styles.splash} ${phase === 'out' ? styles.out : ''}`} role="presentation">
      <div className={styles.back} aria-hidden>
        <img src={splashBack} alt="" />
        <div className={styles.backFade} />
      </div>
      <div className={styles.center}>
        <img
          ref={logoRef}
          className={`${styles.logo} ${flight ? styles.fly : ''}`}
          src={homeLogo}
          alt="Pi 2701"
          style={
            flight
              ? {
                  '--dx': `${flight.dx}px`,
                  '--dy': `${flight.dy}px`,
                  '--scale': flight.scale,
                }
              : undefined
          }
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
