import {useEffect, useMemo, useState} from 'react';
import {mdiChevronLeft, mdiMagnify} from '@mdi/js';
import MdiIcon from '../publish/MdiIcon';
import {getCompaniesDirectory, getListings} from '../api/client';
import {CompanyProjectsView} from '../profile/ProfileSubviews';
import {listingAdProfilePayload, useProfileNav} from '../profile/navigation';
import styles from './SelectedProjectsScreen.module.css';

const isPost = item => {
  const type = String(item?.propertyType || item?.property_type || item?.propertyTypeRaw || '').toLowerCase();
  return type === 'post' || type.includes('post') || item?.feed_post === true || item?.isPostEntry === true;
};

export default function SelectedProjectsScreen({onClose}) {
  const nav = useProfileNav();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [query, setQuery] = useState('');
  const [company, setCompany] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getCompaniesDirectory(),
      getListings({status: 'published', subscription_type: 'company'}).catch(() => null),
    ])
      .then(([dir, listingsRes]) => {
        if (cancelled) return;
        const list = Array.isArray(dir?.companies) ? dir.companies : [];
        const listings = listingsRes?.success && Array.isArray(listingsRes.listings) ? listingsRes.listings : null;
        const counts = {};
        (listings || []).forEach(listing => {
          if (!listing || isPost(listing)) return;
          const key = listing.subscription_id || listing.subscriptionId;
          if (!key) return;
          counts[String(key)] = (counts[String(key)] || 0) + 1;
        });
        setCompanies(
          list.map(c => ({
            ...c,
            project_count: listings ? counts[String(c.id)] || 0 : Number(c.project_count) || 0,
          })),
        );
      })
      .catch(e => {
        if (!cancelled) setError(e?.message || 'טעינה נכשלה');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (company) return undefined;
    const onKey = e => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [company, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return companies;
    return companies.filter(c => String(c.name || '').includes(q) || String(c.address_hint || '').includes(q));
  }, [companies, query]);

  if (company) {
    return (
      <CompanyProjectsView
        companyId={company.id}
        companyName={company.name}
        onClose={() => setCompany(null)}
        onOpenListing={listing => {
          const payload = listingAdProfilePayload(listing, {base: company, extras: {_fromCompanyProjects: true}});
          if (payload) nav.open(payload);
        }}
        active
      />
    );
  }

  return (
    <div className={styles.screen} dir="rtl">
      <header className={styles.header}>
        <button type="button" className={styles.back} aria-label="חזרה" onClick={onClose}>
          <MdiIcon path={mdiChevronLeft} size={32} color="#fff" />
        </button>
        <h1>פרויקטים נבחרים</h1>
        <span className={styles.back} />
      </header>
      <label className={styles.search}>
        <MdiIcon path={mdiMagnify} size={22} color="#8c85b3" />
        <input value={query} placeholder="חפש לפי עיר / חברה" onChange={e => setQuery(e.target.value)} />
      </label>
      {loading ? <p className={styles.status}>טוען...</p> : null}
      {error ? <p className={styles.status}>{error}</p> : null}
      {!loading && !error && filtered.length === 0 ? <p className={styles.status}>לא נמצאו חברות</p> : null}
      <div className={styles.grid}>
        {filtered.map(c => (
          <button key={c.id} type="button" className={styles.cell} onClick={() => setCompany(c)}>
            {c.logo_url ? <img src={c.logo_url} alt="" /> : <span className={styles.letter}>{(c.name || '?').charAt(0)}</span>}
            <span className={styles.name}>{c.name}</span>
            <span className={styles.count}>{c.project_count} פרויקטים</span>
          </button>
        ))}
      </div>
    </div>
  );
}
