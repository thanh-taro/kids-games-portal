// calendar.js — pure calendar math, no state, no imports. Time flows on
// its own as the player plays, independent of answering questions: a full
// day (morning through midnight and back to morning) takes DAY_MS of real
// play time, and a full year (4 seasons) takes YEAR_MS. Both are
// continuous clocks — the day is a fast, frequent cycle for sun/moon/sky
// motion; the year is a slower, separate cycle for season. Neither divides
// evenly into the other (a "day" here is just the sun/moon cadence, not a
// literal 1/90th of a season) — that's fine, they're independent clocks,
// not nested units of the same clock.
//
// This is the single source of truth for calendar facts — game.js (visuals)
// and music.js (song selection) both import from here, never from each
// other, so the season<->song-id mapping only lives in one place.

export const SEASONS = ["spring", "summer", "autumn", "winter"];
export const TIMES_OF_DAY = ["morning", "noon", "afternoon", "evening", "midnight"];
export const SEASON_SONG_IDS = ["flightSpring", "flightSummer", "flightAutumn", "flightWinter"];

const DAY_MS = 2 * 60 * 1000; // a full day/night cycle takes ~2 minutes
const YEAR_MS = 20 * 60 * 1000; // a full year (4 seasons) takes ~20 minutes

// Given total elapsed play time (ms), returns the current position in the
// day/year cycles. `dayProgress`/`yearProgress` are 0..1 fractions — the
// continuous values everything else derives from, so the sky can blend
// smoothly instead of snapping between named time-of-day stops.
export function calendarForTime(elapsedMs) {
  const t = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const dayProgress = (t % DAY_MS) / DAY_MS;
  const yearProgress = (t % YEAR_MS) / YEAR_MS;

  const seasonFloat = yearProgress * SEASONS.length;
  const season = Math.min(SEASONS.length - 1, Math.floor(seasonFloat));

  const timeOfDayFloat = dayProgress * TIMES_OF_DAY.length;
  const timeOfDay = Math.min(TIMES_OF_DAY.length - 1, Math.floor(timeOfDayFloat));

  return {
    dayProgress,
    yearProgress,
    season,
    seasonName: SEASONS[season],
    seasonProgress: seasonFloat - season, // 0..1 through the current season
    timeOfDay,
    timeOfDayName: TIMES_OF_DAY[timeOfDay],
    timeOfDayFloat, // 0..5, fractional — the continuous value for blending
  };
}

// How "night" the sky is right now, 0 (full day) to 1 (full night) — a
// smooth ramp instead of a hard evening/day cutoff, so stars and the
// moon fade in/out instead of popping. TIMES_OF_DAY indices: 0 morning,
// 1 noon, 2 afternoon, 3 evening, 4 midnight, then wraps back to 0.
//   0.0-2.0  full day             (morning through noon)
//   2.0-3.0  ramping to night     (noon -> afternoon)
//   3.0-4.0  full night           (evening -> midnight)
//   4.0-5.0  ramping back to day  (midnight -> next morning)
export function nightAmount(timeOfDayFloat) {
  const x = ((timeOfDayFloat % 5) + 5) % 5;
  if (x < 2) return 0;
  if (x < 3) return x - 2;
  if (x < 4) return 1;
  return 1 - (x - 4);
}

export function isNight(timeOfDay) {
  return timeOfDay >= 3; // evening, midnight — kept for callers that only need a boolean
}
