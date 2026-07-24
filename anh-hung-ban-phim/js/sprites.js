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
};

// --- Hero: base skin "Knight" (facing right). 14 x 16, outlined + shaded. ---
export const HERO_KNIGHT = {
  w: 14,
  h: 16,
  frames: [
    [
      '    kkkk      ',
      '   kYYYYk     ',
      '  kYYYYYYk    ',
      '  kYWWWWYk    ',
      '  kSSSSSSk    ',
      '  kSWkSWSk    ',
      '   kSSSSk     ',
      '  kkBBBBkk    ',
      ' kBBbBBbBBk   ',
      'kBkBBBBBBkBk  ',
      'kBkBBbbBBkBk  ',
      'kkk BBBB kkk  ',
      '   kBBkBBk    ',
      '   kbk kbk    ',
      '  kkk   kkk   ',
      '              ',
    ],
    [
      '    kkkk      ',
      '   kYYYYk     ',
      '  kYYYYYYk    ',
      '  kYWWWWYk    ',
      '  kSSSSSSk    ',
      '  kSWkSWSk    ',
      '   kSSSSk     ',
      '  kkBBBBkk    ',
      ' kBBbBBbBBk   ',
      'kBkBBBBBBkBk  ',
      'kBkBBbbBBkBk  ',
      'kkk BBBB kkk  ',
      '   kBBkBBk    ',
      '  kbk   kbk   ',
      ' kkk     kkk  ',
      '              ',
    ],
  ],
};

// --- Hero skin "Mage" (reward). Purple robe + pointed hat. ---
export const HERO_MAGE = {
  w: 14,
  h: 16,
  frames: [
    [
      '    kk        ',
      '   kPPk       ',
      '  kPPPPk      ',
      ' kPPPPPPk     ',
      '  kSSSSk      ',
      '  kSWkSk      ',
      '   kSSk       ',
      '  kkPPPPkk    ',
      ' kPPpPPpPPk   ',
      'kPkPPPPPPkYk  ',
      'kPkPPppPPkYk  ',
      'kkk PPPP kkk  ',
      '   kPPkPPk    ',
      '   kpk kpk    ',
      '  kkk   kkk   ',
      '              ',
    ],
    [
      '    kk        ',
      '   kPPk       ',
      '  kPPPPk      ',
      ' kPPPPPPk     ',
      '  kSSSSk      ',
      '  kSWkSk      ',
      '   kSSk       ',
      '  kkPPPPkk    ',
      ' kPPpPPpPPk   ',
      'kPkPPPPPPkYk  ',
      'kPkPPppPPkYk  ',
      'kkk PPPP kkk  ',
      '   kPPkPPk    ',
      '  kpk   kpk   ',
      ' kkk     kkk  ',
      '              ',
    ],
  ],
};

// --- Princess (to be rescued). Crown + gown. 12 x 16 ---
export const PRINCESS = {
  w: 12,
  h: 16,
  frames: [
    [
      ' k k k k    ',
      ' kYkYkYk    ',
      ' kYYYYYk    ',
      '  kkkkk     ',
      ' kHSSSSHk   ',
      ' kSSWkSWk   ',
      ' kSSSSSSk   ',
      '  kSSSSk    ',
      '  kPPPPk    ',
      ' kPPPPPPk   ',
      ' kPpPPpPk   ',
      'kPPPPPPPPk  ',
      'kPPPPPPPPk  ',
      'kPpPPPPpPk  ',
      ' kkkkkkkk   ',
      '            ',
    ],
  ],
};

// --- Creep monster: "Slime" (green, outlined). 12 x 10 ---
export const CREEP_SLIME = {
  w: 12,
  h: 10,
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
      '             ',
    ],
    [
      '             ',
      '    kkkk     ',
      '   kGGGGk    ',
      '  kGWkGWGk   ',
      ' kGGkGGGkk   ',
      'kGGGGGGGGGk  ',
      'kGgGGGGgGGk  ',
      'kGGGGGGGGGk  ',
      ' kkkkkkkkk   ',
      '             ',
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

// --- Stage Boss: "Giant Ogre" (green, tusked, outlined). 20 x 20 ---
export const STAGEBOSS_OGRE = {
  w: 20,
  h: 20,
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
      '                    ',
      '                    ',
    ],
  ],
};

export const SPRITES = {
  hero_knight: HERO_KNIGHT,
  hero_mage: HERO_MAGE,
  princess: PRINCESS,
  creep_slime: CREEP_SLIME,
  boss_dragon: BOSS_DRAGON,
  stageboss_ogre: STAGEBOSS_OGRE,
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
