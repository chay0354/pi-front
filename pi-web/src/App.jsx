import {Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import FeedScreen from './screens/FeedScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import SideMenu from './components/SideMenu';
import DesktopOnlyNotice, {useIsPhone} from './components/DesktopOnlyNotice';
import {DEFAULT_CATEGORY_ID} from './feed/categories';
import {FeedActionsContext} from './feed/feedActions';
import {ProfileNavContext} from './profile/navigation';
import {useSession} from './auth/session';
import AccountFlow, {subscriptionEntry} from './account/AccountFlow';
import {getChatUnreadCount} from './api/chat';
import SplashScreen from './components/SplashScreen';

const PublishFlow = lazy(() => import('./publish/PublishFlow'));
const ChatFlow = lazy(() => import('./chat/ChatFlow'));
const FavoritesScreen = lazy(() => import('./profile/FavoritesScreen'));
const EditProfileScreen = lazy(() => import('./profile/EditProfileScreen'));
const FollowHubScreen = lazy(() => import('./profile/FollowHubScreen'));
const AgencyMembersScreen = lazy(() => import('./profile/AgencyMembersScreen'));
const FeedbackScreen = lazy(() => import('./a11y/FeedbackScreen'));
const AccessibilityMenuScreen = lazy(() => import('./a11y/AccessibilityMenuScreen'));
const AccessibilityStatementScreen = lazy(() => import('./a11y/AccessibilityStatementScreen'));

const CHAT_LAST_OPENED_KEY = 'pi_chat_last_opened';

function piWelcomeReadKey(user) {
  const id = user?.id != null ? String(user.id).trim() : '';
  const email = user?.email != null ? String(user.email).trim().toLowerCase() : '';
  return `pi_welcome_read_${id || email || 'anon'}`;
}

const DESIGN_WIDTH = 1920;

/** Screens are authored at 1920px wide; scale the whole stage to fit the window width. */
function useStageScale() {
  const read = () => Math.min(1, window.innerWidth / DESIGN_WIDTH);
  const [scale, setScale] = useState(read);
  useLayoutEffect(() => {
    const onResize = () => setScale(read());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return scale;
}

export default function App() {
  const phone = useIsPhone();
  const scale = useStageScale();
  const [route, setRoute] = useState({screen: 'home'});
  const [profiles, setProfiles] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  /** `{key, screen, props}` — the account-opening flow (login / sign-up / subscriptions). */
  const [account, setAccount] = useState(null);
  /** `{key, screen, ...}` — ערוך/פרסם → AdsForm. */
  const [publish, setPublish] = useState(null);
  const [chat, setChat] = useState(null);
  /** Favorites, edit profile, or follow hub — overlay above the menu. */
  const [personal, setPersonal] = useState(null);
  const [agencyRefresh, setAgencyRefresh] = useState(0);
  const [chatRefreshKey, setChatRefreshKey] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [piWelcomeRead, setPiWelcomeRead] = useState(false);
  const lastOpenedChatAtRef = useRef(null);
  const profileKey = useRef(0);
  const {currentUser} = useSession();
  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const openAccount = useCallback((screen, props = {}) => setAccount({key: Date.now(), screen, props}), []);
  const exitAccount = useCallback(destination => {
    setAccount(null);
    const intent = destination && typeof destination === 'object' ? destination.continuePublish : null;
    if (intent?.type === 'bnbAd') {
      setPublish({
        key: Date.now(),
        screen: 'adsForm',
        category: 5,
        bnbHostType: intent.bnbHostType === 'business' ? 'business' : 'private',
      });
      return;
    }
    if (intent?.type === 'post') {
      const raw = intent.category != null ? parseInt(String(intent.category), 10) : NaN;
      setPublish({
        key: Date.now(),
        screen: 'postEditor',
        category: Number.isFinite(raw) && raw > 0 ? raw : 5,
        openHouse: intent.openHouse === true,
      });
      return;
    }
    if (destination === 'home') {
      setPublish(null);
      setChat(null);
      setMenuOpen(false);
      setProfiles([]);
      setRoute({screen: 'home'});
    }
  }, []);

  /** Mobile gates these behind sign-up (setReturnToScreenAfterAuth('settings') → userRegistration). */
  const requireUser = open => () => {
    if (!currentUser) {
      openAccount('userRegistration');
      return;
    }
    open();
  };

  const openSubscription = type => {
    const {screen, props} = subscriptionEntry(type);
    openAccount(screen, props);
  };

  const openFeed = ({category = DEFAULT_CATEGORY_ID, panel = null, listingId = null} = {}) =>
    setRoute({screen: 'feed', category, panel, listingId, key: Date.now()});

  const openPersonal = screen => setPersonal({key: Date.now(), screen});

  const refreshUnreadChatCount = useCallback(async () => {
    const email = currentUser?.email ? String(currentUser.email).trim().toLowerCase() : null;
    if (!email) {
      setUnreadChatCount(0);
      return;
    }
    try {
      const {count} = await getChatUnreadCount(email, lastOpenedChatAtRef.current || undefined);
      setUnreadChatCount(typeof count === 'number' ? count : 0);
    } catch {
      /* keep the previous badge on a transient failure */
    }
  }, [currentUser?.email]);

  useEffect(() => {
    if (!currentUser) {
      setPiWelcomeRead(false);
      return;
    }
    try {
      lastOpenedChatAtRef.current = localStorage.getItem(CHAT_LAST_OPENED_KEY);
      setPiWelcomeRead(localStorage.getItem(piWelcomeReadKey(currentUser)) === 'true');
    } catch {
      setPiWelcomeRead(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.email) {
      setUnreadChatCount(0);
      return undefined;
    }
    refreshUnreadChatCount();
    const id = setInterval(refreshUnreadChatCount, 25000);
    return () => clearInterval(id);
  }, [currentUser?.email, refreshUnreadChatCount, chatRefreshKey]);

  const openChat = (peer = null) => {
    try {
      const now = new Date().toISOString();
      localStorage.setItem(CHAT_LAST_OPENED_KEY, now);
      lastOpenedChatAtRef.current = now;
    } catch {
      /* badge still clears locally */
    }
    setUnreadChatCount(0);
    setChatRefreshKey(k => k + 1);
    const target = peer && typeof peer === 'object' && !peer.nativeEvent && !peer.target ? peer : null;
    setChat({key: Date.now(), peer: target, overProfile: !!target});
  };

  const openProfile = useCallback((payload, {overPersonal = false, overChat = false} = {}) => {
    if (!payload || typeof payload !== 'object') return;
    profileKey.current += 1;
    setProfiles(stack => [...stack, {key: profileKey.current, user: payload, overPersonal, overChat}]);
  }, []);

  const closeProfile = useCallback(key => {
    setProfiles(stack => stack.filter(p => p.key !== key));
  }, []);

  const baseCovered = profiles.length > 0 || menuOpen || account != null || publish != null || chat != null || personal != null;
  const baseNav = useMemo(
    () => ({open: openProfile, active: !baseCovered, current: null}),
    [openProfile, baseCovered],
  );

  if (phone) return <DesktopOnlyNotice />;

  // A transform (not CSS zoom) keeps element boxes correct for DevTools and the Cursor element picker.
  return (
    <div style={{direction: 'ltr', width: '100vw', height: '100vh', overflow: 'clip'}}>
      <SplashScreen />
      <div
        id="pi-stage"
        style={{
          position: 'relative',
          direction: 'rtl',
          width: DESIGN_WIDTH,
          height: `calc(100vh / ${scale})`,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
        }}>
        <FeedActionsContext.Provider
          value={{
            onNeedLogin: () => openAccount('userRegistration'),
            onOpenChat: peer => {
              if (!currentUser) {
                openAccount('userRegistration');
                return;
              }
              openChat(peer && typeof peer === 'object' ? peer : undefined);
            },
          }}>
        <ProfileNavContext.Provider value={baseNav}>
          <div inert={baseCovered ? true : undefined} style={{position: 'relative', zIndex: 0, height: '100%'}}>
            {route.screen === 'feed' ? (
              <FeedScreen
                key={route.key}
                initialCategory={route.category}
                initialPanel={route.panel}
                initialListingId={route.listingId}
                onHome={() => setRoute({screen: 'home'})}
                onMenu={openMenu}
                onGuestRegister={intent => {
                  if (!intent) {
                    openAccount('userRegistration');
                    return;
                  }
                  const lock =
                    intent.type === 'bnbAd' ? (intent.bnbHostType === 'business' ? 'business' : 'private') : null;
                  openAccount('userRegistration', {
                    bnbHostLock: lock,
                    bnbBusinessRegistration: lock === 'business',
                    continuePublish: {
                      type: intent.type,
                      bnbHostType: lock,
                      category: intent.category ?? 5,
                      openHouse: intent.openHouse === true,
                    },
                  });
                }}
                onOpenAdsForm={(category, opts) => {
                  setPublish({
                    key: Date.now(),
                    screen: 'adsForm',
                    category,
                    bnbHostType: opts?.bnbHostType ?? null,
                  });
                }}
                onOpenPostEditor={({category, openHouse}) => {
                  setPublish({
                    key: Date.now(),
                    screen: 'postEditor',
                    category,
                    openHouse: openHouse === true,
                  });
                }}
                onOpenEditPublish={(category, opts) => {
                  setPublish({
                    key: Date.now(),
                    screen: 'editPublish',
                    category,
                    bnbHostType: opts?.bnbHostType ?? null,
                  });
                }}
              />
            ) : (
              <HomeScreen
                onOpenCategory={category => openFeed({category})}
                onMenu={openMenu}
                onOpenChat={peer => {
                  if (!currentUser) {
                    openAccount('userRegistration');
                    return;
                  }
                  openChat(peer && typeof peer === 'object' ? peer : undefined);
                }}
                unreadChatCount={currentUser ? unreadChatCount + (piWelcomeRead ? 0 : 1) : 0}
              />
            )}
          </div>
        </ProfileNavContext.Provider>
        {menuOpen ? (
          <div
            inert={profiles.length > 0 || account || chat || personal ? true : undefined}
            style={{position: 'absolute', inset: 0, zIndex: publish || chat ? 3 : 1}}>
            <SideMenu
              onClose={closeMenu}
              onOpenEditPublishAd={requireUser(() => {
                setMenuOpen(false);
                setPublish({key: Date.now(), screen: 'editPublish'});
              })}
              unreadChatCount={currentUser ? unreadChatCount + (piWelcomeRead ? 0 : 1) : 0}
              onOpenChat={requireUser(() => openChat())}
              onOpenSubscription={openSubscription}
              onLogout={() => {}}
              onOpenLogin={() => openAccount('login')}
              onOpenSecretCodeRecovery={requireUser(() =>
                openAccount('recovery', {userEmail: currentUser?.email || '', fromLogin: false}),
              )}
              onOpenFavorites={requireUser(() => {
                setMenuOpen(false);
                openPersonal('favorites');
              })}
              onOpenFeedback={requireUser(() => {
                setMenuOpen(false);
                openPersonal('feedback');
              })}
              onOpenTermsOfUse={() => openAccount('terms')}
              onOpenAccessibilityStatement={() => {
                setMenuOpen(false);
                openPersonal('statement');
              }}
              onOpenAccessibilityMenu={() => {
                setMenuOpen(false);
                openPersonal('accessibility');
              }}
              onEditProfile={requireUser(() => {
                openPersonal('edit');
              })}
              onOpenFollowHub={tab => {
                if (!currentUser) return;
                setMenuOpen(false);
                setPersonal({key: Date.now(), screen: 'follow', tab: tab || 'following', user: currentUser});
              }}
              onOpenOwnProfile={() => {
                if (!currentUser) return;
                setMenuOpen(false);
                openProfile(currentUser);
              }}
              onOpenAgencyJoinCode={() => openAccount('agencyJoinCode')}
              onOpenAgencyMembers={requireUser(() => {
                setMenuOpen(false);
                openPersonal('agency');
              })}
            />
          </div>
        ) : null}
        {chat ? (
          <div inert={(profiles.length > 0 && !chat?.overProfile) || account ? true : undefined} style={{position: 'absolute', inset: 0, zIndex: chat?.overProfile ? 6 : 2}}>
            <Suspense fallback={<div style={{position: 'absolute', inset: 0, background: '#262532'}} />}>
              <ChatFlow
                key={chat.key}
                currentUser={currentUser}
                refreshKey={chatRefreshKey}
                piWelcomeRead={piWelcomeRead}
                onWelcomeRead={() => {
                  if (!currentUser) return;
                  try {
                    localStorage.setItem(piWelcomeReadKey(currentUser), 'true');
                  } catch {
                    /* ignore */
                  }
                  setPiWelcomeRead(true);
                }}
                onClose={() => {
                  setChat(null);
                  setChatRefreshKey(k => k + 1);
                }}
                onOpenPost={listing => {
                  setChat(null);
                  setMenuOpen(false);
                  const category = Number(listing?.category);
                  openFeed({category: Number.isFinite(category) ? category : DEFAULT_CATEGORY_ID});
                }}
                onOpenPeerProfile={payload => openProfile(payload, {overChat: true})}
                initialPeer={chat.peer}
              />
            </Suspense>
          </div>
        ) : null}
        {publish ? (
          <div inert={account ? true : undefined} style={{position: 'absolute', inset: 0, zIndex: personal ? 6 : 2}}>
            <Suspense fallback={<div style={{position: 'absolute', inset: 0, background: '#1e1d2b'}} />}>
              <PublishFlow
                key={publish.key}
                start={publish}
                onExit={() => {
                  setPublish(null);
                  if (personal?.screen === 'agency') setAgencyRefresh(k => k + 1);
                }}
                onHome={() => {
                  setPublish(null);
                  setMenuOpen(false);
                  setRoute({screen: 'home'});
                }}
                onMenu={() => setMenuOpen(true)}
              />
            </Suspense>
          </div>
        ) : null}
        {account ? (
          <div style={{position: 'absolute', inset: 0, zIndex: 2}}>
            <AccountFlow key={account.key} start={account} onExit={exitAccount} />
          </div>
        ) : null}
        {personal ? (
          <div inert={profiles.some(p => p.overPersonal) ? true : undefined} style={{position: 'absolute', inset: 0, zIndex: 4}}>
            <Suspense fallback={<div style={{position: 'absolute', inset: 0, background: '#1e1d27'}} />}>
              {personal.screen === 'favorites' ? (
                <FavoritesScreen
                  key={personal.key}
                  currentUser={currentUser}
                  onClose={() => setPersonal(null)}
                  onOpenListing={listing => {
                    setPersonal(null);
                    setMenuOpen(false);
                    const category = Number(listing?.category);
                    openFeed({
                      category: Number.isFinite(category) && category > 0 ? category : DEFAULT_CATEGORY_ID,
                      listingId: listing?.id ?? null,
                    });
                  }}
                />
              ) : personal.screen === 'edit' ? (
                <EditProfileScreen key={personal.key} onClose={() => setPersonal(null)} />
              ) : personal.screen === 'feedback' ? (
                <FeedbackScreen key={personal.key} onClose={() => setPersonal(null)} />
              ) : personal.screen === 'accessibility' ? (
                <AccessibilityMenuScreen key={personal.key} onClose={() => setPersonal(null)} />
              ) : personal.screen === 'statement' ? (
                <AccessibilityStatementScreen key={personal.key} onClose={() => setPersonal(null)} />
              ) : personal.screen === 'agency' ? (
                <AgencyMembersScreen
                  key={personal.key}
                  currentUser={currentUser}
                  refreshKey={agencyRefresh}
                  onClose={() => setPersonal(null)}
                  onViewListing={listing => openProfile({...listing, _forceListingAdProfile: true}, {overPersonal: true})}
                  onEditListing={(listing, member) => {
                    const category = Number(listing?.category);
                    setPublish({
                      key: Date.now(),
                      screen: 'adsForm',
                      category: Number.isFinite(category) && category > 0 ? category : null,
                      editingListing: listing,
                      actorUser: member,
                    });
                  }}
                  onEditPost={(listing, member) => {
                    const category = Number(listing?.category);
                    setPublish({
                      key: Date.now(),
                      screen: 'postEditor',
                      category: Number.isFinite(category) && category > 0 ? category : null,
                      editingListing: listing,
                      actorUser: member,
                    });
                  }}
                />
              ) : (
                <FollowHubScreen
                  key={personal.key}
                  currentUser={currentUser}
                  profileUser={personal.user || currentUser}
                  initialTab={personal.tab}
                  onClose={() => setPersonal(null)}
                  onOpenUserProfile={row => {
                    if (!row || row.is_self) return;
                    openProfile(row, {overPersonal: true});
                  }}
                />
              )}
            </Suspense>
          </div>
        ) : null}
        {profiles.map((p, i) => {
          const isTop = i === profiles.length - 1;
          return (
            <ProfileNavContext.Provider key={p.key} value={{open: openProfile, active: isTop, current: p.user}}>
              <div
                inert={isTop ? undefined : true}
                style={{position: 'absolute', inset: 0, zIndex: p.overChat ? 7 : p.overPersonal && personal ? 5 : chat && !chat.overProfile ? 3 : 1}}>
                <ProfileScreen
                  user={p.user}
                  active={isTop}
                  onClose={() => closeProfile(p.key)}
                  onOpenFavorites={requireUser(() => openPersonal('favorites'))}
                  onOpenFollowHub={tab =>
                    setPersonal({key: Date.now(), screen: 'follow', tab: tab || 'followers', user: p.user})
                  }
                  onNeedLogin={() => openAccount('userRegistration')}
                  onOpenChat={peer => openChat(peer)}
                />
              </div>
            </ProfileNavContext.Provider>
          );
        })}
        </FeedActionsContext.Provider>
      </div>
    </div>
  );
}
