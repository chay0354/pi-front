import {useEffect, useRef, useState} from 'react';
import radioChecked from '../assets/figma/filter-panel/radio-checked.svg';
import radio from '../assets/figma/filter-panel/radio.svg';
import iconClose from '../assets/figma/filter-panel/close.svg';
import divider from '../assets/figma/filter-panel/divider.svg';
import {
  BNB_REGIONS,
  apartmentTypeOptions,
  priceLimits,
  typeOptions,
} from '../feed/feedFilters';
import styles from './FilterPopup.module.css';

const TITLES = {
  search: 'חיפוש מודעה',
  city: 'עיר',
  apartmentType: 'סוג דירה',
  type: 'סוג',
  office: 'סוג',
  rooms: 'חדרים',
  meter: 'מטר',
  donam: 'דונם',
  preferences: 'העדפות',
  price: 'מחיר',
};

const digits = v => String(v ?? '').replace(/[^\d]/g, '');
const formatMoney = n => (n == null || n === '' ? '' : Number(n).toLocaleString('en-US'));

function CheckRow({label, checked, onToggle}) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} className={styles.checkRow} onClick={onToggle}>
      <img className={styles.checkMark} src={checked ? radioChecked : radio} alt="" />
      <span className={styles.checkLabel}>{label}</span>
    </button>
  );
}

function Stepper({label, value, suffix, min = 0, max = Infinity, onChange, placeholder}) {
  const [draft, setDraft] = useState(String(value ?? ''));
  useEffect(() => setDraft(String(value ?? '')), [value]);
  const clamp = n => Math.max(min, Math.min(max, n));
  const commit = () => {
    const d = digits(draft);
    if (!d) {
      if (placeholder) onChange(null);
      else setDraft(String(value ?? ''));
      return;
    }
    onChange(clamp(parseInt(d, 10)));
  };
  return (
    <div className={styles.field}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.stepper}>
        <button type="button" className={styles.stepBtn} aria-label="הוסף" onClick={() => onChange(clamp((value ?? min) + 1))}>
          +
        </button>
        <span className={styles.stepValue}>
          <input
            className={styles.stepInput}
            inputMode="numeric"
            value={draft}
            placeholder={placeholder}
            size={Math.max(2, draft.length || (placeholder ? placeholder.length : 2))}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => e.key === 'Enter' && commit()}
          />
          {suffix && value != null && <span>{suffix}</span>}
        </span>
        <button type="button" className={styles.stepBtn} aria-label="הפחת" onClick={() => onChange(clamp((value ?? min) - 1))}>
          −
        </button>
      </div>
    </div>
  );
}

function QtyPills({value, onChange}) {
  return (
    <div className={styles.qtyRow}>
      {[1, 2, 3, 4].map(q => (
        <button
          key={q}
          type="button"
          className={`${styles.qty} ${value === q ? styles.qtySelected : ''}`}
          aria-pressed={value === q}
          onClick={() => onChange(q)}>
          <span className={styles.qtyDot} aria-hidden />
          {q}
        </button>
      ))}
    </div>
  );
}

function TextField({label, value, onChange, placeholder, autoFocus}) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input
        className={styles.text}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  );
}

/** Two thumbs on one track; RTL like mobile (minimum on the right). */
function RangeSlider({min, max, step, lo, hi, onChange}) {
  const pct = v => ((v - min) / (max - min)) * 100;
  return (
    <div className={styles.range}>
      <span className={styles.rangeTrack}>
        <span className={styles.rangeFill} style={{right: `${pct(lo)}%`, left: `${100 - pct(hi)}%`}} />
      </span>
      <input
        type="range"
        aria-label="מינימום"
        min={min}
        max={max}
        step={step}
        value={lo}
        onChange={e => onChange(Math.min(Number(e.target.value), hi), hi)}
      />
      <input
        type="range"
        aria-label="מקסימום"
        min={min}
        max={max}
        step={step}
        value={hi}
        onChange={e => onChange(lo, Math.max(Number(e.target.value), lo))}
      />
    </div>
  );
}

function Divider() {
  return <hr className={styles.divider} />;
}

/* ---------- sheets: each returns {body, save} where save() → value or null ---------- */

function useSearchSheet(value) {
  const [q, setQ] = useState(value || '');
  return {
    body: (
      <TextField
        label="מה לחפש?"
        value={q}
        onChange={setQ}
        placeholder="לדוגמה: דירת 4 חדרים בתל אביב עד 2 מיליון"
        autoFocus
      />
    ),
    save: () => q.trim() || null,
  };
}

function useCitySheet(value, category) {
  const c = Number(category);
  const isGlobal = c === 4;
  const isBnb = c === 5;
  const showImmediate = !isBnb && !isGlobal && c !== 7;
  const [country, setCountry] = useState(value?.country || '');
  const [city, setCity] = useState(value?.city || '');
  const [street, setStreet] = useState(value?.street || '');
  const [immediateEntry, setImmediateEntry] = useState(Boolean(value?.immediateEntry));
  const [regions, setRegions] = useState(value?.regions || []);
  const toggleRegion = id => setRegions(prev => (prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]));
  return {
    body: (
      <>
        {isGlobal && <TextField label="ארץ" value={country} onChange={setCountry} placeholder="הזן שם ארץ" />}
        <TextField label="עיר" value={city} onChange={setCity} placeholder="הזן שם עיר" autoFocus={!isGlobal} />
        <TextField label="רחוב" value={street} onChange={setStreet} placeholder="הזן שם רחוב" />
        {showImmediate && (
          <CheckRow label="כניסה מיידית" checked={immediateEntry} onToggle={() => setImmediateEntry(v => !v)} />
        )}
        {isBnb && (
          <div className={styles.field}>
            <span className={styles.label}>אזור</span>
            {BNB_REGIONS.map(r => (
              <CheckRow key={r.id} label={r.label} checked={regions.includes(r.id)} onToggle={() => toggleRegion(r.id)} />
            ))}
          </div>
        )}
      </>
    ),
    save: () => {
      const next = {
        country: isGlobal && country.trim() ? country.trim() : null,
        city: city.trim() || null,
        street: street.trim() || null,
        regions: isBnb && regions.length > 0 ? regions : null,
        immediateEntry: showImmediate && immediateEntry ? true : null,
      };
      return Object.values(next).some(v => v != null) ? next : null;
    },
  };
}

function useChoiceSheet(value, options) {
  const [selected, setSelected] = useState(Array.isArray(value) ? value : value ? [value] : []);
  const toggle = id => setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  return {
    body: options.map(o => (
      <CheckRow key={o.id} label={o.label} checked={selected.includes(o.id)} onToggle={() => toggle(o.id)} />
    )),
    save: () => (selected.length > 0 ? selected : null),
  };
}

function useRoomsSheet(value, category) {
  const isBnb = Number(category) === 5;
  const [area, setArea] = useState(value?.area ?? 60);
  const [rooms, setRooms] = useState(value?.rooms ?? 2);
  const [floor, setFloor] = useState(value?.floor ?? 2);
  const [parkingOn, setParkingOn] = useState(value?.parking != null);
  const [parking, setParking] = useState(value?.parking ?? 1);
  const [balconyOn, setBalconyOn] = useState(value?.balcony != null);
  const [balcony, setBalcony] = useState(value?.balcony ?? 1);
  const [elevator, setElevator] = useState(Boolean(value?.elevator));
  const [mamad, setMamad] = useState(Boolean(value?.mamad));
  const [freeParking, setFreeParking] = useState(Boolean(value?.freeParking));
  return {
    body: (
      <>
        {!isBnb && <Stepper label="שטח הנכס" value={area} suffix='מ"ר' min={1} onChange={setArea} />}
        <Stepper label="מספר חדרים" value={rooms} min={1} onChange={setRooms} />
        <Stepper label="קומה" value={floor} onChange={setFloor} />
        <CheckRow label={isBnb ? 'כמות חנייה' : 'חנייה'} checked={parkingOn} onToggle={() => setParkingOn(v => !v)} />
        {parkingOn && <QtyPills value={parking} onChange={setParking} />}
        <Divider />
        {!isBnb && (
          <>
            <CheckRow label="מרפסת" checked={balconyOn} onToggle={() => setBalconyOn(v => !v)} />
            {balconyOn && <QtyPills value={balcony} onChange={setBalcony} />}
            <Divider />
          </>
        )}
        {isBnb && (
          <>
            <CheckRow label="חנייה בחינם" checked={freeParking} onToggle={() => setFreeParking(v => !v)} />
            <Divider />
          </>
        )}
        <CheckRow label="מעלית" checked={elevator} onToggle={() => setElevator(v => !v)} />
        <Divider />
        <CheckRow label='ממ"ד' checked={mamad} onToggle={() => setMamad(v => !v)} />
      </>
    ),
    save: () => ({
      area: isBnb ? null : area,
      rooms,
      floor,
      parking: parkingOn ? parking : null,
      balcony: !isBnb && balconyOn ? balcony : null,
      elevator: elevator || null,
      mamad: mamad || null,
      freeParking: (isBnb && freeParking) || null,
    }),
  };
}

function useMeterSheet(value) {
  const [meter, setMeter] = useState(value ?? 50);
  return {
    body: <Stepper value={meter} suffix='מ"ר' min={1} max={999999} placeholder="ללא סינון" onChange={setMeter} />,
    save: () => meter,
  };
}

function useDonamSheet(value) {
  const [minDonam, setMin] = useState(value?.minDonam ?? 1);
  const [maxDonam, setMax] = useState(value?.maxDonam ?? 2);
  return {
    body: (
      <div className={styles.pair}>
        <Stepper label="מ-" value={minDonam} min={0} onChange={setMin} />
        <span className={styles.dash}>-</span>
        <Stepper label="עד" value={maxDonam} min={0} onChange={setMax} />
      </div>
    ),
    save: () => ({minDonam, maxDonam}),
  };
}

function useOfficeSheet(value) {
  const [v, setV] = useState({
    office: false,
    wholeFloor: false,
    sharedSpaces: false,
    minArea: 50,
    minRooms: 2,
    parking: false,
    elevator: false,
    mamad: false,
    ...value,
  });
  const set = (key, val) => setV(prev => ({...prev, [key]: val}));
  const flip = key => () => set(key, !v[key]);
  return {
    body: (
      <>
        <CheckRow label="משרד" checked={v.office} onToggle={flip('office')} />
        <CheckRow label="קומה שלמה" checked={v.wholeFloor} onToggle={flip('wholeFloor')} />
        <CheckRow label="חללים משותפים" checked={v.sharedSpaces} onToggle={flip('sharedSpaces')} />
        <Divider />
        <Stepper label="גודל המשרד" value={v.minArea} suffix="מ״ר" min={1} onChange={n => set('minArea', n)} />
        <Stepper label="מספר חדרים" value={v.minRooms} onChange={n => set('minRooms', n)} />
        <Divider />
        <CheckRow label="חניה" checked={v.parking} onToggle={flip('parking')} />
        <CheckRow label="מעלית" checked={v.elevator} onToggle={flip('elevator')} />
        <CheckRow label="ממ״ד" checked={v.mamad} onToggle={flip('mamad')} />
      </>
    ),
    save: () => v,
  };
}

function usePreferencesSheet(value) {
  const [v, setV] = useState({
    gender: 'female',
    ageMin: 20,
    ageMax: 40,
    nonSmoker: false,
    students: false,
    stableJob: false,
    occasionalJob: false,
    immediateEntry: false,
    ...value,
  });
  const set = (key, val) => setV(prev => ({...prev, [key]: val}));
  const flip = key => () => set(key, !v[key]);
  return {
    body: (
      <>
        <span className={styles.label}>מין</span>
        <div className={styles.genderRow}>
          {[
            ['female', 'אישה'],
            ['male', 'גבר'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={v.gender === id}
              className={`${styles.gender} ${v.gender === id ? styles.genderSelected : ''}`}
              onClick={() => set('gender', id)}>
              {label}
              <span className={styles.qtyDot} aria-hidden />
            </button>
          ))}
        </div>
        <Divider />
        <span className={styles.label}>גיל מועדף</span>
        <div className={styles.rangeValues}>
          <span>{v.ageMin}</span>
          <span className={styles.rangeSep} />
          <span>{v.ageMax}</span>
        </div>
        <RangeSlider min={18} max={100} step={1} lo={v.ageMin} hi={v.ageMax} onChange={(lo, hi) => setV(p => ({...p, ageMin: lo, ageMax: hi}))} />
        <Divider />
        <CheckRow label="ללא מעשנים" checked={v.nonSmoker} onToggle={flip('nonSmoker')} />
        <CheckRow label="סטודנטים" checked={v.students} onToggle={flip('students')} />
        <CheckRow label="בעלי עבודה מסודרת" checked={v.stableJob} onToggle={flip('stableJob')} />
        <CheckRow label="בעלי עבודה מזדמנת" checked={v.occasionalJob} onToggle={flip('occasionalJob')} />
        <CheckRow label="כניסה מיידית" checked={v.immediateEntry} onToggle={flip('immediateEntry')} />
      </>
    ),
    save: () => v,
  };
}

function MoneyInput({label, value, onChange}) {
  return (
    <label className={styles.money}>
      <span className={styles.srOnly}>{label}</span>
      <span className={styles.moneyPrefix}>₪</span>
      <input inputMode="numeric" placeholder="0" value={formatMoney(value)} onChange={e => onChange(digits(e.target.value))} />
    </label>
  );
}

function usePriceSheet(value, category) {
  const isBnb = Number(category) === 5;
  const {cap, step, defaultMax} = priceLimits(category);
  const [minPrice, setMin] = useState(value?.minPrice ?? 0);
  const [maxPrice, setMax] = useState(value?.maxPrice ?? defaultMax);
  const [checkInDate, setCheckIn] = useState(value?.checkInDate || '');
  const [checkOutDate, setCheckOut] = useState(value?.checkOutDate || '');
  const [freeCancellation, setFreeCancellation] = useState(Boolean(value?.freeCancellation));
  const [hotDealOnly, setHotDealOnly] = useState(Boolean(value?.hotDealOnly));
  const clampNum = s => Math.max(0, Math.min(cap, Number(s || 0)));
  return {
    body: (
      <>
        <div className={styles.pair}>
          <MoneyInput label="מחיר מינימום" value={minPrice} onChange={s => setMin(clampNum(s))} />
          <span className={styles.dash}>-</span>
          <MoneyInput label="מחיר מקסימום" value={maxPrice} onChange={s => setMax(clampNum(s))} />
        </div>
        <RangeSlider
          min={0}
          max={cap}
          step={step}
          lo={Math.min(minPrice, maxPrice)}
          hi={Math.max(minPrice, maxPrice)}
          onChange={(lo, hi) => {
            setMin(lo);
            setMax(hi);
          }}
        />
        <div className={styles.rangeEnds}>
          <span>₪0</span>
          <span>+₪{formatMoney(cap)}</span>
        </div>
        {isBnb && (
          <>
            <Divider />
            <div className={styles.pair}>
              <label className={styles.field}>
                <span className={styles.label}>צ׳ק אין</span>
                <input type="date" className={styles.text} value={checkInDate} onChange={e => setCheckIn(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>צ׳ק אאוט</span>
                <input type="date" className={styles.text} value={checkOutDate} onChange={e => setCheckOut(e.target.value)} />
              </label>
            </div>
            <CheckRow label="ביטול ללא קנס" checked={freeCancellation} onToggle={() => setFreeCancellation(v => !v)} />
            <CheckRow label="דיל משתלם" checked={hotDealOnly} onToggle={() => setHotDealOnly(v => !v)} />
          </>
        )}
      </>
    ),
    save: () => ({
      minPrice: Math.min(minPrice, maxPrice),
      maxPrice: Math.max(minPrice, maxPrice),
      ...(isBnb && {
        checkInDate: checkInDate || null,
        checkOutDate: checkOutDate || null,
        freeCancellation,
        hotDealOnly,
      }),
    }),
  };
}

const asSheet = useSheet =>
  function Sheet({value, category, saveRef}) {
    const sheet = useSheet(value, category);
    saveRef.current = sheet.save;
    return sheet.body;
  };

const SHEETS = {
  search: asSheet(useSearchSheet),
  city: asSheet(useCitySheet),
  apartmentType: asSheet((value, category) => useChoiceSheet(value, apartmentTypeOptions(category))),
  type: asSheet((value, category) => useChoiceSheet(value, typeOptions(category))),
  office: asSheet(useOfficeSheet),
  rooms: asSheet(useRoomsSheet),
  meter: asSheet(useMeterSheet),
  donam: asSheet(useDonamSheet),
  preferences: asSheet(usePreferencesSheet),
  price: asSheet(usePriceSheet),
};

/**
 * Desktop counterpart of the mobile filter sheets, docked over the left side of the feed
 * (Figma 1238:203559 "piai panel"): same controls, gold "שמור" and "נקה" (clear saves null).
 */
export default function FilterPopup({
  kind,
  title,
  icon,
  value,
  category,
  onSave,
  onClose,
  keepOpenOnSave = false,
  loading = false,
  loadingMessage = '',
}) {
  const saveRef = useRef(() => null);
  const Sheet = SHEETS[kind];
  const heading = title || TITLES[kind];

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = () => {
    if (loading) return;
    const next = saveRef.current();
    onSave(next);
    if (!keepOpenOnSave || next == null) onClose();
  };

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden />
      <section
        className={styles.popup}
        role="dialog"
        aria-label={heading}
        onKeyDown={e => {
          if (e.key === 'Enter' && e.target instanceof HTMLInputElement && e.target.type !== 'range') save();
        }}>
        <header className={styles.header}>
          <span className={styles.headerSpacer} aria-hidden />
          <div className={styles.heading}>
            {icon && (
              <span className={styles.headingIcon}>
                <img src={icon} alt="" />
              </span>
            )}
            <h2 className={styles.title}>{heading}</h2>
          </div>
          <button type="button" className={styles.close} aria-label="סגור" onClick={onClose}>
            <img src={iconClose} alt="" />
          </button>
        </header>
        <div className={styles.slot}>
          <div className={styles.topDivider} aria-hidden>
            <img src={divider} alt="" />
          </div>
          <div className={styles.body} aria-busy={loading}>
            <Sheet value={value} category={category} saveRef={saveRef} />
            {loading && (
              <div className={styles.loading} role="status">
                <span className={styles.spinner} aria-hidden />
                <span className={styles.loadingText} dir="auto">
                  {loadingMessage || 'מחפש...'}
                </span>
              </div>
            )}
          </div>
        </div>
        <footer className={styles.footer}>
          <button type="button" className={styles.save} onClick={save} disabled={loading}>
            {loading ? 'מחפש...' : 'שמור'}
          </button>
          <button
            type="button"
            className={styles.clear}
            disabled={loading}
            onClick={() => {
              onSave(null);
              onClose();
            }}>
            נקה
          </button>
        </footer>
      </section>
    </>
  );
}
