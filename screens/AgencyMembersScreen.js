import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors} from '../constants/styles';
import {
  createAgencyMemberReplacementCode,
  getAgencyMembers,
} from '../utils/api';
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
  const [replacementMember, setReplacementMember] = useState(null);
  const [replacementCode, setReplacementCode] = useState('');
  const [replacementExpiresAt, setReplacementExpiresAt] = useState(null);
  const [replacementLoading, setReplacementLoading] = useState(false);
  const [replacementError, setReplacementError] = useState(null);
  const [copied, setCopied] = useState(false);

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

  const closeReplacementModal = () => {
    if (replacementLoading) return;
    setReplacementMember(null);
    setReplacementCode('');
    setReplacementExpiresAt(null);
    setReplacementError(null);
    setCopied(false);
  };

  const openReplacementCode = async member => {
    if (!member?.id || replacementLoading) return;
    setReplacementMember(member);
    setReplacementCode('');
    setReplacementExpiresAt(null);
    setReplacementError(null);
    setCopied(false);
    setReplacementLoading(true);
    try {
      const res = await createAgencyMemberReplacementCode(
        currentUser,
        member.id,
      );
      setReplacementCode(String(res?.code || ''));
      setReplacementExpiresAt(res?.expires_at || null);
    } catch (e) {
      setReplacementError(e?.message || 'יצירת קוד ההחלפה נכשלה');
    } finally {
      setReplacementLoading(false);
    }
  };

  const copyReplacementCode = async () => {
    if (!replacementCode) return;
    await Clipboard.setStringAsync(replacementCode);
    setCopied(true);
  };

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
              <TouchableOpacity
                onPress={event => {
                  event?.stopPropagation?.();
                  openReplacementCode(member);
                }}
                activeOpacity={0.85}
                style={styles.replaceButtonWrap}
                accessibilityRole="button"
                accessibilityLabel={`החלף את ${memberDisplayName(member)}`}>
                <LinearGradient
                  colors={['#FFE56A', '#F7C63A', '#E5A80F']}
                  locations={[0.0456, 0.5076, 0.8831]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.replaceButtonGradient}>
                  <Text style={styles.replaceButtonText}>החלף</Text>
                </LinearGradient>
              </TouchableOpacity>
              <MaterialCommunityIcons
                name="chevron-left"
                size={24}
                color="rgba(255,255,255,0.5)"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal
        visible={replacementMember != null}
        transparent
        animationType="fade"
        onRequestClose={closeReplacementModal}>
        <Pressable style={styles.modalOverlay} onPress={closeReplacementModal}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>החלפת משווק</Text>
            <Text style={styles.modalMemberName}>
              {memberDisplayName(replacementMember)}
            </Text>
            {replacementLoading ? (
              <ActivityIndicator
                color="#FFBF3E"
                size="large"
                style={styles.modalLoader}
              />
            ) : replacementError ? (
              <>
                <Text style={styles.modalError}>{replacementError}</Text>
                <TouchableOpacity
                  onPress={() => openReplacementCode(replacementMember)}
                  style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>נסה שוב</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalExplanation}>
                  מסרו את הקוד למשווק החדש. הוא יזין אותו במסך ההצטרפות
                  לסוכנות. הקוד חד־פעמי ותקף ל־24 שעות.
                </Text>
                <Text style={styles.replacementCode}>{replacementCode}</Text>
                <TouchableOpacity
                  onPress={copyReplacementCode}
                  activeOpacity={0.85}
                  style={styles.copyButton}>
                  <MaterialCommunityIcons
                    name={copied ? 'check' : 'content-copy'}
                    size={18}
                    color="#1E1D27"
                  />
                  <Text style={styles.copyButtonText}>
                    {copied ? 'הקוד הועתק' : 'העתק קוד'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.modalWarning}>
                  לאחר השימוש בקוד, הכניסה של המשווק הקודם תבוטל. המודעות,
                  הפוסטים, הסיפורים והשיחות יישארו בחשבון ויעברו למשווק החדש.
                </Text>
                {replacementExpiresAt ? (
                  <Text style={styles.expiryText}>תוקף: 24 שעות</Text>
                ) : null}
              </>
            )}
            <TouchableOpacity
              onPress={closeReplacementModal}
              disabled={replacementLoading}
              style={styles.closeModalButton}>
              <Text style={styles.closeModalText}>סגור</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  replaceButtonWrap: {
    borderRadius: 1000,
    overflow: 'hidden',
    flexShrink: 0,
  },
  replaceButtonGradient: {
    minWidth: 58,
    minHeight: 30,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replaceButtonText: {
    color: '#1E1D27',
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.54,
    fontFamily: 'Rubik-Medium',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 20,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: 'rgba(254,231,135,0.55)',
    padding: 22,
    alignItems: 'center',
  },
  modalTitle: {
    color: Colors.white100,
    fontSize: 21,
    fontFamily: 'Rubik-SemiBold',
    writingDirection: 'rtl',
  },
  modalMemberName: {
    color: '#FEE787',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    marginTop: 5,
    writingDirection: 'rtl',
  },
  modalExplanation: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 18,
  },
  replacementCode: {
    color: Colors.white100,
    fontSize: 29,
    letterSpacing: 5,
    fontFamily: 'Rubik-SemiBold',
    marginVertical: 18,
  },
  copyButton: {
    minHeight: 42,
    borderRadius: 21,
    paddingHorizontal: 18,
    backgroundColor: '#FFBF3E',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  copyButtonText: {
    color: '#1E1D27',
    fontSize: 15,
    fontFamily: 'Rubik-Medium',
  },
  modalWarning: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 18,
  },
  expiryText: {
    color: '#FEE787',
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
    marginTop: 8,
  },
  closeModalButton: {paddingHorizontal: 20, paddingTop: 20, paddingBottom: 2},
  closeModalText: {
    color: Colors.white100,
    fontSize: 15,
    fontFamily: 'Rubik-Medium',
  },
  modalLoader: {marginVertical: 35},
  modalError: {
    color: '#FFD9D9',
    fontSize: 14,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginVertical: 22,
  },
  retryButton: {
    backgroundColor: '#4D4966',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  retryButtonText: {color: Colors.white100, fontFamily: 'Rubik-Medium'},
});

export default AgencyMembersScreen;
