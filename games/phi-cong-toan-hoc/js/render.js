// render.js — dot-drawing primitives on a Canvas 2D context.
//
// Everything in the game is drawn as a grid of square "dots". A sprite's
// logical pixel is scaled up to DOT px on screen, giving the chunky retro look.
// Same contract as anh-hung-ban-phim/js/render.js: change DOT to resize the
// entire world at once (entity `scale` values multiply it further).

import { PALETTE } from './sprites.js';

export const DOT = 3; // on-screen size (px) of one sprite pixel at scale 1

// ---------------------------------------------------------------------------
// THE VERTICAL LAYOUT — the one thing every other module measures against.
//
// The game plays in PORTRAIT: monsterships descend from the top, the kid's
// ship holds near the bottom, and the quest box owns the bottom strip. The
// three bands below are fractions of canvas height and are the single source
// of truth for that split — main.js, scenes.js and biomes.js all derive their
// geometry from these rather than hardcoding pixel rows.
//
// Why these numbers: the quest box has to hold a formula line plus four
// tappable answer cards at a size a child can hit on a phone, which is about
// a third of a portrait screen. The ship then sits just above it so the kid's
// eyes travel a short distance between "what am I solving" and "what is my
// ship doing" — the two things they must watch at once.
// ---------------------------------------------------------------------------

// The quest-box trio was scaled to 75% of its original values (0.34 / 300 / 190)
// after the box still read as too tall in play. All three moved together on
// purpose: shrinking only the fraction would have left the box pinned at its 190px
// floor on short windows — the exact case that felt worst — and shrinking only the
// floor would have changed nothing on desktop, where the fraction is what binds.
//
// The height freed goes to the play field, which is where the monsterships are.
// questbox.js's own layout is proportional (formula gets the top ~34%, cards the
// rest, both capped in px), so it absorbed this without further tuning: measured at
// four window shapes, the cards' short edge lands at 109-122px on desktop and
// phone-portrait and 74px in phone-landscape, all comfortably above the MIN_CARD
// fingertip floor of 56.
export const LAYOUT = {
  hudH: 0.07,       // top strip: chapter/stage label, hull + energy meters
  playTop: 0.07,    // enemies spawn just under the HUD and descend
  questFrac: 0.255, // the quest box wants this much height...
  questMax: 225,    // ...but never more than this many px (see metrics)
  questMin: 143,    // ...and never less, or the cards stop being tappable
  shipGap: 26,      // clear px between the ship's sprite and the quest box
};

// Resolve LAYOUT against a concrete canvas size. Call once per frame and pass
// the result down; nothing should recompute these inline.
//
// THE QUEST BOX IS CAPPED IN PIXELS, NOT JUST SCALED BY A FRACTION.
//
// A pure fraction is right on a phone and wrong on a desktop: the box needs
// enough room for a formula line and four fingertip-sized cards, and that is an
// ABSOLUTE requirement of about 190-300px, not a proportion of the window. At
// 34% of a 1400px-tall fullscreen window the box grew to 476px and the answer
// numbers scaled with it — cards the size of a fist, and a play field squeezed
// into the top half. Capping it means extra height on a big screen goes where it
// is actually useful: to the space the monsterships fly through.
//
// The ship is then placed relative to the BOX rather than to the window, so it
// keeps a constant gap above the quest box at every size. Anchoring it to a
// fraction of height (0.62) let it drift down onto the box's top edge on short
// windows and float far above it on tall ones.
//
// shipY MUST clear the TAIL WINGMAN, not just the ship's own hull. The tail
// slot (LINEUP_SLOTS[4], dy: 1.7 * 26px = 44.2px below ship.y) is the deepest
// formation member once every ally is rescued, and at the old shipGap it
// landed only ~6px above the box — closer on any frame where the wingman's
// lag-follow or idle bob pushed it further down. Budgeting the gap from the
// tail ally's own bottom edge (its sprite is 7 rows at scale 1.15) rather than
// the ship's hull is what actually keeps a full team-up clear of the box.
export function metrics(w, h) {
  const questH = Math.round(
    Math.max(LAYOUT.questMin, Math.min(LAYOUT.questMax, h * LAYOUT.questFrac)));
  const questTop = h - questH;

  // The ship sits one gap above the box, and its sprite is ~15 cells tall at
  // scale 1.6 (see Ship.scale), so half of that plus the gap keeps the hull
  // clear of the divider rather than touching it.
  const shipHalf = Math.round(15 * DOT * 1.6 * 0.5);
  // Tail wingman's lowest point, measured from ship.y (see LINEUP_SLOTS +
  // allyShips in main.js): offset 1.7 * 26px down, plus its own half-height
  // (7-row sprite at scale 1.15).
  const tailAllyBottom = Math.round(1.7 * 26 + (7 * DOT * 1.15) / 2);
  const shipY = questTop - LAYOUT.shipGap - Math.max(shipHalf, tailAllyBottom);

  return {
    w, h,
    hudH: Math.round(h * LAYOUT.hudH),
    playTop: Math.round(h * LAYOUT.playTop),
    playBottom: questTop,
    shipY,
    questTop,
    questH,
    cx: Math.round(w / 2),
  };
}

// Draw a single sprite frame at (x, y) in screen pixels.
// scale multiplies DOT; flip=true mirrors horizontally.
// tint (optional): draw every filled pixel in this solid color — used for the
// white hit-flash silhouette.
// Wrap a frame index safely.
//
// JavaScript's % keeps the sign of the dividend, so a negative or NaN index
// yields frames[-1] / frames[NaN] === undefined and the next line throws on
// `.length`. Animation indices come from timers and float math all over the
// game, so this must be defensive rather than assumed: one bad index used to
// take down the whole render loop, which blanks the screen — an animation
// counter should never be able to do that.
function frameAt(sprite, idx) {
  const n = sprite.frames.length;
  const i = Number.isFinite(idx) ? ((Math.floor(idx) % n) + n) % n : 0;
  return sprite.frames[i];
}

export function drawSprite(ctx, sprite, frameIdx, x, y, scale = 1, flip = false, tint = null) {
  const frame = frameAt(sprite, frameIdx);
  const px = DOT * scale;
  for (let row = 0; row < frame.length; row++) {
    const line = frame[row];
    for (let col = 0; col < line.length; col++) {
      const key = line[col];
      if (key === ' ') continue;
      const color = tint || PALETTE[key] || '#2b2b2b';
      const cx = flip ? (sprite.w - 1 - col) : col;
      ctx.fillStyle = color;
      ctx.fillRect(x + cx * px, y + row * px, px, px);
    }
  }
}

// Draw a sprite centered on (x, y) — the natural call for ships and enemies,
// which are positioned by their center rather than a corner.
//
// `rotation` (radians, 0 = the sprite's authored "up" orientation) exists for
// homing shots: every sprite here is drawn nose-up assuming near-vertical
// flight, which is true for every other projectile (vx is a small fan drift,
// never enough to read). A missile that steers hard sideways without rotating
// its sprite still draws nose-up, so a shot flying left reads as a vertical
// bar sliding sideways rather than as something turning to face where it's
// going. Rotation is applied around the sprite's own center via a canvas
// transform so translation math above is untouched.
export function drawSpriteCentered(ctx, sprite, frameIdx, x, y, scale = 1, flip = false, tint = null, rotation = 0) {
  // A missing sprite is a content bug, but it must not blank the screen: the
  // render loop throwing takes the HUD and quest box down with it.
  if (!sprite || !sprite.frames || !sprite.frames.length) return;
  const px = DOT * scale;
  const frame = frameAt(sprite, frameIdx);
  if (rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    drawSprite(ctx, sprite, frameIdx, -(sprite.w * px) / 2, -(frame.length * px) / 2, scale, flip, tint);
    ctx.restore();
  } else {
    drawSprite(ctx, sprite, frameIdx, x - (sprite.w * px) / 2, y - (frame.length * px) / 2, scale, flip, tint);
  }
}

// Draw a filled rectangle (meters, plates, UI panels).
export function drawRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// Rounded rectangle — the answer cards and quest plates. Kept here so the
// whole game rounds corners the same amount.
export function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

export function fillRoundRect(ctx, x, y, w, h, r, color) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}

export function strokeRoundRect(ctx, x, y, w, h, r, color, width = 3) {
  roundRect(ctx, x, y, w, h, r);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

// Text. Sizes are px; the pixel look comes from the dot rendering, not the font.
export function drawText(ctx, text, x, y, size = 16, color = '#f4f4f4', align = 'left', baseline = 'top') {
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.font = `${size}px "PixelFont", monospace`;
  ctx.fillText(text, x, y);
}

// Bold variant for the quest formula and answer numbers — the two things the
// kid actually reads under time pressure.
export function drawTextBold(ctx, text, x, y, size = 16, color = '#f4f4f4', align = 'left', baseline = 'top') {
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.font = `bold ${size}px "PixelFont", monospace`;
  ctx.fillText(text, x, y);
}

// Text on a dark plate — the typing game's legibility rule, carried over:
// HUD/scene text over a bright or busy background gets a dark backing plate
// (#1a1423) with light text (#fff4d6) so it never fights the scenery.
export function drawTextPlate(ctx, text, x, y, size, opts = {}) {
  const padX = opts.padX ?? size * 0.5;
  const padY = opts.padY ?? size * 0.35;
  ctx.font = `${opts.bold ? 'bold ' : ''}${size}px "PixelFont", monospace`;
  const tw = ctx.measureText(text).width;
  const bw = tw + padX * 2;
  const bh = size + padY * 2;
  const bx = opts.align === 'center' ? x - bw / 2 : x;
  fillRoundRect(ctx, bx, y, bw, bh, opts.radius ?? 6, opts.plate ?? 'rgba(26,20,35,0.85)');
  const fn = opts.bold ? drawTextBold : drawText;
  fn(ctx, text, opts.align === 'center' ? x : x + padX, y + padY, size, opts.color ?? '#fff4d6',
     opts.align === 'center' ? 'center' : 'left');
  return { w: bw, h: bh };
}

// A horizontal meter (hull, energy, boss HP, ultimate charge).
export function drawMeter(ctx, x, y, w, h, frac, fill, back = 'rgba(10,8,20,0.7)', border = '#1a1423') {
  const f = Math.max(0, Math.min(1, frac));
  fillRoundRect(ctx, x, y, w, h, h / 2, back);
  if (f > 0) fillRoundRect(ctx, x, y, Math.max(h, w * f), h, h / 2, fill);
  strokeRoundRect(ctx, x, y, w, h, h / 2, border, 2);
}

// Clear the whole canvas to a background color.
export function clear(ctx, w, h, color = '#05030f') {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
}
