// One-shot data migration (2026-09-02): lift the legacy nested
// `scene.narraton` object in a Dramaton game file onto the flat Narraton
// fields, IN PLACE, keeping the file's formatting (2-space pretty with
// CRLF or LF, or minified) so the diff shows only the lifted scenes.
//
//   node scripts/migrate-narraton.mjs public/machine-toy.json public/hvb-campaign.json ...
//
// Flat fields already on a scene win; the legacy object only fills gaps.
// A legacy `subplot` string becomes a Subplot (created if absent). The
// editor's loader (migrateGameData) does the same lift at load time for
// files this script never touched.

import { readFileSync, writeFileSync } from 'node:fs';
import { narratonFields } from './narraton-fields.mjs';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: node scripts/migrate-narraton.mjs <game.json> [...]');
  process.exit(2);
}

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const crlf = raw.includes('\r\n');
  const pretty = /^\{\r?\n {2}"/.test(raw);
  const trailingNewline = /\r?\n$/.test(raw);
  const data = JSON.parse(raw);

  let lifted = 0;
  let subplotsCreated = 0;
  if (Array.isArray(data.scenes)) {
    data.scenes = data.scenes.map((s) => {
      if (!s || typeof s !== 'object' || !('narraton' in s)) return s;
      lifted++;
      const flat = narratonFields(s.narraton);
      // Rebuild the scene so the flat fields sit where `narraton` sat.
      const out = {};
      for (const [k, v] of Object.entries(s)) {
        if (k !== 'narraton') {
          out[k] = v;
          continue;
        }
        for (const [fk, fv] of Object.entries(flat)) {
          if (!(fk in s)) out[fk] = fv;
        }
      }
      if (flat.subplotId && !(s.subplotId !== undefined)) {
        if (!Array.isArray(data.subplots)) data.subplots = [];
        if (!data.subplots.some((sp) => sp && sp.id === flat.subplotId)) {
          data.subplots.push({ id: flat.subplotId, name: flat.subplotId, status: 'work' });
          subplotsCreated++;
        }
      }
      return out;
    });
  }

  let text = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  if (trailingNewline) text += '\n';
  if (crlf) text = text.replace(/\n/g, '\r\n');
  if (lifted > 0) writeFileSync(file, text);
  console.log(`${file}: ${lifted} scene(s) lifted${subplotsCreated ? `, ${subplotsCreated} subplot(s) created` : ''}${lifted ? '' : ' (unchanged)'}`);
}
