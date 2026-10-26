import {useEffect, useState} from 'react';
import {getListings, getProfessionalsDirectory, getReviews} from '../api/client';
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
    .filter(item => !item.isPost && subscriptionType(item.raw) === 'company' && item.videoUrl)
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
    getListings({category: FEATURED_CATEGORY_ID, subscription_type: 'company', signal: controller.signal})
      .then(data => setProjects(toFeaturedProjects(data?.listings)))
      .catch(() => {
        if (!controller.signal.aborted) setProjects([]);
      });
    return () => controller.abort();
  }, []);
  return projects;
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
