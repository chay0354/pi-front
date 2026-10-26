import {useCallback, useEffect, useMemo, useState} from 'react';
import {getFollowStats, getListings, getReviews, getSubscription, toSubscriptionId} from '../api/client';
import {
  getProjectMarketerRoleLabel,
  isBrokerLikeSubscriptionType,
  isCompanySubscriptionType,
  isMarketingManager,
  isProjectMarketerType,
  isTeamMarketerUnderManager,
  subscriptionTypes,
  usesOrgLogoAsAvatar,
} from './lib/constant';
import {parseLandBlockParcelFromListing} from './lib/enrichListingForUserProfile';
import {resolveFeedVideoPosterUri, resolveFeedVideoUri} from './lib/feedVideoPreload';
import {normalizeLandOfferParcels} from './lib/landListingFields';
import {buildProfileAdFeatureLabels} from './lib/listingAmenities';
import {
  displayPiRatingFromReviews,
  firstImageUrl,
  firstVideoUrl,
  isRateableSubscriptionType,
  readCompanyProjectStats,
} from './lib/listingGridCardFigma';
import {isAdsListingRecord} from './lib/listingShape';
import {isPostListingRecord} from './lib/pickTopViewedListingForProfile';
import {hasSeparateProfileAndCompanyLogo, resolveProfileDisplayName, resolveProfileEmail} from './lib/profileFields';
import {
  getListingFeedAvatarUrl,
  getUserCompanyLogoUrl,
  getUserProfileImageUrl,
  getUserProfilePhotoUrl,
  resolveBnbListingHostType,
  shouldForceGoldRingForListing,
} from './lib/userProfileImage';
import {muxThumbnailUri} from './lib/videoPlayback';

export const MAX_VISIBLE_REVIEWS = 5;
export const POST_GRID_PAGE_SIZE = 6;

const DUMMY_PROFILE = {
  name: 'דוד לוי תיווך בע"מ',
  email: 'davidlevi@gmail.com',
  profileImageUrl: null,
  likes: 246,
  following: 626,
  followers: 257,
};

export const isVideoLikeMediaUrl = url => {
  const s = String(url || '')
    .trim()
    .toLowerCase();
  if (!s) return true;
  if (/\.(mp4|webm|mov|m4v|mkv)(\?|#|$)/i.test(s)) return true;
  if (/\/videos?\//i.test(s)) return true;
  return false;
};

export const formatPostViewCount = n => {
  const num = Number(n) || 0;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(num);
};

export const getListingViewCount = listing => Number(listing?.view_count ?? listing?.views ?? 0) || 0;

const resolveLastAdHeroVideoUri = ad => {
  if (!ad) return null;
  const fromListing = firstVideoUrl(ad);
  if (fromListing) return fromListing;
  const fromFeed = resolveFeedVideoUri(ad);
  if (fromFeed) return fromFeed;
  if (ad.video && typeof ad.video === 'object') {
    const u = String(ad.video.uri || ad.video.url || '').trim();
    if (u) return u;
  }
  if (typeof ad.video === 'string') {
    const u = ad.video.trim();
    if (u) return u;
  }
  const rows = [
    ...(Array.isArray(ad.listing_images) ? ad.listing_images : []),
    ...(Array.isArray(ad.images) ? ad.images : []),
  ];
  for (const img of rows) {
    const u =
      img && typeof img === 'object' ? img.uri || img.image_url || img.url : typeof img === 'string' ? img : null;
    const s = String(u || '').trim();
    if (s && isVideoLikeMediaUrl(s)) return s;
  }
  return null;
};

export const isPresentContactValue = value => {
  const s = value != null ? String(value).trim() : '';
  if (!s) return false;
  const lower = s.toLowerCase();
  return (
    lower !== 'https://' &&
    lower !== 'http://' &&
    lower !== '-' &&
    lower !== '—' &&
    lower !== 'n/a' &&
    !lower.includes('placeholder')
  );
};

const uniqueContactPhones = values =>
  (Array.isArray(values) ? values : [])
    .map(p => (p != null ? String(p).trim() : ''))
    .filter((p, i, arr) => isPresentContactValue(p) && arr.indexOf(p) === i);

const parseList = raw => {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];
  const split = () =>
    raw
      .split(',')
      .map(s => String(s).trim())
      .filter(Boolean);
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : split();
  } catch {
    return split();
  }
};

const ADDRESS_PLACEHOLDERS = new Set(['', 'מיקום לא זמין', 'מיקום לא צוין']);
export const firstNonEmpty = (...values) => {
  for (const v of values) {
    const s = v == null ? '' : String(v).trim();
    if (s && !ADDRESS_PLACEHOLDERS.has(s)) return s;
  }
  return '';
};

const isPlaceholderCreator = (name, email) => {
  const n = (name && String(name).trim()) || '';
  const e = (email && String(email).trim()) || '';
  return (
    (n === 'מתווך' && (e === 'broker-placeholder@example.com' || e.includes('placeholder'))) ||
    e.includes('@placeholder.local')
  );
};

function toResolvedCreator(creatorId, s) {
  const isBrokerAccount = String(s.subscription_type || '').toLowerCase() === subscriptionTypes.broker;
  const phones = (isBrokerAccount ? [s.phone, s.mobile_phone] : [s.phone, s.mobile_phone, s.office_phone]).filter(
    p => p != null && String(p).trim(),
  );
  const trimOrNull = v => (v && String(v).trim() ? String(v).trim() : null);
  const list = raw => {
    if (raw == null) return null;
    const out = parseList(raw);
    return out.length > 0 ? out : null;
  };
  const descVal = s.description ?? s.bio ?? s.desc ?? s.about ?? null;
  return {
    id: creatorId,
    name: resolveProfileDisplayName(s, {fallback: ''}) || null,
    email: s.email || null,
    business_address: trimOrNull(s.business_address),
    company_website: trimOrNull(s.company_website),
    company_logo_url: trimOrNull(s.company_logo_url),
    companyLogoUrl: trimOrNull(s.company_logo_url),
    profilePictureUrl: s.profile_picture_url || null,
    activity_regions: list(s.activity_regions),
    types: list(s.types),
    specializations: list(s.specializations),
    description: trimOrNull(descVal),
    phones: phones.length > 0 ? phones : null,
    subscription_type: (s.subscription_type || '').toLowerCase() || null,
    marketer_seat_limit: s.marketer_seat_limit ?? s.marketerSeatLimit ?? null,
    parent_subscription_id: toSubscriptionId(s.parent_subscription_id),
  };
}

/** Listings payloads from the web client: `{listings}` (mobile also checks `success`). */
const listingsOf = result => (result?.success !== false && Array.isArray(result?.listings) ? result.listings : []);

/**
 * Mobile UserProfileScreen view model, field for field. The web has no login,
 * so the viewer is always a guest (never the profile owner).
 */
export function useUserProfile(user) {
  const isListingFromFeed = Boolean(
    user && !user._fromProfessionalsDirectory && (isAdsListingRecord(user) || isPostListingRecord(user)),
  );
  const profile = !isListingFromFeed && user ? user : DUMMY_PROFILE;
  const creatorId = toSubscriptionId(
    user?.subscription_id ||
      user?.owner_id ||
      user?.creator_subscription_id ||
      (!isListingFromFeed && !isAdsListingRecord(user) && !isPostListingRecord(user) ? user?.id || profile?.id : null),
  );
  const bnbFeedListing =
    isListingFromFeed && !isPostListingRecord(user) && Number(user?.category) === 5 ? user : null;
  const bnbListingHostType = resolveBnbListingHostType(bnbFeedListing);
  const isBnbCommentsOnly = bnbListingHostType === 'private';
  const isBnbReviewsWithStars = bnbListingHostType === 'business';

  const [resolvedCreator, setResolvedCreator] = useState(null);
  const [parentAgency, setParentAgency] = useState(null);
  const [userListings, setUserListings] = useState([]);
  const [userListingsLoading, setUserListingsLoading] = useState(false);
  const [postGridListings, setPostGridListings] = useState([]);
  const [postGridLoading, setPostGridLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    setResolvedCreator(null);
    setParentAgency(null);
  }, [user?.id, creatorId]);

  useEffect(() => {
    if (!creatorId) return undefined;
    let cancelled = false;
    getSubscription(creatorId)
      .then(data => {
        if (cancelled || !data?.subscription) return;
        setResolvedCreator(toResolvedCreator(creatorId, data.subscription));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [creatorId, user?.id]);

  useEffect(() => {
    const parentId = toSubscriptionId(resolvedCreator?.parent_subscription_id);
    const isTeamMarketer =
      isProjectMarketerType(resolvedCreator?.subscription_type) && !!parentId && !isMarketingManager(resolvedCreator);
    if (!isTeamMarketer) {
      setParentAgency(null);
      return undefined;
    }
    let cancelled = false;
    getSubscription(parentId)
      .then(data => {
        if (cancelled || !data?.subscription) return;
        setParentAgency(data.subscription);
      })
      .catch(() => {
        if (!cancelled) setParentAgency(null);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedCreator]);

  useEffect(() => {
    if (!creatorId) {
      setUserListings([]);
      return undefined;
    }
    let cancelled = false;
    setUserListingsLoading(true);
    getListings({subscription_id: creatorId})
      .then(result => {
        if (!cancelled) setUserListings(listingsOf(result));
      })
      .catch(() => {
        if (!cancelled) setUserListings([]);
      })
      .finally(() => {
        if (!cancelled) setUserListingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [creatorId]);

  useEffect(() => {
    if (!creatorId) {
      setPostGridListings([]);
      setPostGridLoading(false);
      return undefined;
    }
    let cancelled = false;
    setPostGridLoading(true);
    getListings({subscription_id: creatorId, feed_post: true})
      .then(result => {
        if (!cancelled) setPostGridListings(listingsOf(result));
      })
      .catch(() => {
        if (!cancelled) setPostGridListings([]);
      })
      .finally(() => {
        if (!cancelled) setPostGridLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [creatorId]);

  const reviewSubType = (
    resolvedCreator?.subscription_type ||
    user?.subscription_type ||
    user?.creator_subscription_type ||
    ''
  ).toLowerCase();

  const reloadReviews = useCallback(
    () =>
      getReviews(creatorId)
        .then(rows => {
          setReviews(rows);
          return rows;
        })
        .catch(() => null),
    [creatorId],
  );

  useEffect(() => {
    if (!creatorId) {
      setReviews([]);
      return undefined;
    }
    if (reviewSubType && !isRateableSubscriptionType(reviewSubType) && !isBnbCommentsOnly && !isBnbReviewsWithStars) {
      setReviews([]);
      setReviewsLoading(false);
      return undefined;
    }
    let cancelled = false;
    setReviewsLoading(true);
    getReviews(creatorId)
      .then(rows => {
        if (!cancelled) setReviews(rows);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [creatorId, reviewSubType, isBnbCommentsOnly, isBnbReviewsWithStars]);

  const rawNameFromSource =
    user?.business_name ||
    user?.creator_name ||
    user?.name ||
    user?.agent_name ||
    user?.contact_person_name ||
    user?.broker_office_name ||
    resolvedCreator?.name ||
    (isListingFromFeed ? '' : profile.name);
  const rawEmailFromSource =
    resolvedCreator?.email || user?.email || user?.creator_email || (isListingFromFeed ? '' : profile.email);
  const placeholderCreator = isPlaceholderCreator(rawNameFromSource, rawEmailFromSource);
  const rawName = placeholderCreator && isListingFromFeed ? '' : rawNameFromSource;
  const rawEmail = placeholderCreator && isListingFromFeed ? '' : rawEmailFromSource;

  const displayName = (() => {
    if (isTeamMarketerUnderManager(resolvedCreator || user) && resolvedCreator?.name) return resolvedCreator.name;
    if (isListingFromFeed) return rawName && String(rawName).trim() ? String(rawName).trim() : 'משתמש';
    if (resolvedCreator?.name) return resolvedCreator.name;
    const subType = (user?.subscription_type || user?.creator_subscription_type || '').toLowerCase();
    if (subType) {
      const typedName = resolveProfileDisplayName({...user, subscription_type: subType}, {fallback: ''});
      if (typedName) return typedName;
    }
    if (rawName && String(rawName).trim()) return String(rawName).trim();
    return profile.name;
  })();
  const displayEmail =
    resolveProfileEmail(
      {email: rawEmail, creator_email: user?.creator_email},
      {preferred: resolvedCreator?.email, fallback: isListingFromFeed ? '' : profile.email},
    ) || null;

  const agencyContact = (() => {
    if (!parentAgency) return null;
    if (!isProjectMarketerType(resolvedCreator?.subscription_type)) return null;
    if (isMarketingManager(resolvedCreator)) return null;
    const phones = uniqueContactPhones([
      parentAgency.phone,
      parentAgency.mobile_phone,
      parentAgency.office_phone,
      ...(Array.isArray(parentAgency.phones) ? parentAgency.phones : []),
    ]);
    const email = resolveProfileEmail(parentAgency);
    const str = v => (typeof v === 'string' ? v.trim() : '');
    const website = str(parentAgency.company_website || parentAgency.companyWebsite || '');
    const address = str(parentAgency.business_address || parentAgency.businessAddress || '');
    const logo = str(parentAgency.company_logo_url || parentAgency.companyLogoUrl || parentAgency.profile_picture_url || '');
    return {
      name: resolveProfileDisplayName(parentAgency, {fallback: ''}) || '',
      email: isPresentContactValue(email) ? email : '',
      phones,
      website: isPresentContactValue(website) ? website : '',
      address: isPresentContactValue(address) ? address : '',
      logo: isPresentContactValue(logo) ? logo : '',
    };
  })();

  const profileSubject = resolvedCreator || user;
  const headerProfilePhoto =
    getUserProfilePhotoUrl(resolvedCreator) || getUserProfilePhotoUrl(user) || getUserProfilePhotoUrl(profile) || '';
  const orgLogoAvatar = usesOrgLogoAsAvatar(resolvedCreator?.subscription_type || user?.subscription_type);
  const displayImageRaw =
    headerProfilePhoto ||
    (orgLogoAvatar
      ? getUserCompanyLogoUrl(resolvedCreator) ||
        getUserCompanyLogoUrl(user) ||
        profile?.profileImageUrl ||
        profile?.company_logo_url
      : user?.profileImageUrl ||
        user?.profile_image_url ||
        user?.profile_picture_url ||
        user?.creator_profile_image_url ||
        resolvedCreator?.profilePictureUrl ||
        profile.profileImageUrl);
  const displayImage = typeof displayImageRaw === 'string' ? displayImageRaw.trim() : '';
  const logoImageRaw =
    getUserCompanyLogoUrl(resolvedCreator) ||
    getUserCompanyLogoUrl(user) ||
    user?.logo_url ||
    user?.business_logo_url ||
    user?.bnb_business_logo_url ||
    profile?.company_logo_url;
  const logoImage = typeof logoImageRaw === 'string' ? logoImageRaw.trim() : '';
  const forceGoldRingForListing = shouldForceGoldRingForListing(user);
  const displayLogoUri = (() => {
    if (headerProfilePhoto) return headerProfilePhoto;
    if (isListingFromFeed && isTeamMarketerUnderManager(profileSubject)) {
      const personal = getUserProfilePhotoUrl(profileSubject) || getUserProfilePhotoUrl(user);
      if (personal) return personal;
    }
    if (orgLogoAvatar && logoImage) return logoImage;
    if (isListingFromFeed) {
      const unified = getListingFeedAvatarUrl(user) || getUserProfileImageUrl(user);
      if (unified) return unified;
    }
    return displayImage || '';
  })();
  const contactUsesCompanyLogo =
    hasSeparateProfileAndCompanyLogo(profileSubject) ||
    hasSeparateProfileAndCompanyLogo(resolvedCreator?.subscription_type || user?.subscription_type);
  const bnbContactLogo =
    typeof bnbFeedListing?.bnb_business_logo_url === 'string' ? bnbFeedListing.bnb_business_logo_url.trim() : '';
  const contactLogoRaw = agencyContact?.logo
    ? agencyContact.logo
    : bnbContactLogo
      ? bnbContactLogo
      : contactUsesCompanyLogo
        ? logoImage || headerProfilePhoto
        : headerProfilePhoto || logoImage;
  const contactLogo = typeof contactLogoRaw === 'string' ? contactLogoRaw.trim() : '';

  const contactPhones = (() => {
    if (agencyContact?.phones?.length) return agencyContact.phones;
    const subType = String(
      resolvedCreator?.subscription_type || user?.subscription_type || user?.creator_subscription_type || '',
    ).toLowerCase();
    const brokerRegisterPhonesOnly = subType === subscriptionTypes.broker;
    const raw =
      resolvedCreator?.phones?.length > 0
        ? resolvedCreator.phones
        : brokerRegisterPhonesOnly
          ? [user?.phone, user?.mobile_phone, user?.contact_details?.phone]
          : [
              user?.phone,
              user?.mobile_phone,
              user?.office_phone,
              user?.contact_details?.phone,
              ...(Array.isArray(user?.contact_details?.phones) ? user.contact_details.phones : []),
            ];
    const unique = uniqueContactPhones(raw);
    return brokerRegisterPhonesOnly ? unique.slice(0, 1) : unique;
  })();
  const contactEmail = agencyContact?.email
    ? agencyContact.email
    : isPresentContactValue(displayEmail)
      ? String(displayEmail).trim()
      : '';
  const contactWebsite = (() => {
    if (agencyContact) return agencyContact.website || '';
    const raw = user?.company_website || user?.companyWebsite || resolvedCreator?.company_website || '';
    const trimmed = typeof raw === 'string' ? raw.trim() : '';
    return isPresentContactValue(trimmed) ? trimmed : '';
  })();
  const contactAddress = (() => {
    if (agencyContact) return agencyContact.address || '';
    const raw = resolvedCreator?.business_address || user?.creator_business_address || user?.business_address || '';
    const trimmed = typeof raw === 'string' ? raw.trim() : '';
    return isPresentContactValue(trimmed) ? trimmed : '';
  })();
  const contactAgencyName = (agencyContact?.name && String(agencyContact.name).trim()) || displayName;
  const primaryContactPhone = contactPhones.length > 0 ? String(contactPhones[0]).trim() : '';

  const viewedSubscriptionId = toSubscriptionId(
    resolvedCreator?.id ||
      user?.subscription_id ||
      user?.owner_id ||
      creatorId ||
      (!isListingFromFeed && !isAdsListingRecord(user) ? profile?.id : null),
  );

  const lastAd = (() => {
    if (isListingFromFeed) return user;
    const adsOnly = userListings.filter(l => !isPostListingRecord(l));
    if (adsOnly.length > 0) {
      const L = adsOnly[0];
      const images =
        L.listing_images && L.listing_images.length > 0
          ? L.listing_images.map(img =>
              img && typeof img === 'object' && img.image_url
                ? {uri: img.image_url}
                : typeof img === 'string'
                  ? {uri: img}
                  : img,
            )
          : L.images && L.images.length > 0
            ? L.images
            : [];
      return {...L, images};
    }
    if (profile.properties && profile.properties[0]) {
      const p = profile.properties[0];
      return {
        images: p.image ? [{uri: p.image}] : [],
        price: p.price,
        address: p.address,
        purpose: p.status || 'להשכרה',
        description: '',
        creator_name: displayName,
        profileImageUrl: displayImage,
      };
    }
    return null;
  })();

  const lastAdImages = (() => {
    if (!lastAd) return [];
    const pushStill = (arr, u) => {
      const s = String(u || '').trim();
      if (!s || /^text-post-placeholder$/i.test(s) || isVideoLikeMediaUrl(s)) return;
      if (arr.some(x => String(x.uri).trim() === s)) return;
      arr.push({uri: s});
    };
    const fromRows = rows => {
      const out = [];
      for (const img of rows) {
        const u = img && typeof img === 'object' ? img.uri || img.image_url : typeof img === 'string' ? img : null;
        if (u) pushStill(out, u);
      }
      return out;
    };
    let stills = [];
    if (lastAd.listing_images && lastAd.listing_images.length > 0) stills = fromRows(lastAd.listing_images);
    if (stills.length === 0 && lastAd.images && lastAd.images.length > 0) stills = fromRows(lastAd.images);
    const mainStill = String(lastAd.main_image_url || '').trim();
    if (mainStill) pushStill(stills, mainStill);
    const videoUri = resolveLastAdHeroVideoUri(lastAd);
    if (videoUri) {
      const posterUri =
        muxThumbnailUri(videoUri, {time: 0, width: 720}) || resolveFeedVideoPosterUri(lastAd) || stills[0]?.uri || null;
      return [
        {uri: videoUri, isVideo: true, posterUri},
        ...stills.filter(s => String(s.uri || '').trim() !== String(videoUri).trim()),
      ];
    }
    return stills;
  })();
  const lastAdHasVideo = lastAdImages.some(item => item?.isVideo);
  const openedFromPost = isPostListingRecord(user);

  const recentPostGridImages = useMemo(() => {
    const rows = [...postGridListings, ...userListings];
    if (user && isPostListingRecord(user)) rows.unshift(user);
    const seenIds = new Set();
    const uniquePostRows = rows.filter(isPostListingRecord).filter(row => {
      const id = String(row?.id || '').trim();
      if (!id) return true;
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });
    uniquePostRows.sort(
      (a, b) =>
        new Date(b?.created_at || b?.createdAt || 0).getTime() - new Date(a?.created_at || a?.createdAt || 0).getTime(),
    );
    const isPlaceholderUri = u => !u || /^text-post-placeholder$/i.test(String(u).trim());
    const pickStillPosterUri = item => {
      const fromFeed = resolveFeedVideoPosterUri(item);
      if (fromFeed && !isPlaceholderUri(fromFeed)) return fromFeed;
      for (const img of Array.isArray(item?.listing_images) ? item.listing_images : []) {
        const uri = img && typeof img === 'object' ? String(img.image_url || img.uri || '').trim() : String(img || '').trim();
        if (!isPlaceholderUri(uri) && !isVideoLikeMediaUrl(uri)) return uri;
      }
      for (const img of Array.isArray(item?.images) ? item.images : []) {
        const uri = img && typeof img === 'object' ? String(img.uri || img.image_url || '').trim() : String(img || '').trim();
        if (!isPlaceholderUri(uri) && !isVideoLikeMediaUrl(uri)) return uri;
      }
      for (const candidate of [item?.main_image_url, item?.image_url, item?.thumbnail_url, item?.cover_url, firstImageUrl(item)]) {
        const uri = String(candidate || '').trim();
        if (!isPlaceholderUri(uri) && !isVideoLikeMediaUrl(uri)) return uri;
      }
      return null;
    };
    const firstImageFor = item => {
      const videoUri =
        firstVideoUrl(item) ||
        (item?.video && typeof item.video === 'object'
          ? String(item.video.uri || item.video.url || '').trim() || null
          : typeof item?.video === 'string'
            ? String(item.video).trim() || null
            : null);
      if (videoUri) {
        return {
          uri: videoUri,
          isVideo: true,
          posterUri: muxThumbnailUri(videoUri, {time: 0, width: 480}) || pickStillPosterUri(item),
        };
      }
      const stillUri = pickStillPosterUri(item);
      return stillUri ? {uri: stillUri} : null;
    };
    return uniquePostRows
      .map(item => {
        const grid = firstImageFor(item);
        return grid ? {...grid, listingId: item?.id, listing: item} : null;
      })
      .filter(Boolean);
  }, [postGridListings, userListings, user]);

  const postGridPages = useMemo(() => {
    const posts = recentPostGridImages;
    if (posts.length === 0) return [Array.from({length: POST_GRID_PAGE_SIZE}, () => null)];
    const pages = [];
    for (let i = 0; i < posts.length; i += POST_GRID_PAGE_SIZE) {
      const page = posts.slice(i, i + POST_GRID_PAGE_SIZE);
      while (page.length < POST_GRID_PAGE_SIZE) page.push(null);
      pages.push(page);
    }
    return pages;
  }, [recentPostGridImages]);

  const adAddress = lastAd?.address || lastAd?.location || '';

  const [followStats, setFollowStats] = useState({likes: null, followers: null, following: null});
  const [followStatsLoading, setFollowStatsLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    if (!viewedSubscriptionId) {
      setFollowStatsLoading(false);
      return undefined;
    }
    setFollowStatsLoading(true);
    getFollowStats(viewedSubscriptionId)
      .then(data => {
        if (cancelled) return;
        const stats = data?.stats || {};
        setFollowStats({
          likes: Number(stats.likes || 0),
          followers: Number(stats.followers || 0),
          following: Number(stats.following || 0),
        });
        setFollowStatsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFollowStats({likes: 0, followers: 0, following: 0});
        setFollowStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewedSubscriptionId, reviews.length]);
  const formatStatCount = value => (followStatsLoading || value == null ? '—' : String(value));

  const profileSubscriptionType = (
    resolvedCreator?.subscription_type ||
    user?.subscription_type ||
    user?.creator_subscription_type ||
    lastAd?.subscription_type ||
    ''
  ).toLowerCase();
  const isCompany = isCompanySubscriptionType(profileSubscriptionType);
  const isProjectMarketer = isProjectMarketerType(profileSubscriptionType);
  const isBroker = isBrokerLikeSubscriptionType(profileSubscriptionType);
  const isBrokerAccount = profileSubscriptionType === subscriptionTypes.broker;
  const isProfessional = profileSubscriptionType === 'professional';
  const showContactWebsite = (isCompany || isProjectMarketer) && !!contactWebsite;
  const showContactAddress = (isCompany || Boolean(agencyContact)) && !!contactAddress;
  const showContactEmail = !!contactEmail;
  const isRegularUserAccount = !isCompany && !isBroker && !isProfessional;
  const shouldShowFollowPlus = !!viewedSubscriptionId;

  const brokerAddress = user?._fromTikTokPost
    ? firstNonEmpty(
        resolvedCreator?.business_address,
        user?.creator_business_address,
        user?.business_address,
        user?.address,
        user?.location,
        lastAd?.address,
        lastAd?.location,
        profile.address,
      )
    : firstNonEmpty(
        resolvedCreator?.business_address,
        user?.address,
        user?.location,
        lastAd?.address,
        lastAd?.location,
        profile.address,
      );
  const showProfileRatingFeatures = !isRegularUserAccount;
  const isRegularUserAdView = isRegularUserAccount && isListingFromFeed && !openedFromPost;
  const listingCategoryNum = Number(user?.category ?? lastAd?.category ?? 0);
  const isBnbListingAdProfile = isListingFromFeed && !openedFromPost && listingCategoryNum === 5;
  const isPartnersListingAdProfile =
    isListingFromFeed && !openedFromPost && listingCategoryNum === 3 && !isPostListingRecord(lastAd || user);
  const isLandListingAdProfile =
    isListingFromFeed && !openedFromPost && listingCategoryNum === 7 && !isPostListingRecord(lastAd || user);
  const isDedicatedListingAdProfile = isBnbListingAdProfile || isPartnersListingAdProfile || isLandListingAdProfile;
  const showProfilePostGrid = !isDedicatedListingAdProfile && recentPostGridImages.length > 0;
  const renderProfilePostGrid = recentPostGridImages.length > 0 || postGridLoading || userListingsLoading;
  const openedFromProfessionalsDirectory = Boolean(user?._fromProfessionalsDirectory);
  const openedFromFeedAdListing = isListingFromFeed && !openedFromPost && !openedFromProfessionalsDirectory;
  const forceListingAdProfile =
    user?._forceListingAdProfile === false
      ? false
      : Boolean(
          user?._forceListingAdProfile ||
            user?._fromHomeFeatureProject ||
            user?._fromCompanyProjects ||
            openedFromFeedAdListing,
        );
  const showCompanySubscriptionPostGridAtTop =
    isCompany && !isListingFromFeed && !forceListingAdProfile && !isDedicatedListingAdProfile;
  const showProfessionalFigmaProfile = isProfessional && !isDedicatedListingAdProfile;
  const showDirectoryPostProfile = openedFromProfessionalsDirectory && !isDedicatedListingAdProfile;
  const showProfilePostGridAtTop =
    showProfessionalFigmaProfile || showDirectoryPostProfile
      ? true
      : showCompanySubscriptionPostGridAtTop
        ? true
        : showProfilePostGrid && !forceListingAdProfile;
  const showPiAiSmartInfoBlock =
    !openedFromPost && !showProfessionalFigmaProfile && !isDedicatedListingAdProfile && !showProfilePostGridAtTop;
  const showListingContactAndReviews =
    !isRegularUserAdView &&
    (isLandListingAdProfile ||
      (isCompany && isBnbListingAdProfile && isListingFromFeed && !openedFromPost) ||
      !isDedicatedListingAdProfile ||
      showProfileRatingFeatures);
  const showContactDetailsBlock = isBnbListingAdProfile || (!isRegularUserAdView && showListingContactAndReviews);
  const showListingFeedbackSection =
    isBnbCommentsOnly || isBnbReviewsWithStars || (showProfileRatingFeatures && showListingContactAndReviews);

  const landListingPayload = useMemo(() => {
    if (!isLandListingAdProfile || !lastAd) return lastAd;
    const ids = parseLandBlockParcelFromListing(lastAd);
    const parcels = normalizeLandOfferParcels(lastAd);
    return {
      ...lastAd,
      land_parcel: ids.land_parcel ?? lastAd.land_parcel ?? null,
      land_block: ids.land_block ?? lastAd.land_block ?? null,
      company_offers_land_sizes:
        parcels.length > 0 ? parcels : (lastAd.company_offers_land_sizes ?? lastAd.companyOffersLandSizes ?? null),
    };
  }, [isLandListingAdProfile, lastAd]);
  const showLocationMap = isListingFromFeed && !openedFromPost && !isDedicatedListingAdProfile;
  const showTikTokProfessionalHeader = Boolean(user?._fromTikTokPost && isProfessional);
  const fromCompanyProjects = Boolean(isListingFromFeed && user?._fromCompanyProjects);
  const showCompanyFeedHeroTop = Boolean(
    isCompany &&
      isListingFromFeed &&
      lastAd &&
      !openedFromPost &&
      (isBnbListingAdProfile ||
        fromCompanyProjects ||
        user?._fromTikTokPost ||
        user?._fromHomeFeatureProject ||
        user?._forceListingAdProfile ||
        forceListingAdProfile),
  );
  const showLastAdShareOnMedia = Boolean(
    lastAd && !openedFromPost && !showProfilePostGridAtTop && !showCompanyFeedHeroTop && !isPostListingRecord(lastAd),
  );
  const showStandardProfileHeader = isProfessional
    ? !isDedicatedListingAdProfile
    : !(isCompany && (showCompanyFeedHeroTop || isBnbListingAdProfile));
  const showFixedBackOnly = Boolean(
    isListingFromFeed && !showCompanyFeedHeroTop && (!isProfessional || showTikTokProfessionalHeader),
  );
  const companyListingId =
    showCompanyFeedHeroTop && (lastAd?.id ?? user?.id) != null ? String(lastAd?.id ?? user?.id) : null;
  const hideCompanyPostSpecialtiesBlock = Boolean(user?._fromTikTokPost && isCompany);
  const hideMyPropertiesSection = isProfessional || isRegularUserAccount;
  const myPropertyListings = userListings.filter(l => !isPostListingRecord(l));
  const showCompanyPostSpecialties = openedFromPost && isCompany;

  const companyStatsSource = (() => {
    if (lastAd && !isPostListingRecord(lastAd)) return lastAd;
    const adsOnly = userListings.filter(l => !isPostListingRecord(l));
    const adWithStats = adsOnly.find(listing => {
      const stats = readCompanyProjectStats(listing);
      return stats.buildings > 0 || stats.floors > 0 || stats.apartments > 0;
    });
    return adWithStats || adsOnly[0] || lastAd || user;
  })();
  const companyStats = readCompanyProjectStats(companyStatsSource);

  const specialtiesRaw =
    user?.creator_specialties ??
    user?.specialties ??
    user?.specialties_list ??
    resolvedCreator?.specializations ??
    profile.specialties;
  const brokerSpecialties = Array.isArray(specialtiesRaw)
    ? specialtiesRaw
    : typeof specialtiesRaw === 'string'
      ? specialtiesRaw
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : [];
  const activityRegions = parseList(
    user?.creator_activity_regions ?? user?.activity_regions ?? resolvedCreator?.activity_regions ?? profile?.activity_regions,
  );
  const typesArray = parseList(user?.creator_types ?? user?.types ?? resolvedCreator?.types ?? profile?.types);
  const specializationsArray = parseList(
    user?.creator_specializations ?? user?.specializations ?? resolvedCreator?.specializations ?? profile?.specializations,
  );
  const brokerBioRaw =
    user?.creator_bio ??
    user?.bio ??
    user?.creator_description ??
    resolvedCreator?.description ??
    resolvedCreator?.bio ??
    profile?.bio ??
    profile?.description ??
    null;
  const brokerBio = (brokerBioRaw != null ? String(brokerBioRaw).trim() : '') || null;
  const brokerPiRating = user?.pi_value ?? lastAd?.pi_value ?? profile?.pi_value ?? 5;

  const listingReviews = useMemo(() => {
    if (!bnbFeedListing?.id || (!isBnbCommentsOnly && !isBnbReviewsWithStars)) return reviews;
    const lid = String(bnbFeedListing.id).trim();
    return reviews.filter(r => (r.listing_id != null ? String(r.listing_id).trim() : '') === lid);
  }, [reviews, bnbFeedListing, isBnbCommentsOnly, isBnbReviewsWithStars]);

  const displayPiRating = useMemo(
    () =>
      isBnbReviewsWithStars
        ? displayPiRatingFromReviews(listingReviews, {pi_value: 1, subscription_type: 'user'})
        : displayPiRatingFromReviews(listingReviews, {pi_value: brokerPiRating, subscription_type: profileSubscriptionType}),
    [isBnbReviewsWithStars, listingReviews, brokerPiRating, profileSubscriptionType],
  );

  const tagLabel = s => (typeof s === 'string' ? s : (s?.label ?? s?.name ?? String(s))).trim();
  const filteredActivityRegions = activityRegions.filter(s => tagLabel(s) !== displayName);
  const brokerSpecializationsDisplay = (specializationsArray.length > 0 ? specializationsArray : brokerSpecialties)
    .map(tagLabel)
    .filter(t => t && t !== displayName);
  const professionalTypesDisplay = typesArray.map(tagLabel).filter(t => t && t !== displayName);
  const professionalSpecializationsDisplay = specializationsArray.map(tagLabel).filter(t => t && t !== displayName);
  const profileTypeLabelsUnderName = isProjectMarketer
    ? [getProjectMarketerRoleLabel(resolvedCreator || user)]
    : isBroker
      ? ['תיווך']
      : isProfessional
        ? professionalTypesDisplay.length > 0
          ? professionalTypesDisplay
          : ['בעל מקצוע']
        : [];
  const brokerRegionMode = isBroker && !isProjectMarketer;
  const profileSpecialtyTags = isProfessional
    ? professionalSpecializationsDisplay
    : brokerRegionMode
      ? filteredActivityRegions.map(tagLabel).filter(Boolean)
      : brokerSpecializationsDisplay;
  const profileSpecialtySectionTitle = brokerRegionMode ? 'אזור פעילות' : 'התמחויות';
  const profileSpecialtyEmptyText = brokerRegionMode ? 'אין אזורי פעילות' : 'אין התמחויות';
  const showBrokerExpertiseBlock = brokerRegionMode;
  const brokerExpertiseTags = showBrokerExpertiseBlock
    ? (() => {
        const regionSet = new Set(filteredActivityRegions.map(tagLabel));
        return brokerSpecializationsDisplay.filter(t => !regionSet.has(t));
      })()
    : [];

  const adFeatures = useMemo(() => buildProfileAdFeatureLabels(lastAd), [lastAd]);

  const projectOffersCards = useMemo(() => {
    if (!isCompany || !lastAd) return [];
    const raw = lastAd.project_offers ?? lastAd.projectOffers;
    const po = raw && typeof raw === 'object' ? raw : {};
    const n = v => (v != null && !Number.isNaN(Number(v)) ? Number(v) : null);
    const cards = [
      {key: '3rooms', title: '3 חדרים', iconKey: '3-5rooms', area: n(po.rooms_3_area), price: n(po.rooms_3_price), rooms: null},
      {key: '4rooms', title: '4 חדרים', iconKey: '3-5rooms', area: n(po.rooms_4_area), price: n(po.rooms_4_price), rooms: null},
      {key: '5rooms', title: '5 חדרים', iconKey: '3-5rooms', area: n(po.rooms_5_area), price: n(po.rooms_5_price), rooms: null},
      {key: 'garden', title: 'דירות גן', iconKey: 'garden', area: n(po.garden_area), price: n(po.garden_price), rooms: n(po.garden_rooms)},
      {
        key: 'penthouses',
        title: 'נטהאוזים',
        iconKey: 'penthouses',
        area: n(po.penthouse_area),
        price: n(po.penthouse_price),
        rooms: n(po.penthouse_rooms),
      },
      {key: 'private', title: 'בתים פרטיים', iconKey: 'private', area: n(po.private_area), price: n(po.private_price), rooms: n(po.private_rooms)},
    ];
    return cards.filter(
      c => (c.area != null && c.area > 0) || (c.price != null && c.price > 0) || (c.rooms != null && c.rooms > 0),
    );
  }, [isCompany, lastAd]);

  const visibleReviews =
    listingReviews.length > MAX_VISIBLE_REVIEWS ? listingReviews.slice(0, MAX_VISIBLE_REVIEWS) : listingReviews;

  return {
    user,
    profile,
    creatorId,
    resolvedCreator,
    parentAgency,
    isListingFromFeed,
    isBnbCommentsOnly,
    isBnbReviewsWithStars,
    userListings,
    userListingsLoading,
    reviews,
    reviewsLoading,
    reloadReviews,
    displayName,
    displayEmail,
    displayImage,
    displayLogoUri,
    forceGoldRingForListing,
    contactLogo,
    contactPhones,
    contactEmail,
    contactWebsite,
    contactAddress,
    contactAgencyName,
    primaryContactPhone,
    agencyContact,
    viewedSubscriptionId,
    lastAd,
    lastAdImages,
    lastAdHasVideo,
    openedFromPost,
    recentPostGridImages,
    postGridPages,
    adAddress,
    followStats,
    formatStatCount,
    profileSubscriptionType,
    isCompany,
    isProjectMarketer,
    isBroker,
    isBrokerAccount,
    isProfessional,
    showContactWebsite,
    showContactAddress,
    showContactEmail,
    isRegularUserAccount,
    shouldShowFollowPlus,
    brokerAddress,
    showProfileRatingFeatures,
    isRegularUserAdView,
    listingCategoryNum,
    isBnbListingAdProfile,
    isPartnersListingAdProfile,
    isLandListingAdProfile,
    isDedicatedListingAdProfile,
    renderProfilePostGrid,
    showProfilePostGridAtTop,
    showProfessionalFigmaProfile,
    showPiAiSmartInfoBlock,
    showContactDetailsBlock,
    showListingFeedbackSection,
    landListingPayload,
    showLocationMap,
    showCompanyFeedHeroTop,
    showLastAdShareOnMedia,
    showStandardProfileHeader,
    showFixedBackOnly,
    companyListingId,
    hideCompanyPostSpecialtiesBlock,
    hideMyPropertiesSection,
    myPropertyListings,
    showCompanyPostSpecialties,
    companyStats,
    brokerBio,
    listingReviews,
    displayPiRating,
    profileTypeLabelsUnderName,
    profileSpecialtyTags,
    profileSpecialtySectionTitle,
    profileSpecialtyEmptyText,
    showBrokerExpertiseBlock,
    brokerExpertiseTags,
    adFeatures,
    projectOffersCards,
    visibleReviews,
  };
}
