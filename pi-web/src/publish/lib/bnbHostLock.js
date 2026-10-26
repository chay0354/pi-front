/** Guest BnB publish sheet: `private` | `business`. */
export function normalizeBnbHostType(value) {
  const s = String(value ?? '')
    .trim()
    .toLowerCase();
  return s === 'private' || s === 'business' ? s : null;
}

/**
 * Host type this regular user is locked to after registering from the
 * guest BnB publish flow. Null = both פרטי and עסקי stay available.
 */
export function getUserBnbHostLock(user) {
  if (!user || typeof user !== 'object') return null;
  return normalizeBnbHostType(user.bnb_host_lock ?? user.bnbHostLock);
}

/** Whether the BnB create sheet should show פרטי or עסקי for this user. */
export function shouldShowBnbCreateOption(user, option) {
  const type = normalizeBnbHostType(option);
  if (!type) return false;
  const lock = getUserBnbHostLock(user);
  if (!lock) return true;
  return lock === type;
}
