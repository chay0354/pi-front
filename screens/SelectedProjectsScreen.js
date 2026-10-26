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
  Dimensions,
  SafeAreaView,
  Platform,
  I18nManager,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, BorderRadius, FontSizes} from '../constants/styles';
import {getCompaniesDirectory, getListings} from '../utils/api';
import {flexEnd} from '../utils/rtlLayout';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const H_PAD = 20;
const GAP = 12;
const COLS = 3;
const CELL_W = (SCREEN_WIDTH - H_PAD * 2 - GAP * (COLS - 1)) / COLS;
/** Logo circles slightly smaller than the cell width so the grid breathes. */
const LOGO_DIAMETER = CELL_W * 0.86;
const SEARCH_ACCENT = 'rgba(140, 133, 179, 1)';
const SEARCH_BORDER = SEARCH_ACCENT;
const SEARCH_ICON_MUTED = SEARCH_ACCENT;

const isPostListingRecord = item => {
  if (!item) return false;
  const type = String(
    item.propertyType ||
      item.property_type ||
      item.propertyTypeRaw ||
      item.apartmentTypeId ||
      '',
  ).toLowerCase();
  const description = String(item.description || item.desc || '').trim();
  const descLower = description.toLowerCase();
  if (
    type === 'post' ||
    type === 'posts' ||
    type === 'feed_post' ||
    type.includes('post') ||
    descLower === 'post' ||
    descLower.includes('פוסט') ||
    descLower.includes('post') ||
    item.feed_post === true ||
    item.feed_post === 'true' ||
    item.feed_post === 't' ||
    item.isPostEntry === true
  ) {
    return true;
  }
  return false;
};

/** Lowercase, drop Hebrew/Latin quote marks and dashes so «ג'בל» / «ג׳בל» and «מ"ד» / «מ״ד» match. */
const normalizeSearchText = value =>
  String(value || '')
    .toLowerCase()
    .replace(/["'`׳״’“”]/g, '')
    .replace(/[-–—_,.()/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Published company projects (feed posts excluded), grouped by subscription id. */
const buildPublishedProjectsBySubscription = listings => {
  const bySub = {};
  (listings || []).forEach(listing => {
    if (!listing || isPostListingRecord(listing)) return;
    const sid = listing.subscription_id || listing.subscriptionId;
    if (!sid) return;
    const key = String(sid);
    const name = String(listing.project_name || '').trim();
    const address = String(
      listing.address || listing.search_address || listing.city || '',
    ).trim();
    if (!bySub[key]) bySub[key] = [];
    bySub[key].push({
      name,
      nameKey: normalizeSearchText(name),
      addressKey: normalizeSearchText(address),
    });
  });
  return bySub;
};

const tokensMatch = (haystack, tokens) =>
  tokens.every(t => haystack.includes(t));

const topSectionElevation = Platform.select({
  web: {
    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.28)',
  },
  android: {
    elevation: 4,
  },
  ios: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  default: {},
});

const SelectedProjectsScreen = ({onClose, onOpenCompany}) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dirRes, listingsRes] = await Promise.all([
        getCompaniesDirectory(),
        getListings({
          status: 'published',
          subscription_type: 'company',
        }).catch(() => null),
      ]);
      const companiesList = Array.isArray(dirRes?.companies)
        ? dirRes.companies
        : [];
      const listingsOk =
        listingsRes?.success && Array.isArray(listingsRes.listings);
      const projectsBySub = listingsOk
        ? buildPublishedProjectsBySubscription(listingsRes.listings)
        : null;
      // Prefer live published-project counts so posts / drafts are not included.
      setCompanies(
        companiesList.map(c => {
          const key = c?.id != null ? String(c.id) : '';
          const projects = projectsBySub?.[key] || [];
          const projectCount =
            projectsBySub != null
              ? projects.length
              : Number(c.project_count) || 0;
          return {
            ...c,
            project_count: projectCount,
            searchProjects: projects,
            searchNameKey: normalizeSearchText(c.name),
            searchAddressKey: normalizeSearchText(c.address_hint),
          };
        }),
      );
    } catch (e) {
      setError(e.message || 'טעינה נכשלה');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Project name first, then company name, then project location; the office
   * address only counts when nothing better matched. Every query word must match.
   */
  const filtered = useMemo(() => {
    const q = normalizeSearchText(query);
    if (!q) return companies;
    const tokens = q.split(' ');
    const ranked = [];
    companies.forEach((c, index) => {
      const projects = c.searchProjects || [];
      const byProjectName = projects.filter(p => tokensMatch(p.nameKey, tokens));
      const byProjectPlace = projects.filter(
        p => tokensMatch(`${p.nameKey} ${p.addressKey}`, tokens),
      );
      let rank = -1;
      if (byProjectName.length) rank = 0;
      else if (tokensMatch(c.searchNameKey, tokens)) rank = 1;
      else if (byProjectPlace.length) rank = 2;
      else if (tokensMatch(c.searchAddressKey, tokens)) rank = 3;
      if (rank < 0) return;
      ranked.push({rank, index, company: c});
    });
    ranked.sort((a, b) => a.rank - b.rank || a.index - b.index);
    return ranked.map(r => r.company);
  }, [companies, query]);

  const rows = useMemo(() => {
    const out = [];
    for (let i = 0; i < filtered.length; i += COLS) {
      out.push(filtered.slice(i, i + COLS));
    }
    return out;
  }, [filtered]);

  return (
    <View style={styles.safe}>
      <View
        style={[
          styles.topSection,
          topSectionElevation,
          {paddingTop: insets.top},
        ]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.backBtn}
            hitSlop={12}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={28}
              color={Colors.white100}
            />
          </TouchableOpacity>
          <Text style={styles.title}>פרויקטים נבחרים</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="חפש לפי שם פרויקט / חברה / עיר"
            placeholderTextColor={Colors.grey200}
            value={query}
            onChangeText={setQuery}
            textAlign={'right'}
          />
          <MaterialCommunityIcons
            name="magnify"
            size={22}
            color={SEARCH_ICON_MUTED}
            style={styles.searchIcon}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.yellowIcons} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>נסה שוב</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <Text style={styles.empty}>
              {query.trim() ? 'לא נמצאו פרויקטים או חברות' : 'לא נמצאו חברות'}
            </Text>
          ) : (
            rows.map((row, ri) => (
              <View key={`row-${ri}`} style={styles.row}>
                {row.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.cell, {width: CELL_W}]}
                    activeOpacity={0.85}
                    onPress={() => onOpenCompany?.(c)}>
                    <View style={styles.logoClip}>
                      {c.logo_url ? (
                        <Image
                          source={{uri: c.logo_url}}
                          style={styles.logoImg}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.logoPlaceholder}>
                          <Text style={styles.logoLetter} numberOfLines={1}>
                            {(c.name || '?').charAt(0)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.companyName} numberOfLines={2}>
                      {c.name}
                    </Text>
                    <Text style={styles.projectCount}>
                      {c.project_count} פרויקטים
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.blue100,
    maxWidth: 414,
    alignSelf: 'center',
    width: '100%',
  },
  topSection: {
    backgroundColor: Colors.blue100,
    paddingHorizontal: H_PAD,
    paddingBottom: 16,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: flexEnd,
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: Colors.white100,
    fontSize: FontSizes.fs18,
    fontWeight: '600',
  },
  searchWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: BorderRadius.roundCornerFull,
    borderWidth: 1,
    borderColor: SEARCH_BORDER,
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    color: Colors.white100,
    fontSize: 15,
    paddingVertical: 10,
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  searchIcon: {
    marginRight: 8,
  },
  scroll: {
    flex: 1,
    backgroundColor: 'rgba(30, 29, 39, 1)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: H_PAD,
    paddingTop: 14,
    paddingBottom: 32,
    backgroundColor: 'rgba(30, 29, 39, 1)',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: GAP,
    flexWrap: 'nowrap',
  },
  cell: {
    alignItems: 'center',
  },
  logoClip: {
    width: LOGO_DIAMETER,
    height: LOGO_DIAMETER,
    borderRadius: LOGO_DIAMETER / 2,
    overflow: 'hidden',
    marginBottom: 8,
    position: 'relative',
  },
  logoImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: LOGO_DIAMETER,
    height: LOGO_DIAMETER,
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoLetter: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  companyName: {
    color: Colors.white100,
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
    width: '100%',
  },
  projectCount: {
    color: Colors.grey200,
    fontSize: 14,
    marginTop: 6,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: Colors.grey200,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryText: {
    color: Colors.yellowIcons,
    fontWeight: '600',
  },
  empty: {
    color: Colors.grey200,
    textAlign: 'center',
    marginTop: 40,
  },
});

export default SelectedProjectsScreen;
