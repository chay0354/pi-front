import {useEffect, useState} from 'react';
import ChatListScreen from './ChatListScreen';
import ChatScreen from './ChatScreen';
import {getConversationWithWelcomeMessage, normalizeConversationForOpen} from './lib/chatDefaults';
import homeIcon from '../assets/figma/chat/home.svg';
import styles from './ChatFlow.module.css';

const WELCOME = getConversationWithWelcomeMessage('1', 'pi');

/**
 * Desktop chat from the Figma frame: home rail, inbox (415px), open thread.
 * Conversation mechanics stay the mobile chat (messages, media, voice, groups, offers).
 */
function conversationFromPeer(peer) {
  if (!peer) return WELCOME;
  const email = peer.email ? String(peer.email).trim().toLowerCase() : '';
  const id = email || (peer.subscriptionId ? String(peer.subscriptionId).trim().toLowerCase() : '');
  if (!id) return WELCOME;
  return normalizeConversationForOpen({
    id,
    name: peer.name || id,
    otherUserEmail: id,
    profileImageUrl: peer.profileImageUrl || null,
    listingId: peer.listingId || null,
    subscriptionType: peer.subscriptionType || null,
    subscription_type: peer.subscriptionType || null,
  });
}

export default function ChatFlow({
  currentUser,
  refreshKey = 0,
  piWelcomeRead = false,
  onWelcomeRead,
  onClose,
  onOpenPost,
  onOpenPeerProfile,
  initialPeer = null,
}) {
  const [conversation, setConversation] = useState(() => conversationFromPeer(initialPeer));
  const [listRefresh, setListRefresh] = useState(refreshKey);

  useEffect(() => {
    setListRefresh(refreshKey);
  }, [refreshKey]);

  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[data-account-modal]')) return;
      e.stopPropagation();
      if (conversation) {
        setConversation(null);
        return;
      }
      onClose?.();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [conversation, onClose]);

  const openPeer = peer => {
    if (!peer?.email) return;
    setConversation(
      normalizeConversationForOpen({
        id: String(peer.email).trim().toLowerCase(),
        name: peer.name || peer.email,
        otherUserEmail: String(peer.email).trim().toLowerCase(),
        profileImageUrl: peer.profileImageUrl || null,
        listingId: peer.listingId || null,
      }),
    );
    setListRefresh(n => n + 1);
  };

  return (
    <div className={styles.shell} dir="rtl">
      <aside className={styles.homeRail}>
        <button type="button" className={styles.homeBtn} onClick={onClose} aria-label="סגור צ׳אט">
          <img className={styles.homeIcon} src={homeIcon} alt="" />
        </button>
      </aside>
      <div className={styles.listSlot}>
        <ChatListScreen
          embedded
          currentUser={currentUser}
          refreshKey={listRefresh}
          piWelcomeRead={piWelcomeRead}
          activeConversationId={conversation?.id ?? null}
          onClose={onClose}
          onOpenChat={setConversation}
        />
      </div>
      <div className={styles.thread}>
        {conversation ? (
          <ChatScreen
            embedded
            conversation={conversation}
            currentUser={currentUser}
            onClose={() => setConversation(null)}
            onMessageSent={() => setListRefresh(n => n + 1)}
            onPiWelcomeOpened={onWelcomeRead}
            onOpenPost={onOpenPost}
            onOpenPeerProfile={onOpenPeerProfile}
            onContactListingOwner={openPeer}
          />
        ) : (
          <div className={styles.emptyThread} />
        )}
      </div>
    </div>
  );
}
