import { useEffect } from 'react';
import { Close, INKS } from './Icons.jsx';

export default function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn close" onClick={onClose} aria-label="Close">
          <Close />
        </button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function InkPicker({ ink, setInk }) {
  return (
    <div className="inks" role="radiogroup" aria-label="Ink color">
      {INKS.map((k) => (
        <button
          key={k.name}
          className={`ink-dot ${ink === k.color ? 'on' : ''}`}
          style={{ background: k.color }}
          onClick={() => setInk(k.color)}
          role="radio"
          aria-checked={ink === k.color}
          aria-label={`${k.name} ink`}
        />
      ))}
    </div>
  );
}
