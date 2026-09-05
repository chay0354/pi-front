import {StyleSheet, View} from 'react-native';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioWithText} from './RadioWithText';
import {BNB_SERVICE_ICONS} from '../../utils/bnbServiceIcons';

export const ServiceAndFacility = ({
  facilities = {},
  toggleFacility,
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
          const isSelected = Boolean(facilities[item.name]);
          return (
            <RadioWithText
              key={item.name}
              isNotLastIndex={isNotLastIndex}
              title={item.title}
              name={item.name}
              setName={toggleFacility}
              index={index}
              isSelected={isSelected}
              useFigmaStyleIcon
              leftIcon={BNB_SERVICE_ICONS[item.name]}
              styleDevider={{marginTop: 20}}
            />
          );
        })}
      </View>
    </FormContainer>
  );
};

const styles = StyleSheet.create({});
