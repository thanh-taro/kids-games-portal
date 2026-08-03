// adaptive.js — per-shape mastery tracking, and the quest-selection bias it drives.
//
// THE PROBLEM THIS SOLVES. The game already knows every answer the kid has ever
// given, and threw all of it away except two counters (totalCorrect/totalWrong). So a
// child who is fluent at addition and lost on division saw exactly the same mix as a
// child in the reverse position: `stages.js` sets one tier per stage, the kid picks a
// level once, and nothing else influences what gets asked. A fixed ladder teaches the
// AVERAGE kid. This is the difference between a game that drills and one that tutors.
//
// WHAT IT DOES. Tracks accuracy per quest SHAPE (add, sub, mul, div, missing, three,
// twoStep, parenStep...) and biases selection toward the shapes the kid is getting
// wrong, within the tier the stage already chose.
//
// ===========================================================================
// WHY THIS CANNOT MAKE A STAGE UNBEATABLE — the constraint that shaped the design.
//
// balance.js proves all 24 stages are beatable by three kid profiles, and it does so
// by modelling accuracy as a FIXED profile percentage (slow 65%, typical 80%, fast
// 92%). It never calls generateQuest() at all — tier is reported, not simulated. So
// the gate's guarantee is "beatable at 65% accuracy REGARDLESS of which quests
// appear".
//
// That is exactly the property this module must not break. So the bias:
//
//   * NEVER CHANGES THE TIER. Difficulty stays where stages.js put it, which is what
//     verify.js's non-decreasing-tier assertion and the whole balance table rest on.
//   * ONLY REORDERS SHAPES *WITHIN* the tier's own declared shape list. Every quest
//     served was already legal for that stage; the kid just sees more of what they
//     need. A shape the tier does not list can never appear.
//   * IS CAPPED. A struggling shape is at most WEIGHT_MAX times as likely as a
//     mastered one, so a kid who is bad at one thing still sees the others. Without
//     the cap a single weak shape would crowd out everything and the stage would stop
//     being the stage it was authored as.
//   * NEVER MAKES A SHAPE IMPOSSIBLE. Every listed shape keeps a floor weight, so a
//     mastered shape still recurs for retention.
//
// Net effect on the gate: the number of quests asked, the time per quest and the tier
// are all untouched, so every number balance.js simulates is unchanged. What changes
// is only WHICH of the tier's shapes gets picked — and the tier's shapes were all
// equally legal before.
// ===========================================================================
//
// A CONSCIOUS PEDAGOGICAL CHOICE: this biases toward WEAKNESS, not away from it. The
// opposite (serve what they are good at) would feel nicer and teach nothing. But the
// cap above is what keeps it from being punishing — a kid who cannot do division still
// spends most of their time on things they can do, with division appearing more often
// than chance rather than relentlessly.

// How much more likely the weakest shape can be than a fully mastered one.
// 3x is enough to visibly shift the mix without letting one shape dominate: at three
// shapes in a tier, a fully-failed shape gets ~60% of draws rather than ~33%.
const WEIGHT_MAX = 3;

// Every shape keeps at least this share of the base weight, so nothing vanishes.
const WEIGHT_FLOOR = 1;

// Answers needed on a shape before its accuracy is trusted. Below this the shape is
// treated as neutral: acting on a 1-of-1 sample would swing the mix on a single
// unlucky answer, which reads as the game randomly picking on the kid.
const MIN_SAMPLE = 4;

// Recency: the running accuracy is an exponential moving average, so IMPROVEMENT
// SHOWS UP. A plain lifetime ratio means a kid who was bad at division in week one
// keeps being served division in week four no matter how good they get — the tracker
// has to be able to forget. 0.2 gives a half-life of ~3 answers, so a few good ones
// visibly move it.
const EMA_ALPHA = 0.2;

// ---------------------------------------------------------------------------
// The record. Plain data so it can live in localStorage next to the rest of
// progress, and so verify.js can construct one without a browser.
//
// Shape of `mastery`: { [shapeId]: { n, acc } }
//   n   — answers seen for this shape (for the MIN_SAMPLE gate)
//   acc — exponential moving average of correctness, 0..1
// ---------------------------------------------------------------------------

export function emptyMastery() {
  return {};
}

// Record one answer. Returns the updated record (mutates in place, and returns it so
// callers can persist the result in one expression).
export function recordAnswer(mastery, shape, wasCorrect) {
  if (!shape) return mastery;
  const cur = mastery[shape] || { n: 0, acc: 1 };
  const hit = wasCorrect ? 1 : 0;
  // Seed the average with the first observation rather than dragging it up from the
  // optimistic default, or a kid's first wrong answer barely registers.
  const acc = cur.n === 0 ? hit : cur.acc + (hit - cur.acc) * EMA_ALPHA;
  mastery[shape] = { n: cur.n + 1, acc: Math.max(0, Math.min(1, acc)) };
  return mastery;
}

// A shape's selection weight. Mastered -> WEIGHT_FLOOR; fully failed -> WEIGHT_MAX.
// Untrusted (too few samples) -> neutral, halfway up the range.
export function weightFor(mastery, shape) {
  const rec = mastery[shape];
  if (!rec || rec.n < MIN_SAMPLE) return (WEIGHT_FLOOR + WEIGHT_MAX) / 2;
  // Linear in the miss rate: acc 1 -> floor, acc 0 -> max.
  return WEIGHT_FLOOR + (WEIGHT_MAX - WEIGHT_FLOOR) * (1 - rec.acc);
}

// Pick one shape from the tier's OWN list, biased toward weakness.
//
// `rng` is passed in (never Math.random) so a stage replays identically for a given
// seed — the same determinism requirement math.js has, for the same reason.
export function pickShape(mastery, shapes, rng) {
  if (!shapes || !shapes.length) return null;
  if (shapes.length === 1) return shapes[0];
  const weights = shapes.map((s) => weightFor(mastery, s));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < shapes.length; i++) {
    r -= weights[i];
    if (r <= 0) return shapes[i];
  }
  return shapes[shapes.length - 1];
}

// ---------------------------------------------------------------------------
// Reporting — for the parent/teacher view and for __debug.
// ---------------------------------------------------------------------------

// Human-readable Vietnamese names for the shapes, so a report is readable by a parent
// rather than by a programmer.
export const SHAPE_NAMES = {
  add: 'Phép cộng',
  addNoCarry: 'Cộng không nhớ',
  addCarry: 'Cộng có nhớ',
  sub: 'Phép trừ',
  subBorrow: 'Trừ có nhớ',
  mul: 'Phép nhân',
  div: 'Phép chia',
  missing: 'Tìm số còn thiếu',
  three: 'Cộng ba số',
  twoStep: 'Hai bước',
  parenStep: 'Có dấu ngoặc',
};

// Shapes sorted weakest-first, with only trusted entries. This is what a parent
// actually wants: "what should we practise next".
export function weakestFirst(mastery) {
  return Object.entries(mastery)
    .filter(([, r]) => r.n >= MIN_SAMPLE)
    .map(([shape, r]) => ({
      shape,
      name: SHAPE_NAMES[shape] || shape,
      n: r.n,
      acc: r.acc,
      pct: Math.round(r.acc * 100),
    }))
    .sort((a, b) => a.acc - b.acc);
}

export const TUNING = { WEIGHT_MAX, WEIGHT_FLOOR, MIN_SAMPLE, EMA_ALPHA };
