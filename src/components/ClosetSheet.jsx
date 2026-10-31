import { useState } from 'react';
import Sheet from './Sheet.jsx';
import Doll, { DEFAULT_DOLL, DOLL_OPTIONS } from './Doll.jsx';

const LABELS = { skin: 'skin', hair: 'hair', eyes: 'eyes', dress: 'dress', beanie: 'beanie' };

export default function ClosetSheet({ doll, onSave, onClose }) {
  const [d, setD] = useState({ ...DEFAULT_DOLL, ...doll });
  return (
    <Sheet title="dress her up" onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Doll doll={d} health={1} className="doll-svg" />
      </div>
      {Object.keys(LABELS).map((k) => (
        <div key={k}>
          <p className="muted" style={{ margin: '4px 0 0' }}>{LABELS[k]}</p>
          {k === 'beanie' ? (
            <div className="chips">
              {DOLL_OPTIONS.beanie.map((b) => (
                <button key={b} className={`chip ${d.beanie === b ? 'on' : ''}`} onClick={() => setD({ ...d, beanie: b })}>
                  {b}
                </button>
              ))}
            </div>
          ) : (
            <div className="swatches">
              {DOLL_OPTIONS[k].map((c) => (
                <button
                  key={c}
                  className={`swatch ${d[k] === c ? 'on' : ''}`}
                  style={{ background: c }}
                  onClick={() => setD({ ...d, [k]: c })}
                  aria-label={`${LABELS[k]} ${c}`}
                />
              ))}
            </div>
          )}
        </div>
      ))}
      <button className="btn primary" style={{ marginTop: 12 }} onClick={() => onSave(d)}>
        she's perfect
      </button>
    </Sheet>
  );
}
