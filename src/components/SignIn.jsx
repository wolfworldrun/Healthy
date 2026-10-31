import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import Doll from './Doll.jsx';
import { GoogleG } from './Icons.jsx';

export default function SignIn() {
  const [error, setError] = useState('');
  const signIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) setError(error.message);
  };
  return (
    <main className="page signin">
      <h1>my little journal</h1>
      <p>water, food, and moving my body</p>
      <Doll health={1} className="doll-svg" />
      <button className="btn primary google" onClick={signIn}>
        <GoogleG /> sign in with google
      </button>
      {error && <p className="err">{error}</p>}
    </main>
  );
}
