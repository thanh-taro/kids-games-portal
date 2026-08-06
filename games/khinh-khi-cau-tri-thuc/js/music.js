// music.js — looping background themes, synthesized in-code (no audio
// files), in the same asset-free spirit as audio.js and the sprites in
// pixelart.js. Shares audio.js's AudioContext but hangs off its own gain
// bus, so music can be balanced against — and ducked under — the SFX.
//
// WHY THE MUSIC IS SO LIGHT
// --------------------------
// While playing, the kid is reading a question and racing a countdown.
// Music that carries a busy tune competes for the attention the reading
// needs, and a driving beat pushes toward "answer fast" when the point is
// "answer right". So:
//
//   1. The gameplay loops (one per season — see SONGS) have NO melody —
//      just a warm pad, a gentle bass pulse, and a sparse airy arpeggio,
//      like wind and distant birds. Menus and the game-over screen, where
//      nobody is answering, are where an actual tune is allowed.
//   2. Tempos stay unhurried (78-104 BPM) and never speed up with the
//      stage — urgency comes from the barrier's timer bar, not the music.
//   3. Music sits under the sound effects and ducks briefly on every hit,
//      so answer feedback and the balloon pop always cut through.
//   4. Soft waveforms (triangle/sine) throughout — this is a sky full of
//      clouds, not a chiptune boss fight.
//
// A "song" is data: tempo, chord progression, and voice layers the
// scheduler renders bar by bar. Time-of-day (morning/noon/.../midnight)
// doesn't get its own songs — see setTimeOfDayMix — it's a light mix
// tweak (volume + whether the arp voice plays) layered on top of
// whichever seasonal song is currently looping.

import { audioCtx, sfxBusGain } from "./audio.js";

const MUSIC_GAIN = 0.45;

let musicBus = null;
let current = null;
let timer = null;
let nextNoteTime = 0;
let barCursor = 0;
let enabled = true;
let duckUntil = 0;
let timeOfDayMult = 1;
let quietMode = false; // midnight: drop the arp voice for genuine sparseness

const LOOKAHEAD_MS = 100;
const SCHEDULE_HORIZON = 0.25;

// ---------------------------------------------------------------------------
// Note helpers
// ---------------------------------------------------------------------------
const SEMITONES = [0, 2, 4, 5, 7, 9, 11]; // major scale steps

function degreeToFreq(root, degree) {
  if (degree === null || degree === undefined) return null;
  const octave = Math.floor(degree / 7);
  const step = ((degree % 7) + 7) % 7;
  return root * Math.pow(2, octave + SEMITONES[step] / 12);
}

function note(freq, time, dur, type, peak, detune = 0) {
  if (!freq || !musicBus) return;
  const c = audioCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  if (detune) osc.detune.setValueAtTime(detune, time);
  const attack = Math.min(0.08, dur * 0.3);
  g.gain.setValueAtTime(0.0001, time);
  g.gain.linearRampToValueAtTime(peak, time + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  osc.connect(g);
  g.connect(musicBus);
  osc.start(time);
  osc.stop(time + dur + 0.05);
}

// A soft filtered-noise swell — sky wind, used instead of any drum.
function airSwell(time, dur, peak, cutoff) {
  const c = audioCtx();
  if (!c || !musicBus) return;
  const frames = Math.max(1, Math.floor(c.sampleRate * dur));
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 90210;
  for (let i = 0; i < frames; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    data[i] = (seed / 0x7fffffff) * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.linearRampToValueAtTime(peak, time + dur * 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(musicBus);
  src.start(time);
  src.stop(time + dur);
}

// ---------------------------------------------------------------------------
// Voices
// ---------------------------------------------------------------------------
const TRIAD = [0, 2, 4];
const TRIAD_WIDE = [0, 2, 4, 7];

// Pad: the sustained chord under everything, warmed with a light chorus
// (two detuned triangles per note).
function padVoice(spread = 6, peak = 0.14, wide = false) {
  return (bar, barTime, barDur, song) => {
    const chord = wide ? TRIAD_WIDE : TRIAD;
    const base = song.bars[bar % song.bars.length];
    for (const step of chord) {
      const f = degreeToFreq(song.root, base + step);
      note(f, barTime, barDur * 0.98, "triangle", peak, -spread);
      note(f, barTime, barDur * 0.98, "triangle", peak * 0.7, spread);
    }
  };
}

// Bass: one or two warm sine pulses per bar — the balloon's slow, steady
// rise, never a beat to race against.
function bassVoice(peak = 0.2, half = false) {
  return (bar, barTime, barDur, song) => {
    const base = song.bars[bar % song.bars.length];
    const f = degreeToFreq(song.root / 2, base);
    if (half) {
      note(f, barTime, barDur * 0.45, "sine", peak);
      note(f, barTime + barDur / 2, barDur * 0.45, "sine", peak * 0.8);
    } else {
      note(f, barTime, barDur * 0.9, "sine", peak);
    }
  };
}

// Arpeggio: the chord spelled out sparsely, high and airy — like little
// glints of sun through clouds. Same shape every bar, so it reads as
// texture rather than a tune to follow.
function arpVoice(pattern, peak = 0.09, octave = 7) {
  return (bar, barTime, barDur, song) => {
    const base = song.bars[bar % song.bars.length];
    const stepDur = barDur / pattern.length;
    pattern.forEach((deg, i) => {
      if (deg === null) return;
      const f = degreeToFreq(song.root, base + deg + octave);
      note(f, barTime + i * stepDur, stepDur * 1.6, "sine", peak);
    });
  };
}

// Lead: an actual melody. Menus and outcome screens only — nobody is
// reading a question there.
function leadVoice(phrase, peak = 0.15, type = "triangle", octave = 7) {
  return (bar, barTime, barDur, song) => {
    const line = phrase[bar % phrase.length];
    if (!line) return;
    const beatDur = barDur / song.beatsPerBar;
    let t = barTime;
    for (const [deg, beats] of line) {
      const d = beats * beatDur;
      if (deg !== null) {
        note(degreeToFreq(song.root, deg + octave), t, d * 0.9, type, peak);
      }
      t += d;
    }
  };
}

function airVoice(peak = 0.045, cutoff = 900) {
  return (bar, barTime, barDur) => airSwell(barTime, barDur, peak, cutoff);
}

// ---------------------------------------------------------------------------
// Songs
// ---------------------------------------------------------------------------
const ROOT = {
  C: 130.81,
  D: 146.83,
  Eb: 155.56,
  E: 164.81,
  F: 174.61,
  G: 196.0,
  A: 220.0,
  Bb: 233.08,
};

export const SONGS = {
  // TITLE — the start screen. Bright, open, a little playful: a balloon
  // about to lift off on a clear morning. The one place a real tune is
  // front and center.
  title: {
    bpm: 100,
    beatsPerBar: 4,
    root: ROOT.C,
    bars: [0, 3, 5, 4],
    voices: {
      pad: padVoice(6, 0.12),
      bass: bassVoice(0.18, true),
      lead: leadVoice(
        [
          [
            [4, 1],
            [7, 1],
            [9, 2],
          ],
          [
            [7, 1],
            [6, 1],
            [4, 2],
          ],
          [
            [2, 1],
            [4, 1],
            [6, 1],
            [7, 1],
          ],
          [[6, 2], [4, 2]],
        ],
        0.15
      ),
      arp: arpVoice([null, 9, null, 7, null, 9, null, 11], 0.06, 7),
    },
  },

  // FLIGHT SPRING — budding, open, a little more active: the year's first
  // season, matching the falling-petals particles.
  flightSpring: {
    bpm: 94,
    beatsPerBar: 4,
    root: ROOT.D,
    bars: [0, 4, 5, 3],
    voices: {
      pad: padVoice(7, 0.11, true),
      bass: bassVoice(0.17, true),
      arp: arpVoice([0, null, 4, 2, null, 4, null, 2], 0.06, 7),
      air: airVoice(0.04, 1000),
    },
  },

  // FLIGHT SUMMER — the warmest and fullest: brightest peaks, liveliest
  // (still unhurried) tempo, a raised air-wind cutoff for a sunlit shimmer
  // matching summer's shimmer particles.
  flightSummer: {
    bpm: 102,
    beatsPerBar: 4,
    root: ROOT.C,
    bars: [0, 4, 5, 4],
    voices: {
      pad: padVoice(6, 0.13, true),
      bass: bassVoice(0.19, true),
      arp: arpVoice([0, null, 4, null, 7, null, 4, null], 0.065, 7),
      air: airVoice(0.05, 1400),
    },
  },

  // FLIGHT AUTUMN — warmer/lower root, minor-leaning chords, slower and
  // sparser: falling leaves, not falling snow yet.
  flightAutumn: {
    bpm: 87,
    beatsPerBar: 4,
    root: ROOT.A,
    bars: [5, 3, 5, 6],
    voices: {
      pad: padVoice(7, 0.115, true),
      bass: bassVoice(0.17, true),
      arp: arpVoice([0, null, null, 4, null, null, 2, null], 0.05, 7),
      air: airVoice(0.045, 850),
    },
  },

  // FLIGHT WINTER — the coolest and stillest: lowest root, slowest tempo,
  // thin texture (pad+bass+air only — the arp is dropped further by
  // setTimeOfDayMix at midnight, but winter keeps it sparse even by day).
  flightWinter: {
    bpm: 79,
    beatsPerBar: 4,
    root: ROOT.Bb,
    bars: [0, 0, 5, 3],
    voices: {
      pad: padVoice(8, 0.12, true),
      bass: bassVoice(0.18),
      arp: arpVoice([0, null, null, null, 4, null, null, null], 0.04, 7),
      air: airVoice(0.055, 650),
    },
  },

  // GAME OVER — gentle, not punishing. The balloon popped, but the loop
  // resolves upward on its last bar so it always turns hopeful right
  // before repeating: "try again", not "you lost".
  gameover: {
    bpm: 78,
    beatsPerBar: 4,
    root: ROOT.F,
    bars: [5, 3, 4, 0],
    voices: {
      pad: padVoice(5, 0.11),
      bass: bassVoice(0.15),
      arp: arpVoice([0, null, 2, null, 4, null, null, null], 0.055, 7),
    },
  },
};

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------
// The music bus's target gain, composing mute/enabled state with the
// time-of-day multiplier — the single place that formula lives, so
// toggling music/mute never clobbers the time-of-day mix (or vice versa).
function targetGain() {
  return enabled ? MUSIC_GAIN * timeOfDayMult : 0;
}

function applyGain(c, rampSeconds = 0.1) {
  if (!musicBus || !c) return;
  musicBus.gain.cancelScheduledValues(c.currentTime);
  musicBus.gain.setTargetAtTime(targetGain(), c.currentTime, rampSeconds);
}

function ensureBus() {
  const c = audioCtx();
  if (!c) return null;
  if (!musicBus) {
    musicBus = c.createGain();
    musicBus.gain.value = targetGain();
    musicBus.connect(sfxBusGain() || c.destination);
  }
  return c;
}

function scheduleBar(song, bar, when) {
  const barDur = (60 / song.bpm) * song.beatsPerBar;
  for (const [name, voice] of Object.entries(song.voices)) {
    if (quietMode && name === "arp") continue;
    voice(bar, when, barDur, song);
  }
  return barDur;
}

function tickScheduler() {
  const c = audioCtx();
  if (!c || !current) return;
  const song = SONGS[current];
  if (!song) return;
  while (nextNoteTime < c.currentTime + SCHEDULE_HORIZON) {
    if (nextNoteTime < c.currentTime - 0.5) nextNoteTime = c.currentTime + 0.05;
    nextNoteTime += scheduleBar(song, barCursor, nextNoteTime);
    barCursor++;
  }
  if (duckUntil && c.currentTime > duckUntil && musicBus) {
    duckUntil = 0;
    applyGain(c, 0.12);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Start looping `id`. A no-op if already looping that song — matters
// because game.js calls this from its state changes, and restarting the
// loop every time would make the music stutter and never get past bar 1.
export function playMusic(id) {
  if (current === id && timer) return;
  const c = ensureBus();
  if (!c || c.state === "suspended") {
    current = id;
    return;
  }
  current = id;
  barCursor = 0;
  nextNoteTime = c.currentTime + 0.08;
  if (!timer) timer = setInterval(tickScheduler, LOOKAHEAD_MS);
  tickScheduler();
}

export function stopMusic() {
  const c = audioCtx();
  current = null;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (musicBus && c) {
    musicBus.gain.cancelScheduledValues(c.currentTime);
    musicBus.gain.setTargetAtTime(0, c.currentTime, 0.08);
  }
}

// Briefly dip the music so a sound effect reads clearly over it.
export function duckMusic(amount = 0.45, seconds = 0.18) {
  const c = audioCtx();
  if (!c || !musicBus || !enabled) return;
  musicBus.gain.cancelScheduledValues(c.currentTime);
  musicBus.gain.setTargetAtTime(targetGain() * (1 - amount), c.currentTime, 0.02);
  duckUntil = c.currentTime + seconds;
}

// Music-only toggle, independent of the global SFX mute.
export function toggleMusic() {
  enabled = !enabled;
  applyGain(audioCtx());
  return enabled;
}

// Light per-time-of-day mix tweak on top of whichever seasonal song is
// playing: quieter at midnight and fuller at noon (gain), plus the arp
// voice dropping out entirely at midnight for genuine sparseness, not
// just a lower volume. Composes with mute/duck via targetGain()/applyGain().
const MIX_BY_TIME = [1.0, 1.08, 1.0, 0.85, 0.65]; // morning, noon, afternoon, evening, midnight
export function setTimeOfDayMix(timeOfDay) {
  timeOfDayMult = MIX_BY_TIME[timeOfDay] ?? 1;
  quietMode = timeOfDay === 4;
  applyGain(audioCtx());
}

export function isMusicOn() {
  return enabled;
}
