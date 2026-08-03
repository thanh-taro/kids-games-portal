---
name: game-content-change
description: Change stages, waves, enemies, quests, upgrades, allies, biomes or story in Phi Công Toán Học without breaking playability. Use for ANY edit to js/stages.js, enemies.js, upgrades.js, allies.js, chapters.js, biomes.js or story.js, or to a difficulty number anywhere.
---

# Changing content in this game

The data here is **hand-authored and its failure modes are invisible in review**. A
stage can look perfectly reasonable and be mathematically unbeatable. This skill is
the procedure that stops that shipping.

## Always, after ANY content change

```bash
npm test        # math.test.js && verify.js && balance.js — all three
```

`npm test` **fails** unless all 24 stages are beatable by three simulated kid
profiles. That gate is not decoration; it has caught, in order:

1. Fleets totalling 51 hits against 14 promised quests — two thirds of every fleet
   flying past untouched no matter how well the kid played.
2. An escape penalty that scaled *backwards* — paid per ship, so the kid furthest
   behind paid most and a fast kid paid nothing.
3. Beating a boss **respawning the boss**, because the reinforcement tail copied
   "the last wave".
4. A 360° boss attack that looked spectacular and dealt **literally zero damage**
   over 60 measured seconds.
5. Every biome's planet covering 67–100% of the play field, because the radius
   scaled with canvas WIDTH while the position scaled with HEIGHT.

| profile | pace | accuracy |
|---|---|---|
| slow | 12s/answer | 65% |
| typical | 8s | 80% |
| fast | 5s | 92% |

```bash
node js/balance.js         # the table for all 24 stages
node js/balance.js 14      # detail for one stage — use this while tuning
```

## The rules that came out of those failures

- **FLEET SIZE IS SET BY THE SLOWEST PLAYER.** A slow kid produces ~1 hit per answer
  asked. Fleets grow across the game only as fast as the kid's firepower does.
- **PER-WAVE BUDGETS, NOT JUST STAGE TOTALS.** A wave is on screen for
  `spawnSpan + transit` seconds; whatever is left escapes. A stage whose *total* is
  affordable can still leak every single wave. `verify.js` asserts both.
- **ENEMY SPEED IS SET BY THE SLOWEST PLAYER'S ANSWER RATE.** Speeds sit at 8–16
  px/s because a 500px field must last several answers. The enemies are slow because
  the *arithmetic* is the pressure; dodging is not a skill this game tests.
- **BOSSES NEED A LOWER FIRE RATE THAN CREEPS** — the opposite of intuition. A boss
  holds position so its damage applies for the whole fight; a creep wave ends when it
  crosses.
- **REINFORCEMENTS ARE HARMLESS** — no fire, no escape cost, and they copy the last
  *creep* wave, never a boss. Letting them shoot meant kids were killed by the
  epilogue of a stage they had already won.
- **`quest.tier` must be NON-DECREASING across all 24 stages** (asserted).
- **Chapter ranges must TILE `STAGES` exactly** — counts are written literally so
  adding a stage to the wrong chapter *fails* rather than being silently absorbed.
- **A wave cannot field a ship its biome does not roster** (`BIOME_ENEMIES` — this
  caught 4 real content slips).
- **Every `story.js` `art` name needs a case in `drawStoryArt`** (asserted), or it
  renders as text on an empty sky.
- **`upgradeForStage` wraps modulo**, so a short list silently re-grants early gear.

## MEASURE, DON'T GUESS

`HIT_FRACTION` in `balance.js` was guessed at 0.35 and nearly caused 24 stages to be
retuned against a threat that did not exist. The measured value is **0.21** (park on
a boss stage, set hull high, answer nothing, watch hull fall). If patterns or
projectile speeds change, **re-measure** — do not adjust the constant to make the
table look right.

This generalises: when tuning any visual or numeric constant, measure it. A rank aura
was set by eye and drew at +5 RGB over the background — correct code, invisible
result. See the `game-browser-test` skill for the pixel-sampling technique.

## IMPOSSIBLE OUTPUT MEANS THE MODEL IS WRONG, NOT THE CONTENT

Every simulator bug in this project was found because the numbers were arithmetically
impossible — "92 hits against a 36-hit fleet with 48 escapes", or a stage asking 77
questions where the blueprint promised 12. If `balance.js` prints something that
cannot happen, fix `balance.js`. Do not retune stages against a phantom.

## Don't bulk-edit `stages.js` with regex

Several ad-hoc passes lost track of state and one *raised* boss bars that were meant
to fall. **Dump the numbers first, then edit deliberately.** `node js/balance.js`
and `stages-preview.html` both give you the current picture.

## Where the source of truth lives

- **`stages.js`** — the 24 blueprints. `main.js`'s spawner is a dumb consumer that
  computes nothing. That separation is what lets `verify.js` prove a stage is
  playable before anyone plays it. Keep it that way: logic in the spawner is logic
  the gate cannot see.
- **`chapters.js`** — ranges over the flat `STAGES` list.
- **`enemies.js`** — roster + `BIOME_ENEMIES`.
- **`biomes.js`** — 15 backdrops carrying the story through-line (Earth shrinks in
  ch.1; the dark star grows in ch.2; it becomes the arena in ch.3). Preserve the
  meaning stated in each biome's comment. **Planet radius must scale with field
  HEIGHT, never canvas width** — the one rule this file may not break.
- **`upgrades.js` / `allies.js` / `story.js`** — one reward per stage; an ally is an
  entry plus an `ALLY_STYLES` colorway; story is pure data.

## Design constraints that override "make it harder"

- **A wrong answer breaks the combo. It NEVER kills.** A kid slow at arithmetic must
  survive long enough to learn. Anything that turns a wrong answer into a death
  breaks the whole design.
- **ONE METER: ĐỘ BỀN TÀU VŨ TRỤ.** Do not add a second meter or a barrier without a
  consequence the durability bar cannot already express. An energy bar and a shield
  dome were both tried and cut — see `CLAUDE.md` for why each failed.
- **All in-game text is Vietnamese**, kid-friendly and encouraging. The failure
  screen leads with what the kid *achieved* — a child who reads failure as "I am bad
  at maths" stops playing.
- **Avoid `Math.random()` at construction time.** Use per-index variation or a seeded
  `rand()` so bursts look organic without being nondeterministic.
