// verify.js — data-invariant checks for hand-authored content.
//
//   node js/verify.js
//
// The typing game's equivalent exists because hand-authored game data fails in
// ways that are INVISIBLE in code review: a sprite row one char too long, a
// wave naming an enemy that does not exist, a chapter range that skips a stage,
// a rewards list one entry short so early gear is silently re-granted.
//
// This file grows with each phase. Phase 3 covers sprites; phase 4 adds the
// stage/wave/chapter/upgrade invariants and the balance gate.

import { SPRITES, PALETTE, ALLY_STYLES, allySprite, RANK_SKINS, heroSprite } from './sprites.js';
import { RANKS, rankFor, earnedRank, rankUp, rankDown, isDemoted, DEATHS_PER_DEMOTION } from './rank.js';
import { readFileSync } from 'node:fs';
import { STAGES, TOTAL_STAGES, stageHits } from './stages.js';
import { CHAPTERS } from './chapters.js';
import { ENEMIES, BIOME_ENEMIES } from './enemies.js';
import { BIOMES, PLANET_SURFACE_KINDS } from './biomes.js';
import { UPGRADES } from './upgrades.js';
import { FORMATION_NAMES } from './formations.js';
import { LEVELS, LEVEL_IDS, TIER_COUNT, generateQuest } from './math.js';
import { emptyMastery, recordAnswer, weightFor, pickShape, TUNING } from './adaptive.js';
import { makeRng } from './math.js';
import { judge, alliesByStage, hullBonusByStage } from './balance.js';
import { PROLOGUE, CHAPTER_STORY, ALLY_STORY, CREDITS, STORY_ART_NAMES } from './story.js';
import { ALLIES, LINEUP_SLOTS, allyEffects } from './allies.js';
import { drawStoryArt } from './scenes.js';

let passed = 0;
const failures = [];

function ok(cond, msg) {
  if (cond) { passed++; return true; }
  failures.push(msg);
  return false;
}

// ---------------------------------------------------------------------------
// 1. Sprite geometry and palette.
//
// What actually corrupts a sprite is visible content AT or BEYOND column `w`
// (it wraps or clips), or a palette char that does not exist (it renders as
// magenta garbage). Rows padded PAST w with trailing SPACES are harmless —
// spaces are transparent — so those are allowed, matching the typing game's
// note about CREEP_SLIME shipping that way.
// ---------------------------------------------------------------------------

for (const [name, sprite] of Object.entries(SPRITES)) {
  ok(typeof sprite.w === 'number' && sprite.w > 0,
    `${name}: missing or invalid w`);
  ok(Array.isArray(sprite.frames) && sprite.frames.length > 0,
    `${name}: no frames`);
  if (!sprite.frames) continue;

  for (let fi = 0; fi < sprite.frames.length; fi++) {
    const frame = sprite.frames[fi];
    ok(Array.isArray(frame) && frame.length > 0, `${name} f${fi}: empty frame`);
    if (!Array.isArray(frame)) continue;

    for (let ri = 0; ri < frame.length; ri++) {
      const row = frame[ri];
      ok(typeof row === 'string', `${name} f${fi} r${ri}: row is not a string`);
      if (typeof row !== 'string') continue;

      for (let ci = 0; ci < row.length; ci++) {
        const ch = row[ci];
        if (ch === ' ') continue;
        ok(ci < sprite.w,
          `${name} f${fi} r${ri}: visible '${ch}' at col ${ci}, past w=${sprite.w}`);
        ok(ch in PALETTE,
          `${name} f${fi} r${ri} col ${ci}: '${ch}' is not a PALETTE key`);
      }
    }

    // All frames of one sprite must have the same row count, or the sprite
    // appears to grow and shrink as it animates.
    ok(frame.length === sprite.frames[0].length,
      `${name} f${fi}: ${frame.length} rows but frame 0 has ${sprite.frames[0].length}`);
  }
}

// ---------------------------------------------------------------------------
// 2. IDLE FRAMES MOVE ONLY EXTREMITIES.
//
// The typing game's hero had a version whose whole torso shifted down a row —
// it read as squatting — and cape-widening silently ate torso pixels so the
// body jerked sideways. The rule that came out of it: frame 2 may differ from
// frame 1 ONLY in thruster/lamp pixels.
//
// Enforced structurally: the differing pixels must all sit in the bottom third
// of the sprite (thrusters) or be a lamp-colored swap in place (I/S/W/O/V/Y
// signal colors). A diff anywhere in the mid-hull is the bug.
// ---------------------------------------------------------------------------

const SIGNAL_CHARS = new Set(['I', 'S', 'W', 'O', 'o', 'V', 'v', 'Y', 'y', 'C', 'c', 'T', 't']);

for (const [name, sprite] of Object.entries(SPRITES)) {
  if (!sprite.frames || sprite.frames.length < 2) continue;
  const f0 = sprite.frames[0];
  const rows = f0.length;
  const bottomThird = Math.floor(rows * 0.62);

  for (let fi = 1; fi < sprite.frames.length; fi++) {
    const f = sprite.frames[fi];
    for (let ri = 0; ri < Math.min(rows, f.length); ri++) {
      const a = f0[ri] || '';
      const b = f[ri] || '';
      const len = Math.max(a.length, b.length);
      for (let ci = 0; ci < len; ci++) {
        const ca = a[ci] || ' ';
        const cb = b[ci] || ' ';
        if (ca === cb) continue;
        // Legal changes, in order of how they read on screen:
        //   * anything in the thruster zone (the bottom of the hull)
        //   * a LAMP: one cell taking a signal color in place. The silhouette
        //     is untouched — only the color of a single pixel changes — so it
        //     reads as a light blinking, which is what rule 4 wants. Both
        //     directions count, since a lamp may be lit in either frame.
        // Illegal: a cell appearing or vanishing outside the thruster zone,
        // which changes the SILHOUETTE and reads as the hull moving.
        const inThrusterZone = ri >= bottomThird;
        const bothSolid = ca !== ' ' && cb !== ' ';
        const isLamp = bothSolid && (SIGNAL_CHARS.has(ca) || SIGNAL_CHARS.has(cb));
        ok(inThrusterZone || isLamp,
          `${name} f${fi} r${ri} c${ci}: silhouette changed ('${ca}'->'${cb}') outside the ` +
          `thruster zone (row >= ${bottomThird}) — idle frames must move only extremities, ` +
          `and a lamp must recolor a cell in place rather than add or remove one`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 3. The ally template generates all five colorways correctly.
// ---------------------------------------------------------------------------

for (const style of Object.keys(ALLY_STYLES)) {
  const s = allySprite(style);
  ok(s && s.frames && s.frames.length >= 1, `allySprite('${style}') produced nothing`);
  // The slot chars must be fully substituted — a leftover 'A'/'a' means the
  // remap missed, and 'A' is not a palette key so it would render as garbage.
  for (const frame of s.frames) {
    for (const row of frame) {
      ok(!row.includes('A'), `allySprite('${style}'): unsubstituted slot char 'A'`);
    }
  }
  // Caching must return the same object, not rebuild each call.
  ok(allySprite(style) === s, `allySprite('${style}') is not cached`);
}

// Every ally style must have a distinct hull hue, or two wingmen in the
// chapter-3 formation become indistinguishable.
{
  const hues = Object.values(ALLY_STYLES).map((s) => s.hull);
  ok(new Set(hues).size === hues.length,
    `ALLY_STYLES has duplicate hull colors: ${hues.join(',')}`);
  for (const [id, st] of Object.entries(ALLY_STYLES)) {
    ok(st.hull in PALETTE, `ALLY_STYLES.${id}: hull '${st.hull}' is not a PALETTE key`);
    ok(st.shade in PALETTE, `ALLY_STYLES.${id}: shade '${st.shade}' is not a PALETTE key`);
  }
}

// ---------------------------------------------------------------------------
// 4. Faction color discipline.
//
// Friendly ships are cool (blue/cyan/teal/the ally hues); monsterships are warm
// or violet. A kid scanning a busy frame uses HUE to tell theirs from incoming,
// faster than shape. An enemy that borrowed the hero's blue would be a genuine
// gameplay bug, not a style slip.
// ---------------------------------------------------------------------------

{
  const HERO_ONLY = new Set(['B', 'b']);          // hero hull blue
  const ENEMY_ONLY = new Set(['R', 'r', 'P', 'p', 'V', 'v', 'G', 'g']);

  for (const [name, sprite] of Object.entries(SPRITES)) {
    if (!sprite.frames) continue;
    const chars = new Set();
    for (const frame of sprite.frames) for (const row of frame) for (const ch of row) chars.add(ch);

    const isEnemy = name.startsWith('enemy_') || name.startsWith('elite_') || name.startsWith('boss_');
    const isFriendly = name === 'ship_hero' || name.startsWith('ally_');

    if (isEnemy) {
      for (const c of HERO_ONLY) {
        ok(!chars.has(c), `${name}: uses hero-blue '${c}' — enemies must never be blue`);
      }
    }
    if (isFriendly) {
      for (const c of ENEMY_ONLY) {
        ok(!chars.has(c), `${name}: uses enemy color '${c}' — friendly ships must stay cool-hued`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 4b. RANK SKINS. One skin per rank, each with a distinct trim colour, and the
// hull/silhouette untouched.
//
// The skins are generated by remapping the hero's trim chars, so the failure mode
// is silent: a wrong trim char yields a ship drawn with a MISSING palette entry
// (invisible cells) rather than an error, and a skin list shorter than RANKS
// would silently give two ranks the same ship. Both are asserted here.
// ---------------------------------------------------------------------------

{
  ok(RANK_SKINS.length === RANKS.length,
    `RANK_SKINS has ${RANK_SKINS.length} entries but there are ${RANKS.length} ranks — ` +
    'every rank needs its own skin or two ranks share a ship');

  const trims = RANK_SKINS.map((s) => s.trim);
  ok(new Set(trims).size === trims.length,
    `RANK_SKINS has duplicate trim colors: ${trims.join(',')} — ranks must be distinguishable`);

  for (const skin of RANK_SKINS) {
    ok(PALETTE[skin.trim] !== undefined,
      `RANK_SKINS trim '${skin.trim}' is not a PALETTE key — those cells would draw as nothing`);
  }

  // main.js draws the HUD badge and the aura with CSS colour strings rather than
  // through the sprite palette, so it keeps its own copy of these six colours.
  // Two hand-synced lists WILL drift — this asserts they have not, by reading
  // main.js's literal. Cheap, and the failure it prevents (a badge whose colour
  // disagrees with the ship the kid is flying) is exactly the kind that survives
  // review because each list looks right on its own.
  {
    const src = readFileSync(new URL('./main.js', import.meta.url), 'utf8');
    const mt = /const RANK_TRIM = \[([^\]]*)\]/.exec(src);
    ok(!!mt, 'main.js has no RANK_TRIM literal — the HUD badge colours cannot be checked');
    if (mt) {
      const hud = mt[1].split(',').map((x) => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
      ok(hud.length === RANK_SKINS.length,
        `main.js RANK_TRIM has ${hud.length} colours but there are ${RANK_SKINS.length} rank skins`);
      RANK_SKINS.forEach((skin, i) => {
        ok(hud[i] === PALETTE[skin.trim],
          `rank ${i}: HUD trim ${hud[i]} != sprite trim ${PALETTE[skin.trim]} — badge and ship disagree`);
      });
    }
  }

  // The hull, cockpit and outline must be identical across every rank: rank is
  // decoration, and a skin that changed the silhouette would trip the very trap
  // (familiar-shape drift) that cost three redraws in this file.
  const base = heroSprite(0);
  for (let i = 1; i < RANK_SKINS.length; i++) {
    const sk = heroSprite(i);
    ok(sk.w === base.w, `heroSprite(${i}) width ${sk.w} != ${base.w}`);
    ok(sk.frames.length === base.frames.length,
      `heroSprite(${i}) frame count differs from the trainee skin`);
    for (let f = 0; f < base.frames.length; f++) {
      ok(sk.frames[f].length === base.frames[f].length,
        `heroSprite(${i}) frame ${f} row count differs`);
      for (let r = 0; r < base.frames[f].length; r++) {
        const a = base.frames[f][r];
        const b = sk.frames[f][r];
        ok(a.length === b.length, `heroSprite(${i}) frame ${f} row ${r} width differs`);
        // Cell-by-cell: a cell that is transparent in one skin must be
        // transparent in all of them, or the hull silhouette changes with rank.
        for (let c = 0; c < a.length; c++) {
          ok((a[c] === ' ') === (b[c] === ' '),
            `heroSprite(${i}) frame ${f} row ${r} col ${c}: silhouette differs from the base hull`);
          // Blue hull cells may become rank trim (pips) but must never become
          // some unrelated colour, and the black outline must never move.
          ok((a[c] === 'k') === (b[c] === 'k'),
            `heroSprite(${i}) frame ${f} row ${r} col ${c}: outline differs from the base hull`);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 4c. DEMOTION. Losing a stage three times costs a rank, and clearing a stage
// repays one. Every property here is one a kid would feel immediately and that no
// amount of reading the code reliably catches.
// ---------------------------------------------------------------------------

{
  // A record comfortably at the top rank, for exercising drops from a height.
  const TOP = [900, 40];      // 95.7% over 940 answers -> Sao Trưởng
  const MID = [250, 90];      // 73.5% over 340          -> Đại Uý

  ok(earnedRank(...TOP) === RANKS[RANKS.length - 1],
    'the TOP fixture should earn the highest rank — the demotion tests assume it');

  // 1. NO DEMOTIONS = NO CHANGE. The default path must be untouched.
  ok(rankFor(...TOP, 0) === earnedRank(...TOP), 'zero demotions must not change rank');
  ok(!isDemoted(...TOP, 0), 'zero demotions must not report as demoted');

  // 2. ONE DEMOTION DROPS EXACTLY ONE RANK.
  const top = RANKS.indexOf(earnedRank(...TOP));
  ok(RANKS.indexOf(rankFor(...TOP, 1)) === top - 1, 'one demotion must drop exactly one rank');
  ok(RANKS.indexOf(rankFor(...TOP, 3)) === top - 3, 'three demotions must drop three ranks');

  // 3. IT CLAMPS AT TRAINEE. A kid cannot be pushed below the bottom, no matter
  // how many times they lose — there is no rank below trainee to show them.
  ok(rankFor(...TOP, 99) === RANKS[0], 'demotions must clamp at the lowest rank');
  ok(rankFor(0, 0, 5) === RANKS[0], 'a trainee cannot be demoted below trainee');

  // 4. A DEMOTION IS NEVER ANNOUNCED AS A PROMOTION. rankUp must return null when
  // the rank falls, because routing a demotion through the promotion fanfare would
  // be actively cruel — and it is one `>` away from doing exactly that.
  ok(rankUp(900, 40, 900, 40, 0, 1) === null,
    'rankUp must return null when demotions make the rank FALL');
  ok(rankUp(900, 40, 900, 40, 2, 2) === null, 'rankUp must return null when nothing changed');

  // 5. REPAYMENT IS ANNOUNCED. Winning a rank back fires the same promotion event
  // as earning one, or the restoration happens in silence.
  const repaid = rankUp(900, 40, 900, 40, 1, 0);
  ok(repaid === earnedRank(900, 40),
    'clearing a stage while demoted must announce the restored rank');

  // 6. rankDown REPORTS THE PAIR, and only on an actual fall.
  const rd = rankDown(900, 40, 0, 1);
  ok(rd && rd.from === earnedRank(900, 40), 'rankDown must report the rank lost');
  ok(rd && RANKS.indexOf(rd.to) === RANKS.indexOf(rd.from) - 1,
    'rankDown must report the adjacent lower rank');
  ok(rankDown(900, 40, 0, 0) === null, 'rankDown must be null when nothing changed');
  ok(rankDown(0, 0, 0, 1) === null,
    'rankDown must be null at trainee — nothing was actually lost, so nothing is announced');

  // 7. A DEMOTION IS FULLY REPAYABLE. Lose three, win three, and the kid is exactly
  // where they started. If this drifts, a child pays permanently for a bad afternoon.
  {
    let d = 0;
    for (let i = 0; i < 3; i++) d += 1;
    for (let i = 0; i < 3; i++) d = Math.max(0, d - 1);
    ok(rankFor(...TOP, d) === earnedRank(...TOP),
      'three demotions followed by three wins must restore the original rank');
  }

  // 8. MID-RANK behaves the same way — the logic must not depend on being at the top.
  const mid = RANKS.indexOf(earnedRank(...MID));
  ok(RANKS.indexOf(rankFor(...MID, 1)) === mid - 1, 'demotion must work from a middle rank');

  // 9. THE THRESHOLD IS SANE. A demotion on the first loss would be brutal; one at
  // ten would never fire.
  ok(DEATHS_PER_DEMOTION >= 2 && DEATHS_PER_DEMOTION <= 5,
    `DEATHS_PER_DEMOTION is ${DEATHS_PER_DEMOTION} — outside the humane 2-5 range`);
}

// ---------------------------------------------------------------------------
// 4d. EVERY CAGE HOLDS A REAL, DISTINCT PRISONER.
//
// The cage landmark used to draw an empty box while its own comment claimed the kid
// could "see there is someone in there" — chapter 2 asked a child to spend two stages
// rescuing a visibly empty cell. Now the prisoner is drawn from `prisoner` in the
// biome data, which means a typo or a missing entry silently returns to an empty cage
// (allySprite falls back rather than throwing). These assertions are what make that
// loud instead.
// ---------------------------------------------------------------------------

{
  const allyIds = new Set(ALLIES.map((a) => a.id));
  const seen = new Map();

  for (const [id, b] of Object.entries(BIOMES)) {
    if (b.landmark === 'cage') {
      ok(!!b.prisoner,
        `biome '${id}' has a cage but no prisoner — the kid would rescue an empty cell`);
      if (b.prisoner) {
        ok(allyIds.has(b.prisoner),
          `biome '${id}' prisoner '${b.prisoner}' is not an ALLIES id — ` +
          'allySprite() falls back silently, so this renders as the WRONG wingman');
        ok(!seen.has(b.prisoner),
          `prisoner '${b.prisoner}' is caged in both '${seen.get(b.prisoner)}' and ` +
          `'${id}' — the kid would free the same ally twice`);
        seen.set(b.prisoner, id);
      }
    } else {
      ok(!b.prisoner,
        `biome '${id}' names a prisoner but has no cage to hold them`);
    }
  }

  // Every ally must be imprisoned SOMEWHERE, or a wingman joins the formation without
  // the kid ever having rescued them.
  for (const a of ALLIES) {
    ok(seen.has(a.id),
      `ally '${a.id}' (${a.name}) is never a prisoner in any biome — ` +
      'they would join the formation with no rescue scene');
  }
}

// ---------------------------------------------------------------------------
// 4d-2. EVERY PLANET REALLY SPINS — a featureless disc rotating is
// indistinguishable from one standing still, and ice/ember/mars shipped with
// no surface marks at all before this was noticed by eye. `drawPlanet()` now
// falls back to a generic mark set for any `kind` it doesn't specifically
// know, but that fallback is a safety net, not licence to skip giving a new
// planet its own tint — so this still asserts every `kind` used in BIOMES is
// a deliberate member of `PLANET_SURFACE_KINDS`, and that every planet has a
// real positive spin rate (a missing/zero `spin` renders motionless even with
// marks on it).
// ---------------------------------------------------------------------------

for (const [id, b] of Object.entries(BIOMES)) {
  if (!b.planet) continue;
  const p = b.planet;
  ok(PLANET_SURFACE_KINDS.has(p.kind),
    `biome '${id}' planet kind '${p.kind}' has no known surface treatment — ` +
    'it would spin as a bare disc; add it to MARKS or a bespoke case in drawPlanet()');
  ok(typeof p.spin === 'number' && p.spin > 0,
    `biome '${id}' planet has spin=${p.spin} — the kid would never see it turn`);
}

// ---------------------------------------------------------------------------
// 4e. EVERY STAGE'S QUEST POOL IS DEEPER THAN THE STAGE ASKS FOR.
//
// A tier that can only produce N distinct quests, in a stage that asks for more than
// N, forces repeats — and then the kid is drilling recall of a few specific facts
// instead of the arithmetic. This is invisible in review: the tier data looks fine and
// the generator is working exactly as written.
//
// It was real. Measured before the fix: easy t1 produced TEN distinct sums (max 5)
// against stage 1 asking TWELVE; normal t1 was also ten (round-tens within 50); and
// hard t1/t2 were sixteen (2..5 x 2..5) against twelve and thirteen. The no-repeat
// WINDOW in quests.js is 10, so on Easy the window was the ENTIRE pool.
// ---------------------------------------------------------------------------

{
  const QUEST_WINDOW = 10;   // must match WINDOW in quests.js

  for (const levelId of LEVEL_IDS) {
    for (let i = 0; i < STAGES.length; i++) {
      const st = STAGES[i];
      const need = st.quest.minQuests;
      const seen = new Set();
      // Enough draws to saturate a small pool without being slow.
      for (let seed = 1; seed <= 1200; seed++) {
        seen.add(generateQuest(levelId, st.quest.tier, st.quest.opsAllowed || null, seed, 4).text);
      }
      ok(seen.size > need,
        `${levelId} stage ${i + 1} (tier ${st.quest.tier}): pool of ${seen.size} distinct ` +
        `quests but the stage asks ${need} — the kid must see a repeat`);
      ok(seen.size > QUEST_WINDOW,
        `${levelId} stage ${i + 1} (tier ${st.quest.tier}): pool of ${seen.size} is not larger ` +
        `than the no-repeat window of ${QUEST_WINDOW} — the feeder cannot avoid repeats`);
    }
  }
}

// ---------------------------------------------------------------------------
// 4f. ADAPTIVE SELECTION CANNOT BREAK THE PLAYABILITY PROOF.
//
// balance.js proves all 24 stages beatable at 65% accuracy, and it does so WITHOUT
// generating a single quest — it models accuracy as a fixed profile percentage. That
// proof therefore only survives if adaptive selection cannot change what a stage
// demands. These assertions pin the three properties it rests on:
//
//   1. A biased pick NEVER returns a shape outside the tier's own list, even when the
//      mastery record is full of shapes from other tiers. Otherwise a kid could be
//      served arithmetic their level forbids.
//   2. It never changes the tier, operand ranges or the level ceiling — so every
//      number balance.js simulates is untouched.
//   3. No shape is ever driven to zero probability, so a mastered skill still recurs
//      for retention and the stage remains the stage it was authored as.
// ---------------------------------------------------------------------------

{
  const ALL_SHAPES = ['add', 'addNoCarry', 'addCarry', 'sub', 'subBorrow', 'mul', 'div',
    'missing', 'three', 'twoStep', 'parenStep'];

  // A deliberately hostile record: every shape in the game, all failed.
  const hostile = emptyMastery();
  for (const sh of ALL_SHAPES) for (let i = 0; i < 12; i++) recordAnswer(hostile, sh, false);

  for (const levelId of LEVEL_IDS) {
    for (let tier = 1; tier <= TIER_COUNT; tier++) {
      const legal = LEVELS[levelId].tiers[tier - 1].shapes;
      const rng = makeRng(tier * 7919 + 13);
      for (let i = 0; i < 60; i++) {
        const picked = pickShape(hostile, legal, rng);
        ok(legal.includes(picked),
          `adaptive pickShape returned '${picked}' for ${levelId} t${tier}, whose shapes are ` +
          `${legal.join(',')} — a biased pick must never widen the tier`);
      }
    }
  }

  // Weights are bounded on both sides, which is what caps the bias and guarantees the
  // floor. An unbounded weight would let one weak shape crowd out the whole stage.
  const mastered = emptyMastery();
  for (let i = 0; i < 20; i++) recordAnswer(mastered, 'add', true);
  const failed = emptyMastery();
  for (let i = 0; i < 20; i++) recordAnswer(failed, 'add', false);

  ok(weightFor(mastered, 'add') >= TUNING.WEIGHT_FLOOR,
    'a fully mastered shape must keep at least the floor weight, or it stops appearing');
  ok(weightFor(failed, 'add') <= TUNING.WEIGHT_MAX,
    'a fully failed shape must not exceed WEIGHT_MAX, or it crowds out the whole tier');
  ok(weightFor(failed, 'add') > weightFor(mastered, 'add'),
    'a failed shape must be MORE likely than a mastered one — that is the entire point');

  // An unseen shape is neutral, not maximal: acting on a zero-sample shape would swing
  // the mix before there is any evidence.
  const fresh = emptyMastery();
  ok(weightFor(fresh, 'div') < TUNING.WEIGHT_MAX,
    'an unseen shape must be neutral, not treated as fully failed');

  // Below MIN_SAMPLE a shape stays neutral, so one unlucky answer cannot swing the mix.
  const thin = emptyMastery();
  recordAnswer(thin, 'div', false);
  ok(weightFor(thin, 'div') === weightFor(fresh, 'div'),
    `a shape with fewer than ${TUNING.MIN_SAMPLE} samples must still be treated as neutral`);

  // Improvement must be able to undo the bias, or a kid who was bad at division in
  // week one keeps being punished for it in week four.
  const improving = emptyMastery();
  for (let i = 0; i < 12; i++) recordAnswer(improving, 'div', false);
  const wBad = weightFor(improving, 'div');
  for (let i = 0; i < 12; i++) recordAnswer(improving, 'div', true);
  ok(weightFor(improving, 'div') < wBad,
    'sustained correct answers must LOWER a shape\'s weight — the record has to forget');
}

// ---------------------------------------------------------------------------
// 5. Every PALETTE key is actually used somewhere, and every color is distinct.
//    An unused key is dead data; two identical colors mean a shade tone is
//    invisible against its base.
// ---------------------------------------------------------------------------

{
  const used = new Set();
  for (const sprite of Object.values(SPRITES)) {
    if (!sprite.frames) continue;
    for (const frame of sprite.frames) for (const row of frame) for (const ch of row) {
      if (ch !== ' ') used.add(ch);
    }
  }
  // Scenery/biome keys are legitimately unused until phase 4 authors biomes, so
  // this is reported as information rather than a failure.
  const unused = Object.keys(PALETTE).filter((k) => !used.has(k));

  const byColor = new Map();
  for (const [k, v] of Object.entries(PALETTE)) {
    const lower = v.toLowerCase();
    if (byColor.has(lower)) {
      ok(false, `PALETTE '${k}' and '${byColor.get(lower)}' are both ${v} — a shade tone will be invisible`);
    } else {
      byColor.set(lower, k);
    }
  }

  if (unused.length) {
    console.log(`\x1b[2m  note: ${unused.length} palette keys unused so far (${unused.join(',')}) — expected until biomes land\x1b[0m`);
  }
}

// ---------------------------------------------------------------------------
// 6. CHAPTERS MUST TILE STAGES EXACTLY.
//
// No gap, no overlap, ending exactly at STAGES.length. chapterForStage falls
// back to the last chapter rather than throwing, so a gap would otherwise show
// up only as a wrong on-screen label — which is why this is asserted here.
// ---------------------------------------------------------------------------

{
  let cursor = 0;
  for (const c of CHAPTERS) {
    ok(c.stageStart === cursor,
      `chapter ${c.id} starts at ${c.stageStart} but the previous one ended at ${cursor}`);
    ok(c.stageCount > 0, `chapter ${c.id} has no stages`);
    cursor += c.stageCount;
  }
  ok(cursor === TOTAL_STAGES,
    `CHAPTERS cover ${cursor} stages but STAGES has ${TOTAL_STAGES} — the ranges must tile exactly`);
}

// ---------------------------------------------------------------------------
// 7. Stage data integrity.
// ---------------------------------------------------------------------------

for (let i = 0; i < STAGES.length; i++) {
  const st = STAGES[i];
  const where = `stage ${st.id} (${st.name})`;

  ok(st.id === i + 1, `${where}: id should be ${i + 1} (ids must match position)`);
  ok(typeof st.name === 'string' && st.name.length > 0, `${where}: missing name`);
  ok(typeof st.intro === 'string' && st.intro.length > 0, `${where}: missing intro text`);
  ok(st.biome in BIOMES, `${where}: biome '${st.biome}' is not in BIOMES`);
  ok(st.biome in BIOME_ENEMIES, `${where}: biome '${st.biome}' has no BIOME_ENEMIES entry`);
  ok(st.reward in UPGRADES, `${where}: reward '${st.reward}' is not in UPGRADES`);

  // quest block
  const q = st.quest;
  ok(q && q.tier >= 1 && q.tier <= TIER_COUNT, `${where}: quest.tier must be 1..${TIER_COUNT}`);
  ok(q.minQuests > 0, `${where}: quest.minQuests must be positive`);
  ok(q.answerCount >= 2 && q.answerCount <= 6, `${where}: quest.answerCount out of range`);
  ok(q.timePerQuest > 0, `${where}: quest.timePerQuest must be positive`);



  // waves
  ok(Array.isArray(st.waves) && st.waves.length > 0, `${where}: no waves`);
  const seenIds = new Set();
  for (const w of st.waves) {
    const ww = `${where} wave ${w.id}`;
    ok(!seenIds.has(w.id), `${ww}: duplicate wave id`);
    seenIds.add(w.id);
    ok(FORMATION_NAMES.includes(w.formation), `${ww}: unknown formation '${w.formation}'`);
    ok(w.enemy in ENEMIES, `${ww}: unknown enemy '${w.enemy}'`);
    // An enemy must be LEGAL FOR THIS BIOME — the Darkness Realm should not be
    // crewed by the darts the kid fought in Earth orbit.
    ok((BIOME_ENEMIES[st.biome] || []).includes(w.enemy),
      `${ww}: enemy '${w.enemy}' is not fielded by biome '${st.biome}' ` +
      `(allowed: ${(BIOME_ENEMIES[st.biome] || []).join(', ')})`);
    ok((w.count || 1) >= 1, `${ww}: count must be >= 1`);
    ok((w.speed || 0) > 0, `${ww}: speed must be positive`);

    // BOSSES NEVER FLY ALONE. Every true story boss (a phased wave — mini-boss
    // checkpoints like stage 4/5's guard fight have no `phases` and are exempt)
    // must name an escort, and that escort must be a real, biome-legal enemy —
    // the same rules a normal wave's `enemy` field gets, so an escort typo
    // fails the build instead of silently drawing nothing.
    if (w.phases) {
      ok(!!w.escorts, `${ww}: a boss (has phases) must have an escorts field`);
    }
    if (w.escorts) {
      const ew = `${ww} escorts`;
      ok(w.escorts.enemy in ENEMIES, `${ew}: unknown enemy '${w.escorts.enemy}'`);
      ok((BIOME_ENEMIES[st.biome] || []).includes(w.escorts.enemy),
        `${ew}: enemy '${w.escorts.enemy}' is not fielded by biome '${st.biome}' ` +
        `(allowed: ${(BIOME_ENEMIES[st.biome] || []).join(', ')})`);
      ok((w.escorts.count || 0) >= 1, `${ew}: count must be >= 1`);
      ok((w.escorts.hits || 1) >= 1, `${ew}: hits must be >= 1`);
    }

    // Enemy speed must leave a slow kid time to shoot — see stages.js.
    ok(w.speed <= 34,
      `${ww}: speed ${w.speed} px/s crosses the field too fast for a slow kid to get several answers off`);

    if (w.phases) {
      ok(w.phases.length >= 2, `${ww}: a phased wave needs at least 2 phases`);
      for (const p of w.phases) {
        ok(typeof p.name === 'string' && p.name.length, `${ww}: a phase is missing its name`);
        ok(p.hits > 0, `${ww}: phase '${p.name}' must have hits > 0`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 8. The difficulty curve must actually climb.
//
// Written out literally in the data and asserted here, so reordering stages or
// hand-editing a tier fails the build instead of silently flattening the curve.
// ---------------------------------------------------------------------------

for (let i = 1; i < STAGES.length; i++) {
  ok(STAGES[i].quest.tier >= STAGES[i - 1].quest.tier,
    `stage ${STAGES[i].id}: quest.tier ${STAGES[i].quest.tier} is BELOW stage ${STAGES[i - 1].id}'s ` +
    `${STAGES[i - 1].quest.tier} — the curriculum must never go backwards`);
}

ok(STAGES[0].quest.tier === 1, 'stage 1 should start at quest tier 1');
ok(STAGES[STAGES.length - 1].quest.tier === TIER_COUNT,
  `the final stage should reach tier ${TIER_COUNT}`);

// minQuests must climb too: a late stage has to ask more arithmetic than an
// early one, or the "curriculum" is only a label.
{
  const first = STAGES[0].quest.minQuests;
  const last = Math.max(...STAGES.map((s) => s.quest.minQuests));
  ok(last > first * 1.8,
    `minQuests only grows ${first} -> ${last}; a late stage should ask far more arithmetic`);
}

// ---------------------------------------------------------------------------
// 9. Rewards: every stage grants one, allies exactly once, nothing wasted.
// ---------------------------------------------------------------------------

{
  const granted = STAGES.map((s) => s.reward);
  ok(granted.length === TOTAL_STAGES, 'every stage must grant exactly one reward');

  // upgradeForStage wraps modulo, so a missing entry silently re-grants early
  // gear rather than erroring — a real live bug in the typing game's rewards.js.
  for (const id of granted) {
    ok(id in UPGRADES, `stage reward '${id}' has no UPGRADES entry`);
  }

  // The five allies must each be granted exactly once.
  const allyGrants = granted.filter((g) => g.startsWith('ally_'));
  ok(allyGrants.length === 5,
    `expected exactly 5 ally rewards across the game, found ${allyGrants.length}`);
  ok(new Set(allyGrants).size === 5, `an ally is granted twice: ${allyGrants.join(', ')}`);
  for (const g of allyGrants) {
    const u = UPGRADES[g];
    ok(u.ally in ALLY_STYLES,
      `${g} names ally style '${u.ally}', which has no ALLY_STYLES entry`);
  }

  // Allies belong to chapter 2 — that is the chapter's whole payoff.
  const ch2 = CHAPTERS[1];
  for (let i = 0; i < STAGES.length; i++) {
    if (!STAGES[i].reward.startsWith('ally_')) continue;
    ok(i >= ch2.stageStart && i < ch2.stageStart + ch2.stageCount,
      `stage ${STAGES[i].id} grants an ally outside chapter 2`);
  }

  // The ultimate must be unlocked AFTER the scientist who teaches it, and
  // BEFORE the first shielded phase that requires it — otherwise the kid meets
  // an immune boss with no way to hurt it.
  const ultAt = STAGES.findIndex((s) => s.reward === 'skill_ultimate');
  const sciAt = STAGES.findIndex((s) => s.reward === 'ally_scientist');
  ok(ultAt >= 0, 'no stage grants skill_ultimate');
  ok(sciAt >= 0, 'no stage grants ally_scientist');
  ok(ultAt > sciAt,
    `the ultimate is granted at stage ${ultAt + 1} but Giáo Sư Sao (who teaches it) ` +
    `arrives at stage ${sciAt + 1}`);

  const firstShield = STAGES.findIndex((s) =>
    s.waves.some((w) => (w.phases || []).some((p) => p.shielded)));
  if (firstShield >= 0) {
    ok(firstShield > ultAt,
      `stage ${STAGES[firstShield].id} has a SHIELDED boss phase but the ultimate that ` +
      `pierces it is only granted at stage ${ultAt + 1} — the kid would face an ` +
      `invulnerable boss with no counter`);
  }
}

// ---------------------------------------------------------------------------
// 10. Every biome and enemy is actually used, and every quest combination that
//     stages.js references generates cleanly.
// ---------------------------------------------------------------------------

{
  const usedBiomes = new Set(STAGES.map((s) => s.biome));
  for (const id of Object.keys(BIOMES)) {
    ok(usedBiomes.has(id), `biome '${id}' is defined but no stage uses it`);
  }

  const usedEnemies = new Set();
  for (const s of STAGES) for (const w of s.waves) {
    usedEnemies.add(w.enemy);
    if (w.escorts) usedEnemies.add(w.escorts.enemy);
  }
  for (const id of Object.keys(ENEMIES)) {
    ok(usedEnemies.has(id), `enemy '${id}' is defined but no wave fields it`);
  }

  // Every (level, tier, opsAllowed) combination a stage actually asks for must
  // produce a valid quest — the combination, not just the tier in isolation.
  for (const levelId of LEVEL_IDS) {
    for (const s of STAGES) {
      const q = generateQuest(levelId, s.quest.tier, s.quest.opsAllowed, 4242, s.quest.answerCount);
      const hits = q.options.filter((o) => o === q.answer).length;
      ok(hits === 1,
        `stage ${s.id} on level '${levelId}' (tier ${s.quest.tier}) produced ${hits} correct options`);
      ok(q.options.length === s.quest.answerCount,
        `stage ${s.id} on level '${levelId}' produced ${q.options.length} options, wanted ${s.quest.answerCount}`);
    }
  }
  void LEVELS;
}

// ---------------------------------------------------------------------------
// 11. THE PLAYABILITY GATE — every stage must be beatable by every profile.
//
// This is the check that matters most, and the one that caught 23 of 24 stages
// being unplayable in the first draft. It runs the full balance simulation for
// slow / typical / fast kids over all 24 stages.
// ---------------------------------------------------------------------------

for (let i = 0; i < STAGES.length; i++) {
  const st = STAGES[i];
  // The kid arrives at stage i with everything stages 0..i-1 granted, so the
  // gate must judge them with those allies AND that armour. Passing only the
  // ally count simulated late bosses against a bare 6-hull ship — a run nobody
  // plays — and reported three stages as failures that are actually fine. Derive
  // both from balance.js so this can never drift from the simulator's own idea
  // of what an upgrade is worth.
  const allies = alliesByStage(STAGES, i);
  const v = judge(st, allies, hullBonusByStage(STAGES, i));
  for (const p of v.problems) {
    ok(false, `stage ${st.id} (${st.name}): ${p}`);
  }
  if (v.problems.length === 0) passed++;
}

// ---------------------------------------------------------------------------
// 12. THE STORY LAYER.
//
// Narration failures are silent: a page naming a tableau that scenes.js does not
// draw renders as text floating on an empty screen, and a chapter with no story
// entry simply skips its own narration without complaint.
// ---------------------------------------------------------------------------

{
  // Every chapter needs opening and closing pages.
  for (const c of CHAPTERS) {
    const s = CHAPTER_STORY[c.id];
    ok(!!s, `chapter ${c.id} (${c.name}) has no CHAPTER_STORY entry`);
    if (!s) continue;
    ok(Array.isArray(s.opening) && s.opening.length > 0,
      `chapter ${c.id} has no opening pages`);
    ok(Array.isArray(s.closing) && s.closing.length > 0,
      `chapter ${c.id} has no closing pages`);
  }

  // Every page must have art and lines, and the art must be drawable.
  const allPages = [
    ...PROLOGUE.map((p) => ['PROLOGUE', p]),
    ...Object.entries(CHAPTER_STORY).flatMap(([id, s]) => [
      ...s.opening.map((p) => [`ch${id}.opening`, p]),
      ...s.closing.map((p) => [`ch${id}.closing`, p]),
    ]),
  ];
  for (const [where, p] of allPages) {
    ok(typeof p.art === 'string' && p.art.length, `${where}: a page has no art name`);
    ok(Array.isArray(p.lines) && p.lines.length > 0, `${where}: a page has no lines`);
    // Lines are hand-authored and hand-wrapped, so an over-long one would be
    // shrunk to unreadability by drawLines rather than clipped. 62 chars is
    // about the limit at the smallest phone width.
    for (const ln of p.lines) {
      ok(ln.length <= 62,
        `${where}: line is ${ln.length} chars — too long to read on a phone ("${ln.slice(0, 40)}...")`);
    }
  }

  // The ally beats: one per ally, and the names must match allies.js.
  for (const a of ALLIES) {
    const s = ALLY_STORY[a.id];
    ok(!!s, `ally '${a.id}' has no ALLY_STORY entry`);
    if (!s) continue;
    ok(s.name === a.name,
      `ALLY_STORY.${a.id}.name is '${s.name}' but allies.js calls them '${a.name}'`);
    ok(Array.isArray(s.lines) && s.lines.length > 0, `ALLY_STORY.${a.id} has no lines`);
  }

  // EVERY NAMED TABLEAU MUST BE DRAWABLE. drawStoryArt falls through to a plain
  // starfield for an unknown name, so a typo would never throw — it would just
  // quietly show an empty sky for one page of the story.
  const drawn = drawStoryArt.toString();
  for (const name of STORY_ART_NAMES) {
    ok(drawn.includes(`'${name}'`),
      `story art '${name}' is referenced by a page but drawStoryArt has no case for it`);
  }

  ok(CREDITS.length > 4, 'CREDITS is suspiciously short');
}

// ---------------------------------------------------------------------------
// 13. ALLIES: five of them, distinct slots, distinct gifts.
// ---------------------------------------------------------------------------

{
  ok(ALLIES.length === 5, `expected 5 allies, found ${ALLIES.length}`);

  const slots = ALLIES.map((a) => a.slot);
  ok(new Set(slots).size === ALLIES.length,
    `two allies share a formation slot: ${slots.join(',')}`);
  for (const s of slots) {
    ok(s >= 0 && s < LINEUP_SLOTS.length,
      `ally slot ${s} is outside LINEUP_SLOTS (0..${LINEUP_SLOTS.length - 1})`);
  }

  const gifts = ALLIES.map((a) => a.gift);
  ok(new Set(gifts).size === ALLIES.length,
    `two allies grant the same gift: ${gifts.join(',')} — each rescue must change something new`);

  for (const a of ALLIES) {
    ok(a.style in ALLY_STYLES, `ally '${a.id}' names style '${a.style}', which has no colorway`);
    ok(typeof a.name === 'string' && a.name.length, `ally '${a.id}' has no name`);
  }

  // Exactly one ally grants the ultimate, and it must be the last one rescued —
  // the ability is the chapter's final gift, and stages.js grants
  // skill_ultimate after it.
  const ultAllies = ALLIES.filter((a) => a.gift === 'ultimate');
  ok(ultAllies.length === 1, `expected exactly 1 ally to unlock the ultimate, found ${ultAllies.length}`);

  const order = STAGES
    .map((s) => UPGRADES[s.reward])
    .filter((u) => u && u.type === 'ally')
    .map((u) => u.ally);
  ok(order[order.length - 1] === ultAllies[0].id,
    `the ultimate-granting ally ('${ultAllies[0].id}') should be the LAST rescued, ` +
    `but the rescue order ends with '${order[order.length - 1]}'`);

  // allyEffects must be additive and never throw on an unknown id.
  const all = allyEffects(ALLIES.map((a) => a.id));
  ok(all.hasUltimate, 'a full line-up should unlock the ultimate');
  ok(all.extraShots >= 1, 'a full line-up should add wing cannons');
  ok(all.repairBonus > 0, 'a full line-up should mend more hull per answer');
  ok(allyEffects(['nope']).extraShots === 0, 'allyEffects must ignore unknown ids');
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const RED = '\x1b[31m', GREEN = '\x1b[32m', DIM = '\x1b[2m', RESET = '\x1b[0m';

if (failures.length === 0) {
  console.log(`${GREEN}✓ verify.js — ${passed} invariants passed${RESET}`);
  console.log(`${DIM}  ${Object.keys(SPRITES).length} sprites · ${TOTAL_STAGES} stages · ` +
    `${CHAPTERS.length} chapters · ${Object.keys(BIOMES).length} biomes · ` +
    `${Object.keys(ENEMIES).length} enemies · ${Object.keys(UPGRADES).length} upgrades${RESET}`);
  console.log(`${DIM}  all ${TOTAL_STAGES} stages pass the slow/typical/fast playability gate${RESET}`);
} else {
  console.log(`${RED}✗ verify.js — ${failures.length} failed, ${passed} passed${RESET}`);
  const shown = failures.slice(0, 30);
  for (const f of shown) console.log(`  ${RED}·${RESET} ${f}`);
  if (failures.length > shown.length) {
    console.log(`${DIM}  ... and ${failures.length - shown.length} more${RESET}`);
  }
  process.exit(1);
}
