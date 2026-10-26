import sparkleBig from '../assets/figma/liked-empty/sparkle-big.svg';
import sparkleSmall from '../assets/figma/liked-empty/sparkle-small.svg';
import dotA from '../assets/figma/liked-empty/dot-a.svg';
import dotB from '../assets/figma/liked-empty/dot-b.svg';
import dotC from '../assets/figma/liked-empty/dot-c.svg';
import heart from '../assets/figma/liked-empty/heart.svg';
import heartShine from '../assets/figma/liked-empty/heart-shine.svg';
import feedIcon from '../assets/empty-state/feed.svg';
import gridIcon from '../assets/empty-state/grid.svg';
import videoIcon from '../assets/empty-state/video.svg';
import styles from './EmptyState.module.css';

/** Sparkles and dots around the icon, offsets from Figma 744:77835 (120×87.059). */
const DECOR = [
  {src: sparkleBig, left: 1.0895, top: 8.9295, w: 16.2561, h: 16.2561},
  {src: sparkleSmall, left: 104.9935, top: 58.3335, w: 12.3597, h: 12.3597},
  {src: dotA, left: 114.12, top: 46.79, w: 3.99816, h: 3.99816},
  {src: dotA, left: 4.44, top: 33.39, w: 3.99816, h: 3.99816},
  {src: dotC, left: 98.84, top: 72.35, w: 4.44815, h: 4.44815},
  {src: dotB, left: 17.82, top: 0.48, w: 4.53431, h: 4.53431},
];

const frameIcon = src => [{src, left: 23.5, top: 3.5, w: 80, h: 80}];

const MODES = {
  liked: {
    layers: [
      {src: heart, left: 20.666, top: 9.835, w: 85.728, h: 76.0094},
      {src: heartShine, left: 80.3275, top: 17.7145, w: 17.2451, h: 16.0705},
    ],
    title: 'המודעות ששמרתם יוצגו כאן',
    subtitle: 'ראיתם נכס מעניין? כדאי לשמור אותו כדי שיהיה קל לחזור אליו בעתיד',
  },
  feed: {
    layers: frameIcon(feedIcon),
    title: 'אין כאן מודעות כרגע',
    subtitle: 'נסו לבחור קטגוריה אחרת או לשנות את הסינון כדי לגלות נכסים נוספים',
  },
  grid: {
    layers: frameIcon(gridIcon),
    title: 'אין מודעות להצגה בתפזורת',
    subtitle: 'נסו לבחור קטגוריה אחרת או לשנות את הסינון כדי לגלות נכסים נוספים',
  },
  video: {
    layers: frameIcon(videoIcon),
    title: 'הסרטונים יוצגו כאן',
    subtitle: 'עדיין אין מודעות וידאו בקטגוריה הזו. נסו קטגוריה אחרת או חזרו בקרוב',
  },
};

/** Empty view, in the style of Figma 744:77925 (empty favorites). */
export default function EmptyState({mode = 'feed'}) {
  const {layers, title, subtitle} = MODES[mode] || MODES.feed;
  return (
    <div className={styles.empty}>
      <span className={styles.icon} aria-hidden>
        {[...DECOR, ...layers].map((l, i) => (
          <img key={i} src={l.src} alt="" width={l.w} height={l.h} style={{left: l.left, top: l.top}} />
        ))}
      </span>
      <div className={styles.text}>
        <p className={styles.title} dir="auto">
          {title}
        </p>
        <p className={styles.subtitle} dir="auto">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
