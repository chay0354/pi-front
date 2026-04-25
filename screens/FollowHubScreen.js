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
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Colors} from '../constants/styles';
import {
  getFollowHubRows,
  getFollowStats,
  respondToFollowRequest,
  sendFollowRequest,
  unfollowUser,
  toSubscriptionId,
} from '../utils/api';

const TAB_REQUESTS = 'requests';
const TAB_FOLLOWERS = 'followers';
const TAB_FOLLOWING = 'following';

const FollowHubScreen = ({
  onClose,
  currentUser = null,
  profileUser = null,
  initialTab = TAB_FOLLOWERS,
}) => {
  const profileId = toSubscriptionId(
    profileUser?.subscription_id || profileUser?.owner_id || profileUser?.id,
  );
  const viewerId = toSubscriptionId(currentUser?.id);
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
    return isOwnProfile
      ? [{id: TAB_REQUESTS, label: 'הצעות'}, ...base]
      : base;
  }, [isOwnProfile]);

  const safeInitialTab = useMemo(() => {
    if (initialTab === TAB_REQUESTS && !isOwnProfile) return TAB_FOLLOWERS;
    return tabs.some(t => t.id === initialTab) ? initialTab : tabs[0]?.id || TAB_FOLLOWERS;
  }, [initialTab, isOwnProfile, tabs]);

  const [activeTab, setActiveTab] = useState(safeInitialTab);
  const [search, setSearch] = useState('');
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
        q: search,
      });
      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (e) {
      Alert.alert('', e?.message || 'שגיאה בטעינת הרשימה');
    } finally {
      setLoadingRows(false);
    }
  }, [profileId, viewerId, activeTab, search]);

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
        await loadRows();
        await loadCounts();
      } catch (e) {
        Alert.alert('', e?.message || 'לא הצלחנו לשלוח בקשת מעקב');
      } finally {
        setActioningId(null);
      }
    },
    [viewerId, loadRows, loadCounts],
  );

  const handleAcceptRequest = useCallback(
    async row => {
      if (!viewerId || !row?.request_id) return;
      setActioningId(row.id || row.request_id);
      try {
        await respondToFollowRequest(row.request_id, viewerId, 'accept');
        await loadRows();
        await loadCounts();
      } catch (e) {
        Alert.alert('', e?.message || 'לא הצלחנו לאשר את הבקשה');
      } finally {
        setActioningId(null);
      }
    },
    [viewerId, loadRows, loadCounts],
  );

  const handleUnfollow = useCallback(
    row => {
      if (!viewerId || !row?.id || actioningId === row.id) return;
      setConfirmUnfollowRow(row);
    },
    [viewerId, actioningId, loadRows, loadCounts],
  );

  const confirmUnfollow = useCallback(async () => {
    const row = confirmUnfollowRow;
    if (!row?.id || !viewerId) return;
    setConfirmUnfollowRow(null);
    setActioningId(row.id);
    try {
      await unfollowUser(viewerId, row.id);
      await loadRows();
      await loadCounts();
    } catch (e) {
      Alert.alert('', e?.message || 'לא הצלחנו לבטל מעקב');
    } finally {
      setActioningId(null);
    }
  }, [confirmUnfollowRow, viewerId, loadRows, loadCounts]);

  const renderActionButton = row => {
    const busy = actioningId === row?.id;
    if (activeTab === TAB_REQUESTS && isOwnProfile) {
      return (
        <TouchableOpacity
          onPress={() => handleAcceptRequest(row)}
          style={styles.rowActionBtn}
          disabled={busy}>
          <Text style={styles.rowActionText}>{busy ? '...' : 'אשר'}</Text>
        </TouchableOpacity>
      );
    }

    if (row?.is_self) return <View style={styles.rowActionPlaceholder} />;
    if (row?.is_following_by_viewer) {
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
        <View style={[styles.rowActionBtn, styles.rowActionBtnDisabled]}>
          <Text style={styles.rowActionText}>נשלח</Text>
        </View>
      );
    }
    return (
      <TouchableOpacity onPress={() => handleFollow(row)} style={styles.rowActionBtn} disabled={busy}>
        <Text style={styles.rowActionText}>{busy ? '...' : 'עקוב'}</Text>
      </TouchableOpacity>
    );
  };

  const formatViewerAvg = value => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    if (Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n));
    return n.toFixed(1);
  };

  const labelWithCount = tabId => {
    if (tabId === TAB_REQUESTS) return `הצעות ${counts.pending_requests}`;
    if (tabId === TAB_FOLLOWERS) return `עוקבים ${counts.followers}`;
    return `עוקב ${counts.following}`;
  };

  return (
    <View style={styles.root}>
      <View style={styles.headerWrap}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
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
                <Text style={[styles.tabText, selected && styles.tabTextSelected]}>
                  {labelWithCount(tab.id)}
                </Text>
                {selected ? <View style={styles.tabLine} /> : <View style={styles.tabLinePlaceholder} />}
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

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {loadingRows ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color="#FFC40A" />
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>אין נתונים להצגה</Text>
          </View>
        ) : (
          rows.map(row => (
            <View key={`${activeTab}-${row.id}`} style={styles.row}>
              {renderActionButton(row)}
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{row.name}</Text>
                <View style={styles.rowMetaRow}>
                  {row?.viewer_rating_avg != null ? (
                    <View style={styles.rowRatingWrap}>
                      <Text style={styles.rowRatingValue}>
                        {formatViewerAvg(row.viewer_rating_avg)}
                      </Text>
                      <MaterialCommunityIcons
                        name="star"
                        size={16}
                        color="#FFC40A"
                        style={styles.rowRatingStar}
                      />
                    </View>
                  ) : null}
                  <Text style={styles.rowSub}>{row.subtitle}</Text>
                </View>
              </View>
              <View style={styles.avatarRing}>
                {row.image_url ? (
                  <Image source={{uri: row.image_url}} style={styles.avatar} resizeMode="cover" />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <MaterialCommunityIcons name="account" size={18} color="rgba(255,255,255,0.6)" />
                  </View>
                )}
              </View>
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
            <Text style={styles.confirmTitle}>ביטול מעקב</Text>
            <Text style={styles.confirmText}>
              {`להפסיק לעקוב אחרי ${confirmUnfollowRow?.name || 'המשתמש'}?`}
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
                <Text style={styles.confirmBtnText}>הפסק מעקב</Text>
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
    paddingTop: 12,
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
    textAlign: 'right',
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
  rowActionBtn: {
    backgroundColor: '#4d4966',
    borderRadius: 846,
    minWidth: 58,
    height: 30,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowActionBtnDisabled: {
    opacity: 0.7,
  },
  rowActionBtnFollowing: {
    opacity: 1,
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
  rowInfo: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginHorizontal: 10,
    gap: 6,
  },
  rowName: {
    color: '#F7F3E6',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Rubik-Medium',
    textAlign: 'right',
  },
  rowSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    letterSpacing: 0.14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  rowMetaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-end',
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
    textAlign: 'right',
  },
  rowRatingStar: {
    marginTop: 1,
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
