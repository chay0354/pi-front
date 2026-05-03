import React from 'react';
import {StyleSheet, Text, View, TouchableOpacity, Platform} from 'react-native';
import {Divider} from './Divider';
import {Colors} from '../../constants/styles';
import {RadioIcon} from './RadioIcon';

export const RadioWithText = ({
  isNotLastIndex,
  title,
  name,
  setName,
  index,
  isSelected,
  children,
  radioOptionStyle,
  styleDevider,
  containerStyle,
  radioSpacerStyle,
  isRequired,
  onLongPress,
  /** Figma/TikTok-style check — only פרטים כלליים / הפרויקט מציע accordions */
  useFigmaStyleIcon = false,
}) => {
  return (
    <View key={index} style={containerStyle}>
      <TouchableOpacity
        style={[
          styles.radioOption,
          {paddingBottom: isNotLastIndex && !children ? 20 : 0},
          radioOptionStyle,
          Platform.OS === 'web' && { cursor: 'pointer' },
        ]}
        onPress={() => setName(name)}
        onLongPress={onLongPress}
        delayLongPress={450}
        activeOpacity={0.7}>
        <Text style={styles.radioOptionText}>
          {title}
          {isRequired && <Text style={styles.requiredStar}>*</Text>}
        </Text>
        <View style={[styles.radioSpacer, radioSpacerStyle]} />
        <RadioIcon
          isSelected={isSelected}
          useFigmaStyle={useFigmaStyleIcon}
        />
      </TouchableOpacity>
      {children}
      {isNotLastIndex && <Divider style={styleDevider} />}
    </View>
  );
};

const styles = StyleSheet.create({
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 20,
  },
  radioOptionText: {
    color: Colors.whiteGeneral,
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  radioSpacer: {
    width: 8,
  },
  requiredStar: {
    color: Colors.yellowIcons,
  },
});
