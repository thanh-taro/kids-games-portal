# Cứu Công Chúa — Vietnamese Telex Typing Game

A 2D dot-art typing game that teaches kids to type Vietnamese with the **Telex**
input method. A hero fights through stages of monsters — typing the word above
each one to attack — and rescues a princess at the end of every stage.

Built with **plain HTML5 + Canvas 2D + vanilla JavaScript** (ES modules). No
frameworks, no build step, no image/audio assets — every sprite, effect, scene,
and sound is generated in code, in the chunky style of the Chrome offline Dino
game.

## Play

ES modules need to be served over HTTP (not `file://`). A no-cache dev server
is included:

```bash
python3 serve.py 8177
# then open http://localhost:8177/index.html
```

### Controls
- **Type** the Vietnamese word above a monster (Telex: `as`→á, `aa`→â, `dd`→đ,
  tones `s f r x j`, etc.) to attack it.
- **SPACE** — advance menus / scenes.
- **R** (on the title screen) — reset all progress.
- **M** — toggle sound.

## How it plays
- **Creeps** (slime) — one short word, basic "Chém" attack.
- **Elite creeps** — a phrase, a special skill (fireball) with a bigger effect.
- **Boss** (dragon) — several special-skill hits; presents a new word each hit
  and attacks you from range.
- **Stage Boss** (ogre) — many hits, full sentences, the toughest fight.

Each cleared stage rescues a princess and grants a reward, cycling through
**weapon → skin → skill**. Progress is saved in `localStorage`.

Stages progress the curriculum: **letters → words → phrases → sentences**.

## Project layout
```
index.html            boot + canvas
serve.py              no-cache dev server
css/style.css         layout + pixel look
js/
  telex.js            Telex → Vietnamese engine (the educational core)
  telex.test.js       engine tests — run: node js/telex.test.js
  main.js             game loop + state machine
  input.js            keystroke → telex → live match tracker
  render.js           dot-drawing primitives
  sprites.js          all art as 0/1 dot grids
  entities.js         Hero, Monster, Projectile
  skills.js           skills + word pools (by difficulty tier)
  effects.js          particle bursts
  stages.js           stage definitions (waves, princess, curriculum)
  rewards.js          reward catalog + localStorage persistence
  scenes.js           title / intro / victory / reward / failure screens
  audio.js            all sound, synthesized via Web Audio (no files)
```

## Tests
```bash
node js/telex.test.js   # 37 cases covering tones, shapes, undo, multi-syllable
```

## Developing with Claude Code
See `CLAUDE.md` for architecture and conventions. Project slash commands:
`/check` (syntax + tests), `/play [state]` (launch & screenshot), `/add-content <thing>`
(add a skill/stage/monster/word following existing patterns). The `effects-preview`
skill helps tune visual effects in isolation.
