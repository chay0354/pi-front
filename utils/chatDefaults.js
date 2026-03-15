/**
 * Real welcome message that each new account receives when the account is created.
 * Single source of truth for the first message from Pi 2701.
 */
export const DEFAULT_WELCOME_MESSAGE = {
  /** Full text shown in the conversation bubble */
  fullText:
    'ברוכים הבאים לפאי 2701\nהרשת החברתית של עולם הנדל"ן.\nכאן תוכלו לפרסם ולחפש נכסים,\nלשוחח בצ\'אט פאי, לקבל פניות\nישירות למודעות שלכם ולהיחשף\nלאנשי מקצוע מובילים בתחום.\nאז קדימה, התחילו לגלוש, להתחבר\nולבנות את החיבור הנדל"ני הבא\nשלכם.\nפאי – זה פשוט... פשוט !',
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
