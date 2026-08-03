// audio.js — all sound synthesized in-code via the Web Audio API (no files).
//
// A small library of chiptune-style blips and short melodies. Everything is
// generated from oscillators + gain envelopes, so the whole game stays
// asset-free. The AudioContext is created lazily and resumed on first user
// gesture (browsers block audio until then).
//
// The looping background themes live in music.js, which shares this module's
// context and master gain (see audioCtx / sfxBusGain below). The loud events
// here duck the music briefly via `duckMusic()` so gameplay feedback always
// cuts through the soundtrack.

import { duck as duckMusic } from './music.js';

// Master output level for the WHOLE game (effects + music). This was originally
// 0.28, which was simply too quiet to hear on laptop speakers at a normal system
// volume — the individual `peak` values passed to tone()/noise() are already
// well under 1.0, so this gain was stacking a second, unnecessary attenuation on
// top of them. Raising it lifts effects and music together, which keeps their
// balance (and the ducking in music.js) intact.
const MASTER_GAIN = 0.7;

let ctx = null;
let master = null;
let muted = false;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(ctx.destination);
  return ctx;
}

// Resume the context after a user gesture (call on first keypress/click).
// Returns the resume promise so callers can retry anything that needs a
// running context — `resume()` is not guaranteed to flip `state` synchronously,
// so code that checks `state` right after calling this can still see 'suspended'.
export function resumeAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') return c.resume();
  return Promise.resolve();
}

// --- Shared plumbing for music.js -------------------------------------------
// The looping soundtrack lives in its own module but must share this module's
// AudioContext (a page gets one) and hang off this master gain, so that the F9
// mute silences music and effects together — a kid pressing "mute" means all of
// it, and two independent mutes would be a bug report waiting to happen.

// The live AudioContext, creating it if needed (null if Web Audio is missing).
export function audioCtx() {
  return ensureCtx();
}

// The master gain every sound passes through — music.js connects its own bus
// here rather than to ctx.destination.
export function sfxBusGain() {
  ensureCtx();
  return master;
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : MASTER_GAIN;
  return muted;
}

export function isMuted() {
  return muted;
}

// Play a single tone. type: 'square'|'sine'|'triangle'|'sawtooth'.
function tone(freq, start, dur, type = 'square', peak = 0.6) {
  const c = ensureCtx();
  if (!c || muted) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  // Quick attack, short decay — classic blip envelope.
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// A short noise burst (for explosions / hits).
function noise(start, dur, peak = 0.4) {
  const c = ensureCtx();
  if (!c || muted) return;
  const t0 = c.currentTime + start;
  const frames = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  // Deterministic pseudo-noise (no Math.random dependency issues).
  let seed = 1234;
  for (let i = 0; i < frames; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    data[i] = ((seed / 0x7fffffff) * 2 - 1) * (1 - i / frames); // decaying
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const g = c.createGain();
  g.gain.value = peak;
  src.connect(g);
  g.connect(master);
  src.start(t0);
}

// ---- Game sound events ----

// Soft tick on each correct keystroke; pitch rises with progress.
export function keyBlip(progress = 0) {
  tone(420 + progress * 40, 0, 0.06, 'square', 0.25);
}

// Wrong key — low buzz.
export function keyError() {
  tone(140, 0, 0.12, 'sawtooth', 0.3);
}

// Basic (simple skill) attack — quick zap.
export function simpleAttack() {
  tone(660, 0, 0.08, 'square', 0.4);
  tone(880, 0.05, 0.08, 'square', 0.35);
}

// Special skill — a rising arpeggio + whoosh.
export function specialAttack() {
  duckMusic(0.5, 0.34);
  tone(392, 0, 0.09, 'triangle', 0.5);
  tone(523, 0.08, 0.09, 'triangle', 0.5);
  tone(659, 0.16, 0.09, 'triangle', 0.5);
  tone(784, 0.24, 0.14, 'triangle', 0.5);
}

// Monster hit / explosion.
export function hit() {
  duckMusic(0.4, 0.16);
  noise(0, 0.18, 0.35);
  tone(196, 0, 0.16, 'square', 0.3);
}

// Hero takes damage — a soft "oof" thud, deliberately distinct from the
// electronic sawtooth buzz of keyError() so kids don't confuse a mistyped
// key with the hero actually getting hurt. A muffled impact (low noise) plus
// a warm two-note descending "ow" on a sine, ending with a gentle wobble.
export function hurt() {
  duckMusic(0.55, 0.3);                      // getting hit must never be missed
  noise(0, 0.1, 0.22);                       // muffled body impact
  tone(330, 0, 0.16, 'sine', 0.5);           // "ow" — round, vocal-ish
  tone(233, 0.11, 0.22, 'sine', 0.45);       // drops down (a "hurt" fall)
}

// Victory jingle (major arpeggio flourish).
export function victory() {
  duckMusic(0.7, 0.95); // the jingle owns the moment; music swells back after
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => tone(f, i * 0.13, 0.22, 'square', 0.45));
  tone(1047, 0.55, 0.4, 'triangle', 0.4);
}

// Failure sting (descending minor).
export function failure() {
  duckMusic(0.7, 0.85);
  tone(440, 0, 0.2, 'sawtooth', 0.4);
  tone(370, 0.18, 0.2, 'sawtooth', 0.4);
  tone(294, 0.36, 0.4, 'sawtooth', 0.4);
}

// Reward fanfare.
export function reward() {
  duckMusic(0.6, 0.6);
  tone(659, 0, 0.12, 'square', 0.4);
  tone(784, 0.1, 0.12, 'square', 0.4);
  tone(1047, 0.22, 0.3, 'triangle', 0.45);
}

// Menu move / confirm.
export function confirm() {
  tone(587, 0, 0.09, 'square', 0.35);
  tone(880, 0.07, 0.12, 'square', 0.35);
}

// Combo milestone flourish — a sparkly rising arpeggio whose base pitch climbs
// with the combo, so bigger combos sound higher and more triumphant.
export function comboMilestone(combo = 5) {
  const base = 523 * Math.pow(2, Math.min(combo, 30) / 24); // climbs, capped
  [0, 4, 7, 12].forEach((semi, i) => {
    tone(base * Math.pow(2, semi / 12), i * 0.05, 0.12, 'triangle', 0.4);
  });
  tone(base * 2, 0.22, 0.2, 'square', 0.3);
}

// Small "tier up" chime (crossed into a stronger combo tier).
export function comboTierUp() {
  tone(784, 0, 0.08, 'square', 0.35);
  tone(1175, 0.06, 0.12, 'triangle', 0.35);
}

// Combo dropped — a soft descending "aww" (only when a real combo was lost).
export function comboBreak() {
  tone(392, 0, 0.1, 'triangle', 0.3);
  tone(294, 0.09, 0.16, 'triangle', 0.3);
}

// Rank-up fanfare — a bright ascending flourish that climbs higher the higher
// the new rank, so reaching Mythic sounds grander than reaching Adventurer.
export function rankUp(rankIndex = 1) {
  duckMusic(0.6, 0.75);
  const base = 523 * Math.pow(2, Math.min(rankIndex, 6) / 12); // higher rank → higher
  [0, 4, 7, 12, 16].forEach((semi, i) => {
    tone(base * Math.pow(2, semi / 12), i * 0.07, 0.16, 'triangle', 0.45);
  });
  tone(base * 3, 0.4, 0.45, 'square', 0.35);
}

// --- Staff of Wisdom (chapter 2's artifact) ---------------------------------

// The Staff just reached full charge: a bright, hopeful two-note "ready!" chime
// with a shimmer on top. Deliberately distinct from comboTierUp (which is also a
// rising pair) by having a third, much higher sparkle — a kid needs to tell
// "combo went up" from "my big attack is ready" without looking.
export function staffCharged() {
  tone(659, 0, 0.10, 'triangle', 0.40);
  tone(988, 0.08, 0.14, 'triangle', 0.42);
  tone(1976, 0.18, 0.26, 'sine', 0.28); // high shimmer
}

// Spending the charge: a deep swell under a bright strike, so an empowered hit
// sounds heavier than any ordinary special. Matches the FAST impact beat of
// the _staffcast visual (effects.js) — the columns landing + the stacked
// shockwave punch — not the full ~5s frozen hold that follows (see
// STAFFCAST_FRAMES): a rumble under the strike, a stacked double impact for
// the shockwave punch, and a shimmering tail, resolving in under a second.
// The long ambient tail after that is deliberately silent, same as every
// other skill's lingering particles (holylight's rising motes, voidrend's
// drifting debris) — a sustained SFX for the whole freeze would be fatiguing,
// not exciting.
export function staffStrike() {
  duckMusic(0.7, 0.9);                       // the biggest hit in the game — duck longer to match
  tone(98, 0, 0.55, 'sawtooth', 0.30);        // low rumble, held under the standing columns
  tone(147, 0.04, 0.45, 'sawtooth', 0.26);
  noise(0.02, 0.16, 0.30);                    // the initial column-strike crack
  // The stacked shockwave punch: two impacts close together, not one, so it
  // reads as the double-ring hit rather than a single thud.
  tone(587, 0.08, 0.18, 'square', 0.44);
  noise(0.09, 0.22, 0.34);
  tone(494, 0.16, 0.20, 'square', 0.38);
  noise(0.17, 0.26, 0.30);
  // A bright ascending shimmer tail — rings on well after the impact, matching
  // the particles that keep drifting and twinkling long after the burst.
  tone(1175, 0.24, 0.30, 'triangle', 0.36);
  tone(1568, 0.34, 0.34, 'sine', 0.26);
  tone(1976, 0.46, 0.40, 'sine', 0.18);
}

// --- Multi-phase boss (stage 26) --------------------------------------------

// An ordinary hit turned away by a shielded phase: a dull, muffled clank with no
// bright partials, so it clearly reads as "that did nothing".
export function shieldBlock() {
  tone(196, 0, 0.09, 'square', 0.26);
  tone(147, 0.06, 0.14, 'triangle', 0.22);
  noise(0, 0.10, 0.16);
}

// A boss phase falling: a descending growl into a rising sting — the sound of the
// fight changing gear rather than ending.
export function phaseChange() {
  duckMusic(0.65, 0.7);
  [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.07, 0.16, 'sawtooth', 0.34));
  noise(0.05, 0.45, 0.40);
  tone(523, 0.34, 0.20, 'square', 0.36);
  tone(784, 0.46, 0.28, 'triangle', 0.34);
}

// A page of story text turning — very soft, so paging the prologue doesn't
// sound like a menu confirm.
export function storyPage() {
  tone(523, 0, 0.05, 'triangle', 0.18);
  noise(0, 0.05, 0.08);
}

// --- Boss warning ------------------------------------------------------------

// A stageboss is about to spawn: a low held horn-stab dyad (root + fifth) with
// a rumble underneath, deliberately LOW and SUSTAINED rather than rising —
// phaseChange()/rankUp() climb to feel triumphant; this one just sits there and
// growls, so a kid reads it as "danger ahead", not "something good happened".
export function bossWarning() {
  duckMusic(0.6, 0.9);
  tone(98, 0, 0.5, 'sawtooth', 0.32);
  tone(147, 0, 0.5, 'sawtooth', 0.24);
  noise(0, 0.5, 0.3);
  tone(98, 0.55, 0.35, 'sawtooth', 0.26);
  tone(147, 0.55, 0.35, 'sawtooth', 0.20);
}

// --- Stageboss signature attacks (see bossattacks.js) -----------------------
// One cue per stageboss, played the instant its telegraphed attack lands (not
// on the windup — a kid should see the charge-up but only HEAR the impact, so
// the sound stays the confirming "it landed" cue rather than a second warning
// competing with the windup glow). All duck the music like any other loud
// combat hit.

// Ground Slam (stageboss_ogre): a heavy low thud + rumble.
export function bossGroundSlam() {
  duckMusic(0.55, 0.35);
  noise(0, 0.22, 0.4);
  tone(98, 0, 0.28, 'sine', 0.4);
  tone(65, 0.05, 0.3, 'sawtooth', 0.3);
}

// Fire Breath (boss_dragon): a roar sweeping down into a fiery whoosh.
export function bossFireBreath() {
  duckMusic(0.55, 0.4);
  tone(220, 0, 0.3, 'sawtooth', 0.32);
  tone(160, 0.08, 0.32, 'sawtooth', 0.3);
  noise(0.02, 0.35, 0.36);
}

// Shadow Bolt (stageboss_darklord): a low ominous boom, short and dark.
export function bossShadowBolt() {
  duckMusic(0.5, 0.3);
  tone(110, 0, 0.24, 'sine', 0.4);
  tone(73, 0.04, 0.26, 'sawtooth', 0.28);
  noise(0, 0.14, 0.22);
}

// Ink Splatter (boss_scribe): a wet slap.
export function bossInkSplatter() {
  duckMusic(0.45, 0.22);
  noise(0, 0.1, 0.32);
  tone(180, 0.03, 0.1, 'triangle', 0.3);
}

// Gale Slash (boss_windserpent): a sharp fast whoosh.
export function bossGaleSlash() {
  duckMusic(0.4, 0.2);
  tone(1400, 0, 0.08, 'sine', 0.24);
  noise(0, 0.14, 0.26);
}

// Stone Fist (boss_guardian_statue): grinding stone into a heavy crack —
// the longest, heaviest cue in the set, matching its 40-frame windup.
export function bossStoneFist() {
  duckMusic(0.6, 0.4);
  tone(85, 0, 0.34, 'sawtooth', 0.34);
  noise(0.04, 0.3, 0.4);
  tone(120, 0.28, 0.12, 'square', 0.3);
}

// Shadow Grasp (boss_formless / Devourer phase 1): a low moan/whisper.
export function bossShadowGrasp() {
  duckMusic(0.5, 0.35);
  tone(140, 0, 0.4, 'sine', 0.26);
  tone(150, 0.1, 0.36, 'sine', 0.2);
  noise(0.02, 0.3, 0.14);
}

// Arcane Pulse (stageboss_staffguardian): a crystalline chime.
export function bossArcanePulse() {
  duckMusic(0.45, 0.3);
  tone(988, 0, 0.14, 'sine', 0.3);
  tone(1480, 0.06, 0.2, 'triangle', 0.26);
}

// Iron Slam (boss_warden): a metallic clank.
export function bossIronSlam() {
  duckMusic(0.5, 0.28);
  tone(330, 0, 0.06, 'square', 0.32);
  tone(220, 0.03, 0.1, 'square', 0.28);
  noise(0, 0.16, 0.3);
}

// Lantern Curse (boss_jailer): deliberately dull and muffled, like
// shieldBlock() — an eerie ring rather than a loud impact.
export function bossLanternCurse() {
  duckMusic(0.4, 0.4);
  tone(220, 0, 0.3, 'sine', 0.2);
  tone(330, 0.15, 0.3, 'sine', 0.14);
}

// War Cry Slash (boss_general): a battle horn stab, then a slash.
export function bossWarCrySlash() {
  duckMusic(0.55, 0.3);
  tone(196, 0, 0.18, 'sawtooth', 0.36);
  tone(294, 0.1, 0.1, 'square', 0.3);
  noise(0.08, 0.12, 0.28);
}

// Void Maw (Devourer phase 2): a deep roar.
export function bossVoidMaw() {
  duckMusic(0.6, 0.4);
  tone(90, 0, 0.36, 'sawtooth', 0.36);
  tone(65, 0.1, 0.34, 'sine', 0.3);
  noise(0.02, 0.3, 0.3);
}

// Devour Sky (Devourer phase 3): the biggest cue in the set — a guttural
// scream over a low sustained drone.
export function bossDevourSky() {
  duckMusic(0.65, 0.6);
  tone(200, 0, 0.3, 'sawtooth', 0.4);
  tone(150, 0.06, 0.34, 'sawtooth', 0.34);
  tone(60, 0.1, 0.5, 'sine', 0.32);
  noise(0.04, 0.4, 0.4);
}

// Fallback for a stageboss sprite with no roster entry in bossattacks.js.
export function bossGenericSlash() {
  duckMusic(0.45, 0.25);
  tone(392, 0, 0.1, 'square', 0.3);
  noise(0, 0.12, 0.24);
}

// --- Princess support (chapters 2-3 — see princesses.js) --------------------
// Every cast plays this shared warm chime FIRST (a gentle bell, not a fanfare
// — this is someone helping, not an achievement, so it's deliberately softer
// than rankUp/reward), then the ability's own cue layers on top of it.

export function princessCast() {
  duckMusic(0.5, 0.5);
  tone(1047, 0, 0.14, 'sine', 0.30);
  tone(1319, 0.09, 0.18, 'sine', 0.26);
}

// Hoa's Heal — a warm rising major third, soft sine, no percussion.
export function princessHeal() {
  tone(523, 0, 0.16, 'sine', 0.34);
  tone(659, 0.10, 0.22, 'sine', 0.32);
}

// Mây's Full Heal — heal's cue, wider and with a shimmering top note (this
// only fires at a real crisis, so it should feel like a bigger relief).
export function princessFullHeal() {
  tone(392, 0, 0.18, 'sine', 0.34);
  tone(523, 0.10, 0.20, 'sine', 0.34);
  tone(784, 0.22, 0.30, 'sine', 0.28);
}

// Ánh Dương's Shield — a bright metallic "ting" (the dome snapping into
// place), distinct from staffCharged's triad so it doesn't read as "ready".
export function princessShield() {
  tone(880, 0, 0.10, 'triangle', 0.36);
  tone(1319, 0.06, 0.20, 'sine', 0.30);
}

// The shield popping to block a hit — a quick glassy chime, satisfying but
// clearly "that worked", the opposite mood of shieldBlock()'s dull clank.
export function princessShieldBreak() {
  tone(1319, 0, 0.08, 'triangle', 0.34);
  tone(988, 0.05, 0.10, 'triangle', 0.28);
  noise(0, 0.06, 0.10);
}

// Băng's Freeze — a crystalline descending chime, icy (sine + high partial).
export function princessFreeze() {
  tone(988, 0, 0.10, 'sine', 0.30);
  tone(784, 0.07, 0.10, 'sine', 0.28);
  tone(1568, 0.10, 0.18, 'sine', 0.18);
}

// Cát's Slow — a low, dragging descending glide, matching the sluggish visual.
export function princessSlow() {
  tone(330, 0, 0.20, 'triangle', 0.28);
  tone(262, 0.14, 0.26, 'triangle', 0.26);
}

// Sóng Biển's Knockback — a whoosh (noise sweep) plus a low thud, like a wave.
export function princessKnockback() {
  noise(0, 0.22, 0.30);
  tone(220, 0, 0.16, 'sine', 0.30);
}

// Sao's Star Nova — a quick bright twinkle arpeggio.
export function princessStarNova() {
  duckMusic(0.4, 0.3);
  [784, 988, 1319].forEach((f, i) => tone(f, i * 0.05, 0.10, 'triangle', 0.32));
}

// Ánh Sáng's Light Nova — star nova's cue, bigger and duckier (fires on a
// dramatic phase-change beat, so it should have real weight).
export function princessLightNova() {
  duckMusic(0.6, 0.6);
  [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.05, 0.14, 'triangle', 0.36));
  noise(0, 0.2, 0.2);
}

// Tình Yêu's Staff Charge — echoes staffCharged()'s own two-note "ready"
// shape (since that's mechanically what just happened) but rounder/softer,
// so it reads as "given to you" rather than "you earned it".
export function princessStaffCharge() {
  tone(659, 0, 0.12, 'sine', 0.32);
  tone(988, 0.08, 0.16, 'sine', 0.30);
  tone(1976, 0.16, 0.22, 'sine', 0.20);
}

// Rain Princess's Cleanse — the quietest cue in the roster, a soft two-note
// ripple, matching a rescue from a stuck moment rather than a triumph.
export function princessCleanse() {
  tone(587, 0, 0.10, 'sine', 0.24);
  tone(784, 0.08, 0.14, 'sine', 0.20);
}
