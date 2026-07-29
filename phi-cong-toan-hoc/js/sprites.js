// sprites.js — all game art as pixel grids.
//
// Each sprite is an array of strings; every character is one pixel cell:
//   ' ' (space) = transparent
//   any other char = filled, and the character is a palette key (see PALETTE).
//
// Same outlined pixel-art style as anh-hung-ban-phim: every sprite has a black
// outline ('k'), a base color, and lighter/darker shade tones for depth.
//
// HARD-WON RULES CARRIED OVER FROM THE TYPING GAME — these are not style
// preferences, they are bugs that already happened once:
//
//  1. FAMILIAR SILHOUETTES ARE A TRAP at this pixel size — not just faces.
//     A rounded outline with two even eye-blobs over a horizontal band reads as
//     a cartoon smiley; but so does a triangle over a stem (a Christmas tree),
//     and so does anything stacked head-body-legs (a little robot). All three
//     shipped here and had to be redrawn. The two structural rules that came
//     out of it:
//       * SHIPS ARE WIDER THAN THEY ARE TALL. Mass spread along a horizontal
//         wing line reads as an aircraft from above and as nothing else.
//         Vertical stacking is what summons creatures.
//       * Build from MACHINERY — hull plates, thruster nozzles, asymmetric
//         turrets — never anatomy. Where a boss needs an eye it is a
//         core/lens, off-centre so it cannot pair into a face.
//  2. A SHIP NEEDS ONE UNMISTAKABLE PROP. Read from a silhouette at gameplay
//     scale, hulls blur together; one distinct mounted feature (a mast, a
//     clamp, a core lens) is what tells them apart. Mounted props run
//     VERTICAL — a diagonal one reads as clutter.
//  3. ENEMY LEGIBILITY BEATS SCENERY DETAIL. A monstership must read against
//     its own starfield unaided. Nothing in the background may out-read it.
//  4. IDLE FRAMES MOVE ONLY EXTREMITIES — thruster flame, a blinking cockpit
//     light. Never the hull: a shifted hull row reads as the ship lurching.
//
// ROSTER LAYOUT (in draw order of importance):
//   the kid's ship + the 5 allies    — cool blues/teals, the only friendly hues
//   creeps (5 kinds)                 — the bulk of every wave
//   elites (3 kinds)                 — tougher, hold position
//   bosses (5 kinds + final)         — one per chapter beat, each read from a prop
//   projectiles + pickups
//
// COLOR IS FACTION. Friendly ships are cool (blue/cyan/teal), monsterships are
// warm or violet, and nothing crosses over. A kid glancing at a busy screen must
// know instantly what is theirs — hue does that faster than shape.

export const PALETTE = {
  // structure / shading
  k: '#1a1423', // near-black outline
  W: '#ffffff', // white (highlights, cockpit glint)
  w: '#d9d9e0', // off-white shade
  '.': '#3a3550', // dark shadow

  // space backdrop
  Z: '#0b0820', // deep space
  z: '#171235', // space light band
  Q: '#3b2a6d', // nebula purple
  q: '#6d4aa8', // nebula light

  // the kid's ship — blue/white, the only friendly cool-blue in the game
  B: '#4d9bf0', // hull blue
  b: '#2a5fb8', // hull shade
  C: '#7fe3ff', // cockpit cyan
  c: '#3aa8d8', // cockpit shade
  Y: '#f2c53d', // gold trim / cannon
  y: '#c99a1e', // gold shade

  // thruster / energy
  O: '#ff9d3a', // thruster orange
  o: '#e0641f', // thruster deep
  T: '#7fffd4', // energy teal (meters, plasma)
  t: '#2fbf9f', // energy teal shade

  // monsterships — hostile warm reds/violets, never blue
  R: '#e0503a', // hull red
  r: '#b0311f', // hull red shade
  P: '#a855f7', // void violet
  p: '#7226c4', // violet shade
  G: '#5fc23c', // toxic green (acid enemies)
  g: '#3d9426', // toxic green shade
  M: '#4a4560', // gunmetal
  m: '#6a6580', // gunmetal light
  L: '#8f8aa8', // light grey plating
  I: '#ffd24a', // warning-light amber

  // ally hull tints. Each of the 5 allies gets ONE distinct cool hue, because
  // in chapter 3 all six ships fly in formation and a kid should be able to
  // name which is which at a glance. allySprite() remaps the slot chars
  // 'A' (hull) and 'a' (shade) to these.
  E: '#7fe3a0', // Bé Ốc — engineer green
  e: '#3fa86a',
  F: '#ffd166', // Tia Chớp — gunner gold
  f: '#d19b28',
  H: '#5fd8d8', // Vòm Xanh — shield-tech teal
  h: '#2a9d9d',
  J: '#9db4ff', // La Bàn — navigator periwinkle
  j: '#5b74c8',
  K: '#d9a6ff', // Giáo Sư Sao — scientist lilac
  x: '#a35fd8',

  // RANK TRIM. The hero's wing trim and nose fin are recoloured by rank, so a
  // kid's rank rides on their own ship — see heroSprite() in this file.
  //
  // These recolour the TRIM ONLY, never the hull: verify.js requires friendly
  // ships to stay cool-hued (B/b blue) and forbids them the enemy warm/violet
  // set, so a "red rank" skin would be a genuine faction bug, not a style
  // choice. Trim is also where the eye already looks — the gold Y/y wing edge
  // is the ship's one accent — so a rank change is legible without redrawing
  // the silhouette, which is the trap this file exists to warn about.
  //
  // The progression runs DULL → BRIGHT (grey → white-gold), because rank is a
  // long arc and the top rank should look earned.
  // Each must be DISTINCT from every other palette entry (verify.js asserts it),
  // so these are deliberately offset from the visually similar ally hues and the
  // L plating grey rather than reusing them.
  '1': '#7c7796', // Tập Sự      — plain grey, an unmarked trainee hull
  '2': '#8aa6f5', // Phi Công    — periwinkle, first real commission
  '3': '#4fc9cc', // Thiếu Uý    — teal
  '4': '#6ed894', // Đại Uý      — green
  '5': '#ffd45c', // Chỉ Huy Trưởng — gold
  '6': '#fff8ea', // Sao Trưởng  — white-gold, the brightest trim in the game

  // boss accents
  V: '#ff2d6f', // hot magenta — the Destroyer's core, the most saturated
  v: '#c00d47', //   color in the game, used ONLY on the final boss
  N: '#2a2440', // deep armor plate (boss hulls read heavier than creeps)
  n: '#141026', // deepest shadow plate
  S: '#ff7a2f', // engine/hazard orange (boss thrusters, alarm strips)
  s: '#d63a12',
};

// ---------------------------------------------------------------------------
// The kid's ship — "Tia Sáng" (Ray of Light).
//
// Points UP (the game is vertical; enemies come from the top). Reads as a ship
// from: a narrow nose, swept wings wider than the body, twin gold cannons at
// the wingtips, and a cyan cockpit bubble. The two frames differ ONLY in the
// thruster flame at the bottom rows — rule 4.
// ---------------------------------------------------------------------------

const SHIP_HERO = {
  w: 15,
  frames: [
    [
      '       k       ',
      '      kYk      ',
      '      kYk      ',
      '     kkBkk     ',
      '    kBBBBBk    ',
      '   kBBCCCBBk   ',
      '  kBBCWWWCBBk  ',
      ' kYBBCCCCCBBYk ',
      'kYYBBBBBBBBBYYk',
      'kYkBBbbbbbBBkYk',
      ' k kBbbbbbBk k ',
      '   kbbkkkbbk   ',
      '    kOk kOk    ',
      '    kok kok    ',
      '     k   k     ',
    ],
    [
      '       k       ',
      '      kYk      ',
      '      kYk      ',
      '     kkBkk     ',
      '    kBBBBBk    ',
      '   kBBCCCBBk   ',
      '  kBBCWWWCBBk  ',
      ' kYBBCCCCCBBYk ',
      'kYYBBBBBBBBBYYk',
      'kYkBBbbbbbBBkYk',
      ' k kBbbbbbBk k ',
      '   kbbkkkbbk   ',
      '    kOk kOk    ',
      '    kOk kOk    ',
      '    kok kok    ',
    ],
  ],
};

// ---------------------------------------------------------------------------
// Monstership: "Phi Tiêu" (Dart) — the chapter-1 basic creep.
//
// Points DOWN (it descends at the kid). Built from machinery per rule 1: a
// blunt armored prow, two angled fins, a single off-centre amber warning lamp
// as its one unmistakable prop (rule 2). Saturated red so it reads against any
// starfield (rule 3). Frames differ only in the lamp and the rear nozzle glow.
// ---------------------------------------------------------------------------

const ENEMY_DART = {
  w: 13,
  frames: [
    [
      '   kMMMMMk   ',
      '  kMmmmmmMk  ',
      ' kRRMmmmMRRk ',
      'kRRRRMMMRRRRk',
      'kRrRRRRRRRrRk',
      ' kRrRRRRRrRk ',
      '  kIrRRRrIk  ',
      '   kkRRRkk   ',
      '     kRk     ',
      '     kkk     ',
    ],
    [
      '   kMMMMMk   ',
      '  kMmmmmmMk  ',
      ' kRRMmmmMRRk ',
      'kRRRRMMMRRRRk',
      'kRrRRRRRRRrRk',
      ' kRrRRRRRrRk ',
      '  krrRRRrrk  ',
      '   kkRRRkk   ',
      '     kIk     ',
      '     kkk     ',
    ],
  ],
};

// ---------------------------------------------------------------------------
// THE ALLY TEMPLATE — one hull, five colorways.
//
// A new ally is DATA, not a new hand-drawn sprite: allySprite(styleName) takes
// this template and remaps the slot chars 'A' (hull) / 'a' (hull shade) to the
// style's hue. Same pattern as princessSprite/PRINCESS_STYLES in the typing
// game, and for the same reason — five hand-drawn near-identical ships is five
// chances for one to drift out of style.
//
// The ally hull is deliberately SMALLER and simpler than the kid's ship: in
// chapter 3 all six fly in formation, and if the wingmen matched the hero's
// silhouette the kid would lose track of which one they are.
// ---------------------------------------------------------------------------

// A SOLID TAPERING TRIANGLE OVER A NARROW STEM READS AS A CHRISTMAS TREE.
// That is not hypothetical — the first version of this template did exactly
// that, in all five colorways, and no amount of recoloring fixed it because the
// problem was the silhouette. It is the space-shooter equivalent of the typing
// game's "faces are a trap": the shape resolves to the wrong familiar object.
//
// What makes it read as a ship instead:
//   * a NOTCHED nose (two cells, not one) — trees come to a single point
//   * wings that step OUT at a hard shoulder rather than tapering smoothly
//   * a wide engine block spanning most of the hull, not a 1px trunk
//   * the cockpit as a horizontal bar, which no tree has
// THREE silhouette traps in a row taught the shape of this problem:
//   v1: solid triangle over a 1px stem   -> a Christmas tree
//   v2: notched nose, bar cockpit, two   -> a little robot (nose=head,
//       thruster nozzles below              cockpit=visor, nozzles=feet)
//   v3 (this one): WIDE and FLAT.
//
// The common cause was VERTICAL STACKING: any head-body-legs arrangement at
// 11x9 resolves to a creature, because that is the arrangement a child's eye is
// most practised at finding. A ship has to be WIDER THAN IT IS TALL, with its
// mass spread horizontally along a wing line — that reads as an aircraft
// viewed from above and nothing else. This is rule 1 restated: the danger is
// not just literal faces, it is any familiar organic silhouette.
//
// 13x7, wingspan-dominant, cockpit as a single small cell rather than a bar.
const ALLY_TEMPLATE = {
  w: 13,
  frames: [
    [
      '     kAk     ',
      '    kAAAk    ',
      'kkAAAACAAAAkk',   // one long wing line — the dominant read
      'kAAaaaAaaaAAk',
      'kkAAaaaaaAAkk',
      '  kkOk kOkk  ',
      '    ko ok    ',
    ],
    [
      '     kAk     ',
      '    kAAAk    ',
      'kkAAAACAAAAkk',
      'kAAaaaAaaaAAk',
      'kkAAaaaaaAAkk',
      '  kkOk kOkk  ',
      '   kSOk kOSk ',
    ],
  ],
};

// Each ally's hull hue + shade, keyed by the id used in allies.js.
export const ALLY_STYLES = {
  engineer:  { hull: 'E', shade: 'e' }, // Bé Ốc
  gunner:    { hull: 'F', shade: 'f' }, // Tia Chớp
  shieldman: { hull: 'H', shade: 'h' }, // Vòm Xanh
  navigator: { hull: 'J', shade: 'j' }, // La Bàn
  scientist: { hull: 'K', shade: 'x' }, // Giáo Sư Sao
};

// Build (and cache) an ally sprite in its own colorway.
const _allyCache = new Map();
export function allySprite(styleName) {
  if (_allyCache.has(styleName)) return _allyCache.get(styleName);
  const st = ALLY_STYLES[styleName] || ALLY_STYLES.engineer;
  const sprite = {
    w: ALLY_TEMPLATE.w,
    frames: ALLY_TEMPLATE.frames.map((f) =>
      f.map((row) => row.replace(/A/g, st.hull).replace(/a/g, st.shade))),
  };
  _allyCache.set(styleName, sprite);
  return sprite;
}

// ---------------------------------------------------------------------------
// CREEPS — the bulk of every wave. Six more beyond ENEMY_DART.
//
// Each is read from ONE distinguishing feature, not from overall shape:
//   dart    — off-centre amber lamp (chapter 1 baseline)
//   drone   — a scaled-down dart, half the cell count: the SWARM filler
//   wedge   — a wide flat prow, twice as broad as tall
//   orb     — round hull with a dark equatorial band
//   spike   — a single long vertical spike below the hull
//   shard   — asymmetric: one wing longer than the other
//   wraith  — a scaled-down shard in violet: chapter 3's swarm filler
//
// drone and wraith exist so a wave can spend the same hit budget on MORE, not
// tougher, ships — trading `hits`-per-ship for headcount is how a late stage
// reads as a bigger fleet without asking the slow-profile kid for more hits
// than balance.js proves they can land (see stages.js's fleet-size rule).
// ---------------------------------------------------------------------------

// A scaled-down ENEMY_DART: half the rows, one lamp. The SWARM/GRID filler
// for chapter 1 — small enough that a wave of 6-8 still reads as "a lot of
// little ships" rather than "the same big dart, six times".
const ENEMY_DRONE = {
  w: 9,
  frames: [
    [
      '  kRRRk  ',
      ' kRrrrRk ',
      'kRRrIrRRk',
      'kRrrrrrRk',
      ' kkRRRkk ',
      '   kIk   ',
    ],
    [
      '  kRRRk  ',
      ' kRrrrRk ',
      'kRRrSrRRk',
      'kRrrrrrRk',
      ' kkRRRkk ',
      '   kSk   ',
    ],
  ],
};

// A FORKED, twin-point nose — two small fangs jutting forward, side by side,
// with a gap between. Deliberately not another below-hull spike (that is
// spike's own single feature, and reusing it would make the two
// indistinguishable in a mixed wave).
const ENEMY_FANG = {
  w: 11,
  frames: [
    [
      '   kRRRk   ',
      '  kRRRRRk  ',
      ' kRRrrrRRk ',
      ' kRrrIrrRk ',
      ' kRrrrrRk  ',
      '  kkRRkk   ',
      '  kLk kLk  ',
    ],
    [
      '   kRRRk   ',
      '  kRRRRRk  ',
      ' kRRrrrRRk ',
      ' kRrrSrrRk ',
      ' kRrrrrRk  ',
      '  kkRRkk   ',
      '  kLk kLk  ',
    ],
  ],
};

const ENEMY_WEDGE = {
  w: 15,
  frames: [
    [
      'kRRRRRRRRRRRRRk',
      'kRrrrrrrrrrrrRk',
      ' kRMMMmmmMMMRk ',
      '  kRRMmmmMRRk  ',
      '   kRRrrrRRk   ',
      '    kkRRRkk    ',
      '     kIkIk     ',
      '      kkk      ',
    ],
    [
      'kRRRRRRRRRRRRRk',
      'kRrrrrrrrrrrrRk',
      ' kRMMMmmmMMMRk ',
      '  kRRMmmmMRRk  ',
      '   kRRrrrRRk   ',
      '    kkRRRkk    ',
      '     kSkSk     ',
      '      kkk      ',
    ],
  ],
};

// Was a mushroom: a domed cap over a narrower body. Now a HEXAGONAL gun
// platform — flat top, angled shoulders, straight sides — with the dark band
// and twin barrels below. Straight edges and a flat top are what stop a hull
// reading as organic.
const ENEMY_ORB = {
  w: 13,
  frames: [
    [
      '  kPPPPPPPk  ',
      ' kPPpppppPPk ',
      'kPPpppppppPPk',
      'kNNNNNNNNNNNk',   // the dark equatorial band — its one read
      'kPPpppppppPPk',
      'kPPpppppppPPk',
      ' kPPpppppPPk ',
      '  kPPPPPPPk  ',
      '  kIk   kIk  ',   // twin barrels, symmetric but clearly mechanical
      '  kkk   kkk  ',
    ],
    [
      '  kPPPPPPPk  ',
      ' kPPpppppPPk ',
      'kPPpppppppPPk',
      'kNNNNNWNNNNNk',   // a single lit cell in the band
      'kPPpppppppPPk',
      'kPPpppppppPPk',
      ' kPPpppppPPk ',
      '  kPPPPPPPk  ',
      '  kSk   kSk  ',
      '  kkk   kkk  ',
    ],
  ],
};

// Was a lollipop: a round head on a long thin stick. The spike is now a RAM
// PROW fused to the hull — it widens where it meets the body instead of being a
// detached stem, and the hull above it is angular rather than round.
const ENEMY_SPIKE = {
  w: 11,
  frames: [
    [
      'kGGGGGGGGGk',
      'kGgggggggGk',
      'kGMMMmMMMGk',
      'kGgggggggGk',
      ' kGGGGGGGk ',
      '  kGGGGGk  ',
      '  kGGIGGk  ',
      '   kGLGk   ',   // the prow WIDENS into the hull — no detached stem
      '   kGLGk   ',
      '    kLk    ',
      '    kkk    ',
    ],
    [
      'kGGGGGGGGGk',
      'kGgggggggGk',
      'kGMMMWMMMGk',
      'kGgggggggGk',
      ' kGGGGGGGk ',
      '  kGGGGGk  ',
      '  kGGSGGk  ',
      '   kGLGk   ',
      '   kGLGk   ',
      '    kWk    ',
      '    kkk    ',
    ],
  ],
};

// A HOLLOW CAVITY at the core, dark shadow ('.') ringed by gunmetal, with a
// single lit cell showing through — the prison-world motif read onto a
// monstership: something held, glimpsed through a gap in the hull, rather
// than orb's solid band or spike's ram prow.
const ENEMY_HUSK = {
  w: 13,
  frames: [
    [
      '  kPPPPPPPk  ',
      '  kPPmmmPPk  ',
      ' kPmm...mmPk ',
      ' kPm..I..mPk ',
      ' kPmm...mmPk ',
      '  kPPmmmPPk  ',
      '   kkPPPkk   ',
      '   kLk kLk   ',
    ],
    [
      '  kPPPPPPPk  ',
      '  kPPmmmPPk  ',
      ' kPmm...mmPk ',
      ' kPm..S..mPk ',
      ' kPmm...mmPk ',
      '  kPPmmmPPk  ',
      '   kkPPPkk   ',
      '   kLk kLk   ',
    ],
  ],
};

// Deliberately ASYMMETRIC — the left wing runs a row longer than the right.
// A symmetric hull at this size reads as "generic enemy"; the lopsided one is
// instantly identifiable in a mixed wave.
const ENEMY_SHARD = {
  w: 13,
  frames: [
    [
      '  kRRRRk     ',
      ' kRRrrRRk    ',
      'kRRrrrrRRk   ',
      'kRrrMMMrrRRk ',
      'kRrrMmMrrrRRk',
      ' kRrrMMMrrRk ',
      '  kRRrrrRk   ',
      '   kkRRkk    ',
      '    kIk      ',
      '    kkk      ',
    ],
    [
      '  kRRRRk     ',
      ' kRRrrRRk    ',
      'kRRrrrrRRk   ',
      'kRrrMMMrrRRk ',
      'kRrrMWMrrrRRk',
      ' kRrrMMMrrRk ',
      '  kRRrrrRk   ',
      '   kkRRkk    ',
      '    kSk      ',
      '    kkk      ',
    ],
  ],
};

// A scaled-down ENEMY_SHARD in violet: the asymmetric left wing is preserved
// (row 2 runs flush to col 0 while the right side leaves a gap) so it reads
// as the same "lopsided" family at a glance, but at 11x6 it is cheap enough
// to field in the swarm counts chapter 3's biggest waves want.
const ENEMY_WRAITH = {
  w: 11,
  frames: [
    [
      '   kPPk    ',
      ' kPPppPPk  ',
      'PPppppPPPk ',
      ' kPpMmpPk  ',
      '  kkPPPkk  ',
      '    kIk    ',
    ],
    [
      '   kPPk    ',
      ' kPPppPPk  ',
      'PPppppPPPk ',
      ' kPpMmpPk  ',
      '  kkPPPkk  ',
      '    kSk    ',
    ],
  ],
};

// ---------------------------------------------------------------------------
// ELITES — tougher ships that hold position and shoot. Heavier plating (N/n)
// so they read as armored rather than just bigger.
// ---------------------------------------------------------------------------

const ELITE_GUARD = {
  w: 17,
  frames: [
    [
      '    kNNNNNNNk    ',
      '   kNLLLLLLLNk   ',
      '  kNLLMMMMMLLNk  ',
      ' kRNLLMmmmMLLNRk ',
      'kRRNNLLMmMLLNNRRk',
      'kRrRNNLLLLLNNRrRk',
      'kRrrRNNNNNNNRrrRk',
      ' kRrrRRRRRRRrrRk ',
      '  kRRrrrrrrrRRk  ',
      '   kkRRRRRRkk    ',
      '    kIk kIk      ',
      '    kkk kkk      ',
    ],
    [
      '    kNNNNNNNk    ',
      '   kNLLLLLLLNk   ',
      '  kNLLMMMMMLLNk  ',
      ' kRNLLMmmmMLLNRk ',
      'kRRNNLLMWMLLNNRRk',
      'kRrRNNLLLLLNNRrRk',
      'kRrrRNNNNNNNRrrRk',
      ' kRrrRRRRRRRrrRk ',
      '  kRRrrrrrrrRRk  ',
      '   kkRRRRRRkk    ',
      '    kSk kSk      ',
      '    kkk kkk      ',
    ],
  ],
};

const ELITE_LANCER = {
  w: 13,
  frames: [
    [
      '     kNk     ',
      '     kLk     ',   // the lance — long, vertical, its whole identity
      '     kLk     ',
      '    kNLNk    ',
      '   kNPPPNk   ',
      '  kNPPpPPNk  ',
      ' kNPPppppPNk ',
      'kNPPpppppppNk',
      'kNNppppppppNk',
      ' kkNNNNNNNkk ',
      '   kIk kIk   ',
      '   kkk kkk   ',
    ],
    [
      '     kWk     ',
      '     kLk     ',
      '     kLk     ',
      '    kNLNk    ',
      '   kNPPPNk   ',
      '  kNPPpPPNk  ',
      ' kNPPppppPNk ',
      'kNPPpppppppNk',
      'kNNppppppppNk',
      ' kkNNNNNNNkk ',
      '   kSk kSk   ',
      '   kkk kkk   ',
    ],
  ],
};

// A stationary gun platform: flat hexagonal hull, a full-width dark band (the
// same "one read" trick as ENEMY_ORB), twin barrels below. Toxic green rather
// than guard's red or lancer's violet, so the three elites stay tellable
// apart by hue in a mixed escort. Symmetric top-to-bottom on purpose — a
// turret has no "front" to fly toward, so it should not look like it does.
const ELITE_SENTINEL = {
  w: 15,
  frames: [
    [
      '    kGGGGGk    ',
      '   kGgggggGk   ',
      '  kGgggggggGk  ',
      'kNNNNNNNNNNNNNk',
      '  kGgggggggGk  ',
      '   kGgggggGk   ',
      '    kGGGGGk    ',
      '    kIk kIk    ',
      '    kkk kkk    ',
    ],
    [
      '    kGGGGGk    ',
      '   kGgggggGk   ',
      '  kGgggggggGk  ',
      'kNNNNNNNNNNNNNk',
      '  kGgggggggGk  ',
      '   kGgggggGk   ',
      '    kGGGGGk    ',
      '    kSk kSk    ',
      '    kkk kkk    ',
    ],
  ],
};

// TWIN VERTICAL VANE-BLADES flanking a violet core — the third elite, for the
// Darkness Realm. Guard reads as heavy armor plate and lancer as a single
// mounted lance; a PAIR of mounted blades is a third, distinct silhouette
// family rather than a recolour of either. Hull red (R/r), NOT the magenta
// V/v — that hue is reserved for the final boss alone (see PALETTE).
const ELITE_REAVER = {
  w: 15,
  frames: [
    [
      '    kRk kRk    ',
      '    kRk kRk    ',
      '  kNRNk kNRNk  ',
      '  kNNPPPPPNNk  ',
      ' kNPPppppPPNk  ',
      ' kNPPppIppPPNk ',
      'kNNPPppppPPNNk ',
      ' kNNPPPPPPNNk  ',
      '  kkNNNNNNkk   ',
      '   kLk  kLk    ',
    ],
    [
      '    kRk kRk    ',
      '    kRk kRk    ',
      '  kNRNk kNRNk  ',
      '  kNNPPPPPNNk  ',
      ' kNPPppppPPNk  ',
      ' kNPPppSppPPNk ',
      'kNNPPppppPPNNk ',
      ' kNNPPPPPPNNk  ',
      '  kkNNNNNNkk   ',
      '   kLk  kLk    ',
    ],
  ],
};

// A VERTICAL MAST TOPPED WITH A FLAG — "announces" the boss it flies beside.
// Escort for the chapter 1/2 bosses (commander, jailer). No other elite has a
// flag: lancer's mast is a plain point, so the banner is the one read.
const ELITE_HERALD = {
  w: 13,
  frames: [
    [
      '    kRRk     ',
      '    kRRk     ',
      '     kLk     ',
      '     kLk     ',
      '    kNPNk    ',
      '   kNPPPNk   ',
      '  kNPPpPPNk  ',
      ' kNPPpIpPPNk ',
      ' kNNPPppPPNNk',
      '  kkNNNNNNkk ',
      '  kLk  kLk   ',
    ],
    [
      '    kRRk     ',
      '    kRRk     ',
      '     kLk     ',
      '     kLk     ',
      '    kNPNk    ',
      '   kNPPPNk   ',
      '  kNPPpPPNk  ',
      ' kNPPpSpPPNk ',
      ' kNNPPppPPNNk',
      '  kkNNNNNNkk ',
      '  kLk  kLk   ',
    ],
  ],
};

// A WIDE FLAT SHIELD PLATE mounted at the front, wider than the hull below
// it — the opposite silhouette from guard's dome (narrow at top, bulging in
// the middle). Reads as "physically blocking" rather than just armored.
// Escort for the late bosses (warden, twin, the final destroyer).
const ELITE_BULWARK = {
  w: 17,
  frames: [
    [
      '  kLLLLLLLLLLLk  ',
      ' kNNNNNNNNNNNNNk ',
      ' kNRRRRRRRRRRRNk ',
      '  kRRNNNNNNNRRk  ',
      '   kRRNNNNNRRk   ',
      '    kRRPPPRRk    ',
      '    kRPPIPPRk    ',
      '     kRPPPRk     ',
      '      kRRRk      ',
      '     kkRRkk      ',
      '     kLk kLk     ',
    ],
    [
      '  kLLLLLLLLLLLk  ',
      ' kNNNNNNNNNNNNNk ',
      ' kNRRRRRRRRRRRNk ',
      '  kRRNNNNNNNRRk  ',
      '   kRRNNNNNRRk   ',
      '    kRRPPPRRk    ',
      '    kRPPSPPRk    ',
      '     kRPPPRk     ',
      '      kRRRk      ',
      '     kkRRkk      ',
      '     kLk kLk     ',
    ],
  ],
};

// ---------------------------------------------------------------------------
// BOSSES. Five chapter beats plus the final boss.
//
// Every one is read from a single mounted PROP rather than its silhouette, and
// none has a face. In the typing game the buried statue went through two face
// designs before becoming a colossal hand, and the final boss only stopped
// reading as a cartoon head when its maw moved to the torso. Same discipline:
//
//   BOSS_COMMANDER  — a crooked antenna mast, off-centre (chapter 1 finale)
//   BOSS_JAILER     — a cage clamp slung under the hull (chapter 2 rescues)
//   BOSS_WARDEN     — a chest padlock plate
//   BOSS_TWIN       — two unequal engine pods, one visibly larger
//   BOSS_DESTROYER  — the Galaxy Destroyer: a core lens low on the hull,
//                     never centred like an eye, in the game's only magenta
// ---------------------------------------------------------------------------

// The mast runs STRICTLY VERTICAL and sits off-centre. An earlier version
// stepped it diagonally (cols 7,7,6,6) and at gameplay scale the whole boss
// read as a featureless red blob — the diagonal dissolved into the hull edge.
// This is rule 2's "mounted props run vertical" earning its place a second
// time. The asymmetry now comes from WHERE the mast sits, not from bending it.
const BOSS_COMMANDER = {
  w: 23,
  frames: [
    [
      '      kIk              ',
      '      kLk              ',
      '      kLk              ',
      '      kLk              ',
      '      kLk              ',
      '    kNNLNNk            ',
      '  kNNNNNNNNNNk         ',
      ' kNRRRRRRRRRRRNk       ',
      'kNRRrrrrrrrrrRRNk      ',
      'kNRrrMMMMMMMMMrrRNk    ',
      'kNRrMMmmmmmmmMMrRNNk   ',
      'kNRrMmmWWWWWmmMrRRNNk  ',
      'kNRrMMmmmmmmmMMrRRRNNk ',
      'kNRrrMMMMMMMMMrrRRRRNNk',
      ' kNRRrrrrrrrrrRRRRRRNk ',
      '  kNNRRRRRRRRRRRRRNNk  ',
      '   kkNNNNNNNNNNNNNkk   ',
      '     kSk kSk kSk       ',
      '     kkk kkk kkk       ',
    ],
    [
      '      kSk              ',
      '      kLk              ',
      '      kLk              ',
      '      kLk              ',
      '      kLk              ',
      '    kNNLNNk            ',
      '  kNNNNNNNNNNk         ',
      ' kNRRRRRRRRRRRNk       ',
      'kNRRrrrrrrrrrRRNk      ',
      'kNRrrMMMMMMMMMrrRNk    ',
      'kNRrMMmmmmmmmMMrRNNk   ',
      'kNRrMmmIIIIImmMrRRNNk  ',
      'kNRrMMmmmmmmmMMrRRRNNk ',
      'kNRrrMMMMMMMMMrrRRRRNNk',
      ' kNRRrrrrrrrrrRRRRRRNk ',
      '  kNNRRRRRRRRRRRRRNNk  ',
      '   kkNNNNNNNNNNNNNkk   ',
      '     kOk kOk kOk       ',
      '     kkk kkk kkk       ',
    ],
  ],
};

const BOSS_JAILER = {
  w: 21,
  frames: [
    [
      '   kNNNNNNNNNNNk     ',
      '  kNPPPPPPPPPPPNk    ',
      ' kNPPppppppppppPNk   ',
      'kNPPppMMMMMMMppPPNk  ',
      'kNPppMMmmmmmMMppPNk  ',
      'kNPppMmmWWWmmMppPNk  ',
      'kNPppMMmmmmmMMppPNk  ',
      'kNPPppMMMMMMMppPPNk  ',
      ' kNPPppppppppppPNk   ',
      '  kNNPPPPPPPPPNNk    ',
      '   kkNNNNNNNNNkk     ',
      '    kLk     kLk      ',
      '    kLLLLLLLLLk      ',   // the cage clamp, slung under the hull
      '    kLkkLkkLkLk      ',
      '    kkk kkk kkk      ',
    ],
    [
      '   kNNNNNNNNNNNk     ',
      '  kNPPPPPPPPPPPNk    ',
      ' kNPPppppppppppPNk   ',
      'kNPPppMMMMMMMppPPNk  ',
      'kNPppMMmmmmmMMppPNk  ',
      'kNPppMmmIIImmMppPNk  ',
      'kNPppMMmmmmmMMppPNk  ',
      'kNPPppMMMMMMMppPPNk  ',
      ' kNPPppppppppppPNk   ',
      '  kNNPPPPPPPPPNNk    ',
      '   kkNNNNNNNNNkk     ',
      '    kLk     kLk      ',
      '    kLLLLLLLLLk      ',
      '    kLkkLkkLkLk      ',
      '    kSk kSk kSk      ',
    ],
  ],
};

const BOSS_WARDEN = {
  w: 21,
  frames: [
    [
      '    kNNNNNNNNNNNk    ',
      '   kNRRRRRRRRRRRNk   ',
      '  kNRRrrrrrrrrrRRNk  ',
      ' kNRRrrrrrrrrrrrRRNk ',
      'kNRRrrrLLLLLLLrrrRRNk',
      'kNRrrrLLMMMMMLLrrrRNk',
      'kNRrrrLLMmImMLLrrrRNk',   // the padlock plate — a keyhole, not an eye
      'kNRrrrLLMMMMMLLrrrRNk',
      'kNRRrrrLLLLLLLrrrRRNk',
      ' kNRRrrrrrrrrrrrRRNk ',
      '  kNNRRRRRRRRRRRNNk  ',
      '   kkNNNNNNNNNNNkk   ',
      '    kSk  kSk  kSk    ',
      '    kkk  kkk  kkk    ',
    ],
    [
      '    kNNNNNNNNNNNk    ',
      '   kNRRRRRRRRRRRNk   ',
      '  kNRRrrrrrrrrrRRNk  ',
      ' kNRRrrrrrrrrrrrRRNk ',
      'kNRRrrrLLLLLLLrrrRRNk',
      'kNRrrrLLMMMMMLLrrrRNk',
      'kNRrrrLLMmWmMLLrrrRNk',
      'kNRrrrLLMMMMMLLrrrRNk',
      'kNRRrrrLLLLLLLrrrRRNk',
      ' kNRRrrrrrrrrrrrRRNk ',
      '  kNNRRRRRRRRRRRNNk  ',
      '   kkNNNNNNNNNNNkk   ',
      '    kOk  kOk  kOk    ',
      '    kkk  kkk  kkk    ',
    ],
  ],
};

// Two engine pods of DIFFERENT sizes — the asymmetry is the read.
const BOSS_TWIN = {
  w: 23,
  frames: [
    [
      '  kNNNNk      kNNk     ',
      ' kNPPPPNk    kNPPNk    ',
      'kNPPppppPNk  kNPpPNk   ',
      'kNPppMMMppNkkNPppPNk   ',
      'kNPpMmmmMpNNNNPppPNk   ',
      'kNPpMmWWmMpPPPPppPNk   ',
      'kNPpMmmmmMpppppppPNk   ',
      'kNPppMMMMMppppppPNk    ',
      ' kNPPpppppppppPPNk     ',
      '  kNNPPPPPPPPPNNk      ',
      '   kkNNNNNNNNNkk       ',
      '    kSk   kSSk         ',
      '    kkk   kkkk         ',
    ],
    [
      '  kNNNNk      kNNk     ',
      ' kNPPPPNk    kNPPNk    ',
      'kNPPppppPNk  kNPpPNk   ',
      'kNPppMMMppNkkNPppPNk   ',
      'kNPpMmmmMpNNNNPppPNk   ',
      'kNPpMmIImMpPPPPppPNk   ',
      'kNPpMmmmmMpppppppPNk   ',
      'kNPppMMMMMppppppPNk    ',
      ' kNPPpppppppppPPNk     ',
      '  kNNPPPPPPPPPNNk      ',
      '   kkNNNNNNNNNkk       ',
      '    kOk   kOOk         ',
      '    kkk   kkkk         ',
    ],
  ],
};

// THE GALAXY DESTROYER — Kẻ Huỷ Diệt Ngân Hà.
//
// The largest sprite in the game and the only user of magenta V/v. Its core
// lens sits LOW and slightly LEFT of centre, never centred: a centred round
// glow between two symmetric hull halves is exactly the cartoon-face read that
// ruined the typing game's first final boss. Four asymmetric spires above,
// three unequal engines below.
const BOSS_DESTROYER = {
  w: 31,
  frames: [
    [
      '     kLk    kLk   kLk          ',
      '     kLk    kLk   kLk          ',
      '   kLkLk  kLkLk   kLk kLk      ',
      '   kNNNNNNNNNNNNNNNNNNNk      ',
      '  kNnnnnnnnnnnnnnnnnnnnNk     ',
      ' kNnnPPPPPPPPPPPPPPPPPnnNk    ',
      'kNnnPPppppppppppppppppPPnnNk   ',
      'kNnPPppMMMMMMMMMMMMMppPPnNk    ',
      'kNnPpMMmmmmmmmmmmmmMMpPnNk     ',
      'kNnPpMmmVVVVVVVmmmmmMpPnNk     ',
      'kNnPpMmVVvvvvvVVmmmmMpPnNk     ',
      'kNnPpMmmVVVVVVVmmmmmMpPnNk     ',
      'kNnPpMMmmmmmmmmmmmmMMpPnNk     ',
      'kNnPPppMMMMMMMMMMMMMppPPnNk    ',
      'kNnnPPppppppppppppppppPPnnNk   ',
      ' kNnnPPPPPPPPPPPPPPPPPnnNk    ',
      '  kNnnnnnnnnnnnnnnnnnnnNk     ',
      '   kkNNNNNNNNNNNNNNNNNkk      ',
      '    kSSk  kSSSk   kSSk        ',
      '    kSk    kSk     kSk        ',
      '    kkk    kkk     kkk        ',
    ],
    [
      '     kLk    kLk   kLk          ',
      '     kLk    kLk   kLk          ',
      '   kLkLk  kLkLk   kLk kLk      ',
      '   kNNNNNNNNNNNNNNNNNNNk      ',
      '  kNnnnnnnnnnnnnnnnnnnnNk     ',
      ' kNnnPPPPPPPPPPPPPPPPPnnNk    ',
      'kNnnPPppppppppppppppppPPnnNk   ',
      'kNnPPppMMMMMMMMMMMMMppPPnNk    ',
      'kNnPpMMmmmmmmmmmmmmMMpPnNk     ',
      'kNnPpMmmVVVVVVVmmmmmMpPnNk     ',
      'kNnPpMmVVWWWWWVVmmmmMpPnNk     ',
      'kNnPpMmmVVVVVVVmmmmmMpPnNk     ',
      'kNnPpMMmmmmmmmmmmmmMMpPnNk     ',
      'kNnPPppMMMMMMMMMMMMMppPPnNk    ',
      'kNnnPPppppppppppppppppPPnnNk   ',
      ' kNnnPPPPPPPPPPPPPPPPPnnNk    ',
      '  kNnnnnnnnnnnnnnnnnnnnNk     ',
      '   kkNNNNNNNNNNNNNNNNNkk      ',
      '    kOOk  kOOOk   kOOk        ',
      '    kOk    kOk     kOk        ',
      '    kkk    kkk     kkk        ',
    ],
  ],
};

// ---------------------------------------------------------------------------
// Projectiles. Small, high-contrast, and deliberately PLAIN — the tracer must
// never compete with the quest box for the kid's attention.
//
// Enemy fire is VIOLET and the kid's is TEAL/GOLD, never the reverse: in a busy
// frame hue is the fastest way to tell "mine" from "incoming".
// ---------------------------------------------------------------------------

const SHOT_PLASMA = {
  w: 3,
  frames: [
    ['kTk', 'kTk', 'kTk', 'ktk'],
  ],
};

const SHOT_LASER = {
  w: 3,
  frames: [
    ['kCk', 'kCk', 'kCk', 'kCk', 'kck', 'kck'],
  ],
};

const SHOT_MISSILE = {
  w: 5,
  frames: [
    [' kIk ', 'kIYIk', 'kYYYk', 'kYyYk', ' kOk ', ' kok '],
    [' kIk ', 'kIYIk', 'kYYYk', 'kYyYk', ' kSk ', ' kOk '],
  ],
};

// The ultimate — Siêu Công Thức. Wide, gold-white, and the only projectile
// that reads as a BEAM rather than a bolt.
const SHOT_ULTIMATE = {
  w: 9,
  frames: [
    ['kYWWWWWYk', 'kYWWWWWYk', 'kYWWWWWYk', 'kIYWWWYIk', 'kIIYWYIIk', ' kIIYIIk '],
  ],
};

const SHOT_ENEMY = {
  w: 3,
  frames: [
    ['kPk', 'kPk', 'kpk'],
  ],
};

const SHOT_ENEMY_HEAVY = {
  w: 5,
  frames: [
    [' kVk ', 'kVvVk', 'kVvVk', ' kvk '],
    [' kVk ', 'kVWVk', 'kVvVk', ' kvk '],
  ],
};

export const SPRITES = {
  // friendly
  ship_hero: SHIP_HERO,

  // creeps
  enemy_dart: ENEMY_DART,
  enemy_drone: ENEMY_DRONE,
  enemy_fang: ENEMY_FANG,
  enemy_wedge: ENEMY_WEDGE,
  enemy_orb: ENEMY_ORB,
  enemy_spike: ENEMY_SPIKE,
  enemy_husk: ENEMY_HUSK,
  enemy_shard: ENEMY_SHARD,
  enemy_wraith: ENEMY_WRAITH,

  // elites
  elite_guard: ELITE_GUARD,
  elite_lancer: ELITE_LANCER,
  elite_sentinel: ELITE_SENTINEL,
  elite_reaver: ELITE_REAVER,
  elite_herald: ELITE_HERALD,
  elite_bulwark: ELITE_BULWARK,

  // bosses
  boss_commander: BOSS_COMMANDER,
  boss_jailer: BOSS_JAILER,
  boss_warden: BOSS_WARDEN,
  boss_twin: BOSS_TWIN,
  boss_destroyer: BOSS_DESTROYER,

  // projectiles
  shot_plasma: SHOT_PLASMA,
  shot_laser: SHOT_LASER,
  shot_missile: SHOT_MISSILE,
  shot_ultimate: SHOT_ULTIMATE,
  shot_enemy: SHOT_ENEMY,
  shot_enemy_heavy: SHOT_ENEMY_HEAVY,
};

// The five allies are generated, not hand-drawn — see allySprite(). Registered
// here so SPRITES lookups by id work uniformly for every entity in the game.
for (const style of Object.keys(ALLY_STYLES)) {
  SPRITES[`ally_${style}`] = allySprite(style);
}

// ---------------------------------------------------------------------------
// RANK SKINS — the hero ship wearing its pilot's rank.
//
// Same technique as allySprite(): ONE hand-drawn hull, remapped. A rank skin is
// DATA (a trim char + a pip count), not a new sprite, for the reason stated at
// ALLY_TEMPLATE — six near-identical hand-drawn hulls is six chances for one to
// drift out of style, and here it would be six chances to break the silhouette
// rules that cost three redraws to get right.
//
// WHAT VARIES, AND WHAT MAY NOT:
//   * trim (Y/y) is recoloured per rank        <- the read
//   * wing PIPS mark the top three ranks       <- the count
//   * the hull (B/b), cockpit (C/c), thrusters and the OUTLINE never change
//
// The hull is off-limits because verify.js enforces friendly-ships-are-cool: a
// warm or violet hero would collide with the one hue rule the game uses to tell
// "mine" from "incoming" in a busy frame. And the silhouette is off-limits
// because a cell appearing outside the thruster zone reads as the hull
// lurching (also asserted) — so pips are placed ON existing trim cells, never
// added outside the hull.
//
// Rank order matches RANKS in rank.js by INDEX. rank.js owns the thresholds;
// this file owns only how a rank looks.
export const RANK_SKINS = [
  { trim: '1', pips: 0 },  // Tập Sự
  { trim: '2', pips: 0 },  // Phi Công
  { trim: '3', pips: 0 },  // Thiếu Uý
  { trim: '4', pips: 1 },  // Đại Uý
  { trim: '5', pips: 2 },  // Chỉ Huy Trưởng
  { trim: '6', pips: 3 },  // Sao Trưởng
];

// Row 8 of SHIP_HERO is the widest wing line ('kYYBBBBBBBBBYYk'), so it is
// where a rank marking is most visible at gameplay scale. Pips replace HULL
// cells symmetrically inward from the wing tips — inside the existing
// silhouette, so no cell appears or vanishes outside the thruster zone.
const PIP_ROW = 8;

function applyPips(rows, count, trim) {
  if (count <= 0) return rows;
  const out = rows.slice();
  const row = out[PIP_ROW];
  if (!row) return out;
  const cells = row.split('');
  // Walk inward from both wing tips, marking the first `count` hull cells on
  // each side. Symmetric, because an asymmetric marking on the hero would read
  // as damage rather than decoration.
  let marked = 0;
  for (let i = 3; i < cells.length / 2 && marked < count; i++) {
    if (cells[i] === 'B') {
      cells[i] = trim;
      cells[cells.length - 1 - i] = trim;
      marked++;
    }
  }
  out[PIP_ROW] = cells.join('');
  return out;
}

const _heroCache = new Map();

// The hero sprite for a given rank INDEX (0-based, matching RANKS). Cached, and
// falls back to the trainee skin for an out-of-range index rather than throwing
// — a bad rank must never be able to blank the ship.
export function heroSprite(rankIndex = 0) {
  const i = Math.max(0, Math.min(RANK_SKINS.length - 1, rankIndex | 0));
  if (_heroCache.has(i)) return _heroCache.get(i);
  const skin = RANK_SKINS[i];
  const sprite = {
    w: SHIP_HERO.w,
    frames: SHIP_HERO.frames.map((f) => {
      const trimmed = f.map((row) =>
        row.replace(/Y/g, skin.trim).replace(/y/g, skin.trim));
      return applyPips(trimmed, skin.pips, skin.trim);
    }),
  };
  _heroCache.set(i, sprite);
  return sprite;
}

// Registered so every rank skin is reachable by id and gets validated by
// verify.js's sprite sweep alongside every other sprite in the game.
for (let i = 0; i < RANK_SKINS.length; i++) {
  SPRITES[`ship_hero_r${i}`] = heroSprite(i);
}
