// audio.js — every sound effect in the game, synthesized. No audio files,
// same asset-free approach as the sprites in pixelart.js. The AudioContext
// is created LAZILY and must be resumed on a user gesture — browsers block
// audio until the player has interacted, so resumeAudio() is called from
// the very first tap (see game.js's _onTap).
//
// MIX PHILOSOPHY
// ---------------
// The kid is reading a question and picking an answer under a countdown.
// Sound has to confirm what just happened without competing with the text:
//
//   * Correct/wrong feedback is the loudest, clearest thing in the mix —
//     it is the one sound carrying information the kid needs right now.
//   * Wrong answer is a soft descending pair, NOT a buzzer. A harsh "fail"
//     sound teaches a child to fear answering.
//   * The balloon pop is dramatic (it's the headline event when it
//     happens) but short, so it never lingers into the next question.
//   * Loud events duck the music briefly so feedback always cuts through.

let ctx = null;
let master = null;
let sfxBus = null;
let muted = false;

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

export function resumeAudio() {
  const c = ensure();
  if (c && c.state === "suspended") c.resume();
}

// music.js shares this context and hangs off the same master gain, so one
// mute silences music and effects together.
export function audioCtx() {
  return ensure();
}
export function sfxBusGain() {
  ensure();
  return sfxBus;
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.9;
  return muted;
}
export function isMuted() {
  return muted;
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function tone({ freq, dur = 0.12, type = "sine", vol = 0.2, attack = 0.005, decay = null, slideTo = null, delay = 0 }) {
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

  osc.connect(g);
  g.connect(sfxBus);
  osc.start(t0);
  osc.stop(t0 + rel + 0.02);
}

// Filtered noise — pops, cracks, whooshes.
function noise({ dur = 0.15, vol = 0.15, type = "lowpass", freq = 1200, q = 1, slideTo = null, delay = 0 }) {
  const c = ensure();
  if (!c || muted) return;
  const t0 = c.currentTime + delay;
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  let s = 1;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    d[i] = s / 0x3fffffff - 1;
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

  src.connect(filt);
  filt.connect(g);
  g.connect(sfxBus);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

// Duck the music briefly so a loud effect is never buried. music.js
// installs the real implementation; until then this is a no-op.
let duckFn = null;
export function registerDuck(fn) {
  duckFn = fn;
}
function duck(amount = 0.5, dur = 0.18) {
  if (duckFn) duckFn(amount, dur);
}

// ---------------------------------------------------------------------------
// ANSWER FEEDBACK
// ---------------------------------------------------------------------------

// Correct: a bright rising three-note chime, like a little "ding!" of
// lift. The pitch climbs slightly with a streak so a run of correct
// answers audibly builds without ever getting shrill.
export function answerCorrect(streak = 0) {
  const step = Math.min(6, streak) * 35;
  tone({ freq: 587 + step, dur: 0.09, type: "triangle", vol: 0.24 });
  tone({ freq: 740 + step, dur: 0.09, type: "triangle", vol: 0.22, delay: 0.06 });
  tone({ freq: 987 + step, dur: 0.16, type: "triangle", vol: 0.2, delay: 0.12 });
  duck(0.5, 0.2);
}

// Wrong: a soft descending pair. Not a buzzer — see the header.
export function answerWrong() {
  tone({ freq: 300, dur: 0.14, type: "sine", vol: 0.2 });
  tone({ freq: 220, dur: 0.2, type: "sine", vol: 0.18, delay: 0.1 });
  duck(0.5, 0.2);
}

// ---------------------------------------------------------------------------
// BALLOON EVENTS
// ---------------------------------------------------------------------------

// The wooden barrier splintering open after a correct answer — a short,
// satisfying crack, distinct from the answer chime that plays right
// alongside it (game.js fires both).
export function barrierBreak() {
  noise({ dur: 0.14, vol: 0.18, freq: 2200, slideTo: 500, type: "bandpass", q: 1 });
  tone({ freq: 180, slideTo: 80, dur: 0.12, type: "square", vol: 0.12 });
}

// The balloon bursting. The headline "bad" sound in the game: a sharp
// crack (the pop itself) followed by a brief falling whoosh as it
// deflates. Dramatic but short — it must not linger into the next screen.
export function balloonPop() {
  noise({ dur: 0.05, vol: 0.28, freq: 3200, type: "highpass" });
  tone({ freq: 700, slideTo: 90, dur: 0.28, type: "sawtooth", vol: 0.2, delay: 0.02 });
  noise({ dur: 0.35, vol: 0.14, freq: 900, slideTo: 150, type: "lowpass", delay: 0.03 });
  duck(0.75, 0.4);
}

// Balloon lifting off at the start of a run — a soft airy whoosh rising
// in pitch, like a breath of hot air filling the envelope.
export function liftOff() {
  noise({ dur: 0.4, vol: 0.1, freq: 300, slideTo: 1400, type: "bandpass", q: 0.7 });
  tone({ freq: 220, slideTo: 440, dur: 0.35, type: "sine", vol: 0.1 });
}

// ---------------------------------------------------------------------------
// STATE / UI
// ---------------------------------------------------------------------------

// A new best-stage record — a short triumphant flourish, distinct from
// (and layered on top of) the regular answerCorrect chime.
export function newBest() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => tone({ freq: f, dur: 0.18, type: "triangle", vol: 0.2, delay: i * 0.08 }));
}

// A generic button/UI tap — start, retry, home. Quiet and dry so it never
// competes with the more meaningful sounds above.
export function tap() {
  tone({ freq: 700, dur: 0.06, type: "square", vol: 0.14 });
  tone({ freq: 980, dur: 0.08, type: "square", vol: 0.1, delay: 0.04 });
}

// The countdown timer entering its final, urgent stretch. A single soft
// tick, not a klaxon — called once per crossing, not every frame.
export function timerWarn() {
  tone({ freq: 520, dur: 0.08, type: "sine", vol: 0.1 });
}
