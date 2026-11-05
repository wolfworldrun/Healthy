import { useEffect, useState } from 'react';
import Sheet from './Sheet.jsx';
import Doll from './Doll.jsx';
import { Strike } from './Icons.jsx';
import { clearWins, loadFeed, todayKey } from '../lib/store.js';
import { isDemo } from '../lib/supabase.js';

const WINS = {
  water: 'drank my water',
  calories: 'ate enough',
  protein: 'got my protein',
  carbs: 'got my carbs',
  fat: 'healthy fats',
  move: 'moved my body'
};

function Person({ person, ink }) {
  // A friend in a later timezone can already be on tomorrow's date.
  const when = person.day >= todayKey() ? 'today' : 'yesterday';
  return (
    <li className="friend">
      <Doll doll={person.doll} className="friend-doll" />
      <div>
        <p className="friend-name">{person.is_me ? `${person.name} (you)` : person.name}</p>
        {person.done.length === 0 ? (
          <p className="muted friend-none">nothing crossed off yet</p>
        ) : (
          <>
            <p className="muted friend-none">{when}</p>
            <ul>
              {person.done.map((k) => (
                <li key={k}>
                  <span className="struck">
                    {WINS[k] ?? k}
                    <Strike color={ink} />
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </li>
  );
}

export default function SocialSheet({ profile, ink, onSave, onClose, toast }) {
  const [feed, setFeed] = useState(null);
  const joined = !!profile.share_social;

  useEffect(() => {
    if (!joined || isDemo) return;
    loadFeed().then(setFeed).catch((e) => toast(e.message));
  }, [joined, toast]);

  const leave = async () => {
    await onSave({ ...profile, share_social: false }, true);
    await clearWins().catch((e) => toast(e.message));
    setFeed(null);
  };

  if (!joined) {
    return (
      <Sheet title="friends" onClose={onClose}>
        <p style={{ marginTop: 0 }}>see what others are crossing off, and cheer yourself on.</p>
        <p className="muted">
          if you join, other members can see your first name ({(profile.display_name || 'you').split(' ')[0]}), your doll,
          and which goals you crossed off. they never see your food, amounts, or weight. you can leave anytime.
        </p>
        <button className="btn primary" onClick={() => onSave({ ...profile, share_social: true }, true)} disabled={isDemo}>
          join in
        </button>
        {isDemo && <p className="muted">friends needs a real account.</p>}
      </Sheet>
    );
  }

  const others = feed?.filter((p) => !p.is_me) ?? [];

  return (
    <Sheet title="friends" onClose={onClose}>
      {feed === null ? (
        <p className="muted">looking for friends...</p>
      ) : (
        <>
          {others.length === 0 && <p className="muted" style={{ marginTop: 0 }}>nobody else has joined yet. invite someone!</p>}
          <ul className="friends">
            {feed.map((p, i) => <Person key={i} person={p} ink={ink} />)}
          </ul>
        </>
      )}
      <button className="link-btn" onClick={leave}>stop sharing and leave</button>
    </Sheet>
  );
}
