/**
 * Real welcome message that each new account receives when the account is created.
 * Single source of truth for the first message from Pi 2701.
 */
export const DEFAULT_WELCOME_MESSAGE = {
  /** Full text shown in the conversation bubble */
  fullText:
    'ברוכים הבאים לפאי 2701\n\nהרשת החברתית של עולם הנדל"ן.\nכאן תוכלו לפרסם ולחפש נכסים,\nלשוחח בצ\'אט פאי, לקבל פניות\nישירות למודעות שלכם ולהיחשף\nלאנשי מקצוע מובילים בתחום.\nאז קדימה, התחילו לגלוש, להתחבר\nולבנות את החיבור הנדל"ני הבא\nשלכם.\nפאי - זה פשוט... פשוט !',
  /** Short preview for the chat list row */
  preview: 'ברוכים הבאים לפאי 2701 הרשת החברתית של עולם הנדל"ן....',
  /** Time shown on the message */
  time: '12:30',
  /** Sender display name (e.g. under the avatar) */
  senderName: 'pi',
  /** Label inside the avatar circle */
  senderLabel: { pi: 'Pi', num: '-2701-' },
};

/**
 * Build a conversation entry that shows the new-account welcome message (for list + when opening chat).
 */
export function getConversationWithWelcomeMessage(id = '1', name = 'pi') {
  return {
    id,
    name,
    preview: DEFAULT_WELCOME_MESSAGE.preview,
    time: DEFAULT_WELCOME_MESSAGE.time,
  };
}

/** Subscription UUID or conversation id used as a chat peer ref when email is absent. */
export const CHAT_PEER_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** System sender for "עדכונים על פוסטים רלוונטים" professional post alerts. */
export const PROFESSIONAL_UPDATES_SENDER_EMAIL =
  'updates@pi-professional-alerts.internal';

/** Direct chat with the professional post-updates bot (gold ring, in-bubble CTA). */
export function isProfessionalUpdatesConversation(conv) {
  if (!conv || conv.isGroup === true || conv.id === '1') return false;
  const fromApi =
    conv.otherUserEmail != null ? String(conv.otherUserEmail).trim().toLowerCase() : '';
  if (fromApi === PROFESSIONAL_UPDATES_SENDER_EMAIL) return true;
  const rawId = conv.id != null ? String(conv.id).trim().toLowerCase() : '';
  return rawId === PROFESSIONAL_UPDATES_SENDER_EMAIL;
}

/** Ensure inbox / profile rows always carry peer email + conversation UUID for ChatScreen. */
export function normalizeConversationForOpen(conv) {
  if (!conv) return conv;
  if (conv.id === '1' || conv.name === 'pi') return conv;

  const rawId = conv.id != null ? String(conv.id).trim() : '';
  const rawConvId =
    conv.conversationId != null ? String(conv.conversationId).trim() : '';
  const idIsEmail = rawId.includes('@');
  const idIsUuid = !idIsEmail && CHAT_PEER_UUID_RE.test(rawId);
  const conversationId = rawConvId || (idIsUuid ? rawId : '') || null;
  const fromApi =
    conv.otherUserEmail != null ? String(conv.otherUserEmail).trim() : '';
  const otherUserEmail = fromApi
    ? fromApi.toLowerCase()
    : idIsEmail
      ? rawId.toLowerCase()
      : idIsUuid
        ? rawId.toLowerCase()
        : null;
  const listId = otherUserEmail || conversationId || rawId || conv.id;

  return {
    ...conv,
    id: listId,
    conversationId,
    otherUserEmail,
  };
}
