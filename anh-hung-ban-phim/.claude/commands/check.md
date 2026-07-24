---
description: Syntax-check all JS modules and run the Telex test suite
---

Run the project's fast verification pass and report results concisely:

1. Syntax-check every module: `for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done`
2. Run the Telex engine tests: `node js/telex.test.js`

Report pass/fail. If the Telex tests fail, show the failing cases (raw → expected vs got). Do not fix anything unless asked — just report.
