import {useState} from 'react';
import ringGold from '../assets/figma/grid/avatar-ring.svg';
import ringUser from '../assets/figma/grid/avatar-ring-user.svg';
import iconHeart from '../assets/figma/grid/heart.svg';
import iconHeartLiked from '../assets/figma/grid/heart-liked.svg';
import iconLocation from '../assets/figma/grid/location.svg';
import iconFloor from '../assets/figma/grid/floor.svg';
import iconRooms from '../assets/figma/grid/rooms.svg';
import openHouseTag from '../assets/figma/grid/open-house-tag.svg';
import openHouseIcon from '../assets/figma/grid/open-house-icon.svg';
import noProfileImage from '../assets/noprofileimage.png';
import {formatCompanyApartments, formatCompanyFloors} from '../feed/listingRules';
import {persistAdLike, useIsLiked} from '../feed/likedListings';
import {useFeedActions} from '../feed/feedActions';
import {useSession} from '../auth/session';
import {PiRating, PreSaleTag} from './FeedCard';
import {feedListingProfilePayload, useProfileNav} from '../profile/navigation';
import styles from './GridCard.module.css';

const PURPOSE_LABEL = {rent: 'להשכרה', sale: 'למכירה'};
const formatPrice = n => `₪${Math.round(n).toLocaleString('en-US')}`;

function Avatar({src, ring}) {
  const [failedSrc, setFailedSrc] = useState('');
  const photo = src && failedSrc !== src ? src : noProfileImage;
  return (
    <span className={styles.avatar}>
      <img className={styles.avatarRing} src={ring === 'gold' ? ringGold : ringUser} alt="" width={51.8133} height={51.8133} />
      <img className={styles.avatarImage} src={photo} alt="" onError={() => src && setFailedSrc(src)} />
    </span>
  );
}

function Dots({count}) {
  if (count < 2) return null;
  return (
    <span className={styles.pager} aria-hidden>
      {Array.from({length: Math.min(5, count)}, (_, i) => (
        <span key={i} className={`${styles.dot} ${i === 0 ? styles.dotActive : ''}`} />
      ))}
    </span>
  );
}

function OpenHouseTag() {
  return (
    <span className={styles.openHouse}>
      <img className={styles.openHouseShape} src={openHouseTag} alt="" width={83.2207} height={30.373} />
      <img className={styles.openHouseIcon} src={openHouseIcon} alt="" width={20.8052} height={19.1832} />
      <span className={styles.openHouseText}>בית פתוח</span>
    </span>
  );
}

function Spec({icon, children}) {
  return (
    <span className={styles.spec}>
      <span className={styles.specText} dir="auto">
        {children}
      </span>
      {icon}
    </span>
  );
}

const sqmIcon = <span className={styles.sqmIcon} aria-hidden />;
const floorIcon = <img className={`${styles.specIcon} ${styles.flipped}`} src={iconFloor} alt="" width={18} height={18} />;
const roomsIcon = <img className={styles.specIcon} src={iconRooms} alt="" width={18} height={18} />;

/** "תצוגת תפזורת" card (Figma 436:37344 / 436:37346 / 436:37350, mobile ListingGridCardFigma). */
export default function GridCard({item, onRequestUnlike, onOpen, className = ''}) {
  const liked = useIsLiked(item.id);
  const {currentUser} = useSession();
  const {onNeedLogin} = useFeedActions();
  const nav = useProfileNav();
  const open = () => (onOpen ? onOpen() : nav.open(feedListingProfilePayload(item.raw)));
  const company = item.company;
  const title = company ? company.projectName || (item.price != null ? formatPrice(item.price) : '') : item.price != null ? formatPrice(item.price) : '';
  const image = item.images[0];

  let tag = <span className={styles.tag}>{PURPOSE_LABEL[item.purpose]}</span>;
  if (company?.openHouse) tag = <OpenHouseTag />;
  else if (company?.preSale) tag = <PreSaleTag />;

  return (
    <article
      className={`${styles.card} ${styles.clickable} ${className}`}
      aria-label={item.creatorName || 'מודעה'}
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={e => {
        if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
        e.preventDefault();
        open();
      }}>
      <div className={styles.media}>
        {image ? <img className={styles.photo} src={image} alt="" loading="lazy" /> : <span className={styles.noPhoto}>ללא תמונה</span>}
        <span className={styles.shade} aria-hidden />
        <Avatar src={item.creatorAvatar} ring={item.avatarRing} />
        <Dots count={item.images.length} />
      </div>

      <div className={styles.content}>
        <div className={styles.topRow}>
          {item.piRating != null ? (
            <span className={styles.rating}>
              <PiRating value={item.piRating} />
            </span>
          ) : (
            <span />
          )}
          <span className={styles.actions}>
            <button
              type="button"
              className={styles.heart}
              aria-label="מועדפים"
              aria-pressed={liked}
              onClick={e => {
                e.stopPropagation();
                if (liked && onRequestUnlike) {
                  onRequestUnlike(item.id);
                  return;
                }
                const userId = currentUser?.id || currentUser?.subscription_id;
                if (!userId) {
                  onNeedLogin();
                  return;
                }
                persistAdLike(item.id, userId).catch(err => window.alert(err?.message || 'לא ניתן לעדכן מועדפים'));
              }}>
              <img src={liked ? iconHeartLiked : iconHeart} alt="" width={28.5867} height={28.5867} />
            </button>
            {tag}
          </span>
        </div>

        {title && (
          <p className={styles.title} dir="auto">
            {title}
          </p>
        )}

        {item.address && (
          <p className={styles.address}>
            <span className={styles.addressText} dir="auto">
              {item.address}
            </span>
            <img src={iconLocation} alt="" width={18} height={18} />
          </p>
        )}

        <div className={styles.specs}>
          {company ? (
            <>
              {company.apartments != null && <Spec icon={roomsIcon}>{formatCompanyApartments(company.apartments)}</Spec>}
              {company.floors != null && <Spec icon={floorIcon}>{formatCompanyFloors(company.floors)}</Spec>}
            </>
          ) : (
            <>
              {item.rooms != null && <Spec icon={roomsIcon}>{`${item.rooms} חד׳`}</Spec>}
              {item.floor != null && Number.isFinite(item.floor) && <Spec icon={floorIcon}>{`קומה ${item.floor}`}</Spec>}
            </>
          )}
          {item.area != null && <Spec icon={sqmIcon}>{`${item.area} מ״ר`}</Spec>}
        </div>
      </div>
    </article>
  );
}
