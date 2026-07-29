// entities.js — the things that live in the play field.
//
// The play field is VERTICAL: enemies enter at the top and descend, the kid's
// ship holds near the bottom (see LAYOUT in render.js). Nothing here reads the
// canvas size directly — main.js passes the resolved metrics in, so the whole
// game rescales from LAYOUT alone.
//
// The kid never steers. The ship drifts on its own and fires when a quest is
// answered correctly; math is the only verb. That is why Ship has no input
// handling at all — `fire()` is called by main.js in response to an answer,
// never by a key.

import { SPRITES } from './sprites.js';
import { DOT } from './render.js';

// ---------------------------------------------------------------------------
// Projectile — both the kid's shots (travelling up) and enemy fire (down).
// ---------------------------------------------------------------------------

export class Projectile {
  constructor({ x, y, vy, sprite, damage = 1, friendly = true, scale = 1, piercing = false, empowered = false, homing = false, tint = null }) {
    this.x = x;
    this.y = y;
    this.vy = vy;              // px/sec; negative = travelling up
    this.vx = 0;
    this.sprite = sprite;
    this.damage = damage;
    this.friendly = friendly;
    this.scale = scale;
    this.piercing = piercing;  // passes through instead of despawning on hit
    this.empowered = empowered; // the ultimate — pierces shielded boss phases
    this.homing = homing;      // Tên Lửa Dò — steers toward the nearest live enemy
    this.target = null;        // locked on acquisition — see update()
    // Several weapon upgrades (weapon2, weapon3/4/5, weapon6/7) reuse an
    // existing shot sprite and are meant to read as a new weapon purely by
    // colour — the tint IS the upgrade's only visual signal for those tiers.
    this.tint = tint;
    this.dead = false;
    this.hitIds = new Set();   // for piercing shots: don't hit the same enemy twice
    this.isLeadHit = true;     // a volley marks only one shot as the "real" hit
    this.age = 0;
    this.trailTick = 0;        // per-shot, so a fanned volley trails every line
  }

  // `enemies` is optional so every non-homing caller (enemy fire, ally shots)
  // is unaffected. Speed is held constant — only direction turns — so homing
  // shots reach the top of the field in the same time a straight shot would,
  // which keeps balance.js's hit-timing model unchanged.
  //
  // SEEK_WINDOW caps how long a shot chases. Without it a locked missile
  // steers for its entire flight, so it lands 100% of the time whenever any
  // enemy is anywhere in the field — strictly better than every other weapon
  // with no downside, and it quietly breaks balance.js's assumption that a
  // volley's shots only land if something is actually in the lane. Past the
  // window the shot stops acquiring/steering and coasts straight on its
  // current heading, same as an ordinary shot — it can still connect if that
  // heading happens to cross an enemy, it just isn't guided into one anymore.
  update(dt, enemies = null) {
    const SEEK_WINDOW = 0.6; // seconds of guidance after firing
    if (this.homing && enemies && enemies.length && this.age < SEEK_WINDOW) {
      // LOCK ON ONCE, then keep flying at that same ship. Re-picking "the
      // nearest enemy" every frame let the lock jump to whichever ship
      // happened to be momentarily closest — including one still converging
      // into the firing lane (see Enemy.update's convergence) — so the
      // missile kept re-aiming instead of committing, which reads as the
      // missile stalling and waiting for a target to arrive rather than
      // flying at one. Only re-acquire when the locked target is gone.
      if (!this.target || this.target.dead) {
        let nearest = null;
        let bestD2 = Infinity;
        for (const e of enemies) {
          if (e.dead) continue;
          const dx = e.x - this.x;
          const dy = e.y - this.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestD2) { bestD2 = d2; nearest = e; }
        }
        this.target = nearest;
      }
      const target = this.target;
      if (target) {
        const speed = Math.hypot(this.vx, this.vy) || -this.vy;
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        // Steer velocity toward the target at a finite turn rate, so a shot
        // already fanned wide visibly curves in rather than snapping straight
        // at it — reads as guided, not teleported.
        const turnRate = 6; // 1/sec — most of a 90° turn completes in ~0.25s
        const desiredVx = (dx / dist) * speed;
        const desiredVy = (dy / dist) * speed;
        this.vx += (desiredVx - this.vx) * Math.min(1, turnRate * dt);
        this.vy += (desiredVy - this.vy) * Math.min(1, turnRate * dt);
      }
    }
    this.y += this.vy * dt;
    this.x += this.vx * dt;
    this.age += dt;
  }

  // Off the top or bottom of the play field.
  offscreen(m) {
    return this.y < m.playTop - 40 || this.y > m.playBottom + 40;
  }
}

// ---------------------------------------------------------------------------
// Ship — the kid's spaceship, "Tia Sáng".
//
// Holds a horizontal drift so the screen is never static, but stays inside a
// narrow band around center: a ship that wandered far would make the wingman
// line-up (chapter 2) read as a loose crowd rather than a formation.
// ---------------------------------------------------------------------------

export class Ship {
  constructor() {
    this.x = 0;               // set by main.js from metrics
    this.y = 0;
    this.scale = 1.6;
    this.maxHull = 6;
    this.hull = 6;
    this.flash = 0;           // white hit-flash timer
    this.driftT = 0;
    this.weapon = {           // replaced by upgrades.js in later phases
      id: 'plasma1',
      damage: 1,
      shots: 1,
      spread: 0,
      speed: 620,
      sprite: 'shot_plasma',
      tint: '#7fffd4',
    };
    this.invuln = 0;          // brief mercy window after a hit
  }

  place(m) {
    this.x = m.cx;
    this.y = m.shipY;
    this.homeX = m.cx;
  }

  update(dt, m) {
    this.driftT += dt;
    // Gentle sine drift, so the scene is never static.
    //
    // The AMPLITUDE is deliberately small and, crucially, capped in PIXELS rather
    // than left as a pure fraction of width. At 3% of a 1500px window the ship
    // travelled 45px while an incoming shot was in flight (shots take >2s to cross
    // the field), which was enough to walk out from under fire aimed straight at
    // it — measured in-game, a shot fired from directly overhead arrived 41px to
    // one side and missed both the dome band and the hull box. Incoming fire was
    // dodging itself.
    //
    // 18px is still visibly alive and is inside the ship's own hit box, so a shot
    // aimed at the ship still connects.
    const amp = Math.min(m.w * 0.03, 18);
    this.x = this.homeX + Math.sin(this.driftT * 0.6) * amp;
    if (this.flash > 0) this.flash -= dt;
    if (this.invuln > 0) this.invuln -= dt;
  }

  // Spawn this weapon's volley. Called by main.js on a correct answer.
  //
  // EVERY SHOT SPAWNS AT THE NOSE. Only `vx` fans the volley as it travels — the
  // shots must visibly come FROM the ship, not appear already spread across the
  // field. `spawnSpread` is a small fixed offset that exists only so overlapping
  // sprites don't draw as one blob at the muzzle; it does not grow with the
  // volley's width, unlike the old per-shot `off * 14`, which at the top combo
  // tiers would have spawned the flanking shots hundreds of px from the ship.
  //
  // `fieldW` (the play field's width in px) is what lets the top combo tier fan a
  // volley all the way to the screen edges rather than a fixed px spread — a fixed
  // number reads as "wide" on a phone and "barely fanned" on a desktop window.
  // `travelPx` is the vertical distance to the top of the field, so vx can be
  // sized to finish the fan exactly as the volley reaches the top rather than
  // over/undershooting on a short vs. tall window. Both optional so a caller
  // that doesn't care about the top tier (none currently) still works.
  fire(empowered = false, fieldW = 0, travelPx = 0, homing = false) {
    const out = [];
    const w = this.weapon;
    const raw = empowered ? Math.max(3, w.shots) : w.shots;
    // ODD SHOT COUNTS ONLY. `baseShots` (1 + upgrades + ally rescues) and the
    // combo ladder in main.js's pickAnswer() can each land on an even total —
    // an even n fires no true center shot (see the -(n-1)/2 fan below), which
    // reads as a hole aimed straight down the kid's own lane. Rounding up to
    // the next odd number keeps a guaranteed center shot and equal flanks on
    // both sides for every n, at the cost of at most one extra shot.
    const n = raw % 2 === 0 ? raw + 1 : raw;
    // spreadPx is the total width, EDGE TO EDGE, the fanned shots reach by the
    // top of the field — not a per-shot increment. Dividing by (n-1) below is
    // what makes wider volleys (more shots) still reach the same edges instead
    // of fanning out further.
    const maxSpreadPx = fieldW > 0 ? fieldW * 0.86 : 340;
    // The ultimate must never fan NARROWER than the combo tier already firing —
    // by the time 5 clean answers charge it, combo (and w.spread) is usually well
    // past the 220 floor here, and a wide creep formation (GRID/SWARM/ARC can
    // spread past 900px) that hasn't finished CONVERGING toward the lane yet sat
    // outside a hard-capped 220px volley. Shots flew straight up an empty
    // corridor and never entered a flanking ship's hit box — the "ultimate did
    // nothing" bug. 220 is now only a FLOOR, for when the ultimate fires at low
    // combo.
    const spreadPx = empowered
      ? Math.min(Math.max(w.spread, 220), maxSpreadPx)
      : Math.min(w.spread, maxSpreadPx);
    const spawnSpread = Math.min(14, spreadPx * 0.2);
    const travel = travelPx > 0 ? travelPx : this.y;
    // The volley always includes a true straight-up center shot. `n` is forced
    // odd above, so every shot sits at an INTEGER step from the nose
    // (…,-2,-1,0,1,2,…) with one shot always landing exactly on 0 and equal
    // counts fanned to each side — a hole down the kid's own lane (where
    // enemies converge, see Enemy.update) would otherwise be unhittable.
    const half = (n - 1) / 2;
    const norm = Math.max(1, Math.ceil(half));
    for (let i = 0; i < n; i++) {
      const off = (i - Math.floor(half)) / norm;
      const p = new Projectile({
        x: this.x + off * spawnSpread,
        y: this.y - 26,
        vy: -w.speed,
        sprite: SPRITES[w.sprite] || SPRITES.shot_plasma,
        damage: w.damage + (empowered ? 3 : 0),
        friendly: true,
        scale: empowered ? 1.8 : 1,
        empowered,
        homing,
        tint: w.tint,
      });
      // vx carries each shot the rest of the way to its lane over the flight to
      // the top of the field, so the fan finishes opening right as the volley
      // reaches the top rather than snapping wide immediately.
      p.vx = off * spreadPx * (w.speed / Math.max(1, travel));
      p.isLeadHit = i === 0;
      out.push(p);
    }
    return out;
  }

  takeDamage(n = 1) {
    if (this.invuln > 0) return false;
    this.hull = Math.max(0, this.hull - n);
    this.flash = 0.18;
    this.invuln = 0.6;
    return true;
  }

  get isDead() {
    return this.hull <= 0;
  }
}

// ---------------------------------------------------------------------------
// Enemy — a monstership. Descends from the top on a path set by its formation.
//
// `hits` is how many landed shots it takes, NOT hit points in a damage sense:
// one correct answer fires one volley, so hits ≈ questions. That equivalence is
// what lets verify.js compute a stage's quest capacity from its blueprint.
// ---------------------------------------------------------------------------

export const ENEMY_KIND = {
  CREEP: 'creep',       // descends, dies, maybe shoots
  ELITE: 'elite',       // tougher, holds position longer
  BOSS: 'boss',         // stationary at standGap, multi-phase capable
};

export class Enemy {
  constructor({ id, kind = ENEMY_KIND.CREEP, sprite, x, y, hits = 1, speed = 40,
                scale = 1.3, color = '#e0503a', weave = 'none', weaveAmp = 0,
                weavePhase = 0, standGap = 0, fireEvery = 0, fireDamage = 1,
                phases = null, converge = 1.6, reinforcement = false,
                tier = 1, enemyId = null, laneOffset = 0 }) {
    this.id = id;
    this.kind = kind;
    this.sprite = sprite;
    this.x = x;
    this.spawnX = x;
    this.y = y;
    this.hits = hits;
    this.hitsLeft = hits;
    this.speed = speed;
    this.scale = scale;
    this.color = color;
    this.weave = weave;
    this.weaveAmp = weaveAmp;
    this.weavePhase = weavePhase;
    this.standGap = standGap;   // for BOSS/ELITE: stop at this y and hold
    // How strongly this ship funnels into the kid's firing lane — see update().
    // Bosses hold at standGap and are drawn wide enough to be hittable where
    // they stand, so they pass converge: 0.
    this.converge = converge;
    // A small, fixed per-ship offset from the lane's centre (see spawnEnemy in
    // main.js) — otherwise every ship in a wave converges on the exact same
    // x, and a wave of several ships reads as one overlapping blob by the
    // time it reaches the ship. Small enough to stay inside the volley's
    // spread at any combo tier (Ship.fire's spreadPx), so nothing becomes
    // unhittable — it only keeps siblings visually apart.
    this.laneOffset = laneOffset;
    // Reinforcement-tail ships cost no energy when they slip past.
    this.reinforcement = reinforcement;
    this.tier = tier;          // death-explosion size
    this.enemyId = enemyId;    // for boss firing-pattern lookup
    this.fireEvery = fireEvery;
    this.fireTimer = fireEvery > 0 ? fireEvery * 0.6 : 0;
    this.fireDamage = fireDamage;

    // Multi-phase bosses (the Galaxy Destroyer). A phase running to zero
    // ADVANCES rather than killing — see registerHit.
    this.phases = phases;
    this.phaseIndex = 0;
    if (phases && phases.length) {
      this.hits = phases[0].hits;
      this.hitsLeft = phases[0].hits;
      this.shielded = !!phases[0].shielded;
      if (phases[0].fireEvery) this.fireEvery = phases[0].fireEvery;
    }

    this.flash = 0;
    this.knock = 0;      // knockback offset, decays
    this.t = 0;
    this.dead = false;

    // KAMIKAZE DIVE. A monstership that gets past the fleet does not quietly
    // exit the bottom of the screen — it banks into the ship and detonates.
    //
    // This exists for LEGIBILITY, not difficulty. The cost is identical either
    // way (ESCAPE_HULL_COST, a third of a point), but a bar that moved because
    // something left the screen far away is unexplainable to a 6-year-old: the
    // kid's model is "they shoot me, I get hurt", and a silent exit that hurts
    // breaks it. A ship that visibly turns, closes, and explodes ON the hull
    // needs no explanation at all — the impact IS the explanation.
    //
    // `diving` is set once and never cleared, so the turn cannot be re-triggered
    // frame to frame; `dived` marks the detonation as spent so main.js charges
    // for it exactly once.
    this.diving = false;
    this.dived = false;
    this.diveDelay = 0;   // staggers a whole wave's dives — see startDive()
  }

  // `laneX` is the column the kid's shots actually travel up — the SHIP's x,
  // not the screen centre. The ship drifts a few percent of the width to keep
  // the scene alive, and converging on m.cx instead left enemies parked ~40px
  // to one side of every volley: close enough to look like a hit, far enough to
  // never connect.
  // `laneSpread` is the kid's CURRENT volley width in px (ship.weapon.spread —
  // 0 below combo 3, up to 900 at the top combo tier). The lane offset scales
  // with it: tiny while the volley is a single dead-centre shot (so nothing
  // becomes unhittable), much wider once the volley fans out, so a big wave
  // that survives to the final approach spreads out instead of stacking into
  // one shape — the fix for enemies visually "merging into one" near the ship.
  update(dt, m, laneX = m.cx, shipY = m.shipY, laneSpread = 0) {
    this.t += dt;

    // A DIVING ship ignores formation, weave and convergence entirely — it has
    // one job. It holds for diveDelay first so a wave that all crosses the line
    // together arrives as a readable sequence of impacts rather than one frame
    // of eight simultaneous explosions.
    if (this.diving) {
      if (this.diveDelay > 0) {
        this.diveDelay -= dt;
        // Drift on gently while waiting, so a held ship is not frozen mid-air.
        this.y += this.speed * 0.35 * dt;
        this.x = this.spawnX;
        if (this.flash > 0) this.flash -= dt;
        return;
      }
      // Accelerate into the target. The turn is sharp (8/sec toward the lane)
      // because the ship is only ~40px away by now — convergence has already
      // funnelled it into the firing column, so this reads as a committed lunge
      // rather than a long chase across the screen.
      this.diveSpeed = Math.min(this.diveSpeed + 160 * dt, 165);
      this.spawnX += (laneX - this.spawnX) * Math.min(1, 8 * dt);
      this.x = this.spawnX;
      this.y += this.diveSpeed * dt;
      if (this.flash > 0) this.flash -= dt;
      return;
    }

    // Descend, unless holding at standGap (bosses/elites).
    const holdY = this.standGap > 0 ? m.playTop + this.standGap : null;
    if (holdY === null || this.y < holdY) {
      this.y += this.speed * dt;
      if (holdY !== null && this.y > holdY) this.y = holdY;
    }

    // CONVERGENCE — the fix for the game's central geometric problem.
    //
    // The kid cannot steer or aim; the ship holds near centre and fires
    // straight up. So an enemy that descends in its own column is UNHITTABLE.
    // The first build shipped exactly that: a 2-ship LINE formation put both
    // ships at 0.14 and 0.86 of the width while every shot flew up the middle,
    // and 12 correct answers in a row killed nothing.
    //
    // Rather than give the kid aiming (which would add a motor skill the game
    // is explicitly not about) or collapse every formation to centre (which
    // would throw away the formation variety), enemies drift toward the ship's
    // column as they fall. They enter in formation — so the shape still reads —
    // and funnel into the firing lane by the time they are close enough to
    // matter. `converge` is the fraction of the horizontal gap closed per second.
    //
    // KEYED TO TIME ALIVE, NOT TO DESCENT FRACTION. This was
    // `progress > 0.25` with `pull` also scaled BY progress, which was doubly
    // weak early and made lock-on depend on how fast the ship happened to fall.
    // Since enemy speeds sit at 10-16 px/s (the arithmetic is the pressure, not
    // dodging), a full descent takes 40-50 seconds — so a wide-flank ship was not
    // hittable until 39% of its descent, MEASURED AT 16-19 SECONDS. A kid who
    // answered correctly in that window killed nothing on the flanks and had no way
    // to know why. Time-based convergence means a slow ship finds the lane just as
    // promptly as a fast one: measured, hittable after 5.3s instead of 16-19s.
    //
    // ENTRY_GRACE is what protects the formation. The shape has to read as a shape
    // before it funnels, or the 11 formations in formations.js are wasted work — and
    // a flat pull with no grace collapsed a wide formation completely (492px of
    // 492px travelled) before it was a fifth of the way down.
    const ENTRY_GRACE = 2.0;   // seconds in formation before committing to the lane
    const LANE_RATE = 0.8;     // fraction of the remaining gap closed per second
    if (this.converge > 0 && this.t > ENTRY_GRACE) {
      const pull = this.converge * LANE_RATE * dt;
      // Below combo 3 the volley is a single shot dead on laneX, so the
      // multiplier floors at 1 (the small, hit-box-safe base offset). It
      // grows toward 6x as the volley widens, never past it — an unbounded
      // scale would eventually push a ship outside even a wide volley.
      const widen = Math.max(1, Math.min(6, laneSpread / 40));
      const off = this.laneOffset * widen;
      this.spawnX += (laneX + off - this.spawnX) * Math.min(1, pull);
    }

    // Horizontal motion. Formations set weave; a sine weave is what stops a
    // descending grid from reading as a spreadsheet. Weave is applied AROUND
    // the (now converging) spawnX so the two motions compose.
    if (this.weave === 'sine') {
      this.x = this.spawnX + Math.sin(this.t * 1.6 + this.weavePhase) * this.weaveAmp;
    } else if (this.weave === 'drift') {
      this.x = this.spawnX + Math.sin(this.t * 0.5 + this.weavePhase) * this.weaveAmp;
    } else {
      this.x = this.spawnX;
    }

    if (this.flash > 0) this.flash -= dt;
    if (this.knock > 0) this.knock = Math.max(0, this.knock - dt * 60);
  }

  // Does this enemy want to fire this frame?
  wantsFire(dt) {
    if (this.fireEvery <= 0) return false;
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = this.fireEvery;
      return true;
    }
    return false;
  }

  reactToHit() {
    this.flash = 0.12;
    this.knock = 6;
  }

  // Apply one landed hit. Returns 'dead' | 'phase' | 'blocked' | ''.
  //
  // A shielded phase takes NO damage from an ordinary shot — only the
  // empowered ultimate pierces it. That is the mechanical payoff of chapter 2's
  // ally rescues, and main.js must say so on screen: a kid whose shots visibly
  // do nothing concludes the game is broken.
  registerHit(damage = 1, empowered = false) {
    if (this.shielded && !empowered) return 'blocked';
    this.hitsLeft = Math.max(0, this.hitsLeft - damage);
    this.reactToHit();
    if (this.hitsLeft > 0) return '';
    if (this.hasNextPhase) {
      this.advancePhase();
      return 'phase';
    }
    this.dead = true;
    return 'dead';
  }

  get hasNextPhase() {
    return !!(this.phases && this.phaseIndex < this.phases.length - 1);
  }

  advancePhase() {
    this.phaseIndex++;
    const p = this.phases[this.phaseIndex];
    this.hits = p.hits;
    this.hitsLeft = p.hits;
    this.shielded = !!p.shielded;
    if (p.fireEvery) this.fireEvery = p.fireEvery;
    if (p.fireDamage) this.fireDamage = p.fireDamage;
  }

  get phaseName() {
    return this.phases ? this.phases[this.phaseIndex].name : null;
  }

  get isDefeated() {
    return this.hitsLeft === 0 && !this.hasNextPhase;
  }

  // Should this ship commit to a kamikaze dive? True once it falls level with
  // the kid's ship — NOT at playBottom. Turning at the ship's own y means the
  // bank happens while the ship is still on screen and above the fleet, so the
  // kid sees the decision; a turn started at the bottom edge would happen
  // half-off-screen and read as the ship simply vanishing downward.
  //
  // Reinforcement-tail ships never dive. They cost nothing on escape (the tail
  // is a question dispenser, not a threat), and a ship that visibly rams the
  // hull and explodes for zero damage is a worse lie than a quiet exit.
  wantsDive(m, shipY) {
    return !this.diving && !this.reinforcement
      && this.kind !== ENEMY_KIND.BOSS
      && this.y > shipY - 110;
  }

  // Commit. `delay` staggers the wave — see update().
  startDive(delay = 0) {
    this.diving = true;
    this.diveDelay = delay;
    this.diveSpeed = this.speed;
    this.converge = 0;
    this.fireEvery = 0;    // a diving ship rams; it does not also shoot
  }

  // Has a diving ship reached the hull? Generous, because the detonation should
  // land ON the ship rather than a hair short of it.
  hitsShip(shipX, shipY) {
    return this.diving && this.diveDelay <= 0
      && Math.abs(this.y - shipY) < 26 && Math.abs(this.x - shipX) < 40;
  }

  // Fully past the bottom edge — a diving ship that somehow missed (the kid's
  // ship drifts) still leaves rather than falling forever.
  escaped(m) {
    return this.y > m.playBottom + 20;
  }

  // Hit box half-extents in screen px, derived from the actual sprite grid.
  //
  // DOT is the pixel scale (render.js), so a sprite w cells wide occupies
  // w * DOT * scale screen px. Using the sprite's real width AND height matters:
  // enemy_wedge is 15x8 and enemy_spike is 11x11, and a single square box sized
  // off width alone made the wedge hittable well above and below its own hull.
  //
  // Slightly generous (1.15x) on purpose — the kid cannot aim, so a shot that
  // looks like it should connect must connect.
  get halfW() {
    return ((this.sprite ? this.sprite.w : 12) * DOT * this.scale * 1.15) / 2;
  }

  get halfH() {
    const rows = this.sprite ? this.sprite.frames[0].length : 12;
    return (rows * DOT * this.scale * 1.15) / 2;
  }

  // Kept for callers that want one number (the hit-pip bar position).
  get radius() {
    return Math.max(this.halfW, this.halfH);
  }
}
