import {useEffect, useMemo, useState} from 'react';
import {mdiChevronLeft, mdiImageOutline} from '@mdi/js';
import MdiIcon from './MdiIcon';
import {getListings} from '../api/client';
import {isPostListingRecord} from '../profile/lib/pickTopViewedListingForProfile';
import {
  DEFAULT_MONTHLY_LISTING_QUOTA,
  canAccessListingAnalysis,
  categoriesEditProfile,
  getAnalysisCategoriesStrip,
  isBrokerLikeSubscriptionType,
  resolveListingCategoryFromEditProfileUi,
  resolveSubscriptionType,
  subscriptionTypes,
  toEditProfileUiCategoryId,
} from './lib/publishRules';
import styles from './ListingAnalysisScreen.module.css';

const DEFAULT_LISTING_QUOTA = DEFAULT_MONTHLY_LISTING_QUOTA;
const CATEGORY_ICON_SIZE = 73;
const EDIT_PUBLISH_CATEGORY_ICON_SIZE = 143;
const CATEGORY_ICON_CROP = 0.24;
const ANALYSIS_ICON_BORDER_RADIUS = Math.round(
  (18 * CATEGORY_ICON_SIZE) / EDIT_PUBLISH_CATEGORY_ICON_SIZE,
);

const getPublishedCountLabel = subscriptionType =>
  subscriptionType === subscriptionTypes.company ? 'מספר פרויקטים מפורסמים' : 'מספר נכסים מפורסמים';

const categoryMeta = listingCategoryId => {
  const uiId = toEditProfileUiCategoryId(listingCategoryId);
  return categoriesEditProfile.find(c => c.id === uiId) || null;
};

function CroppedCategoryImage({source, categoryId}) {
  const inner = 1 - 2 * CATEGORY_ICON_CROP;
  const imageSize = Math.ceil(CATEGORY_ICON_SIZE / inner);
  const offset = (imageSize - CATEGORY_ICON_SIZE) / 2;
  const extraTop =
    categoryId === 8 ? Math.round((5 * CATEGORY_ICON_SIZE) / EDIT_PUBLISH_CATEGORY_ICON_SIZE) : 0;
  return (
    <span
      className={styles.categoryImageWrap}
      style={{
        width: CATEGORY_ICON_SIZE,
        height: CATEGORY_ICON_SIZE,
        borderRadius: ANALYSIS_ICON_BORDER_RADIUS,
      }}>
      <img
        src={source}
        alt=""
        className={styles.categoryImage}
        style={{
          width: imageSize,
          height: imageSize,
          marginLeft: -offset,
          marginTop: -offset + extraTop,
        }}
      />
    </span>
  );
}

const isListingFrozen = l => l?.is_frozen === true || l?.is_frozen === 'true';
const isListingAd = l => !isPostListingRecord(l);

export default function ListingAnalysisScreen({onClose, currentUser = null, listingOwnerUser = null}) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const subjectUser = listingOwnerUser || currentUser;
  const isAgencyMemberAnalysis = listingOwnerUser != null;
  const subscriptionType = resolveSubscriptionType(subjectUser);
  const isBrokerUser = isBrokerLikeSubscriptionType(subscriptionType);
  const isRegularUser = subscriptionType === subscriptionTypes.user;
  const canAccessAnalysis = canAccessListingAnalysis(resolveSubscriptionType(currentUser));
  const publishedCountLabel = getPublishedCountLabel(subscriptionType);

  useEffect(() => {
    if (!canAccessAnalysis && typeof onClose === 'function') onClose();
  }, [canAccessAnalysis, onClose]);

  useEffect(() => {
    if (!canAccessAnalysis) return undefined;
    const onKey = e => {
      if (e.key !== 'Escape' || document.querySelector('[data-account-modal]')) return;
      e.stopPropagation();
      onClose?.();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [canAccessAnalysis, onClose]);

  const analysisRows = useMemo(
    () =>
      getAnalysisCategoriesStrip(subscriptionType).map(cat => ({
        uiCategoryId: cat.id,
        listingCategoryId: resolveListingCategoryFromEditProfileUi(cat.id),
        label: cat.name,
      })),
    [subscriptionType],
  );

  const allowedListingCategoryIds = useMemo(
    () =>
      new Set(analysisRows.map(r => r.listingCategoryId).filter(id => id != null && Number.isFinite(Number(id)))),
    [analysisRows],
  );

  const quota =
    subjectUser?.max_published_listings ?? subjectUser?.listing_quota ?? subjectUser?.max_listings ?? DEFAULT_LISTING_QUOTA;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const ownerId = subjectUser?.id != null ? String(subjectUser.id).trim() : '';
        const result = await getListings({
          status: 'published',
          ...(ownerId && {subscription_id: ownerId}),
        });
        if (cancelled) return;
        if (result?.success && Array.isArray(result.listings)) {
          setListings(ownerId ? result.listings : []);
        } else {
          setListings([]);
        }
      } catch {
        if (!cancelled) setListings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subjectUser?.id]);

  const {countsByCategory, activeTotal} = useMemo(() => {
    const byCat = {};
    analysisRows.forEach(r => {
      if (r.listingCategoryId != null) byCat[r.listingCategoryId] = 0;
    });
    let total = 0;
    listings.forEach(l => {
      if (isListingFrozen(l) || !isListingAd(l)) return;
      const cid = l.category != null ? parseInt(String(l.category), 10) : NaN;
      if (Number.isNaN(cid) || !allowedListingCategoryIds.has(cid) || !Object.prototype.hasOwnProperty.call(byCat, cid)) {
        return;
      }
      byCat[cid] += 1;
      total += 1;
    });
    return {countsByCategory: byCat, activeTotal: total};
  }, [listings, analysisRows, allowedListingCategoryIds]);

  const remaining = Math.max(0, quota - activeTotal);
  const progress = quota > 0 ? Math.min(1, activeTotal / quota) : 0;

  if (!canAccessAnalysis) return null;

  return (
    <div className={styles.screen} dir="rtl">
      <header className={styles.header}>
        <button type="button" className={styles.headerBtn} onClick={onClose} aria-label="חזור">
          <MdiIcon path={mdiChevronLeft} size={36} color="#fff" />
        </button>
        <h1 className={styles.headerTitle}>ניתוח מודעות</h1>
        <span className={styles.headerBtn} />
      </header>

      {loading ? (
        <div className={styles.loadingWrap}>
          <span className={styles.spinner} aria-label="טוען" />
        </div>
      ) : (
        <div className={styles.scroll}>
          <div className={styles.scrollInner}>
            {isBrokerUser && !isAgencyMemberAnalysis ? (
              <section className={styles.summaryCard}>
                <div className={styles.summaryTopRow}>
                  <span className={styles.summaryLabel}>מודעות פעילות</span>
                  <span className={styles.summaryCountWrap}>
                    <span className={styles.summaryCountCurrent}>{activeTotal}</span>
                    <span className={styles.summaryCountSlash}>/</span>
                    <span className={styles.summaryCountQuota}>{quota}</span>
                  </span>
                </div>
                <div className={styles.progressTrack}>
                  <span className={styles.progressFill} style={{width: `${progress * 100}%`}} />
                </div>
                <p className={styles.summaryFooter}>ניתן לפרסם עוד {remaining} מודעות</p>
              </section>
            ) : null}

            <div className={styles.tableHeader}>
              <span className={styles.tableHeaderRight}>קטגוריה</span>
              <span className={styles.tableHeaderLeft}>פרסומים</span>
            </div>

            {analysisRows.map((row, idx) => {
              const meta = categoryMeta(row.listingCategoryId);
              const count = countsByCategory[row.listingCategoryId] ?? 0;
              return (
                <div key={row.uiCategoryId}>
                  <div className={styles.tableRow}>
                    <div className={styles.rowRight}>
                      {meta?.image ? (
                        <CroppedCategoryImage source={meta.image} categoryId={row.listingCategoryId} />
                      ) : (
                        <span
                          className={`${styles.categoryImageWrap} ${styles.categoryImagePlaceholder}`}
                          style={{
                            width: CATEGORY_ICON_SIZE,
                            height: CATEGORY_ICON_SIZE,
                            borderRadius: ANALYSIS_ICON_BORDER_RADIUS,
                          }}>
                          <MdiIcon path={mdiImageOutline} size={29} color="#d2d0dc" />
                        </span>
                      )}
                      <span className={styles.rowCategoryName}>{row.label}</span>
                    </div>
                    <div className={styles.rowLeft}>
                      <div className={styles.rowSubtextCol}>
                        <span className={styles.rowSubtextTitle}>{publishedCountLabel}</span>
                        <span className={styles.rowSubtextNote}>
                          {isRegularUser ? 'ללא פוסטים' : 'לא כולל בית פתוח ופוסטים'}
                        </span>
                      </div>
                      <span className={styles.rowCount}>{count}</span>
                    </div>
                  </div>
                  {idx < analysisRows.length - 1 ? <div className={styles.divider} /> : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
