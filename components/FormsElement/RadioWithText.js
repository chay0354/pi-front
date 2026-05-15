import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  I18nManager,
} from 'react-native';
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
  const rowJustify = 'flex-end';
  return (
    <View key={index} style={containerStyle}>
      <TouchableOpacity
        style={[
          styles.radioOption,
          {justifyContent: rowJustify},
          {paddingBottom: isNotLastIndex && !children ? 20 : 0},
          radioOptionStyle,
          Platform.OS === 'web' && {cursor: 'pointer'},
        ]}
        onPress={() => setName(name)}
        onLongPress={onLongPress}
        delayLongPress={450}
        activeOpacity={0.7}>
        <Text style={[styles.radioOptionText, {textAlign:'left'}]}>
          {title}
          {isRequired && <Text style={styles.requiredStar}>*</Text>}
        </Text>
        <View style={[styles.radioSpacer, radioSpacerStyle]} />
        <RadioIcon isSelected={isSelected} useFigmaStyle={useFigmaStyleIcon} />
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
    paddingTop: 20,
  },
  radioOptionText: {
    color: Colors.whiteGeneral,
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
  },
  radioSpacer: {
    width: 8,
  },
  requiredStar: {
    color: Colors.yellowIcons,
  },
});
