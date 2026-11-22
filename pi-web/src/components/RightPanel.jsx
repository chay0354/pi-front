import {useEffect, useRef, useState} from 'react';
import iconSearch from '../assets/figma/feed/icon-search.svg';
import iconChevron from '../assets/figma/feed/arrow-down.svg';
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

const SCROLL_STEP = 84 * 3;

/** Tracks whether a scroller has hidden content above or below. */
function useScrollEdges(ref, contentKey) {
  const [edges, setEdges] = useState({up: false, down: false});
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => {
      const up = el.scrollTop > 4;
      const down = el.scrollTop + el.clientHeight < el.scrollHeight - 4;
      setEdges(prev => (prev.up === up && prev.down === down ? prev : {up, down}));
    };
    update();
    el.addEventListener('scroll', update, {passive: true});
    const observer = new ResizeObserver(update);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [ref, contentKey]);
  return edges;
}

function FilterList({filters, selectedFilterId, onSelectFilter}) {
  const scrollRef = useRef(null);
  const edges = useScrollEdges(scrollRef, filters.length);
  const scrollBy = direction => scrollRef.current?.scrollBy({top: direction * SCROLL_STEP, behavior: 'smooth'});

  return (
    <div className={styles.filtersArea}>
    <div className={styles.filtersWrap} ref={scrollRef}>
      <div className={styles.filters}>
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
    </div>
      <div className={`${styles.scrollHint} ${styles.scrollHintTop} ${edges.up ? styles.scrollHintShown : ''}`} aria-hidden={!edges.up}>
        <button type="button" className={styles.scrollButton} aria-label="לפילטרים הקודמים" tabIndex={edges.up ? 0 : -1} onClick={() => scrollBy(-1)}>
          <img className={styles.scrollArrowUp} src={iconChevron} alt="" width={36} height={36} />
        </button>
      </div>
      <div className={`${styles.scrollHint} ${styles.scrollHintBottom} ${edges.down ? styles.scrollHintShown : ''}`} aria-hidden={!edges.down}>
        <button type="button" className={styles.scrollButton} aria-label="לפילטרים נוספים" tabIndex={edges.down ? 0 : -1} onClick={() => scrollBy(1)}>
          <span className={styles.scrollLabel}>עוד פילטרים</span>
          <img className={styles.scrollArrowDown} src={iconChevron} alt="" width={36} height={36} />
        </button>
      </div>
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
