// rank.js — the hero rank system, driven by RECENT typing accuracy + speed.
//
// Rank is a LIVE reading of current typing level, not a lifetime average. Every
// completed word feeds a rolling window of the last WINDOW_SIZE words:
//   - accuracy: clean words / total words in the window (a "clean" word used no
//     backspaces and no wasted keystrokes — the same wasClean() signal combo uses)
//   - speed: characters per minute (CPM), timed per word from the first key to
//     completion, aggregated over the window's Vietnamese characters.
//
// From (accuracy, speed) we derive a RANK, exactly like the hero's skill mastery:
// a kid who is ALREADY typing fast and clean should read as high rank right away
// — no slow step-by-step climb required. Symmetrically, if the kid slows down or
// starts making mistakes, the window fills with worse words and rank drops just
// as fast. There is no ratchet and no grace buffer: the badge always reflects
// how the kid is typing RIGHT NOW.
//
// Each rank grants a kill-point BONUS multiplier, and Master+ ranks make the
// hero GLOW.
//
// This module holds ONLY the data + pure derivations; main.js reads them to
// award kill points, draw the badge/aura, and celebrate rank changes.

// Ranks ordered LOW→HIGH. Each requires BOTH a minimum accuracy AND a minimum
// speed over the recent window; the hero holds the highest rank whose gates it
// clears. `killBonus` is the kill-point multiplier; `glow` (Master+) is the aura
// color + soft blur.
//
// Gate sizing is anchored to MEASURED kid-typing reality, not adult WPM charts.
// Two properties of the metrics drive every number below:
//
//   1. CPM counts RENDERED Vietnamese characters, but Telex needs more keys than
//      it renders (trứng = 5 chars from 7 keys; ratio ~0.75 on words/sentences,
//      but only ~0.49 on the single-letter pool). So a kid sustaining ~150
//      keystrokes/min reads as CPM ~117 on sentences — and as CPM ~75 on stage 1
//      letters, through no fault of their own.
//   2. The per-word clock runs from the FIRST KEY to completion (input.js), so
//      reading/thinking time is excluded. CPM measures active typing only.
//
// Concretely, keystrokes/min -> CPM shown on sentence-tier words:
//      120 kpm -> ~95    150 kpm -> ~117    180 kpm -> ~140    210 kpm -> ~165
// A strong child sustains ~120-160 kpm; an excellent one ~180-200.
//
// Because rank is now a LIVE window (not a lifetime grind), the top ranks are
// reachable the moment a kid IS typing that well, however early in the game —
// mirroring how the hero casts a skill easily once it is mastered, not after a
// fixed rep count. Accuracy stays the primary gate at every tier: speed alone
// must never buy a rank, because the point of the game is typing Vietnamese
// CORRECTLY.
export const RANKS = [
  {
    id: 'novice',
    name: 'Tân Binh',          // "Novice"
    minAccuracy: 0,
    minCpm: 0,
    killBonus: 1.0,
    color: '#cfc8dd',
    emoji: '🌱',
    glow: null,
  },
  {
    id: 'adventurer',
    name: 'Nhà Thám Hiểm',     // "Adventurer"
    // ~55 kpm — any kid typing along at a beginner clip clears this.
    minAccuracy: 0.65,
    minCpm: 40,
    killBonus: 1.25,
    color: '#5fc23c',
    emoji: '🗺️',
    glow: null,
  },
  {
    id: 'elite',
    name: 'Tinh Anh',          // "Elite"
    // ~95 kpm, mostly-clean typing: the "I've got the hang of Telex" tier.
    minAccuracy: 0.75,
    minCpm: 70,
    killBonus: 1.5,
    color: '#39b7c2',
    emoji: '⚔️',
    glow: null,
  },
  {
    id: 'master',
    name: 'Cao Thủ',           // "Master"
    // ~130 kpm and few wasted keys. First aura — earned the instant recent play
    // is this good, not after a fixed word count.
    minAccuracy: 0.84,
    minCpm: 100,
    killBonus: 2.0,
    color: '#3ea0ff',
    emoji: '🛡️',
    glow: '#3ea0ff',          // cyan-blue aura
  },
  {
    id: 'legend',
    name: 'Huyền Thoại',       // "Legend"
    // ~165 kpm at 90% clean. THE target for a kid who types fast and makes
    // almost no mistakes — exactly the ask, reachable the moment they show it.
    minAccuracy: 0.90,
    minCpm: 125,
    killBonus: 2.5,
    color: '#b06bff',
    emoji: '👑',
    glow: '#b06bff',          // violet aura
  },
  {
    id: 'mythic',
    name: 'Thần Thoại',        // "Mythic"
    // ~200 kpm at 95% clean, sustained across the recent window. The ceiling for
    // an excellent child — demanding, but genuinely achievable in real time.
    minAccuracy: 0.95,
    minCpm: 150,
    killBonus: 3.0,
    color: '#ffd24a',
    emoji: '✨',
    glow: '#ffd24a',          // gold aura
  },
];

// How many of the most recent words the rank is measured over. Small enough
// that rank responds within a few words of a change in how the kid is typing
// (mastery shows up almost immediately; a slump drops the badge almost as
// fast), large enough that a single lucky or fumbled word can't swing it.
export const WINDOW_SIZE = 12;

// Minimum words banked (lifetime OR in-window) before a kid can outrank
// Novice, so the very first word or two of a session can't vault — or
// stall — the badge before there's anything to measure.
const MIN_SAMPLE_WORDS = 4;

// Base kill points per monster tier (before the rank bonus multiplier). The
// `kind` string comes from MONSTER_KIND in entities.js.
export const KILL_BASE = {
  creep: 10,
  boss: 40,
  stageboss: 80,
};

// Highest rank index whose accuracy AND speed gates are both cleared over the
// given sample. `sampleWords` gates the very first couple of words of a fresh
// window so one early fluke can't misrepresent an empty sample.
export function rankIndexFor(accuracy, cpm, sampleWords = Infinity) {
  if (sampleWords < MIN_SAMPLE_WORDS) return 0;
  let idx = 0;
  for (let i = RANKS.length - 1; i >= 1; i--) {
    const r = RANKS[i];
    if (accuracy >= r.minAccuracy && cpm >= r.minCpm) {
      idx = i;
      break;
    }
  }
  return idx;
}

export class RankTracker {
  // Seeded from persisted stats (see rewards.js progress object). Only the
  // rolling window + lifetime kill points persist — rank itself is always
  // recomputed live from the window, never stored as a ratcheted best.
  constructor(saved = {}) {
    // Rolling window of the last WINDOW_SIZE words: { chars, ms, clean }.
    this.window = Array.isArray(saved.window) ? saved.window.slice(-WINDOW_SIZE) : [];
    this.killPoints = saved.killPoints || 0;   // lifetime running score

    // Transient celebration state (not persisted).
    this.pulse = 0;          // 0..1 badge pop on rank change
    this.bannerTimer = 0;    // frames the rank-up/down banner stays up
    this.demoted = false;    // was the last banner a demotion (not a promotion)?
    this.gainPopups = [];    // floating "+N" kill-point popups
    this._lastIndex = this.rankIndex; // to detect a change on the next word
  }

  // Record one completed word. `chars` is the VN length, `ms` the typing time,
  // `clean` from tracker.wasClean(). Returns { rankUp, demoted, rank } so the
  // game can celebrate a change — up OR down, since rank now moves both ways
  // in real time.
  recordWord(chars, ms, clean) {
    const clampedMs = ms > 0 ? Math.min(ms, 8000) : 0;
    this.window.push({ chars, ms: clampedMs, clean });
    if (this.window.length > WINDOW_SIZE) this.window.shift();

    const prevIndex = this._lastIndex;
    const nowIndex = this.rankIndex;
    this._lastIndex = nowIndex;

    if (nowIndex === prevIndex) {
      return { rankUp: false, demoted: false, rank: RANKS[nowIndex] };
    }

    this.pulse = 1;
    this.bannerTimer = 120;
    const up = nowIndex > prevIndex;
    this.demoted = !up;
    return { rankUp: up, demoted: !up, rank: RANKS[nowIndex] };
  }

  // Award kill points for one defeated monster, scaled by the current rank
  // bonus. Returns the points gained (for the floating "+N" popup).
  awardKill(kind, x, y, comboMult = 1) {
    const base = KILL_BASE[kind] || KILL_BASE.creep;
    const gained = Math.round(base * this.rank.killBonus * comboMult);
    this.killPoints += gained;
    this.gainPopups.push({ x, y, gained, life: 48, color: this.rank.color });
    return gained;
  }

  get sampleWords() {
    return this.window.length;
  }

  get accuracy() {
    if (this.window.length === 0) return 1;
    const clean = this.window.reduce((n, w) => n + (w.clean ? 1 : 0), 0);
    return clean / this.window.length;
  }

  // Characters per minute over the recent window.
  get cpm() {
    let chars = 0;
    let ms = 0;
    for (const w of this.window) {
      chars += w.chars;
      ms += w.ms;
    }
    const minutes = ms / 60000;
    return minutes > 0 ? Math.round(chars / minutes) : 0;
  }

  // Live rank from the recent window — this IS the displayed rank now. No
  // ratchet, no grace buffer: it tracks current typing level directly, up or
  // down, the same way the combo meter does.
  get rankIndex() {
    return rankIndexFor(this.accuracy, this.cpm, this.sampleWords);
  }

  get displayIndex() {
    return this.rankIndex;
  }

  get rank() {
    return RANKS[this.displayIndex];
  }

  get nextRank() {
    return RANKS[this.displayIndex + 1] || null;
  }

  // Progress 0..1 toward the next rank: how far recent accuracy and speed have
  // climbed from the current rank's gates to the next rank's, taking the
  // LAGGING of the two (both must be met to promote). Null at max rank.
  get progressToNext() {
    const next = this.nextRank;
    if (!next) return null;
    const cur = RANKS[this.displayIndex];
    const accP = frac(this.accuracy, cur.minAccuracy, next.minAccuracy);
    const cpmP = frac(this.cpm, cur.minCpm, next.minCpm);
    const overall = Math.min(accP, cpmP);
    const lagging = overall === accP ? 'accuracy' : 'speed';
    return { overall, accP, cpmP, lagging };
  }

  // Snapshot of persistable fields to fold into the progress object.
  serialize() {
    return {
      window: this.window,
      killPoints: this.killPoints,
    };
  }

  // Full wipe (the R-on-title "reset progress"). Window + kill points back to
  // zero.
  reset() {
    this.window = [];
    this.killPoints = 0;
    this.pulse = 0;
    this.bannerTimer = 0;
    this.demoted = false;
    this.gainPopups = [];
    this._lastIndex = 0;
  }

  update() {
    if (this.pulse > 0.01) this.pulse *= 0.88;
    else this.pulse = 0;
    if (this.bannerTimer > 0) this.bannerTimer--;
    for (const g of this.gainPopups) g.life--;
    this.gainPopups = this.gainPopups.filter((g) => g.life > 0);
  }
}

function frac(v, lo, hi) {
  if (hi <= lo) return 1;
  return Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
}
