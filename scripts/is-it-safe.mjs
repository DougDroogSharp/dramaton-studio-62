// "Is my work safe?" — answered in one word.
//
// Doug asked whether he ever has to check that code reached GitHub. He
// should not have to, and mostly does not: every step is committed and
// pushed. But on 20 Aug 2026 this repo sat 112 commits unpushed for
// days while an outside reviewer read stale code and reported that half
// the engine did not exist. Everything was committed; none of it had
// left the machine.
//
// So: one command, a plain answer, and a non-zero exit if it is not.
//
//   npm run safe
//
// Run `git fetch` first (npm run safe does) or the comparison is
// against whatever the local copy last heard about the remote.

import { execSync } from 'node:child_process';

const sh = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

const dirty = sh('git status --porcelain');
const [behind, ahead] = sh('git rev-list --left-right --count origin/main...HEAD')
  .split(/\s+/).map(Number);
const head = sh('git log --oneline -1');

const problems = [];
if (dirty) {
  const n = dirty.split('\n').length;
  problems.push(`${n} file${n === 1 ? '' : 's'} changed but NOT COMMITTED`);
}
if (ahead) problems.push(`${ahead} commit${ahead === 1 ? '' : 's'} committed but NOT PUSHED to GitHub`);
if (behind) problems.push(`${behind} commit${behind === 1 ? '' : 's'} on GitHub that you do not have locally`);

if (problems.length === 0) {
  console.log('\n  SAFE. Everything is committed and on GitHub.');
  console.log(`  latest: ${head}\n`);
  process.exit(0);
}

console.log('\n  NOT YET SAFE:');
for (const p of problems) console.log(`    - ${p}`);
if (dirty) {
  console.log('\n  uncommitted:');
  for (const line of dirty.split('\n').slice(0, 10)) console.log(`    ${line}`);
  if (dirty.split('\n').length > 10) console.log(`    ...and ${dirty.split('\n').length - 10} more`);
}
console.log(`\n  latest commit: ${head}`);
console.log('  Ask Claude to commit and push, or run: git add -A && git commit -m "..." && git push\n');
process.exit(1);
