// main.js — Milestone 6: full game with state machine, stages, rewards.
//
// States: TITLE → STAGE_INTRO → PLAYING → (VICTORY → REWARD → next stage)
//                                        └→ FAILURE → retry stage
// Clearing the final stage → GAME_COMPLETE.

import { clear, drawSprite, drawScene, drawText, drawRect, DOT } from './render.js';
import { SPRITES, STAFF_WISDOM, princessSprite, princessThemeColor } from './sprites.js';
import { getBiome, drawBiomeTerrain, drawBiomeScenery, drawBiomeLights, drawBiomeWeather } from './biomes.js';
import { Hero, Monster, Projectile, MONSTER_KIND } from './entities.js';
import { attackFor } from './bossattacks.js';
import { ParticleSystem, drawAura, drawShieldAura, STAFFCAST_FRAMES } from './effects.js';
import { TypingTracker, attachKeyboard } from './input.js';
import { RankTracker } from './rank.js';
import { SKILLS, SKILL_CLASS, pickWord, resolveSkill } from './skills.js';
import { getStage, TOTAL_STAGES } from './stages.js';
import { monstersForBiome, MONSTER_COLOR } from './monsters.js';
import {
  chapterForStage, stageNumberInChapter, isChapterFinale, isChapterStart,
  nextChapter, isFinalChapter,
} from './chapters.js';
import { openingFor, closingFor, openingTitle, closingTitle } from './story.js';
import { rewardForStage, loadProgress, saveProgress, resetProgress, applyRewards, equippedLook } from './rewards.js';
import { Combo } from './combo.js';
import { PrincessSupport, PRINCESS_SUPPORT } from './princesses.js';
import { Tutorial } from './tutorial.js';
import * as Scenes from './scenes.js';
import * as Audio from './audio.js';
import * as Music from './music.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// The canvas fills the browser window at native resolution. All drawing uses
// logical CSS pixels: the backing store is scaled by devicePixelRatio and the
// context transform maps 1 logical unit → dpr device pixels, so every layout
// value below stays in CSS px and reads crisp on retina/high-DPI displays.
// W / H / GROUND_Y are recomputed on each resize (see resize()).
let W = 960;
let H = 540;
// 180 = 3x the original 60px ground band (see drawBiomeTerrain in biomes.js,
// which fills from GROUND_Y to H as solid ground).
const GROUND_HEIGHT = 180;
let GROUND_Y = H - GROUND_HEIGHT;

function resize() {
  const cssW = window.innerWidth;
  const cssH = window.innerHeight;
  // Cap DPR so 4K/retina windows don't allocate an enormous backing store.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  // Draw in logical CSS pixels; the transform handles the device scaling.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false; // reset whenever the backing store resizes
  W = cssW;
  H = cssH;
  GROUND_Y = H - GROUND_HEIGHT;
}

resize();
window.addEventListener('resize', resize);

const STATE = {
  TITLE: 'title',
  STORY: 'story',              // paged narration (story.js); SPACE turns, ESC skips
  TUTORIAL: 'tutorial',
  STAGE_INTRO: 'stage_intro',
  BOSS_WARNING: 'boss_warning', // locked ~3s "get ready" beat before a stageboss spawns
  PLAYING: 'playing',
  PAUSED: 'paused',            // simulation frozen mid-fight; F8 toggles it
  VICTORY: 'victory',
  REWARD: 'reward',
  CHAPTER_END: 'chapter_end',  // a whole chapter cleared → celebrate, then story
  FAILURE: 'failure',
  GAME_COMPLETE: 'game_complete',
  CREDITS: 'credits',          // the credits roll, after the Final Ending
};

// --- Persistent + session state ---
let progress = loadProgress();       // { stage, rewards: [] }
let state = STATE.TITLE;
let stageIndex = progress.stage;     // 0-based
let tick = 0;                        // global animation tick
let stateTick = 0;                   // resets each state change (for scene anims)

// --- Gameplay state (rebuilt per stage) ---
let hero, particles, tracker;
let monster = null;
let projectiles = [];
let waveCursor = 0;
let shakeTimer = 0;
let pendingReward = null;
let pendingBossWave = null;   // the stageboss wave waiting behind BOSS_WARNING
let bossWarningTimer = 0;
let slowMoTimer = 0;          // >0 while a stageboss's death is being savored
let deathFocus = null;        // {x, y} the slow-mo zoom pushes in on
let pausedFrom = null;        // STATE.PLAYING or STATE.BOSS_WARNING — where F8 resumes to
let showTelexHelper = true;   // F7 toggles the keystroke guide row under the target word

// --- The Staff of Wisdom's spell (see startSpell/castSpell/abandonSpell) -----
// A second, independent typing target. While `spellActive` is true, keystrokes
// route to `spellTracker` instead of the monster's `tracker` (see
// activeTracker(), wired into attachKeyboard below) — the monster's word stays
// on screen but frozen, and resumes taking keys once the spell resolves either
// way (cast or fumbled).
let spellTracker;
let spellActive = false;
let spellMistakePending = false; // true right after an uncorrected wrong key;
                                  // a 2nd non-Backspace key while this is set
                                  // abandons the spell (see attachKeyboard call)

tracker = new TypingTracker();
spellTracker = new TypingTracker();
particles = new ParticleSystem();
const combo = new Combo();
// Lifetime rank, seeded from persisted stats (accuracy + speed across sessions).
const rank = new RankTracker(progress.rankStats || {});
const tutorial = new Tutorial();

// The ten rescued princesses' one-time support abilities (chapters 2-3 only —
// see princesses.js). Seeded from persisted progress so a princess already
// spent stays spent across sessions.
const princesses = new PrincessSupport(progress.princessesUsed || []);
// Stack of active princess-cast banners (see drawPrincessBanner). Each entry
// is {p, timer}; a new cast PUSHES rather than replacing, so back-to-back
// casts (e.g. two support triggers on the same wave) stack and slide, instead
// of the newer banner silently cutting off a kid still reading the last one.
let princessBanners = [];
const PRINCESS_BANNER_LIFE = 780; // frames a banner stays before it starts sliding out

// A stageboss's signature attack name, announced above the hero's head with a
// zoom in -> hold -> zoom out (see drawBossSkillBanner) the instant the attack
// lands — see bossattacks.js for the roster.
let bossSkillBannerTimer = 0;
let bossSkillBannerText = '';

// Persist lifetime rank stats into the progress object and save.
function saveRank() {
  progress.rankStats = rank.serialize();
  saveProgress(progress);
}

// Enter the tutorial from `fromState` (remembered so ESC/finish returns there).
let tutorialReturn = STATE.TITLE;
function startTutorial(fromState) {
  tutorialReturn = fromState;
  tutorial.reset();
  setState(STATE.TUTORIAL);
}

// Leave the tutorial: mark it seen, then go where we came from (title, or
// straight into the game if it auto-launched before the first stage).
function finishTutorial() {
  if (!progress.seenTutorial) {
    progress.seenTutorial = true;
    saveProgress(progress);
  }
  if (tutorialReturn === STATE.STAGE_INTRO) {
    stageIndex = progress.stage;
    setState(STATE.STAGE_INTRO);
  } else {
    setState(STATE.TITLE);
  }
}

// ---------------------------------------------------------------------------
// Story flow
// ---------------------------------------------------------------------------
// The narration is a queue of pages plus an `after` action naming where to go
// when the pages run out (or when the kid presses ESC to skip — skipping must
// land in exactly the same place as reading, or ESC would strand them).
//
// `after` values:
//   'tutorial'    → the Telex lessons, then the first stage (first play only)
//   'stage'       → straight into the upcoming stage's intro
//   'nextchapter' → a chapter just closed: open the NEXT chapter's story, then
//                   its first stage (this is the chapter-to-chapter hand-off)
//   'ending'      → the Final Ending (after the last chapter's closing pages)
//   'title'       → back to the title (replaying the story from the menu)
let story = { pages: [], page: 0, title: '', after: 'stage' };

function startStory(pages, title, after) {
  // Nothing to show (a chapter with no narration) → go straight on.
  if (!pages || pages.length === 0) {
    finishStory(after);
    return;
  }
  story = { pages, page: 0, title, after };
  setState(STATE.STORY);
}

// Where the story hands off. Called both when the pages run out and on ESC, so
// skipping always lands exactly where reading would have.
function finishStory(after) {
  if (after === 'tutorial') {
    // First-ever play: the King has given the mission, NOW teach the craft.
    startTutorial(STATE.STAGE_INTRO);
    return;
  }
  if (after === 'ending') {
    setState(STATE.GAME_COMPLETE);
    return;
  }
  if (after === 'title') {
    setState(STATE.TITLE);
    return;
  }
  if (after === 'nextchapter') {
    // A chapter's closing pages just ended. grantReward() already advanced
    // progress.stage into the next chapter's first stage, so beginJourney()
    // picks up that chapter's OPENING story and then its first stage.
    beginJourney();
    return;
  }
  stageIndex = progress.stage;
  setState(STATE.STAGE_INTRO);
}

// Has this chapter's opening story already been shown? Persisted, so a kid who
// closes the tab mid-chapter isn't made to re-read the prologue.
function storySeen(chapterId) {
  return Array.isArray(progress.seenStory) && progress.seenStory.includes(chapterId);
}

function markStorySeen(chapterId) {
  if (!Array.isArray(progress.seenStory)) progress.seenStory = [];
  if (!progress.seenStory.includes(chapterId)) {
    progress.seenStory.push(chapterId);
    saveProgress(progress);
  }
}

// Begin play at `progress.stage`: if that stage opens a chapter whose story the
// kid hasn't seen, narrate it first. Otherwise go straight to the stage intro
// (or the tutorial, on a first-ever play).
function beginJourney() {
  stageIndex = progress.stage;
  const chapter = chapterForStage(stageIndex);
  const needsTutorial = !progress.seenTutorial;

  if (isChapterStart(stageIndex) && !storySeen(chapter.id)) {
    markStorySeen(chapter.id);
    // On a first-ever play the tutorial comes AFTER the prologue: the King
    // gives the mission, then the hero learns to write.
    startStory(openingFor(chapter.id), openingTitle(chapter.id), needsTutorial ? 'tutorial' : 'stage');
    return;
  }
  if (needsTutorial) {
    startTutorial(STATE.STAGE_INTRO);
    return;
  }
  setState(STATE.STAGE_INTRO);
}

function setState(next) {
  state = next;
  stateTick = 0;
  updateMusic();
}

// ---------------------------------------------------------------------------
// Soundtrack
// ---------------------------------------------------------------------------
// One place decides what should be looping, driven purely by the current state
// (and, while playing, by the chapter). Called from setState() so every scene
// transition picks up its theme automatically — no scene needs to remember to
// start or stop music, and `playMusic` is a no-op when the right loop is already
// running, so walking stage-to-stage inside a chapter never restarts the track.
function songForState() {
  switch (state) {
    case STATE.TITLE:
      return 'title';
    case STATE.STORY:
      return 'story';
    case STATE.TUTORIAL:
      return 'tutorial';
    case STATE.STAGE_INTRO:
    case STATE.BOSS_WARNING:
    case STATE.PLAYING: {
      // The World Devourer (stage 26's stageboss, the only wave with `phases`)
      // REPLACES the chapter theme the moment he appears — BOSS_WARNING is the
      // "get ready" beat right before the fight, so the swap happens there, not
      // on the first hit. The theme then escalates with his phaseIndex (see the
      // phaseChanged branch in onProjectileHit, which re-calls updateMusic()).
      const finalBossPhases = state === STATE.BOSS_WARNING ? pendingBossWave?.phases : monster?.phases;
      if (finalBossPhases) {
        const idx = state === STATE.BOSS_WARNING ? 0 : monster.phaseIndex;
        return `finalBoss${Math.min(idx + 1, finalBossPhases.length)}`;
      }
      // Otherwise the battle theme follows the CHAPTER, not the stage: a kid
      // plays 6-12 stages inside one chapter, and a new loop every stage would
      // make the soundtrack feel restless. The stage intro shares its chapter's
      // theme so the music carries unbroken from the intro into the fight.
      const chapter = chapterForStage(stageIndex);
      return `battle${Math.min(chapter.id, 3)}`;
    }
    case STATE.PAUSED: {
      // Keep whatever was playing going rather than cutting it — pausing is a
      // breather, not a scene change, and this game avoids abrupt audio cuts
      // elsewhere (see duckMusic in audio.js). Re-derive the fight's theme from
      // `pausedFrom` exactly as the PLAYING/BOSS_WARNING branch above does.
      const finalBossPhases = pausedFrom === STATE.BOSS_WARNING ? pendingBossWave?.phases : monster?.phases;
      if (finalBossPhases) {
        const idx = pausedFrom === STATE.BOSS_WARNING ? 0 : monster.phaseIndex;
        return `finalBoss${Math.min(idx + 1, finalBossPhases.length)}`;
      }
      const chapter = chapterForStage(stageIndex);
      return `battle${Math.min(chapter.id, 3)}`;
    }
    case STATE.VICTORY:
    case STATE.REWARD:
      return 'victory';
    case STATE.FAILURE:
      return 'failure';
    case STATE.CHAPTER_END:
    case STATE.GAME_COMPLETE:
    case STATE.CREDITS:
      return 'triumph';
    default:
      return null;
  }
}

function updateMusic() {
  const song = songForState();
  if (song) Music.playMusic(song);
  else Music.stopMusic();
}

// ---------------------------------------------------------------------------
// Stage lifecycle
// ---------------------------------------------------------------------------
function startStage() {
  const stage = getStage(stageIndex);
  hero = new Hero(120, GROUND_Y);
  applyRewards(hero, progress.rewards); // equip unlocked gear/skills
  monster = null;
  projectiles = [];
  waveCursor = 0;
  shakeTimer = 0;
  tracker.clear();
  endSpell(); // a retry/restart shouldn't leave a stale spell armed
  combo.reset();
  princessBanners = []; // a retry/restart shouldn't leave stale banners up
  bossSkillBannerTimer = 0;
  bossSkillBannerText = '';
  setState(STATE.PLAYING);
}

function currentStage() {
  return getStage(stageIndex);
}

// Weapon color for the menu scenes. Read from `progress.rewards` (never from the
// live `hero`): grantReward() pushes the new reward into progress at VICTORY, but
// `hero` is still the one built by the PREVIOUS startStage(), so asking the hero
// would show the old blade on the reward/stage-intro scenes and only "upgrade"
// once the next fight begins. progress is the source of truth and is also defined
// before any stage has started (e.g. straight out of the tutorial).
function heroWeaponColor() {
  return equippedLook(progress.rewards).weaponColor;
}

function spawnNextWave() {
  const stage = currentStage();
  if (waveCursor >= stage.waves.length) {
    // All waves cleared → victory.
    tracker.clear();
    endSpell(); // no penalty — the fight just ended out from under it
    Audio.victory();
    setState(STATE.VICTORY);
    return;
  }
  const wave = stage.waves[waveCursor];

  // A stageboss is the stage's set-piece fight — give it a locked "get ready"
  // beat instead of spawning silently mid-frame. BOSS_WARNING re-enters here
  // (via pendingBossWave) once its timer elapses, so the construction logic
  // below never needs to be duplicated.
  if (wave.type === 'stageboss' && wave !== pendingBossWave) {
    startBossWarning(wave);
    return;
  }
  pendingBossWave = null;
  waveCursor++;

  // Specials are rewards: resolve the wave's requested skill down to the best
  // one the kid has actually EARNED (skills.js resolveSkill), so an early stage
  // never fires an ultimate that hasn't been awarded yet.
  const skill = resolveSkill(wave.skill, hero.unlockedSkills);
  // Each stage fields monsters matching its scene — see monsters.js.
  const roster = monstersForBiome(stage.biome);

  if (wave.type === 'creep') {
    monster = new Monster(MONSTER_KIND.CREEP, roster.creep, W - 60, GROUND_Y, {
      speed: 0.32,
      hitsNeeded: 1,
    });
    monster.word = pickWord(wave.pool, waveCursor + stageIndex);
    monster.skill = skill;
    monster.displayName = roster.creepName;
  } else if (wave.type === 'elite') {
    monster = new Monster(MONSTER_KIND.CREEP, roster.elite, W - 60, GROUND_Y, {
      speed: 0.14,
      hitsNeeded: 1,
      contactDamage: 20,
    });
    monster.word = pickWord(wave.pool, waveCursor + stageIndex);
    monster.skill = skill;
    monster.displayName = roster.creepName;
    monster.tint = 'elite';
  } else if (wave.type === 'boss') {
    monster = new Monster(MONSTER_KIND.BOSS, roster.boss, W - 40, GROUND_Y, {
      speed: 0.32,
      hitsNeeded: 3,
      standGap: 330,
      attackEvery: 420,
      attackDamage: 12,
    });
    monster.skill = skill;
    monster.displayName = roster.bossName;
    monster.pool = wave.pool;
    assignBossWord();
  } else if (wave.type === 'stageboss') {
    monster = new Monster(MONSTER_KIND.STAGEBOSS, roster.stageboss, W - 30, GROUND_Y, {
      speed: 0.28,
      hitsNeeded: 6,
      standGap: 360,
      attackEvery: 480,
      attackDamage: 15,
      // A wave may declare `phases` (stage 26's World Devourer) — the fight then
      // runs as several shorter bars instead of one long one. See Monster.phases.
      phases: wave.phases,
    });
    monster.skill = skill;
    monster.displayName = roster.stagebossName;
    monster.pool = wave.pool;
    assignBossWord();
    // songForState() reads monster.phases to pick the final-boss theme, but this
    // spawn happens mid-frame inside the PLAYING state set by updateBossWarning()
    // — before this point `monster` was still null, so that setState() call ran
    // songForState() too early and fell back to the chapter's battle theme. Re-run
    // it now that the monster (and its phases, if any) actually exists.
    updateMusic();
  }
  if (monster.word) tracker.setTarget(monster.word.vi, monster.word.telex);

  // Princess support tied to a wave just spawning — see princesses.js.
  // `bossSpawn` covers Ánh Dương's Shield and Tình Yêu's instant Staff
  // charge (both boss/stageboss); `creepSpawn` covers Cát's Slow (a hot
  // streak against a run of weak enemies).
  if (monster.kind === MONSTER_KIND.BOSS || monster.kind === MONSTER_KIND.STAGEBOSS) {
    checkPrincessSupport('bossSpawn');
  } else {
    checkPrincessSupport('creepSpawn');
  }
}

function assignBossWord() {
  const pool = monster.pool || (monster.kind === MONSTER_KIND.STAGEBOSS ? 'sentences' : 'phrases');
  const idx = monster.maxHits - monster.hitsLeft + waveCursor + stageIndex;
  monster.word = pickWord(pool, idx);
  tracker.setTarget(monster.word.vi, monster.word.telex);
}

const BOSS_WARNING_FRAMES = 180; // ~3s at 60fps
const BOSS_SKILL_BANNER_FRAMES = 70; // ~1.2s at 60fps — zoom in, hold, zoom out

function startBossWarning(wave) {
  pendingBossWave = wave;
  bossWarningTimer = BOSS_WARNING_FRAMES;
  monster = null;
  tracker.clear();
  endSpell(); // no penalty — the scene is cutting away, not a typing failure
  shakeTimer = Math.max(shakeTimer, 10);
  Audio.bossWarning();
  setState(STATE.BOSS_WARNING);
}

function updateBossWarning() {
  if (shakeTimer > 0) shakeTimer--;
  bossWarningTimer--;
  if (bossWarningTimer <= 0) {
    setState(STATE.PLAYING);
    spawnNextWave(); // re-enters with pendingBossWave set → falls through to the real spawn
  }
}

// ---------------------------------------------------------------------------
// Combat callbacks
// ---------------------------------------------------------------------------
// Per-keystroke audio feedback: a rising blip on progress, a buzz on mistake.
// A `mistake` here means the buffer has gone "off the rails" — it can no longer
// become the target by typing more Telex keys (see tracker.isMistake). That is a
// genuine wrong turn, NOT one of Telex's legitimate intermediate states (typing
// the tone key last), so we break the combo the instant it happens rather than
// waiting for word completion — the streak should visibly vanish the moment the
// kid mistypes. (Word-completion still judges keystroke economy via wasClean.)
tracker.onProgress = (matchedLen, mistake) => {
  if (mistake) {
    Audio.keyError();
    if (combo.break()) Audio.comboBreak();
  } else {
    Audio.keyBlip(matchedLen);
  }
};

tracker.onComplete = (clean = true) => {
  if (!monster || monster.dying) return;
  const skill = monster.skill;
  Audio.keyBlip(monster.word ? monster.word.vi.length : 4);
  if (skill.cls === SKILL_CLASS.SPECIAL) Audio.specialAttack();
  else Audio.simpleAttack();
  hero.triggerAttack();

  // Rank: every completed word feeds lifetime accuracy + speed. A promotion
  // (new best rank) triggers a celebration banner + fanfare.
  const vlen = monster.word ? monster.word.vi.replace(/\s/g, '').length : 0;
  const promo = rank.recordWord(vlen, tracker.elapsedMs, clean);
  if (promo.rankUp) Audio.rankUp(rank.displayIndex);
  else if (promo.demoted) Audio.comboBreak();
  saveRank();

  // Combo: a clean word grows the streak (with milestone/tier flourishes); a
  // fumbled word (backspaces or wasted keystrokes) resets it. The multiplier
  // this hit will use is captured now and read by onProjectileHit on landing.
  if (clean) {
    const info = combo.increment();
    if (info.milestone) {
      const bx = hero.x + hero.sprite.w * DOT * hero.scale;
      const by = hero.y + (hero.sprite.h * DOT * hero.scale) / 2;
      particles.comboBlast(bx, by, combo.tier.color, Math.min(3, Math.floor(combo.count / 5)));
      Audio.comboMilestone(combo.count);
    } else if (info.tierUp) {
      Audio.comboTierUp();
    }
  } else if (combo.break()) {
    Audio.comboBreak();
  }

  // The Staff of Wisdom: a CLEANLY typed word adds a charge. Once full, a spell
  // incantation appears for the kid to type as ITS OWN target (see startSpell)
  // — this hit stays an ordinary one. Accuracy is what charges the meter (not
  // speed), so the artifact rewards exactly the skill the game is teaching.
  if (hero.hasStaff && !hero.staffReady && clean && hero.chargeStaff()) {
    Audio.staffCharged(); // just filled — tell the kid it's ready
    startSpell();
  }

  const startX = hero.x + hero.sprite.w * DOT * hero.scale;
  const startY = hero.y + (hero.sprite.h * DOT * hero.scale) / 2;
  const targetX = monster.x + monster.width / 2;

  const pj = skill.projectile;
  const color = hero.weaponColor && skill.cls === SKILL_CLASS.SIMPLE ? hero.weaponColor : pj.color;
  const speed = pj.speed + (hero.projectileSpeedBonus || 0);
  tracker.clear();
  for (let i = 0; i < pj.count; i++) {
    const offset = (i - (pj.count - 1) / 2) * 10;
    const proj = new Projectile(startX, startY + offset, targetX, {
      speed,
      color,
      size: pj.size,
      special: pj.special,
    });
    proj.isLeadHit = i === 0;
    proj.trailCfg = skill.trail || { color, size: pj.size * 0.8 };
    projectiles.push(proj);
  }
  if (skill.shake) shakeTimer = skill.shake;
};

// ---------------------------------------------------------------------------
// The Staff of Wisdom's spell
// ---------------------------------------------------------------------------
// Once the meter is full, the kid gets a THIRD target — a short incantation —
// on top of the current monster's word. Typing it correctly fires an immediate
// gold crit at the monster; one wrong key not corrected on the very next
// keystroke fumbles it and burns the charge for nothing. Either way the meter
// empties and the monster's own word resumes taking keys.
const SPELL_CRIT_BONUS = 6; // flat extra hit-power on top of the combo multiplier

function startSpell() {
  spellActive = true;
  spellMistakePending = false;
  const word = pickWord('spell', Math.floor(Math.random() * 9999));
  spellTracker.setTarget(word.vi, word.telex);
}

function endSpell() {
  spellActive = false;
  spellMistakePending = false;
  spellTracker.clear();
}

// A mistake left uncorrected (the kid's very next key was NOT Backspace) burns
// the charge for nothing — see the keyboard dispatch below, which calls this.
function abandonSpell() {
  if (!spellActive) return;
  hero.spendStaff();
  Audio.comboBreak(); // the "that didn't work" cue, reused rather than adding a new sound
  particles.burst(hero.x + 40, hero.y + 20, '#6a6a8a', 14, 4);
  endSpell();
}

spellTracker.onProgress = (matchedLen, mistake) => {
  if (mistake) {
    Audio.keyError();
    spellMistakePending = true;
  } else {
    Audio.keyBlip(matchedLen);
    spellMistakePending = false;
  }
};

spellTracker.onComplete = () => {
  hero.spendStaff();
  Audio.staffStrike();
  endSpell();

  if (!monster || monster.dying) return;
  const skill = monster.skill;
  const startX = hero.x + hero.sprite.w * DOT * hero.scale;
  const startY = hero.y + (hero.sprite.h * DOT * hero.scale) / 2;
  const targetX = monster.x + monster.width / 2;
  const pj = skill.projectile;
  const speed = pj.speed + (hero.projectileSpeedBonus || 0);
  // Visibly bigger and gold-white — a cast crit should read as "that was
  // different" without needing to be explained.
  const proj = new Projectile(startX, startY, targetX, {
    speed,
    color: '#fff6d0',
    size: pj.size * 1.6,
    special: pj.special,
  });
  proj.isLeadHit = true;
  proj.empowered = true;
  proj.trailCfg = { color: '#ffffff', fadeTo: '#ffd24a', size: pj.size * 1.2 };
  projectiles.push(proj);
  shakeTimer = Math.max(shakeTimer, (skill.shake || 0) + 10);
};

const SLOWMO_FRAMES = 180; // ~3s of real frames spent throttled to a crawl

function onProjectileHit(p) {
  if (!monster) return;
  const skill = monster.skill;
  const cx = monster.x + monster.width / 2;
  const cy = monster.y + (monster.sprite.h * DOT * monster.scale) / 2;
  const b = skill.burst;
  // Combo tier juices up the impact burst (more, bigger, punchier particles).
  const tier = combo.tier;
  const juice = tier.dmg; // 1 / 1.5 / 2 / 3
  particles.burst(cx, cy, b.color, Math.round(b.n * juice), b.power * (0.8 + juice * 0.2));

  if (!p.isLeadHit || monster.dying) return;

  // Signature skill effect (slash arc / explosion / lightning / meteor).
  particles.play(skill.effect, cx, cy, W, H);
  // An empowered Staff cast layers its OWN effect on top, regardless of which
  // skill is equipped — this is what makes spending a full charge feel like
  // the Staff itself did something, instead of just a recolored version of
  // the same hit the kid sees every other word.
  if (p.empowered) particles.play('staffcast', cx, cy, W, H);
  if (particles.screenShake > shakeTimer) shakeTimer = particles.screenShake;
  monster.reactToHit(); // white flash + knockback
  Audio.hit();

  // A SHIELDED phase (the World Devourer's first form) takes no damage from an
  // ordinary strike — only the charged Staff pierces it. The hit still lands
  // visibly and audibly, and the HUD explains why nothing happened (see
  // drawBossBar), so it reads as "I need the charged hit" rather than "it's
  // broken". This is the mechanical payoff of the whole chapter-2 quest.
  if (monster.isShielded && !p.empowered) {
    Audio.shieldBlock();
    particles.burst(cx, cy, '#b06cf0', 18, 5);
    assignBossWord(); // give them the next word to build charge with
    return;
  }

  // Combo multiplier lets a clean hit chew through extra hit-points, so bosses
  // fall faster the cleaner you type. Always at least 1. (The combo was already
  // grown at word-completion time in onComplete.) A cast spell hits for a lot
  // more — a successful crit should visibly gut a health bar.
  let hitPower = Math.max(1, Math.round(juice));
  if (p.empowered) hitPower += SPELL_CRIT_BONUS;
  let phaseChanged = false;
  for (let h = 0; h < hitPower && !monster.isDefeated; h++) {
    if (monster.registerHit() === 'phase') {
      phaseChanged = true;
      break; // a phase change ends this strike — the next bar starts fresh
    }
  }
  if (phaseChanged) {
    // A turning point in the fight: big flourish, hard shake, new word.
    particles.play('phasechange', cx, cy, W, H);
    shakeTimer = Math.max(shakeTimer, 30);
    Audio.phaseChange();
    updateMusic(); // final boss: theme escalates with monster.phaseIndex
    assignBossWord();
    // Princess Ánh Sáng's heavy nova rides in right on this dramatic beat —
    // or, on the Devourer's phase-3 entry specifically, Princess Sao's instead
    // (starnova's `when` is more specific and is checked first).
    checkPrincessSupport('phaseChange');
    return;
  }
  if (!monster.isDefeated) {
    // A cast that lands but doesn't finish the monster holds it frozen for as
    // long as the staffcast effect is on screen (see STAFFCAST_FRAMES) —
    // reusing the same freeze the princesses use (frozenTimer) so a struck
    // monster visibly stops marching/attacking while the effect plays out,
    // instead of the fight continuing underneath a 5-second visual.
    if (p.empowered) monster.frozenTimer = STAFFCAST_FRAMES;
    assignBossWord(); // boss survives → next word
  } else {
    // Defeated → a big death explosion scaled to the monster tier. A stageboss
    // is the stage's set-piece kill (the payoff of an entire gauntlet of
    // waves), so its death gets a brief slow-mo instead of resolving in one
    // frame — see slowMoTimer in updatePlaying(). A mid-fight PHASE change
    // above deliberately does NOT get this; only the true final death does.
    if (monster.kind === MONSTER_KIND.STAGEBOSS) {
      slowMoTimer = SLOWMO_FRAMES;
      deathFocus = { x: cx, y: cy };
    }
    const deathColor = MONSTER_COLOR[monster.spriteId] || '#5fc23c';
    particles.death(cx, cy, deathColor, monster.kind);
    if (particles.screenShake > shakeTimer) shakeTimer = particles.screenShake;
    // Award kill points: base per tier × rank bonus × combo multiplier. Shows a
    // floating "+N" over the fallen monster and persists the running total.
    rank.awardKill(monster.kind, cx, cy - 30, juice);
    saveRank();
  }
}

function heroHit(dmg) {
  // Princess Ánh Dương's Shield: a one-shot ward that nullifies exactly the
  // next hit, instead of a duration buff — see princesses.js. It must be
  // checked here, at the single choke point every source of damage already
  // funnels through, rather than at each call site.
  if (hero.shielded) {
    hero.shielded = false;
    shakeTimer = Math.max(shakeTimer, 8);
    particles.burst(hero.x + 30, hero.y + 20, '#fff2b0', 20, 5);
    Audio.princessShieldBreak();
    return;
  }
  hero.takeDamage(dmg);
  shakeTimer = Math.max(shakeTimer, 12);
  particles.burst(hero.x + 30, hero.y + 30, '#c0392b', 12, 4);
  Audio.hurt();
  if (combo.break()) Audio.comboBreak(); // taking a hit drops the combo
  if (hero.isDead) {
    tracker.clear();
    endSpell(); // no penalty — the stage is over, not a typing failure
    Audio.failure();
    setState(STATE.FAILURE);
  }
}

// ---------------------------------------------------------------------------
// Princess support (chapters 2-3 — see princesses.js)
// ---------------------------------------------------------------------------
// Fires a princess's ability: applies its mechanical effect, plays the cast
// banner + flourish + audio cue, marks her spent, and persists that. Called
// from checkPrincessSupport() (the level-triggered conditions, polled once a
// frame from updatePlaying) and directly from the edge-triggered call sites
// (wave spawn, phase change, contact-imminent) that can't be read back out of
// state a frame later.
function castPrincess(p, ctx) {
  const result = p.apply(ctx) || {};
  princesses.markUsed(p.id);
  progress.princessesUsed = [...princesses.used];
  saveProgress(progress);

  // Newest goes at the end of the array and is drawn at the TOP of the stack
  // (see drawPrincessBanner) so it reads as pushing older ones up and out of
  // the way, rather than appearing to shove in from below.
  princessBanners.push({ p, timer: PRINCESS_BANNER_LIFE });
  Audio.princessCast();
  if (Audio[p.audioCue]) Audio[p.audioCue]();

  const hx = hero.x + (hero.sprite.w * DOT * hero.scale) / 2;
  const hy = hero.y + (hero.sprite.h * DOT * hero.scale) / 2;
  particles.playPrincess(p.effect, hx, hy, W, H);

  // Princess Tình Yêu's staffcharge fills the meter directly rather than via
  // hero.chargeStaff() (see princesses.js) — start the spell here so "SẴN
  // SÀNG!" always comes with a spell word to type, same as the normal path.
  if (result.staffFilled) {
    Audio.staffCharged();
    startSpell();
  }

  // The two nova abilities (Sao, Ánh Sáng) hit the CURRENT monster instead of
  // just decorating the hero — apply() reports how many registerHit()s to
  // spend rather than doing it itself, since only main.js knows how to
  // resolve a phase change/kill the same way onProjectileHit does.
  if (result.novaHits && monster && !monster.dying) {
    const mx = monster.x + monster.width / 2;
    const my = monster.y + (monster.sprite.h * DOT * monster.scale) / 2;
    particles.playPrincess(p.effect, mx, my, W, H);
    monster.reactToHit();
    for (let h = 0; h < result.novaHits && !monster.isDefeated; h++) {
      const outcome = monster.registerHit();
      if (outcome === 'phase') {
        particles.play('phasechange', mx, my, W, H);
        shakeTimer = Math.max(shakeTimer, 30);
        Audio.phaseChange();
        updateMusic();
        assignBossWord();
        break;
      }
      if (outcome === 'dead') {
        const deathColor = MONSTER_COLOR[monster.spriteId] || '#5fc23c';
        particles.death(mx, my, deathColor, monster.kind);
        rank.awardKill(monster.kind, mx, my - 30, combo.tier.dmg);
        saveRank();
        break;
      }
    }
    if (!monster.dying && !monster.isDefeated && monster.word) assignBossWord();
  }
}

// Level-triggered support: polled once a frame from updatePlaying() while a
// stage in chapter 2+ is in progress. Edge-triggered conditions (wave spawn,
// phase change, contact-imminent) are checked directly at their own call
// sites instead — see spawnNextWave(), onProjectileHit(), and the
// reachedHero() branch in updatePlaying().
function checkPrincessSupport(wave) {
  if (!hero || princesses.remaining === 0) return;
  if (chapterForStage(stageIndex).id < 2) return; // chapter 1: princesses are still captive
  const ctx = { hero, monster, tracker, combo, wave };
  const p = princesses.find(ctx);
  if (p) castPrincess(p, ctx);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
function updatePlaying() {
  // A stageboss kill sets slowMoTimer (see onProjectileHit) to stretch the
  // death out over real time instead of resolving in one frame. Rather than
  // scaling the global `tick` (which combo/rank timers and the music clock key
  // off — see the plan notes), only the systems that visibly animate the kill
  // are throttled to run on every 6th real frame (a deliberate crawl, not just
  // a slight dip); input, combo, and rank stay at full speed so nothing feels
  // laggy. renderPlaying() pairs this with a zoom-in on deathFocus.
  const slow = slowMoTimer > 0;
  if (slow) slowMoTimer--;
  if (!slow) deathFocus = null;
  const animate = !slow || tick % 6 === 0;

  if (animate) hero.update();

  // Level-triggered princess support: HP-threshold heals and the mistake-
  // streak cleanse are true for as long as the underlying state holds, not
  // just on the frame it first became true, so they're polled here every
  // frame rather than caught at one call site.
  checkPrincessSupport('poll');

  if (!monster) {
    spawnNextWave();
    if (state !== STATE.PLAYING) return; // victory triggered, or BOSS_WARNING
  }

  if (monster) {
    if (animate) monster.update(hero.x);

    // Princess Sóng Biển's Knockback: fires the instant a CREEP is about to
    // make contact, bailing the kid out before the hit actually lands — must
    // be checked before reachedHero()'s own branch runs, and only for a
    // marching creep (a stationary boss "reaching" the hero isn't a thing).
    if (monster.kind === MONSTER_KIND.CREEP && monster.reachedHero(hero.x) && !monster.dying) {
      checkPrincessSupport('creepContact');
    }

    if (monster.reachedHero(hero.x) && !monster.dying) {
      heroHit(monster.contactDamage);
      if (state !== STATE.PLAYING) return;
      monster.dying = true;
      monster.deathTimer = 0;
      tracker.clear();
      endSpell(); // no penalty — its target is gone, not a typing failure
    }
    // Princess Băng's Freeze: catches a boss attack the instant its timer
    // elapses (wantsToAttack just went true), BEFORE takeAttack() below
    // consumes and clears that flag — checkPrincessSupport's own apply()
    // clears wantsToAttack again if she fires, cancelling the attack.
    if (monster.wantsToAttack) {
      checkPrincessSupport('bossAttack');
    }
    const bossDmg = monster.takeAttack();
    if (bossDmg > 0) {
      // Stageboss-only flourish: its own themed effect/sound/name banner,
      // layered on top of heroHit's damage/shield-check/game-over handling
      // rather than inside it — heroHit stays the single choke point for the
      // mechanical hit (see its own doc comment), this is cosmetic dressing
      // around it, same as castPrincess layers its own particles/audio
      // around a mechanical effect without touching heroHit.
      if (monster.kind === MONSTER_KIND.STAGEBOSS) {
        const attack = attackFor(monster);
        const hx = hero.x + (hero.sprite.w * DOT * hero.scale) / 2;
        const hy = hero.y + (hero.sprite.h * DOT * hero.scale) / 2;
        particles.play(attack.effect, hx, hy, W, H);
        if (Audio[attack.sound]) Audio[attack.sound]();
        bossSkillBannerText = attack.name;
        bossSkillBannerTimer = BOSS_SKILL_BANNER_FRAMES;
      }
      heroHit(bossDmg);
      if (state !== STATE.PLAYING) return;
    }

    if (monster.isGone) {
      monster = null;
      tracker.clear();
      endSpell(); // no penalty — its target is gone, not a typing failure
    }
  }

  if (animate) {
    for (const p of projectiles) {
      p.update();
      // Emit a comet trail puff behind the projectile each frame.
      const tc = p.trailCfg;
      if (tc) {
        particles.trailPuff(p.x, p.y, tc.color, {
          fadeTo: tc.fadeTo,
          size: tc.size || DOT * 1.5,
          gravity: tc.gravity,
          spread: DOT,
          life: 12,
        });
      }
      if (p.done) onProjectileHit(p);
    }
    projectiles = projectiles.filter((p) => !p.done);
    particles.update();
  }
  combo.update();
  rank.update();
  princesses.update();
  for (const b of princessBanners) if (b.timer > 0) b.timer--;
  princessBanners = princessBanners.filter((b) => b.timer > 0);
  if (bossSkillBannerTimer > 0) bossSkillBannerTimer--;
  if (animate && shakeTimer > 0) shakeTimer--;
}

// Award the stage's reward and advance progress.
function grantReward() {
  pendingReward = rewardForStage(stageIndex);
  if (!progress.rewards.includes(pendingReward.id)) {
    progress.rewards.push(pendingReward.id);
  }
  progress.stage = Math.min(stageIndex + 1, TOTAL_STAGES - 1);
  saveProgress(progress);
}

// ---------------------------------------------------------------------------
// Input for scene transitions (SPACE advances; Z resets)
// ---------------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  // First user gesture unlocks the AudioContext (browsers require this).
  // ...and only NOW can the soundtrack actually start. The title's setState()
  // runs at load time, long before any gesture, so its playMusic() call reaches
  // a suspended context and schedules nothing. Re-asserting the current state's
  // theme here is what gets the title loop going on the kid's first keypress.
  // It's a no-op once the right song is already running.
  updateMusic();
  // resume() isn't guaranteed to flip the context to 'running' synchronously,
  // so on some machines the call above still finds it 'suspended' and schedules
  // nothing — the kid would then need a SECOND keypress before music starts.
  // Re-running updateMusic() once the promise actually resolves closes that gap.
  Audio.resumeAudio().then(updateMusic);

  // F7 toggles the Telex keystroke guide row under the target word — a kid who
  // has learned the keys can hide the crutch, or a stuck kid can bring it back.
  // A function key for the same reason as F8/F9/F10: every letter is a real
  // Telex typing character.
  if (e.key === 'F7') {
    e.preventDefault();
    showTelexHelper = !showTelexHelper;
    return;
  }

  // F9 toggles mute at any time, in EVERY state (including the tutorial, which
  // otherwise owns the keyboard). A function key is used because every letter —
  // 'm' included — is a real Telex typing character a kid will hit during
  // gameplay, and ESC is already the tutorial's skip key.
  if (e.key === 'F9') {
    e.preventDefault();
    Audio.toggleMute();
    return;
  }

  // F10 turns the background music off while KEEPING the sound effects — a
  // separate control from F9 for the same reason F9 is a function key: every
  // letter is a Telex character. Kids differ a lot here; some need the room
  // quiet to concentrate on a long proverb but still want to hear their hits
  // land, and a half-hour loop wears on whoever else is in the room.
  if (e.key === 'F10') {
    e.preventDefault();
    Music.toggleMusic();
    return;
  }

  // F8 pauses/resumes a fight. Only meaningful mid-PLAYING or during the
  // boss "get ready" countdown — pausing a menu/story/tutorial screen is a
  // no-op, since those are already static and player-paced (SPACE/ESC driven).
  // F8 (not F11) because F11 is the browser/OS's native-fullscreen key and
  // gets intercepted before it ever reaches the page's keydown listener.
  if (e.key === 'F8') {
    e.preventDefault();
    if (state === STATE.PAUSED) {
      Audio.confirm();
      setState(pausedFrom);
      pausedFrom = null;
    } else if (state === STATE.PLAYING || state === STATE.BOSS_WARNING) {
      Audio.confirm();
      pausedFrom = state;
      setState(STATE.PAUSED);
    }
    return;
  }

  // The story scene: SPACE turns the page, ESC skips the rest of the narration.
  // Handled BEFORE the tutorial branch and before the generic SPACE handling so
  // paging can't be mistaken for a menu confirm.
  if (state === STATE.STORY) {
    if (e.key === 'Escape') {
      e.preventDefault();
      Audio.confirm();
      finishStory(story.after);
      return;
    }
    if (e.code === 'Space') {
      e.preventDefault();
      if (story.page + 1 < story.pages.length) {
        story.page++;
        Audio.storyPage(); // soft page-turn, not a menu confirm
      } else {
        Audio.confirm();
        finishStory(story.after);
      }
    }
    return;
  }

  // Tutorial owns the keyboard while active: EVERY printable key is a typing
  // character for the practice lessons, plus space/backspace, and ESC to skip.
  if (state === STATE.TUTORIAL) {
    if (e.key === 'Escape') {
      e.preventDefault();
      Audio.confirm();
      finishTutorial();
      return;
    }
    if (e.key === 'Backspace' || e.key === ' ' || e.key.length === 1) {
      e.preventDefault();
      tutorial.handleKey(e.key === ' ' ? ' ' : e.key);
      if (tutorial.done) finishTutorial();
    }
    return;
  }

  // H on the title opens the how-to-play tutorial.
  if ((e.key === 'h' || e.key === 'H') && state === STATE.TITLE) {
    startTutorial(STATE.TITLE);
    return;
  }
  // S on the title replays the CURRENT chapter's story, for a kid who skipped it
  // (or just wants the tale again). Returns to the title, not into a stage.
  if ((e.key === 's' || e.key === 'S') && state === STATE.TITLE) {
    const chapter = chapterForStage(progress.stage);
    Audio.confirm();
    startStory(openingFor(chapter.id), openingTitle(chapter.id), 'title');
    return;
  }
  if (e.key === 'z' || e.key === 'Z') {
    if (state === STATE.TITLE) {
      resetProgress();
      progress = { stage: 0, rewards: [], seenTutorial: false, seenStory: [], rankStats: {}, princessesUsed: [] };
      stageIndex = 0;
      rank.reset(); // Z on the title is a full wipe → also clear the lifetime rank
      princesses.used.clear(); // all ten princesses are captive again
      Audio.confirm();
    }
  }
  if (e.code !== 'Space') return;
  // During PLAYING, SPACE is a normal typing character (phrases have spaces) —
  // let the typing tracker handle it; don't treat it as a menu confirm.
  if (state === STATE.PLAYING) return;
  // BOSS_WARNING is timer-driven, not SPACE-driven, so it can't be skipped away
  // accidentally — a kid mashing keys to get through a fight shouldn't cut the
  // "get ready" beat short.
  if (state === STATE.BOSS_WARNING) return;
  e.preventDefault();
  Audio.confirm();

  if (state === STATE.TITLE) {
    // Story first (the King's request), then the tutorial, then the stage —
    // beginJourney() decides which of those the kid actually needs.
    beginJourney();
  } else if (state === STATE.STAGE_INTRO) {
    startStage();
  } else if (state === STATE.VICTORY) {
    grantReward();
    Audio.reward();
    setState(STATE.REWARD);
  } else if (state === STATE.REWARD) {
    // Clearing a chapter's LAST stage ends the chapter: celebrate the chapter,
    // then play its closing narration. Otherwise just walk on to the next stage.
    if (isChapterFinale(stageIndex)) {
      setState(STATE.CHAPTER_END);
    } else if (stageIndex + 1 >= TOTAL_STAGES) {
      // Belt-and-braces: should be unreachable (the last stage is always a
      // chapter finale), but never leave the kid stuck on the reward screen.
      setState(STATE.GAME_COMPLETE);
    } else {
      stageIndex += 1;
      setState(STATE.STAGE_INTRO);
    }
  } else if (state === STATE.CHAPTER_END) {
    // The chapter's closing pages. After the FINAL chapter they lead into the
    // Final Ending; after any other chapter they lead into the next chapter's
    // opening story (queued by beginJourney once progress has advanced).
    const chapter = chapterForStage(stageIndex);
    const last = isFinalChapter(chapter);
    startStory(closingFor(chapter.id), closingTitle(chapter.id), last ? 'ending' : 'nextchapter');
  } else if (state === STATE.FAILURE) {
    startStage(); // retry same stage
  } else if (state === STATE.GAME_COMPLETE) {
    // The curtain call leads into the credits roll.
    setState(STATE.CREDITS);
  } else if (state === STATE.CREDITS) {
    // Reset stage/reward progress for a replay, but KEEP the lifetime rank —
    // finishing the game is an achievement, not a reason to lose your Mythic
    // badge. Kids who finished already know how to play, so skip the tutorial.
    // The story is marked unseen again so a replay gets the full tale, and the
    // princesses are all available again so a replay gets to see their
    // moments too — they're per-playthrough content like stage/rewards.
    progress = { stage: 0, rewards: [], seenTutorial: true, seenStory: [], rankStats: rank.serialize(), princessesUsed: [] };
    stageIndex = 0;
    princesses.used.clear();
    saveProgress(progress);
    setState(STATE.TITLE);
  }
});

// Gameplay typing keys: routed to the spell tracker while a spell is active,
// otherwise to the monster's tracker. This also implements the spell's abandon
// rule — a wrong key is forgivable ONLY if the very next key is Backspace; any
// other key pressed while a mistake sits uncorrected burns the charge. We check
// BEFORE forwarding so we see the raw key that's about to make a pending
// mistake worse, rather than inferring it after the fact from tracker state.
attachKeyboard({
  handleKey(key) {
    if (state === STATE.PAUSED) return; // frozen — no keys reach either tracker
    if (spellActive) {
      if (spellMistakePending && key !== 'Backspace') {
        abandonSpell();
        return;
      }
      spellTracker.handleKey(key);
      return;
    }
    tracker.handleKey(key);
  },
});

// ---------------------------------------------------------------------------
// Debug hook (development only)
// ---------------------------------------------------------------------------
// With 26 stages across 3 chapters, reaching a late scene by playing is not a
// practical way to check it renders — the chapter-2/3 boundaries are ~500 typed
// words in. This exposes just enough to jump the state machine when the page is
// served from localhost, so scenes can be verified without a save-file edit and
// a 20-minute play. It is inert on any real deployment (GitHub Pages), and it
// only ever WRITES state — nothing in the game reads from it.
if (['localhost', '127.0.0.1'].includes(location.hostname)) {
  window.__debug = {
    // Jump to a stage (0-based) and enter it directly.
    goStage(i) {
      stageIndex = Math.max(0, Math.min(i, TOTAL_STAGES - 1));
      progress.stage = stageIndex;
      startStage();
    },
    // Force a scene without playing to it.
    setState(name) {
      const target = STATE[name] || name;
      if (target === STATE.REWARD) pendingReward = rewardForStage(stageIndex);
      setState(target);
    },
    // Set up the exact post-victory state at a chapter finale: `stageIndex` is
    // the stage just CLEARED while progress.stage has already advanced to the
    // next chapter's first stage (what grantReward() does). This is the state the
    // CHAPTER_END → closing-story → next-chapter-opening hand-off runs from.
    atChapterFinale(clearedStageIndex) {
      stageIndex = clearedStageIndex;
      progress.stage = Math.min(clearedStageIndex + 1, TOTAL_STAGES - 1);
      progress.seenStory = [chapterForStage(clearedStageIndex).id];
      saveProgress(progress);
      setState(STATE.CHAPTER_END);
    },
    // Play a chapter's opening / closing narration on demand.
    story(chapterId, which = 'opening') {
      if (which === 'closing') startStory(closingFor(chapterId), closingTitle(chapterId), 'title');
      else startStory(openingFor(chapterId), openingTitle(chapterId), 'title');
    },
    // Skip to the final wave of the current stage (for boss/phase testing).
    lastWave() {
      const stage = currentStage();
      waveCursor = stage.waves.length - 1;
      monster = null;
      spawnNextWave();
    },
    // Fill the Staff and arm its spell so a cast can be tested immediately.
    chargeStaff() {
      if (hero) {
        hero.hasStaff = true;
        hero.staffCharge = hero.staffChargeFull;
        startSpell();
      }
    },
    // Force one princess's ability to fire right now, bypassing her `when`
    // condition — for previewing each cast's banner/effect/audio without
    // engineering the real trigger. `id` matches PRINCESS_SUPPORT entries
    // ('heal', 'shield', 'freeze', ...).
    castPrincess(id) {
      const p = PRINCESS_SUPPORT.find((x) => x.id === id);
      if (!p || !hero) return;
      castPrincess(p, { hero, monster, tracker, combo, wave: 'debug' });
    },
    // List remaining/used princesses.
    princesses() {
      return {
        remaining: princesses.remaining,
        total: princesses.total,
        used: [...princesses.used],
      };
    },
    // Read out what's on screen right now.
    info() {
      return {
        state,
        stageIndex,
        stage: currentStage().name,
        chapter: chapterForStage(stageIndex).id,
        wave: `${waveCursor}/${currentStage().waves.length}`,
        monster: monster && {
          name: monster.barName,
          hits: `${monster.hitsLeft}/${monster.maxHits}`,
          phase: monster.phases ? `${monster.phaseIndex + 1}/${monster.phases.length}` : null,
          shielded: monster.isShielded,
          word: monster.word && monster.word.vi,
        },
        staff: hero && hero.hasStaff ? `${hero.staffCharge}/${hero.staffChargeFull}` : null,
        spell: spellActive ? { word: spellTracker.target, mistakePending: spellMistakePending } : null,
        princessBanners: princessBanners.map((b) => ({ id: b.p.id, timer: b.timer })),
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Render helpers (gameplay HUD + entities)
// ---------------------------------------------------------------------------
function drawTargetWord() {
  if (!monster || monster.dying || !monster.word) return;
  // The typed word sits ABOVE the name/HP bar (drawBossBar) so the reading
  // order top-to-bottom is "what to type" then "what it hits" — it should be
  // unmistakable that the word you're about to complete is what strikes the
  // monster below it. Creeps have no bar, so their word floats above
  // drawCreepName's plate instead: CREEP_NAME_OFFSET is where that plate's
  // TOP sits relative to the monster (drawCreepName keeps it small, directly
  // over the creep's head) and CREEP_WORD_CLEARANCE is the visible gap the two
  // stacks must keep between them — the guide row's own footprint
  // (topY+size+4 to topY+size+guideSize+12, i.e. ~61px below topY with
  // size=30, guideSize=19) has to fully clear the name plate above it.
  const topY = monster.kind === MONSTER_KIND.CREEP
    ? monster.y - CREEP_NAME_OFFSET - CREEP_WORD_CLEARANCE - 61
    : Math.max(monster.y - 58, 118) - 96;
  const word = monster.word;
  // While the Staff's spell is active, keystrokes route to spellTracker (see
  // attachKeyboard) and this word is frozen — it takes no input. Drawing it
  // fully dim (no green progress, no mistake red, no keystroke guide) is what
  // tells the kid "not listening right now" without hiding it outright, so
  // there is only ever ONE plate on screen that reads as live/typeable at a
  // time: drawSpellWord takes over that job and gets the prominent slot below.
  const frozen = spellActive;
  const matched = frozen ? 0 : tracker.matchedLen();
  const mistake = frozen ? false : tracker.isMistake();
  const isSpecial = monster.skill.cls === SKILL_CLASS.SPECIAL;

  const size = 30;
  ctx.font = `${size}px "PixelFont", monospace`;
  const textW = ctx.measureText(word.vi).width;
  // Where the word plate sits. Normally it floats above the monster, but the late
  // pools are whole proverbs ("đi một ngày đàng học một sàng khôn") and bosses
  // hold their ground far to the RIGHT, so a plate anchored to the monster ran
  // clean off the screen edge — and an unreadable target word makes the game
  // unplayable, not merely ugly.
  //
  // So: a plate that is a large fraction of the screen width is CENTRED instead
  // of tracking the monster. The word is what the kid is reading, and dead centre
  // is both always on screen and the easiest place to read a long line from.
  // The +32 is the plate's own 14px overhang past the text plus a real screen
  // margin — clamping to exactly the plate half-width left it flush against the
  // canvas edge, which reads as "cut off" even when it technically fits.
  const halfPlate = textW / 2 + 32;
  const cx = halfPlate * 2 > W * 0.55
    ? W / 2
    : Math.min(Math.max(monster.x + monster.width / 2, halfPlate), W - halfPlate);
  const bg = isSpecial ? '#3a1a1a' : '#2b2b2b';
  drawRect(ctx, cx - textW / 2 - 14, topY - 10, textW + 28, size + 20, bg);
  if (isSpecial) drawRect(ctx, cx - textW / 2 - 14, topY - 10, textW + 28, 3, '#c0392b');

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  let dx = cx - textW / 2;
  for (let i = 0; i < word.vi.length; i++) {
    let color = frozen ? '#6a6480' : '#f4f4f4';
    if (!frozen && i < matched) color = '#3aa655';
    else if (!frozen && mistake && i === matched) color = '#c0392b';
    ctx.fillStyle = color;
    ctx.fillText(word.vi[i], dx, topY);
    dx += ctx.measureText(word.vi[i]).width;
  }

  const label = isSpecial ? `⚡ ${monster.skill.name}` : monster.skill.name;
  // Small dark backing so the label + telex hint stay legible on the sky.
  ctx.font = '16px "PixelFont", monospace';
  const lw = ctx.measureText(label).width;
  drawRect(ctx, cx - lw / 2 - 6, topY - 36, lw + 12, 24, '#1a1423');
  drawText(ctx, label, cx, topY - 31, 16, frozen ? '#6a6480' : isSpecial ? '#ffb08a' : '#fff4d6', 'center');
  // Keystroke guide: the ideal Telex keys IN CAPITALS so a kid can read them at
  // a glance, with the keys already pressed lit up in green and the very next
  // key to press highlighted — a little "type this now" cue that walks them
  // through the word one letter at a time. Sized close to the target word itself
  // since this is the line a kid actually reads keystroke-by-keystroke.
  // F7 hides this row for a kid who no longer needs the crutch; the mistake
  // hint below it then closes the gap the row would have left.
  // Suppressed entirely while frozen — a guide row implies "type this now",
  // which is exactly the wrong message while the spell owns the keyboard.
  const guideSize = 19;
  if (showTelexHelper && !frozen) {
    const guide = word.telex.toUpperCase();
    const pressed = tracker.telexMatchedLen();
    ctx.font = `${guideSize}px "PixelFont", monospace`;
    const gw = ctx.measureText(guide).width;
    const gy = topY + size + 8;
    drawRect(ctx, cx - gw / 2 - 8, topY + size + 4, gw + 16, guideSize + 8, '#1a1423');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let gx = cx - gw / 2;
    for (let i = 0; i < guide.length; i++) {
      let color = '#8a83a0';        // not yet typed — dim
      if (i < pressed) color = '#6fe08a';        // already pressed — lit green
      else if (i === pressed && !mistake) color = '#ffe27a'; // next key — glowing
      const chWidth = ctx.measureText(guide[i]).width;
      if (guide[i] === ' ' && i === pressed && !mistake) {
        // A space has no glyph to color, so the "next key" glow (the moment
        // that matters — it's the one cue telling a kid to press it at all)
        // would otherwise be invisible. Fill it as a small block instead,
        // inset a hair from its neighbours so it still reads as its own key
        // rather than fusing the two letters on either side into one stripe.
        const pad = 2;
        drawRect(ctx, gx + pad, gy + 2, Math.max(chWidth - pad * 2, 2), guideSize - 4, color);
      } else if (guide[i] !== ' ') {
        ctx.fillStyle = color;
        ctx.fillText(guide[i], gx, gy);
      }
      gx += chWidth;
    }
  }

  // When the kid has gone off the rails, gently nudge them to just type the
  // word again from the start — the tracker auto-clears the mistake on the
  // first key of a fresh attempt (see input.js), so no Backspace hunting.
  if (mistake) {
    const hint = 'Sai rồi? Gõ lại từ đầu nhé!'; // "Wrong? Just type it again from the start!"
    const hintY = showTelexHelper ? topY + size + guideSize + 20 : topY + size + 8;
    ctx.font = '13px "PixelFont", monospace';
    const hw = ctx.measureText(hint).width;
    drawRect(ctx, cx - hw / 2 - 6, hintY, hw + 12, 20, '#3a1a1a');
    drawText(ctx, hint, cx, hintY + 3, 13, '#ffb08a', 'center');
  }
}

// How far above a creep's head drawCreepName floats its plate, and that
// plate's own height — kept small and fixed so the name always reads as
// "labeling the monster", not drifting up toward the typed word above it.
const CREEP_NAME_OFFSET = 26;
const CREEP_NAME_PLATE_H = 20;
// Visible gap drawTargetWord must leave between its own stack (the guide row)
// and the top of drawCreepName's plate, so the two never touch/overlap.
const CREEP_WORD_CLEARANCE = 12;

function drawCreepName() {
  // Bosses show their name on drawBossBar (which follows the same "clamp near
  // the monster" logic as its health bar); creeps have no bar to hang a name
  // off of, so this floats a small plate directly over the creep's own head —
  // deliberately NOT anchored to the target-word plate, which recenters to the
  // middle of the screen for long phrases and would drag the name away from
  // the monster it names.
  if (!monster || monster.kind !== MONSTER_KIND.CREEP || monster.dying || !monster.displayName) return;
  const name = monster.displayName;
  ctx.font = '15px "PixelFont", monospace';
  const nw = ctx.measureText(name).width;
  const cx = Math.min(Math.max(monster.x + monster.width / 2, nw / 2 + 6), W - nw / 2 - 6);
  const ny = monster.y - CREEP_NAME_OFFSET;
  drawRect(ctx, cx - nw / 2 - 6, ny, nw + 12, CREEP_NAME_PLATE_H, '#1a1423');
  // Name color signals rank at a glance: white (creep) < yellow (elite).
  const nameColor = monster.tint === 'elite' ? '#ffd24a' : '#ffffff';
  drawText(ctx, name, cx, ny + 3, 15, nameColor, 'center');
}

function drawBossBar() {
  if (!monster || monster.kind === MONSTER_KIND.CREEP) return;
  const barW = 200;
  const barH = 12;

  // A phased boss shows its PHASE name (see Monster.barName), so the kid watches
  // the fight escalate: "Shadow Shield" → "Fury" → "Desperation".
  const name = monster.barName;
  ctx.font = '19px "PixelFont", monospace';
  const nameW = ctx.measureText(name).width;
  // Clamp to whichever is wider — the name plate or the bar (plus the hit-count
  // text that hangs off its right end). The final boss's phase names are long
  // ("KẺ NUỐT THẾ GIỚI — Khiên Bóng Tối") and ran off the right edge under the
  // old fixed 130px margin.
  const half = Math.max(nameW / 2 + 10, barW / 2 + 50);
  const cx = Math.min(Math.max(monster.x + monster.width / 2, half), W - half);
  const barX = cx - barW / 2;
  // Sits just above the monster, BELOW the target word (drawTargetWord) — the
  // kid reads the word first, then sees the bar it's about to land on.
  const barY = Math.max(monster.y - 58, 118);

  // Dark plate behind the name for legibility on the sky.
  drawRect(ctx, cx - nameW / 2 - 8, barY - 30, nameW + 16, 25, '#1a1423');
  // Name color continues the creep/elite rank ladder: orange (boss) < red (stageboss).
  const nameColor = monster.kind === MONSTER_KIND.STAGEBOSS ? '#ff4a4a' : '#ff9a3a';
  drawText(ctx, name, cx, barY - 26, 19, nameColor, 'center');
  drawRect(ctx, barX - 3, barY - 3, barW + 6, barH + 6, '#1a1423');
  const frac = monster.hitsLeft / monster.maxHits;
  drawRect(ctx, barX, barY, barW, barH, '#5a5a5a');
  // A shielded phase's bar is purple, not red — it looks like something you
  // cannot hurt yet, which is exactly what it is.
  drawRect(ctx, barX, barY, barW * frac, barH, monster.isShielded ? '#b06cf0' : '#e0503a');
  drawText(ctx, `${monster.hitsLeft}/${monster.maxHits}`, barX + barW + 8, barY - 2, 15, '#fff4d6', 'left');

  // Phase pips, so a kid can see how many forms are left rather than being
  // surprised when the bar refills.
  if (monster.phases) {
    const n = monster.phases.length;
    const pipW = 12;
    const gap = 5;
    const totalW = n * pipW + (n - 1) * gap;
    const px = cx - totalW / 2;
    const py = barY + barH + 6;
    drawRect(ctx, px - 3, py - 3, totalW + 6, pipW + 6, '#1a1423');
    for (let i = 0; i < n; i++) {
      // Past phases are spent (dark), the current one pulses, future ones wait.
      const done = i < monster.phaseIndex;
      const cur = i === monster.phaseIndex;
      const col = done ? '#3a3350' : cur ? (tick % 40 < 20 ? '#ffd24a' : '#e0503a') : '#7a7290';
      drawRect(ctx, px + i * (pipW + gap), py, pipW, pipW, col);
    }
  }

}

// The shield hint: when an ordinary hit cannot get through, SAY so, and say what
// to do about it — without this a kid just sees their attacks doing nothing and
// concludes the game is broken.
//
// Drawn on its OWN fixed row just above the bottom typing hint, not anchored to
// the boss: it is a long sentence, the boss stands far right, and the target-word
// plate already occupies the space under the health bar. A fixed row can collide
// with nothing.
function drawShieldHint() {
  if (!monster || !monster.isShielded || monster.dying) return;
  const hint = hero.staffReady
    ? '⚡ Gõ đúng câu thần chú để phá khiên!' // "Type the spell correctly to break the shield!"
    : '🛡 Khiên bóng tối! Gõ đúng để NẠP Trượng rồi phá khiên!'; // "Dark shield! Type correctly to CHARGE the Staff, then break it!"
  const hy = H - 62;
  ctx.font = '16px "PixelFont", monospace';
  const hw = ctx.measureText(hint).width;
  drawRect(ctx, W / 2 - hw / 2 - 10, hy - 4, hw + 20, 26, '#3a1a4a');
  drawText(ctx, hint, W / 2, hy, 16, hero.staffReady ? '#ffe27a' : '#e0b3ff', 'center');
}

// The Staff of Wisdom, once earned, doesn't sit in the hero's hand — it flies
// alongside them as a living companion, orbiting on a slow ellipse with its own
// spinning aura (via effects.drawAura, the same halo the Master+ rank uses).
// Three visual states, all driven by hero.staffCharge so the kid reads Staff
// state without glancing at the HUD meter:
//   - charging (0..4/5): a calm cyan aura, gentle bob.
//   - just filled → ready: the SAME full state below, entered the instant it fills.
//   - ready (5/5): a hot gold aura that pulses in a sharp double-beat, like a
//     heartbeat, rather than the smooth breathing sine used elsewhere — a ready
//     Staff should feel urgent/alive, not merely "on".
function drawStaffCompanion(heroX, heroY) {
  const hw = hero.sprite.w * DOT * hero.scale;
  const hh = hero.sprite.h * DOT * hero.scale;
  // Orbit center sits above/behind the hero's shoulder; the ellipse carries it
  // out in front and up over the head so it reads as flying "around" the hero
  // rather than stuck to one side.
  const cx = heroX + hw * 0.5;
  const cy = heroY + hh * 0.18;
  const orbitRX = hw * 0.62;
  const orbitRY = hh * 0.3;
  const angle = tick * 0.035;
  const sx = cx + Math.cos(angle) * orbitRX;
  const sy = cy + Math.sin(angle) * orbitRY - hh * 0.12;

  const ready = hero.staffReady;
  const color = ready ? '#ffd24a' : '#8ff0ff';

  // Heartbeat pulse for the ready state: two quick beats then a rest, instead
  // of a smooth sine — gives it an urgent, alive feel distinct from the calm
  // charging glow and from the rank aura's breathing.
  let pulse;
  if (ready) {
    const t = (tick % 40) / 40; // one heartbeat cycle
    const beat = (phase) => Math.max(0, Math.sin(phase * Math.PI));
    pulse = Math.max(beat((t - 0) * 5), beat((t - 0.16) * 5) * 0.85);
  } else {
    pulse = 0.5 + 0.5 * Math.sin(tick * 0.08);
  }

  const baseR = DOT * 6;
  const auraR = baseR * (1 + pulse * (ready ? 0.5 : 0.25));
  drawAura(ctx, sx, sy, auraR, color, ready ? tick * 1.6 : tick);

  // The Staff sprite itself, spinning: alternate its two art frames fast while
  // scaling it slightly with the same pulse, so it "spins and shines" in place
  // rather than just sitting inside its own glow.
  const staffScale = hero.scale * 0.55 * (1 + pulse * 0.08);
  const frame = Math.floor(tick / (ready ? 4 : 8)) % STAFF_WISDOM.frames.length;
  const flip = Math.floor(tick / (ready ? 10 : 20)) % 2 === 1;
  drawSprite(
    ctx, STAFF_WISDOM, frame,
    sx - (STAFF_WISDOM.w * DOT * staffScale) / 2,
    sy - (STAFF_WISDOM.h * DOT * staffScale) / 2,
    staffScale, flip, null
  );

  drawStaffStars(sx, sy, staffScale, color, ready);
}

// A handful of tiny 4-point stars twinkling around the gem — fixed angles
// (not Math.random, per the effects reproducibility convention) so the same
// tick always renders the same sky. Each star has its own phase offset so
// they blink independently rather than flashing in unison; the ready state
// blinks faster and brighter, matching the aura's own urgency.
const STAFF_STAR_ANGLES = [0.4, 1.7, 2.6, 3.9, 5.1, 5.9];
function drawStaffStars(sx, sy, staffScale, color, ready) {
  const r = DOT * 5 * staffScale;
  const blinkSpeed = ready ? 0.18 : 0.1;
  for (let i = 0; i < STAFF_STAR_ANGLES.length; i++) {
    const a = STAFF_STAR_ANGLES[i] + tick * 0.015 * (i % 2 ? 1 : -1);
    const px = sx + Math.cos(a) * r;
    const py = sy + Math.sin(a) * r * 0.85 - DOT * 4 * staffScale;
    const twinkle = 0.5 + 0.5 * Math.sin(tick * blinkSpeed + i * 1.9);
    if (twinkle < 0.15) continue; // fully dark between blinks
    ctx.globalAlpha = twinkle;
    drawPixelStar(px, py, DOT * (0.6 + twinkle * 0.6) * staffScale, ready ? '#fff6d0' : color);
  }
  ctx.globalAlpha = 1;
}

// A tiny 4-point sparkle: a bright center pixel plus four short rays, drawn
// with fillRect (not lineTo) to stay consistent with this game's pixel-art
// rendering everywhere else.
function drawPixelStar(cx, cy, s, color) {
  ctx.fillStyle = color;
  ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
  ctx.fillRect(cx - s * 1.6, cy - s / 4, s * 1.2, s / 2);
  ctx.fillRect(cx + s * 0.4, cy - s / 4, s * 1.2, s / 2);
  ctx.fillRect(cx - s / 4, cy - s * 1.6, s / 2, s * 1.2);
  ctx.fillRect(cx - s / 4, cy + s * 0.4, s / 2, s * 1.2);
}

// The Staff of Wisdom's charge meter (only once the artifact is earned): five
// pips that fill with each CLEANLY typed word, then a "ready" flare. Placed under
// the combo meter on the left, where the kid is already watching their streak.
//
// Accuracy is what fills it — a fumbled word adds nothing — so the meter is a
// standing, visible reward for the exact skill the game teaches.
function drawStaffMeter() {
  if (!hero || !hero.hasStaff) return;
  const x = 26;
  // Sits below the combo meter block; the combo readout only appears from 2x, so
  // this keeps a fixed slot rather than jumping as the combo comes and goes.
  const y = 186;
  const full = hero.staffChargeFull;
  const ready = hero.staffReady;
  // Once the spell word takes over the main focal spot (drawSpellWord), this
  // corner box should stop competing for attention — the pulse's job (pull
  // the eye here) is done the instant the spell appears. Steady gold instead
  // of flashing, so the two are clearly "same charge, different moment".
  const casting = spellActive;

  const label = casting ? '✨ ĐANG NIỆM CHÚ...' : ready ? '⚡ TRƯỢNG SẴN SÀNG!' : 'TRƯỢNG TRÍ TUỆ';
  ctx.font = '15px "PixelFont", monospace';
  const lw = ctx.measureText(label).width;
  const pipW = 16;
  const gap = 4;
  const pipsW = full * pipW + (full - 1) * gap;
  const boxW = Math.max(lw, pipsW) + 16;
  drawRect(ctx, x - 8, y - 4, boxW, 46, '#1a1423');
  // The label pulses gold when charged (but not yet casting), so "ready" is
  // visible peripherally; once casting it settles to steady gold.
  const labelCol = casting ? '#ffd24a' : ready ? (tick % 30 < 15 ? '#ffffff' : '#ffd24a') : '#cfc8dd';
  drawText(ctx, label, x, y, 15, labelCol, 'left');

  for (let i = 0; i < full; i++) {
    const on = i < hero.staffCharge;
    const col = casting ? '#ffd24a' : ready ? (tick % 30 < 15 ? '#ffffff' : '#ffd24a') : on ? '#8ff0ff' : '#3a3350';
    drawRect(ctx, x + i * (pipW + gap), y + 22, pipW, 12, col);
  }
}

// The Staff's spell incantation: a THIRD typing target that appears once the
// meter is full. It takes over the monster word's own focal spot (same anchor
// logic as drawTargetWord, same size) so there is only ever ONE plate on
// screen reading as "live" at a time — the monster's word is drawn dimmed and
// frozen behind it (see the `frozen` branch in drawTargetWord). Gold-themed
// so it still reads as "a different, special thing" even sharing the slot.
function drawSpellWord() {
  if (!spellActive) return;
  const topY = monster && monster.kind === MONSTER_KIND.CREEP
    ? monster.y - CREEP_NAME_OFFSET - CREEP_WORD_CLEARANCE - 61
    : monster ? Math.max(monster.y - 58, 118) - 96 : 118;
  const word = spellTracker.target;
  const matched = spellTracker.matchedLen();
  const mistake = spellTracker.isMistake();

  const size = 30;
  ctx.font = `${size}px "PixelFont", monospace`;
  const textW = ctx.measureText(word).width;
  // Same long-line handling as drawTargetWord: centre rather than anchor to
  // the monster once the plate would be a big fraction of the screen.
  const halfPlate = textW / 2 + 32;
  const cx = halfPlate * 2 > W * 0.55
    ? W / 2
    : monster
      ? Math.min(Math.max(monster.x + monster.width / 2, halfPlate), W - halfPlate)
      : W / 2;
  drawRect(ctx, cx - textW / 2 - 14, topY - 10, textW + 28, size + 20, '#3a2a08');
  drawRect(ctx, cx - textW / 2 - 14, topY - 10, textW + 28, 3, '#ffd24a');

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  let dx = cx - textW / 2;
  for (let i = 0; i < word.length; i++) {
    let color = '#fff4d6';
    if (i < matched) color = '#3aa655';
    else if (mistake && i === matched) color = '#e0503a';
    ctx.fillStyle = color;
    ctx.fillText(word[i], dx, topY);
    dx += ctx.measureText(word[i]).width;
  }

  const label = '✨ CÂU THẦN CHÚ'; // "THE SPELL"
  ctx.font = '16px "PixelFont", monospace';
  const lw = ctx.measureText(label).width;
  drawRect(ctx, cx - lw / 2 - 6, topY - 36, lw + 12, 24, '#1a1423');
  drawText(ctx, label, cx, topY - 31, 16, '#ffe27a', 'center');

  // Same keystroke guide as the monster word, so a kid reads it the same way.
  const guideSize = 19;
  if (showTelexHelper) {
    const guide = spellTracker.telex.toUpperCase();
    const pressed = spellTracker.telexMatchedLen();
    ctx.font = `${guideSize}px "PixelFont", monospace`;
    const gw = ctx.measureText(guide).width;
    const gy = topY + size + 8;
    drawRect(ctx, cx - gw / 2 - 8, topY + size + 4, gw + 16, guideSize + 8, '#1a1423');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let gx = cx - gw / 2;
    for (let i = 0; i < guide.length; i++) {
      let color = '#c9a86a';
      if (i < pressed) color = '#6fe08a';
      else if (i === pressed && !mistake) color = '#ffe27a';
      const chWidth = ctx.measureText(guide[i]).width;
      if (guide[i] === ' ' && i === pressed && !mistake) {
        const pad = 2;
        drawRect(ctx, gx + pad, gy + 2, Math.max(chWidth - pad * 2, 2), guideSize - 4, color);
      } else if (guide[i] !== ' ') {
        ctx.fillStyle = color;
        ctx.fillText(guide[i], gx, gy);
      }
      gx += chWidth;
    }
  }

  // A mistake here is one uncorrected keystroke away from burning the whole
  // charge — say so plainly, since the stakes are much higher than a normal word.
  if (mistake) {
    const hint = 'Bấm Backspace ngay để sửa!'; // "Press Backspace right now to fix it!"
    const hintY = showTelexHelper ? topY + size + guideSize + 20 : topY + size + 8;
    ctx.font = '13px "PixelFont", monospace';
    const hw = ctx.measureText(hint).width;
    drawRect(ctx, cx - hw / 2 - 6, hintY, hw + 12, 20, '#3a1a1a');
    drawText(ctx, hint, cx, hintY + 3, 13, '#ff8a6a', 'center');
  }
}

function drawHUD() {
  const stage = currentStage();
  const barW = 260;
  const barH = 24;
  drawRect(ctx, 18, 18, barW + 4, barH + 4, '#1a1423');
  const hpW = (hero.hp / hero.maxHp) * barW;
  drawRect(ctx, 20, 20, hpW, barH, hero.hp > 30 ? '#f472b6' : '#e0503a');
  drawText(ctx, `HP ${hero.hp}`, 24, 23, 16, '#ffffff', 'left');

  // Stage name + wave counter on small dark plates.
  ctx.font = '18px "PixelFont", monospace';
  const chapter = chapterForStage(stageIndex);
  const num = stageNumberInChapter(stageIndex);
  const st = `C${chapter.id} · Màn ${num}: ${stage.name}`;
  const stW = ctx.measureText(st).width;
  drawRect(ctx, W / 2 - stW / 2 - 10, 16, stW + 20, 28, '#1a1423');
  drawText(ctx, st, W / 2, 21, 18, '#fff4d6', 'center');
  const total = stage.waves.length;
  const wv = `Đợt ${Math.min(waveCursor, total)}/${total}`;
  const wvW = ctx.measureText(wv).width;
  // Right edge pinned to W - 20, same as the rank card and the F8/F9/F10
  // hint below it, so all three right-column HUD boxes share one edge.
  drawRect(ctx, W - 20 - wvW - 16, 16, wvW + 16, 28, '#1a1423');
  drawText(ctx, wv, W - 24, 21, 18, '#fff4d6', 'right');
}

// Princess-support reserve: a row of small pips right under the HP bar, each
// tinted to its own princess's gown color (via princessThemeColor) and
// carrying her own crest emoji (🌸, ☁️, ...) so a kid can tell WHICH
// princesses are left by her actual theme, not just a color they'd have to
// memorize. Lit while she's still available, dimmed once spent. Chapter-1-only
// (no princesses to draw down yet) and hidden once all ten are spent so the
// HUD doesn't keep a permanently-empty row on screen for the rest of the game.
function drawPrincessHUD() {
  if (chapterForStage(stageIndex).id < 2) return;
  const total = princesses.total;
  const pip = 18; // wide enough for the crest emoji to read at this size
  const gap = 5;
  const rowW = total * pip + (total - 1) * gap;
  const boxW = Math.max(rowW, 90) + 20;
  // Directly below drawHUD's HP bar (x=18..18+barW+4, y=18..46).
  const x = 26;
  const y = 60;
  const label = 'CÔNG CHÚA HỖ TRỢ'; // "PRINCESSES"
  ctx.font = '13px "PixelFont", monospace';
  drawRect(ctx, x - 10, y - 4, boxW, 48, '#1a1423');
  drawText(ctx, label, x, y, 13, '#cfc8dd', 'left');
  let px = x;
  const py = y + 22;
  for (const p of PRINCESS_SUPPORT) {
    const spent = princesses.used.has(p.id);
    const color = princessThemeColor(p.style);
    drawRect(ctx, px, py, pip, pip, spent ? '#221c30' : color);
    ctx.save();
    if (spent) ctx.globalAlpha = 0.25;
    drawText(ctx, p.crest, px + pip / 2, py + 2, 13, '#fff4d6', 'center');
    ctx.restore();
    px += pip + gap;
  }
}

// The princess cast banner stack: each cast is a full-width slide-in strip
// using her real princessSprite() art (the same figure the kid rescued in
// chapter 1), her name, and a Vietnamese blurb naming what she just did.
// Timer-driven (pushed by castPrincess), not click-driven — nothing here
// should interrupt typing. Multiple casts stack: the newest slides in at the
// top row, and older ones already on screen are pushed down a row to make
// room (see targetSlot below) rather than being replaced or overlapped.
const PRINCESS_BANNER_SLIDE = 36; // frames of the fixed-length slide in/out
function drawPrincessBanner() {
  if (princessBanners.length === 0) return;
  const barH = 78;
  const rowGap = 10;
  const baseY = H * 0.16 - barH / 2;
  // Newest entry is at the end of the array; draw it as row 0 (top), pushing
  // older entries down — so a fresh cast reads as "arriving above" and
  // shoving the rest down, matching how the array grows.
  const n = princessBanners.length;
  for (let i = 0; i < n; i++) {
    const b = princessBanners[n - 1 - i]; // i=0 is the newest
    const p = b.p;
    const t = b.timer / PRINCESS_BANNER_LIFE;
    const slideFrac = PRINCESS_BANNER_SLIDE / PRINCESS_BANNER_LIFE;
    const slideIn = Math.min(1, (1 - t) / slideFrac);
    const slideOut = Math.min(1, t / slideFrac);
    const reveal = Math.min(slideIn, slideOut);
    // Slot eases toward its stacked row so an older banner visibly slides
    // down when a newer one is pushed in above it, instead of popping there.
    const targetSlot = i;
    if (b.slot === undefined) b.slot = targetSlot;
    b.slot += (targetSlot - b.slot) * 0.25;
    const barY = baseY + b.slot * (barH + rowGap);

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, reveal * 1.5));
    drawRect(ctx, 0, barY, W, barH, '#1a1423');
    drawRect(ctx, 0, barY, W, 3, '#ffd24a');
    drawRect(ctx, 0, barY + barH - 3, W, 3, '#ffd24a');

    const sprite = princessSprite(p.style);
    const pscale = 3.2;
    const px = 24 + (1 - reveal) * -60;
    const py = barY + barH / 2 - (sprite.h * DOT * pscale) / 2;
    drawSprite(ctx, sprite, 0, px, py, pscale, false, null);

    const textX = px + sprite.w * DOT * pscale + 20;
    ctx.font = '20px "PixelFont", monospace';
    drawText(ctx, p.name, textX, barY + 16, 20, '#ffd24a', 'left');
    ctx.font = '15px "PixelFont", monospace';
    drawText(ctx, p.blurb, textX, barY + 44, 15, '#fff4d6', 'left');
    ctx.restore();
  }
}

// A stageboss attack's name, announced above the hero's head with a zoom
// IN -> hold -> zoom OUT, distinct from both existing banners: drawPrincessBanner
// slides in from the side, and drawComboMeter's milestone banner only shrinks-in
// and holds/cuts. Here the text starts large (zoomed in), eases down to its rest
// size while fading in, holds, then grows back up (zoom OUT) while fading out.
function drawBossSkillBanner() {
  if (bossSkillBannerTimer <= 0 || !bossSkillBannerText) return;
  const total = BOSS_SKILL_BANNER_FRAMES;
  const t = bossSkillBannerTimer / total; // 1 -> 0 over the banner's life
  const elapsed = 1 - t;
  const IN_FRAC = 0.15;
  const OUT_FRAC = 0.2;
  const REST_SIZE = 26;
  const ZOOM_SIZE = 52;

  let size, alpha;
  if (elapsed < IN_FRAC) {
    // Zoom in: large -> rest, fading in.
    const p = elapsed / IN_FRAC; // 0 -> 1
    size = ZOOM_SIZE - (ZOOM_SIZE - REST_SIZE) * p;
    alpha = p;
  } else if (t < OUT_FRAC) {
    // Zoom out: rest -> large, fading out.
    const p = 1 - t / OUT_FRAC; // 0 -> 1 as the banner closes
    size = REST_SIZE + (ZOOM_SIZE - REST_SIZE) * p;
    alpha = 1 - p;
  } else {
    // Hold at rest size, full opacity.
    size = REST_SIZE;
    alpha = 1;
  }

  const hw = hero.sprite.w * DOT * hero.scale;
  const bx = hero.x + hw / 2;
  const by = hero.y - 26;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.font = `${Math.round(size)}px "PixelFont", monospace`;
  const tw = ctx.measureText(bossSkillBannerText).width;
  drawRect(ctx, bx - tw / 2 - 10, by - size, tw + 20, size + 12, '#1a1423');
  drawText(ctx, bossSkillBannerText, bx, by - size + 6, Math.round(size), '#ff8a6a', 'center');
  ctx.restore();
}

// Combo meter: a pulsing "COMBO xN" readout below the HP bar, tinted by tier,
// plus a brief center-screen banner when a milestone / tier-up fires.
function drawComboMeter() {
  const tier = combo.tier;
  const x = 26;
  // Below drawHUD's HP bar (ends y=46); drawPrincessHUD adds its own row
  // (y=56..104) from chapter 2 on, so drop further down to clear it.
  const y = chapterForStage(stageIndex).id >= 2 ? 112 : 88;

  if (combo.count >= 2) {
    // Pulsing size: pops on each increment, eases back to base.
    const base = 25;
    const size = base + combo.pulse * 12 + Math.min(combo.count, 20) * 0.4;
    const label = `COMBO x${combo.count}`;
    ctx.font = `${Math.round(size)}px "PixelFont", monospace`;
    const tw = ctx.measureText(label).width;
    drawRect(ctx, x - 6, y - 4, tw + (tier.emoji ? 40 : 12), size + 14, '#1a1423');
    drawText(ctx, label, x, y, Math.round(size), tier.color, 'left');
    if (tier.emoji) drawText(ctx, tier.emoji, x + tw + 14, y, Math.round(size), tier.color, 'left');
    // Multiplier chip so kids see the reward for a clean streak.
    if (tier.dmg > 1) {
      ctx.font = '15px "PixelFont", monospace';
      const mult = `x${tier.dmg} sát thương`; // "x_ damage"
      const mw = ctx.measureText(mult).width;
      drawRect(ctx, x - 6, y + size + 14, mw + 12, 22, '#1a1423');
      drawText(ctx, mult, x, y + size + 17, 15, tier.color, 'left');
    }
  }

  // Center milestone / tier banner.
  if (combo.bannerTimer > 0 && combo.flashTier) {
    const p = combo.bannerTimer / 90;
    const bsize = 40 + (1 - p) * 8;
    ctx.globalAlpha = Math.min(1, p * 2);
    ctx.font = `${Math.round(bsize)}px "PixelFont", monospace`;
    const bw = ctx.measureText(combo.flashTier).width;
    drawRect(ctx, W / 2 - bw / 2 - 16, H * 0.3 - 6, bw + 32, bsize + 14, '#1a1423');
    drawText(ctx, combo.flashTier, W / 2, H * 0.3, Math.round(bsize), tier.color, 'center');
    ctx.globalAlpha = 1;
  }
}

// Rank badge (top-right, below the wave counter): a kid-friendly card showing
// the current rank emoji + name in its color, a progress bar toward the next
// rank, the kill-point total, and a "×N kill bonus" chip. A brief center banner
// celebrates a promotion. Floating "+N" popups rise from defeated monsters.
function drawRankHUD() {
  const r = rank.rank;
  const cardW = 230;
  const cardX = W - 20 - cardW;
  const cardY = 52; // just under the taller wave counter at y=16 (h≈28)
  // Pop scale on a fresh promotion.
  const pop = 1 + rank.pulse * 0.15;

  // Card plate. A colored top strip signals the rank at a glance. Below max
  // rank the card gains a row for the "cần: …" hint under the progress bar.
  const atMax = !rank.nextRank;
  const cardH = (r.glow ? 104 : 88) + (atMax ? 0 : 16);
  drawRect(ctx, cardX - 2, cardY - 2, cardW + 4, cardH + 4, '#1a1423');
  drawRect(ctx, cardX, cardY, cardW, 5, r.color);

  // Rank line: big emoji + name in the rank color.
  const nameSize = Math.round(21 * pop);
  drawText(ctx, `${r.emoji} ${r.name}`, cardX + 8, cardY + 12, nameSize, r.color, 'left');

  // "Cấp bậc" (Rank) label + kill-point total on the right.
  drawText(ctx, 'CẤP BẬC', cardX + 8, cardY + 12 + nameSize + 4, 14, '#cfc8dd', 'left');
  drawText(ctx, `⭐ ${rank.killPoints}`, cardX + cardW - 8, cardY + 12 + nameSize + 4, 15, '#ffd24a', 'right');

  // Progress bar toward the next rank (or a "MAX" flourish at the top).
  // Bar offset from the card bottom: 34px leaves room for the '→ next rank'
  // label row, and the extra 16px of cardH (when not at max) holds the
  // 'cần: …' hint row below that — both inside the plate.
  const barY = cardY + cardH - 34 - (atMax ? 0 : 16);
  const barX = cardX + 8;
  const barW = cardW - 16;
  const barH = 10;
  const prog = rank.progressToNext;
  drawRect(ctx, barX, barY, barW, barH, '#3a3350');
  if (prog) {
    drawRect(ctx, barX, barY, barW * prog.overall, barH, r.color);
    const next = rank.nextRank;
    // Name the lagging gate, so a stalled bar tells the kid WHAT to work on
    // rather than just sitting still.
    const need = { accuracy: 'gõ đúng hơn', speed: 'gõ nhanh hơn', words: 'gõ thêm từ' }[prog.lagging];
    drawText(ctx, `→ ${next.emoji} ${next.name}`, barX, barY + barH + 3, 14, '#cfc8dd', 'left');
    drawText(ctx, `${Math.round(prog.overall * 100)}%`, barX + barW, barY + barH + 3, 14, '#cfc8dd', 'right');
    drawText(ctx, `cần: ${need}`, barX, barY + barH + 19, 13, '#9d94b5', 'left'); // "need: <hint>"
  } else {
    drawRect(ctx, barX, barY, barW, barH, r.color);
    drawText(ctx, 'CAO NHẤT!', barX + barW / 2, barY + barH + 3, 14, r.color, 'center'); // "MAX!"
  }

  // Glowing ranks: a small "TỎA SÁNG" (glowing) hint so the aura reads as earned.
  if (r.glow) {
    drawText(ctx, `✦ ${r.killBonus}× điểm hạ gục`, barX, barY - 16, 14, r.color, 'left'); // "×N kill points"
  }

  // Floating "+N" kill-point popups rising from defeated monsters.
  for (const g of rank.gainPopups) {
    const gp = 1 - g.life / 48;
    ctx.globalAlpha = Math.min(1, g.life / 20);
    drawText(ctx, `+${g.gained}`, g.x, g.y - gp * 34, 16, g.color, 'center');
    ctx.globalAlpha = 1;
  }

  // Center rank banner — a big celebratory promotion, or a smaller, gentle,
  // non-shaming demotion nudge that encourages practice rather than scolding.
  if (rank.bannerTimer > 0) {
    const p = rank.bannerTimer / 120;
    ctx.globalAlpha = Math.min(1, p * 2.5);
    if (rank.demoted) {
      const bsize = 26 + (1 - p) * 6;
      const line1 = `${r.emoji} Hạng: ${r.name}`;        // "Rank: <name>"
      const line2 = 'Luyện thêm để giữ hạng nhé!';       // "Keep practicing to hold your rank!"
      ctx.font = `${Math.round(bsize)}px "PixelFont", monospace`;
      const w1 = ctx.measureText(line1).width;
      ctx.font = `${Math.round(bsize * 0.72)}px "PixelFont", monospace`;
      const w2 = ctx.measureText(line2).width;
      const bw = Math.max(w1, w2);
      drawRect(ctx, W / 2 - bw / 2 - 18, H * 0.42 - 6, bw + 36, bsize * 2 + 22, '#1a1423');
      drawText(ctx, line1, W / 2, H * 0.42, Math.round(bsize), r.color, 'center');
      drawText(ctx, line2, W / 2, H * 0.42 + bsize + 4, Math.round(bsize * 0.72), '#fff4d6', 'center');
    } else {
      const bsize = 42 + (1 - p) * 10;
      const txt = `THĂNG HẠNG! ${r.emoji} ${r.name}`; // "RANK UP!"
      ctx.font = `${Math.round(bsize)}px "PixelFont", monospace`;
      const bw = ctx.measureText(txt).width;
      drawRect(ctx, W / 2 - bw / 2 - 18, H * 0.42 - 6, bw + 36, bsize + 16, '#1a1423');
      drawText(ctx, txt, W / 2, H * 0.42, Math.round(bsize), r.color, 'center');
    }
    ctx.globalAlpha = 1;
  }
}

// The current stage's scene theme (sky/ground/weather/props) from biomes.js.
function currentBiome() {
  return getBiome(currentStage().biome);
}

// A dark plate sized to `text` so light HUD text stays legible over ANY biome
// (snow and the golden dunes are far too bright for bare light text).
// `align` matches the drawText alignment the plate backs.
function plate(text, x, y, size, align = 'left') {
  ctx.font = `${size}px "PixelFont", monospace`;
  const tw = ctx.measureText(text).width;
  const left = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
  drawRect(ctx, left - 8, y - 4, tw + 16, size + 10, '#1a1423');
}

// The function-key control guide, drawn in EVERY scene (bottom-right) so a
// kid — or a parent in the next room — can always find these controls without
// having to remember them from the title screen. Drawn outside any
// screen-shake transform in `loop()`, so it stays rock-steady while the world
// rattles. Two columns side by side: RIGHT column is F9 (mute) over F10
// (music), its own right edge pinned to W - 20 (same as the wave counter and
// rank card above it, so all three right-column HUD boxes share one edge).
// LEFT column is F7 (telex helper) over F8 (pause), immediately to the left
// of the right column with a fixed gap — so reading order is "helper/pause"
// then "sound/music", grouped by what each pair controls rather than by key
// number. Each column shares ONE plate width (its own widest row) and is
// LEFT-aligned within it, so icons line up within a column.
function drawMuteHint() {
  const size = 14;
  const helperHint = showTelexHelper ? '⌨️ F7: ẩn gợi ý' : '⌨️ F7: hiện gợi ý';
  const pauseHint = '⏸️ F8: tạm dừng';
  const muteText = Audio.isMuted() ? '🔇 F9: bật tiếng' : '🔊 F9: tắt tiếng';
  const musicText = Music.isMusicOn() ? '🎵 F10: tắt nhạc' : '🎵 F10: bật nhạc';
  const showPause = state === STATE.PLAYING || state === STATE.BOSS_WARNING || state === STATE.PAUSED;

  ctx.font = `${size}px "PixelFont", monospace`;
  // Pause is only meaningful mid-fight/boss-warning (see the F8 handler), so
  // its row only appears in those states, on top of the always-on rows.
  const leftRows = showPause ? [helperHint, pauseHint] : [helperHint];
  const rightRows = [muteText, musicText];

  const rightW = Math.max(...rightRows.map((t) => ctx.measureText(t).width));
  const rightLeft = W - 20 - rightW - 8;
  const leftW = Math.max(...leftRows.map((t) => ctx.measureText(t).width));
  // Gap between columns matches the plates' own side padding (8px) so the
  // two columns read as evenly spaced, not closer together than each plate's
  // internal margin.
  const leftLeft = rightLeft - 8 - leftW - 16;

  const plateAt = (x, w, y) => drawRect(ctx, x - 8, y - 4, w + 16, size + 10, '#1a1423');

  plateAt(rightLeft, rightW, H - 29);
  drawText(ctx, musicText, rightLeft, H - 29, size, '#fff4d6', 'left');
  plateAt(rightLeft, rightW, H - 50);
  drawText(ctx, muteText, rightLeft, H - 50, size, '#fff4d6', 'left');

  plateAt(leftLeft, leftW, H - 29);
  drawText(ctx, helperHint, leftLeft, H - 29, size, '#fff4d6', 'left');
  if (showPause) {
    plateAt(leftLeft, leftW, H - 50);
    drawText(ctx, pauseHint, leftLeft, H - 50, size, '#fff4d6', 'left');
  }
}

// Where the gameplay screen wants the sky body and clouds: low enough to clear
// the HUD row, high enough to stay out of the boss name / HP bar.
const PLAY_SKY_LAYOUT = { cloudY: [55, 80, 105] };

// The locked "get ready" beat right before a stageboss spawns: the stage's own
// biome + a still hero (no monster yet — see startBossWarning), with a pulsing
// warning banner on top. Reuses the same dark-plate/light-text HUD convention
// as the rest of the scene text so it stays legible over any biome.
function renderBossWarning() {
  const ox = shakeTimer > 0 ? (tick % 2 === 0 ? 4 : -4) : 0;
  ctx.save();
  ctx.translate(ox, 0);

  const biome = currentBiome();
  drawBiomeTerrain(ctx, W, H, GROUND_Y, biome, tick);
  drawBiomeScenery(ctx, W, H, GROUND_Y, biome, tick, PLAY_SKY_LAYOUT);
  if (biome.tint) {
    ctx.fillStyle = biome.tint;
    ctx.fillRect(0, 0, W, H);
  }
  drawSprite(ctx, hero.sprite, hero.frame, hero.x, hero.y, hero.scale, false, null);
  drawBiomeLights(ctx, W, H, GROUND_Y, biome, tick);
  drawBiomeWeather(ctx, W, H, GROUND_Y, biome, tick);

  // A red vignette pulse (in step with the banner) reads as danger without a
  // new effect kind — a plain translucent overlay, brightness eased by a sine.
  const pulse = 0.5 + 0.5 * Math.sin(stateTick * 0.25);
  ctx.fillStyle = `rgba(160, 20, 20, ${0.12 + pulse * 0.1})`;
  ctx.fillRect(0, 0, W, H);

  const scale = 1 + pulse * 0.06;
  const cy = H * 0.38;
  ctx.save();
  ctx.translate(W / 2, cy);
  ctx.scale(scale, scale);
  ctx.translate(-W / 2, -cy);
  const line1 = '⚠ CẢNH BÁO ⚠';
  const line2 = 'TRÙM XUẤT HIỆN!';
  plate(line1, W / 2, cy - 20, 26, 'center');
  drawText(ctx, line1, W / 2, cy - 20, 26, '#ff5a5a', 'center');
  plate(line2, W / 2, cy + 22, 34, 'center');
  drawText(ctx, line2, W / 2, cy + 22, 34, '#fff4d6', 'center');
  ctx.restore();

  ctx.restore();
}

function renderPlaying() {
  const ox = shakeTimer > 0 ? (tick % 2 === 0 ? 4 : -4) : 0;
  ctx.save();
  ctx.translate(ox, 0);

  // Stageboss death: push the camera in on the kill spot as the world slows,
  // so the two reinforce each other instead of a plain slow-down that just
  // feels laggy. Ramps in over the first third of the window, holds at max
  // punch, then eases back out right before the monster is cleared.
  if (slowMoTimer > 0 && deathFocus) {
    const elapsed = SLOWMO_FRAMES - slowMoTimer;
    const rampIn = Math.min(1, elapsed / (SLOWMO_FRAMES * 0.35));
    const rampOut = Math.min(1, slowMoTimer / (SLOWMO_FRAMES * 0.2));
    const t = Math.min(rampIn, rampOut);
    const MAX_ZOOM = 1.6;
    const zoom = 1 + (MAX_ZOOM - 1) * t;
    // Scaling the world up leaves the canvas's own edges outside the drawn
    // area uncovered (nothing here clears between frames), so paint over the
    // full frame first — otherwise the previous frame's pixels persist as a
    // stale border around the zoomed scene.
    ctx.fillStyle = '#000000';
    ctx.fillRect(-ox, 0, W, H);
    ctx.translate(W / 2, H / 2);
    ctx.scale(zoom, zoom);
    // A boss usually dies near its standGap spot close to the right edge, so
    // centering the zoom on the raw death spot pushes the opposite side of the
    // viewport outside the world (nothing is drawn past [0,W]x[0,H]), showing
    // the black fill-rect as a border. Clamp the focus at the CURRENT zoom —
    // the visible half-extent is W/(2*zoom), so the allowed range is widest
    // near dead centre at zoom 1 (a pure pan with no scale can't tolerate any
    // offset) and only opens up as zoom grows — so the viewport stays fully
    // inside the world at every point in the ramp, not just at MAX_ZOOM.
    const marginX = W / (2 * zoom);
    const marginY = H / (2 * zoom);
    const fx = Math.min(Math.max(deathFocus.x, marginX), W - marginX);
    const fy = Math.min(Math.max(deathFocus.y, marginY), H - marginY);
    ctx.translate(-fx, -fy);
  }

  // Pixel-art world themed to the stage's biome (sky, terrain band, layered
  // ground) + its scenery props; the mood tint washes over both.
  const biome = currentBiome();
  drawBiomeTerrain(ctx, W, H, GROUND_Y, biome, tick);
  drawBiomeScenery(ctx, W, H, GROUND_Y, biome, tick, PLAY_SKY_LAYOUT);
  if (biome.tint) {
    ctx.fillStyle = biome.tint;
    ctx.fillRect(0, 0, W, H);
  }

  // Hero: smooth forward lunge on attack, shove backward when hurt, flash
  // white briefly while recoiling from a hit.
  const lunge = hero.lungeAmount * 22;
  const heroX = hero.x + lunge - (hero.hurtRecoil || 0);
  const heroFlash = hero.hurtRecoil > 6 ? '#ffffff' : null;
  // Rank aura (Master+): a pulsing colored glow behind the hero, drawn first so
  // the sprite sits on top of it.
  if (rank.rank.glow) {
    const hw = hero.sprite.w * DOT * hero.scale;
    const hh = hero.sprite.h * DOT * hero.scale;
    drawAura(ctx, heroX + hw / 2, hero.y + hh / 2, hw * 0.85, rank.rank.glow, tick);
  }
  drawSprite(ctx, hero.sprite, hero.frame, heroX, hero.y, hero.scale, false, heroFlash);
  if (hero.hasStaff) drawStaffCompanion(heroX, hero.y);
  // Princess Ánh Dương's Shield: a shield-shaped ward around the hero for as
  // long as it's armed — pops (see heroHit) the instant it blocks a hit, so it
  // must be visible continuously, not just at the moment of casting.
  if (hero.shielded) {
    const hw = hero.sprite.w * DOT * hero.scale;
    const hh = hero.sprite.h * DOT * hero.scale;
    drawShieldAura(ctx, heroX + hw / 2, hero.y + hh / 2, hw * 0.95, '#fff2b0', tick * 1.4);
  }

  if (monster) {
    if (!monster.dying || monster.deathTimer % 4 < 2) {
      // Knockback shoves the monster to the right (away from the hero).
      const kx = monster.knockback || 0;
      // Princess tints take priority over the hit-flash white (the flash is
      // only 6 frames; the freeze/slow states last seconds and are what the
      // kid needs to keep reading throughout).
      const flash = monster.frozenTimer > 0 ? '#8fe3ff' : monster.slowTimer > 0 ? '#e8c87a' : monster.hitFlash > 0 ? '#ffffff' : null;
      drawSprite(ctx, monster.sprite, monster.frame, monster.x + kx, monster.y, monster.scale, true, flash);
      if (monster.tint === 'elite' && !monster.dying) {
        drawRect(ctx, monster.x + kx + monster.width / 2 - 4, monster.y - 6, 8, 6, '#c0392b');
      }
      if (monster.frozenTimer > 0) {
        drawAura(ctx, monster.x + kx + monster.width / 2, monster.y + (monster.sprite.h * DOT * monster.scale) / 2, monster.width * 0.6, '#bfe8ff', tick);
      }
      // Stageboss attack telegraph: a glow that builds as attackWindup counts
      // down, so a kid sees the boss "charging up" before the hit lands
      // instead of it landing with zero warning.
      if (monster.telegraphing) {
        const total = attackFor(monster).windup || 1;
        const charge = 1 - Math.max(0, monster.attackWindup) / total;
        const mcx = monster.x + kx + monster.width / 2;
        const mcy = monster.y + (monster.sprite.h * DOT * monster.scale) / 2;
        drawAura(ctx, mcx, mcy, monster.width * (0.3 + charge * 0.5), '#ff6a4a', tick * 1.6);
      }
    }
  }

  for (const p of projectiles) {
    // Tapered colored tail.
    for (let i = 0; i < p.trail.length; i++) {
      const f = i / p.trail.length;
      ctx.globalAlpha = f * 0.8;
      const s = p.size * (0.3 + f * 0.7);
      drawRect(ctx, p.trail[i].x - s / 2, p.trail[i].y - s / 2, s, s, p.color);
    }
    ctx.globalAlpha = 1;
    // Glowing head: colored outer + bright white core.
    const s = p.size;
    drawRect(ctx, p.x - s / 2, p.y - s / 2, s, s, p.color);
    drawRect(ctx, p.x - s / 4, p.y - s / 4, s / 2, s / 2, '#ffffff');
  }

  particles.draw(ctx);

  // Lights (god rays / aurora / crystal + lava glow) brighten the world and the
  // action additively, then weather (rain / snow / embers / mist) settles on top.
  // Both sit below the HUD so text plates stay fully legible.
  drawBiomeLights(ctx, W, H, GROUND_Y, biome, tick);
  drawBiomeWeather(ctx, W, H, GROUND_Y, biome, tick);

  drawBossBar();
  drawCreepName();
  drawTargetWord();
  drawShieldHint();
  drawHUD();
  drawComboMeter();
  drawStaffMeter();
  drawSpellWord();
  drawRankHUD();
  drawPrincessHUD();
  drawPrincessBanner();
  drawBossSkillBanner();
  // Bottom hint on a dark plate: biome grounds range from dark volcanic rock
  // to near-white snow, so light text alone would vanish on the bright ones.
  const hint = 'Gõ chữ để tấn công! (Telex)';
  plate(hint, W / 2, H - 30, 17, 'center');
  drawText(ctx, hint, W / 2, H - 30, 17, '#fff4d6', 'center');
  // Pause hint now lives with F9/F10 in drawMuteHint() (bottom-right stack).

  ctx.restore();
}

// The pause screen: draws the frozen fight exactly as it stood (reusing the
// normal PLAYING/BOSS_WARNING render, whichever we paused from — so nothing
// visibly jumps when the overlay appears) with a dimming wash and a panel on
// top, matching the BOSS_WARNING vignette's plate/text convention.
function renderPaused() {
  if (pausedFrom === STATE.BOSS_WARNING) renderBossWarning();
  else renderPlaying();

  ctx.fillStyle = 'rgba(10, 8, 20, 0.55)';
  ctx.fillRect(0, 0, W, H);

  const cy = H * 0.42;
  const line1 = '⏸ TẠM DỪNG';       // "PAUSED"
  const line2 = 'Bấm F8 để chơi tiếp'; // "Press F8 to keep playing"
  plate(line1, W / 2, cy - 22, 34, 'center');
  drawText(ctx, line1, W / 2, cy - 22, 34, '#fff4d6', 'center');
  plate(line2, W / 2, cy + 20, 18, 'center');
  drawText(ctx, line2, W / 2, cy + 20, 18, '#cfc8dd', 'center');
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
function loop() {
  tick++;
  stateTick++;

  switch (state) {
    case STATE.TITLE: {
      // Show the kid's ACTUAL hero: equipped weapon color + earned rank.
      const look = equippedLook(progress.rewards);
      const rr = rank.rank;
      Scenes.drawTitle(ctx, W, H, tick, progress.stage, {
        weaponColor: look.weaponColor,
        rankGlow: rr.glow,
        rankName: rr.name,
        rankEmoji: rr.emoji,
        rankColor: rr.color,
      }, getStage(progress.stage).biome);
      break;
    }
    case STATE.STORY:
      Scenes.drawStory(
        ctx, W, H, tick,
        story.title,
        story.pages[story.page],
        story.page,
        story.pages.length,
        getStage(Math.min(progress.stage, TOTAL_STAGES - 1)).biome,
      );
      break;
    case STATE.TUTORIAL:
      tutorial.update();
      tutorial.draw(ctx, W, H);
      break;
    case STATE.STAGE_INTRO:
      Scenes.drawStageIntro(ctx, W, H, tick, currentStage(), stageIndex, heroWeaponColor());
      break;
    case STATE.PLAYING:
      updatePlaying();
      // updatePlaying may have transitioned state; guard the render.
      if (state === STATE.PLAYING) renderPlaying();
      else if (state === STATE.VICTORY) Scenes.drawVictory(ctx, W, H, tick, currentStage(), heroWeaponColor());
      else if (state === STATE.FAILURE) Scenes.drawFailure(ctx, W, H, tick, currentStage(), heroWeaponColor());
      else if (state === STATE.BOSS_WARNING) renderBossWarning();
      break;
    case STATE.BOSS_WARNING:
      updateBossWarning();
      if (state === STATE.BOSS_WARNING) renderBossWarning();
      else if (state === STATE.PLAYING) renderPlaying();
      break;
    case STATE.PAUSED:
      renderPaused();
      break;
    case STATE.VICTORY:
      Scenes.drawVictory(ctx, W, H, tick, currentStage(), heroWeaponColor());
      break;
    case STATE.REWARD:
      Scenes.drawReward(ctx, W, H, tick, pendingReward, currentStage().biome);
      break;
    case STATE.CHAPTER_END:
      Scenes.drawChapterEnd(
        ctx, W, H, tick,
        chapterForStage(stageIndex), stageIndex,
        currentStage().biome, heroWeaponColor(),
      );
      break;
    case STATE.FAILURE:
      Scenes.drawFailure(ctx, W, H, tick, currentStage(), heroWeaponColor());
      break;
    case STATE.GAME_COMPLETE:
      Scenes.drawGameComplete(ctx, W, H, tick, stageIndex, currentStage().biome, heroWeaponColor());
      break;
    case STATE.CREDITS:
      // `stateTick` (reset by setState) drives the scroll, so the roll always
      // starts from the bottom edge rather than mid-scroll.
      Scenes.drawCredits(ctx, W, H, tick, stateTick, currentStage().biome);
      break;
  }

  // Every scene gets the mute guide — one call here beats threading it through
  // each scene draw function.
  drawMuteHint();

  rafHandle = requestAnimationFrame(loop);
}

// A backgrounded tab that keeps redrawing every frame and running the audio
// scheduler is exactly what Chrome's Energy Saver (and OS-level battery
// heuristics) watch for, and canvas games get flagged fast. Stopping rAF and
// suspending the shared AudioContext while hidden makes the tab genuinely
// idle instead of merely throttled, and resuming on return is seamless since
// no game state (stage/progress/tick) depends on wall-clock time passing.
let rafHandle = null;

function handleVisibilityChange() {
  if (document.hidden) {
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
    const c = Audio.audioCtx();
    if (c && c.state === 'running') c.suspend();
  } else if (rafHandle === null) {
    Audio.resumeAudio();
    rafHandle = requestAnimationFrame(loop);
  }
}

document.addEventListener('visibilitychange', handleVisibilityChange);

loop();
