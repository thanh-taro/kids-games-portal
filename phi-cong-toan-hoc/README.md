# 🚀 Phi Công Toán Học — Cứu Dải Ngân Hà

A pixel-art vertical space shooter that drills mental arithmetic, for kids around
6–9. Vietnamese throughout.

**The kid never flies or aims.** The ship flies and fires itself; every correct
answer launches a volley. There is one meter — **ĐỘ BỀN TÀU VŨ TRỤ**, the ship's
durability — which drops when the ship is hit or a monstership breaks through the
fleet and rams you, and which a correct answer mends. So a child who is slow at arithmetic still survives long
enough to learn, while a fast one visibly gets stronger.

Zero dependencies: HTML5 Canvas + vanilla ES modules. No images, no audio files —
every sprite, effect, sound and music track is generated in code.

## Play

```bash
npm install
npm start           # http://localhost:8179/index.html
```

ES modules need HTTP, so `file://` will not work. `npm start` is a no-cache dev
server — use it rather than a plain static server, or Chrome will serve you stale
`js/*.js` after every edit.

## How to play

- **Tap an answer card** (or press `1`–`4`, or arrows + Enter).
- Correct → the ship fires, its durability mends a little, the combo grows. At combo 3
  and 6 the volley gets wider.
- Wrong → the combo breaks. It never kills you.
- Answer **cleanly** (first try) five times to charge **Siêu Công Thức**, the only
  attack that pierces a boss's dark shield.
- `F8` pauses · `F9` mutes everything · `F10` mutes music only · `R` on the title
  clears progress.
- Pausing **covers the question and the answers** — the pause is a break, not extra
  thinking time. The same question comes back when you resume.

Your **rank** (earned across every session on accuracy and volume, never speed)
shows on the durability row and on the ship itself — the hull trim recolours and
the top three ranks add wing pips. It is a badge: it grants no gameplay bonus.
Losing the same stage three times costs one rank — and clearing that stage wins it
straight back.

## Difficulty

Chosen on the title screen, changeable any time. The level sets the *kind* of
arithmetic; each stage sets how hard *within* that level (12 tiers across the 24
stages), so Hard-stage-1 and Hard-stage-24 are very different workouts.

| Level | Vietnamese | Arithmetic |
|---|---|---|
| Easy | Dễ | Cộng/trừ trong phạm vi 10 |
| Normal | Thường | Cộng/trừ trong phạm vi 100 |
| Hard | Khó | Cộng trừ kết hợp nhân chia bảng cửu chương |
| Hardest | Siêu Khó | Bốn phép tính trong phạm vi 1000 |

## The story — 24 stages, 3 chapters

1. **Lệnh Từ Trái Đất** (stages 1–6) — the Monstership Fleet has reached Earth
   orbit. Push them back through the solar system to the outer dark, and defeat
   the Black Commander. From his wreck: the fleet is a *gang*, it has a master,
   and it holds five prisoners.
2. **Giải Cứu Đồng Đội** (stages 7–18) — five rescues. Each freed ally
   **permanently joins your formation and fires alongside you**, and each grants
   one ability: auto-repair between waves, wing cannons, a per-wave damage
   absorb, faster repair, and finally the ultimate itself.
3. **Cứu Dải Ngân Hà** (stages 19–24) — into the Darkness Realm, six ships
   strong, to break the Galaxy Destroyer's four-phase core.

## Commands

```bash
npm start                 # dev server (no-cache) on :8179
npm test                  # all three gates, below
node js/math.test.js      # the quest contract (~200k assertions)
node js/verify.js          # data invariants + the playability gate
node js/balance.js         # the playability table for all 24 stages
node js/balance.js 14      # detail for one stage
```

Dev-only review pages (open with `npm start`):

| Page | What it is for |
|---|---|
| `math-preview.html` | Every level × tier, sampled. Reading real quests is how giveaway answer sets get caught. |
| `objects-preview.html` | Every sprite at gameplay scale on the real backdrop, plus a frame-diff view. |
| `sounds-preview.html` | Every sound, and every effect fired over a mock quest box. |
| `stages-preview.html` | All 24 blueprints as wave timelines, with the difficulty curve. |

## A note on the tuning

Almost every difficulty number in `js/stages.js` was **measured, not chosen**.
`js/balance.js` simulates three kid profiles — slow (12s/answer, 65% accuracy),
typical (8s, 80%) and fast (5s, 92%) — over every stage, and `npm test` fails if
any stage is not beatable by all three.

That gate has caught a lot: fleets two thirds larger than a child could shoot, a
boss that respawned when you beat it, a 360° attack pattern that looked spectacular
and dealt literally zero damage, and an escape penalty that punished the weakest
player hardest. None of it was visible by reading the numbers.
