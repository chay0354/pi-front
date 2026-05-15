import React from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ACCESSIBILITY_STATEMENT_HEBREW} from './accessibilityStatementContent';

/**
 * הצהרת נגישות — black text on white background, RTL Hebrew.
 */
const AccessibilityStatementScreen = ({onClose}) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, {writingDirection: 'rtl'}]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {paddingTop: insets.top + 8},
        ]}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.backBtn}
            hitSlop={12}>
            <Text style={styles.backChevron}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={2}>
            הצהרת נגישות — פאי 2701
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={styles.body}>{ACCESSIBILITY_STATEMENT_HEBREW}</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backChevron: {
    fontSize: 28,
    color: '#000000',
    fontWeight: '300',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  headerSpacer: {
    width: 40,
  },
  body: {
    color: '#000000',
    fontSize: 15,
    lineHeight: 24,
    textAlign: "left",
    writingDirection: 'rtl',
    backgroundColor: '#ffffff',
  },
});

export default AccessibilityStatementScreen;
