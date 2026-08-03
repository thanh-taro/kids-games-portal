// chapters.js — story chapters that group the flat STAGES[] list.
//
// A chapter is one tale in the hero's saga. It owns a contiguous RANGE of the
// single linear STAGES[] list (stageStart + stageCount), so all the existing
// stage/reward/progress machinery — which works off one 0-based stage index —
// stays untouched. Chapters are a presentation grouping on top of that.
//
// The three chapters follow the prologue: the King's request (rescue the ten
// princesses), the quest for the Staff of Wisdom (courage alone is not enough),
// and the final confrontation with the World Devourer.
//
// The ranges must TILE STAGES exactly — no gap, no overlap, ending exactly at
// STAGES.length. `chapterForStage` falls back to the last chapter rather than
// throwing, so a gap would show up only as a wrong on-screen label; `verify.js`
// asserts the tiling instead. Counts are written out literally (not derived from
// STAGES.length) so that adding a stage to the wrong chapter FAILS the check
// instead of silently absorbing it.
//
// Each chapter's narration (opening pages, closing pages) lives in story.js,
// keyed by the `id` here.

export const CHAPTERS = [
  {
    id: 1,
    name: 'Lời Thỉnh Cầu Của Đức Vua', // "The King's Request"
    subtitle: 'Giải cứu mười nàng công chúa.', // "Rescue the ten princesses."
    stageStart: 0,
    stageCount: 12, // stages 1-12: two warm-ups + the ten princess rescues
    comingSoon: false,
  },
  {
    id: 2,
    name: 'Trượng Của Trí Tuệ',        // "The Staff of Wisdom"
    subtitle: 'Đi tìm cây trượng cổ xưa.', // "Seek the ancient staff."
    stageStart: 12,
    stageCount: 8, // stages 13-20: the trials, ending at the Staff's Guardian
    comingSoon: false,
  },
  {
    id: 3,
    name: 'Trận Chiến Cuối Cùng',      // "The Final Confrontation"
    subtitle: 'Đánh bại Kẻ Nuốt Thế Giới.', // "Defeat the World Devourer."
    stageStart: 20,
    stageCount: 6, // stages 21-26: the siege, ending with the Demon King
    comingSoon: false,
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

// Is this stage the FIRST of its chapter? (The chapter's opening story plays
// before it.)
export function isChapterStart(stageIndex) {
  const c = chapterForStage(stageIndex);
  return stageIndex === c.stageStart;
}

// The next chapter after the one containing stageIndex, or null if none.
export function nextChapter(stageIndex) {
  const c = chapterForStage(stageIndex);
  const pos = CHAPTERS.indexOf(c);
  return pos >= 0 && pos + 1 < CHAPTERS.length ? CHAPTERS[pos + 1] : null;
}

// Is this the very last chapter with playable stages? (Its finale ends the game
// and rolls the Final Ending rather than handing off to a next chapter.)
export function isFinalChapter(chapter) {
  return chapter === PLAYABLE_CHAPTERS[PLAYABLE_CHAPTERS.length - 1];
}
