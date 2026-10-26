import {useCallback, useEffect, useRef, useState} from 'react';
import iconSearch from '../assets/figma/feed/icon-search.svg';
import styles from './RightPanel.module.css';

const SELECTED_COLOR = '#FFC40A';
const svgUrl = (build, color) => `data:image/svg+xml;utf8,${encodeURIComponent(build(color).trim())}`;

/** Mobile sidebar icon: SVG recolored white/yellow, or the PNG tinted yellow when selected. */
function FilterIcon({filter, selected}) {
  if (filter.svg) {
    return <img className={styles.filterIcon} src={svgUrl(filter.svg, selected ? SELECTED_COLOR : '#FFFFFF')} alt="" />;
  }
  if (!filter.icon) return null;
  if (selected) {
    return (
      <span
        className={`${styles.filterIcon} ${styles.filterIconTint}`}
        style={{WebkitMaskImage: `url(${filter.icon})`, maskImage: `url(${filter.icon})`}}
        aria-hidden
      />
    );
  }
  return <img className={styles.filterIcon} src={filter.icon} alt="" />;
}

function scrollHints(el) {
  if (!el) return {up: false, down: false};
  return {
    up: el.scrollTop > 4,
    down: el.scrollHeight - el.clientHeight - el.scrollTop > 4,
  };
}

function FilterList({filters, selectedFilterId, onSelectFilter}) {
  const listRef = useRef(null);
  const [hints, setHints] = useState({up: false, down: false});
  const update = useCallback(() => {
    const next = scrollHints(listRef.current);
    setHints(prev => (prev.up === next.up && prev.down === next.down ? prev : next));
  }, []);

  useEffect(() => {
    update();
    const el = listRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [update, filters]);

  const scrollByRow = direction => {
    listRef.current?.scrollBy({top: direction * 84, behavior: 'smooth'});
  };

  return (
    <div className={styles.filtersWrap}>
      {hints.up && (
        <button type="button" className={`${styles.scrollHint} ${styles.scrollHintUp}`} aria-label="סינונים למעלה" onClick={() => scrollByRow(-1)}>
          <span className={styles.chevron} aria-hidden />
        </button>
      )}
      <div ref={listRef} className={styles.filters} onScroll={update}>
        {filters.map(filter => {
          const selected = filter.id === selectedFilterId;
          return (
            <button
              key={filter.id}
              type="button"
              className={`${styles.filter} ${selected ? styles.selected : ''}`}
              aria-pressed={selected}
              onClick={() => onSelectFilter(selected ? null : filter.id)}>
              <span className={styles.filterLabel}>{filter.label}</span>
              <FilterIcon filter={filter} selected={selected} />
            </button>
          );
        })}
      </div>
      {hints.down && (
        <button type="button" className={`${styles.scrollHint} ${styles.scrollHintDown}`} aria-label="סינונים נוספים" onClick={() => scrollByRow(1)}>
          <span className={styles.chevron} aria-hidden />
        </button>
      )}
    </div>
  );
}

export default function RightPanel({filters, selectedFilterId, onSelectFilter, query, onQueryChange, onSubmitQuery}) {
  return (
    <aside className={styles.panel} aria-label="מקד את החיפוש שלי">
      <form
        className={styles.search}
        role="search"
        onSubmit={e => {
          e.preventDefault();
          onSubmitQuery?.(query);
        }}>
        <input
          className={styles.searchInput}
          type="search"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="חפשו בפאי"
          aria-label="חפשו בפאי"
          dir="rtl"
        />
        <button type="submit" className={styles.searchSubmit} aria-label="חיפוש">
          <img src={iconSearch} alt="" width={24} height={24} />
        </button>
      </form>

      {filters.length > 0 && (
        <>
          <p className={styles.sectionName} dir="rtl">
            מקד את החיפוש שלי
          </p>
          <FilterList filters={filters} selectedFilterId={selectedFilterId} onSelectFilter={onSelectFilter} />
        </>
      )}
    </aside>
  );
}
