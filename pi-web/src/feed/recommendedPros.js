import {useEffect, useState} from 'react';
import {getProfessionalsDirectory} from '../api/client';

/** The recommended-professionals card is inserted after every this many feed cards. */
export const RECOMMENDED_PROS_EVERY = 5;
export const RECOMMENDED_PROS_COUNT = 5;

const text = v => (v == null ? '' : String(v).trim());
const list = v => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);

function toPro(row) {
  const tags = list(row.specializations);
  return {
    id: String(row.id),
    name: text(row.display_name || row.name),
    address: text(row.address),
    tags: tags.length ? tags : list(row.types),
    bio: text(row.bio),
    image: text(row.profile_image_url) || null,
    video: text(row.video_playback_url || row.video_url) || null,
    rating: Number(row.average_rating) || 0,
    raw: row,
  };
}

/** Highest-rated accounts of one type; the directory's own order breaks ties. */
export function topByType(rows, type, count = RECOMMENDED_PROS_COUNT) {
  return (Array.isArray(rows) ? rows : [])
    .filter(r => text(r?.subscription_type).toLowerCase() === type)
    .map((row, order) => ({pro: toPro(row), order}))
    .sort((a, b) => b.pro.rating - a.pro.rating || a.order - b.order)
    .slice(0, count)
    .map(x => x.pro);
}

export function topProfessionals(rows, count = RECOMMENDED_PROS_COUNT) {
  return topByType(rows, 'professional', count);
}

export function useRecommendedPros() {
  const [groups, setGroups] = useState({pros: [], brokers: []});
  useEffect(() => {
    const controller = new AbortController();
    getProfessionalsDirectory({signal: controller.signal})
      .then(data => {
        const rows = data?.professionals;
        setGroups({
          pros: topByType(rows, 'professional'),
          brokers: topByType(rows, 'broker'),
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) setGroups({pros: [], brokers: []});
      });
    return () => controller.abort();
  }, []);
  return groups;
}
