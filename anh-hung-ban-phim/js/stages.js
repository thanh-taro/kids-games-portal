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
    princess: 'Công Chúa Suối',  // "Princess Stream"
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
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'elite', pool: 'phrases', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'stageboss', pool: 'sentences', skill: 'meteor' },
    ],
  },
  {
    id: 7,
    biome: 'coast',
    name: 'Bờ Biển Ngọc',        // "Jade Coast"
    princess: 'Công Chúa Sóng',  // "Princess Wave"
    princessStyle: 'wave',
    intro: 'Luyện từ nhanh hơn nào!', // "Practice words faster!"
    // 16 waves. Full kit from here on; sentences take over the back half.
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
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'elite', pool: 'phrases', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'stageboss', pool: 'sentences', skill: 'meteor' },
    ],
  },
  {
    id: 8,
    biome: 'dunes',
    name: 'Sa Mạc Vàng',         // "Golden Desert"
    princess: 'Công Chúa Cát',   // "Princess Sand"
    princessStyle: 'sand',
    intro: 'Bắt đầu gõ cả câu!',  // "Start typing full sentences!"
    // 18 waves. The stageboss is the kid's first HARD sentence — one long line as
    // the climax, after a stage of ordinary ones.
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'elite', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'elite', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'stageboss', pool: 'hard_sentences', skill: 'meteor' },
    ],
  },
  {
    id: 9,
    biome: 'snow',
    name: 'Đỉnh Núi Tuyết',      // "Snowy Peak"
    princess: 'Công Chúa Băng',  // "Princess Ice"
    princessStyle: 'ice',
    intro: 'Gõ câu thật chuẩn xác!', // "Type sentences accurately!"
    // 19 waves. Hard sentences start appearing on bosses, not just the finale.
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'elite', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'elite', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'hard_sentences', skill: 'meteor' },
      { type: 'elite', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'hard_sentences', skill: 'meteor' },
      { type: 'elite', pool: 'sentences', skill: 'meteor' },
      { type: 'stageboss', pool: 'hard_sentences', skill: 'meteor' },
    ],
  },
  {
    id: 10,
    biome: 'swamp',
    name: 'Đầm Lầy Sương',       // "Misty Swamp"
    princess: 'Công Chúa Mây',   // "Princess Cloud"
    princessStyle: 'cloud',
    intro: 'Càng lúc càng giỏi!', // "Getting better and better!"
    // 20 waves. Hard sentences now outnumber plain ones among the bosses.
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
      { type: 'boss', pool: 'hard_sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'elite', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'hard_sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'elite', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'hard_sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'elite', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'hard_sentences', skill: 'meteor' },
      { type: 'stageboss', pool: 'hard_sentences', skill: 'meteor' },
    ],
  },
  {
    id: 11,
    biome: 'volcano',
    name: 'Núi Lửa Nóng Rực',         // "Blazing Volcano"
    princess: 'Công Chúa Tình Yêu', // "Princess of Love"
    princessStyle: 'love',
    intro: 'Thử thách gần cuối rồi!', // "The near-final challenge!"
    // 21 waves. Nearly every boss is a hard sentence now.
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'sentences', skill: 'fireball' },
      { type: 'elite', pool: 'sentences', skill: 'fireball' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'hard_sentences', skill: 'lightning' },
      { type: 'elite', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'hard_sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'elite', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'hard_sentences', skill: 'meteor' },
      { type: 'boss', pool: 'hard_sentences', skill: 'meteor' },
      { type: 'elite', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'hard_sentences', skill: 'meteor' },
      { type: 'boss', pool: 'hard_sentences', skill: 'meteor' },
      { type: 'elite', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'hard_sentences', skill: 'meteor' },
      { type: 'boss', pool: 'hard_sentences', skill: 'meteor' },
      { type: 'stageboss', pool: 'hard_sentences', skill: 'meteor' },
    ],
  },
  {
    id: 12,
    biome: 'castle',
    name: 'Thành Trì Bóng Tối',  // "Fortress of Darkness"
    princess: 'Công Chúa Ánh Sáng', // "Princess Light"
    princessStyle: 'light',
    intro: 'Trận cuối — cứu tất cả!', // "Final battle — save everyone!"
    // 22 waves — the longest gauntlet, closing on TWO stagebosses back to back,
    // both on hard sentences. This is the endurance peak of the whole chapter.
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'sentences', skill: 'fireball' },
      { type: 'elite', pool: 'sentences', skill: 'fireball' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'hard_sentences', skill: 'lightning' },
      { type: 'elite', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'hard_sentences', skill: 'lightning' },
      { type: 'boss', pool: 'hard_sentences', skill: 'lightning' },
      { type: 'elite', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'hard_sentences', skill: 'meteor' },
      { type: 'boss', pool: 'hard_sentences', skill: 'meteor' },
      { type: 'elite', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'hard_sentences', skill: 'meteor' },
      { type: 'boss', pool: 'hard_sentences', skill: 'meteor' },
      { type: 'elite', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'hard_sentences', skill: 'meteor' },
      { type: 'boss', pool: 'hard_sentences', skill: 'meteor' },
      { type: 'stageboss', pool: 'hard_sentences', skill: 'meteor' },
      { type: 'stageboss', pool: 'hard_sentences', skill: 'meteor' },
    ],
  },
  // To add more stages later: append entries here with a fresh id/name/princess/
  // intro/biome and a waves[] list. Everything (spawning, rewards, victory→
  // next-stage, final-stage → GAME_COMPLETE) is driven off STAGES.length
  // automatically.
];

export function getStage(index) {
  return STAGES[Math.min(index, STAGES.length - 1)];
}

export const TOTAL_STAGES = STAGES.length;
