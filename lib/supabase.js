import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Vite only exposes env vars prefixed with VITE_ to client code, so a missing
// value here is almost always a naming problem in .env.local rather than a
// missing project. Fail loudly at import time instead of letting every query
// come back with an opaque network error.
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl && 'VITE_SUPABASE_URL',
    !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY',
  ]
    .filter(Boolean)
    .join(', ');

  throw new Error(
    `Missing Supabase environment variable(s): ${missing}. ` +
      'Add them to .env.local (see .env.example) and restart the dev server. ' +
      'Use the project anon/publishable key — never the service key, which ' +
      'bypasses row level security and must not reach the browser.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Browser SPA: keep officers signed in across reloads and let supabase-js
    // pick the session back up out of the URL after an email/OAuth redirect.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default supabase;
