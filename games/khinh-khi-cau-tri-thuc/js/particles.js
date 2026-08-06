// particles.js — ambient season weather (petals, shimmer, leaves, snow),
// drawn purely as a function of (index, tick) — no per-particle state
// arrays, no spawn/recycle bookkeeping. Modeled on the technique in
// games/anh-hung-ban-phim/js/biomes.js's drawBiomeWeather, but standalone
// (no shared module exists across games) and adapted for open sky: this
// scene has no ground line, so particles fall across the FULL canvas
// height instead of being anchored to a horizon.

export const SEASON_WEATHER = {
  spring: { kind: "petals", color: "#ffd6f0", count: 16 },
  summer: { kind: "shimmer", color: "#fff8dc", count: 10, alpha: 0.08 },
  autumn: { kind: "leaves", color: "#d97706", count: 18 },
  winter: { kind: "snow", color: "#ffffff", count: 22 },
};

// Deterministic pseudo-random in [0,1) from an integer seed — keeps
// particle placement organic without Math.random(), so nothing needs to
// persist state between frames.
function rnd(seed) {
  const s = Math.sin(seed * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

export function drawSeasonParticles(ctx, w, h, weather, tick) {
  if (!weather) return;
  const n = weather.count;

  switch (weather.kind) {
    case "petals": {
      ctx.fillStyle = weather.color;
      for (let i = 0; i < n; i++) {
        const sway = Math.sin((tick + i * 40) / 500) * 22;
        const x = (rnd(i + 1) * w + sway + tick * 0.012 + w) % w;
        const y = (rnd(i + 2) * h + tick * 0.03) % h;
        ctx.fillRect(x, y, 4, 2.5);
      }
      break;
    }
    case "snow": {
      ctx.fillStyle = weather.color;
      for (let i = 0; i < n; i++) {
        const drift = Math.sin((tick + i * 30) / 700) * 14;
        const x = (rnd(i + 1) * w + drift + w) % w;
        const y = (rnd(i + 2) * h + tick * (0.02 + rnd(i + 3) * 0.02)) % h;
        const s = i % 3 === 0 ? 4 : 2.5;
        ctx.fillRect(x, y, s, s);
      }
      break;
    }
    case "leaves": {
      ctx.fillStyle = weather.color;
      for (let i = 0; i < n; i++) {
        const rock = Math.sin((tick + i * 25) / 260);
        const x = (rnd(i + 1) * w + tick * (0.05 + rnd(i + 2) * 0.03) + w) % w;
        const y = (rnd(i + 3) * h + tick * 0.018) % h;
        if (rock > 0) ctx.fillRect(x, y, 5, 2.5);
        else ctx.fillRect(x, y, 2.5, 5);
      }
      break;
    }
    case "shimmer": {
      ctx.save();
      ctx.globalAlpha = weather.alpha ?? 0.08;
      ctx.fillStyle = weather.color;
      for (let i = 0; i < n; i++) {
        const wobble = Math.sin((tick + i * 50) / 400) * 30;
        const x = (rnd(i + 1) * w + wobble + w) % w;
        const y = rnd(i + 2) * h * 0.7;
        ctx.fillRect(x, y, 26, 2);
      }
      ctx.restore();
      break;
    }
  }
}
