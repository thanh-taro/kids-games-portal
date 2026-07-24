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
// The first two stages are gentle WARM-UPS with no princess: kids just drill
// letters (stage 1) and letters -> first words (stage 2) against weak monsters
// before the real rescue journey begins. Scenes render a "practice" goal in
// place of a princess when `princess` is absent.

export const STAGES = [
  {
    id: 1,
    name: 'Bãi Tập Nhỏ',          // "Little Training Ground"
    // no princess — warm-up stage
    intro: 'Làm quen với chữ cái!', // "Get to know the letters!"
    waves: [
      { type: 'creep', pool: 'letters', skill: 'slash' },
      { type: 'creep', pool: 'letters', skill: 'slash' },
      { type: 'creep', pool: 'letters', skill: 'slash' },
      { type: 'creep', pool: 'letters', skill: 'slash' },
      { type: 'creep', pool: 'letters', skill: 'slash' },
    ],
  },
  {
    id: 2,
    name: 'Sân Luyện Chữ',        // "Word Practice Yard"
    // no princess — warm-up stage
    intro: 'Ghép chữ thành từ đầu tiên!', // "Combine letters into your first words!"
    waves: [
      { type: 'creep', pool: 'letters', skill: 'slash' },
      { type: 'creep', pool: 'letters', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'words', skill: 'fireball' },
    ],
  },
  {
    id: 3,
    name: 'Đồng Cỏ Xanh',        // "Green Meadow"
    princess: 'Công Chúa Hoa',   // "Princess Flower"
    intro: 'Học gõ chữ cái đầu tiên!', // "Learn your first letters!"
    waves: [
      { type: 'creep', pool: 'letters', skill: 'slash' },
      { type: 'creep', pool: 'letters', skill: 'slash' },
      { type: 'creep', pool: 'letters', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'words', skill: 'fireball' },
      { type: 'stageboss', pool: 'words', skill: 'fireball' },
    ],
  },
  {
    id: 4,
    name: 'Rừng Rậm',            // "Deep Forest"
    princess: 'Công Chúa Suối',  // "Princess Stream"
    intro: 'Ghép chữ thành từ!', // "Combine letters into words!"
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'words', skill: 'fireball' },
      { type: 'elite', pool: 'words', skill: 'fireball' },
      { type: 'boss', pool: 'phrases', skill: 'fireball' },
      { type: 'stageboss', pool: 'phrases', skill: 'meteor' },
    ],
  },
  {
    id: 5,
    name: 'Hang Động Tối',       // "Dark Cave"
    princess: 'Công Chúa Sao',   // "Princess Star"
    intro: 'Gõ cả cụm từ!',      // "Type whole phrases!"
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'stageboss', pool: 'phrases', skill: 'meteor' },
    ],
  },
  {
    id: 6,
    name: 'Hang Khủng Long',     // "Dinosaur Cave"
    princess: 'Công Chúa Ánh Dương', // "Princess Sunlight"
    intro: 'Gõ cụm từ thật nhuần nhuyễn!', // "Master your phrases!"
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'stageboss', pool: 'phrases', skill: 'meteor' },
    ],
  },
  {
    id: 7,
    name: 'Bờ Biển Ngọc',        // "Jade Coast"
    princess: 'Công Chúa Sóng',  // "Princess Wave"
    intro: 'Luyện từ nhanh hơn nào!', // "Practice words faster!"
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'stageboss', pool: 'sentences', skill: 'meteor' },
    ],
  },
  {
    id: 8,
    name: 'Sa Mạc Vàng',         // "Golden Desert"
    princess: 'Công Chúa Cát',   // "Princess Sand"
    intro: 'Bắt đầu gõ cả câu!',  // "Start typing full sentences!"
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'stageboss', pool: 'sentences', skill: 'meteor' },
    ],
  },
  {
    id: 9,
    name: 'Đỉnh Núi Tuyết',      // "Snowy Peak"
    princess: 'Công Chúa Băng',  // "Princess Ice"
    intro: 'Gõ câu thật chuẩn xác!', // "Type sentences accurately!"
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'stageboss', pool: 'sentences', skill: 'meteor' },
    ],
  },
  {
    id: 10,
    name: 'Đầm Lầy Sương',       // "Misty Swamp"
    princess: 'Công Chúa Mây',   // "Princess Cloud"
    intro: 'Càng lúc càng giỏi!', // "Getting better and better!"
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'stageboss', pool: 'sentences', skill: 'meteor' },
    ],
  },
  {
    id: 11,
    name: 'Núi Lửa Rực',         // "Blazing Volcano"
    princess: 'Công Chúa Tình Yêu', // "Princess of Love"
    intro: 'Thử thách gần cuối rồi!', // "The near-final challenge!"
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'stageboss', pool: 'sentences', skill: 'meteor' },
    ],
  },
  {
    id: 12,
    name: 'Thành Trì Bóng Tối',  // "Fortress of Darkness"
    princess: 'Công Chúa Ánh Sáng', // "Princess Light"
    intro: 'Trận cuối — cứu tất cả!', // "Final battle — save everyone!"
    waves: [
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'creep', pool: 'words', skill: 'slash' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'elite', pool: 'phrases', skill: 'fireball' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'lightning' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'boss', pool: 'sentences', skill: 'meteor' },
      { type: 'stageboss', pool: 'sentences', skill: 'meteor' },
      { type: 'stageboss', pool: 'sentences', skill: 'meteor' },
    ],
  },
  // To add more stages later: append entries here with a fresh id/name/princess/
  // intro and a waves[] list. Everything (spawning, rewards, victory→next-stage,
  // final-stage → GAME_COMPLETE) is driven off STAGES.length automatically.
];

export function getStage(index) {
  return STAGES[Math.min(index, STAGES.length - 1)];
}

export const TOTAL_STAGES = STAGES.length;
