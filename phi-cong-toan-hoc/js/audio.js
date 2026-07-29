// audio.js — every sound in the game, synthesized. No audio files.
//
// Web Audio oscillators/noise/gain, same approach as the typing game's audio.js.
// The AudioContext is created LAZILY and must be resumed on a user gesture —
// browsers block audio until the user has interacted, so resumeAudio() is called
// from the first tap/keypress in main.js.
//
// THE MIX PHILOSOPHY, and it follows from the same constraint as effects.js: the
// kid is doing arithmetic. Sound has to confirm actions without competing for
// the attention that is being spent on reading.
//
//   * ANSWER FEEDBACK IS THE LOUDEST THING. Correct/wrong must cut through
//     everything else, because it is the one sound carrying information the kid
//     needs. Shooting and impacts sit under it.
//   * The wrong-answer sound is NOT harsh. A buzzer teaches a child to fear
//     answering. It is a soft descending pair — clearly "no", not a punishment.
//   * hullLow is a gentle recurring reminder, never an alarm klaxon. Panic
//     does not help someone doing mental math.
//   * shieldBlock is deliberately DULL and muffled, so it reads as "that did
//     nothing" (the typing game's exact reasoning).
//   * Loud events duck the music, so feedback is never buried — see music.js.

let ctx = null;
let master = null;
let sfxBus = null;
let muted = false;

// Lazily create the context. Returns null if Web Audio is unavailable.
function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 1.0;
  sfxBus.connect(master);
  return ctx;
}

// Called on the first user gesture (main.js). Browsers start contexts
// suspended; without this every sound is silently dropped.
export function resumeAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}

// music.js shares this context and hangs off the same master gain, so one mute
// silences music and effects together.
export function audioCtx() { return ensure(); }
export function masterGain() { ensure(); return master; }
export function sfxBusGain() { ensure(); return sfxBus; }

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.9;
  return muted;
}
export function isMuted() { return muted; }

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

// A single oscillator note with an ADSR-ish envelope.
function tone({ freq, dur = 0.12, type = 'square', vol = 0.2, attack = 0.005,
                decay = null, slideTo = null, delay = 0 }) {
  const c = ensure();
  if (!c || muted) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);

  const rel = decay ?? dur;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + rel);

  osc.connect(g); g.connect(sfxBus);
  osc.start(t0);
  osc.stop(t0 + rel + 0.02);
}

// Filtered noise — impacts, explosions, thruster wash.
function noise({ dur = 0.15, vol = 0.15, type = 'lowpass', freq = 1200,
                 q = 1, slideTo = null, delay = 0 }) {
  const c = ensure();
  if (!c || muted) return;
  const t0 = c.currentTime + delay;
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  // Deterministic-ish noise; exact values don't matter perceptually.
  let s = 1;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    d[i] = (s / 0x3fffffff) - 1;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = type;
  filt.frequency.setValueAtTime(freq, t0);
  filt.Q.value = q;
  if (slideTo) filt.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  src.connect(filt); filt.connect(g); g.connect(sfxBus);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

// Duck the music briefly so a loud effect is never buried. music.js installs
// the real implementation; until then this is a no-op.
let duckFn = null;
export function registerDuck(fn) { duckFn = fn; }
function duck(amount = 0.5, dur = 0.18) {
  if (duckFn) duckFn(amount, dur);
}

// ---------------------------------------------------------------------------
// ANSWER FEEDBACK — the most important sounds in the game.
// ---------------------------------------------------------------------------

// Correct: a bright rising two-note figure. Confident and short.
export function answerCorrect(combo = 0) {
  // The interval climbs with the combo, so a streak audibly builds. Capped so
  // it never gets shrill.
  const step = Math.min(6, combo) * 40;
  tone({ freq: 620 + step, dur: 0.09, type: 'triangle', vol: 0.26 });
  tone({ freq: 930 + step, dur: 0.13, type: 'triangle', vol: 0.22, delay: 0.07 });
  duck(0.55, 0.16);
}

// Wrong: a soft descending pair. NOT a buzzer — see the header. A child who
// fears the wrong-answer sound stops answering, which is the opposite of what
// this game wants.
export function answerWrong() {
  tone({ freq: 300, dur: 0.14, type: 'sine', vol: 0.2 });
  tone({ freq: 220, dur: 0.2, type: 'sine', vol: 0.18, delay: 0.1 });
  duck(0.5, 0.2);
}

// ---------------------------------------------------------------------------
// COMBAT
// ---------------------------------------------------------------------------

export function shoot() {
  // Short, dry, and quiet — this fires on every single answer, so anything
  // resonant would become fatiguing within a minute.
  tone({ freq: 900, slideTo: 420, dur: 0.07, type: 'square', vol: 0.1 });
  noise({ dur: 0.05, vol: 0.05, freq: 2600, type: 'highpass' });
}

export function hit() {
  noise({ dur: 0.09, vol: 0.13, freq: 1500, slideTo: 400, type: 'bandpass', q: 1.2 });
  tone({ freq: 260, dur: 0.06, type: 'square', vol: 0.08 });
}

export function explode(tier = 1) {
  noise({ dur: 0.18 + tier * 0.1, vol: 0.16 + tier * 0.03, freq: 900, slideTo: 90 });
  tone({ freq: 150 - tier * 20, slideTo: 50, dur: 0.22 + tier * 0.08, type: 'sine', vol: 0.14 });
  duck(0.6, 0.22);
}

// The ship taking damage. Distinct from `hit` (which is the kid hurting THEM):
// lower, with a short pitch dive, so "I am being hurt" is unmistakable.
export function hurt() {
  tone({ freq: 380, slideTo: 90, dur: 0.26, type: 'sawtooth', vol: 0.2 });
  noise({ dur: 0.2, vol: 0.14, freq: 700, slideTo: 120 });
  duck(0.7, 0.26);
}

// A blocked hit on a shielded phase. Muffled and dull ON PURPOSE — the kid must
// hear that nothing happened, or they conclude the game is broken.
export function shieldBlock() {
  noise({ dur: 0.12, vol: 0.09, freq: 260, type: 'lowpass' });
  tone({ freq: 130, dur: 0.1, type: 'sine', vol: 0.07 });
}

// An ally's shield absorbing a hit — brighter than shieldBlock, because this one
// is GOOD news for the kid.
export function shieldAbsorb() {
  tone({ freq: 780, dur: 0.1, type: 'triangle', vol: 0.16 });
  tone({ freq: 1170, dur: 0.14, type: 'sine', vol: 0.12, delay: 0.05 });
}

// ---------------------------------------------------------------------------
// THE COMBO SHIELD (skill_shield). Three sounds for three distinct beats —
// deliberately its own cool, glassy timbre so a kid never mixes it up with
// shieldAbsorb (Vòm Xanh) or shieldBlock (a boss's immune phase).
// ---------------------------------------------------------------------------

// Raising the shield — plays once, on the down->up transition only (main.js
// gates this), not on every refresh while it's already up. A quiet rising
// shimmer says "you earned something" without competing with answerCorrect,
// which fires the same instant.
export function comboShieldUp() {
  tone({ freq: 720, dur: 0.09, type: 'sine', vol: 0.12 });
  tone({ freq: 1080, dur: 0.14, type: 'sine', vol: 0.1, delay: 0.06 });
}

// A shot stopped by the bubble. This can fire often once the shield is up
// (every incoming shot), so it stays cheap and quiet — a glassy tick, not a
// fanfare, matching shieldBlock's "that did nothing" restraint.
export function comboShieldBlock() {
  tone({ freq: 1400, dur: 0.05, type: 'sine', vol: 0.07 });
  noise({ dur: 0.05, vol: 0.04, freq: 2200, type: 'highpass' });
}

// The shield shattering on a wrong answer. Layers with answerWrong (which
// still plays) rather than replacing it — this is a consequence of the miss,
// not the miss itself. A glassy crack, not a buzzer: still safe for a child
// who fears loud "you failed" sounds, just more eventful than a timeout.
export function comboShieldBreak() {
  noise({ dur: 0.16, vol: 0.14, freq: 1800, slideTo: 300, type: 'bandpass', q: 0.9 });
  tone({ freq: 900, slideTo: 200, dur: 0.18, type: 'triangle', vol: 0.13 });
}

// ---------------------------------------------------------------------------
// PROGRESSION
// ---------------------------------------------------------------------------

export function comboMilestone(tier = 1) {
  const base = 520 + tier * 90;
  tone({ freq: base, dur: 0.09, type: 'triangle', vol: 0.2 });
  tone({ freq: base * 1.25, dur: 0.09, type: 'triangle', vol: 0.18, delay: 0.07 });
  tone({ freq: base * 1.5, dur: 0.16, type: 'triangle', vol: 0.16, delay: 0.14 });
}

export function comboBreak() {
  tone({ freq: 420, slideTo: 200, dur: 0.2, type: 'sine', vol: 0.14 });
}

// The ultimate charging to full — a rising shimmer that tells the kid the big
// button is armed, without them needing to watch the meter.
export function ultimateReady() {
  for (let i = 0; i < 4; i++) {
    tone({ freq: 700 + i * 220, dur: 0.1, type: 'sine', vol: 0.13, delay: i * 0.05 });
  }
}

// Firing the ultimate. The biggest sound in the game.
export function ultimateFire() {
  tone({ freq: 180, slideTo: 900, dur: 0.3, type: 'sawtooth', vol: 0.2 });
  tone({ freq: 360, slideTo: 1800, dur: 0.36, type: 'triangle', vol: 0.16, delay: 0.04 });
  noise({ dur: 0.4, vol: 0.16, freq: 400, slideTo: 4000, type: 'bandpass', q: 0.8 });
  duck(0.8, 0.4);
}

export function upgrade() {
  const notes = [523, 659, 784, 1047]; // C E G C — unambiguous "you gained"
  notes.forEach((f, i) => tone({ freq: f, dur: 0.16, type: 'triangle', vol: 0.2, delay: i * 0.08 }));
}

// A downgrade after a wrong answer. Mirror of `upgrade`, descending. Sad, not
// punishing — the same restraint as answerWrong.
export function downgrade() {
  const notes = [784, 659, 523, 392];
  notes.forEach((f, i) => tone({ freq: f, dur: 0.16, type: 'sine', vol: 0.15, delay: i * 0.07 }));
}

// An ally joining the line-up — the emotional peak of chapter 2, so it gets a
// warm major arpeggio rather than a UI blip.
export function allyJoin() {
  const notes = [392, 523, 659, 784, 1047];
  notes.forEach((f, i) => tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.2, delay: i * 0.1 }));
  noise({ dur: 0.3, vol: 0.05, freq: 3000, type: 'highpass', delay: 0.3 });
}

// A rank promotion — the rarest sound in the game (six times across a whole
// playthrough), so it gets the longest fanfare. Deliberately more triumphant than
// `upgrade`: an upgrade is something the stage gave you, a rank is something you
// became.
export function rankUp() {
  const notes = [523, 659, 784, 1047, 1319, 1047, 1319];
  notes.forEach((f, i) => tone({
    freq: f, dur: 0.3, type: 'triangle', vol: 0.22, delay: i * 0.13,
  }));
  noise({ dur: 0.5, vol: 0.06, freq: 3200, type: 'highpass', delay: 0.5 });
  duck(0.7, 0.9);
}

export function phaseChange() {
  tone({ freq: 300, slideTo: 80, dur: 0.34, type: 'sawtooth', vol: 0.18 });
  noise({ dur: 0.3, vol: 0.12, freq: 500, slideTo: 100 });
  tone({ freq: 120, slideTo: 400, dur: 0.3, type: 'sine', vol: 0.14, delay: 0.2 });
  duck(0.75, 0.34);
}

// The ship's engine catching as it flies off after a win — see main.js's
// updateStageClear(). A rising thruster roar (filtered noise wash + a sawtooth
// climbing underneath), so a stage ending reads as the ship GOING somewhere
// rather than the screen just stopping. Sustained rather than a blip: the
// flyout takes the better part of a second to clear the field, and a short
// stinger would finish long before the ship does.
export function flyout() {
  noise({ dur: 0.9, vol: 0.12, freq: 150, slideTo: 700, type: 'lowpass', q: 0.8 });
  tone({ freq: 80, slideTo: 220, dur: 0.85, type: 'sawtooth', vol: 0.1 });
}

// ---------------------------------------------------------------------------
// STATE / UI
// ---------------------------------------------------------------------------

export function victory() {
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((f, i) => tone({ freq: f, dur: 0.26, type: 'triangle', vol: 0.22, delay: i * 0.12 }));
}

export function failure() {
  const notes = [392, 349, 294, 233];
  notes.forEach((f, i) => tone({ freq: f, dur: 0.34, type: 'sine', vol: 0.18, delay: i * 0.16 }));
}

export function confirm() {
  tone({ freq: 660, dur: 0.08, type: 'square', vol: 0.16 });
  tone({ freq: 880, dur: 0.1, type: 'square', vol: 0.12, delay: 0.05 });
}

// Paging story text. VERY soft, so reading a long prologue never sounds like
// hammering a menu button (the typing game's storyPage rationale).
export function storyPage() {
  tone({ freq: 520, dur: 0.05, type: 'sine', vol: 0.07 });
}


// Low health. A gentle two-note reminder, repeated by main.js on a timer — not a
// klaxon. A child doing mental arithmetic does not need adrenaline.
//
// (Named energyLow when there was an energy bar; kept as hullLow now that hull is
// the only meter.)
export function hullLow() {
  tone({ freq: 440, dur: 0.1, type: 'sine', vol: 0.12 });
  tone({ freq: 330, dur: 0.14, type: 'sine', vol: 0.1, delay: 0.11 });
}

// A monstership committing to a kamikaze dive — a RISING swoop, which is the
// opposite contour to every other enemy sound in the game. Rising = something is
// coming at you, and it is the only warning the kid gets before the impact, so it
// has to be identifiable in one hearing.
export function dive() {
  tone({ freq: 180, slideTo: 620, dur: 0.3, type: 'sawtooth', vol: 0.1 });
  noise({ dur: 0.26, vol: 0.07, freq: 300, slideTo: 1600, type: 'bandpass', q: 2 });
}

// THE IMPACT. A hard, short metallic crunch — deliberately NOT hurt(), which is a
// descending sawtooth reading as "a shot got through". A collision should sound
// like a collision: low body, bright transient, no slide. Sharing hurt() here was
// the original legibility bug in audible form — the kid could not tell that
// something had rammed them rather than shot them.
export function ram() {
  tone({ freq: 120, slideTo: 60, dur: 0.18, type: 'square', vol: 0.2 });
  noise({ dur: 0.14, vol: 0.2, freq: 2200, slideTo: 400 });
  tone({ freq: 300, dur: 0.06, type: 'triangle', vol: 0.12 });
  duck(0.7, 0.24);
}

// An escaped monstership. A soft downward whoosh — the audible version of the
// escape particle smear, so the energy dip has a cause the kid can perceive.
export function escape() {
  noise({ dur: 0.24, vol: 0.1, freq: 1400, slideTo: 200, type: 'bandpass', q: 1.5 });
}
