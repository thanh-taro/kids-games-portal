// math.test.js — the quest contract, enforced exhaustively.
//
//   node js/math.test.js
//
// This is to math.js what telex.test.js is to telex.js in the typing game: the
// only thing standing between a hand-authored curriculum and a kid being shown
// an unsolvable or gameable problem. Those failures are INVISIBLE in code
// review — "7 × 8" with options {56, 3, 91, 40} looks fine on the page and is
// broken in practice, because the kid picks 56 by magnitude without
// multiplying.
//
// It sweeps every (level, tier) pair with many seeds and asserts the full
// contract from math.js, plus the anti-gaming properties that motivate the
// pedagogical distractors.
//
// Run this after ANY edit to math.js, and add a case BEFORE changing a builder
// or the distractor logic.

import {
  LEVELS, LEVEL_IDS, TIER_COUNT, generateQuest, makeRng, makeDistractors,
} from './math.js';

let passed = 0;
let failed = 0;
const failures = [];

function ok(cond, msg) {
  if (cond) { passed++; return true; }
  failed++;
  failures.push(msg);
  return false;
}

// Evaluate a quest's own text independently of the generator, so we are not
// just trusting the builder that produced `answer`. Handles the shapes we emit:
//   "a + b", "a − b", "a × b", "a ÷ b", "a + b × c", "(a + b) × c",
//   "a + b + c", "a + b − c", "k + ? = t", "a × ? = p"
function evalQuestText(text, claimedAnswer) {
  // Missing-operand forms: solve for ?.
  let m = text.match(/^(\d+) \+ \? = (\d+)$/);
  if (m) return Number(m[2]) - Number(m[1]);
  m = text.match(/^(\d+) × \? = (\d+)$/);
  if (m) {
    const a = Number(m[1]), p = Number(m[2]);
    return p % a === 0 ? p / a : NaN;
  }
  // Straight expressions: normalize the unicode operators and evaluate with
  // correct precedence via a tiny shunting-yard-free two-pass.
  const norm = text.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
  if (!/^[\d\s()+\-*/]+$/.test(norm)) return NaN;
  // eslint-disable-next-line no-new-func
  const val = Function(`"use strict"; return (${norm});`)();
  void claimedAnswer;
  return val;
}

// ---------------------------------------------------------------------------
// 1. The core contract, swept across every level × tier × many seeds.
// ---------------------------------------------------------------------------

const SEEDS_PER_TIER = 400;

for (const levelId of LEVEL_IDS) {
  const level = LEVELS[levelId];

  for (let tier = 1; tier <= TIER_COUNT; tier++) {
    let maxSeen = 0;
    const shapesSeen = new Set();

    for (let s = 1; s <= SEEDS_PER_TIER; s++) {
      const q = generateQuest(levelId, tier, null, s * 7919 + tier * 31 + levelId.length);
      const where = `${levelId} t${tier} seed${s}: "${q.text}" -> ${q.answer} opts ${JSON.stringify(q.options)}`;
      shapesSeen.add(q.shape);

      // (1) exactly one option equals the answer
      const hits = q.options.filter((o) => o === q.answer).length;
      if (!ok(hits === 1, `${where} — expected exactly 1 correct option, got ${hits}`)) continue;

      // correctIndex must actually point at it
      ok(q.options[q.correctIndex] === q.answer,
        `${where} — correctIndex ${q.correctIndex} does not point at the answer`);

      // (2) no duplicate options
      ok(new Set(q.options).size === q.options.length, `${where} — duplicate options`);

      // option count as requested
      ok(q.options.length === 4, `${where} — expected 4 options, got ${q.options.length}`);

      // (3) answer is a non-negative integer
      ok(Number.isInteger(q.answer) && q.answer >= 0,
        `${where} — answer must be a non-negative integer`);

      // (4) every option is a non-negative integer
      ok(q.options.every((o) => Number.isInteger(o) && o >= 0),
        `${where} — every option must be a non-negative integer`);

      // the text really does evaluate to the claimed answer
      const truth = evalQuestText(q.text, q.answer);
      ok(truth === q.answer,
        `${where} — text evaluates to ${truth}, not the claimed ${q.answer}`);

      // magnitude plausibility: no decoy more than one digit longer
      const digits = (n) => String(n).length;
      ok(q.options.every((o) => digits(o) <= digits(q.answer) + 1),
        `${where} — an option is implausibly large next to the answer`);

      maxSeen = Math.max(maxSeen, q.answer, ...q.options);
    }

    // The level's advertised ceiling must hold. This is the check that catches
    // a tier table edit quietly pushing "within 100" up into the hundreds.
    // STRICTLY the advertised max, with no tolerance.
    //
    // This was `level.max * 1.2 + 20`, and the tolerance is exactly why a real defect
    // shipped: on Hardest it permitted options up to 1220, so the generator offered
    // 1100 and 1200 as candidate answers on a level whose own label promises "trong
    // phạm vi 1000". Measured before the fix: 288 of 3600 hardest quests, worst 1200.
    // A test written around the behaviour instead of the promise cannot catch the
    // promise being broken.
    ok(maxSeen <= level.max,
      `${levelId} t${tier} — saw ${maxSeen}, above the advertised cap ${level.max}`);

    // Every shape the tier declares should actually be reachable; an
    // unreachable shape means a typo in the tier table.
    const declared = new Set(level.tiers[tier - 1].shapes);
    for (const sh of declared) {
      ok(shapesSeen.has(sh),
        `${levelId} t${tier} — declared shape "${sh}" never generated in ${SEEDS_PER_TIER} seeds`);
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Level ceilings are what the Vietnamese labels promise.
//
// The labels are a contract with the parent as much as the kid: "phạm vi 10"
// must mean nothing over 10 ever appears in the QUESTION.
// ---------------------------------------------------------------------------

{
  const operandCeilings = { easy: 10, normal: 100, hard: 100, hardest: 1000 };
  for (const levelId of LEVEL_IDS) {
    const cap = operandCeilings[levelId];
    let worst = 0, worstText = '';
    for (let tier = 1; tier <= TIER_COUNT; tier++) {
      for (let s = 1; s <= 250; s++) {
        const q = generateQuest(levelId, tier, null, s * 104729 + tier);
        for (const n of (q.text.match(/\d+/g) || []).map(Number)) {
          if (n > worst) { worst = n; worstText = `${levelId} t${tier}: ${q.text}`; }
        }
      }
    }
    ok(worst <= cap, `${levelId} — a question showed the number ${worst} above its advertised cap ${cap} (${worstText})`);
  }
}

// ---------------------------------------------------------------------------
// 3. Easy really is easy: within-10 means the ANSWER stays within 10 too.
// ---------------------------------------------------------------------------

for (let tier = 1; tier <= TIER_COUNT; tier++) {
  for (let s = 1; s <= 300; s++) {
    const q = generateQuest('easy', tier, null, s * 31337 + tier);
    ok(q.answer <= 10, `easy t${tier} seed${s} — answer ${q.answer} exceeds 10 ("${q.text}")`);
  }
}

// ---------------------------------------------------------------------------
// 4. Division is always exact; subtraction never goes negative.
//    Checked on the raw text across every level that can produce them.
// ---------------------------------------------------------------------------

for (const levelId of LEVEL_IDS) {
  for (let tier = 1; tier <= TIER_COUNT; tier++) {
    for (let s = 1; s <= 200; s++) {
      const q = generateQuest(levelId, tier, null, s * 6151 + tier * 17);
      const div = q.text.match(/(\d+) ÷ (\d+)/);
      if (div) {
        const a = Number(div[1]), b = Number(div[2]);
        ok(b !== 0, `${levelId} t${tier} — division by zero in "${q.text}"`);
        ok(a % b === 0, `${levelId} t${tier} — inexact division "${q.text}"`);
      }
      const sub = q.text.match(/^(\d+) − (\d+)$/);
      if (sub) {
        ok(Number(sub[1]) >= Number(sub[2]),
          `${levelId} t${tier} — subtraction goes negative in "${q.text}"`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Anti-gaming: the answer must NOT be findable by magnitude alone.
//
// This is the property that random distractors violate and the whole reason
// makeDistractors exists. Across a big sample, the answer must not be
// predominantly the largest option, nor predominantly the closest-to-the-mean
// option — either would let a kid score without doing arithmetic.
// ---------------------------------------------------------------------------

for (const levelId of LEVEL_IDS) {
  let isMax = 0, isMin = 0, n = 0;
  for (let tier = 1; tier <= TIER_COUNT; tier++) {
    for (let s = 1; s <= 200; s++) {
      const q = generateQuest(levelId, tier, null, s * 15485863 + tier);
      const mx = Math.max(...q.options), mn = Math.min(...q.options);
      if (q.answer === mx) isMax++;
      if (q.answer === mn) isMin++;
      n++;
    }
  }
  // With 4 options, chance is 25%. Allow generous slack (up to 45%) but catch
  // a generator that has drifted into "the answer is always the big one".
  ok(isMax / n < 0.45, `${levelId} — answer is the largest option ${(100 * isMax / n).toFixed(1)}% of the time (gameable)`);
  ok(isMin / n < 0.45, `${levelId} — answer is the smallest option ${(100 * isMin / n).toFixed(1)}% of the time (gameable)`);
}

// The correct answer must be spread across all four slots, or a kid learns the
// slot instead of the arithmetic.
{
  const slots = [0, 0, 0, 0];
  for (let s = 1; s <= 4000; s++) {
    const q = generateQuest('normal', 6, null, s * 2654435761);
    slots[q.correctIndex]++;
  }
  const total = slots.reduce((a, b) => a + b, 0);
  for (let i = 0; i < 4; i++) {
    const frac = slots[i] / total;
    ok(frac > 0.15 && frac < 0.35,
      `answer slot ${i} used ${(100 * frac).toFixed(1)}% of the time — expected ~25%`);
  }
}

// ---------------------------------------------------------------------------
// 5b. Options must STRADDLE the answer whenever the range allows.
//
// A set of decoys all on one side of the answer leaks it. The case that
// motivated this: "9 + 1 = 10" offered {10, 11, 1, 12} — the answer is the
// smallest credible sum, pickable without adding. Every contract test above
// passed on that quest, which is why this property is checked separately.
//
// Exception: answers at the very edge of a level's range genuinely have no
// room on one side (answer 10 on a cap of 10 has nothing above), so the
// assertion is that a one-sided set is RARE, not impossible.
// ---------------------------------------------------------------------------

for (const levelId of LEVEL_IDS) {
  let oneSided = 0, n = 0, worst = '';
  for (let tier = 1; tier <= TIER_COUNT; tier++) {
    for (let s = 1; s <= 250; s++) {
      const q = generateQuest(levelId, tier, null, s * 22221 + tier * 7);
      const decoys = q.options.filter((o) => o !== q.answer);
      const below = decoys.filter((o) => o < q.answer).length;
      const above = decoys.filter((o) => o > q.answer).length;
      n++;
      if (below === 0 || above === 0) {
        oneSided++;
        if (!worst) worst = `${levelId} t${tier}: "${q.text}" = ${q.answer}, opts ${JSON.stringify(q.options)}`;
      }
    }
  }
  const frac = oneSided / n;
  ok(frac < 0.12,
    `${levelId} — ${(100 * frac).toFixed(1)}% of quests have all decoys on one side of the answer (leaks it). e.g. ${worst}`);
}

// 5c. Decoys must be in the answer's MAGNITUDE BAND, both directions.
//
// A decoy far below the answer is as dismissable as one far above, and shrinks
// a four-way choice to a three-way one. The cases that motivated this:
// "800 + 100 = 900" offering 90, and "7 × 8 = 56" offering 1.
for (const levelId of LEVEL_IDS) {
  for (let tier = 1; tier <= TIER_COUNT; tier++) {
    for (let s = 1; s <= 200; s++) {
      const q = generateQuest(levelId, tier, null, s * 7717 + tier * 3);
      if (q.answer < 10) continue; // tiny answers have no room for a band
      for (const o of q.options) {
        if (o === q.answer) continue;
        ok(o >= q.answer * 0.4 && o <= q.answer * 2.5,
          `${levelId} t${tier} — decoy ${o} is outside the magnitude band of answer ${q.answer} ("${q.text}")`);
      }
    }
  }
}

// The level's advertised ceiling must hold for OPTIONS too, not just questions.
// "phạm vi 10" showing a decoy of 15 breaks the promise the label makes.
for (const levelId of LEVEL_IDS) {
  // No headroom: the label is a promise. See the note on the ceiling check above.
  const cap = LEVELS[levelId].max;
  for (let tier = 1; tier <= TIER_COUNT; tier++) {
    for (let s = 1; s <= 200; s++) {
      const q = generateQuest(levelId, tier, null, s * 3571 + tier * 13);
      const over = q.options.filter((o) => o > cap);
      ok(over.length === 0,
        `${levelId} t${tier} — option(s) ${JSON.stringify(over)} exceed the level cap ${cap} ("${q.text}")`);
    }
  }
}

// 5d. A quest's text carries AT MOST ONE equals sign.
//
// The `missing` shapes ("3 + ? = 12") embed their own "= n", while plain
// expressions do not — and questbox.js appends " = ?" to the latter. A shape that
// emitted two would render as "1 + ? = 4 = ?", which is what shipped once. This
// asserts the property at the source so the display rule stays simple.
for (const levelId of LEVEL_IDS) {
  for (let tier = 1; tier <= TIER_COUNT; tier++) {
    for (let s = 1; s <= 150; s++) {
      const q = generateQuest(levelId, tier, null, s * 5171 + tier * 11);
      const eqs = (q.text.match(/=/g) || []).length;
      ok(eqs <= 1,
        `${levelId} t${tier}: "${q.text}" has ${eqs} equals signs — at most 1`);
      // And a '?' only ever appears in the missing-operand forms, which are
      // exactly the ones that carry an '='.
      if (q.text.includes('?')) {
        ok(eqs === 1, `${levelId} t${tier}: "${q.text}" has a '?' but no '='`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 6. Distractors are pedagogical: for a × quest, at least one decoy should be
//    a "real mistake" — an adjacent times-table row or the additive confusion.
// ---------------------------------------------------------------------------

{
  let instructive = 0, mulSeen = 0;
  for (let s = 1; s <= 1500; s++) {
    const q = generateQuest('hard', 6, ['mul'], s * 40503);
    const nums = (q.text.match(/\d+/g) || []).map(Number);
    if (!q.ops.includes('mul') || nums.length < 2) continue;
    const [a, b] = nums;
    mulSeen++;
    const meaningful = new Set([
      a + b, Math.abs(a - b), a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b,
      q.answer + 1, q.answer - 1, q.answer + 10, q.answer - 10,
    ]);
    if (q.options.some((o) => o !== q.answer && meaningful.has(o))) instructive++;
  }
  ok(mulSeen > 100, `expected a healthy sample of × quests, saw ${mulSeen}`);
  ok(instructive / mulSeen > 0.9,
    `only ${(100 * instructive / mulSeen).toFixed(1)}% of × quests offered an instructive decoy (want >90%)`);
}

// ---------------------------------------------------------------------------
// 7. opsAllowed narrowing is honored — a stage that says "no division yet"
//    must never be handed a division quest.
// ---------------------------------------------------------------------------

{
  const combos = [
    ['hard', ['add', 'sub']],
    ['hard', ['mul']],
    ['hardest', ['add', 'sub']],
    ['hardest', ['add', 'sub', 'mul']],
    ['normal', ['add']],
  ];
  for (const [levelId, ops] of combos) {
    for (let tier = 1; tier <= TIER_COUNT; tier++) {
      for (let s = 1; s <= 120; s++) {
        const q = generateQuest(levelId, tier, ops, s * 65537 + tier);
        // A tier whose every shape is filtered out falls back to its own
        // shapes by design (verify.js flags that as a data bug). Only assert
        // when the narrowing was satisfiable.
        const satisfiable = LEVELS[levelId].tiers[tier - 1].shapes.some((sh) => {
          const need = { add: ['add'], addNoCarry: ['add'], addCarry: ['add'], sub: ['sub'],
            subBorrow: ['sub'], mul: ['mul'], div: ['div'], missing: ['add'], three: ['add'],
            twoStep: ['add', 'mul'], parenStep: ['add', 'mul'] }[sh];
          return need.every((o) => ops.includes(o));
        });
        if (!satisfiable) continue;
        ok(q.ops.every((o) => ops.includes(o)),
          `${levelId} t${tier} with ops ${JSON.stringify(ops)} produced "${q.text}" using ${JSON.stringify(q.ops)}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 8. Determinism — the same seed must reproduce the same quest exactly, or a
//    failure found here cannot be replayed.
// ---------------------------------------------------------------------------

for (const levelId of LEVEL_IDS) {
  for (let tier = 1; tier <= TIER_COUNT; tier += 3) {
    const a = generateQuest(levelId, tier, null, 12345);
    const b = generateQuest(levelId, tier, null, 12345);
    ok(JSON.stringify(a) === JSON.stringify(b),
      `${levelId} t${tier} — generateQuest is not deterministic for a fixed seed`);
  }
}

// makeRng itself
{
  const r1 = makeRng(99), r2 = makeRng(99);
  const s1 = [r1(), r1(), r1()], s2 = [r2(), r2(), r2()];
  ok(JSON.stringify(s1) === JSON.stringify(s2), 'makeRng is not deterministic');
  ok(s1.every((v) => v >= 0 && v < 1), 'makeRng produced a value outside [0,1)');
}

// makeDistractors honors its count and never returns the answer
{
  const rng = makeRng(7);
  for (const answer of [0, 1, 2, 5, 9, 10, 17, 56, 100, 342, 1000]) {
    for (const count of [3, 5]) {
      const d = makeDistractors(rng, { answer, text: `${answer} + 0`, ops: ['add'] }, count);
      ok(d.length === count, `makeDistractors(answer=${answer}, count=${count}) returned ${d.length}`);
      ok(!d.includes(answer), `makeDistractors(answer=${answer}) included the answer`);
      ok(new Set(d).size === d.length, `makeDistractors(answer=${answer}) returned duplicates`);
      ok(d.every((v) => Number.isInteger(v) && v >= 0),
        `makeDistractors(answer=${answer}) returned a negative or non-integer`);
    }
  }
}

// ---------------------------------------------------------------------------
// 9. Tier ramp sanity: within a level, late tiers must be genuinely harder
//    than early ones. Measured as mean answer magnitude + shape complexity,
//    which is crude but catches a tier table pasted in the wrong order.
// ---------------------------------------------------------------------------

for (const levelId of LEVEL_IDS) {
  const complexity = (q) => {
    const opCount = (q.text.match(/[+−×÷]/g) || []).length;
    const hasParen = q.text.includes('(') ? 1 : 0;
    const hasMissing = q.text.includes('?') ? 1 : 0;
    return opCount + hasParen + hasMissing;
  };
  const sample = (tier) => {
    let c = 0, n = 0;
    for (let s = 1; s <= 300; s++) {
      const q = generateQuest(levelId, tier, null, s * 999983 + tier);
      c += complexity(q); n++;
    }
    return c / n;
  };
  const early = (sample(1) + sample(2)) / 2;
  const late = (sample(11) + sample(12)) / 2;
  ok(late > early,
    `${levelId} — late tiers (complexity ${late.toFixed(2)}) are not harder than early tiers (${early.toFixed(2)})`);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const DIM = '\x1b[2m', RED = '\x1b[31m', GREEN = '\x1b[32m', RESET = '\x1b[0m';

if (failed === 0) {
  console.log(`${GREEN}✓ math.test.js — ${passed} assertions passed${RESET}`);
  console.log(`${DIM}  ${LEVEL_IDS.length} levels × ${TIER_COUNT} tiers swept${RESET}`);
} else {
  console.log(`${RED}✗ math.test.js — ${failed} failed, ${passed} passed${RESET}`);
  const shown = failures.slice(0, 25);
  for (const f of shown) console.log(`  ${RED}·${RESET} ${f}`);
  if (failures.length > shown.length) {
    console.log(`${DIM}  ... and ${failures.length - shown.length} more${RESET}`);
  }
  process.exit(1);
}
