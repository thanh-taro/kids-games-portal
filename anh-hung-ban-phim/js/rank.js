// rank.js — the hero rank system, driven by lifetime typing accuracy + speed.
//
// As the kid plays, every completed word feeds two lifetime metrics:
//   - accuracy: clean words / total words (a "clean" word used no backspaces
//     and no wasted keystrokes — the same wasClean() signal the combo uses)
//   - speed: characters per minute (CPM), timed per word from the first key to
//     completion, aggregated over all Vietnamese characters typed.
//
// From (accuracy, speed) we derive a RANK. Ranks are a lifetime, prestige-like
// climb persisted across sessions in the progress object — a bad stage barely
// moves the needle, and a rank once earned is hard to lose. Each rank grants a
// kill-point BONUS multiplier, and Master+ ranks make the hero GLOW.
//
// This module holds ONLY the data + pure derivations; main.js reads them to
// award kill points, draw the badge/aura, and celebrate rank-ups.

// Ranks ordered LOW→HIGH. Each requires BOTH a minimum accuracy AND a minimum
// speed; the hero holds the highest rank whose gates it clears. `killBonus` is
// the kill-point multiplier; `glow` (Master+) is the aura color + soft blur.
//
// Gate sizing is anchored to what the game actually asks of a KID: one clean
// 12-stage playthrough is ~260 words, and CPM counts rendered Vietnamese
// characters, so Telex tone/shape keys (aw → ă, ees → ế) mean real keypress
// speed runs well above the CPM number. Legend therefore lands inside a single
// determined playthrough (~180 words) and Mythic just past a full run (~320) —
// still the two hardest tiers, and still gated on sustained accuracy, but
// reachable by a child rather than by an adult touch-typist.
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
    minAccuracy: 0.7,
    minCpm: 60,
    killBonus: 1.25,
    color: '#5fc23c',
    emoji: '🗺️',
    glow: null,
  },
  {
    id: 'elite',
    name: 'Tinh Anh',          // "Elite"
    minAccuracy: 0.8,
    minCpm: 100,
    killBonus: 1.5,
    color: '#39b7c2',
    emoji: '⚔️',
    glow: null,
  },
  {
    id: 'master',
    name: 'Cao Thủ',           // "Master"
    minAccuracy: 0.88,
    minCpm: 140,
    killBonus: 2.0,
    color: '#3ea0ff',
    emoji: '🛡️',
    glow: '#3ea0ff',          // cyan-blue aura
  },
  {
    id: 'legend',
    name: 'Huyền Thoại',       // "Legend"
    minAccuracy: 0.92,
    minCpm: 175,
    minWords: 180,             // sustained mastery — not a lucky hot streak
    killBonus: 2.5,
    color: '#b06bff',
    emoji: '👑',
    glow: '#b06bff',          // violet aura
  },
  {
    id: 'mythic',
    name: 'Thần Thoại',        // "Mythic"
    minAccuracy: 0.95,
    minCpm: 210,
    minWords: 320,             // near-flawless over a very long haul
    killBonus: 3.0,
    color: '#ffd24a',
    emoji: '✨',
    glow: '#ffd24a',          // gold aura
  },
];

// Base kill points per monster tier (before the rank bonus multiplier). The
// `kind` string comes from MONSTER_KIND in entities.js.
// Words the live rank must stay below the displayed rank before the badge
// slips ONE tier. High enough that an off day is forgiven; low enough that a
// genuine, sustained decline eventually shows.
export const GRACE_WORDS = 40;

// Base kill points per monster tier (before the rank bonus multiplier). The
// `kind` string comes from MONSTER_KIND in entities.js.
export const KILL_BASE = {
  creep: 10,
  boss: 40,
  stageboss: 80,
};

// Highest rank index whose accuracy, speed, AND lifetime-word gates are all
// cleared. Kids need a little on the board first (>= 5 words) before they can
// outrank Novice, so a single lucky-fast word doesn't vault a beginner to
// Legend. The top ranks (Legend/Mythic) add their own `minWords` so the aura
// is earned over a long, sustained climb — never on a short hot streak.
export function rankIndexFor(accuracy, cpm, totalWords = Infinity) {
  let idx = 0;
  for (let i = RANKS.length - 1; i >= 1; i--) {
    const r = RANKS[i];
    const wordGate = Math.max(5, r.minWords || 0);
    if (totalWords >= wordGate && accuracy >= r.minAccuracy && cpm >= r.minCpm) {
      idx = i;
      break;
    }
  }
  return idx;
}

export class RankTracker {
  // Seeded from persisted lifetime stats (see rewards.js progress object).
  constructor(saved = {}) {
    this.totalWords = saved.totalWords || 0;
    this.cleanWords = saved.cleanWords || 0;
    this.totalChars = saved.totalChars || 0;   // VN chars typed (for CPM)
    this.totalMs = saved.totalMs || 0;         // time spent typing them
    this.killPoints = saved.killPoints || 0;   // lifetime running score
    this.bestRankIndex = saved.bestRankIndex || 0;
    // Grace buffer against demotion: the displayed rank slips one tier only
    // after the LIVE rank has stayed below it for GRACE_WORDS words. Refilled
    // whenever the kid is holding (or exceeding) their displayed rank, so a
    // single fumbled word never threatens the badge. Persisted so a cold streak
    // spanning sessions still counts toward (or resets) the slip.
    this.graceTimer = saved.graceTimer == null ? GRACE_WORDS : saved.graceTimer;

    // Transient celebration state (not persisted).
    this.pulse = 0;          // 0..1 badge pop on rank change
    this.bannerTimer = 0;    // frames the rank-up banner stays up
    this.demoted = false;    // was the last banner a demotion (not a promotion)?
    this.gainPopups = [];    // floating "+N" kill-point popups
  }

  // Record one completed word. `chars` is the VN length, `ms` the typing time,
  // `clean` from tracker.wasClean(). Returns { rankUp, rank } so the game can
  // celebrate a promotion.
  recordWord(chars, ms, clean) {
    this.totalWords++;
    if (clean) this.cleanWords++;
    this.totalChars += chars;
    // Clamp absurd gaps (kid walked away mid-word) so one stall can't tank CPM.
    if (ms > 0) this.totalMs += Math.min(ms, 8000);

    const live = this.rankIndex;

    // Promotion: the live rank cleared a new best. The badge pops up a tier and
    // the grace buffer resets full under the new (higher) displayed rank.
    if (live > this.bestRankIndex) {
      this.bestRankIndex = live;
      this.graceTimer = GRACE_WORDS;
      this.pulse = 1;
      this.bannerTimer = 120;
      this.demoted = false;
      return { rankUp: true, demoted: false, rank: RANKS[this.bestRankIndex] };
    }

    // Holding or exceeding the displayed rank: refill the grace buffer so past
    // slippage is forgiven the moment the kid recovers.
    if (live >= this.bestRankIndex) {
      this.graceTimer = GRACE_WORDS;
      return { rankUp: false, demoted: false, rank: RANKS[this.bestRankIndex] };
    }

    // Live rank sits below the displayed rank: burn down the grace buffer. When
    // it empties, slip the badge exactly ONE tier (never straight to the live
    // rank) and refill — a bad streak erases at most one tier at a time.
    if (--this.graceTimer <= 0 && this.bestRankIndex > 0) {
      this.bestRankIndex--;
      this.graceTimer = GRACE_WORDS;
      this.pulse = 1;
      this.bannerTimer = 120;
      this.demoted = true;
      return { rankUp: false, demoted: true, rank: RANKS[this.bestRankIndex] };
    }

    return { rankUp: false, demoted: false, rank: RANKS[this.bestRankIndex] };
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

  get accuracy() {
    return this.totalWords > 0 ? this.cleanWords / this.totalWords : 1;
  }

  // Characters per minute over all timed words.
  get cpm() {
    const minutes = this.totalMs / 60000;
    return minutes > 0 ? Math.round(this.totalChars / minutes) : 0;
  }

  // Live rank from current stats.
  get rankIndex() {
    return rankIndexFor(this.accuracy, this.cpm, this.totalWords);
  }

  // Displayed rank = best ever reached (ratcheted), so the badge is an
  // achievement the kid keeps.
  get displayIndex() {
    return Math.max(this.rankIndex, this.bestRankIndex);
  }

  get rank() {
    return RANKS[this.displayIndex];
  }

  get nextRank() {
    return RANKS[this.displayIndex + 1] || null;
  }

  // Progress 0..1 toward the next rank: how far accuracy, speed, AND (for the
  // top ranks) lifetime words have climbed from the current rank's gates to the
  // next rank's, taking the LAGGING of the three (all must be met to promote).
  // Null at max rank.
  //
  // The floor is measured from the LIVE rank, not the displayed one. Those
  // differ whenever the badge is ratcheted above current form (see
  // displayIndex), and measuring from the displayed rank's gates would clamp
  // every fraction to 0 — a bar frozen at 0% with no hint why. `lagging` names
  // the gate holding the kid back ('accuracy' | 'speed' | 'words') so the HUD
  // can tell them what to work on instead of showing a dead bar.
  get progressToNext() {
    const next = this.nextRank;
    if (!next) return null;
    const cur = RANKS[Math.min(this.rankIndex, this.displayIndex)];
    const accP = frac(this.accuracy, cur.minAccuracy, next.minAccuracy);
    const cpmP = frac(this.cpm, cur.minCpm, next.minCpm);
    const wordP = next.minWords
      ? frac(this.totalWords, cur.minWords || 0, next.minWords)
      : 1;
    const overall = Math.min(accP, cpmP, wordP);
    const lagging = overall === accP ? 'accuracy' : overall === cpmP ? 'speed' : 'words';
    return { overall, accP, cpmP, wordP, lagging };
  }

  // Snapshot of persistable fields to fold into the progress object.
  serialize() {
    return {
      totalWords: this.totalWords,
      cleanWords: this.cleanWords,
      totalChars: this.totalChars,
      totalMs: this.totalMs,
      killPoints: this.killPoints,
      bestRankIndex: this.bestRankIndex,
      graceTimer: this.graceTimer,
    };
  }

  // Full wipe (the R-on-title "reset progress"). Lifetime stats back to zero.
  reset() {
    this.totalWords = 0;
    this.cleanWords = 0;
    this.totalChars = 0;
    this.totalMs = 0;
    this.killPoints = 0;
    this.bestRankIndex = 0;
    this.graceTimer = GRACE_WORDS;
    this.pulse = 0;
    this.bannerTimer = 0;
    this.demoted = false;
    this.gainPopups = [];
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
