/** Trim display fields; ignore null-ish strings from legacy rows. */
export function safeAgencyDisplayText(value) {
  if (value == null) return '';
  const s = String(value).trim();
  if (!s || s === 'undefined' || s === 'null') return '';
  return s;
}

/** Display name for a marketer row (manager list or member listings header). */
export function agencyMemberDisplayName(member) {
  const candidates = [
    member?.broker_office_name,
    member?.name,
    member?.contact_person_name,
    member?.business_name,
    member?.email,
  ];
  for (const c of candidates) {
    const s = safeAgencyDisplayText(c);
    if (s) return s;
  }
  return 'משווק';
}
