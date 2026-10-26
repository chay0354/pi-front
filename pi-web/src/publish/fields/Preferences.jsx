import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioButton} from './RadioButton';
import {Divider} from './Divider';
import {AgeRangeSlider} from './AgeRangeSlider';
import {RadioWithText} from './RadioWithText';

const PREFERENCES_DATA = [
  {name: 'nonSmokers', title: 'ללא מעשנים'},
  {name: 'students', title: 'סטודנטים'},
  {name: 'stableJob', title: 'בעלי עבודה מסודרת'},
  {name: 'occasionalJob', title: 'בעלי עבודה מזדמנת'},
  {name: 'immediateEntry', title: 'כניסה מיידית'},
];

export const Preferences = ({
  preferences,
  setPreferences,
  preferredGender,
  setPreferredGender,
  preferredAgeMin,
  setPreferredAgeMin,
  preferredAgeMax,
  setPreferredAgeMax,
}) => {
  const values = preferences || {};
  return (
    <FormContainer>
      <Title text="העדפות" />
      <Title text="מין" />
      <RadioButton
        data={[
          {name: 'female', title: 'אישה'},
          {name: 'male', title: 'גבר'},
        ]}
        condition={preferredGender}
        setCondition={setPreferredGender}
      />
      <Divider style={{marginVertical: 20}} />

      <AgeRangeSlider
        minValue={preferredAgeMin}
        maxValue={preferredAgeMax}
        onMinChange={setPreferredAgeMin}
        onMaxChange={setPreferredAgeMax}
      />

      <div>
        {PREFERENCES_DATA.map((item, index) => (
          <RadioWithText
            key={index}
            isNotLastIndex={index !== PREFERENCES_DATA.length - 1}
            title={item.title}
            name={item.name}
            setName={name => setPreferences?.({...values, [name]: !values[name]})}
            index={index}
            isSelected={values[item.name]}
          />
        ))}
      </div>
    </FormContainer>
  );
};
