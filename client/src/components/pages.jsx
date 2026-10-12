import { useEffect, useState } from 'react';
import Collection from './Collection.jsx';
import { api, localToday } from '../api.js';

const SEMS = Array.from({ length: 8 }, (_, i) => 'Sem ' + (i + 1));
const days = (d) => Math.round((Date.parse(d) - Date.parse(localToday())) / 864e5);

export function Subjects() {
  const sample = (load) => async () => {
    for (const n of ['Mathematics', 'Operating Systems', 'DBMS', 'Computer Networks'])
      await api('/subjects', { method: 'POST', body: { name: n + ' (sample)', semester: 'Sem 1', module: '', description: 'Sample subject. Edit it or delete it. Add your own syllabus topics.', link: '', topics: '[]' } });
    load();
  };
  return <Collection path="/subjects" noun="subject" blank={{ semester: 'Sem 1', topics: [] }}
    fields={[{ key: 'name', label: 'Name', required: true }, { key: 'semester', label: 'Semester', type: 'select', options: SEMS }, { key: 'module', label: 'Module' },
      { key: 'link', label: 'Reference link', type: 'url' }, { key: 'description', label: 'Description', type: 'textarea' }]}
    itemsField={{ key: 'topics', label: 'Syllabus topics', states: ['Not Started', 'In Progress', 'Completed'] }}
    filter={{ key: 'semester', label: 'Semester', options: SEMS }}
    titleOf={r => r.name} subOf={r => [r.semester, r.module].filter(Boolean).join(' · ')}
    linksOf={r => [{ label: 'Reference', href: r.link }]}
    extra={(rows, load) => rows.length === 0 ? <div className="card"><p className="dim">No subjects yet.</p><button className="btn" onClick={sample(load)}>Load editable sample subjects</button></div> : null} />;
}

function CodingStats({ rows }) {
  const [goal, setGoal] = useState(3);
  useEffect(() => { api('/settings').then(s => setGoal(s.codingGoal)).catch(() => {}); }, []);
  const today = localToday(), solved = rows.filter(r => r.status === 'Solved');
  const count = (key) => Object.entries(solved.reduce((a, r) => ({ ...a, [r[key]]: (a[r[key]] || 0) + 1 }), {}));
  const todayN = solved.filter(r => r.day === today).length, queue = rows.filter(r => r.status === 'Needs Revision');
  return (
    <div className="grid">
      <section className="card"><h2>Daily goal</h2><div className="meter"><span style={{ width: Math.min(100, todayN / goal * 100) + '%' }} /></div><p className="mono">{todayN} / {goal} solved today ({solved.length} total)</p></section>
      <section className="card"><h2>Revision queue</h2>{queue.length ? <ul>{queue.map(r => <li key={r.id}>{r.title} <small className="mono dim">{r.topic}</small></li>)}</ul> : <p className="dim">Nothing to revise.</p>}</section>
      {[['language', 'By language'], ['difficulty', 'By difficulty'], ['topic', 'By topic']].map(([k, t]) => (
        <section key={k} className="card"><h2>{t}</h2>{count(k).length ? <p className="mono">{count(k).map(([n, c]) => `${n}: ${c}`).join('   ')}</p> : <p className="dim">Solve a problem to see stats.</p>}</section>))}
    </div>
  );
}
export function Coding() {
  const TOPICS = ['Arrays', 'Strings', 'Recursion', 'Sorting', 'Searching', 'Trees', 'Graphs', 'SQL', 'Networking', 'Other'];
  return <Collection path="/problems" noun="problem" blank={{ difficulty: 'Easy', language: 'Python', topic: 'Arrays', status: 'Attempted', day: localToday() }}
    fields={[{ key: 'title', label: 'Problem title', required: true }, { key: 'url', label: 'Platform URL', type: 'url' },
      { key: 'difficulty', label: 'Difficulty', type: 'select', options: ['Easy', 'Medium', 'Hard'] }, { key: 'language', label: 'Language', type: 'select', options: ['C', 'C++', 'Python', 'Java', 'JavaScript'] },
      { key: 'topic', label: 'Topic', type: 'select', options: TOPICS }, { key: 'status', label: 'Status', type: 'select', options: ['Attempted', 'Solved', 'Needs Revision'] },
      { key: 'day', label: 'Date', type: 'date', required: true }, { key: 'explanation', label: 'Solution explanation', type: 'textarea' }, { key: 'revision_notes', label: 'Revision notes', type: 'textarea' }]}
    filter={{ key: 'status', label: 'Status', options: ['Attempted', 'Solved', 'Needs Revision'] }}
    titleOf={r => r.title} subOf={r => `${r.status} · ${r.difficulty} · ${r.language} · ${r.topic} · ${r.day}`}
    linksOf={r => [{ label: 'Problem', href: r.url }]} extra={rows => <CodingStats rows={rows} />} />;
}

function ExamPlan({ rows }) {
  const [made, setMade] = useState({}), [err, setErr] = useState('');
  const up = rows.filter(r => days(r.exam_date) >= 0);
  const todo = up.flatMap(r => { try { return JSON.parse(r.topics).filter(t => t.s !== 'Prepared').map(t => ({ ...t, exam: r, left: days(r.exam_date) })); } catch { return []; } }).sort((a, b) => a.left - b.left);
  const all = up.flatMap(r => { try { return JSON.parse(r.topics); } catch { return []; } });
  const make = async (t) => { try { await api('/tasks', { method: 'POST', body: { title: `Revise: ${t.t} (${t.exam.name})`, subject: t.exam.subject, category: 'College', priority: 'High', status: 'Pending', due_date: t.exam.exam_date } }); setMade({ ...made, [t.exam.id + t.t]: true }); } catch (e) { setErr(e.message); } };
  if (!up.length) return null;
  return (
    <section className="card"><h2>Preparation: {all.length ? Math.round(all.filter(t => t.s === 'Prepared').length / all.length * 100) : 0}% of upcoming topics prepared</h2>
      {err && <p className="error" role="alert">{err}</p>}
      {todo.length === 0 ? <p className="dim">No unfinished topics.</p> : <ul>{todo.slice(0, 8).map(t => (
        <li key={t.exam.id + t.t} className="row"><span className="grow">{t.t}<small className="mono dim"> {t.exam.name}, {t.left} days left</small></span>
          <button className="btn" disabled={made[t.exam.id + t.t]} onClick={() => make(t)}>{made[t.exam.id + t.t] ? 'Task added' : 'Add revision task'}</button></li>))}</ul>}
    </section>
  );
}
export function Exams() {
  return <Collection path="/exams" noun="exam" blank={{ topics: [], exam_date: '' }}
    fields={[{ key: 'name', label: 'Exam name', required: true }, { key: 'subject', label: 'Subject' }, { key: 'exam_date', label: 'Exam date', type: 'date', required: true }, { key: 'coverage', label: 'Syllabus coverage', type: 'textarea' }]}
    itemsField={{ key: 'topics', label: 'Important topics', states: ['Not Started', 'Revising', 'Prepared'] }}
    titleOf={r => r.name} subOf={r => { const n = days(r.exam_date); return `${r.subject ? r.subject + ' · ' : ''}${r.exam_date} · ${n < 0 ? 'Past' : n === 0 ? 'Today' : n + ' days left'}`; }}
    extra={rows => <ExamPlan rows={rows} />} />;
}

export function Projects() {
  return <Collection path="/projects" noun="project" blank={{ status: 'Idea', checklist: [] }}
    fields={[{ key: 'name', label: 'Project name', required: true }, { key: 'status', label: 'Status', type: 'select', options: ['Idea', 'Planning', 'Building', 'Deployed'] },
      { key: 'stack', label: 'Technology stack' }, { key: 'next_action', label: 'Next action' }, { key: 'repo_url', label: 'GitHub URL', type: 'url' }, { key: 'live_url', label: 'Live URL', type: 'url' },
      { key: 'start_date', label: 'Start date', type: 'date' }, { key: 'target_date', label: 'Target date', type: 'date' }, { key: 'description', label: 'Description', type: 'textarea' }]}
    itemsField={{ key: 'checklist', label: 'Task checklist', states: ['Todo', 'Done'] }}
    filter={{ key: 'status', label: 'Status', options: ['Idea', 'Planning', 'Building', 'Deployed'] }}
    titleOf={r => r.name} subOf={r => [r.status, r.stack, r.next_action && 'Next: ' + r.next_action].filter(Boolean).join(' · ')}
    linksOf={r => [{ label: 'Repository', href: r.repo_url }, { label: 'Live', href: r.live_url }]} />;
}
