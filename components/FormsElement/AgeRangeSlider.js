import {StyleSheet, Text, View} from 'react-native';
import {Title} from './Title';

export const AgeRangeSlider = () => {
  return (
    <View>
      <Title text={'גיל מועדף'} />
      {/* <AgeRangeSlider
              minValue={preferredAgeMin}
              maxValue={preferredAgeMax}
              onMinChange={setPreferredAgeMin}
              onMaxChange={setPreferredAgeMax}
            /> */}
    </View>
  );
};

const styles = StyleSheet.create({});
