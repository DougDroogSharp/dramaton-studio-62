// The build stamp every game carries on its title page.
//
// Doug: "put a version number on all the games' title pages."
//
// Hand-maintained version numbers in six build scripts would be wrong
// within a day, so this is computed at build time and nobody edits it.
//
// What it needs to answer is one question: WHICH BUILD IS THIS? Doug
// plays on a PC, an iPad and an iPhone, sometimes on a stale cached
// copy, and when he says "this is broken" the useful reply is not a
// number that increments — it is the exact commit and the date it was
// built from. So the stamp is date + short commit hash, plus a mark
// when the tree had uncommitted changes at build time, because a build
// made from unsaved work is not reproducible and should say so.
//
//   2026-08-20 · 10735ba
//   2026-08-20 · 10735ba+   <- the + means "built with uncommitted edits"

import { execSync } from 'node:child_process';

const quiet = (cmd, fallback = '') => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return fallback;
  }
};

export function buildStamp(date = new Date()) {
  const commit = quiet('git rev-parse --short HEAD', 'nogit');
  const dirty = quiet('git status --porcelain') ? '+' : '';
  const day = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
  return {
    version: `${day} · ${commit}${dirty}`,
    builtAt: date.toISOString(),
    commit: `${commit}${dirty}`,
  };
}
