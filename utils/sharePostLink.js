const LISTING_UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function apiOrigin() {
  return String(
    process.env.EXPO_PUBLIC_API_URL || 'https://pi-back.vercel.app',
  ).replace(/\/+$/, '');
}

export function buildPublicPostShareUrl(listingId) {
  const id = String(listingId || '').trim().toLowerCase();
  if (!LISTING_UUID_RE.test(id)) return '';
  return `${apiOrigin()}/p/${id}`;
}

export function buildAppPostDeepLink(listingId) {
  const id = String(listingId || '').trim().toLowerCase();
  if (!LISTING_UUID_RE.test(id)) return '';
  return `pifrontend://post/${id}`;
}

export function buildExternalShareMessage(listingId, caption = '') {
  const url = buildPublicPostShareUrl(listingId);
  if (!url) return '';
  const text = String(caption || '').trim();
  const line = text && text.toLowerCase() !== 'פוסט' && text.toLowerCase() !== 'post'
    ? text
    : 'פוסט מפי 2701';
  return `${line}\n${url}`;
}

/** Extract a listing UUID from a share / deep-link URL. */
export function parseSharedPostIdFromUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  try {
    const url = new URL(s);
    const host = String(url.hostname || url.host || '').toLowerCase();
    const path = String(url.pathname || '');
    const proto = String(url.protocol || '').toLowerCase();
    if (proto === 'pifrontend:' || proto.startsWith('exp+')) {
      const fromQuery = url.searchParams.get('id');
      if (fromQuery && LISTING_UUID_RE.test(fromQuery)) {
        return fromQuery.toLowerCase();
      }
      if (host === 'post') {
        const id = path.replace(/^\//, '').split('/')[0];
        if (id && LISTING_UUID_RE.test(id)) return id.toLowerCase();
      }
      const parts = `${host}${path}`.split('/').filter(Boolean);
      const idx = parts.findIndex(p => String(p).toLowerCase() === 'post');
      if (idx >= 0 && parts[idx + 1] && LISTING_UUID_RE.test(parts[idx + 1])) {
        return parts[idx + 1].toLowerCase();
      }
    }
    const pathMatch = path.match(/\/p\/([0-9a-f-]{36})/i);
    if (pathMatch) return pathMatch[1].toLowerCase();
  } catch (_) {
    /* fall through to loose match */
  }
  const loose =
    s.match(/\/p\/([0-9a-f-]{36})/i) || s.match(/post\/([0-9a-f-]{36})/i);
  return loose ? loose[1].toLowerCase() : null;
}
