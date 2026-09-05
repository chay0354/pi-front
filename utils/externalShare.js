import {Alert, Linking, Platform, Share} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {recordListingShare} from './api';
import {
  buildExternalShareMessage,
  buildPublicPostShareUrl,
} from './sharePostLink';

export const EXTERNAL_SHARE_PLATFORMS = [
  {
    id: 'whatsapp',
    label: 'וואטסאפ',
    icon: 'whatsapp',
    color: '#25D366',
  },
  {
    id: 'instagram',
    label: 'אינסטגרם',
    icon: 'instagram',
    color: '#E4405F',
  },
  {
    id: 'facebook',
    label: 'פייסבוק',
    icon: 'facebook',
    color: '#1877F2',
  },
  {
    id: 'tiktok',
    label: 'טיקטוק',
    icon: 'music-note',
    color: '#69C9D0',
  },
  {
    id: 'copy',
    label: 'העתקה',
    icon: 'link-variant',
    color: '#FEE787',
  },
];

const LISTING_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function listingIdForShare(item) {
  if (!item || typeof item !== 'object') return null;
  const candidates = [item.id, item.ad_id, item.listing_id, item.uuid];
  for (const c of candidates) {
    if (c == null) continue;
    const s = String(c).trim();
    if (LISTING_UUID_RE.test(s)) return s.toLowerCase();
  }
  return null;
}

async function openExternalUrl(url) {
  try {
    await Linking.openURL(url);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Share a listing/post link to WhatsApp, Instagram, Facebook, TikTok, or clipboard.
 * The HTTPS /p/:id link opens that item inside the Pi app.
 */
export async function shareListingToPlatform({
  platformId,
  listingId,
  caption = '',
  onShareCounted,
}) {
  const id = String(listingId || '').trim().toLowerCase();
  if (!LISTING_UUID_RE.test(id)) {
    Alert.alert('שיתוף', 'לא ניתן לשתף כרגע.');
    return false;
  }
  const publicUrl = buildPublicPostShareUrl(id);
  const message = buildExternalShareMessage(id, caption);
  const encodedMsg = encodeURIComponent(message);
  const encodedUrl = encodeURIComponent(publicUrl);

  const countShare = () => {
    recordListingShare(id)
      .then(serverCount => {
        if (typeof onShareCounted === 'function' && serverCount != null) {
          onShareCounted(id, serverCount);
        }
      })
      .catch(() => {});
  };

  if (platformId === 'whatsapp') {
    const native = `whatsapp://send?text=${encodedMsg}`;
    const web = `https://wa.me/?text=${encodedMsg}`;
    if (!(await openExternalUrl(native))) await openExternalUrl(web);
    countShare();
    return true;
  }
  if (platformId === 'facebook') {
    await openExternalUrl(
      `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    );
    countShare();
    return true;
  }
  if (platformId === 'instagram') {
    await Clipboard.setStringAsync(publicUrl);
    const ig = Platform.OS === 'ios' ? 'instagram://app' : 'instagram://';
    if (!(await openExternalUrl(ig))) {
      await openExternalUrl('https://www.instagram.com/');
    }
    Alert.alert(
      'אינסטגרם',
      'הקישור הועתק. הדביקו אותו בסטורי או בהודעה — לחיצה עליו תפתח את המודעה באפליקציית פי.',
    );
    countShare();
    return true;
  }
  if (platformId === 'tiktok') {
    await Clipboard.setStringAsync(publicUrl);
    const opened =
      (await openExternalUrl('tiktok://')) ||
      (await openExternalUrl('snssdk1233://'));
    if (!opened) await openExternalUrl('https://www.tiktok.com/');
    Alert.alert(
      'טיקטוק',
      'הקישור הועתק. הדביקו אותו ביומן או בהודעה — לחיצה עליו תפתח את המודעה באפליקציית פי.',
    );
    countShare();
    return true;
  }
  if (platformId === 'copy') {
    await Clipboard.setStringAsync(publicUrl);
    Alert.alert(
      'הקישור הועתק',
      'מי שלוחץ על הקישור יגיע למודעה הזו באפליקציית פי.',
    );
    countShare();
    return true;
  }
  await Share.share({message, url: publicUrl});
  countShare();
  return true;
}
