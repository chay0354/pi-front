import {StyleSheet, Text, View, Image} from 'react-native';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioWithText} from './RadioWithText';
import {TouchableOpacity} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';

export const SaleAtPreSale = () => {
  return (
    <FormContainer>
      <Title text="מכירה בפריסייל" />
      <RadioWithText
        key={0}
        isNotLastIndex={false}
        title={'הוסף תגית מכירה ייעודית כדי להבליט את הפרויקט ולמשוך מתעניינים'}
        name={'pre-sale'}
        setName={() => {}}
        index={0}
        isSelected={false}
        containerStyle={{marginLeft: 20}}
        radioOptionStyle={{paddingTop: 0}}
      />
      <TouchableOpacity
        style={{
          marginTop: 20,
        }}>
        <LinearGradient
          colors={true ? ['#1E1D27', '#1E1D27'] : ['#FFBF3E', '#FFAA00']}
          locations={[0, 0.7]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.preSaleRadiant}>
          <Image
            source={require('../../assets/pre-sale.png')}
            style={{width: 93, height: 34, resizeMode: 'contain'}}
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
