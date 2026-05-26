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
import {getCompaniesDirectory} from '../utils/api';
import {flexEnd} from '../utils/rtlLayout';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const H_PAD = 20;
const GAP = 12;
const COLS = 3;
const CELL_W = (SCREEN_WIDTH - H_PAD * 2 - GAP * (COLS - 1)) / COLS;
const LOGO_DIAMETER = CELL_W;
const SEARCH_ACCENT = 'rgba(140, 133, 179, 1)';
const SEARCH_BORDER = SEARCH_ACCENT;
const SEARCH_ICON_MUTED = SEARCH_ACCENT;

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
      const res = await getCompaniesDirectory();
      setCompanies(Array.isArray(res?.companies) ? res.companies : []);
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

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return companies;
    return companies.filter(c => {
      const name = (c.name || '').toString();
      const addr = (c.address_hint || '').toString();
      return name.includes(q) || addr.includes(q);
    });
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
            placeholder="חפש לפי עיר / חברה"
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
            <Text style={styles.empty}>לא נמצאו חברות</Text>
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
    fontSize: 22,
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
