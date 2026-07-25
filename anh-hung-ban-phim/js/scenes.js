// scenes.js — non-gameplay screens drawn on the canvas.
//
// Each function draws one full-screen scene. main.js decides which to call
// based on the current game state, and passes the data each needs.

import { drawSprite, drawText, drawRect, DOT } from './render.js';
import { heroSprite, princessSprite } from './sprites.js';
import { chapterForStage, stageNumberInChapter, nextChapter } from './chapters.js';
import { getStage } from './stages.js';
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
  plate(ctx, W / 2, menuY + 58, 'Nhấn R để chơi lại từ đầu', 16);
  drawText(ctx, 'Nhấn R để chơi lại từ đầu', W / 2, menuY + 60, 16, '#fff4d6', 'center');

  // Fullscreen tip, bottom-LEFT so it clears the always-on mute hint that
  // `main.js` draws bottom-right. Gently blinking (slower than the SPACE
  // prompt) so it reads as advice, not as another menu item to press.
  // English gloss: "Tip: press <key> for fullscreen — much more fun!"
  const tip = `💡 Mẹo: nhấn ${FULLSCREEN_KEY} để chơi toàn màn hình — vui hơn nhiều! Và tắt các chương trình gõ tiếng Việt trước khi chơi nhé!`;
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

export function drawGameComplete(ctx, W, H, tick, stageIndex = 0, biome = null, weaponColor = null) {
  drawSceneBackdrop(ctx, W, H, tick, 'rgba(242,197,61,0.12)', biome);
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
  // The chapter's LAST princess stands with the hero at the end — she's the one
  // the final stage rescued, so the closing shot matches the story just told.
  const endHero = heroSprite(weaponColor);
  const lastStage = getStage(chapter.stageStart + chapter.stageCount - 1);
  const endPrincess = princessSprite(lastStage && lastStage.princessStyle);
  drawSprite(ctx, endHero, Math.floor(tick / 10) % 2, W / 2 - 90, groundY - endHero.h * DOT * 2, 2);
  drawSprite(ctx, endPrincess, Math.floor(tick / 16) % 2, W / 2 + 50, groundY - endPrincess.h * DOT * 2, 2);

  // SPACE prompt raised toward center for easy visibility (below the chapter
  // teaser, above the celebrating hero + princess on the ground line).
  if (tick % 60 < 40) {
    plate(ctx, W / 2, H / 2 + 50, '▶ Nhấn SPACE để chơi lại', 18);
    drawText(ctx, '▶ Nhấn SPACE để chơi lại', W / 2, H / 2 + 54, 18, '#ffe08a', 'center');
  }
}
