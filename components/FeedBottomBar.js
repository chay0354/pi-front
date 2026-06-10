import React, {useMemo} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const ACTIVE_FILTER_COLOR = '#FFC40A';
import {FEED_BOTTOM_BAR_CONTENT_HEIGHT} from '../utils/feedLayout';

export {
  FEED_BOTTOM_BAR_CONTENT_HEIGHT,
  FEED_OVERLAY_ABOVE_BAR_GAP,
  feedBottomBarHeight,
  feedChromeScreenBottom,
  feedImageIndicatorTop,
} from '../utils/feedLayout';
/** Extra #1E1D27 above icons so the bar reads taller (Figma top breathing room). */
const BOTTOM_BAR_TOP_PADDING = 12;
/** Figma `spacing/xs3` under the icon row. */
const BOTTOM_BAR_ROW_PADDING_BOTTOM = 6;
/** Figma `spacing/s2` between icon and label. */
const BOTTOM_BAR_ICON_LABEL_GAP = 10;
/** Nudge filter slots down / center publish up within the bar row. */
const BOTTOM_BAR_FILTER_NUDGE_DOWN = 4;
const BOTTOM_BAR_POST_NUDGE_UP = 4;
/** Bottom-bar filter icons (סוג, מטר, land …) — use a single-color / alpha template so `tintColor` matches מחיר/עיר. */
const FIGMA_TYPE_ICON = require('../assets/tiktok/kind-new.png');

const ICONS = {
  price: require('../assets/buttom-bar/price.png'),
  post: require('../assets/buttom-bar/post.png'),
  city: require('../assets/buttom-bar/city.png'),
  rooms: require('../assets/buttom-bar/rooms_number.png'),
  apartmentType: require('../assets/buttom-bar/appartment_type.png'),
  meter: require('../assets/tiktok/meter-new.png'),
  type: FIGMA_TYPE_ICON,
  donam: require('../assets/donam.png'),
  partners: require('../assets/tiktok/prefrences.png'),
  /** Office slot — same “kind” affordance as type; sheet is office. */
  office: FIGMA_TYPE_ICON,
};

const BOTTOM_BAR_ITEMS = [
  {id: 'price', label: 'מחיר', isPost: false},
  {id: 'rooms', isPost: false},
  {id: 'post', label: 'פרסם', isPost: true},
  {id: 'apartment', isPost: false},
  {id: 'city', label: 'עיר', isPost: false},
];

/**
 * Second column (“rooms” slot) + fourth column (“apartment” slot) per home category.
 * filterKey must match `feedFilters` / TikTokFilterScreen keys.
 */
function getSlotsForCategory(categoryNum) {
  if (!Number.isFinite(categoryNum)) {
    return {
      rooms: {
        kind: 'rooms',
        label: 'חדרים',
        icon: ICONS.rooms,
        filterKey: 'rooms',
      },
      apartment: {
        kind: 'apartmentType',
        label: 'סוג דירה',
        icon: ICONS.apartmentType,
        filterKey: 'apartmentType',
      },
    };
  }
  switch (categoryNum) {
    case 2: // משרדים — 2nd: מטר; 4th: סוג → OfficeFilter (Figma מגירה)
      return {
        rooms: {
          kind: 'meter',
          label: 'מטר',
          icon: ICONS.meter,
          filterKey: 'meter',
        },
        apartment: {
          kind: 'office',
          label: 'סוג',
          icon: ICONS.type,
          filterKey: 'office',
        },
      };
    case 3: // שותפים
      return {
        rooms: {
          kind: 'preferences',
          label: 'העדפות',
          icon: ICONS.partners,
          filterKey: 'preferences',
        },
        apartment: {
          kind: 'apartmentType',
          label: 'סוג דירה',
          icon: ICONS.apartmentType,
          filterKey: 'apartmentType',
        },
      };
    case 4: // גלובל
    case 5: // BnB
      return {
        rooms: {
          kind: 'rooms',
          label: 'חדרים',
          icon: ICONS.rooms,
          filterKey: 'rooms',
        },
        apartment: {
          kind: 'type',
          label: 'סוג',
          icon: ICONS.type,
          filterKey: 'type',
        },
      };
    case 7: // קרקעות
      return {
        rooms: {
          kind: 'landType',
          label: 'סוג',
          icon: ICONS.type,
          filterKey: 'type',
        },
        apartment: {
          kind: 'donam',
          label: 'דונם',
          icon: ICONS.donam,
          filterKey: 'donam',
        },
      };
    case 8: // מסחר
      return {
        rooms: {
          kind: 'meter',
          label: 'מטר',
          icon: ICONS.meter,
          filterKey: 'meter',
        },
        apartment: {
          kind: 'type',
          label: 'סוג',
          icon: ICONS.type,
          filterKey: 'type',
        },
      };
    case 1: // חדש מקבלן — fourth slot is global סוג (TypeFilter), not סוג דירה
      return {
        rooms: {
          kind: 'rooms',
          label: 'חדרים',
          icon: ICONS.rooms,
          filterKey: 'rooms',
        },
        apartment: {
          kind: 'type',
          label: 'סוג',
          icon: ICONS.type,
          filterKey: 'type',
        },
      };
    case 6: // מגזר דתי
    case 10: // דירות
    case 12: // יוקרה
    default:
      return {
        rooms: {
          kind: 'rooms',
          label: 'חדרים',
          icon: ICONS.rooms,
          filterKey: 'rooms',
        },
        apartment: {
          kind: 'apartmentType',
          label: 'סוג דירה',
          icon: ICONS.apartmentType,
          filterKey: 'apartmentType',
        },
      };
  }
}

function isFilterValueActive(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return false;
}

/**
 * TikTok feed bottom bar: per-category filter targets (מחיר / 2nd / פרסם / 4th / עיר).
 */
const FeedBottomBar = ({
  selectedCategory = null,
  feedFilters = {},
  onOpenCityFilter,
  onOpenApartmentTypeFilter,
  onOpenTypeFilter,
  onOpenOfficeFilter,
  onOpenRoomsFilter,
  onOpenMeterFilter,
  onOpenDonamFilter,
  onOpenPreferencesFilter,
  onOpenPriceFilter,
  onOpenEditPublishAdWithCategory,
  /** Reports rendered bar height so feed chrome can align on every device. */
  onLayoutHeight,
}) => {
  const insets = useSafeAreaInsets();
  const categoryNum = useMemo(() => {
    if (selectedCategory == null || selectedCategory === '') return NaN;
    const n = parseInt(String(selectedCategory).trim(), 10);
    return Number.isFinite(n) && n >= 0 ? n : NaN;
  }, [selectedCategory]);

  const {slots} = useMemo(() => {
    const selectedTypeIds = Array.isArray(feedFilters?.type)
      ? feedFilters.type.map(v => String(v || '').trim()).filter(Boolean)
      : feedFilters?.type != null && String(feedFilters.type).trim() !== ''
        ? [String(feedFilters.type).trim()]
        : [];
    const residentialTypeIds = new Set([
      'apartments',
      'private_houses',
      'estates',
      'villas',
      'hotels',
      'hotel',
    ]);
    const officeCommercialTypeIds = new Set([
      'offices',
      'commercial',
      'land',
      'store',
      'shopping_center',
      'industrial_buildings',
      'warehouse',
      'commercial_space',
      'whole_floor',
    ]);
    const hasResidentialTypeSelected = selectedTypeIds.some(t =>
      residentialTypeIds.has(t),
    );
    const hasOfficeOrCommercialTypeSelected = selectedTypeIds.some(t =>
      officeCommercialTypeIds.has(t),
    );
    const isCommerce = categoryNum === 8;
    const isLand = categoryNum === 7;
    const isPartners = categoryNum === 3;
    // גלובל / BnB: if “סוג” is office–commercial, 2nd slot shows מטר (same as earlier behavior).
    const useMeterFromType =
      (categoryNum === 4 || categoryNum === 5) &&
      !isCommerce &&
      !isLand &&
      !isPartners &&
      !hasResidentialTypeSelected &&
      hasOfficeOrCommercialTypeSelected;
    // חדש מקבלן (1): TypeFilter uses TYPE_OPTIONS_NEW_FROM_DEVELOPER — מטר when סוג is משרדים/מסחר, else חדרים.
    const newFromDeveloperMeterTypeIds = new Set(['offices', 'commercial']);
    const useMeterFromNewDeveloper =
      categoryNum === 1 &&
      selectedTypeIds.some(t => newFromDeveloperMeterTypeIds.has(t));

    let s = getSlotsForCategory(categoryNum);
    if (useMeterFromType || useMeterFromNewDeveloper) {
      s = {
        ...s,
        rooms: {
          kind: 'meter',
          label: 'מטר',
          icon: ICONS.meter,
          filterKey: 'meter',
        },
      };
    }
    // משרדים (2): 2nd column is always מטר (opens MeterFilter), 4th is סוג (OfficeFilter). Do not use "משרד" here.
    if (categoryNum === 2) {
      s = {
        ...s,
        rooms: {
          kind: 'meter',
          label: 'מטר',
          icon: ICONS.meter,
          filterKey: 'meter',
        },
        apartment: {
          kind: 'office',
          label: 'סוג',
          icon: ICONS.type,
          filterKey: 'office',
        },
      };
    }
    return {slots: s};
  }, [categoryNum, feedFilters?.type]);

  return (
    <View
      onLayout={
        onLayoutHeight
          ? e => {
              const h = e?.nativeEvent?.layout?.height;
              if (h > 0) onLayoutHeight(h);
            }
          : undefined
      }
      style={[
        styles.bottomBar,
        {
          paddingTop: BOTTOM_BAR_TOP_PADDING,
          paddingBottom: insets.bottom,
          height: FEED_BOTTOM_BAR_CONTENT_HEIGHT + insets.bottom,
        },
      ]}>
      <View style={styles.bottomBarRow}>
        {BOTTOM_BAR_ITEMS.map(item => {
          if (item.id === 'price') {
            const active = isFilterValueActive(feedFilters?.price);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.bottomBarItem, styles.bottomBarItemFilter]}
                onPress={() => onOpenPriceFilter?.()}
                activeOpacity={0.8}>
                <View style={styles.bottomBarIconWrap}>
                  <Image
                    source={ICONS.price}
                    style={[
                      styles.bottomBarIcon,
                      active && styles.bottomBarIconActive,
                    ]}
                    tintColor={active ? ACTIVE_FILTER_COLOR : undefined}
                    resizeMode="contain"
                  />
                </View>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                  style={[
                    styles.bottomBarLabel,
                    active && styles.bottomBarLabelActive,
                  ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }
          if (item.id === 'post') {
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.bottomBarItem, styles.bottomBarItemPost]}
                onPress={() =>
                  onOpenEditPublishAdWithCategory?.(selectedCategory)
                }
                activeOpacity={0.8}>
                <View style={styles.bottomBarIconWrapPost}>
                  <Image
                    source={ICONS.post}
                    style={styles.bottomBarIconPost}
                    resizeMode="contain"
                  />
                </View>
                <Text
                  style={[styles.bottomBarLabel, styles.bottomBarLabelPost]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }
          if (item.id === 'city') {
            const active = isFilterValueActive(feedFilters?.city);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.bottomBarItem, styles.bottomBarItemFilter]}
                onPress={() => onOpenCityFilter?.()}
                activeOpacity={0.8}>
                <View style={styles.bottomBarIconWrap}>
                  <Image
                    source={ICONS.city}
                    style={[
                      styles.bottomBarIcon,
                      active && styles.bottomBarIconActive,
                    ]}
                    tintColor={active ? ACTIVE_FILTER_COLOR : undefined}
                    resizeMode="contain"
                  />
                </View>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                  style={[
                    styles.bottomBarLabel,
                    active && styles.bottomBarLabelActive,
                  ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }

          const slot = item.id === 'rooms' ? slots.rooms : slots.apartment;
          const filterKey = slot.filterKey;
          const active = isFilterValueActive(feedFilters?.[filterKey]);
          const useGlobalIcon =
            item.id === 'rooms'
              ? slot.kind === 'meter' ||
                slot.kind === 'preferences' ||
                slot.kind === 'landType' ||
                slot.kind === 'office'
              : slot.kind === 'type' ||
                slot.kind === 'donam' ||
                slot.kind === 'landType' ||
                slot.kind === 'office';

          const onPress = () => {
            if (item.id === 'rooms') {
              switch (slot.kind) {
                case 'rooms':
                  onOpenRoomsFilter?.();
                  return;
                case 'office':
                  onOpenOfficeFilter?.();
                  return;
                case 'meter':
                  onOpenMeterFilter?.();
                  return;
                case 'preferences':
                  onOpenPreferencesFilter?.();
                  return;
                case 'landType':
                  onOpenTypeFilter?.();
                  return;
                default:
                  onOpenRoomsFilter?.();
              }
              return;
            }
            switch (slot.kind) {
              case 'apartmentType':
                onOpenApartmentTypeFilter?.();
                return;
              case 'type':
                onOpenTypeFilter?.();
                return;
              case 'donam':
                onOpenDonamFilter?.();
                return;
              case 'office':
                onOpenOfficeFilter?.();
                return;
              default:
                onOpenApartmentTypeFilter?.();
            }
          };

          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.bottomBarItem, styles.bottomBarItemFilter]}
              onPress={onPress}
              activeOpacity={0.8}>
              <View style={styles.bottomBarIconWrap}>
                <Image
                  source={slot.icon}
                  style={[
                    styles.bottomBarIcon,
                    useGlobalIcon && styles.bottomBarIconGlobal,
                    active && styles.bottomBarIconActive,
                  ]}
                  tintColor={active ? ACTIVE_FILTER_COLOR : undefined}
                  resizeMode="contain"
                />
              </View>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                adjustsFontSizeToFit
                minimumFontScale={0.78}
                style={[
                  styles.bottomBarLabel,
                  active && styles.bottomBarLabelActive,
                ]}>
                {slot.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  /** `fixed` on web: stick to the viewport when the page or an outer container scrolls. */
  bottomBar: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    backgroundColor: '#1E1D27',
    zIndex: 200,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bottomBarRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 414,
    paddingHorizontal: 24,
    paddingBottom: BOTTOM_BAR_ROW_PADDING_BOTTOM,
  },
  bottomBarItem: {
    width: 54,
    minWidth: 54,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  bottomBarItemFilter: {
    marginTop: BOTTOM_BAR_FILTER_NUDGE_DOWN,
  },
  bottomBarItemPost: {
    width: 57,
    minWidth: 57,
    transform: [{translateY: -BOTTOM_BAR_POST_NUDGE_UP}],
  },
  bottomBarIconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: BOTTOM_BAR_ICON_LABEL_GAP,
  },
  bottomBarIconWrapPost: {
    width: 49,
    height: 36,
    marginTop: 0,
    marginBottom: 0,
  },
  bottomBarIcon: {
    width: 24,
    height: 24,
  },
  bottomBarIconGlobal: {
    width: 24,
    height: 24,
  },
  bottomBarIconPost: {
    width: 49,
    height: 36,
  },
  bottomBarLabel: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5447,
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
    textAlign: 'center',
    width: 54,
    flexShrink: 1,
  },
  bottomBarLabelActive: {
    color: ACTIVE_FILTER_COLOR,
  },
  bottomBarIconActive: {
    tintColor: ACTIVE_FILTER_COLOR,
  },
  bottomBarLabelPost: {
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0,
  },
});

export default FeedBottomBar;
