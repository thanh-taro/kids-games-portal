---
name: effects-preview
description: Build a throwaway preview page to see/tune fast visual effects (skill effects, monster deaths, projectile trails) in isolation. Use when adding or adjusting anything in js/effects.js, since effects last only a few frames and are hard to catch in normal gameplay screenshots.
---

# Previewing visual effects

Skill/death/trail effects in `js/effects.js` last only ~10-26 frames, so catching them in live gameplay via screenshots is unreliable. Build a temporary preview page that fires them on a loop in isolation.

## Steps

1. Write `effects-preview.html` at the repo root (see template below).
2. Ensure `python3 serve.py 8177` is running.
3. Navigate to `http://localhost:8177/effects-preview.html?v=N#<effect>` (bump `?v=N` each iteration to defeat the ES-module cache; the `#hash` picks one effect). Click the canvas isn't needed — it auto-loops.
4. Burst 3-5 screenshots to catch the effect across its lifespan.
5. Tune values in `js/effects.js`, bump `?v=`, re-check.
6. **Delete `effects-preview.html` when done** — it is not part of the game.

## Template

```html
<!doctype html><html><head><meta charset="utf-8"><title>fx</title>
<style>html,body{margin:0;background:#5fb0e6;font-family:monospace}
canvas{image-rendering:pixelated}.l{color:#1a1423;font-weight:bold;padding:6px}</style>
</head><body><div class="l" id="l">fx</div><canvas id="c" width="480" height="300"></canvas>
<script type="module">
import { ParticleSystem } from './js/effects.js';
import { drawScene } from './js/render.js';
const c=document.getElementById('c'),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
const W=c.width,H=c.height,gy=H-50,ps=new ParticleSystem();
const only=location.hash.slice(1)||'meteor';let t=0;const cx=W/2,cy=gy-40;
function fire(){ // pick what to preview:
  if(['creep','boss','stageboss'].includes(only)) ps.death(cx,cy,only==='boss'?'#e0503a':'#5fc23c',only);
  else ps.play(only,cx,cy,W,H);
  document.getElementById('l').textContent=only;
}
fire();
(function loop(){t++;const ox=ps.screenShake>0?(t%2?3:-3):0;ctx.save();ctx.translate(ox,0);
drawScene(ctx,W,H,gy);ps.update();ps.draw(ctx);ctx.restore();
if(t%30===0)fire();requestAnimationFrame(loop);})();
</script></body></html>
```

Effect names for `#hash`: skill effects `slash|explosion|lightning|meteor`; deaths `creep|boss|stageboss`.
