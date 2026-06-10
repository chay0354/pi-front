/**
 * Standard ₪ increment/decrement for − / + on property-scale prices (millions).
 * Roommate budget and per-night rates use smaller steps via explicit props.
 */
export const PRICE_COUNTER_STEP_DEFAULT = 1_000_000;
export const PRICE_COUNTER_STEP_ROOMMATE_BUDGET = 1_000;
/** BnB / לילה — small steps; not whole millions */
export const PRICE_COUNTER_STEP_PER_NIGHT = 500;

/** Strip everything except digits (for parsing typed/pasted values). */
export function parsePriceInputDigits(text) {
  return String(text ?? '').replace(/[^\d]/g, '');
}

/** Display price in ad-upload מחיר fields with thousands separators. */
export function formatPriceInputDisplay(value) {
  const digitsOnly = parsePriceInputDigits(value);
  if (!digitsOnly) return '';
  const n = Number.parseInt(digitsOnly, 10);
  if (Number.isNaN(n)) return '';
  return n.toLocaleString('en-US');
}

/** Parse display string to a non-negative integer price. */
export function parsePriceInputNumber(text) {
  const digitsOnly = parsePriceInputDigits(text);
  const parsed = Number.parseInt(digitsOnly || '0', 10);
  return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
}

/** While typing: keep only digits and re-apply comma grouping. */
export function formatPriceInputDraft(text) {
  return formatPriceInputDisplay(text);
}
