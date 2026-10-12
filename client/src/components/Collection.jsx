import { useEffect, useState } from 'react';
import { Trash2, Pencil, ExternalLink } from 'lucide-react';
import { api } from '../api.js';

const parse = (v) => { try { return JSON.parse(v || '[]'); } catch { return []; } };

// Generic list + form for a table. Used by Subjects, Coding, Exams and Projects.
export default function Collection({ path, noun, fields, blank, titleOf, subOf, linksOf, itemsField, filter, extra }) {
  const [rows, setRows] = useState(null), [form, setForm] = useState(null), [q, setQ] = useState(''), [f, setF] = useState(''), [err, setErr] = useState(''), [newItem, setNewItem] = useState('');
  const load = () => api(path).then(setRows).catch(e => setErr(e.message));
  useEffect(() => { load(); }, [path]);
  const run = async (fn) => { setErr(''); try { await fn(); await load(); } catch (e) { setErr(e.message); } };
  const states = itemsField?.states || [];
  const items = (r) => (itemsField ? parse(r[itemsField.key]) : []);
  const pct = (r) => { const a = items(r); return a.length ? Math.round(a.filter(i => i.s === states[states.length - 1]).length / a.length * 100) : 0; };

  const edit = (r) => setForm(itemsField ? { ...r, [itemsField.key]: items(r) } : { ...r });
  const save = (e) => {
    e.preventDefault();
    const body = {};
    fields.forEach(x => { body[x.key] = form[x.key] ?? ''; });
    if (itemsField) body[itemsField.key] = JSON.stringify(form[itemsField.key] || []);
    run(async () => { await api(path + (form.id ? '/' + form.id : ''), { method: form.id ? 'PATCH' : 'POST', body }); setForm(null); });
  };
  const del = (r) => confirm(`Delete this ${noun}?`) && run(() => api(path + '/' + r.id, { method: 'DELETE' }));
  const cycle = (r, i) => { const a = items(r); a[i] = { ...a[i], s: states[(states.indexOf(a[i].s) + 1) % states.length] }; run(() => api(path + '/' + r.id, { method: 'PATCH', body: { [itemsField.key]: JSON.stringify(a) } })); };
  const addItem = () => { const t = newItem.trim(); if (!t) return; setForm({ ...form, [itemsField.key]: [...(form[itemsField.key] || []), { t, s: states[0] }] }); setNewItem(''); };

  const list = (rows || []).filter(r => (!f || r[filter.key] === f) && Object.values(r).join(' ').toLowerCase().includes(q.toLowerCase()));
  const field = (x) => {
    const p = { id: 'f-' + x.key, value: form[x.key] ?? '', onChange: e => setForm({ ...form, [x.key]: e.target.value }), required: x.required };
    return (
      <label key={x.key} htmlFor={p.id}>{x.label}
        {x.type === 'textarea' ? <textarea rows={3} {...p} /> : x.type === 'select' ? <select {...p}>{x.options.map(o => <option key={o}>{o}</option>)}</select> : <input type={x.type || 'text'} {...p} />}
      </label>
    );
  };

  return (
    <div className="grid">
      <section className="card span2">
        <div className="row">
          <input aria-label={`Search ${noun}s`} placeholder={`Search ${noun}s`} className="grow" value={q} onChange={e => setQ(e.target.value)} />
          {filter && <select aria-label={filter.label} value={f} onChange={e => setF(e.target.value)} style={{ width: 'auto' }}><option value="">{filter.label}: all</option>{filter.options.map(o => <option key={o}>{o}</option>)}</select>}
          <button className="btn primary" style={{ marginTop: 0 }} onClick={() => setForm({ ...blank })}>Add {noun}</button>
        </div>
      </section>
      {err && <p className="error span2" role="alert">{err}</p>}
      {form && (
        <form className="card span2" onSubmit={save}>
          <h2>{form.id ? 'Edit' : 'New'} {noun}</h2>
          <div className="formgrid">{fields.map(field)}</div>
          {itemsField && (
            <div>
              <p className="dim">{itemsField.label}</p>
              <ul>{(form[itemsField.key] || []).map((it, i) => (
                <li key={i} className="row"><span className="grow">{it.t}</span>
                  <button type="button" className="btn icon" aria-label={'Remove ' + it.t} onClick={() => setForm({ ...form, [itemsField.key]: form[itemsField.key].filter((_, j) => j !== i) })}><Trash2 size={16} /></button></li>))}</ul>
              <div className="row"><input className="grow" aria-label="New item" value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} placeholder="Add an item, press Enter" />
                <button type="button" className="btn" onClick={addItem}>Add</button></div>
            </div>)}
          <div className="row" style={{ marginTop: 12 }}><button className="btn primary" style={{ marginTop: 0 }}>Save</button><button type="button" className="btn" onClick={() => setForm(null)}>Cancel</button></div>
        </form>)}
      {rows === null ? <p className="dim mono">Loading…</p> : list.length === 0 && !extra ? <p className="dim">{rows.length ? 'No matches.' : `No ${noun}s yet. Add your first one.`}</p> : null}
      {extra && <div className="span2">{extra(rows || [], load)}</div>}
      {list.map(r => (
        <article key={r.id} className="card">
          <div className="row"><h2 className="grow">{titleOf(r)}</h2>
            <button className="btn icon" aria-label="Edit" onClick={() => edit(r)}><Pencil size={16} /></button>
            <button className="btn icon" aria-label="Delete" onClick={() => del(r)}><Trash2 size={16} /></button></div>
          {subOf && <p className="mono dim">{subOf(r)}</p>}
          {r.description && <p>{r.description}</p>}
          {itemsField && items(r).length > 0 && (<>
            <div className="meter" role="progressbar" aria-valuenow={pct(r)} aria-valuemin="0" aria-valuemax="100"><span style={{ width: pct(r) + '%' }} /></div>
            <p className="mono dim">{pct(r)}% complete. Tap an item to change its status.</p>
            <div className="chips">{items(r).map((it, i) => <button key={i} className={'chip s' + Math.max(0, states.indexOf(it.s))} onClick={() => cycle(r, i)}>{it.t}<small>{it.s}</small></button>)}</div></>)}
          {linksOf && <div className="row" style={{ marginTop: 8 }}>{linksOf(r).filter(l => l.href).map(l => <a key={l.label} className="btn" href={l.href} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> {l.label}</a>)}</div>}
        </article>))}
    </div>
  );
}
