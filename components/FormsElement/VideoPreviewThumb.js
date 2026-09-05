import React, {useRef} from 'react';
import {Image, Platform, StyleSheet, View} from 'react-native';
import {Video, ResizeMode} from 'expo-av';

export function VideoPreviewThumb({
  uri,
  style,
  videoStyle,
  showPlayIcon = true,
  resizeMode = 'cover',
}) {
  const videoRef = useRef(null);
  if (!uri) return null;

  const playOverlay = showPlayIcon ? (
    <View style={styles.playOverlay} pointerEvents="none">
      <Image
        source={require('../../assets/play-button.png')}
        style={styles.playIcon}
        resizeMode="contain"
      />
    </View>
  ) : null;

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.frame, style]}>
        <video
          src={uri}
          style={{
            ...styles.webVideo,
            objectFit: resizeMode === 'contain' ? 'contain' : 'cover',
            ...(videoStyle || {}),
          }}
          controls={false}
          muted
          playsInline
          preload="metadata"
        />
        {playOverlay}
      </View>
    );
  }

  return (
    <View style={[styles.frame, style]}>
      <Video
        ref={videoRef}
        key={uri}
        source={{uri}}
        style={[styles.video, videoStyle]}
        resizeMode={
          resizeMode === 'contain' ? ResizeMode.CONTAIN : ResizeMode.COVER
        }
        useNativeControls={false}
        shouldPlay={false}
        isMuted
        isLooping={false}
        onLoad={() => {
          videoRef.current?.setPositionAsync(0).catch(() => {});
        }}
      />
      {playOverlay}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a22',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  webVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    backgroundColor: '#1a1a22',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  playIcon: {
    width: 52,
    height: 52,
    opacity: 0.92,
  },
});
