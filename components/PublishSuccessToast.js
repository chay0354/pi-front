import React, {useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import {SvgXml} from 'react-native-svg';

const AUTO_DISMISS_MS = 4500;

/** Figma 1:171116 — teal check-in-circle success icon. */
const SUCCESS_ICON_XML = `
<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M37.5 19.5C37.5 29.4411 29.4411 37.5 19.5 37.5C9.55887 37.5 1.5 29.4411 1.5 19.5C1.5 9.55887 9.55887 1.5 19.5 1.5C29.4411 1.5 37.5 9.55887 37.5 19.5Z" stroke="url(#paint0_success_toast)" stroke-width="1.5"/>
  <path d="M27 15L17.375 25L13 20.4545" stroke="url(#paint1_success_toast)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  <defs>
    <linearGradient id="paint0_success_toast" x1="2.7" y1="-1.47612" x2="41.0091" y2="8.06851" gradientUnits="userSpaceOnUse">
      <stop stop-color="#34F3E0"/>
      <stop offset="1" stop-color="#04CFE1"/>
    </linearGradient>
    <linearGradient id="paint1_success_toast" x1="13.4667" y1="14.1733" x2="27.5732" y2="19.0937" gradientUnits="userSpaceOnUse">
      <stop stop-color="#34F3E0"/>
      <stop offset="1" stop-color="#04CFE1"/>
    </linearGradient>
  </defs>
</svg>
`;

const CLOSE_ICON_XML = `
<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M9 9L19.5 19.5" stroke="#FFFFFF" stroke-width="1.77778" stroke-linecap="round"/>
  <path d="M9 19.5L19.5 9" stroke="#FFFFFF" stroke-width="1.77778" stroke-linecap="round"/>
</svg>
`;

/**
 * Figma node 1:171116 — publish success toaster.
 */
const PublishSuccessToast = ({
  visible = false,
  message = 'המודעה שלכם פורסמה בהצלחה!',
  onDismiss,
}) => {
  const {width: winW} = useWindowDimensions();
  const maxW = Math.min(366, winW - 48);

  useEffect(() => {
    if (!visible) return undefined;
    const id = setTimeout(() => {
      onDismiss?.();
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [visible, onDismiss]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}>
      <View style={styles.root} pointerEvents="box-none">
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onDismiss}
          accessibilityLabel="סגור"
        />
        <View style={[styles.toast, {width: maxW}]}>
          <Pressable
            onPress={onDismiss}
            style={styles.closeBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="סגור">
            <SvgXml xml={CLOSE_ICON_XML} width={28} height={28} />
          </Pressable>
          <View style={styles.successIconWrap}>
            <SvgXml xml={SUCCESS_ICON_XML} width={40} height={40} />
          </View>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  toast: {
    zIndex: 1,
    backgroundColor: '#6E6A87',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 10},
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  successIconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontFamily: 'Rubik-Regular',
    fontSize: 18,
    lineHeight: 22,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default PublishSuccessToast;
