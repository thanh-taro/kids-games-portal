// The barrier band: timer bar, category badge, question prompt, and
// answer choices, all drawn (and hit-tested) directly on the canvas.
// layout() is the single source of truth for positions — both draw()
// and hitTest() call it, so visuals and tap targets can never drift.
import { fillRoundRect, fitText, drawButton, pointInRect, UI_FONT } from "./pixelart.js";

const CATEGORY_LABEL = {
  math: "🔢 Toán học",
  mathword: "📝 Toán tìm đáp số",
  english: "🔤 Tiếng Anh",
  quiz: "🧠 Đố vui",
  gk: "🌍 Kiến thức chung",
  flag: "🏳️ Cờ các nước",
  cooking: "🍳 Nấu ăn",
};

export function layoutQuestBar(w, barrierTop, quest) {
  const pad = Math.max(12, w * 0.02);
  const timerH = 8;
  const top = barrierTop;
  let y = top + 8;

  const timerY = y;
  y += timerH + 10;

  const badgeH = 26;
  const badgeY = y;
  y += badgeH + 8;

  const promptFontSize = Math.round(Math.min(34, Math.max(18, w * 0.032)));
  const promptH = promptFontSize + 14;
  const promptY = y;
  y += promptH + 10;

  const choices = quest ? quest.choices : [];
  const cols = w >= 640 ? Math.min(4, choices.length || 4) : Math.min(2, choices.length || 2);
  const rows = Math.ceil(choices.length / cols) || 1;
  const gap = 10;
  const btnH = 56;
  const btnW = (w - pad * 2 - gap * (cols - 1)) / cols;

  const cards = choices.map((choice, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      x: pad + col * (btnW + gap),
      y: y + row * (btnH + gap),
      w: btnW,
      h: btnH,
      choice,
    };
  });
  y += rows * btnH + (rows - 1) * gap + 14;

  return {
    top,
    bottom: y,
    barW: w - pad * 2,
    pad,
    timer: { x: pad, y: timerY, w: w - pad * 2, h: timerH },
    badge: { x: pad, y: badgeY, w: 0, h: badgeH },
    prompt: { x: pad, y: promptY, w: w - pad * 2, h: promptH, fontSize: promptFontSize },
    cards,
  };
}

// Draws the barrier as a row of vertical wood planks: flat alternating
// plank colors with a solid seam line between them — no gradients or
// shading, just flat shapes, so it reads as a wooden barricade without
// breaking flat design.
function drawWoodPlanks(ctx, x, y, w, h) {
  const plankW = 42;
  const count = Math.ceil(w / plankW) + 1;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  for (let i = -1; i < count; i++) {
    const px = x + i * plankW;
    ctx.fillStyle = i % 2 === 0 ? "#a9703f" : "#9c6538";
    ctx.fillRect(px, y, plankW, h);

    // Seam line between planks.
    ctx.fillStyle = "#7d4f2a";
    ctx.fillRect(px, y, 2, h);
  }

  ctx.restore();
}

export function drawQuestBar(ctx, w, barrierTop, state) {
  const { quest, timerFraction, timerWarn, answered } = state;
  const m = layoutQuestBar(w, barrierTop, quest);

  // Barrier plate: a calm flat panel behind the question/buttons so kids
  // stay focused on the content, framed by thin wood-plank strips along
  // the top and bottom edges for visual interest without the clutter.
  const barH = m.bottom - m.top;
  const woodStripH = Math.min(22, barH * 0.18);
  fillRoundRect(ctx, 0, m.top, w, barH, 0, "#4b5563");
  drawWoodPlanks(ctx, 0, m.top, w, woodStripH);
  drawWoodPlanks(ctx, 0, m.bottom - woodStripH, w, woodStripH);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(0, m.bottom - 3, w, 3);

  // Jagged nail fringe along the bottom edge.
  const toothW = 18;
  const toothH = 16;
  ctx.fillStyle = "#dc2626";
  for (let x = -toothW; x < w + toothW; x += toothW) {
    ctx.beginPath();
    ctx.moveTo(x, m.bottom);
    ctx.lineTo(x + toothW / 2, m.bottom + toothH);
    ctx.lineTo(x + toothW, m.bottom);
    ctx.closePath();
    ctx.fill();
  }

  if (!quest) return m;

  // Timer track + fill.
  fillRoundRect(ctx, m.timer.x, m.timer.y, m.timer.w, m.timer.h, m.timer.h / 2, "rgba(255,255,255,0.2)");
  const fillW = Math.max(0, m.timer.w * timerFraction);
  if (fillW > 0) {
    fillRoundRect(ctx, m.timer.x, m.timer.y, fillW, m.timer.h, m.timer.h / 2, timerWarn ? "#ef4444" : "#22c55e");
  }

  // Category badge.
  const label = CATEGORY_LABEL[quest.category] || "";
  ctx.font = `700 15px ${UI_FONT}`;
  const textW = ctx.measureText(label).width;
  const badgeW = textW + 24;
  fillRoundRect(ctx, m.badge.x, m.badge.y, badgeW, m.badge.h, m.badge.h / 2, "#fbbf24");
  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, m.badge.x + badgeW / 2, m.badge.y + m.badge.h / 2 + 1);

  // Prompt.
  ctx.fillStyle = "#ffffff";
  fitText(ctx, quest.prompt, m.prompt.x + m.prompt.w / 2, m.prompt.y + m.prompt.h / 2, m.prompt.w, m.prompt.fontSize, 14, UI_FONT);

  // Choice buttons.
  for (const card of m.cards) {
    let fill = "#ffffff";
    let textColor = "#0f172a";
    if (answered) {
      if (card.choice === answered.answer) fill = "#22c55e";
      else if (card.choice === answered.picked && !answered.correct) fill = "#ef4444";
      if (fill !== "#ffffff") textColor = "#ffffff";
    }
    drawButton(ctx, card, String(card.choice), { fill, textColor, fontSize: 22 });
  }

  return m;
}

export function hitTestQuestBar(w, barrierTop, quest, px, py) {
  if (!quest) return null;
  const m = layoutQuestBar(w, barrierTop, quest);
  for (const card of m.cards) {
    if (pointInRect(px, py, card)) return card.choice;
  }
  return null;
}

// Chunks of the barrier plate to send tumbling when a correct answer
// breaks it open. Generated once (from the layout the barrier had right
// before breaking) and animated by the caller.
export function makeBarrierDebris(w, barrierTop, quest) {
  const m = layoutQuestBar(w, barrierTop, quest);
  const cols = 7;
  const rows = 3;
  const pieceW = w / cols;
  const pieceH = (m.bottom - m.top) / rows;
  const pieces = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      pieces.push({
        x: c * pieceW,
        y: m.top + r * pieceH,
        w: pieceW,
        h: pieceH,
        vx: (Math.random() - 0.5) * 220,
        vy: -60 - Math.random() * 120,
        rot: 0,
        vrot: (Math.random() - 0.5) * 6,
        life: 1,
      });
    }
  }
  return pieces;
}

export function drawBarrierDebris(ctx, pieces) {
  ctx.save();
  for (const p of pieces) {
    if (p.life <= 0) continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    ctx.rotate(p.rot);
    ctx.fillStyle = "#4b5563";
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }
  ctx.restore();
}

export function updateBarrierDebris(pieces, dt) {
  for (const p of pieces) {
    p.x += p.vx * (dt / 1000);
    p.y += p.vy * (dt / 1000);
    p.vy += 500 * (dt / 1000);
    p.rot += p.vrot * (dt / 1000);
    p.life -= dt / 700;
  }
}
