// chapters.js — the three story chapters, as RANGES over the flat STAGES list.
//
// A chapter owns a contiguous slice of STAGES (stageStart + stageCount), so all
// the stage/upgrade/progress machinery keeps working off one 0-based stage
// index. Chapters are a presentation grouping on top of that, exactly as in the
// typing game.
//
// THE RANGES MUST TILE STAGES EXACTLY — no gap, no overlap, ending at
// STAGES.length. Counts are written out LITERALLY rather than derived, so that
// adding a stage to the wrong chapter FAILS verify.js instead of being silently
// absorbed. chapterForStage falls back to the last chapter rather than throwing,
// which means a gap would otherwise show up only as a wrong on-screen label.

export const CHAPTERS = [
  {
    id: 1,
    name: 'Lệnh Từ Trái Đất',                 // "Earth Order"
    subtitle: 'Đẩy lùi hạm đội quái vật khỏi Trái Đất.',
    stageStart: 0,
    stageCount: 6,   // stages 1-6: the solar system, ending at the Black Commander
  },
  {
    id: 2,
    name: 'Giải Cứu Đồng Đội',                // "Rescue Allies"
    subtitle: 'Cứu năm đồng đội đang bị giam cầm.',
    stageStart: 6,
    stageCount: 12,  // stages 7-18: five rescues (2 stages each) + a 2-stage finale
  },
  {
    id: 3,
    name: 'Cứu Dải Ngân Hà',                  // "Rescue The Galaxy"
    subtitle: 'Vào Cõi Hắc Ám, đánh bại Kẻ Huỷ Diệt.',
    stageStart: 18,
    stageCount: 6,   // stages 19-24: the Darkness Realm, ending at the Destroyer
  },
];

export const TOTAL_CHAPTERS = CHAPTERS.length;

// Which chapter contains a given 0-based stage index.
export function chapterForStage(stageIndex) {
  for (const c of CHAPTERS) {
    if (stageIndex >= c.stageStart && stageIndex < c.stageStart + c.stageCount) return c;
  }
  return CHAPTERS[CHAPTERS.length - 1];
}

// This stage's 1-based position within its chapter (for "MÀN 3 / 6" labels).
export function stageNumberInChapter(stageIndex) {
  const c = chapterForStage(stageIndex);
  return stageIndex - c.stageStart + 1;
}

export function isChapterFinale(stageIndex) {
  const c = chapterForStage(stageIndex);
  return stageIndex === c.stageStart + c.stageCount - 1;
}

export function isChapterStart(stageIndex) {
  const c = chapterForStage(stageIndex);
  return stageIndex === c.stageStart;
}

export function nextChapter(stageIndex) {
  const c = chapterForStage(stageIndex);
  const pos = CHAPTERS.indexOf(c);
  return pos >= 0 && pos + 1 < CHAPTERS.length ? CHAPTERS[pos + 1] : null;
}

export function isFinalChapter(chapter) {
  return chapter === CHAPTERS[CHAPTERS.length - 1];
}
