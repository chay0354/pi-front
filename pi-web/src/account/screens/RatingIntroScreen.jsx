import {AccountScreen} from '../AccountUi';
import {getHeaderTitle, subscriptionTypes} from '../constants';
import gift from '../../assets/account/gift.svg';
import pistar from '../../assets/account/pistar.png';
import star1 from '../../assets/account/star-1.svg';
import star2 from '../../assets/account/star-2.svg';
import star3 from '../../assets/account/star-3.svg';
import star4 from '../../assets/account/star-4.svg';
import star5 from '../../assets/account/star-5.svg';
import styles from './SubscriptionScreens.module.css';

const NUMBERED_STARS = [star1, star2, star3, star4, star5];

/** "איזה יופי שהצטרפתם אלינו!" — shown after email verification, before the success step. */
export default function RatingIntroScreen({subscriptionType = subscriptionTypes.broker, onClose, onContinue}) {
  const isCompany = subscriptionType === subscriptionTypes.company;

  return (
    <AccountScreen title={getHeaderTitle(subscriptionType)} onBack={onClose} width={460} className={styles.ratingScreen}>
      <div className={styles.ratingPopup}>
        <div className={styles.ratingTop}>
          <img src={gift} alt="" width={46} height={46} />
          <h2 className={styles.ratingTitle}>איזה יופי שהצטרפתם אלינו!</h2>

          <div className={`${styles.ratingCard} ${isCompany ? styles.ratingCardCompany : ''}`}>
            {isCompany ? (
              <>
                <div className={styles.numberedStars}>
                  {NUMBERED_STARS.map((src, i) => (
                    <span key={src} className={styles.numberedStar}>
                      <img src={src} alt="" width={34} height={34} />
                      <span>{i + 1}</span>
                    </span>
                  ))}
                </div>
                <div className={styles.companyStarBlock}>
                  <img src={pistar} alt="" className={styles.pistar} />
                  <div className={styles.companyCopy}>
                    <span className={styles.ratingLead}>קיבלתם את הדירוג הגבוה ביותר!</span>
                    <span className={styles.ratingGold}>5 כוכבי פאי</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <span className={styles.ratingLead}>עליכם לקבל את הדירוג הגבוה ביותר:</span>
                <div className={styles.starWithGold}>
                  <img src={pistar} alt="" className={styles.pistar} />
                  <span className={`${styles.ratingGold} ${styles.ratingGoldOverlap}`}>5 כוכבי פאי</span>
                </div>
              </>
            )}
          </div>

          <p className={styles.ratingInfo}>
            הקפידו לשמור על דירוג גבוה,
            <br />
            הוא קובע את אמינות העסק שלכם.
          </p>
        </div>

        <button type="button" className={styles.ratingCta} onClick={onContinue}>
          מעולה, בואו נתחיל!
        </button>
      </div>
    </AccountScreen>
  );
}
