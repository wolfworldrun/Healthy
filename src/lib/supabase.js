import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Without Supabase settings the app runs in a local "demo" mode backed by localStorage.
export const supabase = url && key ? createClient(url, key, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true } }) : null;
export const isDemo = !supabase;
