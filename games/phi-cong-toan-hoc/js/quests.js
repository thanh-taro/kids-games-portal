// quests.js — the runtime quest feeder.
//
// math.js is a pure generator: given (level, tier, ops, seed) it returns one
// quest. This module is the thing the GAME talks to. It owns the two pieces of
// state a generator cannot have:
//
//   1. THE NO-REPEAT WINDOW. A stage asks 20-40 questions. Without memory, a
//      seeded generator will hand out "2 + 3" four times in one wave, which
//      reads as broken and teaches nothing. The feeder keeps a sliding window
//      of recently-served quest keys and re-rolls past them.
//   2. THE SEED COUNTER. Each pull advances a counter so quests differ, while
//      the RUN stays reproducible from its starting seed — the same property
//      that lets math.test.js replay a failure.
//
// It also tracks per-stage answer stats (asked / correct / clean) that the
// stage-end summary and rank.js consume, and that stages.js's `minQuests`
// guarantee is measured against.

import { generateQuest } from './math.js';
import { pickShape, recordAnswer } from './adaptive.js';

// How many recent quests must not repeat. Sized a little under the smallest
// stage's minQuests so a short stage can still fill its quota without the
// feeder running out of distinct problems in a tight tier (Easy tier 1 has
// only ~15 distinct sums within 5).
const WINDOW = 10;

// How many re-rolls to attempt before accepting a repeat. A tight tier can
// genuinely exhaust its problem space; serving a repeat is far better than
// serving nothing, so this fails open.
const MAX_REROLL = 24;

export class QuestFeeder {
  // level: 'easy'|'normal'|'hard'|'hardest' — the kid's chosen difficulty
  // quest: the stage's `quest` block from stages.js {tier, opsAllowed, answerCount}
  // seed:  starting seed for this stage run
  // `mastery` is the kid's per-shape accuracy record (adaptive.js). Optional: pass
  // nothing and the feeder behaves exactly as before, with a uniform shape pick. That
  // matters because the preview pages and the audit construct feeders without it.
  constructor(level, questSpec, seed = 1, mastery = null) {
    this.level = level;
    this.spec = questSpec;
    this.mastery = mastery;
    this.seed = seed >>> 0;
    this.counter = 0;
    this.recent = [];

    // Stats for the stage summary + the minQuests guarantee.
    this.asked = 0;
    this.correct = 0;
    this.wrong = 0;
    this.clean = 0;      // answered correctly on the FIRST try
    this.current = null;
    this.dirty = false;  // has the kid already missed the current quest?
  }

  // Pull the next quest, avoiding anything in the recent window.
  next() {
    const { tier, opsAllowed, answerCount } = this.spec;
    let q = null;
    for (let i = 0; i < MAX_REROLL; i++) {
      this.counter++;
      const s = (this.seed + this.counter * 2654435761) >>> 0;
      // Bias toward the shapes the kid is weakest at — WITHIN this tier's own shape
      // list, so difficulty is unchanged and only the mix moves. See adaptive.js.
      const opts = this.mastery
        ? { selectShape: (shapes, rng) => pickShape(this.mastery, shapes, rng) }
        : undefined;
      q = generateQuest(this.level, tier, opsAllowed || null, s, answerCount || 4, opts);
      if (!this.recent.includes(q.key)) break;
    }
    this.recent.push(q.key);
    if (this.recent.length > WINDOW) this.recent.shift();

    this.current = q;
    this.dirty = false;
    this.asked++;
    return q;
  }

  // Record the kid's pick. Returns {correct, clean, answer} — `clean` is true
  // only on a first-try correct answer, which is what charges the ultimate
  // (accuracy, not speed, is the skill the game teaches).
  answer(optionIndex) {
    const q = this.current;
    if (!q) return { correct: false, clean: false, answer: null };
    const correct = optionIndex === q.correctIndex;

    // Feed the mastery record. Recorded on EVERY answer including retries of the same
    // quest, because a second wrong attempt on the same shape is real evidence about
    // that shape — the `clean` flag already exists for the "first try" question and is
    // a different measurement.
    if (this.mastery) recordAnswer(this.mastery, q.shape, correct);

    if (correct) {
      this.correct++;
      const clean = !this.dirty;
      if (clean) this.clean++;
      return { correct: true, clean, answer: q.answer };
    }
    this.wrong++;
    this.dirty = true; // this quest can no longer count as clean
    return { correct: false, clean: false, answer: q.answer };
  }

  // Accuracy over this stage, for the summary screen.
  accuracy() {
    const total = this.correct + this.wrong;
    return total === 0 ? 1 : this.correct / total;
  }
}
