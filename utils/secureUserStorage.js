import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const CURRENT_USER_KEY = 'pi_current_user';

/**
 * Session data was previously stored in plain AsyncStorage indefinitely with
 * no encryption. SecureStore uses Keychain (iOS) / Keystore (Android) for
 * at-rest encryption. SecureStore has no web implementation, so web keeps
 * using AsyncStorage (web has no equivalent OS-level secure storage anyway).
 */
export async function getCurrentUser() {
  if (Platform.OS === 'web') {
    const raw = await AsyncStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
  const raw = await SecureStore.getItemAsync(CURRENT_USER_KEY);
  if (raw) return JSON.parse(raw);
  // One-time migration: pick up any session saved before this change shipped.
  const legacyRaw = await AsyncStorage.getItem(CURRENT_USER_KEY);
  if (legacyRaw) {
    await SecureStore.setItemAsync(CURRENT_USER_KEY, legacyRaw);
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    return JSON.parse(legacyRaw);
  }
  return null;
}

export async function setCurrentUserStorage(user) {
  const serialized = JSON.stringify(user);
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(CURRENT_USER_KEY, serialized);
    return;
  }
  await SecureStore.setItemAsync(CURRENT_USER_KEY, serialized);
}

export async function clearCurrentUserStorage() {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(CURRENT_USER_KEY);
  // Clean up any leftover legacy plaintext copy too.
  await AsyncStorage.removeItem(CURRENT_USER_KEY).catch(() => {});
}
