# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Phi Công Toán Học — Cứu Dải Ngân Hà" — a pixel-art **vertical space shooter that
drills mental arithmetic**, for kids around 6–9, in Vietnamese. Zero dependencies:
HTML5 Canvas 2D + vanilla ES modules. No image or audio assets — every sprite,
effect, sound and music track is generated in code.

**The kid never flies or aims.** The ship flies and fires itself; a correct answer
launches a volley, and a wrong answer breaks the combo but **never kills**. That
asymmetry is the whole design: a child who is slow at arithmetic still survives
long enough to learn, while a fast one visibly gets stronger. Anything that turns a
wrong answer into a death breaks the game.

**ONE METER: ĐỘ BỀN TÀU VŨ TRỤ** (the ship's durability). It drops when the ship is
hit and when a monstership breaks through (a third of a point each, accumulated so a
trickle of leakage reads as one clear hit), and a correct answer mends it.

**A BREAKTHROUGH IS A KAMIKAZE DIVE, NOT AN EXIT.** A monstership that gets level
with the ship banks into the hull and detonates. This is a LEGIBILITY fix, not a
difficulty change — the cost is the same `ESCAPE_HULL_COST` either way. The kid's
model is *"they shoot me, I get hurt"*, and a ship that left the bottom of the
screen while the bar moved a second later, with the same red flash and the same
`hurt` sound as being shot, was unexplainable: there was no perceptual difference
between "you were shot" and "one got past you". An impact needs no explanation.
Three things this depends on:

- **Aim at `ship.y`, not `m.shipY`.** The ship BOBS; `m.shipY` is only the static
  layout row. Using it made dives detonate ~30px above the visible hull — the same
  class of bug as the shield dome missing because the ship had drifted.
- **The dive needs a visible run-up.** The first version turned 30px out and
  accelerated at 420px/s: the whole thing was over in 0.5s, which is not long enough
  to look up and see it. It turns 110px out and tops out at 165px/s (~1.1s).
- **Dives are STAGGERED** (`diveQueue`, 0.45s apart). Escape damage bypasses the
  mercy window because it is accumulated rather than a burst — so eight ships
  breaking through in one frame would be eight real points, which is exactly the
  burst `invuln` exists to prevent.
- **Reinforcements never dive.** They cost nothing (the tail is a question dispenser),
  and a ship that visibly rams the hull for zero damage is a worse lie than a quiet
  exit.

**TWO RICHER IDEAS WERE TRIED HERE AND BOTH CUT.** Worth knowing, because both
looked good on paper and cost real time:

- **An ENERGY bar** above the durability bar. It drained on a clock and refilled on
  a correct answer, so it only ever emptied if the kid stopped playing for ~110
  seconds, then chipped durability slowly — a second, slower health bar wearing a
  different label. Making it *ammunition* was worse: refill 24 and spend 8 on the
  shot is a +16 refill with extra arithmetic, **circular by construction** and
  unable to ever bite.
- **A SHIELD DOME** over the formation that physically intercepted shots — solid at
  full strength, porous when weakened, gone when broken. It looked genuinely good.
  It was also a persistent bug source, because its correctness depended on the
  ship's idle drift, the dome's arc geometry, the hex-cell ring's rotation, the
  per-wave ally absorb and the damage mercy window *all* agreeing — and they kept
  not agreeing. Shots tunnelled, missed by 40px because the ship drifted out from
  under them, or were silently eaten by `invuln`. Each fix moved the failure
  somewhere else.

The lesson both times: **for this audience one legible number beats a clever system,
and a mechanic whose correctness depends on four moving parts lining up will keep
breaking.** Do not reintroduce a second meter, or a barrier, without a consequence
the durability bar cannot already express.

Two bugs from that work are worth keeping in mind because they generalise:

- **Escape damage must BYPASS the mercy window.** `invuln` exists to stop a burst of
  projectiles one-shotting the ship; escapes are not a burst, they are the summed
  cost of ships the kid failed to shoot. Routed through `takeDamage()`, eight
  escapes (2.7 points) landed as ONE and the rest vanished — a whole wave slipped
  past and the bar did not move.
- **The ship's idle drift is capped in PIXELS, not left as a fraction of width.** At
  3% of a 1500px window it travelled 45px while a shot was in flight (>2s), which
  was enough to walk out from under fire aimed straight at it. Incoming fire was
  dodging itself.

**24 stages across three chapters** (`stages.js` / `chapters.js` / `story.js`):
1. **Lệnh Từ Trái Đất** (1–6) — defend Earth, push the fleet to the outer dark,
   defeat the Black Commander. His wreck reveals the gang, its master, and five
   prisoners.
2. **Giải Cứu Đồng Đội** (7–18) — five rescues, two stages each plus a two-stage
   finale. Each freed ally permanently **joins the formation and fires**, and
   grants one ability.
3. **Cứu Dải Ngân Hà** (19–24) — the Darkness Realm and the Destroyer's
   four-phase core.

## Commands

```bash
npm start                 # dev server (http-server -c-1) on :8179 — ALWAYS use this
npm test                  # math.test.js && verify.js && balance.js && quests.audit.js
node js/math.test.js      # the quest contract, ~201k assertions
node js/verify.js         # data invariants + the playability gate (~20k)
node js/balance.js        # playability table for all 24 stages
node js/balance.js 14     # detail for one stage
node js/dump.js all       # READ-ONLY inspector for the hand-authored content
node js/dump.js waves     # (also: quests bosses enemies biomes rewards chapters)
npm run audit             # quest QUALITY report — giveaways, tier fit, decoy shape
node js/quests.audit.js hard 12    # one level+tier, with 40 real quests printed
```

**`quests.audit.js` is a REPORT, not a contract.** `math.test.js` asserts what is
legal; the audit measures what is *good*, because a contract cannot see a giveaway.
It classifies findings as **HARD** (a defect by any reading — an option above the
level's advertised cap, a duplicate, a bad answer index; these fail `npm test` via
`--strict`) and **soft** (advisory: outlier decoys, tier fit, answer-appears-as-operand).
Soft findings are judgement calls — read the examples, do not chase the number to zero.

`dump.js` exists because the rule "don't bulk-edit `stages.js` with regex — dump the
numbers, then edit deliberately" had no way to dump them. Diff-friendly: one fact per
line, stable order, so `node js/dump.js all > before.txt` then diffing proves a
refactor changed nothing. It computes nothing about playability; `balance.js` owns that.

## Skills

`.claude/skills/` holds four skills for the recurring workflows here. Invoke the one
that matches the task rather than re-deriving its rules:

| skill | when |
|---|---|
| `game-content-change` | ANY edit to stages/enemies/upgrades/allies/chapters/biomes/story, or any difficulty number |
| `game-quest-work` | quest generation, tier ladders, distractors (`math.js`, `quests.js`) |
| `game-sprite-work` | sprites, effects, HUD, scene art, biome visuals |
| `game-browser-test` | verifying anything in a real browser |

- **`npm start` is a no-cache server.** Plain static servers make Chrome cache ES
  modules, so edits to `js/*.js` silently don't reload and you test stale code.
- No lint/build. `node --check js/<file>.js` syntax-checks a module.
- **Run `npm test` after ANY content change.** The data here is hand-authored and
  its failure modes are invisible in review — see the gate section below.

## THE PLAYABILITY GATE — read this before touching any number

`js/balance.js` simulates three kid profiles over every stage:

| profile | pace | accuracy |
|---|---|---|
| slow | 12s/answer | 65% |
| typical | 8s | 80% |
| fast | 5s | 92% |

`npm test` **fails** unless all 24 stages are beatable by all three. This is not
decoration; it has caught, in order:

1. Fleets totalling 51 hits against 14 promised quests — two thirds of every fleet
   flying past untouched no matter how well the kid played.
2. An escape penalty that scaled *backwards*: paid per ship, so the kid furthest
   behind paid most and a fast kid paid nothing. (Kept small for that reason —
   `ESCAPE_HULL_COST` is a third of a point.)
3. Beating a boss **respawning the boss**, because the reinforcement tail copied
   "the last wave".
4. A 360° boss attack that looked spectacular and dealt **literally zero damage**
   over 60 measured seconds.
5. Every biome's planet covering 67–100% of the play field, because the radius
   scaled with canvas WIDTH while the position scaled with HEIGHT. On a wide window
   the saturated ones swallowed the fleet — the one rule `biomes.js` may not break.

### The rules that came out of that

- **FLEET SIZE IS SET BY THE SLOWEST PLAYER.** A slow kid produces ~1 hit per
  answer asked. Fleets grow across the game only as fast as the kid's firepower
  does — never faster.
- **PER-WAVE BUDGETS, NOT JUST STAGE TOTALS.** A wave is on screen for
  `spawnSpan + transit` seconds and then whatever is left escapes. A stage whose
  *total* is affordable can still leak every single wave. `verify.js` asserts both.
- **ENEMY SPEED IS SET BY THE SLOWEST PLAYER'S ANSWER RATE.** Speeds sit at
  8–16 px/s because a 500px field must last several answers. The enemies are slow
  because the *arithmetic* is the pressure; dodging is not a skill this game tests.
- **BOSSES NEED A LOWER FIRE RATE THAN CREEPS,** which is the opposite of
  intuition: a boss holds position, so its damage applies for the whole fight,
  where a creep wave ends when it crosses.
- **REINFORCEMENTS ARE HARMLESS** — no fire, no escape cost, and they copy the
  last *creep* wave, never a boss. The tail is a question dispenser wearing a
  monstership sprite. Letting it shoot meant kids were killed by the epilogue of a
  stage they had already won.
- **MEASURE, DON'T GUESS.** `HIT_FRACTION` in `balance.js` was guessed at 0.35 and
  nearly caused 24 stages to be retuned against a threat that did not exist. The
  measured value is 0.21 (park on a boss stage, set hull high, answer nothing, watch
  hull fall). If patterns or projectile speeds change, **re-measure**.
- **Don't bulk-edit `stages.js` with regex.** Several ad-hoc passes lost track of
  state and one *raised* boss bars that were meant to fall. Dump the numbers, then
  edit deliberately.

## Architecture

Entry point `js/main.js` — a canvas render loop driving a state machine. No DOM
UI; everything is drawn on one `<canvas>`.

### The vertical layout

`render.js` `LAYOUT` / `metrics()` is the **single source of truth** for the
screen split: enemies descend from the top, the ship holds at 62% height, and the
quest box owns the bottom 34%. Every module derives geometry from `metrics()`
rather than hardcoding rows.

The context is scaled by `devicePixelRatio` **once** in `resize()`, so all drawing
works in CSS px. Without that a 2× display halves every font and puts every tap
one card off.

### State machine

```
TITLE ─→ STORY(prologue + ch.1 opening) ─→ TUTORIAL ─→ STAGE_INTRO → PLAYING
PLAYING → VICTORY ─┬─ ally reward → ALLY_RESCUE ─┐
                   └───────────────────────────┴─┬─ mid-chapter → STAGE_INTRO
                                                 └─ finale → CHAPTER_END
                                                     → STORY(closing)
                                                     ├─ more → STORY(opening)
                                                     └─ final → CREDITS → TITLE
PLAYING → FAILURE → retry the same stage (progress and upgrades kept)
```

- **Every transition goes through `setState()`.** One funnel means the arrival
  sound and the music track are chosen in exactly one place (`songForState()`).
- **`finishStory(after)` is called both when pages run out AND on skip,** so
  skipping lands exactly where reading would have.
- The **prologue plays before the tutorial** (mission first, then the craft), and
  the tutorial is written in the Captain's voice so the two read as one sequence.

### Data-driven content

- **`stages.js`** — the 24 **blueprints**, and the source of truth for stage
  composition. `main.js`'s spawner is a dumb consumer that computes nothing. That
  separation is what lets `verify.js` prove a stage is playable before anyone plays
  it. `quest.tier` must be **non-decreasing** across all 24 (asserted).
- **`chapters.js`** — ranges over the flat `STAGES` list. The ranges must **tile
  exactly**; counts are written literally so adding a stage to the wrong chapter
  *fails* rather than being absorbed.
- **`enemies.js`** — the roster plus `BIOME_ENEMIES`, so a wave cannot field a ship
  its biome does not roster (this caught 4 real content slips).
- **`biomes.js`** — 15 backdrops carrying the story through-line: **Earth shrinks**
  across chapter 1, **the dark star grows** across chapter 2 while ally beacons
  answer it, and in chapter 3 it stops being scenery and becomes the arena. Preserve
  the meaning stated in each biome's comment.

  **EVERY CAGE HOLDS ITS PRISONER.** `prisoner` in each prison biome names the ally
  held there, and the cage draws that ally's **real sprite in its real colourway** —
  the kid must recognise the wingman they free as the same one who then flies beside
  them. It is drawn *before* the bars so they pass in front: a figure over the bars
  looks free, a figure behind them looks held. `verify.js` asserts every cage has a
  prisoner, every prisoner is a real `ALLIES` id, no ally is caged twice, and no ally
  is uncaged (a wingman joining with no rescue scene).

  This replaced an empty box whose own comment claimed the cage was "lit from inside
  so the kid can see there is someone in there" — the intent was written and never
  implemented, so chapter 2 asked a child to spend two stages rescuing a visibly empty
  cell. **Scale is the thing to get right and it took three tries:** ~1.15× was an
  unrecognisable speck (1276 coloured pixels in a 55800-pixel cell — drawing correctly,
  communicating nothing), 0.62 of the cell width filled it edge to edge and read as
  *crammed in* rather than *held*, and 0.42 leaves visible space around the figure,
  which is what makes a cell read as a cell.

  **PLANETS SPIN, and the rotation is in the SURFACE ONLY** — the disc, the lit limb
  and the radius never move. That keeps the "scenery must never out-read the fleet"
  rule true by construction (nothing about the silhouette changes, so a planet cannot
  grow into the play field), and it is how a sphere actually looks from outside: still
  outline, features marching across it. Each feature fades and foreshortens toward the
  limb via `limbFade`, or it clips at the disc's edge and the world reads as a spinning
  coin. Rates are per-planet (`spin` in the biome data): jupiter fastest, darkcore
  slowest, a full pass taking 60–140s.

  `ice`, `ember` and `mars` had **no surface detail at all** and needed marks added —
  a featureless disc rotating is indistinguishable from one standing still.

  **The surface is clipped to the disc**, which fixed a real pre-existing bug the
  rotation exposed: jupiter's bands are a full-width `fillRect(cx - r, y, r * 2, …)`
  and the only clip was the play FIELD, so on any window where the disc was narrower
  than the field the bands ran straight across the whole sky as grey stripes over the
  starfield and the fleet.
- **`upgrades.js`** — one reward per stage; `upgradeForStage` wraps modulo, so a
  short list silently re-grants early gear (asserted).
- **`allies.js`** — five wingmen as data. A new ally is an entry plus an
  `ALLY_STYLES` colorway, not a new sprite.
- **`story.js`** — pure data. Every `art` name must have a case in
  `drawStoryArt` (asserted), because a missing one renders as text on an empty sky.

### Sprites (`sprites.js`)

Arrays-of-strings dot grids; each char is a `PALETTE` key, space transparent.
`verify.js` validates geometry and palette chars — run it rather than eyeballing.

**FAMILIAR SILHOUETTES ARE A TRAP at this size — not just faces.** Three shipped
here and had to be redrawn: the allies read as **Christmas trees** (triangle over a
stem), then as **little robots** (head-body-legs); `enemy_orb` was a mushroom and
`enemy_spike` a lollipop. The structural rules:

- **Ships are WIDER THAN THEY ARE TALL.** Mass along a horizontal wing line reads
  as an aircraft from above and as nothing else. Vertical stacking summons
  creatures.
- **Build from machinery,** never anatomy. A boss's eye is a core/lens, off-centre
  so it cannot pair into a face.
- **Mounted props run VERTICAL.** `boss_commander`'s mast was stepped diagonally
  and the whole boss read as a featureless red blob.
- **Idle frames move only extremities** — thruster flame, a lamp recoloured in
  place. A cell appearing or vanishing outside the thruster zone changes the
  silhouette and reads as the hull lurching (asserted).
- **Colour is faction.** Friendly ships are cool, monsterships warm or violet, and
  `verify.js` fails if either borrows the other's hue.

### Rank, and why it grants nothing (`rank.js` + `heroSprite`)

Rank is a **lifetime** rating (accuracy and volume, never speed) and it is a
**badge, not a buff**. It shows in the HUD on the durability bar's label row —
`ĐỘ BỀN TÀU` left, rank right-aligned to the bar's end — and it rides on the ship
itself: `heroSprite(rankIndex)` recolours the hull **trim** per rank and marks the
top three with wing pips, the same one-hull-many-colorways trick as `allySprite`.
A faint rank-coloured aura sits under the ship, `lighter`-blended and drawn
*before* the wingmen so it can never tint them.

**Do not give rank an ability.** Its thresholds are lifetime totals, so any bonus
is permanent across all 24 stages: invisible to `balance.js`, stacked on top of the
per-stage upgrade curve it already simulates, and **scaled backwards** — rank
measures accuracy, so it would reward the kid who least needs help. That is the
escape-penalty mistake again.

**DEMOTION: losing the SAME stage three times costs one rank** (`DEATHS_PER_DEMOTION`),
and **clearing a stage repays one**. Rank claims the kid is a Chỉ Huy Trưởng, and a
kid losing three times running is being asked for arithmetic they do not have yet;
the badge should stop making that claim. Every bound on it exists because this runs
straight into the failure screen, whose job is to stop a child reading a loss as
"I am bad at maths":

- **Per-stage, not lifetime.** The streak resets on a win and on reaching a new
  stage (`deathStage` guards it), so one loss each across six stages costs nothing.
  Without that guard, "stuck here" would silently mean "played a lot".
- **At most one rank per stage** — `demotedThisStage` latches, so a kid who loses
  five times pays one rank, not three. Verified in-game: the 4th and 5th losses
  leave `demotions` at 1.
- **Never below trainee.** `rankFor` clamps; there is no rank below trainee and a
  negative one needs a story nobody wants to tell a 6-year-old.
- **A demotion at trainee is not spent at all**, so a kid who struggled early never
  has to re-earn ranks they never held.
- **It is announced, never silent, and always with the way back** — the rank is on
  the kid's own ship, so an unexplained trim change is worse than a plain sentence.
  The line sits *after* what they achieved and is smaller than the retry button.
- **`rankUp` must return null when the rank falls.** It is one `>` away from routing
  a demotion through the promotion fanfare, which would be actively cruel. Asserted.
- **Repayment fires the promotion fanfare**, because winning a rank back in silence
  reads as the game grudgingly returning what it took. The comparison therefore
  straddles both the stage's answers *and* the repayment.

One pre-existing bug this fixed on the way past: rank could already fall **silently**,
because `minAccuracy` is a lifetime ratio — 420/105 is exactly 80% (Chỉ Huy Trưởng)
and twenty more wrong answers drops it to 79.9%. The trim would change with nothing
announcing it. Demotions are now the only way rank moves down, and they always speak.

Three constraints the skins must respect:

- **Trim only, never the hull.** `verify.js` requires friendly ships to stay
  cool-hued (`B`/`b`) and forbids them the enemy warm/violet set, because hue is
  how a kid tells "mine" from "incoming" in a busy frame.
- **The silhouette may not change with rank** — asserted cell-by-cell against the
  base hull, including the outline. Pips replace existing hull cells inside the
  wing line rather than adding cells outside it.
- **Rank colours are duplicated in `main.js` (`RANK_TRIM`) for the HUD**, which
  draws with CSS strings rather than palette keys. `verify.js` reads that literal
  and asserts it matches the palette, because two hand-synced lists drift and a
  badge disagreeing with the ship is exactly the bug that survives review.

The aura's alpha was **measured, not chosen**: the first values sampled at
+5/+10/+1 RGB over the bare biome — drawing correctly and completely invisible.
The shipped values read at +18/+15/+17, with all five ally hulls still sampling
their exact palette colours.

### Pause (`F8`), and why it hides the quest

Pause is a **flag on PLAYING**, not a state in the machine: a `STATE.PAUSED` would
need its own entry in `setState()`, `songForState()`, the click router and the draw
switch, and each is a place to forget that resuming must land back in a live stage
with its fleet intact. The flag gates one call — `updatePlaying` — which owns every
clock in the play field, so skipping it freezes spawns, descent, fire timers and the
damage accumulators *together*. Advancing any subset is how a "pause" lets the fleet
close in.

**`fieldT` is a second clock, frozen while paused.** `sceneT` cannot be used for the
play field because it also drives the pause overlay's pulse and the mute toast, which
must keep breathing so a paused game looks waiting rather than crashed — but it drives
the ship/ally sprite frames, the biome and the rank aura too, and thrusters flickering
over a stopped fleet reads as a bug.

**THE QUEST IS COVERED, and this is the point of the feature's design.** A pause that
left the problem on screen is a free thinking-timer: stop the clock, work out 47 + 68
at leisure, resume, answer. That does not cheat a score, it cheats the practice — the
game is "can you do this in your head, *now*". Both the formula **and** the four cards
are masked, because either alone leaks: the formula is the problem, and four options
with one plausible answer can be reasoned backwards from. The mask is painted **over**
the finished quest box rather than by teaching the box a paused mode, so nothing it
draws later can slip out from under it.

**The quest is not re-rolled on resume** — that would make `F8` a free skip, and a kid
would pause-cycle until an easy question came up.

**Gate answering at `input.onPick`, not at `hitTest`.** This cost a real bug: the
number keys `1`-`9` call `onPick` **directly** in `input.js` without ever consulting
`hitTest`, so gating `hitTest` and `onKey` still let a paused kid press `2` and answer
the hidden quest — measured, it cost a wrong answer. Every input route converges on
`onPick`; the check belongs on the funnel, not on each of the three routes into it.

`setState()` always clears the flag, because a kid can be killed by an in-flight shot
on the same frame they pause, and a pause surviving into FAILURE would freeze the retry
screen.

### Scene backdrops are animated (`scenes.js` → `starfield`)

**Every screen's backdrop moves.** The shared `starfield()` helper took no `t` at all,
so the title, all 16 story tableaux, victory, failure, credits and the tutorial were
dead photographs — while the gameplay starfield has always drifted, making the contrast
worst exactly where a kid spends the most time reading. One parameter on one helper
animated all 23 call sites.

Two motions, both deliberately slow because **these screens carry text**: a downward
wrapping drift (varied per star, for depth) and a per-star alpha twinkle on its own
phase, so the field never flashes as one sheet. Measured at ~50–90 changed pixels per
second in a 600×60 band — alive, not distracting. Anything fast enough to notice is
fast enough to pull the eye off a sentence.

`t` defaults to 0 so a caller that forgets it renders the old static field rather than
throwing; this helper is on the draw path of every screen in the game.

### Effects (`effects.js`)

**The kid is reading while this plays**, so effects are legible-but-brief rather
than spectacular:

- **Everything is clipped to the play field.** The quest box is sacred — a death
  explosion must never paint over a number the kid is reading.
- **Screen shake is applied to the play field only.** Shaking the canvas shakes the
  answer cards, which is hostile to a child trying to tap one.
- Effects differ by **motion**, not just colour: freeze shards hang, repair motes
  rise, the ultimate gathers inward then blooms.
- A malformed colour once threw inside `ParticleSystem.draw()` **every frame**,
  killing the HUD and quest box. `blend()` degrades instead of throwing; effects
  must never be able to take the render loop down.

### Audio (`audio.js`) and music (`music.js`)

Web Audio, lazily created, resumed on the first gesture. Loud events duck the
music. `F8` pauses, `F9` mutes all, `F10` music only — three function keys in one
block, because the number row belongs to the answer cards.

**ANSWER FEEDBACK IS THE LOUDEST THING** — it carries the information the kid
needs. The wrong-answer sound is a soft descending pair, *not* a buzzer: a child
who fears that sound stops answering. `shieldBlock` is deliberately dull and
muffled so it reads as "that did nothing".

**Music restraint is the whole point.** No drums anywhere (a beat is the most
attention-pulling thing you can put under someone reading, and it pushes speed
where the game rewards accuracy). Battle loops have **no melody** — pad, soft bass,
sparse fixed-shape arpeggio; a `lead` voice appears only where nobody is answering.
Tempos 68–100 BPM. The three chapter loops differ by **mode and texture**, not
busyness. The battle theme follows the **chapter**, not the stage.

### Other modules

`adaptive.js` (per-shape mastery + the quest-selection bias it drives), `quests.js` (no-repeat window, clean-answer tracking), `formations.js` (11 shapes
as pure functions), `bossattacks.js` (five firing patterns), `rank.js` (lifetime
rating gated on **accuracy and volume, never speed** — a speed gate would teach
guessing, which pays 25% at four options), `questbox.js`, `input.js`,
`starfield.js`.

## Adaptive difficulty (`adaptive.js`)

The game tracks accuracy **per quest shape** (`add`, `sub`, `mul`, `div`, `missing`,
`three`, `twoStep`, `parenStep`) and biases selection toward the shapes the kid keeps
missing. Before this, every answer was thrown away except two counters, so a child
fluent at addition and lost at division saw the same mix as one in the reverse
position — a fixed ladder teaches the *average* kid.

**THE CONSTRAINT THAT SHAPED THE DESIGN.** `balance.js` proves all 24 stages beatable
at 65% accuracy *without generating a single quest* — it models accuracy as a fixed
profile percentage. So its proof survives only if adaptive selection cannot change
what a stage demands. Therefore the bias:

- **Never changes the tier.** Difficulty stays where `stages.js` put it.
- **Only reorders shapes WITHIN the tier's own list**, so every quest served was
  already legal for that stage. A shape the tier does not list can never appear —
  asserted against a hostile record containing every shape in the game.
- **Is capped** (`WEIGHT_MAX` 3), so one weak shape cannot crowd out the stage.
  Measured: a kid failing subtraction sees it 50% of the time instead of 25%, with the
  other shapes still at 15–21%.
- **Keeps a floor**, so a mastered shape still recurs for retention (measured 13%).
- **Forgets.** Accuracy is an exponential moving average (~3-answer half-life), so
  improvement undoes the bias — otherwise a kid bad at division in week one keeps
  being served division in week four. Asserted.
- **Ignores thin evidence** (`MIN_SAMPLE` 4), so one unlucky answer cannot swing the
  mix.

It biases toward **weakness, not away from it**. The opposite would feel nicer and
teach nothing; the cap is what keeps it from being punishing.

`generateQuest`'s shape selection is pluggable via `opts.selectShape`, and a selector
returning anything outside the tier's list is **ignored rather than trusted**.
`progress.mastery` persists, because mastery belongs to the kid, not the run.

## Quest pools must be deeper than the stage asks

A tier that can only produce N distinct quests, in a stage asking for more than N,
forces repeats — and the kid drills recall of a few facts instead of the arithmetic.
This shipped: **easy t1 produced TEN distinct sums against stage 1 asking TWELVE**,
and `WINDOW` in `quests.js` is 10, so the no-repeat window *was the entire pool*.
`normal` t1 was also ten (round-tens within 50) and `hard` t1/t2 were sixteen.

Fixed by widening the pools without raising difficulty (easy t1 `max` 5→6 = 15 quests,
normal t1 `max` 50→70 = 21, hard t1/t2 `table` 5→6 = 25), and `verify.js` now asserts
every level×stage pool exceeds both the stage's `minQuests` and the no-repeat window.

## The geometry problem, and convergence

**The kid cannot aim.** The ship holds near centre and fires straight up, so an
enemy descending in its own column is unhittable — the first build shipped exactly
that, and **12 correct answers in a row killed nothing**. Formations placed ships
at 14% and 86% of the width while every shot flew up the middle.

`Enemy.update()` therefore **converges** each ship toward the kid's firing lane as
it falls: they enter in formation, so the shape still reads, then funnel into the
lane. `laneX` is the **ship's** x, not the screen centre — the ship drifts, and
converging on centre left enemies parked ~40px to one side of every volley.

**CONVERGENCE IS KEYED TO TIME ALIVE, NOT DESCENT FRACTION.** It used to gate on
`progress > 0.25` with the pull *also* scaled by progress — doubly weak early, and it
made lock-on depend on how fast a ship happened to fall. Since speeds sit at 10-16
px/s (the arithmetic is the pressure, not dodging), a full descent takes 40-50
seconds, so a wide-flank ship was not hittable until 39% of its descent —
**measured at 16-19 seconds.** A kid who answered correctly in that window killed
nothing on the flanks and had no way to know why. Now `ENTRY_GRACE` (2s) +
`LANE_RATE` (0.8/s): measured hittable after **4.1s**, symmetric on both flanks.

The grace is what protects the formations, and it is not optional: a flat pull with no
grace collapsed a wide formation completely (492px of 492px travelled) before it was a
fifth of the way down, which would make the 11 shapes in `formations.js` wasted work.
Verified in-game on stage 2's FLANK: the fleet holds its full 1368px spread for 2s,
then 459 -> 126 -> 35 -> 9px.

## Testing in the browser

`window.__debug` (localhost only, bottom of `main.js`) is how a late scene is
reached without playing to it: `goStage(n)` (with the upgrades a kid would have),
`setState`, `story`, `prologue`, `tutorial`, `credits`, `allies(n)`, `lastWave`,
`chargeUlt`, `hull`, `kill`, `answer(i)`, `info()`, `fx()`, `entities()`.

Gotchas that will waste time:

1. **Effects last a few frames**, so a single screenshot usually lands between
   them. Use `__debug.fx()` to verify wiring rather than chasing frames.
2. **`requestAnimationFrame` is throttled to a standstill in a background tab**, so
   automated in-browser runs of a long stage simply freeze. This is why
   `balance.js` exists and is the primary tuning tool.
3. **CDP `Runtime.evaluate` times out at 45s** — run long measurements detached and
   poll a global.

## Conventions

- All in-game text is Vietnamese; keep the kid-friendly, encouraging tone. The
  failure screen leads with what the kid *achieved* — a child who reads failure as
  "I am bad at maths" stops playing.
- Avoid `Math.random()` at construction time; use per-index variation or a seeded
  `rand()` so bursts look organic without being nondeterministic.
- **THE HUD IS TWO SIDE COLUMNS AND THE CENTRE IS ALWAYS EMPTY.** Split by
  ownership: **left = my ship** (hull, combo, ultimate charge, my warnings),
  **right = the enemy** (stage name, chapter, quest count, boss name,
  phase, HP, shield hint). A kid asking "am I okay?" looks left and "what am I
  fighting?" looks right, and the middle stays clear for the monsterships and the
  kid's own volleys.

  This replaced four failed placements, all the same mistake: **text placed next to
  the thing it refers to lands ON that thing.** The low-hull warning landed on
  the ship; the shield hint landed on the ship *and* the five wingmen; moved under
  the boss bar it landed on the boss; and the stage name, combo and quest counter
  all sat across the battlefield. Nothing goes in the centre column — ever.

  Both columns get a vertical-fade plate, because they sit over the play field and
  the late biomes are bright magenta (10px labels vanished against `dark_core`).
  `colW` is capped by both a fraction and an absolute: the absolute stops the
  columns drifting apart on a wide desktop window, the fraction stops them closing
  in on the boss on a narrow phone.
- Text that can be long must **clamp to its own measured width**. Vietnamese with
  diacritics is wider than it looks, and every scene text block shrinks to fit.
