import { useRef, useState } from 'react';
import { AMOUNTS } from '../lib/food.js';
import { scanMeal } from '../lib/photo.js';
import { Macros } from './LogSheet.jsx';

export function PhotoButton({ onResult }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const result = await scanMeal(file);
      if (result.items?.length) onResult(result.items);
      else setError(result.note || "couldn't spot any food in that one");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="photo-scan">
      <input ref={input} type="file" accept="image/*" hidden onChange={pick} />
      <button type="button" className="btn" disabled={busy} onClick={() => input.current.click()}>
        {busy ? 'reading your plate...' : 'snap my plate'}
      </button>
      <span className="muted photo-note">your photo goes to claude to read your plate. we don't save it.</span>
      {error && <p className="auth-msg bad" role="alert">{error}</p>}
    </div>
  );
}

const scale = (v, by) => Math.round(v * by * 10) / 10;

export function PhotoReview({ items, ink, onAdd, onBack }) {
  const [rows, setRows] = useState(() => items.map((it) => ({ ...it, keep: true, by: 1 })));
  const [saving, setSaving] = useState(false);
  const update = (i, patch) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  const kept = rows.filter((r) => r.keep && r.name.trim());
  const sized = (r) => ({
    calories: Math.round(r.calories * r.by),
    protein: scale(r.protein, r.by),
    carbs: scale(r.carbs, r.by),
    fat: scale(r.fat, r.by)
  });
  const total = kept.reduce(
    (t, r) => {
      const n = sized(r);
      return { calories: t.calories + n.calories, protein: t.protein + n.protein, carbs: t.carbs + n.carbs, fat: t.fat + n.fat };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const save = async () => {
    setSaving(true);
    for (const r of kept) {
      const amount = AMOUNTS.find(([, v]) => v === r.by)?.[0] ?? r.by;
      await onAdd('food', {
        name: r.name.trim(),
        amount_label: r.by === 1 ? r.portion : `${amount} × ${r.portion}`,
        ...sized(r),
        source: 'photo',
        ink
      });
    }
  };

  return (
    <>
      <p className="muted" style={{ margin: 0 }}>these are estimates. fix anything that looks off before saving.</p>
      <ul className="review">
        {rows.map((r, i) => (
          <li key={i} className={r.keep ? '' : 'dropped'}>
            <div className="review-head">
              <input
                className="field"
                value={r.name}
                onChange={(e) => update(i, { name: e.target.value })}
                aria-label={`Food name ${i + 1}`}
                disabled={!r.keep}
              />
              <button type="button" className="link-btn" onClick={() => update(i, { keep: !r.keep })}>
                {r.keep ? 'remove' : 'undo'}
              </button>
            </div>
            {r.keep && (
              <>
                <p className="muted review-sub">
                  {r.portion} · {sized(r).calories} kcal · P {Math.round(sized(r).protein)} C {Math.round(sized(r).carbs)} F {Math.round(sized(r).fat)}
                  {r.confidence === 'low' ? ' · not sure about this one' : ''}
                </p>
                <div className="chips" role="group" aria-label={`How much ${r.name}`}>
                  {AMOUNTS.slice(0, 6).map(([text, v]) => (
                    <button type="button" key={text} className={`chip ${r.by === v ? 'on' : ''}`} onClick={() => update(i, { by: v })}>
                      {text}
                    </button>
                  ))}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <Macros n={total} />
      <div className="row">
        <button type="button" className="btn" onClick={onBack} disabled={saving}>back</button>
        <button type="button" className="btn primary" onClick={save} disabled={saving || kept.length === 0}>
          {saving ? 'writing...' : kept.length === 1 ? 'write it down' : 'write them down'}
        </button>
      </div>
    </>
  );
}
