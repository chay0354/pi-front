/** Cumulative review counts required for star levels 1–5 (broker / professional). */
export const BROKER_PRO_STAR_THRESHOLDS = [5, 15, 35, 75, 155];

export const BROKER_PRO_LOW_RATING_WINDOW = 50;
export const BROKER_PRO_LOW_RATING_DROP_AT = 10;
export const BROKER_PRO_MIN_RATINGS_FOR_TIER = BROKER_PRO_STAR_THRESHOLDS[0];

export const isBrokerOrProfessionalSubscriptionType = type => {
  const t = String(type || '')
    .toLowerCase()
    .trim();
  return t === 'broker' || t === 'professional';
};

const reviewTimestamp = review => {
  const t = new Date(review?.created_at || 0).getTime();
  return Number.isFinite(t) ? t : 0;
};

/** Star level (1–5) from total review count before regression penalty. */
export const brokerProfessionalStarsFromCount = totalCount => {
  const total = Math.max(0, Number(totalCount) || 0);
  let stars = 0;
  for (let i = BROKER_PRO_STAR_THRESHOLDS.length - 1; i >= 0; i--) {
    if (total >= BROKER_PRO_STAR_THRESHOLDS[i]) {
      stars = i + 1;
      break;
    }
  }
  return stars;
};

/**
 * Broker / professional Pi display: tier progression by total reviews, minus one
 * star when 10+ low ratings (1–2) appear in the last 50 reviews.
 * @returns {number|null} 1–5 when tier applies; null when fewer than 5 reviews
 */
export const computeBrokerProfessionalStarRating = reviews => {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return null;
  }
  if (reviews.length < BROKER_PRO_MIN_RATINGS_FOR_TIER) {
    return null;
  }

  let stars = brokerProfessionalStarsFromCount(reviews.length);
  if (stars <= 0) {
    return null;
  }

  const sorted = [...reviews].sort(
    (a, b) => reviewTimestamp(b) - reviewTimestamp(a),
  );
  const lastWindow = sorted.slice(0, BROKER_PRO_LOW_RATING_WINDOW);
  const lowCount = lastWindow.filter(r => {
    const n = Number(r?.rating);
    return n === 1 || n === 2;
  }).length;

  if (lowCount >= BROKER_PRO_LOW_RATING_DROP_AT) {
    stars = Math.max(1, stars - 1);
  }

  return Math.min(5, Math.max(1, stars));
};
