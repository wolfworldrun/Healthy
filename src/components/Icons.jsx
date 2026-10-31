// Hand-drawn line icons. They all share the #sketch wobble filter defined by <SketchDefs/>.

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const INKS = [
  { name: 'rose', color: '#d4637f' },
  { name: 'sky', color: '#4a7bb7' },
  { name: 'sage', color: '#5f9a6a' },
  { name: 'lilac', color: '#8a6fc0' },
  { name: 'apricot', color: '#e08a4a' },
  { name: 'ink', color: '#3b3337' }
];

export function SketchDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <filter id="wobble">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7" />
        <feDisplacementMap in="SourceGraphic" scale="1.8" />
      </filter>
    </svg>
  );
}

export function Pen({ ink, onPick }) {
  // A clear six-color clicky pen; each slider on top is one ink.
  return (
    <svg className="pen" viewBox="0 0 60 260" role="group" aria-label="Pen: pick an ink to write with">
      <g filter="url(#wobble)">
        {INKS.map((k, i) => (
          <g
            key={k.name}
            className={`slider ${ink === k.color ? 'on' : ''}`}
            onClick={() => onPick(k.color)}
            role="button"
            aria-label={`${k.name} ink`}
          >
            <rect x={8 + i * 7.5} y={4} width={6} height={44} rx={2.5} fill={k.color} stroke="#3b3337" strokeWidth={1.2} />
          </g>
        ))}
        <g className="body" onClick={() => onPick(ink)}>
          <path d="M6 44 L54 44 L52 208 Q30 216 8 208 Z" fill="rgba(220,232,245,0.55)" stroke="#3b3337" strokeWidth={2} />
          {INKS.map((k, i) => (
            <path key={k.name} d={`M${12 + i * 7.5} 50 L${20 + i * 2.5} 206`} stroke={k.color} strokeWidth={2.4} opacity={0.75} />
          ))}
          <path d="M14 70 L46 70 M14 74 L46 74" stroke="#3b3337" strokeWidth={1} opacity={0.4} />
          <path d="M8 208 Q30 216 52 208 L36 246 Q30 250 24 246 Z" fill="rgba(220,232,245,0.8)" stroke="#3b3337" strokeWidth={2} />
          <path d="M27 246 L30 258 L33 246" fill={ink} stroke="#3b3337" strokeWidth={1.4} />
          <rect x={48} y={52} width={8} height={70} rx={3} fill="rgba(255,255,255,0.7)" stroke="#3b3337" strokeWidth={1.4} />
        </g>
      </g>
    </svg>
  );
}

export const Dumbbell = () => (
  <svg viewBox="0 0 48 48" filter="url(#wobble)" aria-hidden="true">
    <g {...S}>
      <path d="M14 24 L34 24" strokeWidth={3} />
      <rect x={6} y={14} width={6} height={20} rx={2} fill="#f9d3d9" />
      <rect x={36} y={14} width={6} height={20} rx={2} fill="#f9d3d9" />
      <path d="M3 19 L3 29 M45 19 L45 29" />
    </g>
  </svg>
);

export const Treadmill = () => (
  <svg viewBox="0 0 48 48" filter="url(#wobble)" aria-hidden="true">
    <g {...S}>
      <path d="M4 38 L40 38 Q44 38 44 34 L44 33 L8 33 Q4 33 4 36 Z" fill="#d4eadb" />
      <path d="M40 33 L34 10 L40 8" />
      <circle cx={10} cy={41} r={2} />
      <circle cx={38} cy={41} r={2} />
      <circle cx={22} cy={8} r={3} />
      <path d="M22 11 L20 21 L25 27 M20 21 L14 28 M21 14 L27 17 M21 14 L15 17" strokeWidth={1.8} />
    </g>
  </svg>
);

export const Dancer = () => (
  <svg viewBox="0 0 48 48" filter="url(#wobble)" aria-hidden="true">
    <g {...S}>
      <circle cx={25} cy={8} r={3.5} />
      <path d="M25 12 L24 26" />
      <path d="M24 16 L14 10 M24 16 L35 12 L38 6" />
      <path d="M24 26 L16 34 Q22 36 22 42 M24 26 L32 36" />
      <path d="M16 26 Q24 30 32 26 L24 22 Z" fill="#f8dfa4" strokeWidth={1.6} />
      <path d="M40 22 l1.5 -3 l1.5 3 l-3 -2 h3z M8 30 l1 -2 l1 2 l-2 -1.3 h2z" strokeWidth={1.2} />
    </g>
  </svg>
);

export const Yoga = () => (
  <svg viewBox="0 0 48 48" filter="url(#wobble)" aria-hidden="true">
    <g {...S}>
      <path d="M8 42 L40 42" strokeWidth={1.6} />
      <path d="M10 40 L38 40 L38 42 L10 42 Z" fill="#d9cdea" strokeWidth={1.4} />
      <circle cx={24} cy={9} r={3.5} />
      <path d="M24 13 L24 27" />
      <path d="M24 17 L16 8 M24 17 L32 8" />
      <path d="M24 27 L24 39 M24 27 L30 31 L25 34" />
    </g>
  </svg>
);

export const Walk = () => (
  <svg viewBox="0 0 48 48" filter="url(#wobble)" aria-hidden="true">
    <g {...S}>
      <circle cx={26} cy={8} r={3.5} />
      <path d="M25 12 L22 26" />
      <path d="M24 16 L16 22 M24 16 L31 22" />
      <path d="M22 26 L16 38 L12 39 M22 26 L29 32 L30 40" />
      <path d="M6 43 q8 -3 16 0 t16 0" strokeWidth={1.4} stroke="#9cc48f" />
      <path d="M38 14 q4 -6 7 -2 q-3 5 -7 2z" fill="#d4eadb" strokeWidth={1.4} />
    </g>
  </svg>
);

export const Hanger = () => (
  <svg width="30" height="30" viewBox="0 0 30 30" filter="url(#wobble)" aria-hidden="true">
    <g {...S} strokeWidth={1.8}>
      <path d="M15 9 q0 -4 3 -4 q3 0 3 3 q0 2 -3 3.5 L15 13" />
      <path d="M15 13 L3 22 Q2 24 4 24 L26 24 Q28 24 27 22 Z" fill="#f9d3d9" />
    </g>
  </svg>
);

export const Gear = () => (
  <svg width="30" height="30" viewBox="0 0 30 30" filter="url(#wobble)" aria-hidden="true">
    <g {...S}>
      <circle cx={15} cy={15} r={4} />
      <path d="M15 3 L15 7 M15 23 L15 27 M3 15 L7 15 M23 15 L27 15 M6.5 6.5 L9.3 9.3 M20.7 20.7 L23.5 23.5 M6.5 23.5 L9.3 20.7 M20.7 9.3 L23.5 6.5" />
      <circle cx={15} cy={15} r={9} />
    </g>
  </svg>
);

export const Arrow = ({ dir = 'left' }) => (
  <svg width="22" height="22" viewBox="0 0 22 22" filter="url(#wobble)" aria-hidden="true" style={{ transform: dir === 'right' ? 'scaleX(-1)' : 'none' }}>
    <path d="M14 4 L6 11 L14 18" {...S} />
  </svg>
);

export const Close = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" filter="url(#wobble)" aria-hidden="true">
    <path d="M5 5 L19 19 M19 5 L5 19" {...S} />
  </svg>
);

export const Box = ({ checked }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" filter="url(#wobble)" aria-hidden="true">
    <path d="M3 3 L17 3 L17 17 L3 17 Z" {...S} strokeWidth={1.8} />
    {checked && <path d="M5 10 L9 14 L18 2" {...S} strokeWidth={2.4} />}
  </svg>
);

// A wavy pen strike for crossed-out accomplishments.
export const Strike = ({ color }) => (
  <svg viewBox="0 0 100 14" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 8 C 15 3, 25 11, 40 6 S 70 3, 85 8 S 98 6, 100 5" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
  </svg>
);

export const GoogleG = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);
