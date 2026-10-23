import {Platform} from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {requireOptionalNativeModule} from 'expo-modules-core';
import {registerPushToken, unregisterPushToken} from './api';

const CHAT_CHANNEL_ID = 'chat';
const TOKEN_STORAGE_KEY = 'pi.push.token';

/**
 * Binaries built before expo-notifications was added have no native module, and
 * importing the package there throws — so load it only when the module exists.
 */
function loadNotifications() {
  if (Platform.OS === 'web') return null;
  if (!requireOptionalNativeModule('ExpoPushTokenManager')) return null;
  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
}

const Notifications = loadNotifications();

let isActiveChat = () => false;

/** While the user is inside a conversation, its pushes are not shown as banners. */
export function setActiveChatMatcher(matcher) {
  isActiveChat = typeof matcher === 'function' ? matcher : () => false;
}

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async notification => {
      const data = notification?.request?.content?.data || {};
      const hide = data.type === 'chat' && isActiveChat(data);
      return {
        shouldShowAlert: !hide,
        shouldPlaySound: !hide,
        shouldSetBadge: false,
      };
    },
  });
}

async function ensureChatChannel() {
  if (Platform.OS !== 'android') return;
  // Must exist before the Android 13+ permission prompt can appear.
  await Notifications.setNotificationChannelAsync(CHAT_CHANNEL_ID, {
    name: 'הודעות צ׳אט',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#F7C63A',
  });
}

export async function registerForChatPush(user) {
  const email = String(user?.email || '')
    .trim()
    .toLowerCase();
  if (!Notifications || !email) return null;
  try {
    await ensureChatChannel();
    let {status} = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({status} = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;
    const {data: token} = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    if (!token) return null;

    await registerPushToken({
      token,
      email,
      subscriptionId: user?.id || null,
      platform: Platform.OS,
    });
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
    return token;
  } catch (err) {
    console.warn('[push] registration failed', err?.message || err);
    return null;
  }
}

/** Logout: stop pushes for the previous account on this device. */
export async function unregisterChatPush() {
  try {
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return;
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    await unregisterPushToken(token);
  } catch (err) {
    console.warn('[push] unregister failed', err?.message || err);
  }
}

let lastHandledResponseId = null;

/**
 * Calls `onOpen(data)` when a chat notification is tapped — including the tap that
 * cold-started the app. Returns an unsubscribe function.
 */
export function subscribeToChatNotificationTaps(onOpen) {
  if (!Notifications) return () => {};
  const handle = response => {
    const request = response?.notification?.request;
    const data = request?.content?.data;
    if (data?.type !== 'chat') return;
    if (request?.identifier && request.identifier === lastHandledResponseId) {
      return;
    }
    lastHandledResponseId = request?.identifier || null;
    onOpen(data);
  };
  Notifications.getLastNotificationResponseAsync()
    .then(response => response && handle(response))
    .catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}

/** Chat push arrived while the app is open (e.g. refresh the chat list). */
export function subscribeToChatNotificationsReceived(onReceive) {
  if (!Notifications) return () => {};
  const sub = Notifications.addNotificationReceivedListener(notification => {
    const data = notification?.request?.content?.data;
    if (data?.type === 'chat') onReceive(data);
  });
  return () => sub.remove();
}
