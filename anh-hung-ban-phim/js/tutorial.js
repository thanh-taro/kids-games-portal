// tutorial.js — interactive "how to play" lessons drawn on the canvas.
//
// Kids learn Telex by DOING it: each lesson shows a concept + example, then
// asks them to type a target word. We feed their keystrokes through the real
// Telex engine (telex.js) so the practice is identical to real gameplay, and
// show a live preview of what they've typed under the target.
//
// State model (mirrors main.js scenes):
//   Tutorial owns a small state machine of LESSONS. main.js delegates the
//   TUTORIAL game-state to `update()` / `draw()` here, and routes keystrokes
//   to `handleKey()`. When the kid finishes (or skips), `done` flips true and
//   main.js reads it to return to the title / start the game.

import { drawSprite, drawScene, drawText, drawRect, DOT } from './render.js';
import { SPRITES, CLOUD, SUN, CACTUS, BUSH } from './sprites.js';
import { newBuffer, render, telexPrefixLen, stepKey } from './telex.js';
import * as Audio from './audio.js';

// Each lesson: a title, a short kid-friendly explanation, an optional
// "key hint" line (which raw keys to press), and a `target` word to type.
// `keys` is the literal keystroke sequence shown as a hint chip.
// A lesson with no `target` is a "read-only" intro slide (advance with SPACE).
const LESSONS = [
  {
    title: 'Lời dặn của Đức Vua', // "The King's instruction"
    // Framed as the King's parting advice, because the prologue (story.js) has
    // just shown him saying "learn to TYPE our language well — the monsters of
    // darkness fear nothing more than a word typed correctly". The tutorial IS
    // that training, so it opens in the same voice (and the same wording — the
    // skill is TYPING, gõ, not handwriting) instead of as a separate manual.
    // "The King said: monsters of darkness fear a word typed correctly! You type
    //  Vietnamese to attack them and rescue the princesses. Let's train — it's
    //  easy!"
    lines: [
      'Đức Vua đã dặn: lũ quái vật bóng tối',
      'rất sợ một con chữ được gõ CHÍNH XÁC! ⚔️',
      'Bạn gõ chữ Tiếng Việt để đánh chúng',
      'và cứu các nàng công chúa. 🏰',
      'Cùng luyện nhé — dễ lắm!',
    ],
    target: null,
  },
  {
    title: 'Gõ chữ thường',
    // "Type normal letters. Try typing the word 'mẹ' has no marks yet — start
    //  with the simple word 'ba'." We start with a plain, no-diacritic word.
    lines: [
      'Gõ từng chữ cái như bình thường.',
      'Thử gõ từ bên dưới nhé!',
    ],
    keys: 'b a',
    target: 'ba',
  },
  {
    title: 'Dấu sắc và huyền',
    // "Tone marks! Add S for the sắc mark (´), F for the huyền mark (`).
    //  Type the letters first, then the tone key at the end."
    lines: [
      'Thêm dấu: gõ S để có dấu SẮC (´),',
      'gõ F để có dấu HUYỀN (`).',
      'Gõ chữ trước, gõ dấu ở cuối!',
    ],
    keys: 'm e o f',
    target: 'mèo', // "cat"
  },
  {
    title: 'Các dấu còn lại',
    // "The other tones: R = hỏi (?), X = ngã (~), J = nặng (.)."
    lines: [
      'R = dấu HỎI (?)   X = dấu NGÃ (~)',
      'J = dấu NẶNG (.)',
      'Thử gõ "cá" — c, a, rồi s nhé!',
    ],
    keys: 'c a s',
    target: 'cá', // "fish"
  },
  {
    title: 'Chữ có mũ: â ê ô',
    // "Hats! Type a letter twice to add a hat: aa -> â, ee -> ê, oo -> ô."
    lines: [
      'Gõ chữ HAI LẦN để có mũ:',
      'aa → â,  ee → ê,  oo → ô',
    ],
    keys: 'c o o',
    target: 'cô', // teaches the ô shape in isolation
  },
  {
    title: 'Chữ có móc: ă ơ ư',
    // "Type W after a/o/u for the curly shapes: aw -> ă, ow -> ơ, uw -> ư."
    lines: [
      'Gõ W sau chữ để có móc:',
      'aw → ă,  ow → ơ,  uw → ư',
    ],
    keys: 'c o w m',
    target: 'cơm', // "rice"
  },
  {
    title: 'Chữ đ đặc biệt',
    // "The special đ: type d twice -> đ."
    lines: [
      'Gõ chữ D HAI LẦN để có chữ đ:',
      'dd → đ',
    ],
    keys: 'd d i',
    target: 'đi', // "go"
  },
  {
    title: 'Ghép tất cả lại!',
    // "Put it all together — type a full word with a hat AND a tone."
    lines: [
      'Giỏi lắm! Giờ gõ một từ đầy đủ:',
      'có mũ VÀ có dấu.',
    ],
    keys: 'b e e s',
    target: 'bế', // "to carry (a child)"
  },
  {
    title: 'Dấu cách giữa hai từ',
    // "The space bar! A phrase is several words. Press the long SPACE bar to
    //  leave a gap between them. Note: tones belong to their own word."
    lines: [
      'Nhiều từ ghép lại thành một câu.',
      'Nhấn thanh DÀI (SPACE) để cách từ.',
      'Mỗi từ có dấu riêng của nó!',
    ],
    keys: 'c o n ␣ g a f',
    target: 'con gà', // "the chicken" — also a real tier-3 phrase in skills.js
  },
  {
    title: 'Luyện câu dài hơn',
    // "A longer phrase: hats, hooks and a space all in one. Take your time."
    lines: [
      'Một câu dài hơn: có mũ, có móc,',
      'và có dấu cách. Cứ gõ từ từ nhé!',
    ],
    keys: 'b a ␣ d d i ␣ c h o w i',
    target: 'ba đi chơi', // "dad goes out to play"
  },
  {
    title: 'Sẵn sàng chiến đấu!',
    // "You're ready! Type the word above each monster to attack. Clean typing
    //  builds a combo for extra power. Good luck, hero!"
    lines: [
      'Bạn đã sẵn sàng! ⚔️',
      'Gõ đúng từ (hoặc câu) trên đầu quái vật.',
      'Gõ sạch để lên COMBO — mạnh hơn!',
      'Chúc may mắn, anh hùng nhỏ! 🌟',
    ],
    target: null,
  },
];

// Vertical breathing room inside a text plate, above and below the font box.
const PLATE_PAD = 3;

// Line pitch for the explanation lines. An 18px plate is now ~26px tall
// (1.2 ascent + 18.8 descent + 2*3 pad), so the pitch has to clear that with a
// visible gap — at the old 30px the plates stacked edge-to-edge into one slab.
const LINE_PITCH = 34;

// Practice-card internals, measured from the card's top edge.
//
// `drawText` uses textBaseline='top', so ink starts `fontBoundingBoxAscent`
// ABOVE the given y — 37px at size 44. The 16px label draws at +14 and its ink
// ends at +19, so the word's y must be at least 19 + 37 for the glyphs to clear
// it. The old formula put it at +30, which is why "mèo" overlapped the label and
// poked out above the card. +70 clears the label with room to spare and leaves
// the word visually centred between the label and the chip row, which sits
// CHIP_ROW_BOTTOM_GAP above the bottom of a CARD_H-tall card.
const WORD_TOP = 70;
// The chip row's active key wears a glow ring (+4px) and a bouncing ▼ pointer
// that reaches ~20px above the chip, so the row needs clearance above it that
// the old 158px card didn't have — at 158 the arrow reached up into the 44px
// target word's descenders. 186 keeps the word, the pointer and the chips as
// three visually separate bands.
const CARD_H = 186;
const CHIP_ROW_BOTTOM_GAP = 14;
const CHIP_H = 26; // key-hint chip size; also the height of the solved-flourish row

export class Tutorial {
  constructor() {
    this.reset();
  }

  reset() {
    this.step = 0;
    this.buffer = newBuffer();
    this.done = false;      // main.js reads this to leave the tutorial
    this.solved = false;    // current lesson's target has been typed
    this.solvedTimer = 0;   // frames since solved (for the "correct!" flourish)
    this.mistake = false;
    // How many of the lesson's hint keys have been typed correctly. This is the
    // NEXT key to press, so the chip row can spotlight exactly one key — a kid
    // hunting for the letter on the keyboard needs "press THIS one now", not a
    // row of eight equally-bright chips they have to count through themselves.
    // Counted from keystrokes, not from the target's matched chars: the two
    // differ whenever Telex spends several keys on one char (m-e-o-f -> "mèo").
    this.keyIndex = 0;
    this.tick = 0;
  }

  get lesson() {
    return LESSONS[this.step];
  }

  // How many leading chars of the target the current buffer matches.
  // Telex-aware: an untoned/unshaped vowel counts as matching its eventual
  // toned/shaped char, since the tone/shape key is typed AFTER the vowel
  // (c-a-s -> "cá"). So intermediate "ca" already matches 2 chars of "cá"
  // instead of flagging the "a" as wrong. Mirrors input.js's TypingTracker.
  _matchedLen(cur, target) {
    return telexPrefixLen(cur, target);
  }

  // Advance to the next lesson, or finish the tutorial on the last one.
  _advance() {
    if (this.step + 1 >= LESSONS.length) {
      this.done = true;
      return;
    }
    this.step++;
    this.buffer = newBuffer();
    this.solved = false;
    this.solvedTimer = 0;
    this.mistake = false;
    this.keyIndex = 0;
    Audio.confirm();
  }

  // Feed a raw key. Returns nothing; updates internal state.
  // SPACE advances read-only slides and (once solved) practice lessons.
  // ESC-style skip is handled in main.js.
  handleKey(key) {
    const lesson = this.lesson;

    // Read-only slide, or a solved practice lesson: SPACE moves on.
    if (!lesson.target || this.solved) {
      if (key === ' ' || key === 'Spacebar') this._advance();
      return;
    }

    // Run the key through the shared Telex typing primitive — the SAME logic
    // gameplay uses (backspace, auto-restart, mistake/complete detection). This
    // tutorial only layers on its own feedback: audio cues and the drawing
    // flags (`solved`, `mistake`) the practice card reads.
    const r = stepKey(this.buffer, key, lesson.target);
    if (!r.consumed) return; // ignored non-printable key
    this.buffer = r.buffer;

    if (key === 'Backspace') {
      this.mistake = false;
      this.keyIndex = Math.max(0, this.keyIndex - 1);
      return;
    }

    // Track which hint key to spotlight next. A correct key steps forward; a
    // retype-from-scratch (stepKey's auto-restart) snaps back to "one key in",
    // since the kid is now on their first keystroke again; a plain mistake holds
    // the spotlight where it is, so the chip they still need to press keeps
    // glowing instead of running ahead of them.
    if (r.restarted) this.keyIndex = 1;
    else if (!r.mistake) this.keyIndex++;

    if (r.complete) {
      this.solved = true;
      this.solvedTimer = 0;
      this.mistake = false;
      Audio.victory();
      return;
    }

    this.mistake = r.mistake;
    if (this.mistake) Audio.keyError();
    else Audio.keyBlip(r.matchedLen);
  }

  update() {
    this.tick++;
    if (this.solved) this.solvedTimer++;
  }

  // -------------------------------------------------------------------------
  // Drawing
  // -------------------------------------------------------------------------
  draw(ctx, W, H) {
    const tick = this.tick;
    const groundY = H - 90;

    // Reuse the desert backdrop so the tutorial feels part of the world.
    drawScene(ctx, W, H, groundY);
    drawSprite(ctx, SUN, 0, 50, 40, 3);
    const c1 = (tick * 0.3) % (W - 260) + 240;
    drawSprite(ctx, CLOUD, 0, c1, 60, 3);
    drawSprite(ctx, CLOUD, 0, (tick * 0.2) % (W - 320) + 300, 110, 2);
    const foot = (s, sc) => groundY - s.h * DOT * sc;
    drawSprite(ctx, CACTUS, 0, W * 0.20, foot(CACTUS, 2), 2);
    drawSprite(ctx, BUSH, 0, W * 0.88, foot(BUSH, 2), 2);

    // A friendly hero on the left "teaching" the lesson.
    drawSprite(ctx, SPRITES.hero_knight, Math.floor(tick / 12) % 2, W * 0.10, foot(SPRITES.hero_knight, 2.4), 2.4);

    const lesson = this.lesson;

    // Header: "HƯỚNG DẪN" + progress dots.
    this._plate(ctx, W / 2, 34, 'HƯỚNG DẪN', 24);
    drawText(ctx, 'HƯỚNG DẪN', W / 2, 38, 24, '#ffe08a', 'center');
    this._drawProgress(ctx, W, 74);

    // Lesson title. At 30px its plate reaches ~32px above the baseline-top, so
    // it has to sit far enough below the progress dots (which end at y=78) not
    // to cover them.
    this._plate(ctx, W / 2, 108, lesson.title, 30);
    drawText(ctx, lesson.title, W / 2, 110, 30, '#ffffff', 'center');

    // Explanation lines.
    let ly = 158;
    for (const line of lesson.lines) {
      this._plate(ctx, W / 2, ly, line, 18);
      drawText(ctx, line, W / 2, ly + 2, 18, '#bfe8ff', 'center');
      ly += LINE_PITCH;
    }

    // The practice card, and just below it the "Press SPACE" advance prompt so
    // it sits right under the box where the kid is already looking.
    if (lesson.target) {
      const cardBottom = this._drawPractice(ctx, W, H, lesson, ly + 6);
      this._drawAdvancePrompt(ctx, W, lesson, cardBottom + 24);
    } else {
      // Read-only slide (no card): prompt sits just below the last text line.
      this._drawAdvancePrompt(ctx, W, lesson, ly + 8);
    }

    // Footer hint.
    this._drawFooter(ctx, W, H, lesson);
  }

  // The interactive practice card: the target word, a key hint, and a live
  // preview of what the kid has typed so far (colored by correctness).
  // Returns the y just below the card's outer bottom edge (for placing the
  // advance prompt right under the box).
  _drawPractice(ctx, W, H, lesson, y) {
    const cx = W / 2;

    // Phrase targets ("ba đi chơi") are much wider than single words, so the
    // word size shrinks and the card grows to fit — both clamped to the screen
    // so nothing spills off a narrow window.
    const size = lesson.target.length > 8 ? 34 : 44;
    ctx.font = `${size}px "PixelFont", monospace`;
    const textW = ctx.measureText(lesson.target).width;
    const chips = lesson.keys ? this._chipMetrics(lesson.keys) : null;
    const cardW = Math.min(
      W - 40,
      Math.max(460, textW + 80, chips ? chips.totalW + 60 : 0),
    );
    const cardH = CARD_H;
    const cardX = cx - cardW / 2;
    drawRect(ctx, cardX - 3, y - 3, cardW + 6, cardH + 6, '#1a1423');
    drawRect(ctx, cardX, y, cardW, cardH, '#2b2740');
    drawRect(ctx, cardX, y, cardW, 4, this.solved ? '#5fc23c' : '#f2c53d');

    // Label: "Type this word:" for one word, "Type this phrase:" for a phrase.
    const label = lesson.target.includes(' ') ? 'Gõ cụm này:' : 'Gõ từ này:';
    drawText(ctx, label, cx, y + 14, 16, '#cfc8dd', 'center');

    // Big target word, letters lit green as the kid matches them.
    // The per-char advance MUST be measured with the word's own font: drawText()
    // above left the context at the label's 16px, and measuring at that size
    // advances ~9.6px instead of ~26.4px, stacking the letters on top of each
    // other. Set the font once before the loop and never let it drift.
    const cur = render(this.buffer);
    const matched = this._matchedLen(cur, lesson.target);
    ctx.font = `${size}px "PixelFont", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let dx = cx - textW / 2;
    // Sit the word below the label rather than centering a `size`-tall box: the
    // old `y + 46 - size/2 + 6` assumed the glyphs were only `size` px tall, so
    // at 44px the ink started 7px ABOVE the card's top edge and ran through the
    // label. WORD_TOP is measured from the card top, below the 16px label.
    const wy = y + WORD_TOP;
    for (let i = 0; i < lesson.target.length; i++) {
      const ch = lesson.target[i];
      const chW = ctx.measureText(ch).width;
      let color = '#f4f4f4';
      if (this.solved) color = '#7fe66a';
      else if (i < matched) color = '#5fc23c';
      else if (this.mistake && i === matched) color = '#ff6a5a';
      // A space is invisible, so draw the gap the kid must type as a small
      // underscore bar — otherwise "con gà" reads as one blank stretch and
      // there is no visual cue that SPACE is a keystroke of its own.
      // Underline the letter being worked on right now, in the same gold as the
      // active key chip — so the word and the chip row point at the same thing
      // and the kid can read "this letter comes from this key" off the card.
      // Kept tight under the glyphs (not at +size+4): lower down it collided
      // with the chip row's ▼ pointer and the two gold marks merged into one
      // unreadable smudge.
      const isCursor = !this.solved && !this.mistake && i === matched;
      if (isCursor) {
        drawRect(ctx, dx + 2, wy + size * 0.95, Math.max(6, chW - 4), 4, '#ffe08a');
      }
      if (ch === ' ') {
        const barW = Math.max(6, chW - 6);
        drawRect(ctx, dx + 3, wy + size * 0.72, barW, 4, i < matched ? '#5fc23c' : '#6b6490');
      } else {
        ctx.fillStyle = color;
        ctx.fillText(ch, dx, wy);
      }
      dx += chW;
    }

    // Key-hint chips: the raw keys to press, e.g. m e o f. A '␣' token becomes
    // a wide SPACE bar chip so the space key looks like the real keyboard key.
    //
    // Exactly ONE chip is the "press this now" chip — the kid is hunting for a
    // letter on a keyboard they can't touch-type yet, so the row has to point at
    // a single key. Already-typed chips go dim green (done, don't look here),
    // the next one is bright gold, lifted, and pulsing under a bouncing arrow,
    // and later ones stay dim so they read as "not yet".
    if (lesson.keys && !this.solved) {
      let kx = cx - chips.totalW / 2;
      const ky = y + cardH - CHIP_ROW_BOTTOM_GAP - chips.chip;
      const next = this.keyIndex;
      for (let i = 0; i < chips.keys.length; i++) {
        const k = chips.keys[i];
        const isSpace = k === '␣';
        const w = isSpace ? chips.spaceW : chips.chip;
        const isNext = i === next;
        const isDone = i < next;

        // The active chip breathes and sits a couple of px proud of the row, so
        // it's findable by motion alone — a kid scanning the keyboard catches
        // movement in the corner of their eye faster than a color change.
        const pulse = isNext ? (Math.sin(this.tick * 0.18) + 1) / 2 : 0;
        const lift = isNext ? 2 + Math.round(pulse * 2) : 0;
        const cy = ky - lift;

        let body = '#4a4470';
        let cap = '#f2c53d';
        let ink = '#fff4d6';
        if (isDone) { body = '#2f5233'; cap = '#5fc23c'; ink = '#9fd68e'; }
        else if (isNext) { body = '#7a6a1e'; cap = '#ffe08a'; ink = '#fffbe8'; }
        else { ink = '#a49dc4'; cap = '#8a7a3a'; }

        if (isNext) {
          // Glow ring + bouncing pointer above the key to press.
          drawRect(ctx, kx - 4, cy - 4, w + 8, chips.chip + 8, '#ffe08a');
          drawRect(ctx, kx - 2, cy - 2, w + 4, chips.chip + 4, '#1a1423');
          const bob = Math.round(pulse * 3);
          drawText(ctx, '▼', kx + w / 2, cy - 16 - bob, 14, '#ffe08a', 'center');
        }
        drawRect(ctx, kx, cy, w, chips.chip, body);
        drawRect(ctx, kx, cy, w, 3, cap);
        drawText(ctx, isSpace ? 'SPACE' : k.toUpperCase(), kx + w / 2, cy + 6, isSpace ? 13 : 15, ink, 'center');
        kx += w + chips.gap;
      }
    }

    // Solved flourish: a green "Đúng rồi! ✓" ("Correct!") that pops in.
    if (this.solved) {
      const pop = Math.min(1, this.solvedTimer / 8);
      const s = 26 + (1 - pop) * 10;
      // Anchored to the chip row's slot (not the word), so it lands in the same
      // place regardless of the target's font size. The pop starts at 36px and
      // settles to 26px, and ink rises with the size — so grow it about the
      // row's CENTRE, otherwise the first popped frames reach up into the word.
      const rowMid = cardH - CHIP_ROW_BOTTOM_GAP - CHIP_H / 2;
      drawText(ctx, '✓ Đúng rồi!', cx, y + rowMid - s / 2, Math.round(s), '#7fe66a', 'center');
    }
    return y + cardH + 3; // outer bottom edge of the card
  }

  // Measure the key-hint chip row. A '␣' token renders as a wider SPACE bar,
  // so the row's total width has to account for it before the card is sized.
  _chipMetrics(keysStr) {
    const keys = keysStr.split(' ');
    const chip = CHIP_H;
    const gap = 8;
    const spaceW = 54;
    const totalW =
      keys.reduce((w, k) => w + (k === '␣' ? spaceW : chip), 0) +
      (keys.length - 1) * gap;
    return { keys, chip, gap, spaceW, totalW };
  }

  // The blinking "Press SPACE to continue/keep learning" prompt, drawn right
  // below the practice box (at `y`) where the kid is already looking.
  // Only shown when SPACE actually advances: read-only slides, or solved practice.
  _drawAdvancePrompt(ctx, W, lesson, y) {
    if (lesson.target && !this.solved) return; // still practicing — no advance yet
    if (this.tick % 60 >= 40) return;          // blink
    const msg = lesson.target
      ? '▶ Nhấn SPACE để học tiếp'    // "Press SPACE to keep learning"
      : '▶ Nhấn SPACE để tiếp tục';   // "Press SPACE to continue"
    this._plate(ctx, W / 2, y, msg, 18);
    drawText(ctx, msg, W / 2, y + 3, 18, '#ffe08a', 'center');
  }

  _drawFooter(ctx, W, H, lesson) {
    // While practicing: steady instruction at the bottom (no blink).
    if (lesson.target && !this.solved) {
      // On phrase lessons the space bar is a typing key (not "continue"), so say
      // so explicitly — otherwise SPACE reads as the advance key it is elsewhere.
      const msg = lesson.target.includes(' ')
        ? 'Nhấn SPACE để cách giữa hai từ' // "Press SPACE for the gap between the two words"
        : 'Gõ chữ trên bàn phím để luyện tập'; // "Type on the keyboard to practice"
      // 16px plates are ~24px tall, so the two footer rows need >24px between
      // them — at the old H-54 / H-28 they sat 2px apart and read as one bar.
      this._plate(ctx, W / 2, H - 62, msg, 16);
      drawText(ctx, msg, W / 2, H - 59, 16, '#fff4d6', 'center');
    }
    // Always-visible skip hint.
    this._plate(ctx, W / 2, H - 30, 'Nhấn ESC để bỏ qua hướng dẫn', 16);
    drawText(ctx, 'Nhấn ESC để bỏ qua hướng dẫn', W / 2, H - 27, 16, '#cfc8dd', 'center');
  }

  // Row of dots showing lesson progress.
  _drawProgress(ctx, W, y) {
    const n = LESSONS.length;
    const gap = 16;
    const totalW = (n - 1) * gap;
    let x = W / 2 - totalW / 2;
    for (let i = 0; i < n; i++) {
      const on = i <= this.step;
      drawRect(ctx, x - 4, y - 4, 8, 8, '#1a1423');
      drawRect(ctx, x - 3, y - 3, 6, 6, on ? '#ffe08a' : '#5a5470');
      x += gap;
    }
  }

  // Dark plate behind text for legibility over the bright sky.
  //
  // Height comes from the FONT's own box, not from `size`: text is drawn with
  // textBaseline='top' at y+2, and Vietnamese stacks tone marks above the
  // letter and descenders below it, so real ink reaches ~size px past the top
  // (18px text measures ~17.2px of descent, 30px measures ~28.6px). Sizing the
  // plate as `size + 10` from `y - 4` left ~4px of slack, so consecutive lines
  // 30px apart ran their plates into each other's diacritics as one dark slab.
  _plate(ctx, cx, y, text, size) {
    ctx.font = `${size}px "PixelFont", monospace`;
    const m = ctx.measureText(text);
    const w = m.width;
    // Fall back to the old estimate where the box metrics aren't available.
    const asc = m.fontBoundingBoxAscent ?? 2;
    const desc = m.fontBoundingBoxDescent ?? size;
    const top = y + 2 - asc - PLATE_PAD;
    const h = asc + desc + PLATE_PAD * 2;
    drawRect(ctx, cx - w / 2 - 10, top, w + 20, h, 'rgba(20,18,32,0.72)');
  }
}
