import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors} from '../constants/styles';
import {flexEnd} from '../utils/rtlLayout';

/**
 * Polished notice when publish is blocked by missing required fields (ad upload flows).
 */
const PublishValidationModal = ({
  visible,
  onClose,
  messages = [],
  title = 'חסרים שדות חובה',
  subtitle = 'לפני הפרסום השלימו את הפרטים הבאים:',
}) => {
  const insets = useSafeAreaInsets();
  const {height: winH} = useWindowDimensions();
  const listMaxH = Math.min(winH * 0.42, 320);

  return (
    <Modal
      visible={visible && messages.length > 0}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}>
      <Pressable
        style={[
          styles.backdrop,
          {paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12},
        ]}
        onPress={onClose}
        accessibilityLabel="סגור">
        <Pressable
          style={styles.card}
          onPress={e => e.stopPropagation?.()}
          accessible={false}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons
              name="clipboard-alert-outline"
              size={36}
              color={Colors.yellowIcons}
            />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <ScrollView
            style={[styles.listScroll, {maxHeight: listMaxH}]}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={messages.length > 6}
            keyboardShouldPersistTaps="handled">
            {messages.map((msg, i) => (
              <View
                key={`${i}-${String(msg).slice(0, 24)}`}
                style={[styles.row, {alignItems: flexEnd}]}>
                <Text style={styles.bullet} accessibilityElementsHidden>
                  •
                </Text>
                <Text style={[styles.itemText, {textAlign: 'left'}]}>
                  {msg}
                </Text>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.88}
            style={[
              styles.btnOuter,
              Platform.OS === 'web' && {cursor: 'pointer'},
            ]}
            accessibilityRole="button"
            accessibilityLabel="הבנתי">
            <LinearGradient
              colors={['#FFE56A', '#F7C63A', '#E5A80F']}
              locations={[0.0456, 0.5076, 0.8831]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.btnGradient}>
              <Text style={styles.btnText}>הבנתי</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#2B2A39',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  iconCircle: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 196, 10, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    color: Colors.whiteGeneral,
    fontSize: 20,
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(210,208,220,0.88)',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 20,
  },
  listScroll: {
    alignSelf: 'stretch',
    marginBottom: 18,
  },
  listContent: {
    paddingVertical: 4,
    gap: 10,
  },
  row: {
    flexDirection: 'row-reverse',
    gap: 10,
    paddingVertical: 2,
  },
  bullet: {
    color: Colors.yellowIcons,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 1,
    fontFamily: 'Rubik-Bold',
  },
  itemText: {
    flex: 1,
    color: Colors.whiteGeneral,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
  },
  btnOuter: {
    alignSelf: 'stretch',
    borderRadius: 12,
    overflow: 'hidden',
  },
  btnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#1a1820',
    fontSize: 17,
    fontFamily: 'Rubik-Medium',
  },
});

export default PublishValidationModal;
