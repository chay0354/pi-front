import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors} from '../constants/styles';
import {
  getListings,
  getBoostQuota,
  boostListing,
  deleteListing,
  updateListingFreeze,
} from '../utils/api';
import EditPublishListingCard, {
  computeListingExposureLevel,
  isPostListingRecord,
} from '../components/EditPublishListingCard';
import {canAccessListingAnalysis} from '../utils/constant';
import {agencyMemberDisplayName} from '../utils/agencyMemberDisplay';
import {hebrewTextAlign} from '../utils/rtlLayout';

const BLUE_100 = '#1e1d27';
const CARD_BG = '#2B2A39';
const BORDER_GOLD = '#FFBF3E';
const FROZEN_IDS_KEY = 'pi_edit_frozen_listing_ids';

const TABS = [
  {id: 'all', label: 'הכל'},
  {id: 'ads', label: 'מודעות'},
  {id: 'posts', label: 'פוסטים'},
];

const memberDisplayName = agencyMemberDisplayName;

const listingStableKey = listing =>
  String(listing?.id ?? listing?.ad_number ?? '');

const getListingCreatedTs = listing => {
  const raw =
    listing?.created_at ||
    listing?.createdAt ||
    listing?.uploaded_at ||
    listing?.uploadedAt ||
    null;
  if (raw) {
    const ts = new Date(raw).getTime();
    if (Number.isFinite(ts)) return ts;
  }
  return 0;
};

const buildOldestFirstOrdinalMap = listings => {
  const posts = [];
  const ads = [];
  (listings || []).forEach(listing => {
    if (!listing) return;
    if (isPostListingRecord(listing)) posts.push(listing);
    else ads.push(listing);
  });
  const byOldest = (a, b) => {
    const diff = getListingCreatedTs(a) - getListingCreatedTs(b);
    if (diff !== 0) return diff;
    return listingStableKey(a).localeCompare(listingStableKey(b));
  };
  posts.sort(byOldest);
  ads.sort(byOldest);
  const map = new Map();
  posts.forEach((listing, index) => {
    const key = listingStableKey(listing);
    if (key) map.set(key, index + 1);
  });
  ads.forEach((listing, index) => {
    const key = listingStableKey(listing);
    if (key) map.set(key, index + 1);
  });
  return map;
};

/**
 * Marketing manager view of one team member's ads/posts — same cards as ערוך/פרסם.
 */
const AgencyMemberListingsScreen = ({
  onClose,
  member,
  currentUser,
  onViewListing,
  onEditListing,
  onEditPost,
  onOpenListingAnalysis,
}) => {
  const insets = useSafeAreaInsets();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [frozenListingIds, setFrozenListingIds] = useState([]);
  const [boostedOverrides, setBoostedOverrides] = useState({});
  const [boostQuota, setBoostQuota] = useState({
    quota: 1,
    used: 0,
    remaining: 1,
  });
  const [boostConfirmListing, setBoostConfirmListing] = useState(null);
  const [boostSubmitting, setBoostSubmitting] = useState(false);
  const [freezeConfirmListing, setFreezeConfirmListing] = useState(null);
  const [unfreezeConfirmListing, setUnfreezeConfirmListing] = useState(null);
  const [removeConfirmListing, setRemoveConfirmListing] = useState(null);
  const [removeSubmitting, setRemoveSubmitting] = useState(false);

  const memberSubId = member?.id != null ? String(member.id).trim() : '';
  const memberEmail =
    member?.email != null ? String(member.email).trim().toLowerCase() : '';

  useEffect(() => {
    AsyncStorage.getItem(FROZEN_IDS_KEY)
      .then(raw => {
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setFrozenListingIds(parsed.map(String));
        } catch (_) {}
      })
      .catch(() => {});
  }, []);

  const persistFrozenIds = useCallback(ids => {
    AsyncStorage.setItem(FROZEN_IDS_KEY, JSON.stringify(ids)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!memberSubId) return;
    setError(null);
    try {
      const res = await getListings({
        status: 'published',
        subscription_id: memberSubId,
      });
      setListings(Array.isArray(res?.listings) ? res.listings : []);
    } catch (e) {
      setError(e?.message || 'טעינת המודעות נכשלה');
    }
  }, [memberSubId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (!memberEmail) return;
    let cancelled = false;
    getBoostQuota(memberEmail)
      .then(res => {
        if (cancelled) return;
        setBoostQuota({
          quota: Number(res?.quota ?? 1),
          used: Number(res?.used ?? 0),
          remaining: Number(res?.remaining ?? 1),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [memberEmail]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const visibleListings = useMemo(() => {
    if (tab === 'ads') return listings.filter(l => !isPostListingRecord(l));
    if (tab === 'posts') return listings.filter(l => isPostListingRecord(l));
    return listings;
  }, [listings, tab]);

  const listingOrdinalById = useMemo(
    () => buildOldestFirstOrdinalMap(listings),
    [listings],
  );

  const isFrozen = useCallback(
    listing => {
      const id = listing?.id ?? listing?.ad_number;
      if (id == null) return false;
      const idStr = String(id);
      if (listing?.is_frozen === true || listing?.is_frozen === 'true') {
        return true;
      }
      return frozenListingIds.some(fid => String(fid) === idStr);
    },
    [frozenListingIds],
  );

  const canBoostThisMonth = boostQuota.remaining > 0;

  const openBoostConfirm = listing => {
    if (!canBoostThisMonth) {
      Alert.alert('', 'הגעת למכסת ההקפצות החודשית (הקפצה אחת בחודש).');
      return;
    }
    setBoostConfirmListing(listing);
  };

  const handleConfirmBoost = async () => {
    const listing = boostConfirmListing;
    if (!listing || boostSubmitting) return;
    const listingId = listing.id ?? listing.ad_number;
    if (!listingId || !memberEmail) {
      setBoostConfirmListing(null);
      Alert.alert('', 'לא ניתן להקפיץ כרגע');
      return;
    }
    setBoostSubmitting(true);
    try {
      const res = await boostListing(listingId, memberEmail);
      setBoostQuota({
        quota: Number(res?.quota ?? boostQuota.quota),
        used: Number(res?.used ?? boostQuota.used + 1),
        remaining: Number(
          res?.remaining ?? Math.max(0, boostQuota.remaining - 1),
        ),
      });
      if (res?.boost_expires_at) {
        setBoostedOverrides(prev => ({
          ...prev,
          [String(listingId)]: res.boost_expires_at,
        }));
      }
      setBoostConfirmListing(null);
      Alert.alert('', 'ההקפצה הופעלה! הדירוג הוא "גבוהה" למשך 24 שעות.');
    } catch (e) {
      if (e?.code === 'QUOTA_EXCEEDED') {
        setBoostQuota(prev => ({...prev, remaining: 0}));
      }
      Alert.alert('', e?.message || 'הקפצה נכשלה');
    } finally {
      setBoostSubmitting(false);
    }
  };

  const handleConfirmRemove = async () => {
    const listing = removeConfirmListing;
    if (!listing || removeSubmitting) return;
    const listingId = listing.id ?? listing.ad_number;
    if (!listingId || !memberEmail) {
      Alert.alert('', 'לא ניתן להסיר כרגע');
      return;
    }
    setRemoveSubmitting(true);
    try {
      await deleteListing(listingId, memberEmail, memberSubId);
      const idStr = String(listingId);
      setListings(prev =>
        prev.filter(l => String(l.id ?? l.ad_number) !== idStr),
      );
      setRemoveConfirmListing(null);
    } catch (e) {
      Alert.alert('', e?.message || 'שגיאה בהסרת המודעה');
    } finally {
      setRemoveSubmitting(false);
    }
  };

  const showListingAnalysis =
    canAccessListingAnalysis(currentUser?.subscription_type) &&
    typeof onOpenListingAnalysis === 'function';

  return (
    <View style={[styles.root, {paddingTop: Math.max(insets.top, 12)}]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="חזור"
          hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={26}
            color={Colors.white100}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {memberDisplayName(member)}
        </Text>
        {showListingAnalysis ? (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={onOpenListingAnalysis}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
            accessibilityRole="button"
            accessibilityLabel="ניתוח מודעות">
            <Image
              source={require('../assets/action_icons.png')}
              style={styles.actionImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      <View style={styles.tabsRow}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            activeOpacity={0.85}
            onPress={() => setTab(t.id)}
            style={[styles.tab, tab === t.id && styles.tabActive]}>
            <Text
              style={[styles.tabText, tab === t.id && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!loading && visibleListings.length > 0 ? (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.viewToggle}
            onPress={() =>
              setViewMode(prev => (prev === 'grid' ? 'list' : 'grid'))
            }
            accessibilityRole="button"
            accessibilityLabel={
              viewMode === 'grid' ? 'הצג תצוגה קטנה' : 'הצג תצוגה גדולה'
            }>
            <Image
              source={
                viewMode === 'grid'
                  ? require('../assets/swipereight.png')
                  : require('../assets/swiperleft.png')
              }
              style={styles.viewToggleIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.white100} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {paddingBottom: Math.max(insets.bottom, 24) + 16},
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.white100}
            />
          }>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {!error && visibleListings.length === 0 ? (
            <Text style={styles.emptyText}>אין פריטים להצגה</Text>
          ) : null}

          {visibleListings.map((listing, index) => {
            const post = isPostListingRecord(listing);
            const ordinal =
              listingOrdinalById.get(listingStableKey(listing)) ?? index + 1;
            const frozen = isFrozen(listing);
            const exposure = computeListingExposureLevel(
              listing,
              boostedOverrides,
            );
            return (
              <EditPublishListingCard
                key={listing.id}
                listing={listing}
                ordinal={ordinal}
                ownerUser={member}
                exposure={exposure}
                isFrozen={frozen}
                canBoost={canBoostThisMonth}
                variant={viewMode}
                onPress={() => onViewListing?.(listing)}
                onEdit={() =>
                  post ? onEditPost?.(listing) : onEditListing?.(listing)
                }
                onBoostPress={openBoostConfirm}
                onFreezePress={l =>
                  frozen
                    ? setUnfreezeConfirmListing(l)
                    : setFreezeConfirmListing(l)
                }
                onRemovePress={l => setRemoveConfirmListing(l)}
              />
            );
          })}
        </ScrollView>
      )}

      <Modal
        visible={removeConfirmListing != null}
        transparent
        animationType="fade"
        onRequestClose={() =>
          !removeSubmitting && setRemoveConfirmListing(null)
        }>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !removeSubmitting && setRemoveConfirmListing(null)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>להסיר את המודעה?</Text>
            <Text style={styles.modalMessage}>
              המודעה תימחק לצמיתות מהמערכת.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRemoveConfirmListing(null)}
                disabled={removeSubmitting}>
                <Text style={styles.modalCancelText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  removeSubmitting && styles.actionBtnDisabled,
                ]}
                onPress={handleConfirmRemove}
                disabled={removeSubmitting}>
                {removeSubmitting ? (
                  <ActivityIndicator color="#1E1D27" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>הסרה</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={freezeConfirmListing != null}
        transparent
        animationType="fade"
        onRequestClose={() => setFreezeConfirmListing(null)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFreezeConfirmListing(null)}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons
              name="snowflake"
              size={48}
              color={BORDER_GOLD}
              style={styles.modalIcon}
            />
            <Text style={styles.modalTitle}>הקפיא מודעה?</Text>
            <Text style={styles.modalMessage}>
              המודעה תישאר אצלך אך לא תוצג במערכת. ניתן לבטל הקפאה בהמשך.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setFreezeConfirmListing(null)}>
                <Text style={styles.modalCancelText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmGoldBtn}
                onPress={async () => {
                  const listing = freezeConfirmListing;
                  const id = listing?.id ?? listing?.ad_number;
                  try {
                    if (id != null) {
                      await updateListingFreeze(id, true);
                      const idStr = String(id);
                      setFrozenListingIds(prev => {
                        if (prev.some(fid => String(fid) === idStr)) {
                          return prev;
                        }
                        const next = [...prev, idStr];
                        persistFrozenIds(next);
                        return next;
                      });
                      setListings(prev =>
                        prev.map(l =>
                          String(l.id) === idStr
                            ? {...l, is_frozen: true}
                            : l,
                        ),
                      );
                    }
                  } catch (e) {
                    Alert.alert('', e?.message || 'שגיאה בהקפאת המודעה');
                  }
                  setFreezeConfirmListing(null);
                }}>
                <Text style={styles.modalConfirmGoldText}>כן</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={unfreezeConfirmListing != null}
        transparent
        animationType="fade"
        onRequestClose={() => setUnfreezeConfirmListing(null)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setUnfreezeConfirmListing(null)}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons
              name="snowflake-melt"
              size={48}
              color={BORDER_GOLD}
              style={styles.modalIcon}
            />
            <Text style={styles.modalTitle}>בטל הקפאה?</Text>
            <Text style={styles.modalMessage}>המודעה תוצג שוב במערכת.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setUnfreezeConfirmListing(null)}>
                <Text style={styles.modalCancelText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmGoldBtn}
                onPress={async () => {
                  const listing = unfreezeConfirmListing;
                  const id = listing?.id ?? listing?.ad_number;
                  try {
                    if (id != null) {
                      await updateListingFreeze(id, false);
                      const idStr = String(id);
                      setFrozenListingIds(prev => {
                        const next = prev.filter(fid => String(fid) !== idStr);
                        persistFrozenIds(next);
                        return next;
                      });
                      setListings(prev =>
                        prev.map(l =>
                          String(l.id) === idStr
                            ? {...l, is_frozen: false}
                            : l,
                        ),
                      );
                    }
                  } catch (e) {
                    Alert.alert('', e?.message || 'שגיאה בביטול הקפאה');
                  }
                  setUnfreezeConfirmListing(null);
                }}>
                <Text style={styles.modalConfirmGoldText}>כן</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={boostConfirmListing != null}
        transparent
        animationType="fade"
        onRequestClose={() => !boostSubmitting && setBoostConfirmListing(null)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !boostSubmitting && setBoostConfirmListing(null)}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons
              name="rocket-launch"
              size={48}
              color={BORDER_GOLD}
              style={styles.modalIcon}
            />
            <Text style={styles.modalTitle}>להקפיץ את המודעה?</Text>
            <Text style={styles.modalMessage}>
              המודעה תקבל חשיפה גבוהה למשך 24 שעות.{'\n'}
              {boostQuota.remaining > 0
                ? `נותרה הקפצה אחת החודש (מתוך ${boostQuota.quota}).`
                : 'אין הקפצות נותרות החודש.'}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                disabled={boostSubmitting}
                onPress={() => setBoostConfirmListing(null)}>
                <Text style={styles.modalCancelText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmGoldBtn,
                  (boostSubmitting || boostQuota.remaining <= 0) && {
                    opacity: 0.5,
                  },
                ]}
                disabled={boostSubmitting || boostQuota.remaining <= 0}
                onPress={handleConfirmBoost}>
                {boostSubmitting ? (
                  <ActivityIndicator size="small" color="#1a1926" />
                ) : (
                  <Text style={styles.modalConfirmGoldText}>הקפץ</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: BLUE_100},
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  headerBtn: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionImage: {width: 24, height: 24},
  headerTitle: {
    flex: 1,
    color: Colors.white100,
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  tabsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#2b2a39',
  },
  tabActive: {backgroundColor: '#FFBF3E'},
  tabText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    writingDirection: 'rtl',
  },
  tabTextActive: {color: '#1E1D27', fontFamily: 'Rubik-Medium'},
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  viewToggle: {
    width: 56,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleIcon: {width: '100%', height: '100%'},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  content: {paddingHorizontal: 16, paddingTop: 4},
  errorText: {
    color: '#FFD9D9',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontFamily: 'Rubik-Regular',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    marginTop: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalIcon: {marginBottom: 16},
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Rubik-Medium',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    color: '#D2D0DC',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    writingDirection: 'rtl',
  },
  modalButtons: {flexDirection: 'row', gap: 12, width: '100%'},
  modalCancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {color: '#fff', fontSize: 16},
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: '#c62828',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: {color: '#fff', fontSize: 16, fontFamily: 'Rubik-Medium'},
  modalConfirmGoldBtn: {
    flex: 1,
    backgroundColor: BORDER_GOLD,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmGoldText: {
    color: '#1a1926',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
  actionBtnDisabled: {opacity: 0.45},
});

export default AgencyMemberListingsScreen;
