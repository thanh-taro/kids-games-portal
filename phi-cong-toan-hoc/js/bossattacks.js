// bossattacks.js — boss firing patterns.
//
// Creeps fire one shot straight down on a timer. Bosses need to be READ
// differently from each other, and a boss that fires the same single bolt as a
// dart is just a dart with more hit points.
//
// THE HARD CONSTRAINT, and it shapes every pattern here: THE KID CANNOT DODGE.
// The ship holds near the bottom and drifts on its own; there is no steering.
// So a pattern's job is NOT to be evaded — it is to be legible. Incoming fire
// must read as "the boss is doing its thing" and cost the kid hull at a rate
// the energy economy can absorb, never as an unfair spike they had no answer to.
//
// That rules out everything a normal shooter would do here: no aimed shots that
// track the ship, no dense curtains, no unreadable spam. What is left is
// patterns that differ in SHAPE and RHYTHM:
//
//   single   — one bolt. The chapter-1 baseline.
//   twin     — two bolts side by side, one volley.
//   spread   — three bolts fanning outward. Wide but sparse.
//   volley   — a short burst of three in quick succession from one point.
//   sweep    — bolts released across the boss's width, left to right.
//   ring     — bolts outward in a circle; only the lower arc can reach the kid,
//              so it looks enormous and lands about as much as `spread`.
//
// PROJECTILE COUNT IS CAPPED per pattern rather than per shot, because the
// balance simulator models boss damage as `fireEvery / fireDamage` — a pattern
// that quietly emitted six damaging bolts per cycle would break every stage's
// tuning without changing a single number in stages.js.

import { Projectile } from './entities.js';
import { SPRITES } from './sprites.js';

// Which pattern each boss uses. Keyed by the enemy id in enemies.js.
//
// The progression is deliberate: chapter 1's Commander fires the same single
// bolt the kid has been dodging all chapter (so the FIRST boss is readable),
// and each later boss adds one new shape. By the Destroyer the kid has seen
// every pattern in the game once.
export const BOSS_PATTERNS = {
  commander: 'twin',      // ch.1 finale — twin engines, twin guns
  jailer: 'spread',       // ch.2 prisons — a warden sweeping a cell block
  warden: 'volley',       // heavier: a burst rather than a spray
  twin: 'sweep',          // two unequal engines, firing across its width
  destroyer: 'ring',      // the final boss, and the only ring in the game
};

// Per-pattern shot budget. `n` is how many projectiles one cycle emits, and
// `reach` is roughly how many of them can actually threaten the ship — the
// number the energy economy is tuned against.
const PATTERN_SPEC = {
  single: { n: 1, reach: 1 },
  twin: { n: 2, reach: 2 },
  spread: { n: 3, reach: 2 },
  volley: { n: 3, reach: 3 },
  sweep: { n: 4, reach: 2 },
  ring: { n: 8, reach: 3 },
};

export function patternFor(enemyId) {
  return BOSS_PATTERNS[enemyId] || 'single';
}

export function patternSpec(name) {
  return PATTERN_SPEC[name] || PATTERN_SPEC.single;
}

// Build one cycle of a pattern.
//
// Returns an array of Projectiles. Some carry a `delay` (seconds) so a `volley`
// or `sweep` staggers in time; main.js holds them in a queue and releases each
// when its delay elapses. Doing it that way rather than with per-boss timers
// keeps all the timing in one readable place.
export function bossFire(boss, pattern, m) {
  const sprite = boss.tier >= 3 ? SPRITES.shot_enemy_heavy : SPRITES.shot_enemy;
  const dmg = boss.fireDamage || 1;
  const x = boss.x;
  const y = boss.y + boss.halfH * 0.6;
  const out = [];

  const make = (px, py, vx, vy, delay = 0) => {
    const p = new Projectile({
      x: px, y: py, vy, sprite, damage: dmg, friendly: false,
      scale: boss.tier >= 3 ? 1.2 : 1,
    });
    p.vx = vx;
    p.delay = delay;
    out.push(p);
    return p;
  };

  switch (pattern) {
    case 'twin':
      make(x - 22, y, 0, 200);
      make(x + 22, y, 0, 200);
      break;

    case 'spread':
      // Sparse on purpose: the outer two drift wide and usually miss, which is
      // what keeps a three-bolt attack inside the damage budget.
      make(x, y, 0, 210);
      make(x, y, -70, 190);
      make(x, y, 70, 190);
      break;

    case 'volley':
      // Same point, three beats. The rhythm is the tell — a kid hears three
      // sounds and knows this boss hits harder than it looks.
      make(x, y, 0, 230, 0);
      make(x, y, 0, 230, 0.18);
      make(x, y, 0, 230, 0.36);
      break;

    case 'sweep': {
      // Released across the boss's own width, left to right, so the attack
      // visibly belongs to the whole hull rather than a single muzzle.
      const span = boss.halfW * 1.2;
      for (let i = 0; i < 4; i++) {
        const f = i / 3;
        make(x - span + f * span * 2, y, 0, 200, i * 0.12);
      }
      break;
    }

    case 'ring': {
      // The Galaxy Destroyer only. A FAN across the lower half, not a full
      // circle.
      //
      // A true 360-degree ring looked spectacular and did literally nothing:
      // measured in the real game, 60 seconds of standing still under this boss
      // cost ZERO hull. Half the bolts flew upward and off the top, and the
      // near-horizontal ones (±120 px/s across vs 46 down) exited the sides
      // before they had descended 100px. Two of eight survived, both heading
      // away. That is the shape of the trap: radial patterns look enormous and
      // land nothing, because the only direction that matters here is DOWN.
      //
      // So: eight bolts fanned between roughly 40 and 140 degrees — all of them
      // travelling downward, the outer ones angled but still falling faster than
      // they spread. Still the widest attack in the game, and now it can
      // actually be paid for.
      const n = 8;
      const speed = 190;
      for (let i = 0; i < n; i++) {
        // 0.22π .. 0.78π — a downward fan, never sideways or up.
        const a = Math.PI * (0.22 + (i / (n - 1)) * 0.56);
        make(x, y, Math.cos(a) * speed * 0.55, Math.sin(a) * speed);
      }
      break;
    }

    case 'single':
    default:
      make(x, y, 0, 210);
      break;
  }

  void m;
  return out;
}
