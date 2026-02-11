import {StyleSheet, View} from 'react-native';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioWithText} from './RadioWithText';

export const ApartmentType = ({
  preferredApartmentType,
  setPreferredApartmentType,
}) => {
  const apartmentTypes = [
    {name: 'regular', title: 'דירה רגילה'},
    {name: 'studio', title: 'דירת סטודיו'},
    {name: 'garden', title: 'דירת גן'},
    {name: 'duplex', title: 'דופלקס'},
    {name: 'penthouse', title: 'נטהאוז'},
    {name: 'private', title: 'בית פרטי'},
  ];
  return (
    <FormContainer>
      <Title text="סוג דירת השותפים המועדף" required />
      <View>
        {apartmentTypes.map((item, index) => {
          const isNotLastIndex = index !== apartmentTypes.length - 1;
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
