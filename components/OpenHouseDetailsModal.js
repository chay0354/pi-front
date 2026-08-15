import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {MaterialCommunityIcons} from '@expo/vector-icons';

/**
 * Shown after the user taps פרסם on a בית פתוח post — collects place + date.
 */
const OpenHouseDetailsModal = ({
  visible,
  initialPlace = '',
  initialDate = '',
  onCancel,
  onConfirm,
  submitting = false,
}) => {
  const insets = useSafeAreaInsets();
  const [place, setPlace] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    if (!visible) return;
    setPlace(String(initialPlace || '').trim());
    setDate(String(initialDate || '').trim());
  }, [visible, initialPlace, initialDate]);

  const handleConfirm = () => {
    if (submitting) return;
    onConfirm?.({place: place.trim(), date: date.trim()});
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onCancel}
        />
        <View
          style={[
            styles.card,
            {marginTop: Math.max(insets.top, 16) + 12},
          ]}>
          <Text style={styles.title}>פרטי בית פתוח</Text>
          <Text style={styles.subtitle}>
            הזינו מיקום ותאריך — יוצגו על הפוסט בפיד
          </Text>

          <Text style={styles.label}>שם / מיקום</Text>
          <TextInput
            style={styles.input}
            placeholder=""
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={place}
            onChangeText={setPlace}
            editable={!submitting}
            textAlign="right"
            writingDirection="rtl"
            returnKeyType="next"
          />

          <Text style={styles.label}>תאריך</Text>
          <TextInput
            style={styles.input}
            placeholder=""
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={date}
            onChangeText={setDate}
            editable={!submitting}
            textAlign="right"
            writingDirection="rtl"
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              disabled={submitting}
              activeOpacity={0.85}>
              <Text style={styles.cancelText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                (!place.trim() || !date.trim() || submitting) &&
                  styles.confirmBtnDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!place.trim() || !date.trim() || submitting}
              activeOpacity={0.85}>
              <Text style={styles.confirmText}>המשך לפרסום</Text>
              <MaterialCommunityIcons name="chevron-left" size={22} color="#1E1D27" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#2B2A39',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,196,10,0.35)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 26,
    fontFamily: 'Rubik-Medium',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 6,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 18,
  },
  label: {
    color: '#FFC40A',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Rubik-Medium',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#1E1D27',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#8C85B3',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  cancelText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontFamily: 'Rubik-Regular',
  },
  confirmBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFC40A',
    borderRadius: 1000,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  confirmBtnDisabled: {
    opacity: 0.45,
  },
  confirmText: {
    color: '#1E1D27',
    fontSize: 15,
    fontFamily: 'Rubik-Medium',
  },
});

export default OpenHouseDetailsModal;
