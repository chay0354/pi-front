/**
 * Mirrors pi-back CHAT_LISTING_CATEGORY_LABELS for chat UI (list + header badges).
 */
const CHAT_LISTING_CATEGORY_LABELS = {
  1: 'חדש מקבלן',
  2: 'משרדים',
  3: 'שותפים',
  4: 'גלובל',
  5: 'BnB',
  6: 'מגזר דתי',
  7: 'קרקעות',
  8: 'מסחרי',
  9: 'נכסים',
  10: 'דירות',
  12: 'יוקרה',
};

export function getChatListingCategoryLabel(category) {
  const n = category != null ? Number(category) : NaN;
  if (Number.isNaN(n)) return null;
  return CHAT_LISTING_CATEGORY_LABELS[n] || null;
}
