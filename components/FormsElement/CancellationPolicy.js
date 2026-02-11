import {StyleSheet, Text, View, TouchableOpacity, Image} from 'react-native';
import {FormContainer} from './FormContainer';
import {RadioIcon} from './RadioIcon';
import {Title} from './Title';
import {Divider} from './Divider';
import {Colors} from '../../constants/styles';
import {RadioWithText} from './RadioWithText';

export const CancellationPolicy = ({
  cancellationPolicy,
  setCancellationPolicy,
  data = [],
  title,
}) => {
  return (
    <FormContainer>
      <Title text={title || 'מדיניות ביטולים'} textStyle={{marginBottom: 0}} />
      <View>
        {data.map((item, index) => {
          const isNotLastIndex = index !== data.length - 1;
          return (
            <RadioWithText
              key={index}
              isNotLastIndex={isNotLastIndex}
              title={item.title}
              name={item.name}
              setName={setCancellationPolicy}
              index={index}
              isSelected={item.name === cancellationPolicy}
            />
          );
        })}
      </View>
    </FormContainer>
  );
};

const styles = StyleSheet.create({
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 20,
  },
  radioOptionText: {
    color: Colors.whiteGeneral,
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
  },
  radioSpacer: {
    width: 15,
  },
});
