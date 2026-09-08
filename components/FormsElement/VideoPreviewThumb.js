import React, {useMemo, useRef, useState} from 'react';
import {Image, Platform, StyleSheet, View} from 'react-native';
import {Video, ResizeMode} from 'expo-av';
import {muxThumbnailUri} from '../../utils/videoPlayback';

const IMAGE_PROPS = Platform.OS === 'android' ? {fadeDuration: 0} : undefined;
const VIDEO_FILE_RE = /\.(mp4|mov|m4v|webm|m3u8)(\?|#|$)/i;

function isRemoteStill(uri) {
  const s = uri != null ? String(uri).trim() : '';
  if (!s || !/^https?:\/\//i.test(s)) return false;
  if (VIDEO_FILE_RE.test(s) || /stream\.mux\.com/i.test(s)) return false;
  return true;
}

/**
 * Chat / card preview of a video: prefer a JPEG poster (Mux thumbnail or an
 * explicit still) so the first paint is a photo, not a black Video surface
 * waiting on ExoPlayer.
 */
export function VideoPreviewThumb({
  uri,
  posterUri = null,
  style,
  videoStyle,
  showPlayIcon = true,
  resizeMode = 'cover',
}) {
  const videoRef = useRef(null);
  const [frameReady, setFrameReady] = useState(false);
  const poster = useMemo(() => {
    if (isRemoteStill(posterUri)) return String(posterUri).trim();
    return muxThumbnailUri(uri, {time: 0, width: 480}) || '';
  }, [posterUri, uri]);

  if (!uri && !poster) return null;

  const cover = resizeMode === 'contain' ? 'contain' : 'cover';
  const playOverlay = showPlayIcon ? (
    <View style={styles.playOverlay} pointerEvents="none">
      <Image
        source={require('../../assets/play-button.png')}
        style={styles.playIcon}
        resizeMode="contain"
      />
    </View>
  ) : null;

  if (poster) {
    return (
      <View style={[styles.frame, style]}>
        <Image
          source={{uri: poster}}
          {...IMAGE_PROPS}
          style={[styles.media, videoStyle]}
          resizeMode={cover}
        />
        {playOverlay}
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.frame, style]}>
        <video
          src={uri}
          style={{
            ...styles.webVideo,
            objectFit: cover,
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
        style={[
          styles.media,
          videoStyle,
          !frameReady && styles.mediaPending,
        ]}
        resizeMode={
          cover === 'contain' ? ResizeMode.CONTAIN : ResizeMode.COVER
        }
        useNativeControls={false}
        shouldPlay={false}
        isMuted
        isLooping={false}
        onReadyForDisplay={() => setFrameReady(true)}
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
    backgroundColor: '#2B2A39',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  mediaPending: {
    opacity: 0,
  },
  webVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    backgroundColor: '#2B2A39',
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
