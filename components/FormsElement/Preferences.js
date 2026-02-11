import {StyleSheet, View} from 'react-native';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioButton} from './RadioButton';
import {Divider} from './Divider';
import {AgeRangeSlider} from './AgeRangeSlider';
import {RadioWithText} from './RadioWithText';

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
  const prefrencesData = [
    {name: 'nonSmokers', title: 'ללא מעשנים'},
    {name: 'students', title: 'סטודנטים'},
    {name: 'stableJob', title: 'בעלי עבודה מסודרת'},
    {name: 'occasionalJob', title: 'בעלי עבודה מזדמנת'},
    {name: 'immediateEntry', title: 'כניסה מיידית'},
  ];
  return (
    <FormContainer>
      <Title text="העדפות" />
      {/* Gender */}
      <Title text={'מין'} />
      <RadioButton
        data={[
          {name: 'female', title: 'אישה'},
          {name: 'male', title: 'גבר'},
        ]}
        condition={preferredGender}
        setCondition={setPreferredGender}
      />
      <Divider style={{marginVertical: 20}} />

      {/* Age Range */}
      {/* TODO */}
      <AgeRangeSlider />

      {/* Checkboxes */}
      <View style={styles.preferenceSection}>
        {prefrencesData.map((item, index) => {
          const isNotLastIndex = index !== prefrencesData.length - 1;
          return (
            <RadioWithText
              key={index}
              isNotLastIndex={isNotLastIndex}
              title={item.title}
              name={item.name}
              setName={name =>
                setPreferences({
                  ...preferences,
                  [name]: !preferences[name],
                })
              }
              index={index}
              isSelected={preferences[item.name]}
            />
          );
        })}
      </View>
    </FormContainer>
  );
};

const styles = StyleSheet.create({});
