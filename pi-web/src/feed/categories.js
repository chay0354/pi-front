/**
 * Home category strip. Ids match `userCategories` in pi-front/utils/constant.js;
 * `tile` is the Figma variant of the category card (top bar node 336:32855).
 */

/** Mobile opens the feed on דירות. */
export const DEFAULT_CATEGORY_ID = 10;

/** Visual order, physical left → right, on each side of the 2701 logo. */
export const LEFT_CATEGORIES = [
  {id: 6, name: 'מגזר דתי', tile: 'Variant15'},
  {id: 4, name: 'גלובל', tile: 'Variant17'},
  {id: 5, name: 'BNB', tile: 'Variant16'},
  {id: 3, name: 'שותפים', tile: 'Variant18'},
  {id: 1, name: 'חדש מקבלן', tile: 'Variant20'},
];

export const RIGHT_CATEGORIES = [
  {id: 10, name: 'דירות', tile: 'apartments'},
  {id: 2, name: 'משרדים', tile: 'Variant19'},
  {id: 12, name: 'יוקרה', tile: 'Variant12'},
  {id: 7, name: 'קרקעות', tile: 'Variant14'},
  {id: 8, name: 'מסחר', tile: 'Variant13'},
];
