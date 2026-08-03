// skills.js — skill definitions and the word pools that trigger them.
//
// Two skill classes:
//   SIMPLE  — basic attack. Short, easy targets (letters / short words).
//             Used against Creep monsters.
//   SPECIAL — ultimate attacks. Longer / harder targets (phrases, tricky
//             diacritics). Needed to damage Boss and Stage Boss monsters.
//
// Each skill defines how its projectile looks and how much it hurts, so the
// game can render distinct effects and apply distinct damage.

export const SKILL_CLASS = {
  SIMPLE: 'simple',
  SPECIAL: 'special',
};

// A "skill" bundles a visual + damage profile. The actual target WORD comes
// from the stage's word pool; skills describe the *effect* of a correct type.
export const SKILLS = {
  // ---- Simple attacks (basic) ----
  slash: {
    id: 'slash',
    cls: SKILL_CLASS.SIMPLE,
    name: 'Chém', // "Slash"
    damage: 25,
    projectile: { color: '#e8c33a', size: 8, speed: 16, count: 1, special: false },
    burst: { color: '#e8c33a', n: 16, power: 4 },
    effect: 'slash', // crescent arc + gold sparks
    trail: { color: '#fff2b0', fadeTo: '#e8c33a', size: 6 },
  },

  // ---- Special / ultimate attacks ----
  fireball: {
    id: 'fireball',
    cls: SKILL_CLASS.SPECIAL,
    name: 'Cầu Lửa', // "Fireball"
    damage: 55,
    projectile: { color: '#c0392b', size: 12, speed: 13, count: 3, special: true },
    burst: { color: '#e8622b', n: 30, power: 6 },
    shake: 16,
    effect: 'explosion', // shockwave + rising flames -> smoke + embers
    trail: { color: '#ffb04a', fadeTo: '#7a1e10', size: 10, gravity: -0.04 }, // flaming comet
  },
  lightning: {
    id: 'lightning',
    cls: SKILL_CLASS.SPECIAL,
    name: 'Sấm Sét', // "Lightning"
    damage: 60,
    projectile: { color: '#4ad4d4', size: 10, speed: 22, count: 2, special: true },
    burst: { color: '#7fe8ff', n: 34, power: 7 },
    shake: 18,
    effect: 'lightning', // bolt from the sky + screen flash + electric sparks
    trail: { color: '#eaffff', fadeTo: '#3a8fd0', size: 8 }, // crackling blue tail
  },
  meteor: {
    id: 'meteor',
    cls: SKILL_CLASS.SPECIAL,
    name: 'Thiên Thạch', // "Meteor"
    damage: 75,
    projectile: { color: '#8e44ad', size: 14, speed: 11, count: 4, special: true },
    burst: { color: '#c77dff', n: 42, power: 8 },
    shake: 22,
    effect: 'meteor', // light pillar + double shockwave + debris + big shake
    trail: { color: '#e6b3ff', fadeTo: '#5a1e8a', size: 12 }, // cosmic purple tail
  },

  // ---- Chapter 2 skills: earned on the quest for the Staff of Wisdom ----
  // The chapter's theme is that a CLEAR MIND beats brute force, so its skills
  // are about precision and control rather than raw damage: a freezing ring, a
  // fast volley of small blades, and finally the Staff's own holy light.
  frostnova: {
    id: 'frostnova',
    cls: SKILL_CLASS.SPECIAL,
    name: 'Băng Vũ', // "Frost Nova"
    damage: 65,
    projectile: { color: '#8fe3ff', size: 12, speed: 15, count: 2, special: true },
    burst: { color: '#d8f0ff', n: 36, power: 6 },
    shake: 14,
    effect: 'frostnova', // expanding frost ring + drifting ice shards
    trail: { color: '#eaffff', fadeTo: '#3fb8b0', size: 9 }, // cold vapor tail
  },
  windblade: {
    id: 'windblade',
    cls: SKILL_CLASS.SPECIAL,
    name: 'Phong Nhẫn', // "Wind Blades"
    damage: 58,
    // The fastest, most numerous volley in the game — five small blades. It is
    // the "reward for typing quickly and cleanly" skill: it LOOKS like speed.
    projectile: { color: '#bfe8ff', size: 8, speed: 26, count: 5, special: true },
    burst: { color: '#eaffff', n: 30, power: 7 },
    shake: 12,
    effect: 'windblade', // crossing slash arcs + a spiral of wind motes
    trail: { color: '#ffffff', fadeTo: '#8fe3ff', size: 6 },
  },
  holylight: {
    id: 'holylight',
    cls: SKILL_CLASS.SPECIAL,
    name: 'Thánh Quang', // "Holy Light"
    damage: 85,
    projectile: { color: '#fff2b0', size: 13, speed: 18, count: 3, special: true },
    burst: { color: '#ffffff', n: 44, power: 8 },
    shake: 18,
    effect: 'holylight', // descending light pillar + radiant flash + gold motes
    trail: { color: '#ffffff', fadeTo: '#f2c53d', size: 10 },
  },

  // ---- Chapter 3 skills: the endgame, powered by the Staff ----
  voidrend: {
    id: 'voidrend',
    cls: SKILL_CLASS.SPECIAL,
    name: 'Xé Hư Không', // "Void Rend"
    damage: 95,
    projectile: { color: '#b06cf0', size: 15, speed: 16, count: 3, special: true },
    burst: { color: '#e6b3ff', n: 48, power: 9 },
    shake: 24,
    effect: 'voidrend', // a tear opens, collapses inward, then bursts outward
    trail: { color: '#f0d6ff', fadeTo: '#4a1070', size: 13 },
  },
  dawnbreaker: {
    id: 'dawnbreaker',
    cls: SKILL_CLASS.SPECIAL,
    name: 'Phá Minh', // "Dawnbreaker" — the Staff at full power
    damage: 120,
    projectile: { color: '#ffd24a', size: 17, speed: 20, count: 4, special: true },
    burst: { color: '#fff6d0', n: 56, power: 11 },
    shake: 28,
    effect: 'dawnbreaker', // sunrise flash + twin pillars + golden shockwaves
    trail: { color: '#ffffff', fadeTo: '#ffb347', size: 15 },
  },
};

// Word pools by difficulty tier. The game picks a word from the tier that
// matches the monster/skill being used.
export const WORD_POOLS = {
  // Tier 1: single letters, vowels, tones — earliest learners.
  letters: [
    { vi: 'a', telex: 'a' },
    { vi: 'á', telex: 'as' },
    { vi: 'à', telex: 'af' },
    { vi: 'â', telex: 'aa' },
    { vi: 'ă', telex: 'aw' },
    { vi: 'đ', telex: 'dd' },
    { vi: 'ê', telex: 'ee' },
    { vi: 'ô', telex: 'oo' },
    { vi: 'ơ', telex: 'ow' },
    { vi: 'ư', telex: 'uw' },
    { vi: 'ó', telex: 'os' },
    { vi: 'ò', telex: 'of' },
    { vi: 'ì', telex: 'if' },
    { vi: 'é', telex: 'es' },
    { vi: 'ũ', telex: 'ux' },
    { vi: 'ĩ', telex: 'ix' },
    // dấu nặng (j) on bare vowels
    { vi: 'ạ', telex: 'aj' },
    { vi: 'ẹ', telex: 'ej' },
    { vi: 'ị', telex: 'ij' },
    { vi: 'ọ', telex: 'oj' },
    { vi: 'ụ', telex: 'uj' },
    { vi: 'ợ', telex: 'owj' },
    { vi: 'ậ', telex: 'aaj' },
  ],
  // Tier 2: short everyday words.
  words: [
    { vi: 'mẹ', telex: 'mej' },
    { vi: 'bố', telex: 'boos' },
    { vi: 'cá', telex: 'cas' },
    { vi: 'gà', telex: 'gaf' },
    { vi: 'mèo', telex: 'meof' },
    { vi: 'chó', telex: 'chos' },
    { vi: 'nhà', telex: 'nhaf' },
    { vi: 'cây', telex: 'caay' },
    { vi: 'bé', telex: 'bes' },
    { vi: 'sữa', telex: 'suwax' },
    { vi: 'trứng', telex: 'truwngs' },
    { vi: 'bánh', telex: 'banhs' },
    { vi: 'vịt', telex: 'vitj' },
    { vi: 'ông', telex: 'oong' },
    { vi: 'bà', telex: 'baf' },
    { vi: 'sách', telex: 'sachs' },
    { vi: 'hoa', telex: 'hoa' },
    { vi: 'lá', telex: 'las' },
    { vi: 'mưa', telex: 'muwa' },
    { vi: 'gió', telex: 'gios' },
    { vi: 'trâu', telex: 'traau' },
    { vi: 'ngựa', telex: 'nguwaj' },
    { vi: 'chim', telex: 'chim' },
    { vi: 'ếch', telex: 'eechs' },
    { vi: 'rùa', telex: 'ruaf' },
    { vi: 'cua', telex: 'cua' },
    { vi: 'kẹo', telex: 'keoj' },
    { vi: 'nước', telex: 'nuwowcs' },
    { vi: 'cơm', telex: 'cowm' },
    { vi: 'áo', telex: 'aos' },
    // family
    { vi: 'chị', telex: 'chij' },
    { vi: 'anh', telex: 'anh' },
    { vi: 'em', telex: 'em' },
    // body
    { vi: 'tay', telex: 'tay' },
    { vi: 'chân', telex: 'chaan' },
    { vi: 'mắt', telex: 'mawts' },
    { vi: 'tai', telex: 'tai' },
    { vi: 'mũi', telex: 'muix' },
    { vi: 'miệng', telex: 'mieengj' },
    { vi: 'tóc', telex: 'tocs' },
    { vi: 'răng', telex: 'rawng' },
    // things at home / school
    { vi: 'quần', telex: 'quaanf' },
    { vi: 'giày', telex: 'giayf' },
    { vi: 'mũ', telex: 'mux' },
    { vi: 'đèn', telex: 'ddenf' },
    { vi: 'ghế', telex: 'ghees' },
    { vi: 'giường', telex: 'giuwowngf' },
    { vi: 'cửa', telex: 'cuwar' },
    { vi: 'bút', telex: 'buts' },
    { vi: 'vở', telex: 'vowr' },
    { vi: 'đường', telex: 'dduwowngf' },
    // vehicles
    { vi: 'xe', telex: 'xe' },
    { vi: 'thuyền', telex: 'thuyeenf' },
    { vi: 'tàu', telex: 'tauf' },
    // fruit
    { vi: 'táo', telex: 'taos' },
    { vi: 'cam', telex: 'cam' },
    { vi: 'chuối', telex: 'chuoois' },
    { vi: 'xoài', telex: 'xoaif' },
    { vi: 'dưa', telex: 'duwa' },
    { vi: 'ổi', telex: 'ooir' },
    { vi: 'mít', telex: 'mits' },
    { vi: 'me', telex: 'me' },
    { vi: 'khế', telex: 'khees' },
    { vi: 'dừa', telex: 'duwaf' },
    // animals
    { vi: 'heo', telex: 'heo' },
    { vi: 'bò', telex: 'bof' },
    { vi: 'dê', telex: 'dee' },
    { vi: 'thỏ', telex: 'thor' },
    { vi: 'sói', telex: 'sois' },
    { vi: 'hổ', telex: 'hoor' },
    { vi: 'voi', telex: 'voi' },
    { vi: 'khỉ', telex: 'khir' },
    { vi: 'cọp', telex: 'copj' },
    { vi: 'nai', telex: 'nai' },
    // colors
    { vi: 'đỏ', telex: 'ddor' },
    { vi: 'xanh', telex: 'xanh' },
    { vi: 'vàng', telex: 'vangf' },
    { vi: 'tím', telex: 'tims' },
    { vi: 'nâu', telex: 'naau' },
    { vi: 'hồng', telex: 'hoongf' },
    { vi: 'đen', telex: 'dden' },
    { vi: 'trắng', telex: 'trawngs' },
    // dấu nặng (j) practice
    { vi: 'cụ', telex: 'cuj' },
    { vi: 'bụng', telex: 'bungj' },
    { vi: 'lạc', telex: 'lacj' },
    { vi: 'nặng', telex: 'nawngj' },
    { vi: 'bệnh', telex: 'beenhj' },
    { vi: 'lợn', telex: 'lownj' },
    { vi: 'vực', telex: 'vuwcj' },
    { vi: 'hạt', telex: 'hatj' },
    { vi: 'ngọc', telex: 'ngocj' },
    { vi: 'đẹp', telex: 'ddepj' },
    { vi: 'mạnh', telex: 'manhj' },
    { vi: 'rực', telex: 'ruwcj' },
    { vi: 'cặp', telex: 'cawpj' },
    { vi: 'lịch', telex: 'lichj' },
    { vi: 'dịu', telex: 'diuj' },
    { vi: 'nhện', telex: 'nheenj' },
    { vi: 'gậy', telex: 'gaayj' },
    { vi: 'mật', telex: 'maatj' },
    { vi: 'chợ', telex: 'chowj' },
    { vi: 'đợi', telex: 'ddowij' },
  ],
  // Tier 3: two-word phrases — used for SPECIAL skills / bosses.
  phrases: [
    { vi: 'con mèo', telex: 'con meof' },
    { vi: 'quả cam', telex: 'quar cam' },
    { vi: 'ngôi nhà', telex: 'ngooi nhaf' },
    { vi: 'con chó', telex: 'con chos' },
    { vi: 'bông hoa', telex: 'boong hoa' },
    { vi: 'quả táo', telex: 'quar taos' },
    { vi: 'con gà', telex: 'con gaf' },
    { vi: 'cái bàn', telex: 'cais banf' },
    { vi: 'bầu trời', telex: 'baauf trowif' },
    { vi: 'mặt trăng', telex: 'mawtj trawng' },
    { vi: 'dòng sông', telex: 'dongf soong' },
    { vi: 'ngọn núi', telex: 'ngonj nuis' },
    { vi: 'cánh đồng', telex: 'canhs ddoongf' },
    { vi: 'rừng cây', telex: 'ruwngf caay' },
    { vi: 'biển xanh', telex: 'bieenr xanh' },
    { vi: 'ông mặt trời', telex: 'oong mawtj trowif' },
    { vi: 'chú chim', telex: 'chus chim' },
    { vi: 'con bướm', telex: 'con buwowms' },
    { vi: 'vườn hoa', telex: 'vuwownf hoa' },
    { vi: 'trái tim', telex: 'trais tim' },
    { vi: 'quả chuối', telex: 'quar chuoois' },
    { vi: 'con cá', telex: 'con cas' },
    { vi: 'chú thỏ', telex: 'chus thor' },
    { vi: 'đôi giày', telex: 'ddooi giayf' },
    { vi: 'cây bút', telex: 'caay buts' },
    { vi: 'ngôi sao', telex: 'ngooi sao' },
    { vi: 'đám mây', telex: 'ddams maay' },
    { vi: 'cầu vồng', telex: 'caauf voongf' },
    { vi: 'bãi biển', telex: 'baix bieenr' },
    { vi: 'cánh diều', telex: 'canhs dieeuf' },
    { vi: 'đàn cá', telex: 'ddanf cas' },
    { vi: 'chú hề', telex: 'chus heef' },
    { vi: 'bạn thân', telex: 'banj thaan' },
    { vi: 'mái nhà', telex: 'mais nhaf' },
    { vi: 'hạt mưa', telex: 'hatj muwa' },
    // dấu nặng (j)
    { vi: 'quả trứng', telex: 'quar truwngs' },
    { vi: 'hạt dẻ', telex: 'hatj der' },
    { vi: 'con nhện', telex: 'con nheenj' },
    { vi: 'giọt sương', telex: 'giotj suwowng' },
    { vi: 'chợ quê', telex: 'chowj quee' },
    { vi: 'cụ già', telex: 'cuj giaf' },
  ],
  // Tier 4: sentences — hardest, for stage bosses / late stages.
  sentences: [
    { vi: 'em yêu mẹ', telex: 'em yeeu mej' },
    { vi: 'trời nắng đẹp', telex: 'trowif nawngs ddepj' },
    { vi: 'con cá bơi', telex: 'con cas bowi' },
    { vi: 'bé đi học', telex: 'bes ddi hocj' },
    { vi: 'chim hót vui', telex: 'chim hots vui' },
    { vi: 'mèo con dễ thương', telex: 'meof con deex thuwowng' },
    { vi: 'hoa nở mùa xuân', telex: 'hoa nowr muaf xuaan' },
    { vi: 'mặt trời lên cao', telex: 'mawtj trowif leen cao' },
    { vi: 'gió thổi mát rượi', telex: 'gios thooir mats ruwowij' },
    { vi: 'em chăm ngoan học giỏi', telex: 'em chawm ngoan hocj gioir' },
    { vi: 'bà kể chuyện cổ tích', telex: 'baf keer chuyeenj coor tichs' },
    { vi: 'cả nhà cùng vui', telex: 'car nhaf cungf vui' },
    { vi: 'trăng sáng đêm rằm', telex: 'trawng sangs ddeem rawmf' },
    { vi: 'sông chảy ra biển', telex: 'soong chayr ra bieenr' },
    { vi: 'mẹ nấu cơm', telex: 'mej naaus cowm' },
    { vi: 'bố đi làm', telex: 'boos ddi lamf' },
    { vi: 'chị đọc sách', telex: 'chij ddocj sachs' },
    { vi: 'gà gáy sáng', telex: 'gaf gays sangs' },
    { vi: 'cá bơi dưới nước', telex: 'cas bowi duwowis nuwowcs' },
    { vi: 'bé ngủ ngon', telex: 'bes ngur ngon' },
    { vi: 'ông trồng cây', telex: 'oong troongf caay' },
    { vi: 'chim bay về tổ', telex: 'chim bay veef toor' },
    { vi: 'trời đổ mưa to', telex: 'trowif ddoor muwa to' },
    { vi: 'em vẽ bức tranh', telex: 'em vex buwcs tranh' },
    // dấu nặng (j)
    { vi: 'bé học chữ', telex: 'bes hocj chuwx' },
    { vi: 'cá lội dưới ao', telex: 'cas looij duwowis ao' },
    { vi: 'mẹ giặt áo', telex: 'mej giawtj aos' },
    { vi: 'em nhặt lá', telex: 'em nhawtj las' },
  ],
  // Tier 5: HARD sentences — the endgame tier (stages 9-12 bosses).
  //
  // What makes these harder than tier 4 is deliberate, not just length:
  //   - 5-8 syllables, so the kid must sustain a clean run much longer;
  //   - tone-DENSE, with several different tones in one sentence (and adjacent
  //     syllables carrying different tones, the classic slip);
  //   - heavy on the shape keys that need doubling (ươ/â/ê/ô/ă) and on đ;
  //   - every tone mark appears across the tier, nặng (j) included.
  // Still kid-appropriate vocabulary and an encouraging tone — these are proverbs
  // and storybook lines a child knows, never adult words chosen just to be long.
  hard_sentences: [
    { vi: 'bé cố gắng mỗi ngày', telex: 'bes coos gawngs mooix ngayf' },
    { vi: 'chăm học thì sẽ giỏi', telex: 'chawm hocj thif sex gioir' },
    { vi: 'mẹ dạy em viết chữ đẹp', telex: 'mej dayj em vieets chuwx ddepj' },
    { vi: 'ông kể chuyện ngày xưa', telex: 'oong keer chuyeenj ngayf xuwa' },
    { vi: 'nắng vàng rực rỡ trên đồng', telex: 'nawngs vangf ruwcj rowx treen ddoongf' },
    { vi: 'chị dẫn em đi chợ Tết', telex: 'chij daanx em ddi chowj Teets' },
    { vi: 'đàn cá lượn dưới mặt nước', telex: 'ddanf cas luwownj duwowis mawtj nuwowcs' },
    { vi: 'bầy chim sẻ đậu trên cành', telex: 'baayf chim ser ddaauj treen canhf' },
    { vi: 'trời mưa rào rồi lại nắng', telex: 'trowif muwa raof rooif laij nawngs' },
    { vi: 'em giúp mẹ tưới luống rau', telex: 'em giups mej tuwowis luoongs rau' },
    { vi: 'thương người như thể thương thân', telex: 'thuwowng nguwowif nhuw theer thuwowng thaan' },
    { vi: 'một cây làm chẳng nên non', telex: 'mootj caay lamf chawngr neen non' },
    { vi: 'ăn quả nhớ kẻ trồng cây', telex: 'awn quar nhows ker troongf caay' },
    { vi: 'có công mài sắt có ngày nên kim', telex: 'cos coong maif sawts cos ngayf neen kim' },
    { vi: 'anh hùng bàn phím rất giỏi', telex: 'anh hungf banf phims raats gioir' },
    { vi: 'công chúa đã được giải cứu', telex: 'coong chuas ddax dduwowcj giair cuwus' },
    { vi: 'bóng tối rồi cũng phải tan', telex: 'bongs toois rooif cungx phair tan' },
    { vi: 'em quyết tâm luyện gõ nhanh', telex: 'em quyeets taam luyeenj gox nhanh' },
    { vi: 'lửa thử vàng gian nan thử sức', telex: 'luwar thuwr vangf gian nan thuwr suwcs' },
    { vi: 'đường xa nhưng bước chân vững', telex: 'dduwowngf xa nhuwng buwowcs chaan vuwngx' },
  ],

  // Tier 6: LONG sentences — chapter 2 (the Staff quest, stages 13-20).
  //
  // The step up from tier 5 is ENDURANCE plus one specific Telex skill: keeping
  // a clean run across 7-10 syllables where the tone changes on almost every
  // one. That is the thing that actually breaks kids — not any single hard
  // syllable, but sustaining attention while the tone key changes each word.
  //
  // Deliberately loaded with the pairs children mix up most:
  //   - hỏi (r) vs ngã (x) on adjacent syllables — the classic Vietnamese slip;
  //   - ươ (uwow) chains, the longest shape sequence in Telex;
  //   - đ (dd) next to d, so the doubling has to be deliberate;
  //   - words where the tone lands on the SECOND vowel of a cluster (uyê, oai).
  // Content matches the chapter: study, patience, thinking, libraries, light.
  long_sentences: [
    { vi: 'người chăm đọc sách thì hiểu biết nhiều', telex: 'nguwowif chawm ddocj sachs thif hieeur bieets nhieeuf' },
    { vi: 'muốn giỏi thì phải luyện mỗi ngày', telex: 'muoons gioir thif phair luyeenj mooix ngayf' },
    { vi: 'trí tuệ sáng hơn mọi ngọn đèn', telex: 'tris tueej sangs hown moij ngonj ddenf' },
    { vi: 'bé kiên nhẫn thì việc gì cũng xong', telex: 'bes kieen nhaanx thif vieecj gif cungx xong' },
    { vi: 'gió lạnh thổi qua đỉnh núi cao', telex: 'gios lanhj thooir qua ddinhr nuis cao' },
    { vi: 'sương mù rồi cũng phải tan đi', telex: 'suwowng muf rooif cungx phair tan ddi' },
    { vi: 'gương sáng soi rõ lòng người thật thà', telex: 'guwowng sangs soi rox longf nguwowif thaatj thaf' },
    { vi: 'từng con chữ đều có sức mạnh riêng', telex: 'tuwngf con chuwx ddeeuf cos suwcs manhj rieeng' },
    { vi: 'ngôi sao nhỏ vẫn soi sáng cả rừng', telex: 'ngooi sao nhor vaanx soi sangs car ruwngf' },
    { vi: 'em bước lên từng bậc thang của tháp', telex: 'em buwowcs leen tuwngf baacj thang cuar thaps' },
    { vi: 'lời hứa tốt thì phải luôn giữ lấy', telex: 'lowif huwas toots thif phair luoon giuwx laays' },
    { vi: 'gõ đúng là chìa khóa mở cửa', telex: 'gox ddungs laf chiaf khoas mowr cuwar' },
    { vi: 'đường lên đỉnh trí tuệ tuy khó mà vui', telex: 'dduwowngf leen ddinhr tris tueej tuy khos maf vui' },
    { vi: 'ai chịu học thì trời chẳng phụ lòng', telex: 'ai chiuj hocj thif trowif chawngr phuj longf' },
    { vi: 'gõ chậm mà đúng hơn gõ nhanh mà sai', telex: 'gox chaamj maf ddungs hown gox nhanh maf sai' },
    { vi: 'mười ngón tay cùng nhau tạo nên phép màu', telex: 'muwowif ngons tay cungf nhau taoj neen pheps mauf' },
  ],

  // Tier 7: WISDOM SAYINGS — chapter 3 (the final siege, stages 21-26).
  //
  // The hardest tier in the game, and the last thing a kid types before the
  // credits. These are real Vietnamese proverbs and storybook lines (things a
  // Vietnamese child hears from grandparents), so the reward for finishing the
  // hardest typing in the game is a sentence actually worth having learned.
  //
  // What makes them the top tier: full length (8-12 syllables), every one of the
  // five tones inside a single line, ươ/uyê/oai clusters, and đ repeatedly.
  wisdom_sayings: [
    { vi: 'có chí thì nên', telex: 'cos chis thif neen' },
    { vi: 'thất bại là mẹ thành công', telex: 'thaats baij laf mej thanhf coong' },
    { vi: 'đi một ngày đàng học một sàng khôn', telex: 'ddi mootj ngayf ddangf hocj mootj sangf khoon' },
    { vi: 'uống nước nhớ nguồn', telex: 'uoongs nuwowcs nhows nguoonf' },
    { vi: 'khó khăn nào rồi cũng sẽ qua', telex: 'khos khawn naof rooif cungx sex qua' },
    { vi: 'ánh sáng luôn mạnh hơn bóng tối', telex: 'anhs sangs luoon manhj hown bongs toois' },
    { vi: 'người dũng cảm không bao giờ bỏ cuộc', telex: 'nguwowif dungx camr khoong bao giowf bor cuoocj' },
    { vi: 'lòng tốt là phép màu lớn nhất', telex: 'longf toots laf pheps mauf lowns nhaats' },
    { vi: 'một cây làm chẳng nên non ba cây chụm lại nên hòn núi cao', telex: 'mootj caay lamf chawngr neen non ba caay chumj laij neen honf nuis cao' },
    { vi: 'trẻ em hôm nay thế giới ngày mai', telex: 'trer em hoom nay thees giowis ngayf mai' },
    { vi: 'em đã đi hết con đường dài nhất', telex: 'em ddax ddi heets con dduwowngf daif nhaats' },
    { vi: 'thế giới này được cứu bởi lòng kiên nhẫn', telex: 'thees giowis nayf dduwowcj cuwus bowir longf kieen nhaanx' },
    { vi: 'mỗi con chữ em gõ là một tia sáng', telex: 'mooix con chuwx em gox laf mootj tia sangs' },
    { vi: 'bóng tối đã tan và bình yên trở lại', telex: 'bongs toois ddax tan vaf binhf yeen trowr laij' },
  ],
  // Spell tier — the Staff of Wisdom's crit incantation (see hero.staffReady in
  // main.js). Short magic-sounding phrases, deliberately word/phrase-tier length
  // (not proverb-length): the spell is a high-stakes beat under time pressure —
  // one wrong key not corrected next keystroke burns the whole charge — so it
  // must stay typeable in a few seconds, whatever chapter the kid is on.
  spell: [
    { vi: 'ánh sáng trỗi dậy', telex: 'anhs sangs trooix daayj' },
    { vi: 'sức mạnh trí tuệ', telex: 'suwcs manhj tris tueej' },
    { vi: 'phép màu hiện ra', telex: 'pheps mauf hieenj ra' },
    { vi: 'trượng thần thức tỉnh', telex: 'truwowngj thaanf thuwcs tinhr' },
    { vi: 'ngôi sao tỏa sáng', telex: 'ngooi sao toar sangs' },
    { vi: 'ý chí bất diệt', telex: 'ys chis baats dieetj' },
  ],
};

// Pick a word from a pool by index (wraps).
export function pickWord(pool, index) {
  const list = WORD_POOLS[pool];
  return list[index % list.length];
}

// Special skills are REWARDS — the hero may only swing what he has actually
// earned. Stage waves name the skill they'd *like* to use (their damage/effect
// profile is part of the stage's escalation), but a kid replaying stage 4 on a
// fresh save has no meteor yet, so the wave must degrade gracefully instead of
// firing an unearned ultimate.
//
// SPECIAL_ORDER is the unlock order (matching REWARDS in rewards.js). Resolution
// walks DOWN from the requested skill to the strongest special the kid owns, and
// falls back to 'slash' if they own none — so the fight still happens, just with
// the basic attack. `unlocked` comes from hero.unlockedSkills (applyRewards).
export const SPECIAL_ORDER = [
  // chapter 1
  'fireball', 'lightning', 'meteor',
  // chapter 2 — the Staff quest
  'frostnova', 'windblade', 'holylight',
  // chapter 3 — the endgame
  'voidrend', 'dawnbreaker',
];

export function resolveSkill(wantedId, unlocked = ['slash']) {
  const wanted = SKILLS[wantedId] || SKILLS.slash;
  // The basic attack is always available.
  if (wanted.cls === SKILL_CLASS.SIMPLE) return wanted;
  if (unlocked.includes(wantedId)) return wanted;

  // Step down the unlock ladder from just below the requested skill.
  const wantedRank = SPECIAL_ORDER.indexOf(wantedId);
  const from = wantedRank === -1 ? SPECIAL_ORDER.length - 1 : wantedRank - 1;
  for (let i = from; i >= 0; i--) {
    if (unlocked.includes(SPECIAL_ORDER[i])) return SKILLS[SPECIAL_ORDER[i]];
  }
  return SKILLS.slash;
}
