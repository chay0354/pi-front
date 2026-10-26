import {useCallback, useSyncExternalStore} from 'react';

/** Post likes are separate from ad favorites (mobile togglePostLiked). */
const KEY = 'piWebLikedPostIds';

function read() {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY) || '[]');
    return new Set(Array.isArray(ids) ? ids.map(String) : []);
  } catch {
    return new Set();
  }
}

let ids = read();
const listeners = new Set();

function commit(next) {
  ids = next;
  try {
    localStorage.setItem(KEY, JSON.stringify([...next]));
  } catch {
    /* keep memory */
  }
  listeners.forEach(l => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isPostLiked(id) {
  return ids.has(String(id));
}

export function togglePostLiked(id) {
  const key = String(id);
  const next = new Set(ids);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  commit(next);
}

export function useIsPostLiked(id) {
  const get = useCallback(() => ids.has(String(id)), [id]);
  return useSyncExternalStore(subscribe, get);
}
