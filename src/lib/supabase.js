import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Password-reset links carry their tokens in the URL (see requestReset in auth.js) so they work
// even when the email opens in a different browser than the home-screen app. The client has to
// be in implicit mode for that one page load to accept them.
export const recoveryLanding =
  typeof window !== 'undefined' && /[#&]type=recovery/.test(window.location.hash) && /access_token=/.test(window.location.hash);

// Without Supabase settings the app runs in a local "demo" mode backed by localStorage.
export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: { flowType: recoveryLanding ? 'implicit' : 'pkce', detectSessionInUrl: true, persistSession: true }
      })
    : null;
export let isDemo = !supabase;

// "Try me" from the sign-in page: run on sample data in this browser, with no account.
export function setDemo(on) {
  isDemo = on || !supabase;
}
