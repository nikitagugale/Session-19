// The knowledge base and a small keyword search over it. Provided: you do not change this in the lab.
// A section is "## [id] Heading" in data/kb/<doc>.md, and its id is the doc and the id: plans#up-24 (here, just the id: up-24).
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const tokenize = text => String(text).toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) ?? [];

export function loadKb(dir) {
  const sections = [];
  for (const file of readdirSync(dir).filter(f => f.endsWith('.md')).sort()) {
    const doc = file.replace(/\.md$/, '');
    let cur = null;
    for (const line of readFileSync(path.join(dir, file), 'utf8').split(/\r?\n/)) {
      const m = /^## \[([^\]]+)\]\s*(.*)$/.exec(line);
      if (m) { cur = { id: m[1], doc, heading: m[2], lines: [] }; sections.push(cur); }
      else if (cur && line.trim()) cur.lines.push(line.trim());
    }
  }
  const docs = sections.map(s => ({ id: s.id, doc: s.doc, heading: s.heading, text: `${s.heading}. ${s.lines.join(' ')}` }));
  const df = new Map();
  for (const d of docs) for (const t of new Set(tokenize(d.text))) df.set(t, (df.get(t) ?? 0) + 1);
  return { sections: docs, df, n: docs.length };
}

export function retrieve(kb, query, k = 3) {
  const q = [...new Set(tokenize(query))];
  const scored = kb.sections.map(s => {
    const tokens = tokenize(s.text);
    let score = 0;
    for (const t of q) {
      const tf = tokens.filter(x => x === t).length;
      if (!tf) continue;
      score += Math.log(1 + (kb.n - (kb.df.get(t) ?? 0) + 0.5) / ((kb.df.get(t) ?? 0) + 0.5)) * tf / (tf + 1.2);
    }
    return { ...s, score };
  });
  return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, k);
}
