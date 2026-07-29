// math.js — the educational core. Generates one arithmetic quest at a time.
//
// This module is to Phi Công Toán Học what telex.js is to Anh Hùng Bàn Phím:
// the highest-risk file in the game, and the one with its own test suite
// (math.test.js). Treat every change here as needing a test case FIRST.
//
// TWO AXES OF DIFFICULTY, and keeping them separate is the whole design:
//   * LEVEL  — chosen by the kid on the title screen. Sets the KIND of
//              arithmetic (which operators, how big the numbers get).
//   * TIER   — 1..12, set per stage by stages.js. Sets how hard WITHIN a level.
// So Hard-tier-1 and Hard-tier-12 are both "times tables and ±", but they are
// nowhere near the same workout. A single axis would have forced the choice
// between "the whole game is one difficulty" and "the kid's own choice gets
// overridden by stage progression"; both are worse.
//
// THE QUEST CONTRACT (asserted exhaustively by math.test.js over every
// (level, tier, ops) combination that stages.js actually references):
//   1. Exactly ONE option equals the answer.
//   2. No duplicate options.
//   3. The answer is a non-negative integer. Subtraction is always ordered
//      (a >= b) and division is always exact — a kid at this age has not met
//      negatives or fractions, and a quest they cannot express is a bug.
//   4. Every distractor is also a non-negative integer, and plausible in
//      magnitude (never a 3-digit decoy for a 1-digit answer).
//   5. Distractors are PEDAGOGICAL, not random — see makeDistractors below.
//
// Determinism: every entry point takes an optional seed, so a failing case
// found by the test suite can be replayed exactly. quests.js passes a counter.

// ---------------------------------------------------------------------------
// Seeded RNG (mulberry32). Small, fast, good enough, and reproducible — the
// same reason effects.js in the typing game avoids raw Math.random().
// ---------------------------------------------------------------------------

export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1)); // inclusive
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// ---------------------------------------------------------------------------
// Levels. Each is a ladder of 12 tiers; a tier describes the SHAPE of the
// quest, and the shape functions below build the actual numbers.
//
// Shapes:
//   add / sub / mul / div      — plain two-operand
//   addNoCarry / addCarry      — controlled carrying (the real skill in ±100)
//   subBorrow                  — controlled borrowing
//   missing                    — a + _ = c  (inverse thinking; same arithmetic)
//   three                      — a + b + c  (chained, sustains attention)
//   twoStep                    — a + b × c  (operator precedence)
//   parenStep                  — (a + b) × c
// ---------------------------------------------------------------------------

export const LEVELS = {
  easy: {
    id: 'easy',
    name: 'Dễ',
    desc: 'Cộng/trừ trong phạm vi 10', // "Add/subtract within 10"
    ops: ['add', 'sub'],
    max: 10,
    tiers: [
      // max 6, not 5: at 5 this tier can only produce TEN distinct sums (1+1 .. 2+3)
      // while stage 1 asks TWELVE, so a kid saw every possible question and then
      // repeats — drilling recall of ten facts instead of addition. See the pool note
      // above LEVELS. 6 yields 15, which clears the ask and the no-repeat WINDOW.
      { shapes: ['add'], max: 6 },
      { shapes: ['add'], max: 10 },
      { shapes: ['add', 'sub'], max: 10 },
      { shapes: ['sub'], max: 10 },
      { shapes: ['add', 'sub'], max: 10 },
      { shapes: ['add', 'sub', 'missing'], max: 10 },
      { shapes: ['sub', 'missing'], max: 10 },
      { shapes: ['add', 'sub', 'missing'], max: 10 },
      { shapes: ['missing', 'three'], max: 10 },
      { shapes: ['add', 'sub', 'three'], max: 10 },
      { shapes: ['missing', 'three'], max: 10 },
      { shapes: ['add', 'sub', 'missing', 'three'], max: 10 },
    ],
  },

  normal: {
    id: 'normal',
    name: 'Thường',
    desc: 'Cộng/trừ trong phạm vi 100', // "Add/subtract within 100"
    ops: ['add', 'sub'],
    max: 100,
    tiers: [
      // max 70, not 50: round-tens within 50 is only TEN distinct sums against
      // stage 1's twelve asks. 70 gives 21 and stays plainly gentler than tier 2's
      // full 100, so the tier-to-tier step is preserved.
      { shapes: ['addNoCarry'], max: 70, round: true },
      { shapes: ['addNoCarry'], max: 100, round: true },
      { shapes: ['addNoCarry'], max: 100 },
      { shapes: ['addNoCarry', 'sub'], max: 100 },
      { shapes: ['addCarry'], max: 100 },
      { shapes: ['addCarry', 'sub'], max: 100 },
      { shapes: ['addCarry', 'subBorrow'], max: 100 },
      { shapes: ['addCarry', 'subBorrow', 'missing'], max: 100 },
      { shapes: ['subBorrow', 'missing'], max: 100 },
      { shapes: ['addCarry', 'subBorrow', 'three'], max: 100 },
      { shapes: ['subBorrow', 'missing', 'three'], max: 100 },
      { shapes: ['addCarry', 'subBorrow', 'missing', 'three'], max: 100 },
    ],
  },

  hard: {
    id: 'hard',
    name: 'Khó',
    desc: 'Cộng trừ kết hợp nhân chia bảng cửu chương', // "± plus the times tables"
    ops: ['add', 'sub', 'mul', 'div'],
    max: 100,
    tiers: [
      // table 6, not 5: 2..5 x 2..5 is only SIXTEEN facts against stages 1-2 asking
      // twelve and thirteen. Six gives 25 and still excludes the 7/8/9 rows that
      // tiers 4+ introduce.
      { shapes: ['mul'], table: 6 },
      { shapes: ['mul'], table: 6 },
      { shapes: ['mul', 'div'], table: 5 },
      { shapes: ['mul', 'div'], table: 7 },
      { shapes: ['mul', 'div', 'addCarry'], table: 7, max: 100 },
      { shapes: ['mul', 'div'], table: 9 },
      { shapes: ['mul', 'div', 'subBorrow'], table: 9, max: 100 },
      { shapes: ['mul', 'div', 'missing'], table: 9, max: 100 },
      { shapes: ['twoStep'], table: 9, max: 100 },
      { shapes: ['mul', 'div', 'twoStep'], table: 9, max: 100 },
      { shapes: ['twoStep', 'missing'], table: 9, max: 100 },
      { shapes: ['mul', 'div', 'twoStep', 'three'], table: 9, max: 100 },
    ],
  },

  hardest: {
    id: 'hardest',
    name: 'Siêu Khó',
    desc: 'Tổng hợp cộng trừ nhân chia trong phạm vi 1000', // "All four ops within 1000"
    ops: ['add', 'sub', 'mul', 'div'],
    max: 1000,
    tiers: [
      { shapes: ['addNoCarry'], max: 1000, round: true },
      { shapes: ['addCarry', 'sub'], max: 1000, round: true },
      { shapes: ['addCarry', 'subBorrow'], max: 1000 },
      { shapes: ['mul'], max: 1000, table: 9, bigMul: true },
      { shapes: ['mul', 'div'], max: 1000, table: 9, bigMul: true },
      { shapes: ['addCarry', 'subBorrow', 'mul'], max: 1000, table: 9, bigMul: true },
      { shapes: ['mul', 'div', 'missing'], max: 1000, table: 9, bigMul: true },
      { shapes: ['twoStep'], max: 1000, table: 9, bigMul: true },
      { shapes: ['twoStep', 'subBorrow'], max: 1000, table: 9, bigMul: true },
      { shapes: ['parenStep'], max: 1000, table: 9, bigMul: true },
      { shapes: ['twoStep', 'parenStep', 'missing'], max: 1000, table: 9, bigMul: true },
      { shapes: ['parenStep', 'twoStep', 'three', 'div'], max: 1000, table: 9, bigMul: true },
    ],
  },
};

export const LEVEL_IDS = ['easy', 'normal', 'hard', 'hardest'];
export const TIER_COUNT = 12;

// ---------------------------------------------------------------------------
// Shape builders. Each returns {text, answer, ops} — `text` is what the kid
// reads, `answer` the integer, `ops` the operator names used (so a stage that
// restricts opsAllowed can be honored and verified).
//
// Every builder must satisfy contract rules 3 and 4 by construction; the test
// suite checks them anyway, because "by construction" is exactly the kind of
// claim that quietly stops being true when a tier table gets edited.
// ---------------------------------------------------------------------------

const SHAPE_OPS = {
  add: ['add'], addNoCarry: ['add'], addCarry: ['add'],
  sub: ['sub'], subBorrow: ['sub'],
  mul: ['mul'], div: ['div'],
  missing: ['add'], three: ['add'],
  twoStep: ['add', 'mul'], parenStep: ['add', 'mul'],
};

// Which shapes are legal given a stage's opsAllowed list.
function shapeAllowed(shape, opsAllowed) {
  if (!opsAllowed) return true;
  return SHAPE_OPS[shape].every((op) => opsAllowed.includes(op));
}

function buildAdd(rng, t, carry) {
  const max = t.max || 10;
  // Round-tens mode (tier 1-2 of the bigger levels): 20+30, 120+300.
  if (t.round) {
    const unit = max > 100 ? 100 : 10;
    const slots = Math.floor(max / unit);
    const a = randInt(rng, 1, Math.max(1, slots - 1)) * unit;
    const b = randInt(rng, 1, Math.max(1, slots - Math.floor(a / unit))) * unit;
    return { text: `${a} + ${b}`, answer: a + b, ops: ['add'] };
  }
  for (let tries = 0; tries < 40; tries++) {
    const a = randInt(rng, 1, max - 1);
    const b = randInt(rng, 1, max - a);
    if (carry === undefined) return { text: `${a} + ${b}`, answer: a + b, ops: ['add'] };
    // Does adding the ones digits cross ten? That is the skill being drilled.
    const crosses = (a % 10) + (b % 10) >= 10;
    if (crosses === carry) return { text: `${a} + ${b}`, answer: a + b, ops: ['add'] };
  }
  const a = Math.floor(max / 2), b = Math.floor(max / 3);
  return { text: `${a} + ${b}`, answer: a + b, ops: ['add'] };
}

function buildSub(rng, t, borrow) {
  const max = t.max || 10;
  if (t.round) {
    const unit = max > 100 ? 100 : 10;
    const slots = Math.floor(max / unit);
    const a = randInt(rng, 2, slots) * unit;
    const b = randInt(rng, 1, a / unit - 1) * unit;
    return { text: `${a} − ${b}`, answer: a - b, ops: ['sub'] };
  }
  for (let tries = 0; tries < 40; tries++) {
    const a = randInt(rng, 2, max);
    const b = randInt(rng, 1, a - 1); // ordered: never negative
    if (borrow === undefined) return { text: `${a} − ${b}`, answer: a - b, ops: ['sub'] };
    const needs = (a % 10) < (b % 10);
    if (needs === borrow) return { text: `${a} − ${b}`, answer: a - b, ops: ['sub'] };
  }
  const a = max, b = Math.floor(max / 3);
  return { text: `${a} − ${b}`, answer: a - b, ops: ['sub'] };
}

function buildMul(rng, t) {
  const table = t.table || 9;
  const a = randInt(rng, 2, table);
  // bigMul (Hardest) allows a 2-digit multiplicand: 18 × 5, capped by max.
  let b = randInt(rng, 2, table);
  if (t.bigMul && rng() < 0.5) {
    const cap = Math.floor((t.max || 1000) / a);
    b = randInt(rng, 10, Math.max(10, Math.min(99, cap)));
  }
  return { text: `${a} × ${b}`, answer: a * b, ops: ['mul'] };
}

function buildDiv(rng, t) {
  // Built backwards from a product so division is ALWAYS exact.
  const table = t.table || 9;
  const b = randInt(rng, 2, table);
  let q = randInt(rng, 2, table);
  if (t.bigMul && rng() < 0.4) {
    const cap = Math.floor((t.max || 1000) / b);
    q = randInt(rng, 10, Math.max(10, Math.min(99, cap)));
  }
  return { text: `${b * q} ÷ ${b}`, answer: q, ops: ['div'] };
}

// a + _ = c. Inverse thinking on identical arithmetic — cheap difficulty that
// teaches something rather than just making the numbers uglier.
//
// This shape has TWO forms (additive and multiplicative), so unlike the other
// builders it has to honor opsAllowed itself: a stage that says "± only" must
// not be handed "8 × ? = 24" just because its tier sits on a times-table rung.
// SHAPE_OPS declares `missing` as ['add'], which is the conservative floor;
// the × form is only reachable when 'mul' is explicitly allowed.
function buildMissing(rng, t, opsAllowed) {
  const max = t.max || 10;
  const mulOk = !opsAllowed || opsAllowed.includes('mul');
  if (t.table && mulOk && rng() < 0.5) {
    const a = randInt(rng, 2, t.table);
    const q = randInt(rng, 2, t.table);
    return { text: `${a} × ? = ${a * q}`, answer: q, ops: ['mul'] };
  }
  const total = randInt(rng, 3, max);
  const known = randInt(rng, 1, total - 1);
  return { text: `${known} + ? = ${total}`, answer: total - known, ops: ['add'] };
}

// The `− c` branch is only taken when 'sub' is allowed, for the same reason as
// buildMissing: SHAPE_OPS declares `three` as ['add'], so the subtractive form
// must be opt-in rather than a surprise.
function buildThree(rng, t, opsAllowed) {
  const max = t.max || 10;
  const subOk = !opsAllowed || opsAllowed.includes('sub');
  const a = randInt(rng, 1, Math.max(1, Math.floor(max / 3)));
  const b = randInt(rng, 1, Math.max(1, Math.floor(max / 3)));
  const c = randInt(rng, 1, Math.max(1, max - a - b));
  if (subOk && rng() < 0.4 && a + b > c) {
    return { text: `${a} + ${b} − ${c}`, answer: a + b - c, ops: ['add', 'sub'] };
  }
  return { text: `${a} + ${b} + ${c}`, answer: a + b + c, ops: ['add'] };
}

// a + b × c — operator precedence. The × part is kept inside the times tables
// so the hard part is the ORDER, not the multiplication.
function buildTwoStep(rng, t, opsAllowed) {
  const table = t.table || 9;
  const max = t.max || 100;
  const subOk = !opsAllowed || opsAllowed.includes('sub');
  const b = randInt(rng, 2, table);
  const c = randInt(rng, 2, table);
  const prod = b * c;
  if (subOk && rng() < 0.5 && prod > 2) {
    const a = randInt(rng, 1, Math.max(1, prod - 1));
    return { text: `${b} × ${c} − ${a}`, answer: prod - a, ops: ['mul', 'sub'] };
  }
  const a = randInt(rng, 1, Math.max(1, max - prod));
  return { text: `${a} + ${b} × ${c}`, answer: a + prod, ops: ['add', 'mul'] };
}

// (a + b) × c — explicit parentheses, the top of the Hardest ladder.
function buildParenStep(rng, t) {
  const max = t.max || 1000;
  const c = randInt(rng, 2, Math.min(9, t.table || 9));
  const sumCap = Math.max(2, Math.floor(max / c));
  const a = randInt(rng, 1, Math.max(1, sumCap - 1));
  const b = randInt(rng, 1, Math.max(1, sumCap - a));
  return { text: `(${a} + ${b}) × ${c}`, answer: (a + b) * c, ops: ['add', 'mul'] };
}

// Every builder takes (rng, tier, opsAllowed). Most ignore the third argument
// because their shape maps to exactly one operator set; the multi-form shapes
// (missing / three / twoStep) use it to pick a form the stage actually permits.
const BUILDERS = {
  add: (rng, t) => buildAdd(rng, t, undefined),
  addNoCarry: (rng, t) => buildAdd(rng, t, false),
  addCarry: (rng, t) => buildAdd(rng, t, true),
  sub: (rng, t) => buildSub(rng, t, undefined),
  subBorrow: (rng, t) => buildSub(rng, t, true),
  mul: (rng, t) => buildMul(rng, t),
  div: (rng, t) => buildDiv(rng, t),
  missing: buildMissing,
  three: buildThree,
  twoStep: buildTwoStep,
  parenStep: (rng, t) => buildParenStep(rng, t),
};

// ---------------------------------------------------------------------------
// Distractors — the part that decides whether the game teaches arithmetic or
// teaches magnitude-guessing.
//
// RANDOM decoys are worse than useless: if the answer to 7 × 8 sits among
// {56, 3, 91, 40}, a kid can pick it by feel without multiplying. So every
// decoy is a REAL mistake a child makes on THIS problem:
//   * off-by-one / off-by-two   (miscounting)
//   * off-by-ten                (a dropped or forgotten carry)
//   * the other operator's result (7+8=15 offered against 7×8)
//   * an adjacent times-table row (7×8 → 7×7, 7×9)
//   * digit transposition       (56 → 65)
// Each decoy must be a non-negative integer, distinct, and plausible in
// magnitude — a 3-digit decoy next to a 1-digit answer is a giveaway.
// ---------------------------------------------------------------------------

// A decoy must be a number the kid could believe. `cap` is the hard ceiling
// for this quest's level — a decoy above it breaks the promise the level's own
// label makes ("phạm vi 10" must not show 90), and is an instant giveaway
// besides. This cap is why cross-operator decoys are gated rather than free:
// offering a×b against "9 + 1" produced 90 on an Easy quest, which the test
// suite caught immediately.
function plausible(value, answer, cap) {
  if (!Number.isInteger(value) || value < 0) return false;
  if (value === answer) return false;
  if (cap !== undefined && value > cap) return false;

  // MAGNITUDE BAND — both directions. A decoy must live in the same numeric
  // neighborhood as the answer, or it is visibly not an answer and shrinks the
  // real choice from four options to three.
  //
  // Guarding only the upper side was not enough: "800 + 100 = 900" was offering
  // 90, and "7 × 8 = 56" was offering 1. Both are instantly dismissable, which
  // is the same failure as an implausibly large decoy — found by reading
  // math-preview.html, not by the contract tests.
  // A proportional band rather than a digit-count one: digit counts are too
  // blunt near powers of ten (an answer of 100 has no 3-digit values below it,
  // so a digit rule would reject every smaller decoy and break the straddle).
  if (answer >= 10) {
    if (value < answer * 0.4) return false;
    if (value > answer * 2.5) return false;
    if (value === 0) return false; // a lone 0 reads as "not an answer"
  } else {
    // SMALL ANSWERS NEED THE BAND TOO, and this gap was a real defect.
    //
    // The band above only engaged at answers >= 10, on the reasoning that tiny
    // answers have too little room for a proportional rule. But DIVISION answers are
    // usually small, and makeDistractors offers "the other operator's result" — so
    // "16 ÷ 4 = 4" was offering 64 (4 x 16) and "15 ÷ 5 = 3" was offering 75.
    // Measured: ONE IN THREE division quests had a decoy >= 4x the next-largest
    // option, which a kid discards without doing any arithmetic. That is the same
    // "7 x 8 = 56 offering 1" defect in mirror image, and it turned a four-option
    // question into a three-option one a third of the time.
    //
    // An absolute window rather than a proportional one, because at an answer of 2 a
    // 2.5x band would allow only 1..5 and there are not enough candidates in that
    // range to fill three slots. +8 leaves room for off-by-ten and adjacent-row
    // decoys while excluding the product of the operands.
    if (value > answer + 8) return false;
  }
  const digits = (n) => String(n).length;
  if (digits(value) > digits(answer) + 1) return false;
  return true;
}

export function makeDistractors(rng, quest, count, cap) {
  const { answer, text } = quest;
  const nums = (text.match(/\d+/g) || []).map(Number);
  const cands = [];
  const push = (v) => { if (plausible(v, answer, cap) && !cands.includes(v)) cands.push(v); };

  // Off-by-small — miscounting.
  push(answer + 1); push(answer - 1); push(answer + 2); push(answer - 2);

  // Off-by-ten — the classic dropped carry. Only where a tens digit exists.
  if (answer >= 10) { push(answer + 10); push(answer - 10); }
  if (answer >= 100) { push(answer + 100); push(answer - 100); }

  // The other operator applied to the same operands — the single most
  // instructive decoy, because picking it means the kid misread the sign.
  //
  // GATED BY WHAT THE QUEST ACTUALLY ASKS. A product decoy only makes sense
  // when the kid is thinking multiplicatively; on "47 + 28" the product 1316
  // is not a mistake a child makes, it is just a big wrong number, and it
  // blows past the level's ceiling.
  if (nums.length >= 2) {
    const [a, b] = nums;
    const additive = quest.ops.includes('add') || quest.ops.includes('sub');
    const multiplicative = quest.ops.includes('mul') || quest.ops.includes('div');
    if (additive) { push(a + b); push(Math.abs(a - b)); }
    if (multiplicative) {
      push(a * b);
      if (b !== 0 && a % b === 0) push(a / b);
      // Sign confusion the other way: on a × quest, the sum IS a real mistake.
      push(a + b); push(Math.abs(a - b));
    }
  }

  // Adjacent times-table rows, for × and ÷ quests.
  if (quest.ops.includes('mul') && nums.length >= 2) {
    const [a, b] = nums;
    push(a * (b + 1)); push(a * (b - 1)); push((a + 1) * b); push((a - 1) * b);
  }

  // Digit transposition — 56 read back as 65.
  if (answer >= 10) {
    const s = String(answer);
    const swapped = Number(s[1] + s[0] + s.slice(2));
    push(swapped);
  }

  // Shuffle candidates (seeded) so the same few decoys don't always win.
  for (let i = cands.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cands[i], cands[j]] = [cands[j], cands[i]];
  }

  // STRADDLE THE ANSWER. A decoy set sitting entirely on one side of the answer
  // leaks it: on "9 + 1 = 10" with {10, 11, 12, 1}, the answer is the smallest
  // credible sum and a kid can pick it without adding. So when candidates exist
  // both below and above, take at least one from each side before filling the
  // rest. (Found by reading real output on math-preview.html — the contract
  // tests pass either way, which is exactly why the preview page exists.)
  const below = cands.filter((v) => v < answer);
  const above = cands.filter((v) => v > answer);
  const out = [];
  if (count >= 2 && below.length && above.length) {
    out.push(below[0], above[0]);
  }
  for (const v of cands) {
    if (out.length >= count) break;
    if (!out.includes(v)) out.push(v);
  }

  // Backstop: pad from a widening neighborhood if the shapes above did not
  // yield enough distinct plausible decoys (small answers like 2 are tight).
  let step = 3;
  while (out.length < count && step < 2000) {
    for (const v of [answer + step, answer - step]) {
      if (out.length < count && plausible(v, answer, cap) && !out.includes(v)) out.push(v);
    }
    step++;
  }
  // Last resort: a very small answer under a very tight cap (answer 1, cap 10)
  // can genuinely run out of plausible neighbors. Relax the cap rather than
  // return short — a short option list would break the "exactly 4" contract.
  let extra = 1;
  while (out.length < count && extra < 5000) {
    const v = answer + extra;
    if (v !== answer && !out.includes(v) && Number.isInteger(v) && v >= 0) out.push(v);
    extra++;
  }
  return out;
}

// ---------------------------------------------------------------------------
// The public entry point.
//
// Returns { text, answer, options[], correctIndex, ops, level, tier, key }.
// `key` identifies the quest for the no-repeat sliding window in quests.js.
// ---------------------------------------------------------------------------

export function generateQuest(levelId, tier, opsAllowed = null, seed = 1, answerCount = 4,
                              opts = {}) {
  const level = LEVELS[levelId];
  if (!level) throw new Error(`unknown level: ${levelId}`);
  const t = level.tiers[Math.max(0, Math.min(TIER_COUNT - 1, tier - 1))];
  const rng = makeRng(seed);

  // Honor the stage's opsAllowed narrowing; fall back to the tier's own shapes
  // if a stage restricts everything away (verify.js flags that as a data bug,
  // but the game must still hand the kid a solvable quest).
  const legal = t.shapes.filter((s) => shapeAllowed(s, opsAllowed));
  const shapes = legal.length ? legal : t.shapes;

  // Shape selection is PLUGGABLE, defaulting to a uniform pick.
  //
  // adaptive.js passes a selector that biases toward the shapes the kid is getting
  // wrong. It is deliberately confined to REORDERING THIS LIST: the tier, the
  // operand ranges and the ceiling are untouched, so every quest served was already
  // legal for this stage and balance.js's playability proof still holds (it models
  // accuracy as a fixed profile percentage and never generates a quest, so it is
  // indifferent to WHICH of a tier's legal shapes appears).
  //
  // Anything that returns a shape outside `shapes` is ignored rather than trusted —
  // a selector bug must not be able to serve a kid arithmetic their level forbids.
  let shape;
  if (typeof opts.selectShape === 'function') {
    const chosen = opts.selectShape(shapes, rng);
    shape = shapes.includes(chosen) ? chosen : pick(rng, shapes);
  } else {
    shape = pick(rng, shapes);
  }

  const quest = BUILDERS[shape](rng, t, opsAllowed);

  // Decoys are capped by the LEVEL's advertised ceiling, STRICTLY. The label is a
  // promise to the parent as much as the kid: on "phạm vi 10" a decoy of 15 breaks
  // it, and on "phạm vi 1000" so does 1100.
  //
  // This used to be `level.max * 1.2` for levels >= 100, to let off-by-ten
  // near-misses exist at the very top of the range (99 + 10 = 109). The reasoning
  // held for Normal and broke down at scale: the same 20% became 1200 on Hardest,
  // and measured over 3600 quests per level it was offering options above the cap in
  // 431 (normal, worst 119), 73 (hard, worst 120) and 288 (hardest, worst 1200)
  // cases. A kid on a level labelled "trong phạm vi 1000" should never be shown
  // 1100 as a candidate answer.
  //
  // The cost is explicit and accepted: when the answer IS the cap (700 + 300 = 1000)
  // there is no legal value above it, so those quests get decoys only from below and
  // the straddle property relaxes. makeDistractors already degrades that way rather
  // than failing, and math.test.js encodes the exemption.
  const cap = level.max;
  const decoys = makeDistractors(rng, quest, answerCount - 1, cap);

  // Place the answer at a seeded position — never a fixed slot, or a kid
  // learns the slot instead of the arithmetic.
  const options = decoys.slice();
  const correctIndex = Math.floor(rng() * answerCount);
  options.splice(correctIndex, 0, quest.answer);

  return {
    text: quest.text,
    answer: quest.answer,
    options,
    correctIndex,
    ops: quest.ops,
    shape,
    level: levelId,
    tier,
    key: quest.text,
  };
}
