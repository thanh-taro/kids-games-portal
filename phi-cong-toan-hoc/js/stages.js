// stages.js — the 24 stage BLUEPRINTS. The source of truth for stage content.
//
// Everything about a stage's composition is declared here: how many
// monsterships, in what formations, how fast, how hard the arithmetic, and how
// the energy economy is tuned. main.js's spawner is a dumb consumer that reads a
// blueprint and emits ships on a timeline; it computes nothing.
//
// That separation is what lets `node js/verify.js` prove a stage is PLAYABLE
// before anyone plays it — and it has already caught real failures (see the
// invariants at the bottom of verify.js).
//
// ===========================================================================
// THE THREE NUMBERS THAT MAKE A STAGE FAIR
//
// All three were established by `node js/balance.js`, which simulates slow
// (12s/answer, 65%), typical (8s, 80%) and fast (5s, 92%) kid profiles. Every
// one of them was wrong in the first draft, and wrong in ways no amount of
// reading the table would have revealed:
//
//   1. THERE IS ONE METER: ĐỘ BỀN TÀU VŨ TRỤ (the ship's durability). An energy bar sat above it and was
//      cut — it drained on a clock and refilled on a correct answer, so in practice
//      it only emptied if the kid stopped playing for ~110 seconds, then chipped
//      hull slowly. That is a second, slower health bar wearing a different label,
//      and two bars that both mean "you are losing" is one more than a 6-year-old
//      needs.
//
//      Hull now carries the whole consequence: it drops when the ship is hit and
//      when a monstership slips past (a third of a point each), and a correct
//      answer mends it. So "keep answering" is still the right play, but the reason
//      is legible — you are repairing your ship, not feeding a meter.
//
//   2. FLEET SIZE IS SET BY THE SLOWEST PLAYER.  A slow kid produces ~2 hits
//      per answer at best and about 8-14 hits over a whole stage. Waves totalling
//      more than that leave ships escaping no matter how well the kid plays.
//      Fleets grow across the game only as fast as the kid's firepower does.
//
//   3. ENEMY SPEED IS SET BY THE SLOWEST PLAYER'S ANSWER RATE.  A wave's
//      descent must last long enough for several answers. At 40 px/s a 500px
//      field is a 12s crossing — one answer for a slow kid. Speeds stay in the
//      18-30 px/s band for exactly this reason. The enemies are slow because
//      the ARITHMETIC is the pressure; dodging is not a skill this game tests.
//
// ===========================================================================
// THE DIFFICULTY CURVE
//
// Difficulty comes from the QUESTS (quest.tier climbs 1 -> 12 across the game)
// and from the kid's own growing firepower being matched by tougher fleets —
// never from piling on more ships than a child can shoot.
//
// quest.tier must be NON-DECREASING across all 24 stages; verify.js asserts it,
// so reordering stages or editing a tier by hand fails the build rather than
// silently flattening the curve.
//
// minQuests climbs 12 -> 34, so a late stage genuinely asks more arithmetic than
// an early one. verify.js asserts that too.

export const STAGES = [
  // =========================================================================
  // CHAPTER 1 — Lệnh Từ Trái Đất (Earth Order). Stages 1-6 (index 0-5).
  //
  // Teaches the loop. Generous energy, small fleets, only two enemy kinds. The
  // curve here is deliberately gentle: a kid who cannot clear stage 1 will not
  // reach the story, and stage 1 is the gentlest fleet in the game.
  // =========================================================================
  {
    id: 1,
    name: 'Quỹ Đạo Trái Đất',
    biome: 'earth_orbit',
    intro: 'Thuyền trưởng gọi: hạm đội quái vật đã tới quỹ đạo. Bảo vệ Trái Đất!',
    quest: { tier: 1, opsAllowed: null, answerCount: 4, timePerQuest: 9, minQuests: 12 },
    waves: [
      { id: 'w1', formation: 'LINE',    enemy: 'dart',  count: 2, hits: 1, gap: 0.6, speed: 11 },
      { id: 'w2', formation: 'V',       enemy: 'dart',  count: 2, hits: 1, gap: 0.6, speed: 11 },
      { id: 'w3', formation: 'LINE',    enemy: 'wedge', count: 2, hits: 1, gap: 0.6, speed: 11 },
      { id: 'w4', formation: 'COLUMNS', enemy: 'dart',  count: 2, hits: 1, gap: 0.5, speed: 12 },
    ],
    reward: 'engine1',
  },
  {
    id: 2,
    name: 'Vành Đai Mặt Trăng',
    biome: 'moon',
    intro: 'Chúng rút về phía Mặt Trăng. Đừng để chúng tập hợp lại!',
    quest: { tier: 2, opsAllowed: null, answerCount: 4, timePerQuest: 9, minQuests: 13 },
    waves: [
      { id: 'w1', formation: 'V',       enemy: 'fang',  count: 2, hits: 1, gap: 0.6, speed: 11 },
      { id: 'w2', formation: 'ARC',     enemy: 'wedge', count: 2, hits: 1, gap: 0.6, speed: 11 },
      { id: 'w3', formation: 'FLANK',   enemy: 'dart',  count: 2, hits: 1, gap: 0.5, speed: 12, fireEvery: 4 },
      { id: 'w4', formation: 'COLUMNS', enemy: 'wedge', count: 2, hits: 1, gap: 0.5, speed: 12 },
    ],
    reward: 'weapon2',
  },
  {
    id: 3,
    name: 'Vành Đai Thiên Thạch',
    biome: 'asteroid',
    intro: 'Vượt qua vành đai đá. Cẩn thận, chúng nấp sau thiên thạch!',
    quest: { tier: 3, opsAllowed: null, answerCount: 4, timePerQuest: 8, minQuests: 14 },
    waves: [
      { id: 'w1', formation: 'SWARM',   enemy: 'drone', count: 3, hits: 1, gap: 0.5, speed: 12 },
      { id: 'w2', formation: 'DIAMOND', enemy: 'spike', count: 2, hits: 1, gap: 0.6, speed: 13 },
      { id: 'w3', formation: 'LINE',    enemy: 'wedge', count: 2, hits: 1, gap: 0.5, speed: 12, fireEvery: 4 },
      { id: 'w4', formation: 'COLUMNS', enemy: 'drone', count: 3, hits: 1, gap: 0.5, speed: 12, weave: 'sine' },
    ],
    reward: 'hull1',
  },
  {
    id: 4,
    name: 'Bụi Đỏ Sao Hoả',
    biome: 'mars',
    intro: 'Căn cứ của chúng ở Sao Hoả. Phá vỡ hàng phòng ngự!',
    quest: { tier: 4, opsAllowed: null, answerCount: 4, timePerQuest: 8, minQuests: 15 },
    waves: [
      { id: 'w1', formation: 'ARC',     enemy: 'drone', count: 3, hits: 1, gap: 0.55, speed: 12 },
      { id: 'w2', formation: 'V',       enemy: 'wedge', count: 2, hits: 1, gap: 0.55, speed: 12, fireEvery: 4 },
      { id: 'w3', formation: 'BOSS',    enemy: 'guard', count: 1, hits: 2, gap: 0.8, speed: 16, standGap: 150, fireEvery: 3 },
      { id: 'w4', formation: 'COLUMNS', enemy: 'drone', count: 3, hits: 1, gap: 0.5, speed: 12, weave: 'sine' },
    ],
    reward: 'skill_missile',
  },
  {
    id: 5,
    name: 'Vành Sao Mộc',
    biome: 'jupiter',
    intro: 'Hạm đội lớn đang chờ trong vành Sao Mộc. Giữ vững năng lượng!',
    quest: { tier: 5, opsAllowed: null, answerCount: 4, timePerQuest: 8, minQuests: 16 },
    waves: [
      { id: 'w1', formation: 'GRID',    enemy: 'drone', count: 3, hits: 1, gap: 0.5, speed: 12 },
      { id: 'w2', formation: 'FLANK',   enemy: 'spike', count: 2, hits: 1, gap: 0.5, speed: 13, fireEvery: 4 },
      { id: 'w3', formation: 'BOSS',    enemy: 'guard', count: 1, hits: 2, gap: 0.8, speed: 16, standGap: 150, fireEvery: 3 },
      { id: 'w4', formation: 'SPIRAL',  enemy: 'drone', count: 3, hits: 1, gap: 0.5, speed: 12, weave: 'drift' },
    ],
    reward: 'skill_shield',
  },
  {
    id: 6,
    name: 'Vùng Tối Ngoài Cùng',
    biome: 'outer_dark',
    intro: 'Hắc Hạm Trưởng đang chờ. Đánh bại hắn và Trái Đất sẽ an toàn!',
    quest: { tier: 6, opsAllowed: null, answerCount: 4, timePerQuest: 8, minQuests: 18 },
    waves: [
      // Chapter 1's finale is the hardest point in the game for a BARE ship — no
      // ally exists yet, so the kid has only their own single volley, and every
      // later stage is easier per-hit than this one. These are therefore the
      // slowest waves in chapter 1 (a ~60s window each, ~5 answers for a slow
      // kid) and the elite escort is a pair rather than a trio.
      { id: 'w1', formation: 'V',       enemy: 'drone', count: 3, hits: 1, gap: 0.5, speed: 8 },
      { id: 'w2', formation: 'FLANK',   enemy: 'spike', count: 2, hits: 1, gap: 0.5, speed: 8, fireEvery: 6 },
      { id: 'w3', formation: 'GRID',    enemy: 'guard', count: 2, hits: 1, gap: 0.7, speed: 8, fireEvery: 8 },
      // Chapter finale: a two-phase boss. Phase 1 teaches the phase mechanic
      // with no shield, so the kid meets "the bar refilled" before they ever
      // meet "the bar is immune" in chapter 3.
      { id: 'w4', formation: 'BOSS', enemy: 'commander', count: 1, gap: 1.0, speed: 14,
        standGap: 130, fireEvery: 6, fireDamage: 1,
        // No boss flies alone. Silent on purpose (no fireEvery) — this is the
        // tightest stage in the game for a bare, ally-less ship (hull ends at
        // 2 for the slow profile even before this), so the escort is pure
        // presence and an optional extra kill, never a new damage source.
        escorts: { enemy: 'herald', count: 2, hits: 1 },
        phases: [
          // Deliberately the SHORTEST boss bar in the game (7 hits total). This
          // is the kid's first boss and their last stage without an ally, so it
          // teaches the phase mechanic — "the bar refilled, keep going" — rather
          // than testing endurance. Every later boss is longer.
          { name: 'Khiên Hạm', hits: 3 },
          { name: 'Phản Công', hits: 4, fireEvery: 8 },
        ] },
    ],
    reward: 'weapon3',
  },

  // =========================================================================
  // CHAPTER 2 — Giải Cứu Đồng Đội (Rescue Allies). Stages 7-18 (index 6-17).
  //
  // Five rescues, two stages each (an approach, then the jailer), plus a
  // two-stage finale at the void's edge. Each rescue permanently adds a wingman
  // who FIRES, so the kid's damage output roughly doubles across the chapter —
  // and the fleets grow to match, which is what keeps the stages from becoming
  // trivial while still feeling like a power gain.
  //
  // verify.js asserts total wave HP rises monotonically through this chapter for
  // exactly that reason.
  // =========================================================================

  // --- Rescue 1: Bé Ốc, the engineer (ice) ---
  {
    id: 7,
    name: 'Tiếp Cận Nhà Tù Băng',
    biome: 'prison_ice',
    intro: 'Mảnh dữ liệu chỉ đường: một đồng đội bị giam trong lồng băng.',
    quest: { tier: 6, opsAllowed: null, answerCount: 4, timePerQuest: 8, minQuests: 18 },
    waves: [
      { id: 'w1', formation: 'ARC',     enemy: 'orb',   count: 3, hits: 1, gap: 0.55, speed: 10 },
      { id: 'w2', formation: 'LINE',    enemy: 'spike', count: 2, hits: 1, gap: 0.5, speed: 13, fireEvery: 4 },
      { id: 'w3', formation: 'DIAMOND', enemy: 'orb',   count: 3, hits: 1, gap: 0.5, speed: 10 },
      { id: 'w4', formation: 'COLUMNS', enemy: 'spike', count: 2, hits: 1, gap: 0.45, speed: 13, weave: 'sine' },
      { id: 'w5', formation: 'SWARM',   enemy: 'orb',   count: 3, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w6', formation: 'GRID',    enemy: 'orb',   count: 3, hits: 1, gap: 0.5, speed: 11 },
    ],
    reward: 'hull2',
  },
  {
    id: 8,
    name: 'Quản Ngục Băng Giá',
    biome: 'prison_ice',
    intro: 'Quản Ngục giữ chìa khoá lồng. Đánh bại hắn để cứu Bé Ốc!',
    quest: { tier: 7, opsAllowed: null, answerCount: 4, timePerQuest: 8, minQuests: 20 },
    waves: [
      { id: 'w1', formation: 'FLANK', enemy: 'husk',  count: 3, hits: 1, gap: 0.5, speed: 10 },
      { id: 'w2', formation: 'V',     enemy: 'spike', count: 2, hits: 1, gap: 0.5, speed: 13, fireEvery: 4 },
      { id: 'w3', formation: 'SWARM', enemy: 'orb',   count: 3, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w4', formation: 'LINE',  enemy: 'orb',   count: 3, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w5', formation: 'BOSS',  enemy: 'jailer', count: 1, gap: 1.0, speed: 12,
        standGap: 130, fireEvery: 6,
        escorts: { enemy: 'herald', count: 2, hits: 1 },
        phases: [
          { name: 'Khoá Băng', hits: 4 },
          { name: 'Vỡ Lồng', hits: 5, fireEvery: 7 },
        ] },
    ],
    reward: 'ally_engineer',
  },

  // --- Rescue 2: Tia Chớp, the gunner (ember) ---
  {
    id: 9,
    name: 'Tiếp Cận Nhà Tù Lửa',
    biome: 'prison_ember',
    intro: 'Bé Ốc đã sửa xong động cơ. Đồng đội thứ hai đang chờ trong lửa!',
    quest: { tier: 7, opsAllowed: null, answerCount: 4, timePerQuest: 8, minQuests: 22 },
    waves: [
      { id: 'w1', formation: 'GRID',    enemy: 'orb',  count: 5, hits: 1, gap: 0.5, speed: 10 },
      { id: 'w2', formation: 'SWARM',   enemy: 'dart', count: 3, hits: 1, gap: 0.5, speed: 13, fireEvery: 6.5 },
      { id: 'w3', formation: 'ARC',     enemy: 'orb',  count: 5, hits: 1, gap: 0.5, speed: 10 },
      { id: 'w4', formation: 'COLUMNS', enemy: 'dart', count: 4, hits: 1, gap: 0.45, speed: 14, weave: 'sine' },
      { id: 'w5', formation: 'SWARM',   enemy: 'orb',  count: 5, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w6', formation: 'ARC',     enemy: 'orb',  count: 5, hits: 1, gap: 0.5, speed: 11 },
    ],
    reward: 'engine3',
  },
  {
    id: 10,
    name: 'Quản Ngục Than Lửa',
    biome: 'prison_ember',
    intro: 'Tia Chớp là pháo thủ giỏi nhất hạm đội. Cứu cậu ấy!',
    quest: { tier: 8, opsAllowed: null, answerCount: 4, timePerQuest: 8, minQuests: 25 },
    waves: [
      { id: 'w1', formation: 'FLANK', enemy: 'orb',  count: 5, hits: 1, gap: 0.5, speed: 10 },
      { id: 'w2', formation: 'V',     enemy: 'dart', count: 3, hits: 1, gap: 0.5, speed: 14, fireEvery: 6.5 },
      { id: 'w3', formation: 'GRID',  enemy: 'orb',  count: 5, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w4', formation: 'SWARM', enemy: 'orb',  count: 5, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w5', formation: 'BOSS',  enemy: 'jailer', count: 1, gap: 1.0, speed: 12,
        standGap: 130, fireEvery: 6,
        escorts: { enemy: 'herald', count: 2, hits: 1 },
        phases: [
          { name: 'Lò Nung', hits: 5 },
          { name: 'Bùng Cháy', hits: 5, fireEvery: 7 },
        ] },
    ],
    reward: 'ally_gunner',
  },

  // --- Rescue 3: Vòm Xanh, the shield-tech (storm) ---
  {
    id: 11,
    name: 'Tiếp Cận Nhà Tù Bão',
    biome: 'prison_storm',
    intro: 'Hai khẩu pháo đã sẵn sàng. Tiến vào cơn bão!',
    quest: { tier: 8, opsAllowed: null, answerCount: 4, timePerQuest: 8, minQuests: 27 },
    waves: [
      { id: 'w1', formation: 'SPIRAL',  enemy: 'orb',      count: 6, hits: 1, gap: 0.5, speed: 10 },
      { id: 'w2', formation: 'LINE',    enemy: 'lancer',   count: 2, hits: 3, gap: 0.6, speed: 10, fireEvery: 4 },
      { id: 'w3', formation: 'GRID',    enemy: 'orb',      count: 7, hits: 1, gap: 0.45, speed: 11 },
      { id: 'w4', formation: 'COLUMNS', enemy: 'sentinel', count: 6, hits: 1, gap: 0.5, speed: 11, weave: 'sine' },
      { id: 'w5', formation: 'ARC',     enemy: 'orb',      count: 7, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w6', formation: 'LINE',    enemy: 'orb',      count: 7, hits: 1, gap: 0.5, speed: 11 },
    ],
    reward: 'weapon4',
  },
  {
    id: 12,
    name: 'Quản Ngục Bão Tố',
    biome: 'prison_storm',
    intro: 'Vòm Xanh biết cách dựng khiên. Chúng ta rất cần cậu ấy!',
    quest: { tier: 9, opsAllowed: null, answerCount: 4, timePerQuest: 8, minQuests: 30 },
    waves: [
      { id: 'w1', formation: 'ARC',   enemy: 'orb',      count: 6, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w2', formation: 'FLANK', enemy: 'sentinel', count: 3, hits: 2, gap: 0.5, speed: 11, fireEvery: 6.5 },
      { id: 'w3', formation: 'SWARM', enemy: 'orb',      count: 7, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w4', formation: 'GRID',  enemy: 'orb',      count: 7, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w5', formation: 'BOSS',  enemy: 'jailer', count: 1, gap: 1.0, speed: 12,
        standGap: 130, fireEvery: 6,
        escorts: { enemy: 'herald', count: 2, hits: 1 },
        phases: [
          { name: 'Mắt Bão', hits: 6 },
          { name: 'Sấm Sét', hits: 6, fireEvery: 7 },
        ] },
    ],
    reward: 'ally_shieldman',
  },

  // --- Rescue 4: La Bàn, the navigator (the deep) ---
  {
    id: 13,
    name: 'Tiếp Cận Vực Sâu',
    biome: 'prison_deep',
    intro: 'Không một ngôi sao để định hướng. Đồng đội thứ tư ở đâu đó dưới kia.',
    quest: { tier: 9, opsAllowed: null, answerCount: 4, timePerQuest: 8, minQuests: 33 },
    waves: [
      { id: 'w1', formation: 'SWARM',   enemy: 'orb',    count: 9, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w2', formation: 'V',       enemy: 'spike',  count: 3, hits: 2, gap: 0.5, speed: 14, fireEvery: 6.5 },
      { id: 'w3', formation: 'DIAMOND', enemy: 'lancer', count: 3, hits: 2, gap: 0.5, speed: 11, fireEvery: 6.5 },
      { id: 'w4', formation: 'COLUMNS', enemy: 'orb',    count: 9, hits: 1, gap: 0.45, speed: 11, weave: 'sine' },
      { id: 'w5', formation: 'ARC',     enemy: 'orb',    count: 9, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w6', formation: 'LINE',    enemy: 'orb',    count: 9, hits: 1, gap: 0.5, speed: 11 },
    ],
    reward: 'hull3',
  },
  {
    id: 14,
    name: 'Quản Ngục Vực Sâu',
    biome: 'prison_deep',
    intro: 'La Bàn có thể tìm đường tới hang ổ Kẻ Huỷ Diệt. Cứu cậu ấy!',
    quest: { tier: 10, opsAllowed: null, answerCount: 4, timePerQuest: 8, minQuests: 36 },
    waves: [
      { id: 'w1', formation: 'GRID',  enemy: 'orb',    count: 9, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w2', formation: 'FLANK', enemy: 'lancer', count: 3, hits: 2, gap: 0.5, speed: 11, fireEvery: 6.5 },
      { id: 'w3', formation: 'SWARM', enemy: 'orb',    count: 9, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w4', formation: 'ARC',   enemy: 'orb',    count: 9, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w5', formation: 'BOSS',  enemy: 'jailer', count: 1, gap: 1.0, speed: 12,
        standGap: 130, fireEvery: 6,
        escorts: { enemy: 'herald', count: 2, hits: 2, fireEvery: 14 },
        phases: [
          { name: 'Bóng Tối', hits: 7 },
          { name: 'Tuyệt Vọng', hits: 7, fireEvery: 7 },
        ] },
    ],
    reward: 'ally_navigator',
  },

  // --- Rescue 5: Giáo Sư Sao, the scientist (the void edge) ---
  {
    id: 15,
    name: 'Rìa Hư Không',
    biome: 'prison_void',
    intro: 'La Bàn đã tìm ra đường. Đồng đội cuối cùng ở rìa hư không.',
    quest: { tier: 10, opsAllowed: null, answerCount: 4, timePerQuest: 8, minQuests: 39 },
    waves: [
      { id: 'w1', formation: 'ARC',     enemy: 'orb',      count: 8, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w2', formation: 'SPIRAL',  enemy: 'lancer',   count: 3, hits: 3, gap: 0.5, speed: 11, fireEvery: 6.5 },
      { id: 'w3', formation: 'GRID',    enemy: 'orb',      count: 10, hits: 1, gap: 0.45, speed: 12 },
      { id: 'w4', formation: 'COLUMNS', enemy: 'sentinel', count: 8, hits: 1, gap: 0.5, speed: 12, weave: 'sine' },
      { id: 'w5', formation: 'SWARM',   enemy: 'orb',      count: 11, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w6', formation: 'LINE',    enemy: 'orb',      count: 11, hits: 1, gap: 0.5, speed: 11 },
    ],
    reward: 'weapon5',
  },
  {
    id: 16,
    name: 'Sắt Thủ Hư Không',
    biome: 'prison_void',
    intro: 'Sắt Thủ canh giữ Giáo Sư Sao — người biết bí mật Siêu Công Thức.',
    quest: { tier: 11, opsAllowed: null, answerCount: 4, timePerQuest: 8, minQuests: 42 },
    waves: [
      { id: 'w1', formation: 'FLANK', enemy: 'orb',    count: 10, hits: 1, gap: 0.45, speed: 12 },
      { id: 'w2', formation: 'V',     enemy: 'lancer', count: 4, hits: 2, gap: 0.5, speed: 12, fireEvery: 8.5 },
      { id: 'w3', formation: 'GRID',  enemy: 'orb',    count: 11, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w4', formation: 'SWARM', enemy: 'orb',    count: 11, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w5', formation: 'BOSS',  enemy: 'warden', count: 1, gap: 1.0, speed: 12,
        standGap: 130, fireEvery: 8.5,
        escorts: { enemy: 'bulwark', count: 2, hits: 2, fireEvery: 13 },
        phases: [
          { name: 'Ổ Khoá', hits: 8 },
          { name: 'Sắt Nóng', hits: 8, fireEvery: 7 },
        ] },
    ],
    reward: 'ally_scientist',
  },

  // --- Chapter 2 finale: the fleet is whole, and turns toward the dark star ---
  {
    id: 17,
    name: 'Đội Hình Hoàn Chỉnh',
    biome: 'prison_void',
    intro: 'Năm đồng đội đã về. Giáo Sư Sao dạy bạn Siêu Công Thức!',
    quest: { tier: 11, opsAllowed: null, answerCount: 4, timePerQuest: 8, minQuests: 45 },
    waves: [
      { id: 'w1', formation: 'GRID',    enemy: 'orb',    count: 10, hits: 1, gap: 0.45, speed: 12 },
      { id: 'w2', formation: 'SWARM',   enemy: 'spike',  count: 4, hits: 2, gap: 0.45, speed: 14, fireEvery: 8.5 },
      { id: 'w3', formation: 'DIAMOND', enemy: 'lancer', count: 3, hits: 3, gap: 0.5, speed: 12, fireEvery: 6.5 },
      { id: 'w4', formation: 'COLUMNS', enemy: 'orb',    count: 10, hits: 1, gap: 0.45, speed: 12, weave: 'sine' },
      { id: 'w5', formation: 'ARC',     enemy: 'orb',    count: 13, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w6', formation: 'LINE',    enemy: 'orb',    count: 13, hits: 1, gap: 0.5, speed: 11 },
    ],
    reward: 'skill_ultimate',
  },
  {
    id: 18,
    name: 'Cửa Ngõ Hắc Tinh',
    biome: 'prison_void',
    intro: 'Hắc Tinh đã hiện rõ. Sáu phi thuyền cùng bay vào bóng tối.',
    quest: { tier: 12, opsAllowed: null, answerCount: 4, timePerQuest: 8, minQuests: 48 },
    waves: [
      { id: 'w1', formation: 'ARC',   enemy: 'orb',    count: 10, hits: 1, gap: 0.45, speed: 12 },
      { id: 'w2', formation: 'FLANK', enemy: 'lancer', count: 3, hits: 3, gap: 0.5, speed: 12, fireEvery: 6.5 },
      { id: 'w3', formation: 'GRID',  enemy: 'orb',    count: 13, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w4', formation: 'SWARM', enemy: 'orb',    count: 13, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w5', formation: 'BOSS',  enemy: 'twin',   count: 1, gap: 1.0, speed: 12,
        standGap: 130, fireEvery: 6,
        escorts: { enemy: 'bulwark', count: 2, hits: 2, fireEvery: 13 },
        phases: [
          { name: 'Động Trái', hits: 8 },
          { name: 'Động Phải', hits: 8, fireEvery: 7 },
        ] },
    ],
    reward: 'engine4',
  },

  // =========================================================================
  // CHAPTER 3 — Cứu Dải Ngân Hà (Rescue The Galaxy). Stages 19-24 (index 18-23).
  //
  // Six stages in the Darkness Realm. The kid has all five allies and the
  // ultimate, so fleets here are the largest in the game — but the real
  // escalation is arithmetic: every stage sits at quest tier 12.
  //
  // The SHIELDED PHASE arrives here and is the mechanical payoff of chapter 2:
  // an ordinary shot does nothing to it, and only a charged Siêu Công Thức
  // pierces it. main.js must say so on screen — a kid whose shots visibly do
  // nothing concludes the game is broken (the typing game hit that exact bug).
  // =========================================================================
  {
    id: 19,
    name: 'Cổng Hắc Ám',
    biome: 'dark_gate',
    intro: 'Cõi Hắc Ám. Không ánh sáng nào từ Trái Đất tới được đây.',
    quest: { tier: 12, opsAllowed: null, answerCount: 4, timePerQuest: 8, minQuests: 55 },
    waves: [
      { id: 'w1', formation: 'LINE',    enemy: 'wraith', count: 8, hits: 1, gap: 0.45, speed: 14 },
      { id: 'w2', formation: 'FLANK',   enemy: 'lancer', count: 3, hits: 3, gap: 0.5, speed: 12, fireEvery: 6.5 },
      { id: 'w3', formation: 'GRID',    enemy: 'guard',  count: 2, hits: 4, gap: 0.6, speed: 10, fireEvery: 4 },
      { id: 'w4', formation: 'COLUMNS', enemy: 'shard',  count: 8, hits: 1, gap: 0.45, speed: 14, weave: 'sine' },
      { id: 'w5', formation: 'ARC',     enemy: 'wraith', count: 13, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w6', formation: 'SWARM',   enemy: 'wraith', count: 13, hits: 1, gap: 0.5, speed: 11 },
    ],
    reward: 'hull4',
  },
  {
    id: 20,
    name: 'Bãi Tàn Ngân Hà',
    biome: 'dark_field',
    intro: 'Đây là nơi Kẻ Huỷ Diệt để lại những gì hắn đã ăn.',
    quest: { tier: 12, opsAllowed: null, answerCount: 4, timePerQuest: 8, minQuests: 60 },
    waves: [
      { id: 'w1', formation: 'SWARM',   enemy: 'wraith', count: 9, hits: 1, gap: 0.45, speed: 14 },
      { id: 'w2', formation: 'ARC',     enemy: 'orb',    count: 10, hits: 1, gap: 0.45, speed: 12 },
      { id: 'w3', formation: 'DIAMOND', enemy: 'reaver', count: 3, hits: 3, gap: 0.5, speed: 12, fireEvery: 6.5 },
      { id: 'w4', formation: 'COLUMNS', enemy: 'wraith', count: 9, hits: 1, gap: 0.4, speed: 15, weave: 'sine' },
      { id: 'w5', formation: 'GRID',    enemy: 'wraith', count: 13, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w6', formation: 'LINE',    enemy: 'orb',    count: 13, hits: 1, gap: 0.5, speed: 11 },
    ],
    reward: 'weapon6',
  },
  {
    id: 21,
    name: 'Tháp Hắc Tinh',
    biome: 'dark_spire',
    intro: 'Tháp của hắn. Từ đây, mọi ngôi sao đều nhìn thấy được — và bị ăn.',
    quest: { tier: 12, opsAllowed: null, answerCount: 4, timePerQuest: 8, minQuests: 64 },
    waves: [
      { id: 'w1', formation: 'GRID',   enemy: 'wraith', count: 9, hits: 1, gap: 0.45, speed: 14 },
      { id: 'w2', formation: 'SPIRAL', enemy: 'lancer', count: 5, hits: 2, gap: 0.45, speed: 12, fireEvery: 10.5 },
      { id: 'w3', formation: 'SWARM', enemy: 'wraith', count: 13, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w4', formation: 'ARC',   enemy: 'wraith', count: 13, hits: 1, gap: 0.5, speed: 11 },
      // First SHIELDED phase in the game. Phase 1 is ordinary so the kid gets a
      // rhythm going, phase 2 stops taking damage — and the on-screen hint
      // tells them what to do about it.
      { id: 'w5', formation: 'BOSS', enemy: 'twin', count: 1, gap: 1.0, speed: 12,
        standGap: 130, fireEvery: 6,
        escorts: { enemy: 'bulwark', count: 2, hits: 2, fireEvery: 13 },
        phases: [
          { name: 'Vỏ Ngoài', hits: 8 },
          { name: 'Khiên Tối', hits: 8, shielded: true, fireEvery: 7 },
        ] },
    ],
    reward: 'engine5',
  },
  {
    id: 22,
    name: 'Hành Lang Tối',
    biome: 'dark_spire',
    intro: 'Sâu hơn nữa. Hắn biết chúng ta đang tới.',
    quest: { tier: 12, opsAllowed: null, answerCount: 4, timePerQuest: 8, minQuests: 66 },
    waves: [
      { id: 'w1', formation: 'FLANK',   enemy: 'wraith', count: 9, hits: 1, gap: 0.4, speed: 15 },
      { id: 'w2', formation: 'V',       enemy: 'lancer', count: 5, hits: 2, gap: 0.45, speed: 12, fireEvery: 10.5 },
      { id: 'w3', formation: 'GRID',    enemy: 'guard',  count: 3, hits: 3, gap: 0.55, speed: 10, fireEvery: 6.5 },
      { id: 'w4', formation: 'COLUMNS', enemy: 'wraith', count: 9, hits: 1, gap: 0.4, speed: 15, weave: 'sine' },
      { id: 'w5', formation: 'SWARM',   enemy: 'wraith', count: 13, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w6', formation: 'LINE',    enemy: 'wraith', count: 13, hits: 1, gap: 0.5, speed: 11 },
    ],
    reward: 'hull5',
  },
  {
    id: 23,
    name: 'Cổng Lõi',
    biome: 'dark_core',
    intro: 'Cửa cuối cùng. Sau cánh cửa này là Kẻ Huỷ Diệt Ngân Hà.',
    quest: { tier: 12, opsAllowed: null, answerCount: 4, timePerQuest: 8, minQuests: 68 },
    waves: [
      { id: 'w1', formation: 'ARC',   enemy: 'wraith', count: 9, hits: 1, gap: 0.4, speed: 15 },
      { id: 'w2', formation: 'GRID',  enemy: 'guard',  count: 3, hits: 3, gap: 0.55, speed: 10, fireEvery: 6.5 },
      { id: 'w3', formation: 'SWARM', enemy: 'wraith', count: 13, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w4', formation: 'LINE',  enemy: 'wraith', count: 13, hits: 1, gap: 0.5, speed: 11 },
      { id: 'w5', formation: 'BOSS',  enemy: 'warden', count: 1, gap: 1.0, speed: 12,
        standGap: 130, fireEvery: 8.5,
        escorts: { enemy: 'bulwark', count: 2, hits: 2, fireEvery: 13 },
        phases: [
          { name: 'Cổng Sắt', hits: 8 },
          { name: 'Khiên Cuối', hits: 8, shielded: true, fireEvery: 7 },
        ] },
    ],
    reward: 'weapon7',
  },
  {
    id: 24,
    name: 'Kẻ Huỷ Diệt Ngân Hà',
    biome: 'dark_core',
    intro: 'Sáu phi thuyền, một Siêu Công Thức, và cả dải Ngân Hà đang chờ.',
    // minQuests is LOWER here than on stage 23, deliberately. The four-phase
    // boss already guarantees a long fight — a slow kid answers 30+ times just
    // working its bar down. Holding the quota at 34 made the reinforcement tail
    // keep spawning escort waves BEHIND a boss the kid had already beaten: the
    // simulator showed a 410-second run with 26 ships leaking past a corpse,
    // which reads as the game refusing to end. The tail exists to stop a FAST
    // kid outrunning the curriculum; on the final boss it has nothing to protect.
    //
    // minQuests moved only modestly (26 -> 32) even though every other stage in
    // this pass roughly doubled — deliberately, in respect of the warning above.
    // One more small escort wave, not two, for the same reason: this stage's
    // spectacle is the boss's four phases, not fleet size.
    quest: { tier: 12, opsAllowed: null, answerCount: 4, timePerQuest: 8, minQuests: 32 },
    waves: [
      // The escorts are a doorway, not a fight — the BOSS is the fight.
      { id: 'w1', formation: 'FLANK', enemy: 'wraith', count: 6, hits: 1, gap: 0.4, speed: 15 },
      { id: 'w2', formation: 'GRID',  enemy: 'lancer', count: 3, hits: 2, gap: 0.45, speed: 12, fireEvery: 6.5 },
      { id: 'w3', formation: 'SWARM', enemy: 'wraith', count: 9, hits: 1, gap: 0.5, speed: 11 },
      // THE FINAL BOSS. Four phases, the third shielded — the kid must have the
      // ultimate charged, which means they must have been ACCURATE, which is the
      // skill the whole game teaches. Phase 4 is the longest and unshielded, so
      // the game ends on the kid landing hits rather than waiting for a meter.
      { id: 'w4', formation: 'BOSS', enemy: 'destroyer', count: 1, gap: 1.2, speed: 10,
        standGap: 120, fireEvery: 8.5, fireDamage: 1,
        // Minimal and silent (no fireEvery), unlike every other boss's escort —
        // the comment below already documents this exact stage breaking once
        // from an over-loaded escort ("4x10 = 40 hits plus escorts made 58
        // total"). Two bodyguards for the spectacle, zero added risk.
        escorts: { enemy: 'bulwark', count: 2, hits: 1 },
        phases: [
          // Four phases is the DRAMA; the bar length is the difficulty. 4x10 = 40
          // hits plus escorts made 58 total, which a slow kid cannot finish
          // before the run becomes attrition. Trimmed to 30 across four phases:
          // still the longest fight in the game, and still four distinct beats.
          // The shielded phase is the SHORTEST — it is a puzzle to solve with the
          // ultimate, not a wall to grind.
          { name: 'Vỏ Ngân Hà', hits: 6 },
          { name: 'Nuốt Sao', hits: 6, fireEvery: 7 },
          { name: 'Khiên Hư Không', hits: 5, shielded: true, fireEvery: 7 },
          { name: 'Lõi Cuối', hits: 7, fireEvery: 7 },
        ] },
    ],
    reward: 'victory',
  },
];

export const TOTAL_STAGES = STAGES.length;

export function getStage(i) {
  return STAGES[Math.max(0, Math.min(STAGES.length - 1, i))];
}

// Total landed hits a stage's fleet demands — the number that must stay within
// what the kid can actually produce. Used by verify.js and balance.js.
export function stageHits(stage) {
  let total = 0;
  for (const w of stage.waves) {
    if (w.phases && w.phases.length) {
      total += w.phases.reduce((s, p) => s + p.hits, 0) * (w.count || 1);
    } else {
      total += (w.count || 1) * (w.hits || 1);
    }
  }
  return total;
}
