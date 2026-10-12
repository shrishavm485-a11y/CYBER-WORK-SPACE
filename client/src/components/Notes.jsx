import { useEffect, useState } from 'react';
import { Pin, Trash2, Copy, Download } from 'lucide-react';
import { api } from '../api.js';

export default function Notes() {
  const [notes, setNotes] = useState(null), [q, setQ] = useState(''), [cur, setCur] = useState(null), [err, setErr] = useState('');
  const load = () => api('/notes').then(setNotes).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);
  const run = async (fn) => { setErr(''); try { await fn(); await load(); } catch (e) { setErr(e.message); } };

  const save = (e) => { e.preventDefault(); run(async () => {
    const body = { title: cur.title, body: cur.body, subject: cur.subject || '', tags: cur.tags || '', pinned: !!cur.pinned };
    const saved = cur.id ? await api('/notes/' + cur.id, { method: 'PATCH', body }) : await api('/notes', { method: 'POST', body });
    setCur(saved);
  }); };
  const del = () => confirm(`Delete "${cur.title}"?`) && run(async () => { await api('/notes/' + cur.id, { method: 'DELETE' }); setCur(null); });
  const download = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([`# ${cur.title}\n\n${cur.body}`], { type: 'text/markdown' })); a.download = cur.title.replace(/[^\w-]+/g, '_') + '.md'; a.click(); URL.revokeObjectURL(a.href); };
  const list = (notes || []).filter(n => (n.title + n.body + n.tags + n.subject).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="grid">
      <section className="card">
        <div className="row"><input aria-label="Search notes" placeholder="Search notes" value={q} onChange={e => setQ(e.target.value)} className="grow" />
          <button className="btn" onClick={() => setCur({ title: '', body: '' })}>New note</button></div>
        {notes === null ? <p className="dim mono">Loading…</p> : list.length === 0 ? <p className="dim">{notes.length ? 'No matches.' : 'No notes yet. Create one.'}</p> : (
          <ul>{list.map(n => <li key={n.id}><button className={'btn wide' + (cur?.id === n.id ? ' on' : '')} onClick={() => setCur(n)}>{n.pinned ? '📌 ' : ''}{n.title}</button></li>)}</ul>)}
      </section>
      <section className="card">
        {err && <p className="error" role="alert">{err}</p>}
        {!cur ? <p className="dim">Select or create a note.</p> : (
          <form onSubmit={save}>
            <label>Title<input value={cur.title} onChange={e => setCur({ ...cur, title: e.target.value })} required maxLength={200} /></label>
            <label>Subject<input value={cur.subject || ''} onChange={e => setCur({ ...cur, subject: e.target.value })} /></label>
            <label>Tags (comma separated)<input value={cur.tags || ''} onChange={e => setCur({ ...cur, tags: e.target.value })} /></label>
            <label>Content (Markdown)<textarea rows={10} value={cur.body} onChange={e => setCur({ ...cur, body: e.target.value })} /></label>
            {cur.updated_at && <p className="mono dim">Last modified {cur.updated_at} UTC</p>}
            <div className="row">
              <button className="btn primary">Save</button>
              <button type="button" className="btn icon" aria-label="Pin" onClick={() => setCur({ ...cur, pinned: !cur.pinned })}><Pin size={18} fill={cur.pinned ? 'currentColor' : 'none'} /></button>
              <button type="button" className="btn icon" aria-label="Copy" onClick={() => navigator.clipboard?.writeText(cur.body)}><Copy size={18} /></button>
              <button type="button" className="btn icon" aria-label="Download as Markdown" onClick={download}><Download size={18} /></button>
              {cur.id && <button type="button" className="btn icon" aria-label="Delete note" onClick={del}><Trash2 size={18} /></button>}
            </div>
          </form>)}
      </section>
    </div>
  );
}
