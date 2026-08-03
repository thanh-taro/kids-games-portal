---
name: game-quest-work
description: Change quest generation, difficulty tiers, or answer distractors in Phi Công Toán Học (js/math.js, quests.js). Use when adding a quest shape, retuning a level or tier ladder, changing how wrong answers are chosen, or debugging a quest that reads badly.
---

# Quest generation — the educational core

`js/math.js` is the part of this game that actually teaches. Everything else is a
delivery mechanism for it. It is guarded by **~201,000 assertions** in
`js/math.test.js`, and that suite is a **contract, not a smoke test** — if a change
fails it, the change is wrong until proven otherwise.

```bash
node js/math.test.js          # the CONTRACT — what is legal
npm run audit                 # the QUALITY report — what is good
node js/quests.audit.js hardest 12   # one level+tier, 40 real quests printed
open math-preview.html        # every level x tier, sampled — READ THE QUESTS
```

`quests.audit.js` exists because the contract passes while giveaways ship. **HARD**
findings (over-cap, duplicate, bad answer index) fail `npm test` via `--strict`;
**soft** ones are judgement calls — read the examples, don't chase the count to zero.
Two lessons from building it, both of which apply to any new check:

- **Measure work, not size.** A first version flagged every high-tier quest whose
  largest operand was ≤ 12 and produced 680 findings — but `9 + 9 × 9` needs operator
  precedence and `(9 + 8) × 3` is two operations. It now flags only single-operation
  shapes, and the noise went to ~0.
- **A tolerance in a test is how a defect ships.** The ceiling check allowed
  `max * 1.2 + 20`, so Hardest offered **1100 and 1200** on a level labelled "trong
  phạm vi 1000" — 288 of 3600 quests. The test had been written around the behaviour
  rather than the promise. Now strict, with the one accepted cost (no decoy above an
  answer that IS the cap) encoded as an explicit exemption.

## Two axes, and do not conflate them

- **LEVEL** sets the *kind* of arithmetic and the hard ceiling. Four of them:
  `easy` (±within 10), `normal` (±within 100), `hard` (± plus times tables),
  `hardest` (all four ops within 1000).
- **TIER** (1–12) sets *how hard within that level*. Each level owns a ladder of 12
  tier entries — `{ shapes: [...], max, round? }`.

So Hard-tier-1 and Hard-tier-12 are very different workouts inside the same level.
`stages.js` picks the tier per stage; **`quest.tier` must be non-decreasing across all
24 stages** (asserted).

Adding difficulty means editing a tier's `shapes`/`max`, not widening the level.

## The entry point

```js
generateQuest(levelId, tier, opsAllowed = null, seed = 1, answerCount = 4)
// -> { text, answer, options[], correctIndex, shape, ... }
```

**Deterministic for a given seed** (asserted). Never call `Math.random()` in here —
use the `makeRng(seed)` stream, or the same stage replays differently and the test
suite cannot pin anything down.

Shapes are built by `buildAdd/buildSub/buildMul/buildDiv/buildMissing/buildThree/
buildTwoStep/buildParenStep`. `SHAPE_OPS` declares which operators a shape needs, and
`shapeAllowed()` gates it against a stage's `opsAllowed`. `SHAPE_OPS` lists the
**conservative floor** for `missing` and `three` (`['add']`) — those shapes can take a
subtractive form, so they read `opsAllowed` themselves to decide.

## What the contract asserts (do not break these)

Per generated quest, across every level × tier with many seeds:

- exactly **one** correct option, and no duplicate options
- all options are **non-negative integers**
- division is **exact**; subtraction is **ordered** (never negative)
- the **level ceiling** holds for the question *and* every option
- the **straddle** property: at least one decoy below and one above the answer
- the **magnitude band**: decoys within 0.4×–2.5× of the answer
- `opsAllowed` is honoured
- **determinism** for a fixed seed
- **at most one `=`** per quest text

That last one is a real bug memorial: the `missing` shapes already carry their own
`=` and `?`, so appending `" = ?"` in the quest box produced `1 + ? = 4 = ?`. If you
touch label building, remember `text.includes('=')`.

## DISTRACTORS ARE PEDAGOGICAL, NOT RANDOM

This is the part most likely to be got wrong. A decoy exists to represent a mistake a
kid could actually make:

- **off-by-one / off-by-ten** — miscounting, place-value slip
- **the other operator's result** — added when they should subtract
- **an adjacent times-table row** — 7×8 vs 7×7
- **digit transposition**

And every decoy must be **believable**:

- **Capped by the level's ceiling.** A decoy above it breaks the promise the level's
  own label makes — "phạm vi 10" must never show 90. This is why cross-operator
  decoys are *gated* rather than free: offering `a×b` against "9 + 1" produced 90 on
  an Easy quest.
- **Inside the magnitude band, both directions.** Guarding only the upper side was not
  enough: `800 + 100 = 900` was offering 90, and `7 × 8 = 56` was offering 1. Both are
  instantly dismissable, which shrinks a four-option question to three.
- **Proportional, not digit-count based.** Digit rules are too blunt near powers of
  ten: an answer of 100 has no 3-digit values below it, so a digit rule rejects every
  smaller decoy and breaks the straddle.
- **A lone 0 reads as "not an answer"** and is rejected for answers ≥ 10.
- **Small answers need a band too.** The proportional band only engaged at answers
  ≥ 10, and DIVISION answers are usually small — so `16 ÷ 4 = 4` was offering **64**
  (the product) and `15 ÷ 5 = 3` was offering **75**. Measured: **one in three**
  division quests had a decoy ≥ 4× the next option, instantly dismissable, turning a
  four-option question into a three-option one. Small answers now use an ABSOLUTE
  window (`answer + 8`) rather than a proportional one, because at an answer of 2 a
  2.5× band leaves too few candidates to fill three slots. Fix took it to 0.5%.
- **`missing` shapes carry their own `=`** (`1 + ? = 4`), so `questbox.js` appends
  `" = ?"` only when `text` has no `=`. Verified: every rendered label has exactly one
  `=`. If you see two in a debug dump, check whether the dump itself is appending
  `= answer` — that is what it was, not a game bug.

## READ THE QUESTS. The tests cannot see a giveaway.

`math-preview.html` exists because **two real defects were found by reading and could
not have been caught by assertions**: the `900 → 90` and `56 → 1` decoys above were
contract-legal and obviously wrong to a human eye.

After any change to shapes or distractors, open the preview and actually read a few
dozen quests per level. Ask: could a kid pick the right answer *without doing the
arithmetic*? If yes, the decoys are the bug.

## Guessing pays 25%, and that shapes the whole design

With four options, a guesser scores 25%. Consequences that are already baked in and
must stay:

- **`rank.js` never measures speed.** A speed gate would push a kid to guess. Rank is
  accuracy and volume only.
- **The ultimate charges on CLEAN answers** (first try), not on answers.
- **Pausing hides the quest** (`F8`) — otherwise pause is a free thinking-timer, and
  the game is "can you do this in your head, *now*". The same question returns on
  resume, so pause is not a re-roll either.

## `quests.js` — the feeder

Owns the **no-repeat window** (a kid must not see the same quest twice in quick
succession) and **clean-answer tracking** (first-try correctness, which drives the
ultimate charge). If you change quest identity or text, check the no-repeat key still
distinguishes quests that should be distinct.

## Ceilings, per level

`easy` 10 · `normal` 100 · `hard` times tables + ± · `hardest` 1000. These are
promises made in the level's own on-screen description (`LEVELS[id].desc`), shown on
the title screen. Changing a ceiling means changing that Vietnamese copy too — and
`answerCount` defaults to 4, which every distractor rule above assumes.
