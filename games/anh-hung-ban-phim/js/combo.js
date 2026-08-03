// combo.js — the skill-combo system that rewards clean, fast typing.
//
// A combo counts consecutive words typed WITHOUT a mistake. It climbs on every
// clean kill and resets to 0 on a wrong keystroke or when the hero is hit.
//
// The combo grants a damage/juice multiplier in tiers, so typing cleanly makes
// bosses fall faster and every hit look bigger. Milestone combos (every
// MILESTONE_EVERY) trigger a bonus "combo blast" flourish.
//
// This module holds ONLY state + derived values; main.js reads them to scale
// damage, particles, shake, and to drive the HUD meter. No rendering here.

export const MILESTONE_EVERY = 5;

// Combo tiers: at `min` combo, hits deal `dmg`x damage and gain the label/color
// for the HUD. Ordered high→low so `tierFor` returns the first match.
const TIERS = [
  { min: 10, dmg: 3.0, label: 'SIÊU CẤP!', color: '#ff5ecb', emoji: '🌈' }, // "SUPER!"
  { min: 6, dmg: 2.0, label: 'RỰC LỬA!', color: '#ff8a2b', emoji: '🔥' },  // "ON FIRE!"
  { min: 3, dmg: 1.5, label: 'TUYỆT!', color: '#ffd24a', emoji: '⭐' },     // "GREAT!"
  { min: 0, dmg: 1.0, label: '', color: '#fff4d6', emoji: '' },
];

export function tierFor(combo) {
  return TIERS.find((t) => combo >= t.min);
}

export class Combo {
  constructor() {
    this.count = 0;      // current combo
    this.best = 0;       // best combo this stage (for a little flair)
    this.pulse = 0;      // 0..1 pop animation, set to 1 on increment, decays
    this.flashTier = ''; // label of the tier we just crossed into (for a banner)
    this.bannerTimer = 0;// frames the milestone/tier banner stays up
  }

  reset() {
    this.count = 0;
    this.pulse = 0;
    this.flashTier = '';
    this.bannerTimer = 0;
  }

  // Called on a clean word completion. Returns info the game uses to react:
  //   { multiplier, milestone, tierUp }
  increment() {
    const prevTier = tierFor(this.count);
    this.count++;
    if (this.count > this.best) this.best = this.count;
    this.pulse = 1;
    const tier = tierFor(this.count);
    const tierUp = tier.min > prevTier.min; // crossed into a stronger tier
    const milestone = this.count > 0 && this.count % MILESTONE_EVERY === 0;
    if (tierUp && tier.label) {
      this.flashTier = tier.label;
      this.bannerTimer = 90;
    }
    if (milestone) this.bannerTimer = Math.max(this.bannerTimer, 90);
    return { multiplier: tier.dmg, milestone, tierUp };
  }

  // Called when the combo breaks (mistake or hero hit). Returns true if a combo
  // was actually lost (so the game can play a "combo drop" cue only when > 0).
  break() {
    const lost = this.count > 0;
    this.reset();
    return lost;
  }

  get multiplier() {
    return tierFor(this.count).dmg;
  }

  get tier() {
    return tierFor(this.count);
  }

  update() {
    if (this.pulse > 0.01) this.pulse *= 0.85;
    else this.pulse = 0;
    if (this.bannerTimer > 0) this.bannerTimer--;
  }
}
