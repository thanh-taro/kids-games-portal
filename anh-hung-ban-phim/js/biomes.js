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
  // chapter 2 — the Staff quest
  BOOKSHELF, WIND_PILLAR, MIRROR_STAND, WISDOM_TOWER, FLOAT_BOOK, STAR_TREE,
  STAFF_WISDOM,
  // chapter 3 — the siege
  BONE_PILLAR, CELL_DOOR, VOID_RIFT, DEMON_THRONE, SPIRE_CROWN, DEMON_BANNER,
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

  // =========================================================================
  // CHAPTER 2 — "Trượng Của Trí Tuệ" (The Staff of Wisdom), stages 13-20
  // =========================================================================
  // THE CHAPTER'S THROUGH-LINE INVERTS CHAPTER 1'S. There, the villain's black
  // SPIRE grew nearer every stage. Here the hero has deliberately turned AWAY
  // from it to find a weapon, so the spire RECEDES into the distance while a new
  // landmark — the pale, round-topped WISDOM_TOWER — grows nearer stage by stage
  // in its place. Two towers on the horizon, one shrinking and one growing, is
  // how eight backdrops say "we are on a detour, and it is the right one".
  //
  // The chapter also lightens: it starts in a dim ruined library and ends on a
  // sunlit peak, the opposite of chapter 1's slide into darkness.

  // ===== STAGE 13 — Thư Viện Cổ (The Ancient Library) =====
  // MEANING: the first clue. A collapsed library open to the sky, its books
  // still drifting between the shelves. Dim, dusty, and quiet — the chapter
  // begins in study, not battle.
  library: {
    sky: ['#3a3352', '#5d5075'],
    band: ['#6b5f7a', '#544a61'],
    ground: ['#4a4257', '#38313f', '#28232d'],
    body: { sprite: MOON, x: 0.24, y: 58, scale: 2.5 },
    clouds: { color: '#6f6288', count: 2 },
    far: [
      { sprite: MOUNTAINS, scale: 1.0, tile: true, tint: '#4d4463', baseOffset: 4 },
      // The black spire is BEHIND us now — small, and off to the left edge.
      { sprite: SPIRE, scale: 2.2, at: 0.08, tint: '#3b3352', baseOffset: 3 },
      // The Tower of Wisdom appears for the first time: a distant speck of hope.
      { sprite: WISDOM_TOWER, scale: 0.7, at: 0.86, tint: '#7a7396', baseOffset: 2 },
    ],
    // The bookshelves are TINTED DOWN and pushed to the edges. Untinted, their
    // multicoloured spines were the brightest, busiest thing on screen — brighter
    // than the monsters walking in front of them — and the book creep vanished
    // against them. Scenery must never out-read an enemy: in a typing game the kid
    // is scanning for the word above a monster, so the monster has to pop.
    landmark: { sprite: BOOKSHELF, at: 0.50, scale: 1.8, tint: '#4a4257' },
    props: [
      { sprite: BOOKSHELF, at: 0.26, scale: 1.3, tint: '#453e52' },
      { sprite: BOOKSHELF, at: 0.92, scale: 1.5, tint: '#453e52' },
      { sprite: FLOAT_BOOK, at: 0.42, scale: 1.4, lift: 0.52, bob: 26, bobAmt: 9, anim: 18 },
      { sprite: FLOAT_BOOK, at: 0.60, scale: 1.1, lift: 0.38, bob: 22, bobAmt: 7, anim: 22 },
      { sprite: FLOAT_BOOK, at: 0.82, scale: 1.6, lift: 0.62, bob: 30, bobAmt: 10, anim: 15 },
      { sprite: RUNE, at: 0.72, scale: 1.2, lift: 0.30, bob: 20, bobAmt: 6, anim: 25 },
    ],
    lights: [
      { kind: 'rays', color: '#c9b6ff', count: 4, alpha: 0.08, width: 58, slant: 0.28 },
      { kind: 'glow', color: '#ffe08a', at: 0.50, lift: 0.40, radius: 90, alpha: 0.08, pulse: 40 },
    ],
    weather: { kind: 'leaves', color: '#d9d2e8', count: 16 }, // drifting loose pages
    tint: 'rgba(20,14,36,0.20)',
  },

  // ===== STAGE 14 — Núi Vọng Gió (The Howling Peak) =====
  // MEANING: the trial of PERSEVERANCE. Bare wind-carved cliffs high above the
  // clouds, with nothing to look at but the long way up. The cloud layer sits
  // BELOW the walkable band, so the kid can see how far they have already climbed.
  windpeak: {
    sky: ['#6a8fc4', '#a8c8e8'],
    band: ['#9a94a8', '#7d7788'],
    ground: ['#6e6878', '#565162', '#3e3a48'],
    body: { sprite: SUN, x: 0.14, y: 62, scale: 3 },
    clouds: { color: '#e2ecf8', count: 4 },
    far: [
      { sprite: MOUNTAINS, scale: 1.4, tile: true, tint: '#8098bc', baseOffset: 6 },
      { sprite: SPIRE, scale: 1.8, at: 0.06, tint: '#6f7fa0', baseOffset: 3 },
      { sprite: WISDOM_TOWER, scale: 0.9, at: 0.84, tint: '#9aa8c8', baseOffset: 2 },
    ],
    flyers: { sprite: BIRD, count: 6, scale: 1.0, tint: '#5c6880', band: [0.10, 0.30], speed: 1.1, flap: 4 },
    landmark: { sprite: WIND_PILLAR, at: 0.52, scale: 2.2 },
    props: [
      { sprite: WIND_PILLAR, at: 0.32, scale: 1.5 },
      { sprite: WIND_PILLAR, at: 0.70, scale: 1.8 },
      { sprite: WIND_PILLAR, at: 0.88, scale: 1.3 },
      { sprite: ROCK, at: 0.42, scale: 1.2 },
    ],
    lights: [
      { kind: 'rays', color: '#ffffff', count: 5, alpha: 0.09, width: 64, slant: 0.5 },
    ],
    weather: { kind: 'snow', color: '#eaf4ff', count: 26 }, // driven ice crystals
  },

  // ===== STAGE 15 — Vực Sương Mù (The Vale of Fog) =====
  // MEANING: the trial of CLARITY — the path is there, you just cannot see it.
  // Everything is deliberately hazed and low-contrast EXCEPT the Tower, which
  // glows through the murk: when you cannot see the way, follow the one clear
  // thing you can see.
  mistvale: {
    sky: ['#8a94a0', '#b8c2ca'],
    band: ['#7f8a80', '#697466'],
    ground: ['#5f6a5c', '#4b5449', '#3a4139'],
    body: { sprite: SUN, x: 0.20, y: 70, scale: 2.5, tint: '#d8dcd0' }, // sun through fog
    clouds: { color: '#c8d0d4', count: 5 },
    far: [
      { sprite: MOUNTAINS, scale: 1.2, tile: true, tint: '#93a09a', baseOffset: 5 },
      { sprite: SPIRE, scale: 1.5, at: 0.05, tint: '#8a94a0', baseOffset: 3 },
      { sprite: WISDOM_TOWER, scale: 1.2, at: 0.82, tint: '#aeb8c0', baseOffset: 2 },
    ],
    landmark: { sprite: RUINED_ARCH, at: 0.54, scale: 1.7, tint: '#7d8a84' },
    props: [
      { sprite: DEAD_TREE, at: 0.28, scale: 1.3, tint: '#5e6659' },
      { sprite: REEDS, at: 0.44, scale: 1.2 },
      { sprite: DEAD_TREE, at: 0.72, scale: 1.5, tint: '#6a7264' },
      { sprite: REEDS, at: 0.88, scale: 1.4 },
    ],
    lights: [
      // The Tower's beacon cutting through the fog — the one clear thing.
      { kind: 'beam', color: '#d8f0ff', at: 0.82, lift: 0.30, width: 26, spread: 2.0, alpha: 0.13, pulse: 50 },
      { kind: 'glow', color: '#ffffff', at: 0.54, lift: 0.35, radius: 110, alpha: 0.07, pulse: 44 },
    ],
    weather: { kind: 'mist', color: '#cdd6da', count: 7 },
    tint: 'rgba(180,190,196,0.16)', // the haze itself
  },

  // ===== STAGE 16 — Đền Chữ Cổ (Temple of Ancient Letters) =====
  // MEANING: writing IS the key. A temple whose door has no handle — it opens
  // only to a correctly written word, which is exactly what the kid is doing.
  // Rune-carved pillars, and glyphs burning cyan in the air.
  rune_temple: {
    sky: ['#2e4a6a', '#4a7095'],
    band: ['#8a8270', '#6e6758'],
    ground: ['#6a6354', '#524c40', '#3b372e'],
    body: { sprite: MOON, x: 0.22, y: 56, scale: 2.5 },
    clouds: { color: '#5a7a98', count: 2 },
    far: [
      { sprite: MOUNTAINS, scale: 1.1, tile: true, tint: '#456484', baseOffset: 4 },
      { sprite: SPIRE, scale: 1.3, at: 0.05, tint: '#3f5a78', baseOffset: 3 },
      { sprite: WISDOM_TOWER, scale: 1.5, at: 0.80, tint: '#7d95ac', baseOffset: 2 },
    ],
    landmark: { sprite: TEMPLE_PILLAR, at: 0.52, scale: 2.0 },
    props: [
      { sprite: TEMPLE_PILLAR, at: 0.30, scale: 1.5 },
      { sprite: TEMPLE_PILLAR, at: 0.72, scale: 1.7 },
      { sprite: RUNE, at: 0.40, scale: 1.7, lift: 0.48, bob: 24, bobAmt: 8, anim: 19 },
      { sprite: RUNE, at: 0.62, scale: 2.0, lift: 0.62, bob: 30, bobAmt: 10, anim: 16 },
      { sprite: RUNE, at: 0.88, scale: 1.4, lift: 0.34, bob: 20, bobAmt: 7, anim: 23 },
    ],
    lights: [
      { kind: 'glow', color: '#4ad4d4', at: 0.62, lift: 0.66, radius: 100, alpha: 0.11, pulse: 30 },
      { kind: 'glow', color: '#4ad4d4', at: 0.40, lift: 0.52, radius: 80, alpha: 0.09, pulse: 36 },
      { kind: 'rays', color: '#a8e0ff', count: 4, alpha: 0.07, width: 54, slant: 0.3 },
    ],
    weather: { kind: 'fireflies', color: '#7fe8ff', count: 20 }, // drifting glyph sparks
  },

  // ===== STAGE 17 — Hồ Gương (The Mirror Lake) =====
  // MEANING: the trial of HONESTY — the hero faces his own reflection. Standing
  // mirrors ring a still lake; the horizon is the water (so the band stays solid
  // footing on the near shore, per the coast rule).
  mirrorlake: {
    sky: ['#f0b4c8', '#ffd8e0'],       // dawn pink, so reflections read warm
    horizon: { color: '#b8d8e8', shade: '#93bcd0', height: 40 },
    band: ['#a8b4c0', '#8a95a2'],
    ground: ['#7d8794', '#636c78', '#4a515b'],
    body: { sprite: SUN, x: 0.16, y: 66, scale: 3 },
    clouds: { color: '#ffe4ea', count: 3 },
    far: [
      { sprite: MOUNTAINS, scale: 1.0, tile: true, tint: '#c4a8bc', baseOffset: 4 },
      { sprite: SPIRE, scale: 1.1, at: 0.04, tint: '#a892a8', baseOffset: 3 },
      { sprite: WISDOM_TOWER, scale: 1.9, at: 0.78, tint: '#c8c0d4', baseOffset: 2 },
    ],
    landmark: { sprite: MIRROR_STAND, at: 0.52, scale: 2.0 },
    props: [
      { sprite: MIRROR_STAND, at: 0.32, scale: 1.4 },
      { sprite: MIRROR_STAND, at: 0.70, scale: 1.6 },
      { sprite: MIRROR_STAND, at: 0.88, scale: 1.2 },
      { sprite: CRYSTAL, at: 0.42, scale: 1.1 },
    ],
    lights: [
      { kind: 'rays', color: '#ffe0e8', count: 5, alpha: 0.10, width: 62, slant: 0.4 },
      { kind: 'shimmer', color: '#ffffff', count: 12, alpha: 0.09, height: 70, len: 80 },
    ],
    weather: { kind: 'petals', color: '#ffd8e4', count: 16 },
  },

  // ===== STAGE 18 — Rừng Sao Đêm (The Night-Star Wood) =====
  // MEANING: the Staff's light is finally visible. A wood where the trees carry
  // stars instead of leaves, and stars fall through the canopy. The Tower is now
  // close enough to fill part of the sky.
  starwood: {
    sky: ['#1b2452', '#33407e'],
    band: ['#2f4a52', '#243a40'],
    ground: ['#2a4048', '#1f3038', '#16222a'],
    body: { sprite: MOON, x: 0.18, y: 52, scale: 3.5 },
    clouds: { color: '#3a4a86', count: 2 },
    far: [
      { sprite: MOUNTAINS, scale: 1.1, tile: true, tint: '#2b3768', baseOffset: 4 },
      { sprite: SPIRE, scale: 1.0, at: 0.04, tint: '#252f5c', baseOffset: 3 },
      { sprite: WISDOM_TOWER, scale: 2.6, at: 0.76, tint: '#5f6ba8', baseOffset: 2 },
    ],
    landmark: { sprite: STAR_TREE, at: 0.52, scale: 2.0 },
    props: [
      { sprite: STAR_TREE, at: 0.30, scale: 1.5 },
      { sprite: STAR_TREE, at: 0.68, scale: 1.7 },
      { sprite: STAR_TREE, at: 0.88, scale: 1.3 },
      { sprite: FLOAT_BOOK, at: 0.44, scale: 1.2, lift: 0.46, bob: 26, bobAmt: 9, anim: 20 },
      { sprite: LANTERN, at: 0.60, scale: 1.3, lift: 0.40, bob: 24, bobAmt: 8, anim: 22 },
    ],
    lights: [
      { kind: 'aurora', colors: ['#6f8fff', '#a86cff', '#4ad4d4'], alpha: 0.11, bandH: 24, top: 0.06, wave: 30 },
      { kind: 'glow', color: '#ffe08a', at: 0.60, lift: 0.44, radius: 70, alpha: 0.10, pulse: 26 },
    ],
    weather: { kind: 'starfall', color: '#ffffff', count: 26 },
    tint: 'rgba(8,10,32,0.18)',
  },

  // ===== STAGE 19 — Tháp Trí Tuệ (The Tower of Wisdom) =====
  // MEANING: the ascent. The kid is finally AT the tower they have watched grow
  // for six stages — it is now the landmark itself, not a far-layer speck, and
  // its beacon washes the whole scene.
  wisdom_tower: {
    sky: ['#2a3f78', '#5570b0'],
    band: ['#a8a294', '#8a8478'],
    ground: ['#837d70', '#67625a', '#4c4842'],
    body: { sprite: MOON, x: 0.16, y: 54, scale: 3 },
    clouds: { color: '#6a84c0', count: 3 },
    far: [
      { sprite: MOUNTAINS, scale: 1.2, tile: true, tint: '#3d5590', baseOffset: 5 },
      // The black spire is now a distant memory at the very edge of the world.
      { sprite: SPIRE, scale: 0.9, at: 0.03, tint: '#35487c', baseOffset: 3 },
    ],
    // The Tower has ARRIVED — it is the set piece now.
    landmark: { sprite: WISDOM_TOWER, at: 0.56, scale: 3.4 },
    props: [
      { sprite: TEMPLE_PILLAR, at: 0.28, scale: 1.6 },
      { sprite: RUNE, at: 0.38, scale: 1.6, lift: 0.50, bob: 24, bobAmt: 8, anim: 18 },
      { sprite: TEMPLE_PILLAR, at: 0.86, scale: 1.5 },
      { sprite: FLOAT_BOOK, at: 0.78, scale: 1.3, lift: 0.58, bob: 28, bobAmt: 9, anim: 21 },
    ],
    lights: [
      { kind: 'beam', color: '#8ff0ff', at: 0.56, lift: 0.90, width: 44, spread: 2.6, alpha: 0.15, pulse: 40 },
      { kind: 'glow', color: '#ffd24a', at: 0.56, lift: 0.50, radius: 120, alpha: 0.10, pulse: 34 },
      { kind: 'rays', color: '#bfe8ff', count: 4, alpha: 0.08, width: 58, slant: 0.3 },
    ],
    weather: { kind: 'starfall', color: '#d8f0ff', count: 20 },
  },

  // ===== STAGE 20 — Đỉnh Trí Tuệ (The Summit of Wisdom) =====
  // MEANING: the prize, and the chapter's brightest scene — sunrise at the top
  // of everything, with the Staff itself waiting on the summit. Chapter 1 ended
  // in a dark fortress; chapter 2 ends in full light, because the hero chose to
  // seek wisdom instead of charging at the enemy.
  wisdom_peak: {
    sky: ['#f5c46a', '#ffe8b0'],
    band: ['#e8e0c8', '#c8c0a8'],
    ground: ['#c0b898', '#a09878', '#7d7658'],
    body: { sprite: SUN, x: 0.14, y: 48, scale: 4.5 },  // full sunrise
    clouds: { color: '#fff0cc', count: 4 },
    far: [
      { sprite: MOUNTAINS, scale: 1.3, tile: true, tint: '#d8b88c', baseOffset: 6 },
      { sprite: SPIRE, scale: 0.8, at: 0.03, tint: '#c0a084', baseOffset: 3 },
    ],
    flyers: { sprite: BIRD, count: 5, scale: 1.1, tint: '#a08860', band: [0.10, 0.28], speed: 0.7 },
    // The Staff, planted on the summit — the thing eight stages have been about.
    landmark: { sprite: STAFF_WISDOM, at: 0.56, scale: 2.8 },
    props: [
      { sprite: TEMPLE_PILLAR, at: 0.30, scale: 1.7 },
      { sprite: TEMPLE_PILLAR, at: 0.80, scale: 1.7 },
      { sprite: CRYSTAL, at: 0.42, scale: 1.2 },
      { sprite: CRYSTAL, at: 0.70, scale: 1.4 },
    ],
    lights: [
      { kind: 'beam', color: '#fff6d0', at: 0.56, lift: 0.42, width: 40, spread: 2.4, alpha: 0.17, pulse: 36 },
      { kind: 'rays', color: '#ffe8a8', count: 6, alpha: 0.11, width: 70, slant: 0.45 },
      { kind: 'glow', color: '#ffffff', at: 0.56, lift: 0.36, radius: 130, alpha: 0.10, pulse: 30 },
    ],
    weather: { kind: 'petals', color: '#fff0c0', count: 18 },
  },

  // =========================================================================
  // CHAPTER 3 — "Trận Chiến Cuối Cùng" (The Final Confrontation), stages 21-26
  // =========================================================================
  // THE THROUGH-LINE RESOLVES. The hero turns back toward the black spire with
  // the Staff in hand, so it grows again — faster and larger than in chapter 1,
  // until in the last stage the kid is standing ON it (SPIRE_CROWN is the
  // landmark: the tower's broken top). Chapter 3 is the darkest-looking chapter
  // in the game, lit almost entirely by rift purple and burning red.

  // ===== STAGE 21 — Cầu Xương Trắng (The Bridge of White Bones) =====
  // MEANING: the approach, and the point of no return. A bone causeway over an
  // abyss — nothing grows here and there is nowhere to go but forward.
  bonebridge: {
    sky: ['#2b2036', '#4a3450'],
    band: ['#8d8578', '#6e6860'],
    ground: ['#6a6458', '#4e4a42', '#38352f'],
    body: { sprite: MOON, x: 0.22, y: 56, scale: 2.5, tint: '#d8c8b0' },
    clouds: { color: '#54405e', count: 3 },
    far: [
      { sprite: MOUNTAINS, scale: 1.1, tile: true, tint: '#413050', baseOffset: 4 },
      // Back on the villain's road: the spire returns, and it is close.
      { sprite: SPIRE, scale: 4.5, at: 0.78, tint: '#3a2a4c', baseOffset: 4 },
    ],
    landmark: { sprite: BONE_ARCH, at: 0.54, scale: 1.9 },
    props: [
      { sprite: BONE_PILLAR, at: 0.30, scale: 1.5 },
      { sprite: BONE_PILLAR, at: 0.44, scale: 1.2 },
      { sprite: BONE_PILLAR, at: 0.70, scale: 1.7 },
      { sprite: BONE_PILLAR, at: 0.88, scale: 1.3 },
    ],
    lights: [
      { kind: 'glow', color: '#b06cf0', at: 0.78, lift: 0.60, radius: 120, alpha: 0.11, pulse: 34 },
      { kind: 'rays', color: '#c79dff', count: 4, alpha: 0.07, width: 56, slant: 0.35 },
    ],
    weather: { kind: 'ash', color: '#c8c0b8', count: 30 },
    tint: 'rgba(14,8,26,0.24)',
  },

  // ===== STAGE 22 — Cổng Thành Quỷ (The Demon Gate) =====
  // MEANING: breaching the wall. The gate from stage 12 seen from the OTHER
  // side of the journey — this time the hero has the Staff, and the gate is the
  // landmark he is about to break rather than a thing looming over him.
  demon_gate: {
    sky: ['#2a1830', '#4d2440'],
    band: ['#4a4050', '#382f3e'],
    ground: ['#443a4a', '#322a38', '#241e28'],
    body: { sprite: MOON, x: 0.20, y: 54, scale: 2.5, tint: '#e0a0a0' },
    clouds: { color: '#5c2c48', count: 2 },
    far: [
      { sprite: SPIRE, scale: 6.0, at: 0.20, tint: '#3a2044', baseOffset: 4 },
      { sprite: SPIRE, scale: 8.0, at: 0.82, tint: '#2e1836', baseOffset: 4 },
    ],
    landmark: { sprite: CASTLE_GATE, at: 0.54, scale: 2.3 },
    props: [
      { sprite: DEMON_BANNER, at: 0.30, scale: 1.5, lift: 0.34 },
      { sprite: DEMON_BANNER, at: 0.80, scale: 1.5, lift: 0.34 },
      { sprite: TOWER, at: 0.92, scale: 1.4 },
    ],
    lights: [
      { kind: 'glow', color: '#e0503a', at: 0.54, lift: 0.52, radius: 140, alpha: 0.13, pulse: 28 },
      { kind: 'glow', color: '#b06cf0', at: 0.82, lift: 0.66, radius: 110, alpha: 0.10, pulse: 36 },
    ],
    weather: { kind: 'embers', color: '#ff7a2f', count: 26 },
    tint: 'rgba(20,6,20,0.26)',
  },

  // ===== STAGE 23 — Ngục Tối Vô Tận (The Endless Dungeon) =====
  // MEANING: where the stolen powers were kept. The princesses' own cells, now
  // standing open — the kid rescued them in chapter 1, and here they see what
  // they were rescued FROM. The only enclosed, ceilinged biome of the chapter.
  dungeon: {
    sky: ['#1a1622', '#2b2434'],
    band: ['#3e3846', '#2e2a36'],
    ground: ['#383240', '#28242e', '#1c1922'],
    clouds: { color: null, count: 0 },
    ceiling: [
      { sprite: STALACTITE, at: 0.16, scale: 1.4 },
      { sprite: STALACTITE, at: 0.40, scale: 1.8 },
      { sprite: STALACTITE, at: 0.64, scale: 1.5 },
      { sprite: STALACTITE, at: 0.88, scale: 1.7 },
    ],
    far: [
      { sprite: SPIRE, scale: 3.0, at: 0.50, tint: '#241e2e', baseOffset: 3 },
    ],
    landmark: { sprite: CELL_DOOR, at: 0.54, scale: 2.1 },
    props: [
      { sprite: CELL_DOOR, at: 0.28, scale: 1.5 },
      { sprite: CELL_DOOR, at: 0.74, scale: 1.6 },
      { sprite: JAIL, at: 0.88, scale: 1.4 },
      { sprite: LANTERN, at: 0.40, scale: 1.2, lift: 0.52, bob: 26, bobAmt: 6, anim: 24 },
    ],
    lights: [
      { kind: 'glow', color: '#ffd24a', at: 0.40, lift: 0.56, radius: 80, alpha: 0.12, pulse: 30 },
      { kind: 'glow', color: '#b06cf0', at: 0.54, lift: 0.40, radius: 90, alpha: 0.08, pulse: 40 },
    ],
    weather: { kind: 'drip', color: '#8fa8d0', count: 14 },
    tint: 'rgba(6,4,14,0.30)',
  },

  // ===== STAGE 24 — Sảnh Ngai Vàng (The Throne Hall) =====
  // MEANING: the enemy's seat of power. His empty throne, his banners, his
  // generals — everything about him except the Devourer himself, who is waiting
  // two stages further in. Rift purple everywhere: this is his room.
  throne_hall: {
    sky: ['#1e1030', '#3d1c50'],
    band: ['#443a56', '#332c42'],
    ground: ['#3d3450', '#2c263a', '#1e1a28'],
    clouds: { color: '#4d2464', count: 2 },
    far: [
      { sprite: SPIRE, scale: 7.5, at: 0.14, tint: '#331a48', baseOffset: 4 },
      { sprite: SPIRE, scale: 9.0, at: 0.84, tint: '#28143a', baseOffset: 4 },
    ],
    landmark: { sprite: DEMON_THRONE, at: 0.56, scale: 2.2 },
    props: [
      { sprite: DEMON_BANNER, at: 0.28, scale: 1.6, lift: 0.40 },
      { sprite: DEMON_BANNER, at: 0.44, scale: 1.4, lift: 0.44 },
      { sprite: DEMON_BANNER, at: 0.80, scale: 1.6, lift: 0.40 },
      { sprite: VOID_RIFT, at: 0.90, scale: 1.3, lift: 0.44, bob: 30, bobAmt: 8, anim: 18 },
    ],
    lights: [
      { kind: 'beam', color: '#c77dff', at: 0.90, lift: 0.48, width: 26, spread: 1.8, alpha: 0.13, pulse: 32 },
      { kind: 'glow', color: '#b06cf0', at: 0.56, lift: 0.54, radius: 150, alpha: 0.13, pulse: 30 },
      { kind: 'rays', color: '#c79dff', count: 5, alpha: 0.08, width: 60, slant: 0.3 },
    ],
    weather: { kind: 'embers', color: '#c77dff', count: 24 },
    tint: 'rgba(16,4,28,0.28)',
  },

  // ===== STAGE 25 — Hư Không Bóng Tối (The Darkness Void) =====
  // MEANING: the hero has left the world. The Devourer's own dimension, where
  // the rules are wrong — the ground is a thin causeway in nothing, the rifts
  // hang in mid-air, and the weather RISES instead of falling (see 'voidmotes'),
  // which is the one detail that tells a kid instantly they are somewhere else.
  void: {
    sky: ['#0d0818', '#1e1030'],
    band: ['#2e2440', '#221a30'],
    ground: ['#282038', '#1c1628', '#120e1c'],
    clouds: { color: null, count: 0 },
    far: [
      { sprite: SPIRE, scale: 5.0, at: 0.50, tint: '#1e1430', baseOffset: 3 },
    ],
    landmark: { sprite: VOID_RIFT, at: 0.54, scale: 2.6 },
    props: [
      { sprite: VOID_RIFT, at: 0.30, scale: 1.4, lift: 0.50, bob: 34, bobAmt: 10, anim: 16 },
      { sprite: VOID_RIFT, at: 0.74, scale: 1.7, lift: 0.62, bob: 30, bobAmt: 12, anim: 20 },
      { sprite: VOID_RIFT, at: 0.90, scale: 1.2, lift: 0.36, bob: 26, bobAmt: 8, anim: 23 },
      { sprite: CRYSTAL, at: 0.42, scale: 1.1, tint: '#8544c4' },
    ],
    lights: [
      { kind: 'beam', color: '#c77dff', at: 0.54, lift: 0.70, width: 40, spread: 2.4, alpha: 0.16, pulse: 30 },
      { kind: 'aurora', colors: ['#8544c4', '#4a1070', '#b06cf0'], alpha: 0.12, bandH: 28, top: 0.05, wave: 40 },
      { kind: 'glow', color: '#b06cf0', at: 0.74, lift: 0.66, radius: 110, alpha: 0.11, pulse: 26 },
    ],
    weather: { kind: 'voidmotes', color: '#e6b3ff', count: 34 },
    tint: 'rgba(4,2,12,0.30)',
  },

  // ===== STAGE 26 — Đỉnh Cao Cuối Cùng (The Final Summit) =====
  // MEANING: journey's end, on top of the spire the kid has watched since stage
  // 1. The landmark is the tower's own broken crown, so the last backdrop of the
  // game is the FIRST backdrop's distant speck, now underfoot. Dawn is just
  // breaking at the horizon — the sunrise the ending pays off.
  finalspire: {
    sky: ['#2a1236', '#6e2c50'],       // deep purple bruising toward red dawn
    band: ['#3e3448', '#2e2636'],
    ground: ['#382e42', '#282030', '#1a1522'],
    body: { sprite: SUN, x: 0.12, y: 74, scale: 3, tint: '#ff9a5a' }, // dawn, rising
    clouds: { color: '#8a3a5c', count: 3 },
    far: [
      { sprite: MOUNTAINS, scale: 1.2, tile: true, tint: '#4a2044', baseOffset: 5 },
    ],
    // We are ON the spire now: its broken top is the set piece.
    landmark: { sprite: SPIRE_CROWN, at: 0.58, scale: 2.4 },
    props: [
      { sprite: DEMON_BANNER, at: 0.28, scale: 1.5, lift: 0.42 },
      { sprite: VOID_RIFT, at: 0.42, scale: 1.5, lift: 0.56, bob: 32, bobAmt: 10, anim: 17 },
      { sprite: DEMON_BANNER, at: 0.86, scale: 1.4, lift: 0.42 },
      { sprite: BONE_PILLAR, at: 0.74, scale: 1.4 },
    ],
    lights: [
      { kind: 'beam', color: '#ff7a2f', at: 0.58, lift: 0.80, width: 46, spread: 2.6, alpha: 0.15, pulse: 26 },
      { kind: 'glow', color: '#b06cf0', at: 0.42, lift: 0.60, radius: 110, alpha: 0.11, pulse: 30 },
      { kind: 'rays', color: '#ffb37a', count: 5, alpha: 0.10, width: 64, slant: 0.4 },
    ],
    weather: { kind: 'embers', color: '#ffb347', count: 30 },
    tint: 'rgba(18,4,20,0.24)',
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
      case 'beam': {
        // A single VERTICAL pillar of light rising from one point — the Tower of
        // Wisdom's beacon, and the rifts in the void. Unlike 'rays' (many slanted
        // shafts from the sky) this is one column anchored to a thing on the
        // ground, so it reads as something emitting light rather than sunlight
        // coming in. It widens toward the top and fades out, which is what keeps
        // it from looking like a solid painted rectangle.
        const cx = w * L.at;
        const baseY = groundY - (L.lift || 0) * groundY;
        const top = (L.top ?? 0) * h;
        const breathe = 0.75 + 0.25 * Math.sin(tick / (L.pulse || 46));
        const wBase = (L.width || 30) * breathe;
        const wTop = wBase * (L.spread || 2.2);
        const grad = ctx.createLinearGradient(0, baseY, 0, top);
        grad.addColorStop(0, L.color);
        grad.addColorStop(0.35, L.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.globalAlpha = (L.alpha || 0.12) * breathe;
        ctx.beginPath();
        ctx.moveTo(cx - wBase / 2, baseY);
        ctx.lineTo(cx + wBase / 2, baseY);
        ctx.lineTo(cx + wTop / 2, top);
        ctx.lineTo(cx - wTop / 2, top);
        ctx.closePath();
        ctx.fill();
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
    case 'starfall': {
      // Slow-drifting star motes with occasional streaking falls — the starlit
      // wood and the Tower of Wisdom. Most motes just twinkle in place (a sky
      // full of streaks reads as rain); every fifth one falls diagonally.
      for (let i = 0; i < n; i++) {
        const falling = i % 5 === 0;
        if (falling) {
          const period = 220 + (i % 4) * 40;
          const t = ((tick + i * 60) % period) / period;
          const x = rnd(i + 3) * w + t * 160;
          const y = t * groundY;
          ctx.globalAlpha = 0.8 * (1 - t);
          ctx.fillStyle = wx.color;
          // A short tail, drawn as a few stepped pixels (no lineTo — this is a
          // pixel-art scene and a hairline diagonal would look wrong).
          for (let s = 0; s < 5; s++) {
            ctx.fillRect(x - s * 3, y - s * 4, DOT, DOT);
          }
        } else {
          const x = (rnd(i + 11) * w + tick * 0.12) % w;
          const y = rnd(i + 21) * groundY * 0.8;
          const tw = Math.sin((tick + i * 40) / 26);
          ctx.globalAlpha = 0.35 + 0.5 * Math.max(0, tw);
          ctx.fillStyle = wx.color;
          ctx.fillRect(x, y, DOT, DOT);
        }
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'leaves': {
      // Pages/leaves tumbling on the wind: they drift sideways much faster than
      // they fall, and rock back and forth as they go (the sine on x), which is
      // what separates a falling page from a falling snowflake.
      ctx.fillStyle = wx.color;
      for (let i = 0; i < n; i++) {
        const period = 260 + (i % 5) * 50;
        const t = ((tick + i * 55) % period) / period;
        const x = (rnd(i + 5) * w + t * w * 0.7 + Math.sin((tick + i * 30) / 22) * 22) % w;
        const y = t * h;
        ctx.globalAlpha = 0.55;
        // A 2x1 or 1x2 fleck, alternating — reads as a page turning over.
        const flip = Math.floor((tick + i * 17) / 14) % 2 === 0;
        ctx.fillRect(x, y, flip ? DOT * 2 : DOT, flip ? DOT : DOT * 2);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'ash': {
      // Grey ash settling over the siege: slower than snow, and it DRIFTS to one
      // side rather than falling straight, so the fortress feels windswept.
      ctx.fillStyle = wx.color;
      for (let i = 0; i < n; i++) {
        const x = (rnd(i + 7) * w + tick * 0.55 + Math.sin((tick + i * 25) / 40) * 14) % w;
        const y = (rnd(i + 17) * h + tick * 1.1) % h;
        ctx.globalAlpha = 0.4 + 0.3 * rnd(i + 27);
        ctx.fillRect(x, y, DOT, DOT);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'voidmotes': {
      // The Devourer's dimension: motes that RISE instead of falling, because
      // gravity is wrong here. Nothing else in the game moves upward, so this one
      // detail tells a kid instantly that they have left the world behind.
      ctx.fillStyle = wx.color;
      for (let i = 0; i < n; i++) {
        const x = (rnd(i + 9) * w + Math.sin((tick + i * 33) / 50) * 18) % w;
        const y = h - ((rnd(i + 19) * h + tick * 1.4) % h);
        const pulse = 0.4 + 0.6 * Math.abs(Math.sin((tick + i * 21) / 30));
        ctx.globalAlpha = pulse * 0.75;
        const s = i % 7 === 0 ? DOT * 2 : DOT;
        ctx.fillRect(x, y, s, s);
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
