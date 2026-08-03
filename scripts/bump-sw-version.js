#!/usr/bin/env node
// Bumps sw.js's CACHE_NAME to a fresh release-datetime version
// (kids-games-portal-vYYYYMMDDHHMM, UTC) so every release busts old
// installs' service worker cache. Run via `npm run bump-version` or `/ship`.

const fs = require("fs");
const path = require("path");

const SW_PATH = path.join(__dirname, "..", "sw.js");

function releaseVersion(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const stamp =
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes());
  return `kids-games-portal-v${stamp}`;
}

function bump() {
  const src = fs.readFileSync(SW_PATH, "utf8");
  const pattern = /const CACHE_NAME = "kids-games-portal-v\d+";/;
  if (!pattern.test(src)) {
    throw new Error(`Could not find CACHE_NAME line in ${SW_PATH}`);
  }
  const version = releaseVersion();
  const updated = src.replace(pattern, `const CACHE_NAME = "${version}";`);
  fs.writeFileSync(SW_PATH, updated);
  return version;
}

if (require.main === module) {
  const version = bump();
  console.log(version);
}

module.exports = { releaseVersion, bump };
