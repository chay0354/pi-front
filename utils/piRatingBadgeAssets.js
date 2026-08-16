/** Pi profile rating badges — composite 1–4 stars include the number; 5 stays legacy. */
export const PI_RATING_BADGE_RING = require('../assets/pi-badge-ring.png');
export const PI_RATING_FIVE_STARS_COMPACT = require('../assets/tiktok/5stars.png');
export const PI_RATING_REVIEW_STAR_FIVE = require('../assets/starts/5old.png');

/** Original review overlay stars (number inside the star), not the new Pi composites. */
export const PI_RATING_REVIEW_STARS = [
  require('../assets/starts/1.png'),
  require('../assets/starts/2.png'),
  require('../assets/starts/3.png'),
  require('../assets/starts/4.png'),
  require('../assets/starts/5old.png'),
];

export const PI_RATING_COMPOSITE_STARS = [
  require('../assets/new-stars/1-star.png'),
  require('../assets/new-stars/2-star.png'),
  require('../assets/new-stars/3-star.png'),
  require('../assets/new-stars/4-star.png'),
];

export function normalizePiRating(rating) {
  const n = Math.round(Number(rating));
  if (!Number.isFinite(n)) return 5;
  return Math.min(5, Math.max(1, n));
}

export function isPiRatingFive(rating) {
  return normalizePiRating(rating) >= 5;
}

/** Composite badge for ratings 1–4 (number baked into art). */
export function getPiRatingCompositeSource(rating) {
  const n = normalizePiRating(rating);
  if (n >= 5) return null;
  return PI_RATING_COMPOSITE_STARS[n - 1];
}

/** Star under the reviewer avatar — original 1–5 art from `assets/starts`. */
export function getPiReviewStarSource(rating) {
  const n = normalizePiRating(rating);
  return PI_RATING_REVIEW_STARS[n - 1] || PI_RATING_REVIEW_STAR_FIVE;
}
