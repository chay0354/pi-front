import {useState} from 'react';
import iconPin from '../assets/figma/piai/results/pin.svg';
import iconDoor from '../assets/figma/piai/results/door.svg';
import iconHeart from '../assets/figma/piai/results/heart.svg';
import iconHeartLiked from '../assets/figma/grid/heart-liked.svg';
import iconLine from '../assets/figma/piai/results/line.svg';
import iconPager from '../assets/figma/piai/results/pager.svg';
import noProfileImage from '../assets/noprofileimage.png';
import {formatCompanyApartments} from '../feed/listingRules';
import {persistAdLike, useIsLiked} from '../feed/likedListings';
import {useFeedActions} from '../feed/feedActions';
import {useSession} from '../auth/session';
import {feedListingProfilePayload, useProfileNav} from '../profile/navigation';
import {PiRatingBadge} from '../profile/ProfileParts';
import styles from './PiAiListingCard.module.css';

const PURPOSE_LABEL = {rent: 'להשכרה', sale: 'למכירה'};
const formatPrice = n => `₪${Math.round(n).toLocaleString('en-US')}`;

/** Pi AI listing result (Figma search results - piai, 334×529). */
export default function PiAiListingCard({item}) {
  const liked = useIsLiked(item.id);
  const {currentUser} = useSession();
  const {onNeedLogin} = useFeedActions();
  const nav = useProfileNav();
  const [failedSrc, setFailedSrc] = useState('');
  const avatar = item.creatorAvatar && failedSrc !== item.creatorAvatar ? item.creatorAvatar : noProfileImage;
  const company = item.company;
  const project = Boolean(company);
  const rooms =
    item.rooms != null ? `${item.rooms} חד׳` : company?.apartments != null ? formatCompanyApartments(company.apartments) : '';
  const price = item.price != null ? formatPrice(item.price) : company?.projectName || '';
  const image = item.images[0];
  const rating = project ? item.piRating ?? 5 : item.piRating;

  const open = () => nav.open(feedListingProfilePayload(item.raw));
  const toggleLike = event => {
    event.stopPropagation();
    const userId = currentUser?.id || currentUser?.subscription_id;
    if (!userId) {
      onNeedLogin();
      return;
    }
    persistAdLike(item.id, userId).catch(err => window.alert(err?.message || 'לא ניתן לעדכן מועדפים'));
  };

  return (
    <article className={styles.card} aria-label={item.creatorName || 'מודעה'} role="button" tabIndex={0} onClick={open} onKeyDown={event => {
      if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      open();
    }}>
      <div className={styles.media}>
        {image ? <img className={styles.photo} src={image} alt="" /> : <span className={styles.noPhoto}>ללא תמונה</span>}
        <span className={styles.shade} aria-hidden />
        {image ? <img className={styles.pager} src={iconPager} alt="" width={82} height={8} /> : null}
      </div>
      <div className={styles.info}>
        <div className={styles.who}>
          <span className={project ? `${styles.publisher} ${styles.publisherProject}` : styles.publisher}>
            <span className={project ? `${styles.avatar} ${styles.avatarLogo}` : styles.avatar}>
              <img src={avatar} alt="" onError={() => item.creatorAvatar && setFailedSrc(item.creatorAvatar)} />
            </span>
            <span className={styles.name} dir="auto">{item.creatorName}</span>
          </span>
          {rating != null ? (
            <span className={styles.rating}>
              <PiRatingBadge rating={rating} variant="listing" />
            </span>
          ) : null}
        </div>
        <img className={styles.line} src={iconLine} alt="" width={306} height={1} />
        <div className={styles.specRow}>
          <span className={styles.actions}>
            {item.purposeTag || PURPOSE_LABEL[item.purpose] ? (
              <span className={styles.tag}>{item.purposeTag || PURPOSE_LABEL[item.purpose]}</span>
            ) : null}
            <button type="button" className={styles.heart} aria-label="מועדפים" aria-pressed={liked} onClick={toggleLike}>
              <img src={liked ? iconHeartLiked : iconHeart} alt="" width={32} height={32} />
            </button>
          </span>
          {rooms ? (
            <span className={styles.rooms}>
              <img src={iconDoor} alt="" width={24} height={24} />
              <span dir="auto">{rooms}</span>
            </span>
          ) : null}
        </div>
        <p className={styles.price}>
          <span dir="ltr">{price}</span>
        </p>
        <div className={styles.facts}>
          {item.address ? (
            <p className={styles.fact}>
              <img src={iconPin} alt="" width={24} height={24} />
              <span dir="auto">{item.address}</span>
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
