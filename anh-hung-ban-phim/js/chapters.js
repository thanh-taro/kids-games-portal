// chapters.js — story chapters that group the flat STAGES[] list.
//
// A chapter is one tale in the hero's saga. It owns a contiguous RANGE of the
// single linear STAGES[] list (stageStart + stageCount), so all the existing
// stage/reward/progress machinery — which works off one 0-based stage index —
// stays untouched. Chapters are a presentation grouping on top of that.
//
// Adding a future chapter later:
//   1. Append its stages to STAGES[] in stages.js.
//   2. Flip its `comingSoon` off and set stageStart (= previous chapter's
//      stageStart + stageCount) and stageCount here.
// Nothing else needs to change.

import { STAGES } from './stages.js';

export const CHAPTERS = [
  {
    id: 1,
    name: 'Giải Cứu Những Nàng Công Chúa Bị Bắt Cóc', // "Rescue the Kidnapped Princesses"
    subtitle: 'Câu chuyện đầu tiên của người anh hùng.', // "The hero's first tale."
    stageStart: 0,      // 0-based index into STAGES[] of this chapter's first stage
    stageCount: STAGES.length, // Chapter 1 currently holds every existing stage
    comingSoon: false,
  },
  {
    id: 2,
    name: 'Chương Kế Tiếp',             // "The Next Chapter"
    subtitle: 'Cuộc phiêu lưu mới đang chờ...', // "A new adventure awaits..."
    stageStart: STAGES.length,
    stageCount: 0,
    comingSoon: true,
  },
];

// The last chapter that actually has playable stages (comingSoon chapters
// with no stages are excluded).
export const PLAYABLE_CHAPTERS = CHAPTERS.filter((c) => !c.comingSoon && c.stageCount > 0);

export const TOTAL_CHAPTERS = CHAPTERS.length;

// Which chapter contains a given (0-based) global stage index. Falls back to
// the last playable chapter so an out-of-range index never returns undefined.
export function chapterForStage(stageIndex) {
  for (const c of CHAPTERS) {
    if (c.stageCount > 0 && stageIndex >= c.stageStart && stageIndex < c.stageStart + c.stageCount) {
      return c;
    }
  }
  return PLAYABLE_CHAPTERS[PLAYABLE_CHAPTERS.length - 1];
}

// This stage's 1-based position WITHIN its chapter (for "MÀN 3 / 10" labels).
export function stageNumberInChapter(stageIndex) {
  const c = chapterForStage(stageIndex);
  return stageIndex - c.stageStart + 1;
}

// Is this stage the final one of its chapter?
export function isChapterFinale(stageIndex) {
  const c = chapterForStage(stageIndex);
  return stageIndex === c.stageStart + c.stageCount - 1;
}

// The next chapter after the one containing stageIndex, or null if none.
export function nextChapter(stageIndex) {
  const c = chapterForStage(stageIndex);
  const pos = CHAPTERS.indexOf(c);
  return pos >= 0 && pos + 1 < CHAPTERS.length ? CHAPTERS[pos + 1] : null;
}
