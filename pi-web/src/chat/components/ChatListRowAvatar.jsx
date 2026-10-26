import {useCallback, useEffect, useState} from 'react';
import {getChatParticipantDisplay} from '../../api/chat';
import {apiBase} from '../../api/client';
import {normalizeChatAvatarUrl} from '../lib/chatAvatar';
import {DEFAULT_PI_PROFILE_AVATAR, logProfilePic} from '../../profile/lib/userProfileImage';
import {ProfileAvatar} from '../../profile/ProfileParts';
import groupPlaceholder from '../../assets/mobile/pi-chat/groupe-icon-small.png';
import styles from './ChatListRowAvatar.module.css';

export const CHAT_LIST_AVATAR_PX = 73;
export const CHAT_LIST_AVATAR_PLACEHOLDER = DEFAULT_PI_PROFILE_AVATAR;
export const CHAT_GROUP_AVATAR_PLACEHOLDER = groupPlaceholder;

/**
 * Same avatar used on the chat inbox: live photo lookup, storage-path
 * normalization, proxy fallback, and subscription ring.
 */
export default function ChatListRowAvatar({
  uri,
  debugKey,
  userRef,
  subscriptionType,
  forceGoldRing = false,
  placeholderImage = CHAT_LIST_AVATAR_PLACEHOLDER,
  size = CHAT_LIST_AVATAR_PX,
}) {
  const trimmed = uri != null && String(uri).trim() ? String(uri).trim() : null;
  const initialSubType =
    subscriptionType != null && String(subscriptionType).trim()
      ? String(subscriptionType).trim().toLowerCase()
      : null;
  const [resolvedUri, setResolvedUri] = useState(trimmed);
  const [resolvedSubscriptionType, setResolvedSubscriptionType] = useState(initialSubType);
  const [lookupTried, setLookupTried] = useState(false);
  const [useProxyStream, setUseProxyStream] = useState(false);
  const proxyBase = apiBase();
  const sourceUri =
    resolvedUri && useProxyStream
      ? `${proxyBase}/api/chat/avatar-url?src=${encodeURIComponent(resolvedUri)}`
      : resolvedUri;

  useEffect(() => {
    setResolvedUri(trimmed);
    setResolvedSubscriptionType(initialSubType);
    setLookupTried(false);
    setUseProxyStream(false);
  }, [trimmed, initialSubType]);

  useEffect(() => {
    if (forceGoldRing || initialSubType || !userRef || lookupTried) return undefined;
    let cancelled = false;
    setLookupTried(true);
    (async () => {
      try {
        const res = await getChatParticipantDisplay(userRef);
        if (cancelled) return;
        const subType =
          res?.subscription_type != null && String(res.subscription_type).trim()
            ? String(res.subscription_type).trim().toLowerCase()
            : null;
        if (subType) setResolvedSubscriptionType(subType);
        const fallback =
          normalizeChatAvatarUrl(res?.profileImageUrl || res?.profile_picture_url || null) || null;
        if (fallback && !trimmed) {
          setResolvedUri(fallback);
        }
      } catch {
        /* keep teal until type is known */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [forceGoldRing, initialSubType, userRef, lookupTried, trimmed]);

  useEffect(() => {
    logProfilePic(`ChatListRowAvatar.pull.${String(debugKey || 'row')}`, {
      row: debugKey || null,
      resolvedUri: trimmed || null,
      mode: useProxyStream ? 'proxy-stream-fallback' : 'direct-native-image',
      requestUrl: sourceUri || null,
      userRef: userRef || null,
      lookupTried,
      useProxyStream,
      subscriptionType: resolvedSubscriptionType,
    });
  }, [debugKey, trimmed, resolvedUri, sourceUri, userRef, lookupTried, useProxyStream, resolvedSubscriptionType]);

  const handleImageError = useCallback(async () => {
    logProfilePic(`ChatListRowAvatar.error.${String(debugKey || 'row')}`, {
      row: debugKey || null,
      failedUri: sourceUri || resolvedUri || null,
      userRef: userRef || null,
      lookupTried,
      useProxyStream,
    });
    if (resolvedUri && !useProxyStream) {
      setUseProxyStream(true);
      return;
    }
    if (resolvedUri && useProxyStream && lookupTried) {
      setResolvedUri(null);
      return;
    }
    if (lookupTried || !userRef) return;
    setLookupTried(true);
    try {
      const res = await getChatParticipantDisplay(userRef);
      const fallback =
        normalizeChatAvatarUrl(res?.profileImageUrl || res?.profile_picture_url || null) || null;
      const subType =
        res?.subscription_type != null && String(res.subscription_type).trim()
          ? String(res.subscription_type).trim().toLowerCase()
          : null;
      logProfilePic(`ChatListRowAvatar.lookup.${String(debugKey || 'row')}`, {
        row: debugKey || null,
        userRef,
        apiSuccess: !!res?.success,
        apiProfileImageUrl: res?.profileImageUrl ?? null,
        fallbackUri: fallback,
        subscriptionType: subType,
      });
      if (subType) {
        setResolvedSubscriptionType(subType);
      }
      if (fallback && fallback !== resolvedUri) {
        setResolvedUri(fallback);
        setUseProxyStream(false);
      } else if (!fallback) {
        setResolvedUri(null);
      } else if (fallback === resolvedUri && useProxyStream) {
        setResolvedUri(null);
      }
    } catch (e) {
      logProfilePic(`ChatListRowAvatar.lookupFail.${String(debugKey || 'row')}`, {
        row: debugKey || null,
        userRef,
        error: e?.message ? String(e.message) : 'lookup_failed',
      });
      setResolvedUri(null);
    }
  }, [debugKey, resolvedUri, sourceUri, userRef, lookupTried, useProxyStream]);

  useEffect(() => {
    if (!sourceUri) return undefined;
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {};
    img.onerror = () => {
      if (!cancelled) handleImageError();
    };
    img.src = sourceUri;
    return () => {
      cancelled = true;
    };
  }, [sourceUri, handleImageError]);

  return (
    <span className={styles.wrap}>
      <ProfileAvatar
        uri={sourceUri}
        placeholderImage={placeholderImage}
        size={size}
        subscriptionType={resolvedSubscriptionType}
        forceGoldRing={forceGoldRing === true}
      />
    </span>
  );
}
