import { useState } from 'react';
import Sheet from './Sheet.jsx';
import Doll, { BEANIE_LABELS, DEFAULT_DOLL, DOLL_OPTIONS, OUTFIT_LABELS } from './Doll.jsx';

const SWATCHES = { skin: 'skin', hair: 'hair', eyes: 'eyes', dress: 'outfit color' };
const CHOICES = { outfit: ['outfit', OUTFIT_LABELS], beanie: ['beanie', BEANIE_LABELS] };

export default function ClosetSheet({ doll, onSave, onClose }) {
  const [d, setD] = useState({ ...DEFAULT_DOLL, ...doll });
  return (
    <Sheet title="dress her up" onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Doll doll={d} health={1} className="doll-svg" />
      </div>
      {Object.entries(CHOICES).map(([k, [label, names]]) => (
        <div key={k}>
          <p className="muted" style={{ margin: '4px 0 0' }}>{label}</p>
          <div className="chips">
            {DOLL_OPTIONS[k].map((v) => (
              <button key={v} className={`chip ${d[k] === v ? 'on' : ''}`} onClick={() => setD({ ...d, [k]: v })}>
                {names[v]}
              </button>
            ))}
          </div>
        </div>
      ))}
      {Object.entries(SWATCHES).map(([k, label]) => (
        <div key={k}>
          <p className="muted" style={{ margin: '4px 0 0' }}>{label}</p>
          <div className="swatches">
            {DOLL_OPTIONS[k].map((c) => (
              <button
                key={c}
                className={`swatch ${d[k] === c ? 'on' : ''}`}
                style={{ background: c }}
                onClick={() => setD({ ...d, [k]: c })}
                aria-label={`${label} ${c}`}
              />
            ))}
          </div>
        </div>
      ))}
      <button className="btn primary" style={{ marginTop: 12 }} onClick={() => onSave(d)}>
        she's perfect
      </button>
    </Sheet>
  );
}
