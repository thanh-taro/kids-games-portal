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
    { vi: 'trứng', telex: 'truwsng' },
    { vi: 'bánh', telex: 'basnh' },
    { vi: 'vịt', telex: 'vitj' },
    { vi: 'ông', telex: 'oong' },
    { vi: 'bà', telex: 'baf' },
    { vi: 'sách', telex: 'sasch' },
    { vi: 'hoa', telex: 'hoa' },
    { vi: 'lá', telex: 'las' },
    { vi: 'mưa', telex: 'muwa' },
    { vi: 'gió', telex: 'gios' },
    { vi: 'trâu', telex: 'traau' },
    { vi: 'ngựa', telex: 'nguwaj' },
    { vi: 'chim', telex: 'chim' },
    { vi: 'ếch', telex: 'eesch' },
    { vi: 'rùa', telex: 'ruaf' },
    { vi: 'cua', telex: 'cua' },
    { vi: 'kẹo', telex: 'keoj' },
    { vi: 'nước', telex: 'nuwowsc' },
    { vi: 'cơm', telex: 'cowm' },
    { vi: 'áo', telex: 'aso' },
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
    { vi: 'táo', telex: 'taso' },
    { vi: 'cam', telex: 'cam' },
    { vi: 'chuối', telex: 'chuoois' },
    { vi: 'xoài', telex: 'xoaif' },
    { vi: 'dưa', telex: 'duwa' },
    { vi: 'ổi', telex: 'oori' },
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
    { vi: 'quả táo', telex: 'quar taso' },
    { vi: 'con gà', telex: 'con gaf' },
    { vi: 'cái bàn', telex: 'cais banf' },
    { vi: 'bầu trời', telex: 'baauf trowfi' },
    { vi: 'mặt trăng', telex: 'mawtj trawng' },
    { vi: 'dòng sông', telex: 'dongf soong' },
    { vi: 'ngọn núi', telex: 'ngonj nuis' },
    { vi: 'cánh đồng', telex: 'casnh ddoongf' },
    { vi: 'rừng cây', telex: 'ruwngf caay' },
    { vi: 'biển xanh', telex: 'bieenr xanh' },
    { vi: 'ông mặt trời', telex: 'oong mawtj trowfi' },
    { vi: 'chú chim', telex: 'chus chim' },
    { vi: 'con bướm', telex: 'con buwowsm' },
    { vi: 'vườn hoa', telex: 'vuwownf hoa' },
    { vi: 'trái tim', telex: 'trais tim' },
    { vi: 'quả chuối', telex: 'quar chuoois' },
    { vi: 'con cá', telex: 'con cas' },
    { vi: 'chú thỏ', telex: 'chus thor' },
    { vi: 'đôi giày', telex: 'ddooi giayf' },
    { vi: 'cây bút', telex: 'caay buts' },
    { vi: 'ngôi sao', telex: 'ngooi sao' },
    { vi: 'đám mây', telex: 'ddasm maay' },
    { vi: 'cầu vồng', telex: 'caauf voongf' },
    { vi: 'bãi biển', telex: 'baix bieenr' },
    { vi: 'cánh diều', telex: 'casnh dieeuf' },
    { vi: 'đàn cá', telex: 'ddanf cas' },
    { vi: 'chú hề', telex: 'chus heef' },
    { vi: 'bạn thân', telex: 'banj thaan' },
    { vi: 'mái nhà', telex: 'mais nhaf' },
    { vi: 'hạt mưa', telex: 'hatj muwa' },
    // dấu nặng (j)
    { vi: 'quả trứng', telex: 'quar truwsng' },
    { vi: 'hạt dẻ', telex: 'hatj der' },
    { vi: 'con nhện', telex: 'con nheenj' },
    { vi: 'giọt sương', telex: 'giotj suwowng' },
    { vi: 'chợ quê', telex: 'chowj quee' },
    { vi: 'cụ già', telex: 'cuj giaf' },
  ],
  // Tier 4: sentences — hardest, for stage bosses / late stages.
  sentences: [
    { vi: 'em yêu mẹ', telex: 'em yeeu mej' },
    { vi: 'trời nắng đẹp', telex: 'trowfi nawsng ddepj' },
    { vi: 'con cá bơi', telex: 'con cas bowi' },
    { vi: 'bé đi học', telex: 'bes ddi hocj' },
    { vi: 'chim hót vui', telex: 'chim hots vui' },
    { vi: 'mèo con dễ thương', telex: 'meof con deex thuwowng' },
    { vi: 'hoa nở mùa xuân', telex: 'hoa nowr muaf xuaan' },
    { vi: 'mặt trời lên cao', telex: 'mawtj trowfi leen cao' },
    { vi: 'gió thổi mát rượi', telex: 'gios thoori mast ruwowji' },
    { vi: 'em chăm ngoan học giỏi', telex: 'em chawm ngoan hocj gioir' },
    { vi: 'bà kể chuyện cổ tích', telex: 'baf keer chuyeenj coor tichs' },
    { vi: 'cả nhà cùng vui', telex: 'car nhaf cungf vui' },
    { vi: 'trăng sáng đêm rằm', telex: 'trawng sasng ddeem rawmf' },
    { vi: 'sông chảy ra biển', telex: 'soong chary ra bieenr' },
    { vi: 'mẹ nấu cơm', telex: 'mej naaus cowm' },
    { vi: 'bố đi làm', telex: 'boos ddi lamf' },
    { vi: 'chị đọc sách', telex: 'chij ddocj sasch' },
    { vi: 'gà gáy sáng', telex: 'gaf gasy sasng' },
    { vi: 'cá bơi dưới nước', telex: 'cas bowi duwowsi nuwowsc' },
    { vi: 'bé ngủ ngon', telex: 'bes ngur ngon' },
    { vi: 'ông trồng cây', telex: 'oong troongf caay' },
    { vi: 'chim bay về tổ', telex: 'chim bay veef toor' },
    { vi: 'trời đổ mưa to', telex: 'trowfi ddoor muwa to' },
    { vi: 'em vẽ bức tranh', telex: 'em vex buwsc tranh' },
    // dấu nặng (j)
    { vi: 'bé học chữ', telex: 'bes hocj chuwx' },
    { vi: 'cá lội dưới ao', telex: 'cas looij duwowsi ao' },
    { vi: 'mẹ giặt áo', telex: 'mej giawtj aso' },
    { vi: 'em nhặt lá', telex: 'em nhawtj las' },
  ],
};

// Pick a word from a pool by index (wraps).
export function pickWord(pool, index) {
  const list = WORD_POOLS[pool];
  return list[index % list.length];
}
