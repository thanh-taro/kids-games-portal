// music.js — the looping soundtrack, fully synthesized.
//
// Shares audio.js's AudioContext and hangs off the same master gain, so F9
// silences music and effects together. F10 toggles music alone.
//
// ===========================================================================
// THE RESTRAINT IS THE WHOLE POINT, and it is what to preserve when editing.
//
// The kid is doing mental arithmetic — reading a formula, scanning four numbers,
// deciding — while this plays. Music that pulls attention costs them the answer.
// So, carried over from the typing game and for exactly the same reasons:
//
//   * NO DRUMS ANYWHERE. A beat is the most attention-pulling thing you can put
//     under someone who is reading. It also pushes a kid to answer FAST when the
//     game rewards answering CLEANLY (the ultimate charges on accuracy, not
//     speed), so a drum track would actively fight the design.
//   * THE BATTLE LOOPS HAVE NO MELODY. Pad, soft bass pulse, sparse fixed-shape
//     arpeggio. A tune is something you follow; a texture is something you sit
//     inside. Only scenes where nobody is answering get a `lead` voice.
//   * TEMPOS STAY 68-100 BPM. Slow enough to feel like space, never urgent.
//   * The three chapter battle loops differ by MODE AND TEXTURE, not busyness:
//     bright-major → suspended-thoughtful → dark-heavy. A kid should feel the
//     Darkness Realm without the music working harder.
//
// A song is data: {bpm, beatsPerBar, root, bars[], voices{}} where `bars` is a
// chord progression in scale degrees. A new theme is a new SONGS entry.
//
// Bars are queued on the Web Audio clock by a look-ahead scheduler, so the loop
// never drifts when the render loop hitches during a particle burst.

import { audioCtx, masterGain } from './audio.js';

// ---------------------------------------------------------------------------
// Scales and chords
// ---------------------------------------------------------------------------

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  // Suspended/lydian-ish: chapter 2's "searching" colour. Neither happy nor sad,
  // which is exactly the emotional register of hunting for imprisoned friends.
  suspended: [0, 2, 4, 6, 7, 9, 11],
  // Phrygian: chapter 3. The flat second is what makes it read as dread without
  // needing volume or tempo.
  dark: [0, 1, 3, 5, 7, 8, 10],
};

// Semitones above the root for a scale degree (1-based), wrapping octaves.
function degree(scale, n) {
  const s = SCALES[scale] || SCALES.minor;
  const i = (n - 1) % s.length;
  const oct = Math.floor((n - 1) / s.length);
  return s[i] + oct * 12;
}

const midi = (semi) => 440 * Math.pow(2, (semi - 9) / 12);

// ---------------------------------------------------------------------------
// Voices. Each takes (ctx, dest, when, dur, freq, vol) and schedules one note.
//
// Every voice is deliberately soft-edged: long attacks, no resonant filters, no
// detune beating. Anything with a sharp transient reads as a game SOUND and
// competes with the answer feedback, which must always be the loudest thing.
// ---------------------------------------------------------------------------

function padVoice(ctx, dest, when, dur, freq, vol) {
  const o = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  o.type = 'sine'; o2.type = 'triangle';
  o.frequency.value = freq;
  o2.frequency.value = freq * 1.005;   // very slight width, no audible beating
  f.type = 'lowpass';
  f.frequency.value = 1400;
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + dur * 0.35);   // slow swell
  g.gain.linearRampToValueAtTime(0.0001, when + dur);
  o.connect(f); o2.connect(f); f.connect(g); g.connect(dest);
  o.start(when); o2.start(when);
  o.stop(when + dur + 0.05); o2.stop(when + dur + 0.05);
}

function bassVoice(ctx, dest, when, dur, freq, vol) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = freq / 2;
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur * 0.8);
  o.connect(g); g.connect(dest);
  o.start(when); o.stop(when + dur);
}

function arpVoice(ctx, dest, when, dur, freq, vol) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.value = freq * 2;
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, when + Math.min(dur, 0.5));
  o.connect(g); g.connect(dest);
  o.start(when); o.stop(when + dur);
}

// Only used where nobody is answering — see the header.
function leadVoice(ctx, dest, when, dur, freq, vol) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  o.type = 'square';
  o.frequency.value = freq * 2;
  f.type = 'lowpass';
  f.frequency.value = 2200;
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur * 0.9);
  o.connect(f); f.connect(g); g.connect(dest);
  o.start(when); o.stop(when + dur);
}

// A very high, very quiet shimmer. Adds space without adding information.
function airVoice(ctx, dest, when, dur, freq, vol) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = freq * 4;
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol * 0.4, when + dur * 0.5);
  g.gain.linearRampToValueAtTime(0.0001, when + dur);
  o.connect(g); g.connect(dest);
  o.start(when); o.stop(when + dur + 0.05);
}

const VOICES = { pad: padVoice, bass: bassVoice, arp: arpVoice, lead: leadVoice, air: airVoice };

// ---------------------------------------------------------------------------
// The songs.
//
// `bars` are chord roots as scale degrees. `arp` is a FIXED SHAPE (offsets into
// the chord) rather than a generated pattern — a fixed shape becomes background
// texture after a few bars, where a varying one keeps demanding attention.
// ---------------------------------------------------------------------------

export const SONGS = {
  // The title. Nobody is answering, so this is the one loop allowed a real tune.
  title: {
    bpm: 88, beatsPerBar: 4, root: 48, scale: 'major',
    bars: [1, 5, 6, 4],
    voices: { pad: 0.055, bass: 0.05, arp: 0.028, lead: 0.03, air: 0.012 },
    arp: [0, 2, 4, 2],
    leadShape: [1, 3, 5, 3, 4, 2, 1, 0],
  },

  // Chapter 1 — bright major. Earth is behind you and worth defending.
  battle1: {
    bpm: 84, beatsPerBar: 4, root: 48, scale: 'major',
    bars: [1, 4, 5, 1],
    voices: { pad: 0.05, bass: 0.045, arp: 0.022 },
    arp: [0, 2, 4, 2],
  },

  // Chapter 2 — suspended. Searching, hopeful, unresolved: five friends still
  // in cages. The mode does the work; the texture is identical to chapter 1.
  battle2: {
    bpm: 78, beatsPerBar: 4, root: 46, scale: 'suspended',
    bars: [1, 3, 6, 4],
    voices: { pad: 0.05, bass: 0.045, arp: 0.02, air: 0.01 },
    arp: [0, 3, 4, 2],
  },

  // Chapter 3 — dark and heavy. Slowest tempo in the game, phrygian, and the
  // arpeggio drops to two notes so it feels like it is running out of air.
  battle3: {
    bpm: 70, beatsPerBar: 4, root: 43, scale: 'dark',
    bars: [1, 1, 6, 5],
    voices: { pad: 0.055, bass: 0.05, arp: 0.018, air: 0.012 },
    arp: [0, 4],
  },

  // Boss fights. Same mode as their chapter but the bass moves every beat, which
  // reads as pressure without adding a drum or raising the tempo.
  boss: {
    bpm: 92, beatsPerBar: 4, root: 45, scale: 'minor',
    bars: [1, 1, 4, 5],
    voices: { pad: 0.05, bass: 0.055, arp: 0.022 },
    arp: [0, 2, 4, 5],
    bassEveryBeat: true,
  },

  // The final boss. Adds the air voice and one more chord so it feels larger
  // than the other bosses without being louder or faster.
  finalboss: {
    bpm: 96, beatsPerBar: 4, root: 43, scale: 'dark',
    bars: [1, 6, 4, 5, 1, 6, 5, 5],
    voices: { pad: 0.06, bass: 0.055, arp: 0.024, air: 0.014 },
    arp: [0, 3, 4, 6],
    bassEveryBeat: true,
  },

  // Narration. Almost nothing: a pad and a breath of air. The kid is READING.
  story: {
    bpm: 68, beatsPerBar: 4, root: 48, scale: 'major',
    bars: [1, 4],
    voices: { pad: 0.045, air: 0.012 },
  },

  // Victory and the ally rescue both get a lead — nobody is answering.
  victory: {
    bpm: 100, beatsPerBar: 4, root: 50, scale: 'major',
    bars: [1, 4, 5, 1],
    voices: { pad: 0.055, bass: 0.05, arp: 0.03, lead: 0.034 },
    arp: [0, 2, 4, 6],
    leadShape: [5, 4, 3, 2, 1, 2, 3, 5],
  },

  rescue: {
    bpm: 92, beatsPerBar: 4, root: 50, scale: 'major',
    bars: [1, 5, 6, 4],
    voices: { pad: 0.055, bass: 0.048, arp: 0.028, lead: 0.032, air: 0.014 },
    arp: [0, 2, 4, 2],
    leadShape: [1, 3, 5, 6, 5, 3, 2, 1],
  },

  // The ending. The warmest thing in the game, and the slowest lead.
  ending: {
    bpm: 74, beatsPerBar: 4, root: 48, scale: 'major',
    bars: [1, 6, 4, 5, 1, 6, 4, 4],
    voices: { pad: 0.06, bass: 0.05, arp: 0.026, lead: 0.03, air: 0.016 },
    arp: [0, 2, 4, 2],
    leadShape: [1, 2, 3, 5, 6, 5, 3, 1],
  },

  failure: {
    bpm: 70, beatsPerBar: 4, root: 45, scale: 'minor',
    bars: [1, 6],
    voices: { pad: 0.05, bass: 0.04 },
  },
};

// ---------------------------------------------------------------------------
// The scheduler.
//
// 100ms look-ahead on the Web Audio clock. The render loop can hitch for a whole
// frame during a big explosion and the music will not notice, because notes are
// already queued ahead of the audio clock rather than fired from rAF.
// ---------------------------------------------------------------------------

const LOOKAHEAD = 0.6;    // seconds of music queued ahead
const TICK_MS = 100;

let current = null;       // song id
let musicGain = null;
let duckGain = null;
let timer = null;
let nextBarTime = 0;
let barIndex = 0;
let musicMuted = false;

function ensureChain() {
  const ctx = audioCtx();
  if (!ctx) return null;
  if (!musicGain) {
    musicGain = ctx.createGain();
    musicGain.gain.value = musicMuted ? 0 : 1;
    duckGain = ctx.createGain();
    duckGain.gain.value = 1;
    musicGain.connect(duckGain);
    // Hangs off the same master gain as the effects, so F9 silences both.
    duckGain.connect(masterGain());
  }
  return ctx;
}

function scheduleBar(ctx, song, when) {
  const beat = 60 / song.bpm;
  const barDur = beat * song.beatsPerBar;
  const rootDeg = song.bars[barIndex % song.bars.length];
  const rootSemi = song.root + degree(song.scale, rootDeg);

  // Pad: one long chord for the whole bar (root, third, fifth of the degree).
  if (song.voices.pad) {
    for (const off of [0, 2, 4]) {
      const semi = song.root + degree(song.scale, rootDeg + off);
      VOICES.pad(ctx, musicGain, when, barDur, midi(semi), song.voices.pad);
    }
  }

  // Bass: on the downbeat, or every beat for boss songs.
  if (song.voices.bass) {
    const hits = song.bassEveryBeat ? song.beatsPerBar : 1;
    for (let b = 0; b < hits; b++) {
      VOICES.bass(ctx, musicGain, when + b * beat, beat * 0.9,
        midi(rootSemi), song.voices.bass);
    }
  }

  // Arpeggio: a FIXED shape across the bar. See the note on SONGS.
  if (song.voices.arp && song.arp) {
    const n = song.arp.length;
    for (let i = 0; i < n; i++) {
      const semi = song.root + degree(song.scale, rootDeg + song.arp[i]);
      VOICES.arp(ctx, musicGain, when + (i / n) * barDur, barDur / n * 0.9,
        midi(semi), song.voices.arp);
    }
  }

  // Lead: only in scenes where nobody is answering.
  if (song.voices.lead && song.leadShape) {
    const n = song.leadShape.length;
    for (let i = 0; i < n; i++) {
      const d = song.leadShape[i];
      if (d <= 0) continue;
      const semi = song.root + 12 + degree(song.scale, rootDeg + d - 1);
      VOICES.lead(ctx, musicGain, when + (i / n) * barDur, barDur / n * 0.8,
        midi(semi), song.voices.lead);
    }
  }

  if (song.voices.air) {
    VOICES.air(ctx, musicGain, when, barDur, midi(rootSemi), song.voices.air);
  }

  barIndex++;
  return barDur;
}

function tick() {
  const ctx = ensureChain();
  if (!ctx || !current) return;
  const song = SONGS[current];
  if (!song) return;

  while (nextBarTime < ctx.currentTime + LOOKAHEAD) {
    // If we have fallen behind (tab was backgrounded), skip forward rather than
    // queueing a burst of overlapping bars.
    if (nextBarTime < ctx.currentTime) nextBarTime = ctx.currentTime + 0.05;
    nextBarTime += scheduleBar(ctx, song, nextBarTime);
  }
}

// Start a song. A no-op if it is already playing — main.js calls this from
// songForState() on every state change, and restarting the same loop on each
// stage would make the soundtrack feel like it keeps stumbling.
export function playMusic(id) {
  if (current === id) return;
  const ctx = ensureChain();
  if (!ctx) return;
  current = id;
  barIndex = 0;
  nextBarTime = ctx.currentTime + 0.1;
  if (!timer) timer = setInterval(tick, TICK_MS);
  tick();
}

export function stopMusic() {
  current = null;
  if (timer) { clearInterval(timer); timer = null; }
}

export function currentSong() { return current; }

// F10 — music only, separate from F9's global mute. Some kids need quiet to
// concentrate but still want to hear their hits land.
export function toggleMusic() {
  musicMuted = !musicMuted;
  if (musicGain) musicGain.gain.value = musicMuted ? 0 : 1;
  return musicMuted;
}
export function isMusicMuted() { return musicMuted; }

// Duck the music briefly so a loud effect is never buried. audio.js registers
// this; that import cycle is deliberate and safe — both sides only call across
// it at runtime.
export function duckMusic(amount = 0.5, dur = 0.2) {
  const ctx = ensureChain();
  if (!ctx || !duckGain) return;
  const now = ctx.currentTime;
  duckGain.gain.cancelScheduledValues(now);
  duckGain.gain.setValueAtTime(duckGain.gain.value, now);
  duckGain.gain.linearRampToValueAtTime(1 - amount, now + 0.02);
  duckGain.gain.linearRampToValueAtTime(1, now + dur);
}
