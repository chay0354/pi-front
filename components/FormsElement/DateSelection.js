import React, {useState} from 'react';
import {StyleSheet, Text, View, TouchableOpacity, Image} from 'react-native';
import {Title} from './Title';
import {Divider} from './Divider';
import {Colors, BorderRadius, FontSizes, Spacing} from '../../constants/styles';
import {CalendarModal} from './CalendarModal';

export const DateSelection = ({
  isDivider,
  date = '20.12.25',
  onPress,
  title,
  style,
}) => {
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState(date);

  const handleSelect = isoDate => {
    if (!isoDate) return;
    const parts = isoDate.split('-');
    if (parts.length !== 3) {
      setSelected(date);
    } else {
      const [y, m, d] = parts;
      const formatted = `${d}.${m}.${y.slice(2)}`;
      setSelected(formatted);
    }
    if (typeof onPress === 'function') onPress(isoDate);
  };

  return (
    <View style={style}>
      <Title text={title} required />
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setVisible(true)}
        style={styles.pillContainer}>
        <Text style={styles.dateText}>{selected}</Text>
        <Image
          source={require('../../assets/calendarIcon.png')}
          style={styles.icon}
        />
      </TouchableOpacity>
      {isDivider && <Divider style={styles.dividerGap} />}
      <CalendarModal
        visible={visible}
        onClose={() => setVisible(false)}
        onSelect={handleSelect}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#8C85B3',
    overflow: 'hidden',
  },
  dateText: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Rubik-Regular',
  },
  icon: {
    width: 24,
    height: 24,
    marginLeft: 10,
  },
  dividerGap: {
    marginTop: Spacing.m3,
  },
});
