// starfield.js — the scrolling space backdrop.
//
// Phase-2 placeholder for the full biomes.js (24 themed backdrops). It already
// obeys the rule the biome layer will have to obey:
//
//   SCENERY MUST NEVER OUT-READ THE MONSTERSHIPS.
//
// In the typing game, a library biome's bright bookshelves made a book-shaped
// creep vanish, and both had to be redrawn. Here the risk is worse, because a
// starfield is made of the same small bright dots as a bullet. So: stars stay
// dim and desaturated, they scroll DOWNWARD (matching enemy motion, so nothing
// appears to move against the grain except the kid's own shots travelling up),
// and the brightest layer tops out well below the tracer colors.
//
// Stars are generated from a seeded hash rather than Math.random(), so the same
// stage always looks the same — the reproducibility rule from effects.js.

const LAYERS = [
  { n: 70, speed: 8,  size: 1, color: 'rgba(180,190,230,0.35)' },
  { n: 40, speed: 18, size: 2, color: 'rgba(200,210,245,0.5)' },
  { n: 16, speed: 34, size: 2, color: 'rgba(225,232,255,0.7)' },
];

function hash(x) {
  let t = (x ^ 0x9e3779b9) >>> 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export class Starfield {
  constructor(seed = 1) {
    this.seed = seed;
    this.t = 0;
    this.stars = [];
    let k = seed * 7919;
    for (let li = 0; li < LAYERS.length; li++) {
      const L = LAYERS[li];
      for (let i = 0; i < L.n; i++) {
        this.stars.push({
          fx: hash(k++),          // fraction of width
          fy: hash(k++),          // fraction of height, wraps
          layer: li,
          tw: hash(k++),          // twinkle phase
        });
      }
    }
  }

  update(dt) {
    this.t += dt;
  }

  // `bottom` is how far down to paint. During PLAYING it is m.playBottom (the
  // quest box covers the rest); on menu screens there is no quest box, so
  // callers pass m.h and the field fills the window. Defaulting to m.playBottom
  // left a black slab under the title screen in the first build.
  draw(ctx, m, bottom = m.playBottom) {
    // Base: a very dark vertical gradient. Space is not flat black — a slight
    // lift toward the horizon gives the descending ships something to read
    // against without competing with them.
    const g = ctx.createLinearGradient(0, 0, 0, bottom);
    g.addColorStop(0, '#0a0720');
    g.addColorStop(0.6, '#0d0a26');
    g.addColorStop(1, '#120d2e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, m.w, bottom);

    const fieldH = bottom;
    for (const s of this.stars) {
      const L = LAYERS[s.layer];
      // Scroll downward and wrap.
      const y = ((s.fy * fieldH) + this.t * L.speed) % fieldH;
      // Gentle twinkle on the brightest layer only.
      let color = L.color;
      if (s.layer === 2) {
        const a = 0.45 + 0.3 * Math.sin(this.t * 2 + s.tw * 6.28);
        color = `rgba(225,232,255,${a.toFixed(2)})`;
      }
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(s.fx * m.w), Math.round(y), L.size, L.size);
    }
  }
}
