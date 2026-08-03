// sprites.js — all game art as pixel grids.
//
// Each sprite is an array of strings; every character is one pixel cell:
//   ' ' (space) = transparent
//   any other char = filled, and the character is a palette key (see PALETTE).
//
// Redesigned in a vibrant outlined pixel-art style (à la the reference dino
// scene): every sprite has a black outline ('k'), a base color, and lighter/
// darker shade tones for depth.

export const PALETTE = {
  // structure / shading
  k: '#1a1423', // near-black outline
  W: '#ffffff', // white (eyes, highlights)
  w: '#d9d9e0', // off-white shade
  '.': '#3a3550', // dark shadow

  // world colors
  Z: '#5fb0e6', // sky blue
  z: '#8fd0f5', // sky light
  N: '#f6e7a8', // sand (pale yellow)
  n: '#ecd77e', // sand shade / dither
  D: '#c78a3b', // dirt brown
  d: '#a06a28', // dirt dark
  E: '#8a5a20', // earth darkest

  // skin & hair
  S: '#f4c99a', // skin
  s: '#d99e6a', // skin shade
  H: '#7a4a1e', // hair/leather brown

  // hero / cloth
  B: '#3d7bd6', // blue armor
  b: '#2a5aa8', // blue shade
  Y: '#f2c53d', // gold/yellow
  y: '#c99a1e', // gold shade
  P: '#b06cf0', // purple/magic
  p: '#8544c4', // purple shade

  // monsters
  G: '#5fc23c', // green (slime/ogre)
  g: '#3d9426', // green shade
  R: '#e0503a', // red (dino boss)
  r: '#b0311f', // red shade
  q: '#f38b6b', // red light (dino highlight)
  I: '#ffd24a', // dino teeth / back-spikes / claws (warm ivory-gold)
  C: '#4ad4d4', // cyan (effects)
  O: '#e8823a', // orange

  // biome scenery (see BIOMES in biomes.js — cave, snow, castle, swamp, lava)
  F: '#2f7d3a', // deep forest green (pine foliage)
  f: '#1e5827', // forest green shade
  T: '#6b4a2a', // tree trunk brown
  t: '#4a3119', // trunk shade
  L: '#8f8aa8', // grey stone (cave rock, castle wall)
  l: '#6a6580', // grey stone shade
  M: '#4a4560', // dark stone (cave depths, jail iron)
  m: '#e8f4ff', // snow white-blue
  x: '#c3dcf0', // snow shade
  A: '#3fb8b0', // ice/water teal
  a: '#2a8b86', // water shade
  V: '#ff7a2f', // lava orange-hot
  v: '#d63a12', // lava deep red
  J: '#8a7f5c', // swamp murk / reed
  j: '#5c5438', // swamp dark

  // far-background layers (mountains sit behind everything, hazed by distance)
  U: '#6d7fa8', // distant mountain rock
  u: '#57678c', // distant mountain shade
  X: '#e8f4ff', // distant snow cap

  // --- Princess themes (see PRINCESS_STYLES) -------------------------------
  // Twelve princesses share ONE body template; only these palette keys change
  // per theme, via the SLOT remapping in princessSprite(). Keys are grouped in
  // light/dark pairs so the gown always has a shade tone to sculpt with.
  // gowns
  '1': '#f5749b', // rose pink        (Hoa)
  '2': '#c94a75', //   rose shade
  '3': '#6fd8e8', // stream teal      (Suối)
  '4': '#3a9fb8', //   stream shade
  '5': '#4a4a9e', // star indigo      (Sao)
  '6': '#32316e', //   indigo shade
  '7': '#ffb43d', // sun amber        (Ánh Dương)
  '8': '#e08420', //   amber shade
  '9': '#3fc99a', // sea green        (Sóng)
  '0': '#249472', //   sea shade
  '!': '#e8d9a8', // sand beige       (Cát)
  '@': '#c0aa74', //   sand shade
  '#': '#d8f0ff', // ice white-blue   (Băng)
  $: '#a3ccec', //   ice shade
  '%': '#efe6ff', // cloud lavender   (Mây)
  '^': '#c7b6ea', //   cloud shade
  '&': '#e8425f', // love crimson     (Tình Yêu)
  '*': '#b02642', //   crimson shade
  '(': '#fff6d0', // light radiant    (Ánh Sáng)
  ')': '#ffdf7a', //   radiant shade

  // hair tones used by the themes
  Q: '#2e2233', // near-black hair
  o: '#f7e07a', // blonde
  e: '#b8d8f0', // pale ice blue
  c: '#2a6b78', // dark teal
  i: '#f2f6ff', // silver-white
  h: '#f4a8c8', // pale pink hair
  '+': '#8a4a2a', // auburn
};

// --- Hero: the "Knight" (facing right). 16 x 20, outlined + shaded. ---
//
// Redrawn bigger than the old 14x16 because a humanoid needs vertical room for
// head + torso + legs AND a face that reads. Three rules make it legible at
// this size (the old sprite broke all three):
//   1. Eyes are single DARK pixels on skin — never white-on-black. A 4px-wide
//      face has no room for sclera + pupil, so `kSWkSWSk` read as a black nose
//      stripe between two white blobs.
//   2. Hair (`H`) shows under the helmet rim. A hat sitting straight on skin
//      reads as a yellow blob; the hair mass is what says "person".
//   3. The black outline is unbroken around the silhouette — the old row
//      `kkk BBBB kkk` punched two holes through the middle of his torso.
//
// The raised sword makes him read as a hero instantly and finally makes the
// weapon rewards visible. Its blade is the SLOT char '=' (shade ';'), remapped
// per equipped weapon by heroSprite() below — that's the "dynamic weapon" hook.
//
// The sword MUST be held: a blade floating near the head (an earlier attempt
// put it diagonally above his shoulder) reads as a feather or a party-hat
// plume, not a weapon. What makes it read as a sword:
//   - it runs straight VERTICALLY, so the silhouette is unambiguous
//   - a gold crossguard ('Y') separates blade from grip — without a crossguard
//     a vertical bar is just a stick
//   - the raised right ARM connects hand to shoulder, so it's clearly held
// Frame 2 moves ONLY the cape; the body, arm, and blade stay locked so the
// ground line never jitters.
const HERO_FRAMES = [
  [
    '         k      ',
    '        k=k     ', // blade — vertical, in the raised right hand
    '        k=k     ',
    '        k=k     ',
    '        k=k     ',
    '       kY=Yk    ', // gold crossguard
    '   kkkk kSk     ', // grip, held in the fist
    '   kYYYkkSkk    ', // helmet dome — the top row is NARROWER than the brow,
    '  kYYyYYYkSk    ', // so it curves; a full-width top read as a flat headband
    '  kkkkkkkkBk    ', // helmet brow rim; upper arm joins the shoulder
    '  kHSSSSHkBk    ', // hair under the rim, framing the face
    '  kHSkSkSHk     ', // eyes: single dark pixels on skin
    '  kHSSSSSHk     ',
    '   kkSsSkk      ', // chin + mouth shadow
    ' kBkBBBBkBk     ', // shoulders (left arm hangs, right one is raised)
    'kPBBBBBBBBk     ',
    'kPPkBBbbBkk     ',
    ' kPkBBBBBk      ',
    '   kBBkBBk      ', // legs
    '   kbk kbk      ',
  ],
  [
    '         k      ',
    '        k=k     ',
    '        k=k     ',
    '        k=k     ',
    '        k=k     ',
    '       kY=Yk    ',
    '   kkkk kSk     ',
    '   kYYYkkSkk    ',
    '  kYYyYYYkSk    ',
    '  kkkkkkkkBk    ',
    '  kHSSSSHkBk    ',
    '  kHSkSkSHk     ',
    '  kHSSSSSHk     ',
    '   kkSsSkk      ',
    ' kBkBBBBkBk     ',
    'kPBBBBBBBBk     ',
    'kPPkBBbbBkk     ', // cape billows DOWN-LEFT — it must never overwrite a
    ' kPkBBBBBk      ', // torso pixel, or the body visibly shrinks/jerks.
    ' kPkBBkBBk      ', // Torso columns stay byte-identical to frame 1.
    '   kbk kbk      ',
  ],
];

export const HERO_KNIGHT = { w: 16, h: 20, frames: HERO_FRAMES };

// Blade slot chars in HERO_FRAMES: '=' is the blade, ';' its shade. The default
// PALETTE entries below are the starting steel; heroSprite() swaps them for the
// equipped weapon's color.
PALETTE['='] = '#dfe6f0'; // steel blade
PALETTE[';'] = '#9aa4b8'; // steel shade

// Build a hero sprite whose BLADE is tinted to the equipped weapon color.
// Returns the shared HERO_KNIGHT unchanged when no weapon color is set, so the
// common path allocates nothing. Callers pass `hero.weaponColor` (set by
// rewards.applyRewards) or `equippedLook().weaponColor` in menu scenes.
//
// Implementation note: PALETTE is a flat char->color map shared by every
// sprite, so a per-weapon blade color can't live there. Instead the frames are
// rewritten to use a private pair of slot chars registered into PALETTE on
// demand and cached — one extra key per distinct weapon color, of which there
// are at most a handful (see REWARDS).
const bladeCache = new Map();

export function heroSprite(weaponColor) {
  if (!weaponColor) return HERO_KNIGHT;
  const cached = bladeCache.get(weaponColor);
  if (cached) return cached;

  // Register a unique slot char pair for this color (private-use unicode, so it
  // can never collide with a hand-authored sprite char).
  const base = String.fromCharCode(0xe000 + bladeCache.size * 2);
  const shade = String.fromCharCode(0xe001 + bladeCache.size * 2);
  PALETTE[base] = weaponColor;
  PALETTE[shade] = shadeOf(weaponColor);

  const sprite = {
    w: HERO_KNIGHT.w,
    h: HERO_KNIGHT.h,
    frames: HERO_FRAMES.map((frame) =>
      frame.map((row) => row.split('=').join(base).split(';').join(shade)),
    ),
  };
  bladeCache.set(weaponColor, sprite);
  return sprite;
}

// Darken a #rrggbb hex by ~35% for the auto-generated blade shade tone.
function shadeOf(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = 0.65;
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// --- Princess (to be rescued). 14 x 20, one template x 12 themes ------------
//
// The twelve princesses are DATA, not twelve hand-drawn sprites: they all share
// the body template below and differ only in a crown motif, a hair shape, and a
// color remap. Each one's look matches her name and her stage's biome, so the
// princess reads as belonging to the place she was taken from.
//
// SLOT CHARS in the template (remapped per theme by princessSprite()):
//   G/g  gown / gown shade      A/a  hair / hair shade      C  crown
// Literal chars (`k` outline, `S`/`s` skin, `W` highlight) pass through as-is.
//
// The old 12x16 sprite failed for three reasons, all fixed here:
//   1. Its crown spikes were drawn in BLACK (`k k k k`) against dark backdrops —
//      invisible. Crowns are now the theme's `C` color with a k outline under.
//   2. It had 2 pixels of hair total, so it read as "helmet + dress". Hair is
//      now a real mass framing the face, and it's the main per-theme silhouette.
//   3. The gown was a plain triangle. There's now a waist, a sash, and arms.
// Face follows the same eyes-as-dark-pixels rule as the hero.
const PRINCESS_BODY = [
  // rows 0-2 are the crown (supplied per theme), rows 3+ are shared.
  // The head-top row is the HAIR, not a bare `k` outline — a black bar directly
  // under the crown band made the two merge into one thick dark-then-bright
  // stripe, hiding the crown's shape.
  '   kAAAAk     ',
  '  kAAAAAAk    ',
  '  kASSSSAk    ',
  ' kAASSSSAAk   ',
  ' kAaSkSSkSk   ', // eyes: dark pixels on skin
  ' kAaSSssSSk   ',
  ' kAa kSSSk    ',
  ' kAa  kSk     ',
  '  ka kGGGk    ', // shoulders
  '  kSSGGGGSSk  ', // arms JOIN the shoulders — an earlier version put a black
  '  kSSGgGgSSk  ', // column between arm and body, so the arms read as detached
  '   kkYYYYkk   ', // floating bars. Skin must touch the gown.
  '   kGGGGGGk   ', // gold sash at the waist
  '  kGGgGGgGGk  ', // Skirt folds are 1px-wide vertical DRAPE LINES at fixed
  '  kGGgGGgGGk  ', // columns — continuous top-to-bottom so they read as pleats.
  ' kGGGgGGgGGGk ', // A solid 3px-wide block here read as an apron/hole, and
  ' kGGGgGGgGGGk ', // scattered single pixels read as dirt specks.
  ' kkkkkkkkkkkk ',
];

// Frame 2: gown hem flares one column wider and the hair tip sways — motion in
// the extremities only, so she doesn't visibly hop off the ground line.
const PRINCESS_BODY_SWAY = [
  '   kAAAAk     ',
  '  kAAAAAAk    ',
  '  kASSSSAk    ',
  ' kAASSSSAAk   ',
  ' kAaSkSSkSk   ',
  ' kAaSSssSSk   ',
  ' kAa kSSSk    ',
  ' kAa  kSk     ',
  '  ka kGGGk    ',
  '  kSSGGGGSSk  ',
  '  kSSGgGgSSk  ',
  '   kkYYYYkk   ',
  '   kGGGGGGk   ',
  '  kGGgGGgGGk  ',
  ' kGGGgGGgGGGk ', // hem flares one column wider on this frame — the sway is
  ' kGGGgGGgGGGk ', // in the SKIRT only; head, arms and waist never move.
  'kGGGGgGGgGGGGk',
  'kkkkkkkkkkkkkk',
];

// Per-princess crown motifs — 2 rows, 14 wide, drawn above the head.
//   'C' = the theme's accent (the gem / petal / shard — the part that says
//         WHICH princess this is)
//   'Y' = gold, the band every crown shares
//
// Both rows matter: the top row is the motif's silhouette, the bottom is the
// band that anchors it to the head. Two rules learned the hard way:
//   - The BAND must be gold on every princess. A crown tinted to a pale theme
//     color (silver on white hair, grey on teal) vanished into the hair.
//   - The motif needs a `k` outline against the band, or gem and band fuse into
//     one bright blob.
const CROWNS = {
  // petals in a ring — the flower crown, echoing the trace prop in the biomes
  flower: ['  CkCkCkC     ', '  kYYYYYYk    '],
  // three hanging droplets
  droplet: ['  CkCkCkC     ', '  kYYYYYYk    '],
  // a star: 3 wide, so it reads as a shape and not a stray dot
  star: ['   kCCCk      ', '  kYYYYYYk    '],
  // radiant spikes, tallest in the middle
  sun: ['  CkCCCkC     ', '  kYYYYYYk    '],
  // scallop of a seashell
  shell: ['  CCkCkCC     ', '  kYYYYYYk    '],
  // a plain desert circlet — a single gem, no spikes (she wears a veil)
  circlet: ['    kCk       ', '  kYYYYYYk    '],
  // jagged ice shards of alternating height
  crystal: ['  CkCkCkC     ', '  kYYYYYYk    '],
  // soft cloud wisps
  wisp: ['  CCkkkCC     ', '  kYYYYYYk    '],
  // a heart at the centre
  heart: ['   CkkCC      ', '  kYYYYYYk    '],
  // halo — the finale's crown is light itself, a full arc above the band
  halo: ['  CCCCCCCC    ', '  kYYYYYYk    '],
};

// The twelve themes. `gown`/`gownShade` and `hair`/`hairShade` are PALETTE keys
// (see the "Princess themes" block at the top of this file); `crown` names a
// CROWNS motif. Stage 1-2 are warm-ups with no princess, so the list starts at
// stage 3 — see PRINCESS_STYLES' use in stages.js (`princessStyle`).
// `crown` is the ACCENT/gem color ('C' in the motif), deliberately picked to
// contrast with that princess's hair so the crown never disappears into it.
export const PRINCESS_STYLES = {
  // "Princess Flower" — rose gown, auburn braid, pink petal crown.
  flower: { gown: '1', gownShade: '2', hair: '+', hairShade: 'H', crown: '1', motif: 'flower' },
  // "Rain Princess" — teal-and-white, hair like running water.
  stream: { gown: '3', gownShade: '4', hair: 'A', hairShade: 'a', crown: '#', motif: 'droplet' },
  // "Princess Star" — indigo night gown, pale-blue hair, white star.
  star: { gown: '5', gownShade: '6', hair: 'e', hairShade: 'A', crown: 'W', motif: 'star' },
  // "Princess Sunlight" — amber gown, blonde hair, radiant spikes.
  sunlight: { gown: '7', gownShade: '8', hair: 'o', hairShade: 'y', crown: 'V', motif: 'sun' },
  // "Princess Wave" — sea green with a foam hem, dark-teal hair, shell crown.
  wave: { gown: '9', gownShade: '0', hair: 'c', hairShade: 'j', crown: '#', motif: 'shell' },
  // "Princess Sand" — desert beige, sun-bleached hair, single amber gem.
  sand: { gown: '!', gownShade: '@', hair: '+', hairShade: 'H', crown: 'O', motif: 'circlet' },
  // "Princess Ice" — ice-white gown, pale ice-blue hair (a shade darker than
  // the gown so the two separate against the snow biome), teal crystal shards.
  ice: { gown: '#', gownShade: '$', hair: 'e', hairShade: 'A', crown: 'A', motif: 'crystal' },
  // "Princess Cloud" — lavender gown, pale pink hair, white cloud wisps.
  cloud: { gown: '%', gownShade: '^', hair: 'h', hairShade: 'P', crown: 'W', motif: 'wisp' },
  // "Princess of Love" — crimson gown, dark hair, rose-pink heart.
  love: { gown: '&', gownShade: '*', hair: 'Q', hairShade: 'k', crown: '1', motif: 'heart' },
  // "Princess Light" — radiant white-gold, auburn hair (so the gold halo and
  // gown read against it), halo crown. The finale.
  light: { gown: '(', gownShade: ')', hair: '+', hairShade: 'H', crown: 'Y', motif: 'halo' },
};

// Build a princess sprite for a theme name. Unknown/missing name falls back to
// the neutral purple-gown default, so a stage without `princessStyle` still
// draws a valid princess.
const DEFAULT_STYLE = { gown: 'P', gownShade: 'p', hair: 'H', hairShade: 't', crown: 'Y', motif: 'star' };
const princessCache = new Map();

// A style's gown color, for UI that needs to tell princesses apart at a glance
// (e.g. the princess-support HUD pips) without drawing a full sprite.
export function princessThemeColor(style) {
  const s = PRINCESS_STYLES[style] || DEFAULT_STYLE;
  return PALETTE[s.gown];
}

export function princessSprite(styleName) {
  const key = styleName || '_default';
  const cached = princessCache.get(key);
  if (cached) return cached;

  const st = PRINCESS_STYLES[styleName] || DEFAULT_STYLE;
  const crown = CROWNS[st.motif] || CROWNS.star;
  const remap = (row) =>
    row
      .split('G').join(st.gown)
      .split('g').join(st.gownShade)
      .split('A').join(st.hair)
      .split('a').join(st.hairShade)
      .split('C').join(st.crown);

  const sprite = {
    w: 14,
    h: 20,
    frames: [
      [...crown, ...PRINCESS_BODY].map(remap),
      [...crown, ...PRINCESS_BODY_SWAY].map(remap),
    ],
  };
  princessCache.set(key, sprite);
  return sprite;
}

// Default princess (no theme) — kept as a named export so existing callers and
// SPRITES.princess keep working.
export const PRINCESS = princessSprite(null);

// --- Creep monster: "Slime" (green, outlined). 12 x 10 ---
export const CREEP_SLIME = {
  w: 12,
  h: 9,
  frames: [
    [
      '    kkkk     ',
      '   kGGGGk    ',
      '  kGGGGGGk   ',
      ' kGGWkGGWk   ',
      ' kGGkGGGkk   ',
      'kGGGGGGGGGk  ',
      'kGgGGGGgGGk  ',
      'kGGGGGGGGGk  ',
      ' kkkkkkkkk   ',
    ],
    [
      '    kkkk     ',
      '   kGGGGk    ',
      '  kGGGGGGk   ',
      ' kGWkGWGk    ',
      ' kGGkGGGkk   ',
      'kGGGGGGGGGk  ',
      'kGgGGGGgGGk  ',
      'kGGGGGGGGGk  ',
      ' kkkkkkkkk   ',
    ],
  ],
};

// --- Boss monster: "Fire Dino" (red T-Rex, outlined). 22 x 18 ---
// A fierce side-profile tyrannosaur facing right: a long tapering tail sweeping
// out behind, a rising body, a big head with a glaring white eye and an open
// toothy jaw, gold back-spikes, one tiny clawed arm, and two powerful clawed
// hind legs. Frame 0 = roaring with mouth open, leg forward; frame 1 = mouth
// closed mid-stride — so it visibly stomps and roars.
export const BOSS_DRAGON = {
  w: 22,
  h: 18,
  frames: [
    // frame 0 — roar: mouth open, front leg planted
    [
      '                kkkk  ',
      '              kkRRRRk ',
      '            IkRRRRRRRk',
      '          IkRRRWRRRRRk',
      '        IkRRRRRRRRkkkk',
      '  kk  IkRRRRRRRRRk    ',
      'kkRRkkkRRRRRRRRRRk    ',
      ' kRRRRRRRRRRRRRkIIIIk ',
      '  kRRRRRRRRRRRRk kkkk ',
      '   kkkRRRRRRRRRk      ',
      '      kRRRRRkkkk      ',
      '      kRRRRRkIk       ',
      '      krRRRRk         ',
      '      kRRRRRk         ',
      '      kRRkRRk         ',
      '      kRk kRk         ',
      '     kIIk kRk         ',
      '          kIIk        ',
    ],
    // frame 1 — mid-stride: mouth closed, weight shifts to back leg
    [
      '                      ',
      '                kkkk  ',
      '              kkRRRRk ',
      '            IkRRRRRRRk',
      '          IkRRRWRRRRRk',
      '        IkRRRRRRRRRkkk',
      '  kk  IkRRRRRRRRRIIIk ',
      'kkRRkkkRRRRRRRRRkkkk  ',
      ' kRRRRRRRRRRRRRk      ',
      '  kRRRRRRRRRRRRk      ',
      '   kkkRRRRRkkkk       ',
      '      kRRRRkIk        ',
      '      krRRRRk         ',
      '      kRRRRRk         ',
      '      kRRRRRk         ',
      '      kRRkkRk         ',
      '     kRRk kIIk        ',
      '     kIIk             ',
    ],
  ],
};

// --- Stage Boss: "Giant Ogre" (green, tusked, outlined). 20 x 18 ---
// Two frames: a heavy breathing/looming idle. Frame 1 sinks the whole body one
// row (shoulders hunch, head drops into them) and shifts the weight between the
// legs, so the ogre visibly breathes instead of standing frozen — it was
// single-frame originally, which read as a bug next to every animated creep.
//
// FOOTING: a monster's y comes from sprite.h, so any all-blank row at the
// BOTTOM of a frame becomes an invisible gap that floats the sprite above the
// ground. This frame previously carried a trailing blank row (on the mistaken
// belief that hero_knight had one too — it doesn't, its last row is feet), and
// at stageboss scale that read as the ogre hovering. No trailing blank row.
export const STAGEBOSS_OGRE = {
  w: 20,
  h: 18,
  frames: [
    [
      '      kkkkkk        ',
      '    kkGGGGGGkk      ',
      '   kGGGGGGGGGGk     ',
      '  kGGGGGGGGGGGGk    ',
      '  kGGWkGGGGkWGGk    ',
      '  kGGWkGGGGkWGGk    ',
      '  kGGGGGGGGGGGGk    ',
      '  kGGkWWWWWWkGGk    ',
      '  kGGGWkkkkWGGGk    ',
      '  kGGGGGGGGGGGGk    ',
      ' kGGGGGGGGGGGGGGk   ',
      ' kGgGGGGGGGGGGgGk   ',
      ' kGGGGGGGGGGGGGGk   ',
      ' kkGGGGGGGGGGGGkk   ',
      '   kGGGk  kGGGk     ',
      '   kGGGk  kGGGk     ',
      '   kGgGk  kGgGk     ',
      '  kkkkk    kkkkk    ',
    ],
    [
      '      kkkkkk        ',
      '    kkGGGGGGkk      ',
      '   kGGGGGGGGGGk     ',
      '  kGGWkGGGGkWGGk    ',
      '  kGGWkGGGGkWGGk    ',
      '  kGGGGGGGGGGGGk    ',
      '  kGGkWWWWWWkGGk    ',
      '  kGGGWkkkkWGGGk    ',
      '  kGGGGGGGGGGGGk    ',
      ' kGGGGGGGGGGGGGGk   ',
      ' kGgGGGGGGGGGGgGk   ',
      ' kGGGGGGGGGGGGGGk   ',
      ' kGGGGGGGGGGGGGGk   ',
      ' kkGGGGGGGGGGGGkk   ',
      '   kGGGk  kGGGk     ',
      '   kGgGk  kGgGk     ',
      '   kGgGk  kGgGk     ',
      '  kkkkk    kkkkk    ',
    ],
  ],
};

// ===== Bosses =====
// Boss tier gets 20-22 dots at scale 1.75-2.1 (~110-130px on screen), which is
// enough for a real character — the creeps' one-shape-plus-eyes limit does NOT
// apply here. That budget is why the T-Rex works, and it's what these use.
//
// One more rule, learned on the Dark Lord: ROUND READS AS CUDDLY. A rounded
// silhouette is friendly no matter how dark you color it, so anything meant to
// be threatening needs hard angles — square shoulders, straight sides, jagged
// edges. Keep curves for the creatures you WANT to be cute.

// --- Meadow boss: "Ong Chúa" (Queen Bee). 20 x 18 ---
// A big striped abdomen, a crowned head, and BROAD pale wings swept out to both
// sides. A first pass made her too small inside the frame with 1px wings that
// vanished entirely — the wings are now solid 3-4px slabs and the body fills the
// grid, so she reads at gameplay size. She hovers, so both frames keep the same
// footing gap and only the wings + abdomen banding shift.
export const BOSS_QUEENBEE = {
  w: 20,
  h: 18,
  frames: [
    [
      '       k  k         ',
      '      kYkkYk        ',
      '       kYYk         ',
      '     kkkkkkkk       ',
      '    kYYWkkWYYk      ',
      '    kYYYYYYYYk      ',
      '     kkkkkkkk       ',
      'kwwk   kkkk   kwwk  ',
      'kwwwkkkYYYYkkkwwwk  ',
      ' kwwwkYYYYYYkwwwk   ',
      '  kkkkYYYYYYkkkk    ',
      '    kkYYYYYYkk      ',
      '    kkkkkkkkkk      ',
      '    kYYYYYYYYk      ',
      '    kkkkkkkkkk      ',
      '     kYYYYYYk       ',
      '      kkIIkk        ',
      '                    ',
    ],
    [
      '       k  k         ',
      '      kYkkYk        ',
      '       kYYk         ',
      '     kkkkkkkk       ',
      '    kYYWkkWYYk      ',
      '    kYYYYYYYYk      ',
      '     kkkkkkkk       ',
      '  kwwkkkkkkkwwk     ',
      ' kwwwkYYYYYYkwwwk   ',
      'kwwwkkYYYYYYkkwwwk  ',
      'kkkk kYYYYYYk kkkk  ',
      '    kkkkkkkkkk      ',
      '    kYYYYYYYYk      ',
      '    kkkkkkkkkk      ',
      '    kYYYYYYYYk      ',
      '     kYYYYYYk       ',
      '      kkIIkk        ',
      '                    ',
    ],
  ],
};

// --- Forest boss: "Gấu Rừng Già" (Old Forest Bear). 20 x 18 ---
// A broad standing bear: round ears, a pale muzzle, a heavy moss-dark body and
// big clawed forepaws. Bulk is the read here, not detail.
// Idle animation is a rear-up roar, not a single-pixel wiggle: frame 1 opens
// the muzzle wider with a white fang glint, and lifts both forepaws so their
// claws poke up past the shoulder line — legs and feet stay pinned so footing
// never shifts, matching the dragon's roar/stride pairing rather than a static
// held pose.
export const BOSS_BEAR = {
  w: 20,
  h: 17,
  frames: [
    [
      '  kk      kk        ',
      ' kTTk    kTTk       ',
      ' kTTkkkkkkTTk       ',
      '  kTTTTTTTTk        ',
      '  kTTWTTWTTk        ',
      '  kTTTTTTTTk        ',
      '  kTTkSSkTTk        ',
      '  kTTTSSTTTk        ',
      '   kkTTTTkk         ',
      ' kkTTTTTTTTkk       ',
      'kTTTTTTTTTTTTk      ',
      'kTTtTTTTTTtTTk      ',
      'kTTTTTTTTTTTTk      ',
      'kITTTTTTTTTTIk      ',
      ' kkTTTTTTTTkk       ',
      '  kITTk kTTIk       ',
      '  kkkkk kkkkk       ',
    ],
    [
      '  kk      kk        ',
      ' kTTk    kTTk       ',
      ' kTTkkkkkkTTk       ',
      '  kTTTTTTTTk        ',
      '  kTTWTTWTTk        ',
      '  kTTTTTTTTk        ',
      '  kTkSSSSkTk        ',
      '  kTTSWWSTTk        ',
      '  IkkTTTTkkI        ',
      ' kkTTTTTTTTkk       ',
      'kTTTTTTTTTTTTk      ',
      'kTTtTTTTTTtTTk      ',
      'kTTTTTTTTTTTTk      ',
      'kTTTTTTTTTTTTk      ',
      ' kkITTTTTTITkk      ',
      '  kITTk kTTIk       ',
      '  kkkkk kkkkk       ',
    ],
  ],
};

// --- Cave boss: "Golem Đá" (Stone Golem). 20 x 18 ---
// A blocky rock giant with a glowing crystal core in its chest — deliberately
// all right angles (it's made of cave rock), which also keeps it from reading
// cute. The core is the one bright thing in the darkest biome.
// Idle animation: the whole body bobs up one row (heavy, grinding-stone feel
// rather than a bounce) and the chest core pulses core->white on the raised
// frame, so the one bright thing in the cave visibly breathes.
export const BOSS_GOLEM = {
  w: 20,
  h: 17,
  frames: [
    [
      '                    ',
      '   kkkkkkkk         ',
      '  kLLLLLLLLk        ',
      '  kLCLLLLCLk        ',
      '  kLLLLLLLLk        ',
      '  kkkkkkkkkk        ',
      ' kLLLLLLLLLLk       ',
      'kLLLLLLLLLLLLk      ',
      'kLLLLkCCkLLLLk      ',
      'kLLLLkCCkLLLLk      ',
      'kLLLLLkkLLLLLk      ',
      'kLLLLLLLLLLLLk      ',
      'klLLLLLLLLLLlk      ',
      ' kkLLLLLLLLkk       ',
      '  kLLLk kLLLk       ',
      '  kLLLk kLLLk       ',
      '  klLlk klLlk       ',
    ],
    [
      '   kkkkkkkk         ',
      '  kLLLLLLLLk        ',
      '  kLCLLLLCLk        ',
      '  kLLLLLLLLk        ',
      '  kkkkkkkkkk        ',
      ' kLLLLLLLLLLk       ',
      'kLLLLLLLLLLLLk      ',
      'kLLLLkWWkLLLLk      ',
      'kLLLLkWWkLLLLk      ',
      'kLLLLLkkLLLLLk      ',
      'kLLLLLLLLLLLLk      ',
      'klLLLLLLLLLLlk      ',
      ' kkLLLLLLLLkk       ',
      '  kLLLk kLLLk       ',
      '  kLLLk kLLLk       ',
      '  klLlk klLlk       ',
      '  kkkkk kkkkk       ',
    ],
  ],
};

// --- Coast boss: "Thuyền Trưởng Xương" (Skeleton Captain). 20 x 18 ---
// From the wreck in the surf: a wide captain's hat, a bone-white skull with dark
// sockets, and a coat. The HAT is what makes it read — a bare skull at this size
// is just a pale blob, but a tricorn says pirate captain immediately.
export const BOSS_CAPTAIN = {
  w: 20,
  h: 18,
  frames: [
    [
      '  kkkkkkkkkk        ',
      ' kMMMMMMMMMMk       ',
      'kMMMMMMMMMMMMk      ',
      ' kkkkkkkkkkkk       ',
      '   kwwwwwwk         ',
      '   kwkkkkwk         ',
      '   kwkkkkwk         ',
      '   kwwkkwwk         ',
      '    kwwwwk          ',
      '   kkkwwkkk         ',
      '  kMMMwwMMMk        ',
      ' kMMMMwwMMMMk       ',
      ' kMMMMMMMMMMk       ',
      ' kMMMMMMMMMMk       ',
      ' kMMkMMMMkMMk       ',
      '  kkkMMMMkkk        ',
      '   kkMMMMkk         ',
      '    kkkkkk          ',
    ],
    [
      '                    ',
      '  kkkkkkkkkk        ',
      ' kMMMMMMMMMMk       ',
      'kMMMMMMMMMMMMk      ',
      ' kkkkkkkkkkkk       ',
      '   kwwwwwwk         ',
      '   kwkkkkwk         ',
      '   kwkkkkwk         ',
      '   kwwkkwwk         ',
      '    kwwwwk          ',
      '   kkkwwkkk         ',
      '  kMMMwwMMMk        ',
      ' kMMMMwwMMMMk       ',
      ' kMMMMMMMMMMk       ',
      ' kMMkMMMMkMMk       ',
      '  kkkMMMMkkk        ',
      '   kkMMMMkk         ',
      '    kkkkkk          ',
    ],
  ],
};

// --- Dunes boss: "Bọ Cạp Vàng" (Gold Scorpion). 20 x 16 ---
// A low wide body, two big forward claws, and a segmented tail curling up and
// FORWARD over its back to a stinger. A first pass drew the tail as a thin
// diagonal line that didn't visibly join the body, and the whole thing read as a
// gourd with a stalk — the tail is now 2px thick, clearly segmented, and rooted
// in the abdomen, and the claws are chunky pincer blocks rather than nubs.
export const BOSS_SCORPION = {
  w: 20,
  h: 15,
  frames: [
    [
      '                    ',
      '          kkkk      ',
      '         kIIIIk     ',
      '         kIkkIk     ',
      '      kkkkIIIk      ',
      '     kNNNNkkk       ',
      '    kNNNNk          ',
      'kkk kNNNNk          ',
      'kNNkkNNNNk          ',
      'kNNkNNNNNNkkk       ',
      ' kkNNNNNNNNNNk      ',
      'kNNNWNNNNWNNNNk     ',
      'kNNnNNNNNNNNnNk     ',
      ' kkNNNNNNNNNNkk     ',
      '  k kk k kk k       ',
    ],
    [
      '                    ',
      '         kkkk       ',
      '        kIIIIk      ',
      '        kIkkIk      ',
      '     kkkkIIIk       ',
      '    kNNNNkkk        ',
      '   kNNNNk           ',
      'kkkkNNNNk           ',
      'kNNkNNNNk           ',
      'kNNkNNNNNNkkk       ',
      ' kkNNNNNNNNNNk      ',
      'kNNNWNNNNWNNNNk     ',
      'kNNnNNNNNNNNnNk     ',
      ' kkNNNNNNNNNNkk     ',
      ' kk  k k  k kk      ',
    ],
  ],
};

// --- Snow boss: "Người Tuyết Khổng Lồ" (Ice Giant). 20 x 18 ---
// A hulking figure of packed snow with ice-blue shadow and a frozen shard crown.
// Wide, heavy, and slightly hunched — the biggest silhouette in the set.
export const BOSS_ICEGIANT = {
  w: 20,
  h: 17,
  frames: [
    [
      '   k  kk  k         ',
      '   kAkAAkAk         ',
      '  kkmmmmmmkk        ',
      ' kmmmmmmmmmmk       ',
      ' kmmAkmmkAmmk       ',
      ' kmmmmmmmmmmk       ',
      ' kmmmxxxxmmmk       ',
      '  kkmmmmmmkk        ',
      ' kmmmmmmmmmmk       ',
      'kmmmmmmmmmmmmk      ',
      'kmmxmmmmmmxmmk      ',
      'kmmmmmmmmmmmmk      ',
      'kmmmmmmmmmmmmk      ',
      ' kxmmmmmmmmxk       ',
      '  kkmmmmmmkk        ',
      '  kmmxk kxmmk       ',
      '  kkkkk kkkkk       ',
    ],
    [
      '                    ',
      '   k  kk  k         ',
      '   kCkCCkCk         ',
      '  kkmmmmmmkk        ',
      ' kmmmmmmmmmmk       ',
      ' kmmCkmmkCmmk       ',
      ' kmmmmmmmmmmk       ',
      ' kmmmxxxxmmmk       ',
      '  kkmmmmmmkk        ',
      ' kmmmmmmmmmmk       ',
      'kmmmmmmmmmmmmk      ',
      'kmmxmmmmmmxmmk      ',
      'kmmmmmmmmmmmmk      ',
      'kmmmmmmmmmmmmk      ',
      ' kxmmmmmmmmxk       ',
      '  kkmmmmmmkk        ',
      '  kmmxk kxmmk       ',
    ],
  ],
};

// --- Swamp boss: "Thần Đầm Lầy" (Bog Spirit). 20 x 18 ---
// A hooded murk-colored spirit rising out of the water: no legs, the body frays
// into the swamp. Two cyan wisp-eyes tie it to the stage's floating lanterns.
export const BOSS_BOGSPIRIT = {
  w: 20,
  h: 18,
  frames: [
    [
      '    kkkkkk          ',
      '   kJJJJJJk         ',
      '  kJJJJJJJJk        ',
      '  kJjjjjjjJk        ',
      '  kJjCjjCjJk        ',
      '  kJjjjjjjJk        ',
      '  kJJjjjjJJk        ',
      '  kJJJJJJJJk        ',
      ' kJJJJJJJJJJk       ',
      ' kJJjJJJJjJJk       ',
      ' kJJJJJJJJJJk       ',
      '  kJJJJJJJJk        ',
      '  kjJJJJJJjk        ',
      '   kjJJJJjk         ',
      '    kjjjjk          ',
      '   k kjjk k         ',
      '      kk            ',
      '                    ',
    ],
    [
      '                    ',
      '    kkkkkk          ',
      '   kJJJJJJk         ',
      '  kJJJJJJJJk        ',
      '  kJjjjjjjJk        ',
      '  kJjCjjCjJk        ',
      '  kJjjjjjjJk        ',
      '  kJJjjjjJJk        ',
      '  kJJJJJJJJk        ',
      ' kJJJJJJJJJJk       ',
      ' kJJjJJJJjJJk       ',
      ' kJJJJJJJJJJk       ',
      '  kJJJJJJJJk        ',
      '  kjJJJJJJjk        ',
      '   kjJJJJjk         ',
      '  k kjjjjk k        ',
      '     kjjk           ',
      '      kk            ',
    ],
  ],
};

// --- Volcano boss: "Quỷ Lửa Lớn" (Great Fire Demon). 20 x 18 ---
// Two curved horns, a dark obsidian body cracked with lava, and burning eyes.
// Angular and top-heavy so it reads as a demon rather than a big friendly imp.
export const BOSS_FIREDEMON = {
  w: 20,
  h: 17,
  frames: [
    [
      ' kk        kk       ',
      'kVVk      kVVk      ',
      'kVVkk    kkVVk      ',
      ' kkMkkkkkkMkk       ',
      '  kMMMMMMMMk        ',
      '  kMVVkkVVMk        ',
      '  kMMMMMMMMk        ',
      '  kMVMMMMVMk        ',
      '  kkMMMMMMkk        ',
      ' kMMMMVVMMMMk       ',
      'kMMMMVVVVMMMMk      ',
      'kMMMVVkkVVMMMk      ',
      'kMMMMVVVVMMMMk      ',
      'kMMMMMMMMMMMMk      ',
      ' kkMMMMMMMMkk       ',
      '  kMVMk kMVMk       ',
      '  kkkkk kkkkk       ',
    ],
    [
      ' kk        kk       ',
      'kVVk      kVVk      ',
      'kVVkk    kkVVk      ',
      ' kkMkkkkkkMkk       ',
      '  kMMMMMMMMk        ',
      '  kMvvkkvvMk        ',
      '  kMMMMMMMMk        ',
      '  kMvMMMMvMk        ',
      '  kkMMMMMMkk        ',
      ' kMMMMvvMMMMk       ',
      'kMMMMvvvvMMMMk      ',
      'kMMMvvkkvvMMMk      ',
      'kMMMMvvvvMMMMk      ',
      'kMMMMMMMMMMMMk      ',
      ' kkMMMMMMMMkk       ',
      '  kMvMk kMvMk       ',
      '  kkkkk kkkkk       ',
    ],
  ],
};

// --- Castle boss: "Pháp Sư Bóng Tối" (Dark Sorcerer). 20 x 18 ---
// The Dark Lord's lieutenant, and a deliberate echo of him: same purple robe and
// hooded void, but a POINTED wizard hat instead of a crown, and narrower. Reads
// as "his servant" — so the stageboss still reads as the one true villain.
export const BOSS_SORCERER = {
  w: 20,
  h: 17,
  frames: [
    [
      '      kk            ',
      '     kPPk           ',
      '    kPPPPk          ',
      '   kPPPPPPk         ',
      '  kPPPPPPPPk        ',
      ' kkkkkkkkkkkk       ',
      '   kp......pk       ',
      '   kp.RR.R.pk       ',
      '   kp......pk       ',
      '   kkp....pkk       ',
      '  kPPkkppkkPPk      ',
      ' kPPPPkppkPPPPk     ',
      ' kPPPPkppkPPPPk     ',
      ' kPPPPkppkPPPPk     ',
      ' kPpPPkppkPPpPk     ',
      ' kkkkkkkkkkkkk      ',
      '  k k k k k k       ',
    ],
    [
      '      kk            ',
      '     kPPk           ',
      '    kPPPPk          ',
      '   kPPPPPPk         ',
      '  kPPPPPPPPk        ',
      ' kkkkkkkkkkkk       ',
      '   kp......pk       ',
      '   kp.RR.R.pk       ',
      '   kp......pk       ',
      '   kkp....pkk       ',
      '  kPPkkppkkPPk      ',
      ' kPPPPkppkPPPPk     ',
      ' kPPPPkppkPPPPk     ',
      ' kPPPPkppkPPPPk     ',
      ' kPpPPkppkPPpPk     ',
      ' kkkkkkkkkkkkk      ',
      ' k k k k k k k      ',
    ],
  ],
};

// --- Stage 12 stageboss: "CHÚA TỂ BÓNG TỐI" (the Dark Lord). 21 x 22 ---
// The villain the kid has chased for eleven stages: the spire on every horizon
// is HIS. He must not read as another monster, so he is built from ARCHITECTURE
// rather than anatomy — a spiked crown echoing the spire, a hooded void of a
// face with two burning eyes, and a cape falling in straight vertical lines.
//
// EVERY CURVE MUST GO. A first pass rounded the shoulders and hem to suggest a
// tower "widening to the ground" and he read as a friendly cartoon king — round
// = cuddly at any size. He is now all hard angles: square shoulders, straight
// sides, a jagged hem, and a sharp collar rising past the jaw. Purple 'P' ties
// him to the fortress rift, gold 'Y' says king, red 'R' eyes burn in the dark.
// Frame 1 flares the cape wider and drops the hem spikes: he looms, never walks.
export const STAGEBOSS_DARKLORD = {
  w: 21,
  h: 21,
  frames: [
    [
      '  k k  kkk  k k      ',
      '  kYk kYYYk kYk      ',
      '  kYkkkYYYkkkYk      ',
      '  kYYYYYYYYYYYk      ',
      '  kkkkkkkkkkkkk      ',
      '  kp.........pk      ',
      '  kp.RR...RR.pk      ',
      '  kp.RR...RR.pk      ',
      '  kp.........pk      ',
      '  kkp.......pkk      ',
      ' kPkkp.....pkkPk     ',
      ' kPPkkkpppkkkPPk     ',
      'kPPPPkPPPPPkPPPPk    ',
      'kPPPPkPPPPPkPPPPk    ',
      'kPPPPkPPPPPkPPPPk    ',
      'kPPPPkPPPPPkPPPPk    ',
      'kPPPPkPPPPPkPPPPk    ',
      'kPPPPkPPPPPkPPPPk    ',
      'kPPPPkPPPPPkPPPPk    ',
      'kPpPPkPpPPPkPPpPk    ',
      'kkkkkkkkkkkkkkkkk    ',
    ],
    [
      '  k k  kkk  k k      ',
      '  kYk kYYYk kYk      ',
      '  kYkkkYYYkkkYk      ',
      '  kYYYYYYYYYYYk      ',
      '  kkkkkkkkkkkkk      ',
      '  kp.........pk      ',
      '  kp.RR...RR.pk      ',
      '  kp.RR...RR.pk      ',
      '  kp.........pk      ',
      '  kkp.......pkk      ',
      'kPkkkp.....pkkkPk    ',
      'kPPPkkkpppkkkPPPk    ',
      'kPPPPkPPPPPkPPPPk    ',
      'kPPPPkPPPPPkPPPPk    ',
      'kPPPPkPPPPPkPPPPk    ',
      'kPPPPkPPPPPkPPPPk    ',
      'kPPPPkPPPPPkPPPPk    ',
      'kPPPPkPPPPPkPPPPk    ',
      'kPpPPkPpPPPkPPpPk    ',
      'kkkkkkkkkkkkkkkkk    ',
      'k k k k k k k k k    ',
    ],
  ],
};

// ===== Biome creeps =====
// One per biome, so each stage fields monsters that match its scene. At 12x10
// dots there is room for ONE bold silhouette plus two eyes — nothing more.
//
// Three rules learned the hard way here; keep them when adding creeps:
//   1. The silhouette must read in solid black. Thin limbs (spider legs, thin
//      pincers) vanish entirely at this size — don't design around them.
//   2. Anything PAIRED and RAISED ABOVE the body reads as EARS, however solid
//      you draw it. The crab's claws did exactly this and it looked like a frog,
//      so its claws went out to the SIDES and its eyes onto stalks. Wings and
//      horns must clear this bar too.
//   3. Simple silhouettes need MORE shade contrast, not less — a plain circle
//      with subtle shading reads as a flat disc (see CREEP_SNOWBALL).
//
// Frame 0 / frame 1 are an idle bob — the same trick CREEP_SLIME uses.

// --- Meadow creep: "Nấm Nhỏ" (Little Mushroom). 12 x 10 ---
// Shape: wide red dome cap over a short pale stalk. The cap's white spots are
// what say "mushroom" instantly; the eyes sit on the stalk, under the brim.
export const CREEP_MUSHROOM = {
  w: 12,
  h: 10,
  frames: [
    [
      '    kkkk    ',
      '  kkRRRRkk  ',
      ' kRRWRRWRRk ',
      'kRRRRRRRRRRk',
      'kRWRRRRRRWRk',
      ' kkkkkkkkkk ',
      '   kNNNNk   ',
      '   kNWNWk   ',
      '   kNNNNk   ',
      '   kkkkkk   ',
    ],
    [
      '            ',
      '    kkkk    ',
      '  kkRRRRkk  ',
      ' kRRWRRWRRk ',
      'kRRRRRRRRRRk',
      'kRWRRRRRRWRk',
      ' kkkkkkkkkk ',
      '   kNNNNk   ',
      '   kNWNWk   ',
      '   kkkkkk   ',
    ],
  ],
};

// --- Coast creep: "Cua Ngọc" (Jade Crab). 12 x 10 ---
// Shape: a WIDE low shell with claws out to the SIDES, not raised above the
// body. First attempt held the claws up like wedges and it read as a frog —
// anything paired above a body becomes ears at this size. Eyes ride on short
// stalks poking over the shell instead, which is the other half of "crab".
export const CREEP_CRAB = {
  w: 12,
  h: 10,
  frames: [
    [
      '            ',
      '   kk  kk   ',
      '   kWk kWk  ',
      ' kkkkkkkkkk ',
      'kAAAAAAAAAAk',
      'kAAAAAAAAAAk',
      'kkAAAAAAAAkk',
      'kAkkkkkkkkAk',
      'kAk  kk  kAk',
      ' k  k  k  k ',
    ],
    [
      '            ',
      '   kk  kk   ',
      '   kWk kWk  ',
      ' kkkkkkkkkk ',
      'kAAAAAAAAAAk',
      'kAAAAAAAAAAk',
      'kkAAAAAAAAkk',
      'kAkkkkkkkkAk',
      ' kk k  k kk ',
      '   k    k   ',
    ],
  ],
};

// --- Snow creep: "Cầu Tuyết" (Snowball). 12 x 10 ---
// Shape: pure circle. The simplest silhouette in the set — it reads at any size,
// and the shade tone on the lower-right is the only thing giving it volume.
export const CREEP_SNOWBALL = {
  w: 12,
  h: 10,
  frames: [
    [
      '    kkkk    ',
      '  kkmmmmkk  ',
      ' kmmmmmmxxk ',
      'kmmmmmmmmxxk',
      'kmkWmmmmkWxk',
      'kmmmmmmmxxxk',
      'kmmmmmmxxxxk',
      ' kmmmmxxxxk ',
      '  kkxxxxkk  ',
      '    kkkk    ',
    ],
    [
      '            ',
      '    kkkk    ',
      '  kkmmmmkk  ',
      ' kmmmmmmxxk ',
      'kmkWmmmmkWxk',
      'kmmmmmmmxxxk',
      'kmmmmmmxxxxk',
      ' kmmmmxxxxk ',
      '  kkxxxxkk  ',
      '    kkkk    ',
    ],
  ],
};

// --- Forest creep: "Hạt Gai" (Thorn Seed). 12 x 10 ---
// Shape: a spiky ball. A squirrel or wolf at this size is an indistinct
// quadruped blob, so the forest fields a bristling burr instead — the spikes are
// chunky triangles on the silhouette's edge, which survives shrinking.
export const CREEP_THORNSEED = {
  w: 12,
  h: 10,
  frames: [
    [
      '  k  kk  k  ',
      '  kk kFk kk ',
      ' kkFkkFFkkFk',
      ' kFFFFFFFFFk',
      'kkFFWFFWFFFk',
      'kFFFFFFFFFFk',
      ' kFFFFFFFFk ',
      ' kkFFffffkk ',
      '  k kkkk  k ',
      '   k    k   ',
    ],
    [
      '            ',
      '  k  kk  k  ',
      '  kk kFk kk ',
      ' kkFkkFFkkFk',
      'kkFFWFFWFFFk',
      'kFFFFFFFFFFk',
      ' kFFFFFFFFk ',
      ' kkFFffffkk ',
      '  k kkkk  k ',
      '   k    k   ',
    ],
  ],
};

// --- Cave creep: "Dơi Đá" (Stone Bat). 12 x 10 ---
// Shape: one WIDE horizontal wing-pair spanning the full width, with a small
// body at the centre. The wings spread SIDEWAYS (rule 2 — raised pairs read as
// ears). Frame 1 raises the wings into an upstroke, so it flaps in place.
//
// COLOR IS LOAD-BEARING HERE: a first pass used dark stone 'M' (#4a4560) and the
// bat vanished into the cave floor, which is nearly the same value. It's now
// light grey stone 'L' with cyan 'C' eyes, matching the cave's own crystals —
// the cave is the darkest biome, so its monster has to be one of the lightest.
export const CREEP_BAT = {
  w: 12,
  h: 10,
  frames: [
    [
      '            ',
      '   kk  kk   ',
      '  kkLkkLkk  ',
      'kkLLLLLLLLkk',
      'kLLLLLLLLLLk',
      'kkkLCLLCLkkk',
      '   kLLLLk   ',
      '    kllk    ',
      '    kkkk    ',
      '            ',
    ],
    [
      'kk        kk',
      'kLkk  kkLLk ',
      ' kLLkkLLLLk ',
      '  kLLLLLLk  ',
      '  kLCLLCLk  ',
      '   kLLLLk   ',
      '    kllk    ',
      '    kkkk    ',
      '            ',
      '            ',
    ],
  ],
};

// --- Dino-cave creep: "Trứng Nứt" (Cracked Egg). 12 x 10 ---
// Shape: an egg with a jagged crack and a hatchling head poking out the top.
// A baby dinosaur on its own would just be a green lump; the egg shell is what
// makes it legible, and it ties the creep to the T-Rex boss of the same stage.
export const CREEP_HATCHLING = {
  w: 12,
  h: 10,
  frames: [
    [
      '   kkkk     ',
      '  kGGGGkk   ',
      ' kGWGGGGGk  ',
      ' kGGGkIIIk  ',
      ' kkGGGkkk   ',
      '  kkGGkk    ',
      ' kwkkkkwkw  ',
      'kwwkwwwkwwwk',
      'kwwwwkwwwwwk',
      ' kkkkkkkkkk ',
    ],
    [
      '            ',
      '   kkkk     ',
      '  kGGGGkk   ',
      ' kGWGGGGGk  ',
      ' kGGGkIIIk  ',
      '  kkGGGkk   ',
      ' kwkkkkwkw  ',
      'kwwkwwwkwwwk',
      'kwwwwkwwwwwk',
      ' kkkkkkkkkk ',
    ],
  ],
};

// --- Volcano creep: "Đá Lửa" (Magma Pebble). 12 x 10 ---
// Shape: a jagged rock. Its hook is INTERNAL rather than a silhouette feature —
// glowing lava cracks (V/v) splitting a dark stone body — which works only
// because the rest of the shape is deliberately plain.
export const CREEP_MAGMA = {
  w: 12,
  h: 10,
  frames: [
    [
      '            ',
      '   kkk kkk  ',
      '  kMMkkMMMk ',
      ' kMMVMMVMMMk',
      'kMWMVMMVMMWk',
      'kMMVVMMVVMMk',
      'kMMVMMMMVMMk',
      ' kMMMvvMMMk ',
      '  kkMMMMkk  ',
      '    kkkk    ',
    ],
    [
      '            ',
      '   kkk kkk  ',
      '  kMMkkMMMk ',
      ' kMMvMMvMMMk',
      'kMWMvMMvMMWk',
      'kMMvvMMvvMMk',
      'kMMvMMMMvMMk',
      ' kMMMVVMMMk ',
      '  kkMMMMkk  ',
      '    kkkk    ',
    ],
  ],
};

// --- Training creep: "Bao Cát" (Straw Dummy). 12 x 10 ---
// Stage 1 is the safety stage, so its "monster" is a practice dummy, not a
// creature: a straw sack on a post, matching the DUMMY scenery prop of the same
// biome. Frame 1 tilts it as if just struck.
export const CREEP_DUMMY = {
  w: 12,
  h: 10,
  frames: [
    [
      '   kkkkkk   ',
      '  kNNNNNNk  ',
      ' kNNkNNkNNk ',
      ' kNNNNNNNNk ',
      ' kNNNNNNNNk ',
      '  kNnnnnNk  ',
      '   kkHHkk   ',
      '    kHHk    ',
      '   kkHHkk   ',
      '  kkkkkkkk  ',
    ],
    [
      '            ',
      '   kkkkkk   ',
      '   kNNNNNNk ',
      '  kNNkNNkNNk',
      '  kNNNNNNNNk',
      '  kNnnnnNk  ',
      '   kkHHkk   ',
      '    kHHk    ',
      '   kkHHkk   ',
      '  kkkkkkkk  ',
    ],
  ],
};

// --- Practice-yard creep: "Chữ Sống" (Living Glyph). 12 x 10 ---
// Shape: a floating purple diamond — a rune the kid "unwrites" by typing, which
// is exactly this biome's meaning (words are power). Deliberately geometric: a
// diamond is unmistakable at any size, and it can't be confused with a creature.
export const CREEP_GLYPH = {
  w: 12,
  h: 10,
  frames: [
    [
      '     kk     ',
      '    kPPk    ',
      '   kPPPPk   ',
      '  kPWPPWPk  ',
      ' kPPPPPPPPk ',
      '  kPPppPPk  ',
      '   kPppPk   ',
      '    kppk    ',
      '     kk     ',
      '            ',
    ],
    [
      '            ',
      '     kk     ',
      '    kPPk    ',
      '   kPPPPk   ',
      '  kPWPPWPk  ',
      ' kPPPPPPPPk ',
      '  kPPppPPk  ',
      '   kPppPk   ',
      '    kppk    ',
      '     kk     ',
    ],
  ],
};

// --- Dunes creep: "Bọ Cát" (Sand Scarab). 12 x 10 ---
// Shape: a round beetle shell with a hard vertical split down the middle — the
// split is the whole idea, since it says "beetle" where legs would just be noise.
export const CREEP_SCARAB = {
  w: 12,
  h: 10,
  frames: [
    [
      '            ',
      '   kkkkkk   ',
      '  kDDkkDDk  ',
      ' kDDDkkDDDk ',
      'kWDDDkkDDDWk',
      'kDDDDkkDDDDk',
      'kDDDDkkDDDDk',
      ' kddDkkDddk ',
      '  kkkkkkkk  ',
      '  k k  k k  ',
    ],
    [
      '            ',
      '   kkkkkk   ',
      '  kDDkkDDk  ',
      ' kDDDkkDDDk ',
      'kWDDDkkDDDWk',
      'kDDDDkkDDDDk',
      'kDDDDkkDDDDk',
      ' kddDkkDddk ',
      '  kkkkkkkk  ',
      ' k  k  k  k ',
    ],
  ],
};

// --- Swamp creep: "Đèn Ma" (Will-o'-the-Wisp). 12 x 10 ---
// Shape: a glowing cyan orb with a wispy tail trailing below — it FLOATS, which
// matches the swamp's drifting mourner-lanterns. The tail flickers between
// frames so it never sits still.
export const CREEP_WISP = {
  w: 12,
  h: 10,
  frames: [
    [
      '    kkkk    ',
      '   kCCCCk   ',
      '  kCWCCWCk  ',
      '  kCCCCCCk  ',
      '   kCCCCk   ',
      '    kCCk    ',
      '   k CC k   ',
      '     kk     ',
      '    k  k    ',
      '            ',
    ],
    [
      '            ',
      '    kkkk    ',
      '   kCCCCk   ',
      '  kCWCCWCk  ',
      '  kCCCCCCk  ',
      '   kCCCCk   ',
      '    kCCk    ',
      '   k CC k   ',
      '    k  k    ',
      '     kk     ',
    ],
  ],
};

// --- Castle creep: "Mũ Sống" (Haunted Helmet). 12 x 10 ---
// Shape: an empty helmet dome with a dark eye slit. A full skeleton soldier is
// impossible here (ribs are 1px noise), but an animated helmet says "undead
// guard" with one shape — and the purple slit-glow ties it to the fortress rift.
export const CREEP_HELMET = {
  w: 12,
  h: 10,
  frames: [
    [
      '            ',
      '   kkkkkk   ',
      '  kLLLLLLk  ',
      ' kLLLLLLLLk ',
      ' kLLLLLLLLk ',
      ' kkkkkkkkkk ',
      ' kPPkkkkPPk ',
      ' kkkkkkkkkk ',
      '  klllllllk ',
      '   kkkkkkk  ',
    ],
    [
      '            ',
      '            ',
      '   kkkkkk   ',
      '  kLLLLLLk  ',
      ' kLLLLLLLLk ',
      ' kkkkkkkkkk ',
      ' kPPkkkkPPk ',
      ' kkkkkkkkkk ',
      '  klllllllk ',
      '   kkkkkkk  ',
    ],
  ],
};

export const SPRITES = {
  hero_knight: HERO_KNIGHT,
  princess: PRINCESS,
  creep_slime: CREEP_SLIME,
  boss_dragon: BOSS_DRAGON,
  stageboss_ogre: STAGEBOSS_OGRE,
  creep_mushroom: CREEP_MUSHROOM,
  creep_crab: CREEP_CRAB,
  creep_snowball: CREEP_SNOWBALL,
  creep_thornseed: CREEP_THORNSEED,
  creep_bat: CREEP_BAT,
  creep_hatchling: CREEP_HATCHLING,
  creep_magma: CREEP_MAGMA,
  creep_dummy: CREEP_DUMMY,
  creep_glyph: CREEP_GLYPH,
  creep_scarab: CREEP_SCARAB,
  creep_wisp: CREEP_WISP,
  creep_helmet: CREEP_HELMET,
  stageboss_darklord: STAGEBOSS_DARKLORD,
  boss_queenbee: BOSS_QUEENBEE,
  boss_bear: BOSS_BEAR,
  boss_golem: BOSS_GOLEM,
  boss_captain: BOSS_CAPTAIN,
  boss_scorpion: BOSS_SCORPION,
  boss_icegiant: BOSS_ICEGIANT,
  boss_bogspirit: BOSS_BOGSPIRIT,
  boss_firedemon: BOSS_FIREDEMON,
  boss_sorcerer: BOSS_SORCERER,
  // Chapters 2 and 3 add their own rosters at the BOTTOM of this file, via an
  // Object.assign onto SPRITES — their sprite consts are defined below this
  // literal, so they cannot be named here.
};

// Prop sprites for the desert scene (drawn as scenery, not entities).
export const CLOUD = {
  w: 10,
  h: 5,
  frames: [
    [
      '   WWW    ',
      ' WWWWWWW  ',
      'WWWWWWWWWW',
      ' WWWWWWWW ',
      '          ',
    ],
  ],
};

export const CACTUS = {
  w: 11,
  h: 16,
  frames: [
    [
      '    kGk    ',
      '    kGk    ',
      ' kk kGk kk ',
      'kGk kGk kGk',
      'kGk kGk kGk',
      'kGkgkGkgkGk',
      'kGGGGGGGGGk',
      'kGgGGGGGgGk',
      ' kkkGGGkkk ',
      '   kGgGk   ',
      '   kGGGk   ',
      '   kGgGk   ',
      '   kGGGk   ',
      '   kGgGk   ',
      '   kkkkk   ',
      '           ',
    ],
  ],
};

// A small desert rock. 10 x 6
export const ROCK = {
  w: 10,
  h: 6,
  frames: [
    [
      '   kkkk   ',
      '  kDDDDk  ',
      ' kDDDDdEk ',
      'kDDDddDEEk',
      'kEEEEEEEEk',
      ' kkkkkkkk ',
    ],
  ],
};

// A little green bush/shrub. 10 x 6
export const BUSH = {
  w: 10,
  h: 6,
  frames: [
    [
      '  kk  kk  ',
      ' kGGkkGGk ',
      'kGGGGGGGGk',
      'kGgGGGGgGk',
      'kGGGGGGGGk',
      ' kkkkkkkk ',
    ],
  ],
};

// The sun (soft rounded). 9 x 9
export const SUN = {
  w: 9,
  h: 9,
  frames: [
    [
      '   kkk   ',
      '  kYYYk  ',
      ' kYYYYYk ',
      'kYYYYYYYk',
      'kYYYYYYYk',
      'kYYYYYYYk',
      ' kYYYYYk ',
      '  kYYYk  ',
      '   kkk   ',
    ],
  ],
};

// --- Biome scenery props (picked per-stage by biomes.js) ---

// The moon, for night/cave/castle skies. 9 x 9
export const MOON = {
  w: 9,
  h: 9,
  frames: [
    [
      '   kkk   ',
      '  kwwwk  ',
      ' kwWWWwk ',
      'kwWWWWWk ',
      'kWWWWWk  ',
      'kwWWWWWk ',
      ' kwWWWwk ',
      '  kwwwk  ',
      '   kkk   ',
    ],
  ],
};

// Tall pine tree — forest biome. 13 x 20
export const PINE = {
  w: 13,
  h: 20,
  frames: [
    [
      '      k      ',
      '     kFk     ',
      '    kFFFk    ',
      '   kFFfFFk   ',
      '   kkFFFkk   ',
      '    kFFFk    ',
      '   kFFfFFk   ',
      '  kFFFFFFFk  ',
      '  kkFFFFFkk  ',
      '   kFFfFFk   ',
      '  kFFFFFFFk  ',
      ' kFFFFfFFFFk ',
      ' kkFFFFFFFkk ',
      '  kFFfFFfFk  ',
      ' kFFFFFFFFFk ',
      'kFFFFFfFFFFFk',
      ' kkkkTTTkkkk ',
      '     kTtk    ',
      '     kTtk    ',
      '     kkkk    ',
    ],
  ],
};

// Broad-leaf jungle fern — forest/swamp biome. 12 x 9
export const FERN = {
  w: 12,
  h: 9,
  frames: [
    [
      ' k        k ',
      'kFk  kk  kFk',
      'kFFk kFk kFF',
      ' kFFkkFFkFFk',
      '  kFFfFFfFk ',
      '   kFFFFFk  ',
      '    kFTFk   ',
      '    kkTkk   ',
      '     kkk    ',
    ],
  ],
};

// Cave stalagmite rising from the floor. 9 x 14
export const STALAGMITE = {
  w: 9,
  h: 14,
  frames: [
    [
      '    k    ',
      '    kk   ',
      '   kLk   ',
      '   kLk   ',
      '   kLLk  ',
      '  kLLLk  ',
      '  kLLLk  ',
      '  kLlLk  ',
      ' kLLLLk  ',
      ' kLLLlLk ',
      ' kLlLLLk ',
      'kLLLLLLLk',
      'kLlLLLlLk',
      'kkkkkkkkk',
    ],
  ],
};

// Cave stalactite hanging from the ceiling (drawn at the top). 9 x 13
export const STALACTITE = {
  w: 9,
  h: 13,
  frames: [
    [
      'kkkkkkkkk',
      'kLlLLLlLk',
      'kLLLLLLLk',
      ' kLlLLLk ',
      ' kLLLLLk ',
      ' kLLLlk  ',
      '  kLLLk  ',
      '  kLlLk  ',
      '  kLLk   ',
      '   kLk   ',
      '   kLk   ',
      '   kk    ',
      '    k    ',
    ],
  ],
};

// Iron jail bars with a stone frame — the dungeon/castle prison. 14 x 18
export const JAIL = {
  w: 14,
  h: 18,
  frames: [
    [
      'kkkkkkkkkkkkkk',
      'kLLLLLLLLLLLLk',
      'kLkkkkkkkkkkLk',
      'kLkM.M.M.M.kLk',
      'kLkM.M.M.M.kLk',
      'kLkM.M.M.M.kLk',
      'kLkMMMMMMMMkLk',
      'kLkM.M.M.M.kLk',
      'kLkM.M.M.M.kLk',
      'kLkM.M.M.M.kLk',
      'kLkM.M.M.M.kLk',
      'kLkMMMMMMMMkLk',
      'kLkM.M.M.M.kLk',
      'kLkM.M.M.M.kLk',
      'kLkM.M.M.M.kLk',
      'kLkkkkkkkkkkLk',
      'kLLLLLLLLLLLLk',
      'kkkkkkkkkkkkkk',
    ],
  ],
};

// Castle tower with battlements and a lit window. 12 x 22
export const TOWER = {
  w: 12,
  h: 22,
  frames: [
    [
      '     kk     ',
      '    kMMk    ',
      '   kMMMMk   ',
      '  kMMMMMMk  ',
      ' kkkkkkkkkk ',
      ' kLkLkLkLLk ',
      ' kLLLLLLLLk ',
      ' kLlLLLlLLk ',
      ' kLLLLLLLLk ',
      ' kLLkYYkLLk ',
      ' kLLkYYkLLk ',
      ' kLlLLLLlLk ',
      ' kLLLLLLLLk ',
      ' kLLLlLLLLk ',
      ' kLLLLLLLLk ',
      ' kLlLLLlLLk ',
      ' kLLLLLLLLk ',
      ' kLLkMMkLLk ',
      ' kLLkMMkLLk ',
      ' kLlLkkLlLk ',
      ' kLLLLLLLLk ',
      ' kkkkkkkkkk ',
    ],
  ],
};

// Palm tree — coast biome. 13 x 18
export const PALM = {
  w: 13,
  h: 18,
  frames: [
    [
      '  kk    kk   ',
      ' kFFkkkkFFk  ',
      'kFfFFFFFFfFk ',
      ' kkFFFFFFkk  ',
      'kFFkkFFkkFFk ',
      'kFfk kFk kfFk',
      ' kk  kFk  kk ',
      '     kTTk    ',
      '     kTtk    ',
      '     kTTk    ',
      '    kTtk     ',
      '    kTTk     ',
      '    kTtk     ',
      '   kTTk      ',
      '   kTtk      ',
      '   kTTk      ',
      '  kkTkk      ',
      '   kkk       ',
    ],
  ],
};

// Snow-capped fir — snow biome. 12 x 17
export const SNOWY_FIR = {
  w: 12,
  h: 17,
  frames: [
    [
      '     kk     ',
      '    kmmk    ',
      '   kmFFmk   ',
      '   kFFFFk   ',
      '  kmFFFFmk  ',
      '  kFFfFFFk  ',
      ' kmFFFFFFmk ',
      ' kFFfFFfFFk ',
      'kmFFFFFFFFmk',
      'kFFfFFFFfFFk',
      'kmFFFFFFFFmk',
      ' kkkkTTkkkk ',
      '    kTtk    ',
      '    kTtk    ',
      '   kmTtmk   ',
      '   kmmmmk   ',
      '    kkkk    ',
    ],
  ],
};

// A rounded snow drift / snowball mound. 12 x 6
export const SNOWDRIFT = {
  w: 12,
  h: 6,
  frames: [
    [
      '    kkkk    ',
      '  kkmmmmkk  ',
      ' kmmmmmmxxk ',
      'kmmmmxmmxxxk',
      'kxxxxxxxxxxk',
      ' kkkkkkkkkk ',
    ],
  ],
};

// Bare dead tree — swamp / volcano / dark fortress. 11 x 16
export const DEAD_TREE = {
  w: 11,
  h: 16,
  frames: [
    [
      ' k       k ',
      ' kt     kt ',
      '  kt   kt  ',
      '   ktkkt   ',
      'k  kTTTk  k',
      'kt kTtTk kt',
      ' ktkTTTkkt ',
      '  kkTtTkk  ',
      '    kTTk   ',
      '    kTtk   ',
      '    kTTk   ',
      '   kTtTk   ',
      '   kTTTk   ',
      '  kTtTtTk  ',
      ' kkTTTTTkk ',
      '  kkkkkkk  ',
    ],
  ],
};

// Swamp reeds / cattails poking out of the murk. 10 x 11
export const REEDS = {
  w: 10,
  h: 11,
  frames: [
    [
      '  k    k  ',
      ' kJk  kJk ',
      ' kJk kJjk ',
      ' kJk kJjk ',
      'kkJk kJjk ',
      'kJJk kJjk ',
      'kJjkkkJjk ',
      'kJjkJkJjk ',
      ' kJkJkJjk ',
      ' kJkJkJjk ',
      ' kkkkkkkk ',
    ],
  ],
};

// A small lava/magma vent bubbling on the ground. 10 x 6
export const LAVA_ROCK = {
  w: 10,
  h: 6,
  frames: [
    [
      '   kVVk   ',
      '  kVvvVk  ',
      ' kMVvvVMk ',
      'kMMVvvVMMk',
      'kMMMMMMMMk',
      ' kkkkkkkk ',
    ],
  ],
};

// A jagged volcanic spire. 9 x 13
export const VOLCANIC_SPIRE = {
  w: 9,
  h: 13,
  frames: [
    [
      '   k     ',
      '   kk    ',
      '  kMk    ',
      '  kMkk   ',
      ' kMMMk   ',
      ' kMvMk k ',
      ' kMMMkkMk',
      'kMMMMMMMk',
      'kMvMMMvMk',
      'kMMMMMMMk',
      'kMvMMMMMk',
      'kMMMMMvMk',
      'kkkkkkkkk',
    ],
  ],
};

// --- Far-background & flying props ---
//
// MOUNTAINS are drawn as a repeating range behind everything else (no black
// outline: distance haze reads better as a flat silhouette, and an outline at
// this size turns into visual noise). Snow caps use 'X'. The range is 64 cells
// wide with peaks of DELIBERATELY uneven height and spacing, and its left and
// right edges meet at the same altitude, so tiling reads as one long skyline
// rather than a stamped-out pattern.
export const MOUNTAINS = {
  w: 64,
  h: 30,
  frames: [
    [
      '                            XX                                  ',
      '                           XXXX                                 ',
      '             X            XXUXXX                                ',
      '            XXX          XXUUUXXX                               ',
      '           XXUXX        XXUUUUUXXX               XX             ',
      '          XXUUUXX      XXUUUUUUUUXX             XXXX            ',
      '         XUUUUUUXX    XXUUUuUUUUUXXX           XXUXXX           ',
      '        XUUUuUUUUXX  XXUUUuuUUUUUUXXX         XXUUUXXX          ',
      '       XUUUuuUUUUUXXXXUUUuuuUUUUUUUXX        XXUUUUUXX          ',
      '      XUUUuuuUUUUUUUUUUUuuuuUUUUUUUUXX      XXUUUuUUUXX         ',
      '     UUUUuuuuUUUUUUUUUUuuuuuUUUUUUUUUXX    XXUUUuuUUUUXX        ',
      '    UUUUuuuuuUUUUUUUUUuuuuuuUUUUUUUUUUXX  XXUUUuuuUUUUUXX       ',
      '   UUUUuuuuuuUUUUUUUUuuuuuuuUUUUUUUUUUUXXXXUUUuuuuUUUUUUXX      ',
      '  UUUUuuuuuuuUUUUUUUuuuuuuuuuUUUUUUUUUUUUUUUUuuuuuUUUUUUUXX     ',
      ' UUUUuuuuuuuuUUUUUUuuuuuuuuuuuUUUUUUUUUUUUUuuuuuuuUUUUUUUUXX    ',
      'UUUUuuuuuuuuuUUUUUuuuuuuuuuuuuuUUUUUUUUUUUuuuuuuuuuUUUUUUUUUXX  ',
      'UUUuuuuuuuuuuuUUUuuuuuuuuuuuuuuuuUUUUUUUUuuuuuuuuuuuUUUUUUUUUXX ',
      'UUuuuuuuuuuuuuuUUuuuuuuuuuuuuuuuuuuUUUUUuuuuuuuuuuuuuUUUUUUUUUUX',
      'UuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuUUUUUUUUUU',
      'uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuUUUUUUUU',
      'uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuUUUUUU',
      'uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu',
      'uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu',
      'uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu',
      'uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu',
      'uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu',
      'uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu',
      'uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu',
      'uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu',
      'uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu',
    ],
  ],
};

// A bird in flight — a visible body with a head, and wings that sweep from
// raised (frame 0) through level (frame 1) to down-stroke (frame 2), so a flock
// reads as birds rather than flickering ticks.
export const BIRD = {
  w: 13,
  h: 7,
  frames: [
    // wings up
    [
      'kk         kk',
      ' kkk     kkk ',
      '   kk   kk   ',
      '    kkkkk    ',
      '     kkkk    ',
      '      kk     ',
      '             ',
    ],
    // wings level (gliding)
    [
      '             ',
      '             ',
      'kkk       kkk',
      '  kkkkkkkkk  ',
      '    kkkkkk   ',
      '      kk     ',
      '             ',
    ],
    // wings down
    [
      '             ',
      '     kkkk    ',
      '    kkkkkk   ',
      '   kk kk kk  ',
      '  kk   kk kk ',
      ' kk       kk ',
      'kk         kk',
    ],
  ],
};

// --- Fantasy scenery: landmarks, story traces & set pieces ---
//
// One `landmark` per stage carries the stage's MEANING (see biomes.js); the
// small `trace` props are the kidnapped princess's leftovers along the trail.

// The villain's dark spire — the motif that recurs in EVERY stage's far
// layer, drawn tiny in stage 1 and towering in stage 12. Purple-black stone with
// a lit window and a jagged crown, kept as a silhouette so distance reads.
export const SPIRE = {
  w: 11,
  h: 18,
  frames: [
    [
      '     k     ',
      '    kMk    ',
      '   kMMMk   ',
      '  kMMMMMk  ',
      '  kM.M.Mk  ',
      ' kMMMMMMMk ',
      ' kM.MPM.Mk ',
      ' kMMMPMMMk ',
      'kMMM.P.MMMk',
      'kM.MMPMM.Mk',
      'kMMMMMMMMMk',
      'kM.MM.MM.Mk',
      'kMMMMMMMMMk',
      'kMMM.M.MMMk',
      'kM.MMMMM.Mk',
      'kMMMMMMMMMk',
      'kMMM.M.MMMk',
      'kMMMMMMMMMk',
    ],
  ],
};

// A straw practice dummy on a post — the training field. 10 x 14
export const DUMMY = {
  w: 10,
  h: 14,
  frames: [
    [
      '   kNNk   ',
      '  kNnNNk  ',
      '  kNNnNk  ',
      '   kNNk   ',
      ' kkkTTkkk ',
      'kNNnNNnNNk',
      'kNnNNNNnNk',
      'kNNnNNnNNk',
      ' kkkTTkkk ',
      '   kTtk   ',
      '   kTtk   ',
      '   kTtk   ',
      '  kkTtkk  ',
      '   kkkk   ',
    ],
  ],
};

// A hung cloth banner with a gold star — the training field. 11 x 15
export const BANNER = {
  w: 11,
  h: 15,
  frames: [
    [
      'kkkkkkkkkkk',
      'kBBBBBBBBBk',
      'kBBBBBBBBBk',
      'kBBBBYBBBBk',
      'kBBBYYYBBBk',
      'kBYYYYYYYBk',
      'kBBYYYYYBBk',
      'kBBYYYYYBBk',
      'kBBYYyYYBBk',
      'kBYYy yYYBk',
      'kBBBBBBBBBk',
      'kBBBBBBBBBk',
      ' kBBBBBBBk ',
      '  kBBBBBk  ',
      '   kBBBk   ',
    ],
  ],
};

// A floating practice rune — glowing glyph the kid 'spells'. Frames pulse
// between dim and bright so a row of them shimmers. 7 x 7
export const RUNE = {
  w: 7,
  h: 7,
  frames: [
    [
      ' kPPPk ',
      'kPpPpPk',
      'kPPPPPk',
      'kPpPPpk',
      'kPPPPPk',
      'kPpPpPk',
      ' kPPPk ',
    ],
    [
      ' kWWWk ',
      'kWPWPWk',
      'kWWWWWk',
      'kWPWWPk',
      'kWWWWWk',
      'kWPWPWk',
      ' kWWWk ',
    ],
  ],
};

// A giant storybook mushroom — flower meadow. 13 x 12
export const MUSHROOM = {
  w: 13,
  h: 12,
  frames: [
    [
      '   kkkkkk    ',
      ' kkRRRRRRkk  ',
      'kRRWRRRWRRRk ',
      'kRRRRRRRRRRRk',
      'kRWRRRWRRRWRk',
      'kRRRRRRRRRRRk',
      ' kkkkWWkkkkk ',
      '    kWWk     ',
      '    kWwk     ',
      '    kWWk     ',
      '   kkWwkk    ',
      '    kkkk     ',
    ],
  ],
};

// The first princess's dropped flower crown — the trace that says
// she was taken HERE. 12 x 6
export const FLOWER_CROWN = {
  w: 12,
  h: 6,
  frames: [
    [
      ' kRk  kYk   ',
      'kRWRkkYWYk  ',
      ' kRk kYkkPk ',
      'kGGkkGGkPWPk',
      ' kGGGGGGkPk ',
      '  kkkkkkkk  ',
    ],
  ],
};

// An ancient glowing spirit tree — deep forest. Cyan sap-light in the
// hollow reads as 'something older watches here'. 15 x 22
export const SPIRIT_TREE = {
  w: 15,
  h: 22,
  frames: [
    [
      '   kk    kk    ',
      '  kFFkkkFFk    ',
      ' kFFFFFFFFFk   ',
      'kFFFfFFFfFFFk  ',
      'kFFFFFFFFFFFFk ',
      ' kFFfFFFFFfFFk ',
      'kFFFFFFFFFFFFFk',
      'kFFfFFFFFFFfFFk',
      ' kFFFFFFFFFFFk ',
      '  kkkFFFFFkkk  ',
      '     kTTTk     ',
      '    kTtTtTk    ',
      '    kTCCCTk    ',
      '   kTCWWWCTk   ',
      '   kTCWWWCTk   ',
      '   kTtCWCtTk   ',
      '   kTTtCtTTk   ',
      '  kTTtTTTtTTk  ',
      '  kTtTTTTTtTk  ',
      ' kTTTtTTTtTTTk ',
      ' kkkkkkkkkkkkk ',
      '               ',
    ],
  ],
};

// A mossy ruined stone arch — deep forest. 16 x 16
export const RUINED_ARCH = {
  w: 16,
  h: 16,
  frames: [
    [
      ' kkkkkkkkkkkk   ',
      'kLLLLLLLLLLLLk  ',
      'kLlLFLLLLFLlLk  ',
      'kLLLLLLLLLLLLk  ',
      'kLLkkkkkkkkLLk  ',
      'kLLk      kLLk  ',
      'kLFk      kLLk  ',
      'kLLk      kFLk  ',
      'kLLk      kLLk  ',
      'kLFk      kLLk  ',
      'kLLk      kLFk  ',
      'kLLk      kLLk  ',
      'kFLk      kLLk  ',
      'kLLk      kLFk  ',
      'kLLk      kLLk  ',
      'kkkk      kkkk  ',
    ],
  ],
};

// A glowing crystal cluster — the dark cave. Cyan core with white
// highlights so it reads as a light source, not just rock. 11 x 14
export const CRYSTAL = {
  w: 11,
  h: 14,
  frames: [
    [
      '     k     ',
      '    kCk    ',
      '   kCWCk   ',
      '   kCWCk   ',
      '  kCCWCCk  ',
      '  kCWWWCk k',
      ' kCCWWWCCkC',
      'kkCCWWWCCkC',
      'kCkCWWWCkCC',
      'kCCkCWCkCCC',
      'kCCCkCkCCCk',
      'kCCCCkCCCCk',
      'kkCCCCCCCkk',
      ' kkkkkkkkk ',
    ],
  ],
};

// The princess's broken cage, bars bent outward — she was held here
// and moved on. 14 x 13
// A broken cage a princess was held in — heightened from an earlier version
// that read as a small crate. Taller bars (some snapped mid-height, leaving a
// gap) sell "a person stood in here", and the domed top is now a real arch
// rather than two stray blocks. 18 x 20
export const BROKEN_CAGE = {
  w: 18,
  h: 20,
  frames: [
    [
      '   kk    kkkk   k  ',
      '  kMk   kMMMMk  kMk',
      '  kMk  kMk  kMk kMk',
      ' kMMMk kMk  kMk kMk',
      ' kM.Mk        kkMk ',
      ' kMMMk         kMk ',
      ' kM.Mk         kMk ',
      ' kMMMk         kMk ',
      ' kM.Mk        kkMk ',
      ' kMMMk       kMMk  ',
      ' kM.Mk       kM.k  ',
      ' kMMMk       kMMk  ',
      ' kM.Mk       kM.k  ',
      ' kMMMk       kMMk  ',
      ' kM.Mk       kM.k  ',
      ' kMMMk       kMMk  ',
      ' kMMMMk     kMMMk  ',
      '  kMMMk    kMMMk   ',
      '  kMMMMMMMMMMMMk   ',
      '   kkkkkkkkkkkk    ',
    ],
  ],
};

// A dinosaur ribcage arch the hero walks under — the older monster
// whose lair the villain took over. 20 x 18
export const BONE_ARCH = {
  w: 20,
  h: 18,
  frames: [
    [
      '    kkk      kkk    ',
      '   kWWWkkkkkWWWk    ',
      '  kWWwWWWWWWWwWWk   ',
      ' kWWwWk       kwWWk ',
      ' kWwWk         kWwk ',
      ' kWWk           kWWk',
      'kWWk             kWk',
      'kWwk             kWk',
      'kkkk             kkk',
      'kWWk             kWk',
      'kWwk             kWk',
      'kkkk             kkk',
      'kWWk             kWk',
      'kWwk             kWk',
      'kkkk             kkk',
      'kWWk             kWk',
      'kWWWk           kWWk',
      'kkkkk           kkkk',
    ],
  ],
};

// The ribs of a wrecked ship in the surf — she escaped by sea and
// failed. 22 x 14
// A wrecked ship's hull, widened and given a broken mast leaning out of the
// deck for height — an earlier version was only ribs over a low deck and
// read as driftwood rather than a wrecked ship. The mast tilts (it snapped,
// it doesn't stand) and stays off-centre so the hull's ribs remain the main
// silhouette. 28 x 18
export const SHIPWRECK = {
  w: 28,
  h: 18,
  frames: [
    [
      '                    kk      ',
      '                   kTtk     ',
      '                  kTtk      ',
      '        kk       kTtk       ',
      '       kTtk     kTtk        ',
      '      kTTtk   kkTtkk        ',
      '     kTTtk  kk kk           ',
      '    kTTtk  kTtk             ',
      '  kk TTtk kTTtk   kk        ',
      ' kTk TTtk kTTtk  kTtk   kk  ',
      'kTTk TTtk kTTtk kTTtk  kTtk ',
      'kTTtkTTtk kTTtkkTTTtk kTTtk ',
      'kTTtkTTtkkTTTtkkTTTtkkTTTtk ',
      'kTTtkkkkTTTTtkkkTTTtkkTTTtk ',
      'kTTTTTTTTTTTTTTTTTTTTTTTTTk ',
      'kTtTTtTTtTTtTTtTTtTTtTTtTTk ',
      'kTTTTTTTTTTTTTTTTTTTTTTTTTk ',
      ' kkkkkkkkkkkkkkkkkkkkkkkkk  ',
    ],
  ],
};

// A lighthouse with a lit lamp — jade coast. 11 x 24
export const LIGHTHOUSE = {
  w: 11,
  h: 24,
  frames: [
    [
      '   kkkkk   ',
      '  kWWWWWk  ',
      ' kWYYYYYWk ',
      ' kYYWWWYYk ',
      ' kYWWWWWYk ',
      ' kYYWWWYYk ',
      ' kWYYYYYWk ',
      '  kWWWWWk  ',
      ' kkkkkkkkk ',
      ' kWWWWWWWk ',
      ' kWRRRRRWk ',
      ' kWWWWWWWk ',
      ' kWWWWWWWk ',
      'kWWRRRRRWWk',
      'kWWWWWWWWWk',
      'kWWWWWWWWWk',
      'kWRRRRRRRWk',
      'kWWWWWWWWWk',
      'kWWWWWWWWWk',
      'kWRRRRRRRWk',
      'kWWWWWWWWWk',
      'kWWWWWWWWWk',
      'kwwwwwwwwwk',
      'kkkkkkkkkkk',
    ],
  ],
};

// A corked message bottle bobbing in the surf. 7 x 8
export const BOTTLE = {
  w: 7,
  h: 8,
  frames: [
    [
      '  kTk  ',
      '  kTk  ',
      ' kAAAk ',
      'kAWWWAk',
      'kAWWWAk',
      'kAWwWAk',
      'kAAAAAk',
      ' kkkkk ',
    ],
  ],
};

// A colossal stone HAND reaching up out of the sand — all that is left of a
// buried giant. Deliberately NOT a face: at this pixel size any eyes+mouth
// arrangement reads as a cartoon, whereas a hand reads as ruin and scale. Its
// wrist is swallowed by the dune (`sink` in the biome). 18 x 22
export const BURIED_STATUE = {
  w: 18,
  h: 22,
  frames: [
    [
      '      kk          ',
      '     kNNk   kk    ',
      '  kk kNNk  kNNk   ',
      ' kNNkkNNkk kNNk   ',
      ' kNNkkNNkk kNNk   ',
      ' kNNkkNNkkkkNNk   ',
      ' kNnkkNnkkNkNnk   ',
      ' kNNkkNNkkNkNNk k ',
      ' kNNkkNNkkNkNNkkNk',
      ' kNNNkNNNkNkNNNkNk',
      ' kNNNkNNNkkkNNNkNk',
      '  kNNNNNNNNNNNNNNk',
      '  kNNnNNNNnNNNNNNk',
      '  kNNNNNNNNNNNNNNk',
      '   kNNNNnNNNNNNNk ',
      '   kNNNNNNNNNNNNk ',
      '   kNNnNNNNnNNNk  ',
      '    kNNNNNNNNNNk  ',
      '    kNNNNnNNNNk   ',
      '     kNNNNNNNk    ',
      '     kkNNNNNkk    ',
      '       kkkkk      ',
    ],
  ],
};

// A cracked obelisk with faded glyphs — golden desert. 9 x 20
export const OBELISK = {
  w: 9,
  h: 20,
  frames: [
    [
      '   kkk   ',
      '  kNNNk  ',
      ' kNNNNNk ',
      'kNNNNNNNk',
      'kNNnNnNNk',
      'kNNNNNNNk',
      'kNnNNNnNk',
      'kNNNNNNNk',
      'kNNkNkNNk',
      'kNNNNNNNk',
      'kNnNNNnNk',
      'kNNNNNNNk',
      'kNNnNnNNk',
      'kNNNNNNNk',
      'kNnNNNnNk',
      'kNNNNNNNk',
      'kNNnNnNNk',
      'kNNNNNNNk',
      'kNNNNNNNk',
      'kkkkkkkkk',
    ],
  ],
};

// A waterfall frozen mid-plunge — the coldest point of the journey. It TAPERS
// (narrow lip at the top, spreading as it falls) with vertical ice flutes and a
// ragged icicle fringe, so it reads as pouring water stopped in place rather
// than a framed panel. 24 x 26
// A tall frozen cascade: a narrow lip at the top (the frozen brink), a widening
// body of vertical drape lines (the cascade itself, frozen mid-fall), and a
// wide flared splash base (the pool it once fed, now iced over). Widened and
// heightened from an earlier version that tapered to a point with no base —
// that read as a single icicle, not a waterfall. The lip must stay narrower
// than the body or the cascade doesn't visibly widen as it falls.
export const FROZEN_FALL = {
  w: 24,
  h: 34,
  frames: [
    [
      '        kmmmmk          ',
      '       kmmxmmk          ',
      '       kmxmxmk          ',
      '      kmmxmxmmk         ',
      '      kmxmmxmmk         ',
      '     kmmxmmxmmmk        ',
      '     kmxmmxmmxmk        ',
      '    kmmxmmxmmxmmk       ',
      '    kmxmmxmmxmmmk       ',
      '   kmmxmmxmmxmmxmk      ',
      '   kmxmmxmmxmmxmmk      ',
      '  kmmxmmxmmxmmxmmmk     ',
      '  kmxmmxmmxmmxmmmxk     ',
      ' kmmxmmxmmxmmxmmmxmk    ',
      ' kmxmmxmmxmmxmmmxmmk    ',
      'kmmxmmxmmxmmxmmmxmmxk   ',
      'kmxmmxmmxmmxmmmxmmxmk   ',
      'kmxmmxmmxmmxmmmxmmxmmk  ',
      'kmxmmxmmxmmxmmmxmmxmmk  ',
      'kmxmmxmmxmmxmmmxmmxmmxk ',
      'kmxmmxmmxmmxmmmxmmxmmxk ',
      'kmxmmxmmxmmxmmmxmmxmmxk ',
      'kmxmmxmmxmmxmmmxmmxmmxk ',
      'kmxmmxmmxmmxmmmxmmxmmxk ',
      'kmxmmxmmxmmxmmmxmmxmmxk ',
      'mmxmmxmmxmmxmmmxmmxmmxmm',
      'mmxmmxmmxmmxmmmxmmxmmxmm',
      'xxxmmxmmxmmxmmmxmmxmmxxx',
      'kxxxxxxxxxxxxxxxxxxxxxxk',
      'kmxxxxxxxxxxxxxxxxxxxxmk',
      ' kmmxxxxxxxxxxxxxxxxmmk ',
      '  kkmmxxxxxxxxxxxxmmkk  ',
      '   kkkmmmmmmmmmmmmkkk   ',
      '    kkkkkkkkkkkkkkkk    ',
    ],
  ],
};

// A single frozen tear crystal in the snow — her grief, kept. 7 x 9
export const FROZEN_TEAR = {
  w: 7,
  h: 9,
  frames: [
    [
      '  kAk  ',
      ' kAWAk ',
      'kAWWWAk',
      'kAWWWAk',
      'kAWWWAk',
      ' kAWAk ',
      ' kAWAk ',
      '  kAk  ',
      '  kkk  ',
    ],
  ],
};

// A sunken temple pillar leaning in the murk — the drowned path.
// 10 x 20
// Widened from 10px (read as narrow next to its own biomes' other props).
export const TEMPLE_PILLAR = {
  w: 13,
  h: 20,
  frames: [
    [
      ' kkkkkkkkkkk ',
      'kLLLLLLLLLLLk',
      'kLlLLLLLLLlLk',
      'kkkkkkkkkkkkk',
      ' kLLLLLLLLLk ',
      ' kLlLLLLLlLk ',
      ' kLLLLLLLLLk ',
      ' kLFLLLLLFLk ',
      ' kLLLLLLLLLk ',
      ' kLlLLLLLlLk ',
      ' kLLLLLLLLLk ',
      ' kLLFFLLFFLk ',
      ' kLlLLLLLlLk ',
      ' kLLLLLLLLLk ',
      ' kLFLLLLLLLk ',
      ' kLLLLLLLLFk ',
      'kLLLLLLLLLLLk',
      'kLlLLLLLLLlLk',
      'kLLLLLLLLLLLk',
      'kkkkkkkkkkkkk',
    ],
  ],
};

// A floating paper lantern — grief and memory drifting over the swamp.
// Frames flicker. 7 x 10
export const LANTERN = {
  w: 7,
  h: 10,
  frames: [
    [
      '  kkk  ',
      ' kOOOk ',
      'kOYYYOk',
      'kOYWYOk',
      'kOYWYOk',
      'kOYYYOk',
      ' kOOOk ',
      '  kkk  ',
      '   k   ',
      '   k   ',
    ],
    [
      '  kkk  ',
      ' kYYYk ',
      'kYWWWYk',
      'kYWWWYk',
      'kYWWWYk',
      'kYWWWYk',
      ' kYYYk ',
      '  kkk  ',
      '   k   ',
      '   k   ',
    ],
  ],
};

// Molten rock pouring down a cliff face — the forge where the
// villain's power is made. 16 x 30
// A lava cascade: a narrow stone lip at the top (the vent it pours from), a
// widening molten body with CONTINUOUS vertical flow-lines (deep-red 'v'
// columns running the full drop, echoing FROZEN_FALL's 'x' columns), and a
// wide pooling base. An earlier pass gave the flow-lines only every third row,
// which at this scale read as scattered rivets on a barrel rather than moving
// lava — the streaks must run unbroken top-to-bottom to read as a cascade.
export const LAVA_FALL = {
  w: 16,
  h: 30,
  frames: [
    [
      '     kkkkkk     ',
      '    kMMMMMMk    ',
      '    kMVvVVMk    ',
      '   kMVVvVVVMk   ',
      '   kMVvVVvVVMk  ',
      '  kMVVvVVvVVVMk ',
      '  kVVvVVVvVVVVk ',
      '  kVvVVVvVVVvVk ',
      ' kVVvVVVvVVVvVVk',
      ' kVvVVVvVVVvVVVk',
      ' kVVvVVVvVVVvVVk',
      ' kVvVVVvVVVvVVVk',
      ' kVVvVVVvVVVvVVk',
      ' kVvVVVvVVVvVVVk',
      ' kVVvVVVvVVVvVVk',
      ' kVvVVVvVVVvVVVk',
      ' kVVvVVVvVVVvVVk',
      ' kVvVVVvVVVvVVVk',
      ' kVVvVVVvVVVvVVk',
      'kVvVVVvVVVvVVVVk',
      'kVVvVVVvVVVvVVVk',
      'kVvVVVvVVVvVVVVk',
      'kVVvVVVvVVVvVVVk',
      'kMVvVVVvVVVvVVMk',
      'kMVVvVVVvVVVvVMk',
      'kMVvVVVvVVVvVVMk',
      ' kMVVvVVVvVVVMk ',
      '  kMVvVVVvVVMk  ',
      '   kMMMMMMMMk   ',
      '    kkkkkkkk    ',
    ],
  ],
};

// A broken obsidian bridge span — blazing volcano. 20 x 9
export const OBSIDIAN_BRIDGE = {
  w: 20,
  h: 9,
  frames: [
    [
      'kkkkkkkkkk  kkkkkkkk',
      'kMMMMMMMMk  kMMMMMMk',
      'kM.MM.MMMk  kM.MMMMk',
      'kMMMMMMMMk  kMMM.MMk',
      'kkkkkkkkkk  kkkkkkkk',
      ' kMk  kMk    kMk kMk',
      ' kMk  kMk    kMk kMk',
      ' kMk  kMk    kMk kMk',
      ' kkk  kkk    kkk kkk',
    ],
  ],
};

// The fortress's huge iron-banded gate, chained shut — journey's end, the spire
// you've followed for eleven stages. Deliberately ASYMMETRIC: a single lit
// window off to one side and chains crossing on a diagonal, because two even
// windows above a horizontal band read as a face rather than a door. 20 x 26
export const CASTLE_GATE = {
  w: 20,
  h: 26,
  frames: [
    [
      '   kkkkkkkkkkkkkk   ',
      '  kLLLLLLLLLLLLLLk  ',
      ' kLLLLLLLLLLLLLLLLk ',
      'kLLLLkkkkkkkkkkLLLLk',
      'kLLLkMMMMMMMMMMkLLLk',
      'kLLkMMMMMMMMMMMMkLLk',
      'kLLkMM.MMMMMMMMMkLLk',
      'kLLkMMMMMMkkkkMMkLLk',
      'kLLkMMMMMMkYYkMMkLLk',
      'kLLkMM.MMMkYYkMMkLLk',
      'kLLkMMMMMMkkkkMMkLLk',
      'kLLkMYMMMMMMMMMMkLLk',
      'kLLkMMYMMMMMM.MMkLLk',
      'kLLkMMMYMMMMMMMMkLLk',
      'kLLkMM.MYMMMMMMMkLLk',
      'kLLkMMMMMYMMMMMMkLLk',
      'kLLkMMMMMMYMMMMMkLLk',
      'kLLkMM.MMMMYMM.MkLLk',
      'kLLkMMMMMMMMYMMMkLLk',
      'kLLkMMMMMMMMMYMMkLLk',
      'kLLkMM.MMMMMMMYMkLLk',
      'kLLkMMMMMMMMMMMYkLLk',
      'kLLkMkkkkkkkkkkMkLLk',
      'kLLkMM.MMMMMM.MMkLLk',
      'kLLkMMMMMMMMMMMMkLLk',
      'kkkkkkkkkkkkkkkkkkkk',
    ],
  ],
};

// ===========================================================================
// STORY SCENE PROPS (see story.js / drawStoryArt in scenes.js)
// ===========================================================================

// --- The King. 16 x 20, same grid as the hero so they stand together. -------
//
// A second humanoid, so it obeys the same four rules the hero and princesses do
// (see the humanoid notes above): eyes are single DARK pixels on skin; the HAIR
// mass (here a white beard + hair) frames the face BEFORE the crown goes on; the
// scepter is HELD, running vertically from a fist with a gold orb finial; and
// frame 2 moves only the robe hem.
//
// What makes him read as a KING rather than "another guy in a hat":
//   - the crown is WIDER than his head and sits on hair, never on bare skin —
//     a band directly on the outline row merges into one stripe;
//   - the beard is the biggest single mass on the face, which is what says
//     "old and important" at 16px;
//   - the robe FLARES toward the hem (a straight tunic reads as a peasant), and
//     an ermine-white collar breaks up the purple.
//
// The hair uses the off-white shade 'w', NOT the hair-brown 'H' the hero uses:
// at this size an old king is read almost entirely from "white hair + white
// beard", and brown hair above a white beard read as a young man in a costume.
const KING_BODY = [
  '                ',
  '     kkkkkk     ', // crown: three points, wider than the head below it
  '    kYkYkYkYk   ',
  '    kYYYYYYYk   ', // solid gold band...
  '    kkkkkkkkk   ', // ...on its own outline row, above the hair
  '     kwwwwk     ', // white hair under the band
  '    kwSSSSwk    ',
  '    kwSkSkwk    ', // eyes: single dark pixels
  '    kwSSSSwk    ',
  '     kwwwwk     ', // white beard — the dominant face mass
  '    kwwwwwwk    ',
  '   kPkwwwwkPk   ', // shoulders, beard overhanging the collar
  '  kPPkwwwwkPPk  ', // ermine collar
  '  kPPPPPPPPPPk  ',
  ' kPPPpPPPPpPPPk ',
  ' kPPPPPPPPPPPPk ',
  ' kPPpPPPPPPpPPk ',
  'kPPPPPPPPPPPPPPk', // robe flares toward the hem
  'kPPpPPPPPPPPpPPk',
  'kkkkkkkkkkkkkkkk',
];

// Frame 2: ONLY the two hem rows differ (the robe sways). Torso columns above
// are byte-identical, so he never appears to squat or drift sideways.
const KING_BODY_SWAY = [
  ...KING_BODY.slice(0, 17),
  'kPPPPPPPPPPPPPPk',
  'kPPpPPPPPPPPpPPk',
  ' kkkkkkkkkkkkkk ',
];

export const KING = { w: 16, h: 20, frames: [KING_BODY, KING_BODY_SWAY] };

// --- The throne. 18 x 22. A tall gold-trimmed seat with a high back. --------
// Deliberately NOT symmetrical about a face-like center: the back is a fan of
// vertical gold ribs (an even pair of shapes over a horizontal seat would read
// as eyes over a mouth — the trap documented for CASTLE_GATE).
export const THRONE = {
  w: 18,
  h: 22,
  frames: [
    [
      '    kkkkkkkkkk    ',
      '   kYYkYYkYYkYk   ', // fan of ribs along the crest
      '   kYkkkkkkkkYk   ',
      '  kY&&&&&&&&&&Yk  ', // crimson cushion back
      '  kY&&&&&&&&&&Yk  ',
      '  kY&&*&&&&*&&Yk  ',
      '  kY&&&&&&&&&&Yk  ',
      '  kY&&&&&&&&&&Yk  ',
      '  kY&&*&&&&*&&Yk  ',
      '  kY&&&&&&&&&&Yk  ',
      '  kY&&&&&&&&&&Yk  ',
      '  kYkkkkkkkkkkYk  ',
      ' kYYYYYYYYYYYYYYk ', // armrests flare out past the back
      ' kY&&&&&&&&&&&&Yk ', // seat
      ' kY&&&&&&&&&&&&Yk ',
      ' kYkkkkkkkkkkkkYk ',
      ' kYk        kYk   ',
      ' kYk        kYk   ', // legs
      ' kYk        kYk   ',
      'kYYYk      kYYYk  ',
      'kyyyk      kyyyk  ',
      'kkkkk      kkkkk  ',
    ],
  ],
};

// --- The Staff of Wisdom. 10 x 24. Chapter 2's prize. -----------------------
// It must read as a STAFF and not a torch or a spear: a long plain shaft, and at
// the top an OPEN ring (not a solid blob) cradling a glowing gem. The ring is
// what distinguishes a wizard's staff silhouette from a weapon's.
export const STAFF_WISDOM = {
  w: 10,
  h: 24,
  frames: [
    [
      '   kkkk   ',
      '  kYYYYk  ', // open ring — the gem floats INSIDE it
      ' kYYkkYYk ',
      ' kYk  kYk ',
      ' kYk CkYk ', // gem, offset so the ring stays visibly open
      ' kYkCCkYk ',
      ' kYYkCkYk ',
      '  kYYYYk  ',
      '   kYYk   ',
      '   kTTk   ', // wooden shaft
      '   kTtk   ',
      '   kTTk   ',
      '   kTtk   ',
      '   kTTk   ',
      '   kTtk   ',
      '   kTTk   ',
      '   kTtk   ',
      '   kTTk   ',
      '   kTtk   ',
      '   kTTk   ',
      '   kTtk   ',
      '   kTTk   ',
      '   kYYk   ', // gold ferrule at the foot
      '   kkkk   ',
    ],
    [
      // Frame 2: only the GEM pixels move (it pulses/rotates inside the ring).
      // The ring, shaft, and ferrule are byte-identical.
      '   kkkk   ',
      '  kYYYYk  ',
      ' kYYkkYYk ',
      ' kYk  kYk ',
      ' kYkCCkYk ',
      ' kYkCCkYk ',
      ' kYYkkkYk ',
      '  kYYYYk  ',
      '   kYYk   ',
      '   kTTk   ',
      '   kTtk   ',
      '   kTTk   ',
      '   kTtk   ',
      '   kTTk   ',
      '   kTtk   ',
      '   kTTk   ',
      '   kTtk   ',
      '   kTTk   ',
      '   kTtk   ',
      '   kTTk   ',
      '   kTtk   ',
      '   kTTk   ',
      '   kYYk   ',
      '   kkkk   ',
    ],
  ],
};

// ===========================================================================
// CHAPTER 2 MONSTERS — "Trượng Của Trí Tuệ" (The Staff of Wisdom)
// ===========================================================================
// The quest for the Staff is fought against GUARDIANS of knowledge, not beasts:
// animated books, wind spirits, mirror shards, statues. That reads differently
// from chapter 1's animals/ogres on purpose — a new chapter should look new.
//
// Every one keeps to the house rules: black 'k' outline all the way round,
// base + shade tone, white 'W' eyes (monsters are big enough for them, unlike
// the humanoids), and frame 2 differing only in the parts that should move.

// --- Library creep: "Slime Mực" (Ink Slime). 12 x 10 ---
// Shape: reuses CREEP_SLIME's proven blob body (round-topped, flat-bottomed,
// two eyes, two shade dots) verbatim — three redesigns of a book/scroll shape
// all read badly at gameplay scale, and a slime is already a solid, tested
// silhouette everywhere else in chapter 1. The ONLY change is the palette:
// green ('G'/'g') becomes purple-black ink ('P'/'p'), so the same shape now
// reads as a puddle of living ink rather than the swamp/meadow slime.
export const CREEP_INKSLIME = {
  w: 12,
  h: 9,
  frames: [
    [
      '    kkkk     ',
      '   kPPPPk    ',
      '  kPPPPPPk   ',
      ' kPPWkPPWk   ',
      ' kPPkPPPkk   ',
      'kPPPPPPPPPk  ',
      'kPpPPPPpPPk  ',
      'kPPPPPPPPPk  ',
      ' kkkkkkkkk   ',
    ],
    [
      '    kkkk     ',
      '   kPPPPk    ',
      '  kPPPPPPk   ',
      ' kPWkPWPk    ',
      ' kPPkPPPkk   ',
      'kPPPPPPPPPk  ',
      'kPpPPPPpPPk  ',
      'kPPPPPPPPPk  ',
      ' kkkkkkkkk   ',
    ],
  ],
};

// --- Windpeak creep: "Gió Xoáy" (Wind Sprite). 12 x 10 ---
// Shape: a spiral of wind — stacked crescents that step sideways, widest in the
// middle. NOT a circle with a face: the offset crescents are what say "moving
// air". Only the tail curl differs between frames, so it looks like it spins.
export const CREEP_GUST = {
  w: 12,
  h: 10,
  frames: [
    [
      '            ',
      '   kkkk     ',
      '  kAAAAk    ',
      ' kAAWAAAk   ',   // single eye in the vortex
      ' kAAAAAAAk  ',
      '  kaaAAAAk  ',
      '   kaaAAk   ',
      '     kaak   ',   // tail curls right
      '      kk    ',
      '            ',
    ],
    [
      '            ',
      '    kkkk    ',
      '   kAAAAk   ',
      '  kAAAWAAk  ',
      ' kAAAAAAAk  ',
      ' kAAAAaak   ',
      '  kAAaak    ',
      '  kaak      ',   // tail curls left — reads as a spin
      '   kk       ',
      '            ',
    ],
  ],
};

// --- Mirrorlake creep: "Mảnh Gương" (Mirror Shard). 12 x 12 ---
// Shape: a tall diamond shard of glass. All straight lines and sharp angles — a
// rounded shard reads as a gem or a sweet.
//
// Legibility note (learned from the first pass, same lesson as CREEP_INKSLIME): the
// shard was pale ice-blue 'e' on a black outline, and the mirrorlake biome is a
// PALE dawn scene — it vanished into the ground. It now carries a band of dark
// teal 'c' down one whole face, so the silhouette has internal contrast of its
// own and does not depend on the background being dark. The white 'W' glint
// riding down the light face is what still says "mirror" rather than "rock".
export const CREEP_MIRROR = {
  w: 12,
  h: 12,
  frames: [
    [
      '     kk     ',
      '    kWek    ',   // bright highlight edge
      '   keeWck   ',
      '  keeeWcck  ',
      '  keWeeccck ',
      ' keeWeecccck',
      ' keeeeecccck',
      ' kceeeecccck',
      '  kcceecckk ',
      '   kcccck   ',
      '    kcck    ',
      '     kk     ',
    ],
    [
      '     kk     ',
      '    keWk    ',   // the glint SLIDES down the light face
      '   keeWck   ',
      '  keWeecck  ',
      '  keeWeccck ',
      ' keeeWecccck',
      ' keeeeecccck',
      ' kceeeecccck',
      '  kcceecckk ',
      '   kcccck   ',
      '    kcck    ',
      '     kk     ',
    ],
  ],
};

// --- Library boss: "Thư Lại Mực" (the Ink Scribe). 18 x 16 ---
// A hooded scribe of living ink. Reads as a scribe because of the QUILL held
// upright in one hand (a diagonal quill read as a feather duster) and the open
// ledger across its middle. The hood is a void with two white eyes, echoing the
// Dark Sorcerer so the chapter still feels like the same world.
export const BOSS_SCRIBE = {
  w: 18,
  h: 16,
  frames: [
    [
      '       kkkk       ',
      '      kMMMMk      ',   // hood
      '     kMMMMMMk     ',
      '    kM......Mk  k ',   // hood shadow; quill tip top-right
      '    kM.WkkW.Mk kWk',
      '    kM......Mk kWk',
      '    kkM....Mkk kWk',   // quill shaft — vertical, clearly held
      '   kMMMkkkkMMMkkWk',
      '  kMMMMMMMMMMMMkWk',
      '  kMMwwwwwwwwMMkYk',   // open ledger (white pages) + gold nib
      '  kMMwwwwwwwwMMk  ',
      '  kMMMMMMMMMMMMk  ',
      '  kMMMMMMMMMMMMk  ',
      '   kMMMMMMMMMMk   ',
      '    kkkkkkkkkk    ',
      '                  ',
    ],
    [
      '                  ',
      '       kkkk       ',
      '      kMMMMk      ',
      '     kMMMMMMk     ',
      '    kM......Mk  k ',
      '    kM.WkkW.Mk kWk',
      '    kM......Mk kWk',
      '    kkM....Mkk kWk',
      '   kMMMkkkkMMMkkWk',
      '  kMMMMMMMMMMMMkWk',
      '  kMMwwwwwwwwMMkYk',
      '  kMMwwwwwwwwMMk  ',
      '  kMMMMMMMMMMMMk  ',
      '  kMMMMMMMMMMMMk  ',
      '   kMMMMMMMMMMk   ',
      '    kkkkkkkkkk    ',
    ],
  ],
};

// --- Windpeak boss: "Xà Phong" (the Wind Serpent). 22 x 20 ---
// A serpent reared up cobra-style, facing LEFT toward the hero (monsters are
// drawn unflipped, hero stands on the left — see render.js). Head and neck
// lean toward the left edge; body settles onto the ground; the tail is
// anchored on the RIGHT, trailing away behind the snake, curling up at its
// tip. Getting the tail on the correct side of the head matters: an earlier
// pass put the tail root under-and-left of the head, so it read as dangling
// in front of the snake instead of trailing behind it — the fix here is to
// keep the whole body's leftward lean consistent from head to tail-root, so
// the tail is unambiguously the hindmost part.
// No limbs, so it reads as a snake rather than a dragon. (Two earlier passes
// dropped: a hollow coiled ring read as a hoop, not an animal, and a tail
// root on the wrong side read as it dangling in front.)
// The open mouth (white fangs, small dark-teal eye) plus a red forked tongue
// is the "unmistakable prop"; the tongue is the only warm color on an
// all-teal sprite so it stays legible against the sky biome.
// The two frames sway the upper body left/right AND curl the tail the
// opposite way, like a cobra weaving with its tail flicking for balance —
// not just a tongue flick — which is what reads as the snake actively
// moving rather than standing frozen.
export const BOSS_WINDSERPENT = {
  w: 22,
  h: 20,
  frames: [
    [
      '  kkkkkkk             ',
      ' kAAAAAAAk            ',
      'kAAAAAAAAAk           ',
      'kAAcAAAAAAk           ',   // dark-teal eye, reads against teal head
      'kAAAAAAAAkk           ',
      'kWkkkkkkkWk           ',   // open mouth, white fangs top+bottom
      'kkkkRkkkkk            ',   // forked red tongue, centered
      ' kaaAAAAk             ',
      '  kaaAAAk             ',
      '   kaaAAk             ',
      '   kAAAAk             ',   // neck straightens toward the body
      '    kAAAk             ',
      '    kAAAAk            ',
      '   kAAAAAAk           ',
      '  kAAAAAAAAk          ',   // body settles onto the ground
      ' kAAAAAAAAAAkkAAk     ',   // tail root anchored on the RIGHT, trailing back
      'kAAAAAAAAAAAAAkkAAAk  ',
      'kAAAAAAAAAAAAAk kAAk  ',   // tail tapers, curls up at the tip
      'kkAAAAAAAAAAAkk  kAk  ',
      ' kkkkkkkkkkkkk   kk   ',
    ],
    [
      '   kkkkkkk            ',
      '  kAAAAAAAk           ',
      ' kAAAAAAAAAk          ',
      ' kAAcAAAAAAk          ',
      ' kAAAAAAAAkk          ',
      ' kWkkkkkkkWk          ',
      ' kkkkkkkkkk           ',   // tongue drawn back in
      '  kaaAAAAk            ',
      '  kaaAAAk             ',
      '  kaaAAk              ',
      '  kAAAAk              ',   // neck leans the other way — the sway
      '   kAAAk              ',
      '   kAAAAk             ',
      '  kAAAAAAk            ',
      ' kAAAAAAAAk           ',
      'kAAAAAAAAAAkAAk       ',   // tail root, drawn in slightly
      'kAAAAAAAAAAAAAkAAAk   ',
      'kAAAAAAAAAAAAAk kAAk  ',   // tail curls the OTHER way — the flick
      'kkAAAAAAAAAAAkk  kAAk ',
      ' kkkkkkkkkkkkk    kk  ',
    ],
  ],
};

// --- Rune-temple boss: "Tượng Thủ Đền" (the Temple Statue). 18 x 18 ---
// A stone guardian statue, awake. Built from ARCHITECTURE like the Dark Lord:
// square shoulders, a carved rune on its chest, straight sides, blocky fists.
// Its eyes are cyan (the rune light) rather than white, so it reads as animated
// stone rather than a living creature.
export const BOSS_GUARDIAN_STATUE = {
  w: 18,
  h: 18,
  frames: [
    [
      '     kkkkkk       ',
      '    kLLLLLLk      ',   // blocky head
      '    kLCLLCLk      ',   // cyan rune-light eyes
      '    kLLLLLLk      ',
      '    kkLLLLkk      ',
      '  kkkkLLLLkkkk    ',   // square shoulders
      ' kLLLkLLLLkLLLk   ',
      ' kLLLkLLLLkLLLk   ',
      ' kLLLkLCCLkLLLk   ',   // carved rune on the chest
      ' kLLLkLCCLkLLLk   ',
      ' kkkkkLLLLkkkkk   ',
      '  kllkLLLLkllk    ',
      '  kLLkLLLLkLLk    ',   // arms hang straight, fists blocky
      '  kkkkLLLLkkkk    ',
      '     kLLLLk       ',
      '    kkLLLLkk      ',
      '    kllk kllk     ',   // stone feet
      '    kkkk kkkk     ',
    ],
    [
      '     kkkkkk       ',
      '    kLLLLLLk      ',
      '    kLCLLCLk      ',
      '    kLLLLLLk      ',
      '    kkLLLLkk      ',
      '  kkkkLLLLkkkk    ',
      ' kLLLkLLLLkLLLk   ',
      ' kLLLkLLLLkLLLk   ',
      ' kLLLkLCCLkLLLk   ',
      ' kLLLkLCCLkLLLk   ',
      ' kkkkkLLLLkkkkk   ',
      '  kllkLLLLkllk    ',
      '  kLLkLLLLkLLk    ',
      '  kkkkLLLLkkkk    ',
      '     kLLLLk       ',
      '    kkLLLLkk      ',
      '   kllk   kllk    ',   // stance widens — stone shifting its weight
      '   kkkk   kkkk    ',
    ],
  ],
};

// --- Chapter 2 finale: "THỦ VỆ TRƯỢNG" (the Guardian of the Staff). 22 x 22 ---
// The last trial before the Staff. NOT a monster — a towering armored sentinel
// holding the Staff itself, which is the whole point of the silhouette: the
// glowing ringed staff rises above its shoulder so the kid SEES the prize they
// are fighting for. Gold armor, cyan visor slit (a slit, not eyes — it is a
// helmet, and two eye-dots would make it cute), and a cloak of straight lines.
export const STAGEBOSS_STAFFGUARDIAN = {
  w: 22,
  h: 22,
  frames: [
    [
      '                kkkk  ',
      '     kkkkkk    kYYYYk ',   // the Staff's ring, held high
      '    kYYYYYYk  kYYkkYYk',
      '   kYYYYYYYYk kYk  kYk',
      '   kYkkkkkkYk kYkCCkYk',   // helmet crest
      '   kYCCCCCCYk kYYkCkYk',   // cyan visor SLIT — not eyes
      '   kYYYYYYYYk  kYYYYk ',
      '   kkYYYYYYkk   kYYk  ',
      ' kkkkYYYYYYkkkk kTTk  ',   // pauldrons; staff shaft
      'kYYYkYYYYYYkYYYkkTtk  ',
      'kYYYkYYYYYYkYYYkkTTk  ',
      'kYYYkYYCCYYkYYYkkTtk  ',   // cyan sigil on the breastplate
      'kYYYkYYCCYYkYYYkkTTk  ',
      'kkkkkYYYYYYkkkkkkTtk  ',
      ' kyykYYYYYYkyyk kTTk  ',
      ' kYYkYYYYYYkYYk kTtk  ',
      ' kkkkYYYYYYkkkk kYYk  ',   // gold ferrule
      '    kYYYYYYk    kkkk  ',
      '   kkYYYYYYkk         ',
      '   kPPk  kPPk         ',   // cloak falls in straight lines
      '   kPPk  kPPk         ',
      '   kkkk  kkkk         ',
    ],
    [
      '                kkkk  ',
      '     kkkkkk    kYYYYk ',
      '    kYYYYYYk  kYYkkYYk',
      '   kYYYYYYYYk kYk  kYk',
      '   kYkkkkkkYk kYkCCkYk',
      '   kYCCCCCCYk kYkCCkYk',   // the staff's GEM pulses (only change up top)
      '   kYYYYYYYYk  kYYYYk ',
      '   kkYYYYYYkk   kYYk  ',
      ' kkkkYYYYYYkkkk kTTk  ',
      'kYYYkYYYYYYkYYYkkTtk  ',
      'kYYYkYYYYYYkYYYkkTTk  ',
      'kYYYkYYCCYYkYYYkkTtk  ',
      'kYYYkYYCCYYkYYYkkTTk  ',
      'kkkkkYYYYYYkkkkkkTtk  ',
      ' kyykYYYYYYkyyk kTTk  ',
      ' kYYkYYYYYYkYYk kTtk  ',
      ' kkkkYYYYYYkkkk kYYk  ',
      '    kYYYYYYk    kkkk  ',
      '   kkYYYYYYkk         ',
      '  kPPk    kPPk        ',   // cloak flares — extremities only
      '  kPPk    kPPk        ',
      '  kkkk    kkkk        ',
    ],
  ],
};

// ===========================================================================
// CHAPTER 2 SCENERY (see BIOMES entries library..wisdom_peak in biomes.js)
// ===========================================================================

// --- A leaning bookshelf, half-collapsed. 14 x 20. The ruined library. ------
// Reads as a bookshelf because of the horizontal SHELF lines with coloured book
// spines standing between them. The frame leans (the right column is one row
// taller) so it says "ruin" rather than "furniture".
export const BOOKSHELF = {
  w: 14,
  h: 20,
  frames: [
    [
      ' kkkkkkkkkkkk ',
      ' kTTTTTTTTTTk ',
      ' kTkkkkkkkkTk ',
      ' kTk1&5&9&kTk ',   // book spines, mixed colours
      ' kTk1&5&9&kTk ',
      ' kTkkkkkkkkTk ',
      ' kTk&79&15kTk ',
      ' kTk&79&15kTk ',
      ' kTkkkkkkkkTk ',
      ' kTk5&&91&kTk ',
      ' kTk5&&91&kTk ',
      ' kTkkkkkkkkTk ',
      ' kTk9&5&&7kTk ',
      ' kTk9&5&&7kTk ',
      ' kTkkkkkkkkTk ',
      ' kTk1&79&5kTk ',
      ' kTk1&79&5kTk ',
      ' kTkkkkkkkkTk ',
      ' kTTTTTTTTTTk ',
      ' kkkkkkkkkkkk ',
    ],
  ],
};

// --- A wind-carved stone pillar. 11 x 22. Windpeak. -------------------------
// Widened from 8px (which read as a thin stick) while keeping the wind-bitten
// notches all on ONE side — an evenly notched pillar reads as a decorative
// column; asymmetric erosion reads as wind.
export const WIND_PILLAR = {
  w: 11,
  h: 22,
  frames: [
    [
      '   kkkkk   ',
      '  kLLLLLk  ',
      '  kLLLLLk  ',
      ' kLLLLLLk  ',
      ' kLLLLLLk  ',
      '  kLLLLLk  ',
      '   kLLLLk  ',   // bitten in
      '  kLLLLLk  ',
      ' kLLLLLLk  ',
      ' kLLLLLLk  ',
      '  kLLLLLk  ',
      '   kLLLLk  ',   // and again
      '  kLLLLLk  ',
      ' kLLLLLLk  ',
      ' kLLLLLLk  ',
      ' kLLLLLLk  ',
      '  kLLLLLk  ',
      '  kLLLLLk  ',
      ' kLLLLLLk  ',
      ' kLLLLLLk  ',
      'kllllllllk ',
      'kkkkkkkkkk ',
    ],
  ],
};

// --- A standing mirror, cracked. 12 x 20. Mirrorlake. -----------------------
// The trial of honesty: the hero meets his own reflection. A gold frame with a
// pale glass field and ONE diagonal crack — a spiderweb of cracks turns to mush
// at this size, a single clean diagonal reads instantly.
export const MIRROR_STAND = {
  w: 12,
  h: 20,
  frames: [
    [
      '  kkkkkkkk  ',
      ' kYYYYYYYYk ',
      ' kYkkkkkkYk ',
      ' kYkeeeeekYk',
      ' kYkeeeekkYk',   // crack begins
      ' kYkeeekWkYk',
      ' kYkeekWekYk',
      ' kYkekWeekYk',
      ' kYkkWeeekYk',
      ' kYkWeeeekYk',
      ' kYkeeeeekYk',
      ' kYkeeeeekYk',
      ' kYkeeeeekYk',
      ' kYkkkkkkYk ',
      ' kYYYYYYYYk ',
      '  kkkYYkkk  ',
      '    kYYk    ',   // stand
      '   kYYYYk   ',
      '  kyyyyyyk  ',
      '  kkkkkkkk  ',
    ],
  ],
};

// --- The Tower of Wisdom, seen from afar. 16 x 30. --------------------------
// Chapter 2's beacon, the counterpart to the villain's SPIRE: where the spire is
// black and jagged, this is pale stone and ROUND-TOPPED, with lit windows
// climbing in a spiral. The silhouette difference is the point — a kid should be
// able to tell at a glance which tower is which on the horizon.
export const WISDOM_TOWER = {
  w: 16,
  h: 30,
  frames: [
    [
      '      kkkk      ',
      '     kCCCCk     ',   // glowing beacon at the crown
      '    kCCCCCCk    ',
      '   kkkkkkkkkk   ',
      '   kLLLLLLLLk   ',
      '   kLLLLLLLLk   ',
      '  kkkkkkkkkkkk  ',
      '  kLLLLLLLLLLk  ',
      '  kLLLLYYLLLLk  ',   // lit windows spiral down...
      '  kLLLLYYLLLLk  ',
      '  kLLLLLLLLLLk  ',
      '  kLLYYLLLLLLk  ',
      '  kLLYYLLLLLLk  ',
      '  kLLLLLLLLLLk  ',
      ' kLLLLLLLLYYLLk ',
      ' kLLLLLLLLYYLLk ',
      ' kLLLLLLLLLLLLk ',
      ' kLLLLYYLLLLLLk ',
      ' kLLLLYYLLLLLLk ',
      ' kLLLLLLLLLLLLk ',
      ' kLLLLLLLLYYLLk ',
      ' kLLLLLLLLYYLLk ',
      ' kLLLLLLLLLLLLk ',
      'kLLLLYYLLLLLLLLk',
      'kLLLLYYLLLLLLLLk',
      'kLLLLLLLLLLLLLLk',
      'kLLLLLLLLLLLLLLk',
      'kllllllllllllllk',
      'kllllllllllllllk',
      'kkkkkkkkkkkkkkkk',
    ],
  ],
};

// --- A floating open book, drifting. 10 x 8. Library / starwood props. ------
export const FLOAT_BOOK = {
  w: 10,
  h: 8,
  frames: [
    [
      '          ',
      '  kk  kk  ',
      ' kHwkkwHk ',
      ' kHwwwwHk ',
      ' kHwwwwHk ',
      '  kHwwHk  ',
      '   kkkk   ',
      '          ',
    ],
    [
      '          ',
      ' kk    kk ',   // pages flap
      ' kHwkkwHk ',
      ' kHwwwwHk ',
      ' kHwwwwHk ',
      '  kHwwHk  ',
      '   kkkk   ',
      '          ',
    ],
  ],
};

// --- A star-blossom tree. 16 x 22. Starwood. --------------------------------
// A slender trunk under a crown of small star-lights rather than leaf mass —
// the gaps are deliberate, so the night sky shows through and it reads as
// "starlit wood" instead of "another pine".
export const STAR_TREE = {
  w: 16,
  h: 22,
  frames: [
    [
      '    k  k  k     ',
      '   kWk kWk k    ',   // star blossoms
      '  k kFFFk kWk   ',
      ' kWkFFFFFFk k   ',
      '  kFFFWFFFFk    ',
      ' kFFFFFFFWFFk   ',
      'kFFWFFFFFFFFFk  ',
      ' kFFFFFWFFFFk   ',
      '  kFFFFFFFFk    ',
      ' kWkFFFFFFkWk   ',
      '   kFFFFFFk     ',
      '    kFFFFk      ',
      '     kTTk       ',
      '     kTtk       ',
      '     kTTk       ',
      '     kTtk       ',
      '     kTTk       ',
      '    kTTTtk      ',
      '    kTtTTk      ',
      '   kTTTTTtk     ',
      '   kttttttk     ',
      '   kkkkkkkk     ',
    ],
  ],
};

// ===========================================================================
// CHAPTER 3 MONSTERS — "Trận Chiến Cuối Cùng" (The Final Confrontation)
// ===========================================================================
// The siege of the Demon King's fortress. These are his ARMY: bone soldiers,
// gate wardens, jailers, generals, void horrors — and the World Devourer.
// Palette leans on 'M' dark stone, 'P' rift purple, 'R' burning red and bone
// white 'w', so chapter 3 reads darker than either chapter before it.

// --- Bonebridge creep: "Xương Lính" (Bone Soldier). 12 x 12 ---
// A skull on a ribcage — no arms, no legs, so it reads as a rising remnant
// rather than a full skeleton (which needs far more pixels to be legible).
export const CREEP_BONE = {
  w: 12,
  h: 12,
  frames: [
    [
      '            ',
      '   kkkkkk   ',
      '  kwwwwwwk  ',   // skull
      '  kwkwwkwk  ',   // dark eye sockets
      '  kwwwwwwk  ',
      '  kwkkkkwk  ',   // teeth
      '   kwwwwk   ',
      '  kkwwwwkk  ',
      ' kwkwwwwkwk ',   // ribs
      ' kwkwwwwkwk ',
      '  kkwwwwkk  ',
      '   kkkkkk   ',
    ],
    [
      '   kkkkkk   ',
      '  kwwwwwwk  ',   // the whole thing RISES one row (it floats up)
      '  kwkwwkwk  ',
      '  kwwwwwwk  ',
      '  kwkkkkwk  ',
      '   kwwwwk   ',
      '  kkwwwwkk  ',
      ' kwkwwwwkwk ',
      ' kwkwwwwkwk ',
      '  kkwwwwkk  ',
      '   kkkkkk   ',
      '            ',
    ],
  ],
};

// --- Gate creep: "Mắt Cổng" (Gate Eye). 12 x 10 ---
// A floating watcher-eye set in a dark iron ring: the gate's alarm. One big
// pupil, which is exactly what a single-eye monster needs — two would read as a
// face and lose the "watcher" idea.
export const CREEP_GATEEYE = {
  w: 12,
  h: 10,
  frames: [
    [
      '            ',
      '   kkkkkk   ',
      '  kMMMMMMk  ',   // iron ring
      ' kMWWWWWWMk ',
      ' kMWWkkWWMk ',   // pupil, centred
      ' kMWWkkWWMk ',
      ' kMWWWWWWMk ',
      '  kMMMMMMk  ',
      '   kkkkkk   ',
      '            ',
    ],
    [
      '            ',
      '   kkkkkk   ',
      '  kMMMMMMk  ',
      ' kMWWWWWWMk ',
      ' kMWkkWWWMk ',   // pupil LOOKS left — the only change
      ' kMWkkWWWMk ',
      ' kMWWWWWWMk ',
      '  kMMMMMMk  ',
      '   kkkkkk   ',
      '            ',
    ],
  ],
};

// --- Dungeon creep: "Chìa Khóa Sống" (Living Key). 12 x 10 ---
// The jailer's key, animated. Reads as a key from the toothed shaft plus the
// ring-shaped bow at one end; the little red eye in the bow says it's alive.
export const CREEP_KEY = {
  w: 12,
  h: 10,
  frames: [
    [
      '            ',
      '  kkkk      ',
      ' kIIIIk     ',   // bow (ring)
      ' kIkRIk     ',   // red eye
      ' kIIIIkkkkk ',
      '  kIIIIIIIk ',   // shaft
      '   kkkIkIkk ',   // teeth
      '     kkkkk  ',
      '            ',
      '            ',
    ],
    [
      '            ',
      '            ',
      '  kkkk      ',
      ' kIIIIk     ',
      ' kIkRIk     ',
      ' kIIIIkkkkk ',
      '  kIIIIIIIk ',
      '   kkIkIkkk ',   // teeth shift — it turns in the air
      '     kkkkk  ',
      '            ',
    ],
  ],
};

// --- Void creep: "Mảnh Hư Không" (Void Fragment). 12 x 12 ---
// A hole in reality: a dark diamond with a rift-purple rim and a starfield
// inside. It must NOT be outlined in black like everything else — the rim is
// purple, so it reads as an opening rather than a solid object.
export const CREEP_VOID = {
  w: 12,
  h: 12,
  frames: [
    [
      '     PP     ',
      '    P..P    ',
      '   P.W..P   ',
      '  P..W...P  ',
      ' P...W....P ',
      'P..W....W..P',
      'P....W.....P',
      ' P..W.....P ',
      '  P...W..P  ',
      '   P....P   ',
      '    P..P    ',
      '     PP     ',
    ],
    [
      '     PP     ',
      '    P..P    ',
      '   P..W.P   ',   // the stars inside DRIFT
      '  P.W....P  ',
      ' P....W...P ',
      'P.W......W.P',
      'P...W......P',
      ' P.....W..P ',
      '  P..W...P  ',
      '   P....P   ',
      '    P..P    ',
      '     PP     ',
    ],
  ],
};

// --- Gate boss: "Quản Cổng Sắt" (the Iron Warden). 20 x 18 ---
// A hulking gate-keeper made of the gate itself: iron plate body, a barred visor
// and a huge padlock hanging on its chest. The padlock is the read — it says
// "this thing keeps you OUT" better than any weapon would.
export const BOSS_WARDEN = {
  w: 20,
  h: 18,
  frames: [
    [
      '     kkkkkkkk       ',
      '    kMMMMMMMMk      ',
      '    kMkkkkkkMk      ',
      '    kMkRkkRkMk      ',   // barred visor with burning slits
      '    kMkkkkkkMk      ',
      '    kMMMMMMMMk      ',
      '  kkkkMMMMMMkkkk    ',
      ' kMMMkMMMMMMkMMMk   ',
      ' kMMMkMkIIkMkMMMk   ',   // padlock body
      ' kMMMkMkIIkMkMMMk   ',
      ' kMMMkMMkkMMkMMMk   ',
      ' kkkkkMMMMMMkkkkk   ',
      '  kMMkMMMMMMkMMk    ',
      '  kMMkMMMMMMkMMk    ',
      '  kkkkMMMMMMkkkk    ',
      '     kMMMMMMk       ',
      '    kMMk  kMMk      ',
      '    kkkk  kkkk      ',
    ],
    [
      '     kkkkkkkk       ',
      '    kMMMMMMMMk      ',
      '    kMkkkkkkMk      ',
      '    kMkRkkRkMk      ',
      '    kMkkkkkkMk      ',
      '    kMMMMMMMMk      ',
      '  kkkkMMMMMMkkkk    ',
      ' kMMMkMMMMMMkMMMk   ',
      ' kMMMkMkIIkMkMMMk   ',
      ' kMMMkMkIIkMkMMMk   ',
      ' kMMMkMMkkMMkMMMk   ',
      ' kkkkkMMMMMMkkkkk   ',
      '  kMMkMMMMMMkMMk    ',
      '  kMMkMMMMMMkMMk    ',
      '  kkkkMMMMMMkkkk    ',
      '     kMMMMMMk       ',
      '   kMMk    kMMk     ',   // stance widens
      '   kkkk    kkkk     ',
    ],
  ],
};

// --- Dungeon boss: "Cai Ngục" (the Jailer). 18 x 18 ---
// A gaunt warder carrying a lantern on a hook. The LANTERN is the silhouette
// cue: a small bright box held out to one side, which is what a jailer walking a
// dark corridor looks like. Hooded, so it stays in the fortress's visual family.
export const BOSS_JAILER = {
  w: 18,
  h: 18,
  frames: [
    [
      '      kkkk        ',
      '     kMMMMk       ',
      '    kM....Mk      ',
      '    kM.RR.Mk      ',   // two red eyes in the hood's void
      '    kM....Mk      ',
      '    kkM..Mkk      ',
      '   kMMMkkMMMk kkk ',   // arm out to the side; lantern hook
      '  kMMMMMMMMMMkkYk ',
      '  kMMMMMMMMMMkYYk ',   // lantern, glowing
      '  kMMMMMMMMMMkkYk ',
      '  kMMMMMMMMMMk kkk',
      '  kMMMMMMMMMMk    ',
      '  kMMMMMMMMMMk    ',
      '   kMMMMMMMMk     ',
      '   kMMMMMMMMk     ',
      '   kMMk  kMMk     ',
      '   kMMk  kMMk     ',
      '   kkkk  kkkk     ',
    ],
    [
      '      kkkk        ',
      '     kMMMMk       ',
      '    kM....Mk      ',
      '    kM.RR.Mk      ',
      '    kM....Mk      ',
      '    kkM..Mkk      ',
      '   kMMMkkMMMk kkk ',
      '  kMMMMMMMMMMkkYk ',
      '  kMMMMMMMMMMkYYk ',
      '  kMMMMMMMMMMkkYk ',
      '  kMMMMMMMMMMk kkk',
      '  kMMMMMMMMMMk    ',
      '  kMMMMMMMMMMk    ',
      '   kMMMMMMMMk     ',
      '   kMMMMMMMMk     ',
      '   kMMkkkkMMk     ',   // robe closes — extremities only
      '   kMMk  kMMk     ',
      '   kkkk  kkkk     ',
    ],
  ],
};

// --- Throne-hall boss: "Tướng Quỷ" (the Demon General). 20 x 20 ---
// The Demon King's champion: horned, armored, holding a broad axe. Horns sweep
// OUTWARD and up (curling inward read as a cute ram); the axe head is a solid
// wedge so it can't be mistaken for a shield.
export const BOSS_GENERAL = {
  w: 20,
  h: 20,
  frames: [
    [
      'k          k    kkk ',
      'kR       Rk    kIIIk',   // horns sweeping out
      ' kR     Rk    kIIIIk',   // axe head — a solid wedge
      '  kRkkkkRk    kIIIIk',
      '  kRRRRRRk     kIIIk',
      '  kRkWkWkk      kIk ',   // white eyes
      '  kRRRRRRk      kIk ',
      '   kkRRkk       kTk ',   // haft
      ' kkkkRRkkkk     kTk ',
      'kRRRkRRkRRRk    kTk ',
      'kRRRkRRkRRRk    kTk ',
      'kRRRkRRkRRRk    kTk ',
      'kRRRkRRkRRRk    kTk ',
      'kkkkkRRkkkkk    kkk ',
      ' krrkRRkrrk         ',
      ' kRRkRRkRRk         ',
      ' kkkkRRkkkk         ',
      '   kRRRRk           ',
      '   kRRkRRk          ',
      '   kkk kkk          ',
    ],
    [
      'k          k    kkk ',
      'kR       Rk    kIIIk',
      ' kR     Rk    kIIIIk',
      '  kRkkkkRk    kIIIIk',
      '  kRRRRRRk     kIIIk',
      '  kRkWkWkk      kIk ',
      '  kRRRRRRk      kIk ',
      '   kkRRkk       kTk ',
      ' kkkkRRkkkk     kTk ',
      'kRRRkRRkRRRk    kTk ',
      'kRRRkRRkRRRk    kTk ',
      'kRRRkRRkRRRk    kTk ',
      'kRRRkRRkRRRk    kTk ',
      'kkkkkRRkkkkk    kkk ',
      ' krrkRRkrrk         ',
      ' kRRkRRkRRk         ',
      ' kkkkRRkkkk         ',
      '   kRRRRk           ',
      '  kRRk kRRk         ',   // stance widens
      '  kkk   kkk         ',
    ],
  ],
};

// --- Void boss: "Bóng Vô Hình" (the Formless Shadow). 20 x 18 ---
// A shape that never settles: a ragged column of dark with a rift-purple core
// and three white eyes at uneven heights. The UNEVEN eyes are what make it
// unsettling — evenly spaced ones would read as a face.
export const BOSS_FORMLESS = {
  w: 20,
  h: 17,
  frames: [
    [
      '     kkkk           ',
      '    k....k          ',
      '   k..PP..k         ',
      '   k.PWP..k         ',   // eye 1, high
      '  k..PPP...k        ',
      '  k...PP..W.k       ',   // eye 2, mid-right
      ' k....PPP...k       ',
      ' k...PPPPP..k       ',
      ' k..PPPPPP...k      ',
      'k..W.PPPP....k      ',   // eye 3, low-left
      'k....PPPP....k      ',
      'k...PPPPPP...k      ',
      ' k..PPPPPP..k       ',
      ' k...PPPP...k       ',
      '  k..PPPP..k        ',
      '  k.k.kk.k.k        ',   // ragged, dissolving hem
      '   k  kk  k         ',
    ],
    [
      '      kkkk          ',
      '     k....k         ',
      '    k..PP..k        ',
      '    k..PWP.k        ',   // the eyes MIGRATE — it has no fixed form
      '   k..PPP...k       ',
      '   kW..PP...k       ',
      '  k....PPP..k       ',
      '  k..PPPPP..k       ',
      ' k...PPPPPP..k      ',
      ' k....PPPP.W.k      ',
      ' k...PPPP....k      ',
      ' k..PPPPPP...k      ',
      '  k.PPPPPP..k       ',
      '  k..PPPP...k       ',
      '   k.PPPP..k        ',
      '   k.k.kk.kk        ',
      '    k  kk k         ',
    ],
  ],
};

// --- THE FINAL BOSS: "KẺ NUỐT THẾ GIỚI" (the World Devourer). 24 x 26 ---
// The prologue's villain in his true form — bigger than anything else in the
// game, as the last boss must be. Built on the Dark Lord's principle (all hard
// angles, architecture not anatomy) but escalated: a crown of SIX spires, a maw
// where a chest should be (he devours worlds — the mouth is the whole idea, and
// putting it on the torso rather than the head is what stops him reading as a
// big cartoon face), and a mantle of straight rift-purple falls.
export const STAGEBOSS_DEVOURER = {
  w: 24,
  h: 26,
  frames: [
    [
      '  k   k  kk  k   k      ',
      '  kR  kR kRk kR  kR     ',   // six-spire crown
      '  kRk kRkkRkkRk kRk     ',
      '  kRRkkRRkRRkRRkkRR     ',
      '  kkRRRRRRRRRRRRRRk     ',
      '   kMMMMMMMMMMMMMk      ',   // brow
      '   kMkRRkMMMkRRkMk      ',   // burning eyes, set wide and square
      '   kMkRRkMMMkRRkMk      ',
      '   kMMMMMMMMMMMMMk      ',
      ' kkkkMMMMMMMMMMMkkkk    ',   // square shoulders
      'kPPPkMMMMMMMMMMMkPPPk   ',
      'kPPPkMkkkkkkkkkMkPPPk   ',
      'kPPPkMkWkWkWkWkMkPPPk   ',   // THE MAW — teeth across the torso
      'kPPPkMkkkkkkkkkMkPPPk   ',
      'kPPPkMkPPPPPPPkMkPPPk   ',   // rift glowing inside the maw
      'kPPPkMkPPPPPPPkMkPPPk   ',
      'kPPPkMkkkkkkkkkMkPPPk   ',
      'kPPPkMkWkWkWkWkMkPPPk   ',   // lower teeth
      'kPPPkMMMMMMMMMMMkPPPk   ',
      'kkkkkMMMMMMMMMMMkkkkk   ',
      ' kppkMMMMMMMMMMMkppk    ',
      ' kPPkMMMMMMMMMMMkPPk    ',
      ' kPPkkkkkkkkkkkkkPPk    ',
      ' kPPk kMMk kMMk kPPk    ',
      ' kPPk kMMk kMMk kPPk    ',
      ' kkkk kkkk kkkk kkkk    ',
    ],
    [
      '  k   k  kk  k   k      ',
      '  kR  kR kRk kR  kR     ',
      '  kRk kRkkRkkRk kRk     ',
      '  kRRkkRRkRRkRRkkRR     ',
      '  kkRRRRRRRRRRRRRRk     ',
      '   kMMMMMMMMMMMMMk      ',
      '   kMkRRkMMMkRRkMk      ',
      '   kMkRRkMMMkRRkMk      ',
      '   kMMMMMMMMMMMMMk      ',
      ' kkkkMMMMMMMMMMMkkkk    ',
      'kPPPkMMMMMMMMMMMkPPPk   ',
      'kPPPkMkkkkkkkkkMkPPPk   ',
      'kPPPkMkWkWkWkWkMkPPPk   ',
      'kPPPkMkkkkkkkkkMkPPPk   ',
      'kPPPkMkpPPPPPpkMkPPPk   ',   // the rift inside the maw PULSES
      'kPPPkMkpPPPPPpkMkPPPk   ',
      'kPPPkMkkkkkkkkkMkPPPk   ',
      'kPPPkMkWkWkWkWkMkPPPk   ',
      'kPPPkMMMMMMMMMMMkPPPk   ',
      'kkkkkMMMMMMMMMMMkkkkk   ',
      ' kppkMMMMMMMMMMMkppk    ',
      ' kPPkMMMMMMMMMMMkPPk    ',
      ' kPPkkkkkkkkkkkkkPPk    ',
      'kPPk  kMMk kMMk  kPPk   ',   // mantle flares wider
      'kPPk  kMMk kMMk  kPPk   ',
      'kkkk  kkkk kkkk  kkkk   ',
    ],
  ],
};

// --- Chapter 2 + 3 sprite registration ---------------------------------------
// These consts are defined below the SPRITES literal above, so they are attached
// here. Every id must match the roster names in monsters.js (verify.js asserts
// that every roster sprite id resolves in SPRITES).
Object.assign(SPRITES, {
  // chapter 2 — the quest for the Staff
  creep_inkslime: CREEP_INKSLIME,
  creep_gust: CREEP_GUST,
  creep_mirror: CREEP_MIRROR,
  boss_scribe: BOSS_SCRIBE,
  boss_windserpent: BOSS_WINDSERPENT,
  boss_guardian_statue: BOSS_GUARDIAN_STATUE,
  stageboss_staffguardian: STAGEBOSS_STAFFGUARDIAN,
  // chapter 3 — the siege
  creep_bone: CREEP_BONE,
  creep_gateeye: CREEP_GATEEYE,
  creep_key: CREEP_KEY,
  creep_void: CREEP_VOID,
  boss_warden: BOSS_WARDEN,
  boss_jailer: BOSS_JAILER,
  boss_general: BOSS_GENERAL,
  boss_formless: BOSS_FORMLESS,
  stageboss_devourer: STAGEBOSS_DEVOURER,
});

// ===========================================================================
// CHAPTER 3 SCENERY (see BIOMES entries bonebridge..finalspire in biomes.js)
// ===========================================================================

// --- A cracked bone pillar. 10 x 20. Bonebridge. ----------------------------
// Vertebrae stacked into a column — the horizontal joint lines are what say
// "bone" rather than "stone", so they stay strongly contrasted.
export const BONE_PILLAR = {
  w: 10,
  h: 20,
  frames: [
    [
      '  kkkkkk  ',
      ' kwwwwwwk ',
      ' kkkkkkkk ',
      '  kwwwwk  ',
      ' kwwwwwwk ',
      ' kkkkkkkk ',
      '  kwwwwk  ',
      ' kwwwwwwk ',
      ' kkkkkkkk ',
      '  kwwwwk  ',
      ' kwwwwwwk ',
      ' kkkkkkkk ',
      '  kwwwwk  ',
      ' kwwwwwwk ',
      ' kkkkkkkk ',
      '  kwwwwk  ',
      ' kwwwwwwk ',
      'kwwwwwwwwk',
      'kwwwwwwwwk',
      'kkkkkkkkkk',
    ],
  ],
};

// --- A cell door with bars. 12 x 18. Dungeon. -------------------------------
// Where the princesses' stolen powers were kept. The bars are the read; the door
// stands slightly AJAR (the right edge is offset) because an open cell says
// "they were here and they are gone" better than a shut one.
export const CELL_DOOR = {
  w: 12,
  h: 18,
  frames: [
    [
      ' kkkkkkkkkk ',
      ' kMMMMMMMMk ',
      ' kMkkkkkkMk ',
      ' kMk.k.k.Mk ',   // bars over darkness
      ' kMk.k.k.Mk ',
      ' kMk.k.k.Mk ',
      ' kMk.k.k.Mk ',
      ' kMk.k.k.Mk ',
      ' kMkkkkkkMk ',
      ' kMMMMMMMMk ',
      ' kMMkIIkMMk ',   // lock plate, hanging open
      ' kMMkIkkMMk ',
      ' kMMMMMMMMk ',
      ' kMk.k.k.Mk ',
      ' kMk.k.k.Mk ',
      ' kMk.k.k.Mk ',
      ' kMMMMMMMMk ',
      ' kkkkkkkkkk ',
    ],
  ],
};

// --- A rift in the air. 14 x 20. Void / throne hall. ------------------------
// A tear in reality: a vertical slash, WIDEST in the middle, rift-purple edged
// with white heat. No black outline (it is a hole, not an object).
export const VOID_RIFT = {
  w: 14,
  h: 20,
  frames: [
    [
      '      PP      ',
      '     PWP      ',
      '     PWP      ',
      '    PPWPP     ',
      '    PWWWP     ',
      '   PPWWWPP    ',
      '   PWWWWWP    ',
      '  PPWWWWWPP   ',
      '  PWWWWWWWP   ',
      '  PWWWWWWWP   ',
      '  PPWWWWWPP   ',
      '   PWWWWWP    ',
      '   PPWWWPP    ',
      '    PWWWP     ',
      '    PPWPP     ',
      '     PWP      ',
      '     PWP      ',
      '      PP      ',
      '              ',
      '              ',
    ],
    [
      '      PP      ',
      '      PP      ',
      '     PWP      ',
      '     PWPP     ',
      '    PPWWP     ',
      '    PWWWP     ',
      '   PPWWWPP    ',
      '   PWWWWWP    ',
      '  PPWWWWWPP   ',
      '  PWWWWWWWP   ',
      '  PWWWWWWWP   ',
      '  PPWWWWWPP   ',
      '   PWWWWWP    ',
      '   PPWWWPP    ',
      '    PWWWP     ',
      '    PPWPP     ',
      '     PWP      ',
      '      PP      ',
      '      PP      ',
      '              ',
    ],
  ],
};

// --- The Demon King's throne. 18 x 24. Throne hall landmark. ----------------
// The dark counterpart of THRONE: same idea, but the crest is a fan of SPIKES
// instead of gold ribs, and it is built from black iron with a rift-purple seat.
export const DEMON_THRONE = {
  w: 18,
  h: 24,
  frames: [
    [
      '  k  k  k  k  k   ',
      '  kR kR kR kR kR  ',   // spike crest
      '  kRkkRkkRkkRkkR  ',
      '  kMMMMMMMMMMMMk  ',
      '  kMPPPPPPPPPPMk  ',   // rift-purple back
      '  kMPPPPPPPPPPMk  ',
      '  kMPpPPPPPPpPMk  ',
      '  kMPPPPPPPPPPMk  ',
      '  kMPPPPPPPPPPMk  ',
      '  kMPpPPPPPPpPMk  ',
      '  kMPPPPPPPPPPMk  ',
      '  kMPPPPPPPPPPMk  ',
      '  kMkkkkkkkkkkMk  ',
      ' kMMMMMMMMMMMMMMk ',
      ' kMPPPPPPPPPPPPMk ',   // seat
      ' kMPPPPPPPPPPPPMk ',
      ' kMkkkkkkkkkkkkMk ',
      ' kMk        kMk   ',
      ' kMk        kMk   ',
      ' kMk        kMk   ',
      'kMMMk      kMMMk  ',
      'kMMMk      kMMMk  ',
      'kkkkk      kkkkk  ',
      '                  ',
    ],
  ],
};

// --- The final spire's broken crown. 18 x 26. Finalspire landmark. ----------
// The top of the villain's tower, reached at last: jagged black stone with the
// rift burning through its cracks. Asymmetric on purpose (the left side is
// broken lower) so it reads as a ruin at the end of a siege.
export const SPIRE_CROWN = {
  w: 18,
  h: 26,
  frames: [
    [
      '        k  k      ',
      '     k  kM kMk    ',
      '    kMk kMkkMk    ',
      '   kMMkkkMMkMMk   ',
      '   kMMMMMMMMMMk   ',
      '   kMMPPMMMMMMk   ',   // rift glowing through the cracks
      '   kMMPPMMPPMMk   ',
      '   kMMMMMMPPMMk   ',
      '  kMMMMMMMMMMMMk  ',
      '  kMMPPMMMMMMMMk  ',
      '  kMMPPMMMMPPMMk  ',
      '  kMMMMMMMMPPMMk  ',
      '  kMMMMMMMMMMMMk  ',
      ' kMMMMPPMMMMMMMMk ',
      ' kMMMMPPMMMMMMMMk ',
      ' kMMMMMMMMMPPMMMk ',
      ' kMMMMMMMMMPPMMMk ',
      ' kMMMMMMMMMMMMMMk ',
      'kMMMMPPMMMMMMMMMMk',
      'kMMMMPPMMMMMMMMMMk',
      'kMMMMMMMMMMMPPMMMk',
      'kMMMMMMMMMMMPPMMMk',
      'kMMMMMMMMMMMMMMMMk',
      'kMMMMMMMMMMMMMMMMk',
      'kMMMMMMMMMMMMMMMMk',
      'kkkkkkkkkkkkkkkkkk',
    ],
  ],
};

// --- A tattered war banner of the fortress. 10 x 18. -----------------------
// Torn at the bottom edge (the fringe is uneven), rift-purple field with a red
// slash — the Demon King's mark.
export const DEMON_BANNER = {
  w: 10,
  h: 18,
  frames: [
    [
      ' kkkkkkkk ',
      ' kPPPPPPk ',
      ' kPPRRPPk ',
      ' kPRRRRPk ',   // red slash mark
      ' kPPRRPPk ',
      ' kPPPPPPk ',
      ' kPPPPPPk ',
      ' kPpPPpPk ',
      ' kPPPPPPk ',
      ' kPPPPPPk ',
      ' kPpPPpPk ',
      ' kPPPPPPk ',
      ' kPkPPkPk ',   // tattered fringe — uneven on purpose
      ' kPk kPk  ',
      ' kk   kk  ',
      '          ',
      '          ',
      '          ',
    ],
    [
      ' kkkkkkkk ',
      ' kPPPPPPk ',
      ' kPPRRPPk ',
      ' kPRRRRPk ',
      ' kPPRRPPk ',
      ' kPPPPPPk ',
      ' kPPPPPPk ',
      ' kPpPPpPk ',
      ' kPPPPPPk ',
      ' kPPPPPPk ',
      ' kPpPPpPk ',
      ' kPPPPPPk ',
      ' kPkPPkPk ',
      '  kPkPPk  ',   // fringe sways
      '   kk kk  ',
      '          ',
      '          ',
      '          ',
    ],
  ],
};
