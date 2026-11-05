import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import {
  MIN_PASSWORD, USERNAME_RE, cleanUsername, createAccount, requestReset, resendConfirmation, setNewPassword,
  signInWithLogin, usernameAvailable
} from '../lib/auth.js';
import Doll from './Doll.jsx';
import { GoogleG } from './Icons.jsx';

// An expired reset link comes back with its reason in the URL.
function linkError() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  return params.get('error_code') === 'otp_expired' ? 'that link has expired, please request a new one' : '';
}

function useSubmit(initialError = '') {
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const run = (fn) => async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return { error, setError, busy, run };
}

function SignInForm({ onCreate, onForgot, initialError, notice }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const { error, busy, run } = useSubmit(initialError);
  return (
    <form className="auth-form" onSubmit={run(() => signInWithLogin(login, password))}>
      {notice && <p className="auth-msg" role="status">{notice}</p>}
      <label>
        username or email
        <input className="field" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" required />
      </label>
      <label>
        password
        <input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </label>
      {error && <p className="auth-msg bad" role="alert">{error}</p>}
      <button className="btn primary" disabled={busy}>{busy ? 'opening...' : 'open my journal'}</button>
      <div className="auth-links">
        <button type="button" className="link-btn" onClick={onCreate}>create an account</button>
        <button type="button" className="link-btn" onClick={onForgot}>forgot my password</button>
      </div>
    </form>
  );
}

function CreateForm({ onBack, onConfirmEmail }) {
  const [f, setF] = useState({ firstName: '', username: '', email: '', password: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const { error, busy, run } = useSubmit();

  const submit = run(async () => {
    const username = cleanUsername(f.username);
    if (!USERNAME_RE.test(username)) throw new Error('usernames are 3-24 letters, numbers, dots or underscores');
    if (f.password.length < MIN_PASSWORD) throw new Error(`passwords need at least ${MIN_PASSWORD} characters`);
    if (!(await usernameAvailable(username))) throw new Error('that username is taken, please pick another');
    const signedIn = await createAccount(f);
    if (!signedIn) onConfirmEmail(f.email.trim());
  });

  return (
    <form className="auth-form" onSubmit={submit}>
      <label>
        first name
        <input className="field" value={f.firstName} onChange={set('firstName')} autoComplete="given-name" required />
      </label>
      <label>
        username
        <input className="field" value={f.username} onChange={set('username')} autoComplete="username" autoCapitalize="none" autoCorrect="off" required />
      </label>
      <label>
        email
        <span className="hint">only used if you forget your password</span>
        <input className="field" type="email" value={f.email} onChange={set('email')} autoComplete="email" required />
      </label>
      <label>
        password
        <span className="hint">at least {MIN_PASSWORD} characters</span>
        <input className="field" type="password" value={f.password} onChange={set('password')} autoComplete="new-password" required />
      </label>
      {error && <p className="auth-msg bad" role="alert">{error}</p>}
      <button className="btn primary" disabled={busy}>{busy ? 'one sec...' : 'start my journal'}</button>
      <div className="auth-links">
        <button type="button" className="link-btn" onClick={onBack}>i already have an account</button>
      </div>
    </form>
  );
}

// Waiting on the confirmation email, with a way to ask for it again.
function ConfirmEmail({ email, onBack }) {
  const [resent, setResent] = useState(false);
  const { error, busy, run } = useSubmit();
  return (
    <form
      className="auth-form"
      onSubmit={run(async () => {
        await resendConfirmation(email);
        setResent(true);
      })}
    >
      <p className="auth-msg" role="status">almost there! we sent a link to {email}. tap it, then come back here and sign in. check your spam folder too.</p>
      {resent && <p className="auth-msg" role="status">sent another one.</p>}
      {error && <p className="auth-msg bad" role="alert">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? 'sending...' : 'send it again'}</button>
      <div className="auth-links">
        <button type="button" className="link-btn" onClick={onBack}>back to sign in</button>
      </div>
    </form>
  );
}

function ForgotForm({ onBack }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { error, busy, run } = useSubmit();
  return (
    <form
      className="auth-form"
      onSubmit={run(async () => {
        await requestReset(email);
        setSent(true);
      })}
    >
      <label>
        your email
        <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </label>
      {sent && <p className="auth-msg" role="status">if that email has an account, a reset link is on its way. check your spam folder too.</p>}
      {error && <p className="auth-msg bad" role="alert">{error}</p>}
      <button className="btn primary" disabled={busy}>{busy ? 'sending...' : 'email me a link'}</button>
      <div className="auth-links">
        <button type="button" className="link-btn" onClick={onBack}>back to sign in</button>
      </div>
    </form>
  );
}

export default function SignIn({ onTry }) {
  const [mode, setMode] = useState('signin');
  const [confirming, setConfirming] = useState('');
  const [googleError, setGoogleError] = useState('');
  // The confirmation link often opens in a different browser than the one that signed up,
  // so it can't sign them in automatically; say what happened instead.
  const [notice] = useState(() =>
    new URLSearchParams(window.location.search).has('confirmed') && !linkError() ? "you're confirmed! sign in below." : ''
  );

  useEffect(() => {
    if (notice) window.history.replaceState(null, '', window.location.pathname);
  }, [notice]);

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) setGoogleError(error.message);
  };

  return (
    <main className="page signin">
      <h1>my little journal</h1>
      <p>water, food, and moving my body</p>
      <Doll health={1} waving className="doll-svg" />
      <button type="button" className="btn try-me" onClick={onTry}>try me</button>
      <span className="muted try-hint">peek inside with sample data. no account needed.</span>
      {confirming ? (
        <ConfirmEmail email={confirming} onBack={() => { setConfirming(''); setMode('signin'); }} />
      ) : (
        <>
          {mode === 'signin' && (
            <SignInForm onCreate={() => setMode('create')} onForgot={() => setMode('forgot')} initialError={linkError()} notice={notice} />
          )}
          {mode === 'create' && <CreateForm onBack={() => setMode('signin')} onConfirmEmail={setConfirming} />}
          {mode === 'forgot' && <ForgotForm onBack={() => setMode('signin')} />}
          <span className="auth-or">or</span>
          <button className="btn google" onClick={google}>
            <GoogleG /> sign in with google
          </button>
          {googleError && <p className="auth-msg bad" role="alert">{googleError}</p>}
        </>
      )}
    </main>
  );
}

// Shown after someone follows a password-reset link from their email.
export function NewPassword({ onDone }) {
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const { error, busy, run } = useSubmit();
  return (
    <main className="page signin">
      <h1>my little journal</h1>
      <Doll health={1} className="doll-svg" />
      {done ? (
        <div className="auth-form">
          <p className="auth-msg" role="status">all set! your password is updated. if you use the home-screen app, sign in there with your new password.</p>
          <button className="btn primary" onClick={onDone}>open my journal</button>
        </div>
      ) : (
        <form
          className="auth-form"
          onSubmit={run(async () => {
            if (password.length < MIN_PASSWORD) throw new Error(`passwords need at least ${MIN_PASSWORD} characters`);
            await setNewPassword(password);
            setDone(true);
          })}
        >
          <label>
            pick a new password
            <span className="hint">at least {MIN_PASSWORD} characters</span>
            <input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
          </label>
          {error && <p className="auth-msg bad" role="alert">{error}</p>}
          <button className="btn primary" disabled={busy}>{busy ? 'saving...' : 'save my password'}</button>
        </form>
      )}
    </main>
  );
}
