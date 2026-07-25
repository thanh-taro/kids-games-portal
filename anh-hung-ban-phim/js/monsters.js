// monsters.js — which monsters each biome fields.
//
// Data, not code: a stage's `biome` (see stages.js / biomes.js) picks the sprite
// for each wave type, so every scene fights creatures that match it — a mushroom
// in the meadow, a stone bat in the cave, a haunted helmet in the fortress.
// Adding a biome's roster is a new entry here; nothing in main.js changes.
//
// Each entry is { creep, elite?, boss?, stageboss?, creepName, deathColor }:
//   creep       sprite id (see SPRITES in sprites.js) for 'creep' waves
//   elite       'elite' waves; defaults to `creep` (elites are the same creature
//               marked with a red crest, which reads as "the tough one" faster
//               than a whole new silhouette would)
//   boss        'boss' waves — falls back to DEFAULT.boss
//   stageboss   'stageboss' waves — falls back to DEFAULT.stageboss
//   creepName   Vietnamese name, for HUD/labels
//   bossName    Vietnamese name shown on the boss health bar
//   stagebossName  ditto for the stageboss (falls back to bossName)
//   deathColor  hue of the death burst, so a snowball doesn't explode green
//
// The two ORIGINAL boss sprites are kept and placed where they fit best rather
// than used everywhere: the T-Rex (boss_dragon) is the dino cave's stageboss —
// it IS a dinosaur — and the ogre (stageboss_ogre) holds the early stages and
// the volcano. Stage 12's stageboss is the Dark Lord, the villain whose spire
// has been on every horizon since stage 1.

export const DEFAULT_MONSTERS = {
  creep: 'creep_slime',
  boss: 'boss_dragon',
  stageboss: 'stageboss_ogre',
  creepName: 'Slime',
  bossName: 'Khủng Long Lửa',       // "Fire Dinosaur"
  stagebossName: 'Quỷ Khổng Lồ',    // "Giant Ogre"
  deathColor: '#5fc23c',
};

export const BIOME_MONSTERS = {
  // Warm-up stages: not real creatures — a straw dummy, then a living rune.
  // Neither stage has a boss wave, so they inherit the defaults harmlessly.
  training: {
    creep: 'creep_dummy',
    creepName: 'Bao Cát',           // "Sandbag / straw dummy"
    bossName: 'Bao Cát Lớn',        // "Big Sandbag" — stage 1 has no boss wave,
    stagebossName: 'Bao Cát Lớn',   // but don't leave a stray "Fire Dinosaur".
    deathColor: '#f6e7a8',
  },
  practice_yard: {
    creep: 'creep_glyph',
    creepName: 'Chữ Sống',          // "Living Glyph"
    bossName: 'Rune Lớn',           // "Great Rune"
    stagebossName: 'Thủ Vệ Rune',   // "Rune Guardian"
    deathColor: '#b06cf0',
  },

  meadow: {
    creep: 'creep_mushroom',
    boss: 'boss_queenbee',
    creepName: 'Nấm Nhỏ',           // "Little Mushroom"
    bossName: 'Ong Chúa',           // "Queen Bee"
    stagebossName: 'Quỷ Đồng Cỏ',   // "Meadow Ogre"
    deathColor: '#e0503a',
  },
  forest: {
    creep: 'creep_thornseed',
    boss: 'boss_bear',
    creepName: 'Hạt Gai',           // "Thorn Seed"
    bossName: 'Gấu Rừng Già',       // "Old Forest Bear"
    stagebossName: 'Quỷ Rừng',      // "Forest Ogre"
    deathColor: '#2f7d3a',
  },
  cave: {
    creep: 'creep_bat',
    boss: 'boss_golem',
    creepName: 'Dơi Đá',            // "Stone Bat"
    bossName: 'Golem Đá',           // "Stone Golem"
    stagebossName: 'Quỷ Hang Sâu',  // "Deep Cave Ogre"
    deathColor: '#4ad4d4',          // crystal cyan — pops in the darkest biome
  },
  dino_cave: {
    creep: 'creep_hatchling',
    // The T-Rex belongs HERE — it's a dinosaur, in the dinosaur cave. It is this
    // biome's stageboss (its top billing), with the golem holding boss waves.
    boss: 'boss_golem',
    stageboss: 'boss_dragon',
    creepName: 'Trứng Nứt',         // "Cracked Egg"
    bossName: 'Golem Đá',           // "Stone Golem"
    stagebossName: 'Bạo Chúa Lửa',  // "Fire Tyrant"
    deathColor: '#5fc23c',
  },
  coast: {
    creep: 'creep_crab',
    boss: 'boss_captain',
    creepName: 'Cua Ngọc',          // "Jade Crab"
    bossName: 'Thuyền Trưởng Xương', // "Skeleton Captain"
    stagebossName: 'Quỷ Biển',      // "Sea Ogre"
    deathColor: '#3fb8b0',
  },
  dunes: {
    creep: 'creep_scarab',
    boss: 'boss_scorpion',
    creepName: 'Bọ Cát',            // "Sand Scarab"
    bossName: 'Bọ Cạp Vàng',        // "Gold Scorpion"
    stagebossName: 'Quỷ Sa Mạc',    // "Desert Ogre"
    deathColor: '#c78a3b',
  },
  snow: {
    creep: 'creep_snowball',
    boss: 'boss_icegiant',
    creepName: 'Cầu Tuyết',         // "Snowball"
    bossName: 'Người Tuyết Khổng Lồ', // "Ice Giant"
    stagebossName: 'Quỷ Băng',      // "Ice Ogre"
    deathColor: '#e8f4ff',
  },
  swamp: {
    creep: 'creep_wisp',
    boss: 'boss_bogspirit',
    creepName: 'Đèn Ma',            // "Will-o'-the-wisp"
    bossName: 'Thần Đầm Lầy',       // "Bog Spirit"
    stagebossName: 'Quỷ Đầm Lầy',   // "Swamp Ogre"
    deathColor: '#4ad4d4',
  },
  volcano: {
    creep: 'creep_magma',
    boss: 'boss_firedemon',
    creepName: 'Đá Lửa',            // "Magma Pebble"
    bossName: 'Quỷ Lửa Lớn',        // "Great Fire Demon"
    stagebossName: 'Quỷ Núi Lửa',   // "Volcano Ogre"
    deathColor: '#ff7a2f',
  },
  castle: {
    creep: 'creep_helmet',
    // The sorcerer is the villain's lieutenant (boss waves); the Dark Lord
    // himself is the stageboss — the final fight of the chapter.
    boss: 'boss_sorcerer',
    stageboss: 'stageboss_darklord',
    creepName: 'Mũ Sống',           // "Haunted Helmet"
    bossName: 'Pháp Sư Bóng Tối',   // "Dark Sorcerer"
    stagebossName: 'CHÚA TỂ BÓNG TỐI', // "THE DARK LORD"
    deathColor: '#b06cf0',
  },
};

// Resolve a biome's roster, filling anything unset from DEFAULT_MONSTERS.
// An unknown/missing biome falls back entirely to the defaults, so a stage that
// omits `biome` still spawns valid monsters.
export function monstersForBiome(biome) {
  const set = BIOME_MONSTERS[biome] || {};
  const bossName = set.bossName || DEFAULT_MONSTERS.bossName;
  return {
    creep: set.creep || DEFAULT_MONSTERS.creep,
    elite: set.elite || set.creep || DEFAULT_MONSTERS.creep,
    boss: set.boss || DEFAULT_MONSTERS.boss,
    stageboss: set.stageboss || DEFAULT_MONSTERS.stageboss,
    creepName: set.creepName || DEFAULT_MONSTERS.creepName,
    bossName,
    // A biome that names no stageboss reuses its boss name rather than the
    // global default, so an unnamed stageboss never reads "Fire Dinosaur".
    stagebossName: set.stagebossName || bossName,
    deathColor: set.deathColor || DEFAULT_MONSTERS.deathColor,
  };
}

// Sprite id → death-burst hue. Every creep and boss sprite a biome uses gets its
// biome's color; main.js looks the monster's own spriteId up here when it dies.
// The shared sprites keep explicit hues since several biomes reuse them.
export const MONSTER_COLOR = (() => {
  const map = {
    creep_slime: '#5fc23c',
    boss_dragon: '#e0503a',
    stageboss_ogre: '#5fc23c',
    stageboss_darklord: '#b06cf0',
  };
  for (const set of Object.values(BIOME_MONSTERS)) {
    for (const key of ['creep', 'elite', 'boss', 'stageboss']) {
      // Don't let a biome override a shared sprite's established hue.
      if (set[key] && !(set[key] in map)) map[set[key]] = set.deathColor;
    }
  }
  return map;
})();
