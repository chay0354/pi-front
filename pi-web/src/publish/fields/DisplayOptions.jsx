import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioIcon} from './RadioIcon';
import collageImage from '../../assets/mobile/Frame1261158884.png';
import slideshowImage from '../../assets/mobile/Frame1261158883.png';
import styles from './fields.module.css';

const OPTIONS = [
  {name: 'slideshow', title: 'מצגת', subtitle: 'תמונות מתחלפות', image: slideshowImage},
  {name: 'collage', title: "קולאז'", subtitle: 'תצוגה משולבת', image: collageImage},
];

export const DisplayOptions = ({displayOption, setDisplayOption}) => (
  <FormContainer>
    <Title text="בחרו אפשרויות תצוגה נוספות" />
    <div className={styles.doRow}>
      {OPTIONS.map(option => (
        <button
          key={option.name}
          type="button"
          className={styles.doOption}
          onClick={() => setDisplayOption?.(displayOption === option.name ? null : option.name)}
          aria-pressed={displayOption === option.name}>
          <span className={styles.doContent}>
            <RadioIcon isSelected={displayOption === option.name} />
            <span className={styles.doSpacer} />
            <span className={styles.doTitle}>{option.title}</span>
          </span>
          <img src={option.image} alt="" className={styles.doImage} />
          <span className={styles.doSubtitle}>{option.subtitle}</span>
        </button>
      ))}
    </div>
  </FormContainer>
);
