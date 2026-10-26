import {useCallback, useSyncExternalStore} from 'react';
import {likeListing, unlikeListing} from '../api/client';

/**
 * Liked ads + the unseen-likes badge, mirroring mobile tikTokLikedStorage.
 * The heart updates this set immediately; persistAdLike also writes the server like
 * so the listing shows up in favorites.
 */
const IDS_KEY = 'piWebLikedListingIds';
const UNSEEN_KEY = 'piWebUnseenLikedCount';

function read() {
  try {
    const ids = JSON.parse(localStorage.getItem(IDS_KEY) || '[]');
    const unseen = Number(localStorage.getItem(UNSEEN_KEY));
    return {
      ids: new Set(Array.isArray(ids) ? ids.map(String) : []),
      unseen: Number.isFinite(unseen) && unseen > 0 ? unseen : 0,
    };
  } catch {
    return {ids: new Set(), unseen: 0};
  }
}

let state = read();
const listeners = new Set();

function commit(next) {
  state = next;
  try {
    localStorage.setItem(IDS_KEY, JSON.stringify([...next.ids]));
    localStorage.setItem(UNSEEN_KEY, String(next.unseen));
  } catch {
    // Storage full or blocked: keep the in-memory state.
  }
  listeners.forEach(l => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getState = () => state;

/** Mobile toggleLike: every like adds one to the badge, every unlike removes one. */
export function toggleLiked(id) {
  const key = String(id);
  const ids = new Set(state.ids);
  const willBeLiked = !ids.has(key);
  if (willBeLiked) ids.add(key);
  else ids.delete(key);
  commit({ids, unseen: willBeLiked ? state.unseen + 1 : Math.max(0, state.unseen - 1)});
}

/** Drop a like from the local set after the server unlike succeeds (favorites screen). */
export function forgetLiked(id) {
  const key = String(id);
  if (!state.ids.has(key)) return;
  const ids = new Set(state.ids);
  ids.delete(key);
  commit({ids, unseen: Math.max(0, state.unseen - 1)});
}

const pendingLikes = new Set();

/** Optimistic local toggle, then POST/DELETE /api/listings/:id/like. Reverts if the server rejects it. */
export async function persistAdLike(id, userId) {
  const key = String(id);
  if (!userId) throw new Error('נדרשת התחברות');
  if (pendingLikes.has(key)) return;
  pendingLikes.add(key);
  const willBeLiked = !state.ids.has(key);
  toggleLiked(id);
  try {
    if (willBeLiked) await likeListing(key, userId);
    else await unlikeListing(key, userId);
  } catch (err) {
    toggleLiked(id);
    throw err;
  } finally {
    pendingLikes.delete(key);
  }
}

/** Opening the liked view clears the badge, like tapping the heart on mobile. */
export function markLikedSeen() {
  if (state.unseen !== 0) commit({...state, unseen: 0});
}

export function useLikedListings() {
  return useSyncExternalStore(subscribe, getState);
}

export function useIsLiked(id) {
  const isLiked = useCallback(() => state.ids.has(String(id)), [id]);
  return useSyncExternalStore(subscribe, isLiked);
}
