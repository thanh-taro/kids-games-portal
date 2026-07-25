// scenes.js — non-gameplay screens drawn on the canvas.
//
// Each function draws one full-screen scene. main.js decides which to call
// based on the current game state, and passes the data each needs.

import { drawSprite, drawText, drawRect, DOT } from './render.js';
import {
  heroSprite, princessSprite,
  KING, THRONE, STAFF_WISDOM, SPIRE, CASTLE_GATE, SPRITES, RUNE, MOUNTAINS,
} from './sprites.js';
import { chapterForStage, stageNumberInChapter } from './chapters.js';
import { getStage, STAGES } from './stages.js';
import { CREDITS } from './story.js';
import { getBiome, drawBiomeTerrain, drawBiomeScenery, drawBiomeLights, drawBiomeWeather } from './biomes.js';
import { drawAura } from './effects.js';

// Animated sparkles (used as celebratory dots over the backdrop on some scenes).
function drawSparkles(ctx, W, H, tick, color = '#c77dff') {
  for (let i = 0; i < 24; i++) {
    const x = (i * 137 + tick * (1 + (i % 3))) % W;
    const y = (i * 53) % (H - 220) + 20;
    const on = (tick + i * 7) % 40 < 20;
    if (on) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, DOT, DOT);
    }
  }
}

// Shared backdrop for the menu scenes: the same pixel world as gameplay, themed
// to the stage's biome (sky, terrain band, layered ground, scenery props, and
// weather) so the intro/victory/failure screens read as the SAME place the kid
// is about to fight in — a cave intro looks like a cave, the fortress rains.
//
// `biomeName` picks the theme (falls back to the desert look when absent);
// `tint` optionally washes the scene with an extra mood color (rgba string) on
// top of the biome's own tint.
//
// Menu scenes sit their clouds a little lower than gameplay (no HUD row to
// avoid) and raise the sky body toward the top edge, clear of the title plates.
const MENU_SKY_LAYOUT = { cloudY: [60, 110, 84] };

function drawSceneBackdrop(ctx, W, H, tick, tint = null, biomeName = null) {
  const groundY = H - 90;
  const biome = getBiome(biomeName);

  drawBiomeTerrain(ctx, W, H, groundY, biome, tick);
  // Keep the biome's own horizontal placement (tuned around its props) and just
  // raise the body so the centered title text stays clear of it.
  const layout = { ...MENU_SKY_LAYOUT };
  if (biome.body) layout.body = { ...biome.body, y: 40 };
  drawBiomeScenery(ctx, W, H, groundY, biome, tick, layout);

  if (biome.tint) {
    ctx.fillStyle = biome.tint;
    ctx.fillRect(0, 0, W, H);
  }
  drawBiomeLights(ctx, W, H, groundY, biome, tick);
  drawBiomeWeather(ctx, W, H, groundY, biome, tick);

  if (tint) {
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, W, H);
  }
}

// A small dark plate behind text so it stays legible over the bright sky.
function plate(ctx, cx, y, text, size) {
  ctx.font = `${size}px "PixelFont", monospace`;
  const w = ctx.measureText(text).width;
  drawRect(ctx, cx - w / 2 - 10, y - 4, w + 20, size + 10, 'rgba(20,18,32,0.72)');
}

// The fullscreen shortcut is NOT the same everywhere, so the title screen names
// the one that actually works on the kid's machine. On macOS it's Ctrl+Cmd+F —
// F11 there is the OS "Show Desktop" (and needs Fn on laptops), so telling a Mac
// kid to press F11 actively does the wrong thing. Windows and Linux browsers all
// use F11. Computed once at module load; `userAgent` is the fallback for
// browsers without `navigator.platform`.
const FULLSCREEN_KEY = (() => {
  const ua = `${navigator.platform || ''} ${navigator.userAgent || ''}`;
  // iPadOS reports "MacIntel" but has no keyboard shortcut worth naming; it also
  // matches /Mac/, which is harmless — the tip is just advice either way.
  return /Mac|iPhone|iPad|iPod/.test(ua) ? 'Ctrl+Cmd+F' : 'F11';
})();

// `hero` describes the kid's ACTUAL equipped look so the home screen shows the
// hero they've built: { weaponColor, rankGlow, rankName, rankEmoji, rankColor }.
// Falls back to no weapon glint / no aura when nothing is unlocked yet.
export function drawTitle(ctx, W, H, tick, stageIndex = 0, hero = {}, biome = null) {
  // The home screen previews the biome of the stage the kid is about to resume.
  drawSceneBackdrop(ctx, W, H, tick, null, biome);

  plate(ctx, W / 2, 84, 'ANH HÙNG BÀN PHÍM', 40);
  drawText(ctx, 'ANH HÙNG BÀN PHÍM', W / 2, 90, 40, '#ffffff', 'center');
  plate(ctx, W / 2, 140, 'Học gõ Tiếng Việt — Telex', 18);
  drawText(ctx, 'Học gõ Tiếng Việt — Telex', W / 2, 142, 18, '#ffe08a', 'center');

  // Current chapter of the saga.
  const chapter = chapterForStage(stageIndex);
  const chapLabel = `CHƯƠNG ${chapter.id}: ${chapter.name}`;
  plate(ctx, W / 2, 176, chapLabel, 16);
  drawText(ctx, chapLabel, W / 2, 178, 16, '#f0c6ff', 'center');

  // Hero + princess standing on the ground line. The hero glows with their
  // earned rank aura and gets a small weapon glint in their current weapon
  // color — so the home screen reflects who they've become.
  const groundY = H - 90;
  // The hero's own sword is tinted to their equipped weapon, so the separate
  // bobbing "glint" square that used to hint at the weapon color is gone — the
  // blade itself now carries it.
  const hSprite = heroSprite(hero.weaponColor);
  const heroScale = 2;
  const heroX = W / 2 - 120;
  const heroY = groundY - hSprite.h * DOT * heroScale;
  const hw = hSprite.w * DOT * heroScale;
  const hh = hSprite.h * DOT * heroScale;
  if (hero.rankGlow) {
    drawAura(ctx, heroX + hw / 2, heroY + hh / 2, hw * 0.85, hero.rankGlow, tick);
  }
  drawSprite(ctx, hSprite, Math.floor(tick / 10) % 2, heroX, heroY, heroScale);
  // Rank title plate floating ABOVE the hero's head (below-hero would collide
  // with the SPACE prompt on the ground line), so the kid sees their earned rank.
  if (hero.rankName) {
    const label = `${hero.rankEmoji || ''} ${hero.rankName}`.trim();
    plate(ctx, heroX + hw / 2, heroY - 28, label, 16);
    drawText(ctx, label, heroX + hw / 2, heroY - 26, 16, hero.rankColor || '#fff4d6', 'center');
  }
  // The princess waiting on the title screen is the one from the stage the kid
  // is up to, so the home screen previews who they're about to rescue. Warm-up
  // stages have no princess of their own — fall back to the default look.
  const titlePrincess = princessSprite(getStage(stageIndex).princessStyle);
  drawSprite(ctx, titlePrincess, Math.floor(tick / 16) % 2, W / 2 + 70, groundY - titlePrincess.h * DOT * 2, 2);

  // Menu column: the blinking SPACE prompt as the primary item, with the
  // secondary H/R options stacked right beneath it so the three read as one
  // start menu instead of scattered hints. The plate is drawn even while the
  // text blinks off so the menu block doesn't visibly jump.
  const menuY = H / 2 + 40;
  plate(ctx, W / 2, menuY, '▶ Nhấn SPACE để bắt đầu', 20);
  if (tick % 60 < 40) {
    drawText(ctx, '▶ Nhấn SPACE để bắt đầu', W / 2, menuY + 4, 20, '#ffe08a', 'center');
  }
  plate(ctx, W / 2, menuY + 32, 'Nhấn H để học cách chơi', 16);
  drawText(ctx, 'Nhấn H để học cách chơi', W / 2, menuY + 34, 16, '#bfe8ff', 'center');
  plate(ctx, W / 2, menuY + 58, 'Nhấn S để xem lại câu chuyện', 16); // "S to rewatch the story"
  drawText(ctx, 'Nhấn S để xem lại câu chuyện', W / 2, menuY + 60, 16, '#f0c6ff', 'center');
  plate(ctx, W / 2, menuY + 84, 'Nhấn R để chơi lại từ đầu', 16);
  drawText(ctx, 'Nhấn R để chơi lại từ đầu', W / 2, menuY + 86, 16, '#fff4d6', 'center');

  // Fullscreen tip, bottom-LEFT so it clears the always-on mute hint that
  // `main.js` draws bottom-right. Gently blinking (slower than the SPACE
  // prompt) so it reads as advice, not as another menu item to press.
  // English gloss: "Tip: press <key> for fullscreen — much more fun!"
  const tip = `💡 Mẹo: Tắt chương trình gõ tiếng Việt trước khi chơi. Nhấn ${FULLSCREEN_KEY} để chơi toàn màn hình — vui hơn nhiều!`;
  ctx.font = '14px "PixelFont", monospace';
  const tipCx = 20 + ctx.measureText(tip).width / 2;
  const tipY = H - 29; // same row as main.js's mute hint, opposite corner
  plate(ctx, tipCx, tipY, tip, 14);
  if (tick % 120 < 90) {
    drawText(ctx, tip, tipCx, tipY, 14, '#bfe8ff', 'center');
  }
}

export function drawStageIntro(ctx, W, H, tick, stage, stageIndex = 0, weaponColor = null) {
  drawSceneBackdrop(ctx, W, H, tick, null, stage.biome);

  // Chapter banner above the stage title.
  const chapter = chapterForStage(stageIndex);
  const chapLabel = `CHƯƠNG ${chapter.id}: ${chapter.name}`;
  plate(ctx, W / 2, 26, chapLabel, 16);
  drawText(ctx, chapLabel, W / 2, 28, 16, '#f0c6ff', 'center');

  // Stage number within the chapter (e.g. "MÀN 3 / 10").
  const num = stageNumberInChapter(stageIndex);
  const stageLabel = `MÀN ${num} / ${chapter.stageCount}`;
  // Text block kept in the upper area, clear of the standing hero below.
  plate(ctx, W / 2, 60, stageLabel, 28);
  drawText(ctx, stageLabel, W / 2, 64, 28, '#ffe08a', 'center');
  plate(ctx, W / 2, 104, stage.name, 40);
  drawText(ctx, stage.name, W / 2, 106, 40, '#ffffff', 'center');
  plate(ctx, W / 2, 162, stage.intro, 20);
  drawText(ctx, stage.intro, W / 2, 164, 20, '#bfe8ff', 'center');
  // Practice stages (no princess yet) show a "warm-up" goal instead.
  const goal = stage.princess ? `Giải cứu ${stage.princess}` : 'Luyện kĩ năng!';
  plate(ctx, W / 2, 200, goal, 16);
  drawText(ctx, goal, W / 2, 202, 16, '#f0c6ff', 'center');

  // Hero jogging in place toward the stage, on the ground line.
  const groundY = H - 90;
  const hx = W / 2 - 24 + Math.sin(tick / 30) * 10;
  const introHero = heroSprite(weaponColor);
  drawSprite(ctx, introHero, Math.floor(tick / 8) % 2, hx, groundY - introHero.h * DOT * 2, 2);

  // SPACE prompt raised toward center for easy visibility (below the intro
  // text block above, above the jogging hero on the ground line).
  if (tick % 60 < 40) {
    plate(ctx, W / 2, H / 2 + 50, '▶ Nhấn SPACE để vào trận', 18);
    drawText(ctx, '▶ Nhấn SPACE để vào trận', W / 2, H / 2 + 54, 18, '#ffe08a', 'center');
  }
}

export function drawVictory(ctx, W, H, tick, stage, weaponColor = null) {
  drawSceneBackdrop(ctx, W, H, tick, 'rgba(242,197,61,0.12)', stage.biome); // warm golden wash
  drawSparkles(ctx, W, H, tick, '#ffffff');

  plate(ctx, W / 2, 64, 'CHIẾN THẮNG!', 44);
  drawText(ctx, 'CHIẾN THẮNG!', W / 2, 70, 44, '#ffe08a', 'center');
  // Practice stages (no princess) just cheer the win; princess stages announce the rescue.
  const winText = stage.princess ? `Đã giải cứu ${stage.princess}!` : 'Gõ giỏi lắm!'; // "Great typing!"
  plate(ctx, W / 2, 128, winText, 20);
  drawText(ctx, winText, W / 2, 130, 20, '#ffffff', 'center');

  // Hero (and the rescued princess, if this stage had one) celebrating on the ground line.
  const groundY = H - 90;
  const bob = Math.floor(tick / 8) % 2 === 0 ? 0 : -6;
  const heroX = stage.princess ? W / 2 - 100 : W / 2 - 24;
  const vicHero = heroSprite(weaponColor);
  drawSprite(ctx, vicHero, Math.floor(tick / 10) % 2, heroX, groundY - vicHero.h * DOT * 3, 3);
  if (stage.princess) {
    // The rescued princess wears her own stage's look (see PRINCESS_STYLES).
    const p = princessSprite(stage.princessStyle);
    drawSprite(ctx, p, Math.floor(tick / 16) % 2, W / 2 + 20, groundY - p.h * DOT * 3 + bob, 3);
  }

  // Rising heart-dots between the hero and princess (rescue stages only).
  if (stage.princess) {
    for (let i = 0; i < 5; i++) {
      const hy = groundY - 120 - ((tick * 2 + i * 30) % 180);
      const hx = W / 2 - 10 + Math.sin((tick + i * 20) / 20) * 20;
      ctx.fillStyle = '#e0503a';
      ctx.fillRect(hx, hy, DOT * 2, DOT * 2);
    }
  }

  // SPACE prompt raised toward center for easy visibility (below the victory
  // text, above the celebrating hero + princess on the ground line).
  if (tick % 60 < 40) {
    plate(ctx, W / 2, H / 2 + 20, '▶ Nhấn SPACE để nhận thưởng', 18);
    drawText(ctx, '▶ Nhấn SPACE để nhận thưởng', W / 2, H / 2 + 24, 18, '#ffe08a', 'center');
  }
}

export function drawReward(ctx, W, H, tick, reward, biome = null) {
  drawSceneBackdrop(ctx, W, H, tick, 'rgba(242,197,61,0.10)', biome);
  drawSparkles(ctx, W, H, tick, '#ffffff');

  const typeLabel = reward.type === 'weapon' ? 'VŨ KHÍ MỚI' : 'KỸ NĂNG MỚI';
  plate(ctx, W / 2, 74, '★ PHẦN THƯỞNG ★', 24);
  drawText(ctx, '★ PHẦN THƯỞNG ★', W / 2, 80, 24, '#ffe08a', 'center');
  plate(ctx, W / 2, 118, typeLabel, 18);
  drawText(ctx, typeLabel, W / 2, 120, 18, '#f0c6ff', 'center');

  // A pulsing "card" showing the reward name.
  const pulse = 1 + Math.sin(tick / 10) * 0.03;
  const cardW = 360 * pulse;
  const cardH = 120;
  const cx = W / 2;
  const cy = H / 2 + 10;
  drawRect(ctx, cx - cardW / 2 - 3, cy - cardH / 2 - 3, cardW + 6, cardH + 6, '#1a1423');
  drawRect(ctx, cx - cardW / 2, cy - cardH / 2, cardW, cardH, '#2b2740');
  drawRect(ctx, cx - cardW / 2, cy - cardH / 2, cardW, 4, '#f2c53d');

  // Reward icon: a big dot in its theme color (weapon color, or the skill's
  // signature color for skill rewards).
  const iconColor = reward.projectileColor || reward.color || '#f2c53d';
  drawRect(ctx, cx - 14, cy - 46, 28, 28, '#1a1423');
  drawRect(ctx, cx - 12, cy - 44, 24, 24, iconColor);

  drawText(ctx, reward.name, cx, cy - 4, 26, '#ffffff', 'center');
  drawText(ctx, reward.desc, cx, cy + 30, 15, '#cfc8dd', 'center');

  // SPACE prompt raised just below the reward card so it's easy for a kid to
  // spot (the card spans H/2-50 .. H/2+70).
  if (tick % 60 < 40) {
    plate(ctx, W / 2, H / 2 + 95, '▶ Nhấn SPACE để tiếp tục', 18);
    drawText(ctx, '▶ Nhấn SPACE để tiếp tục', W / 2, H / 2 + 99, 18, '#ffe08a', 'center');
  }
}

export function drawFailure(ctx, W, H, tick, stage, weaponColor = null) {
  // The stage's own world at dusk: darkened + red wash.
  drawSceneBackdrop(ctx, W, H, tick, 'rgba(60,10,10,0.55)', stage.biome);

  plate(ctx, W / 2, H / 2 - 84, 'THẤT BẠI...', 44);
  drawText(ctx, 'THẤT BẠI...', W / 2, H / 2 - 80, 44, '#ff6a5a', 'center');
  plate(ctx, W / 2, H / 2 - 22, 'Anh hùng đã ngã xuống.', 18);
  drawText(ctx, 'Anh hùng đã ngã xuống.', W / 2, H / 2 - 20, 18, '#ffffff', 'center');
  plate(ctx, W / 2, H / 2 + 12, 'Đừng bỏ cuộc — hãy thử lại!', 16);
  drawText(ctx, 'Đừng bỏ cuộc — hãy thử lại!', W / 2, H / 2 + 14, 16, '#e0d0d0', 'center');

  // Fallen hero lying on the ground line.
  const groundY = H - 90;
  const failHero = heroSprite(weaponColor);
  drawSprite(ctx, failHero, 0, W / 2 - 18, groundY - failHero.h * DOT * 2, 2);

  // SPACE prompt raised toward center for easy visibility (below the
  // encouragement text, above the fallen hero on the ground line).
  if (tick % 60 < 40) {
    plate(ctx, W / 2, H / 2 + 50, '▶ Nhấn SPACE để thử lại màn này', 18);
    drawText(ctx, '▶ Nhấn SPACE để thử lại màn này', W / 2, H / 2 + 54, 18, '#ffe08a', 'center');
  }
}

// ---------------------------------------------------------------------------
// STORY SCENES
// ---------------------------------------------------------------------------
// The narration between chapters (story.js holds the text). One PAGE at a time:
// a tableau drawn behind, the page's lines on a big dark panel, SPACE to turn
// the page and ESC to skip the whole story.
//
// Layout choice: the art sits in the lower half and the text panel in the upper
// half, ALWAYS in the same place on every page. A kid reading Vietnamese with
// diacritics needs the text to stay put between pages — art that reflows the
// text block makes them hunt for where they were.

// Every princess style, in stage order — the ten rescued princesses, used by the
// 'peace' and 'kidnap' tableaux. Derived from STAGES so it can never drift out
// of sync with who the game actually has you rescue.
const RESCUED_STYLES = STAGES.map((s) => s.princessStyle).filter(Boolean);

// A row of princesses spread across `spanW`, centered on cx, standing on baseY.
// `lit` false draws them caged/dimmed (the kidnap tableau).
function drawPrincessRow(ctx, cx, baseY, spanW, tick, scale, lit = true) {
  const styles = RESCUED_STYLES;
  const n = styles.length;
  if (!n) return;
  const step = spanW / n;
  styles.forEach((style, i) => {
    const p = princessSprite(style);
    const x = cx - spanW / 2 + step * (i + 0.5) - (p.w * DOT * scale) / 2;
    // Stagger the sway so ten princesses never bob in lockstep.
    const frame = Math.floor((tick + i * 9) / 18) % 2;
    const bob = lit ? Math.sin((tick + i * 22) / 26) * 3 : 0;
    drawSprite(ctx, p, frame, x, baseY - p.h * DOT * scale + bob, scale);
    if (!lit) {
      // Dim bars over each princess: she is behind the Demon King's bars.
      ctx.globalAlpha = 0.55;
      for (let b = 0; b < 3; b++) {
        drawRect(ctx, x + 4 + b * (p.w * DOT * scale) / 3, baseY - p.h * DOT * scale, DOT, p.h * DOT * scale, '#1a1423');
      }
      ctx.globalAlpha = 1;
    }
  });
}

// The tableaux. Each draws into the lower part of the screen; the text panel is
// drawn on top of it by drawStory.
function drawStoryArt(ctx, W, H, tick, art) {
  const baseY = H - 70;

  switch (art) {
    case 'throne': {
      // The King on his throne, the hero standing before him. The King is
      // centred ON the throne (his sprite is 16 wide against the throne's 18, so
      // the offset is one sprite-column) rather than nudged right, which left the
      // throne's whole left half sticking out beside him.
      const tScale = 2.2;
      const thX = W / 2 + 40;
      drawSprite(ctx, THRONE, 0, thX, baseY - THRONE.h * DOT * tScale, tScale);
      const kScale = 2.2;
      const kingX = thX + ((THRONE.w - KING.w) / 2) * DOT * tScale;
      drawSprite(ctx, KING, Math.floor(tick / 22) % 2, kingX, baseY - KING.h * DOT * kScale - 8, kScale);
      const hSprite = heroSprite(null);
      const hScale = 2;
      // Hero stands to the left, facing the throne (flipped to face right→left).
      drawSprite(ctx, hSprite, Math.floor(tick / 14) % 2, W / 2 - 190, baseY - hSprite.h * DOT * hScale, hScale, true);
      break;
    }
    case 'kidnap': {
      // The ten princesses caged, the Demon King's shadow looming behind them.
      const dl = SPRITES.stageboss_darklord;
      if (dl) {
        const s = 2.6;
        ctx.globalAlpha = 0.45; // a looming SHADOW, not a solid figure
        drawSprite(ctx, dl, Math.floor(tick / 20) % dl.frames.length, W / 2 - (dl.w * DOT * s) / 2, baseY - dl.h * DOT * s - 40, s, false, '#1a1423');
        ctx.globalAlpha = 1;
      }
      drawPrincessRow(ctx, W / 2, baseY, Math.min(W - 80, 760), tick, 1.3, false);
      break;
    }
    case 'road': {
      // The hero walking right, toward the villain's distant spire.
      const s = 1.0;
      drawSprite(ctx, MOUNTAINS, 0, W * 0.55, baseY - MOUNTAINS.h * DOT * s, s);
      const spScale = 1.6;
      drawSprite(ctx, SPIRE, 0, W * 0.78, baseY - SPIRE.h * DOT * spScale, spScale);
      const hSprite = heroSprite(null);
      const hScale = 2.2;
      // Walks slowly rightward across the lower third, looping.
      const walkX = (tick * 0.35) % (W * 0.5) + W * 0.1;
      drawSprite(ctx, hSprite, Math.floor(tick / 8) % 2, walkX, baseY - hSprite.h * DOT * hScale, hScale);
      break;
    }
    case 'library': {
      // Floating runes/books above the hero — the ancient library.
      const hSprite = heroSprite(null);
      const hScale = 2.2;
      drawSprite(ctx, hSprite, Math.floor(tick / 12) % 2, W / 2 - 130, baseY - hSprite.h * DOT * hScale, hScale);
      for (let i = 0; i < 6; i++) {
        const s = 1.2 + (i % 3) * 0.35;
        const x = W / 2 - 40 + i * 62;
        const y = baseY - 150 - Math.sin((tick + i * 40) / 30) * 16 - (i % 3) * 40;
        drawSprite(ctx, RUNE, Math.floor((tick + i * 13) / 20) % RUNE.frames.length, x, y, s);
      }
      break;
    }
    case 'staff': {
      // The Staff on a beam of light, the hero reaching for it.
      const sScale = 2.6;
      const sx = W / 2 + 30;
      const sy = baseY - STAFF_WISDOM.h * DOT * sScale;
      // Beam of light behind it.
      const grad = ctx.createLinearGradient(0, sy - 60, 0, baseY);
      grad.addColorStop(0, 'rgba(255,242,176,0)');
      grad.addColorStop(0.5, 'rgba(255,242,176,0.30)');
      grad.addColorStop(1, 'rgba(255,242,176,0.05)');
      ctx.fillStyle = grad;
      ctx.fillRect(sx - 30, sy - 60, STAFF_WISDOM.w * DOT * sScale + 60, baseY - sy + 60);
      drawSprite(ctx, STAFF_WISDOM, Math.floor(tick / 12) % 2, sx, sy, sScale);
      const hSprite = heroSprite(null);
      const hScale = 2.2;
      drawSprite(ctx, hSprite, Math.floor(tick / 14) % 2, W / 2 - 190, baseY - hSprite.h * DOT * hScale, hScale);
      break;
    }
    case 'fortress': {
      // The great gate, the hero small before it.
      const gScale = 2.4;
      drawSprite(ctx, CASTLE_GATE, 0, W / 2 - (CASTLE_GATE.w * DOT * gScale) / 2 + 60, baseY - CASTLE_GATE.h * DOT * gScale, gScale);
      const hSprite = heroSprite(null);
      const hScale = 1.8; // deliberately SMALL — the gate should tower over him
      drawSprite(ctx, hSprite, Math.floor(tick / 12) % 2, W / 2 - 230, baseY - hSprite.h * DOT * hScale, hScale);
      break;
    }
    case 'duel': {
      // Hero vs the World Devourer, facing each other across the frame.
      const hSprite = heroSprite('#fff2b0'); // staff-lit blade
      const hScale = 2.4;
      const lunge = Math.sin(tick / 18) * 10;
      drawSprite(ctx, hSprite, Math.floor(tick / 8) % 2, W / 2 - 210 + lunge, baseY - hSprite.h * DOT * hScale, hScale);
      const dl = SPRITES.stageboss_devourer || SPRITES.stageboss_darklord;
      if (dl) {
        const s = 2.8;
        drawSprite(ctx, dl, Math.floor(tick / 14) % dl.frames.length, W / 2 + 60, baseY - dl.h * DOT * s, s, true);
      }
      break;
    }
    case 'peace': {
      // The ten princesses free, in the light.
      drawPrincessRow(ctx, W / 2, baseY, Math.min(W - 60, 820), tick, 1.4, true);
      break;
    }
    case 'crown': {
      // The King honoring the hero, princesses behind them.
      drawPrincessRow(ctx, W / 2, baseY - 4, Math.min(W - 120, 700), tick, 0.9, true);
      const kScale = 2.2;
      drawSprite(ctx, KING, Math.floor(tick / 22) % 2, W / 2 + 40, baseY - KING.h * DOT * kScale, kScale);
      const hSprite = heroSprite('#ffb347');
      const hScale = 2.2;
      drawSprite(ctx, hSprite, Math.floor(tick / 14) % 2, W / 2 - 150, baseY - hSprite.h * DOT * hScale, hScale);
      break;
    }
    default:
      break;
  }
}

// One page of narration. `page` is a {art, lines} entry from story.js.
// `pageNum`/`pageCount` drive the little "1/7" progress dots.
export function drawStory(ctx, W, H, tick, title, page, pageNum, pageCount, biome = null) {
  // A dark, dusk-like wash of the world so the story reads as a storybook
  // interlude rather than gameplay.
  drawSceneBackdrop(ctx, W, H, tick, 'rgba(16,12,32,0.62)', biome);

  if (page) drawStoryArt(ctx, W, H, tick, page.art);

  // Chapter/story title at the very top.
  if (title) {
    plate(ctx, W / 2, 26, title, 22);
    drawText(ctx, title, W / 2, 28, 22, '#f0c6ff', 'center');
  }

  // The text panel: fixed position, generous line spacing, big type. Sized to
  // the widest line so it never clips a Vietnamese line with tall diacritics.
  const lines = (page && page.lines) || [];
  const size = 22;
  const lineH = 34;
  ctx.font = `${size}px "PixelFont", monospace`;
  let maxW = 0;
  for (const l of lines) maxW = Math.max(maxW, ctx.measureText(l).width);
  const panelW = Math.min(W - 60, maxW + 56);
  const panelH = lines.length * lineH + 34;
  const panelX = W / 2 - panelW / 2;
  const panelY = 66;
  drawRect(ctx, panelX - 3, panelY - 3, panelW + 6, panelH + 6, '#1a1423');
  drawRect(ctx, panelX, panelY, panelW, panelH, 'rgba(28,22,48,0.94)');
  drawRect(ctx, panelX, panelY, panelW, 4, '#f0c6ff'); // accent strip

  lines.forEach((line, i) => {
    drawText(ctx, line, W / 2, panelY + 22 + i * lineH, size, '#fff4d6', 'center');
  });

  // Page dots, so a kid can see how much story is left.
  if (pageCount > 1) {
    const dotY = panelY + panelH + 14;
    const gap = 16;
    const startX = W / 2 - ((pageCount - 1) * gap) / 2;
    for (let i = 0; i < pageCount; i++) {
      const on = i === pageNum;
      drawRect(ctx, startX + i * gap - 4, dotY, 8, 8, on ? '#ffe08a' : '#5a5470');
    }
  }

  // Prompts: SPACE turns the page, ESC skips the story. Both are named because
  // the story is skippable BY DESIGN — a kid replaying stage 5 should not have
  // to sit through the prologue again.
  if (tick % 60 < 42) {
    const next = pageNum + 1 < pageCount ? '▶ SPACE: trang tiếp' : '▶ SPACE: bắt đầu!';
    plate(ctx, W / 2, H - 62, next, 18);
    drawText(ctx, next, W / 2, H - 58, 18, '#ffe08a', 'center');
  }
  const skip = 'ESC: bỏ qua chuyện'; // "ESC: skip the story"
  plate(ctx, 20 + ctx.measureText(skip).width / 2, H - 29, skip, 14);
  drawText(ctx, skip, 20, H - 29, 14, '#bfe8ff', 'left');
}

// The chapter-victory scene: shown after clearing a chapter's final stage,
// BEFORE the chapter's closing story pages. A celebration of the whole chapter
// (not one stage), so it names the chapter and counts what was achieved.
export function drawChapterEnd(ctx, W, H, tick, chapter, stageIndex, biome = null, weaponColor = null) {
  drawSceneBackdrop(ctx, W, H, tick, 'rgba(242,197,61,0.14)', biome);
  drawSparkles(ctx, W, H, tick, '#ffffff');
  drawSparkles(ctx, W, H, tick + 20, '#ffe08a');

  plate(ctx, W / 2, 54, `HOÀN THÀNH CHƯƠNG ${chapter.id}!`, 42);
  drawText(ctx, `HOÀN THÀNH CHƯƠNG ${chapter.id}!`, W / 2, 60, 42, '#ffe08a', 'center');
  plate(ctx, W / 2, 112, chapter.name, 26);
  drawText(ctx, chapter.name, W / 2, 114, 26, '#ffffff', 'center');

  // What this chapter meant, in one kid-readable line.
  const summary = {
    1: 'Mười nàng công chúa đã về nhà!',      // "All ten princesses are home!"
    2: 'Bạn đã có Trượng Của Trí Tuệ!',       // "You have the Staff of Wisdom!"
    3: 'Thế giới đã được cứu mãi mãi!',       // "The world is saved forever!"
  }[chapter.id] || 'Tuyệt vời!';
  plate(ctx, W / 2, 156, summary, 20);
  drawText(ctx, summary, W / 2, 158, 20, '#f0c6ff', 'center');

  // Hero celebrating with the chapter's last princess (chapter 1) or alone with
  // the staff (chapters 2-3, which have no princess stages).
  const groundY = H - 90;
  const endHero = heroSprite(weaponColor);
  const lastStage = getStage(chapter.stageStart + chapter.stageCount - 1);
  const hasPrincess = !!(lastStage && lastStage.princessStyle);
  const heroX = hasPrincess ? W / 2 - 110 : W / 2 - 40;
  drawSprite(ctx, endHero, Math.floor(tick / 10) % 2, heroX, groundY - endHero.h * DOT * 2.6, 2.6);
  if (hasPrincess) {
    const p = princessSprite(lastStage.princessStyle);
    const bob = Math.floor(tick / 8) % 2 === 0 ? 0 : -6;
    drawSprite(ctx, p, Math.floor(tick / 16) % 2, W / 2 + 40, groundY - p.h * DOT * 2.6 + bob, 2.6);
  } else {
    // The Staff, held high beside him.
    const s = 2.2;
    drawSprite(ctx, STAFF_WISDOM, Math.floor(tick / 12) % 2, W / 2 + 70, groundY - STAFF_WISDOM.h * DOT * s, s);
  }

  if (tick % 60 < 42) {
    plate(ctx, W / 2, H / 2 + 40, '▶ Nhấn SPACE để xem chuyện tiếp', 18);
    drawText(ctx, '▶ Nhấn SPACE để xem chuyện tiếp', W / 2, H / 2 + 44, 18, '#ffe08a', 'center');
  }
}

// The CREDITS roll, the second half of the Final Ending. A slow upward scroll
// over the sunrise, ending on the thank-you message and the contact address, and
// then it HOLDS (it does not loop away from the message) — the last thing on
// screen should be why the game was made, not a blank sky.
//
// `scrollTick` counts frames since the credits began (main.js resets it), so the
// roll always starts from the bottom rather than mid-scroll.
export function drawCredits(ctx, W, H, tick, scrollTick, biome = null) {
  drawSceneBackdrop(ctx, W, H, tick, 'rgba(24,18,44,0.72)', biome);
  drawSparkles(ctx, W, H, tick, '#ffe08a');

  // Build the roll as a flat list of {text, size, color, gap} lines so the
  // layout is one pass and the total height is known (for the scroll clamp).
  const lines = [];
  lines.push({ text: CREDITS.title, size: 32, color: '#ffe08a', gap: 26 });
  for (const entry of CREDITS.entries) {
    lines.push({ text: entry.role, size: 17, color: '#bfe8ff', gap: 6 });
    for (const n of entry.names) lines.push({ text: n, size: 21, color: '#ffffff', gap: 4 });
    lines.push({ text: '', size: 10, color: '#000', gap: 18 }); // spacer between roles
  }
  lines.push({ text: 'Liên hệ / Contact', size: 16, color: '#bfe8ff', gap: 6 }); // "Contact"
  lines.push({ text: CREDITS.contact, size: 19, color: '#ffe08a', gap: 30 });

  // The closing message, wrapped to the screen width so it never runs off the
  // edge on a narrow window.
  ctx.font = '19px "PixelFont", monospace';
  const maxW = Math.min(W - 80, 760);
  const words = CREDITS.message.split(' ');
  let cur = '';
  const wrapped = [];
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(test).width > maxW && cur) {
      wrapped.push(cur);
      cur = word;
    } else {
      cur = test;
    }
  }
  if (cur) wrapped.push(cur);
  for (const l of wrapped) lines.push({ text: l, size: 19, color: '#f0c6ff', gap: 8 });

  // Total height, so the scroll can stop with the message resting on screen.
  let total = 0;
  for (const l of lines) total += l.size + l.gap;

  // Scroll from just below the bottom edge up to a resting position that leaves
  // the whole roll visible (or the tail of it, if the roll is taller than H).
  const restY = Math.max(70, (H - total) / 2);
  const startY = H + 40;
  const y = Math.max(restY, startY - scrollTick * 0.55);

  // Clip so lines don't paint over the bottom prompt row.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 40, W, H - 100);
  ctx.clip();
  let ly = y;
  for (const l of lines) {
    if (l.text && ly > 0 && ly < H) {
      plate(ctx, W / 2, ly, l.text, l.size);
      drawText(ctx, l.text, W / 2, ly + 2, l.size, l.color, 'center');
    }
    ly += l.size + l.gap;
  }
  ctx.restore();

  if (tick % 60 < 42) {
    plate(ctx, W / 2, H - 58, '▶ Nhấn SPACE để chơi lại từ đầu', 18);
    drawText(ctx, '▶ Nhấn SPACE để chơi lại từ đầu', W / 2, H - 54, 18, '#ffe08a', 'center');
  }
}

// The FINAL ENDING — reached only after the last chapter's closing story.
// The whole saga resolved: the World Devourer destroyed, the ten princesses and
// their powers restored, lasting peace. This is the game's curtain call, so it
// shows everyone at once and states the achievement in the kid's own terms.
// SPACE moves on to the credits roll (drawCredits above).
export function drawGameComplete(ctx, W, H, tick, stageIndex = 0, biome = null, weaponColor = null) {
  // Sunrise wash — the darkness the Devourer swallowed poured back out as
  // morning (see story.js chapter 3 closing).
  drawSceneBackdrop(ctx, W, H, tick, 'rgba(255,196,92,0.16)', biome);
  drawSparkles(ctx, W, H, tick, '#ffffff');
  drawSparkles(ctx, W, H, tick + 20, '#ffe08a');
  drawSparkles(ctx, W, H, tick + 40, '#bfe8ff');

  plate(ctx, W / 2, 40, '✦ THẾ GIỚI ĐÃ ĐƯỢC CỨU! ✦', 40); // "THE WORLD IS SAVED!"
  drawText(ctx, '✦ THẾ GIỚI ĐÃ ĐƯỢC CỨU! ✦', W / 2, 46, 40, '#ffe08a', 'center');
  plate(ctx, W / 2, 96, 'Kẻ Nuốt Thế Giới đã bị đánh bại mãi mãi.', 20);
  drawText(ctx, 'Kẻ Nuốt Thế Giới đã bị đánh bại mãi mãi.', W / 2, 98, 20, '#ffffff', 'center');
  plate(ctx, W / 2, 132, 'Mười nàng công chúa đã trở về, và bóng tối không bao giờ trở lại.', 17);
  drawText(ctx, 'Mười nàng công chúa đã trở về, và bóng tối không bao giờ trở lại.', W / 2, 134, 17, '#f0c6ff', 'center');

  // The real achievement, named plainly — this is a typing game, and finishing
  // it means the kid can type Vietnamese.
  plate(ctx, W / 2, 172, '🏆 Bạn đã gõ được tiếng Việt — Anh Hùng Bàn Phím!', 19);
  drawText(ctx, '🏆 Bạn đã gõ được tiếng Việt — Anh Hùng Bàn Phím!', W / 2, 174, 19, '#ffe08a', 'center');

  // Curtain call: the King, the hero with his final weapon, and all ten
  // princesses lined up in the sunrise.
  const groundY = H - 86;
  drawPrincessRow(ctx, W / 2, groundY - 2, Math.min(W - 80, 840), tick, 1.15, true);

  const endHero = heroSprite(weaponColor);
  const hScale = 2.4;
  drawSprite(ctx, endHero, Math.floor(tick / 10) % 2, W / 2 - 150, groundY - endHero.h * DOT * hScale, hScale);
  const kScale = 2.0;
  drawSprite(ctx, KING, Math.floor(tick / 22) % 2, W / 2 + 90, groundY - KING.h * DOT * kScale, kScale);
  // The Staff, planted between them.
  const sScale = 1.8;
  drawSprite(ctx, STAFF_WISDOM, Math.floor(tick / 12) % 2, W / 2 - 20, groundY - STAFF_WISDOM.h * DOT * sScale, sScale);

  if (tick % 60 < 42) {
    plate(ctx, W / 2, H / 2 + 56, '▶ Nhấn SPACE để xem đoàn làm game', 18); // "...to see the credits"
    drawText(ctx, '▶ Nhấn SPACE để xem đoàn làm game', W / 2, H / 2 + 60, 18, '#ffe08a', 'center');
  }
}
