import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react';
import {createClient} from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const defaultCtx = {
  isEmailOnline: () => false,
};

const PresenceContext = createContext(defaultCtx);

function collectEmailsFromPresenceState(state) {
  const set = new Set();
  if (!state || typeof state !== 'object') {
    return set;
  }
  for (const key of Object.keys(state)) {
    const presences = state[key];
    if (!Array.isArray(presences)) {
      continue;
    }
    for (const p of presences) {
      if (p && p.email != null && String(p.email).trim() !== '') {
        set.add(String(p.email).trim().toLowerCase());
      }
    }
  }
  return set;
}

/**
 * Broadcasts the current user on a shared Realtime presence channel so other
 * clients can tell if a given email is "online" (app open, logged in).
 */
export function PresenceProvider({userEmail, children}) {
  const [onlineEmails, setOnlineEmails] = useState(() => new Set());

  useEffect(() => {
    if (!userEmail || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setOnlineEmails(new Set());
      return undefined;
    }

    const emailKey = String(userEmail).trim().toLowerCase();
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const channel = supabase.channel('pi-presence-v1', {
      config: {
        presence: {
          key: emailKey,
        },
      },
    });

    channel.on('presence', {event: 'sync'}, () => {
      setOnlineEmails(collectEmailsFromPresenceState(channel.presenceState()));
    });

    channel.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        try {
          await channel.track({email: emailKey});
        } catch (_) {
          /* Realtime / presence may be disabled in project; presence stays empty */
        }
        setOnlineEmails(
          collectEmailsFromPresenceState(channel.presenceState()),
        );
      }
    });

    return () => {
      (async () => {
        try {
          await channel.untrack();
        } catch (_) {
          /* ignore */
        }
        supabase.removeChannel(channel);
      })();
      setOnlineEmails(new Set());
    };
  }, [userEmail]);

  const isEmailOnline = useCallback(
    email => {
      if (email == null || String(email).trim() === '') {
        return false;
      }
      return onlineEmails.has(String(email).trim().toLowerCase());
    },
    [onlineEmails],
  );

  const value = useMemo(
    () => ({
      isEmailOnline,
    }),
    [isEmailOnline],
  );

  return (
    <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>
  );
}

export function usePresence() {
  return useContext(PresenceContext);
}
