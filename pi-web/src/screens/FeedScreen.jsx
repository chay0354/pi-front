import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import TopBar from '../components/TopBar';
import LeftRail, {FILTER_PANELS} from '../components/LeftRail';
import FilterPopup from '../components/FilterPopup';
import panelHomeIcon from '../assets/figma/filter-panel/home.svg';
import RightPanel from '../components/RightPanel';
import FeedCard from '../components/FeedCard';
import FeedArrows from '../components/FeedArrows';
import GridCard from '../components/GridCard';
import EmptyState from '../components/EmptyState';
import RecommendedPros from '../components/RecommendedPros';
import RecommendedProjects from '../components/RecommendedProjects';
import {DEFAULT_CATEGORY_ID} from '../feed/categories';
import {EMPTY_FEED_FILTERS, filterSlotsForCategory, isFilterValueActive} from '../feed/feedFilters';
import {RECOMMENDED_PROS_EVERY, useRecommendedPros} from '../feed/recommendedPros';
import {useFeaturedProjects} from '../feed/useHome';
import {sidebarFiltersForCategory} from '../feed/sidebarFilters';
import {isVideoAdListing, toFeedItem} from '../feed/listingRules';
import {useFeed} from '../feed/useFeed';
import {markLikedSeen, persistAdLike, toggleLiked, useLikedListings} from '../feed/likedListings';
import {useSession} from '../auth/session';
import RemoveLikedDialog from '../components/RemoveLikedDialog';
import {usePiAiSearch} from '../feed/usePiAiSearch';
import UserSearchPanel from '../components/UserSearchPanel';
import {useProfileNav} from '../profile/navigation';
import CreateAdSheet, {CREATE_SHEET_POST_ICON, CreateAdSheetDivider, CreateAdSheetRow} from '../publish/CreateAdSheet';
import {getUserBnbHostLock, shouldShowBnbCreateOption} from '../publish/lib/bnbHostLock';
import {
  canCreateOpenHousePost,
  canShowListingAdInCreateSheet,
  CREATE_SHEET_OPEN_HOUSE_ICON,
  getCreateSheetListingIcon,
  getListingSheetCopy,
  isBrokerLikeSubscriptionType,
  isCompanySubscriptionType,
  mobileAsset,
  OPEN_HOUSE_POST_DESCRIPTION,
  subscriptionTypes,
} from '../publish/lib/publishRules';
import styles from './FeedScreen.module.css';

/** Matches the feed column's padding-top, so a card snaps under the top inset. */
const SCROLL_PAD = 24;

export default function FeedScreen({
  initialCategory = DEFAULT_CATEGORY_ID,
  initialPanel = null,
  initialListingId = null,
  onHome,
  onMenu,
  onGuestRegister,
  onOpenAdsForm,
  onOpenPostEditor,
  onOpenEditPublish,
}) {
  const {currentUser} = useSession();
  const [category, setCategory] = useState(initialCategory);
  const [sidebarFilterId, setSidebarFilterId] = useState(null);
  const [purposes, setPurposes] = useState({rent: true, sale: true});
  const [query, setQuery] = useState('');
  const [feedFilters, setFeedFilters] = useState(EMPTY_FEED_FILTERS);
  const [searchQuery, setSearchQuery] = useState(null);
  const [openPanel, setOpenPanel] = useState(initialPanel);
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState('feed');
  const likedView = viewMode === 'liked';
  const gridView = viewMode === 'grid' || likedView;
  const liked = useLikedListings();
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [pendingUnlike, setPendingUnlike] = useState(null);
  const cancelUnlike = useCallback(() => setPendingUnlike(null), []);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef(null);
  const {active: screenActive} = useProfileNav();

  const videoOnly = viewMode === 'video';
  const feed = useFeed({category, sidebarFilterId, purposes, feedFilters, videoOnly});
  const search = usePiAiSearch(searchQuery);
  const searchItems = useMemo(
    () => (videoOnly ? search.rows.filter(isVideoAdListing) : search.rows).map(toFeedItem),
    [search.rows, videoOnly],
  );
  const searching = search.status !== 'idle';
  const items = searching ? searchItems : feed.items;

  const slots = filterSlotsForCategory(category, feedFilters);
  const panelSheets = {
    city: {kind: 'city', filterKey: 'city', label: 'עיר'},
    home: slots.home,
    rooms: slots.rooms,
    price: {kind: 'price', filterKey: 'price', label: 'מחיר'},
  };
  const activePanels = Object.fromEntries(
    Object.entries(panelSheets).map(([id, s]) => [id, isFilterValueActive(feedFilters[s.filterKey])]),
  );
  const openSheet = openPanel === 'search' ? {kind: 'search'} : openPanel ? panelSheets[openPanel] : null;
  const [awaitingSearch, setAwaitingSearch] = useState(null);
  const closePanel = useCallback(() => {
    setOpenPanel(null);
    setAwaitingSearch(null);
  }, []);

  useEffect(() => {
    if (awaitingSearch != null && search.query === awaitingSearch && search.status !== 'loading') {
      closePanel();
    }
  }, [awaitingSearch, search.query, search.status, closePanel]);
  const togglePanel = id => {
    setAwaitingSearch(null);
    setUserSearchOpen(false);
    setOpenPanel(prev => (prev === id ? null : id));
  };
  const filters = sidebarFiltersForCategory(category);
  const pros = useRecommendedPros();
  const featuredProjects = useFeaturedProjects();
  const projects = useMemo(() => featuredProjects.slice(0, 5), [featuredProjects]);

  const entries = useMemo(() => {
    const out = [];
    let slot = 0;
    items.forEach((item, i) => {
      out.push({key: item.id, item});
      if (searching || videoOnly || (i + 1) % RECOMMENDED_PROS_EVERY !== 0) return;
      const showProjects = slot % 2 === 1 && projects.length > 0;
      slot += 1;
      if (showProjects) out.push({key: `projects-${i}`, projects});
      else if (pros.length > 0) out.push({key: `pros-${i}`, pros});
      else if (projects.length > 0) out.push({key: `projects-${i}`, projects});
    });
    return out;
  }, [items, pros, projects, searching, videoOnly]);

  const selectCategory = useCallback(id => {
    setCategory(id);
    setSidebarFilterId(null);
    setFeedFilters(EMPTY_FEED_FILTERS);
    setSearchQuery(null);
    setOpenPanel(null);
    setUserSearchOpen(false);
  }, []);

  const togglePurpose = useCallback(key => {
    setPurposes(prev => {
      const next = {...prev, [key]: !prev[key]};
      return next.rent || next.sale ? next : prev;
    });
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({top: 0});
    setActiveIndex(0);
  }, [category, sidebarFilterId, purposes, feedFilters, searchQuery, videoOnly]);

  const scrollToIndex = useCallback(
    index => {
      const root = listRef.current;
      if (!root) return;
      const clamped = Math.max(0, Math.min(entries.length - 1, index));
      const card = root.querySelectorAll(':scope > article')[clamped];
      if (!card) return;
      root.scrollTo({top: Math.max(0, card.offsetTop - SCROLL_PAD), behavior: 'smooth'});
    },
    [entries.length],
  );

  useEffect(() => {
    if (initialListingId == null || feed.status !== 'ready' || gridView) return;
    const index = entries.findIndex(entry => entry.item && String(entry.item.id) === String(initialListingId));
    if (index >= 0) scrollToIndex(index);
  }, [initialListingId, feed.status, gridView, entries, scrollToIndex]);

  const gridItems = useMemo(
    () => items.filter(item => !item.isPost && (!likedView || liked.ids.has(String(item.id)))),
    [items, likedView, liked.ids],
  );

  useEffect(() => {
    if (gridView || !screenActive) return undefined;
    const onKey = e => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        scrollToIndex(activeIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollToIndex(activeIndex - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, scrollToIndex, gridView, screenActive]);

  const categoryNum = useMemo(() => {
    const n = category != null && String(category).trim() !== '' ? parseInt(String(category).trim(), 10) : NaN;
    return Number.isFinite(n) ? n : NaN;
  }, [category]);
  const isGuest = !currentUser;
  const isBnbCategory = categoryNum === 5;
  const subscriptionType = String(currentUser?.subscription_type || '').toLowerCase();
  const showListingInSheet = isGuest
    ? isBnbCategory
    : canShowListingAdInCreateSheet(currentUser?.subscription_type, categoryNum);
  const showOpenHouseInSheet = canCreateOpenHousePost(currentUser);
  const listingSheetCopy = useMemo(
    () => getListingSheetCopy(category, currentUser?.subscription_type),
    [category, currentUser?.subscription_type],
  );

  const handlePublishButtonPress = useCallback(() => {
    if ((isGuest && isBnbCategory) || subscriptionType === subscriptionTypes.professional || subscriptionType === subscriptionTypes.user) {
      setShowCreateSheet(true);
      return;
    }
    if (isGuest) {
      onGuestRegister?.(null);
      return;
    }
    onOpenEditPublish?.(category);
  }, [category, isBnbCategory, isGuest, onGuestRegister, onOpenEditPublish, subscriptionType]);

  const closeSheetAndOpenListing = useCallback(
    opts => {
      setShowCreateSheet(false);
      if (isGuest && isBnbCategory) {
        onGuestRegister?.({
          type: 'bnbAd',
          bnbHostType: opts?.bnbHostType === 'business' ? 'business' : 'private',
        });
        return;
      }
      const lockedHost = getUserBnbHostLock(currentUser);
      const next = lockedHost ? {...(opts || {}), bnbHostType: lockedHost} : opts;
      const isCompanyOrBroker = subscriptionType === subscriptionTypes.company || isBrokerLikeSubscriptionType(subscriptionType);
      if (isCompanyOrBroker) onOpenEditPublish?.(category, next);
      else onOpenAdsForm?.(category, next);
    },
    [category, currentUser, isBnbCategory, isGuest, onGuestRegister, onOpenAdsForm, onOpenEditPublish, subscriptionType],
  );

  const closeSheetAndOpenPost = useCallback(
    (opts = {}) => {
      setShowCreateSheet(false);
      if (isGuest) {
        if (isBnbCategory) onGuestRegister?.({type: 'post', openHouse: opts.openHouse === true, category});
        else onGuestRegister?.(null);
        return;
      }
      onOpenPostEditor?.({category, openHouse: opts.openHouse === true});
    },
    [category, isBnbCategory, isGuest, onGuestRegister, onOpenPostEditor],
  );

  useEffect(() => {
    if (!showCreateSheet) return undefined;
    const onKey = e => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setShowCreateSheet(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [showCreateSheet]);

  const onScroll = e => {
    const root = e.currentTarget;
    const cards = root.querySelectorAll(':scope > article');
    const y = root.scrollTop + SCROLL_PAD;
    let index = 0;
    cards.forEach((card, i) => {
      if (card.offsetTop <= y + card.offsetHeight * 0.35) index = i;
    });
    setActiveIndex(prev => (prev === index ? prev : index));
  };

  const selectViewMode = mode => {
    if (mode === 'liked') {
      markLikedSeen();
      setViewMode(prev => (prev === 'liked' ? 'feed' : 'liked'));
      return;
    }
    setViewMode(mode);
  };

  const statusMessage = count => {
    if (searching) return search.message && <p className={styles.message}>{search.message}</p>;
    if (feed.status === 'loading' && count === 0) return <p className={styles.message}>טוען מודעות...</p>;
    if (feed.status === 'error') return <p className={styles.message}>{feed.error}</p>;
    return null;
  };

  return (
    <div className={styles.screen}>
      <TopBar selectedCategory={category} onSelectCategory={selectCategory} onHome={onHome} onMenu={onMenu} />

      {!searching && feed.status === 'ready' && (gridView ? gridItems : items).length === 0 && (
        <div className={styles.emptyState}>
          <EmptyState mode={viewMode} />
        </div>
      )}

      {gridView ? (
        <div className={styles.gridColumn}>
          {statusMessage(gridItems.length)}
          <div className={styles.grid}>
            {gridItems.map(item => (
              <GridCard key={item.id} item={item} onRequestUnlike={likedView ? setPendingUnlike : undefined} />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className={styles.feedColumn} ref={listRef} onScroll={onScroll}>
            {statusMessage(items.length)}
            {entries.map((entry, i) =>
              entry.projects ? (
                <RecommendedProjects key={entry.key} projects={entry.projects} active={screenActive && i === activeIndex} />
              ) : entry.pros ? (
                <RecommendedPros key={entry.key} pros={entry.pros} active={screenActive && i === activeIndex} />
              ) : (
                <FeedCard key={entry.key} item={entry.item} active={screenActive && i === activeIndex} />
              ),
            )}
          </div>

          <div className={styles.arrows}>
            <FeedArrows
              canPrev={activeIndex > 0}
              canNext={activeIndex < entries.length - 1}
              onPrev={() => scrollToIndex(activeIndex - 1)}
              onNext={() => scrollToIndex(activeIndex + 1)}
            />
          </div>
        </>
      )}

      <div className={styles.leftRail}>
        <LeftRail
          viewMode={viewMode}
          onViewMode={selectViewMode}
          unseenLikedCount={liked.unseen}
          purposes={purposes}
          onTogglePurpose={togglePurpose}
          onSearch={() => togglePanel('search')}
          searchActive={Boolean(searchQuery)}
          onOpenFilter={togglePanel}
          panelLabels={{home: slots.home.label, rooms: slots.rooms.label}}
          activePanels={activePanels}
          openPanel={openPanel}
          onPublish={handlePublishButtonPress}
        />
      </div>

      {openSheet && (
        <FilterPopup
          key={`${openPanel}-${openSheet.kind}`}
          kind={openSheet.kind}
          title={openSheet.label}
          icon={openPanel === 'home' ? panelHomeIcon : FILTER_PANELS.find(p => p.id === openPanel)?.icon}
          category={category}
          value={openSheet.kind === 'search' ? searchQuery : feedFilters[openSheet.filterKey]}
          onSave={value => {
            if (openSheet.kind === 'search') {
              setSearchQuery(value);
              setAwaitingSearch(value ? String(value).trim() : null);
            } else {
              setFeedFilters(prev => ({...prev, [openSheet.filterKey]: value}));
            }
          }}
          onClose={closePanel}
          keepOpenOnSave={openSheet.kind === 'search'}
          loading={openSheet.kind === 'search' && awaitingSearch != null}
          loadingMessage={search.status === 'loading' ? search.message : ''}
        />
      )}

      {userSearchOpen && (
        <UserSearchPanel
          query={query}
          onQueryChange={setQuery}
          onClose={() => setUserSearchOpen(false)}
          currentUser={currentUser}
          onOpenPost={listing => {
            setUserSearchOpen(false);
            const index = entries.findIndex(entry => entry.item && String(entry.item.id) === String(listing?.id));
            if (index >= 0) scrollToIndex(index);
          }}
        />
      )}

      {pendingUnlike != null && (
        <RemoveLikedDialog
          onCancel={cancelUnlike}
          onConfirm={() => {
            const id = pendingUnlike;
            const userId = currentUser?.id || currentUser?.subscription_id;
            setPendingUnlike(null);
            if (!userId) {
              toggleLiked(id);
              return;
            }
            persistAdLike(id, userId).catch(err => window.alert(err?.message || 'לא ניתן לעדכן מועדפים'));
          }}
        />
      )}

      {showCreateSheet ? (
        <CreateAdSheet onClose={() => setShowCreateSheet(false)}>
          {showListingInSheet &&
            (isBnbCategory ? (
              <>
                {!isCompanySubscriptionType(currentUser?.subscription_type) && shouldShowBnbCreateOption(currentUser, 'private') ? (
                  <>
                    <CreateAdSheetRow
                      title="פרסם כפרטי"
                      subtitle="פרסם חדר או אתר נופש פרטי"
                      iconSource={mobileAsset('ad-uplaud/bnb-private.png')}
                      onPress={() => closeSheetAndOpenListing({bnbHostType: 'private'})}
                    />
                    {shouldShowBnbCreateOption(currentUser, 'business') ? <CreateAdSheetDivider /> : null}
                  </>
                ) : null}
                {shouldShowBnbCreateOption(currentUser, 'business') ? (
                  <CreateAdSheetRow
                    title="פרסם כעסק"
                    subtitle="פרסם חדר או אתר נופש עסקי"
                    iconSource={mobileAsset('ad-uplaud/bnb-bussiness.png')}
                    onPress={() => closeSheetAndOpenListing({bnbHostType: 'business'})}
                  />
                ) : null}
              </>
            ) : (
              <CreateAdSheetRow
                title={listingSheetCopy.title}
                subtitle={listingSheetCopy.subtitle}
                iconSource={getCreateSheetListingIcon(category, currentUser?.subscription_type)}
                onPress={() => closeSheetAndOpenListing()}
              />
            ))}
          {showListingInSheet ? <CreateAdSheetDivider /> : null}
          {showOpenHouseInSheet ? (
            <>
              <CreateAdSheetRow
                title={OPEN_HOUSE_POST_DESCRIPTION}
                subtitle="פרסמו אירוע בית פתוח לקהילה"
                iconSource={CREATE_SHEET_OPEN_HOUSE_ICON}
                onPress={() => closeSheetAndOpenPost({openHouse: true})}
              />
              <CreateAdSheetDivider />
            </>
          ) : null}
          <CreateAdSheetRow
            title="פוסט"
            subtitle="שתף מידע או עדכון עם הקהילה"
            iconSource={CREATE_SHEET_POST_ICON}
            onPress={() => closeSheetAndOpenPost()}
          />
        </CreateAdSheet>
      ) : null}

      <div className={styles.rightPanel}>
        <RightPanel
          filters={filters}
          selectedFilterId={sidebarFilterId}
          onSelectFilter={setSidebarFilterId}
          query={query}
          onQueryChange={setQuery}
          onSubmitQuery={() => {
            setOpenPanel(null);
            setUserSearchOpen(true);
          }}
        />
      </div>
    </div>
  );
}
