// story.js — pure narration data. No drawing, no state.
//
// A page is {art, lines}. `art` names a tableau drawn by drawStoryArt in
// scenes.js; `lines` is the Vietnamese text, one array entry per line, already
// broken where it should break on screen.
//
// STRUCTURE
//   PROLOGUE          plays once, before the tutorial
//   CHAPTER_STORY[id]  { opening, closing } page lists per chapter
//   ALLY_STORY[id]     the one-page beat when a wingman is freed
//   CREDITS            the final scroll
//
// TWO ORDERING DECISIONS worth keeping (both learned in the typing game):
//
//   1. THE PROLOGUE PLAYS BEFORE THE TUTORIAL. The Captain gives the mission,
//      and THEN the kid learns how the ship works. A controls lesson with no
//      context is what the old flow did and it read as a manual bolted onto a
//      story.
//   2. THE TUTORIAL SPEAKS IN THE CAPTAIN'S VOICE, so the two read as one
//      sequence rather than a story followed by an interruption.
//
// TONE: this is for a 6-9 year old. Short sentences, concrete images, no irony.
// The monsterships are frightening but never gory; the Destroyer "eats stars",
// which is enormous and awful without being violent. Every chapter ends on
// something gained rather than something lost — a rescued friend, a new power,
// a lit-up galaxy.

// ---------------------------------------------------------------------------
// PROLOGUE — why the kid is flying at all.
// ---------------------------------------------------------------------------

export const PROLOGUE = [
  {
    art: 'stars_peaceful',
    lines: [
      'Ngày xửa ngày xưa, dải Ngân Hà rực sáng giữa bầu trời.',
      'Hàng triệu vì sao và vô số hành tinh cùng tỏa sáng,',
      'tạo nên một thế giới thanh bình.',
    ],
  },
  {
    art: 'fleet_arrives',
    lines: [
      'Rồi một ngày, Đoàn Quái Hạm tới.',
      'Chúng đi từ ngôi sao này sang ngôi sao khác,',
      'và nơi nào chúng đi qua, ánh sáng biến mất.',
    ],
  },
  {
    art: 'earth_threatened',
    lines: [
      'Hôm nay, chúng đã tới Trái Đất.',
      'Hạm đội phòng thủ của chúng ta',
      'chỉ còn một phi thuyền duy nhất: Tia Sáng',
    ],
  },
  {
    art: 'captain_briefing',
    lines: [
      'Thuyền trưởng nói:',
      '"Phi thuyền này chạy bằng TOÁN HỌC.',
      'Mỗi câu trả lời đúng, phi thuyền sẽ có thể tấn công kẻ địch."',
    ],
  },
  {
    art: 'captain_briefing',
    lines: [
      '"Ta không cần bạn cầm lái. Phi thuyền sẽ tự bay.',
      'Ta cần bạn SUY NGHĨ, giải các bài toán — nhanh và đúng.',
      'Bạn sẵn sàng chưa, phi công?"',
    ],
  },
];

// ---------------------------------------------------------------------------
// CHAPTER_STORY — opening and closing pages, keyed by chapter id.
// ---------------------------------------------------------------------------

export const CHAPTER_STORY = {
  1: {
    opening: [
      {
        art: 'earth_threatened',
        lines: [
          'CHƯƠNG MỘT',
          'Mệnh Lệnh Từ Trái Đất',
          '',
          'Đẩy lùi Đoàn Quái Hạm.',
          'Bảo vệ Trái Đất - ngôi nhà của chúng ta.',
        ],
      },
    ],
    closing: [
      {
        art: 'commander_wreck',
        lines: [
          'Hạm Trưởng Bóng Đêm đã bị đánh bại.',
          'Trái Đất an toàn. Bạn đã làm được!',
        ],
      },
      {
        art: 'data_shard',
        lines: [
          'Nhưng trong xác tàu của hắn có một mảnh dữ liệu.',
          'Chiếc La Bàn cũ của phi thuyền đọc được nó...',
        ],
      },
      {
        art: 'gang_reveal',
        lines: [
          'Đoàn Quái Hạm không chỉ có một hạm trưởng.',
          'Chúng là một BĂNG ĐẢNG.',
          'Và chúng có một kẻ cầm đầu...',
        ],
      },
      {
        art: 'destroyer_reveal',
        lines: [
          'KẺ HUỶ DIỆT NGÂN HÀ',
          'Hắn ăn từng ngôi sao một.',
          'Trái Đất chỉ an toàn cho tới khi hắn quay lại.',
        ],
      },
      {
        art: 'prisoners',
        lines: [
          'Mảnh dữ liệu còn cho biết một điều nữa:',
          'năm phi công đang bị chúng giam giữ.',
          'Một mình bạn không đủ. Nhưng sáu người thì sao?',
        ],
      },
    ],
  },

  2: {
    opening: [
      {
        art: 'prisoners',
        lines: [
          'CHƯƠNG HAI',
          'Giải Cứu Đồng Đội',
          '',
          'Năm người bạn. Năm nhà tù. Đi thôi.',
        ],
      },
    ],
    closing: [
      {
        art: 'lineup_full',
        lines: [
          'Sáu phi thuyền, bay thành một đội hình.',
          'Bé Ốc, Tia Chớp, Vòm Xanh, La Bàn, Giáo Sư Sao.',
          'Không ai phải bay một mình nữa.',
        ],
      },
      {
        art: 'formula_lesson',
        lines: [
          'Giáo Sư Sao dạy bạn điều cuối cùng:',
          'SIÊU CÔNG THỨC.',
          '"Trả lời đúng liên tiếp, không sai một câu nào,',
          'và phi thuyền sẽ bắn ra một tia',
          'xuyên mọi khiên phòng thủ của kẻ địch."',
        ],
      },
      {
        art: 'darkstar_close',
        lines: [
          'La Bàn chỉ vào bóng đen phía trước.',
          '"Hắc Tinh. Hang ổ của hắn ở trong đó."',
          'Đã đến lúc rồi!',
        ],
      },
    ],
  },

  3: {
    opening: [
      {
        art: 'darkstar_close',
        lines: [
          'CHƯƠNG BA',
          'Cứu Dải Ngân Hà',
          '',
          'Vào Cõi Hắc Ám. Cùng nhau, mình sẽ thắng!',
        ],
      },
    ],
    closing: [
      {
        art: 'destroyer_defeated',
        lines: [
          'Lõi của Kẻ Huỷ Diệt vỡ ra.',
          'Bóng tối co lại, rồi dần tan hết.',
        ],
      },
      {
        art: 'stars_relight',
        lines: [
          'Từng ngôi sao một, ánh sáng trở lại.',
          'Những ngôi sao hắn đã ăn — tất cả đều thức dậy.',
        ],
      },
      {
        art: 'lineup_home',
        lines: [
          'Sáu phi thuyền bay về nhà,',
          'qua một dải Ngân Hà sáng hơn bao giờ hết.',
          '',
          'Cảm ơn bạn, phi công!',
        ],
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// ALLY_STORY — the one page shown when a wingman joins.
//
// This is the emotional payoff of chapter 2 and it happens FIVE times, so each
// page is short: one image, three lines, then straight back into flying. A long
// cutscene on every rescue would turn the chapter's best beat into a chore.
// ---------------------------------------------------------------------------

export const ALLY_STORY = {
  engineer: {
    name: 'Bé Ốc',
    art: 'ally_freed',
    lines: [
      'Lồng băng mở ra. Một cô bé nhỏ xíu bước ra,',
      'tay vẫn cầm cờ-lê.',
      '"Tớ là Bé Ốc. Để tớ lo cái khiên cho cậu!"',
    ],
  },
  gunner: {
    name: 'Tia Chớp',
    art: 'ally_freed',
    lines: [
      'Cậu bé nhảy vào buồng lái, cười thật tươi.',
      '"Tớ là Tia Chớp. Pháo thủ giỏi nhất hạm đội!"',
      'Hai khẩu pháo cánh sáng lên.',
    ],
  },
  shieldman: {
    name: 'Vòm Xanh',
    art: 'ally_freed',
    lines: [
      'Một vòm sáng xanh bật lên quanh cả đội.',
      '"Tớ là Vòm Xanh. Từ giờ,',
      'cậu không phải chịu đòn một mình."',
    ],
  },
  navigator: {
    name: 'La Bàn',
    art: 'ally_freed',
    lines: [
      'Cô bé nhìn vào bóng tối và chỉ tay.',
      '"Tớ là La Bàn. Tớ biết đường đi khắp Ngân Hà —',
      'kể cả đường tới hang ổ của hắn."',
    ],
  },
  scientist: {
    name: 'Giáo Sư Sao',
    art: 'ally_freed',
    lines: [
      'Ông cụ nhỏ bé bước ra, mắt sáng rực.',
      '"Ta là Giáo Sư Sao. Ta biết một công thức',
      'mà chính Kẻ Huỷ Diệt cũng phải sợ."',
    ],
  },
};

// ---------------------------------------------------------------------------
// CREDITS
// ---------------------------------------------------------------------------

export const CREDITS = [
  'PHI CÔNG TOÁN HỌC',
  '',
  'Cứu Dải Ngân Hà',
  '',
  '',
  'Phi công: BẠN',
  '',
  'Đồng đội:',
  'Bé Ốc · Tia Chớp · Vòm Xanh',
  'La Bàn · Giáo Sư Sao',
  '',
  '',
  'Bạn đã trả lời rất nhiều câu toán',
  'và cứu được cả một dải Ngân Hà.',
  '',
  'Hẹn gặp lại, phi công!',
];

// Every art name used above, so verify.js can assert scenes.js draws them all.
// A page naming a tableau that does not exist would render as an empty screen
// with text floating on it — a silent failure, which is why it is checked.
export const STORY_ART_NAMES = (() => {
  const names = new Set();
  for (const p of PROLOGUE) names.add(p.art);
  for (const ch of Object.values(CHAPTER_STORY)) {
    for (const p of ch.opening) names.add(p.art);
    for (const p of ch.closing) names.add(p.art);
  }
  for (const a of Object.values(ALLY_STORY)) names.add(a.art);
  return [...names];
})();
