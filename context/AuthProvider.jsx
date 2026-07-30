import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { supabase } from '../lib/supabase';

const PROFILE_COLUMNS = 'id, full_name, role, agency, region, phone';

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

  // Bumped for every profile request; a response whose id is no longer current
  // has been superseded (by a newer refresh, a user change, or unmount) and is
  // dropped rather than allowed to overwrite fresher state.
  const profileRequest = useRef(0);

  /**
   * Re-read the officer's profiles row. Callers await this after writing to
   * `profiles` so the shell picks the change up without a reload.
   */
  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return null;
    }

    const requestId = (profileRequest.current += 1);

    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', user.id)
      .maybeSingle();

    if (requestId !== profileRequest.current) return null;

    if (error) {
      console.error('Failed to load officer profile:', error);
      return null;
    }

    setProfile(data ?? null);
    return data ?? null;
  }, [user]);

  // The officer's profiles row, refetched whenever the signed-in user changes.
  useEffect(() => {
    refreshProfile();

    // Invalidate anything still in flight so it cannot land after this effect
    // has been torn down.
    return () => {
      profileRequest.current += 1;
    };
  }, [refreshProfile]);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      refreshProfile,
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
    [user, profile, loading, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
