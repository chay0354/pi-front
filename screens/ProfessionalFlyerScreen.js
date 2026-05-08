import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {getReviews, submitReview} from '../utils/api';
import RatingImprovePicker from '../components/RatingImprovePicker';

const imgBack = 'https://www.figma.com/api/mcp/asset/a65e2691-fd86-48b9-9865-87c80bdc1758';
const imgShare = 'https://www.figma.com/api/mcp/asset/ce257c8c-ba69-4114-85be-89c8f9f942a1';
const imgSound = 'https://www.figma.com/api/mcp/asset/5b0b3bca-8006-442f-9e15-94f7697a6831';
const imgPin = 'https://www.figma.com/api/mcp/asset/9a509ed0-fd67-4a15-9cc6-2d22c3716581';
const imgPinInner = 'https://www.figma.com/api/mcp/asset/820a6c25-c547-4246-ba2b-79bb1f6c8ae5';
const imgCopy = 'https://www.figma.com/api/mcp/asset/cb70a2ec-3bea-4171-93c6-ab84cd2b04c1';
const imgMail = 'https://www.figma.com/api/mcp/asset/3ddf6b79-5608-4233-8578-e5f708f27f2a';
const imgPhone = 'https://www.figma.com/api/mcp/asset/bc16af83-a1b8-4bdf-b71b-5f103e8b69da';
const imgReport = 'https://www.figma.com/api/mcp/asset/e4b1e73d-863e-4986-a69f-07957bdb756a';
const imgChatBadge = 'https://www.figma.com/api/mcp/asset/280b12e8-92d9-4c49-a5aa-265286008994';
const imgCallWhite = 'https://www.figma.com/api/mcp/asset/9b9c4fea-832d-4ec7-8670-5539e677e104';
const imgRatingFive = 'https://www.figma.com/api/mcp/asset/6c9fb3d5-d761-41d4-865b-0306074701f3';
const imgRatingOne = 'https://www.figma.com/api/mcp/asset/c17ace7a-d891-430d-9a02-cd97ff0196cc';
const fallbackExpertImage = require('../assets/image-7.png');

const collectPhones = professional =>
  [
    professional?.phone,
    professional?.phone_number,
    professional?.contact_phone,
    professional?.business_phone,
    professional?.mobile_phone,
  ]
    .map(v => String(v || '').trim())
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 2);

const collectTags = professional =>
  [
    ...(Array.isArray(professional?.specializations) ? professional.specializations : []),
    ...(Array.isArray(professional?.types) ? professional.types : []),
  ]
    .map(v => String(v || '').trim())
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 6);

const formatReviewDate = value => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', {month: 'short'});
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const getReviewerName = currentUser =>
  String(
    currentUser?.name ||
      currentUser?.contact_person_name ||
      currentUser?.business_name ||
      currentUser?.broker_office_name ||
      'משתמש',
  ).trim();

const getReviewerImage = currentUser =>
  String(
    currentUser?.profile_picture_url || currentUser?.company_logo_url || '',
  ).trim() || null;

const RatingBadge = ({value = 5, compact = false}) => {
  const safeValue = Math.max(1, Math.min(5, Number(value) || 5));
  return (
    <View style={compact ? styles.ratingBadgeCompactWrap : styles.ratingBadgeWrap}>
      <Image
        source={{uri: safeValue === 1 ? imgRatingOne : imgRatingFive}}
        style={compact ? styles.ratingBadgeCompactImage : styles.ratingBadgeImage}
        resizeMode="contain"
      />
      <Text style={compact ? styles.ratingBadgeCompactText : styles.ratingBadgeText}>
        {safeValue}
      </Text>
    </View>
  );
};

const ProfessionalFlyerScreen = ({
  onClose,
  onMessage,
  onCall,
  professional,
  currentUser,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const subscriptionId = String(
    professional?.subscription_id || professional?.id || professional?.owner_id || '',
  ).trim();
  const title = String(
    professional?.display_name || professional?.name || professional?.contact_person_name || 'בעל מקצוע',
  ).trim();
  const address = String(professional?.address || 'מיקום לא זמין').trim();
  const description = String(professional?.bio || professional?.description || 'אין תיאור').trim();
  const heroImage = String(
    professional?.profile_image_url || professional?.profile_picture_url || '',
  ).trim();
  const email = String(professional?.email || '').trim();
  const phones = useMemo(() => collectPhones(professional), [professional]);
  const tags = useMemo(() => collectTags(professional), [professional]);

  const averageRating = useMemo(() => {
    if (!Array.isArray(reviews) || reviews.length === 0) {
      return Math.max(1, Math.min(5, Math.round(Number(professional?.average_rating) || 5)));
    }
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const avg = Math.round(sum / reviews.length);
    return Math.max(1, Math.min(5, avg || 5));
  }, [reviews, professional?.average_rating]);

  useEffect(() => {
    let cancelled = false;
    const loadReviews = async () => {
      setReviewsLoading(true);
      const result = await getReviews(subscriptionId);
      if (!cancelled) {
        setReviews(Array.isArray(result?.reviews) ? result.reviews : []);
        setReviewsLoading(false);
      }
    };
    loadReviews();
    return () => {
      cancelled = true;
    };
  }, [subscriptionId]);

  const copyContact = () => {
    const text = [title, ...phones, email].filter(Boolean).join('\n');
    Alert.alert('פרטי התקשרות', text || 'אין פרטי התקשרות');
  };

  const submitRating = async () => {
    if (!currentUser) {
      Alert.alert('נדרשת התחברות', 'יש להתחבר כדי לדרג משתמשים');
      return;
    }
    if (selectedRating < 1 || selectedRating > 5) {
      Alert.alert('בחר דירוג', 'נא לבחור כוכבים (1–5) לפני שליחה.');
      return;
    }
    if (!subscriptionId) return;
    setSubmitLoading(true);
    const reviewerSubscriptionId = String(currentUser?.id || '').trim() || null;
    const res = await submitReview(
      subscriptionId,
      selectedRating,
      reviewComment,
      getReviewerName(currentUser),
      getReviewerImage(currentUser),
      reviewerSubscriptionId,
    );
    setSubmitLoading(false);
    if (!res?.success) {
      Alert.alert('שגיאה', res?.error || 'לא ניתן היה לשלוח דירוג');
      return;
    }
    const refetch = await getReviews(subscriptionId);
    setReviews(Array.isArray(refetch?.reviews) ? refetch.reviews : []);
    setReviewComment('');
    Alert.alert('תודה', 'הדירוג נשלח בהצלחה');
  };

  return (
    <View style={styles.screen}>
      <ScrollView keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, {paddingBottom: 210 + insets.bottom}]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          {heroImage ? (
            <Image source={{uri: heroImage}} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <Image source={fallbackExpertImage} style={styles.heroImage} resizeMode="cover" />
          )}
          <View style={[styles.topButtons, {paddingTop: insets.top + 8}]}>
            <TouchableOpacity style={styles.topIconBtn} onPress={onClose} activeOpacity={0.85}>
              <Image source={{uri: imgBack}} style={styles.topIcon} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topIconBtn} onPress={() => {}} activeOpacity={0.85}>
              <Image source={{uri: imgShare}} style={styles.topIconShare} resizeMode="contain" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.soundBtn} activeOpacity={0.85}>
            <Image source={{uri: imgSound}} style={styles.soundIcon} resizeMode="contain" />
          </TouchableOpacity>
          <View style={styles.heroTimeline} />
        </View>

        <View style={styles.nameSection}>
          <View style={styles.titleRow}>
            <RatingBadge value={averageRating} />
            <Text style={styles.titleText}>{title}</Text>
          </View>
          <View style={styles.addressRow}>
            <Text style={styles.addressText}>{address}</Text>
            <View style={styles.pinWrap}>
              <Image source={{uri: imgPin}} style={styles.pinLayer} resizeMode="contain" />
              <Image source={{uri: imgPinInner}} style={styles.pinLayer} resizeMode="contain" />
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>התמחויות</Text>
          <View style={styles.tagsRow}>
            {tags.length > 0 ? (
              tags.map(tag => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>אין התמחויות</Text>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.descriptionText}>{description}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>פרטי התקשרות</Text>
          <View style={styles.contactLogoWrap}>
            {heroImage ? (
              <Image source={{uri: heroImage}} style={styles.contactLogo} resizeMode="cover" />
            ) : (
              <Image source={fallbackExpertImage} style={styles.contactLogo} resizeMode="cover" />
            )}
          </View>
          <Text style={styles.contactName}>{title}</Text>

          {phones.map(phone => (
            <TouchableOpacity key={phone} style={styles.contactRow} activeOpacity={0.85}>
              <Text style={styles.contactLink}>{phone}</Text>
              <Image source={{uri: imgPhone}} style={styles.contactIcon} resizeMode="contain" />
            </TouchableOpacity>
          ))}
          {email ? (
            <TouchableOpacity style={styles.contactRow} activeOpacity={0.85}>
              <Text style={styles.contactLink}>{email}</Text>
              <Image source={{uri: imgMail}} style={styles.contactIcon} resizeMode="contain" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.copyBtn} onPress={copyContact} activeOpacity={0.85}>
            <Image source={{uri: imgCopy}} style={styles.copyIcon} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitleCenter}>כמה כוכבי פאי היית נותן על השירות שקיבלת?</Text>
          <RatingImprovePicker
            value={selectedRating}
            onChange={setSelectedRating}
            style={{marginBottom: 24}}
          />
          <TouchableOpacity onPress={submitRating} activeOpacity={0.85} disabled={submitLoading}>
            <LinearGradient
              colors={['#FEE787', '#BD9947', '#9C6522']}
              locations={[0.0456, 0.5076, 0.8831]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.rateBtn}>
              <Text style={styles.rateBtnText}>{submitLoading ? 'שולח...' : 'דרג'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.sectionTitleCenter}>ביקורות</Text>
          <TextInput
            style={styles.reviewInput}
            value={reviewComment}
            onChangeText={setReviewComment}
            placeholder="הוסף ביקורת"
            placeholderTextColor="rgba(255,255,255,0.35)"
            textAlign="right"
          />

          {reviewsLoading ? (
            <Text style={styles.emptyText}>טוען ביקורות...</Text>
          ) : reviews.length === 0 ? (
            <Text style={styles.emptyText}>אין עדיין ביקורות</Text>
          ) : (
            reviews.map(r => (
              <View key={r.id || `${r.created_at}-${r.reviewer_name}`} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewMeta}>
                    <Text style={styles.reviewName}>{r.reviewer_name || 'משתמש'}</Text>
                    <Text style={styles.reviewDate}>{formatReviewDate(r.created_at)}</Text>
                  </View>
                  <View style={styles.reviewAvatarWrap}>
                    {r.reviewer_image_url ? (
                      <Image source={{uri: r.reviewer_image_url}} style={styles.reviewAvatar} resizeMode="cover" />
                    ) : (
                      <Image source={fallbackExpertImage} style={styles.reviewAvatar} resizeMode="cover" />
                    )}
                    <RatingBadge value={Number(r.rating) || 5} compact />
                  </View>
                </View>
                {r.comment ? <Text style={styles.reviewBody}>{r.comment}</Text> : null}
              </View>
            ))
          )}
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.reportBtn} onPress={() => Alert.alert('דיווח', 'הדיווח נשלח')}>
          <Text style={styles.reportText}>דווח</Text>
          <Image source={{uri: imgReport}} style={styles.reportIcon} resizeMode="contain" />
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.bottomCtas, {paddingBottom: Math.max(9, insets.bottom)}]}>
        <TouchableOpacity onPress={onMessage} activeOpacity={0.85}>
          <LinearGradient
            colors={['#FEE787', '#BD9947', '#9C6522']}
            locations={[0.0456, 0.5076, 0.8831]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.ctaGold}>
            <Image source={{uri: imgChatBadge}} style={styles.chatBadge} resizeMode="contain" />
            <Text style={styles.ctaGoldText}>שליחת הודעה</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onCall?.(phones[0] || '')} activeOpacity={0.85} style={styles.ctaPhone}>
          <Image source={{uri: imgCallWhite}} style={styles.ctaPhoneIcon} resizeMode="contain" />
          <Text style={styles.ctaPhoneText}>{`פנייה בטלפון ${phones[0] || ''}`}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#1E1D27'},
  content: {alignItems: 'center'},
  heroWrap: {width: '100%', height: 380, position: 'relative', overflow: 'hidden'},
  heroImage: {width: '100%', height: '100%'},
  topButtons: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(39,38,47,0.4)',
  },
  topIcon: {width: 11, height: 16},
  topIconShare: {width: 24, height: 24},
  soundBtn: {position: 'absolute', left: 18, bottom: 38, width: 24, height: 24},
  soundIcon: {width: 24, height: 24},
  heroTimeline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: '#FFBA30',
  },
  nameSection: {width: '100%', paddingHorizontal: 24, paddingTop: 24, gap: 6},
  titleRow: {width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  titleText: {
    flex: 1,
    textAlign: 'right',
    color: '#F7F3E6',
    fontSize: 28,
    lineHeight: 31,
    fontFamily: 'Rubik-SemiBold',
    marginLeft: 12,
  },
  ratingBadgeWrap: {width: 47, height: 35, alignItems: 'center', justifyContent: 'center'},
  ratingBadgeImage: {width: 47, height: 35},
  ratingBadgeText: {
    position: 'absolute',
    color: '#1E1D27',
    fontFamily: 'Rubik-Medium',
    fontSize: 20,
    letterSpacing: 0.2,
  },
  ratingBadgeCompactWrap: {width: 30, height: 30, position: 'absolute', left: -6, bottom: -6},
  ratingBadgeCompactImage: {width: 30, height: 30},
  ratingBadgeCompactText: {
    position: 'absolute',
    color: '#1E1D27',
    fontFamily: 'Rubik-Medium',
    fontSize: 14,
    letterSpacing: 0.54,
  },
  addressRow: {flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4},
  addressText: {color: '#FFFFFF', fontSize: 18, lineHeight: 32, fontFamily: 'Rubik-Regular'},
  pinWrap: {width: 24, height: 24},
  pinLayer: {position: 'absolute', width: 24, height: 24},
  divider: {width: 366, height: 1, backgroundColor: '#373548', marginVertical: 24},
  section: {width: '100%', paddingHorizontal: 24, alignItems: 'flex-end'},
  sectionTitle: {color: '#D2D0DC', fontSize: 18, fontFamily: 'Rubik-Regular', marginBottom: 24},
  sectionTitleCenter: {
    width: '100%',
    textAlign: 'right',
    color: '#D2D0DC',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    marginBottom: 24,
  },
  tagsRow: {width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10},
  tagChip: {
    height: 27.143,
    borderWidth: 0.714,
    borderColor: '#FFFFFF',
    borderRadius: 35.714,
    paddingHorizontal: 9.286,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: {color: '#FFFFFF', fontSize: 16, lineHeight: 22, fontFamily: 'Rubik-Regular'},
  emptyText: {width: '100%', color: '#D2D0DC', fontSize: 16, textAlign: 'right', fontFamily: 'Rubik-Regular'},
  descriptionText: {width: '100%', color: '#FFFFFF', fontSize: 18, lineHeight: 32, textAlign: 'right', fontFamily: 'Rubik-Regular'},
  contactLogoWrap: {
    width: 108,
    height: 108,
    borderRadius: 1000,
    borderWidth: 2.56,
    borderColor: '#FFC40A',
    overflow: 'hidden',
    marginBottom: 12,
  },
  contactLogo: {width: '100%', height: '100%'},
  contactName: {color: '#FFFFFF', fontSize: 13.6, marginBottom: 24, fontFamily: 'Rubik-Regular'},
  contactRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginBottom: 10},
  contactLink: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 34,
    textDecorationLine: 'underline',
    fontFamily: 'Rubik-Regular',
  },
  contactIcon: {width: 28, height: 28},
  copyBtn: {position: 'absolute', left: 0, bottom: 34},
  copyIcon: {width: 24, height: 24},
  rateBtn: {width: '100%', height: 44, borderRadius: 846, alignItems: 'center', justifyContent: 'center', marginBottom: 31},
  rateBtnText: {color: '#1E1D27', fontSize: 20, letterSpacing: 0.2, fontFamily: 'Rubik-Medium'},
  reviewInput: {
    width: '100%',
    height: 52,
    borderWidth: 1,
    borderColor: '#8C85B3',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 20,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Regular',
    marginBottom: 31,
  },
  reviewCard: {
    width: '100%',
    backgroundColor: '#2B2A39',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  reviewHeader: {width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
  reviewMeta: {flex: 1, alignItems: 'flex-end'},
  reviewName: {color: '#F7F3E6', fontSize: 18, lineHeight: 24, fontFamily: 'Rubik-Medium'},
  reviewDate: {color: '#D2D0DC', fontSize: 14, lineHeight: 16, letterSpacing: 0.54, fontFamily: 'Rubik-Regular'},
  reviewAvatarWrap: {width: 66, height: 66, borderRadius: 1000, position: 'relative'},
  reviewAvatar: {width: 66, height: 66, borderRadius: 1000},
  reviewBody: {color: '#FFFFFF', fontSize: 18, lineHeight: 32, textAlign: 'right', fontFamily: 'Rubik-Regular'},
  reportBtn: {
    width: 366,
    height: 40,
    borderRadius: 1000,
    backgroundColor: '#4D4966',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  reportText: {color: '#FFFFFF', fontSize: 20, letterSpacing: 0.2, fontFamily: 'Rubik-Medium'},
  reportIcon: {width: 24, height: 24},
  bottomCtas: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1E1D27',
    paddingTop: 24,
    paddingHorizontal: 24,
    gap: 20,
  },
  ctaGold: {
    width: '100%',
    height: 52,
    borderRadius: 1000,
    paddingHorizontal: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaGoldText: {color: '#1E1D27', fontSize: 20, letterSpacing: 0.2, fontFamily: 'Rubik-Medium'},
  chatBadge: {width: 85, height: 38},
  ctaPhone: {
    width: '100%',
    height: 52,
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: '#34F3E0',
    backgroundColor: '#4D4966',
    paddingHorizontal: 24,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaPhoneText: {color: '#FFFFFF', fontSize: 20, letterSpacing: 0.2, fontFamily: 'Rubik-Medium'},
  ctaPhoneIcon: {width: 24, height: 24},
});

export default ProfessionalFlyerScreen;
