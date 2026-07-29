// input.js — pointer and keyboard input for the answer cards.
//
// The kid answers by TAPPING one of four cards; that is the primary input and
// everything here is built around it. Keys 1-4 and arrows+Enter exist because
// the portal's design constraints require keyboard accessibility, not to change
// the interaction.
//
// Two things this module exists to get right:
//
//  1. CANVAS-SPACE COORDINATES. The canvas is sized to devicePixelRatio for
//     crispness, so a click's clientX/Y is NOT a canvas coordinate. Every
//     handler converts through the bounding rect. Getting this wrong makes
//     cards that look tappable and aren't — the exact failure questbox.layout()
//     is also written to avoid.
//  2. TOUCH WITHOUT THE DOUBLE-FIRE. A tap on mobile emits touchstart AND a
//     synthetic click ~300ms later. We handle touchstart and preventDefault it,
//     so a single tap is a single answer.

export class InputHandler {
  constructor(canvas) {
    this.canvas = canvas;
    this.onPick = null;      // (index) => void   — a card was chosen
    this.onMove = null;      // (index) => void   — hover moved
    this.onKey = null;       // (key)   => void   — any other key (menus, F9…)
    this.hitTest = null;     // (x, y)  => index  — set by main.js
    this.usingKeyboard = false;
    this._bind();
  }

  // Convert a client point to the game's LOGICAL (CSS px) space — the same
  // space metrics() and every draw call work in.
  //
  // Because main.js scales the context by devicePixelRatio once and then draws
  // in CSS px, the right conversion is against the element's CSS box, NOT the
  // backing-store size. Multiplying by canvas.width/rect.width here would
  // double every coordinate on a 2× display and put every tap one card off.
  toCanvas(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  _bind() {
    const c = this.canvas;

    c.addEventListener('mousemove', (e) => {
      const p = this.toCanvas(e.clientX, e.clientY);
      if (this.onMove && this.hitTest) this.onMove(this.hitTest(p.x, p.y));
    });

    c.addEventListener('mouseleave', () => {
      if (this.onMove) this.onMove(-1);
    });

    c.addEventListener('click', (e) => {
      // Ignore the synthetic click that follows a touch (see below).
      if (this._touchedAt && Date.now() - this._touchedAt < 600) return;
      this.usingKeyboard = false;
      const p = this.toCanvas(e.clientX, e.clientY);
      this._pickAt(p.x, p.y);
    });

    c.addEventListener('touchstart', (e) => {
      this._touchedAt = Date.now();
      this.usingKeyboard = false;
      const t = e.changedTouches[0];
      if (!t) return;
      e.preventDefault(); // kill the follow-up synthetic click
      const p = this.toCanvas(t.clientX, t.clientY);
      this._pickAt(p.x, p.y);
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      // Number keys pick a card directly — the fastest keyboard path.
      if (e.key >= '1' && e.key <= '9') {
        this.usingKeyboard = true;
        if (this.onPick) this.onPick(Number(e.key) - 1);
        return;
      }
      // Arrows move focus, Enter/Space confirms. Handled by main.js via onKey
      // because focus lives in the QuestBox.
      if (this.onKey) this.onKey(e);
    });
  }

  _pickAt(x, y) {
    if (!this.hitTest || !this.onPick) return;
    const i = this.hitTest(x, y);
    if (i >= 0) this.onPick(i);
  }
}
