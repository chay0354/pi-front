import {useEffect, useState} from 'react';
import {isReduceMotion} from '../a11y/prefs';
import splashBack from '../assets/mobile/splashBack.png';
import homeLogo from '../assets/homeLogo.png';
import styles from './SplashScreen.module.css';

const HOLD_MS = 1700;
const FADE_MS = 600;

/** App boot splash (building + Pi logo), with the site tagline under the logo. */
export default function SplashScreen() {
  const [phase, setPhase] = useState('show');

  useEffect(() => {
    const reduce = isReduceMotion();
    const hold = reduce ? 500 : HOLD_MS;
    const fade = reduce ? 0 : FADE_MS;
    const hide = window.setTimeout(() => setPhase('out'), hold);
    const done = window.setTimeout(() => setPhase('gone'), hold + fade);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(done);
    };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div className={`${styles.splash} ${phase === 'out' ? styles.out : ''}`} role="presentation">
      <img className={styles.back} src={splashBack} alt="" />
      <div className={styles.center}>
        <img className={styles.logo} src={homeLogo} alt="Pi 2701" />
        <p className={styles.tagline}>it's just simple</p>
      </div>
    </div>
  );
}
