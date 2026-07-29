// formations.js — how a wave's monsterships are arranged as they descend.
//
// A formation is a pure function of (count, index) returning a normalized
// offset {fx, fy} where fx is a fraction of the play width (0..1, 0.5 = center)
// and fy is a spawn-delay row offset in "rows above the entry line". main.js
// turns those into real coordinates and spawn times.
//
// Keeping formations as data + one small generator (rather than hand-placed
// coordinates per wave) is what makes a stage a BLUEPRINT: verify.js can read
// a wave's {formation, count} and compute how long it will take to arrive,
// which is how the "long enough for minQuests" guarantee is checked.
//
// The play field is VERTICAL, so these are horizontal spreads that descend.

// Each generator: (i, count) -> {fx, fy}
//   fx: 0..1 across the play width
//   fy: row offset; 0 arrives first, larger arrives later
const GENERATORS = {
  // A flat rank sweeping down together. The reading-friendly baseline.
  LINE: (i, n) => ({ fx: spread(i, n, 0.72), fy: 0 }),

  // A wedge, point-first. Reads as "leader + followers".
  V: (i, n) => {
    const mid = (n - 1) / 2;
    const d = Math.abs(i - mid);
    return { fx: spread(i, n, 0.76), fy: d * 0.55 };
  },

  // A shallow bowl — the inverse of V, edges lead.
  ARC: (i, n) => {
    const mid = (n - 1) / 2;
    const d = Math.abs(i - mid);
    return { fx: spread(i, n, 0.8), fy: (mid - d) * 0.5 };
  },

  // Vertical files: pairs stacked deep. Sustains pressure longer than LINE
  // for the same enemy count, which is what late stages need.
  COLUMNS: (i, n) => {
    const files = Math.min(4, Math.max(2, Math.round(n / 3)));
    const col = i % files;
    const row = Math.floor(i / files);
    return { fx: spread(col, files, 0.6), fy: row * 1.0 };
  },

  // A rhombus — one lead, a wide middle, one trailer.
  DIAMOND: (i, n) => {
    const mid = (n - 1) / 2;
    const d = Math.abs(i - mid);
    return { fx: 0.5 + (i - mid) * (0.62 / Math.max(1, n)), fy: d * 0.7 };
  },

  // A filled block. Heaviest-looking formation; used sparingly.
  GRID: (i, n) => {
    const cols = Math.min(5, Math.max(2, Math.ceil(Math.sqrt(n))));
    const col = i % cols;
    const row = Math.floor(i / cols);
    return { fx: spread(col, cols, 0.7), fy: row * 0.85 };
  },

  // A rotating ring — each enemy enters at a different angle around a circle.
  SPIRAL: (i, n) => {
    const a = (i / n) * Math.PI * 2;
    return { fx: 0.5 + Math.cos(a) * 0.3, fy: (1 + Math.sin(a)) * 0.6 };
  },

  // Split high/low down the two flanks, leaving the center empty — the shape
  // that most obviously wants the kid to keep firing straight up.
  FLANK: (i, n) => {
    const half = Math.ceil(n / 2);
    const side = i < half ? 0 : 1;
    const k = side === 0 ? i : i - half;
    const cnt = side === 0 ? half : n - half;
    const fx = side === 0 ? 0.12 + spread(k, cnt, 0.22) * 0.5 : 0.66 + spread(k, cnt, 0.22) * 0.5;
    return { fx: Math.min(0.94, Math.max(0.06, fx)), fy: k * 0.6 };
  },

  // Loose jitter, seeded by index so it is organic but reproducible — the same
  // reason effects.js avoids raw Math.random() at construction time.
  SWARM: (i, n) => {
    const h = hash(i * 2654435761);
    const h2 = hash(i * 40503 + 7);
    return { fx: 0.1 + h * 0.8, fy: h2 * (n * 0.35) };
  },

  // A single ship holding position. Bosses and elites.
  BOSS: () => ({ fx: 0.5, fy: 0 }),
};

// Evenly place index i of n across a band of `width` centered on 0.5.
function spread(i, n, width) {
  if (n <= 1) return 0.5;
  return 0.5 - width / 2 + (i / (n - 1)) * width;
}

// Deterministic 0..1 from an integer.
function hash(x) {
  let t = (x ^ 0x9e3779b9) >>> 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const FORMATION_NAMES = Object.keys(GENERATORS);

// Resolve a whole wave's slots at once.
// Returns [{fx, fy, delay}] where delay is seconds after the wave starts.
//   gap: seconds between successive "rows" of the formation
export function resolveFormation(name, count, gap = 0.5) {
  const gen = GENERATORS[name] || GENERATORS.LINE;
  const out = [];
  for (let i = 0; i < count; i++) {
    const { fx, fy } = gen(i, count);
    out.push({
      fx: Math.min(0.95, Math.max(0.05, fx)),
      fy,
      delay: fy * gap,
    });
  }
  return out;
}

// How long (seconds) until this wave's LAST ship has entered. verify.js uses
// this to prove a stage runs long enough for its minQuests quota.
export function formationSpan(name, count, gap = 0.5) {
  const slots = resolveFormation(name, count, gap);
  return slots.reduce((mx, s) => Math.max(mx, s.delay), 0);
}
