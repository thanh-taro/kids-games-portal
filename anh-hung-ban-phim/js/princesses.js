// princesses.js — the ten rescued princesses' support abilities.
//
// Chapter 1 rescues all ten princesses (STAGES[1..10]). From chapter 2 on,
// they repay the favor: once each, at a moment matching her own theme, a
// princess AUTOMATICALLY casts a support ability on the hero mid-fight — no
// key to press, no menu, no interruption to typing. Each princess can help
// exactly ONCE for the whole save, then she's spent for good.
//
// PRINCESS_SUPPORT is ordered by PRIORITY, not narrative order: main.js's
// checkPrincessSupport() walks it top-to-bottom every eligible frame and
// fires the FIRST entry whose `when(ctx)` condition is true and who hasn't
// been used yet. `ctx` is a small snapshot main.js builds each check (hero,
// monster, stage, combo, waveCursor, ...) — see the call site for its shape.
//
// `apply(ctx)` performs the mechanical effect (mutates hero/monster/tracker
// state directly). `effect` names the flourish in effects.js's playPrincess()
// and `audioCue` the Audio.* function to call — both fire from main.js at the
// same moment apply() runs, over the hero (or, for nova abilities, the
// monster) position.
export const PRINCESS_SUPPORT = [
  {
    // Checked BEFORE 'heal': the two conditions overlap (< 15% is also <
    // 35%), and the more severe crisis should win the more severe response —
    // a kid at 10% HP should see the full heal, not the partial one.
    id: 'fullheal',
    style: 'cloud',
    name: 'Công Chúa Mây',              // "Princess Cloud"
    blurb: 'Mây chữa lành hoàn toàn cho bạn!', // "Cloud fully heals you!"
    effect: 'fullheal',
    audioCue: 'princessFullHeal',
    when: (ctx) => ctx.hero.hp > 0 && ctx.hero.hp < ctx.hero.maxHp * 0.15,
    apply: (ctx) => {
      ctx.hero.hp = ctx.hero.maxHp;
      ctx.tracker.mistakeCount = 0;
    },
  },
  {
    id: 'heal',
    style: 'flower',
    name: 'Công Chúa Hoa',              // "Princess Flower"
    blurb: 'Hoa hồi phục sức mạnh cho bạn!', // "Flower restores your strength!"
    effect: 'heal',
    audioCue: 'princessHeal',
    when: (ctx) => ctx.hero.hp > 0 && ctx.hero.hp < ctx.hero.maxHp * 0.35,
    apply: (ctx) => {
      ctx.hero.hp = Math.min(ctx.hero.maxHp, ctx.hero.hp + 300);
    },
  },
  {
    id: 'shield',
    style: 'sunlight',
    name: 'Công Chúa Ánh Dương',        // "Princess Sunlight"
    blurb: 'Ánh Dương che chắn cho bạn khỏi đòn đánh tới!', // "Sunlight shields you from the next attack!"
    effect: 'shield',
    audioCue: 'princessShield',
    when: (ctx) => ctx.wave === 'bossSpawn',
    apply: (ctx) => {
      ctx.hero.shielded = true;
    },
  },
  {
    id: 'freeze',
    style: 'ice',
    name: 'Công Chúa Băng',             // "Princess Ice"
    blurb: 'Băng đóng băng kẻ địch!',    // "Ice freezes the enemy!"
    effect: 'freeze',
    audioCue: 'princessFreeze',
    when: (ctx) => ctx.wave === 'bossAttack',
    apply: (ctx) => {
      ctx.monster.wantsToAttack = false;
      ctx.monster.frozenTimer = 150; // ~2.5s @60fps
      ctx.monster.attackTimer = ctx.monster.attackEvery * 2;
    },
  },
  {
    id: 'slow',
    style: 'sand',
    name: 'Công Chúa Cát',              // "Princess Sand"
    blurb: 'Cát làm chậm bước chân kẻ địch!', // "Sand slows the enemy's steps!"
    effect: 'slow',
    audioCue: 'princessSlow',
    when: (ctx) => ctx.wave === 'creepSpawn' && ctx.combo.count >= 3,
    apply: (ctx) => {
      ctx.monster.slowTimer = 360; // ~6s @60fps
    },
  },
  {
    id: 'knockback',
    style: 'wave',
    name: 'Công Chúa Sóng Biển',        // "Princess Wave"
    blurb: 'Sóng Biển đẩy lùi kẻ địch!', // "Wave pushes the enemy back!"
    effect: 'knockback',
    audioCue: 'princessKnockback',
    when: (ctx) => ctx.wave === 'creepContact',
    apply: (ctx) => {
      ctx.monster.x += 200;
    },
  },
  {
    id: 'starnova',
    style: 'star',
    name: 'Công Chúa Sao',              // "Princess Star"
    blurb: 'Sao giáng một đòn ánh sao!', // "Star strikes a blow of starlight!"
    effect: 'starnova',
    audioCue: 'princessStarNova',
    when: (ctx) => ctx.wave === 'halfway',
    apply: (ctx) => ({ novaHits: 1 }),
  },
  {
    id: 'lightnova',
    style: 'light',
    name: 'Công Chúa Ánh Sáng',         // "Princess Light"
    blurb: 'Ánh Sáng bùng nổ rực rỡ!',   // "Light bursts forth radiantly!"
    effect: 'lightnova',
    audioCue: 'princessLightNova',
    when: (ctx) => ctx.wave === 'phaseChange',
    apply: (ctx) => ({ novaHits: 2 }),
  },
  {
    id: 'staffcharge',
    style: 'love',
    name: 'Công Chúa Tình Yêu',         // "Princess of Love"
    blurb: 'Tình Yêu nạp đầy năng lượng cho Trượng!', // "Love fills the Staff with energy!"
    effect: 'staffcharge',
    audioCue: 'princessStaffCharge',
    when: (ctx) => ctx.wave === 'bossSpawn' && ctx.hero.hasStaff && ctx.hero.staffCharge === 0,
    apply: (ctx) => {
      ctx.hero.staffCharge = ctx.hero.staffChargeFull;
    },
  },
  {
    id: 'cleanse',
    style: 'stream',
    name: 'Công Chúa Dòng Suối',        // "Princess Stream"
    blurb: 'Dòng Suối gột sạch lỗi gõ cho bạn!', // "Stream washes your mistakes away!"
    effect: 'cleanse',
    audioCue: 'princessCleanse',
    when: (ctx) => ctx.tracker.mistakeCount >= 3,
    apply: (ctx) => {
      ctx.tracker.mistakeCount = 0;
      if (ctx.monster && ctx.monster.word) {
        ctx.tracker.setTarget(ctx.monster.word.vi, ctx.monster.word.telex);
      }
    },
  },
];

export class PrincessSupport {
  constructor(usedIds = []) {
    this.used = new Set(usedIds);
    // Same-frame collision guard only (NOT a pacing cooldown) — prevents two
    // conditions that both go true on one frame from both firing before the
    // first cast's state changes (e.g. hp jumping) have a chance to make the
    // second's condition false.
    this.cooldown = 0;
  }

  available(id) {
    return !this.used.has(id);
  }

  markUsed(id) {
    this.used.add(id);
    this.cooldown = 90;
  }

  get remaining() {
    return PRINCESS_SUPPORT.length - this.used.size;
  }

  get total() {
    return PRINCESS_SUPPORT.length;
  }

  update() {
    if (this.cooldown > 0) this.cooldown--;
  }

  // Walk the priority list and return the first eligible entry (unused,
  // condition true), or null. Does not mutate anything.
  find(ctx) {
    if (this.cooldown > 0) return null;
    for (const p of PRINCESS_SUPPORT) {
      if (!this.available(p.id)) continue;
      if (p.when(ctx)) return p;
    }
    return null;
  }
}
