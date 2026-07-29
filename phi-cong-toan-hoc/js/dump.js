// dump.js — read-only inspector for the hand-authored content.
//
// WHY THIS EXISTS. Editing stages.js with ad-hoc regex passes lost track of state
// more than once, and one pass *raised* boss bars that were meant to fall. The
// lesson recorded in CLAUDE.md is "dump the numbers, then edit deliberately" — but
// there was no way to dump them except reading ~550 lines of blueprint and holding
// it in your head, which is exactly the failure mode.
//
// So: this prints the numbers you are about to change, in a form you can diff by eye
// or with `diff`. It computes NOTHING about playability — balance.js owns that. This
// only reports what the data currently says.
//
//   node js/dump.js waves            # every stage's wave composition
//   node js/dump.js quests           # the difficulty curve: tier, ops, timing
//   node js/dump.js bosses           # boss bars and phases, in stage order
//   node js/dump.js enemies          # roster + which biomes may field each ship
//   node js/dump.js biomes           # planet/landmark/weather per biome
//   node js/dump.js rewards          # upgrade and ally grants per stage
//   node js/dump.js all
//
// Diff-friendly by design: one fact per line, stable ordering, no colour. To check a
// refactor changed nothing, `node js/dump.js all > before.txt`, edit, then diff.

import { STAGES } from './stages.js';
import { CHAPTERS } from './chapters.js';
import { ENEMIES, BIOME_ENEMIES } from './enemies.js';
import { BIOMES } from './biomes.js';
import { UPGRADES, upgradeForStage } from './upgrades.js';
import { ALLIES } from './allies.js';

const pad = (s, n) => String(s ?? '').padEnd(n);
const num = (s, n) => String(s ?? '').padStart(n);

function head(title) {
  console.log('');
  console.log('=== ' + title + ' ' + '='.repeat(Math.max(0, 74 - title.length)));
}

// Total landed shots a stage demands — the number a kid's answers must cover.
function stageHits(st) {
  let hits = 0;
  for (const w of st.waves) {
    const per = w.hits || 1;
    const n = w.count || 1;
    if (w.phases && w.phases.length) {
      hits += w.phases.reduce((a, p) => a + (p.hits || 0), 0);
    } else {
      hits += per * n;
    }
  }
  return hits;
}

function dumpWaves() {
  head('WAVES — composition per stage. hits = landed shots the fleet demands.');
  console.log(pad('#', 4) + pad('stage', 26) + num('waves', 6) + num('ships', 6) +
    num('hits', 6) + num('quests', 7) + '  detail');
  for (let i = 0; i < STAGES.length; i++) {
    const st = STAGES[i];
    const ships = st.waves.reduce((a, w) => a + (w.count || 1), 0);
    const detail = st.waves.map((w) => {
      const tag = w.phases && w.phases.length ? 'BOSS' : (w.formation || '?');
      const bits = [`${tag}x${w.count || 1}`];
      if (w.hits && w.hits > 1) bits.push(`h${w.hits}`);
      if (w.speed) bits.push(`v${w.speed}`);
      if (w.fireEvery) bits.push(`f${w.fireEvery}`);
      if (w.reinforcement) bits.push('reinf');
      return bits.join('/');
    }).join('  ');
    console.log(pad(i + 1, 4) + pad(st.name, 26) + num(st.waves.length, 6) +
      num(ships, 6) + num(stageHits(st), 6) +
      num(st.quest?.minQuests ?? '-', 7) + '  ' + detail);
  }
}

function dumpQuests() {
  head('QUESTS — the difficulty curve. tier MUST be non-decreasing (asserted).');
  console.log(pad('#', 4) + pad('stage', 26) + num('tier', 5) + num('opts', 6) +
    num('secs', 6) + num('min', 5) + '  ops');
  let prevTier = -Infinity;
  for (let i = 0; i < STAGES.length; i++) {
    const st = STAGES[i];
    const q = st.quest || {};
    const flag = q.tier < prevTier ? '  <-- TIER WENT DOWN' : '';
    prevTier = q.tier;
    console.log(pad(i + 1, 4) + pad(st.name, 26) + num(q.tier, 5) +
      num(q.answerCount, 6) + num(q.timePerQuest, 6) + num(q.minQuests, 5) +
      '  ' + (q.opsAllowed || ['(all)']).join(',') + flag);
  }
}

function dumpBosses() {
  head('BOSSES — bars and phases in stage order. Watch for a bar that RISES');
  console.log('    when it was meant to fall; a regex pass did exactly that once.');
  console.log('');
  console.log(pad('#', 4) + pad('stage', 26) + pad('enemy', 18) +
    num('total', 6) + '  phases (hits/shielded/fireEvery)');
  for (let i = 0; i < STAGES.length; i++) {
    const st = STAGES[i];
    for (const w of st.waves) {
      const isBoss = (w.phases && w.phases.length) || w.formation === 'BOSS';
      if (!isBoss) continue;
      const phases = (w.phases || []).map((p) =>
        `${p.hits}${p.shielded ? '/shield' : ''}${p.fireEvery ? '/f' + p.fireEvery : ''}`);
      const total = (w.phases || []).reduce((a, p) => a + (p.hits || 0), 0) || (w.hits || 0);
      console.log(pad(i + 1, 4) + pad(st.name, 26) + pad(w.enemy || w.enemyId || '?', 18) +
        num(total, 6) + '  ' + (phases.join('  ') || '(single bar)'));
    }
  }
}

function dumpEnemies() {
  head('ENEMIES — roster, and which biomes may field each ship.');
  const where = {};
  for (const [biome, list] of Object.entries(BIOME_ENEMIES || {})) {
    for (const id of list) (where[id] ||= []).push(biome);
  }
  // The roster holds IDENTITY (name, sprite, tier, base speed); per-encounter stats
  // like hits and fireEvery live in the wave blueprints in stages.js. That
  // separation is deliberate — the same ship is a pushover in ch.1 and a wall in
  // ch.3 — so this table shows identity and points you at `dump.js waves` for the
  // numbers that vary.
  console.log(pad('id', 14) + pad('name', 16) + pad('sprite', 16) +
    num('tier', 5) + num('baseSpeed', 10) + '  biomes');
  for (const [id, e] of Object.entries(ENEMIES)) {
    console.log(pad(id, 14) + pad(e.name || '-', 16) + pad(e.sprite || '-', 16) +
      num(e.tier ?? '-', 5) + num(e.baseSpeed ?? '-', 10) +
      '  ' + (where[id] || ['(UNROSTERED)']).join(','));
  }
}

function dumpBiomes() {
  head('BIOMES — planet radius scales with FIELD HEIGHT, never canvas width.');
  console.log(pad('id', 16) + pad('planet', 34) + pad('landmark', 12) +
    pad('prisoner', 11) + pad('weather', 12) + 'darkStar/earthSpeck');
  for (const [id, b] of Object.entries(BIOMES)) {
    const p = b.planet
      ? `${b.planet.kind} sz${b.planet.size} lift${b.planet.lift} spin${b.planet.spin ?? '-'}`
      : '-';
    const extra = [
      b.darkStar ? `dark sz${b.darkStar.size}` : null,
      b.earthSpeck ? `earth sz${b.earthSpeck.size}` : null,
    ].filter(Boolean).join(' ') || '-';
    console.log(pad(id, 16) + pad(p, 34) + pad(b.landmark || '-', 12) +
      pad(b.prisoner || '-', 11) + pad(b.weather || '-', 12) + extra);
  }
}

function dumpRewards() {
  head('REWARDS — one per stage. upgradeForStage wraps modulo, so a short list');
  console.log('    silently re-grants early gear (asserted, but check the pattern).');
  console.log('');
  console.log(pad('#', 4) + pad('stage', 26) + pad('reward id', 18) +
    pad('type', 10) + 'name');
  for (let i = 0; i < STAGES.length; i++) {
    const st = STAGES[i];
    const id = st.reward ?? (upgradeForStage ? upgradeForStage(i)?.id : null);
    const u = UPGRADES[id];
    const ally = u && u.type === 'ally'
      ? (ALLIES.find((a) => a.id === u.ally || a.id === id)?.name ?? '')
      : '';
    console.log(pad(i + 1, 4) + pad(st.name, 26) + pad(id ?? '-', 18) +
      pad(u?.type ?? '-', 10) + (u?.name ?? '') + (ally ? ` (${ally})` : ''));
  }
}

function dumpChapters() {
  head('CHAPTERS — ranges must TILE the flat STAGES list exactly.');
  let expect = 0;
  for (const c of CHAPTERS) {
    const gap = c.stageStart !== expect ? `  <-- GAP, expected start ${expect}` : '';
    console.log(`ch${c.id}  ${pad(c.name, 22)} stages ${num(c.stageStart + 1, 3)}-` +
      `${num(c.stageStart + c.stageCount, 3)}  (count ${c.stageCount})${gap}`);
    expect = c.stageStart + c.stageCount;
  }
  const tail = expect !== STAGES.length
    ? `  <-- does NOT reach STAGES.length (${STAGES.length})` : '  (tiles exactly)';
  console.log(`total covered: ${expect}${tail}`);
}

const WHAT = {
  waves: dumpWaves, quests: dumpQuests, bosses: dumpBosses,
  enemies: dumpEnemies, biomes: dumpBiomes, rewards: dumpRewards,
  chapters: dumpChapters,
};

const arg = (process.argv[2] || 'all').toLowerCase();
if (arg === 'all') {
  dumpChapters(); dumpQuests(); dumpWaves(); dumpBosses();
  dumpRewards(); dumpEnemies(); dumpBiomes();
} else if (WHAT[arg]) {
  WHAT[arg]();
} else {
  console.log('usage: node js/dump.js [' + Object.keys(WHAT).join('|') + '|all]');
  process.exit(1);
}
