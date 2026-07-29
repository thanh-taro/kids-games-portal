// questbox.js — the bottom panel: the formula and the four answer cards.
//
// This is the single surface the kid actually touches, so it owns the strictest
// rules in the game:
//
//  * TAP TARGETS COME FIRST. Cards are sized from the available box, never from
//    a fixed pixel constant, and never shrink below MIN_CARD px on their short
//    edge — roughly a child's fingertip on a phone. If the box is too short for
//    four comfortable cards in a row, they go 2×2 rather than getting thinner.
//  * THE FORMULA IS THE BIGGEST TEXT ON SCREEN. It is what the kid is here to
//    read. Its size is derived from the box, then clamped so a long Hardest
//    expression like "(137 + 2) × 7" still fits the width.
//  * FEEDBACK IS UNMISSABLE AND SHORT. A wrong tap flashes that card red and
//    pulses the CORRECT one green, because a kid who never sees the right
//    answer learns nothing from the mistake. The reveal is brief — this is a
//    shooter, and the ship is under fire while it plays.
//  * NO LAYOUT STATE. `layout()` is pure: same metrics in, same rects out. Both
//    drawing and hit-testing call it, so what the kid sees and what they hit can
//    never drift apart. (Two code paths computing card rects independently is
//    exactly how a game ends up with a card that looks tappable and isn't.)

import {
  fillRoundRect, strokeRoundRect, drawText, drawTextBold, drawRect,
} from './render.js';

const MIN_CARD = 56;      // px — the smallest short edge a card may have
// ...and the largest. A tap target stops getting easier once it is comfortably
// bigger than a fingertip; beyond that the extra size just crowds the formula and
// makes the numbers absurd. See the note in layout().
//
// Reduced from 190x118 once the quest box itself came down to 75% height: at the old
// caps the cards still filled the entire card area, so there was only 10px of screen
// below them and the row read as jammed against the bottom edge.
const MAX_CARD_W = 168;
const MAX_CARD_H = 92;
const GAP = 10;           // px between cards

// Clear space held below the answer row, INSIDE the quest box.
//
// This is an explicit inset rather than a consequence of the card caps, because
// relying on a cap to create the gap only works while that cap is the binding
// constraint: on a short landscape phone the cards are already smaller than every
// cap, so shrinking the caps bought exactly 0px there. Subtracting the inset from
// the card area first means the gap exists at every window size, and the cards give
// up the height for it.
// It SCALES DOWN on a short box rather than being a flat 18px. On a landscape phone
// the box is at its 143px floor, and taking a flat inset out of that pushed the cards
// to exactly MIN_CARD (56) — tappable by this file's own definition, but with zero
// margin. Proportional to the card area means the gap is generous where there is room
// and modest where there is not.
const BOTTOM_INSET_MAX = 18;
function bottomInset(cardsAreaH) {
  return Math.round(Math.min(BOTTOM_INSET_MAX, cardsAreaH * 0.16));
}

// Answer-card palette. Deliberately cool and low-saturation at rest so the
// warm reds of the monsterships stay the most urgent thing on screen; the
// feedback states are the only saturated colors down here.
const CARD = {
  face: '#241d4a',
  faceHi: '#31276b',       // hover/keyboard focus
  edge: '#4b3f8f',
  text: '#f2eeff',
  right: '#2fbf9f',
  rightEdge: '#7fffd4',
  wrong: '#e0503a',
  wrongEdge: '#ff9d8a',
  dim: '#6b64a0',
};

export class QuestBox {
  constructor() {
    this.quest = null;
    this.focus = 0;          // keyboard focus index
    this.hover = -1;
    this.locked = false;     // true during feedback, so a kid can't double-tap
    this.reveal = 0;         // seconds left on the feedback flash
    this.pickedIndex = -1;
    this.pickedRight = false;
    this.pulse = 0;          // grows while a quest is unanswered, for urgency
  }

  setQuest(q) {
    this.quest = q;
    this.locked = false;
    this.reveal = 0;
    this.pickedIndex = -1;
    this.pulse = 0;
    // Keep keyboard focus in range if the option count ever changes.
    if (this.focus >= q.options.length) this.focus = 0;
  }

  update(dt) {
    this.pulse += dt;
    if (this.reveal > 0) {
      this.reveal -= dt;
      if (this.reveal <= 0) {
        this.reveal = 0;
        this.locked = false;
      }
    }
  }

  // Show feedback for a pick. `correct` decides the flash color; the correct
  // card is always highlighted so a wrong answer still teaches.
  showResult(index, correct) {
    this.pickedIndex = index;
    this.pickedRight = correct;
    this.locked = true;
    // A correct answer clears fast (keep the fight moving); a wrong one lingers
    // a beat longer so the kid actually reads the right answer.
    this.reveal = correct ? 0.28 : 0.75;
  }

  // ------------------------------------------------------------------------
  // Layout. PURE — the single source of truth for both drawing and hit-testing.
  // Returns {formula:{...}, cards:[{x,y,w,h}], cols}.
  // ------------------------------------------------------------------------
  layout(m) {
    const n = this.quest ? this.quest.options.length : 4;
    const padX = Math.max(12, m.w * 0.03);
    const boxX = padX;
    const boxW = m.w - padX * 2;
    const boxY = m.questTop;
    const boxH = m.questH;

    // The formula gets the top third of the box, the cards the rest.
    const formulaH = Math.max(34, Math.min(boxH * 0.34, 92));
    const cardsY = boxY + formulaH + GAP;
    const rawCardsH = boxH - formulaH - GAP * 2;
    const cardsH = rawCardsH - bottomInset(rawCardsH);

    // One row if the cards can stay comfortable; otherwise 2×2. Deciding by
    // MEASURED card size rather than a screen-width breakpoint means an odd
    // window (a short landscape phone) gets the right answer too.
    let cols = n;
    let cw = (boxW - GAP * (n - 1)) / n;
    let ch = cardsH;
    if (cw < MIN_CARD * 1.35 || ch < MIN_CARD) {
      cols = 2;
      const rows = Math.ceil(n / 2);
      cw = (boxW - GAP) / 2;
      ch = (cardsH - GAP * (rows - 1)) / rows;
    }

    // CARDS HAVE A MAXIMUM SIZE, not just a minimum.
    //
    // MIN_CARD stops them shrinking below a fingertip. But stretching to fill the
    // box meant a fullscreen desktop window produced cards ~340x180 with numbers
    // the height of a fist — comically large, and they pushed the formula and the
    // play field around for no benefit. A tap target stops improving once it is
    // comfortably bigger than a finger; past that, extra pixels are waste.
    //
    // Once capped, the row is CENTRED in the box (and the block vertically
    // centred in the card area) so the leftover space is symmetric rather than
    // dumping the cards against one edge.
    cw = Math.min(cw, MAX_CARD_W);
    ch = Math.min(ch, MAX_CARD_H);

    const rows = Math.ceil(n / cols);
    const rowW = cols * cw + GAP * (cols - 1);
    const blockH = rows * ch + GAP * (rows - 1);
    const startX = boxX + (boxW - rowW) / 2;
    const startY = cardsY + Math.max(0, (cardsH - blockH) / 2);

    const cards = [];
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      cards.push({
        x: startX + c * (cw + GAP),
        y: startY + r * (ch + GAP),
        w: cw,
        h: ch,
      });
    }

    return {
      box: { x: boxX, y: boxY, w: boxW, h: boxH },
      formula: { x: boxX, y: boxY + GAP * 0.5, w: boxW, h: formulaH },
      cards,
      cols,
    };
  }

  // Which card is at (px, py)? -1 for none. Uses the same layout() as draw().
  hitTest(m, px, py) {
    if (!this.quest) return -1;
    const { cards } = this.layout(m);
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) return i;
    }
    return -1;
  }

  // ------------------------------------------------------------------------
  // Draw
  // ------------------------------------------------------------------------
  draw(ctx, m, opts = {}) {
    const L = this.layout(m);

    // Panel backing — a solid plate, not a translucent one. The play field
    // above is busy with tracers and explosions; the kid needs the reading
    // area to be visually quiet and clearly separate.
    drawRect(ctx, 0, m.questTop - 3, m.w, m.h - m.questTop + 3, '#0d0a20');
    drawRect(ctx, 0, m.questTop - 3, m.w, 3, '#4b3f8f');

    if (!this.quest) return;

    // --- the formula ---
    const f = L.formula;
    // Size from the box, then shrink to fit the width — a long Hardest
    // expression must never run off the edge or clip.
    // Capped in px for the same reason the cards are: past ~54px the formula is
    // not more readable, it just eats the box. It still shrinks below that
    // whenever a long Hardest expression needs the room (the loop below).
    let size = Math.min(f.h * 0.78, m.w * 0.13, 54);
    // The `missing` shapes ("3 + ? = 12", "8 × ? = 24") already carry their own
    // equals sign and question mark, so appending " = ?" produced the nonsense
    // "1 + ? = 4 = ?". Only add the tail when the quest is a plain expression.
    const label = this.quest.text.includes('=')
      ? this.quest.text
      : `${this.quest.text} = ?`;
    ctx.font = `bold ${size}px "PixelFont", monospace`;
    const maxW = f.w * 0.92;
    while (ctx.measureText(label).width > maxW && size > 14) {
      size -= 2;
      ctx.font = `bold ${size}px "PixelFont", monospace`;
    }
    drawTextBold(ctx, label, m.cx, f.y + f.h / 2, size, '#fff4d6', 'center', 'middle');

    // --- the cards ---
    for (let i = 0; i < this.quest.options.length; i++) {
      const c = L.cards[i];
      const isPicked = this.pickedIndex === i;
      const isCorrect = i === this.quest.correctIndex;
      const revealing = this.reveal > 0;

      let face = CARD.face;
      let edge = CARD.edge;
      let edgeW = 3;
      let textColor = CARD.text;

      if (revealing && isCorrect) {
        // The right answer always lights up during feedback.
        face = CARD.right; edge = CARD.rightEdge; edgeW = 5; textColor = '#05201a';
      } else if (revealing && isPicked && !this.pickedRight) {
        face = CARD.wrong; edge = CARD.wrongEdge; edgeW = 5; textColor = '#2a0a06';
      } else if (revealing) {
        // Non-involved cards dim so the two that matter read instantly.
        face = '#1b1638'; textColor = CARD.dim;
      } else if (this.hover === i || (opts.keyboard && this.focus === i)) {
        face = CARD.faceHi; edgeW = 4;
      }

      fillRoundRect(ctx, c.x, c.y, c.w, c.h, 14, face);
      strokeRoundRect(ctx, c.x, c.y, c.w, c.h, 14, edge, edgeW);

      // The number. Sized to the card and clamped so 3-digit answers fit.
      let ns = Math.min(c.h * 0.52, c.w * 0.42);
      const txt = String(this.quest.options[i]);
      ctx.font = `bold ${ns}px "PixelFont", monospace`;
      while (ctx.measureText(txt).width > c.w * 0.78 && ns > 12) {
        ns -= 2;
        ctx.font = `bold ${ns}px "PixelFont", monospace`;
      }
      drawTextBold(ctx, txt, c.x + c.w / 2, c.y + c.h / 2, ns, textColor, 'center', 'middle');

      // Keyboard hint (1-4) in the corner — small, and only when the box is
      // tall enough that it won't crowd the number.
      if (c.h > MIN_CARD * 1.1) {
        drawText(ctx, String(i + 1), c.x + 8, c.y + 6, 13,
          revealing ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.4)');
      }
    }
  }
}
