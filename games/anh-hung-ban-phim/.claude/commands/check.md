---
description: Syntax-check all JS modules, run the Telex test suite and the data-invariant checks
---

Run the project's fast verification pass and report results concisely:

1. Syntax-check every module: `for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done`
2. Run the Telex engine tests: `node js/telex.test.js`
3. Run the data-invariant checks: `node js/verify.js`

Report pass/fail. If the Telex tests fail, show the failing cases (raw → expected vs got). `verify.js` prints one `FAIL` line per broken invariant (sprite geometry/palette, stage↔biome↔roster references, chapter tiling, reward coverage) — show those lines verbatim. Do not fix anything unless asked — just report.
