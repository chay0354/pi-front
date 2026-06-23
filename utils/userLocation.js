import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import {geocodeAddress, normalizeGeocodeQuery} from './geocoding';

const USER_COORDS_KEY_PREFIX = 'pi_user_reference_coords_v1:';

function readCoordsFromPosition(pos) {
  const latitude = Number(pos?.coords?.latitude);
  const longitude = Number(pos?.coords?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {latitude, longitude};
}

async function cacheUserCoords(userId, coords) {
  if (!userId || !coords) return;
  try {
    await AsyncStorage.setItem(
      `${USER_COORDS_KEY_PREFIX}${String(userId)}`,
      JSON.stringify(coords),
    );
  } catch (_) {
    /* optional cache */
  }
}

async function readCachedUserCoords(userId) {
  if (!userId) return null;
  try {
    const raw = await AsyncStorage.getItem(
      `${USER_COORDS_KEY_PREFIX}${String(userId)}`,
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const latitude = Number(parsed?.latitude);
    const longitude = Number(parsed?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return {latitude, longitude};
  } catch (_) {
    return null;
  }
}

async function getNativeDeviceLocation() {
  try {
    const {status} = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const lastKnown = await Location.getLastKnownPositionAsync();
    const lastCoords = readCoordsFromPosition(lastKnown);
    if (lastCoords) return lastCoords;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return readCoordsFromPosition(pos);
  } catch (_) {
    return null;
  }
}

/** Device GPS coords, or null when permission denied / unavailable. */
export async function getDeviceLocation() {
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        pos => resolve(readCoordsFromPosition(pos)),
        () => resolve(null),
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 60000},
      );
    });
  }
  return getNativeDeviceLocation();
}

/**
 * Reference point for "מרחק ממני":
 * 1) phone GPS (when permitted)
 * 2) geocoded profile address (unless gpsOnly)
 * 3) last cached coords for this user
 */
export async function resolveUserReferenceCoords(
  profileAddress,
  userId = null,
  options = {},
) {
  const gpsOnly = options?.gpsOnly === true;
  const device = await getDeviceLocation();
  if (device) {
    await cacheUserCoords(userId, device);
    return device;
  }

  if (gpsOnly) {
    return readCachedUserCoords(userId);
  }

  const query = normalizeGeocodeQuery(profileAddress);
  if (query) {
    const geocoded = await geocodeAddress(query);
    if (geocoded) {
      await cacheUserCoords(userId, geocoded);
      return geocoded;
    }
  }

  return readCachedUserCoords(userId);
}
