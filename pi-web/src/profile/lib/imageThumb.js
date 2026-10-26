/**
 * Supabase Storage image transformation helper.
 *
 * Public object URLs can be served through the image renderer, which resizes
 * on the CDN. Small grids (profile post tiles) otherwise pull the full-size
 * upload — several MB for a phone photo — to fill a ~120px cell.
 *
 * Returns null when the URL is not a transformable Supabase public object, so
 * callers can keep using the original.
 */
const PUBLIC_OBJECT_PATH = '/storage/v1/object/public/';
const RENDER_PATH = '/storage/v1/render/image/public/';

export function supabaseThumbUri(uri, {width, quality = 70} = {}) {
  if (!uri || typeof uri !== 'string') return null;
  const trimmed = uri.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  if (!trimmed.includes(PUBLIC_OBJECT_PATH)) return null;
  // Already a render URL, or a video — nothing to do.
  if (trimmed.includes(RENDER_PATH)) return null;
  if (/\.(mp4|mov|m4v|webm|m3u8)(\?|#|$)/i.test(trimmed)) return null;
  const [base, query = ''] = trimmed.split('#')[0].split('?');
  if (!/\.(jpe?g|png|webp)$/i.test(base)) return null;
  const params = new URLSearchParams(query);
  if (width > 0) params.set('width', String(Math.round(width)));
  params.set('quality', String(quality));
  return `${base.replace(PUBLIC_OBJECT_PATH, RENDER_PATH)}?${params.toString()}`;
}

export default supabaseThumbUri;
