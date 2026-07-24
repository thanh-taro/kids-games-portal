// audio.js — all sound synthesized in-code via the Web Audio API (no files).
//
// A small library of chiptune-style blips and short melodies. Everything is
// generated from oscillators + gain envelopes, so the whole game stays
// asset-free. The AudioContext is created lazily and resumed on first user
// gesture (browsers block audio until then).

let ctx = null;
let master = null;
let muted = false;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.28; // keep it gentle for kids
  master.connect(ctx.destination);
  return ctx;
}

// Resume the context after a user gesture (call on first keypress/click).
export function resumeAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') c.resume();
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.28;
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
  tone(392, 0, 0.09, 'triangle', 0.5);
  tone(523, 0.08, 0.09, 'triangle', 0.5);
  tone(659, 0.16, 0.09, 'triangle', 0.5);
  tone(784, 0.24, 0.14, 'triangle', 0.5);
}

// Monster hit / explosion.
export function hit() {
  noise(0, 0.18, 0.35);
  tone(196, 0, 0.16, 'square', 0.3);
}

// Hero takes damage — a soft "oof" thud, deliberately distinct from the
// electronic sawtooth buzz of keyError() so kids don't confuse a mistyped
// key with the hero actually getting hurt. A muffled impact (low noise) plus
// a warm two-note descending "ow" on a sine, ending with a gentle wobble.
export function hurt() {
  noise(0, 0.1, 0.22);                       // muffled body impact
  tone(330, 0, 0.16, 'sine', 0.5);           // "ow" — round, vocal-ish
  tone(233, 0.11, 0.22, 'sine', 0.45);       // drops down (a "hurt" fall)
}

// Victory jingle (major arpeggio flourish).
export function victory() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => tone(f, i * 0.13, 0.22, 'square', 0.45));
  tone(1047, 0.55, 0.4, 'triangle', 0.4);
}

// Failure sting (descending minor).
export function failure() {
  tone(440, 0, 0.2, 'sawtooth', 0.4);
  tone(370, 0.18, 0.2, 'sawtooth', 0.4);
  tone(294, 0.36, 0.4, 'sawtooth', 0.4);
}

// Reward fanfare.
export function reward() {
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
  const base = 523 * Math.pow(2, Math.min(rankIndex, 6) / 12); // higher rank → higher
  [0, 4, 7, 12, 16].forEach((semi, i) => {
    tone(base * Math.pow(2, semi / 12), i * 0.07, 0.16, 'triangle', 0.45);
  });
  tone(base * 3, 0.4, 0.45, 'square', 0.35);
}
