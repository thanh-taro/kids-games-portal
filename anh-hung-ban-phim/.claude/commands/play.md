---
description: Launch the game in the browser and screenshot it (optionally at a given state)
argument-hint: "[title|stage|boss|victory] (optional starting point)"
---

Launch and visually verify the game. Target: **$ARGUMENTS** (if empty, just show the title screen).

Steps:
1. Ensure the no-cache dev server is running: `npm start` (run in background; installs `http-server` via `npm install` first if needed). If port 8177 already serves, reuse it.
2. Using the claude-in-chrome tools: create/reuse a tab, navigate to `http://localhost:8177/index.html`, wait ~1s.
3. **Click the canvas once** (e.g. coordinate [770,400]) to give it keyboard focus — required before any typing.
4. If a starting point was requested, drive there with SPACE (Title→Intro→Playing) and typing the shown words; press `R` on the title first if you need a clean reset.
5. Take a screenshot (burst 2-3 if capturing a fast effect/impact) and report what you see.

Remember the testing gotchas from CLAUDE.md: canvas focus before typing, and stale single-frame screenshots — prefer bursts or console logging to confirm true state.
