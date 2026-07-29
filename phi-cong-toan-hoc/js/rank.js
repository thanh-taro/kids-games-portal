// rank.js — a lifetime skill rating, earned across the whole game.
//
// WHY A RANK AT ALL. The stage-by-stage feedback is short-term: you cleared it or
// you retried. A rank is the long arc — the thing that tells a kid who has played
// for a week that they are genuinely better at arithmetic than they were, which
// is the actual point of the game.
//
// WHAT IT MEASURES, and this is the important design decision: ACCURACY FIRST,
// volume second, speed not at all.
//
//   * Accuracy is the skill the game teaches. The ultimate charges on clean
//     answers, the combo breaks on a wrong one, and the rank gates on percentage
//     correct. All three point the same way on purpose.
//   * Volume (total correct answers) is the second gate, so a kid cannot reach
//     the top rank off twelve lucky questions. It rises slowly and can only ever
//     go up, which makes it the "you kept coming back" axis.
//   * SPEED IS NOT MEASURED. A rank that rewarded answering fast would push a
//     child to guess, and guessing at four options pays 25% — it would actively
//     teach the wrong habit. The typing game learned the same thing about CPM.
//
// Ranks are Vietnamese pilot ratings so the label itself is part of the fiction.

export const RANKS = [
  { id: 'tapsu',    name: 'Tập Sự',        desc: 'Phi công tập sự',        minCorrect: 0,   minAccuracy: 0 },
  { id: 'phicong',  name: 'Phi Công',      desc: 'Phi công chính thức',    minCorrect: 40,  minAccuracy: 0.55 },
  { id: 'thiendoi', name: 'Thiếu Uý',      desc: 'Chỉ huy phi đội nhỏ',    minCorrect: 120, minAccuracy: 0.65 },
  { id: 'daiuy',    name: 'Đại Uý',        desc: 'Chỉ huy hạm đội',        minCorrect: 250, minAccuracy: 0.72 },
  { id: 'chihuy',   name: 'Chỉ Huy Trưởng', desc: 'Chỉ huy toàn hạm đội',  minCorrect: 420, minAccuracy: 0.80 },
  { id: 'saotruong', name: 'Sao Trưởng',   desc: 'Bậc cao nhất Ngân Hà',   minCorrect: 650, minAccuracy: 0.88 },
];

// DEMOTION — how many losses on ONE stage cost a rank.
//
// Deliberately 3, and deliberately per-stage rather than lifetime. A kid who
// loses once was unlucky; a kid who loses three times on the SAME stage is being
// asked for arithmetic they do not have yet, and the rank should stop claiming
// otherwise. Resetting the counter on a win (and on moving to a new stage) is
// what keeps this from being a slow lifetime tax on a child who is improving.
export const DEATHS_PER_DEMOTION = 3;

// The rank for a given lifetime record, before any demotion. Walks DOWN from the
// top so a kid always gets the best rank they qualify for.
export function earnedRank(totalCorrect, totalWrong) {
  const total = totalCorrect + totalWrong;
  const acc = total > 0 ? totalCorrect / total : 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    const r = RANKS[i];
    if (totalCorrect >= r.minCorrect && acc >= r.minAccuracy) return r;
  }
  return RANKS[0];
}

// The rank actually WORN, after demotions. `demotions` is a persisted count of
// how many ranks the kid has lost to repeated failure.
//
// A demotion can never drop the kid below RANKS[0] — there is no rank below
// trainee, and a bar that can go negative would need a story nobody wants to
// tell a 6-year-old.
export function rankFor(totalCorrect, totalWrong, demotions = 0) {
  const earned = earnedRank(totalCorrect, totalWrong);
  const i = RANKS.indexOf(earned);
  const dropped = Math.max(0, i - Math.max(0, demotions | 0));
  return RANKS[dropped];
}

// Is the kid currently wearing less than they earned? The HUD and the failure
// screen use this to show the way back — a demotion the kid cannot see a path out
// of is just a punishment.
export function isDemoted(totalCorrect, totalWrong, demotions = 0) {
  return rankFor(totalCorrect, totalWrong, demotions) !== earnedRank(totalCorrect, totalWrong);
}

// What the kid needs for the next rank, for the "keep going" line on the title
// screen. Returns null at the top.
export function nextRankGoal(totalCorrect, totalWrong, demotions = 0) {
  const cur = rankFor(totalCorrect, totalWrong, demotions);
  const i = RANKS.indexOf(cur);
  if (i < 0 || i >= RANKS.length - 1) return null;
  const next = RANKS[i + 1];
  const total = totalCorrect + totalWrong;
  const acc = total > 0 ? totalCorrect / total : 0;
  return {
    rank: next,
    needCorrect: Math.max(0, next.minCorrect - totalCorrect),
    needAccuracy: acc < next.minAccuracy ? next.minAccuracy : 0,
  };
}

// Did this stage's result push the kid up a rank? main.js compares before/after
// so the victory screen can call it out — the one moment a long-arc stat gets to
// feel like an event.
// Takes demotions on both sides, because clearing the stage that demoted you
// REPAYS a demotion — and that restoration must be celebrated exactly like a
// fresh promotion. Winning your rank back in silence would read as the game
// grudgingly returning something it took, which is the opposite of the intent.
export function rankUp(beforeCorrect, beforeWrong, afterCorrect, afterWrong,
                       beforeDemotions = 0, afterDemotions = 0) {
  const a = rankFor(beforeCorrect, beforeWrong, beforeDemotions);
  const b = rankFor(afterCorrect, afterWrong, afterDemotions);
  // Only ever announce an INCREASE. A demotion has its own, gentler announcement
  // on the failure screen; routing it through the promotion fanfare would be
  // actively cruel.
  return RANKS.indexOf(b) > RANKS.indexOf(a) ? b : null;
}

// A demotion just happened: which rank was lost, and which is now worn. Returns
// null when nothing changed, so the failure screen only speaks up when it must.
export function rankDown(beforeCorrect, beforeWrong, beforeDemotions, afterDemotions) {
  const a = rankFor(beforeCorrect, beforeWrong, beforeDemotions);
  const b = rankFor(beforeCorrect, beforeWrong, afterDemotions);
  return RANKS.indexOf(b) < RANKS.indexOf(a) ? { from: a, to: b } : null;
}
