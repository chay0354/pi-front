/**
 * Normalize chat / share-sheet avatar URLs the same way as the inbox.
 * Turns storage paths into public HTTPS URLs and drops the old placeholder asset.
 */
export function normalizeChatAvatarUrl(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (
    lower.includes('/assets/assets/image-copy-10.png') ||
    lower.endsWith('/image-copy-10.png') ||
    lower === 'image-copy-10.png'
  ) {
    return null;
  }
  if (raw.startsWith('//')) return `https:${raw}`;
  if (/^(file:|blob:)/i.test(raw)) return null;
  if (/^https?:\/\//i.test(raw)) {
    try {
      return encodeURI(raw);
    } catch (_) {
      return raw;
    }
  }
  const sb = process.env.EXPO_PUBLIC_SUPABASE_URL
    ? String(process.env.EXPO_PUBLIC_SUPABASE_URL).trim()
    : '';
  let origin = sb;
  if (origin && !/^https?:\/\//i.test(origin)) origin = `https://${origin}`;
  if (origin) {
    try {
      const u = new URL(origin);
      origin = `${u.protocol}//${u.host}`;
    } catch (_) {
      origin = origin.replace(/\/+$/, '');
    }
    if (raw.startsWith('/storage/v1/object/public/')) return `${origin}${raw}`;
    if (raw.startsWith('storage/v1/object/public/')) return `${origin}/${raw}`;
    if (raw.startsWith('/storage/v1/object/sign/')) return `${origin}${raw}`;
    if (raw.startsWith('storage/v1/object/sign/')) return `${origin}/${raw}`;
    if (raw.startsWith('/object/public/')) return `${origin}/storage/v1${raw}`;
    if (raw.startsWith('object/public/')) return `${origin}/storage/v1/${raw}`;
    if (raw.startsWith('/public/')) return `${origin}/storage/v1/object${raw}`;
    if (raw.startsWith('public/')) return `${origin}/storage/v1/object/${raw}`;
    if (raw.startsWith('/profile-pics/'))
      return `${origin}/storage/v1/object/public${raw}`;
    if (raw.startsWith('profile-pics/'))
      return `${origin}/storage/v1/object/public/${raw}`;
    if (raw.startsWith('/company-logos/'))
      return `${origin}/storage/v1/object/public${raw}`;
    if (raw.startsWith('company-logos/'))
      return `${origin}/storage/v1/object/public/${raw}`;
    if (/^[^/]+\/.+/.test(raw))
      return `${origin}/storage/v1/object/public/${raw}`;
  }
  try {
    if (/^https?:\/\//i.test(raw)) return encodeURI(raw);
    return raw;
  } catch (_) {
    return raw;
  }
}
