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

export class Hero {
  constructor(x, groundY) {
    this.x = x;
    this.groundY = groundY;
    this.scale = 1.4; // wider landscape world, nudged up a touch for presence
    this.maxHp = 250;
    this.hp = 250;
    this.frame = 0;
    this.animTimer = 0;
    // Derived from equipped weapon (Milestone 4+); defaults for now.
    this.damage = 25;
    this.attackAnim = 0; // counts down while showing an attack lunge
    this.attackMax = 14; // total frames of the lunge
    this.hurtRecoil = 0; // >0 while recoiling backward from taking a hit
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
  registerHit() {
    this.hitsLeft = Math.max(0, this.hitsLeft - 1);
    if (this.hitsLeft === 0) {
      this.dying = true;
      this.deathTimer = 0;
      this.killedByPlayer = true;
    }
  }

  get isDefeated() {
    return this.hitsLeft === 0;
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
