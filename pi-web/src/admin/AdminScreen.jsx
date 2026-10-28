import {useEffect, useMemo, useState} from 'react';
import {API_URL} from '../publicConfig';
import styles from './AdminScreen.module.css';

const TOKEN_KEY = 'pi_admin_token';
const PAGE = 40;
const B2B = new Set(['broker', 'company', 'professional', 'project_marketer']);

const STATUS_LABELS = {
  pending_verification: 'ממתין לאימות',
  verified: 'מאומת',
  active: 'פעיל',
  suspended: 'מושהה',
};

const MILESTONES = [
  {id: 'started', label: 'התחילו הרשמה', pick: () => true},
  {
    id: 'verified',
    label: 'אימתו מייל',
    pick: user => user.status === 'verified' || user.status === 'active',
  },
  {id: 'registered', label: 'סיימו הרשמה', pick: user => user.hasPassword},
  {
    id: 'subscribed',
    label: 'פתחו מנוי',
    pick: user => B2B.has(user.type) && (user.status === 'verified' || user.status === 'active'),
  },
  {
    id: 'drafted',
    label: 'הגיעו לטיוטה',
    pick: user => user.drafts + user.ads + user.posts > 0,
  },
  {id: 'published', label: 'פרסמו מודעה', pick: user => user.ads > 0},
  {id: 'posted', label: 'פרסמו פוסט', pick: user => user.posts > 0},
];

function formatCount(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString('he-IL');
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('he-IL', {day: '2-digit', month: '2-digit', year: '2-digit'});
}

function formatDay(value) {
  const [, month, day] = String(value).split('-');
  return `${day}.${month}`;
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function apiError(response, body) {
  if (response.status === 404) {
    return 'השרת עדיין לא כולל את מסך הניהול. צריך לפרוס את pi-back ולהגדיר ADMIN_PASSWORD.';
  }
  return body.error || 'הפעולה נכשלה';
}

export default function AdminScreen() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState({kind: 'all'});
  const [shown, setShown] = useState(PAGE);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    document.title = 'ניהול · Pi 2701';
    document.documentElement.classList.add('pi-admin');
    return () => {
      document.documentElement.classList.remove('pi-admin');
      document.title = 'Pi 2701';
    };
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    const controller = new AbortController();
    setBusy(true);
    setLoadError('');
    fetch(`${API_URL}/api/admin/overview`, {
      headers: {'x-admin-token': token},
      signal: controller.signal,
    })
      .then(async response => {
        const body = await readJson(response);
        if (response.status === 401) {
          sessionStorage.removeItem(TOKEN_KEY);
          setToken('');
          setLoginError('ההתחברות פגה. נסו שוב.');
          return;
        }
        if (!response.ok) throw new Error(apiError(response, body));
        setData(body);
      })
      .catch(error => {
        if (error.name === 'AbortError') return;
        setLoadError(error.message || 'טעינה נכשלה');
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [token, tick]);

  const stageLabels = useMemo(() => {
    const map = {};
    (data?.stages || []).forEach(item => {
      map[item.id] = item.label;
    });
    return map;
  }, [data]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.users || []).filter(user => {
      if (focus.kind === 'stage' && user.stage !== focus.id) return false;
      if (focus.kind === 'reach') {
        const milestone = MILESTONES.find(item => item.id === focus.id);
        if (milestone && !milestone.pick(user)) return false;
      }
      if (!needle) return true;
      return [user.name, user.email, user.phone, user.typeLabel]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [data, query, focus]);

  const milestones = useMemo(() => {
    const users = data?.users || [];
    return MILESTONES.map(item => ({
      ...item,
      count: users.filter(item.pick).length,
    }));
  }, [data]);

  async function onLogin(event) {
    event.preventDefault();
    setBusy(true);
    setLoginError('');
    try {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({password}),
      });
      const body = await readJson(response);
      if (!response.ok || !body.token) throw new Error(apiError(response, body));
      sessionStorage.setItem(TOKEN_KEY, body.token);
      setPassword('');
      setToken(body.token);
    } catch (error) {
      setLoginError(error.message || 'התחברות נכשלה');
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken('');
    setData(null);
    setQuery('');
    setFocus({kind: 'all'});
  }

  if (!token) {
    return (
      <main className={styles.gate}>
        <form className={styles.card} onSubmit={onLogin}>
          <p className={styles.brand}>Pi 2701</p>
          <h1>ניהול האתר והאפליקציה</h1>
          <p className={styles.lead}>אותו מסד נתונים לאתר ולאפליקציה. הסיסמה נקבעת בשרת.</p>
          <label>
            סיסמת מנהל
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
            />
          </label>
          {loginError ? <p className={styles.error}>{loginError}</p> : null}
          <button className={styles.primary} type="submit" disabled={busy || !password}>
            {busy ? 'בודק…' : 'כניסה'}
          </button>
          <a className={styles.back} href="/">
            חזרה לאתר
          </a>
        </form>
      </main>
    );
  }

  const totals = data?.totals;
  const maxMilestone = Math.max(1, ...milestones.map(item => item.count));
  const maxStage = Math.max(1, ...Object.values(data?.stageCounts || {x: 1}));
  const maxSignup = Math.max(1, ...(data?.signups || []).map(item => item.count));
  const maxCategory = Math.max(1, ...(data?.byCategory || []).map(item => item.count));
  const maxType = Math.max(1, ...(data?.byType || []).map(item => item.count));

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <div>
          <p className={styles.brand}>Pi 2701</p>
          <h1>לוח ניהול</h1>
          <p className={styles.lead}>האתר והאפליקציה, אותם משתמשים ומודעות.</p>
        </div>
        <div className={styles.topActions}>
          <button type="button" onClick={() => setTick(value => value + 1)} disabled={busy}>
            {busy ? 'טוען…' : 'רענון'}
          </button>
          <a href="/">לאתר</a>
          <button type="button" onClick={logout}>
            יציאה
          </button>
        </div>
      </header>

      {loadError ? <p className={styles.error}>{loadError}</p> : null}
      {!data && busy ? <p className={styles.lead}>טוען נתונים…</p> : null}

      {totals ? (
        <>
          <section>
            <h2>אנשים</h2>
            <div className={styles.stats}>
              <Stat label="משתמשים" value={totals.users} />
              <Stat label="חדשים ב־7 ימים" value={totals.new7} />
              <Stat label="חדשים ב־30 יום" value={totals.new30} />
              <Stat label="עם סיסמה" value={totals.withPassword} />
              <Stat label="מייל מאומת" value={totals.verified} />
              <Stat label="מנוי פתוח" value={totals.subscribed} />
              <Stat label="מנוי שפג" value={totals.expired} />
              <Stat label="מושהים" value={data.byStatus?.suspended || 0} />
            </div>
          </section>

          <section>
            <h2>תוכן</h2>
            <div className={styles.stats}>
              <Stat label="מודעות פורסמו" value={totals.publishedAds} />
              <Stat label="טיוטות" value={totals.draftAds} />
              <Stat label="פוסטים" value={totals.posts} />
              <Stat label="מודעות מוקפאות" value={totals.frozen} />
              <Stat label="צפיות" value={totals.views} />
              <Stat label="לייקים" value={totals.likes} />
            </div>
          </section>

          <section>
            <h2>פעילות</h2>
            <div className={styles.stats}>
              <Stat label="שיחות" value={totals.conversations} />
              <Stat label="הודעות" value={totals.messages} />
              <Stat label="סטוריז" value={totals.stories} />
              <Stat label="עוקבים" value={totals.follows} />
              <Stat label="ביקורות" value={totals.reviews} />
              <Stat label="תגובות" value={totals.comments} />
              <Stat label="משוב לשיפור" value={totals.feedback} />
              <Stat label="דיווחים" value={totals.reports} />
            </div>
          </section>

          <section className={styles.panel}>
            <h2>עד איזה שלב הגיע כל אחד</h2>
            <p className={styles.hint}>
              כל אדם נספר בכל נקודה שעבר, גם אם המשיך הלאה. פתיחת מנוי נספרת רק למי שבאמת פתח מנוי.
            </p>
            <div className={styles.bars}>
              {milestones.map(item => (
                <Bar
                  key={item.id}
                  label={item.label}
                  count={item.count}
                  max={maxMilestone}
                  onClick={() => {
                    setFocus(item.id === 'started' ? {kind: 'all'} : {kind: 'reach', id: item.id});
                    setShown(PAGE);
                  }}
                />
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <h2>איפה נעצרו</h2>
            <p className={styles.hint}>השלב הרחוק ביותר של כל משתמש. כל אדם מופיע פעם אחת.</p>
            <div className={styles.bars}>
              {(data.stages || []).map(item => (
                <Bar
                  key={item.id}
                  label={item.label}
                  count={data.stageCounts?.[item.id] || 0}
                  max={maxStage}
                  onClick={() => {
                    setFocus({kind: 'stage', id: item.id});
                    setShown(PAGE);
                  }}
                />
              ))}
            </div>
          </section>

          <div className={styles.split}>
            <section className={styles.panel}>
              <h2>לפי סוג חשבון</h2>
              <div className={styles.bars}>
                {(data.byType || []).map(item => (
                  <Bar key={item.id} label={item.label} count={item.count} max={maxType} />
                ))}
              </div>
            </section>
            <section className={styles.panel}>
              <h2>מודעות לפי קטגוריה</h2>
              <div className={styles.bars}>
                {(data.byCategory || []).length === 0 ? (
                  <p className={styles.hint}>אין מודעות שפורסמו.</p>
                ) : (
                  data.byCategory.map(item => (
                    <Bar key={item.id} label={item.label} count={item.count} max={maxCategory} />
                  ))
                )}
              </div>
            </section>
          </div>

          <section className={styles.panel}>
            <h2>הרשמות ב־14 הימים האחרונים</h2>
            <div className={styles.days}>
              {(data.signups || []).map(item => (
                <div key={item.day} className={styles.day} title={`${item.day}: ${item.count}`}>
                  <span className={styles.dayCount}>{item.count}</span>
                  <span className={styles.dayTrack}>
                    <span style={{height: `${Math.max(item.count ? 8 : 0, (item.count / maxSignup) * 100)}%`}} />
                  </span>
                  <span className={styles.dayLabel}>{formatDay(item.day)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.tableHead}>
              <h2>משתמשים</h2>
              <p className={styles.hint}>
                {formatCount(filtered.length)} מתוך {formatCount(data.users.length)}
              </p>
            </div>
            <div className={styles.filters}>
              <input
                value={query}
                onChange={event => {
                  setQuery(event.target.value);
                  setShown(PAGE);
                }}
                placeholder="חיפוש לפי שם, מייל או טלפון"
              />
              <div className={styles.chips}>
                <Chip active={focus.kind === 'all'} onClick={() => setFocus({kind: 'all'})}>
                  הכל
                </Chip>
                {(data.stages || []).map(item => (
                  <Chip
                    key={item.id}
                    active={focus.kind === 'stage' && focus.id === item.id}
                    onClick={() => setFocus({kind: 'stage', id: item.id})}
                  >
                    {item.label}
                  </Chip>
                ))}
              </div>
            </div>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>שם</th>
                    <th>מייל</th>
                    <th>טלפון</th>
                    <th>סוג</th>
                    <th>סטטוס</th>
                    <th>נעצר ב</th>
                    <th>טיוטות</th>
                    <th>מודעות</th>
                    <th>פוסטים</th>
                    <th>צפיות</th>
                    <th>נרשם</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, shown).map(user => (
                    <tr key={user.id}>
                      <td>{user.name || 'ללא שם'}</td>
                      <td>{user.email || '—'}</td>
                      <td>{user.phone || '—'}</td>
                      <td>{user.typeLabel}</td>
                      <td>{STATUS_LABELS[user.status] || user.status || '—'}</td>
                      <td>{stageLabels[user.stage] || user.stage}</td>
                      <td>{user.drafts}</td>
                      <td>{user.ads}</td>
                      <td>{user.posts}</td>
                      <td>{formatCount(user.views)}</td>
                      <td>{formatDate(user.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 ? <p className={styles.hint}>אין משתמשים תואמים.</p> : null}
            </div>
            {shown < filtered.length ? (
              <button className={styles.more} type="button" onClick={() => setShown(count => count + PAGE)}>
                הצג עוד ({formatCount(filtered.length - shown)})
              </button>
            ) : null}
          </section>

          <section className={styles.panel}>
            <h2>מודעות ופוסטים אחרונים</h2>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>כותרת</th>
                    <th>סוג</th>
                    <th>סטטוס</th>
                    <th>קטגוריה</th>
                    <th>צפיות</th>
                    <th>תאריך</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.recentAds || []).map(ad => (
                    <tr key={ad.id}>
                      <td>{ad.title}</td>
                      <td>{ad.kind}</td>
                      <td>{ad.status}</td>
                      <td>{ad.category || '—'}</td>
                      <td>{formatCount(ad.views)}</td>
                      <td>{formatDate(ad.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(data.recentAds || []).length === 0 ? <p className={styles.hint}>אין מודעות.</p> : null}
            </div>
          </section>
          <p className={styles.updated}>עודכן {formatDate(data.generatedAt)} · {new Date(data.generatedAt).toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit'})}</p>
        </>
      ) : null}
    </main>
  );
}

function Stat({label, value}) {
  return (
    <article className={styles.stat}>
      <p>{formatCount(value)}</p>
      <span>{label}</span>
    </article>
  );
}

function Bar({label, count, max, onClick}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={styles.bar} type={onClick ? 'button' : undefined} onClick={onClick}>
      <span className={styles.barLabel}>{label}</span>
      <span className={styles.track}>
        <span style={{width: `${(count / max) * 100}%`}} />
      </span>
      <span className={styles.barCount}>{formatCount(count)}</span>
    </Tag>
  );
}

function Chip({active, onClick, children}) {
  return (
    <button type="button" className={active ? styles.chipOn : styles.chip} onClick={onClick}>
      {children}
    </button>
  );
}
