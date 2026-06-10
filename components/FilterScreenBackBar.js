import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';

const DIVIDER = '#373548';

/**
 * Top back control for TikTok bottom filter sheets (replaces center drag handle).
 */
const FilterScreenBackBar = ({onClose}) => (
  <View style={styles.wrap}>
    <View style={styles.titleRow}>
      <TouchableOpacity
        onPress={onClose}
        activeOpacity={0.85}
        style={styles.backButton}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="חזרה">
        <MaterialCommunityIcons
          name="chevron-left"
          size={28}
          color="#FFFFFF"
        />
      </TouchableOpacity>
      <View style={styles.titleSpacer} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 4,
  },
  titleRow: {
    minHeight: 44,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSpacer: {
    flex: 1,
  },
});

export default FilterScreenBackBar;
