// telex.js — Vietnamese Telex input engine.
//
// Pure functions that transform a stream of raw ASCII keystrokes into a
// Vietnamese string, exactly like a real Telex IME. The game feeds each
// keypress into `applyKey` and compares the rendered syllable against the
// target word, so kids build real Telex muscle memory.
//
// Core rules implemented:
//   Tone marks (applied to the syllable's main vowel):
//     s -> sac (´)    f -> huyen (`)   r -> hoi (?)
//     x -> nga (~)    j -> nang (.)
//   Vowel/consonant shapes (double-key or w-key):
//     aa -> â   aw -> ă   ee -> ê   oo -> ô   ow -> ơ   uw -> ư   dd -> đ
//   Undo: pressing the same transform key again cancels it and emits the
//     literal key (real Telex behaviour), e.g. "as" -> "á", "ass" -> "as".

// ---------------------------------------------------------------------------
// Character tables
// ---------------------------------------------------------------------------

// Base vowels that can carry tones, with their toned forms.
// Order of tones: [none, sac(s), huyen(f), hoi(r), nga(x), nang(j)]
const TONE_TABLE = {
  a: ['a', 'á', 'à', 'ả', 'ã', 'ạ'],
  ă: ['ă', 'ắ', 'ằ', 'ẳ', 'ẵ', 'ặ'],
  â: ['â', 'ấ', 'ầ', 'ẩ', 'ẫ', 'ậ'],
  e: ['e', 'é', 'è', 'ẻ', 'ẽ', 'ẹ'],
  ê: ['ê', 'ế', 'ề', 'ể', 'ễ', 'ệ'],
  i: ['i', 'í', 'ì', 'ỉ', 'ĩ', 'ị'],
  o: ['o', 'ó', 'ò', 'ỏ', 'õ', 'ọ'],
  ô: ['ô', 'ố', 'ồ', 'ổ', 'ỗ', 'ộ'],
  ơ: ['ơ', 'ớ', 'ờ', 'ở', 'ỡ', 'ợ'],
  u: ['u', 'ú', 'ù', 'ủ', 'ũ', 'ụ'],
  ư: ['ư', 'ứ', 'ừ', 'ử', 'ữ', 'ự'],
  y: ['y', 'ý', 'ỳ', 'ỷ', 'ỹ', 'ỵ'],
};

const TONE_KEYS = { s: 1, f: 2, r: 3, x: 4, j: 5 };

// Reverse lookup: any toned character -> { base, tone }
const CHAR_INFO = {};
for (const base of Object.keys(TONE_TABLE)) {
  TONE_TABLE[base].forEach((ch, toneIdx) => {
    CHAR_INFO[ch] = { base, tone: toneIdx };
    // Uppercase variants too.
    CHAR_INFO[ch.toUpperCase()] = { base, tone: toneIdx, upper: true };
  });
}

// The set of "base vowel letters" for tone-placement decisions.
const VOWELS = new Set(['a', 'ă', 'â', 'e', 'ê', 'i', 'o', 'ô', 'ơ', 'u', 'ư', 'y']);

// Shape transforms triggered by a doubled key or a following 'w'.
// Maps base vowel + trigger key -> new base vowel.
const SHAPE = {
  a: { a: 'â', w: 'ă' },
  e: { e: 'ê' },
  o: { o: 'ô', w: 'ơ' },
  u: { w: 'ư' },
  // 'w' alone (after nothing/consonant) is commonly used for ư; handled specially.
};

// ---------------------------------------------------------------------------
// Buffer model
// ---------------------------------------------------------------------------
// We keep the buffer as an array of "atoms". Each atom is:
//   { c: 'a', base: 'a', tone: 0, isVowel: true, shaped: false }
// for a vowel, or a plain consonant atom { c: 'n', isVowel: false }.
// This lets us re-place tones and undo transforms cleanly.

function makeVowelAtom(base, tone = 0, upper = false) {
  return { base, tone, isVowel: true, shaped: false, upper };
}
function makeConsonantAtom(ch) {
  return { c: ch, isVowel: false };
}

function renderAtom(atom) {
  if (!atom.isVowel) return atom.c;
  const ch = TONE_TABLE[atom.base][atom.tone];
  return atom.upper ? ch.toUpperCase() : ch;
}

export function render(buffer) {
  return buffer.map(renderAtom).join('');
}

// Find which vowel atom in the syllable should carry the tone.
// Simplified Vietnamese rule:
//   - If there's a "priority" vowel (â, ê, ô, ơ, ư, ă) it takes the tone.
//   - For vowel clusters: if the cluster is at the end of the word, tone goes
//     on the second-to-last vowel for common diphthongs (oa, oe, uy -> last),
//     otherwise on the first. We use a pragmatic rule that covers kid-level words.
function findToneTargetIndex(buffer) {
  // Tones apply only within the CURRENT syllable — the run of atoms after the
  // last space. Without this, a tone key typed in a later syllable would bleed
  // onto an earlier one (e.g. "quar tas" wrongly retoning quả -> quá).
  let syllableStart = 0;
  for (let i = buffer.length - 1; i >= 0; i--) {
    if (!buffer[i].isVowel && buffer[i].c === ' ') {
      syllableStart = i + 1;
      break;
    }
  }

  let vowelIdx = [];
  for (let i = syllableStart; i < buffer.length; i++) {
    if (buffer[i].isVowel) vowelIdx.push(i);
  }
  if (vowelIdx.length === 0) return -1;

  // Glide exception: in "qu..." and "gi..." the u/i is part of the initial
  // consonant, not a tone-bearing vowel — as long as another vowel follows.
  // e.g. "qua" -> tone on a (quả), "gia" -> tone on a (giá).
  if (vowelIdx.length >= 2) {
    const first = vowelIdx[0];
    const prev = first > 0 ? buffer[first - 1] : null;
    const firstBase = buffer[first].base;
    const prevCh = prev && !prev.isVowel ? (prev.c || '').toLowerCase() : '';
    if ((prevCh === 'q' && firstBase === 'u') || (prevCh === 'g' && firstBase === 'i')) {
      vowelIdx = vowelIdx.slice(1); // drop the glide vowel from consideration
    }
  }
  if (vowelIdx.length === 1) return vowelIdx[0];

  // Priority vowels (with horn/hat) always win. When more than one is present
  // (e.g. the "ươ" cluster), the LAST such vowel carries the tone -> đ-ư-Ợ-c.
  const priority = new Set(['â', 'ê', 'ô', 'ơ', 'ư', 'ă']);
  let lastPriority = -1;
  for (const i of vowelIdx) {
    if (priority.has(buffer[i].base)) lastPriority = i;
  }
  if (lastPriority !== -1) return lastPriority;

  // Is there a final consonant after the last vowel?
  const lastVowel = vowelIdx[vowelIdx.length - 1];
  const hasFinalConsonant = lastVowel < buffer.length - 1;

  if (hasFinalConsonant) {
    // Closed syllable: tone on the last vowel of the cluster.
    return lastVowel;
  }
  // Open syllable, no priority vowel: modern Vietnamese places the tone on the
  // first vowel of the trailing cluster (hóa, thúy, khỏe, of oa/oe/uy/oo...).
  return vowelIdx[vowelIdx.length - 2];
}

function applyToneToBuffer(buffer, toneIdx) {
  const target = findToneTargetIndex(buffer);
  if (target === -1) return { changed: false };
  // If the same tone is already there, this is an undo (handled by caller).
  buffer[target].tone = toneIdx;
  return { changed: true, target };
}

// ---------------------------------------------------------------------------
// applyKey — the main entry point
// ---------------------------------------------------------------------------
// Given the current buffer (array of atoms) and a raw key (single char),
// returns a NEW buffer. Also records the last transform for undo detection.

export function newBuffer() {
  return [];
}

export function applyKey(buffer, key) {
  buffer = buffer.map((a) => ({ ...a })); // clone (immutable-ish)

  const isUpper = key >= 'A' && key <= 'Z';
  const lower = key.toLowerCase();
  const last = buffer[buffer.length - 1];

  // --- Tone keys (s f r x j) ---
  if (lower in TONE_KEYS) {
    const toneIdx = TONE_KEYS[lower];
    const target = findToneTargetIndex(buffer);
    if (target !== -1) {
      if (buffer[target].tone === toneIdx) {
        // Undo: same tone pressed again -> remove tone, emit literal key.
        buffer[target].tone = 0;
        buffer.push(makeConsonantAtom(key));
      } else if (buffer[target].tone !== 0 && toneIdx !== 0) {
        // Different tone replaces the old one (real Telex replaces).
        buffer[target].tone = toneIdx;
      } else {
        buffer[target].tone = toneIdx;
      }
      return buffer;
    }
    // No vowel yet -> literal consonant.
    buffer.push(makeConsonantAtom(key));
    return buffer;
  }

  // --- 'd' doubling -> đ ---
  if (lower === 'd') {
    if (last && !last.isVowel && (last.c === 'd' || last.c === 'D')) {
      // dd -> đ  (preserve case of the first d)
      const upper = last.c === 'D';
      buffer[buffer.length - 1] = makeConsonantAtom(upper ? 'Đ' : 'đ');
      return buffer;
    }
    if (last && !last.isVowel && (last.c === 'đ' || last.c === 'Đ')) {
      // ddd -> revert to literal "dd"
      const upper = last.c === 'Đ';
      buffer[buffer.length - 1] = makeConsonantAtom(upper ? 'D' : 'd');
      buffer.push(makeConsonantAtom(key));
      return buffer;
    }
    buffer.push(makeConsonantAtom(key));
    return buffer;
  }

  // --- Vowel shape transforms (aa, ee, oo, aw, ow, uw) ---
  if (lower === 'w') {
    const prev = buffer[buffer.length - 2];

    // Undo a linked "ươ" shape: one 'w' shaped both u->ư and o->ơ, so a second
    // 'w' reverts both (u o) and emits the literal 'w'.
    if (
      last && last.isVowel && last.shaped && last.shapeKey === 'w' && last.base === 'ơ' &&
      prev && prev.isVowel && prev.shaped && prev.shapeKey === 'w' && prev.base === 'ư' &&
      last.linkedShape && prev.linkedShape
    ) {
      last.base = last.preShapeBase;
      last.shaped = false;
      last.shapeKey = undefined;
      last.preShapeBase = undefined;
      last.linkedShape = false;
      prev.base = prev.preShapeBase;
      prev.shaped = false;
      prev.shapeKey = undefined;
      prev.preShapeBase = undefined;
      prev.linkedShape = false;
      buffer.push(makeConsonantAtom(key));
      return buffer;
    }

    // Undo a w-shape: "aw" -> ă, then another "w" -> "aw".
    if (last && last.isVowel && last.shaped && last.shapeKey === 'w') {
      const prevTone = last.tone;
      last.base = last.preShapeBase;
      last.shaped = false;
      last.shapeKey = undefined;
      last.preShapeBase = undefined;
      last.tone = prevTone;
      buffer.push(makeConsonantAtom(key));
      return buffer;
    }
    // Linked "ươ": typing 'w' after a "uo" cluster (last=o, prev=u) shapes BOTH
    // to ư+ơ, so kids can type "uow" instead of "uwow" (e.g. rượu, được, người).
    if (
      last && last.isVowel && last.base === 'o' &&
      prev && prev.isVowel && prev.base === 'u'
    ) {
      prev.preShapeBase = 'u';
      prev.base = 'ư';
      prev.shaped = true;
      prev.shapeKey = 'w';
      prev.linkedShape = true;
      last.preShapeBase = 'o';
      last.base = 'ơ';
      last.shaped = true;
      last.shapeKey = 'w';
      last.linkedShape = true;
      return buffer;
    }
    // w after a/o/u -> ă/ơ/ư
    if (last && last.isVowel && SHAPE[last.base] && SHAPE[last.base].w) {
      last.preShapeBase = last.base;
      last.base = SHAPE[last.base].w;
      last.shaped = true;
      last.shapeKey = 'w';
      return buffer;
    }
    // Standalone convenience: w -> ư
    const atom = makeVowelAtom('ư', 0, isUpper);
    atom.shaped = true;
    atom.shapeKey = 'w';
    atom.preShapeBase = 'u';
    buffer.push(atom);
    return buffer;
  }

  // Vowel letters a e i o u y
  if (['a', 'e', 'i', 'o', 'u', 'y'].includes(lower)) {
    // Undo a shape produced by this exact doubling key:
    //   "aa" -> â, then another "a" -> "aa"  (â reverts, literal a appended)
    if (last && last.isVowel && last.shaped && last.shapeKey === lower) {
      const prevTone = last.tone;
      last.base = lower;
      last.shaped = false;
      last.shapeKey = undefined;
      last.tone = prevTone;
      buffer.push(makeVowelAtom(lower, 0, isUpper));
      return buffer;
    }
    // Apply a doubling shape: aa->â, ee->ê, oo->ô.
    if (last && last.isVowel && SHAPE[last.base] && SHAPE[last.base][lower]) {
      const prevTone = last.tone;
      last.base = SHAPE[last.base][lower];
      last.shaped = true;
      last.shapeKey = lower;
      last.tone = prevTone;
      return buffer;
    }
    buffer.push(makeVowelAtom(lower, 0, isUpper));
    return buffer;
  }

  // --- Any other consonant/character ---
  buffer.push(makeConsonantAtom(key));
  return buffer;
}

// Convenience: type a whole raw string from empty buffer.
export function typeString(raw) {
  let buf = newBuffer();
  for (const ch of raw) buf = applyKey(buf, ch);
  return render(buf);
}

// ---------------------------------------------------------------------------
// Telex-aware prefix matching (for progress tracking)
// ---------------------------------------------------------------------------
// In Telex, a vowel is typed BEFORE its tone/shape is applied: "bé" is keyed
// b-e-s, so the rendered buffer passes through "be" on its way to "bé". A plain
// string prefix check would flag that intermediate "e" as a mistake (it's not a
// prefix of "bé"), turning a correct keystroke red. To decide whether the kid is
// still on the right path, we compare characters up to tone/shape: an untoned or
// unshaped vowel is a valid ancestor of the corresponding toned/shaped target
// vowel. So "e" matches "é", "a" matches "â"/"ắ", "o" matches "ố", etc.

// Which target bases a typed base can still turn into. A raw letter can grow a
// shape (a -> â/ă, e -> ê, o -> ô/ơ, u -> ư); an already-shaped base (â, ơ, ư…)
// only matches itself. Every base is an ancestor of itself, so a buffer that has
// already been shaped (e.g. "ngươ" toward "người") still reads as on-path.
const SHAPE_ANCESTORS = {};
for (const base of Object.keys(TONE_TABLE)) SHAPE_ANCESTORS[base] = new Set([base]);
SHAPE_ANCESTORS.a.add('â').add('ă');
SHAPE_ANCESTORS.e.add('ê');
SHAPE_ANCESTORS.o.add('ô').add('ơ');
SHAPE_ANCESTORS.u.add('ư');

// Is the typed character `cur` a valid Telex ancestor of the target character
// `tgt`? Exact match always counts. Otherwise both must be vowels, tones are
// ignored (the tone key comes later), and `cur`'s base must be a shape-ancestor
// of `tgt`'s base (the shape key also comes later).
function charOnPath(cur, tgt) {
  // Case-INSENSITIVE throughout: the audience is kids, and a capitalized target
  // (proper nouns like "Tết") must not demand a Shift-chord on top of learning
  // Telex. Both sides are folded to lowercase before every comparison, so "t"
  // satisfies "T" and a stray Shift never reads as a mistake. Only matching is
  // case-blind — render() still shows exactly the case the kid typed.
  cur = cur.toLowerCase();
  tgt = tgt.toLowerCase();
  if (cur === tgt) return true;
  // Consonant shape: "dd" -> đ is two keystrokes, so a lone "d" is a valid
  // ancestor of the target "đ" (the second d comes next).
  if (cur === 'd' && tgt === 'đ') return true;
  const ci = CHAR_INFO[cur];
  const ti = CHAR_INFO[tgt];
  if (!ci || !ti) return false;
  // The typed char must be LESS specified than the target, never more: you reach
  // the target by adding a tone/shape key, so a bare vowel can precede a
  // toned/shaped one — but a toned `cur` against an untoned target means an extra
  // tone the target doesn't want (off-path).
  if (ci.tone !== 0 && ci.tone !== ti.tone) return false;
  const anc = SHAPE_ANCESTORS[ci.base];
  return !!anc && anc.has(ti.base);
}

// How many leading characters of `cur` are a valid Telex-path prefix of `target`.
export function telexPrefixLen(cur, target) {
  let i = 0;
  while (i < cur.length && i < target.length && charOnPath(cur[i], target[i])) i++;
  return i;
}

// True when `cur` can still become `target` by typing more keys — i.e. every
// character typed so far is on the Telex path to the matching target character,
// and the kid hasn't typed past the end of the target.
export function isTelexPrefix(cur, target) {
  if (cur.length > target.length) return false;
  return telexPrefixLen(cur, target) === cur.length;
}

// stepKey — THE shared "type one raw key toward a target word" primitive.
//
// Both real gameplay (input.js TypingTracker) and the tutorial (tutorial.js)
// run keystrokes through this so their typing behaves IDENTICALLY. Anything
// that used to be duplicated between them (auto-restart, mistake detection,
// completion) lives here now — change it once, both get it.
//
// Pure: takes the current buffer + a raw key + the target word, returns a small
// result object. Callers own their own side effects (audio, timing, drawing).
//
//   buffer   the current atom buffer (from newBuffer()/applyKey())
//   key      a raw key: a single printable char, or 'Backspace'
//   target   the Vietnamese word being typed toward
//
// Returns { buffer, text, matchedLen, mistake, complete, restarted, consumed }:
//   buffer      the NEW buffer after applying the key (unchanged if !consumed)
//   text        render(buffer) — what's displayed so far
//   matchedLen  leading chars of target correctly matched (Telex-aware)
//   mistake     buffer has gone off the rails (can't reach target by typing more)
//   complete    text === target
//   restarted   the key triggered an auto-restart from a mistaken buffer
//   consumed    the key changed state (false for ignored non-printable keys)
export function stepKey(buffer, key, target) {
  if (key === 'Backspace') {
    buffer = buffer.slice(0, -1);
    return status(buffer, target, { consumed: true });
  }

  // Ignore anything that isn't a single printable character.
  if (key.length !== 1) {
    return status(buffer, target, { consumed: false });
  }

  // Auto-restart: once the buffer has gone off the rails, a wrong word is hard
  // for a kid to un-type key by key. So if they simply start typing the word
  // again — the next key, applied to a FRESH buffer, would be a valid start of
  // the target — we wipe the mistake and treat this key as the first key of a
  // new attempt. This lets them retype from the beginning without hunting for
  // Backspace.
  if (!isTelexPrefix(render(buffer), target)) {
    const fresh = applyKey(newBuffer(), key);
    // Telex-aware: the first key of a real retype may render as a bare vowel that
    // only BECOMES the target's first char after its tone/shape key (o -> ô for
    // "ông", d -> đ for "đi"). A plain string startsWith would reject those and
    // strand the kid on the mistake, so ask isTelexPrefix whether the fresh
    // buffer is still on the path to the target.
    if (isTelexPrefix(render(fresh), target)) {
      return status(fresh, target, { consumed: true, restarted: true });
    }
  }

  buffer = applyKey(buffer, key);
  return status(buffer, target, { consumed: true });
}

// Build the stepKey result object for a given buffer/target.
function status(buffer, target, extra) {
  const text = render(buffer);
  return {
    buffer,
    text,
    matchedLen: telexPrefixLen(text, target),
    mistake: !isTelexPrefix(text, target),
    // Case-insensitive, like every other comparison here (see charOnPath): a kid
    // typing "teets" finishes the target "Tết" without ever pressing Shift.
    complete: text.toLowerCase() === target.toLowerCase(),
    restarted: false,
    consumed: false,
    ...extra,
  };
}
