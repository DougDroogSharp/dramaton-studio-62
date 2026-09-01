// DramScript HTML reference generator.
// Emits docs/dramscript-reference.html — the shareable, readable spec —
// from the same registry that drives docs/DRAM_SCRIPT.md.
// Run with: npm run docs:dram:html

import { COMMAND_DOCS, CATEGORY_INFO, CommandDoc } from './scriptDocs';

const CATEGORY_ORDER: CommandDoc['category'][] = [
  'dialogue', 'scene', 'actor', 'choice', 'flow',
  'instrument', 'effect', 'audio', 'button',
];

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Syntax-tint a DramScript snippet: bracketed commands, speaker cues,
// quoted text, comparison/assignment operators.
function tint(src: string): string {
  const lines = esc(src).split('\n').map(line => {
    // Choice options
    if (/^\s*-\s/.test(line)) {
      return line
        .replace(/(&quot;[^&]*?&quot;|"[^"]*")/g, '<span class="s-str">$1</span>')
        .replace(/(-&gt;\s*\w+)/g, '<span class="s-target">$1</span>')
        .replace(/(\(if [^)]*\))/g, '<span class="s-gate">$1</span>')
        .replace(/(\[[^\]]+\])/g, '<span class="s-cmd">$1</span>');
    }
    // Speaker cue:  NAME (Tag): "text"
    const cue = line.match(/^([A-Z][\w ]*)(\s*\([^)]*\))?:\s*(.*)$/);
    if (cue && !line.startsWith('[')) {
      const [, name, tag, rest] = cue;
      return `<span class="s-actor">${name}</span>${tag ? `<span class="s-tag">${tag}</span>` : ''}: <span class="s-str">${rest}</span>`;
    }
    // Bracketed command
    return line.replace(/\[([A-Z_/]+)([^\]]*)\]/g, (_m, head, tail) =>
      `<span class="s-brk">[</span><span class="s-key">${head}</span><span class="s-arg">${tail}</span><span class="s-brk">]</span>`);
  });
  return lines.join('\n');
}

function commandCard(doc: CommandDoc): string {
  const docParams = doc.parameters ?? [];
  const params = docParams.length
    ? `<dl class="params">${docParams.map(p => `
        <div class="param">
          <dt><code>${esc(p.name)}</code><span class="ptype">${esc(p.type)}${p.optional ? ' · optional' : ''}</span></dt>
          <dd>${esc(p.description)}</dd>
        </div>`).join('')}</dl>`
    : '';
  return `
    <article class="cmd" id="cmd-${doc.type.toLowerCase()}">
      <header class="cmd-head">
        <h3>${esc(doc.type)}</h3>
        <pre class="syntax"><code>${tint(doc.syntax)}</code></pre>
      </header>
      <p class="desc">${esc(doc.description)}</p>
      ${params}
      <div class="example">
        <span class="ex-label">Example</span>
        <pre><code>${tint(doc.example)}</code></pre>
      </div>
    </article>`;
}

export function generateHtml(): string {
  const byCat = CATEGORY_ORDER.map(cat => ({
    cat,
    info: CATEGORY_INFO[cat],
    docs: COMMAND_DOCS.filter(d => d.category === cat),
  })).filter(g => g.docs.length > 0);

  const total = COMMAND_DOCS.length;

  const nav = byCat.map(g => `
    <li class="nav-group">
      <span class="nav-cat">${esc(g.info?.title ?? g.cat)}</span>
      <ul>${g.docs.map(d => `<li><a href="#cmd-${d.type.toLowerCase()}">${esc(d.type)}</a></li>`).join('')}</ul>
    </li>`).join('');

  const sections = byCat.map(g => `
    <section class="cat" id="cat-${g.cat}">
      <div class="cat-head">
        <h2>${esc(g.info?.title ?? g.cat)}</h2>
        <p>${esc(g.info?.description ?? '')}</p>
      </div>
      ${g.docs.map(commandCard).join('')}
    </section>`).join('');

  return `<title>DramScript Reference</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans+Condensed:wght@600;700&family=IBM+Plex+Serif:ital,wght@0,400;0,500;1,400&display=swap">
<style>
:root {
  --ink:        #1b1a17;
  --ink-soft:   #4a4740;
  --foolscap:   #efe9dc;
  --card:       #f7f3e9;
  --rule:       #d3cab5;
  --pencil-red: #b3241f;
  --pencil-grn: #2f6b4f;
  --stamp:      #8a7b53;
  --shadow:     rgba(27, 26, 23, .09);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ink:        #e8e2d4;
    --ink-soft:   #a29a89;
    --foolscap:   #16161a;
    --card:       #1e1e23;
    --rule:       #34333b;
    --pencil-red: #e8635c;
    --pencil-grn: #6fbf95;
    --stamp:      #b7a678;
    --shadow:     rgba(0, 0, 0, .4);
  }
}
:root[data-theme="dark"] {
  --ink:        #e8e2d4;
  --ink-soft:   #a29a89;
  --foolscap:   #16161a;
  --card:       #1e1e23;
  --rule:       #34333b;
  --pencil-red: #e8635c;
  --pencil-grn: #6fbf95;
  --stamp:      #b7a678;
  --shadow:     rgba(0, 0, 0, .4);
}

* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--foolscap);
  color: var(--ink);
  font-family: "IBM Plex Serif", Georgia, serif;
  font-size: 16px;
  line-height: 1.6;
}
code, pre, .mono { font-family: "IBM Plex Mono", ui-monospace, Menlo, monospace; }
h1, h2, h3, .cond {
  font-family: "IBM Plex Sans Condensed", "Arial Narrow", sans-serif;
  font-weight: 700;
  text-wrap: balance;
}

/* ---- masthead ---- */
.masthead {
  border-bottom: 2px solid var(--ink);
  padding: clamp(2rem, 6vw, 4rem) clamp(1rem, 4vw, 3rem) 1.5rem;
  max-width: 78rem; margin: 0 auto;
}
.slug {
  font-family: "IBM Plex Mono", monospace;
  font-size: .72rem; letter-spacing: .18em; text-transform: uppercase;
  color: var(--stamp); margin-bottom: 1rem;
}
.masthead h1 {
  margin: 0; line-height: .92;
  font-size: clamp(2.8rem, 9vw, 6rem);
  letter-spacing: -.02em; text-transform: uppercase;
}
.masthead h1 em {
  font-style: normal; color: var(--pencil-red);
}
.lede {
  max-width: 34em; margin: 1.25rem 0 0;
  font-size: 1.06rem; color: var(--ink-soft);
}
.stats {
  display: flex; flex-wrap: wrap; gap: 0 2.5rem;
  margin-top: 1.75rem; padding-top: 1.25rem;
  border-top: 1px solid var(--rule);
  font-family: "IBM Plex Mono", monospace; font-size: .78rem;
  color: var(--ink-soft); font-variant-numeric: tabular-nums;
}
.stats b { color: var(--ink); font-weight: 600; }

/* ---- layout ---- */
.wrap {
  max-width: 78rem; margin: 0 auto;
  padding: 0 clamp(1rem, 4vw, 3rem) 6rem;
  display: grid; grid-template-columns: 13rem minmax(0, 1fr); gap: clamp(1.5rem, 4vw, 3.5rem);
}
@media (max-width: 60rem) { .wrap { grid-template-columns: 1fr; } nav.index { position: static; max-height: none; } }

nav.index {
  position: sticky; top: 0; align-self: start;
  max-height: 100vh; overflow-y: auto;
  padding: 2rem 0; font-size: .8rem;
}
nav.index ul { list-style: none; margin: 0; padding: 0; }
.nav-group { margin-bottom: 1.25rem; }
.nav-cat {
  display: block; font-family: "IBM Plex Sans Condensed", sans-serif;
  font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
  font-size: .72rem; color: var(--stamp); margin-bottom: .35rem;
}
.nav-group ul { display: flex; flex-wrap: wrap; gap: .15rem .5rem; }
nav.index a {
  color: var(--ink-soft); text-decoration: none;
  font-family: "IBM Plex Mono", monospace; font-size: .74rem;
  border-bottom: 1px solid transparent;
}
nav.index a:hover, nav.index a:focus-visible {
  color: var(--pencil-red); border-bottom-color: var(--pencil-red); outline: none;
}

main { padding-top: 2rem; min-width: 0; }

/* ---- prologue ---- */
.prologue {
  border-left: 3px solid var(--pencil-grn);
  padding: .25rem 0 .25rem 1.25rem; margin-bottom: 3.5rem;
  max-width: 40em;
}
.prologue p { margin: 0 0 .9rem; }
.prologue p:last-child { margin-bottom: 0; }
.prologue strong { font-weight: 500; color: var(--pencil-grn); }

/* ---- categories ---- */
.cat { margin-bottom: 4rem; scroll-margin-top: 1rem; }
.cat-head { border-top: 2px solid var(--ink); padding-top: .75rem; margin-bottom: 1.75rem; }
.cat-head h2 {
  margin: 0; font-size: clamp(1.4rem, 3.4vw, 2rem);
  text-transform: uppercase; letter-spacing: -.01em;
}
.cat-head p { margin: .25rem 0 0; color: var(--ink-soft); font-size: .95rem; max-width: 40em; }

/* ---- command cards ---- */
.cmd {
  background: var(--card);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 1.25rem 1.35rem 1.35rem;
  margin-bottom: 1.1rem;
  box-shadow: 0 1px 2px var(--shadow);
  scroll-margin-top: 1rem;
}
.cmd-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: .5rem 1rem; }
.cmd-head h3 {
  margin: 0; font-size: 1.25rem; letter-spacing: .02em;
  text-transform: uppercase; color: var(--pencil-red);
}
.syntax {
  flex: 1 1 22rem; min-width: 0; margin: 0;
  overflow-x: auto; padding: .45rem .6rem;
  background: color-mix(in srgb, var(--ink) 5%, transparent);
  border-radius: 2px; font-size: .8rem; line-height: 1.7;
}
.desc { margin: .85rem 0 0; max-width: 46em; }

.params { margin: 1rem 0 0; display: grid; gap: .3rem; }
.param { display: grid; grid-template-columns: 11rem minmax(0, 1fr); gap: .75rem; align-items: baseline; }
@media (max-width: 40rem) { .param { grid-template-columns: 1fr; gap: .1rem; } }
.param dt { margin: 0; }
.param dt code { font-size: .82rem; font-weight: 600; }
.ptype {
  display: block; font-family: "IBM Plex Mono", monospace;
  font-size: .66rem; text-transform: uppercase; letter-spacing: .06em;
  color: var(--stamp);
}
.param dd { margin: 0; font-size: .92rem; color: var(--ink-soft); }

.example { margin-top: 1.1rem; }
.ex-label {
  display: block; font-family: "IBM Plex Mono", monospace;
  font-size: .66rem; text-transform: uppercase; letter-spacing: .14em;
  color: var(--stamp); margin-bottom: .35rem;
}
.example pre {
  margin: 0; overflow-x: auto;
  padding: .8rem .9rem;
  border-left: 2px solid var(--pencil-grn);
  background: color-mix(in srgb, var(--ink) 4%, transparent);
  font-size: .82rem; line-height: 1.75;
}

/* ---- syntax tint ---- */
.s-key    { color: var(--pencil-red); font-weight: 600; }
.s-brk    { color: var(--stamp); }
.s-arg    { color: var(--ink); }
.s-actor  { color: var(--pencil-grn); font-weight: 600; }
.s-tag    { color: var(--stamp); }
.s-str    { color: var(--ink-soft); font-style: italic; }
.s-cmd    { color: var(--pencil-red); }
.s-target { color: var(--pencil-grn); }
.s-gate   { color: var(--stamp); }

footer.colophon {
  max-width: 78rem; margin: 0 auto;
  padding: 2rem clamp(1rem, 4vw, 3rem) 4rem;
  border-top: 1px solid var(--rule);
  font-family: "IBM Plex Mono", monospace; font-size: .74rem;
  color: var(--stamp); max-width: 78rem;
}
</style>

<header class="masthead">
  <div class="slug">Dramaton Engine · Language Reference · ${total} commands</div>
  <h1>Dram<em>Script</em></h1>
  <p class="lede">
    A line-based language for directing actors, backdrops, cameras and an economy at
    the same time. Every line is either a stage direction in brackets or a character
    speaking — the whole grammar fits on a page, and a scene reads like a script.
  </p>
  <div class="stats">
    <span><b>${total}</b> commands</span>
    <span><b>9</b> categories</span>
    <span>Lineage: <b>1986</b> King of Chicago → GODinabox → Dramaton</span>
  </div>
</header>

<div class="wrap">
  <nav class="index" aria-label="Command index">
    <ul>${nav}</ul>
  </nav>

  <main>
    <div class="prologue">
      <p><strong>One command per line.</strong> Bracketed lines are directions —
      <code>[ENTER]</code>, <code>[MOVE]</code>, <code>[SET]</code>. Unbracketed lines are speech:
      a name, a colon, the words. That is the whole shape of the language.</p>
      <p><strong>Nothing crashes.</strong> A malformed expression evaluates to 0 and warns,
      an unknown label falls through, a missing graphic keeps the current look. Scripts
      degrade; the theater keeps running.</p>
      <p><strong>The world is one bag of variables.</strong> <code>SET</code> writes it,
      <code>IF</code> reads it, <code>TICK</code> evolves it, <code>BIND</code> wires it to what
      you see, gauges display it, and <code>NARRATON</code> uses it to choose what happens next.</p>
    </div>
    ${sections}
  </main>
</div>

<footer class="colophon">
  Generated from src/utils/scriptDocs.ts — the command registry is the single source of truth.
  Regenerate with <code>npm run docs:dram:html</code>.
</footer>`;
}

// Node entry: write the file.
if (typeof process !== 'undefined' && process.argv[1]?.includes('generateDramReference')) {
  const { writeFileSync, mkdirSync } = await import('node:fs');
  const { resolve, dirname } = await import('node:path');
  const out = resolve(process.cwd(), 'docs', 'dramscript-reference.html');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, generateHtml(), 'utf8');
  console.log(`Wrote ${out}`);
}
