// entities.js — game actors: Hero, Monster (Creep/Boss/StageBoss), Projectile.
//
// All positions are in screen pixels. Sprites are drawn by the game loop using
// render.drawSprite; entities just hold state + update logic.

import { SPRITES, heroSprite } from './sprites.js';
import { DOT } from './render.js';

export const MONSTER_KIND = {
  CREEP: 'creep',
  BOSS: 'boss',
  STAGEBOSS: 'stageboss',
};

// Cleanly typed words needed to fill the Staff of Wisdom's charge meter. Five is
// tuned so a kid meets a charged strike a few times per stage — often enough to
// feel like theirs, rare enough to stay a moment.
export const STAFF_CHARGE_FULL = 5;

export class Hero {
  constructor(x, groundY) {
    this.x = x;
    this.groundY = groundY;
    this.scale = 1.4; // wider landscape world, nudged up a touch for presence
    this.maxHp = 1000;
    this.hp = 1000;
    this.frame = 0;
    this.animTimer = 0;
    // Derived from equipped weapon (Milestone 4+); defaults for now.
    this.damage = 25;
    this.attackAnim = 0; // counts down while showing an attack lunge
    this.attackMax = 14; // total frames of the lunge
    this.hurtRecoil = 0; // >0 while recoiling backward from taking a hit

    // --- The Staff of Wisdom (chapter 2's artifact reward) -----------------
    // Set by rewards.applyRewards. `staffCharge` counts CLEANLY typed words
    // toward STAFF_CHARGE_FULL; at full, the next completed word fires an
    // empowered hit (bigger effect, extra damage, and the only thing that
    // pierces the World Devourer's shielded phase).
    //
    // Charging on CLEAN words specifically is the point: the artifact rewards
    // typing accurately, not fast. A kid who backspaces their way through a word
    // gets no charge from it.
    this.hasStaff = false;
    this.staffCharge = 0;
  }

  // Words of clean typing needed to fill the Staff.
  get staffChargeFull() {
    return STAFF_CHARGE_FULL;
  }

  get staffReady() {
    return this.hasStaff && this.staffCharge >= STAFF_CHARGE_FULL;
  }

  // A cleanly typed word charges the Staff. Returns true on the frame it becomes
  // full (so the caller can play the "charged!" cue exactly once).
  chargeStaff() {
    if (!this.hasStaff || this.staffCharge >= STAFF_CHARGE_FULL) return false;
    this.staffCharge++;
    return this.staffCharge >= STAFF_CHARGE_FULL;
  }

  // Spend a full charge on an empowered strike.
  spendStaff() {
    if (!this.staffReady) return false;
    this.staffCharge = 0;
    return true;
  }

  // Smooth 0..1 lunge amount (peaks early, eases back) for the attack animation.
  get lungeAmount() {
    if (this.attackAnim <= 0) return 0;
    const p = this.attackAnim / this.attackMax; // 1 -> 0 over the anim
    return Math.sin(p * Math.PI); // 0 at start/end, 1 at midpoint
  }

  // The blade is tinted to the equipped weapon's color (set by
  // rewards.applyRewards), so earning "Kiếm Lửa" visibly changes the sword the
  // kid is holding. heroSprite() caches per color and returns the shared base
  // sprite when no weapon is equipped yet.
  get sprite() {
    return heroSprite(this.weaponColor);
  }

  get y() {
    return this.groundY - this.sprite.h * DOT * this.scale;
  }

  update() {
    this.animTimer++;
    if (this.animTimer % 10 === 0) this.frame = (this.frame + 1) % this.sprite.frames.length;
    if (this.attackAnim > 0) this.attackAnim--;
    if (this.hurtRecoil > 0.3) this.hurtRecoil *= 0.75;
    else this.hurtRecoil = 0;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.hurtRecoil = 14; // shove backward on getting hit
  }

  get isDead() {
    return this.hp <= 0;
  }

  triggerAttack() {
    this.attackAnim = this.attackMax;
  }
}

export class Monster {
  constructor(kind, spriteId, x, groundY, opts = {}) {
    this.kind = kind;
    this.spriteId = spriteId;
    this.x = x;
    this.groundY = groundY;
    // wider landscape world, nudged up a touch for presence
    this.scale = opts.scale || (kind === MONSTER_KIND.CREEP ? 1.4 : kind === MONSTER_KIND.BOSS ? 1.75 : 2.1);
    this.speed = opts.speed || 0.4; // px per frame, marches toward the hero (left)
    this.frame = 0;
    this.animTimer = 0;

    // Combat: a monster is killed by completing `hitsNeeded` target words.
    this.maxHits = opts.hitsNeeded || 1;
    this.hitsLeft = this.maxHits;

    // Damage dealt to the hero if it reaches him or a word is fumbled.
    this.contactDamage = opts.contactDamage || (kind === MONSTER_KIND.CREEP ? 15 : kind === MONSTER_KIND.BOSS ? 25 : 20);

    // Bosses hold their ground at range and attack on a timer instead of
    // walking into the hero. Creeps march to contact.
    this.stationary = opts.stationary || kind !== MONSTER_KIND.CREEP;
    this.standGap = opts.standGap || 340;       // where a stationary boss stops
    this.attackEvery = opts.attackEvery || 420;  // frames between boss attacks (~7s @60fps — give kids time to type)
    this.attackTimer = this.attackEvery;
    this.attackDamage = opts.attackDamage || (kind === MONSTER_KIND.STAGEBOSS ? 18 : 12);
    this.wantsToAttack = false;                  // set true when timer elapses

    this.dying = false;
    this.deathTimer = 0;

    // Hit reaction: brief white flash + knockback shove when struck.
    this.hitFlash = 0;     // frames of white-flash remaining
    this.knockback = 0;    // horizontal px offset pushed back (decays to 0)

    // --- Multi-phase bosses (the World Devourer, stage 26) ------------------
    // `opts.phases` is a list of { name, hits, shielded?, attackEvery?,
    // attackDamage? }. Instead of one long health bar, the fight becomes several
    // shorter ones: exhausting a phase's hits does NOT kill the monster, it
    // advances to the next phase (a flourish + a fresh bar + harder attacks).
    // The final phase's last hit kills it.
    //
    // `shielded` marks a phase that ORDINARY hits cannot damage — only an
    // empowered (charged-Staff) hit gets through. main.js checks
    // `isShielded` before applying damage and shows the kid a hint.
    this.phases = Array.isArray(opts.phases) && opts.phases.length ? opts.phases : null;
    this.phaseIndex = 0;
    this.phaseFlash = 0;   // frames of phase-transition flourish remaining
    if (this.phases) {
      const p = this.phases[0];
      this.maxHits = p.hits || this.maxHits;
      this.hitsLeft = this.maxHits;
      if (p.attackEvery) {
        this.attackEvery = p.attackEvery;
        this.attackTimer = p.attackEvery;
      }
      if (p.attackDamage) this.attackDamage = p.attackDamage;
    }
  }

  // The current phase object, or null for an ordinary single-phase monster.
  get phase() {
    return this.phases ? this.phases[this.phaseIndex] : null;
  }

  // Is this monster currently immune to ordinary hits? (Only a charged-Staff hit
  // pierces a shielded phase — see onProjectileHit in main.js.)
  get isShielded() {
    const p = this.phase;
    return !!(p && p.shielded);
  }

  // Is there another phase after the current one?
  get hasNextPhase() {
    return !!(this.phases && this.phaseIndex + 1 < this.phases.length);
  }

  // Advance to the next phase: refill the bar, take on that phase's attack
  // cadence, and start the transition flourish. Returns the new phase.
  advancePhase() {
    this.phaseIndex++;
    const p = this.phases[this.phaseIndex];
    this.maxHits = p.hits || this.maxHits;
    this.hitsLeft = this.maxHits;
    if (p.attackEvery) {
      this.attackEvery = p.attackEvery;
      this.attackTimer = p.attackEvery;
    }
    if (p.attackDamage) this.attackDamage = p.attackDamage;
    this.phaseFlash = 40;
    // A phase change shoves him back hard — it should FEEL like a turning point.
    this.knockback = 22;
    this.hitFlash = 10;
    return p;
  }

  // The name to show on the health bar: a phase's own name when it has one, so
  // the kid sees the fight escalate ("Shadow Shield" → "Fury" → "Desperation").
  get barName() {
    const p = this.phase;
    return (p && p.name) || this.displayName;
  }

  // Called when a projectile lands (whether or not it defeats the monster).
  reactToHit() {
    this.hitFlash = 6;
    // Bosses are heavier → shoved back less than a light creep.
    this.knockback = this.kind === MONSTER_KIND.CREEP ? 16 : this.kind === MONSTER_KIND.BOSS ? 9 : 6;
  }

  get sprite() {
    return SPRITES[this.spriteId];
  }

  get y() {
    return this.groundY - this.sprite.h * DOT * this.scale;
  }

  get width() {
    return this.sprite.w * DOT * this.scale;
  }

  update(heroX) {
    this.animTimer++;
    if (this.animTimer % 15 === 0) this.frame = (this.frame + 1) % this.sprite.frames.length;

    // Decay hit-reaction state each frame.
    if (this.hitFlash > 0) this.hitFlash--;
    if (this.phaseFlash > 0) this.phaseFlash--;
    if (this.knockback > 0.3) this.knockback *= 0.7;
    else this.knockback = 0;

    if (this.dying) {
      this.deathTimer++;
      return;
    }

    if (this.stationary) {
      // Walk in to standing range, then hold and attack on a timer.
      if (this.x > heroX + this.standGap) {
        this.x -= this.speed;
      } else {
        this.attackTimer--;
        if (this.attackTimer <= 0) {
          this.wantsToAttack = true;
          this.attackTimer = this.attackEvery;
        }
      }
      return;
    }
    // Creep: march toward the hero until actual contact.
    if (this.x > heroX + this.contactGap) this.x -= this.speed;
  }

  // Consume a pending boss attack (returns damage or 0). Game calls this.
  takeAttack() {
    if (!this.wantsToAttack) return 0;
    this.wantsToAttack = false;
    return this.attackDamage;
  }

  // Distance from the hero at which the monster makes contact and deals damage.
  get contactGap() {
    return 150;
  }

  // Killed by the player's typing (counts toward score).
  //
  // For a multi-phase boss, running the bar to zero does not kill it while
  // another phase remains — it advances instead. Returns 'phase' when that
  // happened, 'dead' when the monster actually died, or '' otherwise, so main.js
  // can play the right flourish.
  registerHit() {
    this.hitsLeft = Math.max(0, this.hitsLeft - 1);
    if (this.hitsLeft > 0) return '';
    if (this.hasNextPhase) {
      this.advancePhase();
      return 'phase';
    }
    this.dying = true;
    this.deathTimer = 0;
    this.killedByPlayer = true;
    return 'dead';
  }

  // "Out of hit points AND out of phases" — i.e. actually finished. A phased boss
  // whose current bar is empty but has another phase left is NOT defeated, and
  // this is what stops main.js's damage loop from over-killing through phases in
  // one landing (see the hitPower loop in onProjectileHit).
  get isDefeated() {
    return this.hitsLeft === 0 && !this.hasNextPhase;
  }

  // True once the death animation has fully played and the monster can be removed.
  get isGone() {
    return this.dying && this.deathTimer > 24;
  }

  // Has it marched all the way to the hero? (deals contact damage, no kill credit)
  reachedHero(heroX) {
    return !this.dying && this.x <= heroX + this.contactGap;
  }
}

export class Projectile {
  // A dot-particle attack flying from hero toward a target x.
  constructor(x, y, targetX, opts = {}) {
    this.x = x;
    this.y = y;
    this.targetX = targetX;
    this.speed = opts.speed || 14;
    this.color = opts.color || '#e8c33a';
    this.size = opts.size || DOT * 2;
    this.trail = [];
    this.done = false;
    this.special = opts.special || false;
  }

  update() {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 10) this.trail.shift();
    this.x += this.speed;
    if (this.x >= this.targetX) this.done = true;
  }
}
