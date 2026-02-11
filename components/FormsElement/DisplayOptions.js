import React from 'react';
import {StyleSheet, Text, View, TouchableOpacity, Image} from 'react-native';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioIcon} from './RadioIcon';
import {Colors} from '../../constants/styles';

export const DisplayOptions = ({displayOption, setDisplayOption}) => {
  return (
    <FormContainer>
      <Title text={'בחרו אפשרויות תצוגה נוספות'} />
      <View style={styles.displayOptions}>
        <TouchableOpacity
          style={styles.displayOption}
          onPress={() =>
            setDisplayOption(displayOption === 'collage' ? null : 'collage')
          }>
          <View style={styles.displayOptionContent}>
            <Text style={styles.displayOptionTitle}>קולאז'</Text>
            <View style={styles.radioSpacer} />
            <RadioIcon isSelected={displayOption === 'collage'} />
          </View>
          <Image
            source={require('../../assets/Frame1261158884.png')}
            style={styles.displayOptionImage}
            resizeMode="cover"
          />
          <Text style={styles.displayOptionSubtitle}>תצוגה משולבת</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.displayOption}
          onPress={() =>
            setDisplayOption(displayOption === 'slideshow' ? null : 'slideshow')
          }>
          <View style={styles.displayOptionContent}>
            <Text style={styles.displayOptionTitle}>מצגת</Text>
            <View style={styles.radioSpacer} />
            <RadioIcon isSelected={displayOption === 'slideshow'} />
          </View>
          <Image
            source={require('../../assets/Frame1261158883.png')}
            style={styles.displayOptionImage}
            resizeMode="cover"
          />
          <Text style={styles.displayOptionSubtitle}>תמונות מתחלפות</Text>
        </TouchableOpacity>
      </View>
    </FormContainer>
  );
};

const styles = StyleSheet.create({
  displayOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  displayOption: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 25,
  },
  displayOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
    justifyContent: 'center',
  },
  displayOptionTitle: {
    color: Colors.whiteGeneral,
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
  },
  displayOptionImage: {
    height: 100,
    marginBottom: 15,
  },
  displayOptionSubtitle: {
    color: '#D2D0DC',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
  },
  radioSpacer: {
    width: 15,
  },
});
