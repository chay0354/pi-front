/**
 * TikTok / Pi AI listing favorites + post likes persisted per signed-in user.
 * Legacy global keys caused guests to show hearts from a previous session.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const LEGACY_ADS = 'tikTokFeedLikedIds';
const LEGACY_POSTS = 'tikTokFeedLikedPostIds';
const LEGACY_UNSEEN = 'tikTokFeedUnseenLikedCount';

const v1 = (userId) => ({
  ads: `tikTokFeedLikedIds:v1:${userId}`,
  posts: `tikTokFeedLikedPostIds:v1:${userId}`,
  unseen: `tikTokFeedUnseenLikedCount:v1:${userId}`,
});

function parseJsonIdArray(raw) {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

/**
 * Load persisted liked sets + unseen badge for one user. Guests: always empty.
 * Migrates legacy global keys once into this user's namespace, then removes legacy.
 */
export async function loadTikTokLikedState(userId) {
  if (userId == null || String(userId).trim() === '') {
    return {
      likedListingIds: new Set(),
      likedPostIds: new Set(),
      unseenLikedCount: 0,
    };
  }
  const uid = String(userId).trim();
  const k = v1(uid);

  let ads = parseJsonIdArray(await AsyncStorage.getItem(k.ads));
  let posts = parseJsonIdArray(await AsyncStorage.getItem(k.posts));
  let unseenRaw = await AsyncStorage.getItem(k.unseen);

  const namespacedEmpty =
    ads.length === 0 &&
    posts.length === 0 &&
    (unseenRaw == null || unseenRaw === '' || Number(unseenRaw) === 0);

  if (namespacedEmpty) {
    const legAds = parseJsonIdArray(await AsyncStorage.getItem(LEGACY_ADS));
    const legPosts = parseJsonIdArray(await AsyncStorage.getItem(LEGACY_POSTS));
    const legUnseen = await AsyncStorage.getItem(LEGACY_UNSEEN);
    const hadLegacy =
      legAds.length > 0 ||
      legPosts.length > 0 ||
      (legUnseen != null && legUnseen !== '' && Number(legUnseen) > 0);
    if (hadLegacy) {
      ads = legAds;
      posts = legPosts;
      unseenRaw = legUnseen != null ? legUnseen : unseenRaw;
      await AsyncStorage.setItem(k.ads, JSON.stringify(ads));
      await AsyncStorage.setItem(k.posts, JSON.stringify(posts));
      if (legUnseen != null && legUnseen !== '') {
        await AsyncStorage.setItem(k.unseen, String(legUnseen));
      }
      await AsyncStorage.multiRemove([LEGACY_ADS, LEGACY_POSTS, LEGACY_UNSEEN]);
    }
  }

  const unseenNum = Number(unseenRaw);
  const unseenLikedCount =
    Number.isFinite(unseenNum) && unseenNum > 0 ? unseenNum : 0;

  return {
    likedListingIds: new Set(ads),
    likedPostIds: new Set(posts),
    unseenLikedCount,
  };
}

export async function persistLikedListingIds(userId, set) {
  if (userId == null || String(userId).trim() === '') return;
  const uid = String(userId).trim();
  await AsyncStorage.setItem(v1(uid).ads, JSON.stringify([...set]));
}

export async function persistLikedPostIds(userId, set) {
  if (userId == null || String(userId).trim() === '') return;
  const uid = String(userId).trim();
  await AsyncStorage.setItem(v1(uid).posts, JSON.stringify([...set]));
}

export async function persistUnseenLikedCount(userId, count) {
  if (userId == null || String(userId).trim() === '') return;
  const uid = String(userId).trim();
  await AsyncStorage.setItem(v1(uid).unseen, String(count));
}
