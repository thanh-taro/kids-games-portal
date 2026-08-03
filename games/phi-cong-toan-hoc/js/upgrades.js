// upgrades.js — one reward per stage, plus the localStorage progress save.
//
// UPGRADES must cover every stage: upgradeForStage() wraps modulo, so a short
// list silently re-grants early gear instead of erroring. That was a real live
// bug in the typing game's rewards.js, and verify.js asserts the length here for
// exactly that reason.
//
// Types:
//   weapon  — damage / shot count / projectile sprite
//   engine  — hull self-repair speed (the survivability path, not the guns)
//   hull    — max health
//   skill   — unlocks a special shot; 'ultimate' switches on a whole mechanic
//   ally    — a permanent wingman that FIRES (see allies.js); chapter 2's payoff
//   victory — the final stage's "reward" is the ending

export const UPGRADES = {
  // --- weapons: the visible power curve ---
  // #39ff8c is deliberately a different plasma-family green from the base
  // weapon's #7fffd4 — tint is this tier's ONLY visual signal (same sprite,
  // same shot count), so it must not collide with the untouched starting gun.
  weapon2: { id: 'weapon2', type: 'weapon', name: 'Pháo Plasma II',
    desc: 'Sát thương tăng.', damage: 1, sprite: 'shot_plasma', tint: '#39ff8c' },
  weapon3: { id: 'weapon3', type: 'weapon', name: 'Pháo Laser',
    desc: 'Tia laser xuyên nhanh hơn.', damage: 2, sprite: 'shot_laser', tint: '#7fe3ff' },
  weapon4: { id: 'weapon4', type: 'weapon', name: 'Laser Kép',
    desc: 'Hai tia cùng lúc.', damage: 2, shots: 1, sprite: 'shot_laser', tint: '#7fe3ff' },
  weapon5: { id: 'weapon5', type: 'weapon', name: 'Pháo Sao',
    desc: 'Sát thương lớn hơn nữa.', damage: 3, sprite: 'shot_laser', tint: '#ffd24a' },
  weapon6: { id: 'weapon6', type: 'weapon', name: 'Pháo Nova',
    desc: 'Mỗi phát mạnh như một vụ nổ nhỏ.', damage: 3, sprite: 'shot_missile', tint: '#ff9d3a' },
  weapon7: { id: 'weapon7', type: 'weapon', name: 'Pháo Ngân Hà',
    desc: 'Vũ khí mạnh nhất hạm đội.', damage: 4, sprite: 'shot_missile', tint: '#ffd24a' },

  // --- engines: faster self-repair. ---
  //
  // These used to grant energy capacity and slower drain. With the energy bar cut
  // they grant REPAIR SPEED instead: each one means a correct answer mends a bit
  // more hull. Same role in the progression (a steady, unglamorous upgrade between
  // the weapons) and the same fiction — a better engine keeps the ship flying.
  //
  // Only four tiers now, not five: engine2's stage-5 slot was given to
  // skill_shield (see below) so the shield arrives early, right after
  // skill_missile. balance.js never modelled repair-speed bonuses (only hull
  // and allies feed the simulator), so dropping one tier has zero effect on
  // the playability gate — it is a small, deliberately low-risk place to make
  // room.
  engine1: { id: 'engine1', type: 'engine', name: 'Động Cơ II',
    desc: 'Tự hồi phục nhanh hơn một chút.', repair: 0.1 },
  engine3: { id: 'engine3', type: 'engine', name: 'Động Cơ IV',
    desc: 'Hồi phục nhanh hơn nữa.', repair: 0.15 },
  engine4: { id: 'engine4', type: 'engine', name: 'Động Cơ V',
    desc: 'Động cơ của hạm đội tinh nhuệ.', repair: 0.15 },
  engine5: { id: 'engine5', type: 'engine', name: 'Động Cơ Sao',
    desc: 'Hồi phục cực nhanh.', repair: 0.2 },

  // --- health: the lose condition, pushed back ---
  hull1: { id: 'hull1', type: 'hull', name: 'Vỏ Tàu II', desc: 'Chịu thêm một phát.', hull: 1 },
  hull2: { id: 'hull2', type: 'hull', name: 'Vỏ Tàu III', desc: 'Vỏ tàu dày hơn.', hull: 1 },
  hull3: { id: 'hull3', type: 'hull', name: 'Vỏ Tàu IV', desc: 'Chịu đòn tốt hơn.', hull: 1 },
  hull4: { id: 'hull4', type: 'hull', name: 'Vỏ Tàu V', desc: 'Vỏ tàu của Cõi Hắc Ám.', hull: 2 },
  hull5: { id: 'hull5', type: 'hull', name: 'Vỏ Tàu Ngân Hà', desc: 'Vỏ tàu bền nhất.', hull: 2 },

  // --- skills ---
  skill_missile: { id: 'skill_missile', type: 'skill', name: 'Tên Lửa Dò',
    desc: 'Tên lửa tự tìm mục tiêu.', skill: 'missile' },
  // The combo shield: trả lời NHANH (<=5s) và SẠCH (đúng ngay lần đầu) dựng
  // một khiên 5 giây chặn mọi đạn địch, cho cả tàu chỉ huy lẫn đồng đội. Sai
  // một câu làm khiên vỡ ngay lập tức; trả lời đúng nhưng chậm thì khiên cứ
  // tự tắt dần chứ không "phạt". Gated by up.skills.has('shield') in main.js.
  skill_shield: { id: 'skill_shield', type: 'skill', name: 'Khiên Tốc Độ',
    desc: 'Trả lời nhanh và đúng liên tiếp để dựng khiên chắn đạn.', skill: 'shield' },
  // skill_ultimate has no `skill` field: the ultimate is actually unlocked one
  // stage earlier by ally_scientist's `gift: 'ultimate'` (see allyEffects in
  // allies.js). This reward is a narrative flourish for the same unlock, not
  // a second activation path.
  skill_ultimate: { id: 'skill_ultimate', type: 'skill', name: 'Siêu Công Thức',
    desc: 'Trả lời đúng liên tiếp để nạp. Xuyên mọi khiên!' },

  // --- allies: chapter 2's five rescues ---
  ally_engineer:  { id: 'ally_engineer',  type: 'ally', ally: 'engineer',
    name: 'Bé Ốc', desc: 'Tự sửa phi thuyền giữa các đợt.' },
  ally_gunner:    { id: 'ally_gunner',    type: 'ally', ally: 'gunner',
    name: 'Tia Chớp', desc: 'Thêm một loạt pháo cánh.' },
  ally_shieldman: { id: 'ally_shieldman', type: 'ally', ally: 'shieldman',
    name: 'Vòm Xanh', desc: 'Chặn một phát mỗi đợt.' },
  ally_navigator: { id: 'ally_navigator', type: 'ally', ally: 'navigator',
    name: 'La Bàn', desc: 'Hồi phục nhiều hơn.' },
  ally_scientist: { id: 'ally_scientist', type: 'ally', ally: 'scientist',
    name: 'Giáo Sư Sao', desc: 'Mở khoá Siêu Công Thức.' },

  victory: { id: 'victory', type: 'victory', name: 'Ngân Hà Được Cứu',
    desc: 'Bạn đã làm được!' },
};

// The reward for a given 0-based stage index, read from the stage blueprint so
// stages.js stays the single source of truth.
export function upgradeForStage(stageIndex, stages) {
  const stage = stages[stageIndex % stages.length];
  return UPGRADES[stage.reward] || null;
}

// Apply a list of earned upgrade ids onto a ship + run state.
//
// Returns the derived stats rather than mutating a stage's blueprint, so the
// blueprint numbers stay pristine and a retry always starts from the same place.
export function applyUpgrades(ids) {
  const out = {
    damage: 1,
    extraShots: 0,
    shotSprite: 'shot_plasma',
    shotTint: '#7fffd4',
    repairBonus: 0,
    hullBonus: 0,
    skills: new Set(),
    allies: [],
  };

  for (const id of ids) {
    const u = UPGRADES[id];
    if (!u) continue;
    if (u.type === 'weapon') {
      out.damage = Math.max(out.damage, u.damage || 1);
      if (u.sprite) out.shotSprite = u.sprite;
      if (u.tint) out.shotTint = u.tint;
      if (u.shots) out.extraShots += u.shots;
    } else if (u.type === 'engine') {
      out.repairBonus += u.repair || 0;
    } else if (u.type === 'hull') {
      out.hullBonus += u.hull || 0;
    } else if (u.type === 'skill') {
      out.skills.add(u.skill);
    } else if (u.type === 'ally') {
      if (!out.allies.includes(u.ally)) out.allies.push(u.ally);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Progress (localStorage)
//
// loadProgress back-fills fields missing from older saves, so shipping a new
// field never bricks a kid's existing run — the same guard the typing game's
// loadProgress has.
// ---------------------------------------------------------------------------

const KEY = 'ptn_progress_v1';

export function loadProgress() {
  const base = {
    stage: 0,
    level: 'normal',
    upgrades: [],
    seenStory: [],
    bestCombo: 0,
    totalCorrect: 0,
    totalWrong: 0,
    // How many ranks the kid has lost to repeated failure, and the consecutive
    // losses on the CURRENT stage. `deathStage` guards the streak: without it,
    // one loss each on six different stages would demote twice, which is not
    // what "stuck on this stage" means. See DEATHS_PER_DEMOTION in rank.js.
    demotions: 0,
    stageDeaths: 0,
    deathStage: -1,
    // Per-shape accuracy, driving adaptive quest selection (adaptive.js). Persisted
    // because mastery is a property of the KID, not of a run — a child who struggles
    // with division should still see extra division tomorrow.
    mastery: {},
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw);
    return { ...base, ...saved };
  } catch {
    return base;
  }
}

export function saveProgress(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Private-browsing or a full quota: the game must still be playable, it
    // just will not remember. Never let a save failure break the run.
  }
}

export function resetProgress() {
  try {
    localStorage.removeItem(KEY);
  } catch { /* see saveProgress */ }
}
