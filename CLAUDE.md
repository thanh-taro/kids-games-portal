# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Kids Games Portal** — a static landing page (`index.html` at the repo root) that
lets a child pick a game from a grid of large, colorful cards. Each game is a
**self-contained subfolder** with its own `index.html` (and, typically, its own
README and `CLAUDE.md`). The portal is the connective tissue; the games are
independent apps.

Everything is plain static HTML/CSS/JS with **no build step and no
dependencies**, so it deploys straight to **GitHub Pages** from the repo root.

## Structure

```
index.html          the portal — game-selection page + all its CSS (single file, inline <style>)
README.md           portal overview + GitHub Pages deploy steps + add-a-game template
anh-hung-ban-phim/  a game (Vietnamese Telex typing game) — self-contained, has its own CLAUDE.md
```

The portal and games are **decoupled**: the portal only references each game by a
relative link to its `index.html`. It does not import game code or share state.
When working *inside* a game, read that game's own `CLAUDE.md` — e.g.
`anh-hung-ban-phim/CLAUDE.md` documents that game's architecture and its
`npm start` dev server + `node js/telex.test.js` test suite.

## Serving / previewing the portal

The games use ES modules, which need HTTP (not `file://`). From the repo root:

```bash
python3 -m http.server 8000    # then open http://localhost:8000/index.html
```

Serving from the **root** (not a game subfolder) is what makes the relative game
links resolve — the same reason they work on GitHub Pages. Individual games may
ship a stricter no-cache dev server (`anh-hung-ban-phim` uses `npm start`, an
`http-server -c-1` script); use that when editing that game's JS modules to
avoid Chrome caching stale modules.

## Adding a game (the portal's growth model)

The portal is built to grow by **data, not code**: a new game is a new folder +
one new card. To add one:

1. Create `my-new-game/` with its own `index.html`.
2. Copy an existing `<a class="game-card">` block in the root `index.html` and
   point its `href` at the new game. Each card is themed by two CSS custom
   properties set inline — `--c1`/`--c2` drive the art gradient and the button
   color — plus an emoji in `.game-art`.
3. Update the **Games** table in `README.md`.

The `.game-card.soon` variant is the "coming soon" placeholder card (dashed
border, no link); keep at least one so the grid signals more games are planned.

## Design constraints for the portal page

The audience is **kids**, and these are intentional, not incidental — preserve
them when editing `index.html`:

- Large, touch-friendly cards; playful colors; big clear "Play" buttons.
- Fully responsive — the `.games` grid uses `auto-fill` / `minmax` so cards
  reflow to a single column on phones. Don't hard-code column counts.
- Keyboard-accessible — cards are `<a>` elements with a visible `:focus-visible`
  ring. Keep new interactive elements focusable.
- Honors `prefers-reduced-motion` (disables the floating decorations + hover
  transforms). Any new animation must be gated the same way.
- Copy is bilingual (Vietnamese primary + English gloss), matching the games'
  audience.
```
