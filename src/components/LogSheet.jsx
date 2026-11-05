import { useEffect, useMemo, useState } from 'react';
import Sheet, { InkPicker } from './Sheet.jsx';
import { AMOUNTS, FOOD_IDEAS, getPortions, searchFoods, scaleNutrients } from '../lib/food.js';
import { ML_PER_OZ, waterChoices } from '../lib/units.js';
import { PhotoButton, PhotoReview } from './PhotoScan.jsx';

export default function LogSheet({ tab: initialTab, focus, ink, setInk, units, onAdd, onClose }) {
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
        <FoodTab ink={ink} focus={focus} onAdd={onAdd} />
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

function Ideas({ focus, onPick }) {
  const [cat, setCat] = useState(FOOD_IDEAS[focus] ? focus : 'protein');
  return (
    <div className="ideas">
      <p className="muted" style={{ margin: '6px 0 0' }}>need ideas? foods rich in...</p>
      <div className="chips">
        {Object.entries(FOOD_IDEAS).map(([k, v]) => (
          <button key={k} className={`chip ${cat === k ? 'on' : ''}`} onClick={() => setCat(k)}>
            {v.label}
          </button>
        ))}
      </div>
      <ul className="results">
        {FOOD_IDEAS[cat].items.map(([name, term, why]) => (
          <li key={name}>
            <button onClick={() => onPick(term)}>
              <span className="name">{name}</span>
              <span className="sub">{why}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FoodTab({ ink, focus, onAdd }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('');
  const [picked, setPicked] = useState(null);
  const [manual, setManual] = useState(false);
  const [scanned, setScanned] = useState(null);

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

  if (scanned) return <PhotoReview items={scanned} ink={ink} onAdd={onAdd} onBack={() => setScanned(null)} />;
  if (picked) return <Portion food={picked} ink={ink} onAdd={onAdd} onBack={() => setPicked(null)} />;
  if (manual) return <ManualFood ink={ink} onAdd={onAdd} onBack={() => setManual(false)} />;

  return (
    <>
      <PhotoButton onResult={setScanned} />
      <label>
        what did you eat?
        <input
          className="field"
          type="search"
          placeholder="greek yogurt, banana, oat milk..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {status && <p className="muted">{status}</p>}
      {query.trim().length < 2 && <Ideas focus={focus} onPick={setQuery} />}
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
  const [portions, setPortions] = useState(null);
  const [unitIdx, setUnitIdx] = useState(0);
  const [qty, setQty] = useState('1');

  useEffect(() => {
    const ctrl = new AbortController();
    getPortions(food, ctrl.signal)
      .then((p) => {
        setPortions(p);
        setUnitIdx(0);
        setQty(p[0].unit === 'grams' ? '100' : '1');
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [food]);

  const portion = portions?.[unitIdx];
  const amount = Number(qty) || 0;
  const grams = portion ? amount * portion.grams : 0;
  const n = useMemo(() => scaleNutrients(food.per100, grams), [food, grams]);
  const qtyText = AMOUNTS.find(([, v]) => v === amount)?.[0] ?? qty;
  const label = portion
    ? portion.unit === 'grams' ? `${qty} g` : `${qtyText} ${portion.unit}${portion.unit !== 'oz' ? ` (${Math.round(grams)} g)` : ''}`
    : '';

  const pickUnit = (i) => {
    setUnitIdx(i);
    if (portions[i].unit === 'grams') setQty('100');
    else if (portions[unitIdx].unit === 'grams') setQty('1');
  };

  return (
    <>
      <p style={{ margin: 0, color: ink, fontFamily: 'var(--script)', fontSize: 26, lineHeight: 1.1 }}>{food.name}</p>
      <p className="muted" style={{ margin: 0 }}>{food.brand || food.source}</p>
      {!portions ? (
        <p className="muted">finding portion sizes...</p>
      ) : (
        <>
          <p className="muted" style={{ margin: '6px 0 0' }}>how much?</p>
          {portion.unit !== 'grams' && (
            <div className="chips">
              {AMOUNTS.map(([text, v]) => (
                <button key={text} className={`chip ${amount === v ? 'on' : ''}`} onClick={() => setQty(String(v))}>
                  {text}
                </button>
              ))}
            </div>
          )}
          <div className="row">
            <label style={{ flex: '0 0 72px' }}>
              amount
              <input className="field" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
            </label>
            <label>
              of
              <select className="field" value={unitIdx} onChange={(e) => pickUnit(Number(e.target.value))}>
                {portions.map((p, i) => (
                  <option key={p.unit} value={i}>
                    {p.unit}
                    {p.unit !== 'grams' && p.unit !== 'oz' ? ` (${Math.round(p.grams)} g)` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      )}
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
