// render.js — dot-drawing primitives on a Canvas 2D context.
//
// Everything in the game is drawn as a grid of square "dots". A sprite's
// logical pixel is scaled up to DOT px on screen, giving the chunky retro look.

import { PALETTE } from './sprites.js';

export const DOT = 3; // on-screen size (px) of one sprite pixel at scale 1

// Draw a single sprite frame at (x, y) in screen pixels.
// scale multiplies DOT; flip=true mirrors horizontally (face left).
// tint (optional): draw every filled pixel in this solid color — used for the
// white hit-flash silhouette.
export function drawSprite(ctx, sprite, frameIdx, x, y, scale = 1, flip = false, tint = null) {
  const frame = sprite.frames[frameIdx % sprite.frames.length];
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

// Draw a filled dot-rectangle (for HP bars, ground, UI panels).
export function drawRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// Dotted ground line — a row of dashes like the Dino game.
export function drawGround(ctx, y, width, color = '#5a5a5a') {
  ctx.fillStyle = color;
  for (let x = 0; x < width; x += DOT * 2) {
    ctx.fillRect(x, y, DOT, DOT);
  }
}

// Retro bitmap-ish text using the canvas font (kept simple; the dot aesthetic
// comes from the pixel font set in CSS on the canvas context).
export function drawText(ctx, text, x, y, size = 16, color = '#f4f4f4', align = 'left') {
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.font = `${size}px "PixelFont", monospace`;
  ctx.fillText(text, x, y);
}

// Clear the whole canvas to a background color.
export function clear(ctx, w, h, color = '#f7f7f7') {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
}

// --- Desert scene (blue sky, sandy band, layered dithered ground) ---
// Draws the full pixel-art world backdrop up to groundY (the walking line).
// Everything is snapped to a `cell` grid so it reads as chunky pixel art.
const CELL = 8; // scenery pixel size

function pixel(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
}

export function drawScene(ctx, w, h, groundY) {
  // Sky gradient (two bands of blue, pixel-stepped).
  ctx.fillStyle = '#5fb0e6';
  ctx.fillRect(0, 0, w, groundY - 70);
  ctx.fillStyle = '#79c0ee';
  ctx.fillRect(0, groundY - 70, w, 70);

  // Sand band just above the ground line.
  const sandTop = groundY - 40;
  ctx.fillStyle = '#f6e7a8';
  ctx.fillRect(0, sandTop, w, groundY - sandTop);
  // Dither dots on the sand (checkered darker grains).
  ctx.fillStyle = '#ecd77e';
  for (let y = sandTop; y < groundY; y += CELL) {
    for (let x = ((y / CELL) % 2) * CELL; x < w; x += CELL * 2) {
      ctx.fillRect(x, y, CELL, CELL);
    }
  }

  // Layered ground below the walking line: dirt with a dither seam + dark base.
  ctx.fillStyle = '#c78a3b';
  ctx.fillRect(0, groundY, w, h - groundY);
  // top dither seam of the dirt
  ctx.fillStyle = '#a06a28';
  for (let x = 0; x < w; x += CELL * 2) {
    ctx.fillRect(x, groundY, CELL, CELL);
    ctx.fillRect(x + CELL, groundY + CELL, CELL, CELL);
  }
  // darkest earth at the very bottom
  ctx.fillStyle = '#8a5a20';
  ctx.fillRect(0, h - CELL * 2, w, CELL * 2);
  ctx.fillStyle = '#a06a28';
  for (let x = 0; x < w; x += CELL * 2) {
    ctx.fillRect(x, h - CELL * 2, CELL, CELL);
  }
}
