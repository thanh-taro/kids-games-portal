// effects.js — dot particle bursts + rich skill effects (flames, shockwaves,
// lightning bolts, slash arcs, screen flashes) for satisfying skill hits.
//
// Everything is drawn as chunky pixels/lines so it matches the pixel-art look.
// No Math.random at construction time (kept reproducible); per-index variation
// gives an organic feel instead.

import { DOT } from './render.js';

// A tiny deterministic pseudo-random from an integer seed (stable per call).
function rand(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x); // 0..1
}

export class Particle {
  constructor(x, y, vx, vy, color, life, opts = {}) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.gravity = opts.gravity != null ? opts.gravity : 0.35;
    this.size = opts.size || DOT * 1.5;
    this.drag = opts.drag || 1; // 1 = none; <1 slows over time
    // Optional color the particle fades TO as it dies (e.g. flame -> smoke).
    this.fadeTo = opts.fadeTo || null;
    this.shrink = opts.shrink || false;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.vx *= this.drag;
    this.vy *= this.drag;
    this.life--;
  }
  get dead() {
    return this.life <= 0;
  }
}

// A one-shot animated visual (shockwave ring, lightning bolt, slash arc,
// screen flash). Each advances a timer and draws itself.
class Visual {
  constructor(kind, x, y, opts = {}) {
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.t = 0;
    this.life = opts.life || 20;
    this.color = opts.color || '#ffffff';
    this.color2 = opts.color2 || opts.color || '#ffffff';
    this.radius = opts.radius || 60;
    this.w = opts.w || 0;
    this.h = opts.h || 0;
    this.angle = opts.angle || 0;
    this.seed = opts.seed || 1;
  }
  get dead() {
    return this.t >= this.life;
  }
  update() {
    this.t++;
  }
  draw(ctx) {
    const p = this.t / this.life; // 0..1 progress
    if (this.kind === 'shockwave') {
      // Expanding hollow ring of pixel blocks.
      const r = this.radius * p;
      const alpha = 1 - p;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.color;
      const steps = 28;
      for (let i = 0; i < steps; i++) {
        const a = (Math.PI * 2 * i) / steps;
        const px = this.x + Math.cos(a) * r;
        const py = this.y + Math.sin(a) * r * 0.7; // slightly flattened
        ctx.fillRect(px - DOT, py - DOT, DOT * 2, DOT * 2);
      }
      ctx.globalAlpha = 1;
    } else if (this.kind === 'flash') {
      // Full-screen color flash that fades fast.
      ctx.globalAlpha = (1 - p) * 0.6;
      ctx.fillStyle = this.color;
      ctx.fillRect(0, 0, this.w, this.h);
      ctx.globalAlpha = 1;
    } else if (this.kind === 'bolt') {
      // Jagged lightning bolt from top of screen down to (x,y).
      const segs = 10;
      const topY = 0;
      const dx = 0; // bolt targets straight above
      ctx.globalAlpha = this.t < this.life * 0.6 ? 1 : (1 - p) * 2;
      const thickness = this.t < 3 ? DOT * 2.5 : DOT * 1.5;
      let px = this.x;
      let py = topY;
      for (let i = 1; i <= segs; i++) {
        const ny = topY + ((this.y - topY) * i) / segs;
        const jitter = (rand(this.seed + i) - 0.5) * 34 * (1 - i / segs + 0.3);
        const nx = this.x + dx + jitter;
        // draw a thick pixel line segment
        drawPixelLine(ctx, px, py, nx, ny, this.color, thickness);
        px = nx;
        py = ny;
      }
      // bright core glow at the strike point
      ctx.fillStyle = this.color2;
      ctx.fillRect(this.x - DOT * 2, this.y - DOT * 2, DOT * 4, DOT * 4);
      ctx.globalAlpha = 1;
    } else if (this.kind === 'slash') {
      // A quick crescent slash arc sweeping through the target.
      ctx.globalAlpha = 1 - p;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = DOT * 2 * (1 - p * 0.5);
      ctx.lineCap = 'round';
      const r = this.radius;
      const a0 = this.angle - 0.9 + p * 1.2;
      const a1 = this.angle + 0.9 + p * 1.2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, a0, a1);
      ctx.stroke();
      // second thinner trailing arc
      ctx.globalAlpha = (1 - p) * 0.5;
      ctx.lineWidth = DOT;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r + DOT * 2, a0, a1);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (this.kind === 'burst') {
      // A solid bright core that expands and fades (the flash of an impact).
      const r = this.radius * (0.4 + p * 0.6);
      ctx.globalAlpha = (1 - p) * 0.9;
      ctx.fillStyle = this.color;
      const steps = 20;
      for (let ring = r; ring > 0; ring -= DOT * 2) {
        for (let i = 0; i < steps; i++) {
          const a = (Math.PI * 2 * i) / steps;
          ctx.fillRect(this.x + Math.cos(a) * ring - DOT, this.y + Math.sin(a) * ring - DOT, DOT * 2, DOT * 2);
        }
      }
      ctx.globalAlpha = 1;
    } else if (this.kind === 'beam') {
      // Vertical light pillar (used for meteor impact / holy strike).
      ctx.globalAlpha = (1 - p) * 0.8;
      ctx.fillStyle = this.color;
      const halfW = this.w / 2;
      ctx.fillRect(this.x - halfW, 0, this.w, this.y);
      ctx.globalAlpha = 1;
    }
  }
}

// Draw a thick line as a series of pixel blocks (keeps the chunky look).
function drawPixelLine(ctx, x0, y0, x1, y1, color, thickness) {
  ctx.fillStyle = color;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.floor(dist / (DOT * 0.8)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x0 + dx * t;
    const py = y0 + dy * t;
    ctx.fillRect(px - thickness / 2, py - thickness / 2, thickness, thickness);
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.visuals = [];
    this.screenShake = 0;
  }

  // --- Basic radial burst (kept for generic hits/deaths). ---
  burst(x, y, color, n = 16, power = 4) {
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n;
      const spd = power * (0.6 + (i % 3) * 0.2);
      this.particles.push(
        new Particle(x, y, Math.cos(angle) * spd, Math.sin(angle) * spd - 2, color, 24 + (i % 8))
      );
    }
  }

  // A small trail puff dropped behind a flying projectile (comet tail).
  // `spread` jitters position; particles drift, fade, and shrink.
  trailPuff(x, y, color, opts = {}) {
    const spread = opts.spread || DOT;
    const jx = (rand(x * 3 + y) - 0.5) * spread * 2;
    const jy = (rand(y * 3 + x) - 0.5) * spread * 2;
    this.particles.push(
      new Particle(x + jx, y + jy, (rand(x + y) - 0.5) * 1.5, (rand(x - y) - 0.5) * 1.5, color, opts.life || 12, {
        gravity: opts.gravity != null ? opts.gravity : 0.02,
        drag: 0.9,
        size: opts.size || DOT * 1.5,
        fadeTo: opts.fadeTo || null,
        shrink: true,
      })
    );
  }

  // --- Signature skill effects, keyed by skill.effect ---
  play(effect, x, y, W, H) {
    switch (effect) {
      case 'slash':
        this._slash(x, y);
        break;
      case 'explosion':
        this._explosion(x, y);
        break;
      case 'lightning':
        this._lightning(x, y, W, H);
        break;
      case 'meteor':
        this._meteor(x, y, W, H);
        break;
      default:
        this.burst(x, y, '#e8c33a', 20, 5);
    }
  }

  // Slash: big bright crescent arc sweeping through + gold sparks flying off.
  _slash(x, y) {
    this.visuals.push(new Visual('slash', x, y, { color: '#ffffff', radius: 62, life: 18, angle: -0.4 }));
    this.visuals.push(new Visual('slash', x, y, { color: '#f2c53d', radius: 50, life: 20, angle: -0.5 }));
    this.visuals.push(new Visual('slash', x, y, { color: '#fff2b0', radius: 74, life: 16, angle: -0.35 }));
    for (let i = 0; i < 20; i++) {
      const a = -0.6 + (i / 20) * 1.5;
      const spd = 7 + (i % 5);
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, i % 2 ? '#ffffff' : '#f2c53d', 20 + (i % 8), {
          gravity: 0.12,
          drag: 0.93,
          size: DOT * 1.5,
        })
      );
    }
  }

  // Fireball: double shockwave, a bright core flash, big rising fireball that
  // fades to smoke, plus flung embers.
  _explosion(x, y) {
    this.visuals.push(new Visual('shockwave', x, y, { color: '#ffd27f', radius: 110, life: 22 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#ff8a2b', radius: 80, life: 18 }));
    this.visuals.push(new Visual('burst', x, y, { color: '#fff2b0', radius: 46, life: 12 }));
    this.screenShake = Math.max(this.screenShake, 14);
    // Core flame burst (rises + fades from orange to dark smoke).
    for (let i = 0; i < 46; i++) {
      const a = (Math.PI * 2 * i) / 46;
      const spd = 4 + (i % 6);
      const flame = i % 3 === 0 ? '#fff2b0' : i % 3 === 1 ? '#ff8a2b' : '#e0431f';
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd - 3.5, flame, 30 + (i % 12), {
          gravity: -0.14, // flames rise
          drag: 0.93,
          size: DOT * 3,
          fadeTo: '#4a3a3a', // to smoke
          shrink: true,
        })
      );
    }
    // Fast bright embers flung out.
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI / 2 + (i - 8) * 0.22;
      const spd = 9 + (i % 4);
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, '#ffd27f', 34, { gravity: 0.4, size: DOT * 1.5 })
      );
    }
  }

  // Lightning: 3 bolts from the sky, big blue-white flash, electric burst +
  // shockwave + sparks.
  _lightning(x, y, W, H) {
    this.visuals.push(new Visual('flash', 0, 0, { color: '#dff4ff', w: W, h: H, life: 12 }));
    this.visuals.push(new Visual('bolt', x, y, { color: '#ffffff', color2: '#ffffff', life: 18, seed: Math.floor(x + y) }));
    this.visuals.push(new Visual('bolt', x, y, { color: '#aef0ff', color2: '#ffffff', life: 16, seed: Math.floor(x * 2 + 7) }));
    this.visuals.push(new Visual('bolt', x, y, { color: '#7fe8ff', color2: '#eaffff', life: 14, seed: Math.floor(y * 3 + 13) }));
    this.visuals.push(new Visual('burst', x, y, { color: '#eaffff', radius: 40, life: 10 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#7fe8ff', radius: 90, life: 18 }));
    this.screenShake = Math.max(this.screenShake, 16);
    // Electric sparks jittering outward.
    for (let i = 0; i < 34; i++) {
      const a = (Math.PI * 2 * i) / 34;
      const spd = 5 + (i % 7);
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, i % 2 ? '#eaffff' : '#4ad4d4', 20 + (i % 10), {
          gravity: 0.08,
          drag: 0.9,
          size: DOT * 1.5,
        })
      );
    }
  }

  // Meteor: wide light pillar + triple shockwave + bright core + lots of fire
  // debris flung out and up + big shake. The showpiece ultimate.
  _meteor(x, y, W, H) {
    this.visuals.push(new Visual('beam', x, y, { color: '#e6b3ff', w: DOT * 14, life: 16 }));
    this.visuals.push(new Visual('flash', 0, 0, { color: '#f4e0c0', w: W, h: H, life: 10 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#f2c53d', radius: 150, life: 26 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#c77dff', radius: 115, life: 22 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#ff8a2b', radius: 80, life: 18 }));
    this.visuals.push(new Visual('burst', x, y, { color: '#fff2b0', radius: 60, life: 14 }));
    this.screenShake = Math.max(this.screenShake, 24);
    // Debris flung out and up, arcing back down.
    for (let i = 0; i < 60; i++) {
      const a = (Math.PI * 2 * i) / 60;
      const spd = 5 + (i % 8);
      const col = i % 4 === 0 ? '#fff2b0' : i % 4 === 1 ? '#ff8a2b' : i % 4 === 2 ? '#c77dff' : '#8e44ad';
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd - 5, col, 34 + (i % 14), {
          gravity: 0.5,
          size: DOT * 2.5,
        })
      );
    }
  }

  // Combo blast: a radiant ring + upward star sparks around the hero, fired at
  // combo milestones. `power` scales with the combo so bigger combos pop more.
  comboBlast(x, y, color = '#ffd24a', power = 1) {
    this.visuals.push(new Visual('shockwave', x, y, { color, radius: 70 + power * 20, life: 20 }));
    this.visuals.push(new Visual('burst', x, y, { color: '#ffffff', radius: 30 + power * 8, life: 12 }));
    this.screenShake = Math.max(this.screenShake, 6 + power * 3);
    // Star sparks shooting up and out, arcing back — celebratory fountain.
    const n = 24 + power * 8;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / n - 0.5) * Math.PI * 1.4;
      const spd = 6 + (i % 5) + power;
      const col = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? color : '#fff2b0';
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, col, 30 + (i % 12), {
          gravity: 0.22,
          drag: 0.96,
          size: DOT * 2,
          shrink: true,
        })
      );
    }
  }

  // Monster death: a satisfying pop scaled to the monster's size. `tier`:
  // 'creep' (small), 'boss' (big), 'stageboss' (huge). `color` = monster hue.
  death(x, y, color, tier = 'creep') {
    const cfg = {
      creep: { n: 26, power: 5, rings: 1, radius: 55, shake: 8, ring: '#ffffff' },
      boss: { n: 44, power: 7, rings: 2, radius: 95, shake: 16, ring: '#ffd27f' },
      stageboss: { n: 64, power: 9, rings: 3, radius: 140, shake: 24, ring: '#fff2b0' },
    }[tier] || { n: 26, power: 5, rings: 1, radius: 55, shake: 8, ring: '#ffffff' };

    // White flash core + expanding rings.
    this.visuals.push(new Visual('burst', x, y, { color: '#ffffff', radius: cfg.radius * 0.45, life: 10 }));
    for (let r = 0; r < cfg.rings; r++) {
      this.visuals.push(
        new Visual('shockwave', x, y, {
          color: r === 0 ? cfg.ring : color,
          radius: cfg.radius * (1 - r * 0.25),
          life: 18 + r * 4,
        })
      );
    }
    this.screenShake = Math.max(this.screenShake, cfg.shake);

    // Chunky debris in the monster's color + white, flung out and falling.
    for (let i = 0; i < cfg.n; i++) {
      const a = (Math.PI * 2 * i) / cfg.n;
      const spd = cfg.power * (0.6 + (i % 4) * 0.25);
      const col = i % 3 === 0 ? '#ffffff' : color;
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd - 2, col, 26 + (i % 12), {
          gravity: 0.45,
          size: DOT * (tier === 'stageboss' ? 3 : tier === 'boss' ? 2.5 : 2),
        })
      );
    }
    // A few rising "soul" sparkles for a storybook touch.
    for (let i = 0; i < 6; i++) {
      this.particles.push(
        new Particle(x + (i - 3) * DOT * 2, y, 0, -2 - (i % 3), '#eaffff', 40, {
          gravity: -0.05,
          drag: 0.98,
          size: DOT,
        })
      );
    }
  }

  update() {
    for (const p of this.particles) p.update();
    this.particles = this.particles.filter((p) => !p.dead);
    for (const v of this.visuals) v.update();
    this.visuals = this.visuals.filter((v) => !v.dead);
    if (this.screenShake > 0) this.screenShake--;
  }

  // Blend two hex colors (for flame -> smoke fade). t: 0=from, 1=to.
  static _blend(from, to, t) {
    const f = parseInt(from.slice(1), 16);
    const g = parseInt(to.slice(1), 16);
    const fr = (f >> 16) & 255, fg = (f >> 8) & 255, fb = f & 255;
    const gr = (g >> 16) & 255, gg = (g >> 8) & 255, gb = g & 255;
    const r = Math.round(fr + (gr - fr) * t);
    const gch = Math.round(fg + (gg - fg) * t);
    const b = Math.round(fb + (gb - fb) * t);
    return `rgb(${r},${gch},${b})`;
  }

  draw(ctx) {
    // Particles first (behind bolts/rings for a layered look).
    for (const p of this.particles) {
      const lifeFrac = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = lifeFrac;
      let color = p.color;
      if (p.fadeTo) color = ParticleSystem._blend(p.color, p.fadeTo, 1 - lifeFrac);
      ctx.fillStyle = color;
      const s = p.shrink ? p.size * (0.4 + lifeFrac * 0.6) : p.size;
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    for (const v of this.visuals) v.draw(ctx);
  }

  get empty() {
    return this.particles.length === 0 && this.visuals.length === 0;
  }
}

// A persistent, pulsing radial glow drawn BEHIND a sprite — the hero's rank
// aura (Master+). Unlike a Visual, this doesn't die; the caller draws it every
// frame while the hero holds a glowing rank. `cx,cy` is the aura center, `r`
// its base radius, `color` the rank hue, `tick` the global animation tick for
// the breathing pulse. Chunky pixel rings keep it on-style; drawn as several
// translucent concentric rings so it reads as a soft glow, not a hard disc.
export function drawAura(ctx, cx, cy, r, color, tick) {
  const pulse = 0.5 + 0.5 * Math.sin(tick * 0.08); // 0..1 breathing
  const radius = r * (0.95 + pulse * 0.15);
  // A soft filled halo behind the hero via an additive radial gradient — reads
  // clearly against both sky and sand without hiding the sprite.
  const grad = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
  grad.addColorStop(0, hexA(color, 0.45 + pulse * 0.2));
  grad.addColorStop(0.6, hexA(color, 0.18));
  grad.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  // Chunky rotating pixel ring on top for the on-style shimmer.
  const rings = 3;
  for (let k = rings; k >= 1; k--) {
    const rr = (radius * (k + 1)) / (rings + 1);
    const alpha = (0.35 + 0.25 * pulse) * (1 - (k - 1) / rings);
    ctx.globalAlpha = Math.min(0.7, alpha);
    ctx.fillStyle = color;
    const steps = 24;
    for (let i = 0; i < steps; i++) {
      const a = (Math.PI * 2 * i) / steps + tick * 0.02 * (k % 2 ? 1 : -1);
      const px = cx + Math.cos(a) * rr;
      const py = cy + Math.sin(a) * rr * 0.9; // slightly flattened, grounded
      ctx.fillRect(px - DOT, py - DOT, DOT * 2, DOT * 2);
    }
  }
  // Rising sparkles for the top ranks — a few motes drifting up from the aura.
  const motes = 8;
  for (let i = 0; i < motes; i++) {
    const phase = (tick * 0.03 + i / motes) % 1;
    const a = rand(i * 7.1 + 3) * Math.PI * 2;
    const mx = cx + Math.cos(a) * radius * 0.7;
    const my = cy + radius * 0.3 - phase * radius * 1.6;
    ctx.globalAlpha = (1 - phase) * 0.8;
    ctx.fillStyle = color;
    ctx.fillRect(mx - DOT / 2, my - DOT / 2, DOT * 1.2, DOT * 1.2);
  }
  ctx.globalAlpha = 1;
}

// "#rrggbb" + alpha → "rgba(...)" for gradient stops.
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}
