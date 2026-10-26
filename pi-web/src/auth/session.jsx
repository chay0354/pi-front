import {createContext, useContext, useEffect, useMemo, useState} from 'react';

/** Same key the mobile app uses for its web build (utils/secureUserStorage.js). */
const CURRENT_USER_KEY = 'pi_current_user';

function readStoredUser() {
  try {
    const raw = window.localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const SessionContext = createContext({currentUser: null, setCurrentUser: () => {}});

export function SessionProvider({children}) {
  const [currentUser, setCurrentUser] = useState(readStoredUser);

  useEffect(() => {
    try {
      if (currentUser) window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
      else window.localStorage.removeItem(CURRENT_USER_KEY);
    } catch {
      // Storage can be unavailable (private mode / quota); the in-memory session still works.
    }
  }, [currentUser]);

  const value = useMemo(() => ({currentUser, setCurrentUser}), [currentUser]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);
