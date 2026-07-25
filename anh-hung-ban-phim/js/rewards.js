// rewards.js — per-stage reward catalog + progress persistence.
//
// Each cleared stage grants ONE reward, alternating weapon -> skill.
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
    type: 'skill',
    id: 'fireball',
    name: 'Cầu Lửa',             // "Fireball"
    desc: 'Kỹ năng đặc biệt mới!', // "New special skill!"
    skill: 'fireball',
    color: '#e8622b',
  },
  {
    type: 'skill',
    id: 'lightning',
    name: 'Sấm Sét',             // "Lightning"
    desc: 'Kỹ năng mới!',        // "New skill!"
    skill: 'lightning',
    color: '#4ad4d4',
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
    color: '#c77dff',
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

  // --- Chapter 1's finale reward (clearing stage 11) and stage 12's ---------
  {
    type: 'weapon',
    id: 'sword_hero',
    name: 'Kiếm Anh Hùng',       // "Hero's Sword"
    desc: 'Thanh kiếm của người cứu công chúa!', // "The sword of the princess-saver!"
    projectileColor: '#ff6a9c',
    damageBoost: 16,
    speedBoost: 4,
  },
  {
    type: 'skill',
    id: 'frostnova',
    name: 'Băng Vũ',             // "Frost Nova"
    desc: 'Kỹ năng băng giá mới!', // "New frost skill!"
    skill: 'frostnova',
    color: '#8fe3ff',
  },

  // --- Chapter 2: the quest for the Staff of Wisdom (stages 13-20) ----------
  // Alternates skill → weapon as before, and ENDS on the Staff itself, so the
  // chapter's last reward is the thing its whole story was about.
  {
    type: 'skill',
    id: 'windblade',
    name: 'Phong Nhẫn',          // "Wind Blades"
    desc: 'Năm lưỡi gió cực nhanh!', // "Five blades of wind, very fast!"
    skill: 'windblade',
    color: '#bfe8ff',
  },
  {
    type: 'weapon',
    id: 'staff_scholar',
    name: 'Gậy Học Giả',         // "Scholar's Staff"
    desc: 'Bắn nhanh hơn nhiều!', // "Much faster shots!"
    projectileColor: '#d9d9e0',
    speedBoost: 6,
  },
  {
    type: 'skill',
    id: 'holylight',
    name: 'Thánh Quang',         // "Holy Light"
    desc: 'Ánh sáng thiêng liêng!', // "Sacred light!"
    skill: 'holylight',
    color: '#fff2b0',
  },
  {
    type: 'weapon',
    id: 'sword_mirror',
    name: 'Kiếm Gương',          // "Mirror Sword"
    desc: 'Sắc như mặt gương!',  // "Sharp as a mirror!"
    projectileColor: '#b8d8f0',
    damageBoost: 14,
  },
  {
    type: 'weapon',
    id: 'staff_starlight',
    name: 'Gậy Ánh Sao',         // "Starlight Staff"
    desc: 'Sức mạnh của các ngôi sao!', // "Power of the stars!"
    projectileColor: '#ffe08a',
    damageBoost: 12,
    speedBoost: 5,
  },
  {
    type: 'weapon',
    id: 'sword_temple',
    name: 'Kiếm Đền Cổ',         // "Ancient Temple Sword"
    desc: 'Rèn bởi chữ viết cổ!', // "Forged from ancient writing!"
    projectileColor: '#4ad4d4',
    damageBoost: 18,
  },
  {
    type: 'weapon',
    id: 'staff_tower',
    name: 'Gậy Tháp Trí Tuệ',    // "Wisdom Tower Staff"
    desc: 'Càng gõ đúng càng mạnh!', // "The more correct you type, the stronger!"
    projectileColor: '#8ff0ff',
    damageBoost: 14,
    speedBoost: 6,
  },
  {
    // THE ARTIFACT — chapter 2's whole point. Not a weapon or a skill: it grants
    // the CHARGE mechanic (see applyRewards + the staff meter in main.js), and it
    // is what lets the hero pierce the World Devourer's shield in stage 26.
    type: 'artifact',
    id: 'staff_wisdom',
    name: 'TRƯỢNG CỦA TRÍ TUỆ',  // "THE STAFF OF WISDOM"
    desc: 'Gõ nạp năng lượng — rồi tung đòn cực mạnh!', // "Type to charge energy — then unleash a mighty blow!"
    artifact: 'staff',
    projectileColor: '#fff6d0',
    damageBoost: 20,
    speedBoost: 4,
    color: '#fff6d0',
  },

  // --- Chapter 3: the final siege (stages 21-26) ----------------------------
  {
    type: 'skill',
    id: 'voidrend',
    name: 'Xé Hư Không',         // "Void Rend"
    desc: 'Xé cả không gian!',   // "Tear space itself!"
    skill: 'voidrend',
    color: '#b06cf0',
  },
  {
    type: 'weapon',
    id: 'sword_bone',
    name: 'Kiếm Xương Trắng',    // "White Bone Sword"
    desc: 'Lấy từ cầu xương!',   // "Taken from the bone bridge!"
    projectileColor: '#e8e4dc',
    damageBoost: 20,
  },
  {
    type: 'skill',
    id: 'dawnbreaker',
    name: 'Phá Minh',            // "Dawnbreaker"
    desc: 'Kỹ năng mạnh nhất — bình minh phá tan bóng tối!', // "The strongest skill — dawn breaks the darkness!"
    skill: 'dawnbreaker',
    color: '#ffd24a',
  },
  {
    type: 'weapon',
    id: 'sword_king',
    name: 'Kiếm Của Đức Vua',    // "The King's Sword"
    desc: 'Đức Vua tin tưởng bạn!', // "The King believes in you!"
    projectileColor: '#f2c53d',
    damageBoost: 22,
    speedBoost: 5,
  },
  {
    type: 'weapon',
    id: 'staff_void',
    name: 'Gậy Hư Không',        // "Void Staff"
    desc: 'Sức mạnh từ hư không!', // "Power from the void!"
    projectileColor: '#e6b3ff',
    damageBoost: 20,
    speedBoost: 6,
  },
  {
    // Clearing the FINAL stage. There is no stage after this, so this reward is
    // purely the trophy shown on the last reward screen before the ending.
    type: 'weapon',
    id: 'sword_worldsaver',
    name: 'KIẾM CỨU THẾ GIỚI',   // "THE WORLD-SAVER'S SWORD"
    desc: 'Bạn đã cứu cả thế giới!', // "You saved the whole world!"
    projectileColor: '#ffffff',
    damageBoost: 30,
    speedBoost: 8,
  },
];

export function rewardForStage(stageIndex) {
  // stageIndex is 0-based; clearing stage 0 grants REWARDS[0]. The list is sized
  // to STAGES (verify.js asserts REWARDS.length >= TOTAL_STAGES), so the modulo
  // is a safety net for an out-of-range index rather than a real wrap — a short
  // list would silently re-grant early gear on the late stages.
  return REWARDS[stageIndex % REWARDS.length];
}

// --- Persistence ---
const KEY = 'ccc_progress_v1';

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      // `seenStory` (which chapters' opening narration has played) was added
      // after the first release, so a save from an older build won't have it.
      // Default it rather than leaving it undefined — main.js treats a missing
      // entry as "not yet seen", which is the right behavior for an old save:
      // the kid gets the story they never had.
      if (!Array.isArray(saved.seenStory)) saved.seenStory = [];
      if (!Array.isArray(saved.rewards)) saved.rewards = [];
      return saved;
    }
  } catch (e) {
    // ignore corrupt storage
  }
  return { stage: 0, rewards: [], seenTutorial: false, seenStory: [] };
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

// Apply all unlocked rewards to the hero (weapon boosts, extra skills, and the
// Staff artifact).
export function applyRewards(hero, rewardIds) {
  const bonus = { damage: 0, speed: 0 };
  const skills = ['slash']; // always have the basic attack
  let projectileColor = null;
  let hasStaff = false;

  for (const id of rewardIds) {
    const r = REWARDS.find((x) => x.id === id);
    if (!r) continue;
    // Artifacts carry stat boosts and a color like weapons do, but ALSO switch
    // on a mechanic — the Staff's charge meter (see hero.staff / main.js).
    if (r.type === 'weapon' || r.type === 'artifact') {
      bonus.damage += r.damageBoost || 0;
      bonus.speed += r.speedBoost || 0;
      if (r.projectileColor) projectileColor = r.projectileColor;
    }
    if (r.type === 'artifact' && r.artifact === 'staff') hasStaff = true;
    if (r.type === 'skill' && r.skill && SKILLS[r.skill]) skills.push(r.skill);
  }

  hero.damage = 25 + bonus.damage;
  hero.projectileSpeedBonus = bonus.speed;
  hero.weaponColor = projectileColor;
  hero.unlockedSkills = skills;
  hero.hasStaff = hasStaff;
  // The charge meter starts empty each stage; it fills with cleanly typed words
  // (main.js) and empties when the empowered hit is spent.
  hero.staffCharge = 0;
}

// Does this reward set include the Staff of Wisdom? Used by the HUD (to show the
// charge meter) and by the final boss's shielded phase.
export function hasStaffOfWisdom(rewardIds = []) {
  return rewardIds.some((id) => {
    const r = REWARDS.find((x) => x.id === id);
    return r && r.type === 'artifact' && r.artifact === 'staff';
  });
}

// Resolve just the COSMETIC look from a set of unlocked reward ids, without a
// full Hero. Used by menu scenes (title, etc.) to show the kid's actual hero —
// the latest weapon's projectile color (a nice accent). The last weapon in the
// reward order wins, matching applyRewards.
export function equippedLook(rewardIds = []) {
  let weaponColor = null;
  for (const id of rewardIds) {
    const r = REWARDS.find((x) => x.id === id);
    if (!r) continue;
    // Artifacts count as the equipped look too (the Staff tints the blade), so
    // the menu scenes match what applyRewards gives the live hero.
    if ((r.type === 'weapon' || r.type === 'artifact') && r.projectileColor) {
      weaponColor = r.projectileColor;
    }
  }
  return { weaponColor };
}
