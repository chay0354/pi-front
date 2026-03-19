import {StyleSheet, View, Image, TouchableOpacity, Platform} from 'react-native';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioWithText} from './RadioWithText';
import {LinearGradient} from 'expo-linear-gradient';

export const SaleAtPreSale = ({ value = false, onChange }) => {
  const isSelected = value === true;
  const handleToggle = () => {
    if (typeof onChange === 'function') onChange(!isSelected);
  };
  return (
    <FormContainer>
      <Title text="מכירה בפריסייל" />
      <TouchableOpacity
        onPress={handleToggle}
        activeOpacity={0.8}
        style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
      >
        <RadioWithText
          key={0}
          isNotLastIndex={false}
          title={'הוסף תגית מכירה ייעודית כדי להבליט את הפרויקט ולמשוך מתעניינים'}
          name={'pre-sale'}
          setName={handleToggle}
          index={0}
          isSelected={isSelected}
          containerStyle={{marginLeft: 20}}
          radioOptionStyle={{paddingTop: 0}}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={{ marginTop: 20 }}
        onPress={handleToggle}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isSelected ? ['#FFBF3E', '#FFAA00'] : ['#1E1D27', '#1E1D27']}
          locations={[0, 0.7]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.preSaleRadiant}>
          <Image
            source={require('../../assets/pre-sale.png')}
            style={{width: 93, height: 34}}
            resizeMode="contain"
          />
        </LinearGradient>
      </TouchableOpacity>
    </FormContainer>
  );
};

const styles = StyleSheet.create({
  preSaleRadiant: {
    height: 57,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
