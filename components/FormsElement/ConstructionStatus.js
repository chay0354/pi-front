import {StyleSheet, View} from 'react-native';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioWithText} from './RadioWithText';

export const ConsructionStatus = ({
  consructionStatus,
  setConsructionStatus,
  data = [],
  title,
}) => {
  return (
    <FormContainer>
      <Title
        text={title || 'מצב בניה'}
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
              setName={setConsructionStatus}
              index={index}
              isSelected={item.name === consructionStatus}
            />
          );
        })}
      </View>
    </FormContainer>
  );
};

const styles = StyleSheet.create({});
