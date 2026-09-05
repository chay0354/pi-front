import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import ProfileAvatar from '../components/ProfileAvatar';
import {getPiReviewStarSource} from '../utils/piRatingBadgeAssets';
import {flexStart} from '../utils/rtlLayout';

/** Figma 10:31152 — full-screen ביקורות list (RTL). */
const BG = '#1E1D27';
const CARD = '#2B2A39';
const CREAM = '#F7F3E6';
const SECONDARY = '#D2D0DC';
const GAP_CARDS = 31;

function getStarSource(rating) {
  return getPiReviewStarSource(rating);
}

function formatReviewDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
  } catch (_) {
    return '';
  }
}

const ReviewRow = ({r, hideStars = false}) => {
  const rating = Math.min(5, Math.max(1, Number(r.rating) || 1));
  const starSource = getStarSource(rating);
  const starStyle = styles.starBadge;
  const showStars =
    !hideStars && Number(r?.rating) >= 1 && Number(r?.rating) <= 5;

  return (
    <View style={styles.card}>
      {/** Figma 10:31157: Top row justify-end, gap 15 — avatar 66px right, name+date flex-1 left of it (row-reverse + avatar first). */}
      <View style={styles.cardTop}>
        <View style={styles.avatarCol}>
          <ProfileAvatar
            uri={r.reviewer_image_url || undefined}
            name={r.reviewer_name}
            size={60}
            subscriptionType={r.reviewer_subscription_type}
            imageStyle={
              Platform.OS === 'web' ? {objectFit: 'cover'} : undefined
            }
          />
          {showStars ? (
            <Image source={starSource} style={starStyle} resizeMode="contain" />
          ) : null}
        </View>
        <View style={styles.nameCol}>
          <Text style={styles.reviewerName}>{r.reviewer_name || 'משתמש'}</Text>
          <Text style={styles.reviewDate}>
            {formatReviewDate(r.created_at)}
          </Text>
        </View>
      </View>
      {r.comment ? <Text style={styles.reviewBody}>{r.comment}</Text> : null}
    </View>
  );
};

const ProfileReviewsScreen = ({
  reviews = [],
  onClose,
  variant = 'reviews',
}) => {
  const insets = useSafeAreaInsets();
  const count = Array.isArray(reviews) ? reviews.length : 0;
  const commentsOnly = variant === 'comments';
  const title = commentsOnly ? `תגובות (${count})` : `ביקורות (${count})`;

  return (
    <View style={[styles.root, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.backBtn}
          hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
          accessibilityRole="button"
          accessibilityLabel="חזרה">
          <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {paddingBottom: Math.max(24, insets.bottom + 24)},
        ]}
        showsVerticalScrollIndicator={false}>
        {count === 0 ? (
          <Text style={styles.empty}>
            {commentsOnly ? 'אין תגובות' : 'אין ביקורות'}
          </Text>
        ) : (
          reviews.map((r, i) => (
            <ReviewRow
              key={r.id != null ? String(r.id) : `review-${i}`}
              r={r}
              hideStars={commentsOnly}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    maxWidth: 414,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 10,
    minHeight: 44,
  },
  backBtn: {
    width: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Rubik-Regular',
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSpacer: {width: 44, height: 44},
  scroll: {flex: 1},
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  empty: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
    marginTop: 32,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 10,
    marginBottom: GAP_CARDS,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 20,
  },
  nameCol: {
    flex: 1,
    alignItems: flexStart,
    gap: 10,
  },
  reviewerName: {
    fontFamily: 'Rubik-Medium',
    fontSize: 18,
    lineHeight: 24,
    color: CREAM,
    textAlign: 'left',
    width: '100%',
  },
  reviewDate: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    lineHeight: 16,
    color: SECONDARY,
    textAlign: 'left',
    letterSpacing: 0.5447,
    width: '100%',
  },
  /** Figma: w-[66px] h~81 — avatar + star overlap */
  avatarCol: {
    width: 66,
    minHeight: 81,
    alignItems: 'center',
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPh: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  /** Slightly smaller than Figma 30px — kept centered on 66px column, overlap avatar */
  starBadge1: {
    width: 24,
    height: 24,
    position: 'absolute',
    top: 54,
    left: 21,
  },
  starBadge: {
    width: 24,
    height: 24,
    position: 'absolute',
    top: 54,
    left: 21,
  },
  reviewBody: {
    fontFamily: 'Rubik-Regular',
    fontSize: 18,
    lineHeight: 32,
    color: '#FFFFFF',
    textAlign: 'left',
  },
});

export default ProfileReviewsScreen;
