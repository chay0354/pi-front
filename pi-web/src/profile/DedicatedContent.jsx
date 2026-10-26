import {useMemo} from 'react';
import {Icon, LocationMap, PiRatingBadge, SectionLine, SmartInfoBlock, SvgImage, asset} from './ProfileParts';
import {parseLandBlockParcelFromListing} from './lib/enrichListingForUserProfile';
import {buildCompanyLandAttrChips, landOffersSectionTitle, normalizeLandOfferParcels} from './lib/landListingFields';
import styles from './DedicatedContent.module.css';

const firstNonEmpty = (...vals) => {
  for (const v of vals) {
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
};

const parseJsonObject = val => {
  if (val == null) return null;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
};

const shekel = n => `₪${Math.round(n).toLocaleString('he-IL')}`;

function Chip({label, icon, iconXml, active = true, iconFirst = true}) {
  const iconNode = icon ? (
    <img className={styles.chipIcon} src={icon} alt="" />
  ) : iconXml ? (
    <SvgImage className={styles.chipIcon} xml={iconXml} width={32} height={32} />
  ) : null;
  return (
    <div className={`${styles.chip} ${active ? '' : styles.chipInactive}`}>
      {iconFirst && iconNode}
      <span className={styles.chipText}>{label}</span>
      {!iconFirst && iconNode}
    </div>
  );
}

function Location({text}) {
  if (!text) return null;
  return (
    <div className={styles.loc}>
      <Icon name="location-pin" size={20} color="#D2D0DC" />
      <span className={styles.locText}>{text}</span>
    </div>
  );
}

function Description({text}) {
  return text ? <p className={styles.body}>{text}</p> : <p className={styles.bodyMuted}>אין תיאור</p>;
}

/* ---------------- BnB (category 5) — Figma 5:413374 ---------------- */

const BNB = 'new-profile-pages/bnb/';

const PROPERTY_TYPE_LABELS = {
  room: 'חדר',
  housing_unit: 'יחידת דיור',
  house: 'בית',
  'b&b': 'צימר',
  bnb: 'צימר',
  holiday_apartment: 'דירת נופש',
  villa: 'וילה',
  special: 'מיוחדים',
};

const HOSPITALITY_LABELS = {
  landscapes: 'נופים',
  on_the_beach: 'על הים',
  with_pool: 'עם בריכה',
  nature: 'טבע',
  special: 'מיוחדים',
  rural: 'כפרי',
  desert: 'מדבר',
  urban: 'עירוני',
};

const HOSPITALITY_ICONS = {
  landscapes: 'views',
  on_the_beach: 'on-the-beach',
  with_pool: 'pool',
  nature: 'neture',
  special: 'spetials',
  rural: 'vilage',
  desert: 'desert',
  urban: 'urban',
};

const HOSPITALITY_COL_RIGHT = ['landscapes', 'on_the_beach', 'with_pool', 'nature'];
const HOSPITALITY_COL_LEFT = ['special', 'rural', 'desert', 'urban'];

const SERVICE_LABELS = {
  pool: 'בריכה',
  merger: 'מיזוג',
  fridge: 'מקרר',
  laundry: 'כביסה',
  eater: 'אוכל',
  kitchen: 'מטבח',
  locker: 'ארון',
  tv: 'טלויזיה',
  safe: 'כספת',
  smoke_detector: 'גלאי עשן',
  wifi_internet: 'אינטרנט wifi',
  private_services: 'שירותים פרטיים',
  shared_services: 'שירותים משותפים',
  private_shower: 'מקלחת פרטית',
  shared_shower: 'מקלחת משותפת',
  accessible_place: 'מקום נגיש',
  suitable_for_animals: 'מתאים לבעלי חיים',
  suitable_for_smokers: 'מתאים למעשנים',
};
const SERVICE_ORDER = Object.keys(SERVICE_LABELS);

const SERVICE_ICON_FILES = {
  pool: 'pool',
  merger: 'AC',
  fridge: 'frige',
  laundry: 'laundry',
  eater: 'food',
  kitchen: 'kitchen',
  locker: 'locker',
  tv: 'TV',
  safe: 'safe',
  smoke_detector: 'smoke-detector',
  wifi_internet: 'wi-fi',
  private_services: 'toilet',
  shared_services: 'public-toilet',
  private_shower: 'private-shower',
  shared_shower: 'public-shower',
  accessible_place: 'acceable',
  suitable_for_animals: 'pet-alowed',
  suitable_for_smokers: 'smoking-alowed',
  parking: 'parking',
};
const serviceIcon = key => (SERVICE_ICON_FILES[key] ? asset(`${BNB}services/${SERVICE_ICON_FILES[key]}.png`) : null);

function buildFloorServiceTile(listing) {
  const raw = listing?.floor;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return null;
  return {id: 'listing-floor', label: `קומה ${n}`, icon: asset(`${BNB}services/flor.png`)};
}

function buildParkingServiceTile(listing) {
  const am = parseJsonObject(listing?.amenities);
  if (!am || typeof am !== 'object') return null;
  let count = null;
  const qtyRaw = am['כמות חניות'] ?? am.parking ?? am.parking_spaces ?? am['חנייה'];
  if (typeof qtyRaw === 'number' && qtyRaw > 0) {
    count = qtyRaw;
  } else if (typeof qtyRaw === 'string' && qtyRaw.trim() !== '') {
    const n = parseInt(qtyRaw, 10);
    if (!Number.isNaN(n) && n > 0) count = n;
  } else if (qtyRaw === true) {
    count = 1;
  }
  if (count == null || count < 1) return null;
  count = Math.min(4, Math.max(1, Math.round(count)));
  const paidOption = am['חנייה בתשלום'];
  const isPaid = paidOption === 'כן' || am.paid_parking === true || am.paidParking === true;
  const isFree =
    paidOption === 'ללא' ||
    am.paid_parking === false ||
    am.paidParking === false ||
    am.free_parking === true ||
    am.freeParking === true;
  const suffix = isPaid && !isFree ? 'בתשלום' : 'בחינם';
  return {
    id: 'parking',
    label: count === 1 ? `חנייה 1 ${suffix}` : `${count} חניות ${suffix}`,
    icon: serviceIcon('parking'),
  };
}

function formatShortDate(d) {
  if (d == null || d === '') return '';
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, mo, day] = s.slice(0, 10).split('-').map(Number);
    if (y && mo && day) return `${day}/${mo}`;
  }
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})/);
  if (m) return `${Number(m[1])}/${Number(m[2])}`;
  return s.replace(/\./g, '/');
}

function collectServiceKeys(listing) {
  const sf = parseJsonObject(listing?.service_facility || listing?.serviceFacility);
  const keys = [];
  if (sf && typeof sf === 'object') {
    if (sf.selected && String(sf.selected) !== 'floor') keys.push(String(sf.selected));
    Object.keys(sf).forEach(k => {
      if (k !== 'selected' && sf[k] === true && k !== 'floor') keys.push(k);
    });
  }
  return [...new Set(keys)].filter(Boolean);
}

function collectHospitalityActive(listing) {
  const gd = parseJsonObject(listing?.general_details || listing?.generalDetails);
  const map = gd?.hospitality_natures;
  if (map && typeof map === 'object' && !Array.isArray(map)) return Object.keys(map).filter(k => map[k] === true);
  if (Array.isArray(map)) return map.filter(Boolean);
  const single = String(listing?.hospitality_nature || listing?.hospitalityNature || '')
    .trim()
    .toLowerCase();
  return single ? [single] : [];
}

function PricePerNight({price}) {
  return (
    <div className={styles.priceRow}>
      <span className={styles.priceBig}>{price}</span>
      <span className={styles.priceRule} />
      <span className={styles.priceLabels}>
        <span>מחיר</span>
        <span>ללילה</span>
      </span>
    </div>
  );
}

export function BnbListingContent({listing, displayPiRating, mapAddress, adAddress}) {
  const hotDeal =
    listing?.hot_deal === true || listing?.hot_deal === 'true' || listing?.hot_deal === 't' || listing?.hotDeal === true;
  const rawType = String(listing?.property_type || listing?.propertyTypeRaw || '')
    .trim()
    .toLowerCase();
  const unitLabel = PROPERTY_TYPE_LABELS[rawType] || PROPERTY_TYPE_LABELS[String(listing?.property_type)] || 'יחידת דיור';

  const ppn = listing?.price_per_night != null && listing?.price_per_night !== '' ? Number(listing.price_per_night) : null;
  const fallbackPrice = listing?.price != null && listing?.price !== '' ? Number(listing.price) : null;
  const priceNum =
    ppn != null && !Number.isNaN(ppn) ? ppn : fallbackPrice != null && !Number.isNaN(fallbackPrice) ? fallbackPrice : null;
  const priceStr = priceNum != null ? shekel(priceNum) : '—';

  const title = firstNonEmpty(listing?.project_name, listing?.projectName, listing?.title, listing?.name, listing?.property_name);
  const addr = firstNonEmpty(
    mapAddress,
    listing?.address,
    listing?.location,
    listing?.search_address,
    listing?.contact_details?.address,
  );
  const smartAddr = firstNonEmpty(adAddress, addr);

  const rooms = listing?.rooms != null && listing?.rooms !== '' ? Number(listing.rooms) : null;
  const roomsLine = rooms != null && !Number.isNaN(rooms) ? `${rooms} חדרים` : null;

  const acc = listing?.accommodation_offers || listing?.accommodationOffers;
  const ci = formatShortDate(acc?.check_in_date || listing?.check_in_date || listing?.checkInDate || null);
  const co = formatShortDate(acc?.check_out_date || listing?.check_out_date || listing?.checkOutDate || null);
  const hasDates = Boolean(ci || co);

  const cancelRaw = String(listing?.cancellation_policy || listing?.cancellationPolicy || '')
    .trim()
    .toLowerCase();
  const showFreeCancel =
    cancelRaw === 'without_penalty' ||
    cancelRaw.includes('without_penalty') ||
    cancelRaw.includes('ללא') ||
    cancelRaw.includes('קנס');

  const description = String(listing?.description || '').trim();
  const activeHospitality = useMemo(() => collectHospitalityActive(listing), [listing]);
  const hospitalityCols = useMemo(() => {
    const activeSet = new Set(activeHospitality);
    const make = code => ({
      id: code,
      label: HOSPITALITY_LABELS[code] || code,
      icon: HOSPITALITY_ICONS[code] ? asset(`${BNB}${HOSPITALITY_ICONS[code]}.png`) : null,
      active: activeSet.has(code),
    });
    return {right: HOSPITALITY_COL_RIGHT.map(make), left: HOSPITALITY_COL_LEFT.map(make)};
  }, [activeHospitality]);

  const serviceColumns = useMemo(() => {
    const keys = collectServiceKeys(listing);
    const ordered = SERVICE_ORDER.filter(k => keys.includes(k));
    const extra = keys.filter(k => !SERVICE_ORDER.includes(k));
    const facilities = [...ordered, ...extra].map(k => ({id: k, label: SERVICE_LABELS[k] || k, icon: serviceIcon(k)}));
    const floor = buildFloorServiceTile(listing);
    const parking = buildParkingServiceTile(listing);
    const tiles = floor ? [...facilities, floor] : facilities;
    const right = tiles.filter((_, i) => i % 2 === 0);
    const left = tiles.filter((_, i) => i % 2 === 1);
    if (parking) right.push(parking);
    return {right, left, count: tiles.length + (parking ? 1 : 0)};
  }, [listing]);

  const showStayCard = roomsLine || hasDates || showFreeCancel;
  const showCompanyPiRating = displayPiRating != null && !Number.isNaN(Number(displayPiRating));
  const tags = (
    <>
      {hotDeal ? <span className={styles.tagHot}>Hot deal</span> : null}
      <span className={styles.tagWhite}>{unitLabel}</span>
    </>
  );

  return (
    <div className={styles.wrap}>
      {showCompanyPiRating ? (
        <>
          <div className={styles.bnbCompanyTop}>
            <div className={styles.bnbPriceLoc}>
              <PricePerNight price={priceStr} />
              <Location text={addr} />
            </div>
            <div className={styles.bnbTagsPi}>
              <div className={styles.tagsRow}>{tags}</div>
              <PiRatingBadge rating={displayPiRating} variant="listing" />
            </div>
          </div>
          {title ? <h2 className={styles.title}>{title}</h2> : null}
        </>
      ) : (
        <>
          <div className={styles.tagsRow}>{tags}</div>
          <div className={styles.priceBlock}>
            <PricePerNight price={priceStr} />
            {title ? <h2 className={styles.title}>{title}</h2> : null}
            <Location text={addr} />
          </div>
        </>
      )}

      <SectionLine />

      {showStayCard ? (
        <>
          <div className={styles.stayCard}>
            {roomsLine ? (
              <div className={styles.stayRow}>
                <img className={styles.stayIcon} src={asset(`${BNB}top-part/rooms.png`)} alt="" />
                <span className={styles.stayText}>{roomsLine}</span>
              </div>
            ) : null}
            {roomsLine && hasDates ? <span className={styles.stayDivider} /> : null}
            {hasDates ? (
              <div className={styles.stayRow}>
                <img className={styles.stayIcon} src={asset(`${BNB}top-part/date.png`)} alt="" />
                <div className={styles.stayDates}>
                  <span>תאריך מוצע</span>
                  {ci ? <span>כניסה {ci}</span> : null}
                  {co ? <span>יציאה {co}</span> : null}
                </div>
              </div>
            ) : null}
            {(roomsLine || hasDates) && showFreeCancel ? <span className={styles.stayDivider} /> : null}
            {showFreeCancel ? (
              <div className={styles.stayRow}>
                <img className={styles.stayIcon} src={asset(`${BNB}top-part/cancel-aveialbe.png`)} alt="" />
                <span className={styles.stayText}>ביטול ללא קנס</span>
              </div>
            ) : null}
          </div>
          <SectionLine />
        </>
      ) : null}

      <Description text={description} />

      {activeHospitality.length > 0 ? (
        <>
          <SectionLine />
          <h3 className={styles.heading}>אופי האירוח</h3>
          <div className={styles.twoCol}>
            <div className={styles.col}>
              {hospitalityCols.right.map(t => (
                <Chip key={t.id} label={t.label} icon={t.icon} active={t.active} />
              ))}
            </div>
            <div className={styles.col}>
              {hospitalityCols.left.map(t => (
                <Chip key={t.id} label={t.label} icon={t.icon} active={t.active} />
              ))}
            </div>
          </div>
        </>
      ) : null}

      <SectionLine />
      <h3 className={styles.heading}>שירותים ומתקנים במקום</h3>
      {serviceColumns.count > 0 ? (
        <div className={styles.twoCol}>
          <div className={styles.col}>
            {serviceColumns.right.map(t => (
              <Chip key={t.id} label={t.label} icon={t.icon} />
            ))}
          </div>
          <div className={styles.col}>
            {serviceColumns.left.map(t => (
              <Chip key={t.id} label={t.label} icon={t.icon} />
            ))}
          </div>
        </div>
      ) : (
        <p className={styles.bodyMuted}>לא צוינו שירותים</p>
      )}

      {addr ? (
        <>
          <SectionLine />
          <LocationMap address={addr} height={300} />
        </>
      ) : null}

      <SectionLine />
      <SmartInfoBlock address={smartAddr} variant="partners" />
    </div>
  );
}

/* ---------------- שותפים (category 3) — Figma 9:145202 / 9:145239 ---------------- */

const PARTNERS = 'new-profile-pages/partheners/';
const FEMALE_PAIR_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><path d="M10 26L32 11L54 26" stroke="#5ED4EA" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="22.5" cy="32" r="5.4" stroke="#F6C53A" stroke-width="3.2"/><path d="M22.5 37.6L13.2 54h18.6L22.5 37.6Z" stroke="#F6C53A" stroke-width="3.2" stroke-linejoin="round"/><circle cx="41.5" cy="32" r="5.4" stroke="#F6C53A" stroke-width="3.2"/><path d="M41.5 37.6L32.2 54h18.6L41.5 37.6Z" stroke="#F6C53A" stroke-width="3.2" stroke-linejoin="round"/></svg>`;

const SEARCH_PURPOSE_LABELS = {enter: 'מחפש להיכנס', bring_in: 'מחפש להכניס', partner: 'מחפש להכניס'};

const PREFERENCE_META = [
  {key: 'nonSmokers', altKey: 'nonSmoker', label: 'ללא מעשנים', icon: asset(`${PARTNERS}no-smoke.png`)},
  {key: 'students', label: 'סטודנטים', icon: asset(`${PARTNERS}student.png`)},
  {key: 'stableJob', label: 'בעלי עבודה מסודרת', icon: asset(`${PARTNERS}stable-job.png`)},
  {key: 'occasionalJob', label: 'בעלי עבודה מזדמנת', icon: asset(`${PARTNERS}not-stable-jpb.png`)},
  {key: 'immediateEntry', label: 'כניסה מיידית', icon: asset('apr-details/icons_5.png')},
];

function formatMoney(listing, preferPrice) {
  const raw = preferPrice
    ? listing?.price != null && listing?.price !== ''
      ? listing.price
      : listing?.budget
    : listing?.budget != null && listing?.budget !== ''
      ? listing.budget
      : listing?.price;
  if (raw == null || raw === '') return '—';
  const n = Number(String(raw).replace(/[^\d.-]/g, ''));
  if (Number.isNaN(n)) return String(raw).trim() || '—';
  return shekel(n);
}

const ageNumber = (...vals) => {
  for (const v of vals) {
    if (v != null && v !== '') return Number(v);
  }
  return null;
};

export function PartnersListingContent({listing, displayName, mapAddress, adAddress}) {
  const searchKey = firstNonEmpty(listing?.search_purpose, listing?.searchPurposeKey).toLowerCase();
  const isBringIn = searchKey === 'bring_in';
  const isEnter = searchKey === 'enter';
  const purposeTag = listing?.searchPurpose || SEARCH_PURPOSE_LABELS[searchKey] || (searchKey ? searchKey : null);
  const title =
    firstNonEmpty(displayName, listing?.creator_name, listing?.creatorName, listing?.name, listing?.title) || 'משתמש';
  const description = String(listing?.description || '').trim();

  const genderRaw = String(listing?.preferred_gender || listing?.preferredGender || '')
    .trim()
    .toLowerCase();
  const isMale = genderRaw === 'male' || genderRaw === 'גבר';
  const isFemale = genderRaw === 'female' || genderRaw === 'אישה';
  const genderLabel = isMale ? 'לגור עם בנים' : isFemale ? 'לגור עם בנות' : null;

  const ageMin = ageNumber(listing?.preferred_age_min, listing?.preferredAgeMin);
  const ageMax = ageNumber(listing?.preferred_age_max, listing?.preferredAgeMax);
  const hasMin = ageMin != null && !Number.isNaN(ageMin);
  const hasMax = ageMax != null && !Number.isNaN(ageMax);
  const ageLabel =
    hasMin && hasMax ? `גילאים ${ageMin}-${ageMax}` : hasMin ? `גיל מ-${ageMin}` : hasMax ? `גיל עד ${ageMax}` : null;

  const prefTiles = useMemo(() => {
    const prefObj = listing?.preferences && typeof listing.preferences === 'object' ? listing.preferences : {};
    const left = [];
    if (genderLabel) {
      left.push({
        id: 'gender',
        label: genderLabel,
        icon: isMale ? asset(`${PARTNERS}only-man.png`) : null,
        iconXml: isFemale ? FEMALE_PAIR_XML : null,
      });
    }
    if (ageLabel) left.push({id: 'age', label: ageLabel, icon: asset(`${PARTNERS}ages20-30.png`)});
    const right = PREFERENCE_META.filter(
      meta => prefObj[meta.key] === true || (meta.altKey && prefObj[meta.altKey] === true),
    ).map(meta => ({id: meta.key, label: meta.label, icon: meta.icon}));
    return {left, right};
  }, [listing, genderLabel, ageLabel, isMale, isFemale]);

  const mapAddr = firstNonEmpty(mapAddress, listing?.address, listing?.location, listing?.search_address);
  const smartAddr = firstNonEmpty(adAddress, mapAddr);

  return (
    <div className={styles.wrap}>
      {purposeTag ? (
        <div className={styles.tagsRow}>
          <span className={styles.tagWhite}>{purposeTag}</span>
        </div>
      ) : null}
      <h2 className={styles.titleLg}>{title}</h2>

      <SectionLine />
      <Description text={description} />
      <SectionLine />

      <div className={styles.budgetCard}>
        <span className={styles.budgetLabel}>{isBringIn ? 'שכר דירה' : 'התקציב שלי'}</span>
        <span className={styles.budgetValue}>{formatMoney(listing, isBringIn)}</span>
      </div>

      {prefTiles.left.length > 0 || prefTiles.right.length > 0 ? (
        <>
          <SectionLine />
          <h3 className={styles.heading}>העדפות</h3>
          <div className={styles.twoCol}>
            <div className={styles.col}>
              {prefTiles.right.map(t => (
                <Chip key={t.id} label={t.label} icon={t.icon} iconFirst={false} />
              ))}
            </div>
            <div className={styles.col}>
              {prefTiles.left.map(t => (
                <Chip key={t.id} label={t.label} icon={t.icon} iconXml={t.iconXml} iconFirst={false} />
              ))}
            </div>
          </div>
        </>
      ) : null}

      {isBringIn && mapAddr ? (
        <>
          <SectionLine />
          <LocationMap address={mapAddr} height={270} />
        </>
      ) : null}

      {isBringIn || isEnter ? (
        <>
          <SectionLine />
          <SmartInfoBlock address={smartAddr} variant="partners" />
        </>
      ) : null}
    </div>
  );
}

/* ---------------- קרקעות (category 7) ---------------- */

function formatLandArea(unit, area) {
  const n = Number(area);
  if (Number.isNaN(n) || n <= 0) return '—';
  if (unit === 'sqm') return `${n.toLocaleString('he-IL')} מ"ר`;
  const formatted =
    Math.abs(n - Math.round(n)) < 0.001 ? String(Math.round(n)) : n.toLocaleString('he-IL', {maximumFractionDigits: 1});
  return `${formatted} דונם`;
}

function formatLandPrice(price) {
  const n = Number(price);
  if (Number.isNaN(n) || n <= 0) return '—';
  return shekel(n);
}

export function LandListingContent({listing, displayName, displayPiRating = null, publisherAvatarUri, mapAddress, adAddress}) {
  const purpose = firstNonEmpty(listing?.purpose) || (listing?.listingPurpose === 'rent' ? 'להשכרה' : 'למכירה');
  const title = firstNonEmpty(
    listing?.project_name,
    listing?.projectName,
    listing?.property_name,
    listing?.title,
    listing?.name,
    displayName,
  );
  const addr = firstNonEmpty(
    mapAddress,
    listing?.address,
    listing?.location,
    listing?.search_address,
    listing?.land_address,
    listing?.landAddress,
  );
  const smartAddr = firstNonEmpty(adAddress, addr);
  const description = String(listing?.description || '').trim();
  const publisherName = firstNonEmpty(
    displayName,
    listing?.creator_name,
    listing?.creatorName,
    listing?.business_name,
    listing?.name,
  );
  const landParcels = useMemo(() => normalizeLandOfferParcels(listing), [listing]);
  const offersTitle = useMemo(() => landOffersSectionTitle(listing), [listing]);
  const tiles = useMemo(() => {
    const {land_parcel: parcel, land_block: block} = parseLandBlockParcelFromListing(listing);
    const out = [];
    if (block) out.push({id: 'block', kind: 'gush', label: 'גוש', value: block});
    if (parcel) out.push({id: 'parcel', kind: 'gush', label: 'חלקה', value: parcel});
    buildCompanyLandAttrChips(listing).forEach(chip => {
      out.push({id: chip.id, kind: 'attr', label: chip.label, icon: chip.iconSource});
    });
    return out;
  }, [listing]);
  const showPiRating = displayPiRating != null && !Number.isNaN(Number(displayPiRating));

  return (
    <div className={styles.wrap}>
      <div className={styles.piPurposeRow}>
        {showPiRating ? <PiRatingBadge rating={displayPiRating} variant="listing" /> : null}
        <span className={styles.tagWhite}>{purpose}</span>
      </div>
      {title ? <h2 className={styles.titleLg}>{title}</h2> : null}
      <Location text={addr} />

      <SectionLine />

      <div className={styles.postedBy}>
        <span className={styles.postedByLabel}>פורסם ע״י</span>
        <div className={styles.postedByRow}>
          {publisherAvatarUri ? (
            <img className={styles.postedByAvatar} src={publisherAvatarUri} alt="" />
          ) : (
            <span className={`${styles.postedByAvatar} ${styles.postedByAvatarPh}`}>
              <Icon name="account" size={16} />
            </span>
          )}
          <span className={styles.postedByName}>{publisherName || 'משתמש'}</span>
        </div>
      </div>

      <p className={description ? styles.bodyLand : styles.bodyMuted}>{description || 'אין תיאור'}</p>

      {landParcels.length > 0 ? (
        <>
          <SectionLine />
          <h3 className={styles.heading}>{offersTitle}</h3>
          <div className={styles.offers}>
            {landParcels.map((row, idx) => (
              <div key={`land-offer-${idx}`} className={styles.offerCard}>
                <div className={styles.offerHeader}>
                  <img className={styles.offerIcon} src={asset('new-profile-pages/lands/land-offer.png')} alt="" />
                  <span className={styles.offerTitle}>קרקע {idx + 1}</span>
                </div>
                <span className={styles.offerDetails}>
                  {`מחיר: ${formatLandPrice(row?.price)}   |   גודל: ${formatLandArea(row?.unit, row?.area)}`}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {tiles.length > 0 ? (
        <>
          <SectionLine />
          <div className={styles.landGrid}>
            {tiles.map(tile =>
              tile.kind === 'gush' ? (
                <div key={tile.id} className={styles.gushCard}>
                  <span className={styles.gushLabel}>{tile.label}:</span>
                  <span className={styles.gushValue}>{String(tile.value)}</span>
                </div>
              ) : (
                <Chip key={tile.id} label={tile.label} icon={tile.icon} iconFirst={false} />
              ),
            )}
          </div>
        </>
      ) : null}

      {addr ? (
        <>
          <SectionLine />
          <LocationMap address={addr} height={300} />
        </>
      ) : null}

      <SectionLine />
      <SmartInfoBlock address={smartAddr} variant="partners" />
    </div>
  );
}
