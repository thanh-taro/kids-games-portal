---
description: Bump the service worker cache version and push the portal to main
---

Ship the current state of the portal to GitHub Pages (deploys from `main`).

1. Run `git status` and `git diff` to see what's changed. If the working tree is
   clean (nothing to ship), say so and stop.
2. Run `node scripts/bump-sw-version.js` — this rewrites `sw.js`'s `CACHE_NAME`
   to a fresh `kids-games-portal-vYYYYMMDDHHMM` (UTC) so installed/offline
   copies pick up the new release instead of serving stale cached files.
3. Stage the changes (the sw.js bump plus whatever else was already modified),
   commit with a concise message summarizing the actual content changes (not
   just "bump cache version" — that's incidental to the real change), ending
   with the standard Co-Authored-By trailer.
4. Push to `main`.
5. Report the new cache version and confirm the push succeeded.

Do not use `--force` or skip hooks. If there are no other changes staged besides
the version bump (i.e. the user just wants to force a cache-bust with no
content change), that's fine — commit and push anyway.
