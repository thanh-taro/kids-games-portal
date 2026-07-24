// rewards.js — per-stage reward catalog + progress persistence.
//
// Each cleared stage grants ONE reward, cycling weapon -> skin -> skill.
// Rewards are cosmetic + a light stat boost (never enough to trivialize play).
//
// Progress (highest stage reached + unlocked reward ids) persists in
// localStorage so a kid keeps their gear between sessions.

import { SKILLS } from './skills.js';

// Ordered reward list. The reward for clearing stage N is REWARDS[N-1].
export const REWARDS = [
  {
    type: 'weapon',
    id: 'sword_flame',
    name: 'Kiếm Lửa',            // "Flame Sword"
    desc: 'Đòn đánh mạnh hơn!',  // "Stronger basic attack!"
    projectileColor: '#e8622b',
    damageBoost: 8,
  },
  {
    type: 'skin',
    id: 'skin_mage',
    name: 'Áo Choàng Phù Thủy',  // "Mage Cloak"
    desc: 'Trang phục mới!',     // "New outfit!"
    spriteId: 'hero_mage',
  },
  {
    type: 'skill',
    id: 'lightning',
    name: 'Sấm Sét',             // "Lightning"
    desc: 'Kỹ năng mới!',        // "New skill!"
    skill: 'lightning',
  },
  {
    type: 'weapon',
    id: 'staff_star',
    name: 'Gậy Ngôi Sao',        // "Star Staff"
    desc: 'Bắn nhanh hơn!',      // "Faster shots!"
    projectileColor: '#4ad4d4',
    speedBoost: 4,
  },
  {
    type: 'skill',
    id: 'meteor',
    name: 'Thiên Thạch',         // "Meteor"
    desc: 'Kỹ năng tối thượng!', // "Ultimate skill!"
    skill: 'meteor',
  },
  {
    type: 'weapon',
    id: 'sword_jade',
    name: 'Kiếm Ngọc',           // "Jade Sword"
    desc: 'Sức mạnh tăng thêm!', // "Extra power!"
    projectileColor: '#3ce0a0',
    damageBoost: 10,
  },
  {
    type: 'weapon',
    id: 'staff_gale',
    name: 'Gậy Cuồng Phong',     // "Gale Staff"
    desc: 'Bắn nhanh như gió!',  // "Shoot fast as wind!"
    projectileColor: '#ffd24a',
    speedBoost: 5,
  },
  {
    type: 'weapon',
    id: 'sword_frost',
    name: 'Kiếm Băng Giá',       // "Frost Sword"
    desc: 'Đòn đánh sắc bén!',   // "Sharper strikes!"
    projectileColor: '#8fe3ff',
    damageBoost: 12,
  },
  {
    type: 'weapon',
    id: 'staff_radiance',
    name: 'Gậy Ánh Quang',       // "Radiance Staff"
    desc: 'Sức mạnh tối thượng!', // "Ultimate power!"
    projectileColor: '#fff2b0',
    damageBoost: 10,
    speedBoost: 4,
  },
  {
    type: 'weapon',
    id: 'sword_dawn',
    name: 'Kiếm Bình Minh',      // "Dawn Sword"
    desc: 'Anh hùng huyền thoại!', // "Legendary hero!"
    projectileColor: '#ffb347',
    damageBoost: 15,
    speedBoost: 5,
  },
];

export function rewardForStage(stageIndex) {
  // stageIndex is 0-based; clearing stage 0 grants REWARDS[0].
  return REWARDS[stageIndex % REWARDS.length];
}

// --- Persistence ---
const KEY = 'ccc_progress_v1';

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore corrupt storage
  }
  return { stage: 0, rewards: [], seenTutorial: false };
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch (e) {
    // storage may be unavailable (private mode); fail quietly
  }
}

export function resetProgress() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    /* ignore */
  }
}

// Apply all unlocked rewards to the hero (skin, weapon boosts, extra skills).
export function applyRewards(hero, rewardIds) {
  const bonus = { damage: 0, speed: 0 };
  const skills = ['slash']; // always have the basic attack
  let projectileColor = null;

  for (const id of rewardIds) {
    const r = REWARDS.find((x) => x.id === id);
    if (!r) continue;
    if (r.type === 'skin' && r.spriteId) hero.spriteId = r.spriteId;
    if (r.type === 'weapon') {
      bonus.damage += r.damageBoost || 0;
      bonus.speed += r.speedBoost || 0;
      if (r.projectileColor) projectileColor = r.projectileColor;
    }
    if (r.type === 'skill' && r.skill && SKILLS[r.skill]) skills.push(r.skill);
  }

  hero.damage = 25 + bonus.damage;
  hero.projectileSpeedBonus = bonus.speed;
  hero.weaponColor = projectileColor;
  hero.unlockedSkills = skills;
}

// Resolve just the COSMETIC look from a set of unlocked reward ids, without a
// full Hero. Used by menu scenes (title, etc.) to show the kid's actual hero —
// the equipped skin sprite id + the latest weapon's projectile color (a nice
// accent). The last skin/weapon in the reward order wins, matching applyRewards.
export function equippedLook(rewardIds = []) {
  let spriteId = 'hero_knight';
  let weaponColor = null;
  for (const id of rewardIds) {
    const r = REWARDS.find((x) => x.id === id);
    if (!r) continue;
    if (r.type === 'skin' && r.spriteId) spriteId = r.spriteId;
    if (r.type === 'weapon' && r.projectileColor) weaponColor = r.projectileColor;
  }
  return { spriteId, weaponColor };
}
