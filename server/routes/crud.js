import { Router } from 'express';
import { db } from '../db.js';

// spec: { table, fields: { name: (value) => cleanedValueOrThrow }, required: [..] }
export function crud({ table, fields, required, order }) {
  const r = Router();
  const names = Object.keys(fields);
  const clean = (body, partial) => {
    const out = {};
    for (const k of names) {
      if (body[k] === undefined) { if (!partial && required.includes(k)) throw new Error(`${k} is required`); continue; }
      out[k] = fields[k](body[k]);
    }
    return out;
  };
  r.get('/', (_q, res) => res.json(db.prepare(`SELECT * FROM ${table} ORDER BY ${order}`).all()));
  r.post('/', (req, res) => {
    const d = clean(req.body || {}, false), ks = Object.keys(d);
    const info = db.prepare(`INSERT INTO ${table}(${ks.join(',')}) VALUES(${ks.map(k => '@' + k).join(',')})`).run(d);
    res.status(201).json(db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(info.lastInsertRowid));
  });
  r.patch('/:id', (req, res) => {
    const d = clean(req.body || {}, true), ks = Object.keys(d);
    if (!ks.length) return res.status(400).json({ error: 'Nothing to update' });
    const extra = table === 'notes' ? ", updated_at=CURRENT_TIMESTAMP" : (table === 'tasks' && d.status ? ", completed_at=" + (d.status === 'Completed' ? 'CURRENT_TIMESTAMP' : 'NULL') : '');
    const info = db.prepare(`UPDATE ${table} SET ${ks.map(k => `${k}=@${k}`).join(',')}${extra} WHERE id=@id`).run({ ...d, id: Number(req.params.id) });
    if (!info.changes) return res.status(404).json({ error: 'Not found' });
    res.json(db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(req.params.id));
  });
  r.delete('/:id', (req, res) => {
    const info = db.prepare(`DELETE FROM ${table} WHERE id=?`).run(Number(req.params.id));
    info.changes ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
  });
  return r;
}
export const str = (max, req = false) => (v) => {
  const s = String(v ?? '').trim();
  if (req && !s) throw new Error('Value cannot be empty');
  if (s.length > max) throw new Error(`Max ${max} characters`);
  return s;
};
export const oneOf = (list) => (v) => { if (!list.includes(v)) throw new Error(`Must be one of: ${list.join(', ')}`); return v; };
export const date = (v) => { if (v === '' || v == null) return null; if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error('Bad date'); return v; };
export const time = (v) => { if (v === '' || v == null) return null; if (!/^\d{2}:\d{2}$/.test(v)) throw new Error('Bad time'); return v; };
export const bool = (v) => (v ? 1 : 0);
