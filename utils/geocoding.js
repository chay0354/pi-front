const geocodeCache = new Map();
let lastGeocodeAt = 0;

const NOMINATIM_MIN_GAP_MS = 1100;
const NOMINATIM_USER_AGENT = 'Pi2701App/1.0 (real-estate; contact@pi2701.com)';

const HEBREW_TYPO_FIXES = [['חיפב', 'חיפה']];

async function throttleGeocode() {
  const now = Date.now();
  const wait = NOMINATIM_MIN_GAP_MS - (now - lastGeocodeAt);
  if (wait > 0) {
    await new Promise(resolve => setTimeout(resolve, wait));
  }
  lastGeocodeAt = Date.now();
}

function fixHebrewTypos(text) {
  let out = String(text || '').trim();
  for (const [from, to] of HEBREW_TYPO_FIXES) {
    out = out.replace(new RegExp(from, 'g'), to);
  }
  return out;
}

function coordsFromNominatimRow(row) {
  if (!row?.lat || !row?.lon) return null;
  const latitude = Number(row.lat);
  const longitude = Number(row.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {latitude, longitude};
}

function buildGeocodeAttempts(address) {
  const raw = fixHebrewTypos(address);
  if (!raw || raw === 'מיקום לא זמין') return [];

  const attempts = [];
  const seen = new Set();
  const pushFree = q => {
    const query = fixHebrewTypos(q);
    if (!query || seen.has(query)) return;
    seen.add(query);
    attempts.push({type: 'free', query});
  };
  const pushStructured = (street, city) => {
    const s = fixHebrewTypos(street);
    const c = fixHebrewTypos(city);
    if (!s || !c) return;
    const key = `s:${s}|c:${c}`;
    if (seen.has(key)) return;
    seen.add(key);
    attempts.push({type: 'structured', street: s, city: c});
  };

  const parts = raw
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const city = parts[parts.length - 1];
    const streetPart = parts
      .slice(0, -1)
      .join(', ')
      .replace(/^רחוב\s+/u, '')
      .replace(/^שדרות\s+/u, '')
      .trim();
    const houseMatch = streetPart.match(/(\d+)/u);
    const houseNum = houseMatch ? houseMatch[1] : null;
    const streetName = streetPart.replace(/\d+/gu, '').trim();

    if (streetName && city) {
      if (houseNum) {
        pushStructured(`${houseNum} ${streetName}`, city);
        pushStructured(`${houseNum} שדרות ${streetName}`, city);
        pushFree(`${streetName} ${houseNum}, ${city}, Israel`);
      }
      pushFree(`${streetPart}, ${city}, Israel`);
    }
  }

  if (!/israel/i.test(raw) && !raw.includes('ישראל')) {
    pushFree(`${raw}, Israel`);
  } else {
    pushFree(raw);
  }

  return attempts;
}

/** Normalize free-text Israeli addresses for geocoders. */
export function normalizeGeocodeQuery(address) {
  return fixHebrewTypos(String(address || '').trim()) || null;
}

/** Build a geocoder query from a feed listing row. */
export function getListingGeocodeQuery(listing) {
  if (!listing) return null;
  const candidates = [
    listing.address,
    listing.search_address,
    listing.land_address,
    listing.location,
    listing.project_name,
    listing.property_name,
  ]
    .map(s => String(s || '').trim())
    .filter(Boolean);
  const primary = candidates.find(
    s => s !== 'מיקום לא זמין' && !/^text-post/i.test(s),
  );
  return normalizeGeocodeQuery(primary);
}

/** Great-circle distance in km between two lat/lng points. */
export function haversineDistanceKm(a, b) {
  if (!a || !b) return Infinity;
  const lat1 = Number(a.latitude);
  const lon1 = Number(a.longitude);
  const lat2 = Number(b.latitude);
  const lon2 = Number(b.longitude);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return Infinity;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const h =
    s1 * s1 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * s2 * s2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

async function fetchGeocodeAttempt(attempt) {
  await throttleGeocode();
  let url;
  if (attempt.type === 'structured') {
    const params = new URLSearchParams({
      format: 'json',
      limit: '1',
      street: attempt.street,
      city: attempt.city,
      country: 'Israel',
    });
    url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  } else {
    url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      attempt.query,
    )}`;
  }

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': NOMINATIM_USER_AGENT,
      'Accept-Language': 'he,en',
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const first = Array.isArray(data) ? data[0] : null;
  return coordsFromNominatimRow(first);
}

/** Geocode a free-text address to { latitude, longitude } (cached). */
export async function geocodeAddress(address) {
  const query = normalizeGeocodeQuery(address);
  if (!query) return null;
  if (geocodeCache.has(query)) return geocodeCache.get(query);

  const attempts = buildGeocodeAttempts(query);
  try {
    for (const attempt of attempts) {
      const coords = await fetchGeocodeAttempt(attempt);
      if (coords) {
        geocodeCache.set(query, coords);
        return coords;
      }
    }
    geocodeCache.set(query, null);
    return null;
  } catch (_) {
    geocodeCache.set(query, null);
    return null;
  }
}
