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
    title: 'Chào mừng!',
    // "Welcome! You type Vietnamese words to attack monsters and rescue the
    //  princess. Let's learn how to type — it's easy!"
    lines: [
      'Bạn gõ chữ Tiếng Việt để đánh quái vật',
      'và cứu công chúa! 🏰',
      'Cùng học gõ chữ nhé — dễ lắm!',
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
    title: 'Sẵn sàng chiến đấu!',
    // "You're ready! Type the word above each monster to attack. Clean typing
    //  builds a combo for extra power. Good luck, hero!"
    lines: [
      'Bạn đã sẵn sàng! ⚔️',
      'Gõ đúng từ trên đầu quái để tấn công.',
      'Gõ sạch để lên COMBO — mạnh hơn!',
      'Chúc may mắn, anh hùng nhỏ! 🌟',
    ],
    target: null,
  },
];

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
      return;
    }

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

    // Lesson title.
    this._plate(ctx, W / 2, 98, lesson.title, 30);
    drawText(ctx, lesson.title, W / 2, 100, 30, '#ffffff', 'center');

    // Explanation lines.
    let ly = 148;
    for (const line of lesson.lines) {
      this._plate(ctx, W / 2, ly, line, 18);
      drawText(ctx, line, W / 2, ly + 2, 18, '#bfe8ff', 'center');
      ly += 30;
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
    const cardW = 460;
    const cardH = 150;
    const cardX = cx - cardW / 2;
    drawRect(ctx, cardX - 3, y - 3, cardW + 6, cardH + 6, '#1a1423');
    drawRect(ctx, cardX, y, cardW, cardH, '#2b2740');
    drawRect(ctx, cardX, y, cardW, 4, this.solved ? '#5fc23c' : '#f2c53d');

    // "Gõ từ này:" label ("Type this word:").
    drawText(ctx, 'Gõ từ này:', cx, y + 14, 16, '#cfc8dd', 'center');

    // Big target word, letters lit green as the kid matches them.
    const cur = render(this.buffer);
    const matched = this._matchedLen(cur, lesson.target);
    const size = 44;
    ctx.font = `${size}px "PixelFont", monospace`;
    const textW = ctx.measureText(lesson.target).width;
    let dx = cx - textW / 2;
    const wy = y + 40;
    for (let i = 0; i < lesson.target.length; i++) {
      let color = '#f4f4f4';
      if (this.solved) color = '#7fe66a';
      else if (i < matched) color = '#5fc23c';
      else if (this.mistake && i === matched) color = '#ff6a5a';
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = `${size}px "PixelFont", monospace`;
      ctx.fillText(lesson.target[i], dx, wy);
      dx += ctx.measureText(lesson.target[i]).width;
    }

    // Key-hint chips: the raw keys to press, e.g. m e o f.
    if (lesson.keys && !this.solved) {
      const keys = lesson.keys.split(' ');
      const chip = 26;
      const gap = 8;
      const totalW = keys.length * chip + (keys.length - 1) * gap;
      let kx = cx - totalW / 2;
      const ky = wy + size + 8;
      for (const k of keys) {
        drawRect(ctx, kx, ky, chip, chip, '#4a4470');
        drawRect(ctx, kx, ky, chip, 3, '#f2c53d');
        drawText(ctx, k.toUpperCase(), kx + chip / 2, ky + 6, 15, '#fff4d6', 'center');
        kx += chip + gap;
      }
    }

    // Solved flourish: a green "Đúng rồi! ✓" ("Correct!") that pops in.
    if (this.solved) {
      const pop = Math.min(1, this.solvedTimer / 8);
      const s = 26 + (1 - pop) * 10;
      drawText(ctx, '✓ Đúng rồi!', cx, wy + size + 10, Math.round(s), '#7fe66a', 'center');
    }
    return y + cardH + 3; // outer bottom edge of the card
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
      const msg = 'Gõ chữ trên bàn phím để luyện tập'; // "Type on the keyboard to practice"
      this._plate(ctx, W / 2, H - 54, msg, 16);
      drawText(ctx, msg, W / 2, H - 51, 16, '#fff4d6', 'center');
    }
    // Always-visible skip hint.
    this._plate(ctx, W / 2, H - 28, 'Nhấn ESC để bỏ qua hướng dẫn', 16);
    drawText(ctx, 'Nhấn ESC để bỏ qua hướng dẫn', W / 2, H - 26, 16, '#cfc8dd', 'center');
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
  _plate(ctx, cx, y, text, size) {
    ctx.font = `${size}px "PixelFont", monospace`;
    const w = ctx.measureText(text).width;
    drawRect(ctx, cx - w / 2 - 10, y - 4, w + 20, size + 10, 'rgba(20,18,32,0.72)');
  }
}
