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

  // ===== CHAPTER 2 — the quest for the Staff of Wisdom =====
  // These are GUARDIANS of knowledge, not beasts: books, wind, mirrors, statues.
  // The whole chapter fields a different KIND of enemy from chapter 1's animals
  // and ogres, so a new chapter looks new the moment the first wave walks in.
  library: {
    creep: 'creep_inkslime',
    boss: 'boss_scribe',
    stageboss: 'boss_guardian_statue',
    creepName: 'Slime Mực',         // "Ink Slime"
    bossName: 'Thủ Thư Bóng Tối',        // "Dark Scribe"
    stagebossName: 'Thủ Thư Cổ',    // "Ancient Librarian"
    deathColor: '#b06cf0',
  },
  windpeak: {
    creep: 'creep_gust',
    boss: 'boss_windserpent',
    stageboss: 'boss_windserpent',
    creepName: 'Gió Xoáy',          // "Wind Sprite"
    bossName: 'Xà Phong',           // "Wind Serpent"
    stagebossName: 'Xà Phong Chúa', // "Great Wind Serpent"
    deathColor: '#8fe3ff',
  },
  mistvale: {
    creep: 'creep_gust',
    boss: 'boss_formless',
    stageboss: 'boss_formless',
    creepName: 'Hơi Sương',         // "Mist Wisp"
    bossName: 'Bóng Sương',         // "Mist Shadow"
    stagebossName: 'Chúa Sương Mù', // "Lord of Fog"
    deathColor: '#cfe8f5',
  },
  rune_temple: {
    creep: 'creep_glyph',
    boss: 'boss_guardian_statue',
    stageboss: 'boss_guardian_statue',
    creepName: 'Chữ Sống',          // "Living Glyph"
    bossName: 'Tượng Thủ Đền',      // "Temple Statue"
    stagebossName: 'Tượng Thủ Lớn', // "Great Temple Statue"
    deathColor: '#4ad4d4',
  },
  mirrorlake: {
    creep: 'creep_mirror',
    boss: 'boss_formless',
    stageboss: 'boss_guardian_statue',
    creepName: 'Mảnh Gương',        // "Mirror Shard"
    bossName: 'Bóng Trong Gương',   // "Shadow in the Mirror"
    stagebossName: 'Chính Mình',    // "Yourself" — the trial of honesty
    deathColor: '#b8d8f0',
  },
  starwood: {
    creep: 'creep_inkslime',
    boss: 'boss_scribe',
    stageboss: 'boss_windserpent',
    creepName: 'Trang Sao',         // "Star Page"
    bossName: 'Thư Lại Sao',        // "Star Scribe"
    stagebossName: 'Xà Sao Đêm',    // "Night-Star Serpent"
    deathColor: '#ffe08a',
  },
  wisdom_tower: {
    creep: 'creep_glyph',
    boss: 'boss_guardian_statue',
    stageboss: 'boss_scribe',
    creepName: 'Chữ Thức',          // "Waking Glyph"
    bossName: 'Tượng Canh Tháp',    // "Tower Sentinel"
    stagebossName: 'Đại Thư Lại',   // "Grand Scribe"
    deathColor: '#4ad4d4',
  },
  wisdom_peak: {
    creep: 'creep_mirror',
    boss: 'boss_guardian_statue',
    // The chapter's finale: the Guardian who HOLDS the Staff.
    stageboss: 'stageboss_staffguardian',
    creepName: 'Mảnh Sáng',         // "Shard of Light"
    bossName: 'Tượng Thủ Cuối',     // "Last Statue"
    stagebossName: 'THỦ VỆ TRƯỢNG', // "GUARDIAN OF THE STAFF"
    deathColor: '#fff2b0',
  },

  // ===== CHAPTER 3 — the siege of the Demon King's fortress =====
  // His ARMY: bone soldiers, gate wardens, jailers, generals, void horrors, and
  // at the end the World Devourer himself.
  bonebridge: {
    creep: 'creep_bone',
    boss: 'boss_general',
    stageboss: 'boss_warden',
    creepName: 'Xương Lính',        // "Bone Soldier"
    bossName: 'Tướng Quỷ',          // "Demon General"
    stagebossName: 'Quản Cổng Sắt', // "Iron Warden"
    deathColor: '#e8e4dc',
  },
  demon_gate: {
    creep: 'creep_gateeye',
    boss: 'boss_warden',
    stageboss: 'boss_warden',
    creepName: 'Mắt Cổng',          // "Gate Eye"
    bossName: 'Quản Cổng Sắt',      // "Iron Warden"
    stagebossName: 'Quản Cổng Lớn', // "Great Warden"
    deathColor: '#8f8aa8',
  },
  dungeon: {
    creep: 'creep_key',
    boss: 'boss_jailer',
    stageboss: 'boss_jailer',
    creepName: 'Chìa Khóa Sống',    // "Living Key"
    bossName: 'Cai Ngục',           // "Jailer"
    stagebossName: 'Chúa Ngục',     // "Warden of the Deep"
    deathColor: '#ffd24a',
  },
  throne_hall: {
    creep: 'creep_helmet',
    boss: 'boss_general',
    stageboss: 'boss_general',
    creepName: 'Mũ Sống',           // "Haunted Helmet"
    bossName: 'Tướng Quỷ',          // "Demon General"
    stagebossName: 'Đại Tướng Quỷ', // "Grand Demon General"
    deathColor: '#e0503a',
  },
  void: {
    creep: 'creep_void',
    boss: 'boss_formless',
    stageboss: 'boss_formless',
    creepName: 'Mảnh Hư Không',     // "Void Fragment"
    bossName: 'Bóng Vô Hình',       // "Formless Shadow"
    stagebossName: 'Hư Không Sống', // "The Living Void"
    deathColor: '#b06cf0',
  },
  finalspire: {
    creep: 'creep_void',
    boss: 'boss_general',
    // THE final fight of the whole game — the prologue's villain.
    stageboss: 'stageboss_devourer',
    creepName: 'Mảnh Hư Không',     // "Void Fragment"
    bossName: 'Đại Tướng Quỷ',      // "Grand Demon General"
    stagebossName: 'KẺ NUỐT THẾ GIỚI', // "THE WORLD DEVOURER"
    deathColor: '#ff7a2f',
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
