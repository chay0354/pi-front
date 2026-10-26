import {useState} from 'react';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioWithText} from './RadioWithText';
import {CountUpdate} from './CountUpdate';
import styles from './fields.module.css';

export const ProposedLand = ({unit: unitProp, setUnit: setUnitProp, area: areaProp, setArea: setAreaProp}) => {
  const [unitLocal, setUnitLocal] = useState('dunam');
  const [valueLocal, setValueLocal] = useState(0.5);
  const unit = unitProp ?? unitLocal;
  const value = areaProp ?? valueLocal;
  const setUnit = setUnitProp ?? setUnitLocal;
  const setValue = setAreaProp ?? setValueLocal;

  return (
    <FormContainer>
      <Title text="קרקע מוצעת" required />
      <div className={styles.plRadioRow}>
        <span className={styles.landSubLabel} style={{marginInlineEnd: 16}}>
          שטח הקרקע *
        </span>
        <div dir="ltr" className={styles.landUnitRow}>
          <RadioWithText
            key={1}
            isNotLastIndex={false}
            title={'מ"ר'}
            name="sqm"
            setName={setUnit}
            index={1}
            isSelected={unit === 'sqm'}
            inline
            radioOptionStyle={{paddingTop: 0}}
          />
          <RadioWithText
            key={0}
            isNotLastIndex={false}
            title="דונם"
            name="dunam"
            setName={setUnit}
            index={0}
            isSelected={unit === 'dunam'}
            inline
            radioOptionStyle={{paddingTop: 0}}
            containerStyle={{marginLeft: 20}}
          />
        </div>
      </div>

      <CountUpdate count={value} setCount={setValue} isLast isDivider={false} counterInputStyle={{marginBottom: 0}} />
    </FormContainer>
  );
};
