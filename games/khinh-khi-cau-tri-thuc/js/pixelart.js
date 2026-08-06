// Tiny pixel-art renderer: sprites are defined as grids of palette-index
// strings and drawn as blocky squares scaled up to a chosen pixel size.
// Nothing here loads image files — every sprite is generated from data so
// the whole game ships as plain text.

// Shared UI font: a rounded system-font stack (no network fetch, no bundled
// file) so text reads as playful/game-like instead of generic Arial. Falls
// back gracefully — ui-rounded/SF Pro Rounded on Apple, Segoe UI elsewhere.
export const UI_FONT = 'ui-rounded, "SF Pro Rounded", "Segoe UI", system-ui, sans-serif';

export function drawSprite(ctx, grid, palette, x, y, pixelSize, flipX = false) {
  const rows = grid.length;
  const cols = grid[0].length;
  ctx.save();
  if (flipX) {
    ctx.translate(x + cols * pixelSize, y);
    ctx.scale(-1, 1);
    x = 0;
    y = 0;
  } else {
    ctx.translate(x, y);
    x = 0;
    y = 0;
  }
  for (let r = 0; r < rows; r++) {
    const row = grid[r];
    for (let c = 0; c < cols; c++) {
      const key = row[c];
      if (key === "." || key === " ") continue;
      const color = palette[key];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + c * pixelSize, y + r * pixelSize, pixelSize, pixelSize);
    }
  }
  ctx.restore();
}

export function spriteSize(grid, pixelSize) {
  return { w: grid[0].length * pixelSize, h: grid.length * pixelSize };
}

// --- Generic canvas UI primitives (no HTML/DOM involved) -----------------

export function fillRoundRect(ctx, x, y, w, h, r, color) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// Darkens a "#rrggbb" color by amt (0..1). Used to derive a flat button's
// solid-color "keycap" base from its face color — no gradient, no blur,
// just a second flat shape offset underneath (same technique Duolingo/
// Kahoot use for flat-design pressable buttons).
function darken(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const adjust = (c) => Math.max(0, Math.round(c * (1 - amt)));
  return `rgb(${adjust(r)}, ${adjust(g)}, ${adjust(b)})`;
}

export function strokeRoundRect(ctx, x, y, w, h, r, color, lineWidth = 2) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

// Draws text centered at (cx, cy), shrinking the font size until it fits
// maxWidth, and returns the font size actually used.
export function fitText(ctx, text, cx, cy, maxWidth, startSize, minSize, font) {
  let size = startSize;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  while (size > minSize) {
    ctx.font = `800 ${size}px ${font}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  ctx.fillText(text, cx, cy);
  return size;
}

// A pill-shaped button, flat design: solid fill, optional border, label
// centered inside. A solid-color (not blurred) "keycap" base sits beneath
// it, offset down — that flat 3D-press effect, with zero gradients or
// drop-shadows, is what sells "pressable" without breaking flat design.
// Returns the rect {x, y, w, h} so callers can reuse it for hit-testing.
export function drawButton(ctx, rect, label, { fill, textColor = "#0f172a", font = UI_FONT, fontSize = 20, pressed = false, border = null }) {
  const { x, y, w, h } = rect;
  const offset = pressed ? 4 : 0;
  const baseExtra = 4;
  if (!pressed) {
    // Keycap base: a full rounded pill offset a few px below the face,
    // peeking out beneath it. Its own radius must fit its own height
    // (h/2 from the face would wildly exceed a short strip and render
    // as a pinched/broken shape), so this is a full-height pill, not a
    // thin sliver.
    fillRoundRect(ctx, x, y + baseExtra, w, h, h / 2, darken(fill, 0.25));
  }
  fillRoundRect(ctx, x, y + offset, w, h - offset, h / 2, fill);
  if (border) strokeRoundRect(ctx, x, y + offset, w, h - offset, h / 2, border, 3);
  ctx.fillStyle = textColor;
  fitText(ctx, label, x + w / 2, y + offset + (h - offset) / 2, w - 16, fontSize, 12, font);
  return rect;
}

export function pointInRect(px, py, rect) {
  return rect && px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

// --- Sprite data -----------------------------------------------------

// Hot air balloon, 32x40 grid (2x the detail of the original 16x20) for a
// rounder, smoother envelope silhouette instead of a blocky diamond.
// Palette keys are single chars.
export const BALLOON_FRAMES = [
  [
    "........XXXXXXXXXXXXXXXX........",
    "......XXXXXXXXXXXXXXXXXXXX......",
    "....XXXXXXXXXXXXXXXXXXXXXXXX....",
    "...XXXXXXXXXXXXXXXXXXXXXXXXXX...",
    "..XXXXXXXXXXXXXXXXXXXXXXXXXXXX..",
    ".XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.",
    ".XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.",
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "XXXXXXOOOOXXXXXXXXXXXXOOOOXXXXXX",
    "XXXXXXOOOOOXXXXXXXXXXOOOOOXXXXXX",
    "XXXXXXOOOOOOXXXXXXXXOOOOOOXXXXXX",
    "XXXXXXOOOOOOOXXXXXXOOOOOOOXXXXXX",
    ".XXXXXOOOOOOOOOOOOOOOOOOOOXXXXX.",
    ".XXXXXOOOOOOOOOOOOOOOOOOOOXXXXX.",
    "..XXXXXOOOOOOOOOOOOOOOOOOXXXXX..",
    "..XXXXXXOOOOOOOOOOOOOOOOXXXXXX..",
    "...XXXXXXOOOOOOOOOOOOOOXXXXXX...",
    "....XXXXXXOOOOOOOOOOOOXXXXXX....",
    ".....XXXXXXOOOOOOOOOOXXXXXX.....",
    "......XXXXXXOOOOOOOOXXXXXX......",
    ".......XXXXXXOOOOOOXXXXXX.......",
    "........XXXXXXOOOOXXXXXX........",
    ".........XXXXXXOOXXXXXX.........",
    "..........XXXXXXXXXXXX..........",
    "...........XXXXXXXXXX...........",
    "............XXXXXXXX............",
    ".............XXXXXX.............",
    "..............XXXX..............",
    "...............XX...............",
    "...............XX...............",
    "...............XX...............",
    "...............XX...............",
    "..............XXXX..............",
    ".............XBBBBX.............",
    ".............XBBBBX.............",
    ".............XBBBBX.............",
    ".............XBBBBX.............",
    ".............XBBBBX.............",
    ".............XXXXXX.............",
  ],
  [
    "........XXXXXXXXXXXXXXXX........",
    "......XXXXXXXXXXXXXXXXXXXX......",
    "....XXXXXXXXXXXXXXXXXXXXXXXX....",
    "...XXXXXXXXXXXXXXXXXXXXXXXXXX...",
    "..XXXXXXXXXXXXXXXXXXXXXXXXXXXX..",
    ".XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.",
    ".XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.",
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "XXXXXXOOOOXXXXXXXXXXXXOOOOXXXXXX",
    "XXXXXXOOOOOXXXXXXXXXXOOOOOXXXXXX",
    "XXXXXXOOOOOOXXXXXXXXOOOOOOXXXXXX",
    "XXXXXXOOOOOOOXXXXXXOOOOOOOXXXXXX",
    ".XXXXXOOOOOOOOOOOOOOOOOOOOXXXXX.",
    ".XXXXXOOOOOOOOOOOOOOOOOOOOXXXXX.",
    "..XXXXXOOOOOOOOOOOOOOOOOOXXXXX..",
    "..XXXXXXOOOOOOOOOOOOOOOOXXXXXX..",
    "...XXXXXXOOOOOOOOOOOOOOXXXXXX...",
    "....XXXXXXOOOOOOOOOOOOXXXXXX....",
    ".....XXXXXXOOOOOOOOOOXXXXXX.....",
    "......XXXXXXOOOOOOOOXXXXXX......",
    ".......XXXXXXOOOOOOXXXXXX.......",
    "........XXXXXXOOOOXXXXXX........",
    ".........XXXXXXOOXXXXXX.........",
    "..........XXXXXXXXXXXX..........",
    "...........XXXXXXXXXX...........",
    "............XXXXXXXX............",
    ".............XXXXXX.............",
    "..............XXXX..............",
    "...............XX...............",
    "................X...............",
    "...............XXX..............",
    "...............XX...............",
    "..............XXXX..............",
    ".............XBBBBX.............",
    ".............XBBBBX.............",
    ".............XBBBBX.............",
    ".............XBBBBX.............",
    ".............XBBBBX.............",
    ".............XXXXXX.............",
  ],
];

export function balloonPalette(hue = "warm") {
  const palettes = {
    warm: { X: "#f97316", O: "#fde047", B: "#7c4a2d" },
    cool: { X: "#60a5fa", O: "#22d3ee", B: "#7c4a2d" },
    pink: { X: "#f472b6", O: "#fb7185", B: "#7c4a2d" },
    mint: { X: "#34d399", O: "#a7f3d0", B: "#7c4a2d" },
  };
  return palettes[hue] || palettes.warm;
}

// Small balloon-burst particle piece (used in the burst animation).
export const SHARD_GRID = [
  ["XX", "X."],
  [".X", "XX"],
];

// Cloud, 24x12 grid (2x the detail of the original 12x6) for a rounder,
// puffier silhouette.
export const CLOUD_GRID = [
  "........XXXXXXXX.......",
  ".....XXXXXXXXXXXXXX....",
  "...XXXXXXXXXXXXXXXXXX..",
  "..XXXXXXXXXXXXXXXXXXXX.",
  ".XXXXXXXXXXXXXXXXXXXXXX",
  "XXXXXXXXXXXXXXXXXXXXXXX",
  "XXXXXXXXXXXXXXXXXXXXXXX",
  "XXXXXXXXXXXXXXXXXXXXXXX",
  ".XXXXXXXXXXXXXXXXXXXXX.",
  "..XXXXXXXXXXXXXXXXXXX..",
  "...XXXXXXXXXXXXXXXXX...",
  ".....XXXXXXXXXXXXX.....",
];
export const CLOUD_PALETTE = { X: "#ffffff" };

// Star, 5x5 (background twinkle).
export const STAR_GRID = ["..X..", ".XXX.", "XXXXX", ".XXX.", "..X.."];
export const STAR_PALETTE = { X: "#fef9c3" };

// Sun, 12x12: a solid core with a thin bright rim, drawn during
// morning/noon/afternoon.
export const SUN_GRID = [
  "....XXXX....",
  "..XXXXXXXX..",
  ".XXOOOOOOXX.",
  "XXOOOOOOOOXX",
  "XOOOOOOOOOOX",
  "XOOOOOOOOOOX",
  "XOOOOOOOOOOX",
  "XOOOOOOOOOOX",
  "XXOOOOOOOOXX",
  ".XXOOOOOOXX.",
  "..XXXXXXXX..",
  "....XXXX....",
];
export const SUN_PALETTE = { X: "#fde047", O: "#fbbf24" };

// Moon, 12x12: a crescent (offset inner circle punched out of the disc),
// drawn during evening/midnight.
export const MOON_GRID = [
  "....XXXX....",
  "..XXXXXX....",
  ".XXXXXX.....",
  "XXXXXX......",
  "XXXXX.......",
  "XXXXX.......",
  "XXXXX.......",
  "XXXXX.......",
  "XXXXXX......",
  ".XXXXXX.....",
  "..XXXXXX....",
  "....XXXX....",
];
export const MOON_PALETTE = { X: "#e2e8f0" };

// Sky gradient + season tint. Time-of-day picks the base gradient; season
// contributes a low-alpha overlay wash on top, so this stays 5 base
// gradients + 4 tints (additive) instead of hand-tuning 20 separate
// combinations. Both axes are continuous (fractional time-of-day/season
// position), not discrete indices, so the sky blends smoothly as time
// passes instead of cutting between fixed stops.
const SKY_BY_TIME = [
  { top: "#fbcfe8", bottom: "#fef3c7" }, // morning: soft pink/gold
  { top: "#3b82f6", bottom: "#bae6fd" }, // noon: bright blue (today's default)
  { top: "#60a5fa", bottom: "#fdba74" }, // afternoon: warm orange-blue
  { top: "#4c1d95", bottom: "#c084fc" }, // evening: deep purple
  { top: "#0f172a", bottom: "#1e3a8a" }, // midnight: dark navy
];

const SKY_TINT_BY_SEASON = [
  { color: "#bbf7d0", alpha: 0.08 }, // spring: faint green-yellow
  { color: "#fde68a", alpha: 0.07 }, // summer: faint warm gold
  { color: "#c2410c", alpha: 0.08 }, // autumn: faint orange-brown
  { color: "#bfdbfe", alpha: 0.1 }, // winter: faint cool blue-white
];

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function lerpHex(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

// season: fractional 0..4 position through the year (see calendar.js's
// seasonProgress, added to the integer season index). timeOfDayFloat:
// fractional 0..5 position through the day (calendar.js's timeOfDayFloat).
export function skyPalette(seasonFloat, timeOfDayFloat) {
  const n = SKY_BY_TIME.length;
  const ti = Math.floor(timeOfDayFloat) % n;
  const tf = timeOfDayFloat - Math.floor(timeOfDayFloat);
  const a = SKY_BY_TIME[ti];
  const b = SKY_BY_TIME[(ti + 1) % n];

  const sn = SKY_TINT_BY_SEASON.length;
  const si = Math.floor(seasonFloat) % sn;
  const sf = seasonFloat - Math.floor(seasonFloat);
  const ta = SKY_TINT_BY_SEASON[si];
  const tb = SKY_TINT_BY_SEASON[(si + 1) % sn];

  return {
    top: lerpHex(a.top, b.top, tf),
    bottom: lerpHex(a.bottom, b.bottom, tf),
    overlayColor: lerpHex(ta.color, tb.color, sf),
    overlayAlpha: ta.alpha + (tb.alpha - ta.alpha) * sf,
  };
}
