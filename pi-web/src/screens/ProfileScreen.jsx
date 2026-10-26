import {Fragment, useCallback, useEffect, useRef, useState} from 'react';
import {mdiClose} from '@mdi/js';
import {cancelFollowRequest, getFollowStatus, sendFollowRequest, submitReview, toSubscriptionId, unfollowUser} from '../api/client';
import {useSession} from '../auth/session';
import MdiIcon from '../publish/MdiIcon';
import {isReduceMotion} from '../a11y/prefs';
import {PostMedia} from '../components/FeedCard';
import {toFeedItem} from '../feed/listingRules';
import {BnbListingContent, LandListingContent, PartnersListingContent} from '../profile/DedicatedContent';
import {
  FollowPlusBadge,
  GoldButton,
  Icon,
  LocationMap,
  PiRatingBadge,
  ProfileAvatar,
  RatingImprovePicker,
  SmartInfoBlock,
  SvgImage,
  asset,
} from '../profile/ProfileParts';
import {
  CompanyProjectsView,
  MediaViewer,
  ProfilePostsFeedView,
  ReviewsListView,
  UserListingsView,
  formatReviewDate,
} from '../profile/ProfileSubviews';
import {categoryImages} from '../profile/lib/constant';
import {
  HERO_NAV_BACK_XML,
  HERO_NAV_HEART_XML,
  HERO_NAV_SHARE_XML,
} from '../profile/lib/heroNavFigmaIcons';
import {
  formatCompanyApartmentsLabel,
  formatCompanyBuildingsLabel,
  formatCompanyFloorsLabel,
  formatPriceHe,
  isCommercialCategoryListing,
  isPreSaleListing,
  reviewHasStarRating,
} from '../profile/lib/listingGridCardFigma';
import {getPiReviewStarSource} from '../profile/lib/piRatingBadgeAssets';
import {isAdsListingRecord} from '../profile/lib/listingShape';
import CompanyReportScreen from '../profile/CompanyReportScreen';
import {listingAdProfilePayload, useProfileNav} from '../profile/navigation';
import {
  firstNonEmpty,
  formatPostViewCount,
  getListingViewCount,
  useUserProfile,
} from '../profile/useUserProfile';
import styles from './ProfileScreen.module.css';

const CONSTRUCTION_STATUS_STEPS = [
  {name: 'on_paper', title: 'על הנייר'},
  {name: 'beginning_of_construction', title: 'תחילת בנייה'},
  {name: 'middle_of_construction', title: 'אמצע בנייה'},
  {name: 'built', title: 'בנוי'},
];

const FEATURE_ICON_NUM = {area: 1, floor: 2, elevator: 3, mamad: 4, immediate: 5, rooms: 6, balcony: 7, condition: 8, parking: 10};
const featureIcon = key => asset(`apr-details/icons_${FEATURE_ICON_NUM[key] ?? 1}.png`);

const projectOfferIcon = key => {
  if (key === 'garden') return asset('company/garden-house.png');
  if (key === 'penthouses') return asset('company/penthouse.png');
  if (key === 'private') return asset('company/private-house.png');
  return asset('company/rooms.png');
};

const hideBrokenImage = e => {
  e.currentTarget.style.visibility = 'hidden';
};

const LAST_AD_PLACEHOLDER = asset('improve/end.png');
const POST_GRID_VIEW_ICON = asset('tiktok/views.png');
const DUMMY_AD_DESCRIPTION =
  'דירה מרווחת ומוארת בלב תל אביב. קרובה למרכזי בילוי, תחבורה ציבורית ופארקים. משופצת מהיסוד עם חומרים איכותיים. הזדמנות שלא תחזור!';

/** Mobile showAlert on web. */
const showAlert = (title, message) => window.alert(title ? `${title}\n\n${message}` : message);

const LOGIN_REQUIRED = 'כדי להמשיך יש לפתוח חשבון או להתחבר באפליקציה.';
const requireLogin = () => showAlert('נדרשת התחברות', LOGIN_REQUIRED);

/** Portrait post tile: the feed's 930×502 post frame, scaled down (videos show their poster). */
const POST_FRAME_W = 930;
const POST_FRAME_H = 502;
const POST_TILE_W = (1016 - 4) / 3;
const POST_TILE_SCALE = POST_TILE_W / POST_FRAME_W;

function PostGridTile({tile, onOpen}) {
  if (!tile) {
    return (
      <span className={`${styles.gridTile} ${styles.gridTilePlaceholder}`}>
        <Icon name="camera-outline" size={30} color="rgba(255,255,255,0.45)" />
      </span>
    );
  }
  const base = toFeedItem(tile.listing);
  const still = tile.isVideo ? tile.posterUri : tile.uri;
  const item = {...base, videoUrl: null, preferVideo: false, images: still ? [still] : base.images.slice(0, 1)};
  return (
    <button type="button" className={styles.gridTile} onClick={() => onOpen(tile)} aria-label="פתח פוסט">
      <span
        className={styles.gridTileFrame}
        style={{width: POST_FRAME_W, height: POST_FRAME_H, transform: `scale(${POST_TILE_SCALE})`}}>
        <PostMedia item={item} active={false} />
      </span>
      {tile.isVideo ? (
        <span className={`${styles.gridPlay} ${tile.posterUri ? styles.gridPlayDim : ''}`}>
          <Icon name="play-circle" size={44} color="rgba(255,255,255,0.85)" />
        </span>
      ) : null}
      <span className={styles.gridViews} dir="ltr">
        <img src={POST_GRID_VIEW_ICON} alt="" width={16} height={16} />
        <span>{formatPostViewCount(getListingViewCount(tile.listing))}</span>
      </span>
    </button>
  );
}

const SWIPE_THRESHOLD = 50;

function PostGrid({pages, onOpen}) {
  const [page, setPage] = useState(0);
  const [dragX, setDragX] = useState(0);
  const drag = useRef(null);
  const suppressClick = useRef(false);
  const wheelLock = useRef(0);
  useEffect(() => setPage(0), [pages.length]);

  const count = pages.length;
  const go = useCallback(next => setPage(Math.max(0, Math.min(count - 1, next))), [count]);

  const onPointerDown = e => {
    if (count < 2 || e.button !== 0) return;
    drag.current = {x: e.clientX, y: e.clientY, id: e.pointerId, moved: false};
  };
  const onPointerMove = e => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(e.clientY - d.y)) {
      d.moved = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Pointer already released.
      }
    }
    if (d.moved) setDragX(dx);
  };
  const endDrag = e => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved) return;
    const dx = e.clientX - d.x;
    suppressClick.current = true;
    setDragX(0);
    if (dx <= -SWIPE_THRESHOLD) go(page + 1);
    else if (dx >= SWIPE_THRESHOLD) go(page - 1);
  };
  const onWheel = e => {
    if (count < 2 || Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 20) return;
    const now = Date.now();
    if (now - wheelLock.current < 450) return;
    wheelLock.current = now;
    go(page + (e.deltaX > 0 ? 1 : -1));
  };

  return (
    <div className={styles.postGrid}>
      <div
        className={styles.postGridViewport}
        dir="ltr"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={onWheel}
        onClickCapture={e => {
          if (!suppressClick.current) return;
          suppressClick.current = false;
          e.preventDefault();
          e.stopPropagation();
        }}>
        <div
          className={styles.postGridTrack}
          style={{
            transform: `translateX(calc(${-page * 100}% + ${dragX}px))`,
            transition: dragX ? 'none' : undefined,
          }}>
          {pages.map((items, pageIndex) => (
            <div key={`post-grid-page-${pageIndex}`} className={styles.postGridPage}>
              {items.map((tile, i) => (
                <PostGridTile key={tile ? `${tile.listingId}-${i}` : `ph-${pageIndex}-${i}`} tile={tile} onOpen={onOpen} />
              ))}
            </div>
          ))}
        </div>
        {page > 0 ? (
          <button
            type="button"
            className={`${styles.heroArrow} ${styles.heroArrowPrev}`}
            onClick={() => go(page - 1)}
            aria-label="העמוד הקודם">
            <Icon name="chevron-left" size={30} />
          </button>
        ) : null}
        {page < count - 1 ? (
          <button
            type="button"
            className={`${styles.heroArrow} ${styles.heroArrowNext}`}
            onClick={() => go(page + 1)}
            aria-label="העמוד הבא">
            <Icon name="chevron-right" size={30} />
          </button>
        ) : null}
      </div>
      {pages.length > 1 ? (
        <div className={styles.dots} dir="ltr">
          {pages.map((_, i) => (
            <button
              key={`post-grid-dot-${i}`}
              type="button"
              className={`${styles.dot} ${i === page ? styles.dotActive : ''}`}
              onClick={() => setPage(i)}
              aria-label={`עמוד ${i + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function playWithSound(video) {
  video.muted = false;
  video.play().catch(() => {
    video.muted = true;
    video.play().catch(() => {});
  });
}

function HeroVideo({slide, active}) {
  const ref = useRef(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (active) playWithSound(video);
    else video.pause();
  }, [active, slide.uri]);
  return (
    <>
      {slide.posterUri ? (
        <img className={styles.heroBlur} src={slide.posterUri} alt="" onError={hideBrokenImage} />
      ) : null}
      <video
        ref={ref}
        className={styles.heroMedia}
        src={slide.uri}
        poster={slide.posterUri || undefined}
        loop
        playsInline
        muted
      />
    </>
  );
}

function StatsRow({vm, onOpen}) {
  const items = [
    ['likes', 'לייקים', vm.followStats.likes],
    ['followers', 'עוקבים', vm.followStats.followers],
    ['following', 'עוקב', vm.followStats.following],
  ];
  return (
    <div className={styles.stats}>
      {items.map(([id, label, n]) => (
        <button key={id} type="button" className={styles.stat} onClick={() => onOpen?.(id)}>
          <span className={styles.statNumber}>{vm.formatStatCount(n)}</span>
          <span className={styles.statLabel}>{label}</span>
        </button>
      ))}
    </div>
  );
}

function TagList({labels, className = ''}) {
  if (!labels.length) return null;
  return (
    <div className={`${styles.tags} ${className}`}>
      {labels.map((label, i) => (
        <span key={`tag-${i}-${label}`} className={styles.tag}>
          {label}
        </span>
      ))}
    </div>
  );
}

function ConstructionStatus({status}) {
  const current = String(status ?? '').toLowerCase();
  return (
    <div className={styles.construction}>
      <p className={styles.constructionTitle}>מצב בנייה</p>
      <div className={styles.constructionRow}>
        {CONSTRUCTION_STATUS_STEPS.map((step, index) => {
          const selected = current === step.name.toLowerCase();
          return (
            <Fragment key={step.name}>
              <span className={styles.constructionStep}>
                {selected ? (
                  <img className={styles.constructionCheck} src={asset('profile/check.png')} alt="" />
                ) : (
                  <span className={styles.constructionCircle} />
                )}
                <span className={`${styles.constructionLabel} ${selected ? styles.constructionLabelActive : ''}`}>
                  {step.title}
                </span>
              </span>
              {index < CONSTRUCTION_STATUS_STEPS.length - 1 ? <span className={styles.constructionLine} /> : null}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function FeatureChips({features, keyPrefix}) {
  return (
    <div className={styles.features}>
      {features.map((item, index) => (
        <span key={`${keyPrefix}-${item.iconKey}-${index}`} className={styles.featureChip}>
          <img className={styles.featureIcon} src={featureIcon(item.iconKey)} alt="" />
          <span className={styles.featureLabel}>{item.label}</span>
        </span>
      ))}
    </div>
  );
}

function ProjectOffers({cards}) {
  return (
    <div className={styles.offers}>
      <p className={styles.offersTitle}>הפרויקט מציע</p>
      <div className={styles.offersGrid}>
        {cards.map(card => {
          const areaStr = card.area != null ? `גודל: ${card.area} מ"ר` : 'גודל: —';
          const priceStr = card.price != null ? `החל מ-₪${Number(card.price).toLocaleString('he-IL')}` : null;
          const roomsStr = card.rooms != null ? `מס' חדרים: ${card.rooms}` : null;
          const isSimple = card.rooms == null;
          const detailsLine = isSimple ? `${areaStr} | ${priceStr || 'החל מ-—₪'}` : [areaStr, roomsStr].filter(Boolean).join(' | ');
          return (
            <div key={card.key} className={styles.offerCard}>
              <div className={styles.offerHeader}>
                <img className={styles.statIcon} src={projectOfferIcon(card.iconKey)} alt="" />
                <span className={styles.offerTitle}>{card.title}</span>
              </div>
              <span className={styles.offerDetails}>{detailsLine}</span>
              {!isSimple ? <span className={styles.offerPrice}>{priceStr || 'החל מ-—₪'}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function myPropertyCardData(item) {
  const imgs = item.listing_images || [];
  const purposeRaw = item.purpose || item.search_purpose || '';
  const purposeLabel =
    Number(item.category) === 5
      ? 'BNB'
      : purposeRaw === 'sale' || String(purposeRaw).toLowerCase() === 'sale' || purposeRaw === 'מכירה'
        ? 'למכירה'
        : 'להשכרה';
  const priceNum = item.price != null ? Number(item.price) : null;
  return {
    image: imgs[0]?.image_url,
    purposeLabel,
    price: priceNum != null && !Number.isNaN(priceNum) ? `₪${Math.round(priceNum).toLocaleString('he-IL')}` : '—',
    location: (item.address || item.land_address || item.search_address || '').trim() || '—',
  };
}

/**
 * Full-screen user / business profile — mobile UserProfileScreen with the same
 * fields and visibility rules per account type, laid out for a wide screen.
 */
export default function ProfileScreen({user, onClose, active = true, onOpenFollowHub, onOpenFavorites, onOpenChat, onNeedLogin}) {
  const nav = useProfileNav();
  const {currentUser} = useSession();
  const vm = useUserProfile(user);
  const viewerId = toSubscriptionId(currentUser?.id || currentUser?.subscription_id || currentUser?.owner_id);
  const viewedId = vm.viewedSubscriptionId;
  const isOwn = !!(viewerId && viewedId && String(viewerId) === String(viewedId));
  const [followLoading, setFollowLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [unfollowOpen, setUnfollowOpen] = useState(false);
  const [report, setReport] = useState(null);
  const [followerDelta, setFollowerDelta] = useState(0);

  useEffect(() => {
    if (!viewerId || !viewedId || String(viewerId) === String(viewedId)) {
      setFollowLoading(false);
      setIsFollowing(false);
      setHasPending(false);
      return undefined;
    }
    let cancelled = false;
    setFollowLoading(true);
    getFollowStatus(viewerId, viewedId)
      .then(data => {
        if (cancelled) return;
        setIsFollowing(!!data?.is_following);
        setHasPending(!!data?.has_pending_request);
      })
      .catch(() => {
        if (cancelled) return;
        setIsFollowing(false);
        setHasPending(false);
      })
      .finally(() => {
        if (!cancelled) setFollowLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewerId, viewedId]);

  const showFollowPlus =
    !!viewedId && !isOwn && (!currentUser || (!followLoading && !isFollowing && !hasPending));

  const handleSendFollowRequest = async () => {
    if (!currentUser) {
      onNeedLogin?.();
      return false;
    }
    if (!viewerId || !viewedId || followBusy) return false;
    setFollowBusy(true);
    try {
      await sendFollowRequest(viewerId, viewedId);
      setHasPending(true);
      return true;
    } catch (e) {
      window.alert(e?.message || 'לא הצלחנו לשלוח בקשת מעקב');
      return false;
    } finally {
      setFollowBusy(false);
    }
  };

  const handleCancelFollowRequest = async () => {
    if (!currentUser || !viewerId || !viewedId || followBusy) return;
    setFollowBusy(true);
    try {
      await cancelFollowRequest(viewerId, viewedId);
      setHasPending(false);
    } catch (e) {
      window.alert(e?.message || 'לא הצלחנו לבטל את בקשת המעקב');
    } finally {
      setFollowBusy(false);
    }
  };

  const confirmUnfollow = async () => {
    if (!viewerId || !viewedId || followBusy) return;
    setFollowBusy(true);
    try {
      await unfollowUser(viewerId, viewedId);
      setIsFollowing(false);
      setFollowerDelta(d => d - 1);
      setUnfollowOpen(false);
    } catch (e) {
      window.alert(e?.message || 'לא הצלחנו לבטל מעקב');
    } finally {
      setFollowBusy(false);
    }
  };

  const handleChatPress = () => {
    if (isOwn) return;
    if (!currentUser) {
      onNeedLogin?.();
      return;
    }
    const email = String(vm.displayEmail || user?.creator_email || user?.email || '')
      .trim()
      .toLowerCase();
    const listingId = user && isAdsListingRecord(user) ? String(user.id).trim() : '';
    onOpenChat?.({
      email: email || null,
      subscriptionId: viewedId || null,
      name: vm.displayName || 'משתמש',
      profileImageUrl: vm.displayImage || vm.displayLogoUri || null,
      listingId: listingId || null,
    });
  };
  const scrollRef = useRef(null);
  const [subview, setSubview] = useState(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewComment, setReviewComment] = useState('');

  const screenActive = active && !subview && viewerIndex == null;

  useEffect(() => {
    scrollRef.current?.scrollTo({top: 0});
    setHeroIndex(0);
  }, [user?.id]);

  useEffect(() => {
    setHeroIndex(0);
  }, [vm.lastAd?.id]);

  const heroCount = vm.lastAdImages.length;
  useEffect(() => {
    if (heroCount <= 1 || vm.lastAdHasVideo || !screenActive || isReduceMotion()) return undefined;
    const t = setInterval(() => {
      if (isReduceMotion()) return;
      setHeroIndex(prev => (prev + 1) % heroCount);
    }, 4000);
    return () => clearInterval(t);
  }, [heroCount, vm.lastAdHasVideo, screenActive]);

  useEffect(() => {
    if (!screenActive) return undefined;
    const onKey = e => {
      if (e.key === 'Escape' && !document.querySelector('[data-account-modal]')) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screenActive, onClose]);

  const openListing = useCallback(
    listing => {
      const payload = listingAdProfilePayload(listing, {
        base: user,
        extras: {
          _forceListingAdProfile: true,
          _fromCompanyProjects:
            String(user?.subscription_type || listing?.subscription_type || listing?.creator_subscription_type || '')
              .toLowerCase()
              .trim() === 'company',
        },
      });
      if (payload) nav.open(payload);
    },
    [nav, user],
  );

  const openCompanyProjectListing = useCallback(
    (listing, ctx) => {
      const fromListing =
        listing.creator_profile_image_url || listing.company_logo_url || listing.profile_picture_url || listing.profile_image_url;
      const companyPic = (fromListing && String(fromListing).trim()) || (ctx?.logo_url && String(ctx.logo_url).trim()) || null;
      const payload = listingAdProfilePayload(listing, {
        base: user,
        extras: {
          _fromCompanyProjects: true,
          _forceListingAdProfile: true,
          business_name: listing.business_name || ctx?.name || null,
          creator_name: listing.creator_name || ctx?.name || null,
          creator_profile_image_url: companyPic,
          company_logo_url: listing.company_logo_url || ctx?.logo_url || null,
          profile_picture_url: listing.profile_picture_url || ctx?.logo_url || null,
        },
      });
      if (payload) nav.open(payload);
    },
    [nav, user],
  );

  const openCompanyProjects = () => {
    const sid = String(user?.subscription_id || user?.owner_id || user?.id || '').trim();
    if (!sid) return;
    setSubview({
      kind: 'companyProjects',
      ctx: {
        id: sid,
        name: user?.business_name || user?.creator_name || user?.name || '',
        logo_url: user?.company_logo_url || user?.creator_profile_image_url || user?.profile_picture_url || null,
      },
    });
  };

  const onCall = phone => {
    const tel = String(phone || user?.phone || user?.contact_details?.phone || user?.contact_details?.phones?.[0] || '').trim();
    if (!tel) {
      showAlert('', 'אין מספר טלפון');
      return;
    }
    window.location.href = `tel:${tel.replace(/[^\d+]/g, '')}`;
  };
  const handleCallPress = () => onCall(vm.primaryContactPhone);

  const shareProfile = () => {
    const title = String(vm.displayName || '').trim() || 'פרופיל';
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({title, text: title, url}).catch(() => {});
      return;
    }
    navigator.clipboard?.writeText(url).catch(() => {});
  };

  const copyContactDetails = async () => {
    const lines = [
      ...vm.contactPhones,
      vm.contactEmail,
      vm.contactWebsite,
      vm.isCompany || vm.agencyContact ? vm.contactAddress : null,
    ].filter(Boolean);
    const text = lines.join('\n');
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showAlert('הועתק', 'פרטי ההתקשרות הועתקו ללוח');
    } catch {
      showAlert('פרטי התקשרות', text);
    }
  };

  const handleRate = async () => {
    const commentsOnly = vm.isBnbCommentsOnly;
    if (submittingReview) return;
    if (!commentsOnly && (selectedRating < 1 || selectedRating > 5)) {
      showAlert('בחר דירוג', 'נא לבחור מספר כוכבים (1–5) לפני שליחת הדירוג.');
      return;
    }
    if (commentsOnly && !String(reviewComment || '').trim()) {
      showAlert('הוסף תגובה', 'נא לכתוב תגובה לפני השליחה.');
      return;
    }
    if (!vm.creatorId) {
      showAlert('שגיאה', 'לא ניתן לשלוח דירוג עבור פרופיל זה.');
      return;
    }
    if (!currentUser?.id && !currentUser?.email) {
      onNeedLogin?.();
      return;
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const rawId = currentUser?.id && String(currentUser.id).trim() ? String(currentUser.id).trim() : null;
    const reviewerSubscriptionId = rawId && uuidRegex.test(rawId) ? rawId : null;
    const reviewListingId =
      user?.id != null && isAdsListingRecord(user) && uuidRegex.test(String(user.id).trim()) ? String(user.id).trim() : null;
    const reviewerName =
      currentUser.name || currentUser.contact_person_name || currentUser.business_name || currentUser.broker_office_name || '';
    const reviewerImage = currentUser.profile_picture_url || currentUser.profile_image_url || currentUser.company_logo_url || null;
    setSubmittingReview(true);
    try {
      const result = await submitReview(
        vm.creatorId,
        commentsOnly ? null : selectedRating,
        reviewComment,
        reviewerName,
        reviewerImage,
        reviewerSubscriptionId,
        reviewListingId,
      );
      if (result.success) {
        setReviewComment('');
        setSelectedRating(0);
        vm.reloadReviews?.();
        showAlert('נשלח', commentsOnly ? 'התגובה נשלחה בהצלחה.' : 'הדירוג נשלח בהצלחה.');
      } else {
        showAlert('שגיאה', result.error || 'לא ניתן לשלוח דירוג. נסה שוב.');
      }
    } catch (err) {
      showAlert('שגיאה', err?.message || 'לא ניתן לשלוח דירוג. נסה שוב.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const {lastAd} = vm;
  const showFixedCompanyHero = vm.showCompanyFeedHeroTop;
  const useFixedListingTopNav = showFixedCompanyHero || vm.showFixedBackOnly;
  const showStandardHeader = vm.showStandardProfileHeader && !vm.showCompanyFeedHeroTop;
  const showProfileMessagingCta = vm.showContactDetailsBlock;
  const showBrokerCard = vm.showProfileRatingFeatures && !vm.isDedicatedListingAdProfile;
  const showAdBody =
    !vm.openedFromPost &&
    lastAd &&
    !vm.showProfilePostGridAtTop &&
    (vm.isDedicatedListingAdProfile || !vm.isProfessional);
  const showLastAdCard = vm.showProfilePostGridAtTop ? vm.renderProfilePostGrid : Boolean(lastAd);
  const showMyProperties = !vm.isRegularUserAdView && !vm.hideMyPropertiesSection && !vm.isDedicatedListingAdProfile;

  const renderPiRating = () =>
    vm.showProfileRatingFeatures && !vm.isRegularUserAdView ? (
      <PiRatingBadge rating={vm.displayPiRating} variant="profile" />
    ) : null;

  const renderCompanyFeedFollowAction = () => {
    if (!viewedId || isOwn) return null;
    if (isFollowing) {
      return (
        <button type="button" className={styles.companyFollowFollowing} disabled={followBusy} onClick={() => setUnfollowOpen(true)}>
          {followBusy ? '...' : 'עוקב'}
        </button>
      );
    }
    if (hasPending) {
      return (
        <span className={styles.companyFollowCluster}>
          <span className={styles.companyFollowPending}>ממתין לאישור</span>
          <button type="button" className={styles.companyFollowCancel} disabled={followBusy} aria-label="בטל בקשת מעקב" onClick={handleCancelFollowRequest}>
            <MdiIcon path={mdiClose} size={16} color="rgba(255,255,255,0.92)" />
          </button>
        </span>
      );
    }
    return (
      <button type="button" className={styles.companyFollow} disabled={followBusy || (currentUser && followLoading)} onClick={handleSendFollowRequest}>
        {followBusy ? '...' : 'עקוב'}
      </button>
    );
  };

  const renderHero = () => (
    <div className={styles.hero}>
      {vm.lastAdImages.length > 0 ? (
        <>
          <div className={styles.heroViewport} dir="ltr">
            <div className={styles.heroTrack} style={{transform: `translateX(${-heroIndex * 100}%)`}}>
              {vm.lastAdImages.map((slide, i) => (
                <div key={slide.isVideo ? `video-${i}` : `img-${i}-${slide.uri}`} className={styles.heroSlide}>
                  {slide.isVideo ? (
                    <HeroVideo slide={slide} active={screenActive && i === heroIndex} />
                  ) : (
                    <>
                      <img className={styles.heroBlur} src={slide.uri} alt="" onError={hideBrokenImage} />
                      <img className={styles.heroMedia} src={slide.uri} alt="" onError={hideBrokenImage} />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
          {vm.lastAdImages.length > 1 ? (
            <>
              <button
                type="button"
                className={`${styles.heroArrow} ${styles.heroArrowPrev}`}
                onClick={() => setHeroIndex(i => (i - 1 + heroCount) % heroCount)}
                aria-label="הקודם">
                <Icon name="chevron-left" size={34} />
              </button>
              <button
                type="button"
                className={`${styles.heroArrow} ${styles.heroArrowNext}`}
                onClick={() => setHeroIndex(i => (i + 1) % heroCount)}
                aria-label="הבא">
                <Icon name="chevron-right" size={34} />
              </button>
              <div className={styles.heroDots} dir="ltr">
                {vm.lastAdImages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`${styles.dot} ${i === heroIndex ? styles.dotActive : ''}`}
                    onClick={() => setHeroIndex(i)}
                    aria-label={`תמונה ${i + 1}`}
                  />
                ))}
              </div>
            </>
          ) : null}
          <button type="button" className={styles.heroExpand} onClick={() => setViewerIndex(heroIndex)} aria-label="מסך מלא">
            <img src={asset('full_screen.png')} alt="" width={22} height={22} />
          </button>
        </>
      ) : (
        <img
          className={styles.heroPlaceholder}
          src={categoryImages[vm.listingCategoryNum] || LAST_AD_PLACEHOLDER}
          alt=""
        />
      )}
      {vm.showLastAdShareOnMedia ? (
        <button type="button" className={`${styles.circleBtn} ${styles.heroShare}`} onClick={shareProfile} aria-label="שתף מודעה">
          <SvgImage xml={HERO_NAV_SHARE_XML} width={24} height={24} />
        </button>
      ) : null}
    </div>
  );

  const renderStandardAdBody = () => {
    const heroAddress = firstNonEmpty(
      lastAd?.address,
      lastAd?.location,
      lastAd?.search_address,
      lastAd?.land_address,
      user?.address,
      user?.location,
      user?.search_address,
      user?.land_address,
      user?._fromTikTokPost ? user?.creator_business_address : null,
      user?._fromTikTokPost ? user?.business_address : null,
    );
    return (
      <>
        <div className={styles.piPurposeRow}>
          {(vm.showProfileRatingFeatures && !vm.isRegularUserAdView ? (
            <PiRatingBadge rating={vm.displayPiRating} variant="profile" />
          ) : null) || <span />}
          {vm.isProfessional ? (
            <span className={styles.adProfessionalName}>{vm.displayName}</span>
          ) : vm.isCompany && isPreSaleListing(lastAd || user) ? (
            <img className={styles.preSale} src={asset('pre-sale.png')} alt="Pre-sale" />
          ) : !vm.isCompany ? (
            <span className={styles.purposeTag}>{lastAd.purpose || 'להשכרה'}</span>
          ) : null}
        </div>
        {!vm.isProfessional ? (
          <h2 className={styles.adPrice}>
            {vm.isCompany
              ? String(lastAd?.project_name || lastAd?.projectName || '').trim() || formatPriceHe(lastAd)
              : lastAd.price || '₪5,000'}
          </h2>
        ) : null}
        {heroAddress ? (
          <p className={styles.adLocation}>
            <Icon name="location-pin" size={22} color="rgba(255,255,255,0.9)" />
            <span>{heroAddress}</span>
          </p>
        ) : null}
        {vm.isBroker ? <span className={styles.adDivider} /> : null}
        {vm.isCompany && !isCommercialCategoryListing(lastAd || user) ? (
          <div className={styles.companyStats}>
            <span className={styles.companyStat}>
              <img className={styles.statIcon} src={asset('building_icon.png')} alt="" />
              {formatCompanyBuildingsLabel(vm.companyStats.buildings)}
            </span>
            <span className={styles.companyStat}>
              <img className={styles.statIcon} src={asset('floor_icon.png')} alt="" />
              {formatCompanyFloorsLabel(vm.companyStats.floors)}
            </span>
            <span className={styles.companyStat}>
              <img className={styles.statIcon} src={asset('apartment_icon.png')} alt="" />
              {formatCompanyApartmentsLabel(vm.companyStats.apartments)}
            </span>
          </div>
        ) : null}
        {vm.isCompany ? <span className={styles.adDivider} /> : null}
        {vm.isRegularUserAdView ? (
          <>
            <span className={styles.adDivider} />
            <p className={`${styles.adDescription} ${styles.clamp6}`}>
              {String(lastAd.description || '').trim() || 'אין תיאור'}
            </p>
          </>
        ) : (
          <>
            <div className={styles.postedBy}>
              <span className={styles.postedByLabel}>פורסם ע"י</span>
              <div className={styles.postedByRow}>
                <span className={styles.postedByPublisher}>
                  {lastAd.profileImageUrl || vm.displayImage ? (
                    <img className={styles.postedByAvatar} src={lastAd.profileImageUrl || vm.displayImage} alt="" />
                  ) : (
                    <span className={`${styles.postedByAvatar} ${styles.postedByAvatarPh}`}>
                      <Icon name="account" size={16} />
                    </span>
                  )}
                  <span className={styles.postedByName}>{vm.displayName}</span>
                </span>
                {vm.showCompanyFeedHeroTop ? renderCompanyFeedFollowAction() : null}
              </div>
            </div>
            <p className={`${styles.adDescription} ${styles.clamp6}`}>{lastAd.description || DUMMY_AD_DESCRIPTION}</p>
          </>
        )}
        <span className={styles.adDivider} />
        {vm.isBroker && vm.listingCategoryNum !== 7 ? (
          <>
            <FeatureChips features={vm.adFeatures} keyPrefix="feat" />
            <span className={styles.adDividerWide} />
          </>
        ) : vm.isCompany && vm.projectOffersCards.length > 0 ? (
          <>
            <ProjectOffers cards={vm.projectOffersCards} />
            <span className={styles.adDividerWide} />
            <ConstructionStatus status={lastAd?.construction_status} />
            <span className={styles.adDivider} />
          </>
        ) : (
          <>
            {vm.isCompany ? (
              <>
                <ConstructionStatus status={lastAd?.construction_status} />
                <span className={styles.adDividerWide} />
              </>
            ) : null}
            {vm.isRegularUserAdView && vm.listingCategoryNum !== 7 ? (
              <>
                <FeatureChips features={vm.adFeatures} keyPrefix="feat-regular" />
                <span className={styles.adDividerWide} />
              </>
            ) : null}
          </>
        )}
        {!vm.isBroker && !vm.isCompany && !vm.isRegularUserAdView ? <span className={styles.adDividerWide} /> : null}
        {vm.showLocationMap ? (
          <LocationMap
            address={firstNonEmpty(
              lastAd?.address,
              lastAd?.location,
              lastAd?.search_address,
              lastAd?.land_address,
              vm.brokerAddress,
            )}
            height={340}
          />
        ) : null}
      </>
    );
  };

  const renderAdBody = () => (
    <div className={styles.adBody}>
      {vm.isBnbListingAdProfile ? (
        <BnbListingContent
          listing={lastAd}
          displayPiRating={vm.isBnbReviewsWithStars ? vm.displayPiRating : undefined}
          mapAddress={firstNonEmpty(
            lastAd?.address,
            lastAd?.location,
            lastAd?.search_address,
            lastAd?.contact_details?.address,
            user?.address,
            vm.brokerAddress,
          )}
          adAddress={vm.adAddress}
        />
      ) : vm.isPartnersListingAdProfile ? (
        <PartnersListingContent
          listing={lastAd}
          displayName={vm.displayName}
          mapAddress={firstNonEmpty(lastAd?.address, lastAd?.location, vm.brokerAddress)}
          adAddress={vm.adAddress}
        />
      ) : vm.isLandListingAdProfile ? (
        <LandListingContent
          listing={vm.landListingPayload}
          displayName={vm.displayName}
          displayPiRating={vm.isRegularUserAccount ? undefined : vm.displayPiRating}
          publisherAvatarUri={lastAd?.profileImageUrl || vm.displayImage || null}
          mapAddress={firstNonEmpty(
            lastAd?.address,
            lastAd?.location,
            lastAd?.search_address,
            lastAd?.land_address,
            vm.brokerAddress,
          )}
          adAddress={vm.adAddress}
        />
      ) : (
        renderStandardAdBody()
      )}
    </div>
  );

  const renderBrokerCard = () => (
    <section className={styles.brokerCard}>
      {!vm.isCompany || vm.showCompanyPostSpecialties ? (
        <>
          <div className={styles.brokerHeader}>
            <h2 className={vm.showProfessionalFigmaProfile ? styles.brokerNamePro : styles.brokerName}>{vm.displayName}</h2>
            {renderPiRating()}
          </div>
          {vm.isProfessional || vm.isProjectMarketer || (vm.isBroker && !vm.isBrokerAccount) ? (
            <TagList labels={vm.profileTypeLabelsUnderName} className={styles.typeTags} />
          ) : null}
          {vm.brokerAddress && !vm.isBrokerAccount ? (
            <p className={styles.brokerAddress}>
              <Icon name="location-pin" size={20} />
              <span>{vm.brokerAddress}</span>
            </p>
          ) : null}
          {user?._fromTikTokPost && vm.isBroker && vm.openedFromPost ? <span className={styles.sectionDivider} /> : null}
          {vm.showProfessionalFigmaProfile || (!user?._fromTikTokPost && !vm.isBroker) ? (
            <span className={styles.sectionDivider} />
          ) : null}
          {!vm.hideCompanyPostSpecialtiesBlock && vm.showBrokerExpertiseBlock ? (
            <>
              <h3 className={styles.sectionTitle}>תחומי התמחות</h3>
              {vm.brokerExpertiseTags.length > 0 ? (
                <TagList labels={vm.brokerExpertiseTags} />
              ) : (
                <p className={styles.tagEmpty}>אין תחומי התמחות</p>
              )}
            </>
          ) : null}
          {!vm.hideCompanyPostSpecialtiesBlock && !vm.isProjectMarketer ? (
            <>
              <h3 className={styles.sectionTitle}>{vm.profileSpecialtySectionTitle}</h3>
              {vm.profileSpecialtyTags.length > 0 ? (
                <TagList
                  labels={vm.profileSpecialtyTags.map(s => (typeof s === 'string' ? s : (s?.label ?? s?.name ?? String(s))))}
                />
              ) : (
                <p className={styles.tagEmpty}>{vm.profileSpecialtyEmptyText}</p>
              )}
            </>
          ) : null}
          {vm.showProfessionalFigmaProfile || !user?._fromTikTokPost ? <span className={styles.sectionDivider} /> : null}
        </>
      ) : null}
      {vm.isCompany && (!vm.showCompanyPostSpecialties || user?._fromTikTokPost) ? (
        <>
          {vm.showCompanyPostSpecialties ? <span className={styles.sectionDivider} /> : null}
          <h3 className={styles.aboutTitle}>אודות החברה</h3>
        </>
      ) : null}
      <p className={styles.bio}>{vm.brokerBio && String(vm.brokerBio).trim() ? vm.brokerBio : 'אין תיאור'}</p>
      {!vm.hideMyPropertiesSection ? <span className={styles.bioDivider} /> : null}
    </section>
  );

  const renderMyProperties = () => (
    <section className={styles.myProperties}>
      <div className={styles.myPropertiesHeader}>
        <h3 className={styles.myPropertiesTitle}>{vm.isCompany ? 'הפרויקטים שלנו' : 'הנכסים שלי'}</h3>
        {vm.isCompany ? (
          <button type="button" className={styles.seeAll} onClick={() => vm.creatorId && openCompanyProjects()}>
            לכל הפרוייקטים שלנו
          </button>
        ) : (
          <button
            type="button"
            className={styles.seeAll}
            onClick={() => vm.creatorId && setSubview({kind: 'listings', subscriptionId: vm.creatorId})}>
            לכל הנכסים שלי
          </button>
        )}
      </div>
      {vm.userListingsLoading ? (
        <p className={styles.placeholderText}>טוען...</p>
      ) : vm.myPropertyListings.length === 0 ? (
        <p className={styles.placeholderText}>{vm.isCompany ? 'אין פרויקטים להצגה' : 'משתמש זה עדיין לא העלה נכסים'}</p>
      ) : (
        <div className={styles.propertyRow}>
          {vm.myPropertyListings.map(item => {
            const card = myPropertyCardData(item);
            return (
              <button
                key={String(item.id)}
                type="button"
                className={styles.propertyCard}
                onClick={() => item?.id != null && String(item.id).trim() && openListing(item)}
                aria-label="פתח מודעה">
                <span className={styles.propertyImageWrap}>
                  {card.image ? (
                    <img className={styles.propertyImage} src={card.image} alt="" loading="lazy" />
                  ) : (
                    <span className={`${styles.propertyImage} ${styles.propertyImagePh}`}>
                      <Icon name="image-outline" size={44} color="rgba(255,255,255,0.4)" />
                    </span>
                  )}
                  {vm.isCompany && isPreSaleListing(item) ? (
                    <img className={styles.propertyBadgeImage} src={asset('pre-sale.png')} alt="Pre-sale" />
                  ) : !vm.isCompany ? (
                    <span className={styles.propertyBadge}>{card.purposeLabel}</span>
                  ) : null}
                </span>
                <span className={styles.propertyBottom}>
                  <span className={styles.propertyPrice}>{card.price}</span>
                  <span className={styles.propertyLocation}>{card.location}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );

  const renderContactDetails = () => {
    const hasAny = vm.showContactWebsite || vm.showContactAddress || vm.contactPhones.length > 0 || vm.showContactEmail;
    return (
      <section className={styles.contact}>
        <h3 className={styles.contactTitle}>פרטי התקשרות</h3>
        <div className={styles.contactContent}>
          <div className={styles.contactMain}>
            <ProfileAvatar
              uri={vm.contactLogo || undefined}
              size={110}
              subscriptionType={vm.parentAgency || vm.resolvedCreator || user}
              forceGoldRing={vm.forceGoldRingForListing}
              className={styles.contactAvatar}
            />
            <p className={styles.contactName}>{vm.contactAgencyName}</p>
            {vm.showContactWebsite ? (
              <a
                className={styles.contactRow}
                href={/^https?:\/\//i.test(vm.contactWebsite) ? vm.contactWebsite : `https://${vm.contactWebsite}`}
                target="_blank"
                rel="noreferrer">
                <img className={styles.contactIcon} src={asset('web-icon.png')} alt="" />
                <span className={styles.contactLink}>{vm.contactWebsite}</span>
              </a>
            ) : null}
            {vm.showContactAddress ? (
              <p className={styles.contactRow}>
                <img className={styles.contactLocationIcon} src={asset('chat/location-pin.png')} alt="" />
                <span className={styles.contactLink}>{vm.contactAddress}</span>
              </p>
            ) : null}
            {vm.contactPhones.map((phone, i) => (
              <a key={i} className={styles.contactRow} href={`tel:${String(phone).replace(/[^\d+]/g, '')}`}>
                <img className={styles.contactIcon} src={asset('callIcon.png')} alt="" />
                <span className={styles.contactLink}>{String(phone).trim()}</span>
              </a>
            ))}
            {vm.showContactEmail ? (
              <a className={styles.contactRow} href={`mailto:${vm.contactEmail}`}>
                <img className={styles.contactIcon} src={asset('email-icon.png')} alt="" />
                <span className={styles.contactLink}>{vm.contactEmail}</span>
              </a>
            ) : null}
          </div>
          {hasAny ? (
            <button type="button" className={styles.copyBtn} onClick={copyContactDetails} aria-label="העתק פרטי התקשרות">
              <Icon name="content-copy" size={24} />
            </button>
          ) : null}
        </div>
        {showProfileMessagingCta ? (
          <div className={styles.cta}>
            <button type="button" className={styles.piChatBtn} onClick={handleChatPress} aria-label="Pi chat">
              <img src={asset('menu/pichat.png')} alt="" />
            </button>
            <button type="button" className={styles.phoneBtn} onClick={handleCallPress}>
              <span className={styles.phoneText}>פנייה בטלפון {vm.primaryContactPhone}</span>
              <img className={styles.phoneIcon} src={asset('phone.png')} alt="" />
            </button>
          </div>
        ) : null}
      </section>
    );
  };

  const renderReviews = () => (
    <section className={styles.reviews}>
      {!vm.isBnbCommentsOnly ? (
        <>
          <p className={styles.reviewsPiTitle}>כמה כוכבי פאי היית נותן על השירות שקיבלת?</p>
          <RatingImprovePicker value={selectedRating} onChange={setSelectedRating} />
          <GoldButton className={styles.rateBtn} onClick={handleRate} disabled={submittingReview}>
            {submittingReview ? 'שולח...' : 'דרג'}
          </GoldButton>
        </>
      ) : null}
      <h3 className={styles.reviewsListTitle}>{vm.isBnbCommentsOnly ? 'תגובות' : 'ביקורות'}</h3>
      <input
        className={styles.reviewsInput}
        value={reviewComment}
        onChange={e => setReviewComment(e.target.value)}
        placeholder={vm.isBnbCommentsOnly ? 'הוסף תגובה' : 'הוסף ביקורת'}
        dir="rtl"
      />
      {vm.isBnbCommentsOnly ? (
        <GoldButton className={styles.rateBtn} onClick={handleRate} disabled={submittingReview}>
          {submittingReview ? 'שולח...' : 'שלח'}
        </GoldButton>
      ) : null}
      {vm.reviewsLoading ? (
        <p className={styles.reviewsPlaceholder}>{vm.isBnbCommentsOnly ? 'טוען תגובות...' : 'טוען ביקורות...'}</p>
      ) : vm.listingReviews.length === 0 ? (
        <p className={styles.reviewsPlaceholder}>{vm.isBnbCommentsOnly ? 'אין עדיין תגובות' : 'אין עדיין ביקורות'}</p>
      ) : (
        <div className={styles.reviewList}>
          {vm.visibleReviews.map((r, i) => (
            <article key={r.id ?? i} className={styles.reviewCard}>
              <div className={styles.reviewHeader}>
                <span className={styles.reviewAvatar}>
                  <ProfileAvatar uri={r.reviewer_image_url || undefined} size={68} subscriptionType={r.reviewer_subscription_type} />
                  {!vm.isBnbCommentsOnly && reviewHasStarRating(r) ? (
                    <img
                      className={styles.reviewStar}
                      src={getPiReviewStarSource(Math.min(5, Math.max(1, Number(r.rating) || 1)))}
                      alt=""
                    />
                  ) : null}
                </span>
                <span className={styles.reviewMeta}>
                  <span className={styles.reviewName}>{r.reviewer_name || 'משתמש'}</span>
                  <span className={styles.reviewDate}>{formatReviewDate(r.created_at)}</span>
                </span>
              </div>
              {r.comment ? <p className={styles.reviewBody}>{r.comment}</p> : null}
            </article>
          ))}
        </div>
      )}
      {!vm.reviewsLoading && vm.listingReviews.length > 0 ? (
        <div className={styles.readMoreWrap}>
          <button
            type="button"
            className={styles.readMore}
            onClick={() =>
              setSubview({kind: 'reviews', reviews: vm.listingReviews, variant: vm.isBnbCommentsOnly ? 'comments' : 'reviews'})
            }
            aria-label={vm.isBnbCommentsOnly ? 'כל התגובות' : 'כל הביקורות'}>
            קרא עוד
          </button>
          <span className={styles.contactDivider} />
        </div>
      ) : null}
    </section>
  );

  const openReport = () => {
    const listingId = vm.lastAd?.id || (user && isAdsListingRecord(user) ? user.id : null);
    if (vm.isBnbListingAdProfile) {
      setReport({subjectType: 'bnb', reportedListingId: listingId});
      return;
    }
    if (vm.isBroker) setReport({subjectType: 'broker', reportedListingId: listingId});
    else if (vm.isProfessional) setReport({subjectType: 'professional', reportedListingId: listingId});
    else if (vm.isCompany || vm.isProjectMarketer) setReport({subjectType: 'company', reportedListingId: listingId});
    else showAlert('דיווח', 'הדיווח נשלח בהצלחה.');
  };

  const reportButton = (
    <button
      type="button"
      className={styles.reportBtn}
      onClick={openReport}
      aria-label="דווח">
      <span>דווח</span>
      <Icon name="alert-outline" size={24} color="#F7F3E6" />
    </button>
  );

  const asideHasIdentity = showStandardHeader;
  const postListings = vm.recentPostGridImages.map(t => t.listing);

  return (
    <div className={styles.screen} aria-label={vm.displayName}>
      <div className={styles.scroll} ref={scrollRef}>
        <header className={styles.topNav}>
          {showFixedCompanyHero ? (
            <>
              <button type="button" className={styles.circleBtn} onClick={onClose} aria-label="חזרה">
                <SvgImage xml={HERO_NAV_BACK_XML} width={11} height={16} />
              </button>
              <span className={styles.topNavActions}>
                <button type="button" className={styles.circleBtn} onClick={() => (onOpenFavorites ? onOpenFavorites() : requireLogin())} aria-label="מועדפים">
                  <SvgImage xml={HERO_NAV_HEART_XML} width={20} height={19} />
                </button>
                <button type="button" className={styles.circleBtn} onClick={shareProfile} aria-label="שתף מודעה">
                  <SvgImage xml={HERO_NAV_SHARE_XML} width={24} height={24} />
                </button>
              </span>
            </>
          ) : (
            <button
              type="button"
              className={useFixedListingTopNav ? styles.circleBtn : styles.backBtn}
              onClick={onClose}
              aria-label="חזרה">
              <Icon name="chevron-left" size={useFixedListingTopNav ? 28 : 34} />
            </button>
          )}
        </header>

        <div className={styles.layout}>
          <aside className={styles.aside}>
            {asideHasIdentity ? (
              <div className={styles.identity}>
                <span className={styles.avatarWrap}>
                  <ProfileAvatar
                    uri={vm.displayLogoUri || undefined}
                    size={128}
                    subscriptionType={vm.resolvedCreator || user}
                    forceGoldRing={vm.forceGoldRingForListing}
                  />
                  {showFollowPlus ? (
                    <FollowPlusBadge
                      className={styles.avatarBadge}
                      iconSize={22}
                      beforePress={() => {
                        if (!currentUser) {
                          onNeedLogin?.();
                          return false;
                        }
                        return true;
                      }}
                      onPress={handleSendFollowRequest}
                    />
                  ) : null}
                </span>
                <h1 className={styles.userName}>{vm.displayName}</h1>
                {vm.displayEmail ? <p className={styles.userEmail}>{vm.displayEmail}</p> : null}
                <StatsRow
                  vm={{
                    ...vm,
                    followStats: {
                      ...vm.followStats,
                      followers: vm.followStats.followers == null ? null : Math.max(0, vm.followStats.followers + followerDelta),
                    },
                  }}
                  onOpen={onOpenFollowHub}
                />
                <div className={styles.actionRow}>
                  <button type="button" className={styles.actionBtn} onClick={handleChatPress} aria-label="הודעה">
                    <img src={asset('chatWithText.png')} alt="" />
                  </button>
                  <button type="button" className={styles.actionBtn} onClick={handleCallPress} aria-label="חייג">
                    <img src={asset('callWithText.png')} alt="" />
                  </button>
                </div>
              </div>
            ) : null}

            {vm.showProfileRatingFeatures &&
            !vm.openedFromPost &&
            !vm.showProfessionalFigmaProfile &&
            !vm.isDedicatedListingAdProfile &&
            asideHasIdentity ? (
              <span className={styles.overlayLine} />
            ) : null}
            {showBrokerCard ? renderBrokerCard() : null}

            {vm.showContactDetailsBlock ? (
              <>
                {asideHasIdentity || showBrokerCard ? <span className={styles.contactDivider} /> : null}
                {renderContactDetails()}
              </>
            ) : null}

            {reportButton}
          </aside>

          <main className={styles.main}>
            {showLastAdCard ? (
              <section className={styles.lastAdCard}>
                {vm.showProfilePostGridAtTop ? (
                  <PostGrid
                    pages={vm.postGridPages}
                    onOpen={tile => tile?.listing?.id && setSubview({kind: 'posts', focusId: tile.listing.id})}
                  />
                ) : (
                  renderHero()
                )}
                {showAdBody ? renderAdBody() : null}
              </section>
            ) : null}

            {vm.showPiAiSmartInfoBlock ? (
              <>
                <span className={styles.profileDivider} />
                <SmartInfoBlock address={vm.adAddress} variant="main" />
              </>
            ) : null}

            {showMyProperties ? renderMyProperties() : null}

            {vm.showListingFeedbackSection ? (
              <>
                <span className={styles.contactDivider} />
                {renderReviews()}
              </>
            ) : null}
          </main>
        </div>
      </div>

      {viewerIndex != null && vm.lastAdImages.length > 0 ? (
        <MediaViewer
          slides={vm.lastAdImages}
          index={Math.min(viewerIndex, vm.lastAdImages.length - 1)}
          onIndex={setViewerIndex}
          onClose={() => {
            setHeroIndex(viewerIndex);
            setViewerIndex(null);
          }}
        />
      ) : null}

      {subview?.kind === 'reviews' ? (
        <ReviewsListView
          reviews={subview.reviews}
          variant={subview.variant}
          onClose={() => setSubview(null)}
          active={active}
        />
      ) : null}
      {subview?.kind === 'listings' ? (
        <UserListingsView
          subscriptionId={subview.subscriptionId}
          onClose={() => setSubview(null)}
          onOpenListing={listing => {
            const payload = listingAdProfilePayload(listing, {base: user});
            if (payload) nav.open(payload);
          }}
          active={active}
        />
      ) : null}
      {subview?.kind === 'companyProjects' ? (
        <CompanyProjectsView
          companyId={subview.ctx.id}
          companyName={subview.ctx.name}
          onClose={() => setSubview(null)}
          onOpenListing={listing => openCompanyProjectListing(listing, subview.ctx)}
          active={active}
        />
      ) : null}
      {subview?.kind === 'posts' ? (
        <ProfilePostsFeedView
          listings={postListings}
          focusId={subview.focusId}
          title={vm.displayName}
          onClose={() => setSubview(null)}
          active={active}
        />
      ) : null}
      {report ? (
        <CompanyReportScreen
          subjectType={report.subjectType}
          reportedSubscriptionId={viewedId}
          reportedListingId={report.reportedListingId}
          displayName={vm.displayName}
          onClose={() => setReport(null)}
        />
      ) : null}
      {unfollowOpen ? (
        <div className={styles.unfollowOverlay} data-account-modal="">
          <div className={styles.unfollowCard} role="alertdialog">
            <h2>ביטול מעקב</h2>
            <p>להפסיק לעקוב אחרי {vm.displayName || 'המשתמש'}?</p>
            <div className={styles.unfollowActions}>
              <button type="button" onClick={() => setUnfollowOpen(false)}>ביטול</button>
              <button type="button" className={styles.unfollowDanger} onClick={confirmUnfollow}>
                הפסק מעקב
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
