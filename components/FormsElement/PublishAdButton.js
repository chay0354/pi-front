import React, {useMemo} from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const GRAY_BUTTON = require('../../assets/ad-uplaud/button-gray.png');
const YELLOW_BUTTON = require('../../assets/ad-uplaud/button-yelow.png');

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
  style,
}) {
  const aspectRatios = useMemo(() => resolvePublishAspectRatios(), []);
  const enabled = ready && !uploading;
  const aspectRatio = ready ? aspectRatios.yellow : aspectRatios.gray;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!ready || uploading}
      accessibilityState={{disabled: uploading || !ready, busy: uploading}}
      accessibilityLabel={uploading ? 'מפרסם מודעה' : 'פרסם'}
      style={[
        styles.touchable,
        Platform.OS === 'web' && enabled ? {cursor: 'pointer'} : null,
        Platform.OS === 'web' && !enabled && !uploading
          ? {cursor: 'not-allowed'}
          : null,
        style,
      ]}
      activeOpacity={enabled ? 0.85 : 1}>
      <View style={styles.imageWrap}>
        <Image
          source={ready ? YELLOW_BUTTON : GRAY_BUTTON}
          style={[
            styles.image,
            {aspectRatio},
            uploading ? styles.imageUploading : null,
          ]}
          resizeMode="contain"
        />
        {uploading ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="small" color="#FFD275" />
            <Text style={styles.loadingText}>מפרסם...</Text>
          </View>
        ) : null}
      </View>
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
  imageUploading: {
    opacity: 0.42,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 29, 39, 0.58)',
    borderRadius: 999,
    gap: 8,
  },
  loadingText: {
    color: '#FFD275',
    fontSize: 15,
    fontFamily: 'Rubik-Medium',
    letterSpacing: 0.2,
  },
});
