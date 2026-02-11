import React from 'react';
import {StyleSheet, Text, View, TouchableOpacity, Image} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Colors} from '../../constants/styles';

export const RadioButton = ({data, condition, setCondition}) => {
  return (
    <View style={[styles.purposeButtons, {gap: data.length > 2 ? 5 : 10}]}>
      {data.map((item, index) => {
        return (
          <TouchableOpacity
            key={index}
            onPress={() => setCondition(item.name)}
            style={styles.purposeButtonContainer}>
            {condition === item.name ? (
              <LinearGradient
                colors={['#FEE787', '#BD9947', '#9C6522']}
                locations={[0.0456, 0.5076, 0.8831]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={[styles.purposeButton, styles.purposeButtonSelected]}>
                <Text style={styles.purposeButtonTextSelected}>
                  {item.title}
                </Text>
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
              </LinearGradient>
            ) : (
              <View style={styles.purposeButton}>
                <Text style={styles.purposeButtonText}>{item.title}</Text>
                <View style={styles.radioButton}>
                  {false && <View style={styles.radioButtonSelected} />}
                </View>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  purposeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginVertical: 5,
  },
  purposeButtonContainer: {
    flex: 1,
  },
  purposeButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    // paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#4D4966',
  },
  purposeButtonSelected: {
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  purposeButtonText: {
    color: Colors.whiteGeneral,
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    marginRight: 10,
  },
  purposeButtonTextSelected: {
    color: Colors.black,
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    marginRight: 10,
  },
  radioButtonGradient: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCA447',
    backgroundColor: '#27262F',
    position: 'absolute',
    right: 6,
  },
  radioButtonSelected: {
    width: 17,
    height: 17,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4D4966',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    position: 'absolute',
    right: 6,
  },
});
