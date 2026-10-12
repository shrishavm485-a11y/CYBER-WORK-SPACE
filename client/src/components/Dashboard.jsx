import { useEffect, useState } from 'react';
import { Plus, StickyNote, BookOpen, Code2, FolderGit2, Timer, Flame } from 'lucide-react';
import Clock from './Clock.jsx';
import { loadDashboard } from '../data.js';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

function Empty({ text, action, onAction }) {
  return <div className="empty"><p>{text}</p>{action && <button className="btn" onClick={onAction}>{action}</button>}</div>;
}

function WeekChart({ minutes }) {
  const max = Math.max(60, ...minutes);
  return (
    <svg viewBox="0 0 280 120" className="chart" role="img" aria-label="Minutes studied per day this week">
      {minutes.map((m, i) => {
        const h = (m / max) * 80;
        return (
          <g key={i}>
            <rect x={i * 40 + 8} y={90 - Math.max(h, 2)} width="24" height={Math.max(h, 2)} className={m ? 'bar' : 'bar zero'} />
            <text x={i * 40 + 20} y="110" textAnchor="middle" className="axis">{DAYS[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Dashboard({ go }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { loadDashboard().then(setD).catch(() => setErr('Could not load dashboard data. Refresh to retry.')); }, []);
  if (err) return <p className="error" role="alert">{err}</p>;
  if (!d) return <p className="mono dim">Loading…</p>;

  const done = d.tasks.filter(t => t.status === 'Completed').length;
  const pending = d.tasks.length - done;
  const pct = Math.min(100, Math.round((d.focusMinutesToday / d.dailyGoalMinutes) * 100));

  return (
    <div className="grid">
      <header className="card hero span2">
        <div>
          <p className="tag mono">MISSION CONTROL</p>
          <h1>{greet()}, student.</h1>
          <p className="dim">{pending} pending · {done} done today</p>
        </div>
        <Clock />
      </header>

      <section className="card">
        <h2>Today's tasks</h2>
        {d.tasks.length === 0
          ? <Empty text="No tasks yet. Add your first one." action="Add task" onAction={() => go('tasks')} />
          : <ul>{d.tasks.map(t => <li key={t.id}>{t.title}</li>)}</ul>}
      </section>

      <section className="card">
        <h2>Daily goal</h2>
        <div className="meter" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100"><span style={{ width: pct + '%' }} /></div>
        <p className="mono">{d.focusMinutesToday} / {d.dailyGoalMinutes} min focused</p>
        <p className="streak"><Flame size={16} /> {d.streak}-day study streak</p>
        <button className="btn primary" onClick={() => go('focus')}><Timer size={16} /> Start focus session</button>
      </section>

      <section className="card span2">
        <h2>This week</h2>
        <WeekChart minutes={d.week} />
        {d.week.every(m => m === 0) && <p className="dim">Complete a focus session and it shows up here.</p>}
      </section>

      <section className="card">
        <h2>Exams and deadlines</h2>
        {d.exams.length === 0
          ? <Empty text="No upcoming exams." action="Plan an exam" onAction={() => go('exams')} />
          : <ul>{d.exams.map(e => <li key={e.id}>{e.name} <small className="mono dim">{e.exam_date}</small></li>)}</ul>}
      </section>

      <section className="card">
        <h2>Recent notes</h2>
        {d.notes.length === 0
          ? <Empty text="No notes yet." action="Write a note" onAction={() => go('notes')} />
          : <ul>{d.notes.map(n => <li key={n.id}>{n.title}</li>)}</ul>}
      </section>

      <nav className="card span2 quick" aria-label="Quick links">
        {[['notes', StickyNote, 'Notes'], ['subjects', BookOpen, 'Subjects'], ['coding', Code2, 'Coding'], ['projects', FolderGit2, 'Projects'], ['focus', Timer, 'Focus']]
          .map(([k, Icon, label]) => <button key={k} className="btn" onClick={() => go(k)}><Icon size={18} /> {label}</button>)}
      </nav>
    </div>
  );
}
