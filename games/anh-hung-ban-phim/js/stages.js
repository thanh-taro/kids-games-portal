// stages.js — data-driven stage definitions.
//
// Each stage is a curriculum step (letters -> words -> phrases -> sentences),
// a wave sequence (creeps / elites / boss / stageboss), a princess to rescue,
// and flavor text for the intro/victory scenes.
//
// A wave entry: { type, pool?, skill? }
//   type: 'creep' | 'elite' | 'boss' | 'stageboss'
//   pool: which WORD_POOLS tier to draw the target word from (skills.js)
//   skill: which SKILLS entry the hero uses on that monster
//
// `biome` names the stage's scene theme in biomes.js — its sky, ground, weather,
// scenery props, lights, and story landmark — so the backdrop matches the
// stage's name AND its meaning (the cave holds the princess's broken cage, the
// desert a half-buried colossus, the fortress its chained gate). Every biome
// also shows the villain's spire on the horizon, growing nearer stage by stage.
// Omitting `biome` falls back to the stage-1 training field.
//
// The first two stages are gentle WARM-UPS with no princess: kids just drill
// letters (stage 1) and letters -> first words (stage 2) against weak monsters
// before the real rescue journey begins. Scenes render a "practice" goal in
// place of a princess when `princess` is absent.
//
// STAGE LENGTH ramps deliberately: a stage should feel like a journey, not a
// three-monster skirmish. Wave counts climb ~6 (warm-up) -> ~22 (final), so the
// last stages are a real endurance test while stage 1 still ends before a
// beginner tires. Bosses cost several words each (3 for boss, 6 for stageboss —
// see spawnNextWave in main.js), so the typed-word count per stage grows faster
// than the wave count alone suggests.
//
// SKILLS obey the reward schedule (REWARDS in rewards.js): fireball is awarded
// for clearing stage 2, lightning for stage 3, meteor for stage 5. No stage
// requests a special the kid can't yet own on a first playthrough — and
// resolveSkill() in skills.js degrades gracefully anyway if one ever does.

export const STAGES = [
  {
    id: 1,
    biome: 'training',
    name: 'Bãi Tập Nhỏ',          // "Little Training Ground"
    // no princess — warm-up stage
    intro: 'Làm quen với chữ cái!', // "Get to know the letters!"
    // 8 waves, all single letters and the basic attack — nothing is unlocked yet.
    waves: [
      { type: 'creep', pool: 'letters', skill: 'slash' },
      { type: 'creep', pool: 'letters', skill: 'slash' },
      { type: 'creep', pool: 'letters', skill: 'slash' },
      { type: 'creep', pool: 'letters', skill: 'slash' },
      { type: 'creep', pool: 'letters', skill: 'slash' },
      { type: 'creep', pool: 'letters', skill: 'slash' },
      { type: 'creep', pool: 'letters', skill: 'slash' },
      { type: 'elite', pool: 'letters', skill: 'slash' },
    ],
  },
  {
    id: 2,
    biome: 'practice_yard',
    name: 'Sân Luyện Chữ',        // "Word Practice Yard"
    // no princess — warm-up stage
    intro: 'Ghép chữ thành từ đầu tiên!', // "Combine letters into your first words!"
    // 10 waves. Still slash-only: fireball is the REWARD for clearing this stage,
    // so the kid meets their first special next stage, having just earned it.
    waves: [
      { type: 'creep', pool: 'letters', skill: 'slash' },
      { type: 'creep', pool: 'letters', skill: 'slash' },
      { type: 'creep', pool: 'letters', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'words', skill: 'slash' },
      { type: 'stageboss', pool: 'words', skill: 'slash' },
    ],
  },
  {
    id: 3,
    biome: 'meadow',
    name: 'Đồng Cỏ Xanh',        // "Green Meadow"
    princess: 'Công Chúa Hoa',   // "Princess Flower"
    princessStyle: 'flower',
    intro: 'Học gõ chữ cái đầu tiên!', // "Learn your first letters!"
    // 12 waves — first real rescue. Fireball (just awarded) debuts here.
    waves: [
      { type: 'creep', pool: 'letters', skill: 'slash' },
      { type: 'creep', pool: 'letters', skill: 'slash' },
      { type: 'creep', pool: 'letters', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'words', skill: 'fireball' },
      { type: 'elite', pool: 'words', skill: 'fireball' },
      { type: 'elite', pool: 'words', skill: 'fireball' },
      { type: 'boss', pool: 'words', skill: 'fireball' },
      { type: 'stageboss', pool: 'phrases', skill: 'fireball' },
    ],
  },
  {
    id: 4,
    biome: 'forest',
    name: 'Rừng Rậm',            // "Deep Forest"
    princess: 'Công Chúa Mưa',  // "Rain Princess"
    princessStyle: 'stream',
    intro: 'Ghép chữ thành từ!', // "Combine letters into words!"
    // 13 waves. Lightning (awarded for stage 3) joins; meteor is NOT here — it is
    // still two stages away, so the stageboss finishes on lightning instead.
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'words', skill: 'fireball' },
      { type: 'elite', pool: 'words', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'boss', pool: 'phrases', skill: 'fireball' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'elite', pool: 'phrases', skill: 'lightning' },
      { type: 'stageboss', pool: 'phrases', skill: 'lightning' },
    ],
  },
  {
    id: 5,
    biome: 'cave',
    name: 'Hang Động Tối',       // "Dark Cave"
    princess: 'Công Chúa Sao',   // "Princess Star"
    princessStyle: 'star',
    intro: 'Gõ cả cụm từ!',      // "Type whole phrases!"
    // 14 waves. Meteor is the reward for clearing THIS stage, so it still isn't
    // available — the cave finale is a long lightning duel instead.
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'elite', pool: 'phrases', skill: 'lightning' },
      { type: 'elite', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'stageboss', pool: 'phrases', skill: 'lightning' },
    ],
  },
  {
    id: 6,
    biome: 'dino_cave',
    name: 'Hang Khủng Long',     // "Dinosaur Cave"
    princess: 'Công Chúa Ánh Dương', // "Princess Sunlight"
    princessStyle: 'sunlight',
    intro: 'Gõ cụm từ thật nhuần nhuyễn!', // "Master your phrases!"
    // 15 waves. Meteor (awarded for stage 5) finally debuts on the stageboss.
    // Phrases stay the ceiling here — sentences don't debut until stage 12.
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'elite', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'elite', pool: 'phrases', skill: 'meteor' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'stageboss', pool: 'phrases', skill: 'meteor' },
    ],
  },
  {
    id: 7,
    biome: 'coast',
    name: 'Bờ Biển Ngọc',        // "Jade Coast"
    princess: 'Công Chúa Sóng Biển',  // "Princess Wave"
    princessStyle: 'wave',
    intro: 'Luyện từ nhanh hơn nào!', // "Practice words faster!"
    // 16 waves. Full kit from here on; phrases take over the back half —
    // sentences are still saved for stage 12.
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'elite', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'elite', pool: 'phrases', skill: 'meteor' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'stageboss', pool: 'phrases', skill: 'meteor' },
    ],
  },
  {
    id: 8,
    biome: 'dunes',
    name: 'Sa Mạc Vàng',         // "Golden Desert"
    princess: 'Công Chúa Cát',   // "Princess Sand"
    princessStyle: 'sand',
    intro: 'Gõ cụm từ dài hơn nào!', // "Type even longer phrases!"
    // 18 waves. Phrases carry the whole stage — sentences are still saved for
    // the chapter finale at stage 12.
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'elite', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'elite', pool: 'phrases', skill: 'meteor' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'stageboss', pool: 'phrases', skill: 'meteor' },
    ],
  },
  {
    id: 9,
    biome: 'snow',
    name: 'Đỉnh Núi Tuyết',      // "Snowy Peak"
    princess: 'Công Chúa Băng',  // "Princess Ice"
    princessStyle: 'ice',
    intro: 'Gõ cụm từ thật chuẩn xác!', // "Type phrases accurately!"
    // 19 waves. Phrases stay the ceiling — accuracy over the same tier is the
    // point of this stage, not a new tier yet.
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'elite', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'elite', pool: 'phrases', skill: 'meteor' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'elite', pool: 'phrases', skill: 'meteor' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'elite', pool: 'phrases', skill: 'meteor' },
      { type: 'stageboss', pool: 'phrases', skill: 'meteor' },
    ],
  },
  {
    id: 10,
    biome: 'swamp',
    name: 'Đầm Lầy Sương',       // "Misty Swamp"
    princess: 'Công Chúa Mây',   // "Princess Cloud"
    princessStyle: 'cloud',
    intro: 'Càng lúc càng giỏi!', // "Getting better and better!"
    // 20 waves. Still phrases throughout — the tier only steps up at stage 12.
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'elite', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'elite', pool: 'phrases', skill: 'meteor' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'elite', pool: 'phrases', skill: 'meteor' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'elite', pool: 'phrases', skill: 'meteor' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'stageboss', pool: 'phrases', skill: 'meteor' },
    ],
  },
  {
    id: 11,
    biome: 'volcano',
    name: 'Núi Lửa Nóng Rực',         // "Blazing Volcano"
    princess: 'Công Chúa Tình Yêu', // "Princess of Love"
    princessStyle: 'love',
    intro: 'Thử thách gần cuối rồi!', // "The near-final challenge!"
    // 21 waves. The endurance test right before the finale — still phrases,
    // now almost wall-to-wall, so stage 12 is the one place sentences feel new.
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'elite', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'elite', pool: 'phrases', skill: 'meteor' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'elite', pool: 'phrases', skill: 'meteor' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'elite', pool: 'phrases', skill: 'meteor' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'boss', pool: 'phrases', skill: 'meteor' },
      { type: 'stageboss', pool: 'phrases', skill: 'meteor' },
    ],
  },
  {
    id: 12,
    biome: 'castle',
    name: 'Thành Trì Bóng Tối',  // "Fortress of Darkness"
    princess: 'Công Chúa Ánh Sáng', // "Princess Light"
    princessStyle: 'light',
    intro: 'Trận cuối — cứu tất cả!', // "Final battle — save everyone!"
    // 21 waves — the longest gauntlet, closing on the Dark Lord fought as a
    // two-phase stageboss (see `phases` below; the same mechanic stage 26 uses).
    // This is where the `sentences` tier debuts for the first time in the game
    // (every earlier stage in the chapter held at phrases), so the endurance
    // peak of chapter 1 doubles as its one true step up in curriculum tier.
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'sentences', skill: 'fireball' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'elite', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'elite', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'elite', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'elite', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      {
        type: 'stageboss',
        pool: 'sentences',
        skill: 'meteor',
        phases: [
          { name: 'CHÚA TỂ BÓNG TỐI — Bóng Đêm', hits: 6, attackEvery: 480 },
          { name: 'CHÚA TỂ BÓNG TỐI — Thịnh Nộ', hits: 6, attackEvery: 360, attackDamage: 20 },
        ],
      },
    ],
  },
  // =========================================================================
  // CHAPTER 2 — "Trượng Của Trí Tuệ" (The Staff of Wisdom), stages 13-20
  // =========================================================================
  // The princesses are safe; this chapter is a QUEST, so there is no princess to
  // rescue in any of these stages (scenes.js shows the "practice/goal" variant).
  // The curriculum steps up to tier 6 `long_sentences`: 7-10 syllables where the
  // tone changes on nearly every one. That is the specific skill this chapter
  // teaches — sustaining a clean run, not surviving one hard syllable.
  //
  // Mirroring chapter 1's shape: stages 13-19 hold at `sentences`/`long_sentences`
  // and tier 5 `hard_sentences` is saved entirely for the chapter finale at stage
  // 20 — the step up in tier reads as one deliberate jump, not a slow creep.
  //
  // Wave counts hold around 16-20: chapter 1 already built endurance, so the
  // difficulty here comes from the WORDS, not from longer gauntlets.
  {
    id: 13,
    biome: 'library',
    name: 'Thư Viện Cổ',           // "The Ancient Library"
    intro: 'Tìm manh mối trong sách cổ!', // "Find the clue in the ancient books!"
    // Frost Nova (the reward for clearing stage 12) debuts here.
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'sentences', skill: 'fireball' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'elite', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'frostnova' },
      { type: 'elite', pool: 'sentences', skill: 'frostnova' },
      { type: 'boss', pool: 'long_sentences', skill: 'frostnova' },
      { type: 'boss', pool: 'sentences', skill: 'frostnova' },
      { type: 'elite', pool: 'sentences', skill: 'frostnova' },
      { type: 'boss', pool: 'long_sentences', skill: 'frostnova' },
      { type: 'stageboss', pool: 'long_sentences', skill: 'frostnova' },
    ],
  },
  {
    id: 14,
    biome: 'windpeak',
    name: 'Núi Vọng Gió',          // "The Howling Peak"
    intro: 'Thử thách sự bền lòng!', // "The trial of perseverance!"
    // 17 waves. Wind Blades (stage 13's reward) joins — the fast, five-shot volley.
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'elite', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'frostnova' },
      { type: 'boss', pool: 'long_sentences', skill: 'frostnova' },
      { type: 'elite', pool: 'sentences', skill: 'windblade' },
      { type: 'boss', pool: 'long_sentences', skill: 'windblade' },
      { type: 'boss', pool: 'sentences', skill: 'windblade' },
      { type: 'elite', pool: 'sentences', skill: 'windblade' },
      { type: 'boss', pool: 'long_sentences', skill: 'windblade' },
      { type: 'boss', pool: 'long_sentences', skill: 'windblade' },
      { type: 'stageboss', pool: 'long_sentences', skill: 'windblade' },
    ],
  },
  {
    id: 15,
    biome: 'mistvale',
    name: 'Vực Sương Mù',          // "The Vale of Fog"
    intro: 'Thử thách sự sáng suốt!', // "The trial of clarity!"
    // 18 waves. Long sentences now carry the whole back half.
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'elite', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'long_sentences', skill: 'frostnova' },
      { type: 'boss', pool: 'long_sentences', skill: 'frostnova' },
      { type: 'elite', pool: 'sentences', skill: 'windblade' },
      { type: 'boss', pool: 'long_sentences', skill: 'windblade' },
      { type: 'boss', pool: 'long_sentences', skill: 'windblade' },
      { type: 'elite', pool: 'sentences', skill: 'windblade' },
      { type: 'boss', pool: 'long_sentences', skill: 'windblade' },
      { type: 'boss', pool: 'long_sentences', skill: 'windblade' },
      { type: 'elite', pool: 'sentences', skill: 'windblade' },
      { type: 'stageboss', pool: 'long_sentences', skill: 'windblade' },
    ],
  },
  {
    id: 16,
    biome: 'rune_temple',
    name: 'Đền Chữ Cổ',            // "Temple of Ancient Letters"
    intro: 'Gõ đúng là chìa khóa!', // "Typing correctly is the key!"
    // 18 waves. Holy Light (stage 15's reward) debuts — the Staff's first gift.
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'sentences', skill: 'fireball' },
      { type: 'elite', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'long_sentences', skill: 'meteor' },
      { type: 'elite', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'long_sentences', skill: 'frostnova' },
      { type: 'boss', pool: 'long_sentences', skill: 'windblade' },
      { type: 'elite', pool: 'sentences', skill: 'windblade' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'elite', pool: 'sentences', skill: 'holylight' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'elite', pool: 'sentences', skill: 'holylight' },
      { type: 'stageboss', pool: 'long_sentences', skill: 'holylight' },
    ],
  },
  {
    id: 17,
    biome: 'mirrorlake',
    name: 'Hồ Gương',              // "The Mirror Lake"
    intro: 'Thử thách sự thật thà!', // "The trial of honesty!"
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'sentences', skill: 'fireball' },
      { type: 'elite', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'long_sentences', skill: 'lightning' },
      { type: 'boss', pool: 'long_sentences', skill: 'meteor' },
      { type: 'elite', pool: 'sentences', skill: 'frostnova' },
      { type: 'boss', pool: 'long_sentences', skill: 'frostnova' },
      { type: 'boss', pool: 'long_sentences', skill: 'windblade' },
      { type: 'elite', pool: 'sentences', skill: 'windblade' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'elite', pool: 'sentences', skill: 'holylight' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'elite', pool: 'sentences', skill: 'holylight' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'stageboss', pool: 'long_sentences', skill: 'holylight' },
    ],
  },
  {
    id: 18,
    biome: 'starwood',
    name: 'Rừng Sao Đêm',          // "The Night-Star Wood"
    intro: 'Ánh sáng của Trượng đã gần!', // "The Staff's light is near!"
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'sentences', skill: 'fireball' },
      { type: 'elite', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'long_sentences', skill: 'lightning' },
      { type: 'boss', pool: 'long_sentences', skill: 'meteor' },
      { type: 'elite', pool: 'sentences', skill: 'frostnova' },
      { type: 'boss', pool: 'long_sentences', skill: 'frostnova' },
      { type: 'boss', pool: 'long_sentences', skill: 'windblade' },
      { type: 'elite', pool: 'sentences', skill: 'windblade' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'elite', pool: 'sentences', skill: 'holylight' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'elite', pool: 'sentences', skill: 'holylight' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'stageboss', pool: 'long_sentences', skill: 'holylight' },
    ],
  },
  {
    id: 19,
    biome: 'wisdom_tower',
    name: 'Tháp Trí Tuệ',          // "The Tower of Wisdom"
    intro: 'Leo lên từng bậc thang!', // "Climb it step by step!"
    // 20 waves — the ascent, and the chapter's endurance peak before the finale.
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'sentences', skill: 'fireball' },
      { type: 'elite', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'long_sentences', skill: 'lightning' },
      { type: 'boss', pool: 'long_sentences', skill: 'meteor' },
      { type: 'elite', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'long_sentences', skill: 'frostnova' },
      { type: 'boss', pool: 'long_sentences', skill: 'frostnova' },
      { type: 'elite', pool: 'sentences', skill: 'windblade' },
      { type: 'boss', pool: 'long_sentences', skill: 'windblade' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'elite', pool: 'sentences', skill: 'holylight' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'elite', pool: 'sentences', skill: 'holylight' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'stageboss', pool: 'long_sentences', skill: 'holylight' },
    ],
  },
  {
    id: 20,
    biome: 'wisdom_peak',
    name: 'Đỉnh Trí Tuệ',          // "The Summit of Wisdom"
    intro: 'Thủ Vệ Trượng đang chờ!', // "The Guardian of the Staff awaits!"
    // CHAPTER 2 FINALE — the Guardian who holds the Staff. This is also where
    // `hard_sentences` (tier 5) debuts in this chapter — every earlier stage
    // held at plain `sentences`, so the tier only steps up here, mirroring how
    // stage 12 was the one place `sentences` stepped up in chapter 1. The
    // Guardian is fought as a two-phase stageboss (see `phases` below), same
    // mechanic as stage 12's Dark Lord and stage 26's World Devourer.
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'sentences', skill: 'fireball' },
      { type: 'elite', pool: 'hard_sentences', skill: 'lightning' },
      { type: 'boss', pool: 'long_sentences', skill: 'lightning' },
      { type: 'boss', pool: 'long_sentences', skill: 'meteor' },
      { type: 'elite', pool: 'hard_sentences', skill: 'frostnova' },
      { type: 'boss', pool: 'long_sentences', skill: 'frostnova' },
      { type: 'boss', pool: 'long_sentences', skill: 'windblade' },
      { type: 'elite', pool: 'hard_sentences', skill: 'windblade' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'elite', pool: 'hard_sentences', skill: 'holylight' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'elite', pool: 'hard_sentences', skill: 'holylight' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      {
        type: 'stageboss',
        pool: 'long_sentences',
        skill: 'holylight',
        phases: [
          { name: 'THỦ VỆ TRƯỢNG — Canh Giữ', hits: 6, attackEvery: 480 },
          { name: 'THỦ VỆ TRƯỢNG — Tuyệt Vọng', hits: 6, attackEvery: 360, attackDamage: 20 },
        ],
      },
    ],
  },

  // =========================================================================
  // CHAPTER 3 — "Trận Chiến Cuối Cùng" (The Final Confrontation), stages 21-26
  // =========================================================================
  // The siege. Tier 7 `wisdom_sayings` — real Vietnamese proverbs — becomes the
  // boss tier, so the hardest typing in the game is also the most worth having
  // learned. Only SIX stages, but every one is dense: this chapter is short and
  // brutal on purpose, because a 6-stage sprint to the villain reads as a final
  // push, while another twelve would read as filler.
  //
  // This is deliberately the hardest chapter in the game: `words` (tier 2) never
  // appears again — even the weakest creep wave types at `sentences` — and every
  // stage's elites sit at `hard_sentences`/`long_sentences` with bosses at
  // `wisdom_sayings`. Nothing here eases back down to an earlier tier.
  {
    id: 21,
    biome: 'bonebridge',
    name: 'Cầu Xương Trắng',       // "The Bridge of White Bones"
    intro: 'Không còn đường quay lại!', // "There is no turning back!"
    // Even the weakest creep types past this point in the game while `sentences`
    // — nothing in chapter 3 is a `words`-tier fight anymore.
    waves: [
      { type: 'creep', pool: 'sentences', skill: 'slash' },
      { type: 'creep', pool: 'sentences', skill: 'slash' },
      { type: 'elite', pool: 'hard_sentences', skill: 'fireball' },
      { type: 'elite', pool: 'hard_sentences', skill: 'lightning' },
      { type: 'boss', pool: 'long_sentences', skill: 'meteor' },
      { type: 'boss', pool: 'long_sentences', skill: 'frostnova' },
      { type: 'elite', pool: 'hard_sentences', skill: 'windblade' },
      { type: 'boss', pool: 'long_sentences', skill: 'holylight' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'holylight' },
      { type: 'elite', pool: 'long_sentences', skill: 'voidrend' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'voidrend' },
      { type: 'boss', pool: 'long_sentences', skill: 'voidrend' },
      { type: 'elite', pool: 'long_sentences', skill: 'voidrend' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'voidrend' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'voidrend' },
      { type: 'stageboss', pool: 'wisdom_sayings', skill: 'voidrend' },
    ],
  },
  {
    id: 22,
    biome: 'demon_gate',
    name: 'Cổng Thành Quỷ',        // "The Demon Gate"
    intro: 'Phá cổng thành bóng tối!', // "Break the dark fortress gate!"
    waves: [
      { type: 'creep', pool: 'sentences', skill: 'slash' },
      { type: 'creep', pool: 'sentences', skill: 'slash' },
      { type: 'elite', pool: 'hard_sentences', skill: 'fireball' },
      { type: 'elite', pool: 'hard_sentences', skill: 'lightning' },
      { type: 'boss', pool: 'long_sentences', skill: 'meteor' },
      { type: 'boss', pool: 'long_sentences', skill: 'frostnova' },
      { type: 'elite', pool: 'hard_sentences', skill: 'windblade' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'holylight' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'voidrend' },
      { type: 'elite', pool: 'long_sentences', skill: 'voidrend' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'voidrend' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'voidrend' },
      { type: 'elite', pool: 'long_sentences', skill: 'voidrend' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'voidrend' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'voidrend' },
      { type: 'elite', pool: 'long_sentences', skill: 'voidrend' },
      { type: 'stageboss', pool: 'wisdom_sayings', skill: 'voidrend' },
    ],
  },
  {
    id: 23,
    biome: 'dungeon',
    name: 'Ngục Tối Vô Tận',       // "The Endless Dungeon"
    intro: 'Nơi giam giữ phép màu!', // "Where the magic was imprisoned!"
    waves: [
      { type: 'creep', pool: 'sentences', skill: 'slash' },
      { type: 'creep', pool: 'sentences', skill: 'slash' },
      { type: 'elite', pool: 'hard_sentences', skill: 'fireball' },
      { type: 'elite', pool: 'hard_sentences', skill: 'lightning' },
      { type: 'boss', pool: 'long_sentences', skill: 'meteor' },
      { type: 'boss', pool: 'long_sentences', skill: 'frostnova' },
      { type: 'elite', pool: 'hard_sentences', skill: 'windblade' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'holylight' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'voidrend' },
      { type: 'elite', pool: 'long_sentences', skill: 'voidrend' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'voidrend' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'voidrend' },
      { type: 'elite', pool: 'long_sentences', skill: 'voidrend' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'voidrend' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'voidrend' },
      { type: 'elite', pool: 'long_sentences', skill: 'voidrend' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'voidrend' },
      { type: 'stageboss', pool: 'wisdom_sayings', skill: 'voidrend' },
    ],
  },
  {
    id: 24,
    biome: 'throne_hall',
    name: 'Sảnh Ngai Vàng',        // "The Throne Hall"
    intro: 'Đối đầu các tướng quỷ!', // "Face the demon generals!"
    // Dawnbreaker (stage 23's reward) debuts: the Staff at full power.
    waves: [
      { type: 'creep', pool: 'sentences', skill: 'slash' },
      { type: 'creep', pool: 'sentences', skill: 'slash' },
      { type: 'elite', pool: 'hard_sentences', skill: 'fireball' },
      { type: 'elite', pool: 'hard_sentences', skill: 'lightning' },
      { type: 'boss', pool: 'long_sentences', skill: 'meteor' },
      { type: 'boss', pool: 'long_sentences', skill: 'frostnova' },
      { type: 'elite', pool: 'hard_sentences', skill: 'windblade' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'holylight' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'voidrend' },
      { type: 'elite', pool: 'long_sentences', skill: 'voidrend' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'dawnbreaker' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'dawnbreaker' },
      { type: 'elite', pool: 'long_sentences', skill: 'dawnbreaker' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'dawnbreaker' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'dawnbreaker' },
      { type: 'elite', pool: 'long_sentences', skill: 'dawnbreaker' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'dawnbreaker' },
      { type: 'stageboss', pool: 'wisdom_sayings', skill: 'dawnbreaker' },
    ],
  },
  {
    id: 25,
    biome: 'void',
    name: 'Bóng Tối Hư Không',     // "The Darkness Void"
    intro: 'Thế giới của Kẻ Nuốt Thế Giới!', // "The World Devourer's own realm!"
    waves: [
      { type: 'creep', pool: 'sentences', skill: 'slash' },
      { type: 'creep', pool: 'sentences', skill: 'slash' },
      { type: 'elite', pool: 'hard_sentences', skill: 'fireball' },
      { type: 'elite', pool: 'hard_sentences', skill: 'lightning' },
      { type: 'boss', pool: 'long_sentences', skill: 'meteor' },
      { type: 'boss', pool: 'long_sentences', skill: 'frostnova' },
      { type: 'elite', pool: 'long_sentences', skill: 'windblade' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'holylight' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'voidrend' },
      { type: 'elite', pool: 'long_sentences', skill: 'dawnbreaker' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'dawnbreaker' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'dawnbreaker' },
      { type: 'elite', pool: 'long_sentences', skill: 'dawnbreaker' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'dawnbreaker' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'dawnbreaker' },
      { type: 'elite', pool: 'long_sentences', skill: 'dawnbreaker' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'dawnbreaker' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'dawnbreaker' },
      { type: 'stageboss', pool: 'wisdom_sayings', skill: 'dawnbreaker' },
    ],
  },
  {
    id: 26,
    biome: 'finalspire',
    name: 'Đỉnh Cao Cuối Cùng',    // "The Final Summit"
    intro: 'Trận chiến cuối cùng — cứu cả thế giới!', // "The final battle — save the world!"
    // THE LAST STAGE OF THE GAME. The World Devourer is a three-PHASE fight (see
    // `phases` on the stageboss wave and Monster.phases in entities.js) rather
    // than just another stageboss with more hit points: shrouded (shielded),
    // unleashed, then desperate. That is the finale's one new mechanic.
    waves: [
      { type: 'creep', pool: 'sentences', skill: 'slash' },
      { type: 'creep', pool: 'sentences', skill: 'slash' },
      { type: 'elite', pool: 'hard_sentences', skill: 'fireball' },
      { type: 'elite', pool: 'long_sentences', skill: 'lightning' },
      { type: 'boss', pool: 'long_sentences', skill: 'meteor' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'frostnova' },
      { type: 'elite', pool: 'long_sentences', skill: 'windblade' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'holylight' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'voidrend' },
      { type: 'elite', pool: 'long_sentences', skill: 'dawnbreaker' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'dawnbreaker' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'dawnbreaker' },
      { type: 'elite', pool: 'long_sentences', skill: 'dawnbreaker' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'dawnbreaker' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'dawnbreaker' },
      { type: 'elite', pool: 'long_sentences', skill: 'dawnbreaker' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'dawnbreaker' },
      { type: 'boss', pool: 'wisdom_sayings', skill: 'dawnbreaker' },
      // The World Devourer himself, in three phases.
      {
        type: 'stageboss',
        pool: 'wisdom_sayings',
        skill: 'dawnbreaker',
        phases: [
          // Phase 1: shrouded. His shield only breaks to a CHARGED Staff hit —
          // the payoff for the charge meter the kid has been filling since ch. 2.
          { name: 'KẺ NUỐT THẾ GIỚI — Khiên Bóng Tối', hits: 5, shielded: true, attackEvery: 520 },
          // Phase 2: unleashed. Shield gone, attacks come faster.
          { name: 'KẺ NUỐT THẾ GIỚI — Cuồng Nộ', hits: 7, attackEvery: 380 },
          // Phase 3: desperate. He tries to devour the sky.
          { name: 'KẺ NUỐT THẾ GIỚI — Tuyệt Vọng', hits: 8, attackEvery: 300 },
        ],
      },
    ],
  },
  // To add more stages later: append entries here with a fresh id/name/princess/
  // intro/biome and a waves[] list. Everything (spawning, rewards, victory→
  // next-stage, final-stage → GAME_COMPLETE) is driven off STAGES.length
  // automatically. If the new stages form a new CHAPTER, also add its range to
  // CHAPTERS in chapters.js and its narration to story.js (verify.js asserts the
  // chapter ranges tile STAGES exactly, so a mismatch fails the check).
];

export function getStage(index) {
  return STAGES[Math.min(index, STAGES.length - 1)];
}

export const TOTAL_STAGES = STAGES.length;
