// scenes.js — every non-gameplay screen, plus the story tableaux.
//
// main.js delegates all non-PLAYING states here. Nothing in this file owns game
// state: each draw function takes (ctx, m, data) and paints. That keeps the
// state machine in one place and makes any scene reachable from __debug.
//
// TWO RULES THIS FILE FOLLOWS
//
//  1. TAP TARGETS ARE RETURNED, NOT REMEMBERED. A scene that draws a button also
//     returns its rect, and main.js hit-tests against what the last frame
//     actually drew. Storing button rects in module state is how a menu ends up
//     with an invisible button that still works (or a visible one that does not).
//  2. TEXT IS MEASURED, NEVER ASSUMED. Vietnamese with diacritics is wider than
//     it looks, and the story lines are authored by hand. Every block of text
//     shrinks to fit its own measured width so a long line can never run off the
//     edge — the typing game shipped that bug and it made a scene unreadable.

import {
  drawText, drawTextBold, fillRoundRect, strokeRoundRect, drawSpriteCentered, drawMeter,
} from './render.js';
import { SPRITES, allySprite, heroSprite } from './sprites.js';
import { ALLY_STORY } from './story.js';
import { ALLIES, LINEUP_SLOTS } from './allies.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

// THE HERO SHIP WEARS ITS RANK IN EVERY SCENE, not just in gameplay.
//
// Rank is the kid's identity, so a ship that showed rank trim in battle and
// reverted to trainee gold on the victory screen would read as two different
// craft — and the victory screen is exactly where a kid looks after ranking up.
//
// This is a module-level DISPLAY preference set by main.js, not game state: the
// rule in this file's header is that no scene owns game state, and threading a
// rank index through eight call sites (six of which are nested inside switch
// cases in drawStoryArt) would put the same value in eight places instead. One
// setter, read through one accessor.
//
// It defaults to 0, so any scene reached without main.js setting it — a preview
// page, a test — still draws a valid ship rather than throwing.
let _rankIndex = 0;
export function setRankIndex(i) {
  _rankIndex = Number.isFinite(i) ? Math.max(0, i | 0) : 0;
}

// The kid's ship at their current rank. Used everywhere the HERO is drawn.
function hero() {
  return heroSprite(_rankIndex);
}

const INK = '#fff4d6';
const DIM = '#9a92c0';
const ACCENT = '#7fe3ff';
const GOLD = '#ffd24a';

// Draw a block of centred lines, shrinking to fit the widest one.
// Returns the y just below the block.
function drawLines(ctx, m, lines, y, size, color = INK, maxFrac = 0.86, lead = 1.5) {
  let s = size;
  const maxW = m.w * maxFrac;
  ctx.font = `${s}px "PixelFont", monospace`;
  let widest = 0;
  for (const ln of lines) widest = Math.max(widest, ctx.measureText(ln).width);
  while (widest > maxW && s > 10) {
    s -= 1;
    ctx.font = `${s}px "PixelFont", monospace`;
    widest = 0;
    for (const ln of lines) widest = Math.max(widest, ctx.measureText(ln).width);
  }
  let cy = y;
  for (const ln of lines) {
    if (ln !== '') drawText(ctx, ln, m.cx, cy, s, color, 'center');
    cy += s * lead;
  }
  return cy;
}

// A big tappable button. Returns its rect so main.js can hit-test it.
function drawButton(ctx, m, label, y, opts = {}) {
  const w = Math.min(opts.w ?? m.w * 0.7, 420);
  const h = opts.h ?? 58;
  const x = m.cx - w / 2;
  const pulse = 0.75 + 0.25 * Math.sin(performance.now() / 320);
  fillRoundRect(ctx, x, y, w, h, 16, opts.fill ?? '#31276b');
  strokeRoundRect(ctx, x, y, w, h, 16, opts.edge ?? GOLD, 4);
  drawTextBold(ctx, label, m.cx, y + h / 2, opts.size ?? 21,
    opts.color ?? `rgba(255,244,214,${pulse.toFixed(2)})`, 'center', 'middle');
  return { x, y, w, h };
}

// ---------------------------------------------------------------------------
// STORY ART — one tableau per `art` name in story.js.
//
// These are drawn with primitives rather than sprites: they are backdrops for
// text, and a scene built from circles and rectangles reads at any size without
// needing 12 more pixel grids. The ships that DO appear use the real sprites so
// the kid recognises them.
//
// Every name in STORY_ART_NAMES must have a case here; verify.js asserts it,
// because a missing one renders as text floating on an empty screen.
// ---------------------------------------------------------------------------

// THE SHARED SCENE BACKDROP, and the one place all 24 call sites get their motion.
//
// This was static: no `t` parameter at all, so every non-gameplay screen — title,
// all 16 story tableaux, victory, failure, credits, the tutorial — was a dead
// photograph. The gameplay starfield (starfield.js) has always drifted, so the
// contrast was worst exactly where a kid spends the most time reading.
//
// TWO MOTIONS, both cheap and both deliberately slow:
//
//   * DRIFT — the whole field creeps downward, wrapping. This is the ship's own
//     motion through space, and it is what makes the screen feel alive rather than
//     paused. Slow (a few px/sec) because these screens carry TEXT: anything fast
//     enough to notice is fast enough to pull the eye off a sentence.
//   * TWINKLE — each star's alpha breathes on its own phase. Per-star phase from
//     the same hash as its position, so no two pulse together and the field never
//     flashes as one sheet.
//
// `t` is optional and defaults to 0, so a caller that forgets it renders exactly
// the old static field instead of throwing — this helper is on the draw path of
// every screen in the game.
function starfield(ctx, m, n, seed, bottom, t = 0) {
  for (let i = 0; i < n; i++) {
    const h1 = ((i * 2654435761 + seed) % 9973) / 9973;
    const h2 = ((i * 40503 + seed) % 7919) / 7919;
    const base = 0.25 + 0.5 * (((i * 131 + seed) % 100) / 100);

    // Drift downward and wrap. Speed varies slightly per star so the field has a
    // hint of depth rather than moving as one rigid sheet.
    const speed = 3 + (i % 7);
    const y = ((h2 * bottom) + t * speed) % bottom;

    // Twinkle: never below half brightness, so a star cannot blink out entirely.
    const tw = 0.72 + 0.28 * Math.sin(t * 1.7 + h1 * 40 + i);
    const a = base * tw;

    ctx.fillStyle = `rgba(210,220,250,${a.toFixed(2)})`;
    ctx.fillRect(h1 * m.w, y, 1 + (i % 5 === 0 ? 1 : 0), 1);
  }
}

// SURFACE FEATURES MARCHING ACROSS A ROTATING WORLD.
//
// Shared by both Earth tableaux (`earth_threatened` and `earth_saved`) so the
// planet cannot spin two different ways in two scenes — the kid sees both inside
// one playthrough. `drawPlanet` in biomes.js does the same job for the in-game
// backdrops; the maths is duplicated there rather than imported because that file
// works in play-field metrics and owns the "scenery must never out-read the fleet"
// clamp, which this does not need.
//
// Each feature fades AND foreshortens toward the limb, because only the visible cap
// of the sphere is on screen: without that, a continent clips at the disc's edge and
// the world reads as a spinning coin rather than a globe.
function rotatingFeatures(ctx, m, opts) {
  const { cx, cy, span, count, t, speed, color, alpha, fw, fh, lift } = opts;
  for (let i = 0; i < count; i++) {
    const dx = (((i / count) * span * 2 + t * speed) % (span * 2)) - span;
    const k = Math.min(1, Math.abs(dx) / span);
    const fade = Math.max(0, 1 - k * k);
    const squash = 0.35 + 0.65 * fade;
    ctx.fillStyle = `rgba(${color},${(alpha * fade).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(cx + dx, cy - lift * (1 - i * 0.013), fw * squash, fh, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function glowCircle(ctx, x, y, r, color, alpha = 0.5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = prev;
}

export function drawStoryArt(ctx, m, art, t, opts = {}) {
  const H = m.h * 0.46;          // the art occupies the upper half
  const cy = H * 0.55;

  // CLIP TO THE ART REGION. Several tableaux deliberately draw shapes bigger
  // than the frame — a planet's `lift` pushes its centre below the art so only
  // the upper curve shows, which is what makes a world read as huge rather than
  // as a ball. Without this clip that circle simply covered the whole canvas and
  // bled behind the narration plate: Earth filled the screen instead of being a
  // horizon. Every tableau draws inside this save/restore.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, m.w, H);
  ctx.clip();

  // Base sky for every tableau.
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#07051a');
  g.addColorStop(1, '#0d0a26');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, m.w, H);

  switch (art) {
    case 'stars_peaceful':
      starfield(ctx, m, 120, 7, H, t);
      // A few warm, bright stars: the galaxy as it was.
      for (let i = 0; i < 5; i++) {
        const x = m.w * (0.16 + i * 0.17);
        glowCircle(ctx, x, cy + Math.sin(i * 1.7) * 30, 46, '#ffd9a0', 0.5);
      }
      break;

    case 'fleet_arrives': {
      starfield(ctx, m, 70, 11, H, t);
      // A descending rank of monsterships, and darkness behind them.
      ctx.fillStyle = 'rgba(6,2,12,0.85)';
      ctx.fillRect(0, 0, m.w, H * 0.4);
      for (let i = 0; i < 5; i++) {
        drawSpriteCentered(ctx, SPRITES.enemy_dart, i % 2,
          m.w * (0.2 + i * 0.15), H * 0.34, 1.1);
      }
      // A star going out on the right.
      glowCircle(ctx, m.w * 0.84, cy + 20, 34, '#ff7a2f', 0.35);
      break;
    }

    case 'earth_threatened': {
      starfield(ctx, m, 60, 3, H, t);
      // Earth as a HORIZON, not a ball: the circle's centre sits well below the
      // art region so only its upper curve is visible, and the radius is tied to
      // the region's own height rather than the canvas width (a wide desktop
      // window otherwise made it swallow the frame).
      const er = H * 1.25;
      const ecy = H + er * 0.72;
      ctx.fillStyle = '#3d7bd6';
      ctx.beginPath();
      ctx.arc(m.cx, ecy, er, 0, Math.PI * 2);
      ctx.fill();
      // THE CONTINENTS ROTATE, for the same reason the in-game planets do (see
      // drawPlanet in biomes.js): this is the kid's first sight of Earth, and a
      // world that stands still is the one piece of space they can tell is wrong.
      //
      // Only the visible cap of the sphere is on screen, so each landmass fades and
      // foreshortens as it nears the limb rather than clipping at the edge.
      rotatingFeatures(ctx, m, {
        cx: m.cx, cy: ecy, span: m.w * 0.5, count: 3, t, speed: 12,
        color: '95,194,60', alpha: 0.32,
        fw: m.w * 0.07, fh: H * 0.06, lift: er * 0.93,
      });
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(m.cx, ecy, er * 0.995, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
      // The fleet, descending toward it.
      for (let i = 0; i < 4; i++) {
        drawSpriteCentered(ctx, SPRITES.enemy_dart, i % 2,
          m.w * (0.24 + i * 0.18), H * 0.26, 1.0);
      }
      break;
    }

    case 'captain_briefing':
      starfield(ctx, m, 40, 5, H, t);
      // The hero ship, lit, facing the reader — the mission being handed over.
      glowCircle(ctx, m.cx, cy, m.w * 0.16, '#7fe3ff', 0.3);
      drawSpriteCentered(ctx, SPRITES.ship_hero, Math.floor(t * 5) % 2, m.cx, cy, 2.4);
      break;

    case 'commander_wreck': {
      starfield(ctx, m, 50, 13, H, t);
      // The boss, broken: drawn tinted dark and tilted.
      ctx.save();
      ctx.translate(m.cx, cy);
      ctx.rotate(0.28);
      drawSpriteCentered(ctx, SPRITES.boss_commander, 0, 0, 0, 1.5, false, '#2a2440');
      ctx.restore();
      // debris
      for (let i = 0; i < 10; i++) {
        const a = i * 0.9;
        ctx.fillStyle = 'rgba(140,60,50,0.6)';
        ctx.fillRect(m.cx + Math.cos(a) * (60 + i * 9), cy + Math.sin(a) * (34 + i * 5), 4, 3);
      }
      drawSpriteCentered(ctx, SPRITES.ship_hero, 0, m.w * 0.2, cy + 30, 1.4);
      break;
    }

    case 'data_shard':
      starfield(ctx, m, 40, 17, H, t);
      // A single glowing shard, held in a beam.
      glowCircle(ctx, m.cx, cy, 70, '#7fe3ff', 0.45);
      ctx.fillStyle = '#7fe3ff';
      ctx.beginPath();
      ctx.moveTo(m.cx, cy - 34);
      ctx.lineTo(m.cx + 18, cy);
      ctx.lineTo(m.cx, cy + 34);
      ctx.lineTo(m.cx - 18, cy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      break;

    case 'gang_reveal':
      starfield(ctx, m, 30, 19, H, t);
      // Many silhouettes at uneven heights — a gang, not a formation.
      for (let i = 0; i < 9; i++) {
        const h = ((i * 131) % 7) / 7;
        drawSpriteCentered(ctx, SPRITES.enemy_dart, i % 2,
          m.w * (0.1 + i * 0.1), H * (0.3 + h * 0.4), 0.9, false, '#3a1420');
      }
      break;

    case 'destroyer_reveal':
      starfield(ctx, m, 24, 23, H, t);
      // The final boss, backlit in its own magenta. Big and centred.
      glowCircle(ctx, m.cx, cy, m.w * 0.3, '#ff2d6f', 0.4);
      drawSpriteCentered(ctx, SPRITES.boss_destroyer, Math.floor(t * 3) % 2, m.cx, cy, 1.6);
      break;

    case 'prisoners': {
      starfield(ctx, m, 40, 29, H, t);
      // Five cages in a row, each lit from inside — five people to go and get.
      const n = 5;
      const cw = Math.min(74, m.w / (n + 2));
      const ch = cw * 0.78;
      for (let i = 0; i < n; i++) {
        const x = m.cx + (i - (n - 1) / 2) * (cw * 1.28) - cw / 2;
        const y = cy - ch / 2;
        ctx.fillStyle = 'rgba(255,210,74,0.16)';
        ctx.fillRect(x, y, cw, ch);
        ctx.strokeStyle = 'rgba(143,138,168,0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, cw, ch);
        for (let b = 1; b < 4; b++) {
          ctx.beginPath();
          ctx.moveTo(x + (b / 4) * cw, y);
          ctx.lineTo(x + (b / 4) * cw, y + ch);
          ctx.stroke();
        }
        glowCircle(ctx, x + cw / 2, y + ch / 2, cw * 0.5, '#ffd24a', 0.22);
      }
      break;
    }

    case 'ally_freed': {
      starfield(ctx, m, 40, 31, H, t);
      // An open cage, and a small ship flying out of it.
      const cw = 96, ch = 74;
      const x = m.cx - cw * 1.2, y = cy - ch / 2;
      ctx.strokeStyle = 'rgba(143,138,168,0.9)';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, cw, ch);
      // the broken door, swung open
      ctx.save();
      ctx.translate(x + cw, y);
      ctx.rotate(-0.6);
      ctx.strokeRect(0, 0, 8, ch);
      ctx.restore();
      glowCircle(ctx, m.cx + 40, cy, 90, '#7fffd4', 0.35);
      // The freed ally's own ship, flying clear of the cage. Drifts right over
      // the page's lifetime so the escape reads as motion, not a still.
      if (opts.allyStyle) {
        const fly = Math.min(1, t * 0.7);
        drawSpriteCentered(ctx, allySprite(opts.allyStyle), Math.floor(t * 6) % 2,
          m.cx + 20 + fly * 46, cy - fly * 14, 1.5);
      }
      break;
    }

    case 'lineup_full':
    case 'lineup_home': {
      starfield(ctx, m, 60, 37, H, t);
      if (art === 'lineup_home') {
        // Home: warm bright stars, and Earth back in frame.
        for (let i = 0; i < 4; i++) {
          glowCircle(ctx, m.w * (0.18 + i * 0.22), H * 0.3, 40, '#ffd9a0', 0.4);
        }
        // Earth again as a horizon — sized from H, not the canvas width, for
        // the same reason as earth_threatened.
        const hr = H * 1.1;
        const hcy = H + hr * 0.82;
        ctx.fillStyle = '#3d7bd6';
        ctx.beginPath();
        ctx.arc(m.cx, hcy, hr, 0, Math.PI * 2);
        ctx.fill();
        // Rotating continents — a bare disc would spin invisibly, which is the same
        // as not spinning at all.
        rotatingFeatures(ctx, m, {
          cx: m.cx, cy: hcy, span: m.w * 0.5, count: 3, t, speed: 12,
          color: '95,194,60', alpha: 0.3,
          fw: m.w * 0.06, fh: H * 0.05, lift: hr * 0.94,
        });
      }
      // The six-ship formation, drawn from ALLIES so it can never disagree with
      // who the kid actually rescued.
      drawLineup(ctx, m, m.cx, cy, ALLIES.map((a) => a.id), 1.5, t);
      break;
    }

    case 'formula_lesson':
      starfield(ctx, m, 30, 41, H, t);
      // The ultimate, as a formula written in light.
      glowCircle(ctx, m.cx, cy, m.w * 0.22, '#ffd24a', 0.4);
      drawTextBold(ctx, '?  ×  ?  =  ★', m.cx, cy, Math.min(48, m.w * 0.1), GOLD, 'center', 'middle');
      break;

    case 'darkstar_close':
      starfield(ctx, m, 20, 43, H, t);
      // Hắc Tinh: a hole with a burning rim. Holes do not glow.
      glowCircle(ctx, m.cx, cy, m.w * 0.34, '#ff2d6f', 0.3);
      ctx.fillStyle = '#0a0208';
      ctx.beginPath();
      ctx.arc(m.cx, cy, m.w * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,45,111,0.7)';
      ctx.lineWidth = 4;
      ctx.stroke();
      break;

    case 'destroyer_defeated': {
      starfield(ctx, m, 50, 47, H, t);
      // The core cracking open — light escaping from inside the dark.
      const pulse = 0.6 + 0.4 * Math.sin(t * 4);
      glowCircle(ctx, m.cx, cy, m.w * 0.3 * pulse, '#ffffff', 0.5);
      ctx.strokeStyle = `rgba(255,255,255,${(0.5 + pulse * 0.4).toFixed(2)})`;
      ctx.lineWidth = 4;
      for (let i = 0; i < 8; i++) {
        const a = i * 0.79;
        ctx.beginPath();
        ctx.moveTo(m.cx + Math.cos(a) * 20, cy + Math.sin(a) * 20);
        ctx.lineTo(m.cx + Math.cos(a) * (70 + i * 8), cy + Math.sin(a) * (70 + i * 8));
        ctx.stroke();
      }
      break;
    }

    case 'stars_relight':
      starfield(ctx, m, 90, 53, H, t);
      // Stars coming back on, staggered in time so it reads as a cascade.
      for (let i = 0; i < 9; i++) {
        const on = Math.max(0, Math.min(1, t * 1.4 - i * 0.28));
        if (on <= 0) continue;
        glowCircle(ctx, m.w * (0.1 + i * 0.1), H * (0.3 + ((i * 37) % 5) / 5 * 0.4),
          20 + on * 26, '#ffd9a0', 0.5 * on);
      }
      break;

    default:
      // A missing tableau is a content bug (verify.js catches it), but the game
      // must still be readable if one slips through — so: plain starfield.
      starfield(ctx, m, 60, 59, H, t);
      break;
  }

  ctx.restore();  // end the art-region clip
}

// The six-ship line-up. Derived from ALLIES/LINEUP_SLOTS so story art, the
// rescue scene, and gameplay can never show a different formation.
export function drawLineup(ctx, m, cx, cy, allyIds, scale, t) {
  drawSpriteCentered(ctx, hero(), Math.floor(t * 5) % 2, cx, cy, scale * 1.1);
  for (const id of allyIds) {
    const ally = ALLIES.find((a) => a.id === id);
    if (!ally) continue;
    const slot = LINEUP_SLOTS[ally.slot];
    if (!slot) continue;
    drawSpriteCentered(ctx, allySprite(ally.style), Math.floor(t * 5 + ally.slot) % 2,
      cx + slot.dx * scale * 26, cy + slot.dy * scale * 26, scale * 0.85);
  }
}

// ---------------------------------------------------------------------------
// STORY SCENE — one page of narration.
// ---------------------------------------------------------------------------

export function drawStoryPage(ctx, m, page, t, opts = {}) {
  // A scene must never be able to kill the render loop — see drawAllyRescue.
  // Entering STORY with an empty page queue (which __debug can do, and which a
  // future chapter with no narration would do) dereferenced `page.art` and took
  // the whole canvas down.
  if (!page) return { next: null };
  drawStoryArt(ctx, m, page.art, t);

  // A dark plate under the text so it reads over any tableau.
  const textTop = m.h * 0.5;
  ctx.fillStyle = 'rgba(10,8,26,0.92)';
  ctx.fillRect(0, textTop - 14, m.w, m.h - textTop + 14);

  const size = Math.min(21, m.w * 0.042);
  drawLines(ctx, m, page.lines, textTop + 16, size, INK, 0.86, 1.65);

  const hint = opts.last ? 'CHẠM ĐỂ TIẾP TỤC ▶' : 'CHẠM ĐỂ ĐỌC TIẾP ▶';
  const btn = drawButton(ctx, m, hint, m.h - 96, { h: 54 });

  // A skip affordance, always available. The typing game's rule: skipping must
  // land exactly where reading would have, so this is never a trap.
  drawText(ctx, 'BỎ QUA (ESC)', m.cx, m.h - 26, 13, DIM, 'center');

  // Page dots, so a kid can see how much is left.
  if (opts.total > 1) {
    const n = opts.total, r = 4, gapd = 14;
    const startX = m.cx - ((n - 1) * gapd) / 2;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i === opts.index ? GOLD : 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(startX + i * gapd, m.h - 116, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return { next: btn };
}

// ---------------------------------------------------------------------------
// TITLE
// ---------------------------------------------------------------------------

const LEVEL_LABELS = {
  easy:    { name: 'Dễ',        desc: 'Cộng/trừ trong phạm vi 10' },
  normal:  { name: 'Thường',    desc: 'Cộng/trừ trong phạm vi 100' },
  hard:    { name: 'Khó',       desc: 'Cộng trừ, nhân chia bảng cửu chương' },
  hardest: { name: 'Siêu Khó',  desc: 'Bốn phép tính trong phạm vi 1000' },
};

export function drawTitle(ctx, m, data, t) {
  starfield(ctx, m, 90, 7, m.h, t);

  const titleSize = Math.min(46, m.w * 0.088);
  drawTextBold(ctx, 'PHI CÔNG TOÁN HỌC', m.cx, m.h * 0.11, titleSize, ACCENT, 'center');
  drawText(ctx, 'Cứu Dải Ngân Hà', m.cx, m.h * 0.11 + titleSize * 0.95,
    Math.min(19, m.w * 0.04), INK, 'center');

  // The ship, flying above the menu.
  drawSpriteCentered(ctx, hero(), Math.floor(t * 5) % 2,
    m.cx, m.h * 0.28, 2.0);

  // Lifetime rank — the long arc. Only shown once the kid has actually played,
  // so a first run is not greeted with a "beginner" label.
  if (data.rank && data.totalCorrect > 0) {
    drawText(ctx, `CẤP BẬC: ${data.rank.name}`, m.cx, m.h * 0.335, 14, GOLD, 'center');
    if (data.rankGoal && data.rankGoal.needCorrect > 0) {
      drawText(ctx, `Còn ${data.rankGoal.needCorrect} câu đúng nữa để lên ${data.rankGoal.rank.name}`,
        m.cx, m.h * 0.335 + 18, 11, DIM, 'center');
    }
  }

  drawText(ctx, 'CHỌN ĐỘ KHÓ', m.cx, m.h * 0.38, 15, DIM, 'center');

  // Difficulty rows — same card language as the answer cards, so the kid meets
  // the game's one interaction pattern before they meet the game.
  const cards = [];
  const cw = Math.min(m.w * 0.84, 460);
  const chh = Math.min(52, m.h * 0.075);
  const gapd = 9;
  let y = m.h * 0.42;
  for (const id of ['easy', 'normal', 'hard', 'hardest']) {
    const sel = id === data.level;
    const x = m.cx - cw / 2;
    fillRoundRect(ctx, x, y, cw, chh, 14, sel ? '#31276b' : '#241d4a');
    strokeRoundRect(ctx, x, y, cw, chh, 14, sel ? '#7fffd4' : '#4b3f8f', sel ? 4 : 3);
    drawTextBold(ctx, LEVEL_LABELS[id].name, x + 16, y + chh / 2, 18, '#f2eeff', 'left', 'middle');
    // The description shrinks to fit — these are long Vietnamese strings.
    let ds = 12;
    ctx.font = `${ds}px "PixelFont", monospace`;
    while (ctx.measureText(LEVEL_LABELS[id].desc).width > cw * 0.62 && ds > 8) {
      ds -= 1;
      ctx.font = `${ds}px "PixelFont", monospace`;
    }
    drawText(ctx, LEVEL_LABELS[id].desc, x + cw - 14, y + chh / 2, ds, DIM, 'right', 'middle');
    cards.push({ x, y, w: cw, h: chh, id });
    y += chh + gapd;
  }

  const play = drawButton(ctx, m, 'BẮT ĐẦU ▶', y + 10);

  // Continue, only when there is progress worth continuing.
  let cont = null;
  if (data.hasProgress) {
    cont = drawButton(ctx, m, `TIẾP TỤC — MÀN ${data.stage + 1}`, y + 10 + 68,
      { fill: '#241d4a', edge: '#7fffd4', size: 17 });
  }

  // A text link, not a button — this is a secondary, parent-facing screen
  // (see drawReport), so it should not compete with BẮT ĐẦU/TIẾP TỤC for
  // weight. Only offered once there is enough mastery data to show; before
  // that a tap would just land on "chưa có đủ dữ liệu", which is a dead end
  // for a first-time player still reading the two big buttons above it.
  //
  // Positioned off the REAL bottom of whichever button drew last (cont if
  // present, else play) rather than a hand-computed offset, so it can never
  // drift out of sync if a button's height changes.
  let report = null;
  if (data.hasMastery) {
    const lastBtn = cont || play;
    const ry = Math.min(lastBtn.y + lastBtn.h + 22, m.h - 40);
    drawText(ctx, 'Xem báo cáo học tập', m.cx, ry, 13, ACCENT, 'center');
    const rw = ctx.measureText('Xem báo cáo học tập').width;
    report = { x: m.cx - rw / 2 - 10, y: ry - 12, w: rw + 20, h: 24 };
  }

  drawText(ctx, 'F9 tắt/bật tiếng · Z xoá tiến trình', m.cx, m.h - 22, 12, '#6b64a0', 'center');

  return { levelCards: cards, play, cont, report };
}

// ---------------------------------------------------------------------------
// LEARNING REPORT — per-shape mastery, for a parent checking in.
//
// This is READ-ONLY reporting on data adaptive.js already tracks for quest
// selection (progress.mastery) — no new mechanic, so it cannot touch anything
// balance.js proves. It reuses weakestFirst()'s own ordering (weakest at top:
// "what should we practise next") and its own MIN_SAMPLE filter, so a shape
// seen only once or twice never appears here and reads as a verdict off a
// fluke.
//
// FRAMED LIKE THE FAILURE SCREEN, not a report card: strongest shape called
// out first ("con giỏi nhất"), same as failure leads with what the kid
// achieved. A bare weakest-to-strongest list of percentages reads as a
// scoreboard of what a child gets wrong, which is exactly the tone the rest
// of this game avoids.
// ---------------------------------------------------------------------------

export function drawReport(ctx, m, data, t) {
  starfield(ctx, m, 80, 41, m.h, t);

  drawTextBold(ctx, 'BÁO CÁO HỌC TẬP', m.cx, m.h * 0.1, Math.min(28, m.w * 0.06), ACCENT, 'center');

  const rows = data.rows || [];
  if (!rows.length) {
    drawLines(ctx, m, [
      'Chưa có đủ dữ liệu.',
      '',
      'Con hãy chơi vài màn nữa —',
      'báo cáo sẽ xuất hiện ở đây.',
    ], m.h * 0.4, 16, DIM);
    const back = drawButton(ctx, m, 'VỀ MÀN HÌNH CHÍNH', m.h - 84,
      { fill: '#241d4a', edge: GOLD, size: 17, h: 50 });
    return { back };
  }

  const best = rows[rows.length - 1];
  drawText(ctx, `Con giỏi nhất: ${best.name} (${best.pct}%)`,
    m.cx, m.h * 0.18, 14, GOLD, 'center');

  // Bars, weakest first — the thing a parent actually wants: what to
  // practise next. Each bar's fill colour follows its own percentage rather
  // than a fixed hue, so red/gold/green reads as a second, redundant signal
  // on top of the number and the bar length.
  // The bar reserves its own width for the "NN%" label rather than overlaying
  // it on the fill — at a low percentage the fill doesn't reach the text at
  // all (dark-on-dark, unreadable), and at a high one the dark ink chosen for
  // "sits on the bright fill" case still needs the fill to actually be there.
  // A fixed strip to the right of the bar is readable at every percentage.
  const pctW = 44;
  const barW = Math.min(m.w * 0.78, 420) - pctW;
  const barH = 22;
  const labelH = 17; // clearance for the 13px name label drawn above the bar
  const gap = 16;
  const x = m.cx - (barW + pctW) / 2;
  let y = m.h * 0.26;
  const maxRows = Math.min(rows.length, 8);
  for (let i = 0; i < maxRows; i++) {
    const r = rows[i];
    const color = r.acc < 0.6 ? '#ff6a6a' : r.acc < 0.8 ? GOLD : '#7fffd4';
    drawText(ctx, r.name, x, y, 13, INK, 'left');
    const barY = y + labelH;
    drawMeter(ctx, x, barY, barW, barH, r.acc, color);
    drawTextBold(ctx, `${r.pct}%`, x + barW + pctW - 6, barY + barH / 2, 13, INK, 'right', 'middle');
    y = barY + barH + gap;
  }

  drawText(ctx, 'Càng luyện nhiều, thanh càng đầy!', m.cx, y + 4, 12, DIM, 'center');

  const back = drawButton(ctx, m, 'VỀ MÀN HÌNH CHÍNH', m.h - 74,
    { fill: '#241d4a', edge: GOLD, size: 17, h: 50 });
  return { back };
}

// ---------------------------------------------------------------------------
// STAGE INTRO
// ---------------------------------------------------------------------------

export function drawStageIntro(ctx, m, data, t) {
  starfield(ctx, m, 70, data.stage * 13 + 3, m.h, t);

  const ch = data.chapter;
  drawText(ctx, `CHƯƠNG ${ch.id} — ${ch.name}`, m.cx, m.h * 0.16, 15, DIM, 'center');
  drawTextBold(ctx, `MÀN ${data.stageInChapter} / ${ch.stageCount}`,
    m.cx, m.h * 0.16 + 24, 17, GOLD, 'center');

  const nameSize = Math.min(34, m.w * 0.07);
  drawTextBold(ctx, data.stage_.name, m.cx, m.h * 0.3, nameSize, ACCENT, 'center');

  // The stage's intro line, wrapped to fit.
  drawLines(ctx, m, wrap(ctx, data.stage_.intro, m.w * 0.82, 18),
    m.h * 0.4, 18, INK, 0.86, 1.5);

  // The line-up so far — the kid sees their team grow.
  if (data.allies.length) {
    drawText(ctx, 'ĐỘI HÌNH', m.cx, m.h * 0.56, 13, DIM, 'center');
    drawLineup(ctx, m, m.cx, m.h * 0.66, data.allies, 1.3, t);
  } else {
    drawSpriteCentered(ctx, hero(), Math.floor(t * 5) % 2, m.cx, m.h * 0.63, 2.0);
  }

  const go = drawButton(ctx, m, 'XUẤT PHÁT ▶', m.h - 110);
  return { go };
}

// Greedy word wrap against a measured width.
function wrap(ctx, text, maxW, size) {
  ctx.font = `${size}px "PixelFont", monospace`;
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------------------
// VICTORY / UPGRADE
// ---------------------------------------------------------------------------

export function drawVictory(ctx, m, data, t) {
  starfield(ctx, m, 80, 61, m.h, t);

  drawTextBold(ctx, 'HOÀN THÀNH!', m.cx, m.h * 0.12, Math.min(40, m.w * 0.082),
    '#7fffd4', 'center');

  // Stats. Accuracy first — it is the number the game actually cares about.
  const rows = [
    `Số câu: ${data.asked}`,
    `Đúng: ${data.correct}   Sai: ${data.wrong}`,
    `Chính xác: ${Math.round(data.accuracy * 100)}%`,
    `Chuỗi dài nhất: ×${data.bestCombo}`,
  ];
  drawLines(ctx, m, rows, m.h * 0.22, 17, INK, 0.8, 1.7);

  // A rank promotion is the rarest thing on this screen (six times in a whole
  // playthrough), so it gets the loudest treatment — above the reward, in gold.
  let y = m.h * 0.46;
  if (data.rankUp) {
    const bw = Math.min(m.w * 0.84, 440);
    const bx = m.cx - bw / 2;
    fillRoundRect(ctx, bx, y, bw, 56, 14, '#3a2f14');
    strokeRoundRect(ctx, bx, y, bw, 56, 14, GOLD, 4);
    drawText(ctx, 'THĂNG CẤP!', m.cx, y + 10, 12, GOLD, 'center');
    drawTextBold(ctx, data.rankUp.name, m.cx, y + 30, 20, '#fff4d6', 'center');
    y += 66;
  }

  // The reward.
  const u = data.upgrade;
  if (u) {
    const cw = Math.min(m.w * 0.84, 440);
    const chh = 96;
    const x = m.cx - cw / 2;
    fillRoundRect(ctx, x, y, cw, chh, 16, '#241d4a');
    strokeRoundRect(ctx, x, y, cw, chh, 16, GOLD, 4);
    drawText(ctx, 'NHẬN ĐƯỢC', m.cx, y + 14, 12, DIM, 'center');
    drawTextBold(ctx, u.name, m.cx, y + 36, 21, GOLD, 'center');
    let ds = 14;
    ctx.font = `${ds}px "PixelFont", monospace`;
    while (ctx.measureText(u.desc).width > cw * 0.86 && ds > 9) {
      ds -= 1;
      ctx.font = `${ds}px "PixelFont", monospace`;
    }
    drawText(ctx, u.desc, m.cx, y + 66, ds, INK, 'center');
    y += chh + 16;
  }

  const next = drawButton(ctx, m, data.isFinal ? 'KẾT THÚC ▶' : 'MÀN TIẾP THEO ▶',
    Math.min(y + 8, m.h - 104));
  return { next };
}

// ---------------------------------------------------------------------------
// ALLY RESCUE — the chapter-2 payoff, shown once per rescue.
// ---------------------------------------------------------------------------

export function drawAllyRescue(ctx, m, data, t) {
  // A scene must never be able to kill the render loop.
  //
  // This state is only reached from a stage whose reward IS an ally, but reading
  // `story.name` off an unknown style threw inside the loop and took the whole
  // canvas down — the same class of failure as the malformed particle colour in
  // effects.js. Anything data-driven that a scene dereferences needs a fallback,
  // because the cost of being wrong is a black screen rather than a wrong label.
  const story = ALLY_STORY[data.allyStyle] || ALLY_STORY.engineer;
  // Pass the freed ally through so the tableau can fly THEIR ship out of the
  // cage. Without it the escape glow was empty, which undercut the one beat this
  // screen exists for.
  drawStoryArt(ctx, m, 'ally_freed', t, { allyStyle: data.allyStyle });

  const textTop = m.h * 0.48;
  ctx.fillStyle = 'rgba(10,8,26,0.92)';
  ctx.fillRect(0, textTop - 14, m.w, m.h - textTop + 14);

  drawTextBold(ctx, `${story.name} ĐÃ ĐƯỢC CỨU!`, m.cx, textTop + 8,
    Math.min(26, m.w * 0.055), '#7fffd4', 'center');
  const afterLines = drawLines(ctx, m, story.lines, textTop + 46,
    Math.min(18, m.w * 0.038), INK, 0.86, 1.6);

  // THE LINE-UP MUST NOT BE CROWDED BY THE BUTTON. The formation is 1.7 ship
  // widths deep (LINEUP_SLOTS), so the tail ship sits well below the anchor
  // point — anchoring at 0.87 of the height put it behind the button and hid the
  // newest ally, which is the one thing this screen exists to show. The button
  // is placed first and the line-up is anchored in the gap that is left.
  const btnY = m.h - 62;
  const label = 'ĐỘI HÌNH MỚI';
  const labelY = Math.max(afterLines + 10, m.h * 0.72);
  const lineupY = (labelY + 22 + btnY) / 2 - 12;

  drawText(ctx, label, m.cx, labelY, 13, DIM, 'center');
  drawLineup(ctx, m, m.cx, lineupY, data.allies, 1.05, t);

  const next = drawButton(ctx, m, 'TIẾP TỤC ▶', btnY, { h: 48 });
  return { next };
}

// ---------------------------------------------------------------------------
// FAILURE
// ---------------------------------------------------------------------------

export function drawFailure(ctx, m, data, t) {
  starfield(ctx, m, 50, 67, m.h, t);

  drawTextBold(ctx, 'PHI THUYỀN ĐÃ BỊ HỎNG', m.cx, m.h * 0.16,
    Math.min(32, m.w * 0.066), '#e0503a', 'center');

  // The encouraging frame matters more here than anywhere else in the game: a
  // kid who reads failure as "I am bad at maths" stops playing. So the copy
  // names what they DID achieve first, and the retry is the loudest thing.
  const rows = [
    `Bạn đã trả lời ${data.correct} câu đúng!`,
    `Chính xác: ${data.correct ? Math.round(data.accuracy * 100) : 0}%`,
    '',
    'Bé Ốc đang sửa phi thuyền...',
    'Thử lại nhé, phi công!',
  ];
  const afterRows = drawLines(ctx, m, rows, m.h * 0.3, 18, INK, 0.84, 1.7);

  // A DEMOTION IS ANNOUNCED, NEVER SILENT — and it always names the way back in
  // the same breath. The rank is on the kid's own ship, so it changes whether or
  // not this screen mentions it; an unexplained change to their craft is worse
  // than a plain sentence. But it comes AFTER what they achieved, it is smaller
  // than the retry button, and the second line is a promise rather than a
  // verdict: clear this stage and the rank comes straight back (finishStage
  // repays one demotion on every win).
  if (data.rankDown) {
    const y = afterRows + 6;
    drawText(ctx, `Cấp bậc: ${data.rankDown.from.name} → ${data.rankDown.to.name}`,
      m.cx, y, 15, '#ffb03a', 'center');
    drawText(ctx, 'Thắng màn này là lấy lại được ngay!',
      m.cx, y + 22, 14, DIM, 'center');
  } else if (data.deaths > 0 && data.deaths < data.deathsPerDemotion) {
    // A quiet heads-up before the third loss, so the demotion is never a
    // surprise. Framed as the ship needing repair, not as a warning.
    const left = data.deathsPerDemotion - data.deaths;
    drawText(ctx, `Cố lên! Thua ${left} lần nữa sẽ bị hạ cấp bậc.`,
      m.cx, afterRows + 6, 14, DIM, 'center');
  }

  drawSpriteCentered(ctx, hero(), 0, m.cx, m.h * 0.62, 1.8, false, '#4a4560');

  const retry = drawButton(ctx, m, 'THỬ LẠI ▶', m.h - 150);
  const menu = drawButton(ctx, m, 'VỀ MÀN HÌNH CHÍNH', m.h - 82,
    { fill: '#241d4a', edge: '#4b3f8f', size: 16, h: 50 });
  return { retry, menu };
}

// ---------------------------------------------------------------------------
// CHAPTER END
// ---------------------------------------------------------------------------

export function drawChapterEnd(ctx, m, data, t) {
  starfield(ctx, m, 80, 71, m.h, t);
  drawText(ctx, 'HOÀN THÀNH CHƯƠNG', m.cx, m.h * 0.2, 15, DIM, 'center');
  drawTextBold(ctx, data.chapter.name, m.cx, m.h * 0.26,
    Math.min(34, m.w * 0.07), GOLD, 'center');
  drawLines(ctx, m, [data.chapter.subtitle], m.h * 0.35, 17, INK);

  if (data.allies.length) drawLineup(ctx, m, m.cx, m.h * 0.58, data.allies, 1.5, t);
  else drawSpriteCentered(ctx, hero(), Math.floor(t * 5) % 2, m.cx, m.h * 0.58, 2.2);

  const next = drawButton(ctx, m, 'TIẾP TỤC ▶', m.h - 110);
  return { next };
}

// ---------------------------------------------------------------------------
// CREDITS
// ---------------------------------------------------------------------------

export function drawCredits(ctx, m, data, t) {
  starfield(ctx, m, 110, 73, m.h, t);

  // Slow upward scroll; clamps at the end rather than looping, so the last line
  // stays readable instead of sliding away from a kid still reading it.
  const size = Math.min(19, m.w * 0.04);
  const lead = size * 1.7;
  const total = data.lines.length * lead;
  const scroll = Math.min(t * 34, total);
  let y = m.h * 0.9 - scroll;

  for (const ln of data.lines) {
    if (y > -lead && y < m.h) {
      const isTitle = ln === 'PHI CÔNG TOÁN HỌC';
      if (isTitle) drawTextBold(ctx, ln, m.cx, y, size * 1.5, ACCENT, 'center');
      else drawText(ctx, ln, m.cx, y, size, INK, 'center');
    }
    y += lead;
  }

  if (data.allies.length) drawLineup(ctx, m, m.cx, m.h * 0.3, data.allies, 1.4, t);

  const done = drawButton(ctx, m, 'VỀ MÀN HÌNH CHÍNH', m.h - 74,
    { fill: '#241d4a', edge: GOLD, size: 17, h: 50 });
  return { done };
}

// ---------------------------------------------------------------------------
// TUTORIAL — three short pages, in the Captain's voice (see story.js).
// ---------------------------------------------------------------------------

// THE TUTORIAL EXPLAINS THE METER BY SHOWING IT WHERE IT LIVES.
//
// An early version just named it — "the bar above is your health" — which tells a
// 7-year-old nothing about WHICH bar or what to do when it moves. So the health
// page draws a MOCK CORNER of the real HUD in the real position (top-left) with an
// arrow pointing at the bar. A kid who has seen the corner recognises it in play;
// a kid who has only read the word does not.
//
// There is only ONE meter to teach, and that is deliberate: an energy bar and a
// shield dome were both tried here and both cut (see the note at the top of
// main.js). For this audience one legible number beats a clever system.
export const TUTORIAL_PAGES = [
  {
    lines: [
      '"Đây là buồng lái, phi công."',
      '',
      'Phía dưới là BẢNG CÂU HỎI.',
      'Mỗi câu có bốn đáp án.',
      'Chọn đáp án đúng (hoặc bấm số 1, 2, 3, 4 tương ứng với đáp án đúng)',
    ],
    demo: 'quest',
  },
  {
    lines: [
      '"Trả lời đúng, phi thuyền bắn."',
      '',
      'Bạn không cần lái. Phi thuyền tự bay.',
      'Trả lời càng nhiều câu đúng liên tiếp,',
      'phi thuyền bắn càng nhiều tia một lúc.',
    ],
    demo: 'combo',
  },
  {
    lines: [
      '"Thanh ĐỎ là ĐỘ BỀN TÀU VŨ TRỤ."',
      '',
      'Nó ở góc trên bên trái.',
      '',
      'Độ bền giảm khi phi thuyền BỊ BẮN,',
      'hoặc khi một quái hạm LAO VÀO ĐÂM!',
      '',
      'Quái hạm nào xuống tới phi thuyền sẽ',
      'lao vào tự nổ. Hãy bắn hạ chúng trước!',
      '',
      'Mỗi câu trả lời đúng sửa lại một chút,',
      'nên cứ trả lời là phi thuyền bền hơn!',
      '',
      'Hết độ bền thì phi thuyền hỏng — nhưng',
      'Bé Ốc sẽ sửa và bạn thử lại ngay thôi.',
    ],
    demo: 'hull',
  },
  {
    lines: [
      '"Trả lời sai thì sao?"',
      '',
      'Không sao cả! Phi thuyền không hư,',
      'chỉ là lần đó pháo không bắn thôi.',
      '',
      'ĐỪNG SỢ SAI, phi công.',
      'Cứ nghĩ kỹ rồi chọn — thế là đủ!',
      '',
      'Cần nghỉ một chút? Bấm nút F8 ngay',
      'phía trên bảng câu hỏi để tạm dừng.',
    ],
    demo: 'wrong',
  },
];

// The wrong-answer demo's caption, so the sequence reads as a story rather than
// a flicker.
function showingLabel(cycle) {
  if (cycle <= 0.25) return 'chọn một đáp án...';
  return 'sai → đáp án đúng sáng lên';
}

const CARD_WRONG = '#e0503a';

// A MOCK OF THE LIVE HUD'S TOP-LEFT CORNER.
//
// Drawn with the same colour, label and position as drawHud() in main.js, with an
// animated arrow pointing at the bar. It is deliberately a COPY rather than a call
// into drawHud(): that function reads live game state, and a tutorial must show a
// clean predictable example rather than whatever the last stage left behind.
function drawHudCornerDemo(ctx, m, dy, t) {
  const colW = Math.min(m.w * 0.42, 240);
  const x = m.cx - colW / 2;
  const barH = 12;
  const pad = 12;

  // The same vertical-fade plate the real HUD uses.
  const g = ctx.createLinearGradient(0, dy - pad, 0, dy + 92);
  g.addColorStop(0, 'rgba(8,6,20,0.85)');
  g.addColorStop(1, 'rgba(8,6,20,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(x - pad, dy - pad, colW + pad * 2, 104);

  // A pulse on the bar being explained; the other sits at a steady mid value.
  const pulse = 0.45 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2.2));

  const hy = dy;
  drawMeter(ctx, x, hy, colW, barH, pulse, '#e0503a');
  drawText(ctx, 'ĐỘ BỀN TÀU', x, hy + barH + 2, 10, '#ff9d8a');

  // The arrow. Sits to the right of the highlighted bar and POINTS BACK AT IT
  // (apex on the left, base on the right) — an arrow whose tip faces away from
  // its subject reads as pointing at the caption instead. It nudges in and out so
  // the eye is drawn to it without an animation that competes with reading.
  const targetY = hy + barH / 2;
  const nudge = Math.sin(t * 4) * 4;
  const ax = x + colW + 8 + nudge;
  const color = '#ff9d8a';
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(ax, targetY);              // tip, nearest the bar
  ctx.lineTo(ax + 14, targetY - 8);
  ctx.lineTo(ax + 14, targetY + 8);
  ctx.closePath();
  ctx.fill();

  // A one-word reminder of what the bar DOES, next to the arrow.
  drawTextBold(ctx, 'khi bị bắn', ax + 20, targetY, 12, color, 'left', 'middle');
}

export function drawTutorial(ctx, m, data, t) {
  starfield(ctx, m, 50, 79, m.h, t);
  const page = TUTORIAL_PAGES[data.index];

  drawText(ctx, `HƯỚNG DẪN ${data.index + 1}/${TUTORIAL_PAGES.length}`,
    m.cx, m.h * 0.08, 14, DIM, 'center');

  const afterText = drawLines(ctx, m, page.lines, m.h * 0.14,
    Math.min(19, m.w * 0.04), INK, 0.86, 1.6);

  // A live demo of the thing being described, so the words point at something.
  //
  // Anchored just below the TEXT rather than at a fixed fraction of the window:
  // the pages have different line counts, and a fixed anchor left a large hole
  // under the short ones and crowded the long ones.
  //
  // The four demo branches below draw content both above `dy` (a caption, up
  // to 49px) and below it (a card row + optional caption, up to 92px).
  //
  // Previously this was `Math.min(afterText + 26, m.h - 250)`: on a short
  // window `m.h - 250` could land ABOVE where the text actually ended
  // (and the demo's own caption reaches another 49px above THAT), pinning
  // the demo back over the last lines of text instead of below them.
  // Clearing the text always wins; only once that's satisfied do we pull
  // the demo up toward the button to avoid crowding it.
  const demoRise = 49, demoDrop = 92;
  const minGap = 14, buttonMargin = 20;
  const dy = Math.max(
    afterText + minGap + demoRise,
    Math.min(afterText + 26 + demoRise, (m.h - 96) - buttonMargin - demoDrop));
  if (page.demo === 'quest') {
    const cw = Math.min(m.w * 0.2, 96), chh = 62;
    const gapd = 10;
    const totalW = cw * 4 + gapd * 3;
    drawTextBold(ctx, '1 + 1 = ?', m.cx, dy - 34, 26, INK, 'center', 'middle');
    // The cycle alternates between "tap the card" and "press its number key",
    // so the two ways to answer (stated as one abstract line of text) each
    // get their own beat instead of only ever showing the tap.
    const cycle = (t * 0.5) % 2;
    const keyBeat = cycle >= 1;
    // Answer VALUES, distinct from the 1-4 POSITION badges below. Reusing
    // 1/2/3/4 as both the card's answer and its position made "press 3" look
    // like it worked BECAUSE the answer was 3 — a coincidence that does not
    // hold in real play, where the big number is a quest answer and the
    // corner badge is only ever the card's slot.
    const values = [2, 3, 5, 4];
    for (let i = 0; i < 4; i++) {
      const x = m.cx - totalW / 2 + i * (cw + gapd);
      const right = i === 1;
      const lit = right && Math.floor(t * 2) % 2 === 0;
      fillRoundRect(ctx, x, dy, cw, chh, 12, lit ? '#2fbf9f' : '#241d4a');
      strokeRoundRect(ctx, x, dy, cw, chh, 12, lit ? '#7fffd4' : '#4b3f8f', 3);
      drawTextBold(ctx, String(values[i]), x + cw / 2, dy + chh / 2, 22,
        lit ? '#05201a' : '#f2eeff', 'center', 'middle');

      // The SAME keyboard-hint badge the real quest box draws in each card's
      // corner — so the kid meets this exact shape again in play, rather than
      // being told "bấm số 1-4" with nothing on screen to press.
      const keyOn = right && keyBeat;
      if (keyOn) {
        fillRoundRect(ctx, x + 4, dy + 4, 20, 20, 5, '#ffe9a8');
        drawTextBold(ctx, String(i + 1), x + 14, dy + 14, 14, '#241d4a', 'center', 'middle');
      } else {
        drawText(ctx, String(i + 1), x + 8, dy + 6, 13,
          lit ? 'rgba(5,32,26,0.5)' : 'rgba(255,255,255,0.4)');
      }
    }
    // Names the beat currently on screen, so "tap" and "press 1-4" both get
    // read as the caption changes rather than only ever shown silently.
    drawText(ctx, keyBeat ? 'hoặc bấm phím SỐ...' : 'chọn đáp án đúng...',
      m.cx, dy + chh + 14, 13, DIM, 'center');
  } else if (page.demo === 'combo') {
    const shots = 1 + (Math.floor(t * 1.5) % 3);
    drawTextBold(ctx, `CHUỖI ×${shots * 3}`, m.cx, dy - 40, 18, GOLD, 'center');
    drawSpriteCentered(ctx, hero(), Math.floor(t * 5) % 2, m.cx, dy + 52, 1.6);
    for (let i = 0; i < shots; i++) {
      const off = shots === 1 ? 0 : (i - (shots - 1) / 2) * 18;
      drawSpriteCentered(ctx, SPRITES.shot_plasma, 0, m.cx + off, dy + 6, 1.4);
    }
  } else if (page.demo === 'hull') {
    // A MOCK OF THE REAL HUD CORNER, in the real position, with an arrow at the
    // bar. The whole point is recognition: the kid should meet this exact shape
    // again in the top-left of a live stage.
    drawHudCornerDemo(ctx, m, dy, t);
  } else {
    // "What if I get it wrong?" — show it, rather than only saying it. The wrong
    // card flashes red and the RIGHT one lights green beside it. That sequence is
    // the actual promise the page makes: a mistake costs you the shot, not the
    // ship, and it shows you the answer.
    const cw = Math.min(m.w * 0.2, 96), chh = 58, gapd = 10;
    const totalW = cw * 2 + gapd;
    const cycle = (t * 0.7) % 1;
    for (let i = 0; i < 2; i++) {
      const x = m.cx - totalW / 2 + i * (cw + gapd);
      const isWrong = i === 0;
      const showing = cycle > 0.25;
      let face = '#241d4a', edge = '#4b3f8f', txt = '#f2eeff';
      if (showing && isWrong) { face = CARD_WRONG; edge = '#ff9d8a'; txt = '#2a0a06'; }
      if (showing && !isWrong) { face = '#2fbf9f'; edge = '#7fffd4'; txt = '#05201a'; }
      fillRoundRect(ctx, x, dy, cw, chh, 12, face);
      strokeRoundRect(ctx, x, dy, cw, chh, 12, edge, 3);
      drawTextBold(ctx, isWrong ? '11' : '12', x + cw / 2, dy + chh / 2, 22, txt, 'center', 'middle');
    }
    drawText(ctx, showingLabel(cycle), m.cx, dy + chh + 12, 13, DIM, 'center');

  }

  const last = data.index === TUTORIAL_PAGES.length - 1;
  const next = drawButton(ctx, m, last ? 'BẮT ĐẦU ▶' : 'TIẾP ▶', m.h - 96);
  drawText(ctx, 'BỎ QUA (ESC)', m.cx, m.h - 26, 13, DIM, 'center');
  return { next };
}
