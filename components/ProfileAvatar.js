import React, {useState, useEffect} from 'react';
import {View, Image, Text, StyleSheet} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Circle,
} from 'react-native-svg';
import {resolveSubscriptionType, shouldShowProfileGoldRing} from '../utils/constant';
import {DEFAULT_PI_PROFILE_AVATAR} from '../utils/userProfileImage';

/**
 * Single source of truth for user profile photos with a subscription-type ring.
 *
 *   <ProfileAvatar uri={profileUrl} fallbackUri={companyLogoUrl} size={60} />
 *
 * Ring colors: gold gradient for broker / company / professional; teal gradient
 * for regular users (same thickness and gap as gold).
 *
 * Order: profile photo → fallbackUri (e.g. company logo) → default no-profile image.
 */
const RING_RATIO = 3.5 / 82; // ring band thickness
const GAP_RATIO = 2 / 82; // transparent space between ring and photo
export const PROFILE_RING_COLORS = ['#FEE787', '#BD9947', '#9C6522'];
export const PROFILE_RING_LOCATIONS = [0.0456, 0.5076, 0.8831];
/** Regular users — matches Edit Profile camera badge teal (`#5EEAD4`). */
export const PROFILE_USER_RING_COLORS = ['#99F6E4', '#5EEAD4', '#0D9488'];
export const PROFILE_USER_RING_LOCATIONS = PROFILE_RING_LOCATIONS;
const DEFAULT_RING_COLORS = PROFILE_RING_COLORS;
const DEFAULT_RING_LOCATIONS = PROFILE_RING_LOCATIONS;

let gradientIdCounter = 0;
const nextGradientId = () =>
  `profileAvatarRing-${Date.now().toString(36)}-${(gradientIdCounter++).toString(36)}`;

export const ProfileAvatar = ({
  uri,
  fallbackUri,
  name,
  size = 60,
  ringColors = DEFAULT_RING_COLORS,
  ringLocations = DEFAULT_RING_LOCATIONS,
  subscriptionType,
  forceGoldRing = false,
  showRing = true,
  style,
  imageStyle,
  placeholderLabel,
  placeholderImage = DEFAULT_PI_PROFILE_AVATAR,
  fallbackResizeMode = 'contain',
  onImageError,
}) => {
  const [primaryFailed, setPrimaryFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const [gradientId] = useState(nextGradientId);

  useEffect(() => {
    setPrimaryFailed(false);
    setFallbackFailed(false);
  }, [uri, fallbackUri]);

  const ringWidth = Math.max(1, size * RING_RATIO);
  const gap = Math.max(0, size * GAP_RATIO);
  const inset = ringWidth + gap;
  const placeholderChar = (() => {
    if (placeholderLabel)
      return String(placeholderLabel).trim().charAt(0).toUpperCase();
    if (name) return String(name).trim().charAt(0).toUpperCase() || '?';
    return '?';
  })();
  const fontSize = Math.max(12, Math.round(size * 0.38));

  const showPrimary = Boolean(uri) && !primaryFailed;
  const showFallback = !showPrimary && Boolean(fallbackUri) && !fallbackFailed;
  const displayUri = showPrimary ? uri : showFallback ? fallbackUri : null;
  const displayResizeMode = showPrimary ? 'cover' : fallbackResizeMode;
  const resolvedType = resolveSubscriptionType(subscriptionType);
  const useGoldRing =
    forceGoldRing === true ||
    (resolvedType !== '' && shouldShowProfileGoldRing(resolvedType));
  const effectiveShowRing = showRing !== false;
  const effectiveRingColors = useGoldRing ? ringColors : PROFILE_USER_RING_COLORS;
  const effectiveRingLocations = useGoldRing
    ? ringLocations
    : PROFILE_USER_RING_LOCATIONS;

  const Photo = displayUri ? (
    <Image
      source={{uri: String(displayUri)}}
      style={[styles.image, imageStyle]}
      resizeMode={displayResizeMode}
      onError={() => {
        onImageError?.();
        if (showPrimary) setPrimaryFailed(true);
        else if (showFallback) setFallbackFailed(true);
      }}
    />
  ) : placeholderImage != null ? (
    <Image
      source={placeholderImage}
      style={[styles.image, imageStyle]}
      resizeMode="cover"
    />
  ) : (
    <View style={[styles.image, styles.placeholder]}>
      {placeholderChar !== '?' ? (
        <Text style={[styles.placeholderText, {fontSize}]}>
          {placeholderChar}
        </Text>
      ) : (
        <MaterialCommunityIcons
          name="account"
          size={Math.round(size * 0.4)}
          color="#FFFFFF"
        />
      )}
    </View>
  );

  if (!effectiveShowRing) {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: 'hidden',
          },
          style,
        ]}>
        {Photo}
      </View>
    );
  }

  // Circle radius accounts for the stroke width: the stroke straddles the
  // circumference, so r = (size - ringWidth) / 2 keeps the outer edge flush
  // with the SVG viewport.
  const circleRadius = (size - ringWidth) / 2;

  return (
    <View style={[{width: size, height: size}, style]}>
      <Svg
        width={size}
        height={size}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none">
        <Defs>
          <SvgLinearGradient
            id={gradientId}
            x1="0"
            y1="0"
            x2="1"
            y2="1">
            {effectiveRingColors.map((color, i) => (
              <Stop
                key={`${gradientId}-${i}`}
                offset={
                  effectiveRingLocations[i] ??
                  i / Math.max(1, effectiveRingColors.length - 1)
                }
                stopColor={color}
              />
            ))}
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={circleRadius}
          stroke={`url(#${gradientId})`}
          strokeWidth={ringWidth}
          fill="none"
        />
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: inset,
          left: inset,
          right: inset,
          bottom: inset,
          borderRadius: 999,
          overflow: 'hidden',
        }}>
        {Photo}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  placeholder: {
    backgroundColor: '#343347',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#FFFFFF',
    fontFamily: 'Rubik-Medium',
  },
});

export default ProfileAvatar;
