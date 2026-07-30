import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function useAuth() {
  const value = useContext(AuthContext);

  if (value === null) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }

  return value;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  // Starts true so route guards can wait instead of bouncing a signed-in
  // officer to /login while getSession is still in flight.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.error('Failed to read Supabase session:', error);
        setUser(data?.session?.user ?? null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // Fires on sign-in, sign-out and token refresh, so this is the single
    // place the user is kept in sync.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // The officer's profiles row, refetched whenever the signed-in user changes.
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return undefined;
    }

    let active = true;

    supabase
      .from('profiles')
      .select('id, full_name, role, agency, region, phone')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('Failed to load officer profile:', error);
          setProfile(null);
          return;
        }
        setProfile(data ?? null);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('Sign out failed:', error);
          return { error };
        }
        // onAuthStateChange clears user, which clears profile.
        return { error: null };
      },
    }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
