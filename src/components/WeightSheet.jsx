import { useEffect, useState } from 'react';
import Sheet from './Sheet.jsx';
import { addEntry, deleteEntry, loadWeights } from '../lib/store.js';
import { KG_PER_LB } from '../lib/units.js';

const INK = '#3b3337';

const prettyDay = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { month: 'short', day: 'numeric' }).toLowerCase();
};

// A little hand-drawn line of weigh-ins, with a dashed goal line.
function Trend({ points, goal, toUnit }) {
  if (points.length < 2) return null;
  const vals = points.map((p) => toUnit(p.weight_kg));
  const all = goal ? [...vals, toUnit(goal)] : vals;
  const min = Math.min(...all) - 1;
  const max = Math.max(...all) + 1;
  const W = 300;
  const H = 120;
  const x = (i) => 12 + (i / (vals.length - 1)) * (W - 24);
  const y = (v) => 10 + (1 - (v - min) / (max - min)) * (H - 20);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Weight over time">
      <g filter="url(#wobble)">
        {goal && (
          <>
            <path d={`M8 ${y(toUnit(goal))} H ${W - 8}`} stroke="#5f9a6a" strokeWidth={1.6} strokeDasharray="5 5" />
            <text x={W - 10} y={y(toUnit(goal)) - 4} textAnchor="end" fontSize="13" fill="#5f9a6a" fontFamily="var(--hand)">
              goal
            </text>
          </>
        )}
        <polyline
          points={vals.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
          fill="none"
          stroke="#d4637f"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {vals.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={3.4} fill="#f9d3d9" stroke={INK} strokeWidth={1.4} />
        ))}
      </g>
    </svg>
  );
}

export default function WeightSheet({ profile, day, onLogged, onClose, toast }) {
  const imperial = profile.units !== 'metric';
  const unit = imperial ? 'lb' : 'kg';
  const toUnit = (kg) => (imperial ? kg / KG_PER_LB : Number(kg));
  const fmt = (kg) => `${(Math.round(toUnit(kg) * 10) / 10).toFixed(1)} ${unit}`;

  const [weights, setWeights] = useState(null);
  const [value, setValue] = useState('');
  const [peek, setPeek] = useState(false);

  useEffect(() => {
    loadWeights().then(setWeights).catch((e) => toast(e.message));
  }, [toast]);

  const save = async () => {
    const kg = imperial ? Number(value) * KG_PER_LB : Number(value);
    try {
      const saved = await addEntry('weight', { day, weight_kg: Math.round(kg * 100) / 100 });
      const next = [...(weights ?? []), saved].sort((a, b) => a.day.localeCompare(b.day));
      setWeights(next);
      setValue('');
      // The newest weigh-in keeps calorie and water goals current.
      if (next[next.length - 1].id === saved.id) await onLogged(saved.weight_kg);
      toast('written down, just between us ♡');
    } catch (e) {
      toast(e.message);
    }
  };

  const remove = async (id) => {
    try {
      await deleteEntry('weight', id);
      setWeights((w) => w.filter((r) => r.id !== id));
    } catch (e) {
      toast(e.message);
    }
  };

  const first = weights?.[0];
  const last = weights?.[weights.length - 1];
  const change = first && last && weights.length > 1 ? toUnit(last.weight_kg) - toUnit(first.weight_kg) : null;
  const toGo = last && profile.goal_weight_kg ? toUnit(last.weight_kg) - toUnit(profile.goal_weight_kg) : null;

  return (
    <Sheet title="just between us" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>no peeking unless you want to.</p>
      <div className="row">
        <label>
          today's weight ({unit})
          <input className="field" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <button className="btn primary" disabled={!(Number(value) > 0)} onClick={save}>
          write it down
        </button>
      </div>

      {weights === null ? (
        <p className="muted">opening the diary...</p>
      ) : weights.length === 0 ? (
        <p className="muted">nothing here yet.</p>
      ) : !peek ? (
        <button className="btn" style={{ marginTop: 16 }} onClick={() => setPeek(true)}>
          peek at my progress
        </button>
      ) : (
        <div style={{ marginTop: 12 }}>
          <Trend points={weights} goal={profile.goal_weight_kg} toUnit={toUnit} />
          <p style={{ margin: '4px 0' }}>
            now {fmt(last.weight_kg)}
            {change !== null && (
              <span className="muted">
                {' '}· {change <= 0 ? 'down' : 'up'} {Math.abs(Math.round(change * 10) / 10)} {unit} since {prettyDay(first.day)}
              </span>
            )}
          </p>
          {toGo !== null && Math.abs(toGo) >= 0.1 && (
            <p className="muted" style={{ margin: 0 }}>
              {Math.abs(Math.round(toGo * 10) / 10)} {unit} to your goal, you're doing great
            </p>
          )}
          <ul className="results">
            {[...weights].reverse().map((w) => (
              <li key={w.id} className="weigh-in">
                <span>{prettyDay(w.day)}</span>
                <span>{fmt(w.weight_kg)}</span>
                <button onClick={() => remove(w.id)} aria-label={`Erase ${prettyDay(w.day)}`}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button className="btn" onClick={() => setPeek(false)}>hide it again</button>
        </div>
      )}
    </Sheet>
  );
}
