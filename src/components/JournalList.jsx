import { useState } from 'react';
import { formatWater } from '../lib/units.js';

const EXERCISE_WORDS = { weights: 'lifted weights', treadmill: 'treadmill', dance: 'danced', yoga: 'yoga', walk: 'walked' };

function describe(kind, r, units) {
  if (kind === 'food') {
    return { what: r.name, meta: `${r.amount_label ? `${r.amount_label} · ` : ''}${Math.round(r.calories)} kcal` };
  }
  if (kind === 'water') return { what: `water, ${formatWater(r.amount_ml, units)}`, meta: '' };
  return { what: `${EXERCISE_WORDS[r.kind]} ${r.minutes} min`, meta: `~${r.calories_burned} kcal` };
}

function readOpen() {
  try {
    return localStorage.getItem('nj-diary-open') !== 'no';
  } catch {
    return true;
  }
}

export default function JournalList({ logs, units, onDelete, aside }) {
  const [open, setOpen] = useState(readOpen);
  const toggle = () => {
    setOpen(!open);
    try {
      localStorage.setItem('nj-diary-open', open ? 'no' : 'yes');
    } catch {
      /* fine, it just won't be remembered */
    }
  };
  const entries = [
    ...logs.food.map((r) => ({ kind: 'food', r })),
    ...logs.water.map((r) => ({ kind: 'water', r })),
    ...logs.exercise.map((r) => ({ kind: 'exercise', r }))
  ].sort((a, b) => new Date(a.r.created_at) - new Date(b.r.created_at));

  return (
    <section className="journal" aria-label="Today's entries">
      <div className="journal-head">
        <h3>
          <button type="button" className="diary-toggle" onClick={toggle} aria-expanded={open}>
            <span className={`caret ${open ? 'open' : ''}`} aria-hidden="true">›</span>
            dear diary, today I...
          </button>
        </h3>
        {aside}
      </div>
      {!open ? (
        <p className="nothing" style={{ margin: 0 }}>
          {entries.length === 0 ? 'nothing yet' : `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} tucked away`}
        </p>
      ) : entries.length === 0 ? (
        <p className="nothing" style={{ margin: 0 }}>...haven't written anything yet. tap the pen ✎</p>
      ) : (
        <ol>
          {entries.map(({ kind, r }) => {
            const { what, meta } = describe(kind, r, units);
            const time = new Date(r.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            return (
              <li key={`${kind}-${r.id}`} style={{ color: r.ink || 'var(--ink)' }}>
                <span className="time">{time}</span>
                <span className="what">{what}</span>
                {meta && <span className="meta">{meta}</span>}
                <button className="x" onClick={() => onDelete(kind, r.id)} aria-label={`Erase ${what}`}>
                  ×
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
