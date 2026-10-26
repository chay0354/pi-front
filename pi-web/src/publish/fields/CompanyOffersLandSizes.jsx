import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {Divider} from './Divider';
import {RadioWithText} from './RadioWithText';
import {CountUpdate} from './CountUpdate';
import {CardPriceField} from './CardPriceField';
import {RadioIcon} from './RadioIcon';
import styles from './fields.module.css';

const createEmptyLand = () => ({
  unit: 'dunam',
  area: 0,
  price: 0,
});

const optionSpacing = {marginRight: 20};

/** Controlled by AdsForm (company category 7); parcels persist as `companyOffersLandSizes`. */
export const CompanyOffersLandSizes = ({lands, setLands}) => {
  const list = Array.isArray(lands) ? lands : [];

  const updateLand = (index, patch) => {
    if (typeof setLands !== 'function') return;
    setLands(prev => (Array.isArray(prev) ? prev : []).map((l, i) => (i === index ? {...l, ...patch} : l)));
  };

  const addLand = () => {
    if (typeof setLands !== 'function') return;
    setLands(prev => [...(Array.isArray(prev) ? prev : []), createEmptyLand()]);
  };

  return (
    <FormContainer>
      <Title text="החברה מציעה קרקעות בגדלים של" required />
      {list.map((land, idx) => (
        <div key={idx}>
          <span className={styles.colLandTitle}>קרקע {idx + 1}</span>

          <div className={styles.colRadioRow}>
            <span className={styles.landSubLabel} style={{marginInlineStart: 16}}>
              שטח הקרקע *
            </span>
            <div className={styles.landUnitRow}>
              <RadioWithText
                key={1}
                isNotLastIndex={false}
                title={'מ"ר'}
                name="sqm"
                setName={() => updateLand(idx, {unit: 'sqm'})}
                index={1}
                isSelected={land.unit === 'sqm'}
                inline
                radioOptionStyle={{paddingTop: 0}}
              />
              <RadioWithText
                key={0}
                isNotLastIndex={false}
                title="דונם"
                name="dunam"
                setName={() => updateLand(idx, {unit: 'dunam'})}
                index={0}
                isSelected={land.unit === 'dunam'}
                inline
                radioOptionStyle={{paddingTop: 0}}
                containerStyle={optionSpacing}
              />
            </div>
          </div>

          <CountUpdate
            count={land.area}
            setCount={value => updateLand(idx, {area: value})}
            isArea
            isDivider={false}
            containerStyle={{marginBottom: 0}}
          />
          <span className={styles.colSubFields}>מחיר*</span>
          <CardPriceField price={land.price} setPrice={value => updateLand(idx, {price: value})} />
          <Divider style={{marginBottom: 15}} />
        </div>
      ))}

      <button type="button" className={styles.colAddRow} onClick={addLand}>
        <span className={styles.colAddText}>הוסף קרקע</span>
        <span className={styles.colAddSpacer} />
        <RadioIcon isSelected={false} />
      </button>
    </FormContainer>
  );
};
