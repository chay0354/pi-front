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
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors} from '../constants/styles';
import {getListings} from '../utils/api';
import ListingGridCardFigma from '../components/ListingGridCardFigma';
import {brokerPiRatingFromListing} from '../utils/listingGridCardFigma';
import {canAccessListingAnalysis, isOpenHouseListing} from '../utils/constant';
import {agencyMemberDisplayName} from '../utils/agencyMemberDisplay';
import {hebrewTextAlign} from '../utils/rtlLayout';

const BLUE_100 = '#1e1d27';

const TABS = [
  {id: 'all', label: 'הכל'},
  {id: 'ads', label: 'מודעות'},
  {id: 'posts', label: 'פוסטים'},
];

/** Same rule as EditPublishAdScreen: feed posts are ads flagged `feed_post`. */
const isPostRecord = item => {
  if (!item) return false;
  if (
    item.feed_post === true ||
    item.feed_post === 'true' ||
    item.feed_post === 't' ||
    item.feedPost === true
  ) {
    return true;
  }
  if (isOpenHouseListing(item)) return true;
  const desc = String(item.description || item.desc || '').trim();
  return desc === 'פוסט';
};

const memberDisplayName = agencyMemberDisplayName;

/**
 * A marketing manager's read/edit view of one team member's ads and posts.
 * Rows reuse the TikTok list card; each row offers view (ad profile) or edit.
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

  const memberSubId = member?.id != null ? String(member.id).trim() : '';

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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const visibleListings = useMemo(() => {
    if (tab === 'ads') return listings.filter(l => !isPostRecord(l));
    if (tab === 'posts') return listings.filter(l => isPostRecord(l));
    return listings;
  }, [listings, tab]);

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

          {visibleListings.map(listing => {
            const isPost = isPostRecord(listing);
            return (
              <View key={listing.id} style={styles.itemWrap}>
                <ListingGridCardFigma
                  listing={listing}
                  displayPi={brokerPiRatingFromListing(listing)}
                  onPress={() => onViewListing?.(listing)}
                />
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.actionBtn}
                    onPress={() => onViewListing?.(listing)}>
                    <MaterialCommunityIcons
                      name="eye-outline"
                      size={18}
                      color="#1E1D27"
                    />
                    <Text style={styles.actionText}>
                      {isPost ? 'צפייה בפוסט' : 'צפייה במודעה'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[styles.actionBtn, styles.actionBtnSecondary]}
                    onPress={() =>
                      isPost
                        ? onEditPost?.(listing)
                        : onEditListing?.(listing)
                    }>
                    <MaterialCommunityIcons
                      name="pencil-outline"
                      size={18}
                      color={Colors.white100}
                    />
                    <Text
                      style={[styles.actionText, styles.actionTextSecondary]}>
                      עריכה
                    </Text>
                  </TouchableOpacity>
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
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  content: {paddingHorizontal: 16},
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
  itemWrap: {marginBottom: 18},
  actionsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFBF3E',
  },
  actionBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  actionText: {
    color: '#1E1D27',
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    writingDirection: 'rtl',
  },
  actionTextSecondary: {color: Colors.white100},
});

export default AgencyMemberListingsScreen;
