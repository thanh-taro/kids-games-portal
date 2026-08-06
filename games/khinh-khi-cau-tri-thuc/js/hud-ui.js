// HUD pills (home / stage / best) and the start / game-over overlay
// screens — all drawn straight on the canvas, with layout()+hitTest()
// pairs for anything tappable so visuals and tap targets stay in sync.
import { fillRoundRect, strokeRoundRect, fitText, drawButton, pointInRect, UI_FONT } from "./pixelart.js";

export function layoutHud(w) {
  const pillH = 40;
  const y = 12;
  const homeSize = 40;
  const home = { x: 12, y, w: homeSize, h: homeSize };
  const stageW = Math.min(180, w * 0.32);
  const stage = { x: w / 2 - stageW / 2, y, w: stageW, h: pillH };
  const bestW = Math.min(190, w * 0.34);
  const best = { x: w - 12 - bestW, y, w: bestW, h: pillH };
  return { home, stage, best, bottom: y + pillH + 12 };
}

export function drawHud(ctx, w, stageNum, bestNum) {
  const m = layoutHud(w);

  fillRoundRect(ctx, m.home.x, m.home.y, m.home.w, m.home.h, m.home.h / 2, "#1e293b");
  ctx.font = `${Math.round(m.home.h * 0.55)}px ${UI_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🏠", m.home.x + m.home.w / 2, m.home.y + m.home.h / 2 + 1);

  drawPill(ctx, m.stage, `🏔️ Tầng · ${stageNum}`);
  drawPill(ctx, m.best, `🏆 Kỷ lục · ${bestNum}`);

  return m;
}

function drawPill(ctx, rect, text) {
  fillRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, rect.h / 2, "#1e293b");
  ctx.fillStyle = "#ffffff";
  fitText(ctx, text, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, rect.w - 16, 16, 10, UI_FONT);
}

export function hitTestHud(w, px, py) {
  const m = layoutHud(w);
  if (pointInRect(px, py, m.home)) return "home";
  return null;
}

// --- Sound controls ----------------------------------------------------
// A pair of small icon buttons (SFX + music) drawn bottom-left on every
// scene — idle, playing, answered, gameover — so the toggle is always
// reachable regardless of what else is on screen. Bottom-left is clear of
// the top HUD row (home / stage / best) on every scene, so it never has
// to fight another element for space.

export function layoutSoundControls(w, h) {
  const size = 40;
  const y = h - 12 - size;
  const sound = { x: 12, y, w: size, h: size };
  const music = { x: 12 + size + 8, y, w: size, h: size };
  return { sound, music };
}

export function drawSoundControls(ctx, w, h, soundOn, musicOn) {
  const m = layoutSoundControls(w, h);
  ctx.font = `${Math.round(m.sound.h * 0.5)}px ${UI_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  fillRoundRect(ctx, m.sound.x, m.sound.y, m.sound.w, m.sound.h, m.sound.h / 2, "#1e293b");
  ctx.fillText(soundOn ? "🔊" : "🔇", m.sound.x + m.sound.w / 2, m.sound.y + m.sound.h / 2 + 1);

  fillRoundRect(ctx, m.music.x, m.music.y, m.music.w, m.music.h, m.music.h / 2, "#1e293b");
  ctx.fillText(musicOn ? "🎵" : "🎵", m.music.x + m.music.w / 2, m.music.y + m.music.h / 2 + 1);
  if (!musicOn) {
    // A slash through the note reads clearer than swapping emoji glyphs
    // (no universal "muted music note" emoji renders consistently).
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(m.music.x + 9, m.music.y + m.music.h - 9);
    ctx.lineTo(m.music.x + m.music.w - 9, m.music.y + 9);
    ctx.stroke();
  }

  return m;
}

export function hitTestSoundControls(w, h, px, py) {
  const m = layoutSoundControls(w, h);
  if (pointInRect(px, py, m.sound)) return "sound";
  if (pointInRect(px, py, m.music)) return "music";
  return null;
}

// --- Start overlay ---------------------------------------------------

export function layoutStartOverlay(w, h) {
  const cardW = Math.min(440, w - 48);
  const cx = w / 2;
  const btnW = Math.min(260, cardW * 0.7);
  const btnH = 56;
  const btn = { x: cx - btnW / 2, y: h / 2 + 90, w: btnW, h: btnH };
  return { cx, cardW, btn };
}

export function drawStartOverlay(ctx, w, h, best = 0) {
  ctx.save();
  ctx.fillStyle = "rgba(15,23,42,0.85)";
  ctx.fillRect(0, 0, w, h);

  const m = layoutStartOverlay(w, h);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";

  ctx.font = `800 ${Math.round(Math.min(40, w * 0.055))}px ${UI_FONT}`;
  wrapText(ctx, "🎈 Khinh Khí Cầu Tri Thức", m.cx, h / 2 - 130, m.cardW, 40);

  ctx.font = `600 ${Math.round(Math.min(18, w * 0.026))}px ${UI_FONT}`;
  ctx.globalAlpha = 0.92;
  wrapText(
    ctx,
    "Trả lời đúng để khinh khí cầu bay qua từng tầng mây. Trả lời sai hoặc chậm quá, đinh nhọn sẽ làm nổ khinh khí cầu!",
    m.cx,
    h / 2 - 50,
    m.cardW,
    24
  );
  ctx.globalAlpha = 1;

  if (best > 0) {
    // A gold trophy badge, not a plain pill — this is a kid's brag point
    // before they even start playing, so it gets the same trophy styling
    // as the new-record moment on the game-over screen.
    const badgeW = Math.min(220, m.cardW * 0.6);
    const badgeH = 64;
    const badgeY = h / 2 + 4;
    fillRoundRect(ctx, m.cx - badgeW / 2, badgeY, badgeW, badgeH, 18, "#fbbf24");
    strokeRoundRect(ctx, m.cx - badgeW / 2, badgeY, badgeW, badgeH, 18, "#f59e0b", 3);
    ctx.fillStyle = "#78350f";
    ctx.textBaseline = "middle";
    ctx.font = `700 12px ${UI_FONT}`;
    ctx.fillText("KỶ LỤC", m.cx, badgeY + 16);
    ctx.font = `800 30px ${UI_FONT}`;
    ctx.fillText(`🏆 Tầng ${best}`, m.cx, badgeY + badgeH / 2 + 12);
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffffff";
  }

  drawButton(ctx, m.btn, "Bắt đầu ▶", { fill: "#fbbf24", fontSize: 20 });
  ctx.restore();
  return m;
}

export function hitTestStartOverlay(w, h, px, py) {
  const m = layoutStartOverlay(w, h);
  return pointInRect(px, py, m.btn) ? "start" : null;
}

// --- Game-over overlay -------------------------------------------------

export function layoutGameOverOverlay(w, h, isNewBest = false) {
  const cardW = Math.min(440, w - 48);
  const cx = w / 2;
  const boxW = 130;
  const boxH = 90;
  const gap = 16;
  const boxesY = h / 2 - 10;
  // On a new record, "Tầng đạt" and "Kỷ lục" are the same number, so the
  // best-box is dropped in favor of a single centered stage box — the
  // trophy badge below is where that number gets its moment.
  const stageBox = isNewBest
    ? { x: cx - boxW / 2, y: boxesY, w: boxW, h: boxH }
    : { x: cx - gap / 2 - boxW, y: boxesY, w: boxW, h: boxH };
  const bestBox = { x: cx + gap / 2, y: boxesY, w: boxW, h: boxH };
  // A new record gets a bigger, standalone trophy badge below the stat
  // box(es) instead of sharing their size — this is the moment the kid
  // actually wants to screenshot, so it needs to read as the biggest
  // thing on the card.
  const trophyH = 118;
  const trophyY = boxesY + boxH + 18;
  const trophy = { x: cx - cardW / 2, y: trophyY, w: cardW, h: trophyH };
  const btnY = isNewBest ? trophyY + trophyH + 24 : h / 2 + 150;
  const btnW = Math.min(260, cardW * 0.7);
  const btnH = 56;
  const btn = { x: cx - btnW / 2, y: btnY, w: btnW, h: btnH };
  return { cx, cardW, stageBox, bestBox, trophy, btn };
}

// Ease-out cubic — fast start, gentle settle. Used for both the count-up
// and the trophy's pop-in scale so they feel like one coordinated beat
// rather than two unrelated animations firing at once.
function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

export function drawGameOverOverlay(ctx, w, h, stageReached, best, isNewBest, sinceGameOverMs = Infinity) {
  ctx.save();
  ctx.fillStyle = "rgba(15,23,42,0.85)";
  ctx.fillRect(0, 0, w, h);

  const m = layoutGameOverOverlay(w, h, isNewBest);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${Math.round(Math.min(38, w * 0.05))}px ${UI_FONT}`;
  ctx.fillText("💥 Khinh Khí Cầu Đã Nổ!", m.cx, h / 2 - 130);

  ctx.font = `500 ${Math.round(Math.min(17, w * 0.024))}px ${UI_FONT}`;
  ctx.globalAlpha = 0.92;
  ctx.fillText("Khinh khí cầu đã nổ. Cố gắng hơn nữa nào!", m.cx, h / 2 - 90);
  ctx.globalAlpha = 1;

  drawStatBox(ctx, m.stageBox, stageReached, "Tầng đạt");
  if (!isNewBest) drawStatBox(ctx, m.bestBox, best, "Kỷ lục");

  if (isNewBest) {
    drawTrophyBadge(ctx, m.trophy, best, sinceGameOverMs);
  }

  drawButton(ctx, m.btn, "Chơi lại ▶", { fill: "#fbbf24", fontSize: 20 });
  ctx.restore();
  return m;
}

function drawStatBox(ctx, rect, value, label) {
  fillRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 16, "rgba(255,255,255,0.12)");
  ctx.fillStyle = "#fbbf24";
  ctx.font = `800 34px ${UI_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(value), rect.x + rect.w / 2, rect.y + rect.h / 2 - 10);
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 13px ${UI_FONT}`;
  ctx.globalAlpha = 0.85;
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 24);
  ctx.globalAlpha = 1;
}

// The "new record" moment: a big gold trophy badge that pops in with a
// spring-ish scale and counts the number up from 0, so a kid sees the
// number actually climb to their new best rather than just appearing.
// Flat design throughout (solid fills, no gradients/shadows) — only the
// scale/count-up carries the celebration.
function drawTrophyBadge(ctx, rect, best, sinceMs) {
  const popMs = 420;
  const countMs = 900;
  const popT = Math.max(0, Math.min(1, sinceMs / popMs));
  const scale = 0.6 + easeOutCubic(popT) * 0.4;
  const countT = Math.max(0, Math.min(1, (sinceMs - 120) / countMs));
  const shown = Math.round(best * easeOutCubic(countT));

  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;

  ctx.save();
  ctx.globalAlpha = Math.min(1, popT * 2);
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);

  fillRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 20, "#fbbf24");
  strokeRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 20, "#f59e0b", 4);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#78350f";
  ctx.font = `800 15px ${UI_FONT}`;
  ctx.fillText("🌟 KỶ LỤC MỚI! 🌟", cx, rect.y + 24);

  ctx.font = `800 44px ${UI_FONT}`;
  ctx.fillText(`🏆 ${shown}`, cx, rect.y + rect.h / 2 + 16);

  ctx.restore();
}

export function hitTestGameOverOverlay(w, h, px, py, isNewBest = false) {
  const m = layoutGameOverOverlay(w, h, isNewBest);
  return pointInRect(px, py, m.btn) ? "retry" : null;
}

// --- shared helper -----------------------------------------------------

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  const lines = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineHeight));
}
