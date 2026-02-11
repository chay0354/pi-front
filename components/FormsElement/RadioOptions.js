import {StyleSheet, View} from 'react-native';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioWithText} from './RadioWithText';

export const RadioOptions = ({
  data = [],
  title,
  selectedValue,
  onChange = () => {},
}) => {
  const optionWidth = `${100 / (data.length || 1)}%`;

  return (
    <FormContainer>
      <Title text={title} required />
      <View style={styles.optionsContainer}>
        {data.map((item, index) => {
          const value = item.value ?? item.title;
          return (
            <RadioWithText
              key={index}
              isNotLastIndex={false}
              title={item.title}
              name={value}
              setName={() => onChange(value)}
              index={index}
              isSelected={selectedValue === value}
              radioOptionStyle={{paddingTop: 0}}
              containerStyle={{width: optionWidth}}
            />
          );
        })}
      </View>
    </FormContainer>
  );
};

const styles = StyleSheet.create({
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
