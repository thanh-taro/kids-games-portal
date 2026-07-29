---
name: game-sprite-work
description: Draw or edit pixel-art sprites, effects, HUD elements and scene art in Phi Công Toán Học. Use for any change to js/sprites.js, effects.js, biomes.js visuals, scenes.js art, or the HUD in main.js.
---

# Sprites and visuals in this game

No image assets. Every sprite is an **array of strings** — a dot grid where each char
is a `PALETTE` key and space is transparent. `verify.js` validates geometry and
palette chars, so **run it rather than eyeballing**:

```bash
node js/verify.js                 # geometry, palette, faction colours, silhouettes
open objects-preview.html         # every sprite at gameplay scale, plus a frame-diff view
```

## FAMILIAR SILHOUETTES ARE A TRAP — and not just faces

Three sprites shipped here and had to be redrawn. The allies read as **Christmas
trees** (triangle over a stem), then as **little robots** (head-body-legs);
`enemy_orb` was a **mushroom**; `enemy_spike` a **lollipop**. Recolouring never fixed
any of them, because the problem was always the shape.

The structural rules:

- **SHIPS ARE WIDER THAN THEY ARE TALL.** Mass along a horizontal wing line reads as
  an aircraft from above and as nothing else. **Vertical stacking summons creatures** —
  any head-body-legs arrangement at this size resolves to a living thing, because
  that is the arrangement a child's eye is most practised at finding.
- **Build from machinery, never anatomy.** A boss's "eye" is a core or lens, placed
  **off-centre** so it cannot pair into a face.
- **Mounted props run VERTICAL.** `boss_commander`'s mast was stepped diagonally and
  the whole boss read as a featureless red blob at gameplay scale.
- **Idle frames move only extremities** — a thruster flame, a lamp recoloured in
  place. A cell appearing or vanishing **outside the thruster zone** changes the
  silhouette and reads as the hull lurching (asserted).
- **COLOUR IS FACTION.** Friendly ships are cool (`B`/`b` blue, cyan, teal, the ally
  hues); monsterships are warm or violet (`R r P p V v G g`). `verify.js` **fails** if
  either borrows the other's hue — a kid uses hue to tell "mine" from "incoming"
  faster than shape, so this is a gameplay rule, not a style one.
- **Every PALETTE colour must be DISTINCT.** Asserted. Reusing an existing hex for a
  new key fails the gate (this caught five reused ally/plating colours).

## Prefer ONE template with colourways over N hand-drawn sprites

`allySprite(style)` remaps the hull chars of one template to five colourways;
`heroSprite(rankIndex)` remaps the hero's **trim** chars per rank. Five near-identical
hand-drawn ships is five chances for one to drift out of style. A new ally is an entry
plus a colourway. A new rank skin is a trim char plus a pip count.

When you add a generated variant, **register it in `SPRITES`** so `verify.js`'s sweep
covers it, and assert the invariant that matters — for rank skins, that the hull,
outline and silhouette are identical across every rank (cell-by-cell).

## Effects: legible-but-brief, and never able to crash the loop

**The kid is reading while this plays.**

- **Everything is clipped to the play field.** The quest box is sacred — a death
  explosion must never paint over a number the kid is reading.
- **Screen shake applies to the play field only.** Shaking the canvas shakes the
  answer cards, which is hostile to a child trying to tap one.
- **Effects differ by MOTION, not just colour** — freeze shards hang, repair motes
  rise, the ultimate gathers inward then blooms. Two effects that differ only in hue
  are one effect.
- **An effect must never take the render loop down.** A malformed colour once threw
  inside `ParticleSystem.draw()` **every frame**, killing the HUD and quest box.
  `blend()` degrades instead of throwing. Any new colour helper on the draw path must
  do the same — return a transparent/fallback colour, never throw.
- Distinguish sources by contour, not just intensity: a kamikaze impact blows sparks
  **outward/upward** with a concussion ring, where `hurt()` rains them **downward**
  off a shot arriving from above. A kid should tell them apart without reading.

`blend()` in `effects.js` interpolates two colours (`blend(a, b, t)`) — it is **not**
an alpha helper and is **not exported**. Write a local `rgba()` helper if you need
alpha on the draw path.

## THE HUD IS TWO SIDE COLUMNS AND THE CENTRE IS ALWAYS EMPTY

Split by **ownership**:

- **LEFT = my ship** — durability, rank, combo, ultimate charge, my warnings.
- **RIGHT = the enemy** — stage name, chapter, quest count, boss name, phase, HP.
- **CENTRE = nothing. Ever.**

A kid asking "am I okay?" looks left; "what am I fighting?" looks right; the middle
stays clear for the monsterships and the kid's own volleys.

This replaced **four** failed placements, all the same mistake: **text placed next to
the thing it refers to lands ON that thing.** The low-hull warning landed on the ship;
the shield hint landed on the ship *and* the five wingmen; moved under the boss bar it
landed on the boss; and the stage name, combo and quest counter all sat across the
battlefield.

Both columns get a vertical-fade plate, because they sit over the play field and the
late biomes are bright magenta (10px labels vanished against `dark_core`). `colW` is
capped by **both** a fraction and an absolute: the absolute stops the columns drifting
apart on a wide desktop window, the fraction stops them closing in on the boss on a
narrow phone.

## Layout and scaling

- **`render.js` `LAYOUT`/`metrics()` is the single source of truth** for the screen
  split. Derive geometry from `metrics()`; never hardcode rows.
- The context is scaled by `devicePixelRatio` **once** in `resize()`, so all drawing
  is in CSS px. Without that, a 2× display halves every font and puts every tap one
  card off. (`getImageData` still wants device px — multiply.)
- **Text that can be long must clamp to its own measured width.** Vietnamese with
  diacritics is wider than it looks; every scene text block shrinks to fit.
- **Cap sizes in PIXELS as well as fractions.** The quest box and answer cards were
  both too large in fullscreen until they got absolute caps; the ship's idle drift
  needed a pixel cap because 3% of a 1500px window let it walk out from under
  incoming fire. Current values: quest box `questFrac 0.255 / questMax 225 /
  questMin 143` (75% of the original trio — scale all three together, or the box
  stays pinned at its floor on short windows), answer cards `168x92`.
- **A GAP MUST BE AN EXPLICIT INSET, NOT A SIDE EFFECT OF A CAP.** The answer row had
  only 10px of screen below it because the cards filled the whole card area, so
  centring them split nothing. Shrinking `MAX_CARD_H` fixed desktop and bought
  **exactly 0px** on a landscape phone, where the cards were already below every cap —
  the binding constraint there is `questMin`, not the card cap. `bottomInset()` is
  subtracted from the card area *before* cards are sized, so the gap exists at every
  window size. It scales with the area (16%, capped at 18px) rather than being flat,
  because a flat 18px out of a 143px box pushed landscape cards to exactly `MIN_CARD`
  (56) — tappable by this file's own definition, with zero margin.
- **Check the tight window, not just the one you are looking at.** Every layout change
  here should be evaluated at laptop, wide desktop, phone-portrait AND
  phone-landscape; landscape is where `questMin` binds and where a change that looks
  fine on a laptop does nothing or overshoots.

## Backdrops must move, and planets must spin

- Every scene backdrop animates — the shared `starfield()` in `scenes.js` takes `t`
  and drives all 23 call sites. Keep it **slow**: these screens carry text, and
  anything fast enough to notice pulls the eye off a sentence (~50–90 changed
  pixels/sec in a 600×60 band is the tuned level).
- **Planets spin in the SURFACE ONLY** — disc, lit limb and radius never move. That
  keeps "scenery must never out-read the fleet" true by construction, and matches how
  a sphere looks from outside. Features must **fade and foreshorten toward the limb**
  or they clip at the edge and the world reads as a spinning coin.
- A featureless disc rotating is indistinguishable from one standing still — if you
  make a body spin, give it surface marks.
- **Clip surface detail to the disc.** Jupiter's bands are a full-width `fillRect`;
  with only the play-field clip they ran across the whole sky as grey stripes over the
  starfield and the fleet.
