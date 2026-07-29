// allies.js — the five rescued wingmen.
//
// Each ally is DATA: an id, a sprite colorway (see ALLY_STYLES in sprites.js), a
// formation slot, and one gift that changes how the ship plays. A new ally would
// be a new entry here plus an ALLY_STYLES colorway — no new hand-drawn sprite,
// no new mechanic plumbing.
//
// THE POINT OF ALLIES, and why they are entities rather than HUD icons:
// chapter 2 asks the kid to do twelve stages of rescues, and the reward has to be
// FELT every wave afterwards, not read once in a menu. So each wingman is a live
// ship that flies in formation and fires its own tracer on every volley. By the
// Darkness Realm the screen visibly puts out three times the fire it did in
// Earth orbit — that escalation IS the chapter's payoff, and balance.js counts on
// it (see volleySize: the late fleets are only affordable because of them).

// Fixed offsets behind the kid's ship, in "ship widths" — main.js and scenes.js
// both multiply by their own scale.
//
// Assignment is by SLOT, not by rescue order, so the formation looks composed
// rather than accreted and stays stable across saves. A trailing V: two high on
// the flanks, two low, one tail.
export const LINEUP_SLOTS = [
  { dx: -1.7, dy: 0.55 },   // slot 0 — left inner
  { dx: 1.7, dy: 0.55 },    // slot 1 — right inner
  { dx: -2.9, dy: 1.35 },   // slot 2 — left outer
  { dx: 2.9, dy: 1.35 },    // slot 3 — right outer
  { dx: 0, dy: 1.7 },       // slot 4 — tail
];

export const ALLIES = [
  {
    id: 'engineer',
    style: 'engineer',
    name: 'Bé Ốc',
    slot: 0,
    gift: 'repair',
  },
  {
    id: 'gunner',
    style: 'gunner',
    name: 'Tia Chớp',
    slot: 1,
    gift: 'wingCannon',
  },
  {
    id: 'shieldman',
    style: 'shieldman',
    name: 'Vòm Xanh',
    slot: 2,
    gift: 'shield',
  },
  {
    id: 'navigator',
    style: 'navigator',
    name: 'La Bàn',
    slot: 3,
    gift: 'extraRepair',
  },
  {
    id: 'scientist',
    style: 'scientist',
    name: 'Giáo Sư Sao',
    slot: 4,
    gift: 'ultimate',
  },
];

export function getAlly(id) {
  return ALLIES.find((a) => a.id === id) || null;
}

// Resolve a list of ally ids into the effects they grant.
//
// Returns plain numbers rather than mutating anything, so a retry always
// recomputes from the same save data and a gift can never be applied twice.
export function allyEffects(ids) {
  const out = {
    repairPerWave: 0,     // hull restored between waves
    extraShots: 0,        // wing cannons
    shieldPerWave: 0,     // hits absorbed per wave
    repairBonus: 0,       // extra health mended per correct answer
    hasUltimate: false,
  };
  for (const id of ids) {
    const a = getAlly(id);
    if (!a) continue;
    switch (a.gift) {
      case 'repair': out.repairPerWave += 1; break;
      case 'wingCannon': out.extraShots += 1; break;
      case 'shield': out.shieldPerWave += 1; break;
      // La Bàn's gift is the one that most directly helps a struggling player:
      // more health back per answer, so a kid who is taking hits can dig out of it
      // by doing the thing the game is teaching.
      case 'extraRepair': out.repairBonus += 0.25; break;
      case 'ultimate': out.hasUltimate = true; break;
    }
  }
  return out;
}
