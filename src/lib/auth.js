// Username + password accounts. Google sign-in lives in SignIn.jsx.
import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseKey, supabaseUrl } from './supabase.js';

export const USERNAME_RE = /^[a-z0-9_.]{3,24}$/;
export const MIN_PASSWORD = 8;

export const cleanUsername = (u) => u.trim().toLowerCase();

async function callAuthFunction(body) {
  const res = await fetch(`${supabaseUrl}/functions/v1/username-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: supabaseKey },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'something went wrong, please try again');
  return data;
}

export async function usernameAvailable(username) {
  const { available } = await callAuthFunction({ action: 'check', username: cleanUsername(username) });
  return available;
}

// `login` can be a username or an email.
export async function signInWithLogin(login, password) {
  const tokens = await callAuthFunction({ action: 'signin', login, password });
  const { error } = await supabase.auth.setSession(tokens);
  if (error) throw error;
}

// Returns true if signed in right away, false if an email confirmation is required first.
export async function createAccount({ username, password, firstName, email }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { username: cleanUsername(username), first_name: firstName.trim() },
      emailRedirectTo: window.location.origin
    }
  });
  if (error) {
    if (error.code === 'user_already_exists') throw new Error('that email already has an account. try signing in or resetting your password');
    if (error.code === 'weak_password') throw new Error('please pick a stronger password');
    if (error.code === 'email_address_invalid') throw new Error("that email doesn't look right");
    if (error.code === 'email_address_not_authorized' || error.code === 'over_email_send_rate_limit') {
      throw new Error("we can't send email right now, please try again later");
    }
    // The database rejected the row: someone took the username a moment ago.
    if (error.code === 'unexpected_failure' || /database error/i.test(error.message)) {
      throw new Error('that username was just taken, please pick another');
    }
    throw error;
  }
  // With confirmation on, Supabase hides existing emails by returning a user with no identities.
  if (data.user && data.user.identities?.length === 0) {
    throw new Error('that email already has an account. try signing in or resetting your password');
  }
  return !!data.session;
}

// Implicit flow on purpose: a PKCE link only works in the browser that asked for it, and on iPhone
// the email opens in Safari rather than the home-screen app.
export async function requestReset(email) {
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'nj-reset' }
  });
  const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
  if (error) {
    if (error.code === 'over_email_send_rate_limit' || error.status === 429) throw new Error('too many emails sent, please try again later');
    if (error.code === 'email_address_invalid') throw new Error("that email doesn't look right");
    throw new Error("we couldn't send the email right now, please try again later");
  }
}

export async function setNewPassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === 'same_password') throw new Error('that is your current password, please pick a new one');
    if (error.code === 'weak_password') throw new Error('please pick a stronger password');
    throw new Error('that reset link has expired, please request a new one');
  }
}
