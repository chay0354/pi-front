import {useEffect, useState} from 'react';
import homeLogo from '../assets/homeLogo.png';
import styles from './DesktopOnlyNotice.module.css';

const PHONE_UA = /Android.+Mobile|iPhone|iPod|Windows Phone|IEMobile|BlackBerry|Opera Mini|webOS/i;

/** A phone, including a phone browser that requested the desktop site. */
export function isPhoneDevice() {
  if (typeof window === 'undefined') return false;
  if (navigator.userAgentData?.mobile === true) return true;
  const ua = navigator.userAgent || '';
  if (PHONE_UA.test(ua)) return true;
  const narrow = window.matchMedia('(max-width: 767px)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  return narrow && coarse;
}

export function useIsPhone() {
  const [phone, setPhone] = useState(isPhoneDevice);
  useEffect(() => {
    const update = () => setPhone(isPhoneDevice());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);
  return phone;
}

export default function DesktopOnlyNotice() {
  return (
    <div className={styles.screen}>
      <img className={styles.logo} src={homeLogo} alt="Pi 2701" />
      <div className={styles.rule} />
      <h1 className={styles.title}>האתר מיועד למחשב</h1>
      <p className={styles.body}>פתחו את Pi 2701 בדפדפן במחשב כדי להמשיך.</p>
    </div>
  );
}
