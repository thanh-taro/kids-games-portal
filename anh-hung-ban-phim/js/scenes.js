// scenes.js — non-gameplay screens drawn on the canvas.
//
// Each function draws one full-screen scene. main.js decides which to call
// based on the current game state, and passes the data each needs.

import { drawSprite, drawScene, drawText, drawRect, DOT } from './render.js';
import { SPRITES, CLOUD, CACTUS, ROCK, BUSH, SUN } from './sprites.js';
import { chapterForStage, stageNumberInChapter, nextChapter } from './chapters.js';
import { drawAura } from './effects.js';

// Animated sparkles (used as celebratory dots over the desert on some scenes).
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

// Shared desert backdrop for the menu scenes: the same pixel world as gameplay
// (sky, sand, layered ground) plus sun, clouds, and grounded scenery props.
// `tint` optionally washes the whole scene with a mood color (rgba string).
function drawSceneBackdrop(ctx, W, H, tick, tint = null) {
  const groundY = H - 90;
  drawScene(ctx, W, H, groundY);

  // Sun in the top-left corner.
  drawSprite(ctx, SUN, 0, 50, 40, 3);

  // Drifting clouds in the upper sky, kept to the right of the sun.
  const c1 = (tick * 0.3) % (W - 260) + 240;
  const c2 = (tick * 0.2) % (W - 320) + 300;
  drawSprite(ctx, CLOUD, 0, c1, 60, 3);
  drawSprite(ctx, CLOUD, 0, c2, 110, 2);

  // Grounded scenery: cacti, a rock, a bush spread across the ground line
  // (positions chosen to stay clear of the hero/princess in the foreground).
  const foot = (sprite, scale) => groundY - sprite.h * DOT * scale;
  drawSprite(ctx, CACTUS, 0, W * 0.10, foot(CACTUS, 2), 2);
  drawSprite(ctx, ROCK, 0, W * 0.72, foot(ROCK, 2), 2);
  drawSprite(ctx, BUSH, 0, W * 0.80, foot(BUSH, 2), 2);
  drawSprite(ctx, CACTUS, 0, W * 0.90, foot(CACTUS, 1.5), 1.5);

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

// `hero` describes the kid's ACTUAL equipped look so the home screen shows the
// hero they've built: { spriteId, weaponColor, rankGlow, rankName, rankEmoji,
// rankColor }. Falls back to the base knight when nothing is unlocked yet.
export function drawTitle(ctx, W, H, tick, stageIndex = 0, hero = {}) {
  drawSceneBackdrop(ctx, W, H, tick);

  plate(ctx, W / 2, 84, 'ANH HÙNG BÀN PHÍM', 40);
  drawText(ctx, 'ANH HÙNG BÀN PHÍM', W / 2, 90, 40, '#ffffff', 'center');
  plate(ctx, W / 2, 140, 'Học gõ Tiếng Việt — Telex', 18);
  drawText(ctx, 'Học gõ Tiếng Việt — Telex', W / 2, 142, 18, '#ffe08a', 'center');

  // Current chapter of the saga.
  const chapter = chapterForStage(stageIndex);
  const chapLabel = `CHƯƠNG ${chapter.id}: ${chapter.name}`;
  plate(ctx, W / 2, 176, chapLabel, 16);
  drawText(ctx, chapLabel, W / 2, 178, 16, '#f0c6ff', 'center');

  // Hero + princess standing on the ground line. The hero uses the kid's
  // equipped skin, glows with their earned rank aura, and gets a small weapon
  // glint in their current weapon color — so the home screen reflects who
  // they've become, not a generic knight.
  const groundY = H - 90;
  const heroSprite = SPRITES[hero.spriteId] || SPRITES.hero_knight;
  const heroScale = 2;
  const heroX = W / 2 - 120;
  const heroY = groundY - heroSprite.h * DOT * heroScale;
  const hw = heroSprite.w * DOT * heroScale;
  const hh = heroSprite.h * DOT * heroScale;
  if (hero.rankGlow) {
    drawAura(ctx, heroX + hw / 2, heroY + hh / 2, hw * 0.85, hero.rankGlow, tick);
  }
  drawSprite(ctx, heroSprite, Math.floor(tick / 10) % 2, heroX, heroY, heroScale);
  // Weapon-color glint bobbing beside the hero (hint of the equipped weapon).
  if (hero.weaponColor) {
    const gy = heroY + hh * 0.4 + Math.sin(tick / 12) * 4;
    drawRect(ctx, heroX + hw + 6, gy, DOT * 2, DOT * 2, '#1a1423');
    drawRect(ctx, heroX + hw + 8, gy + 2, DOT * 1.2, DOT * 1.2, hero.weaponColor);
  }
  // Rank title plate floating ABOVE the hero's head (below-hero would collide
  // with the SPACE prompt on the ground line), so the kid sees their earned rank.
  if (hero.rankName) {
    const label = `${hero.rankEmoji || ''} ${hero.rankName}`.trim();
    plate(ctx, heroX + hw / 2, heroY - 28, label, 16);
    drawText(ctx, label, heroX + hw / 2, heroY - 26, 16, hero.rankColor || '#fff4d6', 'center');
  }
  drawSprite(ctx, SPRITES.princess, 0, W / 2 + 70, groundY - SPRITES.princess.h * DOT * 2, 2);

  // SPACE prompt raised toward center so a kid's eye lands on it easily
  // (kept above the standing hero/princess and the H/R hints below).
  if (tick % 60 < 40) {
    plate(ctx, W / 2, H / 2 + 40, '▶ Nhấn SPACE để bắt đầu', 20);
    drawText(ctx, '▶ Nhấn SPACE để bắt đầu', W / 2, H / 2 + 44, 20, '#ffe08a', 'center');
  }
  // How-to-play + reset hints.
  plate(ctx, W / 2, H - 46, 'Nhấn H để học cách chơi', 16);
  drawText(ctx, 'Nhấn H để học cách chơi', W / 2, H - 44, 16, '#bfe8ff', 'center');
  plate(ctx, W / 2, H - 22, 'Nhấn R để chơi lại từ đầu', 16);
  drawText(ctx, 'Nhấn R để chơi lại từ đầu', W / 2, H - 20, 16, '#fff4d6', 'center');
}

export function drawStageIntro(ctx, W, H, tick, stage, stageIndex = 0) {
  drawSceneBackdrop(ctx, W, H, tick);

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
  drawSprite(ctx, SPRITES.hero_knight, Math.floor(tick / 8) % 2, hx, groundY - SPRITES.hero_knight.h * DOT * 2, 2);

  // SPACE prompt raised toward center for easy visibility (below the intro
  // text block above, above the jogging hero on the ground line).
  if (tick % 60 < 40) {
    plate(ctx, W / 2, H / 2 + 50, '▶ Nhấn SPACE để vào trận', 18);
    drawText(ctx, '▶ Nhấn SPACE để vào trận', W / 2, H / 2 + 54, 18, '#ffe08a', 'center');
  }
}

export function drawVictory(ctx, W, H, tick, stage) {
  drawSceneBackdrop(ctx, W, H, tick, 'rgba(242,197,61,0.12)'); // warm golden wash
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
  drawSprite(ctx, SPRITES.hero_knight, Math.floor(tick / 10) % 2, heroX, groundY - SPRITES.hero_knight.h * DOT * 3, 3);
  if (stage.princess) {
    drawSprite(ctx, SPRITES.princess, 0, W / 2 + 20, groundY - SPRITES.princess.h * DOT * 3 + bob, 3);
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

export function drawReward(ctx, W, H, tick, reward) {
  drawSceneBackdrop(ctx, W, H, tick, 'rgba(242,197,61,0.10)');
  drawSparkles(ctx, W, H, tick, '#ffffff');

  const typeLabel =
    reward.type === 'weapon' ? 'VŨ KHÍ MỚI' : reward.type === 'skin' ? 'TRANG PHỤC MỚI' : 'KỸ NĂNG MỚI';
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

  // Reward icon: a big dot in its theme color.
  const iconColor = reward.projectileColor || '#f2c53d';
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

export function drawFailure(ctx, W, H, tick, stage) {
  // Desert at dusk: darkened + red wash.
  drawSceneBackdrop(ctx, W, H, tick, 'rgba(60,10,10,0.55)');

  plate(ctx, W / 2, H / 2 - 84, 'THẤT BẠI...', 44);
  drawText(ctx, 'THẤT BẠI...', W / 2, H / 2 - 80, 44, '#ff6a5a', 'center');
  plate(ctx, W / 2, H / 2 - 22, 'Anh hùng đã ngã xuống.', 18);
  drawText(ctx, 'Anh hùng đã ngã xuống.', W / 2, H / 2 - 20, 18, '#ffffff', 'center');
  plate(ctx, W / 2, H / 2 + 12, 'Đừng bỏ cuộc — hãy thử lại!', 16);
  drawText(ctx, 'Đừng bỏ cuộc — hãy thử lại!', W / 2, H / 2 + 14, 16, '#e0d0d0', 'center');

  // Fallen hero lying on the ground line.
  const groundY = H - 90;
  drawSprite(ctx, SPRITES.hero_knight, 0, W / 2 - 18, groundY - SPRITES.hero_knight.h * DOT * 2, 2);

  // SPACE prompt raised toward center for easy visibility (below the
  // encouragement text, above the fallen hero on the ground line).
  if (tick % 60 < 40) {
    plate(ctx, W / 2, H / 2 + 50, '▶ Nhấn SPACE để thử lại màn này', 18);
    drawText(ctx, '▶ Nhấn SPACE để thử lại màn này', W / 2, H / 2 + 54, 18, '#ffe08a', 'center');
  }
}

export function drawGameComplete(ctx, W, H, tick, stageIndex = 0) {
  drawSceneBackdrop(ctx, W, H, tick, 'rgba(242,197,61,0.12)');
  drawSparkles(ctx, W, H, tick, '#ffffff');
  drawSparkles(ctx, W, H, tick + 20, '#bfe8ff');

  const chapter = chapterForStage(stageIndex);
  const upcoming = nextChapter(stageIndex);

  plate(ctx, W / 2, H / 2 - 110, `HẾT CHƯƠNG ${chapter.id}!`, 44);
  drawText(ctx, `HẾT CHƯƠNG ${chapter.id}!`, W / 2, H / 2 - 106, 44, '#ffe08a', 'center');
  plate(ctx, W / 2, H / 2 - 56, chapter.name, 22);
  drawText(ctx, chapter.name, W / 2, H / 2 - 54, 22, '#ffffff', 'center');
  plate(ctx, W / 2, H / 2 - 20, 'Bạn đã cứu tất cả công chúa!', 18);
  drawText(ctx, 'Bạn đã cứu tất cả công chúa!', W / 2, H / 2 - 18, 18, '#f0c6ff', 'center');

  // Teaser for the next chapter (coming soon).
  if (upcoming) {
    const teaser = upcoming.comingSoon
      ? `CHƯƠNG ${upcoming.id}: ${upcoming.name} — Sắp ra mắt!` // "...Coming soon!"
      : `Tiếp theo: Chương ${upcoming.id} — ${upcoming.name}`;
    plate(ctx, W / 2, H / 2 + 16, teaser, 16);
    drawText(ctx, teaser, W / 2, H / 2 + 18, 16, '#bfe8ff', 'center');
  }

  // Hero + princess celebrating.
  const groundY = H - 90;
  drawSprite(ctx, SPRITES.hero_knight, Math.floor(tick / 10) % 2, W / 2 - 90, groundY - SPRITES.hero_knight.h * DOT * 2, 2);
  drawSprite(ctx, SPRITES.princess, 0, W / 2 + 50, groundY - SPRITES.princess.h * DOT * 2, 2);

  // SPACE prompt raised toward center for easy visibility (below the chapter
  // teaser, above the celebrating hero + princess on the ground line).
  if (tick % 60 < 40) {
    plate(ctx, W / 2, H / 2 + 50, '▶ Nhấn SPACE để chơi lại', 18);
    drawText(ctx, '▶ Nhấn SPACE để chơi lại', W / 2, H / 2 + 54, 18, '#ffe08a', 'center');
  }
}
