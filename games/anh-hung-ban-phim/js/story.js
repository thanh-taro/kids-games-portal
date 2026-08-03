// story.js — the saga's narration: the prologue, each chapter's opening, and
// each chapter's closing.
//
// Pure DATA. `scenes.js` draws it, `main.js` pages through it. A chapter's story
// is a list of PAGES; each page is a few short lines plus a `art` key naming the
// tableau to draw behind them (see drawStory in scenes.js).
//
// Why pages of 2-4 short lines and not paragraphs: the audience is a 6-10 year
// old reading Vietnamese with full diacritics off a screen. Long lines get
// skipped; a short line with a picture behind it gets read. Every line is also
// deliberately written with the tone marks a kid is about to practise typing —
// the story is the first place they SEE the letters the game will ask them to
// TYPE.
//
// `art` values are drawn by scenes.js `drawStoryArt`:
//   'throne'    the King on his throne, hero kneeling  (the request)
//   'kidnap'    ten princesses behind the Demon King's shadow (the crime)
//   'road'      the hero walking out, spire on the horizon (departure)
//   'library'   the ruined library, floating books (chapter 2 opening)
//   'staff'     the Staff of Wisdom on its pedestal, beam of light
//   'fortress'  the Demon King's fortress gates (chapter 3 opening)
//   'duel'      hero vs the World Devourer, silhouetted
//   'peace'     the ten princesses freed, sunrise over the kingdom
//   'crown'     the hero honored by the King (the epilogue)

// ---------------------------------------------------------------------------
// PROLOGUE — shown once, before the very first stage of the whole game.
// ---------------------------------------------------------------------------
// English gloss:
//   1. Ten princesses, each with her own magical power, keep the world in
//      balance. While they are free, darkness can never cover the land.
//   2. But the Demon King — the World Devourer — has kidnapped all ten. He is
//      stealing their powers to swallow the world in darkness.
//   3. Only one hero is brave enough to stand against him. That hero is YOU.
export const PROLOGUE = {
  title: 'Ngày Xưa...', // "Once upon a time..."
  pages: [
    {
      art: 'peace',
      lines: [
        'Mười nàng công chúa, mỗi người một phép màu,',
        'cùng nhau giữ cho thế giới bình yên.',
        'Khi các nàng còn tự do,',
        'bóng tối không thể phủ lên mặt đất.',
      ],
    },
    {
      art: 'kidnap',
      lines: [
        'Nhưng Chúa Tể Bóng Tối — KẺ NUỐT THẾ GIỚI —',
        'đã bắt cóc cả mười nàng công chúa.',
        'Hắn cướp phép màu của các nàng',
        'để nhấn chìm thế giới vào bóng đêm.',
      ],
    },
    {
      art: 'road',
      lines: [
        'Chỉ có một anh hùng đủ dũng cảm',
        'để đứng lên chống lại hắn.',
        'Anh hùng đó chính là BẠN!',
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CHAPTER OPENINGS + CLOSINGS, keyed by chapter id (see chapters.js).
// ---------------------------------------------------------------------------
// Each entry: { opening: {title, pages[]}, closing: {title, pages[]} }
//
// The closing of chapters 1 and 2 hands off to the next chapter (it ends on the
// hook). Chapter 3's closing IS the final ending, so it resolves everything and
// hands off to nothing.
export const CHAPTER_STORY = {
  // ===== CHAPTER 1 — Lời Thỉnh Cầu Của Đức Vua (The King's Request) =====
  1: {
    opening: {
      title: 'Chương 1: Lời Thỉnh Cầu Của Đức Vua',
      pages: [
        // "The King summons you to the great hall. 'Brave hero,' he says, 'the
        //  ten princesses are gone. Only you can bring them home.'"
        {
          art: 'throne',
          lines: [
            'Đức Vua cho gọi bạn vào đại điện.',
            '“Hỡi anh hùng dũng cảm,” ngài nói,',
            '“mười nàng công chúa đã bị bắt đi.',
            'Chỉ có ngươi mới đưa họ trở về được.”',
          ],
        },
        // "Take this sword. Learn to write our language well — for the monsters
        //  of darkness fear nothing more than a true, correct word."
        {
          art: 'throne',
          lines: [
            '“Hãy nhận lấy thanh kiếm này.',
            'Và hãy học gõ thật giỏi tiếng của chúng ta —',
            'lũ quái vật bóng tối không sợ gì hơn',
            'một con chữ được gõ chính xác!”',
          ],
        },
        // "So the journey begins. The road is long, the spire is far away — but
        //  every letter you type makes you stronger."
        {
          art: 'road',
          lines: [
            'Thế là cuộc hành trình bắt đầu.',
            'Đường còn dài, tòa tháp đen còn xa —',
            'nhưng mỗi con chữ bạn gõ',
            'sẽ làm bạn mạnh thêm!',
          ],
        },
      ],
    },
    closing: {
      title: 'Hết Chương 1',
      pages: [
        // "All ten princesses are free! The kingdom cheers your name."
        {
          art: 'peace',
          lines: [
            'Cả mười nàng công chúa đã được giải cứu!',
            'Cả vương quốc hò reo tên bạn.',
          ],
        },
        // "But the Demon King still stands, and their stolen powers are still in
        //  his hands. The King's face is grave: 'Courage alone will not be
        //  enough to defeat him.'"
        {
          art: 'throne',
          lines: [
            'Nhưng Chúa Tể Bóng Tối vẫn còn đó,',
            'và phép màu bị cướp vẫn trong tay hắn.',
            'Đức Vua trầm giọng: “Chỉ có lòng dũng cảm',
            'sẽ không đủ để đánh bại hắn đâu...”',
          ],
        },
      ],
    },
  },

  // ===== CHAPTER 2 — Trượng Của Trí Tuệ (The Staff of Wisdom) =====
  2: {
    opening: {
      title: 'Chương 2: Trượng Của Trí Tuệ',
      pages: [
        // "In an ancient book the King shows you a drawing: the Staff of Wisdom.
        //  A weapon that can wound even the greatest evil."
        {
          art: 'library',
          lines: [
            'Trong một quyển sách cổ, Đức Vua chỉ cho bạn',
            'hình vẽ một cây trượng phát sáng:',
            'TRƯỢNG CỦA TRÍ TUỆ —',
            'thứ duy nhất làm tổn thương được cái ác lớn nhất.',
          ],
        },
        // "The ten princesses you saved will not forget it. From the shadows of
        //  this new road, each of them watches over you still, and will lend
        //  you her own gift — once — the moment you need it most."
        {
          art: 'peace',
          lines: [
            'Mười nàng công chúa bạn đã cứu sẽ không quên ơn ấy.',
            'Trên con đường mới này, mỗi người vẫn dõi theo bạn,',
            'và sẽ trao bạn món quà của riêng mình —',
            'chỉ một lần — vào đúng lúc bạn cần nhất.',
          ],
        },
        // "But the Staff does not obey strength. It obeys a clear mind. To reach
        //  it you must pass the trials: perseverance, clarity, honesty."
        {
          art: 'staff',
          lines: [
            'Nhưng Trượng không nghe theo sức mạnh.',
            'Trượng chỉ nghe theo một cái đầu sáng suốt.',
            'Muốn lấy được, bạn phải vượt qua các thử thách:',
            'bền lòng, sáng trí, và thật thà.',
          ],
        },
        // "The road turns away from the dark spire, toward the Tower of Wisdom.
        //  Type carefully, hero — here, a correct word is the key to every door."
        {
          art: 'road',
          lines: [
            'Con đường rẽ khỏi tòa tháp đen,',
            'hướng về Tháp Trí Tuệ xa xôi.',
            'Hãy gõ thật cẩn thận, anh hùng —',
            'ở đây, chữ gõ đúng là chìa khóa của mọi cánh cửa!',
          ],
        },
      ],
    },
    closing: {
      title: 'Hết Chương 2',
      pages: [
        // "The Guardian bows and steps aside. The Staff of Wisdom is yours!"
        {
          art: 'staff',
          lines: [
            'Thủ Vệ nghiêng mình rồi bước sang một bên.',
            'TRƯỢNG CỦA TRÍ TUỆ đã thuộc về bạn!',
          ],
        },
        // "Light runs up your arm. Now you can feel it: the Demon King's shield
        //  is no longer unbreakable. It is time to go to his fortress."
        {
          art: 'fortress',
          lines: [
            'Ánh sáng chạy dọc cánh tay bạn.',
            'Giờ bạn đã cảm nhận được: lớp khiên của Chúa Tể',
            'không còn là bất khả xâm phạm nữa.',
            'Đã đến lúc tiến vào thành trì của hắn!',
          ],
        },
      ],
    },
  },

  // ===== CHAPTER 3 — Trận Chiến Cuối Cùng (The Final Confrontation) =====
  3: {
    opening: {
      title: 'Chương 3: Trận Chiến Cuối Cùng',
      pages: [
        // "Before you rise the black gates. Behind them: the stolen powers of
        //  ten princesses, and the World Devourer waiting on his throne."
        {
          art: 'fortress',
          lines: [
            'Trước mặt bạn là cánh cổng đen khổng lồ.',
            'Phía sau nó: phép màu của mười nàng công chúa,',
            'và KẺ NUỐT THẾ GIỚI',
            'đang ngồi chờ trên ngai vàng của hắn.',
          ],
        },
        // "You hold the Staff in one hand and your sword in the other. You are
        //  not the same child who left the King's hall."
        {
          art: 'duel',
          lines: [
            'Một tay bạn nắm Trượng, một tay nắm kiếm.',
            'Bạn không còn là đứa trẻ',
            'đã rời đại điện của Đức Vua ngày ấy nữa.',
          ],
        },
        // "One last road, hero. Type bravely — and the world will be saved."
        {
          art: 'duel',
          lines: [
            'Chỉ còn một con đường cuối cùng, anh hùng.',
            'Hãy gõ thật dũng cảm —',
            'và thế giới sẽ được cứu!',
          ],
        },
      ],
    },
    closing: {
      title: 'Kết Thúc',
      pages: [
        // "With a last blaze of light the World Devourer breaks apart. The
        //  darkness he swallowed pours back out as morning."
        {
          art: 'duel',
          lines: [
            'Một tia sáng cuối cùng bùng lên —',
            'KẺ NUỐT THẾ GIỚI tan thành trăm mảnh.',
            'Bóng tối hắn đã nuốt',
            'trào trở ra thành ánh ban mai.',
          ],
        },
        // "The ten powers fly home to the ten princesses. Rivers run clear,
        //  flowers open, and the world is in balance again."
        {
          art: 'peace',
          lines: [
            'Mười phép màu bay về với mười nàng công chúa.',
            'Sông lại trong, hoa lại nở,',
            'và thế giới trở lại bình yên.',
          ],
        },
        // "The King places a hand on your shoulder. 'You saved us all — not with
        //  the strongest arm, but with the most careful hand.'"
        {
          art: 'crown',
          lines: [
            'Đức Vua đặt tay lên vai bạn.',
            '“Ngươi đã cứu tất cả chúng ta —',
            'không phải bằng cánh tay mạnh nhất,',
            'mà bằng đôi tay cẩn thận nhất.”',
          ],
        },
        // "And so darkness never threatened the world again. Well done, Keyboard
        //  Hero — you can type Vietnamese!"
        {
          art: 'crown',
          lines: [
            'Và từ đó, bóng tối không bao giờ',
            'đe dọa được thế giới này nữa.',
            'Giỏi lắm, ANH HÙNG BÀN PHÍM —',
            'bạn đã biết gõ tiếng Việt rồi!',
          ],
        },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// CREDITS — rolled on the Final Ending scene (see drawGameComplete).
// ---------------------------------------------------------------------------
// Names are shown with the affectionate nicknames the family uses, because this
// game was made for these kids by their dad — the credits should read the way
// they talk at home, not like a studio roll.
//
// `role` lines stay in Vietnamese to match every other word on screen; the
// English gloss is in the comments only.
export const CREDITS = {
  title: 'ĐOÀN LÀM GAME', // "The game-making crew"
  entries: [
    // "Game Director"
    { role: 'Chỉ Đạo Sản Xuất', names: ['Nguyễn Tri Thành (Ba đẹp trai)'] },
    // "UI/UX Design, Animation, Writing, Sound"
    { role: 'Thiết Kế · Chuyển Động · Cốt Truyện · Âm Thanh', names: ['Claude Code (Osin cao cấp)'] },
    // "Testers"
    {
      role: 'Người Chơi Thử',
      names: [
        'Nguyễn Hoài An (Mưa xinh đẹp)',
        'Nguyễn Thiên An (Mây vui tính)',
        'Nguyễn Thị Lê Uyên (Mẹ đáng yêu)',
      ],
    },
  ],
  contact: 'adamnguyen.itdn@gmail.com',
  // "We hope this game helps children type Vietnamese a little better every day."
  message: 'Hy vọng trò chơi này sẽ góp phần giúp các em nhỏ luyện kĩ năng gõ tiếng Việt tốt hơn mỗi ngày.',
};

// The opening pages for a chapter, with the PROLOGUE prepended for chapter 1
// (the prologue is the world's setup, so it only ever plays once, in front of
// the first chapter's own opening). Returns [] for a chapter with no story.
export function openingFor(chapterId) {
  const entry = CHAPTER_STORY[chapterId];
  const own = entry && entry.opening ? entry.opening.pages : [];
  return chapterId === 1 ? [...PROLOGUE.pages, ...own] : [...own];
}

// The closing pages for a chapter (the chapter-end story beat).
export function closingFor(chapterId) {
  const entry = CHAPTER_STORY[chapterId];
  return entry && entry.closing ? [...entry.closing.pages] : [];
}

// Titles for the story scene's header.
export function openingTitle(chapterId) {
  const entry = CHAPTER_STORY[chapterId];
  return entry && entry.opening ? entry.opening.title : '';
}

export function closingTitle(chapterId) {
  const entry = CHAPTER_STORY[chapterId];
  return entry && entry.closing ? entry.closing.title : '';
}
