# 🎮 Kids Games Portal

[GitHub repo](https://github.com/thanh-taro/kids-games-portal)

A friendly collection of browser games for kids — fun, colorful, and easy to
use. The portal is a single static page (`index.html`) that lets a child pick a
game from a grid of big, tappable cards. It's built to grow: each game lives in
its own folder, and new games are added as more cards on the portal.

Everything is **plain static HTML/CSS/JS** — no build step, no frameworks — so it
can be served straight from **GitHub Pages**.

## Games

Games are organized into two groups on the portal:

- **📚 Chơi mà học · Play & Learn**
- **🎉 Giải trí cùng bạn bè và gia đình · Fun with Friends & Family**

### 📚 Chơi mà học · Play & Learn

| Game | Folder | What it is |
|------|--------|------------|
| **Anh Hùng Bàn Phím** (Cứu Công Chúa) | [`games/anh-hung-ban-phim/`](games/anh-hung-ban-phim/) | A 2D pixel-art typing game that teaches kids to type Vietnamese with the Telex input method. Fight monsters by typing the word above them — a 26-stage, three-chapter story: rescue ten kidnapped princesses, seek the Staff of Wisdom, and defeat the World Devourer. |
| **Phi Công Toán Học** (Cứu Dải Ngân Hà) | [`games/phi-cong-toan-hoc/`](games/phi-cong-toan-hoc/) | A pixel-art vertical space shooter that drills mental arithmetic. The ship flies and fires itself — the kid answers maths questions to keep it powered, and every correct answer is a volley. Four difficulty levels (± within 10 up to all four operations within 1000), 24 stages across three chapters: defend Earth, rescue five imprisoned allies who then fly in formation with you, and destroy the Galaxy Destroyer. |
| **Khinh Khí Cầu Tri Thức** | [`games/khinh-khi-cau-tri-thuc/`](games/khinh-khi-cau-tri-thuc/) | A pixel-art endless climber. A hot-air balloon rises automatically while a spiked nail bar closes in; answer the dynamically generated math, English vocab, or quiz question in time to clear the stage, or the nails burst the balloon. Endless stages with gently scaling difficulty, and the highest stage reached is saved as a local high score. |

*More games coming soon.*

### 🎉 Giải trí cùng bạn bè và gia đình · Fun with Friends & Family

*No games yet — coming soon.*

## Play locally

Because the games use ES modules, they need to be served over HTTP (not opened
as `file://`). Any static server works:

```bash
# from the project root
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

Then click a game card to play. (Each game may also ship its own dev server —
see the game's own README, e.g. `games/anh-hung-ban-phim` uses `npm start`.)

## Install as an app

The portal is an installable PWA (Progressive Web App) — served over HTTP(S) with a
[web app manifest](manifest.webmanifest) and a [service worker](sw.js), it can be
"installed" like a native app on Windows, macOS, Android, and Chromebooks (e.g.
via the install icon in Chrome's address bar, or "Add to Home Screen" on
mobile). Installed, it opens in its own window with its own icon, and the
portal shell works offline once visited. This only covers the portal itself —
each game folder is not independently installable.

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

1. Create a new folder for the game under `games/` (e.g. `games/my-new-game/`)
   with its own `index.html`.
2. Add a new card to the `.games` grid in the root `index.html`, copying the
   existing card as a template:
   ```html
   <a class="game-card" href="games/my-new-game/index.html"
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
index.html                       the portal — game selection page (GitHub Pages landing)
manifest.webmanifest            PWA manifest (install as app)
sw.js                            service worker (offline caching for the portal shell)
icons/                           PWA icons (192/512, incl. maskable variants)
README.md                        this file
games/anh-hung-ban-phim/        the Vietnamese Telex typing game (self-contained)
games/phi-cong-toan-hoc/        the math space shooter game (self-contained)
games/khinh-khi-cau-tri-thuc/  the endless balloon-climb quiz game (self-contained)
LICENSE
```

## Design notes

The portal is designed for kids: large touch-friendly cards, playful colors, a
soft gradient background, gentle floating decorations, and clear "Play" buttons.
It's fully responsive (cards reflow from a grid to a single column on phones),
keyboard-accessible (cards are focusable with a visible focus ring), and it
respects `prefers-reduced-motion`.
