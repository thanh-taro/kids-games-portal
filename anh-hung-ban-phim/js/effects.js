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

// Total lifespan (in frames) of the empowered Staff-cast effect (_staffcast
// below) — exported so main.js can hold the struck monster frozen for exactly
// as long as the effect is on screen, rather than guessing a number that
// could drift out of sync as the effect is tuned. ~3s at 60fps: deliberately
// the longest-held moment in the game, since a full-charge cast is meant to
// stop the fight and be watched, not blend into ordinary combat pacing.
export const STAFFCAST_FRAMES = 180;

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
    this.hold = opts.hold || 0; // 'beam' only — see draw()
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
      // Vertical light pillar (used for meteor impact / holy strike). `hold`
      // (0..1, default 0) is the fraction of life spent at full alpha before
      // fading starts, so a beam can STAND rather than fade from frame one.
      const fadeStart = this.hold || 0;
      const fadeP = p < fadeStart ? 0 : (p - fadeStart) / (1 - fadeStart);
      ctx.globalAlpha = (1 - fadeP) * 0.8;
      ctx.fillStyle = this.color;
      const halfW = this.w / 2;
      ctx.fillRect(this.x - halfW, 0, this.w, this.y);
      ctx.globalAlpha = 1;
    } else if (this.kind === 'flarebeam') {
      // Same vertical pillar as 'beam' (and same `hold`-then-fade timing,
      // used by staffcast so its columns still STAND for the whole freeze),
      // but the column itself is a soft flare instead of one flat block: a
      // narrow white-hot core with a wider, translucent glow feathered out
      // on either side via a horizontal gradient, plus a slow horizontal
      // flicker so the flare visibly breathes instead of sitting static for
      // 3 full seconds.
      const fadeStart = this.hold || 0;
      const fadeP = p < fadeStart ? 0 : (p - fadeStart) / (1 - fadeStart);
      const baseAlpha = 1 - fadeP;
      const flicker = 0.85 + 0.15 * Math.sin(this.t * 0.5 + this.seed * 10);
      const halfW = this.w / 2;
      const glowW = this.w * 2.2;

      ctx.globalAlpha = baseAlpha * 0.35 * flicker;
      const glowGrad = ctx.createLinearGradient(this.x - glowW / 2, 0, this.x + glowW / 2, 0);
      glowGrad.addColorStop(0, 'transparent');
      glowGrad.addColorStop(0.5, this.color);
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(this.x - glowW / 2, 0, glowW, this.y);

      ctx.globalAlpha = baseAlpha * 0.7 * flicker;
      const midGrad = ctx.createLinearGradient(this.x - halfW, 0, this.x + halfW, 0);
      midGrad.addColorStop(0, 'transparent');
      midGrad.addColorStop(0.5, this.color);
      midGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = midGrad;
      ctx.fillRect(this.x - halfW, 0, this.w, this.y);

      ctx.globalAlpha = baseAlpha * flicker;
      ctx.fillStyle = '#ffffff';
      const coreW = this.w * 0.28;
      ctx.fillRect(this.x - coreW / 2, 0, coreW, this.y);
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
      // ---- chapter 2 skills ----
      case 'frostnova':
        this._frostnova(x, y);
        break;
      case 'windblade':
        this._windblade(x, y);
        break;
      case 'holylight':
        this._holylight(x, y, W, H);
        break;
      // ---- chapter 3 skills ----
      case 'voidrend':
        this._voidrend(x, y, W, H);
        break;
      case 'dawnbreaker':
        this._dawnbreaker(x, y, W, H);
        break;
      // ---- an empowered Staff-of-Wisdom cast, layered on TOP of whatever
      // skill.effect the hit already played (see onProjectileHit in main.js) —
      // this is what makes a full-charge cast feel like the Staff itself did
      // something, no matter which skill is equipped.
      case 'staffcast':
        this._staffcast(x, y, W, H);
        break;
      // ---- the multi-phase boss turning a corner ----
      case 'phasechange':
        this._phaseChange(x, y, W, H);
        break;
      // ---- stageboss signature attacks (see bossattacks.js) — these land
      // ON the hero, so main.js calls play() with the hero's own x/y rather
      // than the monster's, and each is built to read as coming AT the
      // viewer rather than launching away from it. ----
      case 'groundslam':
        this._groundslam(x, y);
        break;
      case 'firebreath':
        this._firebreath(x, y);
        break;
      case 'shadowbolt':
        this._shadowbolt(x, y, W, H);
        break;
      case 'inksplatter':
        this._inksplatter(x, y);
        break;
      case 'galeslash':
        this._galeslash(x, y);
        break;
      case 'stonefist':
        this._stonefist(x, y);
        break;
      case 'shadowgrasp':
        this._shadowgrasp(x, y, W, H);
        break;
      case 'arcanepulse':
        this._arcanepulse(x, y);
        break;
      case 'ironslam':
        this._ironslam(x, y, W, H);
        break;
      case 'lanterncurse':
        this._lanterncurse(x, y, W, H);
        break;
      case 'warcryslash':
        this._warcryslash(x, y);
        break;
      case 'voidmaw':
        this._voidmaw(x, y);
        break;
      case 'devoursky':
        this._devoursky(x, y, W, H);
        break;
      default:
        this.burst(x, y, '#e8c33a', 20, 5);
    }
  }

  // --- Princess support flourishes (chapters 2-3 — see princesses.js) ---
  // A separate entry point from play() (skill.effect ids) because these are
  // keyed by ability id, not skill id, and are deliberately gentler/warmer
  // than the combat skill effects — this is a princess helping, not a strike.
  playPrincess(ability, x, y, W, H) {
    switch (ability) {
      case 'heal':
        this._princessHeal(x, y);
        break;
      case 'fullheal':
        this._princessFullHeal(x, y, W, H);
        break;
      case 'shield':
        this._princessShield(x, y);
        break;
      case 'freeze':
        this._princessFreeze(x, y);
        break;
      case 'slow':
        this._princessSlow(x, y);
        break;
      case 'knockback':
        this._princessKnockback(x, y);
        break;
      case 'starnova':
        this._princessStarNova(x, y);
        break;
      case 'lightnova':
        this._princessLightNova(x, y, W, H);
        break;
      case 'staffcharge':
        this._princessStaffCharge(x, y);
        break;
      case 'cleanse':
        this._princessCleanse(x, y);
        break;
      default:
        this.burst(x, y, '#fff6d0', 20, 4);
    }
  }

  // Hoa's Heal: soft green motes rising and gathering INTO the target (the
  // opposite pull of an explosion), a gentle ring, no screen shake — this is
  // comfort, not combat.
  _princessHeal(x, y) {
    this.visuals.push(new Visual('shockwave', x, y, { color: '#8ff09c', radius: 70, life: 42 }));
    this.visuals.push(new Visual('burst', x, y, { color: '#e6ffe6', radius: 30, life: 26 }));
    for (let i = 0; i < 26; i++) {
      const a = (Math.PI * 2 * i) / 26;
      const r = 50 + rand(i) * 20;
      this.particles.push(
        new Particle(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, -Math.cos(a) * 1.5, -Math.sin(a) * 1.5 - 1, i % 2 ? '#8ff09c' : '#e6ffe6', 54 + (i % 16), {
          gravity: -0.02,
          drag: 0.98,
          size: DOT * 1.5,
          shrink: true,
        })
      );
    }
  }

  // Mây's Full Heal: heal's bigger sibling — a soft white flash + a wider,
  // slower rise of motes, since this fires only at a real crisis (<15% HP).
  _princessFullHeal(x, y, W, H) {
    this.visuals.push(new Visual('flash', 0, 0, { color: '#eaffea', w: W, h: H, life: 10 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#a8ffb0', radius: 110, life: 46 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#ffffff', radius: 76, life: 38 }));
    this.visuals.push(new Visual('burst', x, y, { color: '#ffffff', radius: 40, life: 28 }));
    for (let i = 0; i < 44; i++) {
      const a = (Math.PI * 2 * i) / 44;
      const r = 70 + rand(i) * 30;
      this.particles.push(
        new Particle(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, -Math.cos(a) * 1.2, -Math.sin(a) * 1.2 - 1.4, i % 2 ? '#a8ffb0' : '#ffffff', 68 + (i % 20), {
          gravity: -0.03,
          drag: 0.98,
          size: DOT * 1.8,
          shrink: true,
        })
      );
    }
  }

  // Ánh Dương's Shield: a golden dome ring expanding outward once, then the
  // standing aura in renderPlaying() (main.js) takes over until it pops.
  _princessShield(x, y) {
    this.visuals.push(new Visual('shockwave', x, y, { color: '#ffd24a', radius: 90, life: 34 }));
    this.visuals.push(new Visual('burst', x, y, { color: '#fff6d0', radius: 46, life: 26 }));
    for (let i = 0; i < 24; i++) {
      const a = (Math.PI * 2 * i) / 24;
      this.particles.push(
        new Particle(x + Math.cos(a) * 50, y + Math.sin(a) * 30, Math.cos(a) * 0.6, Math.sin(a) * 0.6, '#ffe27a', 42 + (i % 14), {
          gravity: 0,
          drag: 0.97,
          size: DOT * 1.4,
          shrink: true,
        })
      );
    }
  }

  // Băng's Freeze: an ice-shard implosion onto the target — shards rush IN
  // (unlike frostnova's outward hang) since this is locking something down,
  // not striking it.
  _princessFreeze(x, y) {
    this.visuals.push(new Visual('shockwave', x, y, { color: '#bfe8ff', radius: 80, life: 32 }));
    this.visuals.push(new Visual('burst', x, y, { color: '#ffffff', radius: 30, life: 20 }));
    for (let i = 0; i < 28; i++) {
      const a = (Math.PI * 2 * i) / 28;
      const r = 60 + rand(i) * 20;
      this.particles.push(
        new Particle(x + Math.cos(a) * r, y + Math.sin(a) * r, -Math.cos(a) * 3, -Math.sin(a) * 3, i % 2 ? '#ffffff' : '#8fe3ff', 36 + (i % 14), {
          gravity: 0,
          drag: 0.94,
          size: DOT * 1.6,
          fadeTo: '#3fb8b0',
        })
      );
    }
  }

  // Cát's Slow: a low sandy haze drifting sideways, no burst — this is a
  // creeping effect, not an impact.
  _princessSlow(x, y) {
    this.visuals.push(new Visual('shockwave', x, y, { color: '#e8c87a', radius: 70, life: 36 }));
    for (let i = 0; i < 22; i++) {
      this.particles.push(
        new Particle(x + (rand(i) - 0.5) * 60, y + (rand(i + 5) - 0.5) * 30, 1.5 + rand(i) * 1.5, -0.2, '#e8c87a', 66 + (i % 20), {
          gravity: 0,
          drag: 0.99,
          size: DOT * 1.4,
          shrink: true,
        })
      );
    }
  }

  // Sóng Biển's Knockback: a horizontal tidal push — particles fan out
  // sideways rather than radially, reading as a shove rather than an
  // explosion.
  _princessKnockback(x, y) {
    this.visuals.push(new Visual('shockwave', x, y, { color: '#4ad4d4', radius: 90, life: 32 }));
    this.visuals.push(new Visual('burst', x, y, { color: '#eaffff', radius: 40, life: 22 }));
    for (let i = 0; i < 26; i++) {
      const spd = 4 + (i % 6);
      this.particles.push(
        new Particle(x, y + (rand(i) - 0.5) * 40, spd, (rand(i + 3) - 0.5) * 1.5, i % 2 ? '#4ad4d4' : '#ffffff', 36 + (i % 16), {
          gravity: 0.04,
          drag: 0.95,
          size: DOT * 1.6,
          shrink: true,
        })
      );
    }
  }

  // Sao's Star Nova: a tight starburst of white-gold motes — a quick,
  // bright pick-me-up rather than a heavy strike.
  _princessStarNova(x, y) {
    this.visuals.push(new Visual('shockwave', x, y, { color: '#ffe27a', radius: 100, life: 34 }));
    this.visuals.push(new Visual('burst', x, y, { color: '#ffffff', radius: 44, life: 22 }));
    this.screenShake = Math.max(this.screenShake, 8);
    for (let i = 0; i < 36; i++) {
      const a = (Math.PI * 2 * i) / 36;
      const spd = 5 + (i % 8);
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, i % 2 ? '#ffffff' : '#ffe27a', 40 + (i % 16), {
          gravity: 0.04,
          drag: 0.97,
          size: DOT * 1.8,
          shrink: true,
        })
      );
    }
  }

  // Ánh Sáng's Light Nova: star nova's bigger, radiant sibling — fires only
  // on a phase-change beat, so it should feel like the biggest "assist" in
  // the roster, close to holylight in scale.
  _princessLightNova(x, y, W, H) {
    this.visuals.push(new Visual('flash', 0, 0, { color: '#fff8e0', w: W, h: H, life: 12 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#ffffff', radius: 140, life: 42 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#ffd24a', radius: 100, life: 34 }));
    this.visuals.push(new Visual('burst', x, y, { color: '#ffffff', radius: 60, life: 28 }));
    this.screenShake = Math.max(this.screenShake, 18);
    for (let i = 0; i < 54; i++) {
      const a = (Math.PI * 2 * i) / 54;
      const spd = 6 + (i % 10);
      const col = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#fff6d0' : '#ffd24a';
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, col, 52 + (i % 20), {
          gravity: 0.07,
          drag: 0.97,
          size: DOT * 2.2,
          shrink: true,
        })
      );
    }
  }

  // Tình Yêu's Staff Charge: pink-gold motes flowing UP into the Staff
  // companion, matching its own aura color so it reads as "feeding" it.
  _princessStaffCharge(x, y) {
    this.visuals.push(new Visual('shockwave', x, y, { color: '#ffb3d9', radius: 80, life: 34 }));
    this.visuals.push(new Visual('burst', x, y, { color: '#fff6d0', radius: 36, life: 22 }));
    for (let i = 0; i < 30; i++) {
      const a = -Math.PI / 2 + (rand(i) - 0.5) * 1.4;
      const spd = 3 + (i % 6);
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, i % 2 ? '#ffb3d9' : '#ffd24a', 46 + (i % 18), {
          gravity: -0.04,
          drag: 0.98,
          size: DOT * 1.6,
          shrink: true,
        })
      );
    }
  }

  // Rain Princess's Cleanse: a calm ripple radiating out, like water settling —
  // deliberately the quietest effect in the roster, matching a rescue from a
  // stuck moment rather than a triumphant flourish.
  _princessCleanse(x, y) {
    this.visuals.push(new Visual('shockwave', x, y, { color: '#8fe3ff', radius: 60, life: 32 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#d8f0ff', radius: 90, life: 40 }));
    for (let i = 0; i < 18; i++) {
      const a = (Math.PI * 2 * i) / 18;
      this.particles.push(
        new Particle(x + Math.cos(a) * 20, y + Math.sin(a) * 20, Math.cos(a) * 1.2, Math.sin(a) * 1.2, '#d8f0ff', 44 + (i % 14), {
          gravity: 0,
          drag: 0.98,
          size: DOT * 1.3,
          shrink: true,
        })
      );
    }
  }

  // Frost Nova: an expanding ring of cold with ice shards thrown out flat and
  // hanging in the air (almost no gravity) — the opposite of the fire effects,
  // whose embers rise and whose debris falls fast.
  _frostnova(x, y) {
    this.visuals.push(new Visual('shockwave', x, y, { color: '#d8f0ff', radius: 130, life: 26 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#8fe3ff', radius: 96, life: 22 }));
    this.visuals.push(new Visual('burst', x, y, { color: '#ffffff', radius: 44, life: 14 }));
    this.screenShake = Math.max(this.screenShake, 12);
    // Shards drift outward and settle slowly — frost hangs, it doesn't fall.
    for (let i = 0; i < 40; i++) {
      const a = (Math.PI * 2 * i) / 40 + rand(i) * 0.2;
      const spd = 4 + (i % 6);
      const col = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#d8f0ff' : '#8fe3ff';
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, col, 34 + (i % 16), {
          gravity: 0.04,
          drag: 0.95,
          size: DOT * 2,
          fadeTo: '#3fb8b0',
          shrink: true,
        })
      );
    }
  }

  // Wind Blades: several crossing slash arcs at different angles plus a spiral of
  // small motes. Reads as SPEED (many thin fast strokes) rather than as impact.
  _windblade(x, y) {
    for (let s = 0; s < 4; s++) {
      this.visuals.push(
        new Visual('slash', x, y, {
          color: s % 2 ? '#ffffff' : '#bfe8ff',
          radius: 54 + s * 12,
          life: 14 + s * 2,
          angle: -0.9 + s * 0.55, // crossing at different angles
        })
      );
    }
    this.visuals.push(new Visual('burst', x, y, { color: '#eaffff', radius: 34, life: 10 }));
    this.screenShake = Math.max(this.screenShake, 10);
    // A spiral: the launch angle advances with the index, so the motes leave in a
    // curl rather than an even starburst.
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * Math.PI * 4;
      const spd = 6 + (i % 7);
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd * 0.6, i % 2 ? '#ffffff' : '#bfe8ff', 22 + (i % 10), {
          gravity: -0.02, // wind lifts
          drag: 0.94,
          size: DOT * 1.5,
          shrink: true,
        })
      );
    }
  }

  // Holy Light: a pillar of light coming DOWN onto the target, a white flash, and
  // gold motes rising back up. The rising motes are what separate it from the
  // meteor's falling debris.
  _holylight(x, y, W, H) {
    this.visuals.push(new Visual('beam', x, y, { color: '#fff6d0', w: DOT * 18, life: 20 }));
    this.visuals.push(new Visual('flash', 0, 0, { color: '#fff8e0', w: W, h: H, life: 12 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#ffffff', radius: 120, life: 24 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#ffd24a', radius: 84, life: 20 }));
    this.visuals.push(new Visual('burst', x, y, { color: '#ffffff', radius: 52, life: 16 }));
    this.screenShake = Math.max(this.screenShake, 16);
    for (let i = 0; i < 44; i++) {
      const a = -Math.PI / 2 + (rand(i) - 0.5) * 1.8;
      const spd = 3 + (i % 6);
      const col = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#fff6d0' : '#ffd24a';
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, col, 32 + (i % 14), {
          gravity: -0.08, // motes ASCEND — this is holy light, not an explosion
          drag: 0.97,
          size: DOT * 2,
          shrink: true,
        })
      );
    }
  }

  // Void Rend: space tears open. Particles first rush INWARD (drawn as motes
  // launched outward with a strong inward drag is not convincing, so they are
  // spawned on a ring and given inward velocity), then a violent outward burst.
  _voidrend(x, y, W, H) {
    this.visuals.push(new Visual('flash', 0, 0, { color: '#2a1040', w: W, h: H, life: 10 })); // darkens, not brightens
    this.visuals.push(new Visual('beam', x, y, { color: '#c77dff', w: DOT * 10, life: 22 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#b06cf0', radius: 140, life: 28 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#4a1070', radius: 100, life: 22 }));
    this.visuals.push(new Visual('burst', x, y, { color: '#e6b3ff', radius: 56, life: 15 }));
    this.screenShake = Math.max(this.screenShake, 24);
    // The implosion: motes spawned out on a ring, travelling IN toward the tear.
    for (let i = 0; i < 30; i++) {
      const a = (Math.PI * 2 * i) / 30;
      const r = 90 + rand(i) * 40;
      const spd = 5 + (i % 4);
      this.particles.push(
        new Particle(x + Math.cos(a) * r, y + Math.sin(a) * r, -Math.cos(a) * spd, -Math.sin(a) * spd, '#e6b3ff', 20 + (i % 8), {
          drag: 0.99,
          size: DOT * 1.5,
          fadeTo: '#4a1070',
        })
      );
    }
    // Then the outward tear.
    for (let i = 0; i < 40; i++) {
      const a = (Math.PI * 2 * i) / 40;
      const spd = 6 + (i % 9);
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, i % 2 ? '#b06cf0' : '#f0d6ff', 30 + (i % 14), {
          gravity: 0.1,
          drag: 0.95,
          size: DOT * 2.5,
          fadeTo: '#2a0a44',
          shrink: true,
        })
      );
    }
  }

  // Dawnbreaker: the Staff at full power, and the biggest effect in the game —
  // a sunrise. A warm full-screen flash, TWIN pillars, three gold shockwaves and
  // a wide fountain of light. It is the last skill a kid earns, so it should feel
  // like more than the meteor they got in chapter 1.
  _dawnbreaker(x, y, W, H) {
    this.visuals.push(new Visual('flash', 0, 0, { color: '#fff2c0', w: W, h: H, life: 16 }));
    this.visuals.push(new Visual('beam', x - 26, y, { color: '#ffffff', w: DOT * 12, life: 24 }));
    this.visuals.push(new Visual('beam', x + 26, y, { color: '#ffd24a', w: DOT * 12, life: 24 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#ffffff', radius: 170, life: 30 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#ffd24a', radius: 130, life: 26 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#ffb347', radius: 92, life: 20 }));
    this.visuals.push(new Visual('burst', x, y, { color: '#ffffff', radius: 70, life: 18 }));
    this.screenShake = Math.max(this.screenShake, 30);
    for (let i = 0; i < 70; i++) {
      const a = (Math.PI * 2 * i) / 70;
      const spd = 6 + (i % 10);
      const col = i % 4 === 0 ? '#ffffff' : i % 4 === 1 ? '#fff6d0' : i % 4 === 2 ? '#ffd24a' : '#ffb347';
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd - 3, col, 36 + (i % 18), {
          gravity: 0.18,
          drag: 0.96,
          size: DOT * 2.5,
          shrink: true,
        })
      );
    }
  }

  // An empowered Staff-of-Wisdom cast landing. Always layered on top of the
  // hit skill's own effect (see the 'staffcast' case in play()), so this is
  // what tells the kid "the CHARGE did that" — by far the longest-held effect
  // in the game (STAFFCAST_FRAMES, ~3s). The struck monster is held frozen
  // (main.js sets frozenTimer = STAFFCAST_FRAMES) for exactly this long, so
  // the fight visibly PAUSES for the cast rather than continuing to
  // march/attack underneath it — the effect is what fills that pause.
  // Two speeds layered together: a fast, punchy IMPACT beat (shockwaves,
  // burst, spiraling runes — all quick, like every other skill) reading as
  // the initial shock, followed by a SLOW ambient phase (the columns holding,
  // and a ring of orbiting sparks circling the frozen monster) that stretches
  // out to fill the whole frozen window, so a 3-second hold never reads as
  // "the effect ended and nothing is happening."
  _staffcast(x, y, W, H) {
    this.visuals.push(new Visual('flash', 0, 0, { color: '#eaf6ff', w: W, h: H, life: 14 }));
    // Five light columns fanned across the impact (not one pillar) — a row of
    // descending flares reads as "the sky opened". `hold` keeps each one at
    // FULL brightness for nearly its whole life instead of fading from frame
    // one, so the columns visibly STAND for the entire frozen window — life
    // is STAFFCAST_FRAMES itself, ~12x any other beam in the file
    // (holylight/dawnbreaker sit at 20-24). 'flarebeam' (not 'beam') so each
    // column is a soft-edged, gently flickering flare rather than one flat
    // solid block — it's on screen for 3 whole seconds, long enough that a
    // static rectangle would read as scenery rather than living light.
    const COLS = 5;
    for (let c = 0; c < COLS; c++) {
      const off = (c - (COLS - 1) / 2) * DOT * 9;
      const col = c % 2 === 0 ? '#fff6d0' : '#8ff0ff';
      this.visuals.push(
        new Visual('flarebeam', x + off, y, {
          color: col,
          w: DOT * (c === Math.floor(COLS / 2) ? 10 : 7),
          life: STAFFCAST_FRAMES - Math.abs(c - (COLS - 1) / 2) * 12,
          hold: 0.85,
          seed: c,
        })
      );
    }
    // The fast impact beat: stacked shockwaves + a bright core, all quick
    // (life 30-60, same range as every other skill's impact) so the initial
    // "shock" lands with a hard snap instead of a slow bloom.
    this.visuals.push(new Visual('shockwave', x, y, { color: '#8ff0ff', radius: 170, life: 60 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#ffd24a', radius: 130, life: 52 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#ffffff', radius: 90, life: 40 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#ffffff', radius: 210, life: 40 }));
    this.visuals.push(new Visual('burst', x, y, { color: '#ffffff', radius: 70, life: 30 }));
    this.screenShake = Math.max(this.screenShake, 30);
    // A ring of runes launched on a spiral (same trick as windblade's curl:
    // the launch angle advances with the index) so they swing around the
    // impact before flying outward — part of the fast impact beat.
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 3;
      const spd = 3 + (i % 5) * 0.5;
      const col = i % 2 ? '#8ff0ff' : '#ffd24a';
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd * 0.7, col, 70 + (i % 20), {
          gravity: 0,
          drag: 0.97,
          size: DOT * 1.4,
          shrink: true,
        })
      );
    }
    // The outward starburst: slower than the impact beat, its motes hanging
    // and drifting rather than snapping away, bridging into the ambient phase.
    for (let i = 0; i < 60; i++) {
      const a = (Math.PI * 2 * i) / 60 + rand(i) * 0.15;
      const spd = 3 + (i % 8) * 0.7;
      const col = i % 4 === 0 ? '#ffffff' : i % 4 === 1 ? '#fff6d0' : i % 4 === 2 ? '#ffd24a' : '#8ff0ff';
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd - 1, col, 90 + (i % 60), {
          gravity: -0.01, // hangs and drifts up gently rather than falling
          drag: 0.992,
          size: DOT * 2,
          shrink: true,
        })
      );
    }
    // The AMBIENT phase: a ring of slow sparks launched on tiny individual
    // orbits (angular launch velocity around the impact point, same spiral
    // trick as the rune-ring but far gentler) so they circle the frozen
    // monster for almost the entire freeze instead of flying away — this is
    // what carries the "shocked and held" read across the full 5 seconds,
    // echoing the Staff companion's own orbiting motif (drawStaffCompanion)
    // and twinkle (drawStaffStars) so the effect and the companion read as
    // the same magic all the way through.
    for (let i = 0; i < 16; i++) {
      const a0 = (Math.PI * 2 * i) / 16;
      const r = 50 + (i % 3) * 14;
      const tangent = i % 2 ? 1 : -1; // half orbit one way, half the other
      this.particles.push(
        new Particle(x + Math.cos(a0) * r, y + Math.sin(a0) * r * 0.6, -Math.sin(a0) * 1.1 * tangent, Math.cos(a0) * 0.7 * tangent, i % 2 ? '#8ff0ff' : '#ffd24a', STAFFCAST_FRAMES - 20 - (i % 30), {
          gravity: 0,
          drag: 0.998,
          size: DOT * 1.3,
          shrink: true,
        })
      );
    }
    // A handful of tiny star-sparkles lingering longest of all, twinkling as
    // they fade — the last thing on screen, timed to fade out right as the
    // monster thaws.
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10 + 0.3;
      const r = 30 + rand(i + 20) * 50;
      this.particles.push(
        new Particle(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, Math.cos(a) * 0.3, Math.sin(a) * 0.3 - 0.15, '#fff6d0', STAFFCAST_FRAMES - 10 - (i % 20), {
          gravity: 0,
          drag: 0.996,
          size: DOT * 1.2,
          shrink: true,
        })
      );
    }
  }

  // A boss phase falling. NOT a death (the monster is still standing), so it is
  // deliberately different from `death`: a dark implosion followed by a rising
  // column of energy, reading as "he is changing", not "he is gone".
  _phaseChange(x, y, W, H) {
    this.visuals.push(new Visual('flash', 0, 0, { color: '#3a1050', w: W, h: H, life: 14 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#e0503a', radius: 150, life: 30 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#b06cf0', radius: 110, life: 24 }));
    this.visuals.push(new Visual('beam', x, y, { color: '#ff7a2f', w: DOT * 16, life: 26 }));
    this.screenShake = Math.max(this.screenShake, 30);
    // A column of energy erupting upward out of him.
    for (let i = 0; i < 50; i++) {
      const a = -Math.PI / 2 + (rand(i) - 0.5) * 0.9;
      const spd = 7 + (i % 9);
      const col = i % 3 === 0 ? '#ff7a2f' : i % 3 === 1 ? '#b06cf0' : '#ffd24a';
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, col, 34 + (i % 16), {
          gravity: 0.1,
          drag: 0.97,
          size: DOT * 2.5,
          shrink: true,
        })
      );
    }
  }

  // ---- Stageboss signature attacks (see bossattacks.js) -------------------
  // All of these land ON the hero (main.js passes hero x/y), so they are
  // built to read as impact/incoming rather than a launch — the opposite
  // reading of the hero's own skills above.

  // Ground Slam (stageboss_ogre): debris kicked straight up along the ground
  // line, not thrown outward — a wide, low, heavy burst.
  _groundslam(x, y) {
    this.visuals.push(new Visual('shockwave', x, y, { color: '#a87c4a', radius: 120, life: 24 }));
    this.visuals.push(new Visual('burst', x, y, { color: '#e0c090', radius: 40, life: 12 }));
    this.screenShake = Math.max(this.screenShake, 18);
    for (let i = 0; i < 34; i++) {
      const a = Math.PI + (rand(i) - 0.5) * Math.PI * 0.9; // spread along the ground, not up
      const spd = 3 + (i % 6);
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, -1 - (i % 3) * 0.3, i % 2 ? '#a87c4a' : '#6b5334', 26 + (i % 10), {
          gravity: 0.3,
          drag: 0.9,
          size: DOT * 2,
          shrink: true,
        })
      );
    }
  }

  // Fire Breath (boss_dragon): a directional cone of flame from monster
  // toward the hero, not a radial burst — reuses the explosion's flame
  // particle recipe but aimed.
  _firebreath(x, y) {
    this.visuals.push(new Visual('beam', x, y, { color: '#ff8a2b', w: DOT * 20, life: 18 }));
    this.visuals.push(new Visual('burst', x, y, { color: '#fff2b0', radius: 44, life: 12 }));
    this.screenShake = Math.max(this.screenShake, 12);
    for (let i = 0; i < 36; i++) {
      const a = -Math.PI / 2 + (rand(i) - 0.5) * 0.8; // narrow cone, not a starburst
      const spd = 3 + (i % 6);
      const flame = i % 3 === 0 ? '#fff2b0' : i % 3 === 1 ? '#ff8a2b' : '#e0431f';
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd - 2, flame, 24 + (i % 10), {
          gravity: -0.05,
          drag: 0.93,
          size: DOT * 2.5,
          fadeTo: '#4a3a3a',
          shrink: true,
        })
      );
    }
  }

  // Shadow Bolt (stageboss_darklord): the smallest/cheapest effect in the set
  // to match its short windup — one fast dark bolt plus a thin trail.
  _shadowbolt(x, y, W, H) {
    this.visuals.push(new Visual('bolt', x, y, { color: '#5a2a7a', color2: '#e6b3ff', life: 14 }));
    this.visuals.push(new Visual('burst', x, y, { color: '#b06cf0', radius: 30, life: 10 }));
    this.screenShake = Math.max(this.screenShake, 10);
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI * 2 * i) / 16;
      const spd = 3 + (i % 4);
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, i % 2 ? '#b06cf0' : '#5a2a7a', 18 + (i % 8), {
          gravity: 0.08,
          drag: 0.94,
          size: DOT * 1.5,
          shrink: true,
        })
      );
    }
  }

  // Ink Splatter (boss_scribe): asymmetric spread — motes fall then splatter
  // sideways on arrival, instead of an even radial burst.
  _inksplatter(x, y) {
    this.visuals.push(new Visual('burst', x, y, { color: '#3a1a4a', radius: 46, life: 14 }));
    this.screenShake = Math.max(this.screenShake, 10);
    for (let i = 0; i < 30; i++) {
      const a = Math.PI / 2 + (rand(i) - 0.5) * 2.2; // biased downward, splatters wide
      const spd = 2 + (i % 7);
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd * 0.6, i % 2 ? '#4a1a5a' : '#1a0a24', 22 + (i % 12), {
          gravity: 0.22,
          drag: 0.92,
          size: DOT * 1.8,
          shrink: true,
        })
      );
    }
  }

  // Gale Slash (boss_windserpent): the hero's own `slash` recipe, but tinted
  // cyan/white and faster/thinner so a kid never mistakes it for their own hit.
  _galeslash(x, y) {
    this.visuals.push(new Visual('slash', x, y, { color: '#eaffff', radius: 56, life: 12, angle: 0.5 }));
    this.visuals.push(new Visual('slash', x, y, { color: '#8fe3ff', radius: 44, life: 14, angle: 0.4 }));
    this.screenShake = Math.max(this.screenShake, 8);
    for (let i = 0; i < 18; i++) {
      const a = 0.2 + (i / 18) * 1.4;
      const spd = 6 + (i % 5);
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, i % 2 ? '#ffffff' : '#8fe3ff', 16 + (i % 6), {
          gravity: -0.02,
          drag: 0.93,
          size: DOT * 1.3,
        })
      );
    }
  }

  // Stone Fist (boss_guardian_statue): heavy, slow-falling debris + one big
  // low shockwave — the longest life in the set, matching its 40-frame windup.
  _stonefist(x, y) {
    this.visuals.push(new Visual('shockwave', x, y, { color: '#8a8a94', radius: 150, life: 34 }));
    this.visuals.push(new Visual('burst', x, y, { color: '#c8c8d0', radius: 50, life: 18 }));
    this.screenShake = Math.max(this.screenShake, 22);
    for (let i = 0; i < 26; i++) {
      const a = (Math.PI * 2 * i) / 26;
      const spd = 2 + (i % 4);
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd - 1, i % 2 ? '#8a8a94' : '#5a5a64', 40 + (i % 16), {
          gravity: 0.22,
          drag: 0.96,
          size: DOT * 2.2,
        })
      );
    }
  }

  // Shadow Grasp (boss_formless / Devourer phase 1): thin tendril streams
  // curving in toward the hero from the screen edges — sustained pull, not a
  // single burst like voidrend's opening ring.
  _shadowgrasp(x, y, W, H) {
    this.visuals.push(new Visual('flash', 0, 0, { color: '#1a0a24', w: W, h: H, life: 10 }));
    this.screenShake = Math.max(this.screenShake, 10);
    for (let s = 0; s < 6; s++) {
      const edgeA = (Math.PI * 2 * s) / 6 + rand(s) * 0.4;
      const ex = x + Math.cos(edgeA) * 220;
      const ey = y + Math.sin(edgeA) * 140;
      for (let i = 0; i < 8; i++) {
        const t = i / 8;
        const px = ex + (x - ex) * t;
        const py = ey + (y - ey) * t;
        this.particles.push(
          new Particle(px, py, (x - ex) * 0.02, (y - ey) * 0.02, i % 2 ? '#4a1a5a' : '#1a0a24', 26 + (i % 8), {
            gravity: 0,
            drag: 0.98,
            size: DOT * 1.6,
            shrink: true,
          })
        );
      }
    }
  }

  // Arcane Pulse (stageboss_staffguardian): an expanding ring of discrete,
  // evenly-spaced rune motes — a static glyph feel rather than a smooth burst.
  _arcanepulse(x, y) {
    this.visuals.push(new Visual('shockwave', x, y, { color: '#8ff0ff', radius: 110, life: 26 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#ffd24a', radius: 80, life: 22 }));
    this.screenShake = Math.max(this.screenShake, 12);
    for (let i = 0; i < 20; i++) {
      const a = (Math.PI * 2 * i) / 20; // evenly spaced, not randomized — reads as glyphs
      const r = 70;
      this.particles.push(
        new Particle(x + Math.cos(a) * r, y + Math.sin(a) * r, Math.cos(a) * 1.5, Math.sin(a) * 1.5, i % 2 ? '#8ff0ff' : '#ffd24a', 28, {
          gravity: 0,
          drag: 0.96,
          size: DOT * 1.6,
        })
      );
    }
  }

  // Iron Slam (boss_warden): a fast horizontal streak (the chain lashing out)
  // plus sparse heavy iron-gray debris.
  _ironslam(x, y, W, H) {
    this.visuals.push(new Visual('beam', x, y, { color: '#9098a0', w: DOT * 8, life: 16 }));
    this.visuals.push(new Visual('burst', x, y, { color: '#c0c8d0', radius: 36, life: 12 }));
    this.screenShake = Math.max(this.screenShake, 16);
    for (let i = 0; i < 14; i++) {
      const a = (Math.PI * 2 * i) / 14;
      const spd = 3 + (i % 3);
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, '#707880', 24 + (i % 8), {
          gravity: 0.2,
          drag: 0.94,
          size: DOT * 1.8,
        })
      );
    }
  }

  // Lantern Curse (boss_jailer): a slow radial sickly-green wash, low particle
  // count, long fade — the gentlest-LOOKING attack but the eeriest, matching
  // its deliberately dull/unsettling sound cue.
  _lanterncurse(x, y, W, H) {
    this.visuals.push(new Visual('flash', 0, 0, { color: '#3a5a2a', w: W, h: H, life: 24 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#9adf6a', radius: 90, life: 30 }));
    for (let i = 0; i < 14; i++) {
      const a = (Math.PI * 2 * i) / 14;
      const spd = 1.5 + (i % 3);
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd - 0.5, '#9adf6a', 40 + (i % 14), {
          gravity: -0.02,
          drag: 0.97,
          size: DOT * 1.5,
          fadeTo: '#2a3a1a',
          shrink: true,
        })
      );
    }
  }

  // War Cry Slash (boss_general): the slash recipe in red/orange with a wider
  // shockwave than Gale Slash — reads as a heavier, angrier hit.
  _warcryslash(x, y) {
    this.visuals.push(new Visual('slash', x, y, { color: '#ffffff', radius: 64, life: 16, angle: -0.3 }));
    this.visuals.push(new Visual('slash', x, y, { color: '#e0503a', radius: 52, life: 18, angle: -0.4 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#ff7a4a', radius: 100, life: 20 }));
    this.screenShake = Math.max(this.screenShake, 16);
    for (let i = 0; i < 22; i++) {
      const a = -0.7 + (i / 22) * 1.6;
      const spd = 7 + (i % 5);
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, i % 2 ? '#ffffff' : '#e0503a', 20 + (i % 8), {
          gravity: 0.12,
          drag: 0.93,
          size: DOT * 1.6,
        })
      );
    }
  }

  // Void Maw (Devourer phase 2): motes pulled inward first — like voidrend's
  // opening — then a burst outward, matching his torso-mouth design.
  _voidmaw(x, y) {
    this.visuals.push(new Visual('shockwave', x, y, { color: '#b06cf0', radius: 130, life: 26 }));
    this.visuals.push(new Visual('burst', x, y, { color: '#e6b3ff', radius: 50, life: 14 }));
    this.screenShake = Math.max(this.screenShake, 20);
    for (let i = 0; i < 26; i++) {
      const a = (Math.PI * 2 * i) / 26;
      const r = 80 + rand(i) * 30;
      const spd = 5 + (i % 4);
      this.particles.push(
        new Particle(x + Math.cos(a) * r, y + Math.sin(a) * r, -Math.cos(a) * spd, -Math.sin(a) * spd, '#e6b3ff', 16 + (i % 6), {
          drag: 0.98,
          size: DOT * 1.5,
          fadeTo: '#3a1050',
        })
      );
    }
    for (let i = 0; i < 34; i++) {
      const a = (Math.PI * 2 * i) / 34;
      const spd = 6 + (i % 8);
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, i % 2 ? '#b06cf0' : '#4a1070', 26 + (i % 12), {
          gravity: 0.08,
          drag: 0.95,
          size: DOT * 2,
          fadeTo: '#1a0a24',
          shrink: true,
        })
      );
    }
  }

  // Devour Sky (Devourer phase 3): the biggest attack in the set — a
  // full-screen dark flash, multiple shockwaves, and debris pulled from the
  // screen edges toward the hero before a final burst. The finale's biggest
  // ATTACK, the counterpart to Dawnbreaker being its biggest HERO effect.
  _devoursky(x, y, W, H) {
    this.visuals.push(new Visual('flash', 0, 0, { color: '#0a0512', w: W, h: H, life: 20 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#b06cf0', radius: 180, life: 34 }));
    this.visuals.push(new Visual('shockwave', x, y, { color: '#4a1070', radius: 130, life: 28 }));
    this.visuals.push(new Visual('beam', x, y, { color: '#2a1040', w: DOT * 14, life: 26 }));
    this.visuals.push(new Visual('burst', x, y, { color: '#e6b3ff', radius: 60, life: 18 }));
    this.screenShake = Math.max(this.screenShake, 34);
    // Debris pulled in from the far edges of the screen.
    for (let s = 0; s < 24; s++) {
      const edgeA = (Math.PI * 2 * s) / 24;
      const ex = x + Math.cos(edgeA) * 260;
      const ey = y + Math.sin(edgeA) * 180;
      this.particles.push(
        new Particle(ex, ey, (x - ex) * 0.03, (y - ey) * 0.03, s % 2 ? '#b06cf0' : '#e6b3ff', 30 + (s % 10), {
          gravity: 0,
          drag: 0.97,
          size: DOT * 2,
          fadeTo: '#1a0a24',
          shrink: true,
        })
      );
    }
    // The final outward burst.
    for (let i = 0; i < 50; i++) {
      const a = (Math.PI * 2 * i) / 50;
      const spd = 7 + (i % 10);
      this.particles.push(
        new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#b06cf0' : '#4a1070', 32 + (i % 14), {
          gravity: 0.12,
          drag: 0.95,
          size: DOT * 2.5,
          shrink: true,
        })
      );
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

// Pixel mask for Ánh Dương's Shield aura: a classic heater-shield silhouette
// (pointed top notch, angular shoulders, tapering to a point) — not a round
// blob, so it actually reads as a shield. 'k' outline, 'L' light face,
// 'D' dark face (the two-tone split down the middle), 'h' highlight glint.
const SHIELD_MASK = [
  '  kkkkkkkk  ',
  ' kLLLkDDDk ',
  'kLLLLkDDDDk',
  'kLLhLkDDDDk',
  'kLLLLkDDDDk',
  'kLLLLkDDDDk',
  'kLLLLkDDDDk',
  ' kLLLkDDDk ',
  ' kLLLkDDDk ',
  '  kLLkDDk  ',
  '  kLLkDDk  ',
  '   kLkDk   ',
  '   kLkDk   ',
  '    kkk    ',
];
const SHIELD_W = SHIELD_MASK[0].length;
const SHIELD_H = SHIELD_MASK.length;

// A persistent shield-shaped ward for Ánh Dương's Shield, drawn over the hero
// for as long as the ward is armed (see hero.shielded in main.js). Centered
// on him like an enveloping ward, but translucent — solid fill would hide the
// hero sprite completely, which reads as "he vanished," not "he is
// protected." Uses an actual shield silhouette (see SHIELD_MASK) instead of
// the round rank aura, plus a soft glow + slow rotation so it still reads as
// magic, not a static sticker.
export function drawShieldAura(ctx, cx, cy, r, color, tick) {
  const pulse = 0.5 + 0.5 * Math.sin(tick * 0.08);
  const glowR = r * (0.95 + pulse * 0.15);
  const grad = ctx.createRadialGradient(cx, cy, glowR * 0.2, cx, cy, glowR);
  grad.addColorStop(0, hexA(color, 0.35 + pulse * 0.15));
  grad.addColorStop(0.6, hexA(color, 0.15));
  grad.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
  ctx.fill();

  // Slight rock (not a full spin) so the shield reads as held/animated
  // without ever looking upside-down.
  const rock = Math.sin(tick * 0.05) * 0.12;
  const px = r / SHIELD_W; // pixel size scaled to the aura radius, ~hero-sized
  const w = SHIELD_W * px;
  const h = SHIELD_H * px;
  const faceColors = { L: '#ffcf6b', D: '#e08a2c', h: '#fff3c4', k: '#2b3a55' };

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rock);
  ctx.globalAlpha = 0.4 + pulse * 0.1; // see-through so the hero reads underneath
  for (let row = 0; row < SHIELD_H; row++) {
    const line = SHIELD_MASK[row];
    for (let col = 0; col < line.length; col++) {
      const key = line[col];
      if (key === ' ') continue;
      ctx.fillStyle = faceColors[key] || color;
      ctx.fillRect(-w / 2 + col * px, -h / 2 + row * px, px + 0.5, px + 0.5);
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// "#rrggbb" + alpha → "rgba(...)" for gradient stops.
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}
