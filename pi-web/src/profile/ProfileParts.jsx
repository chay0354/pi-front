import {useEffect, useId, useRef, useState} from 'react';
import {askSmartInfo} from '../api/client';
import {DEFAULT_PI_PROFILE_AVATAR} from './lib/userProfileImage';
import {resolveSubscriptionType, shouldShowProfileGoldRing} from './lib/constant';
import {getPiRatingCompositeSource, normalizePiRating, PI_RATING_BADGE_RING} from './lib/piRatingBadgeAssets';
import styles from './ProfileParts.module.css';

const ASSET_URLS = import.meta.glob('./assets/**/*', {eager: true, query: '?url', import: 'default'});

/** URL of a copied mobile asset; Vite's `new URL(`${dynamic}`)` only resolves one directory level. */
export const asset = path => ASSET_URLS[`./assets/${path}`];

/** MaterialCommunityIcons glyphs used by the mobile profile. */
const MDI = {
  'chevron-left': 'M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z',
  'alert-outline': 'M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16',
  'content-copy':
    'M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z',
  'camera-outline':
    'M20,4H16.83L15,2H9L7.17,4H4A2,2 0 0,0 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6A2,2 0 0,0 20,4M20,18H4V6H8.05L9.88,4H14.12L15.95,6H20V18M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15Z',
  'play-circle': 'M10,16.5V7.5L16,12M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z',
  'image-outline':
    'M19,19H5V5H19M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M13.96,12.29L11.21,15.83L9.25,13.47L6.5,17H17.5L13.96,12.29Z',
  close: 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z',
  account: 'M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z',
  plus: 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z',
  'check-bold': 'M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z',
  'chevron-right': 'M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z',
};

export function Icon({name, size = 24, color = '#fff', className}) {
  if (name === 'location-pin') {
    // SimpleLineIcons location-pin (outline).
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 22s-7-6.6-7-12.2A7 7 0 0 1 19 9.8C19 15.4 12 22 12 22Z"
          stroke={color}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="9.8" r="2.6" stroke={color} strokeWidth="1.6" />
      </svg>
    );
  }
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d={MDI[name]} fill={color} />
    </svg>
  );
}

export const SvgImage = ({xml, width, height, className}) => (
  <img className={className} src={`data:image/svg+xml;utf8,${encodeURIComponent(xml)}`} alt="" width={width} height={height} />
);

const GOLD_RING = ['#FFE56A', '#F7C63A', '#E5A80F'];
const USER_RING = ['#99F6E4', '#5EEAD4', '#0D9488'];
const RING_STOPS = [0.0456, 0.5076, 0.8831];

/** Mobile ProfileAvatar: gradient ring (gold for B2B, teal for users) + round photo. */
export function ProfileAvatar({
  uri,
  fallbackUri,
  placeholderImage = DEFAULT_PI_PROFILE_AVATAR,
  size = 60,
  subscriptionType,
  forceGoldRing = false,
  className = '',
}) {
  const gradientId = useId();
  const [failed, setFailed] = useState({});
  const ring = Math.max(1, (size * 3.5) / 82);
  const inset = ring + (size * 2) / 82;
  const showPrimary = Boolean(uri) && !failed[uri];
  const showFallback = !showPrimary && Boolean(fallbackUri) && !failed[fallbackUri];
  const src = showPrimary ? uri : showFallback ? fallbackUri : placeholderImage || DEFAULT_PI_PROFILE_AVATAR;
  const type = resolveSubscriptionType(subscriptionType);
  const colors = forceGoldRing === true || (type !== '' && shouldShowProfileGoldRing(type)) ? GOLD_RING : USER_RING;
  return (
    <span className={`${styles.avatar} ${className}`} style={{width: size, height: size}}>
      <svg className={styles.avatarRing} width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            {colors.map((c, i) => (
              <stop key={c} offset={RING_STOPS[i]} stopColor={c} />
            ))}
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={(size - ring) / 2} stroke={`url(#${gradientId})`} strokeWidth={ring} fill="none" />
      </svg>
      <img
        className={styles.avatarPhoto}
        style={{
          top: inset,
          left: inset,
          width: size - inset * 2,
          height: size - inset * 2,
          objectFit: showFallback ? 'contain' : 'cover',
        }}
        src={src}
        alt=""
        onError={() => {
          if (showPrimary || showFallback) setFailed(prev => ({...prev, [src]: true}));
        }}
      />
    </span>
  );
}

/** Mobile PiRatingBadge: composite art for 1–4, gold digit + ring for 5. */
const BADGE_VARIANT = {
  profile: styles.piProfile,
  listing: styles.piListing,
  card: styles.piCard,
  list: styles.piList,
};

export function PiRatingBadge({rating, variant = 'profile'}) {
  const n = normalizePiRating(rating);
  const cls = BADGE_VARIANT[variant] || styles.piProfile;
  if (n < 5) {
    return <img className={`${styles.piComposite} ${cls}`} src={getPiRatingCompositeSource(n)} alt="דירוג Pi" />;
  }
  return (
    <span className={`${styles.piFive} ${cls}`} aria-label="דירוג Pi">
      <span className={styles.piDigit}>{n}</span>
      <img className={styles.piRing} src={PI_RATING_BADGE_RING} alt="" />
    </span>
  );
}

const STAR_ART = [1, 2, 3, 4].map(n => asset(`improve/figma-star-${n}.svg`));
const STAR_FIVE = asset('starts/5.png');

/** Mobile RatingImprovePicker (Figma 8:78507): five tiles, 1 on the physical left. */
export function RatingImprovePicker({value = 0, onChange}) {
  return (
    <div className={styles.picker} dir="ltr">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          className={`${styles.pickerTile} ${value === n ? styles.pickerTileSelected : ''}`}
          onClick={() => onChange?.(n)}
          aria-label={value === n ? `דירוג ${n} מתוך 5, נבחר` : `בחר דירוג ${n} מתוך 5`}>
          <span className={styles.pickerStar}>
            {n === 5 ? (
              <img className={styles.pickerStarFive} src={STAR_FIVE} alt="" />
            ) : (
              <>
                <img src={STAR_ART[n - 1]} alt="" width={42} height={42} />
                <span className={styles.pickerNum}>{n}</span>
              </>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * Mobile FollowPlusBadge: white + that pops into an orange ✓.
 * `beforePress` returning false skips; `onPress` resolving false reverts.
 */
export function FollowPlusBadge({onPress, beforePress, disabled = false, iconSize = 18, className = '', onAnimationComplete}) {
  const [checked, setChecked] = useState(false);
  const busy = useRef(false);
  const press = async () => {
    if (busy.current || disabled || checked) return;
    if (typeof beforePress === 'function' && beforePress() === false) return;
    busy.current = true;
    setChecked(true);
    let ok = true;
    try {
      if ((await onPress?.()) === false) ok = false;
    } catch {
      ok = false;
    }
    if (!ok) {
      setChecked(false);
      busy.current = false;
      onAnimationComplete?.();
      return;
    }
    setTimeout(() => {
      onAnimationComplete?.();
      busy.current = false;
    }, 900);
  };
  return (
    <button
      type="button"
      className={`${styles.follow} ${checked ? styles.followChecked : ''} ${className}`}
      onClick={press}
      aria-label={checked ? 'בקשת מעקב נשלחה' : 'עקוב'}>
      <span className={styles.followIcon} style={{width: iconSize + 2, height: iconSize + 2}}>
        <span className={styles.followPlus}>
          <Icon name="plus" size={iconSize} />
        </span>
        <span className={styles.followCheck}>
          <Icon name="check-bold" size={iconSize} color="#FFC40A" />
        </span>
      </span>
    </button>
  );
}

const FULL_SCREEN_ICON = asset('full_screen.png');

/** Mobile LocationMap: Google Maps embed for the listing address, expand opens Maps. */
export function LocationMap({address, height = 230, className = ''}) {
  const addr = address && String(address).trim() ? String(address).trim() : '';
  if (!addr) return null;
  const q = encodeURIComponent(addr);
  return (
    <div className={`${styles.map} ${className}`} style={{height}}>
      <iframe
        title="מיקום הנכס"
        className={styles.mapFrame}
        src={`https://maps.google.com/maps?q=${q}&z=15&hl=iw&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <a
        className={styles.mapExpand}
        href={`https://www.google.com/maps/search/?api=1&query=${q}`}
        target="_blank"
        rel="noreferrer"
        aria-label="פתח במפות">
        <img src={FULL_SCREEN_ICON} alt="" width={24} height={24} />
      </a>
    </div>
  );
}

const PI_AI_LOGO = asset('paiailogo.png');
/** Native button art order (car → תחבורה); mobile web's public/ order is mismatched. */
const SMART_ICONS = [2, 1, 4, 3, 6, 5, 8, 7].map(n => asset(`ai-icon-${n}.png`));
const SMART_BUTTONS = [
  {label: 'תחבורה', key: 'transport'},
  {label: 'מחיר ממוצע', key: 'avgprice'},
  {label: 'ביטחון', key: 'security'},
  {label: 'מוסדות', key: 'institutions'},
  {label: 'בתי ספר', key: 'schools'},
  {label: 'החיים בשכונה', key: 'neighborhood'},
  {label: 'מטרדים', key: 'nuisances'},
  {label: 'מרכזי קניות', key: 'shopping'},
];

/** PiAi neighborhood block — profile (`main`) and dedicated BnB / שותפים / קרקע (`partners`) styles. */
export function SmartInfoBlock({address = '', variant = 'main'}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const textRef = useRef(null);
  useEffect(() => {
    if (text && textRef.current) textRef.current.scrollTop = 0;
  }, [text]);
  return (
    <div className={`${styles.smart} ${variant === 'partners' ? styles.smartPartners : ''}`}>
      <img className={styles.smartLogo} src={PI_AI_LOGO} alt="PiAi" />
      <p className={styles.smartIntro}>קבלו מידע חכם על סביבת הנכס בלחיצת כפתור</p>
      <div className={styles.smartGrid}>
        {SMART_BUTTONS.map((item, index) => (
          <button
            key={item.key}
            type="button"
            className={styles.smartBtn}
            disabled={loading}
            onClick={async () => {
              if (loading) return;
              setLoading(true);
              setText('');
              const result = await askSmartInfo(item.key, item.label, address);
              setLoading(false);
              if (result.text) setText(result.text);
            }}>
            <img className={styles.smartBtnIcon} src={SMART_ICONS[index]} alt="" />
            <span className={styles.smartBtnLabel}>{item.label}</span>
          </button>
        ))}
      </div>
      <textarea
        ref={textRef}
        className={styles.smartText}
        value={text}
        onChange={e => setText(e.target.value)}
        dir="rtl"
        aria-label="מידע חכם"
      />
    </div>
  );
}

/** Gold "דרג" / "שלח" button (mobile LinearGradient 0.04 / 0.51 / 0.88, vertical). */
export function GoldButton({children, onClick, disabled, className = ''}) {
  return (
    <button type="button" className={`${styles.goldBtn} ${className}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function SectionLine({className = ''}) {
  return <div className={`${styles.line} ${className}`} />;
}
