import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {CountUpdate} from './CountUpdate';
import {RadioWithText} from './RadioWithText';
import {RadioButton} from './RadioButton';
import AmenityQuantityPill from '../components/AmenityQuantityPill';
import {Divider} from './Divider';
import styles from './fields.module.css';

const counterSeparator = {height: 1, backgroundColor: '#343243', marginVertical: 20};
const beforeAmenities = {height: 1, backgroundColor: '#343243', marginTop: 4, marginBottom: 12};
const amenityQuantityButton = {marginRight: 16};
const inputLabel = [{fontSize: 14, marginLeft: 12, color: '#D2D0DC', marginBottom: 10}, {marginLeft: 12}];

const amenityDistanceValue = v => {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, v);
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.max(0, n);
  }
  return 0;
};

export const GeneralDetails = ({
  amenities,
  toggleAmenity,
  setAmenityQuantity,
  amenitiesData,
  optionSecondValues,
  setOptionSecondValue,
  counterData,
}) => {
  const safeSetOptionSecondValue = typeof setOptionSecondValue === 'function' ? setOptionSecondValue : () => {};
  const hasCounterFields = Array.isArray(counterData) && counterData.length > 0;
  const amenityList = amenitiesData || [];
  const amenityValues = amenities || {};

  return (
    <FormContainer>
      {hasCounterFields ? (
        <>
          <span className={styles.gdSectionHeading}>פרטים כלליים</span>
          {counterData.map((counter, index) => (
            <div key={counter.title || String(index)}>
              <CountUpdate
                title={counter.title}
                count={counter.value ?? counter.count ?? 0}
                setCount={counter.setCount}
                isLast
                isDivider={false}
                isArea={counter.isArea}
                min={counter.min}
                variant="figmaOffice"
                containerStyle={{marginBottom: 0}}
              />
              {index < counterData.length - 1 ? <Divider style={counterSeparator} /> : null}
            </div>
          ))}
          {amenityList.length > 0 ? <Divider style={beforeAmenities} /> : null}
        </>
      ) : (
        <Title text="פרטים כלליים" />
      )}

      {amenityList.map((amenity, index) => {
        const amenityKey = amenity?.title || amenity;
        const isSelected = !!amenityValues[amenityKey];
        const hasOption = amenity?.option?.length > 0;
        const hasDistance = amenity?.distance;
        const hasOptionSecond = amenity?.optionSecond?.option?.length > 0;
        const optionSecondKey = amenity?.optionSecond?.title || amenityKey;
        const quantity = hasOption ? amenityValues[amenityKey] || 0 : null;
        const isNotLastIndex = index !== amenityList.length - 1;
        return (
          <div key={amenityKey}>
            <RadioWithText
              isNotLastIndex={isNotLastIndex}
              title={amenityKey}
              name={amenityKey}
              setName={toggleAmenity}
              index={index}
              isSelected={isSelected}
              useFigmaStyleIcon
              styleDevider={{marginTop: 20}}>
              {hasOption && isSelected && (
                <div className={styles.gdQuantitySelector}>
                  {amenity.option.map(qty => (
                    <AmenityQuantityPill
                      key={qty}
                      qty={qty}
                      selected={quantity === qty}
                      onPress={() => setAmenityQuantity(amenityKey, qty)}
                      style={amenityQuantityButton}
                      inactiveBorderColor="#8C85B3"
                    />
                  ))}
                </div>
              )}

              {hasOptionSecond && isSelected && (
                <div className={styles.gdOptionSecond}>
                  <Title text={amenity.optionSecond.title} />
                  <RadioButton
                    data={amenity.optionSecond.option.map(opt => ({name: opt, title: opt}))}
                    condition={optionSecondValues?.[optionSecondKey] || ''}
                    setCondition={value => safeSetOptionSecondValue(optionSecondKey, value)}
                  />
                </div>
              )}

              {hasDistance && isSelected && (
                <div className={styles.gdOptionSecond}>
                  <Title
                    text={
                      typeof amenity?.distance === 'string' && amenity.distance.trim() ? amenity.distance : 'גודל מרפסת'
                    }
                    textStyle={inputLabel}
                  />
                  <CountUpdate
                    isArea
                    count={amenityDistanceValue(amenityValues[amenityKey])}
                    setCount={val => setAmenityQuantity(amenityKey, Math.max(0, Number(val) || 0))}
                    isDivider={false}
                    isLast
                    counterInputStyle={{marginBottom: 0}}
                  />
                </div>
              )}
            </RadioWithText>
          </div>
        );
      })}
    </FormContainer>
  );
};
