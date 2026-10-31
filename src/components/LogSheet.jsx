import { useEffect, useMemo, useState } from 'react';
import Sheet, { InkPicker } from './Sheet.jsx';
import { searchFoods, scaleNutrients } from '../lib/food.js';
import { ML_PER_OZ, waterChoices } from '../lib/units.js';

export default function LogSheet({ tab: initialTab, ink, setInk, units, onAdd, onClose }) {
  const [tab, setTab] = useState(initialTab || 'food');
  return (
    <Sheet title="write it down" onClose={onClose}>
      <InkPicker ink={ink} setInk={setInk} />
      <div className="tabs">
        {['food', 'water'].map((t) => (
          <button key={t} className={`chip ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'food' ? (
        <FoodTab ink={ink} onAdd={onAdd} />
      ) : (
        <WaterTab ink={ink} units={units} onAdd={onAdd} />
      )}
    </Sheet>
  );
}

function WaterTab({ ink, units, onAdd }) {
  const [custom, setCustom] = useState('');
  const add = (ml) => onAdd('water', { amount_ml: Math.round(ml), ink });
  const unit = units === 'metric' ? 'ml' : 'oz';
  return (
    <>
      <p className="muted">tap a glass</p>
      <div className="chips">
        {waterChoices(units).map((c) => (
          <button key={c.label} className="chip" style={{ color: ink }} onClick={() => add(c.ml)}>
            + {c.label}
          </button>
        ))}
      </div>
      <div className="row">
        <label>
          or a custom amount ({unit})
          <input className="field" inputMode="decimal" value={custom} onChange={(e) => setCustom(e.target.value)} />
        </label>
        <button
          className="btn primary"
          disabled={!(Number(custom) > 0)}
          onClick={() => add(units === 'metric' ? Number(custom) : Number(custom) * ML_PER_OZ)}
        >
          add
        </button>
      </div>
    </>
  );
}

function FoodTab({ ink, onAdd }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('');
  const [picked, setPicked] = useState(null);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setStatus('');
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setStatus('looking...');
      try {
        const found = await searchFoods(q, ctrl.signal);
        setResults(found);
        setStatus(found.length ? '' : 'nothing found, try fewer words or add it by hand');
      } catch (e) {
        if (e.name !== 'AbortError') setStatus('search is napping, add it by hand for now');
      }
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  if (picked) return <Portion food={picked} ink={ink} onAdd={onAdd} onBack={() => setPicked(null)} />;
  if (manual) return <ManualFood ink={ink} onAdd={onAdd} onBack={() => setManual(false)} />;

  return (
    <>
      <label>
        what did you eat?
        <input
          className="field"
          type="search"
          placeholder="greek yogurt, banana, oat milk..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </label>
      {status && <p className="muted">{status}</p>}
      <ul className="results">
        {results.map((f) => (
          <li key={f.id}>
            <button onClick={() => setPicked(f)}>
              <span className="name">{f.name}</span>
              <span className="sub">
                {f.brand ? `${f.brand} · ` : ''}
                {Math.round(f.per100.calories)} kcal / 100g · P {Math.round(f.per100.protein)} C{' '}
                {Math.round(f.per100.carbs)} F {Math.round(f.per100.fat)} · {f.source}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button className="btn" onClick={() => setManual(true)}>
        add by hand
      </button>
    </>
  );
}

function Portion({ food, ink, onAdd, onBack }) {
  const [mode, setMode] = useState(food.servingG ? 'serving' : 'g');
  const [qty, setQty] = useState(food.servingG ? '1' : '100');
  const grams = mode === 'serving' ? Number(qty) * food.servingG : Number(qty);
  const n = useMemo(() => scaleNutrients(food.per100, grams || 0), [food, grams]);
  const label = mode === 'serving' ? `${qty} × ${food.servingLabel || `${food.servingG} g`}` : `${qty} g`;

  return (
    <>
      <p style={{ margin: 0, color: ink, fontFamily: 'var(--script)', fontSize: 26 }}>{food.name}</p>
      <p className="muted" style={{ margin: 0 }}>{food.brand || food.source}</p>
      <div className="row">
        <label>
          how much? ({mode === 'g' ? 'grams' : 'servings'})
          <input className="field" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
        </label>
        {food.servingG && (
          <div className="chips" style={{ flex: 2 }}>
            <button className={`chip ${mode === 'serving' ? 'on' : ''}`} onClick={() => { setMode('serving'); setQty('1'); }}>
              servings
            </button>
            <button className={`chip ${mode === 'g' ? 'on' : ''}`} onClick={() => { setMode('g'); setQty(String(food.servingG)); }}>
              grams
            </button>
          </div>
        )}
      </div>
      <Macros n={n} />
      <div className="row">
        <button className="btn" onClick={onBack}>back</button>
        <button
          className="btn primary"
          disabled={!(grams > 0)}
          onClick={() => onAdd('food', { name: food.name, amount_label: label, ...n, source: food.source, ink })}
        >
          write it down
        </button>
      </div>
    </>
  );
}

function ManualFood({ ink, onAdd, onBack }) {
  const [f, setF] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const numbers = ['calories', 'protein', 'carbs', 'fat'];
  return (
    <>
      <label>
        name
        <input className="field" value={f.name} onChange={set('name')} autoFocus />
      </label>
      <div className="row">
        {numbers.map((k) => (
          <label key={k}>
            {k === 'calories' ? 'kcal' : `${k} g`}
            <input className="field" inputMode="decimal" value={f[k]} onChange={set(k)} />
          </label>
        ))}
      </div>
      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn" onClick={onBack}>back</button>
        <button
          className="btn primary"
          disabled={!f.name.trim()}
          onClick={() =>
            onAdd('food', {
              name: f.name.trim(),
              amount_label: null,
              ...Object.fromEntries(numbers.map((k) => [k, Number(f[k]) || 0])),
              source: 'manual',
              ink
            })
          }
        >
          write it down
        </button>
      </div>
    </>
  );
}

export function Macros({ n }) {
  return (
    <div className="macros">
      <div><b>{Math.round(n.calories)}</b><span>kcal</span></div>
      <div><b>{Math.round(n.protein)}</b><span>protein</span></div>
      <div><b>{Math.round(n.carbs)}</b><span>carbs</span></div>
      <div><b>{Math.round(n.fat)}</b><span>fat</span></div>
    </div>
  );
}
