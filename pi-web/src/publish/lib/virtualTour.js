/**
 * Optional 3D tour / visualization link on company project listings.
 * Stored in ads.general_details.virtual_tour_url (https only).
 * Keep in sync with pi-front/utils/virtualTour.js and pi-back/virtualTour.js.
 */
export const VIRTUAL_TOUR_GD_KEY = 'virtual_tour_url';
export const VIRTUAL_TOUR_FIELD_KEY = 'virtualtour';
/** Company categories rendered in the standard project profile (קרקעות 7 has its own layout). */
export const VIRTUAL_TOUR_CATEGORY_IDS = new Set([1, 2, 4, 6, 8, 12]);
export const VIRTUAL_TOUR_INVALID_MESSAGE = 'קישור ההדמיה אינו תקין. הדביקו קישור שמתחיל ב-https://';

const MAX_URL_LENGTH = 2048;

/**
 * Accepts a pasted link or a full <iframe> embed code.
 * Returns '' when empty, null when invalid, otherwise a clean https URL.
 */
export function normalizeVirtualTourUrl(input) {
  let s = String(input ?? '').trim();
  if (!s) return '';
  const iframeSrc = s.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i);
  if (iframeSrc) s = iframeSrc[1].trim();
  s = s.replace(/&amp;/gi, '&');
  if (s.startsWith('//')) s = `https:${s}`;
  if (/^http:\/\//i.test(s)) s = `https://${s.slice(7)}`;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = `https://${s}`;
  if (s.length > MAX_URL_LENGTH || /[\s<>"'`\\]/.test(s)) return null;
  const m = s.match(/^https:\/\/([^/?#:@]+)(:\d{1,5})?([/?#].*)?$/i);
  if (!m) return null;
  const host = m[1].toLowerCase();
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) return null;
  return `https://${host}${m[2] || ''}${m[3] || ''}`;
}

/** Share links → their embeddable player URL (YouTube, Vimeo, Google Drive). Others pass through. */
export function virtualTourEmbedUrl(input) {
  const url = normalizeVirtualTourUrl(input);
  if (!url) return null;
  const yt = url.match(
    /^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i,
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/^https:\/\/(?:www\.)?vimeo\.com\/(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  const drive = url.match(/^https:\/\/drive\.google\.com\/file\/d\/([\w-]+)/i);
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
  return url;
}

function parseGeneralDetails(listing) {
  const raw = listing?.general_details ?? listing?.generalDetails ?? null;
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Saved tour link of a listing ('' when none or invalid). */
export function listingVirtualTourUrl(listing) {
  const gd = parseGeneralDetails(listing);
  return normalizeVirtualTourUrl(gd?.[VIRTUAL_TOUR_GD_KEY]) || '';
}

export function canAddVirtualTour(isCompany, category) {
  return Boolean(isCompany) && VIRTUAL_TOUR_CATEGORY_IDS.has(Number(category));
}

/** Insert the tour field before the address block (or last) — once. */
export function withVirtualTourField(fields) {
  const list = Array.isArray(fields) ? fields : [];
  if (list.some(f => f?.key === VIRTUAL_TOUR_FIELD_KEY)) return list;
  const field = {key: VIRTUAL_TOUR_FIELD_KEY};
  const at = list.findIndex(f => f?.key === 'propertyaddress');
  if (at < 0) return [...list, field];
  return [...list.slice(0, at), field, ...list.slice(at)];
}
