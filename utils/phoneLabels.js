/** Israeli mobile numbers start with 05 (or 9725 / +9725 in international form). */
export function isMobilePhoneNumber(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return /^(05|9725|5\d{8}$)/.test(digits);
}

export function hiddenPhoneLabel(phone) {
  return isMobilePhoneNumber(phone) ? 'הצג טלפון נייד' : 'הצג טלפון משרד';
}

function cleanPhone(value) {
  const s = value == null ? '' : String(value).trim();
  return s && s !== '-' && s !== '—' ? s : '';
}

/**
 * The account's own direct numbers, each with its hidden-label.
 * מספר פרטי ישיר is `mobile_phone` (company / marketer) or `phone` (broker / professional);
 * מספר משרד ישיר is `office_phone`. The virtual number is never listed here, and the
 * private number is dropped when the account set `hide_private_phone`.
 */
export function directContactPhones(source) {
  if (!source || typeof source !== 'object') return [];
  const type = String(
    source.subscription_type || source.creator_subscription_type || '',
  ).toLowerCase();
  const mobileFirst = type === 'company' || type === 'project_marketer';
  const privateNumber =
    (mobileFirst
      ? cleanPhone(source.mobile_phone) || cleanPhone(source.phone)
      : cleanPhone(source.phone) || cleanPhone(source.mobile_phone)) ||
    cleanPhone(source.contact_details?.phone) ||
    (Array.isArray(source.contact_details?.phones)
      ? source.contact_details.phones.map(cleanPhone).find(Boolean) || ''
      : '');
  const officeNumber = cleanPhone(source.office_phone);
  const privateHidden =
    source.hide_private_phone === true ||
    source.creator_hide_private_phone === true;
  const out = [];
  if (privateNumber && !privateHidden && privateNumber !== officeNumber) {
    out.push({kind: 'private', number: privateNumber, label: 'הצג מספר פרטי ישיר'});
  }
  if (officeNumber) {
    out.push({kind: 'office', number: officeNumber, label: 'הצג מספר משרד ישיר'});
  }
  return out;
}

/**
 * Stable 072 number (Israeli VoIP range) so the virtual-number field is never
 * blank before a Twilio number is assigned. Same seed always yields the same number.
 */
export function suggestVirtualPhone(seed) {
  const basis = String(seed || 'pi').trim() || 'pi';
  let hash = 2166136261;
  for (let i = 0; i < basis.length; i++) {
    hash ^= basis.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const digits = String(hash >>> 0)
    .padStart(7, '0')
    .slice(-7);
  return `072${digits}`;
}
