import {useEffect, useMemo, useState} from 'react';
import {
  mdiAccountPlusOutline,
  mdiChevronLeft,
  mdiDotsVertical,
  mdiExitToApp,
  mdiPencilOutline,
} from '@mdi/js';
import MdiIcon from '../../publish/MdiIcon';
import {ProfileAvatar} from '../../profile/ProfileParts';
import {flexEnd} from '../../publish/lib/rtlLayout';
import groupFallback from '../../assets/mobile/pi-chat/igroupicon-big.png';
import styles from './ChatGroupManageModal.module.css';

const GOLD = '#D4AF37';
const LABEL = '#d2d0dc';

const roleLabel = role => {
  const r = role != null ? String(role).trim().toLowerCase() : '';
  if (r === 'owner') return 'יוצר';
  if (r === 'manager') return 'מנהל';
  return null;
};

export default function ChatGroupManageModal({
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
}) {
  const [titleDraft, setTitleDraft] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [actionMember, setActionMember] = useState(null);

  useEffect(() => {
    if (visible && title != null) setTitleDraft(String(title).trim());
  }, [visible, title]);

  useEffect(() => {
    if (!visible) return undefined;
    const onKey = e => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      if (actionMember) {
        setActionMember(null);
        return;
      }
      onClose?.();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [visible, onClose, actionMember]);

  const myNorm = myEmail ? String(myEmail).trim().toLowerCase() : '';
  const sortedMembers = useMemo(() => {
    const list = Array.isArray(members) ? [...members] : [];
    list.sort((a, b) =>
      String(a?.name || a?.email || '').localeCompare(String(b?.name || b?.email || ''), 'he'),
    );
    return list;
  }, [members]);

  const myMember = sortedMembers.find(
    m => String(m?.email || '').trim().toLowerCase() === myNorm,
  );
  const myRole =
    myMember?.groupRole != null ? String(myMember.groupRole).trim().toLowerCase() : 'member';
  const canManageOthers = myRole === 'owner' || myRole === 'manager';
  const canAddMembers = myRole === 'owner' || myRole === 'manager';
  const showTitleEditor = isBrokerUser && (myRole === 'owner' || myRole === 'manager');

  const leaveGroup = async () => {
    if (!window.confirm('לעזוב את הקבוצה?\nלא תקבל עוד הודעות מצ׳אט זה.')) return;
    try {
      const res = await onLeaveGroup?.();
      if (res?.conversationDeleted) onConversationDeleted?.();
      else await onRefresh?.();
    } catch (e) {
      window.alert(e?.message ? String(e.message) : 'פעולה נכשלה');
    }
  };

  const runMemberAction = async (action, member) => {
    const email = String(member?.email || '').trim().toLowerCase();
    const name = member?.name || email;
    setActionMember(null);
    try {
      if (action === 'leave') {
        await leaveGroup();
        return;
      }
      if (action === 'remove') {
        if (!window.confirm(`להסיר מהקבוצה?\n${name} לא יוכל/ת להמשיך לצפות בצ׳אט.`)) return;
        await onRemoveMember?.(email);
        await onRefresh?.();
        return;
      }
      if (action === 'promote') {
        await onSetMemberRole?.(email, 'manager');
        await onRefresh?.();
        return;
      }
      if (action === 'demote') {
        await onSetMemberRole?.(email, 'member');
        await onRefresh?.();
      }
    } catch (e) {
      window.alert(e?.message ? String(e.message) : 'פעולה נכשלה');
    }
  };

  const openMemberActions = m => {
    const email = String(m?.email || '').trim().toLowerCase();
    if (!email) return;
    const isSelf = email === myNorm;
    const targetRole =
      m?.groupRole != null ? String(m.groupRole).trim().toLowerCase() : 'member';
    const actions = [];
    if (isSelf) {
      actions.push({id: 'leave', label: 'עזוב את הקבוצה', danger: true});
    } else {
      if (canManageOthers && targetRole !== 'owner') {
        actions.push({id: 'remove', label: 'הסר מהקבוצה', danger: true});
      }
      if (isBrokerUser && myRole === 'owner' && targetRole !== 'owner') {
        actions.push(
          targetRole !== 'manager'
            ? {id: 'promote', label: 'קדם למנהל'}
            : {id: 'demote', label: 'הסר ממנהל'},
        );
      }
    }
    if (actions.length === 0) {
      window.alert('אין פעולות זמינות עבור משתמש זה');
      return;
    }
    setActionMember({member: m, actions});
  };

  const handleSaveTitle = async () => {
    const next = titleDraft.trim();
    if (!next) {
      window.alert('הזן שם לקבוצה');
      return;
    }
    try {
      await onSaveTitle?.(next);
      setEditingTitle(false);
      await onRefresh?.();
    } catch (e) {
      window.alert(e?.message ? String(e.message) : 'שמירה נכשלה');
    }
  };

  if (!visible) return null;

  return (
    <div
      className={styles.root}
      data-account-modal=""
      role="dialog"
      aria-modal="true"
      aria-label="ניהול קבוצה">
      <div className={styles.topNav}>
        <div className={styles.navRow}>
          <button type="button" className={styles.backHit} onClick={onClose} aria-label="חזור">
            <MdiIcon path={mdiChevronLeft} size={36} color="#fff" />
          </button>
          <div className={styles.navTitleSlot}>
            <h2 className={styles.navTitle}>ניהול קבוצה</h2>
          </div>
          <div className={styles.navTrailing} />
        </div>
      </div>

      <div className={styles.scroll}>
        <div className={styles.hero}>
          <div className={styles.heroAvatar}>
            <ProfileAvatar
              uri={avatarUri || null}
              fallbackUri={groupFallback}
              size={146}
              forceGoldRing
            />
          </div>

          {editingTitle && showTitleEditor ? (
            <div className={styles.titleEditBlock}>
              <input
                className={styles.titleInput}
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                placeholder="שם הקבוצה"
                maxLength={120}
              />
              <div className={styles.titleEditActions} style={{justifyContent: flexEnd}}>
                <button type="button" className={styles.titleBtnGhost} onClick={() => setEditingTitle(false)}>
                  ביטול
                </button>
                <button type="button" className={styles.titleBtnGold} onClick={handleSaveTitle} disabled={busy}>
                  {busy ? <span className={styles.spinner} /> : 'שמור'}
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.titleRow}>
              <h3 className={styles.heroTitle}>{titleDraft || title || 'קבוצה'}</h3>
              {showTitleEditor ? (
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => setEditingTitle(true)}
                  aria-label="ערוך שם קבוצה">
                  <MdiIcon path={mdiPencilOutline} size={26} color={GOLD} />
                </button>
              ) : null}
            </div>
          )}

          <p className={styles.memberCount}>
            {sortedMembers.length} {sortedMembers.length === 1 ? 'חבר' : 'חברים'}
          </p>
        </div>

        <div className={styles.card}>
          <span className={styles.cardLabel}>תיאור</span>
          {description ? (
            <p className={styles.descText}>{description}</p>
          ) : (
            <p className={styles.descEmpty}>אין תיאור לקבוצה</p>
          )}
          <button
            type="button"
            className={styles.linkBtn}
            style={{justifyContent: flexEnd}}
            onClick={onEditDescription}>
            <span className={styles.linkBtnText}>{description ? 'ערוך תיאור' : 'הוסף תיאור'}</span>
            <MdiIcon path={mdiChevronLeft} size={26} color={GOLD} />
          </button>
        </div>

        {canAddMembers ? (
          <button type="button" className={styles.primaryBtn} onClick={onAddMembers} aria-label="הוסף חברים לקבוצה">
            <MdiIcon path={mdiAccountPlusOutline} size={29} color="#1e1d27" />
            <span className={styles.primaryBtnText}>הוסף חברים</span>
          </button>
        ) : null}

        <h4 className={styles.sectionHeading}>חברי הקבוצה</h4>
        <div className={styles.memberCard}>
          {sortedMembers.map((m, i) => {
            const email = String(m?.email || '').trim().toLowerCase();
            const isSelf = email === myNorm;
            const pic = m?.profileImageUrl || null;
            const display = m?.name || email;
            const rl = roleLabel(m?.groupRole);
            const showMenu =
              isSelf ||
              (canManageOthers && String(m?.groupRole || '').toLowerCase() !== 'owner') ||
              (isBrokerUser && myRole === 'owner' && !isSelf);

            return (
              <button
                key={email || `m-${i}`}
                type="button"
                className={`${styles.memberRow} ${i > 0 ? styles.memberRowBorder : ''}`}
                onClick={() => (showMenu ? openMemberActions(m) : null)}
                disabled={!showMenu}>
                <ProfileAvatar uri={pic || null} size={62} subscriptionType={m} />
                <div className={styles.memberMid} style={{alignItems: flexEnd}}>
                  <span className={styles.memberName}>
                    {display}
                    {isSelf ? ' (את/ה)' : ''}
                  </span>
                  {rl ? (
                    <span className={styles.roleChip}>
                      <span className={styles.roleChipText}>{rl}</span>
                    </span>
                  ) : null}
                </div>
                {showMenu ? (
                  <MdiIcon path={mdiDotsVertical} size={29} color={LABEL} />
                ) : (
                  <span className={styles.dotsSpacer} />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className={styles.leaveOutline}
          onClick={() => openMemberActions({...myMember, email: myNorm})}>
          <MdiIcon path={mdiExitToApp} size={26} color="#ff8a8a" />
          <span className={styles.leaveOutlineText}>עזוב את הקבוצה</span>
        </button>
        <div className={styles.bottomPad} />
      </div>

      {actionMember ? (
        <div
          className={styles.actionBackdrop}
          data-account-modal=""
          onClick={() => setActionMember(null)}
          role="presentation">
          <div className={styles.actionSheet} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <p className={styles.actionTitle}>{actionMember.member?.name || actionMember.member?.email}</p>
            {actionMember.actions.map(a => (
              <button
                key={a.id}
                type="button"
                className={`${styles.actionItem} ${a.danger ? styles.actionDanger : ''}`}
                onClick={() => runMemberAction(a.id, actionMember.member)}>
                {a.label}
              </button>
            ))}
            <button type="button" className={styles.actionCancel} onClick={() => setActionMember(null)}>
              ביטול
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
