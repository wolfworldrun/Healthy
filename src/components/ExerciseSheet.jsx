import { useState } from 'react';
import Sheet, { InkPicker } from './Sheet.jsx';
import { caloriesBurned } from '../../supabase/functions/_shared/goals.js';

const TITLES = { weights: 'lifted weights', treadmill: 'treadmill time', dance: 'danced it out' };
const INTENSITY = {
  weights: { easy: 'light', moderate: 'steady', hard: 'heavy' },
  treadmill: { easy: 'walk', moderate: 'jog', hard: 'run' },
  dance: { easy: 'groove', moderate: 'dance', hard: 'cardio dance' }
};

export default function ExerciseSheet({ kind, ink, setInk, weightKg, onAdd, onClose }) {
  const [minutes, setMinutes] = useState('30');
  const [intensity, setIntensity] = useState('moderate');
  const mins = Number(minutes) || 0;
  const burned = caloriesBurned(kind, intensity, mins, weightKg);

  return (
    <Sheet title={TITLES[kind]} onClose={onClose}>
      <InkPicker ink={ink} setInk={setInk} />
      <div className="chips">
        {[10, 20, 30, 45, 60].map((m) => (
          <button key={m} className={`chip ${mins === m ? 'on' : ''}`} onClick={() => setMinutes(String(m))}>
            {m} min
          </button>
        ))}
      </div>
      <label>
        minutes
        <input className="field" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
      </label>
      <p className="muted" style={{ marginBottom: 0 }}>how hard?</p>
      <div className="chips">
        {Object.entries(INTENSITY[kind]).map(([k, label]) => (
          <button key={k} className={`chip ${intensity === k ? 'on' : ''}`} onClick={() => setIntensity(k)}>
            {label}
          </button>
        ))}
      </div>
      <p className="muted">about {burned} kcal burned</p>
      <button
        className="btn primary"
        disabled={mins <= 0}
        onClick={() => onAdd('exercise', { kind, minutes: mins, intensity, calories_burned: burned, ink })}
      >
        write it down
      </button>
    </Sheet>
  );
}
