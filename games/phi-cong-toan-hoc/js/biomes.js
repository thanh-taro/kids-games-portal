// biomes.js — the per-stage space backdrops.
//
// Each biome's comment states the MEANING it carries; preserve that when
// editing. The through-line across the three chapters is the main thing to keep
// intact, and it is the same technique the typing game uses (its villain's
// spire grows nearer stage by stage across chapter 1, recedes in chapter 2, and
// returns in chapter 3):
//
//   CHAPTER 1 (Earth Order) — EARTH SHRINKS. It fills a third of the sky in
//     stage 1 and is a blue pinprick by the outer dark. The kid is flying AWAY
//     from everything safe, and the backdrop says so without a word of text.
//
//   CHAPTER 2 (Rescue Allies) — THE DARK STAR GROWS, and so does the kid's own
//     light. Hắc Tinh appears as a red-black speck on the horizon and swells
//     across the five prison worlds; meanwhile each rescued ally adds a beacon
//     to the field, so the sky gains friendly lights at the same rate it gains
//     dread. Chapter 2 is the only chapter where both happen at once.
//
//   CHAPTER 3 (Rescue The Galaxy) — THE DARK STAR IS THE PLACE. It stops being
//     scenery and becomes the arena: by dark_core its broken shell is the
//     horizon. The last backdrop of the game is chapter 2's distant speck, now
//     underfoot.
//
// LEGIBILITY RULES (the typing game's `library` biome had to be dimmed because
// its bright bookshelves made a monster invisible — same trap here, worse,
// because a starfield is made of the same bright dots as a bullet):
//   * Nothing in a biome may out-read a monstership. Backdrop elements stay
//     desaturated and low-contrast; the saturated reds and violets belong to
//     the enemies alone.
//   * `glow` and `nebula` are ADDITIVE and must stay under 0.16 alpha. Above
//     that a tracer crossing a nebula disappears into it.
//   * Nothing is drawn below m.playBottom — the quest box owns that space.
//
// A biome is data: sky gradient stops, a nebula spec, a landmark, weather, and
// an optional additive light pass. A genuinely new look is one more case in
// drawLandmark or drawWeather.

import { allySprite } from './sprites.js';
import { drawSpriteCentered, DOT } from './render.js';

// Low-contrast surface marks for planet kinds that don't get a bespoke
// per-kind treatment in drawPlanet() (jupiter/moon/earth/darkcore have their
// own bands/craters/continents/cracks below). `generic` is the fallback for
// any kind not listed here, so a new planet can never spin with a bare disc.
const MARKS = {
  ice:     { color: '#dff6ff', n: 6, alpha: 0.18 },   // frost plains
  ember:   { color: '#ff9d3a', n: 5, alpha: 0.22 },   // lava seams
  mars:    { color: '#d98a5a', n: 5, alpha: 0.18 },   // dust basins
  generic: { color: '#ffffff', n: 5, alpha: 0.14 },   // unnamed-world fallback
};

// Every planet `kind` that drawPlanet() renders with real surface detail —
// the bespoke cases (jupiter/moon/earth/darkcore) plus every MARKS entry.
// `verify.js` asserts every `kind` used in BIOMES is a member of this set,
// so a biome can never ship a planet that spins with nothing on it.
export const PLANET_SURFACE_KINDS = new Set([
  'jupiter', 'moon', 'earth', 'darkcore', ...Object.keys(MARKS),
]);

export const BIOMES = {
  // =========================================================================
  // CHAPTER 1 — Lệnh Từ Trái Đất. Earth recedes stage by stage.
  // =========================================================================

  // Home. Earth huge and warm at the bottom edge — the thing being defended is
  // literally behind the kid's ship.
  earth_orbit: {
    name: 'Quỹ Đạo Trái Đất',
    sky: ['#0a1030', '#0d1440', '#101a4a'],
    nebula: null,
    planet: { kind: 'earth', at: 0.5, size: 0.62, lift: 0.86, tint: '#3d7bd6', spin: 0.055 },
    landmark: null,
    weather: 'starfield',
    glow: { at: 0.5, y: 0.9, r: 0.5, color: '#3d7bd6', alpha: 0.10 },
  },

  // The Moon: grey, close, cratered. Earth is smaller and off to one side —
  // the first frame in which home is no longer centred on the kid.
  moon: {
    name: 'Vành Đai Mặt Trăng',
    sky: ['#080c26', '#0b1034', '#0e1440'],
    nebula: null,
    planet: { kind: 'moon', at: 0.34, size: 0.4, lift: 0.9, tint: '#8f8aa8', spin: 0.03 },
    earthSpeck: { at: 0.82, y: 0.14, size: 0.1 },
    landmark: null,
    weather: 'starfield',
    glow: null,
  },

  // The asteroid belt. The first biome with real clutter in the play field, so
  // the rocks are drawn DIM and small — they must never be mistaken for a ship.
  asteroid: {
    name: 'Vành Đai Thiên Thạch',
    sky: ['#0a0820', '#0d0a28', '#100d30'],
    nebula: { at: 0.7, y: 0.35, r: 0.5, color: '#6d4aa8', alpha: 0.09 },
    planet: null,
    earthSpeck: { at: 0.14, y: 0.1, size: 0.06 },
    landmark: 'asteroids',
    weather: 'debris',
    glow: null,
  },

  // Mars: rust-red, the first hostile-coloured world. Its hue is deliberately
  // duller than any monstership's red so the fleet still reads against it.
  mars: {
    name: 'Bụi Đỏ Sao Hoả',
    sky: ['#120a1c', '#180d20', '#1e1024'],
    nebula: { at: 0.3, y: 0.3, r: 0.45, color: '#a0522d', alpha: 0.10 },
    planet: { kind: 'mars', at: 0.62, size: 0.44, lift: 0.88, tint: '#8a4a32', spin: 0.05 },
    landmark: null,
    weather: 'iondust',
    glow: { at: 0.62, y: 0.9, r: 0.4, color: '#a0522d', alpha: 0.09 },
  },

  // Jupiter's rings: banded, vast, indifferent. The biggest object in chapter 1
  // and a reminder of scale right before the kid leaves the sun behind.
  jupiter: {
    name: 'Vành Sao Mộc',
    sky: ['#0d0a22', '#120e2c', '#161036'],
    nebula: { at: 0.5, y: 0.28, r: 0.62, color: '#c98a4a', alpha: 0.08 },
    planet: { kind: 'jupiter', at: 0.5, size: 0.85, lift: 0.95, tint: '#b8834a', spin: 0.09 },
    landmark: 'rings',
    weather: 'starfield',
    glow: null,
  },

  // The outer dark. No planet, no colour, no home in sight — and the Black
  // Commander's fleet waiting. The end of chapter 1 is the emptiest sky in it.
  outer_dark: {
    name: 'Vùng Tối Ngoài Cùng',
    sky: ['#050418', '#07061e', '#090824'],
    nebula: null,
    planet: null,
    landmark: 'wreckage',
    weather: 'starfield',
    glow: null,
  },

  // =========================================================================
  // CHAPTER 2 — Giải Cứu Đồng Đội. The dark star grows; ally beacons answer it.
  // =========================================================================

  // Prison 1 — ice. Bé Ốc, the engineer, is caged here. Pale blue and still;
  // the dark star is a barely-there smudge at the horizon's edge.
  prison_ice: {
    name: 'Nhà Tù Băng Giá',
    sky: ['#081428', '#0b1c34', '#0e2440'],
    nebula: { at: 0.5, y: 0.3, r: 0.5, color: '#5fd8d8', alpha: 0.08 },
    planet: { kind: 'ice', at: 0.28, size: 0.5, lift: 0.9, tint: '#7fe3ff', spin: 0.035 },
    darkStar: { at: 0.88, y: 0.1, size: 0.05 },
    landmark: 'cage',
    prisoner: 'engineer',
    weather: 'snow',
    glow: { at: 0.28, y: 0.9, r: 0.4, color: '#5fd8d8', alpha: 0.10 },
  },

  // Prison 2 — ember. Tia Chớp, the gunner. Warm sparks rising, the first
  // biome where something moves UPWARD other than the kid's own shots.
  prison_ember: {
    name: 'Nhà Tù Than Lửa',
    sky: ['#1a0a14', '#220e18', '#2a121e'],
    nebula: { at: 0.62, y: 0.32, r: 0.48, color: '#ff7a2f', alpha: 0.10 },
    planet: { kind: 'ember', at: 0.7, size: 0.46, lift: 0.9, tint: '#d63a12', spin: 0.06 },
    darkStar: { at: 0.14, y: 0.12, size: 0.07 },
    landmark: 'cage',
    prisoner: 'gunner',
    weather: 'embers',
    glow: { at: 0.7, y: 0.9, r: 0.42, color: '#ff7a2f', alpha: 0.11 },
  },

  // Prison 3 — storm. Vòm Xanh, the shield-tech. Sheet lightning in the far
  // clouds, so the sky itself looks like it is being shielded and struck.
  prison_storm: {
    name: 'Nhà Tù Bão Tố',
    sky: ['#0a1024', '#0e1630', '#121c3c'],
    nebula: { at: 0.4, y: 0.3, r: 0.55, color: '#9db4ff', alpha: 0.09 },
    planet: null,
    darkStar: { at: 0.82, y: 0.14, size: 0.09 },
    landmark: 'cage',
    prisoner: 'shieldman',
    weather: 'storm',
    glow: { at: 0.4, y: 0.3, r: 0.5, color: '#9db4ff', alpha: 0.08 },
  },

  // Prison 4 — the deep. La Bàn, the navigator, held where there are no stars
  // to navigate by. The darkest chapter-2 sky, and deliberately almost empty.
  prison_deep: {
    name: 'Nhà Tù Vực Sâu',
    sky: ['#04060e', '#060a16', '#080e1e'],
    nebula: { at: 0.5, y: 0.4, r: 0.45, color: '#2a5fb8', alpha: 0.07 },
    planet: null,
    darkStar: { at: 0.2, y: 0.16, size: 0.12 },
    landmark: 'cage',
    prisoner: 'navigator',
    weather: 'voidmotes',
    glow: null,
  },

  // Prison 5 — the void edge. Giáo Sư Sao, the scientist. The dark star is now
  // unmistakably a THING with structure, not a smudge: chapter 3 is visible
  // from here, which is the point of putting the last rescue in this sky.
  prison_void: {
    name: 'Nhà Tù Rìa Hư Không',
    sky: ['#0e0620', '#140828', '#1a0a30'],
    nebula: { at: 0.55, y: 0.35, r: 0.58, color: '#a855f7', alpha: 0.10 },
    planet: null,
    darkStar: { at: 0.7, y: 0.2, size: 0.2 },
    landmark: 'cage',
    prisoner: 'scientist',
    weather: 'voidmotes',
    glow: { at: 0.7, y: 0.2, r: 0.35, color: '#a855f7', alpha: 0.10 },
  },

  // =========================================================================
  // CHAPTER 3 — Cứu Dải Ngân Hà. The dark star stops being scenery.
  // =========================================================================

  // The gate. Structure fills one edge of the frame for the first time — the
  // kid has arrived somewhere rather than travelled through it.
  dark_gate: {
    name: 'Cổng Hắc Ám',
    sky: ['#10041c', '#160622', '#1c082a'],
    nebula: { at: 0.5, y: 0.3, r: 0.6, color: '#7226c4', alpha: 0.11 },
    planet: null,
    landmark: 'gate',
    weather: 'voidmotes',
    glow: { at: 0.5, y: 0.24, r: 0.4, color: '#a855f7', alpha: 0.10 },
  },

  // The field: the Destroyer's graveyard of everything it has already eaten.
  // Wreckage is drawn as SILHOUETTE only, so it never competes with the fleet.
  dark_field: {
    name: 'Bãi Tàn Ngân Hà',
    sky: ['#0c0418', '#12061e', '#180826'],
    nebula: { at: 0.35, y: 0.34, r: 0.55, color: '#7226c4', alpha: 0.10 },
    planet: null,
    landmark: 'wreckage',
    weather: 'debris',
    glow: null,
  },

  // The spire: the approach. Vertical structure on both edges, funnelling the
  // eye — and the fleet — into the centre lane where the kid's guns point.
  dark_spire: {
    name: 'Tháp Hắc Tinh',
    sky: ['#12041a', '#1a0622', '#22082a'],
    nebula: { at: 0.5, y: 0.28, r: 0.5, color: '#a855f7', alpha: 0.11 },
    planet: null,
    landmark: 'spire',
    weather: 'ash',
    glow: { at: 0.5, y: 0.2, r: 0.45, color: '#ff2d6f', alpha: 0.09 },
  },

  // The core. The dark star's broken shell IS the horizon, in the game's only
  // magenta — the same hue as the Destroyer's core lens, so boss and arena read
  // as one thing. The last sky in the game.
  dark_core: {
    name: 'Lõi Hắc Tinh',
    sky: ['#18041e', '#220628', '#2c0832'],
    nebula: { at: 0.5, y: 0.3, r: 0.7, color: '#ff2d6f', alpha: 0.12 },
    planet: { kind: 'darkcore', at: 0.5, size: 1.1, lift: 1.02, tint: '#3a0620', spin: 0.022 },
    landmark: 'core',
    weather: 'ash',
    glow: { at: 0.5, y: 0.5, r: 0.6, color: '#ff2d6f', alpha: 0.13 },
  },
};

// ---------------------------------------------------------------------------
// Drawing
//
// Layer order, back to front:
//   sky gradient -> nebula -> planet -> earthSpeck/darkStar -> landmark
//   -> (entities, drawn by main.js) -> glow -> weather
//
// Split into two entry points so entities land mid-stack: drawBiomeBack() for
// everything behind the ships, drawBiomeFront() for the additive glow and
// weather that pass in front of them.
// ---------------------------------------------------------------------------

function hash(x) {
  let t = (x ^ 0x9e3779b9) >>> 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function getBiome(id) {
  return BIOMES[id] || BIOMES.earth_orbit;
}

export function drawBiomeBack(ctx, m, biomeId, t, rescuedAllies = [], stageReward = null) {
  const b = getBiome(biomeId);
  const H = m.playBottom;

  // --- sky ---
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, b.sky[0]);
  g.addColorStop(0.55, b.sky[1]);
  g.addColorStop(1, b.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, m.w, H);

  // --- nebula (additive, capped alpha — see the legibility rules) ---
  if (b.nebula) {
    const n = b.nebula;
    const rad = ctx.createRadialGradient(
      n.at * m.w, n.y * H, 0,
      n.at * m.w, n.y * H, n.r * Math.max(m.w, H));
    rad.addColorStop(0, hexA(n.color, Math.min(0.16, n.alpha)));
    rad.addColorStop(1, hexA(n.color, 0));
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, m.w, H);
    ctx.globalCompositeOperation = prev;
  }

  // --- planet ---
  if (b.planet) drawPlanet(ctx, m, b.planet, H, t);

  // --- the two story motes: home shrinking, the dark star growing ---
  if (b.earthSpeck) {
    const s = b.earthSpeck;
    const r = Math.max(2, s.size * 40);
    ctx.fillStyle = '#3d7bd6';
    ctx.beginPath();
    ctx.arc(s.at * m.w, s.y * H, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(127,227,255,0.5)';
    ctx.beginPath();
    ctx.arc(s.at * m.w - r * 0.3, s.y * H - r * 0.3, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (b.darkStar) drawDarkStar(ctx, m, b.darkStar, H);

  // --- landmark ---
  if (b.landmark) drawLandmark(ctx, m, b.landmark, H, t, b, rescuedAllies, stageReward);
}

export function drawBiomeFront(ctx, m, biomeId, t) {
  const b = getBiome(biomeId);
  const H = m.playBottom;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, m.w, H);
  ctx.clip();

  if (b.glow) {
    const gl = b.glow;
    const rad = ctx.createRadialGradient(
      gl.at * m.w, gl.y * H, 0,
      gl.at * m.w, gl.y * H, gl.r * Math.max(m.w, H));
    rad.addColorStop(0, hexA(gl.color, Math.min(0.16, gl.alpha)));
    rad.addColorStop(1, hexA(gl.color, 0));
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, m.w, H);
    ctx.globalCompositeOperation = prev;
  }

  if (b.weather) drawWeather(ctx, m, b.weather, H, t);

  ctx.restore();
}

// #rrggbb + alpha -> rgba()
function hexA(hex, a) {
  const s = hex.replace('#', '');
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// A planet arc at the bottom of the field. `lift` > 1 pushes its centre below
// the play area so only the upper curve shows — that is what makes a world read
// as huge rather than as a ball.
function drawPlanet(ctx, m, p, H, t = 0) {
  // SIZED FROM THE FIELD'S HEIGHT, NOT THE CANVAS WIDTH.
  //
  // `size * m.w * 0.5` meant a wide window produced an enormous disc: measured on
  // a 1544px window, EVERY planet covered 67-100% of the play field, and the
  // saturated ones (prison_ember's orange, dark_core's magenta) swallowed the
  // monsterships completely. That is the one rule this file is not allowed to
  // break — scenery must never out-read the fleet.
  //
  // Tying the radius to H keeps a planet a horizon at any aspect ratio, and the
  // 0.85 factor caps how much of the field it can ever occupy. This is the same
  // fix the story tableaux needed for the same reason.
  const cx = p.at * m.w;
  const cy = p.lift * H + H * 0.35;   // push the centre further below the field
  const r = Math.min(p.size * H * 0.85, m.w * 0.55);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, m.w, H);
  ctx.clip();

  ctx.fillStyle = p.tint;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // A lit limb along the top edge, so the sphere has a light source.
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = Math.max(2, r * 0.03);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.995, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  // PLANETS SPIN — a world that stands still is the one piece of space a kid can
  // tell is wrong, and these sit on screen for a whole stage.
  //
  // The rotation is in the SURFACE ONLY: the disc, the lit limb and the radius never
  // move. Two reasons. It keeps the "scenery must never out-read the fleet" rule
  // intact by construction — nothing about the silhouette changes, so a planet cannot
  // grow into the play field. And a sphere seen from outside genuinely does look like
  // this: the outline is still, the features march across it.
  //
  // Features travel by a horizontal OFFSET that wraps at 2r, and each is faded by
  // `limbFade` as it approaches the edges, so it reads as curving away over the
  // horizon rather than sliding off a flat plate. Without that fade, continents
  // visibly clipped at the disc's edge and the planet read as a spinning coin.
  //
  // SLOW — a full turn takes ~1-2 minutes. Fast enough that a kid who looks twice
  // sees it moved, slow enough that it never competes with a descending fleet.
  const spin = t * (p.spin || 0.05);

  // CLIP THE SURFACE TO THE DISC. Every surface feature from here down is confined
  // to the planet's own circle.
  //
  // This fixes a REAL pre-existing bug that the rotation exposed: jupiter's bands
  // are drawn as `fillRect(cx - r, y, r * 2, …)`, a full-width rectangle, and the
  // only clip in this function was the play FIELD. So on any window where the disc
  // was narrower than the field, the bands ran straight across the whole sky as grey
  // stripes over the starfield and the fleet. It read as scenery painted on the
  // wrong layer, and it violates the one rule this file may not break — scenery
  // must never out-read the fleet.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  // How visible a feature is at horizontal position `dx` from the planet's centre:
  // full in the middle, gone by the limb.
  const limbFade = (dx) => {
    const k = Math.min(1, Math.abs(dx) / r);
    return Math.max(0, 1 - k * k);       // squared, so the falloff hugs the edge
  };

  // Per-kind surface detail. Bands for the gas giant, craters for the moon,
  // a swirl of cloud for Earth — all low-contrast on purpose.
  if (p.kind === 'jupiter') {
    // The bands are latitude lines, so they do NOT move vertically. Their
    // turbulence scrolls sideways instead — the classic gas-giant read.
    ctx.globalAlpha = 0.16;
    for (let i = 1; i < 7; i++) {
      ctx.fillStyle = i % 2 ? '#e0b070' : '#8a5a2a';
      const y = cy - r + (i / 7) * r * 0.9;
      ctx.fillRect(cx - r, y, r * 2, r * 0.07);
    }
    // Storm knots riding the bands, which is what actually shows the rotation.
    for (let i = 0; i < 5; i++) {
      const band = 1 + (i % 6);
      const y = cy - r + (band / 7) * r * 0.9 + r * 0.035;
      // Each knot marches right, wrapping across the disc's full width.
      const dx = ((hash(i * 53) * 2 * r + spin * r * 0.6) % (2 * r)) - r;
      ctx.globalAlpha = 0.2 * limbFade(dx);
      ctx.fillStyle = '#f0d0a0';
      ctx.beginPath();
      ctx.ellipse(cx + dx, y, r * 0.1, r * 0.035, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (p.kind === 'moon') {
    // At this planet's lift (0.9), only a thin cap above `H` is ever on
    // screen — the rest of the disc sits below the play field. Placing
    // craters by sin(latitude)*d against the FULL radius (the way earth
    // places continents) put every one of them in the hidden 90% of the
    // sphere, so the moon rendered as a bare grey disc no matter how many
    // craters this loop drew. Placing them directly inside the visible band
    // [topY, H] is what actually puts craters on screen.
    const topY = cy - r;
    const capH = Math.max(4, H - topY);
    ctx.fillStyle = '#5a5670';
    for (let i = 0; i < 9; i++) {
      const baseDx = (hash(i * 977) * 2 - 1) * r;
      const dx = (((baseDx + r) + spin * r * 0.5) % (2 * r)) - r;
      const cr = 3 + hash(i * 31) * r * 0.09;
      const y = topY + hash(i * 233) * capH;
      ctx.globalAlpha = 0.28 * limbFade(dx);
      ctx.beginPath();
      ctx.arc(cx + dx, y, cr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (p.kind === 'earth') {
    ctx.fillStyle = '#5fc23c';
    for (let i = 0; i < 5; i++) {
      const a = 1.1 + hash(i * 71) * 0.9;
      const d = r * (0.3 + hash(i * 17) * 0.5);
      const baseDx = Math.cos(a) * d;
      const dx = (((baseDx + r) + spin * r * 0.55) % (2 * r)) - r;
      ctx.globalAlpha = 0.22 * limbFade(dx);
      // Squash the continent toward the limb as well as fading it, so it
      // foreshortens the way a shape on a sphere does.
      const squash = 0.35 + 0.65 * limbFade(dx);
      ctx.beginPath();
      ctx.ellipse(cx + dx, cy - Math.abs(Math.sin(a)) * d,
        r * 0.16 * squash, r * 0.09, hash(i) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (p.kind === 'darkcore') {
    // The broken shell: jagged cracks lit from inside.
    ctx.strokeStyle = 'rgba(255,45,111,0.4)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      // The cracks rotate WITH the shell — they are part of its surface, and a
      // broken world whose damage stayed put while it turned would look painted on.
      const a0 = Math.PI * (1.1 + i * 0.13) + spin * 0.5;
      const dx = Math.cos(a0) * r * 0.98;
      ctx.globalAlpha = limbFade(dx);
      ctx.beginPath();
      ctx.moveTo(cx + dx, cy + Math.sin(a0) * r * 0.98);
      ctx.lineTo(cx + Math.cos(a0 + 0.06) * r * 0.7, cy + Math.sin(a0 + 0.06) * r * 0.7);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else {
    // ICE, EMBER and MARS had NO surface detail at all, which means they would spin
    // completely invisibly — a featureless disc rotating is indistinguishable from a
    // featureless disc standing still. Each gets a few low-contrast surface marks in
    // its own tint, purely so the rotation is legible.
    //
    // A kind with no entry here falls through to GENERIC rather than drawing
    // nothing — a future biome that adds a new planet `kind` and forgets to give
    // it a tint would otherwise ship a silently bald, invisibly-spinning world,
    // exactly the bug ice/ember/mars shipped with. `verify.js` also asserts every
    // `kind` used in BIOMES is a member of `PLANET_SURFACE_KINDS` so the gap is
    // caught before it reaches this fallback.
    // Same fix as the moon's craters above: at these planets' lift (0.88-0.9)
    // only a thin cap above `H` is visible, so marks placed by sin(latitude)*d
    // against the full radius landed in the hidden two-thirds of the sphere —
    // ice, ember and mars rendered as bare tinted discs despite this loop
    // running every frame. Placing marks directly inside the visible band
    // [topY, H] is what actually puts them on screen.
    const mk = MARKS[p.kind] || MARKS.generic;
    const topY = cy - r;
    const capH = Math.max(4, H - topY);
    ctx.fillStyle = mk.color;
    for (let i = 0; i < mk.n; i++) {
      const baseDx = (hash(i * 311) * 2 - 1) * r;
      const dx = (((baseDx + r) + spin * r * 0.5) % (2 * r)) - r;
      const y = topY + hash(i * 97) * capH;
      ctx.globalAlpha = mk.alpha * limbFade(dx);
      const squash = 0.35 + 0.65 * limbFade(dx);
      ctx.beginPath();
      ctx.ellipse(cx + dx, y,
        r * 0.14 * squash, r * 0.07, hash(i * 7) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();   // the disc clip
  ctx.restore();   // the play-field clip
}

// Hắc Tinh — the dark star. A black disc rimmed in red, growing across
// chapter 2. Never a bright object: it is a hole, and holes do not glow.
function drawDarkStar(ctx, m, s, H) {
  const cx = s.at * m.w;
  const cy = s.y * H;
  const r = Math.max(3, s.size * m.w * 0.25);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, m.w, H);
  ctx.clip();

  // rim first (a corona bleeding outward), then the disc over it
  const rad = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 2.1);
  rad.addColorStop(0, 'rgba(255,45,111,0.26)');
  rad.addColorStop(1, 'rgba(255,45,111,0)');
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = prev;

  ctx.fillStyle = '#0a0208';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,45,111,0.55)';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.stroke();

  ctx.restore();
}

// The one big set piece per stage. All are SILHOUETTES or low-contrast
// structure — a landmark that competed with the fleet would break the game.
function drawLandmark(ctx, m, kind, H, t, b = {}, rescuedAllies = [], stageReward = null) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, m.w, H);
  ctx.clip();

  if (kind === 'asteroids') {
    ctx.fillStyle = 'rgba(90,86,112,0.55)';
    for (let i = 0; i < 14; i++) {
      const x = hash(i * 313) * m.w;
      const y = (hash(i * 977) * 0.5 + 0.05) * H;
      const r = 6 + hash(i * 61) * 22;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'rings') {
    // Flat ellipse bands wrapped around the planet's own centre — they used to
    // sit at a fixed H*0.42 regardless of where drawPlanet() put the planet, so
    // on the actual layout (planet centred low, only its upper curve visible)
    // the rings floated in empty sky well above the world they belong to.
    // Mirroring drawPlanet()'s cx/cy/r keeps the bands hugging the horizon at
    // any window size, the same way the planet itself scales.
    const p = b.planet || {};
    const cx = (p.at ?? 0.5) * m.w;
    const cy = (p.lift ?? 0.95) * H + H * 0.35;
    const r = Math.min((p.size ?? 0.85) * H * 0.85, m.w * 0.55);
    ctx.strokeStyle = 'rgba(200,150,90,0.18)';
    for (let i = 0; i < 4; i++) {
      ctx.lineWidth = 2 + i;
      const rx = r * (0.78 + i * 0.11);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, rx * 0.19, 0.06, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (kind === 'wreckage') {
    // Dead hulls in silhouette, tilted at unequal angles so they read as
    // debris rather than as a pattern.
    ctx.fillStyle = 'rgba(20,16,38,0.9)';
    for (let i = 0; i < 7; i++) {
      const x = hash(i * 191) * m.w;
      const y = (0.08 + hash(i * 733) * 0.4) * H;
      const w = 26 + hash(i * 53) * 70;
      const h = 8 + hash(i * 29) * 14;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((hash(i * 7) - 0.5) * 1.4);
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
  } else if (kind === 'cage' && b.prisoner && stageReward === `ally_${b.prisoner}` &&
             !rescuedAllies.includes(b.prisoner)) {
    // The ally's prison, and THE PRISONER IS IN IT — but ONLY in the stage that
    // actually rescues them, not every stage that happens to share the biome.
    //
    // A rescue is TWO stages sharing one biome (e.g. prison_ice: stage 7
    // "Tiếp Cận" then stage 8 "Quản Ngục"), and only the second — the one whose
    // `reward` is `ally_<id>` — is the fight that frees the prisoner. Stage 7
    // is still approaching; showing the cage there implies the kid can already
    // see the cell from outside the prison, which the biome's own sky (no
    // structure, just distant motes) does not support. `prison_void` compounds
    // this further, reused for the chapter-2 finale (stages 17-18) after the
    // scientist has already joined the fleet — a biome carries no memory of
    // progress on its own, so without the reward check every stage sharing it
    // would draw the same cell regardless of story position.
    //
    // The `!rescuedAllies` check stays too, defensively: it is what makes the
    // cage disappear the instant the reward stage is WON (`earned` gets the
    // `ally_*` id before the stage-clear flyout renders), rather than only at
    // the next stage transition.
    //
    // This has to be in the branch CONDITION, not an early `return` inside the
    // branch — drawLandmark opens with ctx.save() + a clip and closes with one
    // ctx.restore() after the whole if-chain; a `return` here would skip that
    // restore and leak an unbalanced save/clip onto the canvas state every
    // single frame this biome is on screen.
    //
    // This code used to claim in its own comment that the cage was "lit from inside
    // so the kid can see there is someone in there" — and then draw an empty box.
    // The intent was written and never implemented, so chapter 2 asked a child to
    // spend two stages rescuing a visibly empty cell. That is the emotional set
    // piece of the whole chapter; it has to show the person.
    //
    // The prisoner is the REAL ally sprite in the REAL colourway (`prisoner` in the
    // biome data, matched to ALLY_STYLES), not a generic figure. The kid must
    // recognise the wingman they free as the same one who then flies beside them —
    // a stand-in shape would break that recognition at the exact moment it matters.
    const cw = Math.min(150, m.w * 0.16);
    const ch = cw * 0.62;
    const cx = m.w * 0.5 - cw / 2;
    const cy = H * 0.12;

    // Interior glow first, so the cell reads as occupied before any detail resolves.
    // Slightly brighter than the old flat wash and gently breathing, which reads as
    // someone alive in there rather than a lit empty room.
    const breathe = 0.13 + 0.05 * Math.sin(t * 1.1);
    ctx.fillStyle = `rgba(255,210,74,${breathe.toFixed(3)})`;
    ctx.fillRect(cx, cy, cw, ch);

    // THE PRISONER — drawn INSIDE the box and BEFORE the bars, so the bars pass in
    // front of them. That ordering is the whole read: a figure over the bars looks
    // free, a figure behind them looks held.
    if (b.prisoner) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx, cy, cw, ch);
      ctx.clip();
      // Dimmed, because they are powered down and waiting — and because a
      // full-brightness friendly ship up here would compete with the fleet for the
      // kid's attention, which the legibility rules at the top of this file forbid.
      ctx.globalAlpha = 0.72;
      // A small, slow bob: the one thing that separates "someone waiting" from
      // "a decal on a wall".
      const bob = Math.sin(t * 0.9) * ch * 0.05;
      // Scale from the CELL, not a constant, and land between two failed extremes.
      // The ally template is 13 cells wide (13 * DOT px at scale 1):
      //   * `cw / 130` (~1.15x) -> a coloured speck, unrecognisable as a wingman.
      //     Measured 1276 green pixels in a 55800-pixel cell: drawing correctly,
      //     communicating nothing.
      //   * 0.62 of the cell width (~2.4x) -> filled the cell almost edge to edge and
      //     read as CRAMMED IN rather than held in a cell. 5971 green pixels.
      // 0.42 keeps the figure clearly identifiable while leaving visible space around
      // it, which is what makes the cell read as a cell.
      const target = cw * 0.42;
      const scale = Math.max(1.2, target / (13 * DOT));
      drawSpriteCentered(ctx, allySprite(b.prisoner), Math.floor(t * 2) % 2,
        cx + cw * 0.5, cy + ch * 0.52 + bob, scale);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Bars last, over the prisoner.
    ctx.strokeStyle = 'rgba(143,138,168,0.85)';
    ctx.lineWidth = 3;
    ctx.strokeRect(cx, cy, cw, ch);
    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + (i / 5) * cw, cy);
      ctx.lineTo(cx + (i / 5) * cw, cy + ch);
      ctx.stroke();
    }
  } else if (kind === 'gate') {
    // Two vertical pylons flanking the field — structure that funnels the eye
    // into the centre lane, which is exactly where the kid's guns point.
    ctx.fillStyle = 'rgba(24,8,42,0.95)';
    const pw = m.w * 0.1;
    ctx.fillRect(0, 0, pw, H);
    ctx.fillRect(m.w - pw, 0, pw, H);
    ctx.strokeStyle = 'rgba(168,85,247,0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const y = (i / 9) * H;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(pw, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(m.w - pw, y); ctx.lineTo(m.w, y); ctx.stroke();
    }
  } else if (kind === 'spire') {
    // The tower, dead centre and reaching out of frame. Drawn dark so the fleet
    // crossing it stays visible.
    const sw = m.w * 0.16;
    ctx.fillStyle = 'rgba(18,4,26,0.9)';
    ctx.beginPath();
    ctx.moveTo(m.w * 0.5 - sw * 0.5, H);
    ctx.lineTo(m.w * 0.5 - sw * 0.18, 0);
    ctx.lineTo(m.w * 0.5 + sw * 0.18, 0);
    ctx.lineTo(m.w * 0.5 + sw * 0.5, H);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,45,111,0.22)';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (kind === 'core') {
    // The broken crown of the dark star, filling the top of the frame. Pulses
    // very slowly — the only animated landmark, because this one is alive.
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.6);
    ctx.strokeStyle = `rgba(255,45,111,${(0.18 + pulse * 0.12).toFixed(3)})`;
    ctx.lineWidth = 3;
    for (let i = 0; i < 7; i++) {
      const x = (i / 6) * m.w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (hash(i * 41) - 0.5) * 60, H * (0.18 + hash(i * 97) * 0.12));
      ctx.stroke();
    }
  }

  ctx.restore();
}

// Weather. Kinds are differentiated by MOTION as much as colour — the typing
// game's rule, and the reason `voidmotes` RISES: nothing else in this game
// moves upward except the kid's own shots, so a rising field tells a child they
// have left the world behind without a line of text.
function drawWeather(ctx, m, kind, H, t) {
  const N = 46;

  if (kind === 'starfield') {
    for (let i = 0; i < N; i++) {
      const x = hash(i * 313) * m.w;
      const y = ((hash(i * 977) * H) + t * (8 + (i % 3) * 12)) % H;
      const a = 0.3 + 0.4 * hash(i * 61);
      ctx.fillStyle = `rgba(200,210,245,${a.toFixed(2)})`;
      ctx.fillRect(x, y, 1 + (i % 4 === 0 ? 1 : 0), 1);
    }
  } else if (kind === 'snow') {
    for (let i = 0; i < N; i++) {
      const x = (hash(i * 313) * m.w + Math.sin(t * 0.5 + i) * 14) % m.w;
      const y = ((hash(i * 977) * H) + t * 22) % H;
      ctx.fillStyle = 'rgba(232,244,255,0.6)';
      ctx.fillRect(x, y, 2, 2);
    }
  } else if (kind === 'embers') {
    // RISES — warm sparks going up past a descending fleet.
    for (let i = 0; i < N; i++) {
      const x = (hash(i * 313) * m.w + Math.sin(t * 0.8 + i) * 10) % m.w;
      const y = H - (((hash(i * 977) * H) + t * 30) % H);
      const a = 0.35 + 0.4 * hash(i * 61);
      ctx.fillStyle = `rgba(255,157,58,${a.toFixed(2)})`;
      ctx.fillRect(x, y, 2, 2);
    }
  } else if (kind === 'iondust') {
    for (let i = 0; i < N; i++) {
      const x = ((hash(i * 313) * m.w) + t * 34) % m.w;   // drifts sideways
      const y = hash(i * 977) * H;
      ctx.fillStyle = 'rgba(200,140,90,0.32)';
      ctx.fillRect(x, y, 2, 1);
    }
  } else if (kind === 'debris') {
    for (let i = 0; i < 26; i++) {
      const x = hash(i * 313) * m.w;
      const y = ((hash(i * 977) * H) + t * 16) % H;
      ctx.fillStyle = 'rgba(120,116,145,0.4)';
      ctx.fillRect(x, y, 3, 2);
    }
  } else if (kind === 'ash') {
    // Slower than snow and drifting to one side.
    for (let i = 0; i < N; i++) {
      const x = (hash(i * 313) * m.w + t * 9 + Math.sin(t * 0.3 + i) * 8) % m.w;
      const y = ((hash(i * 977) * H) + t * 13) % H;
      ctx.fillStyle = 'rgba(90,80,100,0.5)';
      ctx.fillRect(x, y, 2, 2);
    }
  } else if (kind === 'voidmotes') {
    // RISES. See the note above — this is the signature of the Darkness Realm.
    for (let i = 0; i < N; i++) {
      const x = (hash(i * 313) * m.w + Math.sin(t * 0.4 + i) * 12) % m.w;
      const y = H - (((hash(i * 977) * H) + t * 18) % H);
      const a = 0.3 + 0.35 * hash(i * 61);
      ctx.fillStyle = `rgba(168,85,247,${a.toFixed(2)})`;
      ctx.fillRect(x, y, 2, 2);
    }
  } else if (kind === 'storm') {
    // Starfield plus occasional sheet lightning in the far clouds. The flash is
    // capped low: a full-brightness strike would wash out the fleet.
    for (let i = 0; i < 30; i++) {
      const x = hash(i * 313) * m.w;
      const y = ((hash(i * 977) * H) + t * 20) % H;
      ctx.fillStyle = 'rgba(200,210,245,0.4)';
      ctx.fillRect(x, y, 1, 1);
    }
    const phase = (t * 0.5) % 4;
    if (phase < 0.14) {
      ctx.fillStyle = `rgba(157,180,255,${(0.10 * (1 - phase / 0.14)).toFixed(3)})`;
      ctx.fillRect(0, 0, m.w, H * 0.5);
    }
  }
}
