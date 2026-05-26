import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {flexEnd} from '../utils/rtlLayout';

const CARD_BG = '#2b2a39';
const CREAM = '#f7f3e6';
const SECONDARY = '#d2d0dc';
const DEEP = '#1e1d27';
const WHITE_PILL = '#ffffff';

const GOLD_GRADIENT = ['#fee787', '#bd9947', '#9c6522'];
const GOLD_LOCATIONS = [0.045, 0.508, 0.883];

const formatPrice = n => {
  if (n == null || !Number.isFinite(Number(n))) return null;
  try {
    return `₪${Number(n).toLocaleString('he-IL')}`;
  } catch (_) {
    return `₪${Number(n)}`;
  }
};

/**
 * Figma 8:9989 — listing summary + exclusivity period + accept / reject (owner only).
 */
const ExclusiveOfferResponseCard = ({
  purposeLabel,
  priceFormatted,
  addressLine,
  imageUri,
  monthsCommitted,
  decisionStatus,
  loading,
  onAccept,
  onReject,
}) => {
  const st = String(decisionStatus || 'pending')
    .trim()
    .toLowerCase();
  const isAccepted = st === 'accepted';
  const isRejected = st === 'rejected';

  const pill = purposeLabel || 'למכירה';
  const months =
    monthsCommitted != null && Number.isFinite(Number(monthsCommitted))
      ? Number(monthsCommitted)
      : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.topCard}>
        <View style={[styles.topTextCol, {alignItems: flexEnd}]}>
          <View style={[styles.whitePill, {alignSelf: flexEnd}]}>
            <Text style={styles.whitePillText} numberOfLines={1}>
              {pill}
            </Text>
          </View>
          {priceFormatted ? (
            <Text style={[styles.price, {textAlign: 'left'}]} numberOfLines={1}>
              {priceFormatted}
            </Text>
          ) : null}
          <View style={[styles.addrRow, {justifyContent: flexEnd}]}>
            <Text
              style={[styles.address, {textAlign: 'left'}]}
              numberOfLines={2}>
              {addressLine || '—'}
            </Text>
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={20}
              color="#fff"
            />
          </View>
        </View>
        <View style={styles.thumbWrap}>
          {imageUri ? (
            <Image
              source={{uri: imageUri}}
              style={styles.thumb}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <MaterialCommunityIcons
                name="home-city-outline"
                size={32}
                color="rgba(255,255,255,0.35)"
              />
            </View>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomCard}>
        <Text style={styles.periodText}>
          {months != null
            ? `תקופת הבלעדיות המוצעת: ${months} חודשים`
            : 'תקופת הבלעדיות המוצעת'}
        </Text>
        <View style={styles.btnRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onAccept}
            disabled={loading}
            style={[styles.gradHit, isAccepted && styles.gradHitSelected]}
            accessibilityRole="button"
            accessibilityLabel="אשר בקשה">
            <LinearGradient
              colors={GOLD_GRADIENT}
              locations={GOLD_LOCATIONS}
              start={{x: 0.5, y: 0}}
              end={{x: 0.5, y: 1}}
              style={styles.gradBtn}>
              {loading ? (
                <ActivityIndicator size="small" color={DEEP} />
              ) : (
                <>
                  <Text style={styles.gradBtnText}>אשר בקשה</Text>
                  <MaterialCommunityIcons name="check" size={22} color={DEEP} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onReject}
            disabled={loading}
            style={[styles.gradHit, isRejected && styles.gradHitSelected]}
            accessibilityRole="button"
            accessibilityLabel="דחה בקשה">
            <LinearGradient
              colors={GOLD_GRADIENT}
              locations={GOLD_LOCATIONS}
              start={{x: 0.5, y: 0}}
              end={{x: 0.5, y: 1}}
              style={styles.gradBtn}>
              {loading ? (
                <ActivityIndicator size="small" color={DEEP} />
              ) : (
                <>
                  <Text style={styles.gradBtnText}>דחה בקשה</Text>
                  <MaterialCommunityIcons name="close" size={20} color={DEEP} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
        {isRejected ? (
          <Text style={styles.decisionHint}>
            כרגע דחית את הבקשה — ניתן לאשר מחדש
          </Text>
        ) : isAccepted ? (
          <Text style={styles.decisionHint}>
            כרגע אישרת את הבקשה — ניתן לדחות מחדש
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    marginHorizontal: 4,
    marginTop: 8,
    marginBottom: 16,
  },
  topCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 14,
    gap: 12,
  },
  topTextCol: {
    flex: 1,
    minWidth: 0,
  },
  whitePill: {
    backgroundColor: WHITE_PILL,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    marginBottom: 8,
  },
  whitePillText: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    color: DEEP,
  },
  price: {
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    color: CREAM,
    marginBottom: 8,
  },
  addrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  address: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    fontFamily: 'Rubik-Regular',
  },
  thumbWrap: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  thumb: {width: '100%', height: '100%'},
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  bottomCard: {
    backgroundColor: '#2b2a39',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 20,
  },
  periodText: {
    fontSize: 14,
    color: SECONDARY,
    textAlign: 'center',
    fontFamily: 'Rubik-Regular',
    writingDirection: 'rtl',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  gradHit: {borderRadius: 100, overflow: 'hidden'},
  gradHitSelected: {
    borderWidth: 2,
    borderColor: CREAM,
  },
  decisionHint: {
    fontSize: 12,
    color: SECONDARY,
    textAlign: 'center',
    fontFamily: 'Rubik-Regular',
    writingDirection: 'rtl',
    paddingHorizontal: 8,
  },
  gradBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    borderRadius: 100,
  },
  gradBtnText: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    color: DEEP,
  },
});

export default ExclusiveOfferResponseCard;
export {formatPrice};
