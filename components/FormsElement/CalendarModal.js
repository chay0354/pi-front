import React from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import {Calendar, LocaleConfig} from 'react-native-calendars';
import {Colors, Spacing, BorderRadius, FontSizes} from '../../constants/styles';

// Hebrew locale for react-native-calendars
LocaleConfig.locales['he'] = {
  monthNames: [
    'ינואר',
    'פברואר',
    'מרץ',
    'אפריל',
    'מאי',
    'יוני',
    'יולי',
    'אוגוסט',
    'ספטמבר',
    'אוקטובר',
    'נובמבר',
    'דצמבר',
  ],
  monthNamesShort: [
    'ינו',
    'פבר',
    'מרץ',
    'אפר',
    'מאי',
    'יונ',
    'יול',
    'אוג',
    'ספט',
    'אוק',
    'נוב',
    'דצמ',
  ],
  dayNames: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'],
  dayNamesShort: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'],
  today: 'היום',
};
LocaleConfig.defaultLocale = 'he';

export const CalendarModal = ({visible, onClose, onSelect}) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}>
        <View style={styles.container}>
          <Calendar
            // show Hebrew labels and start week on Sunday
            firstDay={0}
            monthFormat={'MMMM yyyy'}
            onDayPress={day => {
              if (onSelect) onSelect(day.dateString);
              if (onClose) onClose();
            }}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
    paddingTop: Spacing.m2,
  },
});
