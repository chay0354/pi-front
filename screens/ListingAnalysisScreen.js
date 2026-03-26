import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { brokerCategories } from '../utils/constant';
import { getListings } from '../utils/api';

const BG = '#1a1926';
const CARD_BG = '#252436';
const GOLD = '#ffc40a';
const TEXT_MUTED = 'rgba(255,255,255,0.55)';

// Same crop math as EditPublishAdScreen; smaller display size for analysis rows
const EDIT_PUBLISH_CATEGORY_ICON_SIZE = 110;
const CATEGORY_ICON_SIZE = 70;
const CATEGORY_ICON_CROP = 0.24;
const ANALYSIS_ICON_BORDER_RADIUS = Math.round((14 * CATEGORY_ICON_SIZE) / EDIT_PUBLISH_CATEGORY_ICON_SIZE);

/** Rows matching product design (category id → display label). */
const ANALYSIS_ROWS = [
  { id: 1, label: 'חדש מקבלן' },
  { id: 10, label: 'דירות' },
  { id: 8, label: 'מסחרי' },
  { id: 2, label: 'משרדים' },
  { id: 12, label: 'יוקרה' },
  { id: 4, label: 'גלובל' },
  { id: 6, label: 'מגזר דתי' },
];

const DEFAULT_LISTING_QUOTA = 65;

function categoryMeta(categoryId) {
  return brokerCategories.find(c => c.id === categoryId) || null;
}

/** Identical crop/layout logic as EditPublishAdScreen category chips */
function renderCroppedCategoryImage(source, categoryId) {
  const crop = CATEGORY_ICON_CROP;
  const inner = 1 - 2 * crop;
  const imageSize = Math.ceil(CATEGORY_ICON_SIZE / inner);
  const offset = (imageSize - CATEGORY_ICON_SIZE) / 2;
  const imageAdjust =
    categoryId === 8
      ? { marginLeft: 0, marginTop: Math.round((4 * CATEGORY_ICON_SIZE) / EDIT_PUBLISH_CATEGORY_ICON_SIZE) }
      : { marginLeft: 0, marginTop: 0 };
  return (
    <View
      style={[
        styles.analysisCategoryImageWrap,
        {
          width: CATEGORY_ICON_SIZE,
          height: CATEGORY_ICON_SIZE,
          borderRadius: ANALYSIS_ICON_BORDER_RADIUS,
        },
      ]}>
      <Image
        source={source}
        style={[
          styles.analysisCategoryImage,
          {
            width: imageSize,
            height: imageSize,
            marginLeft: -offset + (imageAdjust.marginLeft ?? 0),
            marginTop: -offset + (imageAdjust.marginTop ?? 0),
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

function isListingFrozen(listing) {
  return listing?.is_frozen === true || listing?.is_frozen === 'true';
}

const ListingAnalysisScreen = ({ onClose, currentUser = null }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const quota =
    currentUser?.max_published_listings ??
    currentUser?.listing_quota ??
    currentUser?.max_listings ??
    DEFAULT_LISTING_QUOTA;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await getListings({
          status: 'published',
          ...(currentUser?.id && { subscription_id: currentUser.id }),
        });
        if (cancelled) return;
        if (result?.success && Array.isArray(result.listings)) {
          const list =
            currentUser?.id == null ? [] : result.listings;
          setListings(list);
        } else {
          setListings([]);
        }
      } catch (_) {
        if (!cancelled) setListings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  const { activeListings, countsByCategory, activeTotal } = useMemo(() => {
    const active = listings.filter(l => !isListingFrozen(l));
    const byCat = {};
    ANALYSIS_ROWS.forEach(r => { byCat[r.id] = 0; });
    active.forEach(l => {
      const cid = l.category != null ? parseInt(String(l.category), 10) : NaN;
      if (!Number.isNaN(cid) && Object.prototype.hasOwnProperty.call(byCat, cid)) {
        byCat[cid] += 1;
      }
    });
    return {
      activeListings: active,
      countsByCategory: byCat,
      activeTotal: active.length,
    };
  }, [listings]);

  const remaining = Math.max(0, quota - activeTotal);
  const progress = quota > 0 ? Math.min(1, activeTotal / quota) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.headerBtn} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ניתוח מודעות</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>מודעות פעילות</Text>
            <Text style={styles.summaryCount}>
              <Text style={styles.summaryCountCurrent}>{activeTotal}</Text>
              <Text style={styles.summaryCountSlash}>/</Text>
              <Text style={styles.summaryCountQuota}>{quota}</Text>
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.summaryFooter}>
              ניתן לפרסם עוד {remaining} מודעות
            </Text>
          </View>

          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderLeft}>פרסומים</Text>
            <Text style={styles.tableHeaderRight}>קטגוריה</Text>
          </View>

          {ANALYSIS_ROWS.map(row => {
            const meta = categoryMeta(row.id);
            const count = countsByCategory[row.id] ?? 0;
            return (
              <View key={row.id} style={styles.tableRow}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowCount}>{count}</Text>
                  <View style={styles.rowSubtextCol}>
                    <Text style={styles.rowSubtextTitle}>מספר נכסים מפורסמים</Text>
                    <Text style={styles.rowSubtextNote}>לא כולל בית פתוח ופוסטים</Text>
                  </View>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.rowCategoryName}>{row.label}</Text>
                  {meta?.image
                    ? renderCroppedCategoryImage(meta.image, row.id)
                    : (
                      <View style={[styles.analysisCategoryImageWrap, styles.rowIconPlaceholder, { width: CATEGORY_ICON_SIZE, height: CATEGORY_ICON_SIZE, borderRadius: ANALYSIS_ICON_BORDER_RADIUS }]}>
                        <MaterialCommunityIcons name="image-outline" size={Math.round((32 * CATEGORY_ICON_SIZE) / EDIT_PUBLISH_CATEGORY_ICON_SIZE)} color={TEXT_MUTED} />
                      </View>
                    )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: BG,
  },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 20 },
  summaryCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  summaryLabel: { color: TEXT_MUTED, fontSize: 15, textAlign: 'right', marginBottom: 8 },
  summaryCount: { textAlign: 'right', marginBottom: 14 },
  summaryCountCurrent: { color: GOLD, fontSize: 32, fontWeight: '700' },
  summaryCountSlash: { color: '#fff', fontSize: 28, fontWeight: '600' },
  summaryCountQuota: { color: '#fff', fontSize: 28, fontWeight: '600' },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: GOLD,
  },
  summaryFooter: { color: TEXT_MUTED, fontSize: 14, textAlign: 'right' },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  tableHeaderLeft: { color: TEXT_MUTED, fontSize: 13, fontWeight: '600' },
  tableHeaderRight: { color: TEXT_MUTED, fontSize: 13, fontWeight: '600' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 8 },
  rowCount: { color: '#fff', fontSize: 22, fontWeight: '700', minWidth: 28, textAlign: 'left' },
  rowSubtextCol: {
    flexShrink: 1,
    maxWidth: 148,
    alignItems: 'flex-start',
    marginStart: -14,
  },
  rowSubtextTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  rowSubtextNote: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 14,
    textAlign: 'right',
    alignSelf: 'stretch',
    marginTop: 3,
  },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowCategoryName: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'right', maxWidth: 140 },
  analysisCategoryImageWrap: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  analysisCategoryImage: {},
  rowIconPlaceholder: { justifyContent: 'center', alignItems: 'center' },
});

export default ListingAnalysisScreen;
