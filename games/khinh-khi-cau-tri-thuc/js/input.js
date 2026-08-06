// Canvas-only input: converts pointer/touch events to canvas-local
// coordinates and reports taps to a caller-supplied handler. No DOM
// buttons are involved — everything the player can tap is drawn (and
// hit-tested) by the game itself.
export class InputHandler {
  constructor(canvas, onTap) {
    this.canvas = canvas;
    this.onTap = onTap;
    this._lastTouchAt = 0;

    canvas.addEventListener("click", (e) => {
      // Skip the synthetic click that follows a touchstart on mobile so
      // taps don't register twice.
      if (performance.now() - this._lastTouchAt < 600) return;
      this._handle(e.clientX, e.clientY);
    });

    canvas.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        const t = e.changedTouches[0];
        if (!t) return;
        this._lastTouchAt = performance.now();
        this._handle(t.clientX, t.clientY);
      },
      { passive: false }
    );
  }

  _toCanvas(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  _handle(clientX, clientY) {
    const { x, y } = this._toCanvas(clientX, clientY);
    this.onTap(x, y);
  }
}
