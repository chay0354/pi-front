import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  I18nManager,
  Image,
} from 'react-native';
import {Divider} from './Divider';
import {Colors} from '../../constants/styles';
import {RadioIcon} from './RadioIcon';
import {flexStart, hebrewTextAlign} from '../../utils/rtlLayout';

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
  /** Optional amenity / facility PNG shown between the check and the label */
  leftIcon,
  /** Compact row chip (e.g. מ״ר / דונם) — do not stretch to 100% width. */
  inline = false,
}) => {
  const rowJustify = flexStart;
  return (
    <View key={index} style={[inline && styles.inlineWrap, containerStyle]}>
      <TouchableOpacity
        style={[
          styles.radioOption,
          inline && styles.radioOptionInline,
          {justifyContent: rowJustify},
          {paddingBottom: isNotLastIndex && !children ? 20 : 0},
          radioOptionStyle,
          Platform.OS === 'web' && {cursor: 'pointer'},
        ]}
        onPress={() => setName(name)}
        onLongPress={onLongPress}
        delayLongPress={450}
        activeOpacity={0.7}>
        <RadioIcon isSelected={isSelected} useFigmaStyle={useFigmaStyleIcon} />
        {leftIcon ? (
          <Image
            source={leftIcon}
            style={styles.leftIcon}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.radioSpacer, radioSpacerStyle]} />
        )}
        <Text
          style={[
            styles.radioOptionText,
            inline && styles.radioOptionTextInline,
            {textAlign: hebrewTextAlign, writingDirection: 'rtl'},
          ]}>
          {title}
          {isRequired && <Text style={styles.requiredStar}>*</Text>}
        </Text>
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
    width: '100%',
  },
  inlineWrap: {
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'center',
  },
  radioOptionInline: {
    width: undefined,
    alignSelf: 'flex-start',
    paddingTop: 0,
  },
  radioOptionText: {
    color: Colors.whiteGeneral,
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    flex: 1,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  radioOptionTextInline: {
    flex: 0,
    flexShrink: 0,
    flexWrap: 'nowrap',
  },
  radioSpacer: {
    width: 8,
  },
  leftIcon: {
    width: 28,
    height: 28,
    marginLeft: 8,
    marginRight: 8,
  },
  requiredStar: {
    color: Colors.yellowIcons,
  },
});
