import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {flexStart} from '../utils/rtlLayout';

/** Physical right under force-RTL + swapLeftAndRightInRTL on native. */
const hebrewTextAlign = Platform.OS === 'web' ? 'right' : 'left';

/** Figma file 7 — node 2:238701 (מגירת צור מודעה). */
const FIGMA = {
  bg: '#2B2A39',
  handle: '#464646',
  title: '#FFFFFF',
  subtitle: '#D2D0DC',
  divider: 'rgba(255,255,255,0.12)',
  radius: 12,
  pt: 16,
  pb: 28,
  sectionGap: 20,
  optionPx: 16,
  optionPy: 20,
  contentGap: 16,
  textGap: 12,
  handleW: 40,
  handleH: 5,
  handleRadius: 3,
  iconSize: 40,
  arrowSize: 24,
  dividerWidth: 366,
};

export const CREATE_SHEET_POST_ICON = require('../assets/ad-uplaud/posts.png');

export function CreateAdSheetDivider() {
  return <View style={styles.divider} />;
}

export function CreateAdSheetRow({
  title,
  subtitle,
  iconSource,
  onPress,
  activeOpacity = 0.85,
}) {
  return (
    <TouchableOpacity
      style={styles.optionWrap}
      onPress={onPress}
      activeOpacity={activeOpacity}
      accessibilityRole="button">
      <View style={styles.optionRow}>
        <MaterialCommunityIcons
          name="chevron-left"
          size={FIGMA.arrowSize}
          color={FIGMA.title}
          style={styles.arrow}
        />
        <View style={styles.contentGroup}>
          <View style={styles.textColumn}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <Image source={iconSource} style={styles.icon} resizeMode="contain" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Bottom drawer for "צור מודעה" — Figma node 2:238701.
 */
export function CreateAdSheet({
  children,
  style,
  handlePanHandlers,
  bottomInset,
}) {
  const insets = useSafeAreaInsets();
  const safeBottom = bottomInset ?? insets.bottom;
  /**
   * The host is anchored to the true screen bottom (`bottom: 0`), which on
   * Android edge-to-edge sits under the nav bar. Add the safe-area inset to the
   * Figma bottom padding so the gray sheet fills behind the nav buttons while the
   * last row stays above them. iOS/web keep the standard safe-area padding.
   */
  const sheetPaddingBottom =
    safeBottom > 0 ? FIGMA.pb + safeBottom : FIGMA.pb;

  return (
    <View style={[styles.sheet, {paddingBottom: sheetPaddingBottom}, style]}>
      <View style={styles.sections}>
        <View style={styles.handleWrap} {...(handlePanHandlers || {})}>
          <View style={styles.handle} />
        </View>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: FIGMA.bg,
    borderTopLeftRadius: FIGMA.radius,
    borderTopRightRadius: FIGMA.radius,
    paddingTop: FIGMA.pt,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 414,
    alignSelf: 'center',
    ...Platform.select({
      web: {boxSizing: 'border-box'},
      default: {},
    }),
  },
  handleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: FIGMA.handleW,
    height: FIGMA.handleH,
    borderRadius: FIGMA.handleRadius,
    backgroundColor: FIGMA.handle,
  },
  sections: {
    width: '100%',
    gap: FIGMA.sectionGap,
  },
  optionWrap: {
    paddingHorizontal: FIGMA.optionPx,
    paddingVertical: FIGMA.optionPy,
    width: '100%',
  },
  // Same row pattern as the legacy TikTok bottomSheetOption (row-reverse under
  // force-RTL → chevron left, icon right, text block between them).
  optionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  contentGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: FIGMA.contentGap,
    flex: 1,
    minWidth: 0,
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
    alignItems: flexStart,
    gap: FIGMA.textGap,
  },
  title: {
    color: FIGMA.title,
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
    lineHeight: 22,
    width: '100%',
    alignSelf: 'stretch',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
  },
  subtitle: {
    color: FIGMA.subtitle,
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.5447,
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
    width: '100%',
    alignSelf: 'stretch',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
  },
  icon: {
    width: FIGMA.iconSize,
    height: FIGMA.iconSize,
    flexShrink: 0,
  },
  arrow: {
    flexShrink: 0,
  },
  divider: {
    height: 1,
    backgroundColor: FIGMA.divider,
    width: '100%',
    maxWidth: FIGMA.dividerWidth,
    alignSelf: 'center',
  },
});

export default CreateAdSheet;
