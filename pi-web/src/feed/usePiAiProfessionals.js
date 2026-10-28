import {useEffect, useState} from 'react';
import {getProfessionalsDirectory} from '../api/client';

const IDLE = {status: 'idle', query: '', rows: [], message: ''};

const TYPE_KEYS = [
  {type: 'עורך דין', keys: ['עורך דין', 'עורכי דין', 'עו"ד', 'עו״ד'], plural: 'עורכי דין'},
  {type: 'יועץ משכנתאות', keys: ['יועץ משכנתאות', 'יועצי משכנתאות', 'ייעוץ משכנתאות'], plural: 'יועצי משכנתאות'},
  {type: 'מלווה משקיעים', keys: ['מלווה משקיעים', 'מלווים למשקיעים'], plural: 'מלווים למשקיעים'},
  {type: 'עיצוב פנים', keys: ['עיצוב פנים', 'מעצבי פנים', 'מעצב פנים'], plural: 'מעצבי פנים'},
  {type: 'שמאות', keys: ['שמאות', 'שמאי', 'שמאים'], plural: 'שמאים'},
  {type: 'אדריכלות', keys: ['אדריכלות', 'אדריכל', 'אדריכלים'], plural: 'אדריכלים'},
  {type: 'תיווך', keys: ['תיווך', 'מתווך', 'מתווכים'], plural: 'מתווכים'},
];

const STOP = new Set([
  'אני',
  'מחפש',
  'מחפשת',
  'לי',
  'כמו',
  'בתחום',
  'הנדלן',
  'נדלן',
  'נדל״ן',
  'נדל"ן',
  'בעל',
  'מקצוע',
  'בעלי',
  'המתמחה',
  'מתמחה',
  'עם',
  'את',
  'של',
]);

const normalize = value =>
  String(value || '')
    .toLowerCase()
    .replace(/[״"׳']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const asList = value => {
  if (Array.isArray(value)) return value.map(v => String(v || '').trim()).filter(Boolean);
  if (typeof value !== 'string') return [];
  const raw = value.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return asList(parsed);
  } catch {
    /* plain */
  }
  return [raw];
};

const itemTypes = item =>
  String(item?.subscription_type || '').trim().toLowerCase() === 'broker' ? ['תיווך'] : asList(item?.types);

export function matchProfessionalType(query) {
  const q = normalize(query);
  return TYPE_KEYS.find(entry => entry.keys.some(key => q.includes(normalize(key)))) || null;
}

export function inferPiAiKind(query) {
  const q = normalize(query);
  if (!q) return 'listings';
  if (q.includes('בעל מקצוע') || q.includes('בעלי מקצוע')) return 'professionals';
  if (matchProfessionalType(q)) return 'professionals';
  return 'listings';
}

function filterProfessionals(list, query) {
  const matched = matchProfessionalType(query);
  if (matched) {
    return list.filter(item => itemTypes(item).some(type => type === matched.type || normalize(type) === normalize(matched.type)));
  }
  const tokens = normalize(query)
    .split(' ')
    .filter(token => token.length >= 2 && !STOP.has(token));
  if (!tokens.length) return list;
  return list.filter(item => {
    const hay = normalize(
      [item?.display_name, item?.bio, item?.address, ...itemTypes(item), ...asList(item?.specializations)].join(' '),
    );
    return tokens.some(token => hay.includes(token));
  });
}

export function buildProfessionalReply(query, count) {
  const matched = matchProfessionalType(query);
  const label = matched?.plural || 'בעלי מקצוע';
  if (count === 0) return `לא מצאתי ${label} שמתאימים. נסו לנסח אחרת.`;
  if (count === 1) return `מצאתי לך ${matched ? `${label.replace(/ים$/, '')} אחד` : 'בעל מקצוע אחד'} המתמחה בנדל״ן.`;
  return `מצאתי לך ${label} המתמחים בנדל״ן בעלי מקצוע.`;
}

let catalogPromise = null;

function loadProfessionals() {
  if (!catalogPromise) {
    catalogPromise = getProfessionalsDirectory()
      .then(res => (Array.isArray(res?.professionals) ? res.professionals : []))
      .catch(error => {
        catalogPromise = null;
        throw error;
      });
  }
  return catalogPromise;
}

export function usePiAiProfessionals(query) {
  const [state, setState] = useState(IDLE);
  const q = String(query || '').trim();

  useEffect(() => {
    if (!q) {
      setState(IDLE);
      return undefined;
    }
    let cancelled = false;
    setState({status: 'loading', query: q, rows: [], message: 'מחפש בעלי מקצוע עבורך…'});
    loadProfessionals()
      .then(list => {
        if (cancelled) return;
        const rows = filterProfessionals(list, q);
        setState({
          status: 'ready',
          query: q,
          rows,
          message: buildProfessionalReply(q, rows.length),
        });
      })
      .catch(() => {
        if (!cancelled) {
          setState({status: 'error', query: q, rows: [], message: 'החיפוש נכשל. בדוק את החיבור ונסה שוב.'});
        }
      });
    return () => {
      cancelled = true;
    };
  }, [q]);

  return state;
}
