---
description: Add game content (skill, monster, stage, word pool, reward) following existing patterns
argument-hint: "<what to add, e.g. 'a poison skill' or 'a stage 5 in an ice cave'>"
---

Add the requested content: **$ARGUMENTS**

This game is data-driven — most content is added by editing data files, not writing new systems. Read the relevant file(s) first, match the existing shape exactly, then verify. Use this map:

- **New word / word pool** → `js/skills.js` `WORD_POOLS`. Each entry is `{ vi, telex }`. CRITICAL: verify every telex string actually produces the Vietnamese with `node -e 'import("./js/telex.js").then(({typeString})=>console.log(typeString("<telex>")))'`. Add tricky/multi-syllable ones to `js/telex.test.js`.
- **New skill** → `js/skills.js` `SKILLS`: copy an existing entry (damage, `projectile`, `burst`, `shake?`, `effect`, `trail`). If the `effect` is new, add a matching case in `js/effects.js` `play()` (compose shockwave/flash/bolt/slash/beam/burst visuals + particles). Reference it from a stage wave or a reward.
- **New stage** → `js/stages.js` `STAGES[]`: `{ id, name, princess, intro, waves:[{type,pool,skill}] }`. Types: creep | elite | boss | stageboss. Keep the curriculum ramp (letters→words→phrases→sentences) sensible.
- **New reward** → `js/rewards.js` `REWARDS[]` (cycles weapon→skin→skill). Skins need a hero sprite in `js/sprites.js` + `SPRITES` lookup; ensure `applyRewards` handles the type.
- **New monster / sprite** → `js/sprites.js` (dot grid, `k` outline + shade + `W` eyes), add to `SPRITES`; spawn logic + `MONSTER_COLOR` (death hue) live in `js/main.js`; `MONSTER_KIND` behavior in `js/entities.js`.

All Vietnamese strings get an English gloss comment. When done, run `/check` and then `/play` to the relevant state to verify visually.
