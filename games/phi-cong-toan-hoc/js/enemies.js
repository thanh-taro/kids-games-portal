// enemies.js — the monstership roster.
//
// One entry per enemy id, holding everything the spawner needs that is NOT
// per-wave: which sprite, how big, what hue its debris takes, how it moves.
// A wave in stages.js names an enemy by id and supplies only the things that
// vary by encounter (count, formation, hits, speed).
//
// BIOME_ENEMIES then declares which monsterships each biome fields. That
// mapping is what verify.js uses to catch a wave calling for a ship that does
// not belong in its stage — the same check the typing game runs over its
// biome/monster tables, which caught real content bugs there.

export const ENEMIES = {
  // --- chapter 1: the Earth defence fleet's opposition ---
  dart: {
    id: 'dart',
    name: 'Phi Tiêu',              // "Dart"
    sprite: 'enemy_dart',
    scale: 1.3,
    color: '#e0503a',
    tier: 1,                       // death-explosion size
    baseSpeed: 22,
  },
  // SWARM FILLER — half the sprite, still 1 hit. Lets a wave spend the same
  // hit budget on more, smaller ships instead of fewer big ones, so a fleet
  // can look bigger without asking the slow profile for more hits than it
  // has (see stages.js's fleet-size rule).
  drone: {
    id: 'drone',
    name: 'Đom Đóm',               // "Firefly"
    sprite: 'enemy_drone',
    scale: 1.0,
    color: '#e0503a',
    tier: 1,
    baseSpeed: 24,
  },
  wedge: {
    id: 'wedge',
    name: 'Lưỡi Cày',              // "Ploughshare"
    sprite: 'enemy_wedge',
    scale: 1.3,
    color: '#e0503a',
    tier: 1,
    baseSpeed: 20,
  },
  fang: {
    id: 'fang',
    name: 'Nanh Sói',              // "Wolf Fang"
    sprite: 'enemy_fang',
    scale: 1.3,
    color: '#e0503a',
    tier: 1,
    baseSpeed: 21,
  },

  // --- chapter 2: the prison worlds ---
  orb: {
    id: 'orb',
    name: 'Cầu Canh',              // "Watch Orb"
    sprite: 'enemy_orb',
    scale: 1.25,
    color: '#a855f7',
    tier: 1,
    baseSpeed: 18,
  },
  spike: {
    id: 'spike',
    name: 'Mũi Nhọn',              // "Spike"
    sprite: 'enemy_spike',
    scale: 1.25,
    color: '#5fc23c',
    tier: 1,
    baseSpeed: 24,
  },
  husk: {
    id: 'husk',
    name: 'Vỏ Rỗng',               // "Hollow Shell"
    sprite: 'enemy_husk',
    scale: 1.25,
    color: '#a855f7',
    tier: 1,
    baseSpeed: 17,
  },

  // --- chapter 3: the Darkness Realm ---
  shard: {
    id: 'shard',
    name: 'Mảnh Vỡ',               // "Shard"
    sprite: 'enemy_shard',
    scale: 1.3,
    color: '#e0503a',
    tier: 1,
    baseSpeed: 26,
  },
  // Chapter 3's swarm filler — same role as drone, scaled from shard instead
  // of dart so it still reads as "Darkness Realm", not a chapter-1 leftover.
  wraith: {
    id: 'wraith',
    name: 'Bóng Ma',               // "Wraith"
    sprite: 'enemy_wraith',
    scale: 1.0,
    color: '#a855f7',
    tier: 1,
    baseSpeed: 28,
  },

  // --- elites: tougher, hold position, shoot back ---
  guard: {
    id: 'guard',
    name: 'Vệ Binh',               // "Guard"
    sprite: 'elite_guard',
    scale: 1.35,
    color: '#e0503a',
    tier: 2,
    baseSpeed: 16,
    elite: true,
  },
  lancer: {
    id: 'lancer',
    name: 'Kỵ Thương',             // "Lancer"
    sprite: 'elite_lancer',
    scale: 1.3,
    color: '#a855f7',
    tier: 2,
    baseSpeed: 18,
    elite: true,
  },
  sentinel: {
    id: 'sentinel',
    name: 'Tháp Canh',             // "Sentinel"
    sprite: 'elite_sentinel',
    scale: 1.35,
    color: '#5fc23c',
    tier: 2,
    baseSpeed: 14,
    elite: true,
  },
  reaver: {
    id: 'reaver',
    name: 'Tử Thần',               // "Reaper"
    sprite: 'elite_reaver',
    scale: 1.3,
    color: '#e0503a',
    tier: 2,
    baseSpeed: 19,
    elite: true,
  },

  // --- boss escorts: bosses never fly alone (see stages.js's `escorts` field) ---
  herald: {
    id: 'herald',
    name: 'Sứ Giả',                // "Herald" — commander's & the jailers' escort
    sprite: 'elite_herald',
    scale: 1.3,
    color: '#a855f7',
    tier: 2,
    baseSpeed: 13,
    elite: true,
  },
  bulwark: {
    id: 'bulwark',
    name: 'Lá Chắn',               // "Shield-Bearer" — warden's, twin's & the destroyer's escort
    sprite: 'elite_bulwark',
    scale: 1.3,
    color: '#e0503a',
    tier: 2,
    baseSpeed: 11,
    elite: true,
  },

  // --- bosses: one per chapter beat ---
  commander: {
    id: 'commander',
    name: 'Hắc Hạm Trưởng',        // "The Black Commander" — ch.1 finale
    sprite: 'boss_commander',
    scale: 1.5,
    color: '#e0503a',
    tier: 3,
    baseSpeed: 14,
  },
  jailer: {
    id: 'jailer',
    name: 'Quản Ngục',             // "The Jailer" — ch.2 prison bosses
    sprite: 'boss_jailer',
    scale: 1.45,
    color: '#a855f7',
    tier: 3,
    baseSpeed: 12,
  },
  warden: {
    id: 'warden',
    name: 'Sắt Thủ',               // "The Iron Warden"
    sprite: 'boss_warden',
    scale: 1.45,
    color: '#e0503a',
    tier: 3,
    baseSpeed: 12,
  },
  twin: {
    id: 'twin',
    name: 'Song Động',             // "Twin Engines"
    sprite: 'boss_twin',
    scale: 1.45,
    color: '#a855f7',
    tier: 3,
    baseSpeed: 12,
  },
  destroyer: {
    id: 'destroyer',
    name: 'Kẻ Huỷ Diệt Ngân Hà',   // "The Galaxy Destroyer" — the final boss
    sprite: 'boss_destroyer',
    scale: 1.5,
    color: '#ff2d6f',
    tier: 3,
    baseSpeed: 10,
  },
};

// Which monsterships each biome fields.
//
// The point of this table is that a stage cannot silently field the wrong fleet:
// the Darkness Realm should not be crewed by the same darts the kid fought in
// Earth orbit, and verify.js fails the build if a wave asks for one.
export const BIOME_ENEMIES = {
  // chapter 1 — the solar system, pushing outward from Earth
  earth_orbit:  ['dart', 'drone', 'wedge'],
  moon:         ['dart', 'drone', 'wedge', 'fang'],
  asteroid:     ['dart', 'drone', 'wedge', 'fang', 'spike'],
  mars:         ['dart', 'drone', 'wedge', 'fang', 'guard'],
  jupiter:      ['wedge', 'spike', 'drone', 'fang', 'guard'],
  outer_dark:   ['dart', 'drone', 'fang', 'spike', 'guard', 'herald', 'commander'],

  // chapter 2 — the five prison worlds
  prison_ice:   ['orb', 'spike', 'husk', 'sentinel', 'herald', 'jailer'],
  prison_ember: ['orb', 'dart', 'husk', 'sentinel', 'herald', 'jailer'],
  prison_storm: ['orb', 'husk', 'lancer', 'sentinel', 'herald', 'jailer'],
  prison_deep:  ['orb', 'spike', 'husk', 'lancer', 'sentinel', 'herald', 'jailer'],
  // The void edge hosts three stages (15-18): the last rescue, the fleet coming
  // together, and the turn toward the dark star. It fields the widest roster in
  // chapter 2 because it is where every earlier threat converges — and because
  // stage 18's Twin Engines boss stands guard at the gate.
  prison_void:  ['orb', 'spike', 'husk', 'lancer', 'sentinel', 'bulwark', 'warden', 'twin'],

  // chapter 3 — the Darkness Realm
  dark_gate:    ['shard', 'wraith', 'lancer', 'guard', 'reaver'],
  dark_field:   ['shard', 'wraith', 'orb', 'lancer', 'reaver'],
  dark_spire:   ['shard', 'wraith', 'lancer', 'guard', 'reaver', 'bulwark', 'twin'],
  dark_core:    ['shard', 'wraith', 'guard', 'lancer', 'reaver', 'bulwark', 'warden', 'destroyer'],
};

export function getEnemy(id) {
  return ENEMIES[id];
}

// The sprite id for an enemy — what SPRITES is keyed by.
export function enemySprite(id) {
  const e = ENEMIES[id];
  return e ? e.sprite : 'enemy_dart';
}
