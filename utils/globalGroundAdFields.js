'use strict';

/**
 * When publishing under category 4 (גלובל) with property type `ground` (קרקע),
 * hide "פרטים כלליים" / "מצב הנכס" and show the קרקעות-style sections from the
 * same role's category 7 definition (proposed land, radio groups, then purpose → price → land address).
 *
 * @param {Record<number, {fields?: Array}>} formList — userCategoryForm / brokerCategoryForm / …
 * @param {number} category
 * @param {string|null|undefined} propertyType — e.g. 'ground'
 * @returns {Array<object>|null} replacement `fields` array, or null to use default formList[category].fields
 */
export function buildGlobalGroundFieldList(formList, category, propertyType) {
  if (category !== 4 || propertyType !== 'ground') {
    return null;
  }
  const base = formList[4]?.fields;
  const landTemplate = formList[7]?.fields;
  if (!Array.isArray(base) || base.length === 0) {
    return null;
  }
  if (!Array.isArray(landTemplate) || landTemplate.length === 0) {
    return null;
  }

  const landMiddle = landTemplate.filter(
    f => f && (f.key === 'proposedland' || f.key === 'radiooptions'),
  );
  const landAddrField = landTemplate.find(f => f && f.key === 'landaddress');

  const out = [];
  for (const f of base) {
    if (!f) continue;
    if (f.key === 'generaldetails' || f.key === 'propertycondition') {
      continue;
    }
    if (f.key === 'address-phone-description') {
      if (landAddrField) {
        out.push({...landAddrField});
      }
      continue;
    }
    out.push(f);
    if (f.key === 'propertytype') {
      landMiddle.forEach(lf => out.push({...lf}));
    }
  }
  return out;
}
