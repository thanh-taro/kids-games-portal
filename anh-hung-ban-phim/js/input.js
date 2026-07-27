// input.js — captures raw keystrokes, runs them through the Telex engine, and
// tracks progress against a target Vietnamese word.
//
// The game sets a target (e.g. "mèo"). The kid types raw Telex keys ("meof").
// After each key we render the buffer and compare, prefix-wise, to the target:
//   - matchedLen: how many leading chars of the target are correct so far
//   - complete: whole target matched
//   - mistake: the current buffer diverges from the target (wrong path)

import { newBuffer, render, telexPrefixLen, isTelexPrefix, stepKey, typeString } from './telex.js';

export class TypingTracker {
  constructor() {
    this.buffer = newBuffer();
    this.target = '';
    this.onComplete = null; // callback set by game
    this.onProgress = null; // callback(matchedLen, mistake)
    this.enabled = false;
    // True from the completing keystroke until the NEXT setTarget() call. The
    // word a kid just finished typically stays on screen a few frames (its
    // projectile travelling, the monster resolving the hit) — without this,
    // clear() (called right away by main.js so no more keys land on the old
    // word) would blank matchedLen() back to 0 and the just-completed word
    // would flash back to "not yet typed", reading as "type it again".
    this.completed = false;
  }

  setTarget(word, telex = '') {
    this.target = word;
    this.telex = telex;              // ideal clean keystroke sequence
    this.buffer = newBuffer();
    this.enabled = true;
    this.completed = false;
    this.keystrokes = 0;            // printable keys pressed for this word
    this.usedBackspace = false;     // any correction this word?
    this.startTime = 0;             // stamped on the FIRST key (see handleKey)
    this.elapsedMs = 0;             // time from first key to completion
    // How many times THIS word attempt has gone off the rails (isMistake()
    // true). Distinct from usedBackspace/wasClean, which judge the whole word
    // after the fact — this counts live, for Princess Dòng Suối's Cleanse
    // support (main.js), which watches for a kid stuck fumbling repeatedly.
    this.mistakeCount = 0;
  }

  clear() {
    this.buffer = newBuffer();
    this.enabled = false;
  }

  get current() {
    return render(this.buffer);
  }

  // How many leading characters currently match the target.
  //
  // Telex-aware: an untoned/unshaped vowel counts as matching its eventual
  // toned/shaped target char, since the tone/shape key is typed AFTER the vowel
  // (b-e-s -> "bé"). So while typing "bé", the intermediate "be" already scores 2
  // matched chars instead of 1 — the "e" isn't treated as wrong.
  //
  // Once completed, this stays pinned at the full target length (see
  // `completed`) so the word stays fully highlighted instead of snapping back
  // to unmatched the instant clear() empties the buffer.
  matchedLen() {
    if (this.completed) return this.target.length;
    return telexPrefixLen(this.current, this.target);
  }

  // How many leading keystrokes of the ideal Telex sequence the kid has, in
  // effect, already entered — used to light up the on-screen keystroke guide so
  // a beginner can see exactly which letter to press next.
  //
  // We read it off the buffer STATE, not a keystroke counter: the largest ideal
  // prefix whose typed result is a Telex-ancestor of what's on screen. So b-e-s
  // toward "bé" walks 1→2→3 — the tone key "s" lights its own slot even though
  // it only modifies the "e" already shown. Reading state (not counting keys)
  // stays correct across the auto-restart that a fresh retype triggers.
  // While off the rails (isMistake) we surface 0 so the guide never runs ahead
  // of the kid; the caller also drops the "next key" cue in that case.
  telexMatchedLen() {
    if (this.completed) return this.telex.length;
    if (!this.telex || this.isMistake()) return 0;
    const cur = this.current;
    let best = 0;
    for (let k = 1; k <= this.telex.length; k++) {
      if (isTelexPrefix(typeString(this.telex.slice(0, k)), cur)) best = k;
      else break;
    }
    return best;
  }

  // True if the current buffer has gone "off the rails" (diverged from target).
  isMistake() {
    if (this.completed) return false;
    // A mistake = the current string can no longer become the target by typing
    // more Telex keys. Legitimate intermediate states (an untoned vowel on the
    // way to its toned form) are NOT mistakes — see telexPrefixLen.
    return !isTelexPrefix(this.current, this.target);
  }

  handleKey(key) {
    if (!this.enabled) return;

    // Run the key through the shared Telex typing primitive — the SAME logic the
    // tutorial uses (backspace, auto-restart, mistake/complete detection). This
    // tracker only layers on the gameplay bookkeeping: timing, keystroke
    // economy for combo cleanliness, and progress/complete callbacks.
    const r = stepKey(this.buffer, key, this.target);
    if (!r.consumed) return; // ignored non-printable key

    if (key === 'Backspace') {
      this.buffer = r.buffer;
      this.usedBackspace = true; // a correction breaks a "clean" streak
      this._emitProgress();
      return;
    }

    // A restart still breaks a "clean" streak (like a backspace would).
    if (r.restarted) this.usedBackspace = true;

    // Start the per-word clock on the first real key, so the time the word
    // spends floating on-screen before the kid starts typing isn't counted.
    if (this.keystrokes === 0) this.startTime = Date.now();
    this.keystrokes++;
    this.buffer = r.buffer;

    if (r.complete) {
      this.enabled = false;
      this.completed = true;
      this.elapsedMs = this.startTime ? Date.now() - this.startTime : 0;
      if (this.onProgress) this.onProgress(this.target.length, false);
      if (this.onComplete) this.onComplete(this.wasClean());
      return;
    }
    this._emitProgress();
  }

  // A word was typed "cleanly" if it took no more keystrokes than the ideal
  // Telex sequence and used no backspaces. Telex has legitimate intermediate
  // states that aren't prefixes of the target (typing "ga" before the tone key
  // "f" yields "ga", not yet "gà"), so we can't judge cleanliness per-keystroke
  // — only at completion, by keystroke economy.
  wasClean() {
    if (this.usedBackspace) return false;
    if (this.telex) return this.keystrokes <= this.telex.length;
    return true;
  }

  _emitProgress() {
    const mistake = this.isMistake();
    if (mistake) this.mistakeCount++;
    if (this.onProgress) this.onProgress(this.matchedLen(), mistake);
  }
}

// Install a global keydown listener that forwards keys to a tracker. `tracker`
// only needs a `handleKey(key)` method — main.js passes a small dispatch
// object (not a TypingTracker itself) so it can route each keystroke to
// whichever of its two trackers is currently active (see the Staff of
// Wisdom's spell in main.js). Returns a teardown function.
export function attachKeyboard(tracker) {
  const handler = (e) => {
    // Ignore modifier combos so shortcuts still work.
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      tracker.handleKey('Backspace');
      return;
    }
    if (e.key.length === 1) {
      e.preventDefault();
      tracker.handleKey(e.key);
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}
