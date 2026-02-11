import {StyleSheet, View} from 'react-native';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioWithText} from './RadioWithText';

export const ServiceAndFacility = ({
  propertyType,
  setPropertyType,
  data = [],
  title,
}) => {
  return (
    <FormContainer>
      <Title
        text={title || 'סוג הנכס'}
        required
        textStyle={{marginBottom: 0}}
      />
      <View>
        {data.map((item, index) => {
          const isNotLastIndex = index !== data.length - 1;
          return (
            <RadioWithText
              key={index}
              isNotLastIndex={isNotLastIndex}
              title={item.title}
              name={item.name}
              setName={setPropertyType}
              index={index}
              isSelected={item.name === propertyType}
            />
          );
        })}
      </View>
    </FormContainer>
  );
};

const styles = StyleSheet.create({});
