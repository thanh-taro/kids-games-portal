// biomes.js — per-stage scene themes (sky, ground, weather, scenery, story).
//
// Every stage in stages.js names a `biome`; this module turns that name into a
// full storybook-fantasy backdrop: color bands, distant parallax layers, a sky
// body, flying creatures, scenery props, an additive light layer, animated
// weather, and ONE `landmark` set piece.
//
// THE THROUGH-LINE: every biome shows the villain's `SPIRE` in its `far` layers,
// and it grows nearer and larger stage by stage — a speck on the horizon in
// stage 1, flanking towers filling the sky by stage 12. Several stages also
// carry a small "trace" prop left behind by the princess taken from there (a
// dropped flower crown, a broken cage, a message bottle, a frozen tear). Twelve
// separate backdrops therefore read as one chase. Each biome's comment states
// the MEANING it is carrying; keep that intact when editing.
//
// Data-driven on purpose: a new biome is a new BIOMES entry — no new draw code
// unless it needs a genuinely new weather kind (a case in drawBiomeWeather) or a
// new light kind (a case in drawBiomeLights).
//
// Colors mirror the PALETTE keys in sprites.js so props and terrain agree.

import { drawSprite, DOT } from './render.js';
import {
  CLOUD, CACTUS, ROCK, BUSH, SUN, MOON,
  PINE, FERN, STALAGMITE, STALACTITE, JAIL, TOWER, PALM,
  SNOWY_FIR, SNOWDRIFT, DEAD_TREE, REEDS, LAVA_ROCK, VOLCANIC_SPIRE,
  MOUNTAINS, BIRD, SPIRE,
  DUMMY, BANNER, RUNE, MUSHROOM, FLOWER_CROWN,
  SPIRIT_TREE, RUINED_ARCH, CRYSTAL, BROKEN_CAGE, BONE_ARCH,
  SHIPWRECK, LIGHTHOUSE, BOTTLE, BURIED_STATUE, OBELISK,
  FROZEN_FALL, FROZEN_TEAR, TEMPLE_PILLAR, LANTERN,
  LAVA_FALL, OBSIDIAN_BRIDGE, CASTLE_GATE,
} from './sprites.js';

const CELL = 8; // scenery pixel size — terrain is snapped to this chunky grid

// A prop entry: { sprite, at, scale }
//   at:    horizontal position as a fraction of screen width
//   scale: multiplies DOT (props are drawn resting on the ground line)
// Ceiling props use the same shape but hang from y = 0.
//
// Grounded props stay clear of the hero's spawn zone (roughly the left 0.18 of
// the screen) so the hero sprite is never hidden behind scenery.
//
// `band` is the strip entities WALK ON, so it must always be solid footing. A
// biome wanting distant water/haze uses `horizon: {color, shade, height}`, which
// paints behind the band instead (see coast).
//
// Depth layers, back to front:
//   sky → `far` → `horizon` → `band` → `ground`
//   → `body`/`clouds`/`flyers` → `ceiling` → `landmark` → `props`
//   → [hero/monsters/particles, drawn by main.js] → `tint` → `lights` → `weather`
//
// The per-field contracts:
//   far:      [{sprite, scale, tint?, baseOffset?, tile?, drift?, at?}] back-to-
//             front distant layers. `tile: true` repeats across the width (with
//             optional `drift` parallax); otherwise a lone silhouette at `at`.
//   flyers:   {sprite, count, scale, tint?, band?, speed?, dir?, flap?} — birds
//             crossing the sky, wing phase staggered so a flock never syncs.
//   landmark: {sprite, at, scale, sink?, flip?, tint?} — the ONE story set piece.
//             `sink` settles it into the ground (a half-buried colossus).
//   props:    {sprite, at, scale, lift?, bob?, bobAmt?, anim?, flip?, tint?}
//   lights:   [{kind, ...}] additive — 'rays' | 'aurora' | 'glow' | 'shimmer'.
//   weather:  {kind, color, count} — see drawBiomeWeather for the kinds.
//
// UNITS MATTER: `at` and `far[].at` are fractions of screen WIDTH; prop `lift`
// and glow `lift` are fractions of the GROUND HEIGHT (so floating lanterns and
// their glows keep their altitude on any window size). `body.y` and `baseOffset`
// are absolute px, because they anchor to the top edge / the terrain seam.
//
// The sky body is { sprite, x, y, scale } where `x` is a FRACTION of screen
// width. Each biome's x is chosen to sit in a gap between its own props AND
// clear of the hero's spawn — a wide sun behind a palm tree, or on the hero,
// reads as a mess.

export const BIOMES = {
  // ===== STAGE 1 — Bãi Tập Nhỏ (Little Training Ground) =====
  // MEANING: home, and safety. Sunlit practice field with straw dummies and a
  // banner. The villain's spire is a barely-visible speck on the horizon: the
  // threat exists, but it is very far away and the kid is safe here.
  training: {
    sky: ['#5fb0e6', '#8fd0f5'],
    band: ['#7fd357', '#5fc23c'],
    ground: ['#4f9b32', '#3d7d26', '#2d5c1c'],
    body: { sprite: SUN, x: 0.07, y: 95, scale: 3 },
    clouds: { color: null, count: 3 },
    far: [
      { sprite: MOUNTAINS, scale: 1.1, tile: true, tint: '#a8c0d8', baseOffset: 4 },
      { sprite: SPIRE, scale: 0.55, at: 0.74, tint: '#93a6c4', baseOffset: 2 }, // a speck
    ],
    flyers: { sprite: BIRD, count: 4, scale: 1.1, tint: '#5a6d7a', band: [0.16, 0.4], speed: 0.5 },
    props: [
      { sprite: DUMMY, at: 0.34, scale: 1.5 },
      { sprite: DUMMY, at: 0.52, scale: 1.3 },
      { sprite: BANNER, at: 0.88, scale: 1.6, lift: 0.14 },
      { sprite: BUSH, at: 0.68, scale: 1.2 },
    ],
    lights: [
      { kind: 'rays', color: '#fff3c4', count: 4, alpha: 0.07, width: 60, slant: 0.3 },
    ],
    weather: { kind: 'petals', color: '#ffe9a8', count: 14 },
  },

  // ===== STAGE 2 — Sân Luyện Chữ (Word Practice Yard) =====
  // MEANING: learning is magic, words are power. Same field at golden hour, now
  // ringed with floating practice runes the kid "spells" by typing.
  practice_yard: {
    sky: ['#f0a848', '#f8d08a'],
    band: ['#8fc94f', '#6faf38'],
    ground: ['#5c9433', '#477526', '#33561b'],
    body: { sprite: SUN, x: 0.30, y: 54, scale: 4 },    // golden-hour sun, high
    clouds: { color: '#ffd9a0', count: 3 },
    far: [
      { sprite: MOUNTAINS, scale: 1.1, tile: true, tint: '#c49a86', baseOffset: 4 },
      { sprite: SPIRE, scale: 0.7, at: 0.76, tint: '#8d6f8c', baseOffset: 2 },
    ],
    flyers: { sprite: BIRD, count: 5, scale: 1.1, tint: '#6b5548', band: [0.15, 0.38], speed: 0.55 },
    props: [
      { sprite: DUMMY, at: 0.36, scale: 1.4 },
      { sprite: RUNE, at: 0.48, scale: 1.6, lift: 0.42, bob: 26, bobAmt: 8, anim: 20 },
      { sprite: RUNE, at: 0.58, scale: 1.9, lift: 0.58, bob: 32, bobAmt: 10, anim: 17 },
      { sprite: RUNE, at: 0.72, scale: 1.5, lift: 0.36, bob: 22, bobAmt: 7, anim: 23 },
      { sprite: BANNER, at: 0.90, scale: 1.5, lift: 0.14 },
    ],
    lights: [
      { kind: 'rays', color: '#ffd88a', count: 5, alpha: 0.09, width: 70, slant: 0.5 },
      { kind: 'glow', color: '#c9a0ff', at: 0.58, lift: 0.66, radius: 90, alpha: 0.07, pulse: 34 },
    ],
    weather: { kind: 'petals', color: '#ffe0b0', count: 18 },
  },

  // ===== STAGE 3 — Đồng Cỏ Xanh (Green Meadow) =====
  // MEANING: the first princess was taken HERE. Storybook flower meadow with
  // giant mushrooms — and her dropped flower crown lying in the grass.
  meadow: {
    sky: ['#74c4ee', '#a5e0f5'],
    band: ['#8fdd5f', '#6fc63f'],
    ground: ['#4f9b32', '#3d7d26', '#2d5c1c'],
    body: { sprite: SUN, x: 0.07, y: 95, scale: 3 },
    clouds: { color: null, count: 3 },
    far: [
      { sprite: MOUNTAINS, scale: 1.4, tile: true, tint: '#9db8d4', baseOffset: 6 },
      { sprite: SPIRE, scale: 0.9, at: 0.78, tint: '#7d8fb0', baseOffset: 2 },
    ],
    flyers: { sprite: BIRD, count: 5, scale: 1.2, tint: '#4a5f6d', band: [0.16, 0.44], speed: 0.55 },
    landmark: { sprite: MUSHROOM, at: 0.63, scale: 2.4 },
    props: [
      { sprite: MUSHROOM, at: 0.30, scale: 1.6 },
      { sprite: FERN, at: 0.44, scale: 1.2 },
      { sprite: FLOWER_CROWN, at: 0.52, scale: 1.5 },   // ← her trace
      { sprite: BUSH, at: 0.76, scale: 1.3 },
      { sprite: MUSHROOM, at: 0.88, scale: 1.3 },
    ],
    lights: [
      { kind: 'rays', color: '#fff8d0', count: 5, alpha: 0.08, width: 64, slant: 0.28 },
      { kind: 'glow', color: '#ffd6f0', at: 0.52, lift: 0.09, radius: 70, alpha: 0.06, pulse: 46 },
    ],
    weather: { kind: 'petals', color: '#ffd6f0', count: 22 },
  },

  // ===== STAGE 4 — Rừng Rậm (Deep Forest) =====
  // MEANING: an ancient wood; something older than the villain watches here.
  // Misty mountains behind the treeline, birds over the canopy, god rays through
  // it, a glowing spirit tree and a mossy ruined arch.
  forest: {
    sky: ['#7fae9a', '#a8cdb8'],
    band: ['#4a9a42', '#3a8434'],
    ground: ['#4a5c28', '#38471c', '#263113'],
    body: null,                          // canopy hides the sun
    clouds: { color: '#d8ece0', count: 2 },
    far: [
      { sprite: MOUNTAINS, scale: 2.4, tile: true, baseOffset: 10 },
      { sprite: SPIRE, scale: 1.1, at: 0.80, tint: '#4d5a70', baseOffset: 2 },
    ],
    flyers: { sprite: BIRD, count: 6, scale: 1.6, tint: '#33454f', band: [0.14, 0.42], speed: 0.6, flap: 7 },
    landmark: { sprite: SPIRIT_TREE, at: 0.30, scale: 2.0 },
    props: [
      { sprite: RUINED_ARCH, at: 0.62, scale: 1.6 },
      { sprite: FERN, at: 0.46, scale: 1.2 },
      { sprite: PINE, at: 0.76, scale: 1.5 },
      { sprite: FERN, at: 0.88, scale: 1.1 },
    ],
    lights: [
      { kind: 'rays', color: '#eaffc0', count: 6, alpha: 0.11, width: 52, slant: 0.42 },
      { kind: 'glow', color: '#4ad4d4', at: 0.30, lift: 0.42, radius: 80, alpha: 0.10, pulse: 38 },
    ],
    weather: { kind: 'fireflies', color: '#eaff8a', count: 18 },
    tint: 'rgba(20,50,30,0.14)',
  },

  // ===== STAGE 5 — Hang Động Tối (Dark Cave) =====
  // MEANING: she was held here, then moved on. Glowing crystal clusters light the
  // dark, and her broken cage stands empty with the bars bent outward.
  cave: {
    sky: ['#241f33', '#332b47'],         // the cave ceiling void
    band: ['#4a4560', '#3a3550'],
    ground: ['#6a6580', '#4a4560', '#332b47'],
    body: null,
    clouds: null,
    ceiling: [
      { sprite: STALACTITE, at: 0.04, scale: 2.2 },
      { sprite: STALACTITE, at: 0.20, scale: 1.5 },
      { sprite: STALACTITE, at: 0.33, scale: 2.6 },
      { sprite: STALACTITE, at: 0.48, scale: 1.7 },
      { sprite: STALACTITE, at: 0.62, scale: 2.4 },
      { sprite: STALACTITE, at: 0.76, scale: 1.4 },
      { sprite: STALACTITE, at: 0.88, scale: 2.0 },
    ],
    landmark: { sprite: BROKEN_CAGE, at: 0.66, scale: 2.0 },  // ← her trace, big
    props: [
      { sprite: CRYSTAL, at: 0.26, scale: 1.6 },
      { sprite: STALAGMITE, at: 0.40, scale: 1.2 },
      { sprite: CRYSTAL, at: 0.52, scale: 1.1 },
      { sprite: CRYSTAL, at: 0.86, scale: 1.9 },
    ],
    lights: [
      { kind: 'glow', color: '#4ad4d4', at: 0.26, lift: 0.14, radius: 96, alpha: 0.13, pulse: 42 },
      { kind: 'glow', color: '#4ad4d4', at: 0.86, lift: 0.20, radius: 110, alpha: 0.13, pulse: 52 },
      { kind: 'glow', color: '#8fd0f5', at: 0.52, lift: 0.11, radius: 62, alpha: 0.10, pulse: 36 },
    ],
    weather: { kind: 'drip', color: '#8fd0f5', count: 10 },
    tint: 'rgba(10,6,26,0.26)',
    glow: '#4ad4d4',                     // mineral speckle on the walls
  },

  // ===== STAGE 6 — Hang Khủng Long (Dinosaur Cave) =====
  // MEANING: an older monster's lair that the villain simply took over. The hero
  // walks under a dinosaur ribcage arch, past claw-scarred walls and fire-lit
  // fissures.
  dino_cave: {
    sky: ['#33232b', '#452f33'],
    band: ['#5c4a40', '#4a3830'],
    ground: ['#7a5a44', '#5c4030', '#3d2a1e'],
    body: null,
    clouds: null,
    ceiling: [
      { sprite: STALACTITE, at: 0.06, scale: 2.0 },
      { sprite: STALACTITE, at: 0.22, scale: 2.8 },
      { sprite: STALACTITE, at: 0.40, scale: 1.6 },
      { sprite: STALACTITE, at: 0.56, scale: 2.4 },
      { sprite: STALACTITE, at: 0.72, scale: 1.8 },
      { sprite: STALACTITE, at: 0.90, scale: 2.6 },
    ],
    landmark: { sprite: BONE_ARCH, at: 0.46, scale: 2.2 },
    props: [
      { sprite: LAVA_ROCK, at: 0.26, scale: 1.3 },
      { sprite: STALAGMITE, at: 0.72, scale: 1.5 },
      { sprite: LAVA_ROCK, at: 0.88, scale: 1.1 },
    ],
    lights: [
      { kind: 'glow', color: '#ff9a3a', at: 0.26, lift: 0.06, radius: 90, alpha: 0.13, pulse: 30 },
      { kind: 'glow', color: '#ff9a3a', at: 0.88, lift: 0.05, radius: 74, alpha: 0.12, pulse: 26 },
      { kind: 'rays', color: '#ffb060', count: 3, alpha: 0.06, width: 50, slant: 0.2 },
    ],
    weather: { kind: 'embers', color: '#ffa94a', count: 18 },
    tint: 'rgba(40,12,6,0.22)',
  },

  // ===== STAGE 7 — Bờ Biển Ngọc (Jade Coast) =====
  // MEANING: she escaped by sea, and failed. The ribs of her wrecked ship lie in
  // the surf, a lighthouse still burns, and her message bottle bobs ashore.
  // The band/ground are BOTH sand: entities walk on the band, so the sea is a
  // `horizon` strip behind them rather than the footing.
  coast: {
    sky: ['#5fc8e6', '#9ce4f2'],
    horizon: { color: '#3fb8b0', shade: '#2a8b86', height: 56 },
    band: ['#f6e7a8', '#ecd77e'],
    ground: ['#e8d089', '#cbb066', '#a89048'],
    body: { sprite: SUN, x: 0.36, y: 74, scale: 3 },
    clouds: { color: null, count: 2 },
    far: [
      { sprite: MOUNTAINS, scale: 1.0, tile: true, tint: '#8fc4cc', baseOffset: 60 },
      { sprite: SPIRE, scale: 1.3, at: 0.82, tint: '#5f7f96', baseOffset: 56 },
    ],
    flyers: { sprite: BIRD, count: 5, scale: 1.2, tint: '#ffffff', band: [0.18, 0.46], speed: 0.7 },
    landmark: { sprite: SHIPWRECK, at: 0.56, scale: 1.7 },
    props: [
      { sprite: LIGHTHOUSE, at: 0.24, scale: 1.5 },
      { sprite: PALM, at: 0.80, scale: 1.4 },
      { sprite: BOTTLE, at: 0.40, scale: 1.4 },        // ← her trace
      { sprite: BUSH, at: 0.92, scale: 1.1 },
    ],
    lights: [
      { kind: 'glow', color: '#ffe08a', at: 0.24, lift: 0.86, radius: 84, alpha: 0.13, pulse: 22 }, // the lamp
      { kind: 'shimmer', color: '#ffffff', count: 10, alpha: 0.07, height: 70, len: 60 },
    ],
    weather: { kind: 'surf', color: '#ffffff', count: 3 },
  },

  // ===== STAGE 8 — Sa Mạc Vàng (Golden Desert) =====
  // MEANING: a fallen kingdom — this has all happened before. A colossal head
  // lies half-swallowed by the sand beside cracked obelisks, mirage shimmering.
  dunes: {
    sky: ['#f0b048', '#f8d888'],
    band: ['#f2cf70', '#e0b855'],
    ground: ['#d99c3c', '#b87a26', '#96601c'],
    body: { sprite: SUN, x: 0.44, y: 66, scale: 4 },
    clouds: null,
    far: [
      { sprite: MOUNTAINS, scale: 1.2, tile: true, tint: '#d8a878', baseOffset: 6 },
      { sprite: SPIRE, scale: 1.7, at: 0.84, tint: '#9c7a6a', baseOffset: 2 },
    ],
    landmark: { sprite: BURIED_STATUE, at: 0.36, scale: 2.2, sink: 40 }, // half-buried
    props: [
      { sprite: OBELISK, at: 0.60, scale: 1.5 },
      { sprite: OBELISK, at: 0.72, scale: 1.1, flip: true },
      { sprite: CACTUS, at: 0.22, scale: 1.3 },
      { sprite: ROCK, at: 0.90, scale: 1.2 },
    ],
    lights: [
      { kind: 'shimmer', color: '#fff3c4', count: 18, alpha: 0.12, height: 130, len: 90 },
      { kind: 'rays', color: '#ffe8a0', count: 3, alpha: 0.06, width: 90, slant: 0.15 },
    ],
    weather: { kind: 'sandstorm', color: '#f8e3a8', count: 26 },
    tint: 'rgba(240,180,80,0.10)',
  },

  // ===== STAGE 9 — Đỉnh Núi Tuyết (Snowy Peak) =====
  // MEANING: the coldest point of the journey — hope freezing over. An aurora
  // burns overhead, a waterfall hangs frozen mid-plunge, and a single frozen
  // tear of hers sits in the snow.
  snow: {
    sky: ['#4a6a9c', '#7fa8cc'],         // deeper blue so the aurora reads
    band: ['#e8f4ff', '#c3dcf0'],
    ground: ['#d4e6f2', '#aac6da', '#8098ac'],
    body: { sprite: MOON, x: 0.50, y: 62, scale: 2.5 },
    clouds: { color: '#cfe0f0', count: 2 },
    far: [
      { sprite: MOUNTAINS, scale: 2.8, tile: true, tint: '#8fa8c8', baseOffset: 8 },
      { sprite: SPIRE, scale: 2.1, at: 0.86, tint: '#5a6f92', baseOffset: 2 },
    ],
    landmark: { sprite: FROZEN_FALL, at: 0.26, scale: 2.0 },
    props: [
      { sprite: SNOWY_FIR, at: 0.44, scale: 1.4 },
      { sprite: FROZEN_TEAR, at: 0.56, scale: 1.6 },   // ← her trace
      { sprite: SNOWDRIFT, at: 0.70, scale: 1.4 },
      { sprite: SNOWY_FIR, at: 0.86, scale: 1.2 },
    ],
    lights: [
      { kind: 'aurora', colors: ['#4affc0', '#6fd8ff', '#c79dff'], alpha: 0.13, top: 0.06, bandH: 30, wave: 40 },
      { kind: 'glow', color: '#8fd0f5', at: 0.26, lift: 0.34, radius: 90, alpha: 0.09, pulse: 50 },
      { kind: 'glow', color: '#bfe8ff', at: 0.56, lift: 0.07, radius: 50, alpha: 0.10, pulse: 30 },
    ],
    weather: { kind: 'snow', color: '#ffffff', count: 34 },
  },

  // ===== STAGE 10 — Đầm Lầy Sương (Misty Swamp) =====
  // MEANING: grief and memory; the drowned path. Sunken temple pillars lean in
  // the murk, and floating lanterns drift where mourners left them.
  swamp: {
    sky: ['#3f5148', '#5f7360'],
    band: ['#4a4a2e', '#3a3a24'],
    ground: ['#41432a', '#31321e', '#1f2013'],
    body: { sprite: MOON, x: 0.52, y: 64, scale: 2.5 },
    clouds: { color: '#7d8d7d', count: 2 },
    far: [
      { sprite: MOUNTAINS, scale: 1.3, tile: true, tint: '#5a6b60', baseOffset: 6 },
      { sprite: SPIRE, scale: 2.4, at: 0.88, tint: '#4a4258', baseOffset: 2 },
    ],
    landmark: { sprite: TEMPLE_PILLAR, at: 0.34, scale: 2.2 },
    props: [
      { sprite: TEMPLE_PILLAR, at: 0.62, scale: 1.5, flip: true },
      { sprite: REEDS, at: 0.24, scale: 1.3 },
      { sprite: LANTERN, at: 0.48, scale: 1.6, lift: 0.36, bob: 30, bobAmt: 9, anim: 24 },
      { sprite: LANTERN, at: 0.74, scale: 1.3, lift: 0.50, bob: 38, bobAmt: 11, anim: 19 },
      { sprite: DEAD_TREE, at: 0.90, scale: 1.4 },
      { sprite: REEDS, at: 0.56, scale: 1.1 },
    ],
    lights: [
      { kind: 'glow', color: '#ffd24a', at: 0.48, lift: 0.42, radius: 66, alpha: 0.12, pulse: 28 },
      { kind: 'glow', color: '#ffd24a', at: 0.74, lift: 0.56, radius: 54, alpha: 0.11, pulse: 34 },
      { kind: 'glow', color: '#8affc0', at: 0.20, lift: 0.14, radius: 60, alpha: 0.08, pulse: 44 }, // will-o-wisp
    ],
    weather: { kind: 'mist', color: 'rgba(200,220,210,0.16)', count: 4 },
    tint: 'rgba(30,45,35,0.20)',
  },

  // ===== STAGE 11 — Núi Lửa Rực (Blazing Volcano) =====
  // MEANING: the forge where the villain's power is made. Lava pours down the
  // cliff face, obsidian bridges span the fissures, ash chokes the sky — and the
  // spire now looms unmistakably close.
  volcano: {
    sky: ['#7a1f1f', '#c4451f'],
    band: ['#5c2418', '#43180f'],
    ground: ['#6b2a18', '#4a1a0e', '#2e0f08'],
    body: null,
    clouds: { color: '#8a4030', count: 2 },
    far: [
      { sprite: MOUNTAINS, scale: 1.8, tile: true, tint: '#7a3020', baseOffset: 8 },
      { sprite: SPIRE, scale: 3.0, at: 0.86, tint: '#4a2038', baseOffset: 2 },
    ],
    landmark: { sprite: LAVA_FALL, at: 0.30, scale: 2.2 },
    props: [
      { sprite: OBSIDIAN_BRIDGE, at: 0.58, scale: 1.5, lift: 0.26 },
      { sprite: VOLCANIC_SPIRE, at: 0.76, scale: 1.6 },
      { sprite: LAVA_ROCK, at: 0.44, scale: 1.3 },
      { sprite: DEAD_TREE, at: 0.90, scale: 1.2 },
    ],
    lights: [
      { kind: 'glow', color: '#ff7a2f', at: 0.30, lift: 0.26, radius: 130, alpha: 0.15, pulse: 26 },
      { kind: 'glow', color: '#ff9a3a', at: 0.44, lift: 0.04, radius: 80, alpha: 0.12, pulse: 20 },
      { kind: 'shimmer', color: '#ffb060', count: 14, alpha: 0.10, height: 150, len: 70 },
    ],
    weather: { kind: 'embers', color: '#ff9a3a', count: 30 },
    tint: 'rgba(90,10,0,0.16)',
    lavaSeams: true,
  },

  // ===== STAGE 12 — Thành Trì Bóng Tối (Fortress of Darkness) =====
  // MEANING: journey's end. This IS the spire the kid has followed for eleven
  // stages — now overhead, filling the sky. Its chained gate stands shut, jail
  // bars line the wall, and a purple rift bleeds light over the courtyard.
  castle: {
    sky: ['#1e1a33', '#33284f'],
    band: ['#3a3550', '#2b2740'],
    ground: ['#4a4560', '#332b47', '#241f33'],
    body: { sprite: MOON, x: 0.30, y: 60, scale: 3 },
    clouds: { color: '#4a4266', count: 2 },
    far: [
      // The spire has arrived: two towering silhouettes flanking the courtyard.
      { sprite: SPIRE, scale: 7.0, at: 0.16, tint: '#3b2f5c', baseOffset: 4 },
      { sprite: SPIRE, scale: 9.5, at: 0.80, tint: '#2e2449', baseOffset: 4 },
    ],
    flyers: { sprite: BIRD, count: 5, scale: 1.2, tint: '#2b2740', band: [0.12, 0.34], speed: 0.75, dir: -1, flap: 5 },
    landmark: { sprite: CASTLE_GATE, at: 0.52, scale: 1.9 },
    props: [
      { sprite: JAIL, at: 0.76, scale: 1.5 },
      { sprite: TOWER, at: 0.90, scale: 1.4 },
      { sprite: DEAD_TREE, at: 0.34, scale: 1.2 },
    ],
    lights: [
      { kind: 'glow', color: '#b06cf0', at: 0.52, lift: 0.62, radius: 150, alpha: 0.13, pulse: 32 }, // the rift
      { kind: 'glow', color: '#ffd24a', at: 0.90, lift: 0.54, radius: 50, alpha: 0.11, pulse: 24 },  // lit window
      { kind: 'rays', color: '#c79dff', count: 4, alpha: 0.07, width: 56, slant: 0.35 },
    ],
    weather: { kind: 'rain', color: '#8fa8d0', count: 40 },
    tint: 'rgba(10,6,26,0.28)',
  },
};

export const DEFAULT_BIOME = 'training';

export function getBiome(name) {
  return BIOMES[name] || BIOMES[DEFAULT_BIOME];
}

// Deterministic pseudo-random in [0,1) from an integer seed — keeps weather and
// terrain speckle organic without Math.random() (see the reproducibility note in
// CLAUDE.md).
function rnd(seed) {
  const s = Math.sin(seed * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

function pixel(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
}

// --- Terrain ------------------------------------------------------------

// Paint the biome's sky, upper terrain band, and layered ground up to groundY.
// Mirrors the structure of render.drawScene but with per-biome colors, so the
// chunky dithered pixel-art read stays identical across every stage.
export function drawBiomeTerrain(ctx, w, h, groundY, biome, tick = 0) {
  const [skyTop, skyLow] = biome.sky;
  ctx.fillStyle = skyTop;
  ctx.fillRect(0, 0, w, groundY - 70);
  ctx.fillStyle = skyLow;
  ctx.fillRect(0, groundY - 70, w, 70);

  const bandTop = groundY - 40;

  // Far-background layers, painted back-to-front BEFORE the horizon and band so
  // those overlap their feet and they read as genuinely distant. Two shapes:
  //   { sprite, scale, tile: true, drift? }  — a repeating range across the width
  //   { sprite, scale, at }                  — a single silhouette at a fraction
  // `drift` scrolls a tiled layer slowly (parallax); put the smaller/hazier
  // layers first so nearer ones overlap them.
  if (biome.far) {
    for (const layer of biome.far) {
      const { sprite, scale, tint = null, baseOffset = 0, tile = false, drift = 0, at = 0 } = layer;
      const y = bandTop + baseOffset - sprite.h * DOT * scale;
      if (tile) {
        const tileW = sprite.w * DOT * scale;
        // Offset is negative-safe so the range never gaps at the left edge.
        const off = drift ? -(((tick * drift) % tileW) + tileW) % tileW : 0;
        for (let x = off - tileW; x < w + tileW; x += tileW) {
          drawSprite(ctx, sprite, 0, x, y, scale, false, tint);
        }
      } else {
        drawSprite(ctx, sprite, 0, w * at - (sprite.w * DOT * scale) / 2, y, scale, false, tint);
      }
    }
  }

  // Optional distant horizon strip (the coast's sea) sitting BEHIND the walkable
  // band, so the hero still stands on solid ground in front of it.
  if (biome.horizon) {
    const { color, shade, height } = biome.horizon;
    const hTop = bandTop - height;
    ctx.fillStyle = color;
    ctx.fillRect(0, hTop, w, height);
    // Dithered wave rows to read as water rather than a flat block.
    ctx.fillStyle = shade;
    for (let y = hTop; y < bandTop; y += CELL) {
      for (let x = ((y / CELL) % 2) * CELL; x < w; x += CELL * 2) {
        ctx.fillRect(x, y, CELL, CELL);
      }
    }
  }

  // Upper terrain band (sand / grass / snow) just above the ground line — this
  // is the strip entities walk on, so it is always solid footing.
  const [bandBase, bandDither] = biome.band;
  ctx.fillStyle = bandBase;
  ctx.fillRect(0, bandTop, w, groundY - bandTop);
  ctx.fillStyle = bandDither;
  for (let y = bandTop; y < groundY; y += CELL) {
    for (let x = ((y / CELL) % 2) * CELL; x < w; x += CELL * 2) {
      ctx.fillRect(x, y, CELL, CELL);
    }
  }

  // Layered ground below the walking line: base + dither seam + darkest floor.
  const [gBase, gSeam, gDeep] = biome.ground;
  ctx.fillStyle = gBase;
  ctx.fillRect(0, groundY, w, h - groundY);
  ctx.fillStyle = gSeam;
  for (let x = 0; x < w; x += CELL * 2) {
    ctx.fillRect(x, groundY, CELL, CELL);
    ctx.fillRect(x + CELL, groundY + CELL, CELL, CELL);
  }
  ctx.fillStyle = gDeep;
  ctx.fillRect(0, h - CELL * 2, w, CELL * 2);
  ctx.fillStyle = gSeam;
  for (let x = 0; x < w; x += CELL * 2) {
    ctx.fillRect(x, h - CELL * 2, CELL, CELL);
  }

  // Glowing lava cracks worming through the volcanic floor.
  if (biome.lavaSeams) {
    for (let i = 0; i < 7; i++) {
      const sx = rnd(i * 3 + 1) * w;
      const len = 3 + Math.floor(rnd(i * 5 + 2) * 4);
      let y = groundY + CELL * 2;
      for (let j = 0; j < len; j++) {
        const x = sx + (rnd(i * 7 + j) - 0.5) * CELL * 3;
        pixel(ctx, x, y, CELL, j % 2 === 0 ? '#ff7a2f' : '#d63a12');
        y += CELL;
      }
    }
  }

  // Faint mineral speckle glow on cave walls.
  if (biome.glow) {
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 26; i++) {
      const x = rnd(i * 11 + 3) * w;
      const y = rnd(i * 13 + 5) * (groundY - 60);
      pixel(ctx, x, y, DOT, biome.glow);
    }
    ctx.globalAlpha = 1;
  }
}

// --- Scenery ------------------------------------------------------------

// Sky body (sun/moon), drifting clouds, ceiling props, and grounded props.
// `layout` optionally overrides where the sky body and clouds sit, so the
// gameplay HUD and the menu scenes can each keep them clear of their own text.
export function drawBiomeScenery(ctx, w, h, groundY, biome, tick, layout = {}) {
  const body = layout.body || biome.body;
  if (body) {
    drawSprite(ctx, body.sprite, 0, w * body.x, body.y, body.scale);
  }

  if (biome.clouds) {
    const n = biome.clouds.count;
    const cloudY = layout.cloudY || [55, 80, 110];
    for (let i = 0; i < n; i++) {
      const speed = 0.3 - i * 0.08;
      const x = (tick * speed + i * w * 0.4) % (w + 80) - 40;
      const scale = i === 0 ? 3 : 2;
      // A biome cloud color washes over the white cloud sprite via tint.
      drawSprite(ctx, CLOUD, 0, x, cloudY[i % cloudY.length], scale, false, biome.clouds.color);
    }
  }

  // Flyers: birds (or bats/wisps) crossing the sky, flapping as they go. Each
  // gets its own speed, altitude, and bob so a flock never moves in lockstep.
  // `dir: -1` sends them right-to-left.
  if (biome.flyers) {
    const { sprite, count, scale, tint, band: fband = [0.15, 0.55], speed = 0.55, dir = 1, flap = 9 } = biome.flyers;
    const spanW = w + sprite.w * DOT * scale * 2;
    for (let i = 0; i < count; i++) {
      const sp = speed * (0.7 + rnd(i + 21) * 0.6);
      const raw = (tick * sp + i * (spanW / count)) % spanW;
      const x = (dir > 0 ? raw : spanW - raw) - sprite.w * DOT * scale;
      const lane = fband[0] + rnd(i + 31) * (fband[1] - fband[0]);
      const y = groundY * lane + Math.sin((tick + i * 40) / 45) * 10;
      // Stagger the wing phase per bird so the flock flaps out of sync.
      const frame = Math.floor((tick + i * 7) / flap) % sprite.frames.length;
      drawSprite(ctx, sprite, frame, x, y, scale, dir < 0, tint);
    }
  }

  // Ceiling props hang from the top of the screen (cave stalactites).
  if (biome.ceiling) {
    for (const p of biome.ceiling) {
      drawSprite(ctx, p.sprite, 0, w * p.at, 0, p.scale);
    }
  }

  // The landmark: ONE big set piece carrying the stage's story (a buried statue,
  // a shipwreck, the fortress gate). Drawn before the small props so those layer
  // in front of it, and `sink` lets it settle into the ground (half-buried).
  if (biome.landmark) {
    const lm = biome.landmark;
    const y = groundY + (lm.sink || 0) - lm.sprite.h * DOT * lm.scale;
    drawSprite(ctx, lm.sprite, 0, w * lm.at - (lm.sprite.w * DOT * lm.scale) / 2, y, lm.scale, lm.flip || false, lm.tint || null);
  }

  // Grounded props rest their bottom edge on the ground line.
  // `lift` floats a prop above the ground (lanterns, runes) as a FRACTION of the
  // ground height, so hovering props keep their relative altitude at any window
  // size instead of clinging to the ground on tall screens. `bob` makes it hover;
  // `anim` advances multi-frame props (flicker/pulse).
  for (const p of biome.props) {
    const lift = p.lift ? p.lift * groundY : 0;
    const bob = p.bob ? Math.sin((tick + (p.at || 0) * 300) / p.bob) * (p.bobAmt || 5) : 0;
    const y = groundY - lift + bob - p.sprite.h * DOT * p.scale;
    const frame = p.anim ? Math.floor(tick / p.anim) % p.sprite.frames.length : 0;
    drawSprite(ctx, p.sprite, frame, w * p.at, y, p.scale, p.flip || false, p.tint || null);
  }
}

// --- Lights -------------------------------------------------------------

// Additive light layer: god rays, aurora curtains, and glow pools. Drawn after
// the world + mood tint but BEFORE weather and the HUD, using 'lighter' compositing
// so it brightens what's underneath instead of painting over it. This is what
// keeps a big empty sky from reading as a flat slab of color.
//
// A light entry: { kind, color, ... } — see the cases below for per-kind fields.
export function drawBiomeLights(ctx, w, h, groundY, biome, tick) {
  if (!biome.lights) return;
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';

  for (const L of biome.lights) {
    switch (L.kind) {
      case 'rays': {
        // Slanted shafts of light from above (sun through a canopy / cave mouth).
        // Each shaft is a sheared parallelogram filled with a vertical gradient
        // that fades to nothing before it lands — without the fade the shafts
        // read as hard-edged diagonal stripes rather than light.
        const n = L.count || 5;
        const slant = L.slant ?? 0.35;
        const reach = L.reach ?? 0.9;
        const bottom = groundY * reach;
        for (let i = 0; i < n; i++) {
          const baseX = w * ((i + 0.5) / n) + (L.offset || 0);
          const breathe = 0.6 + 0.4 * Math.sin((tick + i * 90) / 110);
          const width = (L.width || 46) * (0.7 + breathe * 0.5);
          const grad = ctx.createLinearGradient(0, 0, 0, bottom);
          grad.addColorStop(0, L.color);
          grad.addColorStop(0.55, L.color);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.globalAlpha = (L.alpha || 0.1) * breathe;
          ctx.beginPath();
          ctx.moveTo(baseX, 0);
          ctx.lineTo(baseX + width, 0);
          ctx.lineTo(baseX + width + bottom * slant, bottom);
          ctx.lineTo(baseX + bottom * slant, bottom);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }
      case 'aurora': {
        // Rippling polar curtains: stacked horizontal bands whose height waves
        // across the width, in two or three colors.
        const colors = L.colors || [L.color];
        const bandH = L.bandH || 26;
        const top = (L.top ?? 0.08) * h;
        for (let c = 0; c < colors.length; c++) {
          ctx.fillStyle = colors[c];
          ctx.globalAlpha = L.alpha || 0.13;
          for (let x = 0; x < w; x += CELL) {
            const phase = (x / w) * Math.PI * 3 + tick / 70 + c * 1.4;
            const y = top + c * bandH * 0.8 + Math.sin(phase) * (L.wave || 34);
            const tall = bandH * (0.6 + 0.4 * Math.sin(phase * 1.7));
            ctx.fillRect(x, y, CELL, tall);
          }
        }
        break;
      }
      case 'glow': {
        // A soft pool of light around a point (crystals, lava, a lit window),
        // as a true radial falloff so it blooms instead of stacking hard squares.
        const cx = w * L.at;
        // `lift` is a fraction of the ground height, matching prop `lift`, so a
        // glow stays pinned to the thing it belongs to at any window size.
        const cy = groundY - (L.lift || 0) * groundY;
        const pulse = 0.8 + 0.2 * Math.sin(tick / (L.pulse || 40));
        const r = (L.radius || 90) * pulse;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, L.color);
        grad.addColorStop(0.45, L.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.globalAlpha = L.alpha || 0.09;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        break;
      }
      case 'shimmer': {
        // Heat/mirage shimmer: bright horizontal slivers wobbling near the ground.
        ctx.fillStyle = L.color;
        const n = L.count || 14;
        for (let i = 0; i < n; i++) {
          const y = groundY - 40 - rnd(i + 51) * (L.height || 120);
          const wob = Math.sin((tick + i * 30) / 24) * 26;
          const len = (L.len || 70) * (0.5 + rnd(i + 61));
          ctx.globalAlpha = (L.alpha || 0.1) * (0.5 + 0.5 * Math.sin((tick + i * 17) / 30));
          ctx.fillRect((rnd(i + 71) * w + wob + w) % w, y, len, DOT);
        }
        break;
      }
    }
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = prev;
}

// --- Weather ------------------------------------------------------------

// Animated weather layer, drawn OVER the world but under the HUD. Every kind is
// a deterministic function of tick + particle index, so it loops forever without
// state and looks the same on every run.
export function drawBiomeWeather(ctx, w, h, groundY, biome, tick) {
  const wx = biome.weather;
  if (!wx) return;
  const n = wx.count;

  switch (wx.kind) {
    case 'rain': {
      ctx.fillStyle = wx.color;
      for (let i = 0; i < n; i++) {
        const x = (rnd(i + 1) * w + tick * 1.5) % w;
        const y = (rnd(i + 2) * h + tick * 9) % h;
        ctx.fillRect(x, y, DOT, DOT * 4);
      }
      break;
    }
    case 'snow': {
      ctx.fillStyle = wx.color;
      for (let i = 0; i < n; i++) {
        const drift = Math.sin((tick + i * 30) / 40) * 14;
        const x = (rnd(i + 1) * w + drift + w) % w;
        const y = (rnd(i + 2) * h + tick * (0.8 + rnd(i + 3))) % h;
        const s = i % 3 === 0 ? DOT * 2 : DOT;
        ctx.fillRect(x, y, s, s);
      }
      break;
    }
    case 'embers': {
      // Hot motes rising from the ground and fading out near the top.
      for (let i = 0; i < n; i++) {
        const life = (tick * (1.2 + rnd(i + 4)) + i * 40) % (h * 0.8);
        const x = (rnd(i + 1) * w + Math.sin((tick + i * 20) / 30) * 10 + w) % w;
        const y = groundY - life;
        ctx.globalAlpha = Math.max(0, 1 - life / (h * 0.8));
        ctx.fillStyle = i % 4 === 0 ? '#ffe08a' : wx.color;
        ctx.fillRect(x, y, DOT, DOT);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'fireflies': {
      // Slow wandering glow dots that blink on and off.
      for (let i = 0; i < n; i++) {
        const x = (rnd(i + 1) * w + Math.sin((tick + i * 50) / 60) * 40 + w) % w;
        const y = groundY - 40 - rnd(i + 2) * (groundY * 0.5)
          + Math.cos((tick + i * 33) / 50) * 18;
        const glow = (Math.sin((tick + i * 25) / 22) + 1) / 2;
        ctx.globalAlpha = 0.25 + glow * 0.75;
        ctx.fillStyle = wx.color;
        ctx.fillRect(x, y, DOT * 1.5, DOT * 1.5);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'petals': {
      // Pink blossom petals tumbling down across the meadow.
      ctx.fillStyle = wx.color;
      for (let i = 0; i < n; i++) {
        const sway = Math.sin((tick + i * 40) / 30) * 22;
        const x = (rnd(i + 1) * w + sway + tick * 0.4 + w) % w;
        const y = (rnd(i + 2) * h + tick * 1.1) % h;
        ctx.fillRect(x, y, DOT * 2, DOT);
      }
      break;
    }
    case 'sandstorm': {
      // Horizontal wind streaks tearing across the dunes.
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = wx.color;
      for (let i = 0; i < n; i++) {
        const y = rnd(i + 1) * h;
        const x = (rnd(i + 2) * w - tick * (4 + rnd(i + 3) * 4)) % w;
        ctx.fillRect((x + w) % w, y, DOT * (4 + (i % 5) * 3), DOT);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'drip': {
      // Water drops falling from the cave ceiling, restarting at the top.
      ctx.fillStyle = wx.color;
      for (let i = 0; i < n; i++) {
        const period = 90 + i * 17;
        const t = (tick + i * 31) % period;
        const fall = (t / period) * groundY;
        const x = rnd(i + 1) * w;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(x, fall, DOT, DOT * 2);
        // Little splash ring when the drop lands.
        if (t > period - 8) {
          ctx.globalAlpha = 0.5;
          ctx.fillRect(x - DOT * 2, groundY - DOT, DOT * 5, DOT);
        }
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'mist': {
      // Slow horizontal fog bands hugging the swamp floor.
      ctx.fillStyle = wx.color;
      for (let i = 0; i < n; i++) {
        const y = groundY - 30 - i * 22;
        const x = (tick * (0.3 + i * 0.15) + i * 200) % (w + 300) - 150;
        ctx.fillRect(x, y, 260, CELL * 2);
        ctx.fillRect(x - 320, y, 200, CELL * 2);
      }
      break;
    }
    case 'surf': {
      // Foam lines rolling in across the sea strip toward the shoreline (the
      // top edge of the walkable band), fading as they reach the sand.
      const shore = groundY - 40;
      const seaTop = shore - (biome.horizon ? biome.horizon.height : 34);
      ctx.fillStyle = wx.color;
      for (let i = 0; i < n; i++) {
        const period = 150;
        const t = ((tick + i * 50) % period) / period;
        const y = seaTop + t * (shore - seaTop);
        ctx.globalAlpha = 0.5 * (1 - t * 0.7);
        for (let x = (i * 37) % (CELL * 4); x < w; x += CELL * 4) {
          ctx.fillRect(x, y, CELL * 2, DOT);
        }
      }
      ctx.globalAlpha = 1;
      break;
    }
  }
}

// Convenience: the whole backdrop in one call, in the canonical layer order —
// terrain → scenery → mood tint → additive lights → weather. `main.js` runs the
// same order but splits it so the hero/monster/projectiles land between scenery
// and lights.
export function drawBiomeScene(ctx, w, h, groundY, biome, tick, layout = {}) {
  drawBiomeTerrain(ctx, w, h, groundY, biome, tick);
  drawBiomeScenery(ctx, w, h, groundY, biome, tick, layout);
  if (biome.tint) {
    ctx.fillStyle = biome.tint;
    ctx.fillRect(0, 0, w, h);
  }
  drawBiomeLights(ctx, w, h, groundY, biome, tick);
  drawBiomeWeather(ctx, w, h, groundY, biome, tick);
}
