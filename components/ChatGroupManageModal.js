import React, {useEffect, useMemo, useState} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Image,
  I18nManager,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {ProfileAvatar} from './ProfileAvatar';
import {DEFAULT_PI_PROFILE_AVATAR} from '../utils/userProfileImage';
import {flexEnd} from '../utils/rtlLayout';

const BG = '#1e1d27';
const GOLD = '#D4AF37';
const NAME_COLOR = '#f7f3e6';
const LABEL = '#d2d0dc';
const WHITE = '#ffffff';
const CARD = '#252436';
const DEFAULT_AVATAR = DEFAULT_PI_PROFILE_AVATAR;

const GROUP_FALLBACK = require('../assets/pi-chat/igroupicon-big.png');

const roleLabel = role => {
  const r = role != null ? String(role).trim().toLowerCase() : '';
  if (r === 'owner') return 'יוצר';
  if (r === 'manager') return 'מנהל';
  return null;
};

/**
 * Full-screen group settings: members, roles, add/remove, leave.
 */
const ChatGroupManageModal = ({
  visible,
  onClose,
  title,
  avatarUri,
  description,
  members,
  myEmail,
  isBrokerUser,
  busy,
  onRefresh,
  onEditDescription,
  onAddMembers,
  onSaveTitle,
  onRemoveMember,
  onSetMemberRole,
  onLeaveGroup,
  onConversationDeleted,
}) => {
  const [titleDraft, setTitleDraft] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);

  useEffect(() => {
    if (visible && title != null) setTitleDraft(String(title).trim());
  }, [visible, title]);

  const myNorm = myEmail ? String(myEmail).trim().toLowerCase() : '';
  const sortedMembers = useMemo(() => {
    const list = Array.isArray(members) ? [...members] : [];
    list.sort((a, b) =>
      String(a?.name || a?.email || '').localeCompare(
        String(b?.name || b?.email || ''),
        'he',
      ),
    );
    return list;
  }, [members]);

  const myMember = sortedMembers.find(
    m =>
      String(m?.email || '')
        .trim()
        .toLowerCase() === myNorm,
  );
  const myRole =
    myMember?.groupRole != null
      ? String(myMember.groupRole).trim().toLowerCase()
      : 'member';

  const canManageOthers =
    isBrokerUser && (myRole === 'owner' || myRole === 'manager');

  const openMemberActions = m => {
    const email = String(m?.email || '')
      .trim()
      .toLowerCase();
    if (!email) return;
    const isSelf = email === myNorm;
    const targetRole =
      m?.groupRole != null
        ? String(m.groupRole).trim().toLowerCase()
        : 'member';
    const name = m?.name || email;

    if (isSelf) {
      Alert.alert(
        name,
        'פעולות עבורך',
        [
          {text: 'ביטול', style: 'cancel'},
          {
            text: 'עזוב את הקבוצה',
            style: 'destructive',
            onPress: () => {
              Alert.alert('לעזוב את הקבוצה?', 'לא תקבל עוד הודעות מצ׳אט זה.', [
                {text: 'ביטול', style: 'cancel'},
                {
                  text: 'עזוב',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const res = await onLeaveGroup?.();
                      if (res?.conversationDeleted) onConversationDeleted?.();
                      else await onRefresh?.();
                    } catch (e) {
                      Alert.alert(
                        '',
                        e?.message ? String(e.message) : 'פעולה נכשלה',
                      );
                    }
                  },
                },
              ]);
            },
          },
        ],
        {cancelable: true},
      );
      return;
    }

    const buttons = [{text: 'ביטול', style: 'cancel'}];

    if (canManageOthers && targetRole !== 'owner') {
      buttons.push({
        text: 'הסר מהקבוצה',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'להסיר מהקבוצה?',
            `${name} לא יוכל/ת להמשיך לצפות בצ׳אט.`,
            [
              {text: 'ביטול', style: 'cancel'},
              {
                text: 'הסר',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await onRemoveMember?.(email);
                    await onRefresh?.();
                  } catch (e) {
                    Alert.alert(
                      '',
                      e?.message ? String(e.message) : 'ההסרה נכשלה',
                    );
                  }
                },
              },
            ],
          );
        },
      });
    }

    if (isBrokerUser && myRole === 'owner' && targetRole !== 'owner') {
      if (targetRole !== 'manager') {
        buttons.push({
          text: 'קדם למנהל',
          onPress: async () => {
            try {
              await onSetMemberRole?.(email, 'manager');
              await onRefresh?.();
            } catch (e) {
              Alert.alert('', e?.message ? String(e.message) : 'עדכון נכשל');
            }
          },
        });
      } else {
        buttons.push({
          text: 'הסר ממנהל',
          onPress: async () => {
            try {
              await onSetMemberRole?.(email, 'member');
              await onRefresh?.();
            } catch (e) {
              Alert.alert('', e?.message ? String(e.message) : 'עדכון נכשל');
            }
          },
        });
      }
    }

    if (buttons.length <= 1) {
      Alert.alert('', 'אין פעולות זמינות עבור משתמש זה');
      return;
    }

    Alert.alert(name, 'בחר פעולה', buttons, {cancelable: true});
  };

  const handleSaveTitle = async () => {
    const next = titleDraft.trim();
    if (!next) {
      Alert.alert('', 'הזן שם לקבוצה');
      return;
    }
    try {
      await onSaveTitle?.(next);
      setEditingTitle(false);
      await onRefresh?.();
    } catch (e) {
      Alert.alert('', e?.message ? String(e.message) : 'שמירה נכשלה');
    }
  };

  const showTitleEditor =
    isBrokerUser && (myRole === 'owner' || myRole === 'manager');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.root}>
          <View style={styles.topNav}>
            <View style={styles.navRow}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.backHit}
                accessibilityRole="button"
                accessibilityLabel="חזור"
                hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
                activeOpacity={0.75}>
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={28}
                  color={WHITE}
                />
              </TouchableOpacity>
              <View style={styles.navTitleSlot}>
                <Text style={styles.navTitle}>ניהול קבוצה</Text>
              </View>
              <View style={styles.navTrailing} />
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
              {avatarUri ? (
                <Image
                  source={{uri: avatarUri}}
                  style={styles.heroAvatar}
                  resizeMode="cover"
                />
              ) : (
                <Image
                  source={GROUP_FALLBACK}
                  style={styles.heroAvatar}
                  resizeMode="contain"
                />
              )}

              {editingTitle && showTitleEditor ? (
                <View style={styles.titleEditBlock}>
                  <TextInput
                    style={[styles.titleInput, {textAlign: 'left'}]}
                    value={titleDraft}
                    onChangeText={setTitleDraft}
                    placeholder="שם הקבוצה"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    maxLength={120}
                  />
                  <View
                    style={[
                      styles.titleEditActions,
                      {justifyContent: flexEnd},
                    ]}>
                    <TouchableOpacity
                      onPress={() => setEditingTitle(false)}
                      style={styles.titleBtnGhost}>
                      <Text style={styles.titleBtnGhostText}>ביטול</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSaveTitle}
                      style={styles.titleBtnGold}
                      disabled={busy}>
                      {busy ? (
                        <ActivityIndicator color={BG} size="small" />
                      ) : (
                        <Text style={styles.titleBtnGoldText}>שמור</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.titleRow}>
                  <Text style={styles.heroTitle} numberOfLines={2}>
                    {titleDraft || title || 'קבוצה'}
                  </Text>
                  {showTitleEditor ? (
                    <TouchableOpacity
                      onPress={() => setEditingTitle(true)}
                      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                      accessibilityRole="button"
                      accessibilityLabel="ערוך שם קבוצה">
                      <MaterialCommunityIcons
                        name="pencil-outline"
                        size={20}
                        color={GOLD}
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}

              <Text style={styles.memberCount}>
                {sortedMembers.length}{' '}
                {sortedMembers.length === 1 ? 'חבר' : 'חברים'}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>תיאור</Text>
              {description ? (
                <Text
                  style={[styles.descText, {textAlign: 'left'}]}
                  numberOfLines={5}>
                  {description}
                </Text>
              ) : (
                <Text style={styles.descEmpty}>אין תיאור לקבוצה</Text>
              )}
              <TouchableOpacity
                style={[styles.linkBtn, {justifyContent: flexEnd}]}
                onPress={onEditDescription}
                activeOpacity={0.75}>
                <Text style={styles.linkBtnText}>
                  {description ? 'ערוך תיאור' : 'הוסף תיאור'}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={20}
                  color={GOLD}
                />
              </TouchableOpacity>
            </View>

            {isBrokerUser ? (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={onAddMembers}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="הוסף חברים לקבוצה">
                <MaterialCommunityIcons
                  name="account-plus-outline"
                  size={22}
                  color={BG}
                />
                <Text style={styles.primaryBtnText}>הוסף חברים</Text>
              </TouchableOpacity>
            ) : null}

            <Text style={[styles.sectionHeading, {textAlign: 'left'}]}>
              חברי הקבוצה
            </Text>
            <View style={styles.memberCard}>
              {sortedMembers.map((m, i) => {
                const email = String(m?.email || '')
                  .trim()
                  .toLowerCase();
                const isSelf = email === myNorm;
                const pic = m?.profileImageUrl || null;
                const display = m?.name || email;
                const rl = roleLabel(m?.groupRole);
                const showMenu =
                  isSelf ||
                  (canManageOthers &&
                    String(m?.groupRole || '').toLowerCase() !== 'owner') ||
                  (isBrokerUser && myRole === 'owner' && !isSelf);

                return (
                  <TouchableOpacity
                    key={email || `m-${i}`}
                    style={[styles.memberRow, i > 0 && styles.memberRowBorder]}
                    onPress={() => (showMenu ? openMemberActions(m) : null)}
                    activeOpacity={showMenu ? 0.7 : 1}
                    disabled={!showMenu}>
                    <ProfileAvatar
                      uri={pic || null}
                      name={display}
                      size={48}
                      subscriptionType={m}
                      placeholderImage={DEFAULT_AVATAR}
                    />
                    <View style={[styles.memberMid, {alignItems: flexEnd}]}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {display}
                        {isSelf ? ' (את/ה)' : ''}
                      </Text>
                      {rl ? (
                        <View style={styles.roleChip}>
                          <Text style={styles.roleChipText}>{rl}</Text>
                        </View>
                      ) : null}
                    </View>
                    {showMenu ? (
                      <MaterialCommunityIcons
                        name="dots-vertical"
                        size={22}
                        color={LABEL}
                      />
                    ) : (
                      <View style={styles.dotsSpacer} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.leaveOutline}
              onPress={() => openMemberActions({...myMember, email: myNorm})}
              activeOpacity={0.8}>
              <MaterialCommunityIcons
                name="exit-to-app"
                size={20}
                color="#ff8a8a"
              />
              <Text style={styles.leaveOutlineText}>עזוב את הקבוצה</Text>
            </TouchableOpacity>

            {Platform.OS === 'web' ? <View style={{height: 24}} /> : null}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: BG},
  root: {flex: 1, backgroundColor: BG},
  topNav: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  navRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 8,
    minHeight: 48,
  },
  backHit: {padding: 8},
  navTitleSlot: {flex: 1, alignItems: 'center'},
  navTitle: {fontSize: 18, fontWeight: '600', color: NAME_COLOR},
  navTrailing: {width: 44},
  scroll: {flex: 1},
  scrollContent: {paddingHorizontal: 20, paddingBottom: 32},
  hero: {alignItems: 'center', paddingTop: 12, paddingBottom: 20},
  heroAvatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    marginBottom: 14,
    backgroundColor: CARD,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: NAME_COLOR,
    textAlign: 'center',
    maxWidth: '88%',
  },
  memberCount: {marginTop: 8, fontSize: 14, color: LABEL},
  titleEditBlock: {width: '100%', alignItems: 'stretch'},
  titleInput: {
    backgroundColor: CARD,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    color: NAME_COLOR,
    writingDirection: 'rtl',
  },
  titleEditActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  titleBtnGhost: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  titleBtnGhostText: {color: LABEL, fontSize: 16},
  titleBtnGold: {
    backgroundColor: GOLD,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 10,
    minWidth: 88,
    alignItems: 'center',
  },
  titleBtnGoldText: {color: BG, fontSize: 16, fontWeight: '600'},
  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  cardLabel: {fontSize: 13, color: LABEL, marginBottom: 8},
  descText: {fontSize: 15, color: NAME_COLOR, lineHeight: 22},
  descEmpty: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    fontStyle: 'italic',
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  linkBtnText: {fontSize: 15, color: GOLD, fontWeight: '600'},
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: GOLD,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 22,
  },
  primaryBtnText: {fontSize: 17, fontWeight: '700', color: BG},
  sectionHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: LABEL,
    marginBottom: 10,
    alignSelf: 'stretch',
  },
  memberCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  memberRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  memberMid: {flex: 1},
  memberName: {fontSize: 16, color: NAME_COLOR, fontWeight: '600'},
  roleChip: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GOLD,
  },
  roleChipText: {fontSize: 11, color: GOLD, fontWeight: '600'},
  dotsSpacer: {width: 22},
  leaveOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,100,100,0.45)',
  },
  leaveOutlineText: {fontSize: 15, color: '#ffb4b4', fontWeight: '600'},
});

export default ChatGroupManageModal;
