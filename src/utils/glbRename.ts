// Rename node names inside a GLB without three.js: rewrite the JSON chunk
// and re-pack the container. glTF animations and skins reference nodes by
// INDEX, so renaming node.name touches nothing else. Runs in the browser
// and in Node (Buffer is an ArrayBuffer view; pass buf.buffer.slice(...)).
//
// Filed 2026-09-03 00:40 -07:00 by EDITOR (actor-3d lane).

const GLB_MAGIC = 0x46546c67; // 'glTF'
const CHUNK_JSON = 0x4e4f534a; // 'JSON'

interface GlbParts {
  version: number;
  json: unknown;
  rest: { type: number; data: Uint8Array }[];
}

export const splitGlb = (buffer: ArrayBuffer): GlbParts => {
  const view = new DataView(buffer);
  if (buffer.byteLength < 20 || view.getUint32(0, true) !== GLB_MAGIC) throw new Error('Not a GLB file (bad magic)');
  const version = view.getUint32(4, true);
  let offset = 12;
  let json: unknown = undefined;
  const rest: GlbParts['rest'] = [];
  while (offset + 8 <= buffer.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    if (offset + 8 + length > buffer.byteLength) throw new Error('GLB is truncated or corrupt (chunk overruns file)');
    const data = new Uint8Array(buffer, offset + 8, length);
    if (type === CHUNK_JSON && json === undefined) json = JSON.parse(new TextDecoder('utf-8').decode(data));
    else rest.push({ type, data });
    offset += 8 + length;
  }
  if (json === undefined) throw new Error('GLB has no JSON chunk');
  return { version, json, rest };
};

export const joinGlb = ({ version, json, rest }: GlbParts): ArrayBuffer => {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPadded = new Uint8Array(Math.ceil(jsonBytes.length / 4) * 4);
  jsonPadded.fill(0x20);
  jsonPadded.set(jsonBytes);
  const chunks: { type: number; data: Uint8Array }[] = [{ type: CHUNK_JSON, data: jsonPadded }, ...rest.map(c => {
    // Binary chunks are zero-padded to 4 bytes.
    const padded = new Uint8Array(Math.ceil(c.data.length / 4) * 4);
    padded.set(c.data);
    return { type: c.type, data: padded };
  })];
  const total = 12 + chunks.reduce((n, c) => n + 8 + c.data.length, 0);
  const out = new ArrayBuffer(total);
  const view = new DataView(out);
  const bytes = new Uint8Array(out);
  view.setUint32(0, GLB_MAGIC, true);
  view.setUint32(4, version, true);
  view.setUint32(8, total, true);
  let offset = 12;
  for (const c of chunks) {
    view.setUint32(offset, c.data.length, true);
    view.setUint32(offset + 4, c.type, true);
    bytes.set(c.data, offset + 8);
    offset += 8 + c.data.length;
  }
  return out;
};

export const glbNodeNames = (buffer: ArrayBuffer): string[] => {
  const { json } = splitGlb(buffer);
  const nodes = (json as { nodes?: { name?: string }[] }).nodes ?? [];
  return nodes.map(n => n.name ?? '');
};

// Rename every node whose name the map changes. Returns the new GLB and
// how many nodes were renamed (0 = the file is returned unchanged).
export const renameGlbNodes = (
  buffer: ArrayBuffer,
  rename: (name: string) => string,
): { glb: ArrayBuffer; renamed: number } => {
  const parts = splitGlb(buffer);
  const g = parts.json as { nodes?: { name?: string }[] };
  let renamed = 0;
  for (const node of g.nodes ?? []) {
    if (typeof node.name !== 'string') continue;
    const next = rename(node.name);
    if (next !== node.name) { node.name = next; renamed++; }
  }
  if (renamed === 0) return { glb: buffer, renamed: 0 };
  return { glb: joinGlb(parts), renamed };
};
