import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {brokerCategories} from '../utils/constant';
import {getListings} from '../utils/api';

// Figma palette (node 35:547303 — ניתוח מודעות)
const BG = '#27262F';
const CARD_BG = '#2B2A39';
const DIVIDER = '#373548';
const GOLD_ACCENT = '#E8B34D';
const GOLD_GRADIENT = ['#FEE787', '#BD9947', '#9C6522'];
const GOLD_GRADIENT_LOCATIONS = [0.0456, 0.5076, 0.8831];
const TEXT_SECONDARY = '#D2D0DC';

const EDIT_PUBLISH_CATEGORY_ICON_SIZE = 110;
const CATEGORY_ICON_SIZE = 56;
const CATEGORY_ICON_CROP = 0.24;
const ANALYSIS_ICON_BORDER_RADIUS = Math.round(
  (14 * CATEGORY_ICON_SIZE) / EDIT_PUBLISH_CATEGORY_ICON_SIZE,
);

// Rows match Figma display order (id → label).
const ANALYSIS_ROWS = [
  {id: 1, label: 'חדש מקבלן'},
  {id: 10, label: 'דירות'},
  {id: 8, label: 'מסחר'},
  {id: 2, label: 'משרדים'},
  {id: 12, label: 'יוקרה'},
  {id: 4, label: 'גלובל'},
  {id: 6, label: 'מגזר דתי'},
];

const DEFAULT_LISTING_QUOTA = 65;

const categoryMeta = id => brokerCategories.find(c => c.id === id) || null;

const isListingFrozen = l =>
  l?.is_frozen === true || l?.is_frozen === 'true';

/** Crops the category asset the same way EditPublishAdScreen does. */
const CroppedCategoryImage = ({source, categoryId}) => {
  const inner = 1 - 2 * CATEGORY_ICON_CROP;
  const imageSize = Math.ceil(CATEGORY_ICON_SIZE / inner);
  const offset = (imageSize - CATEGORY_ICON_SIZE) / 2;
  const imageAdjust =
    categoryId === 8
      ? {
          marginTop: Math.round(
            (4 * CATEGORY_ICON_SIZE) / EDIT_PUBLISH_CATEGORY_ICON_SIZE,
          ),
        }
      : {};
  return (
    <View
      style={[
        styles.categoryImageWrap,
        {
          width: CATEGORY_ICON_SIZE,
          height: CATEGORY_ICON_SIZE,
          borderRadius: ANALYSIS_ICON_BORDER_RADIUS,
        },
      ]}>
      <Image
        source={source}
        style={{
          width: imageSize,
          height: imageSize,
          marginLeft: -offset,
          marginTop: -offset + (imageAdjust.marginTop ?? 0),
        }}
        resizeMode="contain"
      />
    </View>
  );
};

const ListingAnalysisScreen = ({onClose, currentUser = null}) => {
  const insets = useSafeAreaInsets();
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
          ...(currentUser?.id && {subscription_id: currentUser.id}),
        });
        if (cancelled) return;
        if (result?.success && Array.isArray(result.listings)) {
          setListings(currentUser?.id == null ? [] : result.listings);
        } else {
          setListings([]);
        }
      } catch (_) {
        if (!cancelled) setListings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  const {countsByCategory, activeTotal} = useMemo(() => {
    const active = listings.filter(l => !isListingFrozen(l));
    const byCat = {};
    ANALYSIS_ROWS.forEach(r => {
      byCat[r.id] = 0;
    });
    active.forEach(l => {
      const cid = l.category != null ? parseInt(String(l.category), 10) : NaN;
      if (
        !Number.isNaN(cid) &&
        Object.prototype.hasOwnProperty.call(byCat, cid)
      ) {
        byCat[cid] += 1;
      }
    });
    return {countsByCategory: byCat, activeTotal: active.length};
  }, [listings]);

  const remaining = Math.max(0, quota - activeTotal);
  const progress = quota > 0 ? Math.min(1, activeTotal / quota) : 0;

  return (
    <View style={styles.container}>
      <View style={[styles.header, {paddingTop: insets.top + 12}]}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.headerBtn}
          hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ניתוח מודעות</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={GOLD_ACCENT} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryTopRow}>
              <Text style={styles.summaryCountWrap}>
                <Text style={styles.summaryCountCurrent}>{activeTotal}</Text>
                <Text style={styles.summaryCountSlash}>/</Text>
                <Text style={styles.summaryCountQuota}>{quota}</Text>
              </Text>
              <Text style={styles.summaryLabel}>מודעות פעילות</Text>
            </View>
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={GOLD_GRADIENT}
                locations={GOLD_GRADIENT_LOCATIONS}
                start={{x: 0.5, y: 0}}
                end={{x: 0.5, y: 1}}
                style={[
                  styles.progressFill,
                  {width: `${progress * 100}%`},
                ]}
              />
            </View>
            <Text style={styles.summaryFooter}>
              ניתן לפרסם עוד {remaining} מודעות
            </Text>
          </View>

          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderLeft}>פרסומים</Text>
            <Text style={styles.tableHeaderRight}>קטגוריה</Text>
          </View>

          {ANALYSIS_ROWS.map((row, idx) => {
            const meta = categoryMeta(row.id);
            const count = countsByCategory[row.id] ?? 0;
            return (
              <View key={row.id}>
                <View style={styles.tableRow}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowCount}>{count}</Text>
                    <View style={styles.rowSubtextCol}>
                      <Text style={styles.rowSubtextTitle}>
                        מספר נכסים מפורסמים
                      </Text>
                      <Text style={styles.rowSubtextNote}>
                        לא כולל בית פתוח ופוסטים
                      </Text>
                    </View>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.rowCategoryName}>{row.label}</Text>
                    {meta?.image ? (
                      <CroppedCategoryImage
                        source={meta.image}
                        categoryId={row.id}
                      />
                    ) : (
                      <View
                        style={[
                          styles.categoryImageWrap,
                          styles.categoryImagePlaceholder,
                          {
                            width: CATEGORY_ICON_SIZE,
                            height: CATEGORY_ICON_SIZE,
                            borderRadius: ANALYSIS_ICON_BORDER_RADIUS,
                          },
                        ]}>
                        <MaterialCommunityIcons
                          name="image-outline"
                          size={22}
                          color={TEXT_SECONDARY}
                        />
                      </View>
                    )}
                  </View>
                </View>
                {idx < ANALYSIS_ROWS.length - 1 ? (
                  <View style={styles.divider} />
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: BG},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
    backgroundColor: CARD_BG,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
  },
  loadingWrap: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  scroll: {flex: 1},
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },

  // Summary card
  summaryCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    marginBottom: 20,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 31,
  },
  summaryLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
    textAlign: 'right',
    lineHeight: 22,
  },
  summaryCountWrap: {
    textAlign: 'left',
  },
  summaryCountCurrent: {
    color: GOLD_ACCENT,
    fontSize: 32,
    lineHeight: 37,
    fontFamily: 'Rubik-SemiBold',
    fontWeight: '600',
    letterSpacing: 0.54,
  },
  summaryCountSlash: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
    letterSpacing: 0.54,
  },
  summaryCountQuota: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
    letterSpacing: 0.54,
  },
  progressTrack: {
    height: 4,
    backgroundColor: DIVIDER,
    borderRadius: 855,
    overflow: 'hidden',
    marginBottom: 15,
  },
  progressFill: {
    height: '100%',
    borderRadius: 17,
  },
  summaryFooter: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.54,
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
    textAlign: 'center',
  },

  // Table headers
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 19,
    paddingHorizontal: 0,
  },
  tableHeaderLeft: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.54,
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
  },
  tableHeaderRight: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.54,
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
  },

  // Rows
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 66,
  },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowCount: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 28,
    fontFamily: 'Rubik-SemiBold',
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'left',
  },
  rowSubtextCol: {
    flexShrink: 1,
    alignItems: 'flex-end',
  },
  rowSubtextTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 16,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    textAlign: 'right',
  },
  rowSubtextNote: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
    textAlign: 'right',
    marginTop: 2,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowCategoryName: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    textAlign: 'right',
    maxWidth: 110,
  },
  categoryImageWrap: {
    overflow: 'hidden',
    backgroundColor: '#2C2A3A',
  },
  categoryImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Divider between rows
  divider: {
    height: 1,
    backgroundColor: DIVIDER,
  },
});

export default ListingAnalysisScreen;
