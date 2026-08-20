// Group every commit by calendar day, so dev-blog posts are written
// from the record rather than from memory.
//
//   node scripts/devblog-extract.cjs
//
// Prints a per-day summary and writes docs/devblog/_commits-by-day.json.

const { execSync } = require('node:child_process');
const { writeFileSync, mkdirSync } = require('node:fs');

const raw = execSync('git log --date=short --pretty=format:"%ad\t%H\t%s" --reverse', {
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});

const byDay = {};
for (const line of raw.split('\n')) {
  if (!line.trim()) continue;
  const [date, hash, ...rest] = line.split('\t');
  const subject = rest.join('\t');
  (byDay[date] = byDay[date] || []).push({ hash: hash.slice(0, 7), subject });
}

const summary = [];
for (const [date, commits] of Object.entries(byDay)) {
  // Lovable's auto-commits are all titled exactly "Changes" and carry
  // no information; count them separately so a post never pretends
  // they said something.
  const usable = commits.filter(c => c.subject !== 'Changes' && c.subject.trim());
  summary.push({ date, total: commits.length, usable: usable.length });
  console.log(
    `${date}  commits:${String(commits.length).padStart(3)}` +
    `  usable:${String(usable.length).padStart(3)}` +
    `  auto:${String(commits.length - usable.length).padStart(3)}`,
  );
}

mkdirSync('docs/devblog', { recursive: true });
writeFileSync('docs/devblog/_commits-by-day.json', JSON.stringify({ byDay, summary }, null, 1));
console.log('\nwrote docs/devblog/_commits-by-day.json');
