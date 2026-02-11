import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {Colors} from '../../constants/styles';

export const Title = ({
  text = '',
  required = false,
  textStyle = {},
  starStyle,
}) => {
  return (
    <Text style={[styles.title, textStyle]}>
      {text}
      {required && <Text style={[styles.star, starStyle]}>*</Text>}
    </Text>
  );
};

const styles = StyleSheet.create({
  title: {
    color: Colors.whiteGeneral,
    fontSize: 18,
    marginBottom: 15,
    fontFamily: 'Rubik-Regular',
    alignSelf: 'flex-end',
  },
  star: {
    color: Colors.yellowIcons,
  },
});
