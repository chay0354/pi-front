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
  SafeAreaView,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {getProfessionalsDirectory} from '../utils/api';
import {ProfileAvatar} from '../components';

const imgBackArrow = 'https://www.figma.com/api/mcp/asset/7f09ed22-4005-48ed-88bc-b516005535ca';
const imgSearchOutline = 'https://www.figma.com/api/mcp/asset/64d5a467-13ce-4fb9-ac0f-e97f15e3998f';
const imgSearchFill = 'https://www.figma.com/api/mcp/asset/ef9a7923-13e3-4c40-87a5-ed642b1040cd';
const imgViewToggleLeftIcon = require('../assets/swiperleft.png');
const imgViewToggleRightIcon = require('../assets/swipereight.png');
const imgRatingFilter = 'https://www.figma.com/api/mcp/asset/37507831-2364-49c7-a50d-8425ce3fc533';
const imgStarBig = require('../assets/pros/star-big.png');
const imgLocationPro = require('../assets/pros/location-pro.png');
const imgProfileRing = 'https://www.figma.com/api/mcp/asset/9daf687f-169f-43ec-baf8-8539b1ebca51';
const imgSettingsBack = 'https://www.figma.com/api/mcp/asset/2ab2b8e8-8841-48b5-8a85-1f42910663ce';
const imgProMessagesButton = require('../assets/pros/pro-messges.png');

const collectTags = professional =>
  [
    ...(Array.isArray(professional?.specializations) ? professional.specializations : []),
    ...(Array.isArray(professional?.types) ? professional.types : []),
  ]
    .map(v => String(v || '').trim())
    .filter(Boolean)
    .slice(0, 3);

const formatRating = value => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return '5';
  const rounded = Math.round(num * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};
const getRatingValue = value => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 5;
  return num;
};

const ProfessionalCard = ({professional, onPress, onPressMessage}) => {
  const tags = collectTags(professional);
  const ratingText = formatRating(professional?.average_rating);
  const mediaUrl = professional?.profile_image_url || null;
  const title = String(professional?.display_name || 'בעל מקצוע').trim();
  const address = String(professional?.address || 'מיקום לא זמין').trim();
  const description = String(professional?.bio || 'ללא תיאור').trim();

  return (
    <TouchableOpacity style={styles.cardShell} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.cardMedia}>
        {mediaUrl ? (
          <Image source={{uri: mediaUrl}} style={styles.cardMediaImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardMediaImage, styles.cardMediaFallback]} />
        )}
        <LinearGradient
          colors={['rgba(129,129,129,0)', 'rgba(0,0,0,0.5)']}
          start={{x: 0.5, y: 0}}
          end={{x: 0.5, y: 1}}
          style={styles.cardMediaOverlay}
        />
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardHeaderWrap}>
          <View style={styles.ratingBlock}>
            <Text style={styles.ratingNumber}>{ratingText}</Text>
            <Image
              source={imgStarBig}
              style={styles.ratingBadgeImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.cardTitleAddressCol}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {title}
            </Text>
            <View style={styles.addressRow}>
              <Text style={styles.addressText} numberOfLines={1}>
                {address}
              </Text>
              <View style={styles.pinIconWrap}>
                <Image source={imgLocationPro} style={styles.pinIconLayer} resizeMode="contain" />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.tagsRow}>
          {tags.map(tag => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText} numberOfLines={1}>
                {tag}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.descriptionText} numberOfLines={1}>
          {description}
        </Text>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={e => {
            e?.stopPropagation?.();
            onPressMessage?.(professional);
          }}>
          <Image source={imgProMessagesButton} style={styles.messageBtnImage} resizeMode="contain" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const ProfessionalListCard = ({professional, onPress}) => {
  const tags = collectTags(professional);
  const ratingText = formatRating(professional?.average_rating);
  const mediaUrl = professional?.profile_image_url || null;
  const title = String(professional?.display_name || 'בעל מקצוע').trim();
  const address = String(professional?.address || 'מיקום לא זמין').trim();

  return (
    <TouchableOpacity style={styles.listCardShell} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.listCardTopRow}>
        <View style={styles.listInfoCol}>
          <View style={styles.listTitleRow}>
            <View style={styles.listRatingWrap}>
              <Text style={styles.listRatingNumber}>{ratingText}</Text>
              <Image
                source={imgStarBig}
                style={styles.listRatingBadgeImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.listTitleText} numberOfLines={1}>
              {title}
            </Text>
          </View>

          <View style={styles.listAddressRow}>
            <Text style={styles.listAddressText} numberOfLines={1}>
              {address}
            </Text>
            <View style={styles.listPinIconWrap}>
              <Image source={imgLocationPro} style={styles.listPinIconLayer} resizeMode="contain" />
            </View>
          </View>
        </View>

        <ProfileAvatar uri={mediaUrl} name={title} size={78} />
      </View>

      <View style={styles.listTagsRow}>
        {tags.map(tag => (
          <View key={tag} style={styles.listTagChip}>
            <Text style={styles.listTagText} numberOfLines={1}>
              {tag}
            </Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
};

const ProfessionalsDirectoryScreen = ({onClose, onOpenProfessional, onMessageProfessional}) => {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [professionals, setProfessionals] = useState([]);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('cards');
  const [showSearchSettings, setShowSearchSettings] = useState(false);
  const [draftLocation, setDraftLocation] = useState('');
  const [appliedLocation, setAppliedLocation] = useState('');
  const [draftTypeFilters, setDraftTypeFilters] = useState([]);
  const [draftExpertiseFilters, setDraftExpertiseFilters] = useState([]);
  const [appliedTypeFilters, setAppliedTypeFilters] = useState([]);
  const [appliedExpertiseFilters, setAppliedExpertiseFilters] = useState([]);
  const [ratingSortMode, setRatingSortMode] = useState('none'); // none -> desc -> asc

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProfessionalsDirectory();
      setProfessionals(Array.isArray(res?.professionals) ? res.professionals : []);
    } catch (e) {
      setError(e.message || 'טעינה נכשלה');
      setProfessionals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    const base = professionals.filter(item => {
      const haystack = [
        item?.display_name,
        item?.address,
        item?.bio,
        ...(Array.isArray(item?.specializations) ? item.specializations : []),
        ...(Array.isArray(item?.types) ? item.types : []),
      ]
        .map(v => String(v || '').toLowerCase())
        .join(' ');
      if (q && !haystack.includes(q)) return false;

      const locationQuery = String(appliedLocation || '').trim().toLowerCase();
      if (locationQuery) {
        const locationHaystack = [
          item?.address,
          item?.display_name,
          item?.bio,
        ]
          .map(v => String(v || '').toLowerCase())
          .join(' ');
        if (!locationHaystack.includes(locationQuery)) return false;
      }

      if (appliedTypeFilters.length > 0) {
        const typeSet = new Set(
          (Array.isArray(item?.types) ? item.types : []).map(v => String(v || '').trim()),
        );
        if (!appliedTypeFilters.some(tag => typeSet.has(tag))) return false;
      }

      if (appliedExpertiseFilters.length > 0) {
        const expertiseSet = new Set(
          (Array.isArray(item?.specializations) ? item.specializations : []).map(v =>
            String(v || '').trim(),
          ),
        );
        if (!appliedExpertiseFilters.some(tag => expertiseSet.has(tag))) return false;
      }

      return true;
    });
    if (ratingSortMode === 'none') return base;
    const sorted = [...base].sort((a, b) => {
      const aRating = getRatingValue(a?.average_rating);
      const bRating = getRatingValue(b?.average_rating);
      return ratingSortMode === 'desc' ? bRating - aRating : aRating - bRating;
    });
    return sorted;
  }, [
    professionals,
    query,
    appliedLocation,
    appliedTypeFilters,
    appliedExpertiseFilters,
    ratingSortMode,
  ]);

  const toggleRatingSort = () => {
    setRatingSortMode(prev =>
      prev === 'none' ? 'desc' : prev === 'desc' ? 'asc' : 'none',
    );
  };
  const ratingSortIndicator =
    ratingSortMode === 'none' ? '↕' : ratingSortMode === 'desc' ? '↑' : '↓';

  const typeOptions = useMemo(() => {
    const preferred = ['תיווך', 'עו״ד', 'עיצוב פנים', 'יועץ משכנתאות', 'שמאות', 'אדריכלות'];
    const seen = new Set();
    const out = [];
    preferred.forEach(tag => {
      seen.add(tag);
      out.push(tag);
    });
    professionals.forEach(item => {
      (Array.isArray(item?.types) ? item.types : []).forEach(tag => {
        const normalized = String(tag || '').trim();
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        out.push(normalized);
      });
    });
    return out;
  }, [professionals]);

  const expertiseOptions = useMemo(() => {
    const preferred = ['נדל״ן', 'קבוצות רכישה', 'חוזים וקרקעות', 'השקעות'];
    const seen = new Set();
    const out = [];
    preferred.forEach(tag => {
      seen.add(tag);
      out.push(tag);
    });
    professionals.forEach(item => {
      (Array.isArray(item?.specializations) ? item.specializations : []).forEach(tag => {
        const normalized = String(tag || '').trim();
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        out.push(normalized);
      });
    });
    return out;
  }, [professionals]);

  const toggleDraftFilter = (value, kind) => {
    const setter = kind === 'type' ? setDraftTypeFilters : setDraftExpertiseFilters;
    setter(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value],
    );
  };

  const openSearchSettings = () => {
    setDraftLocation(appliedLocation);
    setDraftTypeFilters(appliedTypeFilters);
    setDraftExpertiseFilters(appliedExpertiseFilters);
    setShowSearchSettings(true);
  };

  const applySearchSettings = () => {
    setAppliedLocation(draftLocation.trim());
    setAppliedTypeFilters(draftTypeFilters);
    setAppliedExpertiseFilters(draftExpertiseFilters);
    setShowSearchSettings(false);
  };

  const clearSearchSettings = () => {
    setDraftLocation('');
    setDraftTypeFilters([]);
    setDraftExpertiseFilters([]);
    setAppliedLocation('');
    setAppliedTypeFilters([]);
    setAppliedExpertiseFilters([]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topNav}>
        <View style={styles.titleRow}>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.85}
            style={styles.backButton}
            hitSlop={12}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={28}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>בעלי מקצוע בתחום הנדל״ן</Text>
          <View style={styles.titleRightSpacer} />
        </View>

        <View style={styles.searchField}>
          <TouchableOpacity
            onPress={openSearchSettings}
            activeOpacity={0.85}
            style={styles.searchFilterBtn}>
            <MaterialCommunityIcons
              name="tune-vertical"
              size={22}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <View style={styles.searchInputGroup}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
              placeholder="סוג, שם העסק, התמחות, עיר"
              placeholderTextColor="rgba(255,255,255,0.35)"
            />
            <MaterialCommunityIcons
              name="magnify"
              size={22}
              color="rgba(255,255,255,0.55)"
            />
          </View>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.sortPill}
            onPress={toggleRatingSort}
            activeOpacity={0.85}>
            <Image source={{uri: imgRatingFilter}} style={styles.sortIcon} resizeMode="contain" />
            <Text style={styles.sortText}>דירוג</Text>
          </TouchableOpacity>
          <View style={styles.viewToggle}>
            <View style={styles.viewToggleRightInactive}>
              <TouchableOpacity
                onPress={() =>
                  setViewMode(prev => (prev === 'cards' ? 'list' : 'cards'))
                }
                activeOpacity={0.9}>
                <Image
                  source={viewMode === 'cards' ? imgViewToggleRightIcon : imgViewToggleLeftIcon}
                  style={styles.cardsIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FFC40A" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} activeOpacity={0.85}>
            <Text style={styles.retryText}>נסה שוב</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>לא נמצאו בעלי מקצוע</Text>
          ) : (
            filtered.map(item => (
              viewMode === 'cards' ? (
                <ProfessionalCard
                  key={item.id}
                  professional={item}
                  onPress={() => onOpenProfessional?.(item)}
                  onPressMessage={() => onMessageProfessional?.(item)}
                />
              ) : (
                <ProfessionalListCard
                  key={item.id}
                  professional={item}
                  onPress={() => onOpenProfessional?.(item)}
                />
              )
            ))
          )}
        </ScrollView>
      )}

      {showSearchSettings ? (
        <View style={styles.settingsOverlay}>
          <View style={styles.settingsTop}>
            <View style={styles.settingsTitleRow}>
              <TouchableOpacity
                onPress={() => setShowSearchSettings(false)}
                activeOpacity={0.85}
                style={styles.settingsBackBtn}>
                <Image source={{uri: imgSettingsBack}} style={styles.settingsBackIcon} resizeMode="contain" />
              </TouchableOpacity>
              <Text style={styles.settingsTitle}>הגדרות חיפוש</Text>
              <View style={styles.titleRightSpacer} />
            </View>
          </View>

          <ScrollView
            style={styles.settingsScroll}
            contentContainerStyle={styles.settingsContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>מיקום</Text>
              <View style={styles.settingsInputWrap}>
                <TextInput
                  value={draftLocation}
                  onChangeText={setDraftLocation}
                  placeholder=""
                  placeholderTextColor="#FFFFFF"
                  style={styles.settingsInput}
                  textAlign="right"
                />
              </View>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>סוג</Text>
              <View style={styles.settingsChipWrap}>
                {typeOptions.map(tag => {
                  const active = draftTypeFilters.includes(tag);
                  return (
                    <TouchableOpacity
                      key={`type-${tag}`}
                      style={[styles.settingsChip, active && styles.settingsChipActive]}
                      onPress={() => toggleDraftFilter(tag, 'type')}
                      activeOpacity={0.85}>
                      <Text
                        style={[
                          styles.settingsChipText,
                          active && styles.settingsChipTextActive,
                        ]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>התמחות</Text>
              <View style={styles.settingsChipWrap}>
                {expertiseOptions.map(tag => {
                  const active = draftExpertiseFilters.includes(tag);
                  return (
                    <TouchableOpacity
                      key={`expertise-${tag}`}
                      style={[styles.settingsChip, active && styles.settingsChipActive]}
                      onPress={() => toggleDraftFilter(tag, 'expertise')}
                      activeOpacity={0.85}>
                      <Text
                        style={[
                          styles.settingsChipText,
                          active && styles.settingsChipTextActive,
                        ]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={styles.settingsBottom}>
            <TouchableOpacity style={styles.clearBtn} onPress={clearSearchSettings} activeOpacity={0.9}>
              <Text style={styles.clearBtnText}>נקה תוצאות</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.searchBtnWrap}
              onPress={applySearchSettings}
              activeOpacity={0.9}>
              <LinearGradient
                colors={['#FEE787', '#BD9947', '#9C6522']}
                locations={[0.0456, 0.5076, 0.8831]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.searchBtn}>
                <Text style={styles.searchBtnText}>חפש</Text>
              </LinearGradient>
            </TouchableOpacity>
            <View style={styles.homeIndicator} />
          </View>
        </View>
      ) : null}

      <LinearGradient
        colors={['rgba(39,38,47,0)', 'rgba(39,38,47,0.5)']}
        start={{x: 0.5, y: 0}}
        end={{x: 0.5, y: 1}}
        style={styles.homeIndicatorArea}>
        <View style={styles.homeIndicator} />
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1F1E27',
    width: '100%',
    maxWidth: 414,
    alignSelf: 'center',
  },
  topNav: {
    backgroundColor: '#1E1D27',
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: {width: 0, height: 10},
    elevation: 5,
  },
  titleRow: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 9,
    height: 11,
  },
  screenTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
  },
  titleRightSpacer: {
    width: 24,
    height: 24,
  },
  searchField: {
    height: 52,
    borderWidth: 1,
    borderColor: '#8C85B3',
    borderRadius: 1000,
    paddingLeft: 10,
    paddingRight: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchActionIcon: {
    width: 24,
    height: 24,
  },
  searchFilterBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    letterSpacing: 0.2,
    lineHeight: 22,
    paddingVertical: 0,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
    writingDirection: 'rtl',
    direction: 'rtl',
  },
  controlsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sortPill: {
    width: 56,
    paddingHorizontal: 0,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  sortIcon: {
    width: 8,
    height: 9,
  },
  sortText: {
    color: '#D2D0DC',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
  },
  sortDirectionText: {
    color: '#D2D0DC',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Rubik-Regular',
    marginTop: 1,
  },
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewToggleRight: {
    borderRadius: 8,
    padding: 2,
  },
  viewToggleRightInactive: {
    backgroundColor: '#2B2A39',
    borderRadius: 8,
    padding: 2,
  },
  listIcon: {
    width: 56,
    height: 28,
  },
  cardsIcon: {
    width: 56,
    height: 28,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 70,
    paddingTop: 10,
    gap: 44,
  },
  cardShell: {
    borderRadius: 16,
    overflow: 'hidden',
    width: 340,
    alignSelf: 'center',
    backgroundColor: '#2B2A39',
  },
  listCardShell: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#2B2A39',
    padding: 20,
    gap: 20,
  },
  listCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    gap: 10,
  },
  listInfoCol: {
    flex: 1,
    minWidth: 0,
    gap: 16,
    alignItems: 'flex-end',
  },
  listTitleRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 20,
  },
  listRatingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listRatingNumber: {
    color: '#FFFFFF',
    fontSize: 16,
    letterSpacing: 0.16,
    fontFamily: 'Rubik-Medium',
  },
  listRatingBadgeImage: {
    width: 36,
    height: 36,
    marginLeft: 4,
  },
  listTitleText: {
    flex: 1,
    color: '#F7F3E6',
    textAlign: 'right',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Rubik-Medium',
  },
  listAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  listAddressText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.5447,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  listPinIconWrap: {
    width: 20,
    height: 20,
    position: 'relative',
  },
  listPinIconLayer: {
    ...StyleSheet.absoluteFillObject,
    width: 20,
    height: 20,
  },
  listProfileWrap: {
    width: 78,
    height: 78,
    position: 'relative',
  },
  listProfileRing: {
    width: 78,
    height: 78,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  listProfileImage: {
    position: 'absolute',
    left: 6,
    top: 6,
    width: 66,
    height: 66,
    borderRadius: 1000,
  },
  listTagsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 6,
  },
  listTagChip: {
    height: 28.143,
    borderRadius: 35.714,
    borderWidth: 0.714,
    borderColor: '#FFFFFF',
    paddingHorizontal: 9.286,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTagText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  cardMedia: {
    height: 212,
    position: 'relative',
    backgroundColor: '#E0DEF7',
  },
  cardMediaImage: {
    width: '100%',
    height: '100%',
  },
  cardMediaFallback: {
    backgroundColor: '#5A5670',
  },
  cardMediaOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  speakerIcon: {
    position: 'absolute',
    left: 18,
    top: 208,
    width: 24,
    height: 24,
  },
  timelineTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  timelineProgress: {
    width: '38%',
    height: 4,
    borderRadius: 20.456,
  },
  cardContent: {
    backgroundColor: '#2B2A39',
    borderWidth: 1,
    borderColor: '#2B2A39',
    padding: 14,
    paddingBottom: 16,
    gap: 16,
    minHeight: 244,
    justifyContent: 'space-between',
  },
  cardHeaderWrap: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  cardTitleAddressCol: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 12,
  },
  ratingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingNumber: {
    color: '#FFFFFF',
    fontSize: 20,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Medium',
  },
  ratingBadgeImage: {
    width: 34,
    height: 34,
    marginLeft: 4,
  },
  cardTitle: {
    color: '#F7F3E6',
    fontSize: 28,
    lineHeight: 31,
    fontFamily: 'Rubik-SemiBold',
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  addressText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.5447,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  pinIconWrap: {
    width: 18,
    height: 18,
    position: 'relative',
  },
  pinIconLayer: {
    ...StyleSheet.absoluteFillObject,
    width: 18,
    height: 18,
  },
  tagsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    height: 23,
    borderRadius: 30,
    borderWidth: 0.714,
    borderColor: '#FFFFFF',
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  descriptionText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  messageBtnImage: {
    width: '100%',
    height: 40,
    alignSelf: 'stretch',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#C8C8C8',
    marginBottom: 12,
    fontFamily: 'Rubik-Regular',
  },
  retryText: {
    color: '#FFC40A',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
  },
  emptyText: {
    marginTop: 40,
    color: '#C8C8C8',
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
  },
  homeIndicatorArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 10,
    paddingTop: 32,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  homeIndicator: {
    width: 138,
    height: 5,
    borderRadius: 3.123,
    backgroundColor: '#FFFFFF',
  },
  settingsOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 500,
    backgroundColor: '#1F1E27',
  },
  settingsTop: {
    paddingHorizontal: 24,
    paddingTop: 11,
    paddingBottom: 10,
  },
  settingsTitleRow: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsBackBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBackIcon: {
    width: 5.257,
    height: 10.513,
  },
  settingsTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
  },
  settingsScroll: {
    flex: 1,
  },
  settingsContent: {
    paddingHorizontal: 24,
    gap: 28,
    paddingBottom: 16,
  },
  settingsSection: {
    gap: 24,
    alignItems: 'flex-end',
  },
  settingsSectionTitle: {
    color: '#D2D0DC',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  settingsInputWrap: {
    width: '100%',
    height: 52,
    borderWidth: 1,
    borderColor: '#8C85B3',
    borderRadius: 1000,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  settingsInput: {
    color: '#FFFFFF',
    fontSize: 20,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  settingsChipWrap: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
  },
  settingsChip: {
    height: 27.143,
    borderWidth: 0.714,
    borderColor: '#FFFFFF',
    borderRadius: 35.714,
    paddingHorizontal: 9.286,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsChipActive: {
    borderColor: '#FFC40A',
  },
  settingsChipText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
  },
  settingsChipTextActive: {
    color: '#FFC40A',
  },
  settingsBottom: {
    paddingTop: 24,
    paddingBottom: 9,
    paddingHorizontal: 24,
    gap: 22,
    alignItems: 'center',
    backgroundColor: '#1E1D27',
  },
  clearBtn: {
    width: '100%',
    height: 52,
    borderRadius: 1000,
    backgroundColor: '#4D4966',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Medium',
  },
  searchBtn: {
    width: '100%',
    height: 52,
    borderRadius: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnWrap: {
    width: '100%',
  },
  searchBtnText: {
    color: '#1E1D27',
    fontSize: 20,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Medium',
  },
});

export default ProfessionalsDirectoryScreen;
