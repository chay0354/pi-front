/**
 * Standard ₪ increment/decrement for − / + on property-scale prices (millions).
 * Roommate budget and per-night rates use smaller steps via explicit props.
 */
export const PRICE_COUNTER_STEP_DEFAULT = 1_000_000;
export const PRICE_COUNTER_STEP_ROOMMATE_BUDGET = 1_000;
/** BnB / לילה — small steps; not whole millions */
export const PRICE_COUNTER_STEP_PER_NIGHT = 500;
