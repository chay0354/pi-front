import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioWithText} from './RadioWithText';
import {uploadProjectWording} from '../lib/publishRules';
import preSaleImage from '../../assets/mobile/pre-sale.png';
import {cx} from '../lib/rnStyle';
import styles from './fields.module.css';

export const SaleAtPreSale = ({isSelected = false, onToggle = () => {}, subscriptionType = null}) => {
  const toggle = () => onToggle(!isSelected);
  const promoText = uploadProjectWording(
    'הוסף תגית מכירה ייעודית כדי להבליט את הפרויקט ולמשוך מתעניינים',
    subscriptionType,
  );
  return (
    <FormContainer>
      <Title text="מכירה בפריסייל" />
      <RadioWithText
        key={0}
        isNotLastIndex={false}
        title={promoText}
        name="pre-sale"
        setName={toggle}
        index={0}
        isSelected={isSelected}
        radioOptionStyle={{paddingTop: 0}}
      />
      <button
        type="button"
        onClick={toggle}
        className={cx(styles.preSaleRadiant, isSelected && styles.preSaleRadiantOn)}
        aria-pressed={!!isSelected}>
        <img src={preSaleImage} alt="מכירה בפריסייל" className={styles.preSaleImage} />
      </button>
    </FormContainer>
  );
};
