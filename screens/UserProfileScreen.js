import React from 'react';
import {
  View,
  ScrollView,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Colors} from '../constants/styles';

const TEAL = '#2DD4BF';
const GOLD = '#ffc40a';
const CARD_BG = '#252436';
const {width: SCREEN_WIDTH} = Dimensions.get('window');
const GRID_GAP = 8;
const GRID_COLS = 3;
const TILE_SIZE = (SCREEN_WIDTH - GRID_GAP * (GRID_COLS - 1) - 32) / GRID_COLS;

const UserProfileScreen = ({
  onClose,
  onCall,
  onMessage,
  user = null,
}) => {
  const profile = user || {
    name: 'דוד לוי מתווך נדל"ן',
    email: 'davidlevi@gmail.com',
    profileImageUrl: null,
    likes: 246,
    following: 257,
    followers: 626,
    location: 'תל אביב, אבן גבירול 104',
    specialties: [
      {id: 'realestate', label: 'נדל"ן', selected: true},
      {id: 'contracts', label: 'חוזים וקרקעות', selected: false},
      {id: 'groups', label: 'קבוצות רכישה', selected: false},
    ],
    description:
      'מתווך מומחה בתחום הנדל"ן עם ניסיון רב של 15 שנה בליווי עסקאות מורכבות. מתמחה בליווי קבוצות של רכישת דירות, משכנתאות, יזמות ודיני תכנון ובניה. מספק שירות אישי ומקצועי תוך דגש על הבנה מעמיקה של השוק הישראלי בכל הקשור לנדל"ן.',
    properties: [
      {id: '1', image: null, status: 'למכירה', price: '₪1,400,000', address: 'תל אביב, רוטשילד 54'},
      {id: '2', image: null, status: 'להשכרה', price: '₪5,000', address: 'תל אביב, דיזנגוף 100'},
      {id: '3', image: null, status: 'למכירה', price: '₪2,100,000', address: 'תל אביב, בן יהודה 12'},
    ],
  };

  // Prefer API creator name (company name, broker office, agent name by registration type)
  const displayName = user?.creator_name || user?.name || user?.agent_name || user?.contact_person_name || user?.business_name || user?.broker_office_name || profile.name;
  const displayEmail = user?.email || user?.creator_email || profile.email;
  const displayImage = user?.profile_image_url || user?.profileImageUrl || profile.profileImageUrl;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileBlock}>
          <View style={styles.avatarWrap}>
            {displayImage ? (
              <Image source={{uri: displayImage}} style={styles.avatar} resizeMode="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <MaterialCommunityIcons name="account" size={48} color="rgba(255,255,255,0.6)" />
              </View>
            )}
            <View style={styles.avatarBadge}>
              <MaterialCommunityIcons name="plus" size={16} color="#000" />
            </View>
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{displayEmail}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{profile.likes ?? 0}</Text>
              <Text style={styles.statLabel}>לייקים</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{profile.following ?? 0}</Text>
              <Text style={styles.statLabel}>עוקב</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{profile.followers ?? 0}</Text>
              <Text style={styles.statLabel}>עוקבים</Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onCall?.()} activeOpacity={0.8}>
              <MaterialCommunityIcons name="phone-in-talk" size={22} color="#fff" />
              <Text style={styles.actionBtnText}>חייג</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onMessage?.()} activeOpacity={0.8}>
              <MaterialCommunityIcons name="message-text" size={22} color="#fff" />
              <Text style={styles.actionBtnText}>הודעה</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.gridWrap}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <View key={i} style={[styles.gridTile, {width: TILE_SIZE, height: TILE_SIZE}]}>
              <View style={styles.gridTilePlaceholder}>
                <MaterialCommunityIcons name="image-outline" size={32} color="rgba(255,255,255,0.3)" />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.detailsBlock}>
          <View style={styles.piBadge}>
            <MaterialCommunityIcons name="star" size={24} color={GOLD} />
            <Text style={styles.piBadgeText}>5 Pi</Text>
          </View>
          <Text style={styles.detailName}>{displayName}</Text>
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker" size={18} color={Colors.grey200} />
            <Text style={styles.locationText}>{profile.location}</Text>
          </View>
          <View style={styles.specialtiesRow}>
            {profile.specialties?.map(s => (
              <TouchableOpacity
                key={s.id}
                style={[styles.specialtyChip, s.selected && styles.specialtyChipSelected]}
                activeOpacity={0.8}>
                <Text style={[styles.specialtyText, s.selected && styles.specialtyTextSelected]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.description}>{profile.description}</Text>
        </View>

        <View style={styles.propertiesBlock}>
          <View style={styles.propertiesHeader}>
            <Text style={styles.propertiesTitle}>הנכסים שלי</Text>
            <TouchableOpacity activeOpacity={0.8}>
              <Text style={styles.propertiesLink}>לכל הנכסים שלי</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.propertiesScroll}>
            {profile.properties?.map(p => (
              <TouchableOpacity key={p.id} style={styles.propertyCard} activeOpacity={0.9}>
                <View style={[styles.propertyImageWrap, !p.image && styles.propertyImagePlaceholder]}>
                  {p.image ? (
                    <Image source={{uri: p.image}} style={styles.propertyImage} resizeMode="cover" />
                  ) : (
                    <MaterialCommunityIcons name="home" size={40} color="rgba(255,255,255,0.3)" />
                  )}
                </View>
                <View style={styles.propertyStatusWrap}>
                  <Text style={styles.propertyStatus}>{p.status}</Text>
                </View>
                <Text style={styles.propertyPrice}>{p.price}</Text>
                <Text style={styles.propertyAddress}>{p.address}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.mainDeepBlue},
  scroll: {flex: 1},
  scrollContent: {paddingBottom: 40},
  header: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 8},
  backBtn: { padding: 4, minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  profileBlock: {alignItems: 'center', paddingHorizontal: 24, paddingBottom: 24},
  avatarWrap: {position: 'relative', marginBottom: 12},
  avatar: {width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: GOLD},
  avatarPlaceholder: {backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center'},
  avatarBadge: {position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center'},
  userName: {color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 4},
  userEmail: {color: Colors.grey200, fontSize: 14, marginBottom: 16},
  statsRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32, marginBottom: 20},
  stat: {alignItems: 'center'},
  statNumber: {color: '#fff', fontSize: 18, fontWeight: '700'},
  statLabel: {color: Colors.grey200, fontSize: 12, marginTop: 2},
  actionRow: {flexDirection: 'row', alignItems: 'center', gap: 16},
  actionBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: TEAL, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, minWidth: 120},
  actionBtnText: {color: '#fff', fontSize: 16, fontWeight: '600'},
  gridWrap: {flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: GRID_GAP, marginBottom: 24},
  gridTile: {borderRadius: 12, overflow: 'hidden'},
  gridTilePlaceholder: {flex: 1, backgroundColor: CARD_BG, alignItems: 'center', justifyContent: 'center'},
  detailsBlock: {paddingHorizontal: 20, marginBottom: 24},
  piBadge: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8},
  piBadgeText: {color: GOLD, fontSize: 16, fontWeight: '600'},
  detailName: {color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 6},
  locationRow: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12},
  locationText: {color: Colors.grey200, fontSize: 14},
  specialtiesRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14},
  specialtyChip: {paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'},
  specialtyChipSelected: {backgroundColor: '#fff', borderColor: '#fff'},
  specialtyText: {color: '#fff', fontSize: 14},
  specialtyTextSelected: {color: '#000'},
  description: {color: '#fff', fontSize: 14, lineHeight: 22},
  propertiesBlock: {paddingHorizontal: 16},
  propertiesHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12},
  propertiesTitle: {color: '#fff', fontSize: 18, fontWeight: '700'},
  propertiesLink: {color: TEAL, fontSize: 14},
  propertiesScroll: {gap: 12, paddingRight: 16},
  propertyCard: {width: 180, backgroundColor: CARD_BG, borderRadius: 12, overflow: 'hidden'},
  propertyImageWrap: {width: '100%', height: 110},
  propertyImagePlaceholder: {backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center'},
  propertyImage: {width: '100%', height: '100%'},
  propertyStatusWrap: {position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12},
  propertyStatus: {color: '#fff', fontSize: 12},
  propertyPrice: {color: '#fff', fontSize: 16, fontWeight: '700', paddingHorizontal: 12, paddingTop: 10},
  propertyAddress: {color: Colors.grey200, fontSize: 12, paddingHorizontal: 12, paddingBottom: 12},
});

export default UserProfileScreen;
