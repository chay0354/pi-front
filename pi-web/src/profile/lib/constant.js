/** Subset of mobile utils/constant.js used by the profile screen. */

const asset = path => new URL(`../assets/${path}`, import.meta.url).href;

export const categoryImages = {
  1: asset('category1.png'),
  2: asset('category2.png'),
  3: asset('category3.png'),
  4: asset('category4.png'),
  5: asset('category5.png'),
  6: asset('category6.png'),
  7: asset('category7.png'),
  8: asset('category8.png'),
  10: asset('category10.png'),
  12: asset('tik12.png'),
};

export const subscriptionTypes = {
  user: 'user',
  company: 'company',
  professional: 'professional',
  broker: 'broker',
  projectMarketer: 'project_marketer',
};

/** Broker, company, professional and project marketer — not regular (`user`) accounts. */
export function isB2BSubscriptionType(type) {
  const t = String(type || '').trim().toLowerCase();
  return (
    t === subscriptionTypes.broker ||
    t === subscriptionTypes.company ||
    t === subscriptionTypes.professional ||
    t === subscriptionTypes.projectMarketer
  );
}

export function isProjectMarketerType(type) {
  return (
    String(type || '').trim().toLowerCase() === subscriptionTypes.projectMarketer
  );
}

/** Company + משווק: the org logo is the avatar (no separate profile photo). */
export function usesOrgLogoAsAvatar(subscriptionType) {
  const t = resolveSubscriptionType(subscriptionType);
  return t === subscriptionTypes.company || t === subscriptionTypes.projectMarketer;
}

/** Broker + משווק פרויקטים — same upload forms, profiles, feed overlays, and filters. */
export function isBrokerLikeSubscriptionType(subscriptionType) {
  const t = resolveSubscriptionType(subscriptionType);
  return t === subscriptionTypes.broker || t === subscriptionTypes.projectMarketer;
}

/** Marketing manager: project marketer on a team plan (has seats to fill). */
export function isMarketingManager(user) {
  if (!user) return false;
  if (!isProjectMarketerType(user.subscription_type ?? user.subscriptionType)) {
    return false;
  }
  const seats = Number(user.marketer_seat_limit ?? user.marketerSeatLimit);
  return Number.isFinite(seats) && seats > 0;
}

/** Public profile chip under the name: team lead vs regular marketer. */
export function getProjectMarketerRoleLabel(user) {
  return isMarketingManager(user) ? 'מנהל שיווק' : 'משווק';
}

/** Team marketer seated under a marketing manager — not the manager themselves. */
export function isTeamMarketerUnderManager(user) {
  if (!user || typeof user !== 'object') return false;
  if (!isProjectMarketerType(user.subscription_type ?? user.subscriptionType)) {
    return false;
  }
  if (isMarketingManager(user)) return false;
  return Boolean(user.parent_subscription_id || user.parentSubscriptionId);
}

export function isRegularSubscriptionType(subscriptionType) {
  const t = resolveSubscriptionType(subscriptionType);
  return !(
    t === subscriptionTypes.broker ||
    t === subscriptionTypes.company ||
    t === subscriptionTypes.professional ||
    t === subscriptionTypes.projectMarketer
  );
}

/** Open (non-broker) group-create flow: regular, professional, company, project marketer. */
export function usesOpenChatGroupFlow(subscriptionType) {
  const t = resolveSubscriptionType(subscriptionType);
  if (t === subscriptionTypes.broker) return false;
  return (
    isRegularSubscriptionType(t) ||
    t === subscriptionTypes.professional ||
    t === subscriptionTypes.company ||
    t === subscriptionTypes.projectMarketer
  );
}

export function isCompanySubscriptionType(subscriptionType) {
  const t = resolveSubscriptionType(subscriptionType);
  return t === subscriptionTypes.company;
}

export const shouldShowProfileGoldRing = subscriptionType => {
  const t = resolveSubscriptionType(subscriptionType);
  return (
    t === subscriptionTypes.company ||
    t === subscriptionTypes.professional ||
    t === subscriptionTypes.broker ||
    t === subscriptionTypes.projectMarketer
  );
};

/** Normalize subscription type from strings, users, listings, or chat peers. */
export function resolveSubscriptionType(source) {
  if (source == null) return '';
  if (typeof source === 'string' || typeof source === 'number') {
    return String(source).toLowerCase().trim();
  }
  if (typeof source !== 'object') return '';
  const subObj =
    source.subscription && typeof source.subscription === 'object'
      ? source.subscription
      : null;
  const candidates = [
    source.subscription_type,
    source.subscriptionType,
    source.type,
    source.creator_subscription_type,
    source.created_by_subscription_type,
    source.recentSubscriptionType,
    subObj?.subscription_type,
    subObj?.subscriptionType,
    subObj?.type,
    source.creator?.subscription_type,
  ];
  for (const v of candidates) {
    if (v != null && String(v).trim() !== '') {
      return String(v).toLowerCase().trim();
    }
  }
  return '';
}
