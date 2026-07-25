// main.js — Milestone 6: full game with state machine, stages, rewards.
//
// States: TITLE → STAGE_INTRO → PLAYING → (VICTORY → REWARD → next stage)
//                                        └→ FAILURE → retry stage
// Clearing the final stage → GAME_COMPLETE.

import { clear, drawSprite, drawScene, drawText, drawRect, DOT } from './render.js';
import { SPRITES } from './sprites.js';
import { getBiome, drawBiomeTerrain, drawBiomeScenery, drawBiomeLights, drawBiomeWeather } from './biomes.js';
import { Hero, Monster, Projectile, MONSTER_KIND } from './entities.js';
import { ParticleSystem, drawAura } from './effects.js';
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
let GROUND_Y = H - 60;

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
  GROUND_Y = H - 60;
}

resize();
window.addEventListener('resize', resize);

const STATE = {
  TITLE: 'title',
  STORY: 'story',              // paged narration (story.js); SPACE turns, ESC skips
  TUTORIAL: 'tutorial',
  STAGE_INTRO: 'stage_intro',
  PLAYING: 'playing',
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

tracker = new TypingTracker();
particles = new ParticleSystem();
const combo = new Combo();
// Lifetime rank, seeded from persisted stats (accuracy + speed across sessions).
const rank = new RankTracker(progress.rankStats || {});
const tutorial = new Tutorial();

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
    case STATE.PLAYING: {
      // The battle theme follows the CHAPTER, not the stage: a kid plays 6-12
      // stages inside one chapter, and a new loop every stage would make the
      // soundtrack feel restless. The stage intro shares its chapter's theme so
      // the music carries unbroken from the intro into the fight.
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
  combo.reset();
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
    Audio.victory();
    setState(STATE.VICTORY);
    return;
  }
  const wave = stage.waves[waveCursor];
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
  }
  if (monster.word) tracker.setTarget(monster.word.vi, monster.word.telex);
}

function assignBossWord() {
  const pool = monster.pool || (monster.kind === MONSTER_KIND.STAGEBOSS ? 'sentences' : 'phrases');
  const idx = monster.maxHits - monster.hitsLeft + waveCursor + stageIndex;
  monster.word = pickWord(pool, idx);
  tracker.setTarget(monster.word.vi, monster.word.telex);
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

  // The Staff of Wisdom: a CLEANLY typed word adds a charge; once full, THIS
  // strike is the empowered one and the charge is spent on it. Accuracy is what
  // charges it (not speed), so the artifact rewards exactly the skill the game
  // is teaching. `empowered` rides on the projectile so the hit that lands
  // knows it was the charged one.
  let empowered = false;
  if (hero.hasStaff) {
    if (hero.staffReady) {
      hero.spendStaff();
      empowered = true;
      Audio.staffStrike();
    } else if (clean && hero.chargeStaff()) {
      Audio.staffCharged(); // just filled — tell the kid it's ready
    }
  }

  const startX = hero.x + hero.sprite.w * DOT * hero.scale;
  const startY = hero.y + (hero.sprite.h * DOT * hero.scale) / 2;
  const targetX = monster.x + monster.width / 2;

  const pj = skill.projectile;
  const color = hero.weaponColor && skill.cls === SKILL_CLASS.SIMPLE ? hero.weaponColor : pj.color;
  const speed = pj.speed + (hero.projectileSpeedBonus || 0);
  tracker.clear();
  // An empowered strike is visibly bigger and gold-white — it should read as
  // "that was different" without needing to be explained.
  const sizeMul = empowered ? 1.6 : 1;
  for (let i = 0; i < pj.count; i++) {
    const offset = (i - (pj.count - 1) / 2) * 10;
    const proj = new Projectile(startX, startY + offset, targetX, {
      speed,
      color: empowered ? '#fff6d0' : color,
      size: pj.size * sizeMul,
      special: pj.special,
    });
    proj.isLeadHit = i === 0;
    proj.empowered = empowered;
    proj.trailCfg = empowered
      ? { color: '#ffffff', fadeTo: '#ffd24a', size: pj.size * 1.2 }
      : skill.trail || { color, size: pj.size * 0.8 };
    projectiles.push(proj);
  }
  if (skill.shake) shakeTimer = empowered ? skill.shake + 10 : skill.shake;
};

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
  // grown at word-completion time in onComplete.) An empowered Staff strike hits
  // for a lot more — a charged blow should visibly gut a health bar.
  let hitPower = Math.max(1, Math.round(juice));
  if (p.empowered) hitPower += 3;
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
    assignBossWord();
    return;
  }
  if (!monster.isDefeated) {
    assignBossWord(); // boss survives → next word
  } else {
    // Defeated → a big death explosion scaled to the monster tier.
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
  hero.takeDamage(dmg);
  shakeTimer = Math.max(shakeTimer, 12);
  particles.burst(hero.x + 30, hero.y + 30, '#c0392b', 12, 4);
  Audio.hurt();
  if (combo.break()) Audio.comboBreak(); // taking a hit drops the combo
  if (hero.isDead) {
    tracker.clear();
    Audio.failure();
    setState(STATE.FAILURE);
  }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
function updatePlaying() {
  hero.update();

  if (!monster) {
    spawnNextWave();
    if (state !== STATE.PLAYING) return; // victory triggered
  }

  if (monster) {
    monster.update(hero.x);

    if (monster.reachedHero(hero.x) && !monster.dying) {
      heroHit(monster.contactDamage);
      if (state !== STATE.PLAYING) return;
      monster.dying = true;
      monster.deathTimer = 0;
      tracker.clear();
    }
    const bossDmg = monster.takeAttack();
    if (bossDmg > 0) {
      heroHit(bossDmg);
      if (state !== STATE.PLAYING) return;
    }

    if (monster.isGone) {
      monster = null;
      tracker.clear();
    }
  }

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
  combo.update();
  rank.update();
  if (shakeTimer > 0) shakeTimer--;
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
// Input for scene transitions (SPACE advances; R resets)
// ---------------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  // First user gesture unlocks the AudioContext (browsers require this).
  Audio.resumeAudio();
  // ...and only NOW can the soundtrack actually start. The title's setState()
  // runs at load time, long before any gesture, so its playMusic() call reaches
  // a suspended context and schedules nothing. Re-asserting the current state's
  // theme here is what gets the title loop going on the kid's first keypress.
  // It's a no-op once the right song is already running.
  updateMusic();

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
  if (e.key === 'r' || e.key === 'R') {
    if (state === STATE.TITLE) {
      resetProgress();
      progress = { stage: 0, rewards: [], seenTutorial: false, seenStory: [], rankStats: {} };
      stageIndex = 0;
      rank.reset(); // R on the title is a full wipe → also clear the lifetime rank
      Audio.confirm();
    }
  }
  if (e.code !== 'Space') return;
  // During PLAYING, SPACE is a normal typing character (phrases have spaces) —
  // let the typing tracker handle it; don't treat it as a menu confirm.
  if (state === STATE.PLAYING) return;
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
    // The story is marked unseen again so a replay gets the full tale.
    progress = { stage: 0, rewards: [], seenTutorial: true, seenStory: [], rankStats: rank.serialize() };
    stageIndex = 0;
    saveProgress(progress);
    setState(STATE.TITLE);
  }
});

// Gameplay typing keys are handled by the tracker (only active while PLAYING).
attachKeyboard(tracker);

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
    // Fill the Staff so a charged strike can be tested immediately.
    chargeStaff() {
      if (hero) {
        hero.hasStaff = true;
        hero.staffCharge = hero.staffChargeFull;
      }
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
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Render helpers (gameplay HUD + entities)
// ---------------------------------------------------------------------------
function drawTargetWord() {
  if (!monster || monster.dying || !monster.word) return;
  const topY = monster.y - 58;
  const word = monster.word;
  const matched = tracker.matchedLen();
  const mistake = tracker.isMistake();
  const isSpecial = monster.skill.cls === SKILL_CLASS.SPECIAL;

  const size = 26;
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
    let color = '#f4f4f4';
    if (i < matched) color = '#3aa655';
    else if (mistake && i === matched) color = '#c0392b';
    ctx.fillStyle = color;
    ctx.fillText(word.vi[i], dx, topY);
    dx += ctx.measureText(word.vi[i]).width;
  }

  const label = isSpecial ? `⚡ ${monster.skill.name}` : monster.skill.name;
  // Small dark backing so the label + telex hint stay legible on the sky.
  ctx.font = '15px "PixelFont", monospace';
  const lw = ctx.measureText(label).width;
  drawRect(ctx, cx - lw / 2 - 6, topY - 34, lw + 12, 22, '#1a1423');
  drawText(ctx, label, cx, topY - 30, 15, isSpecial ? '#ffb08a' : '#fff4d6', 'center');
  // Keystroke guide: the ideal Telex keys IN CAPITALS so a kid can read them at
  // a glance, with the keys already pressed lit up in green and the very next
  // key to press highlighted — a little "type this now" cue that walks them
  // through the word one letter at a time.
  const guide = word.telex.toUpperCase();
  const pressed = tracker.telexMatchedLen();
  ctx.font = '15px "PixelFont", monospace';
  const gw = ctx.measureText(guide).width;
  const gy = topY + size + 7;
  drawRect(ctx, cx - gw / 2 - 8, topY + size + 4, gw + 16, 22, '#1a1423');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  let gx = cx - gw / 2;
  for (let i = 0; i < guide.length; i++) {
    let color = '#8a83a0';        // not yet typed — dim
    if (i < pressed) color = '#6fe08a';        // already pressed — lit green
    else if (i === pressed && !mistake) color = '#ffe27a'; // next key — glowing
    ctx.fillStyle = color;
    ctx.fillText(guide[i], gx, gy);
    gx += ctx.measureText(guide[i]).width;
  }

  // When the kid has gone off the rails, gently nudge them to just type the
  // word again from the start — the tracker auto-clears the mistake on the
  // first key of a fresh attempt (see input.js), so no Backspace hunting.
  if (mistake) {
    const hint = 'Sai rồi? Gõ lại từ đầu nhé!'; // "Wrong? Just type it again from the start!"
    ctx.font = '13px "PixelFont", monospace';
    const hw = ctx.measureText(hint).width;
    drawRect(ctx, cx - hw / 2 - 6, topY + size + 30, hw + 12, 20, '#3a1a1a');
    drawText(ctx, hint, cx, topY + size + 33, 13, '#ffb08a', 'center');
  }
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
  const barY = Math.max(monster.y - 118, 118); // never ride up into the cloud strip

  // Dark plate behind the name for legibility on the sky.
  drawRect(ctx, cx - nameW / 2 - 8, barY - 30, nameW + 16, 25, '#1a1423');
  drawText(ctx, name, cx, barY - 26, 19, '#fff4d6', 'center');
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
    ? '⚡ Trượng đã sẵn sàng — gõ xong từ này để phá khiên!' // "Staff ready — finish this word to break the shield!"
    : '🛡 Khiên bóng tối! Gõ đúng để NẠP Trượng rồi phá khiên!'; // "Dark shield! Type correctly to CHARGE the Staff, then break it!"
  const hy = H - 62;
  ctx.font = '16px "PixelFont", monospace';
  const hw = ctx.measureText(hint).width;
  drawRect(ctx, W / 2 - hw / 2 - 10, hy - 4, hw + 20, 26, '#3a1a4a');
  drawText(ctx, hint, W / 2, hy, 16, hero.staffReady ? '#ffe27a' : '#e0b3ff', 'center');
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
  const y = 150;
  const full = hero.staffChargeFull;
  const ready = hero.staffReady;

  const label = ready ? '⚡ TRƯỢNG SẴN SÀNG!' : 'TRƯỢNG TRÍ TUỆ';
  ctx.font = '15px "PixelFont", monospace';
  const lw = ctx.measureText(label).width;
  const pipW = 16;
  const gap = 4;
  const pipsW = full * pipW + (full - 1) * gap;
  const boxW = Math.max(lw, pipsW) + 16;
  drawRect(ctx, x - 8, y - 4, boxW, 46, '#1a1423');
  // The label pulses gold when charged, so "ready" is visible peripherally.
  const labelCol = ready ? (tick % 30 < 15 ? '#ffffff' : '#ffd24a') : '#cfc8dd';
  drawText(ctx, label, x, y, 15, labelCol, 'left');

  for (let i = 0; i < full; i++) {
    const on = i < hero.staffCharge;
    const col = ready ? (tick % 30 < 15 ? '#ffffff' : '#ffd24a') : on ? '#8ff0ff' : '#3a3350';
    drawRect(ctx, x + i * (pipW + gap), y + 22, pipW, 12, col);
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
  drawRect(ctx, W - 20 - wvW - 10, 16, wvW + 16, 28, '#1a1423');
  drawText(ctx, wv, W - 24, 21, 18, '#fff4d6', 'right');
}

// Combo meter: a pulsing "COMBO xN" readout below the HP bar, tinted by tier,
// plus a brief center-screen banner when a milestone / tier-up fires.
function drawComboMeter() {
  const tier = combo.tier;
  const x = 26;
  const y = 52;

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
  const nameSize = Math.round(23 * pop);
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

// The mute toggle guide, drawn in EVERY scene (bottom-right) so a kid — or a
// parent in the next room — can always find the way to silence the game without
// having to remember it from the title screen. Drawn outside any screen-shake
// transform in `loop()`, so it stays rock-steady while the world rattles.
function drawMuteHint() {
  const text = Audio.isMuted() ? '🔇 F9: bật tiếng' : '🔊 F9: tắt tiếng';
  plate(text, W - 20, H - 29, 14, 'right');
  drawText(ctx, text, W - 20, H - 29, 14, '#fff4d6', 'right');
  // The music toggle sits on its own row just above, so the two controls read
  // as a pair without either line getting long enough to crowd the corner.
  const mtext = Music.isMusicOn() ? '🎵 F10: tắt nhạc' : '🎵 F10: bật nhạc';
  plate(mtext, W - 20, H - 50, 14, 'right');
  drawText(ctx, mtext, W - 20, H - 50, 14, '#fff4d6', 'right');
}

// Where the gameplay screen wants the sky body and clouds: low enough to clear
// the HUD row, high enough to stay out of the boss name / HP bar.
const PLAY_SKY_LAYOUT = { cloudY: [55, 80, 105] };

function renderPlaying() {
  const ox = shakeTimer > 0 ? (tick % 2 === 0 ? 4 : -4) : 0;
  ctx.save();
  ctx.translate(ox, 0);

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

  if (monster) {
    if (!monster.dying || monster.deathTimer % 4 < 2) {
      // Knockback shoves the monster to the right (away from the hero).
      const kx = monster.knockback || 0;
      const flash = monster.hitFlash > 0 ? '#ffffff' : null;
      drawSprite(ctx, monster.sprite, monster.frame, monster.x + kx, monster.y, monster.scale, true, flash);
      if (monster.tint === 'elite' && !monster.dying) {
        drawRect(ctx, monster.x + kx + monster.width / 2 - 4, monster.y - 6, 8, 6, '#c0392b');
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
  drawTargetWord();
  drawShieldHint();
  drawHUD();
  drawComboMeter();
  drawStaffMeter();
  drawRankHUD();
  // Bottom hints on dark plates: biome grounds range from dark volcanic rock to
  // near-white snow, so light text alone would vanish on the bright ones.
  const hint = 'Gõ chữ để tấn công! (Telex)';
  plate(hint, W / 2, H - 30, 17, 'center');
  drawText(ctx, hint, W / 2, H - 30, 17, '#fff4d6', 'center');

  ctx.restore();
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

  requestAnimationFrame(loop);
}

loop();
