// music.js — looping background themes, synthesized in-code (no audio files).
//
// The whole soundtrack is a handful of short loops (4-8 bars) played on a
// look-ahead scheduler, in the same asset-free spirit as audio.js. It shares
// audio.js's AudioContext but hangs off its OWN gain bus, so music can be
// balanced against — and ducked under — the gameplay blips independently.
//
// WHY THE MUSIC IS SO RESTRAINED
// ------------------------------
// This is a typing game for kids: while PLAYING, the child is reading a
// Vietnamese word (late stages: a whole 12-syllable proverb) and hunting for
// Telex keys. Music that carries a tune competes for exactly the attention the
// reading needs, and a driving beat pushes a kid to type FAST when the game is
// teaching them to type CLEANLY. So the rules for this file are:
//
//   1. Battle loops have NO melody — only a slow harmonic pad, a soft bass
//      pulse, and a sparse arpeggio. Menus and story scenes, where nobody is
//      typing, are where actual tunes are allowed.
//   2. Tempos stay slow (72-104 BPM). Nothing in the game should feel like a
//      countdown timer.
//   3. Music sits well under the sound effects (MUSIC_GAIN ≈ a third of the SFX
//      bus) and DUCKS briefly on each hit, so an attack always reads over it.
//   4. Soft waveforms (triangle/sine) with slow attacks. Square leads and
//      sawtooth are reserved for the fanfares, which are short.
//
// A "song" here is data: a tempo, a chord progression, and a few voice layers
// that the scheduler renders bar by bar. Adding a theme is a new entry in
// SONGS — data, not code.

import { audioCtx, sfxBusGain } from './audio.js';

// Music level, relative to audio.js's MASTER_GAIN (which both this and the
// sound effects pass through). The soundtrack should be clearly PRESENT — a
// theme a kid can actually hum — while still sitting under the effects, since
// the keystroke blip is what tells them a letter landed.
//
// The ducking below is what makes this level safe: the music dips on every hit,
// special, and fanfare, so the loud moments always punch through even though the
// bed underneath them is now substantial. Measured in-browser at this setting, a
// keystroke blip still peaks above the music bed.
const MUSIC_GAIN = 0.5;

let musicBus = null;      // gain node all songs play through
let current = null;       // id of the song currently looping
let timer = null;         // setInterval handle for the look-ahead scheduler
let nextNoteTime = 0;     // AudioContext time the next bar starts at
let barCursor = 0;        // which bar of the loop comes next
let enabled = true;       // music toggle (separate from the global mute)
let duckUntil = 0;        // ctx time to hold the volume dip until

// Scheduler tuning: look this far ahead, waking this often. A 100ms tick with
// a 250ms horizon means bars are queued on the audio clock (sample-accurate)
// rather than on requestAnimationFrame, so the loop never drifts or stutters
// when the render loop hitches during a big particle burst.
const LOOKAHEAD_MS = 100;
const SCHEDULE_HORIZON = 0.25;

// ---------------------------------------------------------------------------
// Note helpers
// ---------------------------------------------------------------------------
// Notes are written as scale-degree numbers relative to a song's root, which
// keeps the song data readable and makes transposing a theme a one-field edit.
// 0 = root, 7 = an octave up. `null` is a rest.
const SEMITONES = [0, 2, 4, 5, 7, 9, 11]; // major scale steps

function degreeToFreq(root, degree) {
  if (degree === null || degree === undefined) return null;
  const octave = Math.floor(degree / 7);
  const step = ((degree % 7) + 7) % 7;
  return root * Math.pow(2, octave + SEMITONES[step] / 12);
}

// A single music note. Slow attack + long release keeps everything soft-edged;
// a hard chiptune envelope here would poke through the gameplay sounds.
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

// A soft filtered-noise swell — used for wind/atmosphere beds rather than
// drums. There are no drums anywhere in this soundtrack on purpose: a beat is
// the single most focus-pulling thing you can put under someone who is reading.
function airSwell(time, dur, peak, cutoff) {
  const c = audioCtx();
  if (!c || !musicBus) return;
  const frames = Math.max(1, Math.floor(c.sampleRate * dur));
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 22222;
  for (let i = 0; i < frames; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    data[i] = (seed / 0x7fffffff) * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
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
// The songs
// ---------------------------------------------------------------------------
// Each song is { bpm, beatsPerBar, root, bars[], voices{} }.
//
//   bars    — one chord per bar, as an array of scale degrees (the pad voices it)
//   voices  — which layers play, each a function of (bar, barTime, beat, song)
//
// Voices are named so a song reads as a description of its own arrangement:
//   pad    — sustained chord, the harmonic bed (always present)
//   bass   — one soft low note per bar or per half-bar (the pulse)
//   arp    — sparse broken chord; allowed during gameplay because it has no
//            contour to follow, unlike a melody
//   lead   — an actual tune. MENU AND STORY SCENES ONLY.
//   air    — filtered noise atmosphere (wind, cave breath)

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

// A chord as scale degrees from the bar's own root degree.
const TRIAD = [0, 2, 4];
const TRIAD_WIDE = [0, 2, 4, 7];

// Pad: the sustained chord under everything. Two slightly detuned triangles per
// note give it a warm chorus without needing a reverb node.
function padVoice(spread = 6, peak = 0.16, wide = false) {
  return (bar, barTime, barDur, song) => {
    const chord = wide ? TRIAD_WIDE : TRIAD;
    const base = song.bars[bar % song.bars.length];
    for (const step of chord) {
      const f = degreeToFreq(song.root, base + step);
      note(f, barTime, barDur * 0.98, 'triangle', peak, -spread);
      note(f, barTime, barDur * 0.98, 'triangle', peak * 0.7, spread);
    }
  };
}

// Bass: one warm sine per bar (or two, on `half`). This is the game's pulse —
// slow enough to breathe with, never a beat to race against.
function bassVoice(peak = 0.22, half = false) {
  return (bar, barTime, barDur, song) => {
    const base = song.bars[bar % song.bars.length];
    const f = degreeToFreq(song.root / 2, base);
    if (half) {
      note(f, barTime, barDur * 0.45, 'sine', peak);
      note(f, barTime + barDur / 2, barDur * 0.45, 'sine', peak * 0.8);
    } else {
      note(f, barTime, barDur * 0.9, 'sine', peak);
    }
  };
}

// Arpeggio: the chord spelled out one note at a time, sparsely. Safe under
// gameplay because it is the SAME shape every bar — there is no tune to track,
// so the ear files it as texture and lets it go.
function arpVoice(pattern, peak = 0.1, octave = 7) {
  return (bar, barTime, barDur, song) => {
    const base = song.bars[bar % song.bars.length];
    const stepDur = barDur / pattern.length;
    pattern.forEach((deg, i) => {
      if (deg === null) return;
      const f = degreeToFreq(song.root, base + deg + octave);
      note(f, barTime + i * stepDur, stepDur * 1.6, 'sine', peak);
    });
  };
}

// Lead: a real melody. Only ever used in scenes where the kid is not typing.
// `phrase` is one entry per bar: a list of [degree, beats] pairs.
function leadVoice(phrase, peak = 0.15, type = 'triangle', octave = 7) {
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

// Atmosphere bed: one slow noise swell per bar.
function airVoice(peak = 0.05, cutoff = 700) {
  return (bar, barTime, barDur) => airSwell(barTime, barDur, peak, cutoff);
}

export const SONGS = {
  // --- Menus and story ------------------------------------------------------

  // TITLE — "the adventure begins". The one properly heroic tune in the game,
  // because the title screen is the only place a kid is doing nothing but
  // looking at it. Bright major, walking bass, a simple singable phrase.
  title: {
    bpm: 96,
    beatsPerBar: 4,
    root: ROOT.C,
    bars: [0, 3, 5, 4],
    voices: {
      pad: padVoice(6, 0.13),
      bass: bassVoice(0.22, true),
      lead: leadVoice([
        [[4, 1], [5, 1], [7, 2]],
        [[6, 1], [5, 1], [4, 2]],
        [[2, 1], [4, 1], [5, 1], [4, 1]],
        [[3, 2], [2, 2]],
      ], 0.16),
    },
  },

  // STORY — the narration bed. Deliberately almost nothing: a slow pad and a
  // handful of high bell tones, so the kid reads the King's words rather than
  // listening to music. Minor-flavoured, since the prologue is a kidnapping.
  story: {
    bpm: 72,
    beatsPerBar: 4,
    root: ROOT.A,
    bars: [0, 5, 3, 4],
    voices: {
      pad: padVoice(5, 0.12),
      bass: bassVoice(0.16),
      arp: arpVoice([0, null, 4, null, 2, null, null, null], 0.07, 7),
    },
  },

  // TUTORIAL — patient and encouraging. A kid learning Telex will sit here for
  // several minutes and mistype a lot; the loop stays warm and never resolves
  // to anything urgent, so the room doesn't feel like a test.
  tutorial: {
    bpm: 84,
    beatsPerBar: 4,
    root: ROOT.F,
    bars: [0, 4, 5, 3],
    voices: {
      pad: padVoice(5, 0.12),
      bass: bassVoice(0.18),
      arp: arpVoice([0, 2, 4, 2, 0, 2, 4, 2], 0.06, 7),
    },
  },

  // --- Gameplay: one theme per chapter, matching its arc ---------------------
  //
  // All three are melody-free by design (see the header). They differ in MODE
  // and TEXTURE, not in busyness, so the chapters feel distinct without any of
  // them pulling harder at the kid's attention than the others.

  // CHAPTER 1 — the King's Request. Bright, open, adventurous: the hero setting
  // out across meadows and coasts. Major, gentle two-beat bass, airy arpeggio.
  battle1: {
    bpm: 92,
    beatsPerBar: 4,
    root: ROOT.G,
    bars: [0, 4, 5, 3],
    voices: {
      pad: padVoice(6, 0.11),
      bass: bassVoice(0.2, true),
      arp: arpVoice([0, null, 4, null, 2, null, 4, null], 0.07, 7),
    },
  },

  // CHAPTER 2 — the Staff of Wisdom. The quest chapter: libraries, mist, mirror
  // lakes, a summit. Suspended and thoughtful (the pad is a wide voicing, so it
  // hangs unresolved), with a slow single-note bass — "a clear mind beats brute
  // force" as sound. This is the calmest gameplay loop of the three, matching a
  // chapter whose difficulty is long sentences that must be sustained cleanly.
  battle2: {
    bpm: 80,
    beatsPerBar: 4,
    root: ROOT.D,
    bars: [0, 3, 5, 3],
    voices: {
      pad: padVoice(7, 0.12, true),
      bass: bassVoice(0.18),
      arp: arpVoice([0, null, null, 4, null, null, 2, null], 0.06, 7),
      air: airVoice(0.035, 600),
    },
  },

  // CHAPTER 3 — the Final Confrontation. Dark and heavy, but still not fast:
  // the dread comes from a minor-flavoured low pad and a slow, insistent bass,
  // not from tempo. Storming a fortress should feel weighty, and a kid typing a
  // proverb at the World Devourer must still be able to think.
  battle3: {
    bpm: 76,
    beatsPerBar: 4,
    root: ROOT.E,
    bars: [0, 0, 5, 6],
    voices: {
      pad: padVoice(8, 0.13),
      bass: bassVoice(0.24, true),
      arp: arpVoice([0, null, null, null, 4, null, null, null], 0.06, 7),
      air: airVoice(0.05, 420),
    },
  },

  // --- Outcome scenes -------------------------------------------------------

  // VICTORY / REWARD — warm and congratulatory. A short, bright loop that plays
  // under the "you did it" screens. Has a lead, because nobody is typing here.
  victory: {
    bpm: 104,
    beatsPerBar: 4,
    root: ROOT.C,
    bars: [0, 4, 5, 4],
    voices: {
      pad: padVoice(6, 0.12),
      bass: bassVoice(0.2, true),
      lead: leadVoice([
        [[7, 1], [6, 1], [4, 2]],
        [[5, 2], [4, 2]],
        [[2, 1], [4, 1], [6, 2]],
        [[4, 4]],
      ], 0.15),
    },
  },

  // FAILURE — gentle, NOT punishing. A kid who just lost needs "try again",
  // not a funeral: soft major-ish pad, no low end, resolving upward on the last
  // bar so the loop always turns hopeful right before it repeats.
  failure: {
    bpm: 74,
    beatsPerBar: 4,
    root: ROOT.F,
    bars: [5, 3, 4, 0],
    voices: {
      pad: padVoice(5, 0.11),
      arp: arpVoice([0, null, 2, null, 4, null, null, null], 0.06, 7),
    },
  },

  // CHAPTER END / GAME COMPLETE / CREDITS — the big triumphant theme, the only
  // loop with a lead over a full-octave pad. This is the payoff for finishing a
  // chapter, so it is allowed to be the grandest thing in the soundtrack.
  triumph: {
    bpm: 100,
    beatsPerBar: 4,
    root: ROOT.C,
    bars: [0, 5, 3, 4],
    voices: {
      pad: padVoice(7, 0.13, true),
      bass: bassVoice(0.22, true),
      lead: leadVoice([
        [[0, 1], [2, 1], [4, 1], [7, 1]],
        [[6, 2], [4, 2]],
        [[2, 1], [4, 1], [5, 2]],
        [[4, 2], [7, 2]],
      ], 0.16),
      arp: arpVoice([null, 4, null, 2, null, 4, null, 7], 0.06, 7),
    },
  },
};

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------
function ensureBus() {
  const c = audioCtx();
  if (!c) return null;
  if (!musicBus) {
    musicBus = c.createGain();
    musicBus.gain.value = enabled ? MUSIC_GAIN : 0;
    // Music hangs off the SAME bus as the SFX, so the F9 mute (which zeroes
    // that bus) silences music too — a kid pressing "mute" means ALL of it.
    musicBus.connect(sfxBusGain() || c.destination);
  }
  return c;
}

// Queue every voice of one bar.
function scheduleBar(song, bar, when) {
  const barDur = (60 / song.bpm) * song.beatsPerBar;
  for (const voice of Object.values(song.voices)) {
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
    // If we've fallen far behind (tab was backgrounded and the timer stalled),
    // resync to now rather than frantically flushing a queue of stale bars.
    if (nextNoteTime < c.currentTime - 0.5) nextNoteTime = c.currentTime + 0.05;
    nextNoteTime += scheduleBar(song, barCursor, nextNoteTime);
    barCursor++;
  }
  // Release a finished duck back to full music level.
  if (duckUntil && c.currentTime > duckUntil && musicBus) {
    duckUntil = 0;
    musicBus.gain.cancelScheduledValues(c.currentTime);
    musicBus.gain.setTargetAtTime(enabled ? MUSIC_GAIN : 0, c.currentTime, 0.12);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Start looping `id`. Calling it with the song already playing is a NO-OP —
// that matters because main.js calls this from setState() and from scene draws,
// and restarting the loop on every frame (or on every reward screen inside the
// same chapter) would make the music stutter and never get past bar 1.
export function playMusic(id) {
  // Already looping this song AND actually running → nothing to do. The
  // `timer` check matters: the game's first setState() happens at load time,
  // before any user gesture, so the context is suspended and that call sets
  // `current` without ever scheduling a bar. Without the timer test, the retry
  // on first keypress would early-return here and the title theme would never
  // play at all.
  if (current === id && timer) return;
  const c = ensureBus();
  if (!c || c.state === 'suspended') {
    // Remember the intent, but leave `timer` null so the next call retries.
    current = id;
    return;
  }
  current = id;
  barCursor = 0;
  nextNoteTime = c.currentTime + 0.08;
  if (!timer) timer = setInterval(tickScheduler, LOOKAHEAD_MS);
  tickScheduler();
}

// Stop the loop. Notes already queued ring out naturally (up to one bar), which
// is why this fades the bus rather than cutting it — a hard stop mid-chord
// clicks.
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
    // Restore the level for whatever plays next.
    musicBus.gain.setTargetAtTime(enabled ? MUSIC_GAIN : 0, c.currentTime + 0.5, 0.05);
  }
}

// Briefly dip the music so a sound effect reads clearly over it. Called on the
// loud gameplay events (hits, specials, fanfares) — the point of the whole
// mix is that a kid never misses the feedback telling them their typing landed.
export function duck(amount = 0.45, seconds = 0.18) {
  const c = audioCtx();
  if (!c || !musicBus || !enabled) return;
  const level = MUSIC_GAIN * (1 - amount);
  musicBus.gain.cancelScheduledValues(c.currentTime);
  musicBus.gain.setTargetAtTime(level, c.currentTime, 0.02);
  duckUntil = c.currentTime + seconds;
}

// Music-only toggle (F10), independent of the global F9 mute: plenty of kids
// want the game's sounds but not a loop running for half an hour, and plenty of
// parents want the reverse. Returns the new enabled state.
export function toggleMusic() {
  enabled = !enabled;
  const c = audioCtx();
  if (musicBus && c) {
    musicBus.gain.cancelScheduledValues(c.currentTime);
    musicBus.gain.setTargetAtTime(enabled ? MUSIC_GAIN : 0, c.currentTime, 0.1);
  }
  return enabled;
}

export function isMusicOn() {
  return enabled;
}

export function currentSong() {
  return current;
}
