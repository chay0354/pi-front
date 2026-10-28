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

/** Pills that fit the panel's height in one column; longer lists (BnB) switch to a tile grid. */
const MAX_PILLS = 6;

function FilterList({filters, selectedFilterId, onSelectFilter}) {
  const grid = filters.length > MAX_PILLS;
  return (
    <div className={grid ? styles.tilesWrap : styles.filtersWrap}>
      <div className={grid ? styles.tiles : styles.filters}>
        {filters.map(filter => {
          const selected = filter.id === selectedFilterId;
          return (
            <button
              key={filter.id}
              type="button"
              className={`${grid ? styles.tile : styles.filter} ${selected ? styles.selected : ''}`}
              aria-pressed={selected}
              onClick={() => onSelectFilter(selected ? null : filter.id)}>
              <span className={styles.filterLabel}>{filter.label}</span>
              <FilterIcon filter={filter} selected={selected} />
            </button>
          );
        })}
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
