// bossattacks.js — signature attacks for stageboss-kind monsters.
//
// Data, not code: a stageboss's own attack (windup telegraph + impact effect
// + sound), keyed by sprite id so every stageboss silhouette fights with a
// move that matches it, instead of the shared generic hit ordinary `boss`
// waves still use. `windup` is frames of visible telegraph before the hit
// lands (see Monster.attackWindup in entities.js) — heavier/slower-reading
// bosses (Stone Fist) get a longer windup than quick ones (Shadow Bolt).
//
// `effect` is dispatched to particles.play() (effects.js) and `sound` to the
// matching Audio.* export (audio.js) — same wiring skills.js's SKILLS already
// use, just for the boss's own attack rather than the hero's.

export const BOSS_ATTACKS = {
  stageboss_ogre: { name: 'Địa Chấn Kích', effect: 'groundslam', sound: 'bossGroundSlam', windup: 34 },
  boss_dragon: { name: 'Hỏa Long Tức', effect: 'firebreath', sound: 'bossFireBreath', windup: 30 },
  stageboss_darklord: { name: 'Ảnh Lôi Tiễn', effect: 'shadowbolt', sound: 'bossShadowBolt', windup: 26 },
  boss_scribe: { name: 'Mặc Vũ Tán', effect: 'inksplatter', sound: 'bossInkSplatter', windup: 26 },
  boss_windserpent: { name: 'Cuồng Phong Trảm', effect: 'galeslash', sound: 'bossGaleSlash', windup: 20 },
  boss_guardian_statue: { name: 'Thạch Quyền', effect: 'stonefist', sound: 'bossStoneFist', windup: 40 },
  boss_formless: { name: 'Hắc Ảnh Trảo', effect: 'shadowgrasp', sound: 'bossShadowGrasp', windup: 30 },
  stageboss_staffguardian: { name: 'Sóng Cổ Ngữ', effect: 'arcanepulse', sound: 'bossArcanePulse', windup: 30 },
  boss_warden: { name: 'Xiềng Sắt', effect: 'ironslam', sound: 'bossIronSlam', windup: 32 },
  boss_jailer: { name: 'Đăng Hồn Chú', effect: 'lanterncurse', sound: 'bossLanternCurse', windup: 30 },
  boss_general: { name: 'Cuồng Hống Kích', effect: 'warcryslash', sound: 'bossWarCrySlash', windup: 24 },
};

// The World Devourer (stage 26) is the one monster with `phases` — it gets
// one attack per phase instead of a single sprite-keyed entry, so the fight
// escalates the same way its phase names/attack cadence already do:
// shrouded (Khiên Bóng Tối) -> unleashed (Cuồng Nộ) -> desperate (Tuyệt Vọng).
export const DEVOURER_PHASE_ATTACKS = [
  { name: 'Vuốt Hư Không', effect: 'shadowgrasp', sound: 'bossShadowGrasp', windup: 34 },
  { name: 'Miệng Vực', effect: 'voidmaw', sound: 'bossVoidMaw', windup: 26 },
  { name: 'Nuốt Bầu Trời', effect: 'devoursky', sound: 'bossDevourSky', windup: 20 },
];

const FALLBACK_ATTACK = { name: 'Tấn Công', effect: 'slash', sound: 'bossGenericSlash', windup: 26 };

// Resolve a monster's current signature attack. Phased bosses look up their
// phase's own entry; everything else keys off its spriteId, falling back to
// a thematically-neutral generic slash so a future stageboss sprite added
// without a roster entry here still gets something rather than crashing.
export function attackFor(monster) {
  if (monster.phases) return DEVOURER_PHASE_ATTACKS[monster.phaseIndex] || DEVOURER_PHASE_ATTACKS[0];
  return BOSS_ATTACKS[monster.spriteId] || FALLBACK_ATTACK;
}
