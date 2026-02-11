import {StyleSheet, Text, View} from 'react-native';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import { RadioWithText } from './RadioWithText';

export const HospitalityNature = ({
  preferredApartmentType,
  setPreferredApartmentType,
}) => {
  const hospitalityNatureData = [
    {name: 'landscapes', title: 'נופים'},
    {name: 'on_the_beach', title: 'על הים'},
    {name: 'with_pool', title: 'עם בריכה'},
    {name: 'nature', title: 'טבע'},
    {name: 'special', title: 'מיוחדים'},
    {name: 'rural', title: 'כפרי'},
    {name: 'desert', title: 'מדבר'},
  ];
  return (
    <FormContainer>
      <Title text="אופי האירוח" required />
      <View>
        {hospitalityNatureData.map((item, index) => {
          const isNotLastIndex = index !== hospitalityNatureData.length - 1;
          return (
            <RadioWithText
              key={index}
              isNotLastIndex={isNotLastIndex}
              title={item.title}
              name={item.name}
              setName={setPreferredApartmentType}
              index={index}
              isSelected={preferredApartmentType === item.name}
            />
          );
        })}
      </View>
    </FormContainer>
  );
};

const styles = StyleSheet.create({});
