// main.js — entry point: the canvas render loop driving a state machine.
//
// THE CORE LOOP, and why it is shaped this way:
//
// The kid never steers or aims. A correct answer fires a volley; that is the
// whole verb. The failure mode is a slow fade rather than a sudden death — a kid
// who is slow at arithmetic still survives long enough to learn, while a fast one
// visibly gets stronger. That asymmetry is the whole design; anything that turns a
// wrong answer into instant death breaks it.
//
// A wrong answer breaks the combo. It never kills.
//
// ONE METER: ĐỘ BỀN TÀU VŨ TRỤ (the ship's durability). It drops when the ship is hit and when a
// monstership slips past, and a correct answer mends it a little.
//
// TWO RICHER IDEAS WERE TRIED HERE AND BOTH CUT. Worth knowing, because both
// looked good on paper:
//
//   * An ENERGY bar above the health bar. It drained on a clock and refilled on a
//     correct answer, so it only ever emptied if the kid stopped playing for two
//     minutes and then chipped health slowly — a second, slower health bar wearing
//     a different label. (Making it real ammunition was worse: refill 24 and spend
//     8 on the shot is a +16 refill with extra arithmetic, circular by
//     construction and unable to ever bite.)
//   * A SHIELD DOME over the formation that physically intercepted shots — solid
//     at full, porous when weakened. It looked great and was a persistent source
//     of bugs: the collision depended on the ship's own drift, the dome's arc, the
//     cell ring's rotation and the per-wave absorb all agreeing, and they kept not
//     agreeing. Shots tunnelled, missed by 40px, or were silently eaten by the
//     mercy window, and each "fix" moved the failure somewhere else.
//
// The lesson both times: for a 6-year-old, ONE legible number beats a clever
// system, and a mechanic whose correctness depends on four moving parts lining up
// will keep breaking. Health is a plain bar and a plain rule.
//
// ===========================================================================
// STATE MACHINE
//
//   TITLE ─→ STORY(prologue + ch.1 opening) ─→ TUTORIAL ─→ STAGE_INTRO → PLAYING
//                  (first play only; ESC skips)
//   PLAYING → STAGE_CLEAR (ship flies off-field) → VICTORY → UPGRADE ─┬─ ally reward ──→ ALLY_RESCUE ─┐
//                                └──────────────────────────────┴─┬─ mid-chapter
//                                                                 │   → STAGE_INTRO
//                                                                 └─ finale
//                                                                     → CHAPTER_END
//                                                                     → STORY(closing)
//                                        ├─ more chapters → STORY(next opening) → STAGE_INTRO
//                                        └─ final chapter → CREDITS → TITLE
//   PLAYING → FAILURE → retry the same stage (progress and upgrades are kept)
//
// EVERY state transition goes through setState(). One funnel means the arrival
// sound (and, from phase 7, the music track) is chosen in exactly one place;
// assigning `state` from a dozen call sites is how a victory jingle ends up
// playing every frame, or never.
//
// finishStory(after) is called both when the pages run out AND on skip, so
// skipping always lands exactly where reading would have. A story that stranded
// the player on skip would be worse than no story at all.

import {
  metrics, clear, drawText, drawTextBold, drawMeter, drawSpriteCentered,
  fillRoundRect, strokeRoundRect,
} from './render.js';
import { SPRITES, allySprite, heroSprite } from './sprites.js';
import { Ship, Enemy, Projectile, ENEMY_KIND } from './entities.js';
import { QuestBox } from './questbox.js';
import { QuestFeeder } from './quests.js';
import { InputHandler } from './input.js';
import { Starfield } from './starfield.js';
import { resolveFormation } from './formations.js';
import { ParticleSystem } from './effects.js';
import * as sfx from './audio.js';
import { playMusic, toggleMusic, duckMusic, isMusicMuted } from './music.js';
import { STAGES, TOTAL_STAGES, getStage } from './stages.js';
import { CHAPTERS, chapterForStage, stageNumberInChapter, isChapterFinale, isChapterStart, isFinalChapter } from './chapters.js';
import { ENEMIES } from './enemies.js';
import { drawBiomeBack, drawBiomeFront, getBiome } from './biomes.js';
import { bossFire, patternFor } from './bossattacks.js';
import { UPGRADES, applyUpgrades, loadProgress, saveProgress, resetProgress } from './upgrades.js';
import { ALLIES, LINEUP_SLOTS, allyEffects } from './allies.js';
import { PROLOGUE, CHAPTER_STORY, CREDITS } from './story.js';
import * as scenes from './scenes.js';
import { rankFor, rankUp, nextRankGoal, rankDown, earnedRank, isDemoted, RANKS, DEATHS_PER_DEMOTION } from './rank.js';
import { emptyMastery, weakestFirst } from './adaptive.js';

// ---------------------------------------------------------------------------
// Canvas setup
//
// The backing store is sized to devicePixelRatio for crisp pixel art, but every
// size in the game is authored in CSS px. So the context is scaled by dpr ONCE
// here and all drawing works in CSS px afterwards. Without this a 2x display
// halves every font's apparent size and every tap lands one card off.
// ---------------------------------------------------------------------------

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

let dpr = 1;

function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

function viewW() { return canvas.width / dpr; }
function viewH() { return canvas.height / dpr; }
resize();
window.addEventListener('resize', resize);

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const STATE = {
  TITLE: 'TITLE',
  STORY: 'STORY',
  TUTORIAL: 'TUTORIAL',
  STAGE_INTRO: 'STAGE_INTRO',
  PLAYING: 'PLAYING',
  STAGE_CLEAR: 'STAGE_CLEAR',
  VICTORY: 'VICTORY',
  ALLY_RESCUE: 'ALLY_RESCUE',
  CHAPTER_END: 'CHAPTER_END',
  FAILURE: 'FAILURE',
  CREDITS: 'CREDITS',
  REPORT: 'REPORT',
};

let state = STATE.TITLE;
let sceneT = 0;             // seconds since the current scene began
let hot = {};               // tap targets returned by the last scene draw

// Persisted progress.
let progress = loadProgress();
let level = progress.level || 'normal';
let stageIndex = 0;         // the stage being played right now
let earned = [];            // upgrade ids earned this run (mirrors progress.upgrades)

const LEVEL_ORDER = ['easy', 'normal', 'hard', 'hardest'];

function setState(next) {
  if (state === next) return;
  // ALWAYS clear the pause on a transition. A kid can be killed by an in-flight
  // shot on the same frame they pause, and a pause flag that survived into FAILURE
  // would freeze the retry screen — the flag gates updatePlaying, but nothing
  // stops it being read again the next time PLAYING is entered.
  paused = false;
  state = next;
  // The hero wears its rank in every scene, so refresh the scenes' copy here —
  // setState is the one funnel every transition passes through, which is the
  // same reason the arrival sound and the music track are chosen here.
  scenes.setRankIndex(currentRankIndex());
  sceneT = 0;
  hot = {};
  if (next === STATE.VICTORY) sfx.victory();
  else if (next === STATE.FAILURE) sfx.failure();
  else if (next === STATE.ALLY_RESCUE) sfx.allyJoin();
  else if (next === STATE.STAGE_CLEAR) sfx.flyout();
  playMusic(songForState());
}

// THE ONE PLACE THE SOUNDTRACK IS CHOSEN. No scene starts or stops music itself;
// setState() calls this and playMusic() is a no-op when the right song is already
// running. That matters because the battle theme follows the CHAPTER, not the
// stage — a new loop every stage would feel restless, and 24 restarts across a
// playthrough would make the soundtrack seem to stumble.
function songForState() {
  switch (state) {
    case STATE.TITLE: return 'title';
    case STATE.STORY: return 'story';
    case STATE.TUTORIAL: return 'story';
    case STATE.STAGE_INTRO: return 'story';
    case STATE.VICTORY: return 'victory';
    case STATE.ALLY_RESCUE: return 'rescue';
    case STATE.CHAPTER_END: return 'victory';
    case STATE.FAILURE: return 'failure';
    case STATE.CREDITS: return 'ending';
    // A calm, read-only screen reached from the title — the title's own track
    // fits it rather than inventing a new loop for one static report.
    case STATE.REPORT: return 'title';
    // STAGE_CLEAR shares PLAYING's track rather than falling to the default: the
    // fleet is already gone, but the ship is still flying out of the SAME stage,
    // and switching songs mid-flyout would announce the win before the VICTORY
    // screen does.
    case STATE.STAGE_CLEAR:
    case STATE.PLAYING: {
      // A boss wave in the blueprint switches the track for the whole stage, so
      // the kid hears the fight coming before it arrives.
      const stage = getStage(stageIndex);
      const hasBoss = stage.waves.some(
        (w) => w.formation === 'BOSS' || (w.phases && w.phases.length));
      if (hasBoss) return stageIndex === TOTAL_STAGES - 1 ? 'finalboss' : 'boss';
      return `battle${chapterForStage(stageIndex).id}`;
    }
    default: return 'title';
  }
}

// ---------------------------------------------------------------------------
// Runtime objects
// ---------------------------------------------------------------------------

const ship = new Ship();
const box = new QuestBox();
const stars = new Starfield(7);
const parts = new ParticleSystem();

let feeder = null;
let enemies = [];
let shots = [];
// Boss projectiles waiting on their stagger delay (volley / sweep patterns).
let delayedShots = [];
let allyShips = [];         // live wingmen, rebuilt at stage start
let combo = 0;
let bestCombo = 0;
// Counts down from COMBO_PULSE_DUR on every correct answer, driving the HUD
// combo label's "beat" (see drawHud) — a fresh pulse per answer rather than a
// constant idle animation, so the label visibly reacts to the kid's own input
// instead of animating on its own clock.
let comboPulseT = 0;
let escaped = 0;
let stageStats = { asked: 0, correct: 0, wrong: 0 };

// The ultimate.
let ultCharge = 0;
let ultReady = false;
const ULT_CHARGE_FULL = 5;

// Wave scheduling.
let waveIndex = 0;
let pending = [];
let waveActive = false;
let reinforceCount = 0;
let shieldLeft = 0;         // Vòm Xanh's per-wave absorb

// THE COMBO SHIELD (skill_shield, stage 5). ONE NUMBER, same lesson as the
// dome that was cut (see the file header): seconds remaining, nothing else.
// >0 means up. It blocks enemy PROJECTILE fire only — kamikaze dives and
// escape leakage still cost hull, because those are the deliberately-tuned
// exception to the mercy window (see the escape-bypass comment below) and
// swallowing them too would quietly undo that tuning.
//
// Distinct from shieldLeft (Vòm Xanh's per-wave one-hit absorb, above) and
// from a boss's `phases[].shielded` (enemy immunity) — three different
// "shield" words in this file for three unrelated things; comboShield names
// this one so it never gets confused with either.
let comboShield = 0;

// How many consecutive FAST (<=5s each) correct answers it takes to raise the
// combo shield. Counts only correct-and-fast answers in a row; a wrong answer
// or a correct-but-slow answer resets it to 0 (see shieldStreak below) — the
// shield is the reward for a run of speed, not a single lucky fast answer.
let shieldStreak = 0;

const MAX_REINFORCE = 6;

// An escaped monstership costs a fraction of a hull point, applied straight to
// ship.hull the instant it lands. The bar is a smooth meter, not a pip count, so
// a partial-point nick renders fine — each ship's impact moves it visibly and
// immediately, one ship at a time, rather than banking silently toward a later
// whole-point drop that lands on an arbitrary ship instead of the one the kid
// just watched ram the hull.
//
// It is deliberately SMALL, and the reason is a lesson from the energy version of
// this penalty: the cost is paid per ship, so it scales with how far behind the
// kid already is, and the kid furthest behind can least afford it. At a full hull
// point per escape a struggling player died to leakage alone while a strong player
// paid nothing — difficulty scaling backwards. A third of a point means letting a
// few through stings and is recoverable by answering.
const ESCAPE_HULL_COST = 0.34;

// Stagger for kamikaze dives, so a wave that breaks through together detonates
// in sequence. Grows as each ship commits and decays on a clock.
let diveQueue = 0;
// Countdown between low-shield reminder chirps.
let lowHullTimer = 0;
// The shield band shown last frame ('full' | 'warn' | 'critical'), so a change of
// state can be given its own moment rather than sliding by unnoticed.

// Fractional hull repair earned by answering correctly — see updatePlaying.
let hullRepair = 0;
// Scaled so a kid answering steadily out-heals a boss's chip damage.
//
// At 0.2 a slow kid earned ~1.4 hull across a whole boss fight against ~8 points
// of incoming chip — they died at 200-300s with the boss's bar nearly empty,
// which is the worst possible failure: a long fight lost to attrition rather than
// to anything they could see. At 0.5, one correct answer is half a hull point,
// so a slow kid answering every 12s heals ~0.04/sec against a boss's ~0.075 —
// still losing ground, but slowly enough that the hull upgrades cover it.
const HULL_REPAIR_PER_CORRECT = 0.5;

// How long the HUD combo label's beat lasts after each correct answer. Short
// enough that back-to-back answers each read as their own beat rather than
// one long wobble, long enough to actually see on a single slow answer.
const COMBO_PULSE_DUR = 0.35;

// How many seconds the combo shield stands once raised/refreshed, and how
// long before it expires the HUD starts warning it is about to drop.
const COMBO_SHIELD_DURATION = 5;
const COMBO_SHIELD_WARN_AT = 3;

// The streak length that raises the combo shield in the first place.
const COMBO_SHIELD_STREAK = 5;

let lastRankUp = null;
let muteHint = '';
let muteHintT = 0;

// PAUSE. A flag on PLAYING rather than a state in the machine, deliberately: a
// STATE.PAUSED would need its own entry in setState(), songForState(), the click
// router and the draw switch, and every one of those is a place to forget that
// resuming must land back in the middle of a live stage with its fleet intact.
// A flag gates one call (updatePlaying) and cannot lose the stage.
//
// It freezes the WORLD, not the frame: the loop keeps running so the pause screen
// can breathe, but nothing in the play field advances.
let paused = false;

// THE CONTROL BUTTONS' TAP TARGETS, published by drawHud() each frame.
//
// Stored rather than recomputed in the pointer handler for the reason
// questbox.layout() is pure: two code paths computing the same rects independently
// drift, and the failure mode is a button that looks tappable and is not — exactly
// the bug the input module is written to avoid. One writer, one reader.
let ctrlBtns = [];

// A SEPARATE CLOCK FOR THE PLAY FIELD, frozen while paused.
//
// `sceneT` cannot be frozen instead: it drives the pause overlay's own pulse and
// the mute toast, which must keep breathing so a paused game still looks alive
// rather than crashed. But it ALSO drives the ship and ally sprite frames, the
// biome and the rank aura — so using it for those while paused would leave
// thrusters flickering over a stopped fleet, which reads as a bug, not a pause.
let fieldT = 0;

// Story queue. `after` names where the narration hands off, so skipping and
// reading land in the same place.
let story = { pages: [], page: 0, after: 'stage' };
let tutorialIndex = 0;

// ---------------------------------------------------------------------------
// Derived stats — recomputed from `earned` so a retry never double-applies.
// ---------------------------------------------------------------------------

function derived() {
  const up = applyUpgrades(earned);
  const al = allyEffects(up.allies);
  return { up, al };
}

function allyIds() {
  return applyUpgrades(earned).allies;
}

// ---------------------------------------------------------------------------
// Stage lifecycle
// ---------------------------------------------------------------------------

function startStage(i) {
  stageIndex = Math.max(0, Math.min(TOTAL_STAGES - 1, i));
  const stage = getStage(stageIndex);
  const { up, al } = derived();

  // The mastery record rides along, so quest selection leans toward the shapes this
  // kid keeps missing. It persists across stages and sessions (progress.mastery) —
  // that is the point: a fixed ladder teaches the average kid, and this one adapts.
  feeder = new QuestFeeder(level, stage.quest, 12345 + stageIndex * 7919, progress.mastery);
  parts.clear();
  enemies = [];
  shots = [];
  delayedShots = [];
  pending = [];
  waveIndex = 0;
  waveActive = false;
  reinforceCount = 0;
  escaped = 0;
  diveQueue = 0;
  combo = 0;
  bestCombo = 0;
  comboPulseT = 0;
  comboShield = 0;
  shieldStreak = 0;
  ultCharge = 0;
  ultReady = false;
  hullRepair = 0;
  lowHullTimer = 0;
  stageStats = { asked: 0, correct: 0, wrong: 0 };


  ship.maxHull = 6 + up.hullBonus;
  ship.hull = ship.maxHull;
  ship.invuln = 0;
  ship.weapon.damage = up.damage;
  ship.weapon.sprite = up.shotSprite;
  ship.weapon.tint = up.shotTint;
  ship.weapon.baseShots = 1 + up.extraShots + al.extraShots;
  ship.weapon.shots = ship.weapon.baseShots;
  ship.weapon.spread = 0;

  shieldLeft = al.shieldPerWave;

  // Rebuild the wingman line-up.
  const m = metrics(viewW(), viewH());
  ship.place(m);
  allyShips = allyIds().map((id) => {
    const a = ALLIES.find((x) => x.id === id);
    const slot = LINEUP_SLOTS[a.slot];
    return { id, style: a.style, slot, x: ship.x, y: ship.y, fireT: Math.random() * 0.5 };
  });

  box.setQuest(feeder.next());

  // The stage is fully built, but the kid sees STAGE_INTRO first — its name, its
  // mission line, and their current line-up. Going straight to PLAYING means a
  // wave is already descending before the kid has read what they are doing here,
  // and it throws away the one screen where the growing team is on display.
  setState(STATE.STAGE_INTRO);
}

function launchWave(stage, wave, m) {
  const slots = resolveFormation(wave.formation, wave.count, wave.gap ?? 0.5);
  for (let i = 0; i < slots.length; i++) {
    pending.push({ delay: slots[i].delay, spec: wave, x: slots[i].fx * m.w, index: i });
  }
  waveActive = true;
  // Vòm Xanh's shield refreshes each wave — that is what makes it feel like
  // ongoing protection rather than a one-off.
  shieldLeft = derived().al.shieldPerWave;

  // BOSSES NEVER FLY ALONE. `escorts` on a BOSS wave spawns 1-2 elites
  // flanking it, fixed left/right of centre rather than in the formation
  // resolver (which always centres a BOSS wave regardless of count — that's
  // right for the boss itself, wrong for a bodyguard). They share the boss's
  // speed/standGap so they arrive and hold at the same depth, a beat after
  // the boss so it's the first thing the kid sees land.
  //
  // They do NOT converge to the firing lane (see the standGap check in
  // spawnEnemy) — a bodyguard that funnels into the centre column stops
  // being a flanking escort and becomes just another creep. Because they
  // hold rather than time out, `enemies.length` only reaches 0 once they are
  // ALSO dead — the escort is a real part of the fight, not decoration.
  if (wave.escorts) {
    const esc = wave.escorts;
    const spec = {
      id: `${wave.id}_escort`,
      enemy: esc.enemy,
      hits: esc.hits ?? 1,
      speed: wave.speed,
      standGap: wave.standGap,
      fireEvery: esc.fireEvery ?? 0,
      fireDamage: esc.fireDamage ?? 1,
    };
    const n = esc.count ?? 2;
    const spacing = 110; // px either side of the boss's own centre lane
    for (let i = 0; i < n; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const rank = Math.floor(i / 2) + 1;
      pending.push({ delay: 0.4 + rank * 0.15, spec, x: m.cx + side * spacing * rank, index: i });
    }
  }
}

// CONVERGENCE (entities.js) pulls every non-boss ship toward the exact same
// laneX, so a wave of several ships that all survive to the final approach
// used to collapse onto the same pixel column — several sprites reading as
// one overlapping blob right where the kid is looking. LANE_SLOTS gives each
// spawn index a small, FIXED offset from that column instead of the same
// point.
//
// The magnitude is capped well under the smallest creep's hit-box half-width
// (drone/wraith, ~15-19px — see Enemy.halfW) so the kid's centre shot (the
// only shot fired at combo<3, dead on laneX) still connects. This is a visual
// fix only: it must never make an enemy the low-combo lead shot cannot reach,
// or it reintroduces the exact "unhittable enemy" bug convergence was built
// to fix (see entities.js's CONVERGENCE comment).
const LANE_SLOTS = [0, -7, 7, -12, 12];

function spawnEnemy(p, m) {
  const w = p.spec;
  const def = ENEMIES[w.enemy] || ENEMIES.dart;
  const sprite = SPRITES[def.sprite] || SPRITES.enemy_dart;
  const isBoss = w.formation === 'BOSS' || !!(w.phases && w.phases.length);
  enemies.push(new Enemy({
    id: `${w.id}_${p.index}_${reinforceCount}`,
    kind: isBoss ? ENEMY_KIND.BOSS : def.elite ? ENEMY_KIND.ELITE : ENEMY_KIND.CREEP,
    sprite,
    x: p.x,
    // A few px of spawn-time vertical stagger, cycling by index, so ships
    // that enter close together in time (small `gap`) don't also descend at
    // an identical y — it compounds with the lane offset above to keep a
    // packed wave from reading as one shape. Safe for hit detection: a shot
    // sweeps through every y as it travels, so this never affects whether it
    // connects, only how the fleet looks while it falls.
    y: m.playTop - 30 + (isBoss ? 0 : (p.index % 3 - 1) * 6),
    hits: w.hits ?? 1,
    speed: w.speed ?? 20,
    scale: def.scale,
    color: def.color,
    weave: w.weave ?? 'none',
    weaveAmp: m.w * 0.06,
    weavePhase: p.index * 0.7,
    fireEvery: w.fireEvery ?? 0,
    fireDamage: w.fireDamage ?? 1,
    standGap: w.standGap ?? 0,
    phases: w.phases ?? null,
    // Bosses hold position and are wide enough to be hit where they stand, so
    // they do not funnel. Everything else converges into the firing lane —
    // without that, a fixed-position ship firing straight up simply cannot hit
    // a formation spread across the width.
    //
    // Checked on standGap rather than isBoss alone, because a boss escort
    // (launchWave's `escorts`) ALSO holds at a fixed standGap depth and must
    // NOT funnel — a bodyguard that drifts into the centre column is just
    // another creep, not a flanking escort. No ordinary creep wave sets
    // standGap, so this changes nothing for any wave but a boss's or its escort's.
    converge: (isBoss || w.standGap > 0) ? 0 : 1.6,
    laneOffset: isBoss ? 0 : LANE_SLOTS[p.index % LANE_SLOTS.length],
    reinforcement: !!w.reinforcement,
    tier: def.tier,
    enemyId: w.enemy,
  }));
}

// ---------------------------------------------------------------------------
// Answering — the one place a quest turns into game state.
// ---------------------------------------------------------------------------

// A kid confirming STAGE_INTRO with Enter/Space and pressing it again out of habit
// (a very natural "press to continue" double-tap) used to land the second keydown
// straight in PLAYING, where Enter/Space answers the focused card — burning the
// first quest with a wrong answer the kid never saw, let alone clicked. sceneT
// resets to 0 in setState() on every transition, so gating on it for a beat blocks
// that leftover keystroke without a kid who is actually reading ever noticing —
// a real answer takes far longer than this to arrive.
const ANSWER_GUARD = 0.3;

function pickAnswer(index) {
  if (state !== STATE.PLAYING || box.locked || !box.quest) return;
  if (sceneT < ANSWER_GUARD) return;
  if (index < 0 || index >= box.quest.options.length) return;

  const res = feeder.answer(index);
  box.showResult(index, res.correct);
  stageStats.asked = feeder.asked;
  stageStats.correct = feeder.correct;
  stageStats.wrong = feeder.wrong;

  const { up, al } = derived();

  if (res.correct) {
    // A correct answer mends the hull a little. This is the only recovery in the
    // game, and it keeps the promise intact: arithmetic is the verb, so arithmetic
    // is also the remedy.
    hullRepair += HULL_REPAIR_PER_CORRECT + up.repairBonus + al.repairBonus;
    combo++;
    bestCombo = Math.max(bestCombo, combo);
    comboPulseT = COMBO_PULSE_DUR;

    // THE COMBO SHIELD raises only after a STREAK of COMBO_SHIELD_STREAK
    // (5) FAST (<=5s, via box.pulse — the quest's own "seconds unanswered"
    // clock) correct answers IN A ROW. A correct-but-slow answer doesn't
    // break an already-raised shield's countdown, but it does reset the
    // streak — it isn't part of a qualifying run, so it can't help
    // (re)raise the shield from scratch. A wrong answer resets the streak
    // too, in the branch below. Once the streak is met, every further
    // fast correct answer refreshes the shield's countdown (see
    // updatePlaying for the decay/timeout side).
    if (up.skills.has('shield')) {
      if (box.pulse <= 5) {
        shieldStreak++;
        if (shieldStreak >= COMBO_SHIELD_STREAK) {
          const wasUp = comboShield > 0;
          comboShield = COMBO_SHIELD_DURATION;
          if (!wasUp) sfx.comboShieldUp();
        }
      } else {
        shieldStreak = 0;
      }
    }

    // Combo grows the volley — the kid SEES the reward on every answer. The
    // ladder keeps climbing well past the old combo>=10 ceiling: a kid who is
    // actually good at the arithmetic earns a volley that fans across the whole
    // field, which is the payoff a fast/accurate player is playing for. Must
    // match `volleySize` in balance.js (comment there says so) — the simulator's
    // hit-fraction model assumes this exact shot count per combo tier.
    const base = ship.weapon.baseShots;
    const comboShots =
      combo >= 20 ? 6 :
      combo >= 15 ? 5 :
      combo >= 10 ? 4 :
      combo >= 6 ? 2 :
      combo >= 3 ? 1 : 0;
    ship.weapon.shots = base + comboShots;
    // spread is a TARGET TOTAL WIDTH in px (see Ship.fire), clamped there to the
    // play field so it reads as "fans to the edges" rather than "flies offscreen".
    ship.weapon.spread =
      combo >= 20 ? 900 :
      combo >= 15 ? 620 :
      combo >= 10 ? 420 :
      combo >= 3 ? 140 : 0;

    // THE ULTIMATE CHARGES ON *CLEAN* ANSWERS ONLY — first try, no miss on that
    // quest. Charging on speed would reward mashing; charging on accuracy
    // rewards the skill the whole game teaches, and it is the reason the
    // shielded boss phases are beatable at all.
    if (al.hasUltimate && res.clean && !ultReady) {
      ultCharge++;
      if (ultCharge >= ULT_CHARGE_FULL) {
        ultCharge = ULT_CHARGE_FULL;
        ultReady = true;
        sfx.ultimateReady();
      }
    }

    // The ultimate ignores the fuel gate: it is the payoff for a clean streak,
    // and having it fizzle on an empty tank would punish the exact play it exists
    // to reward.
    const empowered = ultReady;
    const m = metrics(viewW(), viewH());
    if (empowered) {
      ultReady = false;
      ultCharge = 0;
      parts.ultimate(ship.x, ship.y - 30, m);
      sfx.ultimateFire();
    }

    sfx.answerCorrect(combo);

    const homing = up.skills.has('missile');
    for (const s of ship.fire(empowered, m.w, ship.y - m.playTop, homing)) shots.push(s);
    // Wingmen fire too. This is the visible payoff of chapter 2.
    for (const a of allyShips) {
      const p = new Projectile({
        x: a.x, y: a.y - 18, vy: -560,
        sprite: SPRITES[ship.weapon.sprite] || SPRITES.shot_plasma,
        damage: 1, friendly: true,
        homing,
        empowered,
        tint: ship.weapon.tint,
      });
      p.isLeadHit = false;
      shots.push(p);
    }
    parts.muzzle(ship.x, ship.y - 26);
    if (!empowered) sfx.shoot();

    if (combo === 3 || combo === 6 || combo === 10 || combo === 15 || combo === 20) {
      sfx.comboMilestone(Math.min(4, combo / 5 + 1));
    }
  } else {
    if (combo >= 3) sfx.comboBreak();
    combo = 0;
    ship.weapon.shots = ship.weapon.baseShots;
    ship.weapon.spread = 0;
    sfx.answerWrong();

    // A wrong answer breaks the shield IMMEDIATELY, regardless of how much
    // time was left on it — this is the hard-break path, distinct from the
    // soft timeout in updatePlaying. Only fire the shatter fx/sfx if there
    // was actually something to break. It also resets the fast-streak that
    // (re)raises the shield, same as any other break in the run.
    shieldStreak = 0;
    if (comboShield > 0) {
      comboShield = 0;
      parts.comboShieldBreak(ship.x, ship.y, allyShips);
      sfx.comboShieldBreak();
    }
  }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

function updatePlaying(dt, m) {
  const stage = getStage(stageIndex);
  const { al } = derived();

  ship.update(dt, m);
  box.update(dt);
  parts.update(dt);
  if (comboPulseT > 0) comboPulseT = Math.max(0, comboPulseT - dt);

  // The shield's own clock. Ticks only here, inside updatePlaying, so pausing
  // (F8) freezes it along with every other play-field clock — a shield that
  // kept counting down while the quest was hidden would be a free way to lose
  // it for a reason the kid can't see.
  if (comboShield > 0) {
    comboShield = Math.max(0, comboShield - dt);
    if (comboShield <= 0) {
      // Natural expiry — the kid kept answering correctly, just not fast
      // enough to refresh it. Soft fade, no sound: this is not a punishment,
      // it is losing a bonus.
      parts.comboShieldFade(ship.x, ship.y, allyShips);
    }
  }

  // Wingmen trail the ship with a slight lag, so the formation breathes.
  for (const a of allyShips) {
    const tx = ship.x + a.slot.dx * 26;
    const ty = ship.y + a.slot.dy * 26;
    a.x += (tx - a.x) * Math.min(1, dt * 6);
    a.y += (ty - a.y) * Math.min(1, dt * 6);
  }

  if (!box.locked && box.quest && box.pickedIndex >= 0) {
    box.setQuest(feeder.next());
  }

  // A paced low-health reminder. Deliberately slow (1.8s) and soft — a child doing
  // mental arithmetic does not need adrenaline, they need to know to keep going.
  if (ship.hull / ship.maxHull < 0.34) {
    lowHullTimer -= dt;
    if (lowHullTimer <= 0) { lowHullTimer = 1.8; sfx.hullLow(); }
  } else {
    lowHullTimer = 0;
  }

  // --- wave scheduling ---
  if (!waveActive && pending.length === 0 && enemies.length === 0) {
    if (waveIndex < stage.waves.length) {
      // Bé Ốc repairs between waves.
      if (al.repairPerWave > 0 && ship.hull < ship.maxHull && waveIndex > 0) {
        ship.hull = Math.min(ship.maxHull, ship.hull + al.repairPerWave);
        parts.repair(ship.x, ship.y);
        sfx.shieldAbsorb();
      }
      launchWave(stage, stage.waves[waveIndex], m);
      waveIndex++;
      // REINFORCEMENTS DO NOT SHOOT AND DO NOT CHIP THE HULL.
      //
      // The tail exists to hand out arithmetic after the fleet is dead. But while
      // it runs, the kid is still taking fire — and a slow kid needs many more
      // answers to reach the quota than to clear the fleet, so the tail was the
      // longest and most dangerous part of their stage. The simulator showed the
      // signature clearly: FAILURE at 12/11 and 16.5/16 hits — MORE hits dealt
      // than the fleet required — with energy never dipping below 43. They had
      // already won and were killed by the epilogue.
      //
      // Reinforcement ships are therefore harmless: no fire, no escape cost. They
      // are a question dispenser wearing a monstership sprite.
    } else if (feeder.asked < stage.quest.minQuests && reinforceCount < MAX_REINFORCE) {
      // REINFORCEMENT TAIL — keeps waves coming until the kid has answered the
      // promised minimum, so a fast player cannot outrun the curriculum.
      //
      // It must copy the last CREEP wave, never a boss: copying "the last wave"
      // meant beating a boss respawned a third of the boss, repeatedly, so the
      // fight never ended. And reinforcements never cost energy on escape —
      // their job is to hand out arithmetic, not threat, and charging for them
      // compounds against the slowest kid (who triggers the most of them).
      const creeps = stage.waves.filter(
        (w) => w.formation !== 'BOSS' && !(w.phases && w.phases.length));
      const last = creeps.length ? creeps[creeps.length - 1] : null;
      if (!last) { winStage(); return; }
      reinforceCount++;
      launchWave(stage, {
        ...last,
        id: `${last.id}_r${reinforceCount}`,
        count: Math.max(1, Math.floor((last.count || 1) / 3)),
        fireEvery: 0,
        reinforcement: true,
      }, m);
    } else {
      winStage();
      return;
    }
  }

  for (let i = pending.length - 1; i >= 0; i--) {
    pending[i].delay -= dt;
    if (pending[i].delay <= 0) {
      spawnEnemy(pending[i], m);
      pending.splice(i, 1);
    }
  }
  if (waveActive && pending.length === 0) waveActive = false;

  // --- enemies ---
  // Delayed boss projectiles (volley / sweep patterns stagger in time).
  for (let i = delayedShots.length - 1; i >= 0; i--) {
    delayedShots[i].delay -= dt;
    if (delayedShots[i].delay <= 0) {
      shots.push(delayedShots[i]);
      delayedShots.splice(i, 1);
    }
  }

  for (const e of enemies) {
    e.update(dt, m, ship.x, ship.y, ship.weapon.spread);
    if (e.y > m.playTop && e.wantsFire(dt)) {
      if (e.kind === ENEMY_KIND.BOSS) {
        // Bosses fire a PATTERN, so each one reads differently. A boss firing
        // the same single bolt as a dart is just a dart with more hit points.
        for (const p of bossFire(e, patternFor(e.enemyId), m)) {
          if (p.delay > 0) delayedShots.push(p);
          else shots.push(p);
        }
      } else {
        shots.push(makeEnemyShot(e));
      }
    }
    // A ship that gets level with the fleet turns and rams — see Enemy.startDive.
    // Dives are staggered by a growing offset so a wave that all breaks through
    // at once detonates as a readable sequence, not one frame of simultaneous
    // explosions. This matters for damage too: escape cost bypasses the mercy
    // window (it is accumulated, not a burst), so eight impacts in one frame
    // would be eight real points.
    if (e.wantsDive(m, ship.y)) {
      e.startDive(diveQueue);
      diveQueue += 0.45;
      parts.diveWarn(e.x, e.y, e.color);
      sfx.dive();
    }

    // IMPACT. The whole point of the dive: the cost lands where the kid is
    // looking, at the moment the ship visibly connects — applied to the hull
    // THIS FRAME, not banked for later. See ESCAPE_HULL_COST for why a batched
    // version of this read as the bar doing nothing while ships visibly rammed it.
    if (e.hitsShip(ship.x, ship.y)) {
      e.dead = true;
      e.dived = true;
      escaped++;
      ship.hull = Math.max(0, ship.hull - ESCAPE_HULL_COST);
      parts.ram(e.x, e.y, e.color);
      parts.addShake(4, 0.24);
      ship.flash = 0.12;
      sfx.ram();
    }

    if (e.escaped(m)) {
      e.dead = true;
      escaped++;
      // A diving ship that fell past without connecting (the kid's ship drifts)
      // still costs — the breakthrough happened. It just gets the quiet exit.
      if (!e.reinforcement && !e.dived) ship.hull = Math.max(0, ship.hull - ESCAPE_HULL_COST);
      parts.escape(e.x, m.playBottom - 6);
      sfx.escape();
    }
  }
  // Decay the stagger so the offset does not grow across a whole stage.
  diveQueue = Math.max(0, diveQueue - dt);

  // --- projectiles ---
  for (const p of shots) {
    p.update(dt, p.homing ? enemies : null);
    if (p.friendly && p.age > 0.02) {
      p.trailTick += dt;
      if (p.trailTick > 0.02) { p.trailTick = 0; parts.trail(p.x, p.y + 8); }
    }
    if (p.offscreen(m)) p.dead = true;
  }
  resolveHits();

  shots = shots.filter((p) => !p.dead);
  enemies = enemies.filter((e) => !e.dead);

  // A CORRECT ANSWER PATCHES THE HULL. This is the only hull recovery available
  // inside a wave, and without it long fights are unsurvivable by accumulation
  // rather than by any one threat: the simulator showed stage 24 dealing ~20 total
  // hull damage against a 6-hull ship with ~7 points of armour upgrades, with
  // every individual wave inside its own damage budget. Nothing was too strong;
  // there was simply no way back.
  //
  // Repair-on-answer keeps the game's promise intact — arithmetic is the verb, so
  // arithmetic is also the remedy — and it scales the right way: a kid who is
  // answering steadily stays healthy, and a kid who has stalled is the one who
  // gets hurt. It heals slowly (a fifth of a hull point per correct answer) so it
  // never trivialises a boss.
  if (hullRepair >= 1) {
    hullRepair -= 1;
    ship.hull = Math.min(ship.maxHull, ship.hull + 1);
    parts.repair(ship.x, ship.y);
  }

  if (ship.isDead) loseStage();
}

function makeEnemyShot(e) {
  return new Projectile({
    x: e.x, y: e.y + 18,
    vy: 210,                     // far slower than the kid's 620 — dodging is
    sprite: SPRITES.shot_enemy,  // not the skill here, so incoming fire must be
    damage: e.fireDamage,        // readable rather than fast
    friendly: false,
  });
}

function resolveHits() {
  for (const p of shots) {
    if (p.dead) continue;

    if (p.friendly) {
      for (const e of enemies) {
        if (e.dead || p.hitIds.has(e.id)) continue;
        if (Math.abs(p.x - e.x) < e.halfW && Math.abs(p.y - e.y) < e.halfH) {
          const result = e.registerHit(p.damage, p.empowered);
          p.hitIds.add(e.id);
          if (!p.piercing) p.dead = true;

          if (result === 'blocked') {
            parts.blocked(e.x, e.y);
            sfx.shieldBlock();
          } else if (result === 'dead') {
            e.dead = true;
            parts.death(e.x, e.y, e.color, e.tier || 1);
            sfx.explode(e.tier || 1);
          } else if (result === 'phase') {
            parts.phaseChange(e.x, e.y);
            sfx.phaseChange();
          } else {
            parts.impact(p.x, p.y);
            sfx.hit();
          }
          break;
        }
      }
    } else {
      // A plain box around the ship. Generous horizontally because the ship drifts
      // while a shot is in flight (>2s to cross the field), and a shot aimed at the
      // ship should connect rather than be dodged by the ship's own idle motion.
      const dx = p.x - ship.x;
      const dy = p.y - ship.y;
      if (Math.abs(dx) < 34 && Math.abs(dy) < 28) {
        // THE COMBO SHIELD blocks projectile fire before Vòm Xanh's per-wave
        // absorb even gets a chance to spend itself — the reward for speed
        // should never quietly eat the ally's separate resource. This is a
        // pure damage-application gate: it never touches where the shot is,
        // never touches the ship's drift, nothing geometric. That is the
        // whole reason it can't repeat the old dome's bugs (see file header).
        if (comboShield > 0) {
          parts.comboShieldBlock(p.x, p.y);
          sfx.comboShieldBlock();
        } else if (shieldLeft > 0) {
          shieldLeft--;
          parts.shield(ship.x, ship.y);
          sfx.shieldAbsorb();
        } else if (ship.takeDamage(p.damage)) {
          parts.hurt(ship.x, ship.y);
          sfx.hurt();
        }
        p.dead = true;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Winning a stage — where progression happens.
// ---------------------------------------------------------------------------

function winStage() {
  const stage = getStage(stageIndex);
  // Grant the reward once. `earned` is a set-like list, so replaying a stage
  // never stacks the same upgrade twice.
  if (stage.reward && !earned.includes(stage.reward)) earned.push(stage.reward);

  // CLEARING A STAGE REPAYS A DEMOTION. This is what keeps the penalty from being
  // a punishment: the kid who lost three times and then won gets the rank back.
  // Beating the stage that beat you is exactly the evidence the rank was claiming.
  const beforeC = progress.totalCorrect || 0;
  const beforeW = progress.totalWrong || 0;
  const beforeD = progress.demotions || 0;
  const afterD = Math.max(0, beforeD - 1);

  // The rank comparison straddles BOTH this stage's answers and the repayment, so
  // winning a rank back is announced with the same fanfare as earning a new one.
  // Comparing only the totals would restore the rank in silence, which reads as the
  // game grudgingly handing back what it took.
  lastRankUp = rankUp(beforeC, beforeW,
    beforeC + stageStats.correct, beforeW + stageStats.wrong, beforeD, afterD);
  if (lastRankUp) sfx.rankUp();

  progress.upgrades = earned.slice();
  progress.stage = Math.max(progress.stage, Math.min(TOTAL_STAGES - 1, stageIndex + 1));
  progress.level = level;
  progress.bestCombo = Math.max(progress.bestCombo || 0, bestCombo);
  progress.totalCorrect = beforeC + stageStats.correct;
  progress.totalWrong = beforeW + stageStats.wrong;
  progress.demotions = afterD;
  progress.stageDeaths = 0;
  progress.deathStage = -1;
  demotedThisStage = false;
  saveProgress(progress);

  // Fly the ship (and formation) off the top of the field before the score
  // screen — see updateStageClear(). The fleet is already gone, but nothing
  // should still be mid-flight over a stage that's won.
  shots = [];
  delayedShots = [];
  setState(STATE.STAGE_CLEAR);
}

// ---------------------------------------------------------------------------
// STAGE_CLEAR — the ship flies on, THEN the score screen.
//
// A win used to cut straight to VICTORY: the fleet vanishes and score text
// appears on the very same frame. That reads as the stage stopping, not as the
// ship going anywhere. This flies the hero (and the formation with it) off the
// TOP of the play field first — the same direction the monsterships arrived
// from — so a win reads as departure, the ship pressing on to the next stage,
// rather than a screen swap.
//
// Self-terminating on POSITION, not a fixed clock: it ends when the ship
// clears the field, so it looks the same length on a phone and a tall desktop
// window (see metrics() — shipY is a much longer trip on a tall window).
// FLYOUT_MAX_DUR is only a safety net for a window tall enough, or a stall
// weird enough, that the ship never gets there.
// ---------------------------------------------------------------------------
const FLYOUT_ACCEL = 300;      // px/s^2 — starts held, then presses forward
const FLYOUT_MAX_SPEED = 520;  // px/s
const FLYOUT_MAX_DUR = 3;      // seconds — safety net, see above

function updateStageClear(dt, m) {
  ship.update(dt, m);
  parts.update(dt);

  const speed = Math.min(FLYOUT_MAX_SPEED, FLYOUT_ACCEL * sceneT);
  ship.y -= speed * dt;

  // Same lag-follow as updatePlaying's formation-trailing, so the wingmen fly
  // out together rather than snapping into place or getting left behind.
  for (const a of allyShips) {
    const tx = ship.x + a.slot.dx * 26;
    const ty = ship.y + a.slot.dy * 26;
    a.x += (tx - a.x) * Math.min(1, dt * 6);
    a.y += (ty - a.y) * Math.min(1, dt * 6);
  }

  // A soft thruster trail behind the hull sells the acceleration.
  if (Math.floor(sceneT * 20) % 2 === 0) {
    parts.trail(ship.x, ship.y + 22, ship.weapon.tint);
  }

  if (ship.y < m.playTop - 60 || sceneT > FLYOUT_MAX_DUR) {
    setState(STATE.VICTORY);
  }
}

// No HUD, no quest box — those belong to a live stage, and this one is
// already won. Just the biome, the formation, and the ship leaving it behind.
function renderStageClear(m) {
  const stage = getStage(stageIndex);
  drawBiomeBack(ctx, m, stage.biome, fieldT, allyIds(), stage.reward);

  const off = parts.shakeOffset();
  ctx.save();
  ctx.translate(off.x, off.y);

  for (const a of allyShips) {
    drawSpriteCentered(ctx, allySprite(a.style), Math.floor(fieldT * 6) % 2,
      a.x, a.y, 1.15);
  }
  drawSpriteCentered(ctx, heroSprite(currentRankIndex()), Math.floor(fieldT * 8) % 2,
    ship.x, ship.y, ship.scale);

  parts.draw(ctx, m);
  drawBiomeFront(ctx, m, stage.biome, fieldT);
  ctx.restore();
}

// THE SHIP WAS DESTROYED. Records the loss, and demotes on the third failure of
// the SAME stage.
//
// Why a demotion exists at all: rank claims the kid is a Chỉ Huy Trưởng, and a kid
// losing a stage three times running is being asked for arithmetic they do not have
// yet. Letting the badge keep making that claim makes it meaningless.
//
// Why it is bounded so carefully — this runs directly into the failure screen, whose
// whole job is to stop a child reading a loss as "I am bad at maths":
//
//   * PER-STAGE, not lifetime. The streak resets on a win and on reaching a new
//     stage, so this is never a slow tax on a kid who is improving. One loss each
//     across six stages costs nothing.
//   * AT MOST ONE RANK PER STAGE. `demotedThisStage` latches, so losing five times
//     costs one rank, not three. A cascade is how a kid ends up back at trainee in
//     one bad afternoon.
//   * IT IS REPAYABLE, and clearing the stage repays it (see finishStage) with the
//     full promotion fanfare. Nothing is permanently taken.
//   * NEVER BELOW TRAINEE — rankFor() clamps, so the bar cannot go negative.
let demotedThisStage = false;
let lastRankDown = null;

function loseStage() {
  // A new stage clears the streak: "stuck here" is the thing being measured.
  if (progress.deathStage !== stageIndex) {
    progress.deathStage = stageIndex;
    progress.stageDeaths = 0;
    demotedThisStage = false;
  }
  progress.stageDeaths = (progress.stageDeaths || 0) + 1;

  lastRankDown = null;
  if (progress.stageDeaths >= DEATHS_PER_DEMOTION && !demotedThisStage) {
    const before = progress.demotions || 0;
    const after = before + 1;
    lastRankDown = rankDown(progress.totalCorrect || 0, progress.totalWrong || 0,
      before, after);
    // Only actually spend the demotion if it changes the worn rank. At trainee
    // there is nothing to lose, and silently incrementing a counter would mean a
    // kid who struggled early had to re-earn ranks they never held.
    if (lastRankDown) {
      progress.demotions = after;
      demotedThisStage = true;
      // Demotion must be ANNOUNCED, never silent (see rank.js) — mirrors
      // rankUp's sfx.rankUp() call on the promotion path. Without this only
      // the failure screen's text showed a demotion; nothing was heard.
      sfx.downgrade();
    }
  }

  saveProgress(progress);
  setState(STATE.FAILURE);
}

// Called from the VICTORY screen's button. Routes to the ally scene, the chapter
// end, or straight to the next stage.
function afterVictory() {
  const stage = getStage(stageIndex);
  const u = UPGRADES[stage.reward];

  if (u && u.type === 'ally') {
    setState(STATE.ALLY_RESCUE);
    return;
  }
  advanceAfterStage();
}

function advanceAfterStage() {
  if (isChapterFinale(stageIndex)) {
    setState(STATE.CHAPTER_END);
    return;
  }
  startStage(stageIndex + 1);
}

// Called from CHAPTER_END's button.
function afterChapterEnd() {
  const ch = chapterForStage(stageIndex);
  const closing = (CHAPTER_STORY[ch.id] || {}).closing || [];
  if (closing.length) {
    beginStory(closing, isFinalChapter(ch) ? 'ending' : 'nextchapter');
  } else {
    afterChapterStory(isFinalChapter(ch) ? 'ending' : 'nextchapter');
  }
}

function afterChapterStory(kind) {
  if (kind === 'ending') {
    setState(STATE.CREDITS);
    return;
  }
  // Next chapter: play its opening, then its first stage.
  const next = stageIndex + 1;
  const ch = chapterForStage(next);
  const opening = (CHAPTER_STORY[ch.id] || {}).opening || [];
  if (opening.length && !progress.seenStory.includes(`ch${ch.id}`)) {
    progress.seenStory.push(`ch${ch.id}`);
    saveProgress(progress);
    pendingStageAfterStory = next;
    beginStory(opening, 'stage');
  } else {
    startStage(next);
  }
}

// ---------------------------------------------------------------------------
// Story plumbing
// ---------------------------------------------------------------------------

let pendingStageAfterStory = 0;

function beginStory(pages, after) {
  story = { pages, page: 0, after };
  setState(STATE.STORY);
}

// Called both when the pages run out AND on skip — see the header note.
function finishStory(after) {
  switch (after) {
    case 'tutorial':
      tutorialIndex = 0;
      setState(STATE.TUTORIAL);
      break;
    case 'stage':
      startStage(pendingStageAfterStory);
      break;
    case 'nextchapter':
      afterChapterStory('nextchapter');
      break;
    case 'ending':
      afterChapterStory('ending');
      break;
    default:
      setState(STATE.TITLE);
  }
}

function advanceStory() {
  story.page++;
  if (story.page >= story.pages.length) finishStory(story.after);
  else sfx.storyPage();
}

// ---------------------------------------------------------------------------
// Starting a fresh run vs continuing
// ---------------------------------------------------------------------------

function newRun() {
  earned = [];
  progress = { stage: 0, level, upgrades: [], seenStory: [], bestCombo: 0, totalCorrect: 0, totalWrong: 0 };
  saveProgress(progress);
  pendingStageAfterStory = 0;
  // The prologue plays BEFORE the tutorial: the Captain gives the mission, and
  // then the kid learns the craft. A controls lesson with no context is what the
  // old flow did, and it read as a manual bolted onto a story.
  const ch1 = (CHAPTER_STORY[1] || {}).opening || [];
  progress.seenStory = ['ch1'];
  saveProgress(progress);
  beginStory([...PROLOGUE, ...ch1], 'tutorial');
}

function continueRun() {
  earned = (progress.upgrades || []).slice();
  level = progress.level || level;
  startStage(progress.stage || 0);
}

// ---------------------------------------------------------------------------
// Render — gameplay
// ---------------------------------------------------------------------------

function renderPlaying(m) {
  const stage = getStage(stageIndex);

  drawBiomeBack(ctx, m, stage.biome, fieldT, allyIds(), stage.reward);

  // SCREEN SHAKE IS APPLIED TO THE PLAY FIELD ONLY. Shaking the whole canvas
  // would shake the answer cards, which is actively hostile to a child trying to
  // tap one — the quest box must stay rock-steady while the world explodes.
  const off = parts.shakeOffset();
  ctx.save();
  ctx.translate(off.x, off.y);

  for (const e of enemies) {
    const tint = e.flash > 0 ? '#ffffff' : null;
    drawSpriteCentered(ctx, e.sprite, Math.floor(e.t * 6) % 2, e.x, e.y - e.knock,
      e.scale, false, tint);
    // Hit pips, so a kid can see a ship needs more than one answer. Without
    // them the second shot reads as a miss.
    if (e.hits > 1 && e.hitsLeft > 0) {
      const pw = 7, pg = 3;
      const total = e.hits * pw + (e.hits - 1) * pg;
      let px = e.x - total / 2;
      for (let i = 0; i < e.hits; i++) {
        ctx.fillStyle = i < e.hitsLeft ? '#ffd24a' : 'rgba(255,255,255,0.18)';
        ctx.fillRect(px, e.y - e.halfH - 10, pw, 4);
        px += pw + pg;
      }
    }
  }

  for (const p of shots) {
    // Sprites are authored nose-up, matching every projectile's near-vertical
    // flight — except a homing missile that has steered off-vertical, which
    // must rotate to face its actual travel direction or it reads as a bar
    // sliding sideways rather than a missile turning. atan2(vx, -vy) is 0 for
    // straight-up flight, so every non-homing shot is unaffected.
    const rotation = p.homing ? Math.atan2(p.vx, -p.vy) : 0;
    // Weapon tint (weapon2/3/4/5/6/7 in upgrades.js) is several tiers' ONLY
    // visual signal — they reuse an earlier tier's sprite and change nothing
    // but colour. Enemy shots and pre-tint projectiles pass tint: null and
    // draw in the sprite's own palette, same as before.
    drawSpriteCentered(ctx, p.sprite, 0, p.x, p.y, p.scale, false, p.tint, rotation);
  }


  // RANK AURA — a faint glow in the pilot's rank colour, under the ship.
  //
  // Drawn BEFORE the wingmen and the hero so it can never dim a sprite, and with
  // 'lighter' so it ADDS light instead of tinting: a normal-blend wash would
  // discolour any ally that overlapped it, and in chapters 2-3 five wingmen fly
  // 44px away (LINEUP_SLOTS x 26px), so overlap is guaranteed rather than
  // unlikely.
  //
  // KEPT DELIBERATELY FAINT AND SMALL. Radius stays inside the 44px gap to the
  // nearest ally, and peak alpha is 0.16 even at the top rank. The five wingmen
  // are colour-coded so a kid can name which is which at a glance — that read is
  // load-bearing and a bright aura over them would destroy it. The trainee rank
  // gets NO aura at all, so the glow itself is something the kid earns.
  {
    const ri = currentRankIndex();
    if (ri > 0) {
      const trim = RANK_TRIM[ri] || '#bdb6dc';
      // Radius grows only slightly with rank, and is capped well under the
      // 44px ally gap so the glow reads as belonging to the hero alone.
      // MEASURED, NOT GUESSED. The first values (peak alpha 0.16, radius 20-34)
      // sampled at +5/+10/+1 RGB over the bare biome next to the hull — drawing
      // correctly and completely invisible. These are ~3x, which reads clearly
      // while staying well under the level that would tint a wingman.
      const r = Math.min(40, 26 + ri * 2.5);
      const pulse = 0.82 + 0.18 * Math.sin(fieldT * 1.6);
      const alpha = (0.16 + ri * 0.055) * pulse;
      const g = ctx.createRadialGradient(ship.x, ship.y, 0, ship.x, ship.y, r);
      g.addColorStop(0, rankRgba(trim, alpha));
      g.addColorStop(0.55, rankRgba(trim, alpha * 0.45));
      g.addColorStop(1, rankRgba(trim, 0));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ship.x, ship.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Wingmen, then the ship on top.
  for (const a of allyShips) {
    drawSpriteCentered(ctx, allySprite(a.style), Math.floor(fieldT * 6) % 2,
      a.x, a.y, 1.15);
  }

  const blink = ship.invuln > 0 && Math.floor(ship.invuln * 12) % 2 === 0;
  if (!blink) {
    drawSpriteCentered(ctx, heroSprite(currentRankIndex()), Math.floor(fieldT * 8) % 2,
      ship.x, ship.y, ship.scale, false, ship.flash > 0 ? '#ffffff' : null);
  }

  drawComboShield(m);

  parts.draw(ctx, m);
  drawBiomeFront(ctx, m, stage.biome, fieldT);
  ctx.restore();

  drawHud(m);
  box.draw(ctx, m, { keyboard: input.usingKeyboard });
  if (paused) {
    drawPauseMask(m);
    // REDRAWN ON TOP OF THE MASK. The mask dims the whole play field, HUD included,
    // and the resume button is the one thing that must not be dimmed: on a tablet it
    // is the only way out of the pause, and a 55% veil over the single exit is how a
    // kid concludes the game has frozen.
    drawControlRow(m, m.w - hudPad(m), ctrlRowY(m));
  }
}

// THE COMBO SHIELD's bubble. Drawn AFTER the wingmen and hero (main draw
// order, above) so it reads as enclosing them, not glowing beneath them like
// the rank aura does — a shield is a boundary you can see, not a light source.
//
// Centred on the ship rather than the ship+allies bounding box, and sized by
// distance to the farthest ally instead: a centre that shifted every frame as
// the wingmen breathe (they lag the ship — see the trailing lerp above) would
// make the bubble visibly swim, which reads as broken rather than alive.
//
// Clipped to the play field for the same reason every other effect is
// (parts.draw, above) — the quest box is sacred, and a shield radius wide
// enough to cover 5 wingmen is wide enough to reach toward it on a short
// window.
function drawComboShield(m) {
  if (comboShield <= 0) return;

  let radius = ship.scale * 26; // clears the hero hull alone with no allies
  for (const a of allyShips) {
    const d = Math.hypot(a.x - ship.x, a.y - ship.y) + 18; // + ally half-sprite
    if (d > radius) radius = d;
  }
  radius += 14; // breathing room so the rim doesn't hug the outermost hull

  const warn = comboShield <= COMBO_SHIELD_WARN_AT;
  // A slow, calm breathe normally; a faster, shallower flicker once it is
  // about to drop — the same "running out" read as a low-fuel light, not an
  // alarm. Never fully invisible even at its dimmest, so a kid always knows
  // whether the shield is currently up.
  const pulse = warn
    ? 0.55 + 0.35 * Math.sin(fieldT * 9)
    : 0.75 + 0.2 * Math.sin(fieldT * 1.3);
  const fillA = (warn ? 0.06 : 0.09) * pulse;
  const rimA = (warn ? 0.35 : 0.5) * pulse;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, m.w, m.playBottom);
  ctx.clip();

  // The hero's own hull blue (#4d9bf0 / rgb(77,155,240)) — "your ship's own
  // energy", and it keeps this shield tellable by hue from Vòm Xanh's teal.
  const g = ctx.createRadialGradient(ship.x, ship.y, radius * 0.6, ship.x, ship.y, radius);
  g.addColorStop(0, `rgba(77,155,240,${fillA.toFixed(3)})`);
  g.addColorStop(1, `rgba(77,155,240,0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(ship.x, ship.y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(127,186,255,${rimA.toFixed(3)})`;
  ctx.lineWidth = warn ? 1.5 : 2;
  ctx.beginPath();
  ctx.arc(ship.x, ship.y, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

// THE PAUSE SCREEN — and why it HIDES THE QUEST.
//
// A pause that left the problem on screen is a free thinking-timer: stop the clock,
// work out 47 + 68 at leisure, resume and answer. That is not cheating a score, it
// is cheating the practice — the whole game is "can you do this in your head, now",
// and unlimited time to stare at the numbers quietly deletes the "in your head".
//
// So BOTH the formula and the four answer cards are covered. Either one alone
// leaks: the formula is the problem, and the cards are a multiple-choice list a kid
// can reason backwards from (four options, one plausible answer) even with the sum
// hidden. The mask is drawn OVER the finished quest box rather than by teaching the
// box a paused mode, so nothing the box draws in future can slip out from under it.
//
// The quest is NOT re-rolled on resume. Re-rolling would make F8 a free skip for a
// question the kid did not like, which is a different exploit wearing the same
// costume: they would pause-cycle until an easy one came up.
//
// The play field is dimmed but NOT hidden, and the HUD stays fully readable: a kid
// pausing mid-wave is often checking how much durability they have left, and that is
// a legitimate thing to want. What they cannot do is look at the sum.
function drawPauseMask(m) {
  // Dim the battlefield. Kept light enough that the frozen fleet is still visible,
  // so it is obvious the game is waiting rather than gone.
  ctx.fillStyle = 'rgba(5,3,15,0.55)';
  ctx.fillRect(0, 0, m.w, m.questTop);

  // Cover the ENTIRE quest region opaquely — no alpha, because a translucent panel
  // over 54px numerals still leaves them legible.
  ctx.fillStyle = '#0d0a20';
  ctx.fillRect(0, m.questTop - 3, m.w, m.h - m.questTop + 3);
  ctx.fillStyle = '#4b3f8f';
  ctx.fillRect(0, m.questTop - 3, m.w, 3);

  const cy = m.questTop + (m.h - m.questTop) / 2;
  const pulse = 0.7 + 0.3 * Math.sin(sceneT * 2.2);

  drawTextBold(ctx, 'TẠM DỪNG', m.cx, cy - 26, Math.min(34, m.w * 0.07),
    `rgba(255,244,214,${pulse.toFixed(2)})`, 'center', 'middle');
  // Say WHY the question is hidden. A kid who thinks the game lost their quest is
  // worried; a kid who is told it is covered on purpose just presses the key.
  drawText(ctx, 'Câu hỏi được che lại để chơi công bằng nhé!', m.cx, cy + 12,
    Math.min(16, m.w * 0.032), '#9a92c0', 'center', 'middle');
  // Name BOTH ways out. The button is listed first because it is the one that
  // exists on every device — on a tablet there is no F8 at all, and a resume line
  // that only named a key would leave a kid stuck in their own pause.
  drawText(ctx, 'Bấm nút ▶ phía trên, hoặc phím F8 / Enter', m.cx, cy + 40,
    Math.min(15, m.w * 0.03), '#7fe3ff', 'center', 'middle');
}

// THE HUD IS TWO SIDE COLUMNS, AND THE CENTRE IS LEFT EMPTY.
//
// The centre of the play field is where the monsterships descend and where the
// kid's own volleys travel — it is the one part of the screen they actually have
// to watch. Every earlier layout put something across it (stage name, combo,
// quest counter, boss bar, status shouts) and each one competed with the thing it
// was describing. Three separate bugs in this project were the same mistake:
// text placed near the thing it refers to lands ON that thing.
//
// So the split is by OWNERSHIP, which also makes it learnable:
//
//   LEFT  = MY SHIP.   health, combo, ultimate charge.
//   RIGHT = THE ENEMY. stage name, chapter, quest progress, boss name and HP.
//   CENTRE = nothing. Ever.
//
// A kid checking "am I okay?" looks left; "what am I fighting?" looks right; and
// the middle stays clear for the actual game.

// PAUSE / RESUME. Announces itself through the same toast the mute keys use, so
// all three player controls share one feedback channel.
//
// The MUSIC KEEPS PLAYING. duckMusic() is a transient dip that always ramps back
// to full, so it cannot hold a level — and holding one would mean a paused kid
// hears the battle loop quietly grinding on, which is worse than either silence or
// full volume. F10 already exists for a kid who wants it off.
function togglePause() {
  paused = !paused;
  muteHint = paused ? 'TẠM DỪNG · F8 ĐỂ TIẾP TỤC' : 'TIẾP TỤC!';
  muteHintT = paused ? 2.4 : 1.2;
  sfx.confirm();
}

// The kid's current rank as an INDEX into RANKS, which is what both the HUD
// badge and heroSprite() key off. One helper so the badge and the ship can never
// disagree about what rank the kid is.
function currentRankIndex() {
  const r = rankFor(progress.totalCorrect || 0, progress.totalWrong || 0,
    progress.demotions || 0);
  const i = RANKS.indexOf(r);
  return i < 0 ? 0 : i;
}

// Rank trim colours, mirroring RANK_SKINS in sprites.js. Kept as CSS strings
// here because the HUD draws with fillStyle rather than through the sprite
// palette; the two lists must stay in the same order (verify.js asserts it).
const RANK_TRIM = ['#7c7796', '#8aa6f5', '#4fc9cc', '#6ed894', '#ffd45c', '#fff8ea'];

// '#rrggbb' + alpha -> 'rgba(...)', for the rank aura's gradient stops.
//
// It returns a TRANSPARENT colour rather than throwing on a malformed input, for
// the reason documented in effects.js: a bad colour string inside the render loop
// once threw every single frame and took the HUD and quest box down with it.
// Nothing in the draw path may be able to do that.
function rankRgba(hex, alpha) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || ''));
  if (!m) return 'rgba(0,0,0,0)';
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a.toFixed(3)})`;
}

// THE CONTROL ROW — pause, sound and music, as three TAPPABLE buttons.
//
// F8/F9/F10 existed long before this and were completely undiscoverable: nothing
// on screen named them, so the only kid who ever paused was one who had been told
// by an adult. Worse, the game's primary input is TAPPING — it is meant to be
// played on a tablet, where there is no function-key row at all, so on the device
// this game is actually for there was NO WAY to pause, mute, or turn the music off.
// A hint that only says "press F8" would not have fixed that; the buttons are the
// fix and the key labels are the hint riding along on them.
//
// WHERE THEY SIT: the bottom-right, in the strip immediately ABOVE the quest box.
//
// That is where the kid's hands already are. The game is played by tapping the four
// answer cards, so on a tablet both thumbs live at the bottom of the screen — a
// control in the top corner is a reach away from every tap the kid makes, and for a
// small child holding a tablet it is often a two-handed regrip.
//
// It sits under the RIGHT column deliberately, not the left: the left column reports
// STATE the kid reads (durability, combo, ultimate) and the rows under the bar appear
// and vanish with that state, so a control parked among them would slide down the
// screen the moment a streak started — a button a kid has to re-find mid-wave. The
// right column's boss block is comparatively static, and the row is still pinned to
// the quest box's top edge either way, which never moves during a stage.
//
// The centre stays empty, as always: the row is right-aligned to the same edge as the
// enemy column (rEdge) and stops well short of the middle, so the monsterships and
// the kid's own volleys still own it.
//
// EACH BUTTON SHOWS ITS STATE, not the action it performs. A speaker with a slash
// means the sound IS off — that is what a kid can check against what they hear.
// Labelling it with the action instead ("MUTE") means the icon says the opposite of
// the world whenever the toggle is on, which is the classic play/pause ambiguity
// and not worth inflicting on a 7-year-old.
function drawControlRow(m, rightEdge, y) {
  ctrlBtns = [];

  const size = CTRL_SIZE;
  const gap = 8;
  const keys = [
    { id: 'pause', key: 'F8', on: paused },
    { id: 'sound', key: 'F9', on: sfx.isMuted() },
    { id: 'music', key: 'F10', on: isMusicMuted() },
  ];

  let bx = rightEdge - ctrlRowWidth();
  for (const b of keys) {
    const r = { x: bx, y, w: size, h: size, id: b.id };
    ctrlBtns.push(r);

    // A toggled-OFF system (muted, paused) gets a warm plate so the row can be read
    // at a glance without decoding three small glyphs.
    const active = b.on;
    fillRoundRect(ctx, bx, y, size, size, 7,
      active ? 'rgba(70,40,18,0.92)' : 'rgba(20,16,38,0.85)');
    strokeRoundRect(ctx, bx, y, size, size, 7,
      active ? 'rgba(255,157,58,0.85)' : 'rgba(140,132,190,0.45)', 2);

    const cx = bx + size / 2;
    const cy = y + size / 2 - 6;
    const ink = active ? '#ffb066' : '#cfc8ea';
    if (b.id === 'pause') drawPausePlayGlyph(ctx, cx, cy, ink, paused);
    else drawSpeakerGlyph(ctx, cx, cy, ink, active, b.id === 'music');

    // The key label under the glyph. This is the ONLY place the function keys are
    // ever named on screen, so a kid on a keyboard learns them from the button they
    // can already see and press.
    drawTextBold(ctx, b.key, cx, y + size - 14, 12, active ? '#ffd0a0' : '#cfc8ea',
      'center', 'top');

    bx += size + gap;
  }
}

// The row's own geometry, shared by the two callers that draw it and derived from
// the quest box rather than from the HUD columns — it is anchored to the box's top
// edge, which is the one horizontal line on screen that never moves during a stage.
function ctrlRowY(m) { return m.questTop - CTRL_SIZE - 10; }

// Sized for a CHILD'S FINGERTIP on a tablet, not for a mouse. 34px was the floor
// for a reliable young-kid tap; grown to 40px so the F8/F9/F10 key label under the
// glyph (the only place those keys are ever named) can be legible rather than 8px.
const CTRL_SIZE = 40;

// Three buttons wide, shared by drawControlRow (to right-align itself) and by the
// left column's combo gap (which needs to know the row exists but not its edge).
function ctrlRowWidth() { return CTRL_SIZE * 3 + 8 * 2; }

// PLAY (a triangle) when the game is paused, PAUSE (two bars) when it is running —
// the button shows what the world IS, and the glyph is the way out of it. Both are
// drawn as solid shapes rather than as text: the pixel font has no ▶/⏸ glyph, and a
// missing glyph renders as a tofu box, which teaches a kid nothing.
function drawPausePlayGlyph(ctx, cx, cy, color, isPaused) {
  ctx.fillStyle = color;
  if (isPaused) {
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 7);
    ctx.lineTo(cx + 7, cy);
    ctx.lineTo(cx - 5, cy + 7);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(cx - 6, cy - 7, 4, 14);
    ctx.fillRect(cx + 2, cy - 7, 4, 14);
  }
}

// A speaker, with a slash when the channel is muted. The MUSIC button carries a
// note instead of sound waves, because two identical speakers side by side would
// make the row a coin flip — F9 silences everything and F10 only the music, and a
// kid who wants the music off must not be able to mute their own answer feedback by
// mistake. Answer feedback is the loudest thing in the game on purpose.
function drawSpeakerGlyph(ctx, cx, cy, color, muted, isMusic) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;

  // Cone: a small block plus a flared triangle.
  ctx.fillRect(cx - 8, cy - 3, 4, 6);
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy - 3);
  ctx.lineTo(cx, cy - 8);
  ctx.lineTo(cx, cy + 8);
  ctx.lineTo(cx - 4, cy + 3);
  ctx.closePath();
  ctx.fill();

  if (isMusic) {
    // An eighth note: stem plus head.
    ctx.fillRect(cx + 6, cy - 8, 2, 11);
    ctx.fillRect(cx + 6, cy - 8, 5, 2);
    ctx.beginPath();
    ctx.arc(cx + 5, cy + 4, 2.6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Two arcs of sound.
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(cx + 1, cy, 3 + i * 2.6, -0.9, 0.9);
      ctx.stroke();
    }
  }

  if (muted) {
    // The slash sits over the whole glyph, in the plate colour first so it reads as
    // a cut through the icon rather than another stroke on top of it.
    ctx.strokeStyle = 'rgba(70,40,18,0.92)';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 9);
    ctx.lineTo(cx + 11, cy - 10);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 9);
    ctx.lineTo(cx + 11, cy - 10);
    ctx.stroke();
  }
}

// The HUD's left inset, as a function because the control row is drawn TWICE per
// paused frame (once in the HUD, once over the pause mask) and both calls must land
// on the same pixels. Inlining the formula in the second caller is the same drift
// that makes a button look tappable where it is not.
function hudPad(m) { return Math.max(10, m.w * 0.022); }

function drawHud(m) {
  const stage = getStage(stageIndex);
  const pad = hudPad(m);
  const barH = 12;

  // Columns are capped so they never creep toward the middle. The cap is a
  // FRACTION as well as an absolute, because the constraint differs by shape: on
  // a wide desktop window the absolute stops them drifting apart, and on a narrow
  // phone the fraction stops them closing in on the boss — which holds dead
  // centre and is the widest sprite in the game.
  const colW = Math.min(m.w * 0.28, 230);
  const leftX = pad;
  const rightX = m.w - pad - colW;

  // A soft plate behind each column. These sit over the play field, and the late
  // biomes are bright magenta — 10px labels in #9a92c0 vanished against
  // dark_core. The plate is a vertical fade so it never reads as a hard panel
  // edge cutting into the battlefield.
  const plate = (x) => {
    const g = ctx.createLinearGradient(0, 0, 0, m.playBottom * 0.42);
    g.addColorStop(0, 'rgba(8,6,20,0.72)');
    g.addColorStop(1, 'rgba(8,6,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - pad * 0.6, 0, colW + pad * 1.2, m.playBottom * 0.42);
  };
  plate(leftX);
  plate(rightX);

  // =========================================================================
  // LEFT COLUMN — the kid's own ship.
  // =========================================================================
  let ly = pad;

  drawMeter(ctx, leftX, ly, colW, barH, ship.hull / ship.maxHull, '#e0503a');

  // The bar's label line carries the durability name on the LEFT and the pilot's
  // RANK on the RIGHT, right-aligned to the bar's own end. Two labels, one row:
  // it costs no extra vertical space, and the rank sits at the column's edge
  // rather than pushing the combo and ultimate rows further down the screen.
  //
  // RANK GRANTS NOTHING — it is a badge. Rank thresholds are lifetime totals, so
  // any buff would be a permanent bonus carried into every stage: invisible to
  // balance.js, stacked on top of the per-stage upgrade curve it already
  // simulates, and scaled backwards, because rank measures accuracy and would
  // therefore reward the kid who least needs the help. That is the same mistake
  // the escape penalty made once. What rank does instead is ride on the ship —
  // heroSprite() recolours the hull trim to match this badge, in every scene.
  {
    const labelY = ly + barH + 2;
    drawText(ctx, 'ĐỘ BỀN TÀU', leftX, labelY, 13, '#bdb6dc');

    const ri = currentRankIndex();
    const trim = RANK_TRIM[ri] || '#bdb6dc';
    const name = RANKS[ri].name.toUpperCase();
    // Right-aligned so it ends flush with the bar. Pips sit to the LEFT of the
    // name so the row reads inward-out: label ... pips + title | bar end.
    const pips = Math.min(3, Math.max(0, ri - 2));
    const pipW = pips ? pips * 6 + 3 : 0;
    // A demoted rank is marked with a small down-caret, so a kid whose ship trim
    // changed can see WHY without the HUD lecturing them. It disappears the moment
    // the demotion is repaid by clearing a stage.
    const demoted = isDemoted(progress.totalCorrect || 0, progress.totalWrong || 0,
      progress.demotions || 0);
    drawText(ctx, demoted ? `${name} ▾` : name, leftX + colW, labelY, 13, trim, 'right');
    if (pips) {
      // Measure what was actually DRAWN, including the demotion caret — measuring
      // `name` alone would slide the pips under the text by the caret's width.
      ctx.font = '13px "PixelFont", monospace';
      const nameW = ctx.measureText(demoted ? `${name} ▾` : name).width;
      let bx = leftX + colW - nameW - pipW;
      for (let i = 0; i < pips; i++) {
        ctx.fillStyle = trim;
        ctx.fillRect(bx, labelY + 2, 4, 4);
        bx += 6;
      }
    }
    ly += barH + 20;
  }

  // LOW HEALTH — the only "you are in trouble" signal in the game. Placed right
  // under the hull bar/rank row (what it's warning about), not after the
  // ultimate section, so it reads as "your ship" news rather than interrupting
  // the ultimate's own charge-to-ready sequence.
  if (ship.hull / ship.maxHull < 0.34) {
    const a = 0.55 + 0.45 * Math.sin(performance.now() / 160);
    const label = 'TÀU SẮP HỎNG!';
    ctx.font = 'bold 15px "PixelFont", monospace';
    const tw = ctx.measureText(label).width;
    fillRoundRect(ctx, leftX - 4, ly - 2, tw + 8, 21, 4, 'rgba(26,20,35,0.85)');
    drawTextBold(ctx, label, leftX, ly, 15, `rgba(255,157,58,${a.toFixed(2)})`);
    ly += 23;
  }

  // THE COMBO SHIELD's HUD line. Only takes space while actually up — the
  // same reasoning as "SẴN SÀNG!" below only appearing once the ultimate is
  // charged, rather than a permanent row that's mostly empty. A shrinking bar
  // mirrors the countdown directly instead of making the kid read a number
  // under time pressure, and flickers in the last COMBO_SHIELD_WARN_AT
  // seconds — the same visual language as the low-health warning above it.
  if (comboShield > 0) {
    const warn = comboShield <= COMBO_SHIELD_WARN_AT;
    const a = warn ? 0.55 + 0.45 * Math.sin(performance.now() / 90) : 1;
    const label = 'KHIÊN';
    ctx.font = 'bold 15px "PixelFont", monospace';
    const tw = ctx.measureText(label).width;
    fillRoundRect(ctx, leftX - 4, ly - 2, Math.max(tw + 8, colW), 25, 4, 'rgba(26,20,35,0.85)');
    drawTextBold(ctx, label, leftX, ly, 15, `rgba(77,155,240,${a.toFixed(2)})`);
    const barY = ly + 16;
    const frac = Math.max(0, comboShield / COMBO_SHIELD_DURATION);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(leftX, barY, colW, 4);
    ctx.fillStyle = `rgba(77,155,240,${a.toFixed(2)})`;
    ctx.fillRect(leftX, barY, colW * frac, 4);
    ly += 27;
  }

  // Ultimate charge pips, with a label so the row is self-explanatory the first
  // time a kid earns it. Extra gap above it (beyond the hull/rank row's own
  // spacing) so the ultimate reads as its own block rather than a continuation
  // of the hull stats above it — same reasoning as the combo section's own gap.
  if (derived().al.hasUltimate) {
    ly += 10;
    drawText(ctx, 'SIÊU CÔNG THỨC', leftX, ly, 13, '#bdb6dc');
    ly += 16;
    const pg = 3;
    const pw = Math.max(8, (colW - pg * (ULT_CHARGE_FULL - 1)) / ULT_CHARGE_FULL);
    let px = leftX;
    for (let i = 0; i < ULT_CHARGE_FULL; i++) {
      ctx.fillStyle = ultReady ? '#ffffff'
        : i < ultCharge ? '#ffd24a' : 'rgba(255,255,255,0.18)';
      ctx.fillRect(px, ly, pw, 6);
      px += pw + pg;
    }
    ly += 12;

    if (ultReady) {
      const a = 0.6 + 0.4 * Math.sin(performance.now() / 140);
      drawTextBold(ctx, 'SẴN SÀNG!', leftX, ly, 16,
        `rgba(255,255,255,${a.toFixed(2)})`);
      ly += 20;
    }
  }

  // COMBO — the kid's own streak. It lives in the dead space below the stat
  // rows and above the control buttons rather than wedged between them, so it
  // reads as its own reward rather than another line of stats. Centered on the
  // panel's own width (colW), and vertically centered in whatever room is left
  // above the control row — that gap shrinks when the low-health warning is
  // showing, and the label should make way for it rather than overlap it.
  //
  // THE BEAT IS PER-ANSWER, NOT A CONSTANT IDLE WOBBLE. comboPulseT is reset to
  // COMBO_PULSE_DUR by pickAnswer() on every correct answer and decays here, so
  // the label visibly reacts to the kid's own input — an always-on pulse would
  // make the label look "alive" even while the kid is just reading the next
  // question, which is the wrong thing to draw attention to.
  if (combo >= 2) {
    const tier =
      combo >= 20 ? 4 : combo >= 15 ? 3 : combo >= 10 ? 2 : combo >= 6 ? 1 : 0;
    const baseSize = 22 + tier * 5;
    const colors = ['#ffd24a', '#ffb43a', '#ff9d3a', '#ff7f3a', '#ffffff'];
    const label = `CHUỖI ×${combo}`;

    // Punch in on the beat then ease back to rest size — a decaying sine half-
    // cycle rather than a linear shrink, so the motion has a snap at the start
    // (where the kid's eye is, right as the answer lands) and settles gently.
    const beat = comboPulseT > 0 ? Math.sin((comboPulseT / COMBO_PULSE_DUR) * Math.PI * 0.5) : 0;
    let size = baseSize * (1 + beat * 0.5);

    // Clamp to the column's own width — a two-digit combo at the top tier's
    // peak beat can otherwise overrun colW, same rule as the stage name and
    // boss name labels below.
    const fitW = colW - 8;
    ctx.font = `bold ${size}px "PixelFont", monospace`;
    while (ctx.measureText(label).width > fitW && size > baseSize * 0.6) {
      size -= 1;
      ctx.font = `bold ${size}px "PixelFont", monospace`;
    }

    const gapTop = ly;
    const gapBottom = ctrlRowY(m) - 6;
    const cy2 = (gapTop + gapBottom) / 2;
    const cx2 = leftX + colW / 2;
    if (gapBottom > gapTop) {
      drawTextBold(ctx, label, cx2, cy2, size, colors[tier], 'center', 'middle');
    }
  }

  // =========================================================================
  // RIGHT COLUMN — where we are and what we are fighting. All right-aligned to
  // the screen edge so the column reads as one block.
  // =========================================================================
  const rEdge = m.w - pad;
  let ry = pad;
  const ch = chapterForStage(stageIndex);

  // The stage name shrinks to fit its column — several are long, and Vietnamese
  // with diacritics is wider than it looks.
  {
    const label = `MÀN ${stage.id} — ${stage.name}`;
    let size = 15;
    ctx.font = `${size}px "PixelFont", monospace`;
    while (ctx.measureText(label).width > colW && size > 10) {
      size -= 1;
      ctx.font = `${size}px "PixelFont", monospace`;
    }
    drawText(ctx, label, rEdge, ry, size, '#fff4d6', 'right');
    ry += size + 4;
  }
  drawText(ctx, `Chương ${ch.id} · ${stageNumberInChapter(stageIndex)}/${ch.stageCount}`,
    rEdge, ry, 13, '#9a92c0', 'right');
  ry += 17;

  // The biome's own name — a PLACE ("Nhà Tù Băng Giá") distinct from the
  // stage's own name (a mission beat, e.g. "Quản Ngục Băng Giá") — several
  // stages share one biome, so this is the only line that names where the
  // kid actually is. Dimmer and smaller than the stage name so it reads as
  // a subtitle, not a second headline.
  const biome = getBiome(stage.biome);
  if (biome && biome.name) {
    drawText(ctx, biome.name, rEdge, ry, 11, '#726a94', 'right');
    ry += 15;
  }

  const qn = Math.min(feeder.asked, stage.quest.minQuests);
  drawText(ctx, `${qn}/${stage.quest.minQuests} câu`, rEdge, ry, 13, '#9a92c0', 'right');
  ry += 21;

  // Boss: name, phase and HP, all in the enemy column.
  const boss = enemies.find((e) => e.kind === ENEMY_KIND.BOSS);
  if (boss) {
    const def = ENEMIES[boss.enemyId];
    if (def) {
      let size = 16;
      ctx.font = `bold ${size}px "PixelFont", monospace`;
      while (ctx.measureText(def.name).width > colW && size > 11) {
        size -= 1;
        ctx.font = `bold ${size}px "PixelFont", monospace`;
      }
      drawTextBold(ctx, def.name, rEdge, ry, size, '#ff9d8a', 'right');
      ry += size + 4;
    }
    if (boss.phaseName) {
      drawText(ctx, boss.phaseName, rEdge, ry, 13, '#bdb6dc', 'right');
      ry += 16;
    }
    drawMeter(ctx, rightX, ry, colW, 9, boss.hitsLeft / Math.max(1, boss.hits), '#ff2d6f');
    ry += 18;

    // The shield hint is about the ENEMY, so it lives here too — and this is
    // also what finally keeps it off the ship, the wingmen and the boss sprite.
    if (boss.shielded) {
      // A kid whose shots visibly do nothing concludes the game is broken, so
      // this must be explicit AND say what to do about it.
      const lines = derived().al.hasUltimate
        ? ['KHIÊN TỐI!', 'Cần Siêu Công Thức']
        : ['KHIÊN TỐI!', 'Đạn thường không thể bắn xuyên'];
      // Boxed and outlined, because this is the one HUD element that tells the
      // kid to DO something rather than reporting a number. It also pulses, so
      // it cannot be mistaken for the static readouts above it.
      //
      // Line 1 is short ("KHIÊN TỐI!") and stays fixed size; line 2 carries the
      // long instruction sentence, so it shrinks to fit colW rather than being a
      // flat size — the same pattern as the stage/boss-name labels above.
      const size0 = 16;
      ctx.font = `bold ${size0}px "PixelFont", monospace`;
      const w0 = ctx.measureText(lines[0]).width;
      let size1 = 14;
      ctx.font = `bold ${size1}px "PixelFont", monospace`;
      while (ctx.measureText(lines[1]).width > colW && size1 > 10) {
        size1 -= 1;
        ctx.font = `bold ${size1}px "PixelFont", monospace`;
      }
      const w1 = ctx.measureText(lines[1]).width;
      const bw = Math.max(w0, w1) + 16;
      const bh = size0 + size1 + 16;
      const bx = rEdge - bw;
      const a = 0.7 + 0.3 * Math.sin(performance.now() / 220);
      fillRoundRect(ctx, bx, ry - 3, bw, bh, 6, 'rgba(40,14,6,0.92)');
      strokeRoundRect(ctx, bx, ry - 3, bw, bh, 6, `rgba(255,157,58,${a.toFixed(2)})`, 2);
      drawTextBold(ctx, lines[0], rEdge - 8, ry + 2, size0, '#ffb066', 'right');
      drawTextBold(ctx, lines[1], rEdge - 8, ry + size0 + 8, size1, '#ff9d3a', 'right');
      ry += bh + 4;
    }
  }

  // The player's own controls, in the strip just above the quest box, right-aligned
  // under the enemy column. Drawn last so nothing in either column can paint over
  // them.
  drawControlRow(m, rEdge, ctrlRowY(m));
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

const input = new InputHandler(canvas);

input.hitTest = (x, y) => {
  // A PAUSED QUEST CANNOT BE ANSWERED OR HOVERED. This is the one gate both the tap
  // and the hover path go through (input.js calls it for each), so returning -1 here
  // covers every pointer route at once — a kid tapping where a card used to be gets
  // nothing, and the hover highlight cannot betray a card's position under the mask.
  if (state === STATE.PLAYING && paused) return -1;
  if (state === STATE.PLAYING) return box.hitTest(metrics(viewW(), viewH()), x, y);
  return -1;
};
input.onMove = (i) => { box.hover = i; };
// THE SINGLE GATE ON ANSWERING. Every input route converges here — taps and
// touches through input.hitTest, and the number keys 1-9, which call onPick
// DIRECTLY without consulting hitTest at all.
//
// That direct path is why gating hitTest and onKey was not enough: pressing '2'
// while paused answered the hidden quest and cost the kid a wrong answer, measured.
// A pause that can be exploited by the keyboard is not a pause, so the check
// belongs on the one funnel rather than on each of the three routes into it.
input.onPick = (i) => { if (state === STATE.PLAYING && !paused) pickAnswer(i); };

function inRect(p, r) {
  return r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

canvas.addEventListener('pointerdown', (e) => {
  sfx.resumeAudio();
  const p = input.toCanvas(e.clientX, e.clientY);

  switch (state) {
    case STATE.TITLE:
      for (const c of hot.levelCards || []) {
        if (inRect(p, c)) { level = c.id; progress.level = level; saveProgress(progress); sfx.confirm(); return; }
      }
      if (inRect(p, hot.cont)) { sfx.confirm(); continueRun(); return; }
      if (inRect(p, hot.play)) { sfx.confirm(); newRun(); return; }
      if (inRect(p, hot.report)) { sfx.confirm(); setState(STATE.REPORT); return; }
      break;

    case STATE.STORY:
      if (inRect(p, hot.next) || p.y < viewH() * 0.9) advanceStory();
      break;

    case STATE.TUTORIAL:
      if (inRect(p, hot.next)) {
        tutorialIndex++;
        if (tutorialIndex >= scenes.TUTORIAL_PAGES.length) startStage(0);
        else sfx.confirm();
      }
      break;

    case STATE.STAGE_INTRO:
      if (inRect(p, hot.go)) { sfx.confirm(); setState(STATE.PLAYING); }
      break;

    case STATE.VICTORY:
      if (inRect(p, hot.next)) { sfx.confirm(); afterVictory(); }
      break;

    case STATE.ALLY_RESCUE:
      if (inRect(p, hot.next)) { sfx.confirm(); advanceAfterStage(); }
      break;

    case STATE.CHAPTER_END:
      if (inRect(p, hot.next)) { sfx.confirm(); afterChapterEnd(); }
      break;

    case STATE.FAILURE:
      if (inRect(p, hot.retry)) { sfx.confirm(); startStage(stageIndex); return; }
      if (inRect(p, hot.menu)) { sfx.confirm(); setState(STATE.TITLE); return; }
      break;

    case STATE.CREDITS:
      if (inRect(p, hot.done)) { sfx.confirm(); setState(STATE.TITLE); }
      break;

    case STATE.REPORT:
      if (inRect(p, hot.back)) { sfx.confirm(); setState(STATE.TITLE); }
      break;

    // The HUD control row. Handled here rather than through input.hitTest because
    // hitTest's contract is "which ANSWER CARD is at this point" — every caller
    // treats its result as a quest index, and widening it to mean two different
    // things is how the paused-quest bug happened in the first place.
    //
    // These stay live WHILE PAUSED, deliberately: on a tablet there is no F8, so if
    // the pause button stopped responding once pressed the kid would be stuck in a
    // paused game with no way out. It is the one control that must survive its own
    // effect.
    case STATE.PLAYING:
      for (const b of ctrlBtns) {
        if (!inRect(p, b)) continue;
        if (b.id === 'pause') { togglePause(); return; }
        if (b.id === 'sound') {
          muteHint = sfx.toggleMute() ? 'ĐÃ TẮT TIẾNG' : 'ĐÃ BẬT TIẾNG';
          muteHintT = 1.6;
          sfx.confirm();
          return;
        }
        muteHint = toggleMusic() ? 'ĐÃ TẮT NHẠC' : 'ĐÃ BẬT NHẠC';
        muteHintT = 1.6;
        sfx.confirm();
        return;
      }
      break;
  }
});

input.onKey = (e) => {
  sfx.resumeAudio();

  // F8 PAUSES. It sits next to F9/F10 so the three player controls are one block
  // of keys, and it is a function key for the same reason they are: the number row
  // belongs to the answer cards, so 'P' would be a keystroke away from answering.
  //
  // Only meaningful during PLAYING — pausing a story page or the title screen would
  // be a no-op the kid could not tell from a bug, so it is silently ignored there.
  if (e.key === 'F8') {
    if (state === STATE.PLAYING) togglePause();
    e.preventDefault();
    return;
  }

  // While paused, ANY confirm key resumes — a kid who cannot find F8 again must
  // never be trapped. This runs before the answer-key handling below, so a
  // keystroke that resumes can never also submit an answer to the hidden quest.
  if (state === STATE.PLAYING && paused) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
      togglePause();
      e.preventDefault();
      return;
    }
    // Swallow everything else. Without this, the number keys would answer a quest
    // the kid cannot currently see — which is the opposite of the point.
    e.preventDefault();
    return;
  }

  // F9 mutes everything. A function key, not a letter: the number row belongs to
  // the answer cards, and a kid mashing keys must not silence the game by
  // accident.
  if (e.key === 'F9') {
    muteHint = sfx.toggleMute() ? 'ĐÃ TẮT TIẾNG' : 'ĐÃ BẬT TIẾNG';
    muteHintT = 1.6;
    e.preventDefault();
    return;
  }

  // F10 mutes the MUSIC alone. Some kids need quiet to concentrate but still
  // want to hear their answers land, so this is deliberately separate from F9.
  if (e.key === 'F10') {
    muteHint = toggleMusic() ? 'ĐÃ TẮT NHẠC' : 'ĐÃ BẬT NHẠC';
    muteHintT = 1.6;
    e.preventDefault();
    return;
  }

  // ESC skips narration and the tutorial, landing exactly where reading would.
  if (e.key === 'Escape') {
    if (state === STATE.STORY) { finishStory(story.after); e.preventDefault(); return; }
    if (state === STATE.TUTORIAL) { startStage(0); e.preventDefault(); return; }
  }

  if (state === STATE.TITLE) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const i = LEVEL_ORDER.indexOf(level);
      const d = e.key === 'ArrowDown' ? 1 : -1;
      level = LEVEL_ORDER[(i + d + LEVEL_ORDER.length) % LEVEL_ORDER.length];
      e.preventDefault();
    } else if (e.key === 'Enter' || e.key === ' ') {
      newRun();
      e.preventDefault();
    } else if (e.key === 'z' || e.key === 'Z') {
      resetProgress();
      progress = loadProgress();
      earned = [];
      muteHint = 'ĐÃ XOÁ TIẾN TRÌNH';
      muteHintT = 1.6;
      e.preventDefault();
    }
    return;
  }

  // Every menu-ish state advances on Enter/Space.
  if (e.key === 'Enter' || e.key === ' ') {
    switch (state) {
      case STATE.STORY: advanceStory(); break;
      case STATE.TUTORIAL:
        tutorialIndex++;
        if (tutorialIndex >= scenes.TUTORIAL_PAGES.length) startStage(0);
        break;
      case STATE.STAGE_INTRO: setState(STATE.PLAYING); break;
      case STATE.VICTORY: afterVictory(); break;
      case STATE.ALLY_RESCUE: advanceAfterStage(); break;
      case STATE.CHAPTER_END: afterChapterEnd(); break;
      case STATE.FAILURE: startStage(stageIndex); break;
      case STATE.CREDITS: setState(STATE.TITLE); break;
      case STATE.REPORT: setState(STATE.TITLE); break;
      case STATE.PLAYING:
        if (box.quest) pickAnswer(box.focus);
        break;
    }
    e.preventDefault();
    return;
  }

  if (state === STATE.PLAYING && box.quest) {
    const n = box.quest.options.length;
    if (e.key === 'ArrowRight') { box.focus = (box.focus + 1) % n; e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { box.focus = (box.focus - 1 + n) % n; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { box.focus = (box.focus + 2) % n; e.preventDefault(); }
    else if (e.key === 'ArrowUp') { box.focus = (box.focus - 2 + n) % n; e.preventDefault(); }
  }
};

// ---------------------------------------------------------------------------
// The loop
// ---------------------------------------------------------------------------

let last = performance.now();

function loop(now) {
  // Clamp dt so a backgrounded tab does not teleport every enemy past the ship.
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  sceneT += dt;
  if (!(state === STATE.PLAYING && paused)) fieldT += dt;

  const m = metrics(viewW(), viewH());
  clear(ctx, m.w, m.h, '#05030f');

  const stage = getStage(stageIndex);
  const ch = chapterForStage(stageIndex);

  switch (state) {
    case STATE.PLAYING:
      // PAUSED: draw the same frame, advance nothing. updatePlaying owns every
      // clock in the play field — spawns, enemy descent, fire timers, the
      // repair/damage accumulators — so skipping it freezes all of them together.
      // Advancing any subset is how a "pause" ends up letting the fleet close in.
      if (!paused) updatePlaying(dt, m);
      // updatePlaying can change state mid-frame, so re-check before drawing.
      if (state === STATE.PLAYING) renderPlaying(m);
      break;

    case STATE.STAGE_CLEAR:
      updateStageClear(dt, m);
      // updateStageClear ends by calling setState(VICTORY) mid-frame; re-check
      // for the same reason PLAYING does above.
      if (state === STATE.STAGE_CLEAR) renderStageClear(m);
      break;

    case STATE.TITLE:
      stars.update(dt);
      hot = scenes.drawTitle(ctx, m, {
        level,
        hasProgress: (progress.stage || 0) > 0 || (progress.upgrades || []).length > 0,
        stage: progress.stage || 0,
        rank: rankFor(progress.totalCorrect || 0, progress.totalWrong || 0, progress.demotions || 0),
        rankGoal: nextRankGoal(progress.totalCorrect || 0, progress.totalWrong || 0, progress.demotions || 0),
        totalCorrect: progress.totalCorrect || 0,
        hasMastery: weakestFirst(progress.mastery || {}).length > 0,
      }, sceneT);
      break;

    case STATE.REPORT:
      stars.update(dt);
      hot = scenes.drawReport(ctx, m, {
        rows: weakestFirst(progress.mastery || {}),
      }, sceneT);
      break;

    case STATE.STORY:
      // Never sit in STORY with nothing to show; hand off the way reading would.
      if (!story.pages.length || story.page >= story.pages.length) {
        finishStory(story.after);
        break;
      }
      hot = scenes.drawStoryPage(ctx, m, story.pages[story.page], sceneT, {
        index: story.page,
        total: story.pages.length,
        last: story.page === story.pages.length - 1,
      });
      break;

    case STATE.TUTORIAL:
      hot = scenes.drawTutorial(ctx, m, { index: tutorialIndex }, sceneT);
      break;

    case STATE.STAGE_INTRO:
      hot = scenes.drawStageIntro(ctx, m, {
        stage_: stage,
        stage: stageIndex,
        chapter: ch,
        stageInChapter: stageNumberInChapter(stageIndex),
        allies: allyIds(),
      }, sceneT);
      break;

    case STATE.VICTORY:
      hot = scenes.drawVictory(ctx, m, {
        asked: stageStats.asked,
        correct: stageStats.correct,
        wrong: stageStats.wrong,
        accuracy: feeder ? feeder.accuracy() : 1,
        bestCombo,
        upgrade: UPGRADES[stage.reward] || null,
        isFinal: stageIndex >= TOTAL_STAGES - 1,
        rankUp: lastRankUp,
      }, sceneT);
      break;

    case STATE.ALLY_RESCUE: {
      // Prefer the stage's own ally, but fall back to the most recently earned
      // one so the scene is coherent even if it is entered out of order (which
      // __debug can do, and which is how the missing-fallback crash surfaced).
      const u = UPGRADES[stage.reward];
      const ids = allyIds();
      const styleId = (u && u.type === 'ally' && u.ally)
        || (ids.length ? ids[ids.length - 1] : 'engineer');
      hot = scenes.drawAllyRescue(ctx, m, {
        allyStyle: styleId,
        allies: allyIds(),
      }, sceneT);
      break;
    }

    case STATE.CHAPTER_END:
      hot = scenes.drawChapterEnd(ctx, m, { chapter: ch, allies: allyIds() }, sceneT);
      break;

    case STATE.FAILURE:
      hot = scenes.drawFailure(ctx, m, {
        correct: stageStats.correct,
        accuracy: feeder ? feeder.accuracy() : 0,
        // Only set on the loss that actually cost a rank, so the screen stays
        // quiet on losses one and two.
        rankDown: lastRankDown,
        deaths: progress.deathStage === stageIndex ? (progress.stageDeaths || 0) : 0,
        deathsPerDemotion: DEATHS_PER_DEMOTION,
      }, sceneT);
      break;

    case STATE.CREDITS:
      hot = scenes.drawCredits(ctx, m, { lines: CREDITS, allies: allyIds() }, sceneT);
      break;
  }

  // Transient toast, drawn last so it appears in every state.
  if (muteHintT > 0) {
    muteHintT -= dt;
    const a = Math.min(1, muteHintT / 0.4);
    drawTextBold(ctx, muteHint, m.cx, m.h - 26, 15,
      `rgba(255,210,74,${a.toFixed(2)})`, 'center', 'middle');
  }

  requestAnimationFrame(loop);
}

// audio.js ducks the music on loud events; wire the implementation in here so
// neither module has to import the other at module scope.
sfx.registerDuck(duckMusic);

ship.place(metrics(viewW(), viewH()));
requestAnimationFrame(loop);

// ---------------------------------------------------------------------------
// __debug — localhost only.
//
// This is how a late scene is reached without playing to it. Without it, testing
// the chapter-3 ending means a real hour of arithmetic.
// ---------------------------------------------------------------------------

if (['localhost', '127.0.0.1'].includes(location.hostname)) {
  window.__debug = {
    STATE,
    setLevel: (l) => { level = l; },
    // Jump to any stage with the upgrades the kid would plausibly have by then,
    // so a late stage is exercised with its real firepower rather than a bare ship.
    goStage: (n) => {
      const i = Math.max(0, Math.min(TOTAL_STAGES - 1, n - 1));
      earned = STAGES.slice(0, i).map((s) => s.reward).filter(Boolean);
      startStage(i);
    },
    setState: (s) => { if (STATE[s]) setState(STATE[s]); },
    story: (chapterId, which) => {
      const pages = (CHAPTER_STORY[chapterId] || {})[which] || [];
      if (pages.length) beginStory(pages, 'title');
    },
    prologue: () => beginStory([...PROLOGUE, ...(CHAPTER_STORY[1].opening)], 'tutorial'),
    tutorial: () => { tutorialIndex = 0; setState(STATE.TUTORIAL); },
    credits: () => { earned = STAGES.map((s) => s.reward); setState(STATE.CREDITS); },
    allies: (n) => {
      earned = ALLIES.slice(0, n).map((a) => `ally_${a.id}`);
      const m = metrics(viewW(), viewH());
      ship.place(m);
      allyShips = allyIds().map((id) => {
        const a = ALLIES.find((x) => x.id === id);
        return { id, style: a.style, slot: LINEUP_SLOTS[a.slot], x: ship.x, y: ship.y, fireT: 0 };
      });
    },
    lastWave: () => {
      const stage = getStage(stageIndex);
      waveIndex = stage.waves.length - 1;
      enemies = [];
      pending = [];
      waveActive = false;
    },
    chargeUlt: () => { ultCharge = ULT_CHARGE_FULL; ultReady = true; },
    // Setting hull must also clear the mercy window, or a test shot fired right
    // after it is silently ignored by takeDamage() and the shield looks like it
    // blocked something it did not. That cost real debugging time.
    hull: (v) => { ship.hull = v; ship.invuln = 0; },
    kill: () => enemies.forEach((e) => { e.dead = true; }),
    reset: () => { resetProgress(); progress = loadProgress(); earned = []; setState(STATE.TITLE); },
    answer: (i) => pickAnswer(i),
    info: () => ({
      state, level, stage: stageIndex + 1, stageName: getStage(stageIndex).name,
      chapter: chapterForStage(stageIndex).id,
      hull: ship.hull, maxHull: ship.maxHull,
      wave: waveIndex, enemies: enemies.length, pending: pending.length,
      asked: feeder ? feeder.asked : 0, correct: feeder ? feeder.correct : 0,
      wrong: feeder ? feeder.wrong : 0, escaped,
      combo, bestCombo, reinforce: reinforceCount,
      comboShield: +comboShield.toFixed(2), shieldStreak, hasShieldSkill: derived().up.skills.has('shield'),
      sceneT: +sceneT.toFixed(2), pulse: +box.pulse.toFixed(2),
      allies: allyIds(), earned: earned.length,
      ultCharge, ultReady,
      quest: box.quest ? box.quest.text : null,
      correctIndex: box.quest ? box.quest.correctIndex : -1,
      locked: box.locked,
      storyPage: state === STATE.STORY ? `${story.page + 1}/${story.pages.length}` : null,
    }),
    fx: () => ({
      particles: parts.particles.length, visuals: parts.visuals.length,
      shake: +parts.shake.toFixed(2), shots: shots.length,
    }),
    pause: () => { if (state === STATE.PLAYING) togglePause(); return paused; },
    // Advance the real game loop by `seconds`, in fixed 50ms steps (the same
    // clamp loop() itself applies), WITHOUT waiting on requestAnimationFrame.
    // Exists because rAF is throttled to a full standstill in an automated /
    // backgrounded tab (see the game-browser-test skill) — sceneT and
    // box.pulse never move on their own there, so anything gated on them
    // (ANSWER_GUARD, the combo shield's 5s window) is untestable without a
    // way to drive real frames deterministically. This calls the SAME loop()
    // the browser's rAF calls; it is not a separate simulation.
    tick: (seconds = 1, step = 0.05) => {
      const n = Math.ceil(seconds / step);
      for (let i = 0; i < n; i++) loop(last + step * 1000);
    },
    // Per-shape mastery: what the kid is weakest at, weakest first.
    mastery: () => ({ raw: progress.mastery, report: weakestFirst(progress.mastery || {}) }),
    isPaused: () => paused,
    // The control row's live tap targets. Exposed because the alternative is a test
    // that recomputes the layout itself, and a test carrying its own copy of the
    // geometry passes while the real button sits somewhere else — which is how a
    // tap-target bug survives its own test.
    ctrls: () => ctrlBtns.map((b) => ({ ...b, cx: b.x + b.w / 2, cy: b.y + b.h / 2 })),
    entities: () => ({
      ship: { x: Math.round(ship.x), y: Math.round(ship.y) },
      allies: allyShips.map((a) => ({ id: a.id, x: Math.round(a.x), y: Math.round(a.y) })),
      enemies: enemies.map((e) => ({
        id: e.id, x: Math.round(e.x), y: Math.round(e.y),
        hitsLeft: e.hitsLeft, shielded: !!e.shielded, phase: e.phaseName,
        kind: e.kind, diving: !!e.diving, reinforcement: !!e.reinforcement,
      })),
      shots: shots.map((p) => ({
        x: Math.round(p.x), y: Math.round(p.y),
        vx: Math.round(p.vx), vy: Math.round(p.vy), friendly: p.friendly,
        homing: !!p.homing,
      })),
      delayed: delayedShots.length,
    }),
  };
}
