# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Cứu Công Chúa" — a 2D pixel-art typing game that teaches kids Vietnamese **Telex** input. A hero fights through stages of monsters by typing the Vietnamese word floating above each one, and rescues a princess at the end of every stage. Zero dependencies: plain HTML5 + Canvas 2D + vanilla JS ES modules. No build step, no frameworks, no image/audio assets — every sprite, scene, effect, and sound is generated in code.

## Commands

```bash
python3 serve.py 8177          # dev server — ALWAYS use this, not `python3 -m http.server`
node js/telex.test.js          # run the Telex engine test suite (37 cases)
```

- **`serve.py` is a no-cache dev server.** Plain `http.server` makes Chrome aggressively cache ES modules, so edits to `js/*.js` silently don't reload and you end up testing stale code. Always serve via `serve.py`.
- There is no lint/build. `node --check js/<file>.js` syntax-checks a module.
- Open `http://localhost:8177/index.html`. ES modules require HTTP (not `file://`).

## Testing in the browser (claude-in-chrome)

Two gotchas that will waste time if forgotten:
1. **Canvas focus:** after a navigate/reload the canvas does NOT have keyboard focus — `type` keystrokes are dropped silently. Always `left_click` the canvas once before typing.
2. **Stale screenshots:** effects and impacts last only a few frames; a single screenshot often lands between frames. Burst 3-5 screenshots to catch a moment, or confirm true state via `console.log` + `read_console_messages` rather than a lone screenshot. The on-screen kill/HP counters can look one frame behind.

To showcase or tune fast visual effects, write a throwaway `effects-preview.html` at the repo root that imports the modules and fires effects on a loop (URL `#hash` to pick one), screenshot it, then delete it.

## Architecture

Entry point is `js/main.js` (loaded as a module from `index.html`). The game is a **canvas render loop driving a state machine**; there is no DOM UI — everything is drawn on one `<canvas>`.

**State machine (`main.js`):** `TITLE → STAGE_INTRO → PLAYING → (VICTORY → REWARD → next stage) | (FAILURE → retry)`, final stage → `GAME_COMPLETE`. `SPACE` advances scenes; `R` on the title resets progress; `F9` toggles mute (a function key, because every letter is a real Telex typing character and `ESC` is the tutorial's skip key — F9 is handled before the tutorial branch so it works in every state, and `drawMuteHint()` draws the guide in every scene from `loop()`). During `PLAYING`, `main.js` runs `updatePlaying()` + `renderPlaying()`; other states delegate to `scenes.js` draw functions. Note: `updatePlaying()` can transition state mid-frame, so it re-checks `state` before rendering.

**The Telex engine (`telex.js`) is the educational core** — treat it as the highest-risk module. It converts raw ASCII keystrokes to Vietnamese exactly like a real Telex IME. Buffer is an array of atoms (vowel atoms hold base+tone+shape, consonant atoms hold a char). Key exports: `newBuffer()`, `applyKey(buffer, key)` (returns a NEW buffer), `render(buffer)`, `typeString(raw)`. The trickiest logic is `findToneTargetIndex` (tone placement) — it operates **only within the current syllable** (the run after the last space atom) to stop tones bleeding across words in phrases/sentences. **Add a case to `telex.test.js` before touching tone/shape logic**, then `node js/telex.test.js`.

**Typing → combat flow:**
- `input.js` `TypingTracker` feeds each keydown through `telex.applyKey`, tracks prefix-match against the target word, and fires `onProgress(matchedLen, mistake)` / `onComplete()` callbacks (set in `main.js`). `attachKeyboard(tracker)` wires the global keydown listener. SPACE during `PLAYING` is a real typing char (phrases contain spaces) — `main.js` guards against treating it as a menu confirm.
- On `onComplete`, `main.js` spawns the monster's skill projectile(s). A multi-projectile volley marks only `proj.isLeadHit` so a 3-shot fireball still counts as one hit.
- `onProjectileHit` (in `main.js`) applies the hit: monster `reactToHit()` (flash+knockback), `particles.play(skill.effect,...)`, register the hit, and on defeat `particles.death(...)`.

**Entities (`entities.js`):** `Hero`, `Monster` (three `MONSTER_KIND`s: CREEP marches to contact; BOSS/STAGEBOSS are `stationary`, hold at `standGap`, and attack the hero on a timer via `takeAttack()`), and `Projectile`. Monsters take `hitsNeeded` completed words to kill; bosses call `assignBossWord()` to present a fresh word after each surviving hit.

**Data-driven content:**
- `stages.js` — `STAGES[]`: each stage has name, princess (+ `princessStyle`, her look — see `princessSprite` under Sprites), intro text, a `biome` (its scene theme — see `biomes.js`), and a `waves[]` list of `{type, pool, skill}`. Curriculum ramps letters → words → phrases → sentences. `getStage(i)`, `TOTAL_STAGES`. There are 12 stages; adding more is pure data (append to `STAGES`).
- `chapters.js` — `CHAPTERS[]`: story chapters that group `STAGES[]` by RANGE (`stageStart` + `stageCount`) over the single flat stage list, so the stage/reward/progress machinery (one 0-based `stageIndex`) is untouched — chapters are a presentation grouping. Chapter 1 ("Hành Trình Đầu Tiên") holds all current stages; later chapters are declared with `comingSoon: true` and 0 stages. Helpers: `chapterForStage`, `stageNumberInChapter`, `isChapterFinale`, `nextChapter`. Title/stage-intro/HUD show the chapter; `GAME_COMPLETE` reads as "end of chapter N" + a coming-soon teaser for the next. To ship a future chapter: append its stages to `STAGES`, then flip `comingSoon` off and set that chapter's `stageStart`/`stageCount`.
- `biomes.js` — `BIOMES`: **each stage's backdrop matches its name AND carries its story meaning**, in a bright storybook-fantasy style. The through-line: every biome shows the villain's `SPIRE` among its `far` layers, growing nearer stage by stage (a speck in stage 1 → towers filling the sky in stage 12), and several stages carry a small *trace* prop left by the princess taken from there (dropped flower crown, broken cage, message bottle, frozen tear) — so 12 backdrops read as one chase. Each biome's comment states the MEANING it carries; **preserve that when editing**.
  Layer order, back to front: `sky` → `far` → `horizon` → `band` → `ground` → `body`/`clouds`/`flyers` → `ceiling` → `landmark` → `props` → *(entities, drawn by `main.js`)* → `tint` → `lights` → `weather`. Draw entry points are split so entities land mid-stack: `drawBiomeTerrain` / `drawBiomeScenery` / `drawBiomeLights` / `drawBiomeWeather`, or `drawBiomeScene` for all of it at once (used by the menu scenes).
  `landmark` is the ONE big set piece per stage (spirit tree, bone arch, shipwreck, colossal hand, frozen fall, lava fall, castle gate); `lights` is an **additive** pass (`'rays'` god rays, `'aurora'` curtains, `'glow'` radial pools, `'shimmer'` heat haze) and is what keeps a big sky from reading as a flat slab.
  Three invariants when authoring a biome: **`band` is the strip entities walk on** so it must be solid footing (use `horizon` for distant water — that's why `coast` puts the sea *behind* the beach); **grounded props and the sky `body` stay clear of the hero's spawn** (roughly the left 0.18 of the width); and **watch the units** — `at` is a fraction of width, prop/glow `lift` is a fraction of ground height, while `body.y` and `baseOffset` are absolute px. A new biome is a new `BIOMES` entry; a genuinely new look is one more case in `drawBiomeWeather` or `drawBiomeLights`.
- `skills.js` — `SKILLS` (slash/fireball/lightning/meteor) each carry damage, `projectile`, `burst`, `effect` (name dispatched to `particles.play`), and `trail` config. `WORD_POOLS` by tier + `pickWord(pool, index)`. `SKILL_CLASS` simple vs special.
- `rewards.js` — `REWARDS[]` alternating weapon→skill (there is only one hero look; no skins), `rewardForStage`, and `localStorage` progress (`loadProgress`/`saveProgress`/`resetProgress`, key `ccc_progress_v1`). `applyRewards(hero, ids)` equips stat-boosts/extra skills onto the hero.

**Rendering (`render.js`):** `DOT` is the master pixel-scale multiplier — **change `DOT` to resize the entire world at once** (currently 3, tuned for a wide-landscape look; entity `scale` values multiply it further). `drawSprite(ctx, sprite, frame, x, y, scale, flip, tint?)` — `tint` overrides all pixels with one color (used for the white hit-flash). `drawScene(ctx, w, h, groundY)` paints the original desert backdrop (sky/sand/layered dithered ground); per-stage themed backdrops live in `biomes.js` and are what the game actually draws.

**Sprites (`sprites.js`):** all art as arrays-of-strings dot grids; each char is a `PALETTE` key, space = transparent. Sprites use black outline `k` + base color + shade tone. `SPRITES` is the entity lookup; ~40 scenery props are exported separately and referenced by `biomes.js` — `CLOUD/SUN/MOON/BIRD` (sky), `MOUNTAINS/SPIRE` (far layers), flora & rocks, `STALAGMITE/STALACTITE/CRYSTAL` (cave), `JAIL/TOWER/CASTLE_GATE` (fortress), the story landmarks, and the princess traces. Every row of a frame must be exactly `w` chars wide — validate after editing with a quick loop over `frames` comparing row lengths to `w`/`h` and chars to `PALETTE` keys (`CREEP_SLIME` has pre-existing trailing-space padding; ignore it).
  **Faces are a trap at this pixel size:** a rounded outline with two even eye-blobs over a horizontal band reads as a cartoon smiley, not architecture. The buried statue went through two face designs before becoming a colossal *hand*, and `CASTLE_GATE` was deliberately made asymmetric (one off-centre lit window, diagonal chains) for the same reason.

  **The humanoids (hero + princesses) follow four hard-won rules** — the originals (14x16 hero, 12x16 princess) broke all of them and read as blobs:
  1. **Eyes are single DARK pixels on skin**, never white-on-black. A 4px-wide face has no room for sclera + pupil, so the old `kSWkSWSk` read as a black *nose stripe* between two white blobs. Monsters still use white `W` eyes — they're big enough.
  2. **Hair before hats.** A helmet/crown sitting straight on skin reads as a colored blob; the hair mass framing the face is what says "person". A crown's band must never sit directly on a black outline row either — they merge into one stripe.
  3. **A weapon must be HELD.** The hero's sword went through a version floating diagonally by his shoulder that read as a feather/party-hat plume. It reads as a sword because it's vertical, has a gold crossguard, and a raised arm connects fist to shoulder.
  4. **Idle frames move only the extremities.** Frame 2 of each may differ ONLY in cape (hero) or skirt hem (princess) pixels — an earlier hero shifted its whole torso down a row and read as *squatting*, and cape-widening silently ate torso pixels so the body jerked sideways. Verify with a diff that asserts every differing pixel is cape/hem-only.
  Skirt/cloth shading wants **contiguous 1px vertical drape lines** — scattered single shade pixels read as dirt specks, a solid 3px block reads as an apron or a hole.

  **`heroSprite(weaponColor)`** returns the hero with his blade tinted to the equipped weapon (from `rewards.applyRewards` → `hero.weaponColor`), so weapon rewards are visible. It caches per color, registering a private-use slot char pair into `PALETTE` on demand (`PALETTE` is one flat shared char→color map, so a per-instance blade color can't live in it directly). No weapon → the shared base sprite.
  **`princessSprite(styleName)`** builds one of the 12 princesses from ONE body template + a `PRINCESS_STYLES` entry (gown/hair/crown-accent palette keys + a `CROWNS` motif), remapping slot chars `G/g` gown, `A/a` hair, `C` crown-accent. Each stage names its own via `princessStyle` in `stages.js`; a stage without one falls back to the default purple gown. **A new princess is a new `PRINCESS_STYLES` entry (+ a `CROWNS` motif if she needs a new silhouette) — data, not a new hand-drawn sprite.** Crown bands are always gold: a band tinted to a pale theme color vanished into pale hair.

**Effects (`effects.js`):** `ParticleSystem` holds `particles` + one-shot `visuals` + `screenShake`. `Particle` supports gravity (negative = rise), drag, `fadeTo` color blend, shrink. `Visual` kinds: shockwave, flash, bolt, slash, beam, burst. Signature per-skill effects via `play(effect, x, y, W, H)`; `death(x, y, color, tier)` for tiered kill explosions; `trailPuff(...)` for projectile comet trails. **New skill effect = a new case in `play()` + an `effect:` field on the skill.**

**Audio (`audio.js`):** all sound synthesized via Web Audio (oscillators/gain/noise). AudioContext is created lazily and must be resumed on a user gesture — `resumeAudio()` is called on first keydown in `main.js`. Event functions: `keyBlip/keyError`, `simpleAttack/specialAttack`, `hit`, `hurt`, `victory/failure/reward`, `confirm`; `toggleMute()/isMuted()`.

## Conventions

- All in-game text is Vietnamese (with an English gloss in a code comment). Keep the kid-friendly, encouraging tone.
- Reproducibility: avoid `Math.random()` at construction time in effects — use per-index variation or the seeded `rand()` helper in `effects.js`, so particle bursts look organic without nondeterminism.
- HUD/scene text over the bright sky is drawn on dark plates (`#1a1423`) with light text (`#fff4d6`) for legibility — follow that when adding UI.
