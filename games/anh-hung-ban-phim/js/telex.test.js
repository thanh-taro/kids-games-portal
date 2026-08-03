// telex.test.js — run with: node js/telex.test.js
// Verifies the Telex engine against real Vietnamese words.

import { typeString, telexPrefixLen, isTelexPrefix, newBuffer, stepKey } from './telex.js';
import { WORD_POOLS } from './skills.js';

const cases = [
  // raw keystrokes  -> expected Vietnamese
  ['as', 'á'],
  ['af', 'à'],
  ['ar', 'ả'],
  ['ax', 'ã'],
  ['aj', 'ạ'],
  ['aa', 'â'],
  ['aw', 'ă'],
  ['ee', 'ê'],
  ['oo', 'ô'],
  ['ow', 'ơ'],
  ['uw', 'ư'],
  ['dd', 'đ'],
  ['ass', 'as'],       // undo tone
  ['aaa', 'aa'],       // undo shape
  ['ddd', 'dd'],       // undo đ
  // words
  ['me', 'me'],
  ['mej', 'mẹ'],       // mẹ
  ['boos', 'bố'],      // bố
  ['caf', 'cà'],       // cà
  ['gaf', 'gà'],       // gà
  ['meof', 'mèo'],     // mèo (tone on e)
  ['conf', 'còn'],     // còn (tone on o, final consonant)
  ['quar', 'quả'],     // quả (tone on a)
  ['cams', 'cám'],     // cám
  ['Vieejt', 'Việt'],  // Việt (ê priority + nang)
  ['dduwowcj', 'được'],// được
  ['nghieeng', 'nghiêng'], // nghiêng
  ['xin', 'xin'],
  ['chaof', 'chào'],   // chào
  ['hoas', 'hóa'],     // hóa (oa -> tone on a)
  ['thuys', 'thúy'],   // thúy (uy -> tone on y)
  // Free/flexible Telex: one 'w' on a "uo" cluster shapes the whole ươ pair,
  // so "uow" == "uwow". Kids don't have to press w twice.
  ['ruwowuj', 'rượu'],  // rượu the strict way
  ['ruowuj', 'rượu'],   // rượu the free way (uow)
  ['dduowcj', 'được'],  // được via uow (dd -> đ)
  ['nguowif', 'người'], // người via uow
  ['thuowng', 'thương'],// thương via uow
  ['muowis', 'mưới'],   // ươ shaped, tone on ơ
  ['uoww', 'uow'],      // undo linked ươ -> literal "uow"
  // Multi-syllable: tone must stay within its own syllable (regression guard).
  ['quar taso', 'quả táo'],       // 's' on táo must NOT retone quả
  ['baauf trowfi', 'bầu trời'],
  ['mawtj trawng', 'mặt trăng'],
  ['bes ddi hocj', 'bé đi học'],
  ['meof con deex thuwowng', 'mèo con dễ thương'],
  ['hoa nowr muaf xuaan', 'hoa nở mùa xuân'],
];

let pass = 0;
let fail = 0;
for (const [raw, expected] of cases) {
  const got = typeString(raw);
  const ok = got === expected;
  if (ok) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL  "${raw}"  expected "${expected}"  got "${got}"`);
  }
}

// Telex-aware prefix matching: an untoned/unshaped vowel is a valid intermediate
// state toward its toned/shaped target and must NOT read as a mistake.
// [current, target, expectedMatchedLen, expectedIsPrefix]
const prefixCases = [
  ['', 'bé', 0, true],          // nothing typed yet
  ['b', 'bé', 1, true],         // consonant matches
  ['be', 'bé', 2, true],        // KEY BUG: "be" toward "bé" — "e" is on-path, not wrong
  ['bé', 'bé', 2, true],        // completed
  ['ga', 'gà', 2, true],        // untoned a toward à
  ['me', 'mèo', 2, true],       // "me" toward "mèo"
  ['meo', 'mèo', 3, true],      // untoned before tone key
  ['ca', 'câu', 2, true],       // unshaped a toward â
  ['co', 'cô', 2, true],        // unshaped o toward ô
  ['co', 'cơ', 2, true],        // unshaped o toward ơ
  ['bx', 'bé', 1, false],       // wrong second letter -> real mistake
  ['bo', 'bé', 1, false],       // o is not on-path to é
  ['bé', 'be', 1, false],       // toned typed where target is plain -> mistake
  ['béo', 'bé', 2, false],      // typed past the end of the target
  ['bes ', 'bes d', 4, true],   // space matches space (phrase)
  // Already-shaped bases must stay on-path toward their toned target (flex tone).
  ['ngươ', 'người', 4, true],   // ư/ơ shaped, tone not yet typed -> not a mistake
  ['ngươi', 'người', 5, true],
  ['ngo', 'ngọn', 3, true],     // tone key comes after the final consonant
  ['ngon', 'ngọn', 4, true],
  ['nui', 'núi', 3, true],      // tone key typed last
  // Consonant shape "dd" -> đ: the first "d" is on-path toward "đ".
  ['d', 'đ', 1, true],
  ['cánh d', 'cánh đồng', 6, true],   // mid-phrase: lone d toward đ, not a mistake
  ['do', 'đồng', 2, true],            // d->đ, then o->ô both on-path (typing "ddoongf")
  ['t', 'đ', 0, false],               // a real wrong consonant is still a mistake
  // Case-insensitive: kids shouldn't have to reach for Shift. A lowercase typing
  // of an uppercase target (and vice versa) is on-path, not a mistake.
  ['t', 'T', 1, true],                // lowercase toward uppercase target
  ['te', 'Tế', 2, true],              // ...through an unshaped/untoned vowel
  ['tê', 'Tế', 2, true],
  ['tết', 'Tết', 3, true],            // fully typed lowercase = fully matched
  ['T', 't', 1, true],                // uppercase toward lowercase target
  ['CHỊ', 'chị', 3, true],
  ['b', 'Tết', 0, false],             // a genuinely wrong letter is still wrong
];
for (const [cur, target, wantLen, wantPrefix] of prefixCases) {
  const gotLen = telexPrefixLen(cur, target);
  const gotPrefix = isTelexPrefix(cur, target);
  const ok = gotLen === wantLen && gotPrefix === wantPrefix;
  if (ok) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL  prefix "${cur}" vs "${target}"  expected len=${wantLen} prefix=${wantPrefix}  got len=${gotLen} prefix=${gotPrefix}`);
  }
}

// stepKey — the shared typing primitive used by BOTH gameplay (input.js) and
// the tutorial (tutorial.js). Drive a sequence of raw keys toward a target and
// assert the final result. `keys` is a string of single-char keys, with '<' as
// a stand-in for Backspace. We check the final text plus the mistake/complete
// flags and — for the last key — whether it triggered an auto-restart.
const stepCases = [
  // keys        target      wantText  wantComplete wantMistake wantRestart
  ['meof',       'mèo',      'mèo',    true,        false,      false],
  ['ba',         'ba',       'ba',     true,        false,      false],
  ['beos',       'bế',       'béo',    false,       true,       false], // 's' tones "béo" (tone on o) — off-rails for bế
  ['bx',         'ba',       'bx',     false,       true,       false], // 'x' isn't a valid continuation of "b"
  // Auto-restart: go off the rails ("bx"), then type the target's first letter
  // 'c'... no — retype from the start. "bx" is off-rails; the next 'c' on a
  // fresh buffer starts "cá", so it wipes the mistake and restarts.
  ['bxc',        'cá',       'c',      false,       false,      true],
  // Auto-restart toward a word whose FIRST char needs a shape/tone key: the
  // retype's first key renders as a bare vowel (o), not the target's ô — a plain
  // startsWith would reject it and strand the kid. 'o' must restart "ông".
  ['axo',        'ông',      'o',      false,       false,      true], // go off-rails ("ax"), then 'o' restarts ô-word
  ['xd',         'đi',       'd',      false,       false,      true], // 'x' off-rails, then 'd' restarts đ-word
  // Backspace recovers: type "meo", delete, retype tone path.
  ['meo<of',     'mèo',      'mèo',    true,        false,      false],
  // Case-insensitive completion: an uppercase target ("Tết") is satisfied by
  // lowercase keys — a kid never has to hold Shift. The text keeps what was
  // actually typed; only the comparison ignores case.
  ['teets',      'Tết',      'tết',    true,        false,      false],
  ['Teets',      'Tết',      'Tết',    true,        false,      false], // Shift still works
  ['teets',      'tết',      'tết',    true,        false,      false],
  ['Teets',      'tết',      'Tết',    true,        false,      false], // stray Shift is fine
  // Auto-restart must be case-insensitive too: off the rails, then a lowercase
  // retype of an uppercase-initial target has to wipe the mistake.
  ['bxt',        'Tết',      't',      false,       false,      true],
];
for (const [keys, target, wantText, wantComplete, wantMistake, wantRestart] of stepCases) {
  let buf = newBuffer();
  let r = null;
  for (const ch of keys) {
    r = stepKey(buf, ch === '<' ? 'Backspace' : ch, target);
    buf = r.buffer;
  }
  const ok = r.text === wantText && r.complete === wantComplete
    && r.mistake === wantMistake && r.restarted === wantRestart;
  if (ok) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL  stepKey "${keys}" vs "${target}"  expected text="${wantText}" complete=${wantComplete} mistake=${wantMistake} restart=${wantRestart}  got text="${r.text}" complete=${r.complete} mistake=${r.mistake} restart=${r.restarted}`);
  }
}

// ---------------------------------------------------------------------------
// Word-pool hints: every `telex` in skills.js WORD_POOLS is shown to the kid as
// the on-screen keystroke guide (see drawWordPanel in main.js), so it must be
// BOTH correct and consistently written:
//   1. typing it really produces its `vi` word, and
//   2. each syllable's tone key sits at the END of that syllable.
// Telex accepts a tone key anywhere in the syllable, so 'sasch' and 'sachs' both
// yield "sách" — but a guide that puts the tone mid-word teaches an order the
// kid can't generalize. One rule, always: letters first, tone last.
let poolCount = 0;
for (const [pool, list] of Object.entries(WORD_POOLS)) {
  for (const { vi, telex } of list) {
    poolCount++;
    const got = typeString(telex);
    if (got !== vi) {
      fail++;
      console.log(`FAIL  ${pool} hint "${telex}" types "${got}", expected "${vi}"`);
      continue;
    }
    // A tone key is "misplaced" when moving it to the end of its syllable still
    // types the same word — i.e. it could have been written the consistent way.
    const better = telex.split(' ').map((syl) => {
      for (let i = 0; i < syl.length; i++) {
        if (!'sfrxj'.includes(syl[i]) || i === syl.length - 1) continue;
        const moved = syl.slice(0, i) + syl.slice(i + 1) + syl[i];
        if (typeString(moved) === typeString(syl)) return moved;
      }
      return syl;
    }).join(' ');
    if (better !== telex) {
      fail++;
      console.log(`FAIL  ${pool} hint "${telex}" (${vi}) has a mid-syllable tone key; write it as "${better}"`);
    } else {
      pass++;
    }
  }
}

const total = cases.length + prefixCases.length + stepCases.length + poolCount;
console.log(`\n${pass} passed, ${fail} failed, ${total} total`);
process.exit(fail ? 1 : 0);
