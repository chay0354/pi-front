import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors} from '../constants/styles';
import {getAgencyMembers} from '../utils/api';
import {getUserProfileImageUrl} from '../utils/userProfileImage';
import ProfileAvatar from '../components/ProfileAvatar';
import {agencyMemberDisplayName, safeAgencyDisplayText} from '../utils/agencyMemberDisplay';
import {hebrewTextAlign} from '../utils/rtlLayout';

const BLUE_100 = '#1e1d27';
const CARD_BG = '#2b2a39';

const memberDisplayName = agencyMemberDisplayName;

/** ניהול משווקים — marketers under the signed-in marketing manager. */
const AgencyMembersScreen = ({onClose, currentUser, onOpenMember}) => {
  const insets = useSafeAreaInsets();
  const [members, setMembers] = useState([]);
  const [seatLimit, setSeatLimit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!currentUser) return;
    setError(null);
    try {
      const res = await getAgencyMembers(currentUser);
      setMembers(Array.isArray(res?.members) ? res.members : []);
      setSeatLimit(res?.seatLimit ?? null);
    } catch (e) {
      setError(e?.message || 'טעינת המשווקים נכשלה');
    }
  }, [currentUser]);

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

  return (
    <View style={[styles.root, {paddingTop: Math.max(insets.top, 12)}]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="חזור"
          hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={26}
            color={Colors.white100}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ניהול משווקים</Text>
        <View style={styles.headerSpacer} />
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
          {Number.isFinite(Number(seatLimit)) && Number(seatLimit) > 0 ? (
            <Text style={styles.seatsLine}>
              {members.length} מתוך {Number(seatLimit)} משתמשים
            </Text>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {!error && members.length === 0 ? (
            <Text style={styles.emptyText}>
              עדיין אין משווקים בסוכנות. צרו קוד הצטרפות ושתפו אותו עם הצוות.
            </Text>
          ) : null}

          {members.map(member => (
            <TouchableOpacity
              key={member.id}
              activeOpacity={0.85}
              style={styles.memberRow}
              onPress={() => onOpenMember?.(member)}>
              <ProfileAvatar
                uri={getUserProfileImageUrl(member)}
                name={memberDisplayName(member)}
                size={46}
                subscriptionType={member?.subscription_type}
              />
              <View style={styles.memberTexts}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {memberDisplayName(member)}
                </Text>
                <Text style={styles.memberEmail} numberOfLines={1}>
                  {safeAgencyDisplayText(member?.email)}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-left"
                size={24}
                color="rgba(255,255,255,0.5)"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: BLUE_100},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  backButton: {padding: 4},
  headerTitle: {
    flex: 1,
    color: Colors.white100,
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  headerSpacer: {width: 34},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  content: {paddingHorizontal: 16},
  seatsLine: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontFamily: 'Rubik-Regular',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    marginBottom: 12,
  },
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
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    marginTop: 24,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  memberTexts: {flex: 1},
  memberName: {
    color: Colors.white100,
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
  },
  memberEmail: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontFamily: 'Rubik-Regular',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    marginTop: 2,
  },
});

export default AgencyMembersScreen;
