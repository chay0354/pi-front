import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {
  PROFILE_RING_COLORS,
  PROFILE_RING_LOCATIONS,
} from '../ProfileAvatar';

const GRAY_BUTTON = require('../../assets/ad-uplaud/button-gray.png');
const YELLOW_BUTTON = require('../../assets/ad-uplaud/button-yelow.png');
const SAVE_BUTTON_GRADIENT = ['#FEE787', '#BD9947', '#9C6522'];
const SAVE_BUTTON_GRADIENT_LOCATIONS = [0, 0.52, 1];

function resolvePublishAspectRatios() {
  const fbGray = 1004 / 174;
  const fbYellow = 990 / 162;
  try {
    const gray = Image.resolveAssetSource(GRAY_BUTTON);
    const yel = Image.resolveAssetSource(YELLOW_BUTTON);
    return {
      gray: gray?.width && gray?.height ? gray.width / gray.height : fbGray,
      yellow: yel?.width && yel?.height ? yel.width / yel.height : fbYellow,
    };
  } catch (_) {
    return {gray: fbGray, yellow: fbYellow};
  }
}

export function PublishAdButton({
  onPress,
  uploading = false,
  ready = false,
  /** When true, show "שמור שינויים" instead of the publish image button. */
  isEditing = false,
  style,
}) {
  const aspectRatios = useMemo(() => resolvePublishAspectRatios(), []);
  const enabled = ready && !uploading;
  const aspectRatio = ready ? aspectRatios.yellow : aspectRatios.gray;
  const saveLabel = 'שמור שינויים';
  const saveLoadingLabel = 'שומר...';

  const [buttonWidth, setButtonWidth] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressLoopRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef(null);

  const resetProgress = useCallback(() => {
    progressLoopRef.current?.stop?.();
    progressLoopRef.current = null;
    progressAnim.stopAnimation();
    progressAnim.setValue(0);
  }, [progressAnim]);

  const startProgress = useCallback(() => {
    resetProgress();
    progressLoopRef.current = Animated.sequence([
      Animated.timing(progressAnim, {
        toValue: 0.28,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(progressAnim, {
        toValue: 0.62,
        duration: 2200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(progressAnim, {
        toValue: 0.88,
        duration: 5200,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ]);
    progressLoopRef.current.start();
  }, [resetProgress, progressAnim]);

  useEffect(() => {
    if (!uploading) {
      resetProgress();
      pulseLoopRef.current?.stop?.();
      pulseAnim.setValue(0);
      return undefined;
    }

    startProgress();

    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoopRef.current.start();

    return () => {
      progressLoopRef.current?.stop?.();
      pulseLoopRef.current?.stop?.();
    };
  }, [uploading, startProgress, resetProgress, pulseAnim]);

  const fillWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(buttonWidth, 1)],
  });

  const labelOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.78, 1],
  });

  const buttonScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.012],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!ready || uploading}
      accessibilityState={{disabled: uploading || !ready, busy: uploading}}
      accessibilityLabel={
        isEditing
          ? uploading
            ? 'שומר שינויים'
            : saveLabel
          : uploading
            ? 'מפרסם מודעה'
            : 'פרסם'
      }
      style={[
        styles.touchable,
        Platform.OS === 'web' && enabled ? {cursor: 'pointer'} : null,
        Platform.OS === 'web' && !enabled && !uploading
          ? {cursor: 'not-allowed'}
          : null,
        style,
      ]}
      activeOpacity={enabled ? 0.85 : 1}>
      <Animated.View
        style={[
          styles.imageWrap,
          uploading ? {transform: [{scale: buttonScale}]} : null,
        ]}
        onLayout={event => setButtonWidth(event.nativeEvent.layout.width)}>
        {uploading ? (
          <View
            style={[styles.loadingShell, {aspectRatio: aspectRatios.yellow}]}
            pointerEvents="none">
            <View style={styles.loadingFillClip}>
              <Animated.View
                style={[styles.loadingFillOuter, {width: fillWidth}]}>
                <LinearGradient
                  colors={PROFILE_RING_COLORS}
                  locations={PROFILE_RING_LOCATIONS}
                  start={{x: 0, y: 0.5}}
                  end={{x: 1, y: 0.5}}
                  style={StyleSheet.absoluteFillObject}
                />
              </Animated.View>
            </View>

            <Animated.Text
              style={[styles.loadingText, {opacity: labelOpacity}]}>
              {isEditing ? saveLoadingLabel : 'מפרסם...'}
            </Animated.Text>
          </View>
        ) : isEditing ? (
          <View
            style={[styles.saveShell, {aspectRatio}]}
            pointerEvents="none">
            {ready ? (
              <LinearGradient
                colors={SAVE_BUTTON_GRADIENT}
                locations={SAVE_BUTTON_GRADIENT_LOCATIONS}
                start={{x: 0, y: 0.5}}
                end={{x: 1, y: 0.5}}
                style={StyleSheet.absoluteFillObject}
              />
            ) : (
              <View
                style={[StyleSheet.absoluteFillObject, styles.saveShellDisabled]}
              />
            )}
            <View style={styles.saveTextOverlay} pointerEvents="none">
              <Text
                style={[
                  styles.saveText,
                  !ready ? styles.saveTextDisabled : null,
                ]}>
                {saveLabel}
              </Text>
            </View>
          </View>
        ) : (
          <Image
            source={ready ? YELLOW_BUTTON : GRAY_BUTTON}
            style={[styles.image, {aspectRatio}]}
            resizeMode="contain"
          />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 0,
    alignSelf: 'stretch',
  },
  imageWrap: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'stretch',
    borderRadius: 999,
    ...Platform.select({
      web: {fontSize: 0, lineHeight: 0},
      default: {},
    }),
  },
  image: {
    width: '100%',
    height: undefined,
    ...Platform.select({
      web: {display: 'block', verticalAlign: 'top'},
      default: {},
    }),
  },
  loadingShell: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2E2D38',
    borderWidth: 1,
    borderColor: 'rgba(189, 153, 71, 0.35)',
  },
  loadingFillClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    overflow: 'hidden',
  },
  loadingFillOuter: {
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    opacity: 0.42,
  },
  loadingText: {
    color: '#FEE787',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    letterSpacing: 0.3,
    zIndex: 1,
  },
  saveShell: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 999,
    minHeight: 48,
  },
  saveShellDisabled: {
    backgroundColor: '#4A4758',
  },
  saveTextOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    letterSpacing: 0.3,
  },
  saveTextDisabled: {
    color: '#B8B6C0',
  },
});
