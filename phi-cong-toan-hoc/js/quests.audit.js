// quests.audit.js — a QUALITY audit of generated quests, as opposed to a contract test.
//
// WHY THIS EXISTS, AND HOW IT DIFFERS FROM math.test.js.
//
// math.test.js asserts the CONTRACT: one correct option, no duplicates, integers,
// exact division, ordered subtraction, the level ceiling, the straddle, determinism.
// Every one of those is a hard yes/no, and it passes.
//
// It still shipped two real defects, because a contract cannot see a GIVEAWAY:
//   * "800 + 100 = 900" offering 90   — legal, and instantly dismissable
//   * "7 x 8 = 56" offering 1         — legal, and instantly dismissable
// Both were found by a human reading math-preview.html. The project note says so
// explicitly: "READ THE QUESTS. The tests cannot see a giveaway."
//
// A third slipped past for the same reason and was found the same way: on Hardest
// ("trong phạm vi 1000") the generator was offering 1100 and 1200 as candidate
// answers, because the ceiling check in the test allowed a 20% overshoot — the test
// had been written around the behaviour instead of the promise.
//
// So this file measures the things that are matters of DEGREE rather than of law, and
// reports them as a table a human can scan. It is a REPORT, not a gate: most findings
// are judgement calls, and a threshold that fails the build would either be too loose
// to matter or would block legitimate content.
//
//   node js/quests.audit.js               # every level, every tier
//   node js/quests.audit.js hardest       # one level, all tiers, with samples
//   node js/quests.audit.js hard 12       # one level+tier, print every sampled quest
//   node js/quests.audit.js --strict      # exit 1 if any HARD finding appears
//
// The --strict flag exists for CI: HARD findings are the ones that are defects by any
// reading (an option above the level's advertised cap, a duplicate option, an
// unreachable answer). SOFT findings are advisory.

import { generateQuest, LEVELS, LEVEL_IDS, TIER_COUNT } from './math.js';

const SAMPLES = 400;          // quests per (level, tier) — enough to surface 1-in-100s
const args = process.argv.slice(2);
const strict = args.includes('--strict');
// --strict is the CI role, so it prints a one-line summary instead of the full table:
// npm test runs four tools and a 60-line report per tool buries the actual result.
// Findings are still printed when there ARE any.
const quiet = strict && !args.includes('--verbose');
const positional = args.filter((a) => !a.startsWith('--'));
const onlyLevel = positional[0];
const onlyTier = positional[1] ? Number(positional[1]) : null;

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// ---------------------------------------------------------------------------
// The checks. Each takes a generated quest plus its level, and returns a finding
// string or null. `hard: true` means "a defect by any reading".
// ---------------------------------------------------------------------------

const CHECKS = [
  {
    id: 'over-cap',
    hard: true,
    // The level's Vietnamese label is a promise to the parent as much as the kid.
    // "trong phạm vi 1000" must never show 1100 as a candidate answer.
    test: (q, lvl) => {
      const over = q.options.filter((o) => o > lvl.max);
      return over.length ? `option(s) ${over.join(',')} exceed cap ${lvl.max}` : null;
    },
  },
  {
    id: 'dup-option',
    hard: true,
    test: (q) => (new Set(q.options).size !== q.options.length
      ? `duplicate options ${JSON.stringify(q.options)}` : null),
  },
  {
    id: 'answer-missing',
    hard: true,
    test: (q) => (q.options[q.correctIndex] !== q.answer
      ? `correctIndex ${q.correctIndex} does not hold the answer ${q.answer}` : null),
  },
  {
    id: 'negative',
    hard: true,
    test: (q) => {
      const bad = q.options.filter((o) => !Number.isInteger(o) || o < 0);
      return bad.length ? `non-natural option(s) ${bad.join(',')}` : null;
    },
  },
  {
    id: 'giveaway-lone-small',
    hard: false,
    // THE "7 x 8 = 56 offering 1" DEFECT. If exactly one option is far below all the
    // others, a kid can discard it without arithmetic, and a 4-option question
    // quietly becomes a 3-option one.
    test: (q) => {
      if (q.answer < 20) return null;
      const sorted = [...q.options].sort((a, b) => a - b);
      const [lo, next] = sorted;
      return (lo > 0 && next / Math.max(1, lo) >= 4)
        ? `outlier-low option ${lo} against ${sorted.slice(1).join(',')}` : null;
    },
  },
  {
    id: 'giveaway-lone-large',
    hard: false,
    // The mirror case: one option far above the rest is equally dismissable.
    test: (q) => {
      const sorted = [...q.options].sort((a, b) => a - b);
      const hi = sorted[sorted.length - 1];
      const prev = sorted[sorted.length - 2];
      return (prev > 0 && hi / prev >= 4)
        ? `outlier-high option ${hi} against ${sorted.slice(0, -1).join(',')}` : null;
    },
  },
  {
    id: 'straddle-relaxed',
    hard: false,
    // Expected and accepted when the answer IS the cap: there is no legal value above
    // it, so decoys can only come from below. Anywhere else it means the kid can rule
    // out a direction, so it is worth seeing the count.
    test: (q, lvl) => {
      const above = q.options.some((o) => o > q.answer);
      const below = q.options.some((o) => o < q.answer);
      if (above && below) return null;
      if (q.answer === lvl.max && !above) return null;     // the accepted exemption
      return `no ${above ? 'lower' : 'higher'} decoy for answer ${q.answer}`;
    },
  },
  {
    id: 'tier-too-easy',
    hard: false,
    // A high tier emitting a genuinely trivial quest.
    //
    // MEASURE WORK, NOT OPERAND SIZE. The first version of this check flagged any
    // quest whose largest operand was <= 12 and reported 680 findings — but
    // "9 + 9 x 9 = 90" needs operator precedence and "(9 + 8) x 3" is two operations.
    // Small operands are not the same as easy, and a check that conflates them buries
    // the real signal in noise.
    //
    // So: only SINGLE-OPERATION shapes can be trivial, and only when both operands are
    // small. A one-step times-table fact at tier 10+ of a level that reaches 1000 is
    // worth a human look; a two-step expression never is.
    test: (q, lvl, tier) => {
      if (tier < 10 || lvl.max < 1000) return null;
      const ONE_STEP = new Set(['mul', 'div', 'add', 'sub', 'addCarry', 'addNoCarry', 'subBorrow']);
      if (!ONE_STEP.has(q.shape)) return null;
      const nums = (q.text.match(/\d+/g) || []).map(Number);
      return (Math.max(...nums, 0) <= 12)
        ? `tier ${tier} of a 1000-cap level, but "${q.text}" is one small step (${q.shape})` : null;
    },
  },
  {
    id: 'text-two-equals',
    hard: true,
    // The "1 + ? = 4 = ?" memorial: `missing` shapes carry their own '=', so anything
    // appending " = ?" doubles it. Guard the source rather than the label builder.
    test: (q) => ((q.text.match(/=/g) || []).length > 1
      ? `quest text has more than one '=': "${q.text}"` : null),
  },
  {
    id: 'answer-in-text',
    hard: false,
    // If the answer appears verbatim as an operand, some kids pattern-match instead
    // of computing ("9 x 1 = 9"). Low-value at tier 1, worth knowing at high tiers.
    test: (q, lvl, tier) => {
      if (tier < 6) return null;
      const nums = (q.text.match(/\d+/g) || []).map(Number);
      return nums.includes(q.answer) ? `answer ${q.answer} appears as an operand` : null;
    },
  },
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

function auditTier(levelId, tier, collectSamples) {
  const lvl = LEVELS[levelId];
  const findings = new Map();     // check id -> {count, examples[]}
  const shapes = new Map();
  const answers = [];
  const samples = [];

  for (let s = 1; s <= SAMPLES; s++) {
    const q = generateQuest(levelId, tier, null, s * 7919 + tier * 131, 4);
    shapes.set(q.shape, (shapes.get(q.shape) || 0) + 1);
    answers.push(q.answer);
    if (collectSamples && samples.length < 40) {
      samples.push(`${q.text} = ${q.answer}   [${q.options.join(', ')}]`);
    }
    for (const c of CHECKS) {
      const hit = c.test(q, lvl, tier);
      if (!hit) continue;
      if (!findings.has(c.id)) findings.set(c.id, { count: 0, hard: c.hard, examples: [] });
      const f = findings.get(c.id);
      f.count++;
      if (f.examples.length < 3) f.examples.push(`"${q.text}" -> ${hit}`);
    }
  }

  answers.sort((a, b) => a - b);
  return {
    findings, shapes, samples,
    median: answers[Math.floor(answers.length / 2)],
    min: answers[0], max: answers[answers.length - 1],
  };
}

let hardTotal = 0;
let softTotal = 0;

const levels = onlyLevel ? [onlyLevel] : LEVEL_IDS;
for (const levelId of levels) {
  if (!LEVELS[levelId]) {
    console.error(`unknown level: ${levelId} (expected one of ${LEVEL_IDS.join(', ')})`);
    process.exit(1);
  }
  const lvl = LEVELS[levelId];
  if (!quiet) {
    console.log('');
    console.log(C.bold(`##### ${levelId.toUpperCase()}  — ${lvl.desc}   (cap ${lvl.max})`));
    console.log(C.dim(`      ${SAMPLES} quests per tier`));
    console.log('');
    console.log(C.dim('  tier  answers(min/med/max)  shapes                        findings'));
  }

  const tiers = onlyTier ? [onlyTier] : Array.from({ length: TIER_COUNT }, (_, i) => i + 1);
  for (const tier of tiers) {
    const r = auditTier(levelId, tier, !!onlyTier);
    const shapeStr = [...r.shapes.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([s, n]) => `${s}:${Math.round(100 * n / SAMPLES)}%`)
      .join(' ');
    const parts = [];
    for (const [id, f] of r.findings) {
      if (f.hard) { hardTotal += f.count; parts.push(C.red(`${id}x${f.count}`)); }
      else { softTotal += f.count; parts.push(C.yellow(`${id}x${f.count}`)); }
    }
    if (!quiet) {
      console.log('  ' + String(tier).padStart(4) +
        '  ' + `${r.min}/${r.median}/${r.max}`.padEnd(22) +
        shapeStr.padEnd(30) + (parts.join(' ') || C.green('clean')));
      for (const [, f] of r.findings) {
        for (const ex of f.examples) console.log(C.dim('          ' + ex));
      }
    } else {
      // In quiet mode surface only HARD findings — the ones that fail the build.
      for (const [id, f] of r.findings) {
        if (!f.hard) continue;
        console.log(C.red(`  ✗ ${levelId} t${tier} — ${id} x${f.count}`));
        for (const ex of f.examples) console.log(C.dim('      ' + ex));
      }
    }
    if (onlyTier) {
      console.log('');
      r.samples.forEach((s) => console.log('        ' + s));
    }
  }
}

if (quiet) {
  const n = SAMPLES * TIER_COUNT * levels.length;
  if (hardTotal === 0) {
    console.log(C.green(`✓ quests.audit.js — ${n} quests, 0 hard findings`) +
      C.dim(`  (${softTotal} advisory — npm run audit to read them)`));
  } else {
    console.log(C.red(`✗ quests.audit.js — ${hardTotal} HARD finding(s) across ${n} quests`));
  }
  if (strict && hardTotal > 0) process.exit(1);
  process.exit(0);
}

console.log('');
if (hardTotal === 0 && softTotal === 0) {
  console.log(C.green('✓ no findings'));
} else {
  console.log(`${hardTotal ? C.red(`${hardTotal} HARD`) : C.green('0 HARD')}` +
    ` · ${softTotal ? C.yellow(`${softTotal} soft`) : '0 soft'} finding(s)`);
  console.log(C.dim('  HARD  = a defect by any reading (over-cap, duplicate, bad answer index)'));
  console.log(C.dim('  soft  = advisory; read the examples and judge (giveaways, tier fit)'));
  console.log(C.dim('  Then READ the quests: node js/quests.audit.js <level> <tier>'));
}

if (strict && hardTotal > 0) process.exit(1);
