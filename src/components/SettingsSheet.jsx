import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { calcGoals } from '../../supabase/functions/_shared/goals.js';
import { CM_PER_IN, KG_PER_LB, ML_PER_OZ } from '../lib/units.js';
import { disablePush, enablePush, pushSupport, sendTestPush } from '../lib/push.js';

const r1 = (v) => (v == null || v === '' ? '' : String(Math.round(v * 10) / 10));

// Profile values are stored metric; the form shows whatever units the user picked.
function toForm(p) {
  const imperial = p.units !== 'metric';
  const totalIn = p.height_cm ? p.height_cm / CM_PER_IN : null;
  return {
    units: p.units || 'imperial',
    age: p.age ?? '',
    sex: p.sex ?? '',
    activity_level: p.activity_level || 'light',
    weight: r1(p.weight_kg && (imperial ? p.weight_kg / KG_PER_LB : p.weight_kg)),
    goal: r1(p.goal_weight_kg && (imperial ? p.goal_weight_kg / KG_PER_LB : p.goal_weight_kg)),
    heightCm: r1(p.height_cm),
    feet: totalIn ? String(Math.floor(totalIn / 12)) : '',
    inches: totalIn ? String(Math.round(totalIn % 12)) : '',
    calorie_goal: p.calorie_goal ?? '',
    protein_goal: p.protein_goal ?? '',
    carbs_goal: p.carbs_goal ?? '',
    fat_goal: p.fat_goal ?? '',
    water: p.water_goal_ml ? r1(imperial ? p.water_goal_ml / ML_PER_OZ : p.water_goal_ml) : '',
    exercise_goal_min: p.exercise_goal_min ?? 30,
    reminders_enabled: !!p.reminders_enabled,
    reminder_start_hour: p.reminder_start_hour ?? 8,
    reminder_end_hour: p.reminder_end_hour ?? 21,
    reminder_every_min: p.reminder_every_min ?? 120
  };
}

function fromForm(f, base) {
  const imperial = f.units !== 'metric';
  const n = (v) => (v === '' || v == null ? null : Number(v));
  const kg = (v) => (n(v) == null ? null : imperial ? n(v) * KG_PER_LB : n(v));
  const height = imperial
    ? (n(f.feet) || n(f.inches) ? ((n(f.feet) || 0) * 12 + (n(f.inches) || 0)) * CM_PER_IN : null)
    : n(f.heightCm);
  return {
    ...base,
    units: f.units,
    age: n(f.age),
    sex: f.sex || null,
    activity_level: f.activity_level,
    weight_kg: kg(f.weight),
    goal_weight_kg: kg(f.goal),
    height_cm: height,
    calorie_goal: n(f.calorie_goal),
    protein_goal: n(f.protein_goal),
    carbs_goal: n(f.carbs_goal),
    fat_goal: n(f.fat_goal),
    water_goal_ml: n(f.water) == null ? null : Math.round(imperial ? n(f.water) * ML_PER_OZ : n(f.water)),
    exercise_goal_min: n(f.exercise_goal_min) || 30,
    reminders_enabled: f.reminders_enabled,
    reminder_start_hour: Number(f.reminder_start_hour),
    reminder_end_hour: Number(f.reminder_end_hour),
    reminder_every_min: Number(f.reminder_every_min)
  };
}

const hourLabel = (h) => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;

export default function SettingsSheet({ profile, firstRun, onSave, onSignOut, onClose, toast }) {
  const [f, setF] = useState(() => toForm(profile));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const imperial = f.units !== 'metric';
  const preview = calcGoals({ ...fromForm(f, profile), calorie_goal: null, protein_goal: null, carbs_goal: null, fat_goal: null, water_goal_ml: null });
  const pushProblem = pushSupport();

  const switchUnits = (units) => setF(toForm({ ...fromForm(f, profile), units }));

  const toggleReminders = async (e) => {
    const on = e.target.checked;
    setBusy(true);
    try {
      if (on) await enablePush();
      else await disablePush();
      setF((prev) => ({ ...prev, reminders_enabled: on }));
      // Persist right away so the server starts (or stops) nudging without waiting for "save".
      await onSave(fromForm({ ...f, reminders_enabled: on }, profile), true);
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      await onSave(fromForm(f, profile));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title={firstRun ? 'tell me about you' : 'about me'} onClose={onClose}>
      {firstRun && <p className="muted">this sets your water, calories, macros, and movement goals.</p>}
      <div className="chips">
        <button className={`chip ${imperial ? 'on' : ''}`} onClick={() => switchUnits('imperial')}>lb / ft / oz</button>
        <button className={`chip ${!imperial ? 'on' : ''}`} onClick={() => switchUnits('metric')}>kg / cm / ml</button>
      </div>
      <div className="row">
        <label>age<input className="field" inputMode="numeric" value={f.age} onChange={set('age')} /></label>
        <label>
          body
          <select className="field" value={f.sex} onChange={set('sex')}>
            <option value="">prefer not to say</option>
            <option value="female">female</option>
            <option value="male">male</option>
            <option value="other">other</option>
          </select>
        </label>
      </div>
      <div className="row">
        {imperial ? (
          <>
            <label>height ft<input className="field" inputMode="numeric" value={f.feet} onChange={set('feet')} /></label>
            <label>in<input className="field" inputMode="numeric" value={f.inches} onChange={set('inches')} /></label>
          </>
        ) : (
          <label>height cm<input className="field" inputMode="decimal" value={f.heightCm} onChange={set('heightCm')} /></label>
        )}
      </div>
      <div className="row">
        <label>weight {imperial ? 'lb' : 'kg'}<input className="field" inputMode="decimal" value={f.weight} onChange={set('weight')} /></label>
        <label>goal {imperial ? 'lb' : 'kg'}<input className="field" inputMode="decimal" value={f.goal} onChange={set('goal')} /></label>
      </div>
      <label>
        usual day
        <select className="field" value={f.activity_level} onChange={set('activity_level')}>
          <option value="sedentary">mostly sitting</option>
          <option value="light">on my feet a bit</option>
          <option value="moderate">pretty active</option>
          <option value="active">very active</option>
        </select>
      </label>

      <p className="muted" style={{ marginBottom: 0 }}>
        suggested: {preview.calories} kcal · {preview.protein}g protein · {preview.carbs}g carbs · {preview.fat}g fat ·{' '}
        {imperial ? `${Math.round(preview.water_ml / ML_PER_OZ)} oz` : `${preview.water_ml} ml`} water
        {preview.direction !== 'maintain' && ` (${preview.direction === 'lose' ? 'gentle deficit' : 'gentle surplus'})`}
      </p>
      <p className="muted" style={{ margin: 0 }}>leave these blank to use the suggestions:</p>
      <div className="row">
        <label>kcal<input className="field" inputMode="numeric" placeholder={preview.calories} value={f.calorie_goal} onChange={set('calorie_goal')} /></label>
        <label>protein<input className="field" inputMode="numeric" placeholder={preview.protein} value={f.protein_goal} onChange={set('protein_goal')} /></label>
        <label>carbs<input className="field" inputMode="numeric" placeholder={preview.carbs} value={f.carbs_goal} onChange={set('carbs_goal')} /></label>
        <label>fat<input className="field" inputMode="numeric" placeholder={preview.fat} value={f.fat_goal} onChange={set('fat_goal')} /></label>
      </div>
      <div className="row">
        <label>
          water {imperial ? 'oz' : 'ml'}
          <input
            className="field"
            inputMode="numeric"
            placeholder={imperial ? Math.round(preview.water_ml / ML_PER_OZ) : preview.water_ml}
            value={f.water}
            onChange={set('water')}
          />
        </label>
        <label>move (min/day)<input className="field" inputMode="numeric" value={f.exercise_goal_min} onChange={set('exercise_goal_min')} /></label>
      </div>

      <h2 style={{ marginTop: 18, fontSize: 28 }}>reminders</h2>
      <label className="toggle">
        <input type="checkbox" checked={f.reminders_enabled} onChange={toggleReminders} disabled={busy || (!!pushProblem && !f.reminders_enabled)} />
        nudge me when I'm falling behind
      </label>
      {pushProblem && <p className="muted">{pushProblem}</p>}
      {f.reminders_enabled && (
        <>
          <div className="row">
            <label>
              from
              <select className="field" value={f.reminder_start_hour} onChange={set('reminder_start_hour')}>
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
              </select>
            </label>
            <label>
              until
              <select className="field" value={f.reminder_end_hour} onChange={set('reminder_end_hour')}>
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
              </select>
            </label>
            <label>
              at most every
              <select className="field" value={f.reminder_every_min} onChange={set('reminder_every_min')}>
                {[60, 90, 120, 180, 240].map((m) => <option key={m} value={m}>{m / 60} hr</option>)}
              </select>
            </label>
          </div>
          <button
            className="btn"
            style={{ marginTop: 10 }}
            onClick={() => sendTestPush().then(() => toast('test sent!'), (e) => toast(e.message))}
          >
            send a test nudge
          </button>
        </>
      )}

      <div className="row" style={{ marginTop: 20 }}>
        {!firstRun && <button className="btn" onClick={onSignOut}>sign out</button>}
        <button className="btn primary" onClick={save} disabled={busy}>save</button>
      </div>
    </Sheet>
  );
}
