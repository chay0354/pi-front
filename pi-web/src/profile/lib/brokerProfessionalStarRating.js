/** Cumulative review counts required for star levels 1–5 (broker / professional). */
export const BROKER_PRO_STAR_THRESHOLDS = [5, 15, 35, 75, 155];

export const BROKER_PRO_LOW_RATING_WINDOW = 50;
export const BROKER_PRO_LOW_RATING_DROP_AT = 10;
/** Display before enough reviews exist to earn tier 1 (5 ratings). */
export const BROKER_PRO_STARTING_STARS = 1;

export const isBrokerOrProfessionalSubscriptionType = type => {
  const t = String(type || '')
    .toLowerCase()
    .trim();
  return t === 'broker' || t === 'professional' || t === 'project_marketer';
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
 * Broker / professional Pi display: starts at 1 star, tier progression by total
 * reviews, minus one star when 10+ low ratings (1–2) appear in the last 50 reviews.
 * @returns {number} 1–5
 */
export const computeBrokerProfessionalStarRating = reviews => {
  const rated = (Array.isArray(reviews) ? reviews : []).filter(r => {
    const n = Number(r?.rating);
    return Number.isFinite(n) && n >= 1 && n <= 5;
  });
  if (rated.length === 0) {
    return BROKER_PRO_STARTING_STARS;
  }

  let stars = brokerProfessionalStarsFromCount(rated.length);
  if (stars <= 0) {
    return BROKER_PRO_STARTING_STARS;
  }

  const sorted = [...rated].sort(
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
