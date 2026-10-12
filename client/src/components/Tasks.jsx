import { useEffect, useState } from 'react';
import { Trash2, Check } from 'lucide-react';
import { api, localToday } from '../api.js';

const FILTERS = ['Today', 'Upcoming', 'Overdue', 'Completed', 'All'];
const PRI = { High: 0, Medium: 1, Low: 2 };
const blank = { title: '', due_date: '', priority: 'Medium', category: 'College' };

export default function Tasks() {
  const [tasks, setTasks] = useState(null), [f, setF] = useState('Today'), [form, setForm] = useState(blank), [err, setErr] = useState('');
  const today = localToday();
  const load = () => api('/tasks').then(setTasks).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);
  const run = async (fn) => { setErr(''); try { await fn(); await load(); } catch (e) { setErr(e.message); } };

  const add = (e) => { e.preventDefault(); run(async () => { await api('/tasks', { method: 'POST', body: form }); setForm(blank); }); };
  const toggle = (t) => run(() => api('/tasks/' + t.id, { method: 'PATCH', body: { status: t.status === 'Completed' ? 'Pending' : 'Completed' } }));
  const del = (t) => confirm(`Delete "${t.title}"?`) && run(() => api('/tasks/' + t.id, { method: 'DELETE' }));
  const clearDone = () => { const d = (tasks || []).filter(t => t.status === 'Completed'); d.length && confirm(`Delete ${d.length} completed task(s)?`) && run(() => Promise.all(d.map(t => api('/tasks/' + t.id, { method: 'DELETE' })))); };

  const open = t => t.status !== 'Completed';
  const show = (tasks || []).filter(t => ({
    Today: open(t) && t.due_date === today, Upcoming: open(t) && t.due_date > today,
    Overdue: open(t) && t.due_date && t.due_date < today, Completed: !open(t), All: true })[f])
    .sort((a, b) => (a.due_date || '9').localeCompare(b.due_date || '9') || PRI[a.priority] - PRI[b.priority]);

  return (
    <div className="grid">
      <form className="card span2 row" onSubmit={add}>
        <label className="grow">Task<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} maxLength={200} required placeholder="e.g. Finish OS assignment" /></label>
        <label>Due<input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></label>
        <label>Priority<select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>{['Low', 'Medium', 'High'].map(p => <option key={p}>{p}</option>)}</select></label>
        <label>Category<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{['College', 'Coding', 'Personal', 'Projects'].map(p => <option key={p}>{p}</option>)}</select></label>
        <button className="btn primary">Add task</button>
      </form>
      {err && <p className="error span2" role="alert">{err}</p>}
      <section className="card span2">
        <div className="row tabs" role="tablist">{FILTERS.map(x => <button key={x} role="tab" aria-selected={f === x} className={'btn' + (f === x ? ' on' : '')} onClick={() => setF(x)}>{x}</button>)}
          <button className="btn" onClick={clearDone}>Clear completed</button></div>
        {tasks === null ? <p className="dim mono">Loading…</p> : show.length === 0 ? <p className="dim">Nothing in {f}.</p> : (
          <ul>{show.map(t => (
            <li key={t.id} className={'task' + (t.due_date && t.due_date < today && open(t) ? ' late' : '') + (open(t) ? '' : ' done')}>
              <button className="btn icon" aria-label={open(t) ? 'Mark complete' : 'Mark pending'} onClick={() => toggle(t)}><Check size={18} /></button>
              <span className="grow">{t.title}<small className="mono dim"> {t.category} · {t.priority}{t.due_date ? ' · ' + t.due_date : ''}</small></span>
              <button className="btn icon" aria-label={'Delete ' + t.title} onClick={() => del(t)}><Trash2 size={18} /></button>
            </li>))}</ul>)}
      </section>
    </div>
  );
}
