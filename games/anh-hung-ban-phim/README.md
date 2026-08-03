# Cứu Công Chúa — Vietnamese Telex Typing Game

A 2D dot-art typing game that teaches kids to type Vietnamese with the **Telex**
input method. A hero fights through stages of monsters — typing the word above
each one to attack — across a three-chapter story.

Built with **plain HTML5 + Canvas 2D + vanilla JavaScript** (ES modules). No
frameworks, no build step, no image/audio assets — every sprite, effect, scene,
and sound is generated in code, in the chunky style of the Chrome offline Dino
game.

## Play

ES modules need to be served over HTTP (not `file://`). A no-cache dev server
is included via npm:

```bash
npm install
npm start
# then open http://localhost:8177/index.html
```

### Controls
- **Type** the Vietnamese word above a monster (Telex: `as`→á, `aa`→â, `dd`→đ,
  tones `s f r x j` typed at the end of the syllable) to attack it.
- **SPACE** — advance menus / scenes / story pages.
- **ESC** — skip the story (or the tutorial).
- **H** (title) — how to play. **S** (title) — replay the chapter's story.
- **R** (title) — reset all progress.
- **F9** — toggle sound. (A function key, because every letter is a real Telex
  typing character.)

## The story

Ten princesses, each guarding the world's balance, have been kidnapped by the
**Demon King, the World Devourer**. Twenty-six stages in three chapters:

1. **Lời Thỉnh Cầu Của Đức Vua** (*The King's Request*) — stages 1–12. Two
   warm-ups, then rescue all ten princesses.
2. **Trượng Của Trí Tuệ** (*The Staff of Wisdom*) — stages 13–20. Courage alone
   is not enough: a quest through trials of perseverance, clarity and honesty for
   the artifact that can wound the Demon King.
3. **Trận Chiến Cuối Cùng** (*The Final Confrontation*) — stages 21–26. Storm the
   fortress and defeat the World Devourer for good.

Each chapter opens and closes with a story scene (skippable with ESC), and the
last one ends with the world saved forever.

## How it plays
- **Creeps** — one short word, basic "Chém" attack.
- **Elite creeps** — a phrase, a special skill with a bigger effect.
- **Boss** — several special-skill hits; presents a new word each hit and attacks
  you from range.
- **Stage Boss** — many hits, full sentences, the toughest fight of the stage.
- **The final boss** fights in three phases, the first behind a shield that only
  a charged Staff strike can break.

Each cleared stage grants a reward — a weapon, a new skill, or (once) the **Staff
of Wisdom**, whose charge meter fills with every *cleanly* typed word and then
powers up your next attack. A combo meter rewards clean streaks with extra
damage, and a lifetime rank tracks accuracy and speed across sessions. Progress
is saved in `localStorage`.

The curriculum ramps across all 26 stages: **letters → words → phrases →
sentences → hard sentences → long sentences → Vietnamese proverbs**.

## Project layout
```
index.html            boot + canvas
package.json          npm start → no-cache dev server (http-server)
css/style.css         layout + pixel look
js/
  telex.js            Telex → Vietnamese engine (the educational core)
  telex.test.js       engine tests + round-trips every word pool
  verify.js           data-invariant checks (sprites, stages, chapters, rewards)
  main.js             game loop + state machine
  input.js            keystroke → telex → live match tracker
  render.js           dot-drawing primitives
  sprites.js          all art as dot grids
  entities.js         Hero, Monster (incl. multi-phase bosses), Projectile
  skills.js           skills + word pools (by difficulty tier)
  effects.js          particle bursts + per-skill signature effects
  biomes.js           per-stage backdrops (sky, terrain, lights, weather)
  monsters.js         which monsters each biome fields
  stages.js           stage definitions (waves, princess, curriculum)
  chapters.js         chapter ranges over the flat stage list
  story.js            prologue, per-chapter narration, credits
  rewards.js          reward catalog + localStorage persistence
  scenes.js           title / story / intro / victory / reward / ending screens
  combo.js            clean-streak combo + damage multipliers
  rank.js             lifetime accuracy/speed rank + kill points
  tutorial.js         interactive Telex lessons
  audio.js            all sound, synthesized via Web Audio (no files)
```

## Tests
```bash
node js/telex.test.js   # engine cases + every word pool round-tripped
node js/verify.js       # sprite geometry, stage/biome/reward invariants
```

Run **both** after any content change. `telex.test.js` types every word-pool
entry through the real engine and asserts it renders exactly its Vietnamese
string (it also enforces the tone-key-last convention); `verify.js` catches the
data mistakes that are invisible in review — a sprite row one character short, a
stage naming a biome that has no monster roster, chapter ranges that don't tile
the stage list, a reward list shorter than the number of stages.

## Developing with Claude Code
See `CLAUDE.md` for architecture and conventions. Project slash commands:
`/check` (syntax + tests), `/play [state]` (launch & screenshot), `/add-content <thing>`
(add a skill/stage/monster/word following existing patterns). The `effects-preview`
skill helps tune visual effects in isolation.
