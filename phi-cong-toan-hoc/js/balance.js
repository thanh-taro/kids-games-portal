// balance.js — a headless simulation of the wave budget and survivability.
//
//   node js/balance.js            # report for the built-in stage shapes
//   node js/balance.js --json     # machine-readable, for verify.js
//
// WHY THIS EXISTS. The core loop's difficulty lives in the interaction of the
// stage's fleet size, its wave windows, the incoming fire, the kid's hull, and the
// kid's answering pace. Reading those numbers tells you almost nothing about
// whether a 7-year-old survives the stage.
//
// It has caught, among others: wave budgets totalling 51 hits against a promised
// 14 quests (two thirds of every fleet flying past untouched no matter how well
// the kid played), a boss that respawned when beaten, and a 360-degree attack
// pattern that dealt literally zero damage.
//
// Browser playtesting cannot replace this, for a practical reason discovered
// the hard way: requestAnimationFrame is throttled to a standstill in a
// background tab, so an automated in-browser run of a 4-minute stage simply
// stops. This module has no DOM, no rAF, and no canvas — it steps the same
// arithmetic on a fixed timestep and finishes in milliseconds.
//
// It models the loop faithfully but NOT exactly: it does not simulate
// projectile flight time or per-enemy positions, because the question it
// answers is "can the kid afford this stage", not "where was each shot". Where
// it approximates, it approximates PESSIMISTICALLY (see volleySize).

// ---------------------------------------------------------------------------
// The kid model.
//
// `secsPerAnswer` is how long a child takes to read the quest and pick. These
// are deliberately unflattering: real kids stall, re-read, and get distracted.
// `accuracy` is the fraction of answers they get right.
//
// The three profiles bracket the audience. A stage is only well-tuned if the
// SLOW profile survives it and the FAST profile is not bored — that is the
// whole point of checking three rather than one.
// ---------------------------------------------------------------------------

import { patternFor, patternSpec } from './bossattacks.js';

export const PROFILES = {
  slow:    { name: 'slow',    secsPerAnswer: 12, accuracy: 0.65 },
  typical: { name: 'typical', secsPerAnswer: 8,  accuracy: 0.80 },
  fast:    { name: 'fast',    secsPerAnswer: 5,  accuracy: 0.92 },
};

// How many shots one volley fires, given the current combo and how many allies
// are flying. Must match the combo ladder in main.js pickAnswer().
//
// ALLIES ARE THE REAL POWER CURVE, and leaving them out of the simulation made
// every chapter-2 and chapter-3 stage look unwinnable. Each rescued wingman
// fires alongside the kid, so a full line-up of five roughly triples output.
// That is exactly why the fleets are allowed to grow across the game: the kid's
// damage grows with them. A simulator that models the fleets but not the
// wingmen is measuring a game the kid never plays.
export function volleySize(combo, allies = 0) {
  const base =
    combo >= 20 ? 7 :
    combo >= 15 ? 6 :
    combo >= 10 ? 5 :
    combo >= 6 ? 3 :
    combo >= 3 ? 2 : 1;
  // Wingmen add one shot each, but only every other volley (they fire on their
  // own slightly slower cadence) — so five allies is +2.5 shots, not +5.
  return base + allies * 0.5;
}

// The armour bonus a kid has accumulated by a given stage, from stages.js
// rewards. Mirrors UPGRADES in upgrades.js.
const HULL_UPGRADE = { hull1: 1, hull2: 1, hull3: 1, hull4: 2, hull5: 2 };
export function hullBonusByStage(stages, stageIndex) {
  let n = 0;
  for (let i = 0; i < stageIndex && i < stages.length; i++) {
    n += HULL_UPGRADE[stages[i].reward] || 0;
  }
  return n;
}

// How many allies the kid has by a given stage index, derived from the rewards
// in stages.js. This is what makes the fleet budget honest.
export function alliesByStage(stages, stageIndex) {
  let n = 0;
  for (let i = 0; i < stageIndex && i < stages.length; i++) {
    if (String(stages[i].reward || '').startsWith('ally_')) n++;
  }
  return n;
}

// Total hits a stage's waves demand.
export function stageHits(stage) {
  let total = 0;
  for (const w of stage.waves) {
    if (w.phases && w.phases.length) {
      total += w.phases.reduce((s, p) => s + p.hits, 0) * (w.count || 1);
    } else {
      total += (w.count || 1) * (w.hits || 1);
    }
    if (w.escorts) total += (w.escorts.count || 0) * (w.escorts.hits || 1);
  }
  return total;
}

// ---------------------------------------------------------------------------
// The simulation.
//
// Fixed 100ms steps. The kid answers every `secsPerAnswer`; each answer is
// correct with probability `accuracy` (seeded, so a run is reproducible).
// Energy drains continuously and refills on a correct answer. Escaped enemies
// cost hull, as does incoming fire, and a correct answer mends a little.
// ---------------------------------------------------------------------------

// How often a projectile that CAN reach the ship actually connects.
//
// MEASURED, NOT ASSUMED. The procedure: jump to a boss stage, set hull very high,
// answer nothing, and watch hull fall for 40 seconds. Under the final boss
// (fireEvery 8.5, reach 3) that yields 0.075 dmg/sec, which back-solves to
// roughly 0.21 — and even that is generous, since the boss patterns are the
// widest in the game.
//
// The first pass GUESSED 0.35 and the difference mattered enormously: it made
// the simulator report every chapter-3 stage as a 0/5 death for all three
// profiles, and I nearly retuned 24 stages of content to fix a threat that did
// not exist. The same measurement also exposed a real bug in the opposite
// direction — the original 360-degree ring pattern landed literally ZERO damage
// over 60 seconds, because half its bolts flew upward and the rest exited
// sideways. Guessing this constant hid a broken attack behind an imaginary one.
//
// If boss patterns or projectile speeds change, RE-MEASURE rather than adjust.
const HIT_FRACTION = 0.21;

const DT = 0.1;
// The BASE hull. Armour upgrades add to it, and the simulation must account for
// them: stages.js grants hull1..hull5 across the game (+7 total by stage 22), so
// judging a late stage against a bare 6-hull ship measures a run nobody plays.
const BASE_HULL = 6;

// What one escaped monstership costs in energy.
//
// This was 6 and it was the single worst number in the build. The cost is paid
// PER SHIP, so it scales with how far behind the kid is — and the kid who is
// furthest behind is the one who can least afford it. A slow player leaked 16
// ships and lost 96 energy to escapes alone, more than the entire bar, which
// turned "answering slowly" into "guaranteed death". The fast player paid zero.
// That is difficulty scaling backwards: a penalty that punishes the weakest
// player hardest and the strongest not at all.
//
// It is deliberately small: at a full hull point per escape a struggling player
// died to leakage alone while a strong player paid nothing.
const ESCAPE_HULL_COST = 0.34;


function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function simulate(stage, profile, seed = 1, allies = 0, hullBonus = 0) {
  const rng = makeRng(seed);
  const Q = stage.quest;

  const maxHull = BASE_HULL + hullBonus;
  let hull = maxHull;
  let combo = 0;
  let bestCombo = 0;
  let asked = 0, correct = 0, wrong = 0;
  let hitsDealt = 0;
  let t = 0;
  let nextAnswerAt = profile.secsPerAnswer;
  let escapedShips = 0;
  let hullDamage = 0;   // fractional accumulator for incoming fire
  let hullRepair = 0;   // fractional repair earned by answering (see main.js)

  const needHits = stageHits(stage);

  // WAVE QUEUE. Modelled the way main.js's spawner actually behaves: a wave is
  // launched, its ships enter over (count * gap) seconds and take `transit` to
  // cross, and the NEXT wave only launches once this one is resolved — every
  // ship either killed or escaped.
  //
  // An earlier version precomputed fixed `dueAt` times for all waves as if they
  // ran on a schedule regardless of play. That diverged badly from the real
  // game: a fast player who clears wave 1 instantly then waits for wave 2's
  // spawn delays, so the sim said "12 questions" where the real game asked 77.
  // A simulator that does not model the spawner's gating is measuring a
  // different game.
  const waveQueue = stage.waves.map((w) => {
    const hits = w.phases && w.phases.length
      ? w.phases.reduce((s, p) => s + p.hits, 0) * (w.count || 1)
      : (w.count || 1) * (w.hits || 1);
    const spawnSpan = (w.count || 1) * (w.gap ?? 0.5);
    // Descent time over the play field at this wave's speed. ~500px field.
    const transit = 500 / (w.speed || 40);
    const isBoss = w.formation === 'BOSS' || !!(w.phases && w.phases.length);

    // INCOMING FIRE. The kid cannot dodge — the ship holds position and drifts —
    // so a fraction of what a wave fires simply lands. Modelling it matters:
    // without this the simulation tracked hull ONLY from starvation, so a boss
    // could empty the hull with a wide attack pattern and every stage would
    // still report as playable. A gate that cannot see a whole damage source is
    // not a gate.
    //
    // `reach` is how many projectiles per cycle can actually threaten the ship
    // (bossattacks.js caps this per pattern — a ring fires 8 but only its lower
    // arc can reach). HIT_FRACTION is how often one of those connects given the
    // ship's drift; measured against the real game rather than assumed.
    const fireEvery = w.fireEvery || (w.phases || []).reduce(
      (mn, p) => (p.fireEvery ? Math.min(mn, p.fireEvery) : mn), Infinity);
    const reach = isBoss ? patternSpec(patternFor(w.enemy)).reach : 1;
    const shooters = isBoss ? 1 : (w.count || 1);
    const bossDps = Number.isFinite(fireEvery) && fireEvery > 0
      ? (shooters * reach * HIT_FRACTION * (w.fireDamage || 1)) / fireEvery
      : 0;
    // BOSS ESCORTS FIRE TOO. Each is a single-shot elite (reach 1, like any
    // non-boss shooter) rather than a boss pattern. Left out, this would be
    // exactly the "a gate that cannot see a whole damage source is not a
    // gate" bug the comment above already warns about — just for a source
    // that did not exist yet when it was written.
    const escortDps = w.escorts && w.escorts.fireEvery
      ? ((w.escorts.count || 0) * HIT_FRACTION * (w.escorts.fireDamage || 1)) / w.escorts.fireEvery
      : 0;
    const dps = bossDps + escortDps;

    return { id: w.id, hits, spawnSpan, transit, isBoss, dps };
  });

  // The last non-boss wave — what the reinforcement tail is allowed to copy.
  let lastCreepWave = -1;
  for (let i = waveQueue.length - 1; i >= 0; i--) {
    if (!waveQueue[i].isBoss) { lastCreepWave = i; break; }
  }

  let waveIndex = 0;
  let waveStartT = 0;
  let waveHitsLeft = waveQueue.length ? waveQueue[0].hits : 0;
  let waveLaunched = waveQueue.length > 0;
  let reinforcements = 0;
  let isReinforcement = false;
  // Once the stage enters its reinforcement tail it never returns to real waves.
  let inTail = false;
  const MAX_REINFORCE = 6;

  // The stage ends when the kid has both dealt enough hits to clear the fleet
  // AND answered the minimum quota (the reinforcement tail in main.js keeps
  // waves coming until the quota is met, so both must be satisfied).
  const CAP_SECONDS = 900; // safety stop

  while (t < CAP_SECONDS) {
    t += DT;


    // Incoming fire from the wave that is currently on screen.
    // Reinforcement waves are HARMLESS — see the reinforcement branch in
    // main.js. They exist to hand out arithmetic after the fleet is dead, and
    // letting them shoot meant a slow kid (who needs many more answers to reach
    // the quota than to clear the fleet) was killed by the epilogue of a stage
    // they had already beaten.
    if (waveLaunched && waveHitsLeft > 0 && !isReinforcement) {
      const w = waveQueue[waveIndex];
      // Vòm Xanh absorbs one hit per wave; approximated as a flat reduction
      // rather than tracked exactly, since the question is survivability.
      const mitigated = Math.max(0, w.dps - (allies >= 3 ? 0.05 : 0));
      hullDamage += mitigated * DT;
      while (hullDamage >= 1) { hullDamage -= 1; hull -= 1; }
    }


    if (hull <= 0) {
      return report('FAILURE');
    }

    // The kid answers. A volley's shots only land if there is something in the
    // lane to hit, so hits are credited against the CURRENT wave.
    if (t >= nextAnswerAt) {
      nextAnswerAt = t + profile.secsPerAnswer;
      asked++;
      if (rng() < profile.accuracy) {
        correct++;
        combo++;
        bestCombo = Math.max(bestCombo, combo);
        // A correct answer patches the hull — the only in-wave recovery there is.
        hullRepair += 0.5;
        while (hullRepair >= 1 && hull < maxHull) { hullRepair -= 1; hull += 1; }
        const shots = volleySize(combo, allies);
        if (waveLaunched && waveHitsLeft > 0) {
          const landed = Math.min(shots, waveHitsLeft);
          waveHitsLeft -= landed;
          hitsDealt += landed;
        }
      } else {
        wrong++;
        combo = 0;
      }
    }


    // WAVE RESOLUTION. The fleet is FINITE: each ship crosses once and either
    // dies or escapes, so escapes are bounded by the ship count.
    //
    // (An early version applied an unbounded per-tick penalty for as long as the
    // kid was behind. That is a death spiral nothing can outrun, and it reported
    // FAILURE even where the stage was clearly winnable — a contradiction that was
    // the tell the MODEL was wrong rather than the tuning. Never let a pessimistic
    // approximation run away; it stops measuring the game and starts measuring
    // itself.)
    if (waveLaunched) {
      const w = waveQueue[waveIndex];
      const resolvedByKills = waveHitsLeft <= 0;
      // A BOSS NEVER TIMES OUT. It holds at standGap instead of flying past, so
      // it cannot escape — the only way past it is to kill it.
      //
      // Treating bosses like creeps (resolved once their transit elapsed) made
      // the simulator time them out, count the whole remaining bar as escapes,
      // and then advance — so a slow kid on stage 21 "dealt 92 hits against a
      // 36-hit fleet with 48 escapes". Impossible numbers are always the tell
      // that the model, not the content, is wrong.
      const resolvedByTime = !w.isBoss && (t - waveStartT >= w.spawnSpan + w.transit);

      if (resolvedByKills || resolvedByTime) {
        // Anything still alive when the wave's transit elapses got through.
        //
        // REINFORCEMENT WAVES DO NOT LEAK. Their whole purpose is to keep
        // handing the kid arithmetic until the stage's quota is met; charging
        // for them turns a courtesy into a punishment, and it compounds
        // — the slowest kid triggers the most reinforcements and so pays the
        // most. With leaking reinforcements the late stages showed 45-50 escapes
        // against 35-hit fleets, which is the tail eating the player alive.
        const leaked = (resolvedByKills || isReinforcement) ? 0 : waveHitsLeft;
        if (leaked > 0) {
          escapedShips += leaked;
          // Escapes cost HULL now, a third of a point each — see ESCAPE_HULL_COST
          // in main.js.
          hullDamage += leaked * ESCAPE_HULL_COST;
        }

        // ADVANCE, OR RE-ARM THE TAIL — never both.
        //
        // This used to do `waveIndex++` first and then, in the reinforcement
        // branch, `waveIndex = lastCreepWave` — which REWINDS the index. The next
        // resolution then incremented from there and walked forward through the
        // remaining real waves a second time, boss included, clearing
        // isReinforcement on the way and re-arming live damage. So the tail
        // replayed the end of the stage instead of dispensing harmless questions.
        //
        // The simulator's tell was hits far past the requirement (43 dealt against
        // 24 needed): the kid was fighting a fleet that had
        // already been destroyed. Once a stage is in its tail it STAYS in the
        // tail, which is what `inTail` enforces.
        if (!inTail && waveIndex + 1 < waveQueue.length) {
          waveIndex++;
          isReinforcement = false;
          waveStartT = t;
          waveHitsLeft = waveQueue[waveIndex].hits;
        } else if (asked < Q.minQuests && reinforcements < MAX_REINFORCE && lastCreepWave >= 0) {
          // The reinforcement tail from main.js: keep waves coming until the kid
          // has answered the promised minimum, so a fast player cannot outrun
          // the curriculum. A third the size of the wave it copies — full-size
          // ones made escapes compound against the slowest player.
          //
          // IT MUST COPY THE LAST *CREEP* WAVE, NEVER A BOSS. Copying "the last
          // wave" meant that on every boss stage, beating the boss respawned a
          // third of the boss — again and again. The simulator surfaced it as an
          // impossible-looking line (64 hits dealt against a 40-hit fleet, and
          // still 25 escapes) which is the signature of something being counted
          // that should not exist. A resurrecting final boss is a real bug, not a
          // simulation artifact; the same guard is in main.js.
          reinforcements++;
          isReinforcement = true;
          inTail = true;
          waveIndex = lastCreepWave;
          waveStartT = t;
          waveHitsLeft = Math.max(1, Math.floor(waveQueue[waveIndex].hits / 3));
        } else {
          waveLaunched = false;
        }
      }
    }

    // Win condition: the fleet is resolved and the quota is met.
    if (!waveLaunched && asked >= Q.minQuests) {
      return report(escapedShips > needHits * 0.5 ? 'OVERRUN' : 'VICTORY');
    }
  }

  return report('TIMEOUT');

  function report(outcome) {
    return {
      outcome,
      profile: profile.name,
      seconds: Math.round(t),
      asked, correct, wrong,
      accuracy: asked ? correct / asked : 0,
      bestCombo,
      hitsDealt,
      hitsNeeded: needHits,
      escapedShips,
      hull,
      // The two ratios that decide whether a stage is fair:
      //   secondsPerAnswerBought = refill / drain — how long one answer buys
      //   affordability = hits the kid can produce / hits the stage demands
      affordability: +(hitsDealt / needHits).toFixed(2),
    };
  }
}

// ---------------------------------------------------------------------------
// Verdicts. These are the assertions verify.js will enforce per stage.
// ---------------------------------------------------------------------------

export function judge(stage, allies = 0, hullBonus = 0) {
  const results = {};
  for (const key of Object.keys(PROFILES)) {
    // Average several seeds so one unlucky accuracy streak does not decide it.
    const runs = [1, 2, 3, 4, 5].map((s) => simulate(stage, PROFILES[key], s * 977, allies, hullBonus));
    const wins = runs.filter((r) => r.outcome === 'VICTORY').length;
    results[key] = { runs, wins, sample: runs[0] };
  }

  const problems = [];

  // 1. The wave budget must be affordable: total hits <= what minQuests can
  //    produce at a realistic average volley.
  const need = stageHits(stage);
  const afford = Math.round(stage.quest.minQuests * volleySize(4, allies));
  if (need > afford) {
    problems.push(
      `waves demand ${need} hits but minQuests ${stage.quest.minQuests} can only ` +
      `produce about ${afford} — the fleet cannot be cleared`);
  }

  // 3. PER-WAVE BUDGET — the invariant the stage total hides.
  //
  // A wave is on screen for (spawnSpan + transit) seconds and then whatever is
  // left escapes. So each wave has its OWN budget, and a stage whose total is
  // affordable can still leak every single wave.
  //
  // This is what actually broke the first 24-stage draft. Stage 2 was 11 hits
  // against 11 affordable — fine on paper — but split into four waves of ~3
  // hits each, and each wave's window gave a slow kid only ~2 answers of which
  // ~1 landed. They could never clear a wave, so all four leaked and the stage
  // was unwinnable for the bottom of the audience while looking perfectly
  // budgeted at the stage level.
  const slow = PROFILES.slow;
  for (const w of stage.waves) {
    const hits = w.phases && w.phases.length
      ? w.phases.reduce((s, p) => s + p.hits, 0) * (w.count || 1)
      : (w.count || 1) * (w.hits || 1);
    const window = (w.count || 1) * (w.gap ?? 0.5) + 500 / (w.speed || 40);
    // Answers a slow kid gets inside the window, and how many actually land.
    const answers = window / slow.secsPerAnswer;
    const landed = answers * slow.accuracy * volleySize(2, allies);
    // Boss waves are exempt: a boss HOLDS at standGap instead of flying past,
    // so it cannot escape and its bar can be worked down over many answers.
    const isBoss = w.formation === 'BOSS' || (w.phases && w.phases.length);
    if (!isBoss && hits > landed * 1.35) {
      problems.push(
        `wave ${w.id} needs ${hits} hits but its ${window.toFixed(0)}s window only lets a slow ` +
        `kid land about ${landed.toFixed(1)} — it will leak every run ` +
        `(slow the wave, shrink it, or fold it into another)`);
    }
  }

  // 4. A slow kid must be able to finish. This is the audience floor, and the
  //    single most important assertion here: a stage the bottom of the audience
  //    cannot clear is not a hard stage, it is a broken one.
  if (results.slow.wins < 3) {
    const s = results.slow.sample;
    problems.push(
      `the SLOW profile won only ${results.slow.wins}/5 runs ` +
      `(${s.outcome} at ${s.seconds}s, ${s.hitsDealt}/${s.hitsNeeded} hits, ` +
      `${s.escapedShips} escaped, hull ${s.hull}) — too punishing for the audience`);
  }

  // 5. A fast kid must still be asked the promised number of questions — the
  //    curriculum must not be skippable by speed.
  if (results.fast.sample.asked < stage.quest.minQuests) {
    problems.push(
      `the FAST profile answered only ${results.fast.sample.asked} of ` +
      `${stage.quest.minQuests} promised quests`);
  }

  return { results, problems, ok: problems.length === 0 };
}

// ---------------------------------------------------------------------------
// CLI — judges every stage in stages.js.
//
//   node js/balance.js              # summary table for all stages
//   node js/balance.js 14           # detail for one stage (by 1-based id)
//   node js/balance.js --json
//
// stages.js is imported directly rather than mirrored here. An earlier version
// kept an inline copy of the stage and the two drifted immediately; a simulator
// validating a stage the game does not actually play is worse than none.
// ---------------------------------------------------------------------------

// `process` does not exist in a browser, and this module is imported by
// stages-preview.html for its judge()/volleySize() exports. Touching
// process.argv unguarded threw at module scope and blanked the whole page — a
// Node-only CLI block inside a browser-importable module has to check first.
const isNode = typeof process !== 'undefined' && !!process.argv;
const isMain = isNode && process.argv[1] && process.argv[1].endsWith('balance.js');
if (isMain) {
  const { STAGES } = await import('./stages.js');
  const asJson = process.argv.includes('--json');
  const only = process.argv.slice(2).find((a) => /^\d+$/.test(a));

  const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', D = '\x1b[2m', X = '\x1b[0m';

  if (asJson) {
    const rows = STAGES.filter((s) => !only || s.id === Number(only))
      .map((s, i) => ({ id: s.id, name: s.name, ...judge(s, alliesByStage(STAGES, STAGES.indexOf(s)), hullBonusByStage(STAGES, STAGES.indexOf(s))) }));
    console.log(JSON.stringify(rows, null, 2));
  } else if (only) {
    const stage = STAGES.find((s) => s.id === Number(only));
    if (!stage) { console.log(`no stage ${only}`); process.exit(1); }
    const v = judge(stage, alliesByStage(STAGES, STAGES.indexOf(stage)), hullBonusByStage(STAGES, STAGES.indexOf(stage)));
    console.log(`\n  ${stage.name} — stage ${stage.id} (${stage.biome})`);
    console.log(`  ${D}quest budget ${stage.quest.timePerQuest}s · tier ${stage.quest.tier} · fleet ${stageHits(stage)} hits · minQuests ${stage.quest.minQuests} · hull ${6 + hullBonusByStage(STAGES, STAGES.indexOf(stage))}${X}\n`);
    const head = ['profile', 'wins', 'outcome', 'secs', 'asked', 'acc', 'combo', 'hits', 'esc', 'hull'];
    console.log('  ' + head.map((h) => h.padEnd(8)).join(''));
    for (const key of ['slow', 'typical', 'fast']) {
      const r = v.results[key];
      const s = r.sample;
      const color = r.wins >= 4 ? G : r.wins >= 3 ? Y : R;
      console.log('  ' + color + [
        key, `${r.wins}/5`, s.outcome, String(s.seconds), String(s.asked),
        `${Math.round(s.accuracy * 100)}%`, `x${s.bestCombo}`,
        `${s.hitsDealt}/${s.hitsNeeded}`, String(s.escapedShips),
        String(s.hull),
      ].map((c) => String(c).padEnd(8)).join('') + X);
    }
    console.log('');
    if (v.ok) console.log(`  ${G}✓ playable for all three profiles${X}\n`);
    else { for (const p of v.problems) console.log(`  ${R}✗ ${p}${X}`); console.log(''); process.exitCode = 1; }
  } else {
    console.log(`\n  ${D}stage                       tier hits minQ ally slow typ  fast${X}`);
    const problems = [];
    for (const stage of STAGES) {
      const allies = alliesByStage(STAGES, STAGES.indexOf(stage));
      const v = judge(stage, allies, hullBonusByStage(STAGES, STAGES.indexOf(stage)));
      const w = (k) => v.results[k].wins;
      const col = (k) => (w(k) >= 4 ? G : w(k) >= 3 ? Y : R);
      const nm = `${String(stage.id).padStart(2)} ${stage.name}`.slice(0, 27).padEnd(27);
      console.log(
        `  ${nm} ${String(stage.quest.tier).padEnd(4)} ${String(stageHits(stage)).padEnd(4)} ` +
        `${String(stage.quest.minQuests).padEnd(4)} ${String(allies).padEnd(4)} ` +
        `${col('slow')}${w('slow')}/5${X}  ${col('typical')}${w('typical')}/5${X}  ${col('fast')}${w('fast')}/5${X}`);
      if (!v.ok) problems.push([stage.id, stage.name, v.problems]);
    }
    console.log('');
    if (problems.length === 0) {
      console.log(`  ${G}✓ all ${STAGES.length} stages playable for all three profiles${X}\n`);
    } else {
      console.log(`  ${R}✗ ${problems.length} of ${STAGES.length} stages fail${X}`);
      for (const [id, name, ps] of problems) {
        console.log(`  ${R}stage ${id} — ${name}${X}`);
        for (const p of ps) console.log(`      ${p}`);
      }
      console.log('');
      process.exitCode = 1;
    }
  }
}
