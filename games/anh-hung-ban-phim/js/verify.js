// verify.js — structural invariant checks across the game's DATA modules.
//
// `telex.test.js` already round-trips every WORD_POOLS entry through the Telex
// engine (and rejects mid-syllable tone keys), so word data is covered there.
// This script covers everything ELSE that is easy to get silently wrong when
// content is added by hand — and every check here corresponds to a bug that
// would only show up as a crash or a blank sprite mid-playthrough:
//
//   sprites    every frame row is exactly `w` chars, every row count is `h`,
//              every char is a PALETTE key (a typo'd char draws nothing).
//   stages     every stage names a biome that exists in BOTH biomes.js and
//              monsters.js, and every wave names a real pool + real skill.
//   chapters   the chapter ranges TILE the flat STAGES list exactly — no gap,
//              no overlap, nothing past the end. `chapterForStage` silently
//              falls back to the last chapter, so a gap is invisible in play.
//   rewards    there is a distinct reward for every stage. rewardForStage wraps
//              modulo REWARDS.length, so a short list silently re-grants gear.
//   monsters   every roster sprite id resolves in SPRITES.
//
// Run: node js/verify.js
//
// This is a plain node script, not a browser module — it imports the data
// modules only, never render.js/main.js (which need a DOM).

import { PALETTE, SPRITES, PRINCESS_STYLES, princessSprite, heroSprite } from './sprites.js';
import { STAGES, TOTAL_STAGES } from './stages.js';
import { CHAPTERS } from './chapters.js';
import { BIOMES } from './biomes.js';
import { BIOME_MONSTERS, monstersForBiome } from './monsters.js';
import { REWARDS, rewardForStage } from './rewards.js';
import { SKILLS, WORD_POOLS, SPECIAL_ORDER } from './skills.js';

let fail = 0;
let pass = 0;

function check(ok, label) {
  if (ok) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL  ${label}`);
  }
}

// --- Sprites: geometry + palette ---------------------------------------------
// A row that is one char too short shifts every pixel after it; a char that is
// not a PALETTE key draws nothing at all. Both are invisible in code review.
function checkSprite(name, sprite) {
  check(Number.isInteger(sprite.w) && sprite.w > 0, `${name}: w must be a positive integer`);
  check(Number.isInteger(sprite.h) && sprite.h > 0, `${name}: h must be a positive integer`);
  check(Array.isArray(sprite.frames) && sprite.frames.length > 0, `${name}: needs at least one frame`);
  if (!Array.isArray(sprite.frames)) return;

  sprite.frames.forEach((frame, fi) => {
    check(frame.length === sprite.h, `${name} frame ${fi}: ${frame.length} rows, expected h=${sprite.h}`);
    frame.forEach((row, ri) => {
      // Trailing spaces are transparent, so a row padded PAST `w` draws exactly
      // the same as an exact-width one — CREEP_SLIME ships that way (documented
      // in CLAUDE.md). What actually corrupts a sprite is *visible* content at or
      // beyond column w (it gets clipped) or a row that stops short mid-pattern
      // (every pixel after it shifts). So the invariant is on the trimmed row.
      const trimmed = row.replace(/\s+$/, '');
      check(trimmed.length <= sprite.w, `${name} frame ${fi} row ${ri}: content runs to column ${trimmed.length}, past w=${sprite.w} (${JSON.stringify(row)})`);
      check(row.length >= sprite.w, `${name} frame ${fi} row ${ri}: only ${row.length} chars, shorter than w=${sprite.w} (${JSON.stringify(row)})`);
      for (const ch of row) {
        if (ch === ' ') continue; // transparent
        check(ch in PALETTE, `${name} frame ${fi} row ${ri}: char ${JSON.stringify(ch)} is not a PALETTE key`);
      }
    });
  });
}

for (const [name, sprite] of Object.entries(SPRITES)) checkSprite(`SPRITES.${name}`, sprite);

// Every princess theme must build a valid sprite (the slot-char remap can
// produce a non-PALETTE char if a style names a key that doesn't exist).
for (const styleName of Object.keys(PRINCESS_STYLES)) {
  checkSprite(`princessSprite(${styleName})`, princessSprite(styleName));
}
checkSprite('princessSprite(default)', princessSprite(null));

// The hero with a tinted blade registers private-use PALETTE slots on demand;
// verify a tinted build is still geometrically valid and fully in-palette.
checkSprite('heroSprite(base)', heroSprite(null));
checkSprite('heroSprite(#e8622b)', heroSprite('#e8622b'));

// --- Stages: biome + wave references -----------------------------------------
const POOL_NAMES = new Set(Object.keys(WORD_POOLS));
const SKILL_NAMES = new Set(Object.keys(SKILLS));

STAGES.forEach((stage, i) => {
  const label = `STAGES[${i}] (${stage.name})`;
  check(!!stage.name, `${label}: needs a name`);
  check(!!stage.intro, `${label}: needs intro text`);
  check(Array.isArray(stage.waves) && stage.waves.length > 0, `${label}: needs waves`);

  // `biome` is optional per stages.js (falls back to the training field), but if
  // named it must exist in BOTH biomes.js (backdrop) and monsters.js (roster) —
  // a biome present in only one silently yields default slimes or a desert sky.
  if (stage.biome) {
    check(stage.biome in BIOMES, `${label}: biome '${stage.biome}' missing from BIOMES`);
    check(stage.biome in BIOME_MONSTERS, `${label}: biome '${stage.biome}' missing from BIOME_MONSTERS`);
  }

  // A princess stage must name a style that exists, or she silently renders as
  // the default purple gown instead of her own look.
  if (stage.princessStyle) {
    check(stage.princessStyle in PRINCESS_STYLES, `${label}: princessStyle '${stage.princessStyle}' not in PRINCESS_STYLES`);
  }

  (stage.waves || []).forEach((wave, wi) => {
    const wl = `${label} wave ${wi}`;
    check(['creep', 'elite', 'boss', 'stageboss'].includes(wave.type), `${wl}: bad type '${wave.type}'`);
    check(POOL_NAMES.has(wave.pool), `${wl}: pool '${wave.pool}' not in WORD_POOLS`);
    check(SKILL_NAMES.has(wave.skill), `${wl}: skill '${wave.skill}' not in SKILLS`);
  });
});

// --- Chapters: the ranges must tile STAGES exactly ---------------------------
// chapterForStage() falls back to the last playable chapter for an out-of-range
// index, so a gap between chapters shows up as a wrong chapter label rather than
// an error. Assert the tiling explicitly instead.
{
  const playable = CHAPTERS.filter((c) => c.stageCount > 0);
  let cursor = 0;
  playable.forEach((c) => {
    check(c.stageStart === cursor, `CHAPTERS[id=${c.id}]: stageStart ${c.stageStart}, expected ${cursor} (chapters must tile with no gap/overlap)`);
    check(!!c.name, `CHAPTERS[id=${c.id}]: needs a name`);
    cursor = c.stageStart + c.stageCount;
  });
  check(cursor === TOTAL_STAGES, `CHAPTERS cover ${cursor} stages, but STAGES has ${TOTAL_STAGES}`);

  // A comingSoon chapter should have no stages, and a playable one must not be
  // flagged comingSoon (the title/HUD would advertise a chapter you can play).
  for (const c of CHAPTERS) {
    if (c.comingSoon) check(c.stageCount === 0, `CHAPTERS[id=${c.id}]: comingSoon but has ${c.stageCount} stages`);
    else check(c.stageCount > 0, `CHAPTERS[id=${c.id}]: playable but has no stages`);
  }

  // Ids should be unique and ascending so "CHƯƠNG n" labels read in order.
  const ids = CHAPTERS.map((c) => c.id);
  check(new Set(ids).size === ids.length, `CHAPTERS: duplicate chapter ids ${ids.join(',')}`);
}

// --- Rewards: one distinct reward per stage ----------------------------------
// rewardForStage wraps modulo REWARDS.length, so a list shorter than STAGES
// silently re-grants earlier gear on the late stages.
check(REWARDS.length >= TOTAL_STAGES, `REWARDS has ${REWARDS.length} entries but there are ${TOTAL_STAGES} stages — late stages would re-grant earlier rewards`);
{
  const ids = REWARDS.map((r) => r.id);
  check(new Set(ids).size === ids.length, `REWARDS: duplicate ids (${ids.filter((id, i) => ids.indexOf(id) !== i).join(',')})`);
  REWARDS.forEach((r, i) => {
    const label = `REWARDS[${i}] (${r.id})`;
    check(!!r.name && !!r.desc, `${label}: needs name + desc`);
    check(['weapon', 'skill', 'artifact'].includes(r.type), `${label}: bad type '${r.type}'`);
    // A skill reward must name a real skill, or applyRewards silently drops it
    // and the kid never gets the ability the reward screen promised.
    if (r.type === 'skill') check(r.skill && r.skill in SKILLS, `${label}: skill '${r.skill}' not in SKILLS`);
  });
  // Every stage's reward must resolve.
  for (let i = 0; i < TOTAL_STAGES; i++) {
    check(!!rewardForStage(i), `rewardForStage(${i}) returned nothing`);
  }
  // Every special skill in the unlock ladder must actually be granted by some
  // reward, or resolveSkill can never step up to it.
  for (const id of SPECIAL_ORDER) {
    check(REWARDS.some((r) => r.type === 'skill' && r.skill === id), `SPECIAL_ORDER lists '${id}' but no reward grants it`);
    check(id in SKILLS, `SPECIAL_ORDER lists '${id}' which is not in SKILLS`);
  }
}

// --- Monsters: every roster sprite id resolves -------------------------------
for (const biome of Object.keys(BIOME_MONSTERS)) {
  const roster = monstersForBiome(biome);
  for (const key of ['creep', 'elite', 'boss', 'stageboss']) {
    check(roster[key] in SPRITES, `BIOME_MONSTERS.${biome}.${key}: sprite '${roster[key]}' not in SPRITES`);
  }
  check(!!roster.creepName && !!roster.bossName && !!roster.stagebossName, `BIOME_MONSTERS.${biome}: missing a display name`);
}

// Every biome that a stage uses should have its own roster entry (checked above)
// AND every BIOMES entry should be reachable from some stage — an orphan biome
// is dead weight that silently drifts out of sync with the story.
{
  const used = new Set(STAGES.map((s) => s.biome).filter(Boolean));
  for (const name of Object.keys(BIOMES)) {
    check(used.has(name), `BIOMES.${name} is not used by any stage`);
  }
}

// --- Skills: projectile/burst/effect completeness ----------------------------
for (const [id, skill] of Object.entries(SKILLS)) {
  const label = `SKILLS.${id}`;
  check(skill.id === id, `${label}: id field '${skill.id}' does not match its key`);
  check(!!skill.name, `${label}: needs a name`);
  check(!!skill.effect, `${label}: needs an effect name (dispatched by particles.play)`);
  check(!!skill.projectile && skill.projectile.count > 0, `${label}: needs a projectile with count > 0`);
  check(!!skill.burst, `${label}: needs a burst config`);
}

console.log(`\n${pass} passed, ${fail} failed, ${pass + fail} total`);
process.exit(fail ? 1 : 0);
