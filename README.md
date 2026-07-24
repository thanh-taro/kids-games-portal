# 🎮 Kids Games Portal

A friendly collection of browser games for kids — fun, colorful, and easy to
use. The portal is a single static page (`index.html`) that lets a child pick a
game from a grid of big, tappable cards. It's built to grow: each game lives in
its own folder, and new games are added as more cards on the portal.

Everything is **plain static HTML/CSS/JS** — no build step, no frameworks — so it
can be served straight from **GitHub Pages**.

## Games

| Game | Folder | What it is |
|------|--------|------------|
| **Anh Hùng Bàn Phím** (Cứu Công Chúa) | [`anh-hung-ban-phim/`](anh-hung-ban-phim/) | A 2D pixel-art typing game that teaches kids to type Vietnamese with the Telex input method. Fight monsters by typing the word above them and rescue the princess! |

*More games coming soon.*

## Play locally

Because the games use ES modules, they need to be served over HTTP (not opened
as `file://`). Any static server works:

```bash
# from the project root
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

Then click a game card to play. (Each game may also ship its own dev server —
see the game's own README, e.g. `anh-hung-ban-phim/serve.py`.)

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*.
4. Choose the `main` branch and the `/ (root)` folder, then **Save**.
5. After a minute, the portal is live at
   `https://<your-username>.github.io/<repo-name>/`.

The portal (`index.html`) is at the repo root, so it becomes the landing page
automatically. Game links are relative, so they work both locally and on Pages.

## Add a new game

1. Create a new folder for the game (e.g. `my-new-game/`) with its own
   `index.html`.
2. Add a new card to the `.games` grid in the root `index.html`, copying the
   existing card as a template:
   ```html
   <a class="game-card" href="my-new-game/index.html"
      style="--c1:#COLOR1; --c2:#COLOR2;">
     <div class="game-art">🎯</div>
     <div class="game-body">
       <h2>Game Title</h2>
       <span class="tag">Short label</span>
       <p>One friendly sentence about the game.</p>
       <span class="play-btn">Chơi ngay ▶</span>
     </div>
   </a>
   ```
3. Pick an emoji for the art, and two colors (`--c1`, `--c2`) for the card's
   gradient and button.
4. Update the **Games** table in this README.

## Project layout

```
index.html          the portal — game selection page (GitHub Pages landing)
README.md           this file
anh-hung-ban-phim/  the Vietnamese Telex typing game (self-contained)
LICENSE
```

## Design notes

The portal is designed for kids: large touch-friendly cards, playful colors, a
soft gradient background, gentle floating decorations, and clear "Play" buttons.
It's fully responsive (cards reflow from a grid to a single column on phones),
keyboard-accessible (cards are focusable with a visible focus ring), and it
respects `prefers-reduced-motion`.
