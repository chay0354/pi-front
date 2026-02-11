import {StyleSheet, Text, View} from 'react-native';
import React from 'react';
import {Title} from './Title';
import {InputBox} from './InputBox';
import {TextAreaBox} from './TextAreaBox';

export const AdditionalDetails = ({description, setDescription}) => {
  return (
    <View style={styles.container}>
      <Title text={'פרטים נוספים'} />
      <TextAreaBox
        value={description}
        setValue={setDescription}
        title={'פרטים נוספים'}
        required={true}
        placeholder={'כתוב תיאור'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
});
