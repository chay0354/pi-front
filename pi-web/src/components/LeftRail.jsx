import navFeedSelected from '../assets/figma/feed/nav-feed-selected.svg';
import navFeed from '../assets/figma/grid/view-feed.svg';
import navGrid from '../assets/figma/feed/nav-grid.svg';
import navGridSelected from '../assets/figma/grid/view-grid-selected.svg';
import navVideo from '../assets/figma/feed/nav-video.svg';
import navVideoSelected from '../assets/figma/feed/nav-video-selected.svg';
import navLiked from '../assets/figma/feed/nav-liked.svg';
import navLikedSelected from '../assets/figma/grid/view-liked-selected.svg';
import iconSearchSmall from '../assets/figma/feed/icon-search-small.svg';
import checkboxChecked from '../assets/figma/feed/checkbox-checked.svg';
import filterCity from '../assets/figma/feed/filter-city.svg';
import filterCitySelected from '../assets/figma/feed/filter-city-selected.svg';
import filterHome from '../assets/figma/feed/filter-home.svg';
import filterHomeSelected from '../assets/figma/feed/filter-home-selected.svg';
import filterRooms from '../assets/figma/feed/filter-rooms.svg';
import filterRoomsSelected from '../assets/figma/feed/filter-rooms-selected.svg';
import filterPrice from '../assets/figma/feed/filter-price.svg';
import filterPriceSelected from '../assets/figma/feed/filter-price-selected.svg';
import postPlus from '../assets/figma/feed/post-plus.svg';
import styles from './LeftRail.module.css';

const VIEW_MODES = [
  {id: 'feed', label: 'פיד', icon: navFeed, selectedIcon: navFeedSelected},
  {id: 'grid', label: 'תצוגת תפזורת', icon: navGrid, selectedIcon: navGridSelected},
  {id: 'video', label: 'וידאו', icon: navVideo, selectedIcon: navVideoSelected},
  {id: 'liked', label: 'אהבתי', icon: navLiked},
];

export const FILTER_PANELS = [
  {id: 'city', label: 'עיר', icon: filterCity, selectedIcon: filterCitySelected, iconSize: 28},
  {id: 'home', label: 'בית', icon: filterHome, selectedIcon: filterHomeSelected, iconSize: 32},
  {id: 'rooms', label: 'חדרים', icon: filterRooms, selectedIcon: filterRoomsSelected, iconSize: 32},
  {id: 'price', label: 'מחיר', icon: filterPrice, selectedIcon: filterPriceSelected, iconSize: 32},
];

function Checkbox({checked}) {
  return checked ? (
    <img src={checkboxChecked} alt="" width={24} height={24} />
  ) : (
    <span className={styles.checkboxEmpty} aria-hidden />
  );
}

export default function LeftRail({
  viewMode,
  onViewMode,
  unseenLikedCount = 0,
  purposes,
  onTogglePurpose,
  onSearch,
  searchActive = false,
  onOpenFilter,
  panelLabels = {},
  activePanels = {},
  openPanel = null,
  onPublish,
}) {
  return (
    <aside className={styles.rail} aria-label="סינון">
      <div className={styles.viewModes} role="toolbar" aria-label="תצוגה">
        {VIEW_MODES.map(mode => {
          const selected = viewMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              className={styles.viewMode}
              aria-label={mode.label}
              aria-pressed={selected}
              onClick={() => onViewMode(mode.id)}>
              {mode.id === 'liked' && selected ? (
                <img className={styles.likedSelected} src={navLikedSelected} alt="" width={22.5} height={20.5} />
              ) : (
                <img src={selected && mode.selectedIcon ? mode.selectedIcon : mode.icon} alt="" width={24} height={24} />
              )}
              {mode.id === 'liked' && unseenLikedCount > 0 && (
                <span className={styles.likedBadge}>{unseenLikedCount > 99 ? '99+' : unseenLikedCount}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className={styles.lower}>
        <div className={styles.pills}>
          <button
            type="button"
            className={`${styles.pill} ${styles.searchPill} ${searchActive ? styles.selected : ''}`}
            aria-expanded={openPanel === 'search'}
            data-open={openPanel === 'search' || undefined}
            onClick={onSearch}>
            <span className={styles.pillLabel}>חיפוש מודעה</span>
            <img src={iconSearchSmall} alt="" width={24} height={24} />
          </button>

          {[
            ['rent', 'להשכרה'],
            ['sale', 'למכירה'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="checkbox"
              aria-checked={purposes[key]}
              className={`${styles.pill} ${styles.checkPill}`}
              onClick={() => onTogglePurpose(key)}>
              <span className={styles.pillLabel}>{label}</span>
              <Checkbox checked={purposes[key]} />
            </button>
          ))}

          {FILTER_PANELS.map(panel => {
            const selected = Boolean(activePanels[panel.id]);
            return (
              <button
                key={panel.id}
                type="button"
                className={`${styles.pill} ${styles.iconPill} ${selected ? styles.selected : ''}`}
                aria-expanded={openPanel === panel.id}
                data-open={openPanel === panel.id || undefined}
                onClick={() => onOpenFilter(panel.id)}>
                <span className={styles.pillLabel}>{panelLabels[panel.id] || panel.label}</span>
                <span className={styles.pillIcon}>
                  <img
                    src={selected ? panel.selectedIcon : panel.icon}
                    alt=""
                    width={panel.iconSize}
                    height={panel.iconSize}
                  />
                </span>
              </button>
            );
          })}
        </div>

        <button type="button" className={styles.publish} onClick={onPublish}>
          <img src={postPlus} alt="" width={40} height={40} />
          <span className={styles.publishLabel}>פרסם מודעה</span>
        </button>
      </div>
    </aside>
  );
}
