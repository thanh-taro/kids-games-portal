// main.js — Milestone 6: full game with state machine, stages, rewards.
//
// States: TITLE → STAGE_INTRO → PLAYING → (VICTORY → REWARD → next stage)
//                                        └→ FAILURE → retry stage
// Clearing the final stage → GAME_COMPLETE.

import { clear, drawSprite, drawScene, drawText, drawRect, DOT } from './render.js';
import { SPRITES, CLOUD, CACTUS, ROCK, BUSH, SUN } from './sprites.js';
import { Hero, Monster, Projectile, MONSTER_KIND } from './entities.js';
import { ParticleSystem, drawAura } from './effects.js';
import { TypingTracker, attachKeyboard } from './input.js';
import { RankTracker } from './rank.js';
import { SKILLS, SKILL_CLASS, pickWord } from './skills.js';
import { getStage, TOTAL_STAGES } from './stages.js';
import { chapterForStage, stageNumberInChapter } from './chapters.js';
import { rewardForStage, loadProgress, saveProgress, resetProgress, applyRewards, equippedLook } from './rewards.js';
import { Combo } from './combo.js';
import { Tutorial } from './tutorial.js';
import * as Scenes from './scenes.js';
import * as Audio from './audio.js';

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
  TUTORIAL: 'tutorial',
  STAGE_INTRO: 'stage_intro',
  PLAYING: 'playing',
  VICTORY: 'victory',
  REWARD: 'reward',
  FAILURE: 'failure',
  GAME_COMPLETE: 'game_complete',
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

function setState(next) {
  state = next;
  stateTick = 0;
}

// ---------------------------------------------------------------------------
// Stage lifecycle
// ---------------------------------------------------------------------------
function startStage() {
  const stage = getStage(stageIndex);
  hero = new Hero(120, GROUND_Y);
  applyRewards(hero, progress.rewards); // equip unlocked gear/skin
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

  const skill = SKILLS[wave.skill] || SKILLS.slash;

  if (wave.type === 'creep') {
    monster = new Monster(MONSTER_KIND.CREEP, 'creep_slime', W - 60, GROUND_Y, {
      speed: 0.32,
      hitsNeeded: 1,
    });
    monster.word = pickWord(wave.pool, waveCursor + stageIndex);
    monster.skill = skill;
  } else if (wave.type === 'elite') {
    monster = new Monster(MONSTER_KIND.CREEP, 'creep_slime', W - 60, GROUND_Y, {
      speed: 0.14,
      hitsNeeded: 1,
      contactDamage: 20,
    });
    monster.word = pickWord(wave.pool, waveCursor + stageIndex);
    monster.skill = skill;
    monster.tint = 'elite';
  } else if (wave.type === 'boss') {
    monster = new Monster(MONSTER_KIND.BOSS, 'boss_dragon', W - 40, GROUND_Y, {
      speed: 0.32,
      hitsNeeded: 3,
      standGap: 330,
      attackEvery: 420,
      attackDamage: 12,
    });
    monster.skill = skill;
    monster.displayName = 'Khủng Long Lửa'; // "Fire Dinosaur"
    monster.pool = wave.pool;
    assignBossWord();
  } else if (wave.type === 'stageboss') {
    monster = new Monster(MONSTER_KIND.STAGEBOSS, 'stageboss_ogre', W - 30, GROUND_Y, {
      speed: 0.28,
      hitsNeeded: 6,
      standGap: 360,
      attackEvery: 480,
      attackDamage: 15,
    });
    monster.skill = skill;
    monster.displayName = currentStage().princess ? 'Quỷ Khổng Lồ' : 'Quỷ';
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
// NOTE: the combo is NOT broken here — Telex has legitimate non-prefix
// intermediate states (you type the tone key last), so a per-keystroke
// "mistake" is normal mid-word. Cleanliness is judged at word completion via
// tracker.wasClean() (see onComplete).
tracker.onProgress = (matchedLen, mistake) => {
  if (mistake) Audio.keyError();
  else Audio.keyBlip(matchedLen);
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
  // Combo multiplier lets a clean hit chew through extra hit-points, so bosses
  // fall faster the cleaner you type. Always at least 1. (The combo was already
  // grown at word-completion time in onComplete.)
  const hitPower = Math.max(1, Math.round(juice));
  for (let h = 0; h < hitPower && !monster.isDefeated; h++) monster.registerHit();
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

// Representative hue for each monster's death burst.
const MONSTER_COLOR = {
  creep_slime: '#5fc23c',
  boss_dragon: '#e0503a',
  stageboss_ogre: '#5fc23c',
};

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

  // Tutorial owns the keyboard while active: EVERY printable key is a typing
  // character for the practice lessons (including 'm', which is a real Telex
  // letter — so mute is intentionally NOT bound here), plus space/backspace,
  // and ESC to skip.
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

  // ESC toggles mute at any time. (Not bound to a letter like M, since every
  // letter is a real Telex typing character a kid will hit during gameplay.
  // The tutorial branch above returns before this, so ESC skips the tutorial
  // while it's active and toggles mute everywhere else.)
  if (e.key === 'Escape') {
    Audio.toggleMute();
    return;
  }
  // H on the title opens the how-to-play tutorial.
  if ((e.key === 'h' || e.key === 'H') && state === STATE.TITLE) {
    startTutorial(STATE.TITLE);
    return;
  }
  if (e.key === 'r' || e.key === 'R') {
    if (state === STATE.TITLE) {
      resetProgress();
      progress = { stage: 0, rewards: [], seenTutorial: false, rankStats: {} };
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
    // First-ever start: teach Telex before the first stage.
    if (!progress.seenTutorial) {
      startTutorial(STATE.STAGE_INTRO);
      return;
    }
    stageIndex = progress.stage;
    setState(STATE.STAGE_INTRO);
  } else if (state === STATE.STAGE_INTRO) {
    startStage();
  } else if (state === STATE.VICTORY) {
    grantReward();
    Audio.reward();
    setState(STATE.REWARD);
  } else if (state === STATE.REWARD) {
    if (stageIndex + 1 >= TOTAL_STAGES) {
      setState(STATE.GAME_COMPLETE);
    } else {
      stageIndex += 1;
      setState(STATE.STAGE_INTRO);
    }
  } else if (state === STATE.FAILURE) {
    startStage(); // retry same stage
  } else if (state === STATE.GAME_COMPLETE) {
    // Reset stage/reward progress for a replay, but KEEP the lifetime rank —
    // finishing the game is an achievement, not a reason to lose your Mythic
    // badge. Kids who finished already know how to play, so skip the tutorial.
    progress = { stage: 0, rewards: [], seenTutorial: true, rankStats: rank.serialize() };
    stageIndex = 0;
    saveProgress(progress);
    setState(STATE.TITLE);
  }
});

// Gameplay typing keys are handled by the tracker (only active while PLAYING).
attachKeyboard(tracker);

// ---------------------------------------------------------------------------
// Render helpers (gameplay HUD + entities)
// ---------------------------------------------------------------------------
function drawTargetWord() {
  if (!monster || monster.dying || !monster.word) return;
  const cx = Math.min(Math.max(monster.x + monster.width / 2, 110), W - 110);
  const topY = monster.y - 58;
  const word = monster.word;
  const matched = tracker.matchedLen();
  const mistake = tracker.isMistake();
  const isSpecial = monster.skill.cls === SKILL_CLASS.SPECIAL;

  const size = 26;
  ctx.font = `${size}px "PixelFont", monospace`;
  const textW = ctx.measureText(word.vi).width;
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
  const cx = Math.min(Math.max(monster.x + monster.width / 2, 130), W - 130);
  const barW = 200;
  const barH = 12;
  const barX = cx - barW / 2;
  const barY = Math.max(monster.y - 118, 118); // never ride up into the cloud strip

  // Dark plate behind the name for legibility on the sky.
  ctx.font = '19px "PixelFont", monospace';
  const nameW = ctx.measureText(monster.displayName).width;
  drawRect(ctx, cx - nameW / 2 - 8, barY - 30, nameW + 16, 25, '#1a1423');
  drawText(ctx, monster.displayName, cx, barY - 26, 19, '#fff4d6', 'center');
  drawRect(ctx, barX - 3, barY - 3, barW + 6, barH + 6, '#1a1423');
  const frac = monster.hitsLeft / monster.maxHits;
  drawRect(ctx, barX, barY, barW, barH, '#5a5a5a');
  drawRect(ctx, barX, barY, barW * frac, barH, '#e0503a');
  drawText(ctx, `${monster.hitsLeft}/${monster.maxHits}`, barX + barW + 8, barY - 2, 15, '#fff4d6', 'left');
}

function drawHUD() {
  const stage = currentStage();
  const barW = 260;
  const barH = 24;
  drawRect(ctx, 18, 18, barW + 4, barH + 4, '#1a1423');
  const hpW = (hero.hp / hero.maxHp) * barW;
  drawRect(ctx, 20, 20, hpW, barH, hero.hp > 30 ? '#5fc23c' : '#e0503a');
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

  // Card plate. A colored top strip signals the rank at a glance.
  const cardH = r.glow ? 104 : 88; // glowing ranks get an extra "AURA" line
  drawRect(ctx, cardX - 2, cardY - 2, cardW + 4, cardH + 4, '#1a1423');
  drawRect(ctx, cardX, cardY, cardW, 5, r.color);

  // Rank line: big emoji + name in the rank color.
  const nameSize = Math.round(23 * pop);
  drawText(ctx, `${r.emoji} ${r.name}`, cardX + 8, cardY + 12, nameSize, r.color, 'left');

  // "Cấp bậc" (Rank) label + kill-point total on the right.
  drawText(ctx, 'CẤP BẬC', cardX + 8, cardY + 12 + nameSize + 4, 14, '#cfc8dd', 'left');
  drawText(ctx, `⭐ ${rank.killPoints}`, cardX + cardW - 8, cardY + 12 + nameSize + 4, 15, '#ffd24a', 'right');

  // Progress bar toward the next rank (or a "MAX" flourish at the top).
  const barY = cardY + cardH - (r.glow ? 34 : 24);
  const barX = cardX + 8;
  const barW = cardW - 16;
  const barH = 10;
  const prog = rank.progressToNext;
  drawRect(ctx, barX, barY, barW, barH, '#3a3350');
  if (prog) {
    drawRect(ctx, barX, barY, barW * prog.overall, barH, r.color);
    const next = rank.nextRank;
    drawText(ctx, `→ ${next.emoji} ${next.name}`, barX, barY + barH + 3, 14, '#cfc8dd', 'left');
    drawText(ctx, `${Math.round(prog.overall * 100)}%`, barX + barW, barY + barH + 3, 14, '#cfc8dd', 'right');
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

// Desert scenery: sun, slow-drifting clouds, and grounded props (cacti, rock,
// bush) placed behind the action.
function drawScenery() {
  // Sun in the open sky on the left, below the HUD row and clear of HP bar.
  drawSprite(ctx, SUN, 0, 60, 100, 3);

  // Two clouds drifting slowly across the sky (wrap around). Kept in the upper
  // sky strip so they never sit behind the boss name / HP bar.
  const c1 = (tick * 0.3) % (W + 80) - 40;
  const c2 = (tick * 0.2 + W * 0.6) % (W + 80) - 40;
  drawSprite(ctx, CLOUD, 0, c1, 55, 3);
  drawSprite(ctx, CLOUD, 0, c2, 80, 2);

  // Grounded props at fixed spots (behind the hero/monster action).
  const foot = (s, sc) => GROUND_Y - s.h * DOT * sc;
  drawSprite(ctx, CACTUS, 0, W * 0.58, foot(CACTUS, 1.4), 1.4);
  drawSprite(ctx, BUSH, 0, W * 0.30, foot(BUSH, 1.4), 1.4);
  drawSprite(ctx, ROCK, 0, W * 0.44, foot(ROCK, 1.05), 1.05);
}

function renderPlaying() {
  const ox = shakeTimer > 0 ? (tick % 2 === 0 ? 4 : -4) : 0;
  ctx.save();
  ctx.translate(ox, 0);

  // Pixel-art desert world (sky, sand, layered ground) + scenery props.
  drawScene(ctx, W, H, GROUND_Y);
  drawScenery();

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
  drawBossBar();
  drawTargetWord();
  drawHUD();
  drawComboMeter();
  drawRankHUD();
  drawText(ctx, 'Gõ chữ để tấn công! (Telex)', W / 2, H - 30, 17, '#fff4d6', 'center');
  drawText(ctx, Audio.isMuted() ? '🔇 M: bật tiếng' : '🔊 M: tắt tiếng', W - 20, H - 29, 14, '#fff4d6', 'right');

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
      // Show the kid's ACTUAL hero: equipped skin + weapon color + earned rank.
      const look = equippedLook(progress.rewards);
      const rr = rank.rank;
      Scenes.drawTitle(ctx, W, H, tick, progress.stage, {
        spriteId: look.spriteId,
        weaponColor: look.weaponColor,
        rankGlow: rr.glow,
        rankName: rr.name,
        rankEmoji: rr.emoji,
        rankColor: rr.color,
      });
      break;
    }
    case STATE.TUTORIAL:
      tutorial.update();
      tutorial.draw(ctx, W, H);
      break;
    case STATE.STAGE_INTRO:
      Scenes.drawStageIntro(ctx, W, H, tick, currentStage(), stageIndex);
      break;
    case STATE.PLAYING:
      updatePlaying();
      // updatePlaying may have transitioned state; guard the render.
      if (state === STATE.PLAYING) renderPlaying();
      else if (state === STATE.VICTORY) Scenes.drawVictory(ctx, W, H, tick, currentStage());
      else if (state === STATE.FAILURE) Scenes.drawFailure(ctx, W, H, tick, currentStage());
      break;
    case STATE.VICTORY:
      Scenes.drawVictory(ctx, W, H, tick, currentStage());
      break;
    case STATE.REWARD:
      Scenes.drawReward(ctx, W, H, tick, pendingReward);
      break;
    case STATE.FAILURE:
      Scenes.drawFailure(ctx, W, H, tick, currentStage());
      break;
    case STATE.GAME_COMPLETE:
      Scenes.drawGameComplete(ctx, W, H, tick, stageIndex);
      break;
  }

  requestAnimationFrame(loop);
}

loop();
