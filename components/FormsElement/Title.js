import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors} from '../../constants/styles';
import {formLabelRowStyle, textAlign} from '../../utils/rtlLayout';

export const Title = ({
  text = '',
  required = false,
  textStyle = {},
  starStyle,
}) => {
  const {marginBottom, ...titleTextStyle} = textStyle || {};
  return (
    <View
      style={[
        styles.row,
        formLabelRowStyle,
        marginBottom != null ? {marginBottom} : null,
      ]}>
      <Text
        style={[styles.title, {textAlign}, titleTextStyle]}
        numberOfLines={1}>
        {text}
      </Text>
      {required ? (
        <Text style={[styles.star, starStyle]} numberOfLines={1}>
          *
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    marginBottom: 20,
    maxWidth: '100%',
  },
  title: {
    color: Colors.whiteGeneral,
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    flexShrink: 1,
  },
  star: {
    color: Colors.yellowIcons,
    flexShrink: 0,
  },
});
