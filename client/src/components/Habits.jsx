import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api, localToday } from '../api.js';

const add = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const DEFAULTS = ['Studying', 'Coding', 'Exercise', 'Reading', 'Revising previous topics'];

export default function Habits() {
  const [habits, setHabits] = useState(null), [checks, setChecks] = useState([]), [name, setName] = useState(''), [err, setErr] = useState('');
  const today = localToday(), week = Array.from({ length: 7 }, (_, i) => add(today, i - 6));
  const load = async () => { try { setHabits(await api('/habits')); setChecks(await api('/habit-checks')); } catch (e) { setErr(e.message); } };
  useEffect(() => { load(); }, []);
  const run = async (fn) => { setErr(''); try { await fn(); await load(); } catch (e) { setErr(e.message); } };
  const set = (id) => new Set(checks.filter(c => c.habit_id === id).map(c => c.day));
  const streaks = (s) => {
    let cur = 0, d = s.has(today) ? today : add(today, -1);
    while (s.has(d)) { cur++; d = add(d, -1); }
    let best = 0, r = 0, prev = null;
    for (const x of [...s].sort()) { r = prev && add(prev, 1) === x ? r + 1 : 1; best = Math.max(best, r); prev = x; }
    return { cur, best };
  };
  const perDay = week.map(d => checks.filter(c => c.day === d).length), max = Math.max(1, habits?.length || 1);

  if (!habits) return <p className="dim mono">Loading…</p>;
  return (
    <div className="grid">
      <form className="card span2 row" onSubmit={e => { e.preventDefault(); run(async () => { await api('/habits', { method: 'POST', body: { name } }); setName(''); }); }}>
        <label className="grow">New habit<input value={name} onChange={e => setName(e.target.value)} maxLength={80} required placeholder="e.g. Revise yesterday's notes" /></label>
        <button className="btn primary">Add habit</button>
        {habits.length === 0 && <button type="button" className="btn" onClick={() => run(async () => { for (const n of DEFAULTS) await api('/habits', { method: 'POST', body: { name: n } }); })}>Add starter habits</button>}
      </form>
      {err && <p className="error span2" role="alert">{err}</p>}
      <section className="card span2">
        <h2>Daily check-ins</h2>
        {habits.length === 0 ? <p className="dim">No habits yet.</p> : (
          <div className="scroll"><table className="habits"><thead><tr><th>Habit</th>{week.map(d => <th key={d} className="mono">{new Date(d + 'T00:00:00Z').toLocaleDateString([], { weekday: 'narrow', timeZone: 'UTC' })}</th>)}<th>Streak</th><th /></tr></thead>
            <tbody>{habits.map(h => { const s = set(h.id), st = streaks(s); return (
              <tr key={h.id}><td>{h.name}</td>
                {week.map(d => <td key={d}><button className={'btn icon' + (s.has(d) ? ' on' : '')} aria-pressed={s.has(d)} aria-label={`${h.name} on ${d}`} onClick={() => run(() => api('/habit-checks', { method: 'POST', body: { habit_id: h.id, day: d, done: !s.has(d) } }))}>{s.has(d) ? '✓' : ''}</button></td>)}
                <td className="mono">{st.cur} / best {st.best}</td>
                <td><button className="btn icon" aria-label={'Delete ' + h.name} onClick={() => confirm(`Delete "${h.name}" and its history?`) && run(() => api('/habits/' + h.id, { method: 'DELETE' }))}><Trash2 size={16} /></button></td></tr>); })}</tbody></table></div>)}
      </section>
      <section className="card span2"><h2>This week: habits completed per day</h2>
        <svg viewBox="0 0 280 120" className="chart" role="img" aria-label="Habits completed per day">{perDay.map((n, i) => <g key={i}><rect x={i * 40 + 8} y={90 - Math.max(2, n / max * 80)} width="24" height={Math.max(2, n / max * 80)} className={n ? 'bar' : 'bar zero'} /><text x={i * 40 + 20} y="110" textAnchor="middle" className="axis">{week[i].slice(5)}</text></g>)}</svg></section>
    </div>
  );
}
