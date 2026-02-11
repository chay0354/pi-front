import React from 'react';
import {StyleSheet, View, Image} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';

export const RadioIcon = ({isSelected}) => {
  return (
    <View style={styles.radioButton}>
      {isSelected && (
        <LinearGradient
          colors={['#FEE787', '#BD9947', '#9C6522']}
          locations={[0.0456, 0.5076, 0.8831]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.radioButtonGradient}>
          <Image
            source={require('../../assets/checkbox-selected.png')}
            style={styles.radioButtonSelected}
            resizeMode="contain"
          />
        </LinearGradient>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  radioButtonGradient: {
    width: 23,
    height: 23,
    borderRadius: 11.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCA447',
    backgroundColor: '#27262F',
  },
  radioButtonSelected: {
    width: 17,
    height: 17,
  },
});
