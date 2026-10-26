/**
 * Permanent showcase rings on the home story strip. They are not rows in the
 * `stories` table, so the 24h expiry and purge never touch them.
 */
const photo = (id, width = 1080) =>
  `https://images.unsplash.com/${id}?w=${width}&q=80&auto=format&fit=crop`;

const ring = (key, displayName, photoIds) => ({
  subscription_id: `pi-default-${key}`,
  display_name: displayName,
  profile_image_url: photo(photoIds[0], 240),
  subscription_type: 'company',
  is_default_story: true,
  slides: photoIds.map((id, index) => ({
    id: `pi-default-${key}-${index}`,
    media_url: photo(id),
    media_type: 'image',
    kind: 'story',
  })),
});

export const DEFAULT_STORY_RINGS = [
  ring('projects', 'חדש מקבלן', [
    'photo-1486406146926-c627a92ad1ab',
    'photo-1582407947304-fd86f028f716',
    'photo-1541888946425-d81bb19240f5',
  ]),
  ring('homes', 'בתים ווילות', [
    'photo-1600585154340-be6161a56a0c',
    'photo-1600566753190-17f0baa2a6c3',
    'photo-1600607687939-ce8a6c25118c',
  ]),
  ring('pros', 'בעלי מקצוע', [
    'photo-1503387762-592deb58ef4e',
    'photo-1581092160562-40aa08e78837',
    'photo-1504307651254-35680f356dfd',
  ]),
  ring('brokers', 'תיווך', [
    'photo-1560518883-ce09059eeffa',
    'photo-1449844908441-8829872d2607',
    'photo-1497366216548-37526070297c',
  ]),
];

export function isDefaultStoryRing(ring) {
  return ring?.is_default_story === true;
}

/** Live rings first, the permanent showcase rings after them. */
export function withDefaultStoryRings(rings) {
  const live = Array.isArray(rings) ? rings : [];
  return [...live, ...DEFAULT_STORY_RINGS];
}
