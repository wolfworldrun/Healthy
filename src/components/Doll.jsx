import { useId } from 'react';

// The journal doll. `health` (0..1) drives her posture: she droops, her eyes get
// heavy and her flower wilts when goals fall behind, and perks back up as they're met.

export const DOLL_OPTIONS = {
  skin: ['#fde3d3', '#f6cdb0', '#e7b08a', '#c98c63', '#9c6644', '#6b4430'],
  hair: ['#2b2225', '#5a3a2a', '#a0673d', '#e2bf7a', '#d98c6c', '#f2a7bf', '#b7a6d9'],
  eyes: ['#4a7bb7', '#5f8f6a', '#7a5236', '#8a7fb8', '#3b3337', '#c06c84'],
  dress: ['#3d4f7a', '#7b9cc4', '#c06c84', '#9cb89a', '#e8d9c8', '#b7a6d9', '#f2c879', '#2b2225'],
  outfit: ['pinafore', 'tee', 'overalls'],
  beanie: ['panda', 'bear', 'bunny', 'cat', 'tuxedo', 'orange', 'greywhite', 'shiba', 'frog', 'pig']
};

export const OUTFIT_LABELS = { pinafore: 'pinafore', tee: 'tee + baggy pants', overalls: 'overalls' };
export const BEANIE_LABELS = {
  panda: 'panda', bear: 'bear', bunny: 'bunny', cat: 'cat', tuxedo: 'black & white cat',
  orange: 'orange cat', greywhite: 'grey & white cat', shiba: 'shiba inu', frog: 'frog', pig: 'pig'
};

export const DEFAULT_DOLL = {
  skin: '#fde3d3', hair: '#2b2225', eyes: '#4a7bb7', dress: '#3d4f7a', outfit: 'pinafore', beanie: 'panda'
};

const INK = '#3b3337';
const STROKE = { stroke: INK, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' };

// ears: ear shape; face: what's stitched on the front; patch: muzzle color; stripes: tabby marks.
const BEANIES = {
  panda: { base: '#f7f3ec', ear: '#2b2526', inner: '#2b2526', ears: 'round', face: 'panda' },
  bear: { base: '#b98a62', ear: '#b98a62', inner: '#ead0b4', ears: 'round', face: 'bear' },
  bunny: { base: '#f8eef1', ear: '#f8eef1', inner: '#f6b9c8', ears: 'bunny', face: 'bunny' },
  cat: { base: '#cfc8d3', ear: '#cfc8d3', inner: '#f3c4cf', ears: 'pointy', face: 'cat' },
  tuxedo: { base: '#2f2a2d', ear: '#2f2a2d', inner: '#f3c4cf', ears: 'pointy', face: 'cat', patch: '#f7f3ec', eye: '#f2d36b', whiskers: '#f7f3ec' },
  orange: { base: '#f0a35e', ear: '#f0a35e', inner: '#f8cfd5', ears: 'pointy', face: 'cat', stripes: '#d0782f' },
  greywhite: { base: '#a7a4ab', ear: '#a7a4ab', inner: '#f3c4cf', ears: 'pointy', face: 'cat', patch: '#f7f3ec' },
  shiba: { base: '#e39b55', ear: '#e39b55', inner: '#fbe9d0', ears: 'pointy', face: 'shiba', patch: '#fbf3e6' },
  frog: { base: '#a8d396', ear: '#a8d396', inner: '#ffffff', ears: 'frog', face: 'frog' },
  pig: { base: '#f5bcc6', ear: '#f5bcc6', inner: '#ee9fae', ears: 'pig', face: 'pig' }
};

function Ears({ kind, b, droop }) {
  // Each ear pivots at its base; `droop` (deg) tips them outward as she wilts.
  const ear = (side) => {
    const x = side < 0 ? 62 : 138;
    const rot = side * droop;
    let shape;
    if (kind === 'bunny') {
      shape = (
        <>
          <path d={`M${x - 10} 52 C ${x - 16} 0, ${x + 16} 0, ${x + 10} 52 Z`} fill={b.ear} {...STROKE} />
          <path d={`M${x - 4} 48 C ${x - 7} 16, ${x + 7} 16, ${x + 4} 48 Z`} fill={b.inner} />
        </>
      );
    } else if (kind === 'pointy' || kind === 'pig') {
      const tip = kind === 'pig' ? 28 : 18;
      shape = (
        <>
          <path d={`M${x - 15} 52 L ${x + side * 2} ${tip} L ${x + 15} 52 Z`} fill={b.ear} {...STROKE} />
          <path d={`M${x - 7} 49 L ${x + side * 2} ${tip + 10} L ${x + 7} 49 Z`} fill={b.inner} />
        </>
      );
    } else if (kind === 'frog') {
      shape = (
        <>
          <circle cx={x} cy={40} r={14} fill={b.ear} {...STROKE} />
          <circle cx={x} cy={40} r={8} fill="#fff" {...STROKE} strokeWidth={1.6} />
          <circle cx={x + side * 1.5} cy={41} r={3.6} fill={INK} />
        </>
      );
    } else {
      shape = (
        <>
          <circle cx={x} cy={42} r={14} fill={b.ear} {...STROKE} />
          <circle cx={x} cy={43} r={7} fill={b.inner} />
        </>
      );
    }
    return (
      <g key={side} transform={`rotate(${rot} ${x} 54)`}>
        {shape}
      </g>
    );
  };
  return (
    <>
      {ear(-1)}
      {ear(1)}
    </>
  );
}

function BeanieFace({ kind, b }) {
  switch (kind) {
    case 'panda':
      return (
        <g>
          <ellipse cx={88} cy={64} rx={7} ry={5.5} fill={b.ear} transform="rotate(-20 88 64)" />
          <ellipse cx={112} cy={64} rx={7} ry={5.5} fill={b.ear} transform="rotate(20 112 64)" />
          <circle cx={89} cy={63} r={1.8} fill="#fff" />
          <circle cx={111} cy={63} r={1.8} fill="#fff" />
          <ellipse cx={100} cy={72} rx={3.5} ry={2.5} fill={b.ear} />
        </g>
      );
    case 'frog':
      return <path d="M88 70 Q100 79 112 70" fill="none" {...STROKE} strokeWidth={1.8} />;
    case 'pig':
      return (
        <g>
          <circle cx={90} cy={62} r={2.2} fill={INK} />
          <circle cx={110} cy={62} r={2.2} fill={INK} />
          <ellipse cx={100} cy={72} rx={9} ry={6} fill={b.inner} {...STROKE} strokeWidth={1.6} />
          <circle cx={97} cy={72} r={1.4} fill={INK} />
          <circle cx={103} cy={72} r={1.4} fill={INK} />
        </g>
      );
    case 'cat':
      return (
        <g {...STROKE} strokeWidth={1.4} fill="none">
          {b.stripes && (
            <path d="M92 42 q8 4 16 0 M86 50 q14 5 28 0 M58 64 l8 2 M142 64 l-8 2" stroke={b.stripes} strokeWidth={2.4} />
          )}
          {b.patch && <ellipse cx={100} cy={70} rx={14} ry={8} fill={b.patch} stroke="none" />}
          <circle cx={90} cy={63} r={2.4} fill={b.eye ?? INK} stroke="none" />
          <circle cx={110} cy={63} r={2.4} fill={b.eye ?? INK} stroke="none" />
          {b.eye && <path d="M90 61.5 v3 M110 61.5 v3" strokeWidth={1.2} />}
          <path d="M97 69 L100 72 L103 69" />
          <path d="M80 70 L90 71 M80 74 L90 73 M120 70 L110 71 M120 74 L110 73" stroke={b.whiskers ?? INK} />
        </g>
      );
    case 'shiba':
      return (
        <g>
          <ellipse cx={100} cy={70} rx={15} ry={9} fill={b.patch} />
          <ellipse cx={89} cy={56} rx={3} ry={2} fill={b.patch} />
          <ellipse cx={111} cy={56} rx={3} ry={2} fill={b.patch} />
          <circle cx={90} cy={62} r={2.2} fill={INK} />
          <circle cx={110} cy={62} r={2.2} fill={INK} />
          <ellipse cx={100} cy={67.5} rx={3.4} ry={2.4} fill={INK} />
          <path d="M95 72 q2.5 3 5 0 q2.5 3 5 0" fill="none" {...STROKE} strokeWidth={1.4} />
        </g>
      );
    default:
      return (
        <g>
          <circle cx={90} cy={63} r={2.2} fill={INK} />
          <circle cx={110} cy={63} r={2.2} fill={INK} />
          <ellipse cx={100} cy={71} rx={4} ry={3} fill={INK} />
          <path d="M100 74 L100 77" {...STROKE} strokeWidth={1.4} />
        </g>
      );
  }
}

function Eye({ cx, cy, iris, open, id }) {
  if (open < 0.12) {
    return (
      <g>
        <path d={`M${cx - 12} ${cy + 1} Q ${cx} ${cy + 8} ${cx + 12} ${cy + 1}`} fill="none" {...STROKE} />
        <path d={`M${cx + 9} ${cy + 4} l4 4 M${cx + 4} ${cy + 6} l2 5`} {...STROKE} strokeWidth={1.5} />
      </g>
    );
  }
  const lidY = cy - 14 + (1 - open) * 24;
  return (
    <g>
      <clipPath id={id}>
        <rect x={cx - 16} y={lidY} width={32} height={40} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <ellipse cx={cx} cy={cy} rx={13} ry={14} fill="#fff" />
        <circle cx={cx} cy={cy + 1} r={10} fill={iris} />
        <circle cx={cx} cy={cy + 1} r={5} fill={INK} />
        <circle cx={cx + 4} cy={cy - 3} r={3} fill="#fff" />
        <circle cx={cx - 4} cy={cy + 5} r={1.4} fill="#fff" />
      </g>
      <ellipse cx={cx} cy={cy} rx={13} ry={14} fill="none" {...STROKE} clipPath={`url(#${id})`} />
      <path d={`M${cx - 14} ${lidY + 1} Q ${cx} ${lidY - 3} ${cx + 14} ${lidY + 1}`} fill="none" {...STROKE} strokeWidth={2.6} />
      {open > 0.7 && (
        <path
          d={cx < 100
            ? `M${cx - 12} ${lidY + 3} l-5 -4 M${cx - 8} ${lidY} l-3 -5`
            : `M${cx + 12} ${lidY + 3} l5 -4 M${cx + 8} ${lidY} l3 -5`}
          {...STROKE}
          strokeWidth={1.6}
        />
      )}
    </g>
  );
}

// Knocked-out spiral eye.
function SpiralEye({ cx, cy }) {
  return (
    <path
      d={`M${cx} ${cy} m0 -1 a1.5 1.5 0 1 1 -1.5 1.5 a4 4 0 1 1 4 4 a7 7 0 1 1 -7 -7 a10 10 0 1 1 10 10`}
      fill="none"
      {...STROKE}
      strokeWidth={1.8}
    />
  );
}

// Little bluebirds circling her head.
function Birds() {
  const bird = (angle, color) => (
    <g transform={`rotate(${angle} 100 66) translate(100 8)`}>
      <g transform={`rotate(${-angle}) scale(1.4)`}>
        <ellipse cx={0} cy={0} rx={7} ry={5.5} fill={color} {...STROKE} strokeWidth={1.4} />
        <path d="M-2 -1 q-6 -9 -11 -3 q6 1 7 6" fill={color} {...STROKE} strokeWidth={1.3} />
        <circle cx={3} cy={-1.5} r={1.1} fill={INK} />
        <path d="M6.5 0 l4 1 l-4 1.4" fill="#f2c879" {...STROKE} strokeWidth={1} />
      </g>
    </g>
  );
  return (
    <g>
      <animateTransform attributeName="transform" type="rotate" from="0 100 66" to="360 100 66" dur="1.8s" repeatCount="indefinite" />
      {bird(0, '#9cc3e6')}
      {bird(120, '#f6a5b8')}
      {bird(240, '#f2c879')}
      <path d="M34 60 l2 -5 l2 5 l-5 -3 h6z M162 78 l2 -5 l2 5 l-5 -3 h6z" fill="#f6d36b" {...STROKE} strokeWidth={1} />
    </g>
  );
}

function Flower({ health }) {
  // Stem tip swings from upright (healthy) to drooping (wilted).
  const s = 1 - health;
  const tipX = 146 + s * 18;
  const tipY = 160 + s * 50;
  const petals = Math.max(2, Math.round(5 * (0.35 + 0.65 * health)));
  const petalColor = health > 0.5 ? '#f6a5b8' : '#d9b3bb';
  return (
    <g>
      <path d={`M134 208 Q ${142 + s * 6} ${185 - s * 4} ${tipX} ${tipY}`} fill="none" stroke="#7aa26f" strokeWidth={2.6} strokeLinecap="round" />
      <path d="M138 192 q8 -6 12 -2 q-6 6 -12 2z" fill="#9cc48f" {...STROKE} strokeWidth={1.4} />
      {Array.from({ length: petals }, (_, i) => {
        const a = (i / 5) * Math.PI * 2 + s * 0.9;
        return <circle key={i} cx={tipX + Math.cos(a) * 6.5} cy={tipY + Math.sin(a) * 6.5} r={5.2} fill={petalColor} {...STROKE} strokeWidth={1.4} />;
      })}
      <circle cx={tipX} cy={tipY} r={3.6} fill="#f6d36b" {...STROKE} strokeWidth={1.4} />
      {health < 0.5 && (
        <circle cx={tipX + 6} cy={tipY + 20 + s * 8} r={4.6} fill={petalColor} {...STROKE} strokeWidth={1.2} opacity={0.8} />
      )}
    </g>
  );
}

function Outfit({ kind, color }) {
  if (kind === 'tee') {
    // Baggy cream pants with a tee in the chosen color.
    return (
      <g>
        <path d="M76 198 L100 198 L98 252 L68 252 Q70 224 76 198 Z" fill="#e6d9c6" {...STROKE} />
        <path d="M100 198 L124 198 Q130 224 132 252 L102 252 Z" fill="#e6d9c6" {...STROKE} />
        <path d="M84 236 l2 14 M116 236 l-2 14" stroke={INK} strokeWidth={1} opacity={0.4} />
        <path d="M78 166 Q100 160 122 166 L 126 202 Q100 206 74 202 Z" fill={color} {...STROKE} />
        <path d="M80 168 L68 186 L78 191 L86 176 Z M120 168 L132 186 L122 191 L114 176 Z" fill={color} {...STROKE} strokeWidth={1.8} />
        <path d="M92 166 Q100 172 108 166" fill="none" {...STROKE} strokeWidth={1.4} />
      </g>
    );
  }
  if (kind === 'overalls') {
    return (
      <g>
        <path d="M78 166 Q100 160 122 166 L 124 192 L 76 192 Z" fill="#fbf7f2" {...STROKE} />
        <path d="M80 168 L70 184 L78 188 L86 175 Z M120 168 L130 184 L122 188 L114 175 Z" fill="#fbf7f2" {...STROKE} strokeWidth={1.6} />
        <path d="M84 178 L116 178 L120 202 L80 202 Z" fill={color} {...STROKE} />
        <path d="M74 200 L100 200 L98 250 L70 250 Q71 224 74 200 Z" fill={color} {...STROKE} />
        <path d="M100 200 L126 200 Q129 224 130 250 L102 250 Z" fill={color} {...STROKE} />
        <path d="M86 178 L84 166 M114 178 L116 166" stroke={color} strokeWidth={5} strokeLinecap="round" />
        <circle cx={86} cy={180} r={2.2} fill="#f2c879" {...STROKE} strokeWidth={1} />
        <circle cx={114} cy={180} r={2.2} fill="#f2c879" {...STROKE} strokeWidth={1} />
        <rect x={93} y={186} width={14} height={9} rx={1.5} fill="none" {...STROKE} strokeWidth={1.2} />
        <path d="M71 242 L98 242 M102 242 L129 242" stroke="#fbf7f2" strokeWidth={1.4} strokeDasharray="3 3" />
      </g>
    );
  }
  return (
    <g>
      <path d="M80 166 Q100 160 120 166 L 124 186 L 76 186 Z" fill="#fbf7f2" {...STROKE} />
      <path d="M80 182 L120 182 L142 236 Q100 244 58 236 Z" fill={color} {...STROKE} />
      <path d="M84 182 L86 166 M116 182 L114 166" stroke={color} strokeWidth={5} strokeLinecap="round" />
      <circle cx={100} cy={200} r={6} fill="#f7c9a0" {...STROKE} strokeWidth={1.4} />
      <circle cx={100} cy={200} r={2} fill="#e08f6a" />
      <path d="M70 230 Q100 236 130 230" fill="none" stroke="#fbf7f2" strokeWidth={1.6} strokeDasharray="3 4" />
    </g>
  );
}

// `coy`: hands over her face, used for the private weight button.
// `dazed`: knocked out, with spiral eyes and birds circling her head.
export default function Doll({ doll = DEFAULT_DOLL, health = 1, celebrate = false, coy = false, dazed = false, className }) {
  const d = { ...DEFAULT_DOLL, ...doll };
  const b = BEANIES[d.beanie] ?? BEANIES.panda;
  const h = Math.max(0, Math.min(1, health));
  const s = 1 - h;
  const open = h >= 0.6 ? 1 : h < 0.15 ? 0 : 0.15 + ((h - 0.15) / 0.45) * 0.85;
  const smile = (h - 0.5) * 14;
  const uid = useId().replace(/:/g, '');
  const arms = coy
    ? 'M82 172 Q 66 160 74 132 M118 172 Q 134 160 126 132'
    : 'M82 172 Q 70 192 68 210 M118 172 Q 130 192 134 210';

  return (
    <svg
      viewBox={coy ? '30 14 140 176' : '0 0 200 270'}
      className={className}
      role="img"
      aria-label={coy ? 'Your doll, hiding her face' : `Your doll is ${h > 0.8 ? 'happy' : h > 0.4 ? 'drooping a little' : 'wilting'}`}
      style={{ filter: `saturate(${0.35 + 0.65 * h})` }}
    >
      <defs>
        <filter id="sketch">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" />
          <feDisplacementMap in="SourceGraphic" scale="2.4" />
        </filter>
      </defs>

      {/* ground shadow */}
      <ellipse cx={100} cy={262} rx={58 + s * 6} ry={5} fill={INK} opacity={0.12} />

      <g filter="url(#sketch)" transform={`translate(0 ${s * 6})`}>
        {/* back hair */}
        <path d="M44 100 C 26 160, 30 208, 50 226 L 150 226 C 170 208, 174 160, 156 100 Z" fill={d.hair} {...STROKE} />

        {/* legs + shoes */}
        <path d="M88 232 L88 252 M112 232 L112 252" stroke={INK} strokeWidth={10} strokeLinecap="round" />
        <path d="M88 232 L88 252 M112 232 L112 252" stroke={d.skin} strokeWidth={6.5} strokeLinecap="round" />
        <ellipse cx={85} cy={256} rx={10} ry={5} fill="#3a2e30" {...STROKE} />
        <ellipse cx={115} cy={256} rx={10} ry={5} fill="#3a2e30" {...STROKE} />

        {/* arms (raised to her face when coy) */}
        <path d={arms} stroke={INK} strokeWidth={11} strokeLinecap="round" fill="none" />
        <path d={arms} stroke={d.skin} strokeWidth={7.5} strokeLinecap="round" fill="none" />

        <Outfit kind={d.outfit} color={d.dress} />

        {!coy && <Flower health={h} />}

        {/* head (tilts with sadness) */}
        <g transform={`rotate(${s * 14} 100 162)`}>
          <rect x={94} y={150} width={12} height={18} fill={d.skin} {...STROKE} />
          <ellipse cx={100} cy={106} rx={58} ry={54} fill={d.skin} {...STROKE} />

          {/* side strands */}
          <path d="M44 96 C 38 120, 40 140, 50 156 C 48 130, 52 112, 58 98 Z" fill={d.hair} {...STROKE} strokeWidth={1.8} />
          <path d="M156 96 C 162 120, 160 140, 150 156 C 152 130, 148 112, 142 98 Z" fill={d.hair} {...STROKE} strokeWidth={1.8} />

          {/* bangs */}
          <path
            d="M44 92 Q100 70 156 92 L 154 98 Q146 92 138 100 Q128 90 118 100 Q108 90 100 100 Q92 90 82 100 Q72 90 62 100 Q54 92 46 98 Z"
            fill={d.hair}
            {...STROKE}
          />

          {dazed ? (
            <>
              <SpiralEye cx={78} cy={118} />
              <SpiralEye cx={122} cy={118} />
            </>
          ) : (
            <>
              <Eye cx={78} cy={118} iris={d.eyes} open={open} id={`${uid}l`} />
              <Eye cx={122} cy={118} iris={d.eyes} open={open} id={`${uid}r`} />
            </>
          )}

          <ellipse cx={64} cy={136} rx={9} ry={5} fill="#f4a6b4" opacity={0.2 + 0.5 * h} />
          <ellipse cx={136} cy={136} rx={9} ry={5} fill="#f4a6b4" opacity={0.2 + 0.5 * h} />
          <path d="M99 131 q2 2 0 3" fill="none" {...STROKE} strokeWidth={1.4} />
          {dazed ? (
            <ellipse cx={100} cy={144} rx={4} ry={5} fill="#c9707f" {...STROKE} strokeWidth={1.6} />
          ) : (
            <path d={`M93 ${143 - smile / 3} Q100 ${143 + smile} 107 ${143 - smile / 3}`} fill="none" {...STROKE} />
          )}

          {h < 0.25 && !coy && !dazed && (
            <path d="M70 134 q-3 6 0 8 q3 -2 0 -8z" fill="#9cc3e6" {...STROKE} strokeWidth={1.2} />
          )}

          {coy && (
            <g>
              <ellipse cx={64} cy={136} rx={11} ry={6} fill="#f19bb0" opacity={0.75} />
              <ellipse cx={136} cy={136} rx={11} ry={6} fill="#f19bb0" opacity={0.75} />
              {/* forearms rising from below the chin */}
              <path d="M70 175 L 76 132 M130 175 L 124 132" stroke={INK} strokeWidth={13} strokeLinecap="round" />
              <path d="M70 175 L 76 132 M130 175 L 124 132" stroke={d.skin} strokeWidth={9.5} strokeLinecap="round" />
              {[78, 122].map((cx) => (
                <g key={cx}>
                  {/* four fingers fanned over each eye */}
                  {[-9, -3, 3, 9].map((dx, i) => (
                    <rect
                      key={dx}
                      x={cx + dx - 3.4}
                      y={104 + Math.abs(dx) * 0.5}
                      width={6.8}
                      height={24 - (i === 0 || i === 3 ? 3 : 0)}
                      rx={3.4}
                      fill={d.skin}
                      {...STROKE}
                      strokeWidth={1.6}
                    />
                  ))}
                  <path d={`M${cx - 13} 128 Q${cx} 140 ${cx + 13} 128 L${cx + 12} 122 L${cx - 12} 122 Z`} fill={d.skin} {...STROKE} strokeWidth={1.6} />
                </g>
              ))}
            </g>
          )}

          {/* beanie */}
          <Ears kind={b.ears} b={b} droop={s * 26} />
          <path d="M42 92 C 36 30, 164 30, 158 92 Q100 78 42 92 Z" fill={b.base} {...STROKE} />
          <path d="M42 92 Q100 78 158 92 L 158 98 Q100 84 42 98 Z" fill={b.base} {...STROKE} strokeWidth={1.8} />
          <path d="M60 52 q4 4 0 8 M140 52 q-4 4 0 8" stroke={INK} strokeWidth={1} opacity={0.35} fill="none" />
          <BeanieFace kind={b.face} b={b} />
          {dazed && <Birds />}
        </g>
      </g>

      {celebrate && (
        <g className="hearts" fill="#f19bb0" stroke={INK} strokeWidth={1.2}>
          <path d="M28 70 c-4 -6 -12 -1 -6 5 l6 5 l6 -5 c6 -6 -2 -11 -6 -5z" />
          <path d="M172 54 c-3 -5 -10 -1 -5 4 l5 4 l5 -4 c5 -5 -2 -9 -5 -4z" />
          <path d="M178 150 c-3 -5 -10 -1 -5 4 l5 4 l5 -4 c5 -5 -2 -9 -5 -4z" />
          <path d="M22 160 l3 -8 l3 8 l-8 -5 h10z" fill="#f6d36b" />
        </g>
      )}
    </svg>
  );
}
