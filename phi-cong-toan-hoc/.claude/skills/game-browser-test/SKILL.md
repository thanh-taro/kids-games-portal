---
name: game-browser-test
description: Verify Phi Công Toán Học behaviour in a real browser — reach a late stage, force game state, and MEASURE what happened instead of eyeballing a screenshot. Use whenever a change needs in-game confirmation (gameplay, HUD, effects, scenes, audio wiring).
---

# Testing this game in the browser

The game is a canvas render loop. **Nothing is inspectable through the DOM** — there
is no HTML UI, so `read_page` and `get_page_text` tell you nothing. Every
verification is either a `__debug` call, a pixel sample, or a screenshot.

## Setup, every time

```bash
npm start          # :8179, no-cache. NEVER use a plain static server.
```

`npm start` matters: plain servers make Chrome cache ES modules, so you edit
`js/*.js`, reload, and test **stale code** while believing you tested the fix.

Then in the browser: `mcp__claude-in-chrome__tabs_context_mcp` first, and
`javascript_tool` with `action: "javascript_exec"` and the code in the **`text`**
parameter (not `code`, not `javascript_code` — those fail).

## The five gotchas that will cost you time

1. **CDP `Runtime.evaluate` times out at 45s.** A single `await` longer than that
   kills the call and you lose the result. For long observations, start a poll that
   writes to a global, return immediately, then read the global in a **second**
   call:
   ```js
   window.__log = [];
   window.__poll = setInterval(() => { window.__log.push(__debug.info()); }, 200);
   'armed'          // return now
   ```
   ```js
   clearInterval(window.__poll); JSON.stringify(window.__log)   // later call
   ```

2. **`__debug.entities()` returns a PROJECTION, not live objects.** It maps entities
   to a fixed subset of fields. A property you added to the class is `undefined`
   there until you add it to the projection in `main.js`. This looks *exactly* like
   Chrome serving stale modules — do not chase a caching ghost. Confirm what the
   server is actually sending:
   ```js
   (await (await fetch('/js/entities.js?cb=' + Date.now())).text()).includes('myNewMethod')
   ```

3. **`requestAnimationFrame` is throttled to a standstill in a background tab.** A
   long in-browser run of a real stage simply freezes. This is why `balance.js`
   exists and is the primary tuning tool — do not try to play 24 stages in a tab.

4. **Effects last a few frames**, so a screenshot usually lands between them. Use
   `__debug.fx()` to verify wiring rather than chasing frames. There is no
   `__debug.pause()`-style freeze-for-screenshot (F8 pause exists, but it freezes
   `fieldT`, so it also stops planet rotation and sprite frames — see below).

5. **The localStorage key is `ptn_progress_v1`.** Guessing a name based on the game
   title silently writes to nothing and your seeded state never appears.

## Reaching state

```js
__debug.goStage(n)     // 1-based label, lands on index n-1. goStage(7) => stageIndex 6.
__debug.setState('PLAYING' | 'TITLE' | 'VICTORY' | 'FAILURE' | 'CREDITS' | ...)
__debug.allies(5)      // give the kid N wingmen (chapter 2/3 formations)
__debug.hull(40)       // set durability high so a test survives; also CLEARS invuln
__debug.lastWave()     // jump to the final wave
__debug.kill()         // kill one enemy
__debug.answer(i)      // answer the current quest
__debug.chargeUlt()
__debug.pause() / __debug.isPaused()
__debug.info()         // state, stage, hull, wave, escaped, quest, combo, ...
__debug.fx()           // {particles, visuals, shake, shots}
__debug.entities()     // {ship, allies, enemies[], shots[]} — a projection
```

Seed a rank or progress by writing storage and reloading:

```js
const K = 'ptn_progress_v1';
const p = JSON.parse(localStorage.getItem(K) || '{}');
p.totalCorrect = 900; p.totalWrong = 40; p.demotions = 0;
localStorage.setItem(K, JSON.stringify(p));
location.reload();
```

## MEASURE, DO NOT EYEBALL

This is the rule that has caught the most real bugs in this project, and screenshots
have repeatedly *hidden* them. Two techniques:

**Sample pixels** to check a visual actually renders and at what strength. A rank
aura once drew correctly and was completely invisible — measured at +5/+10/+1 RGB
over the bare biome, which no screenshot would have told me:

```js
const g = document.getElementById('game').getContext('2d');
const dpr = Math.min(2, window.devicePixelRatio || 1);
const px = (x, y) => { const d = g.getImageData(Math.round(x*dpr), Math.round(y*dpr), 1, 1).data; return [d[0],d[1],d[2]]; };
const near = px(shipX + 30, shipY - 6);      // the thing under test
const far  = px(shipX + 320, shipY - 6);     // same row, unaffected
near.map((v, i) => v - far[i]);               // the actual delta
```

Remember `devicePixelRatio`: the context is scaled by dpr **once** in `resize()`, so
all drawing is in CSS px but `getImageData` wants **device** px. Multiply.

**Diff a region over time** to prove something animates:

```js
const grab = () => g.getImageData(0, 600*dpr, 400*dpr, 40*dpr).data;
const a = grab(); await new Promise(r => setTimeout(r, 1200)); const b = grab();
let changed = 0;
for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) > 6) changed++;
```

~50–90 changed pixels/sec in a 600×60 band is the tuned "alive but not distracting"
level for scene backdrops. Zero means it is static.

**Track state over time** for anything with accumulation (escape damage, demotions,
dive staggering). Log only on change, so the interesting frames are not buried:

```js
window.__poll = setInterval(() => {
  const i = __debug.info();
  const last = window.__log[window.__log.length - 1];
  if (!last || last.escaped !== i.escaped) window.__log.push({ t: performance.now()/1000, ...i });
}, 100);
```

## Two traps specific to this game's geometry

- **`ship.y` vs `m.shipY`.** The ship BOBS. `m.shipY` is the static layout row;
  `ship.y` is where it is drawn. Aiming anything at `m.shipY` puts it ~30px off the
  visible hull. This has caused two separate bugs (the shield dome, then kamikaze
  dives detonating short).
- **Pause freezes `fieldT`, not `sceneT`.** So a paused frame stops the fleet, sprite
  frames, biome and planet rotation, while the overlay and toasts keep animating. If
  you measure planet spin while paused you will measure zero and think it is broken.

## Verifying an input gate actually holds

Gate answering at **`input.onPick`**, not `hitTest` — the number keys `1`-`9` call
`onPick` directly in `input.js` and never consult `hitTest`. Test both routes:

```js
[1,2,3,4].forEach(n => window.dispatchEvent(new KeyboardEvent('keydown', {key: String(n), bubbles: true})));
const c = document.getElementById('game'), r = c.getBoundingClientRect();
c.dispatchEvent(new PointerEvent('pointerdown', {clientX: r.left+515, clientY: r.top+706, bubbles: true}));
c.dispatchEvent(new MouseEvent('click',        {clientX: r.left+515, clientY: r.top+706, bubbles: true}));
// then assert info().correct and info().wrong did not move
```

## Do not trigger dialogs

No `alert`/`confirm`/`prompt` — they block the extension and it stops responding.
Use `console.log` + `read_console_messages` (with a `pattern` filter) instead.
