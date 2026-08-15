/**
 * Grid listing/post card — same layout as EditPublishAdScreen `renderGridAdCard`.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Octicons} from '@expo/vector-icons';
import {
  getFeedPostBadgeLabel,
  getFeedPostCardCaption,
  isCompanySubscriptionType,
  isOpenHouseListing,
} from '../utils/constant';
import {VideoPreviewThumb} from './FormsElement/VideoPreviewThumb';
import {listingImageUrls} from '../utils/listingGridCardFigma';
import {flexStart} from '../utils/rtlLayout';

const CARD_BG = '#2B2A39';
const TEXT_LIGHT = '#D2D0DC';
const FROZEN_ACTION_BLUE = '#7EB8FF';
const STAT_ICON_COLOR = '#D2D0DC';
const STAT_ICON_OPACITY = 0.92;

const LISTING_STAT_ICONS = {
  views: require('../assets/eye_icon.png'),
  adComment: require('../assets/chat_icon.png'),
};

const STAT_ICON_STYLE = {
  width: 22,
  height: 22,
  opacity: STAT_ICON_OPACITY,
  ...(Platform.OS === 'web' ? {objectFit: 'contain'} : {}),
};

const VIDEO_URL_REGEX = /\.(mp4|mov|webm|m4v|ogg)(\?|$)/i;

const isVideoMediaUrl = url => {
  if (url == null || url === '') return false;
  const s = String(url).trim();
  if (!s) return false;
  if (VIDEO_URL_REGEX.test(s)) return true;
  return /\/videos?\//i.test(s);
};

export const isPostListingRecord = item => {
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
    isOpenHouseListing(item) ||
    item.feed_post === true ||
    item.feed_post === 'true' ||
    item.feed_post === 't' ||
    item.isPostEntry === true
  ) {
    return true;
  }
  const urls = [
    item.main_image_url,
    item.image_url,
    item.image,
    ...(Array.isArray(item.images)
      ? item.images.map(i =>
          i && typeof i === 'object' ? i.uri || i.image_url : i,
        )
      : []),
  ].filter(Boolean);
  return urls.some(u => /post_\d/i.test(String(u)));
};

const getListingVideoUrl = listing => {
  const v0 = listing?.listing_videos?.[0];
  const fromSource = v0?.source_video_url;
  if (fromSource && String(fromSource).trim()) {
    return String(fromSource).trim();
  }
  if (listing?.video_url && String(listing.video_url).trim()) {
    const direct = String(listing.video_url).trim();
    if (!/\.m3u8|stream\.mux\.com/i.test(direct)) return direct;
  }
  const candidates = listingImageUrls(listing).filter(Boolean);
  const legacyVideo = candidates.find(url => isVideoMediaUrl(url));
  return legacyVideo ? String(legacyVideo).trim() : null;
};

const getFirstImage = listing => {
  const urls = listingImageUrls(listing).filter(u => u && !isVideoMediaUrl(u));
  if (urls[0]) return {uri: urls[0]};
  if (listing?.image && !isVideoMediaUrl(listing.image)) {
    return typeof listing.image === 'number'
      ? listing.image
      : {uri: listing.image};
  }
  return null;
};

const getListingEngagementStats = (listing, postRecord) => {
  const views = listing.views ?? listing.view_count ?? 0;
  const likes = postRecord
    ? listing.post_like_count != null
      ? Number(listing.post_like_count)
      : listing.like_count != null
        ? Number(listing.like_count)
        : 0
    : listing.like_count != null
      ? Number(listing.like_count)
      : 0;
  const comments = postRecord
    ? listing.comment_count != null
      ? Number(listing.comment_count)
      : 0
    : listing.review_count != null
      ? Number(listing.review_count)
      : listing.comment_count != null
        ? Number(listing.comment_count)
        : 0;
  return {views, likes, comments};
};

const getListingTypeBadgeLabel = (listing, ownerUser) => {
  if (isPostListingRecord(listing)) {
    return getFeedPostBadgeLabel(listing);
  }
  const cat =
    listing?.category != null ? parseInt(String(listing.category), 10) : NaN;
  if (cat === 7) return 'קרקע';
  if (cat === 5) return 'BNB';
  if (isCompanySubscriptionType(ownerUser?.subscription_type)) return 'פרויקט';
  return 'נכס';
};

export const computeListingExposureLevel = (listing, boostedOverrides = {}) => {
  if (!listing) return 'low';
  const listingId = listing?.id ?? listing?.ad_number;
  const overrideExpiry =
    listingId != null ? boostedOverrides[String(listingId)] : null;
  const expiryRaw =
    overrideExpiry || listing.boost_expires_at || listing.boostExpiresAt;
  if (expiryRaw) {
    const expiryTs = new Date(expiryRaw).getTime();
    if (Number.isFinite(expiryTs) && expiryTs > Date.now()) return 'high';
  }
  const frozen = listing.is_frozen === true || listing.is_frozen === 'true';
  if (frozen) return 'low';
  const createdRaw =
    listing.created_at ||
    listing.createdAt ||
    listing.uploaded_at ||
    listing.uploadedAt ||
    null;
  if (createdRaw) {
    const createdTs = new Date(createdRaw).getTime();
    if (Number.isFinite(createdTs)) {
      const ageDays = (Date.now() - createdTs) / (1000 * 60 * 60 * 24);
      if (ageDays < 7) return 'high';
      if (ageDays < 14) return 'medium';
      return 'low';
    }
  }
  return 'low';
};

const getExposureAsset = exposure => {
  if (exposure === 'high') return require('../assets/edit/high.png');
  if (exposure === 'medium') return require('../assets/exposure-medium.png');
  return require('../assets/exposure-low.png');
};

const ListingStatsRow = ({listing, postRecord, textStyle}) => {
  const {views, likes, comments} = getListingEngagementStats(
    listing,
    postRecord,
  );
  const statTextStyle = textStyle ? [styles.statText, textStyle] : styles.statText;
  return (
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <Image source={LISTING_STAT_ICONS.views} style={STAT_ICON_STYLE} resizeMode="contain" />
        <Text style={statTextStyle}>{views}</Text>
      </View>
      <View style={styles.statItem}>
        <MaterialCommunityIcons
          name="heart-outline"
          size={22}
          color={STAT_ICON_COLOR}
          style={{opacity: STAT_ICON_OPACITY}}
        />
        <Text style={statTextStyle}>{likes}</Text>
      </View>
      <View style={styles.statItem}>
        <Image source={LISTING_STAT_ICONS.adComment} style={STAT_ICON_STYLE} resizeMode="contain" />
        <Text style={statTextStyle}>{comments}</Text>
      </View>
    </View>
  );
};

const EditPublishListingCard = ({
  listing,
  ordinal,
  ownerUser,
  onEdit,
  onPress,
  exposure = 'low',
  isFrozen = false,
  canBoost = true,
  onBoostPress,
  onFreezePress,
  onRemovePress,
  variant = 'grid',
}) => {
  const postRecord = isPostListingRecord(listing);
  const compact = variant === 'list';

  const renderListingMedia = (imageStyle, wrapStyle) => {
    const videoUrl = getListingVideoUrl(listing);
    if (videoUrl) {
      return (
        <VideoPreviewThumb
          uri={videoUrl}
          style={[wrapStyle || styles.adImageWrap, {borderRadius: 0}]}
          videoStyle={imageStyle || styles.adImage}
        />
      );
    }
    const imageSource = getFirstImage(listing);
    if (imageSource) {
      return (
        <Image
          source={imageSource}
          style={imageStyle || styles.adImage}
          resizeMode="cover"
        />
      );
    }
    return (
      <View
        style={[
          imageStyle || styles.adImage,
          styles.adImagePlaceholder,
        ]}>
        <MaterialCommunityIcons name="image-off" size={48} color={TEXT_LIGHT} />
      </View>
    );
  };

  const renderActionRow = (compactActions = false) => (
    <View style={[styles.actionRow, compactActions && styles.actionRowList]}>
      <TouchableOpacity
        style={[styles.actionBtn, !canBoost && styles.actionBtnDisabled]}
        onPress={e => {
          e?.stopPropagation?.();
          onBoostPress?.(listing);
        }}
        disabled={!canBoost}
        activeOpacity={0.8}>
        {!compactActions ? (
          <Text style={styles.actionBtnText}>הקפצה</Text>
        ) : null}
        <Image
          source={require('../assets/arrow_up.png')}
          style={styles.actionBtnImage}
          resizeMode="contain"
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={e => {
          e?.stopPropagation?.();
          onFreezePress?.(listing);
        }}
        activeOpacity={0.8}>
        {!compactActions ? (
          <Text
            style={[
              styles.actionBtnText,
              isFrozen && styles.actionBtnFrozenText,
            ]}>
            {isFrozen ? 'הוקפאה' : 'הקפאה'}
          </Text>
        ) : isFrozen ? (
          <Text
            style={[
              styles.actionBtnTextList,
              styles.actionBtnFrozenText,
            ]}>
            הוקפאה
          </Text>
        ) : null}
        <Image
          source={require('../assets/freeze.png')}
          style={[
            styles.actionBtnImage,
            isFrozen && styles.actionBtnFrozenIcon,
          ]}
          resizeMode="contain"
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={e => {
          e?.stopPropagation?.();
          onRemovePress?.(listing);
        }}
        activeOpacity={0.8}>
        {!compactActions ? (
          <Text style={styles.actionBtnText}>הסרה</Text>
        ) : null}
        <Image
          source={require('../assets/close.png')}
          style={styles.actionBtnImage}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.adCardList}
        activeOpacity={onPress ? 0.9 : 1}
        onPress={onPress}
        disabled={!onPress}>
        <View style={styles.adCardListBody}>
          <View style={styles.adCardListLeft}>
            <Image
              source={getExposureAsset(exposure)}
              style={[
                styles.exposureImage,
                exposure === 'high' && styles.exposureImageHigh,
              ]}
              resizeMode="contain"
            />
            <View style={styles.adCardListTextCol}>
              <Text style={styles.adCardListDescription} numberOfLines={2}>
                {postRecord
                  ? getFeedPostCardCaption(listing)
                  : listing.description || '—'}
              </Text>
              <ListingStatsRow
                listing={listing}
                postRecord={postRecord}
                textStyle={styles.statTextList}
              />
            </View>
          </View>
          {renderActionRow(true)}
        </View>
        <View style={styles.adCardListRight}>
          {renderListingMedia(styles.adCardListImage, styles.adCardListImageWrap)}
          <View style={styles.topRightTextWrap}>
            <Text style={styles.topRightText}>
              {getListingTypeBadgeLabel(listing, ownerUser)}
            </Text>
          </View>
          {onEdit ? (
            <TouchableOpacity
              style={styles.editBadgeList}
              onPress={e => {
                e?.stopPropagation?.();
                onEdit(listing);
              }}
              activeOpacity={0.8}>
              <Octicons name="pencil" size={25} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.adCard}
      activeOpacity={onPress ? 0.9 : 1}
      onPress={onPress}
      disabled={!onPress}>
      <View style={styles.adImageWrap}>
        {renderListingMedia()}
        {onEdit ? (
          <TouchableOpacity
            style={styles.editBadge}
            onPress={e => {
              e?.stopPropagation?.();
              onEdit(listing);
            }}
            activeOpacity={0.8}>
            <Octicons name="pencil" size={25} color="#fff" />
          </TouchableOpacity>
        ) : null}
        <View style={styles.topRightTextWrap}>
          <Text style={styles.topRightText}>
            {getListingTypeBadgeLabel(listing, ownerUser)}
          </Text>
        </View>
        <View style={styles.advertisementNo}>
          <Text style={styles.advertisementNoText}>
            {postRecord ? `פוסט מס׳ ${ordinal}` : `מודעה מס׳ ${ordinal}`}
          </Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.adBodyRow}>
          <Image
            source={getExposureAsset(exposure)}
            style={[
              styles.exposureImage,
              exposure === 'high' && styles.exposureImageHigh,
            ]}
            resizeMode="contain"
          />
          <View style={styles.adBodyTextCol}>
            <Text style={styles.adDescription} numberOfLines={postRecord ? 3 : 2}>
              {postRecord
                ? getFeedPostCardCaption(listing)
                : listing.description || '—'}
            </Text>
            {!postRecord ? (
              <ListingStatsRow listing={listing} postRecord={false} />
            ) : null}
          </View>
        </View>

        {renderActionRow(false)}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  adCard: {
    width: Dimensions.get('window').width * 0.88,
    alignSelf: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 24,
  },
  adImageWrap: {
    position: 'relative',
    width: '100%',
    height: 230,
    overflow: 'hidden',
  },
  adImage: {width: '100%', height: '100%'},
  adImagePlaceholder: {
    backgroundColor: '#1e1d2b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2B2A39',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  topRightTextWrap: {
    position: 'absolute',
    left: 12,
    top: 12,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  topRightText: {
    color: '#1E1D27',
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
  },
  advertisementNo: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#1E1D27CC',
    height: 30,
    justifyContent: 'center',
    alignItems: flexStart,
    paddingRight: 12,
  },
  advertisementNoText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
  },
  cardBody: {padding: 16},
  adBodyRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  adBodyTextCol: {flex: 1},
  adDescription: {
    color: '#fff',
    fontSize: 26,
    fontFamily: 'Rubik-SemiBold',
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 16,
    marginRight: 10,
    justifyContent: flexStart,
    position: 'absolute',
    bottom: 5,
    left: 0,
  },
  statItem: {flexDirection: 'row', alignItems: 'center', gap: 6},
  statText: {
    color: TEXT_LIGHT,
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
  },
  exposureImage: {width: 45, height: 101},
  exposureImageHigh: {width: 56, height: 126},
  actionRow: {
    flexDirection: 'row-reverse',
    marginTop: 22,
    gap: 4,
  },
  actionBtnImage: {width: 22, height: 22},
  actionBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4D4966',
    paddingVertical: 10,
    borderRadius: 18,
  },
  actionBtnDisabled: {opacity: 0.45},
  actionBtnFrozenIcon: {tintColor: FROZEN_ACTION_BLUE},
  actionBtnFrozenText: {color: FROZEN_ACTION_BLUE},
  actionBtnText: {color: '#fff', fontSize: 16, fontFamily: 'Rubik-Regular'},
  actionBtnTextList: {color: TEXT_LIGHT, fontSize: 12},
  actionRowList: {marginTop: 16},
  adCardList: {
    width: Dimensions.get('window').width * 0.88,
    alignSelf: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row-reverse',
    height: 192,
    marginBottom: 22,
  },
  adCardListBody: {
    flex: 1,
    padding: 14,
  },
  adCardListLeft: {
    flex: 1,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  adCardListTextCol: {flex: 1},
  adCardListDescription: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  adCardListRight: {
    width: 108,
    height: '100%',
    position: 'relative',
  },
  adCardListImageWrap: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  adCardListImage: {
    width: '100%',
    height: '100%',
  },
  editBadgeList: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2B2A39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextList: {fontSize: 14},
});

export default EditPublishListingCard;
