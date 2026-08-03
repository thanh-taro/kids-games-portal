// effects.js — particles, one-shot visuals, and screen shake.
//
// THE GOVERNING CONSTRAINT, and it is unusual for a shooter: the kid is READING
// a formula and four numbers while this plays. Every effect here is tuned to be
// legible-but-brief rather than spectacular, because a screen-filling flash
// that obscures the quest box for even 200ms costs the player the thing the
// game is actually about.
//
// Concretely, that means:
//   * Impacts are LOCAL. A hit sparks on the enemy hull; it does not wash the
//     screen. The typing game learned the same lesson in reverse (its scenery
//     out-read its monsters); here the risk is our own effects out-reading the
//     quest.
//   * NOTHING is drawn below m.playBottom. The quest box is sacred — effects
//     are clipped out of it, so a big explosion can never bleed onto a number
//     the kid is trying to read.
//   * Screen shake is small (<= 4px) and short (<= 0.25s). Shaking the canvas
//     shakes the ANSWER CARDS, which is actively hostile to a child trying to
//     tap one.
//   * Effects are differentiated by MOTION, not just color — the typing game's
//     rule. Colour alone is hard to tell apart mid-fight: freeze shards hang,
//     repair motes rise, the ultimate blooms outward in rings.
//
// Determinism: no Math.random() at construction time. Variation comes from a
// seeded rand() or from per-index math, so a burst looks organic without being
// nondeterministic (same rule as the typing game's effects.js).

// ---------------------------------------------------------------------------
// Seeded randomness
// ---------------------------------------------------------------------------

let _seed = 12345;
function rand() {
  _seed = (_seed * 1103515245 + 12345) & 0x7fffffff;
  return _seed / 0x7fffffff;
}
function randRange(lo, hi) { return lo + rand() * (hi - lo); }

// ---------------------------------------------------------------------------
// Particle — a single moving dot.
// ---------------------------------------------------------------------------

class Particle {
  constructor(o) {
    this.x = o.x; this.y = o.y;
    this.vx = o.vx || 0; this.vy = o.vy || 0;
    this.gravity = o.gravity || 0;   // negative = rises
    this.drag = o.drag ?? 0.98;
    this.size = o.size || 2;
    this.color = o.color || '#ffffff';
    this.fadeTo = o.fadeTo || null;   // blend toward this color over life
    this.life = o.life || 0.5;
    this.maxLife = this.life;
    this.shrink = o.shrink ?? true;
    this.spin = o.spin || 0;          // angular velocity for spiral motion
    this.angle = o.angle || 0;
    this.radius = o.radius || 0;      // for orbital/spiral particles
    this.dead = false;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }

    if (this.spin) {
      // Spiral motion — used by the ultimate's inward gather.
      this.angle += this.spin * dt;
      this.radius += this.vy * dt;
      this.x = this.ox + Math.cos(this.angle) * this.radius;
      this.y = this.oy + Math.sin(this.angle) * this.radius;
    } else {
      this.vy += this.gravity * dt;
      this.vx *= Math.pow(this.drag, dt * 60);
      this.vy *= Math.pow(this.drag, dt * 60);
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
  }

  draw(ctx) {
    const t = this.life / this.maxLife;
    let color = this.color;
    if (this.fadeTo) color = blend(this.color, this.fadeTo, 1 - t);
    const s = this.shrink ? Math.max(1, this.size * t) : this.size;
    ctx.globalAlpha = Math.min(1, t * 1.6);
    ctx.fillStyle = color;
    ctx.fillRect(this.x - s / 2, this.y - s / 2, s, s);
    ctx.globalAlpha = 1;
  }
}

// Parse a #rrggbb string. Returns null for anything else — an rgba() string, a
// gradient, undefined — so blend() can degrade instead of throwing.
//
// This crashed the render loop once: a particle was constructed with a
// non-hex color, hexToRgb called .replace on it, and the exception fired inside
// ParticleSystem.draw() EVERY FRAME. That killed the HUD and the quest box,
// because they are drawn after the particles — one bad color made the game
// unplayable rather than merely ugly. Effects must never be able to take the
// render loop down with them.
function hexToRgb(h) {
  if (typeof h !== 'string') return null;
  const s = h.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

function blend(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return typeof a === 'string' ? a : '#ffffff';
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

// ---------------------------------------------------------------------------
// Visual — a one-shot geometric flourish (ring, flash, beam).
// ---------------------------------------------------------------------------

class Visual {
  constructor(o) {
    this.kind = o.kind;
    this.x = o.x; this.y = o.y;
    this.life = o.life || 0.3;
    this.maxLife = this.life;
    this.color = o.color || '#ffffff';
    this.r0 = o.r0 || 0;
    this.r1 = o.r1 || 40;
    this.w = o.w || 3;
    this.h = o.h || 0;
    this.dead = false;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    const t = 1 - this.life / this.maxLife; // 0 -> 1
    const a = 1 - t;
    ctx.globalAlpha = a;

    if (this.kind === 'ring') {
      // Additive, so an expanding shockwave brightens what it crosses instead
      // of drawing a dim outline over it. Ease-out on the radius (sqrt) makes it
      // snap outward and then settle, which reads as an impact rather than a
      // balloon inflating.
      // Ease-out when expanding (snap then settle — reads as an impact), plain
      // lerp when contracting.
      const e = this.r1 >= this.r0 ? Math.sqrt(t) : t;
      const r = this.r0 + (this.r1 - this.r0) * e;
      const prev = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(1, this.w * (1 - t * 0.6));
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalCompositeOperation = prev;
    } else if (this.kind === 'dullring') {
      // Flat, non-additive ring — see blocked() for why this variant exists.
      const r = this.r0 + (this.r1 - this.r0) * t;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(1, this.w * (1 - t * 0.5));
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.kind === 'flash') {
      const r = this.r1 * (1 - t);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(0, r), 0, Math.PI * 2);
      ctx.fill();
    } else if (this.kind === 'beam') {
      // A vertical pillar of LIGHT — the ultimate.
      //
      // Drawn as a horizontal gradient (hot white core, transparent edges) with
      // additive blending. A flat fillRect read as a grey concrete column: a
      // beam is bright in the middle and vanishes at its edges, and without
      // 'lighter' it darkens whatever is behind it instead of glowing.
      // The gradient carries its own alpha, so globalAlpha is reset to 1 here.
      // Leaving the outer fade (a, which decays to 0) multiplied on top of
      // already-translucent gradient stops is what made the beams render as
      // grey concrete columns: two stacked fades over a near-black background
      // land on mid-grey, and 'lighter' cannot brighten what is already dim.
      // The fade now lives in the stops instead.
      ctx.globalAlpha = 1;
      const halfW = (this.w / 2) * (1 - t * 0.35);
      const core = (0.95 * a).toFixed(3);
      const mid = (0.7 * a).toFixed(3);
      const g = ctx.createLinearGradient(this.x - halfW, 0, this.x + halfW, 0);
      g.addColorStop(0, 'rgba(255,210,74,0)');
      g.addColorStop(0.3, `rgba(255,210,74,${mid})`);
      g.addColorStop(0.5, `rgba(255,255,255,${core})`);
      g.addColorStop(0.7, `rgba(255,210,74,${mid})`);
      g.addColorStop(1, 'rgba(255,210,74,0)');
      const prev = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.fillRect(this.x - halfW, this.y - this.h, halfW * 2, this.h);
      ctx.globalCompositeOperation = prev;
    } else if (this.kind === 'spark') {
      // A short radial line burst — the cheapest legible "hit landed".
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.w;
      const n = 6;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + this.r0;
        const r = this.r1 * t;
        ctx.beginPath();
        ctx.moveTo(this.x + Math.cos(ang) * r * 0.4, this.y + Math.sin(ang) * r * 0.4);
        ctx.lineTo(this.x + Math.cos(ang) * r, this.y + Math.sin(ang) * r);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------------------
// ParticleSystem — the single instance main.js owns.
// ---------------------------------------------------------------------------

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.visuals = [];
    this.shake = 0;
    this.shakeMax = 0;
  }

  update(dt) {
    for (const p of this.particles) p.update(dt);
    for (const v of this.visuals) v.update(dt);
    this.particles = this.particles.filter((p) => !p.dead);
    this.visuals = this.visuals.filter((v) => !v.dead);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
  }

  // Draw everything, CLIPPED to the play field.
  //
  // The clip is the most important line in this file: without it a death
  // explosion near the bottom of the field paints over the quest box, and the
  // kid loses the numbers they are reading. Effects are never allowed into the
  // reading area.
  draw(ctx, m) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, m.w, m.playBottom);
    ctx.clip();
    for (const p of this.particles) p.draw(ctx);
    for (const v of this.visuals) v.draw(ctx);
    ctx.restore();
  }

  // Current shake offset, applied by main.js around the world render.
  // Capped hard: this offset moves the ANSWER CARDS too if applied globally,
  // so main.js only applies it to the play field.
  shakeOffset() {
    if (this.shake <= 0) return { x: 0, y: 0 };
    const mag = Math.min(4, this.shakeMax * (this.shake / 0.25));
    return {
      x: (rand() - 0.5) * 2 * mag,
      y: (rand() - 0.5) * 2 * mag,
    };
  }

  addShake(mag = 2, dur = 0.18) {
    this.shakeMax = Math.max(this.shakeMax, Math.min(4, mag));
    this.shake = Math.max(this.shake, Math.min(0.25, dur));
  }

  // ------------------------------------------------------------------------
  // Muzzle flash — fires with every volley, so it must be CHEAP and small.
  // ------------------------------------------------------------------------
  muzzle(x, y, color = '#7fffd4') {
    this.visuals.push(new Visual({ kind: 'flash', x, y, r1: 9, color, life: 0.1 }));
    for (let i = 0; i < 3; i++) {
      this.particles.push(new Particle({
        x, y,
        vx: randRange(-30, 30), vy: randRange(-90, -40),
        size: 2, color, fadeTo: '#2fbf9f', life: randRange(0.1, 0.2),
      }));
    }
  }

  // ------------------------------------------------------------------------
  // Impact — a shot landing on an enemy. Local, bright, over in ~0.2s.
  // ------------------------------------------------------------------------
  impact(x, y, color = '#ffd24a') {
    this.visuals.push(new Visual({
      kind: 'spark', x, y, r1: 16, w: 2, color, life: 0.18, r0: rand() * 3,
    }));
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2 + rand();
      const sp = randRange(60, 150);
      this.particles.push(new Particle({
        x, y,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        size: 2, color, fadeTo: '#ff9d3a', life: randRange(0.12, 0.26), gravity: 40,
      }));
    }
  }

  // A blocked hit on a shielded boss phase. Deliberately DULL — the kid must
  // read "that did nothing", the same reason the typing game's shieldBlock
  // sound is muffled. No spark, no shake, just a soft grey ripple.
  blocked(x, y) {
    // kind 'dullring' rather than 'ring' on purpose: rings render ADDITIVELY
    // and would make a blocked hit sparkle, which is the opposite of the
    // message. This one draws flat and grey so it reads as "absorbed, nothing
    // happened" — the visual twin of audio.js's deliberately muffled
    // shieldBlock sound.
    this.visuals.push(new Visual({
      kind: 'dullring', x, y, r0: 8, r1: 22, w: 2, color: '#8f8aa8', life: 0.28,
    }));
  }

  // ------------------------------------------------------------------------
  // Death — tiered by enemy size. Even the biggest stays under ~0.6s.
  // ------------------------------------------------------------------------
  death(x, y, color = '#e0503a', tier = 1) {
    const n = tier === 3 ? 26 : tier === 2 ? 16 : 10;
    const spread = tier === 3 ? 240 : tier === 2 ? 170 : 120;

    this.visuals.push(new Visual({
      kind: 'flash', x, y, r1: 14 + tier * 10, color: '#fff4d6', life: 0.12,
    }));
    this.visuals.push(new Visual({
      kind: 'ring', x, y, r0: 4, r1: 30 + tier * 22, w: 2 + tier, color, life: 0.3 + tier * 0.08,
    }));

    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + rand() * 0.4;
      const sp = randRange(spread * 0.35, spread);
      this.particles.push(new Particle({
        x, y,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        size: 2 + (i % 2), color, fadeTo: '#4a4560',
        life: randRange(0.25, 0.35 + tier * 0.12), gravity: 60, drag: 0.96,
      }));
    }
    this.addShake(tier, 0.1 + tier * 0.04);
  }

  // ------------------------------------------------------------------------
  // Per-weapon signature effects. Differentiated by MOTION.
  // ------------------------------------------------------------------------

  // Repair — motes RISE. Nothing else in the game moves upward except the
  // kid's own shots, so "something good is happening" reads instantly.
  repair(x, y) {
    for (let i = 0; i < 10; i++) {
      this.particles.push(new Particle({
        x: x + randRange(-16, 16), y: y + randRange(-6, 10),
        vx: randRange(-12, 12), vy: randRange(-70, -35),
        size: 2, color: '#7fe3a0', fadeTo: '#ffffff',
        life: randRange(0.5, 0.9), gravity: -12, drag: 0.99,
      }));
    }
  }

  // Shield absorb — a hard ring snapping outward, then nothing. Short and
  // definite, so it reads as "that was stopped" rather than "that hurt".
  shield(x, y) {
    this.visuals.push(new Visual({ kind: 'ring', x, y, r0: 18, r1: 40, w: 4, color: '#5fd8d8', life: 0.26 }));
    this.visuals.push(new Visual({ kind: 'flash', x, y, r1: 20, color: '#5fd8d8', life: 0.1 }));
  }

  // ------------------------------------------------------------------------
  // THE COMBO SHIELD (skill_shield) — three beats, told apart by MOTION per
  // this file's rule, not just color. All three use the hero's own hull blue
  // (#4d9bf0/#2a5fb8, matching ship_hero's B/b) rather than Vòm Xanh's teal
  // shield() above — it reads as "your ship's own energy", and keeps the two
  // shields tellable apart by hue as well as by what triggers them.
  //
  //   block — a shot lands on the bubble and stops. Fires on every blocked
  //           hit, so it stays cheap: one small ring at the impact point.
  //   break — a wrong answer shatters the whole bubble at once. Big and
  //           immediate — a ring at the ship AND at every wingman fires the
  //           same frame, so it reads as one dome giving way, not several
  //           separate pops.
  //   fade  — it ran out on its own. Slow motes drifting outward and down,
  //           no flash, no shake — this is losing a bonus, not taking a hit,
  //           and must not read as a punishment (same reasoning as the
  //           soft-fail-screen rule elsewhere in this game).
  // ------------------------------------------------------------------------

  comboShieldBlock(x, y) {
    this.visuals.push(new Visual({ kind: 'ring', x, y, r0: 6, r1: 20, w: 2, color: '#4d9bf0', life: 0.16 }));
    this.visuals.push(new Visual({ kind: 'flash', x, y, r1: 10, color: '#ffffff', life: 0.08 }));
  }

  comboShieldBreak(shipX, shipY, allies = []) {
    const points = [{ x: shipX, y: shipY }, ...allies.map((a) => ({ x: a.x, y: a.y }))];
    for (const { x, y } of points) {
      this.visuals.push(new Visual({ kind: 'ring', x, y, r0: 10, r1: 46, w: 3, color: '#4d9bf0', life: 0.32 }));
    }
    this.visuals.push(new Visual({ kind: 'flash', x: shipX, y: shipY, r1: 30, color: '#ffffff', life: 0.14 }));
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2 + rand() * 0.3;
      const sp = randRange(90, 220);
      this.particles.push(new Particle({
        x: shipX, y: shipY,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        size: 2, color: '#7fbaff', fadeTo: '#2a5fb8', life: randRange(0.22, 0.4), drag: 0.94,
      }));
    }
    this.addShake(2, 0.15);
  }

  comboShieldFade(shipX, shipY, allies = []) {
    const points = [{ x: shipX, y: shipY }, ...allies.map((a) => ({ x: a.x, y: a.y }))];
    for (const { x, y } of points) {
      for (let i = 0; i < 4; i++) {
        this.particles.push(new Particle({
          x: x + randRange(-10, 10), y: y + randRange(-8, 8),
          vx: randRange(-14, 14), vy: randRange(10, 30),
          size: 2, color: '#4d9bf0', fadeTo: '#2a3550', life: randRange(0.5, 0.8), drag: 0.97,
        }));
      }
    }
  }


  // THE ULTIMATE — Siêu Công Thức. The biggest effect in the game, and the only
  // one that touches the whole play field. Two beats: motes GATHER inward on a
  // spiral, then twin pillars bloom with three expanding rings.
  ultimate(x, y, m) {
    // Beat 1: the gather. Spiral inward — no other effect moves this way.
    for (let i = 0; i < 22; i++) {
      const ang = (i / 22) * Math.PI * 2;
      const p = new Particle({
        x, y, vy: -150, size: 3,
        color: '#ffd24a', fadeTo: '#ffffff', life: 0.42, spin: 6,
        angle: ang, radius: 120,
      });
      p.ox = x; p.oy = y;
      this.particles.push(p);
    }
    // Beat 2: twin pillars + three rings.
    // Wide enough to read as shafts of light rather than poles. A 12px beam
    // over a 400px-tall field is a pole; 40px is a beam.
    this.visuals.push(new Visual({
      kind: 'beam', x: x - 34, y, h: y - m.playTop, w: 40, life: 0.4,
    }));
    this.visuals.push(new Visual({
      kind: 'beam', x: x + 34, y, h: y - m.playTop, w: 40, life: 0.4,
    }));
    for (let k = 0; k < 3; k++) {
      this.visuals.push(new Visual({
        kind: 'ring', x, y, r0: 6, r1: 90 + k * 60, w: 4 - k,
        color: k === 0 ? '#ffffff' : '#ffd24a', life: 0.32 + k * 0.1,
      }));
    }
    this.addShake(3, 0.22);
  }

  // A projectile's comet trail. One puff per few frames — called from main.js.
  trail(x, y, color = '#7fffd4') {
    this.particles.push(new Particle({
      x: x + randRange(-1, 1), y,
      vx: 0, vy: randRange(20, 50),
      size: 2, color, fadeTo: '#2a5fb8', life: 0.16, shrink: true,
    }));
  }

  // The ship taking a hit. Sparks fly DOWNWARD off the hull (the shot came
  // from above), which is a small thing that makes the direction of damage
  // legible without any UI.
  hurt(x, y) {
    for (let i = 0; i < 8; i++) {
      this.particles.push(new Particle({
        x, y,
        vx: randRange(-90, 90), vy: randRange(20, 110),
        size: 2, color: '#ff9d3a', fadeTo: '#e0503a', life: randRange(0.2, 0.4), gravity: 90,
      }));
    }
    this.visuals.push(new Visual({ kind: 'flash', x, y, r1: 18, color: '#ff2d6f', life: 0.12 }));
    this.addShake(2.5, 0.2);
  }

  // A KAMIKAZE IMPACT — a monstership that broke through the fleet and rammed
  // the hull. Deliberately distinct from hurt(): sparks blow OUTWARD and UPWARD
  // from the point of contact, because this collision came from below-ish and
  // carried its own momentum, where hurt() rains sparks downward off a shot
  // arriving from above. The kid should be able to tell the two apart without
  // reading anything — an impact looks like a collision, a shot looks like a
  // shot.
  //
  // It is also SMALLER than a death explosion, on purpose: the impact costs a
  // third of a durability point, and a blast bigger than the one a killed
  // monstership makes would over-promise the damage.
  ram(x, y, color = '#e0503a') {
    for (let i = 0; i < 14; i++) {
      const ang = -Math.PI * 0.15 - (i / 14) * Math.PI * 0.7;
      const spd = randRange(70, 150);
      this.particles.push(new Particle({
        x, y,
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
        size: 2, color: '#ffd166', fadeTo: color, life: randRange(0.22, 0.4), gravity: 60,
      }));
    }
    // A ring rather than a soft flash, so it reads as a concussion at a point.
    this.visuals.push(new Visual({ kind: 'ring', x, y, r1: 6, r2: 30, color: '#ffb03a', life: 0.22 }));
    this.visuals.push(new Visual({ kind: 'flash', x, y, r1: 14, color: '#ff2d6f', life: 0.1 }));
  }

  // A ship committing to its dive — a brief warning smear so the turn is not
  // silent. Kept faint: the sound carries this, and a bright effect here would
  // compete with the impact a moment later.
  diveWarn(x, y, color = '#e0503a') {
    for (let i = 0; i < 5; i++) {
      this.particles.push(new Particle({
        x: x + randRange(-6, 6), y,
        vx: randRange(-30, 30), vy: randRange(-50, -10),
        size: 2, color, fadeTo: '#4a4560', life: 0.26,
      }));
    }
  }

  // A phase change on a multi-phase boss. A dark implosion into a rising
  // column — read as "it is changing", explicitly NOT as death (the typing
  // game's phasechange makes the same distinction for the same reason).
  phaseChange(x, y) {
    for (let i = 0; i < 18; i++) {
      const ang = (i / 18) * Math.PI * 2;
      this.particles.push(new Particle({
        x: x + Math.cos(ang) * 60, y: y + Math.sin(ang) * 40,
        vx: -Math.cos(ang) * 130, vy: -Math.sin(ang) * 90,
        size: 3, color: '#a855f7', fadeTo: '#1a1423', life: 0.42, drag: 0.97,
      }));
    }
    for (let i = 0; i < 10; i++) {
      this.particles.push(new Particle({
        x: x + randRange(-14, 14), y,
        vx: 0, vy: randRange(-140, -70),
        size: 3, color: '#ff2d6f', fadeTo: '#a855f7', life: randRange(0.4, 0.7), gravity: -30,
      }));
    }
    this.addShake(3, 0.24);
  }

  // An escaped monstership slipping past the ship — a downward smear at the
  // bottom edge, so the loss is VISIBLE. Without this, energy silently drops
  // and the kid has no idea why.
  escape(x, y) {
    for (let i = 0; i < 6; i++) {
      this.particles.push(new Particle({
        x: x + randRange(-10, 10), y,
        vx: randRange(-20, 20), vy: randRange(80, 160),
        size: 2, color: '#e0503a', fadeTo: '#4a4560', life: 0.3,
      }));
    }
  }

  clear() {
    this.particles.length = 0;
    this.visuals.length = 0;
    this.shake = 0;
  }
}

