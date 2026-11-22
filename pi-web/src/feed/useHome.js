import {useEffect, useState} from 'react';
import {getBusinessProfiles, getListings, getProfessionalsDirectory, getReviews, getStoriesFeed} from '../api/client';
import {subscriptionType, toFeedItem} from './listingRules';
import {
  cappedMuxUri,
  isHlsUri,
  muxThumbnailUri,
  resolveAdVideoUri,
  resolveListingEditVideoSourceUrl,
} from '../profile/lib/videoPlayback';

/** Mobile Home: featured projects are company video ads from חדש מקבלן. */
export const FEATURED_CATEGORY_ID = 1;

const TOP_RATED_CANDIDATES = 6;

const text = v => (v == null ? '' : String(v).trim());
const firstText = list => (Array.isArray(list) ? list.map(text).find(Boolean) : '') || '';

/** Mobile getFeatureProjectName. */
function featureProjectName(listing) {
  return text(
    listing.project_name || listing.property_name || listing.business_name || listing.creator_business_name,
  );
}

/** Mux HLS when the ad has one (starts in a small segment). Otherwise the uploaded file. */
function featuredMedia(listing) {
  const playback = resolveAdVideoUri(listing);
  const raw = resolveListingEditVideoSourceUrl(listing) || '';
  const hls = playback && isHlsUri(playback) ? cappedMuxUri(playback, '720p') : '';
  return {
    videoUrl: hls || raw || playback || '',
    fallbackUrl: hls ? raw : '',
    poster: (hls && muxThumbnailUri(playback, {time: 0, width: 720})) || '',
  };
}

/** Mobile filterCompanyVideoListings: company ads (not posts) that have a playable video. */
function toFeaturedProjects(listings) {
  return (Array.isArray(listings) ? listings : [])
    .map(toFeedItem)
    .filter(item => {
      const type = subscriptionType(item.raw);
      return !item.isPost && (type === 'company' || type === 'business') && item.videoUrl;
    })
    .map(item => {
      const media = featuredMedia(item.raw);
      return {
        id: item.id,
        name: featureProjectName(item.raw),
        videoUrl: media.videoUrl || item.videoUrl,
        fallbackUrl: media.fallbackUrl,
        poster: media.poster || item.images[0] || null,
        logo: item.creatorAvatar,
        raw: item.raw,
      };
    });
}

function toPro(row) {
  return {
    id: String(row.id),
    type: text(row.subscription_type).toLowerCase(),
    name: text(row.display_name || row.name),
    profession: firstText(row.types) || firstText(row.specializations),
    image: text(row.profile_image_url) || null,
    rating: Math.min(5, Math.max(1, Math.round(Number(row.average_rating)) || 1)),
    raw: row,
  };
}

/** Pros with a photo first; the directory's own order (most recently updated) breaks ties. */
function byPhotoFirst(pros) {
  return pros
    .map((pro, order) => ({pro, order}))
    .sort((a, b) => Number(Boolean(b.pro.image)) - Number(Boolean(a.pro.image)) || a.order - b.order)
    .map(x => x.pro);
}

/** Highest-rated profile of a type, preferring one whose latest written review can be quoted. */
async function topRated(pros, type, signal) {
  const candidates = pros
    .filter(p => p.type === type)
    .map((pro, order) => ({pro, order}))
    .sort((a, b) => b.pro.rating - a.pro.rating || Number(Boolean(b.pro.image)) - Number(Boolean(a.pro.image)) || a.order - b.order)
    .slice(0, TOP_RATED_CANDIDATES)
    .map(x => x.pro);
  if (!candidates.length) return null;
  const reviews = await Promise.all(
    candidates.map(pro => getReviews(pro.id, {signal}).catch(() => [])),
  );
  const pick = candidates.findIndex((_, i) => reviews[i].some(r => text(r.comment)));
  if (pick < 0) return {pro: candidates[0], review: null};
  const review = reviews[pick].find(r => text(r.comment));
  return {
    pro: candidates[pick],
    review: {text: text(review.comment), avatar: text(review.reviewer_image_url) || null},
  };
}

export function useFeaturedProjects() {
  const [projects, setProjects] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    getListings({
      category: FEATURED_CATEGORY_ID,
      subscription_type: 'company,business',
      signal: controller.signal,
    })
      .then(data => setProjects(toFeaturedProjects(data?.listings)))
      .catch(() => {
        if (!controller.signal.aborted) setProjects([]);
      });
    return () => controller.abort();
  }, []);
  return projects;
}

const REGULAR_TYPES = new Set(['user', 'private', 'regular', 'customer']);

function isRegularType(type) {
  const value = String(type || '').trim().toLowerCase();
  return !value || REGULAR_TYPES.has(value);
}

function businessDisplayName(row) {
  const type = String(row?.subscription_type || '').trim().toLowerCase();
  const name = text(row?.name);
  const contact = text(row?.contact_person_name);
  const business = text(row?.business_name);
  const office = text(row?.broker_office_name);
  if (type === 'company' || type === 'business' || type === 'project_marketer') return business || name || contact;
  if (type === 'broker') return office || business || name || contact;
  return name || business || contact;
}

function businessAvatar(row) {
  const type = String(row?.subscription_type || '').trim().toLowerCase();
  const photo = text(row?.profile_picture_url);
  const logo = text(row?.company_logo_url);
  if (photo) return photo;
  if (type === 'company' || type === 'business' || type === 'project_marketer') return logo || null;
  return null;
}

/** Story rings first, then every other business account with an empty story. */
function mergeHomeRings(storyRings, accounts) {
  const byId = new Map();
  const add = ring => {
    const id = ring?.subscription_id != null ? String(ring.subscription_id) : '';
    if (!id || byId.has(id) || isRegularType(ring.subscription_type)) return;
    const name = String(ring.display_name || '').trim();
    if (!name) return;
    byId.set(id, {
      subscription_id: ring.subscription_id,
      display_name: name,
      profile_image_url: ring.profile_image_url || null,
      subscription_type: String(ring.subscription_type || '').trim().toLowerCase() || null,
      slides: Array.isArray(ring.slides) ? ring.slides : [],
    });
  };
  for (const ring of storyRings) add(ring);
  for (const row of accounts) {
    add({
      subscription_id: row?.id,
      display_name: businessDisplayName(row),
      profile_image_url: businessAvatar(row),
      subscription_type: row?.subscription_type,
      slides: [],
    });
  }
  const withSlides = [];
  const without = [];
  for (const ring of byId.values()) {
    if (ring.slides.length > 0) withSlides.push(ring);
    else without.push(ring);
  }
  return [...withSlides, ...without];
}

const STORY_ACTIVE_MS = 24 * 60 * 60 * 1000;

/** Keep only slides from the last 24 hours (same window as GET /api/stories/feed). */
export function filterSlidesLast24h(slides) {
  const cutoff = Date.now() - STORY_ACTIVE_MS;
  return (Array.isArray(slides) ? slides : []).filter(slide => {
    if (!slide || slide.kind === 'portrait') return false;
    const t = new Date(slide.created_at || 0).getTime();
    // Feed already scoped to 24h; missing created_at still counts as live.
    return !Number.isFinite(t) || t <= 0 || t >= cutoff;
  });
}

/** Rings that have at least one live story slide — used by StoryScreen, not the home strip. */
export function ringsWithLiveStories(rings) {
  return (Array.isArray(rings) ? rings : [])
    .map(ring => {
      const slides = filterSlidesLast24h(ring?.slides);
      return slides.length > 0 ? {...ring, slides} : null;
    })
    .filter(Boolean);
}

/** Home circles: every broker, company, professional and project marketer, with or without a story. */
export function useHomeStories() {
  const [rings, setRings] = useState([]);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getStoriesFeed().catch(() => ({rings: []})),
      getBusinessProfiles().catch(() => []),
    ]).then(([stories, accounts]) => {
      if (cancelled) return;
      setRings(
        mergeHomeRings(
          Array.isArray(stories?.rings) ? stories.rings : [],
          Array.isArray(accounts) ? accounts : [],
        ),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return rings;
}

/** Professionals strip plus the two "כוכבי פאי" cards (brokers on the right, professionals on the left). */
export function useHomeProfessionals() {
  const [state, setState] = useState({pros: [], topBroker: null, topProfessional: null});
  useEffect(() => {
    const controller = new AbortController();
    const {signal} = controller;
    getProfessionalsDirectory({signal})
      .then(async data => {
        const pros = (Array.isArray(data?.professionals) ? data.professionals : []).map(toPro).filter(p => p.name);
        setState(prev => ({...prev, pros: byPhotoFirst(pros)}));
        const [topBroker, topProfessional] = await Promise.all([
          topRated(pros, 'broker', signal),
          topRated(pros, 'professional', signal),
        ]);
        if (!signal.aborted) setState(prev => ({...prev, topBroker, topProfessional}));
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return state;
}
