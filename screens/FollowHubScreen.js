import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  I18nManager,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {flexStart} from '../index';

import {
  getFollowHubRows,
  getFollowStats,
  respondToFollowRequest,
  sendFollowRequest,
  cancelFollowRequest,
  unfollowUser,
  toSubscriptionId,
} from '../utils/api';

const TAB_REQUESTS = 'requests';
const TAB_FOLLOWERS = 'followers';
const TAB_FOLLOWING = 'following';

/** Same art as TikTokFeedScreen user-search rating row. */
const RATING_STAR_ONE_TO_FOUR = require('../assets/tiktok/1-4hurt.png');
const RATING_STAR_FIVE = require('../assets/tiktok/5stars.png');

/** Figma node 8:86865 — gold pill (עקוב / primary). */
const GOLD_CTA = ['#FEE787', '#BD9947', '#9C6522'];
const GOLD_CTA_LOCS = [0.0456, 0.5076, 0.8831];
const GOLD_TEXT = '#1E1D27';

const GoldPillButton = ({
  onPress,
  disabled,
  minWidth = 58,
  style,
  textStyle,
  label,
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.85}
    style={[
      {minWidth, borderRadius: 1000, overflow: 'hidden', alignSelf: 'center'},
      style,
    ]}>
    <LinearGradient
      colors={GOLD_CTA}
      locations={GOLD_CTA_LOCS}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={{
        minHeight: 30,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={textStyle} numberOfLines={1}>
        {label}
      </Text>
    </LinearGradient>
  </TouchableOpacity>
);

const FollowHubScreen = ({
  onClose,
  currentUser = null,
  profileUser = null,
  initialTab = TAB_FOLLOWERS,
  onOpenUserProfile = null,
}) => {
  const insets = useSafeAreaInsets();
  const profileId = toSubscriptionId(
    profileUser?.subscription_id || profileUser?.owner_id || profileUser?.id,
  );
  const viewerId = toSubscriptionId(
    currentUser?.subscription_id || currentUser?.owner_id || currentUser?.id,
  );
  const isOwnProfile = !!profileId && !!viewerId && profileId === viewerId;
  const displayName =
    profileUser?.creator_name ||
    profileUser?.name ||
    profileUser?.agent_name ||
    profileUser?.contact_person_name ||
    profileUser?.business_name ||
    profileUser?.broker_office_name ||
    '';

  const tabs = useMemo(() => {
    const base = [
      {id: TAB_FOLLOWERS, label: 'עוקבים'},
      {id: TAB_FOLLOWING, label: 'עוקב'},
    ];
    return isOwnProfile ? [{id: TAB_REQUESTS, label: 'הצעות'}, ...base] : base;
  }, [isOwnProfile]);

  const safeInitialTab = useMemo(() => {
    if (initialTab === TAB_REQUESTS && !isOwnProfile) return TAB_FOLLOWERS;
    return tabs.some(t => t.id === initialTab)
      ? initialTab
      : tabs[0]?.id || TAB_FOLLOWERS;
  }, [initialTab, isOwnProfile, tabs]);

  const [activeTab, setActiveTab] = useState(safeInitialTab);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [actioningId, setActioningId] = useState(null);
  const [confirmUnfollowRow, setConfirmUnfollowRow] = useState(null);
  const [counts, setCounts] = useState({
    likes: 0,
    followers: 0,
    following: 0,
    pending_requests: 0,
  });

  useEffect(() => {
    setActiveTab(safeInitialTab);
  }, [safeInitialTab]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 320);
    return () => clearTimeout(t);
  }, [search]);

  const loadCounts = useCallback(async () => {
    if (!profileId) return;
    try {
      const data = await getFollowStats(profileId);
      setCounts({
        likes: Number(data?.stats?.likes || 0),
        followers: Number(data?.stats?.followers || 0),
        following: Number(data?.stats?.following || 0),
        pending_requests: Number(data?.stats?.pending_requests || 0),
      });
    } catch (_) {}
  }, [profileId]);

  const loadRows = useCallback(async () => {
    if (!profileId) return;
    setLoadingRows(true);
    try {
      const data = await getFollowHubRows({
        userId: profileId,
        viewerId,
        tab: activeTab,
        q: debouncedSearch,
      });
      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (e) {
      Alert.alert('', e?.message || 'שגיאה בטעינת הרשימה');
    } finally {
      setLoadingRows(false);
    }
  }, [profileId, viewerId, activeTab, debouncedSearch]);

  /** Keep tab label counts in sync with the list after any follow action (parallel + no cached stats). */
  const refreshRowsAndCounts = useCallback(async () => {
    await Promise.all([loadRows(), loadCounts()]);
  }, [loadRows, loadCounts]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const handleFollow = useCallback(
    async row => {
      if (!viewerId || !row?.id || row?.is_self) return;
      setActioningId(row.id);
      try {
        await sendFollowRequest(viewerId, row.id);
        await refreshRowsAndCounts();
      } catch (e) {
        Alert.alert('', e?.message || 'לא הצלחנו לשלוח בקשת מעקב');
      } finally {
        setActioningId(null);
      }
    },
    [viewerId, refreshRowsAndCounts],
  );

  const handleAcceptRequest = useCallback(
    async row => {
      if (!viewerId || !row?.request_id) return;
      setActioningId(row.id || row.request_id);
      try {
        await respondToFollowRequest(row.request_id, viewerId, 'accept');
        await refreshRowsAndCounts();
      } catch (e) {
        Alert.alert('', e?.message || 'לא הצלחנו לאשר את הבקשה');
      } finally {
        setActioningId(null);
      }
    },
    [viewerId, refreshRowsAndCounts],
  );

  const handleRejectRequest = useCallback(
    async row => {
      if (!viewerId || !row?.request_id) return;
      setActioningId(row.id || row.request_id);
      try {
        await respondToFollowRequest(row.request_id, viewerId, 'reject');
        await refreshRowsAndCounts();
      } catch (e) {
        Alert.alert('', e?.message || 'לא הצלחנו לדחות את הבקשה');
      } finally {
        setActioningId(null);
      }
    },
    [viewerId, refreshRowsAndCounts],
  );

  const handleCancelOutgoingRequest = useCallback(
    async row => {
      if (!viewerId || !row?.id || row?.is_self) return;
      setActioningId(row.id);
      try {
        await cancelFollowRequest(viewerId, row.id);
        await refreshRowsAndCounts();
      } catch (e) {
        Alert.alert('', e?.message || 'לא הצלחנו לבטל את בקשת המעקב');
      } finally {
        setActioningId(null);
      }
    },
    [viewerId, refreshRowsAndCounts],
  );

  const handleUnfollow = useCallback(
    row => {
      if (!viewerId || !row?.id || actioningId === row.id) return;
      setConfirmUnfollowRow({...row, _action: 'unfollow'});
    },
    [viewerId, actioningId],
  );

  /** On own "followers" tab: remove the row user's follow of this profile (they stop following you). */
  const handleRemoveFollower = useCallback(
    row => {
      if (!isOwnProfile || !profileId || !row?.id || actioningId === row.id)
        return;
      setConfirmUnfollowRow({...row, _action: 'removeFollower'});
    },
    [isOwnProfile, profileId, actioningId],
  );

  const confirmUnfollow = useCallback(async () => {
    const row = confirmUnfollowRow;
    if (!row?.id) return;
    const isRemoveFollower = row?._action === 'removeFollower';
    if (isRemoveFollower) {
      if (!profileId) return;
    } else if (!viewerId) {
      return;
    }
    setConfirmUnfollowRow(null);
    setActioningId(row.id);
    try {
      if (isRemoveFollower) {
        await unfollowUser(row.id, profileId);
      } else {
        await unfollowUser(viewerId, row.id);
      }
      await refreshRowsAndCounts();
    } catch (e) {
      Alert.alert(
        '',
        e?.message ||
          (isRemoveFollower
            ? 'לא הצלחנו להסיר את המעקב'
            : 'לא הצלחנו לבטל מעקב'),
      );
    } finally {
      setActioningId(null);
    }
  }, [confirmUnfollowRow, viewerId, profileId, refreshRowsAndCounts]);

  /**
   * Full-row gold + gold "עוקב" only for reciprocal follow, own hub, no pending.
   * Followers: must actually follow the row user back (API flag can be wrong; never gold otherwise).
   * Following: you already follow; is_mutual means they also follow you.
   */
  const isMutualGoldRow = row => {
    if (!isOwnProfile) return false;
    if (activeTab !== TAB_FOLLOWERS && activeTab !== TAB_FOLLOWING)
      return false;
    if (row?.is_mutual_follow !== true) return false;
    if (!row?.is_following_by_viewer) return false;
    if (row?.has_pending_request_by_viewer) return false;
    if (row?.outgoing_follow_pending) return false;
    return true;
  };

  const renderActionButton = row => {
    const busy = actioningId === row?.id;
    if (activeTab === TAB_REQUESTS && isOwnProfile) {
      return (
        <View style={styles.rowActionCluster}>
          <TouchableOpacity
            onPress={() => handleRejectRequest(row)}
            disabled={busy}
            style={[styles.rowActionBtn, styles.rowActionBtnGhost]}
            activeOpacity={0.8}>
            <Text style={styles.rowActionText}>{busy ? '...' : 'דחה'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleAcceptRequest(row)}
            disabled={busy}
            style={[styles.rowActionBtn, styles.rowActionBtnFollowing]}
            activeOpacity={0.8}>
            <Text style={styles.rowActionText}>{busy ? '...' : 'אשר'}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (row?.is_self) {
      return <View style={styles.rowActionPlaceholder} />;
    }

    /** Own hub only — "עוקבים": only X to remove this user from your followers. */
    if (isOwnProfile && activeTab === TAB_FOLLOWERS) {
      return (
        <TouchableOpacity
          onPress={() => handleRemoveFollower(row)}
          disabled={busy}
          style={styles.rowActionXBtn}
          activeOpacity={0.8}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <MaterialCommunityIcons
            name="close"
            size={18}
            color="rgba(255,255,255,0.92)"
          />
        </TouchableOpacity>
      );
    }

    /**
     * Own hub only — "עוקב": if request still pending, ממתין לאישור + X to cancel;
     * if they accepted and you follow, only X (unfollow). Otherwise עקוב.
     */
    if (isOwnProfile && activeTab === TAB_FOLLOWING) {
      if (row?.has_pending_request_by_viewer) {
        return (
          <View style={styles.rowActionClusterEnd}>
            <View
              style={[
                styles.rowActionBtn,
                styles.rowActionBtnDisabled,
                styles.rowActionBtnPendingWide,
              ]}>
              <Text style={styles.rowActionTextPending} numberOfLines={1}>
                ממתין לאישור
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleCancelOutgoingRequest(row)}
              disabled={busy}
              style={styles.rowActionXBtn}
              activeOpacity={0.8}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <MaterialCommunityIcons
                name="close"
                size={18}
                color="rgba(255,255,255,0.92)"
              />
            </TouchableOpacity>
          </View>
        );
      }
      if (row?.is_following_by_viewer) {
        return (
          <TouchableOpacity
            onPress={() => handleUnfollow(row)}
            disabled={busy}
            style={styles.rowActionXBtn}
            activeOpacity={0.8}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <MaterialCommunityIcons
              name="close"
              size={18}
              color="rgba(255,255,255,0.92)"
            />
          </TouchableOpacity>
        );
      }
      return (
        <GoldPillButton
          onPress={() => handleFollow(row)}
          disabled={busy}
          minWidth={64}
          label={busy ? '...' : 'עקוב'}
          textStyle={styles.goldCtaText}
        />
      );
    }

    if (row?.is_following_by_viewer) {
      if (isMutualGoldRow(row)) {
        return (
          <GoldPillButton
            onPress={() => handleUnfollow(row)}
            disabled={busy}
            minWidth={64}
            label={busy ? '...' : 'עוקב'}
            textStyle={styles.goldCtaText}
          />
        );
      }
      return (
        <TouchableOpacity
          onPress={() => handleUnfollow(row)}
          style={[styles.rowActionBtn, styles.rowActionBtnFollowing]}
          disabled={busy}
          activeOpacity={0.8}>
          <Text style={styles.rowActionText}>{busy ? '...' : 'עוקב'}</Text>
        </TouchableOpacity>
      );
    }
    if (row?.has_pending_request_by_viewer) {
      return (
        <View
          style={[
            styles.rowActionBtn,
            styles.rowActionBtnDisabled,
            styles.rowActionBtnPendingWide,
          ]}>
          <Text style={styles.rowActionTextPending} numberOfLines={1}>
            ממתין לאישור
          </Text>
        </View>
      );
    }
    return (
      <GoldPillButton
        onPress={() => handleFollow(row)}
        disabled={busy}
        minWidth={64}
        label={busy ? '...' : 'עקוב'}
        textStyle={styles.goldCtaText}
      />
    );
  };

  const formatViewerAvg = value => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    return String(Math.round(n));
  };

  const labelWithCount = tabId => {
    if (tabId === TAB_REQUESTS) return `הצעות ${counts.pending_requests}`;
    if (tabId === TAB_FOLLOWERS) return `עוקבים ${counts.followers}`;
    return `עוקב ${counts.following}`;
  };

  /** On someone else's hub, don't list people where your follow is still pending (ממתין לאישור). */
  const displayRows = useMemo(() => {
    if (isOwnProfile) return rows;
    return (rows || []).filter(r => !r?.has_pending_request_by_viewer);
  }, [rows, isOwnProfile]);

  return (
    <View style={styles.root}>
      <View style={[styles.headerWrap, {paddingTop: insets.top + 12}]}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={28}
              color="#fff"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{displayName || 'פרופיל'}</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.tabsRow}>
          {tabs.map(tab => {
            const selected = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={styles.tabTouch}>
                <Text
                  style={[styles.tabText, selected && styles.tabTextSelected]}>
                  {labelWithCount(tab.id)}
                </Text>
                {selected ? (
                  <View style={styles.tabLine} />
                ) : (
                  <View style={styles.tabLinePlaceholder} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          placeholder="חפש"
          placeholderTextColor="rgba(255,255,255,0.35)"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
        <MaterialCommunityIcons
          name="magnify"
          size={22}
          color="#8C85B3"
          style={styles.searchIcon}
        />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        contentContainerStyle={styles.listContent}>
        {loadingRows ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color="#FFC40A" />
          </View>
        ) : displayRows.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>אין נתונים להצגה</Text>
          </View>
        ) : (
          displayRows.map(row => (
            <View
              key={`${activeTab}-${row.id}`}
              style={[
                styles.row,
                isMutualGoldRow(row) ? styles.rowMutual : null,
              ]}>
              {renderActionButton(row)}
              <TouchableOpacity
                style={styles.rowBodyPress}
                activeOpacity={0.85}
                disabled={!onOpenUserProfile || row.is_self}
                onPress={() => onOpenUserProfile && onOpenUserProfile(row)}>
                <View style={styles.rowInfo}>
                  <Text
                    style={[
                      styles.rowName,
                      isMutualGoldRow(row) ? styles.rowNameMutual : null,
                    ]}>
                    {row.name}
                  </Text>
                  <View style={styles.rowMetaRow}>
                    {row?.viewer_rating_avg != null ? (
                      <View style={styles.rowRatingWrap}>
                        <Text style={styles.rowRatingValue}>
                          {formatViewerAvg(row.viewer_rating_avg)}
                        </Text>
                        {Math.round(Number(row.viewer_rating_avg)) >= 5 ? (
                          <View
                            style={styles.rowRatingFiveStarWrap}
                            pointerEvents="none">
                            <Image
                              source={RATING_STAR_FIVE}
                              style={styles.rowRatingFiveStarImage}
                              resizeMode="contain"
                            />
                          </View>
                        ) : (
                          <Image
                            source={RATING_STAR_ONE_TO_FOUR}
                            style={styles.rowRatingStarIcon}
                            resizeMode="contain"
                          />
                        )}
                      </View>
                    ) : null}
                    <Text style={styles.rowSub}>{row.subtitle}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.avatarRing,
                    isMutualGoldRow(row) ? styles.avatarRingMutual : null,
                  ]}>
                  {row.image_url ? (
                    <Image
                      source={{uri: row.image_url}}
                      style={styles.avatar}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <MaterialCommunityIcons
                        name="account"
                        size={18}
                        color="rgba(255,255,255,0.6)"
                      />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={!!confirmUnfollowRow}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmUnfollowRow(null)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>
              {confirmUnfollowRow?._action === 'removeFollower'
                ? 'הסרת עוקב'
                : 'ביטול מעקב'}
            </Text>
            <Text style={styles.confirmText}>
              {confirmUnfollowRow?._action === 'removeFollower'
                ? `להסיר את ${confirmUnfollowRow?.name || 'המשתמש'} מרשימת העוקבים?`
                : `להפסיק לעקוב אחרי ${confirmUnfollowRow?.name || 'המשתמש'}?`}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmBtnCancel]}
                onPress={() => setConfirmUnfollowRow(null)}
                activeOpacity={0.8}>
                <Text style={styles.confirmBtnText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmBtnDanger]}
                onPress={confirmUnfollow}
                activeOpacity={0.8}>
                <Text style={styles.confirmBtnText}>
                  {confirmUnfollowRow?._action === 'removeFollower'
                    ? 'הסר'
                    : 'הפסק מעקב'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#2b2a39',
  },
  headerWrap: {
    backgroundColor: '#1e1d27',
    borderBottomWidth: 1,
    borderBottomColor: '#373548',
    paddingBottom: 8,
    paddingHorizontal: 24,
  },
  topRow: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backBtn: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
  },
  tabsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 24,
  },
  tabTouch: {
    width: 104,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 27,
  },
  tabText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
  },
  tabTextSelected: {
    color: '#FFC40A',
  },
  tabLine: {
    marginTop: 10,
    width: 80,
    height: 2,
    borderRadius: 24,
    backgroundColor: '#FFC40A',
  },
  tabLinePlaceholder: {
    marginTop: 10,
    width: 80,
    height: 2,
    opacity: 0,
  },
  searchWrap: {
    marginTop: 10,
    marginHorizontal: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: '#8C85B3',
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    paddingVertical: 10,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  searchIcon: {
    marginRight: 8,
  },
  list: {
    flex: 1,
    marginTop: 10,
  },
  listContent: {
    paddingBottom: 24,
  },
  row: {
    height: 83,
    borderBottomWidth: 1,
    borderBottomColor: '#373548',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2b2a39',
  },
  rowBodyPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  rowMutual: {
    backgroundColor: 'rgba(254, 231, 135, 0.06)',
  },
  rowActionBtn: {
    backgroundColor: '#4d4966',
    borderRadius: 1000,
    minWidth: 58,
    height: 30,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldCtaText: {
    color: GOLD_TEXT,
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.5447,
    fontFamily: 'Rubik-Medium',
  },
  rowActionBtnDisabled: {
    opacity: 0.7,
  },
  rowActionBtnPendingWide: {
    minWidth: 118,
    maxWidth: 140,
    paddingHorizontal: 8,
    minHeight: 30,
  },
  rowActionTextPending: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
  },
  rowActionBtnFollowing: {
    opacity: 1,
  },
  rowActionBtnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  rowActionText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.54,
    fontFamily: 'Rubik-Regular',
  },
  rowActionPlaceholder: {
    minWidth: 58,
    height: 30,
  },
  rowActionCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 280,
  },
  /** Main pill first, X to the right (e.g. cancel request next to remove). */
  rowActionClusterEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 220,
  },
  rowActionXBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowActionFollowBackBtn: {
    minWidth: 100,
    maxWidth: 152,
    paddingHorizontal: 8,
  },
  rowActionTextFollowBack: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Regular',
  },
  rowInfo: {
    flex: 1,
    alignItems: flexStart,
    justifyContent: 'center',
    marginHorizontal: 10,
    gap: 6,
  },
  rowName: {
    color: '#F7F3E6',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Rubik-Medium',
    textAlign: 'left',
  },
  rowNameMutual: {
    color: '#FEE787',
  },
  rowSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    letterSpacing: 0.14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
  },
  rowMetaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 10,
  },
  rowRatingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowRatingValue: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    letterSpacing: 0.14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
  },
  rowRatingStarIcon: {
    width: 16,
    height: 16,
  },
  rowRatingFiveStarWrap: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  rowRatingFiveStarImage: {
    width: 40,
    height: 40,
  },
  avatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#FFC40A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRingMutual: {
    borderWidth: 3,
    borderColor: '#FEE787',
    shadowColor: '#FEE787',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 4,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderWrap: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingTop: 48,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,10,18,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#2b2a39',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#373548',
    padding: 18,
  },
  confirmTitle: {
    color: '#F7F3E6',
    fontSize: 20,
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
    marginBottom: 10,
  },
  confirmText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmBtn: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnCancel: {
    backgroundColor: '#4d4966',
  },
  confirmBtnDanger: {
    backgroundColor: '#8d2c3c',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
  },
});

export default FollowHubScreen;
