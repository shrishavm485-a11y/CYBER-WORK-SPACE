import { useState, useEffect } from 'react';
import { LayoutDashboard, BookOpen, StickyNote, ListChecks, Timer, Code2, GraduationCap, FolderGit2, Repeat, Settings as Cog, Menu } from 'lucide-react';
import Dashboard from './components/Dashboard.jsx';
import Tasks from './components/Tasks.jsx';
import Notes from './components/Notes.jsx';
import Focus from './components/Focus.jsx';
import Habits from './components/Habits.jsx';
import Settings from './components/Settings.jsx';
import { Subjects, Coding, Exams, Projects } from './components/pages.jsx';
import { api } from './api.js';

const PAGES = [
  ['dashboard', LayoutDashboard, 'Dashboard'], ['subjects', BookOpen, 'Subjects'], ['notes', StickyNote, 'Notes'],
  ['tasks', ListChecks, 'Tasks'], ['focus', Timer, 'Focus'], ['coding', Code2, 'Coding'],
  ['exams', GraduationCap, 'Exams'], ['projects', FolderGit2, 'Projects'], ['habits', Repeat, 'Habits'], ['settings', Cog, 'Settings']
];
const BOTTOM = ['dashboard', 'tasks', 'notes', 'focus'];

export default function App() {
  const [page, setPage] = useState('dashboard'), [ready, setReady] = useState(false), [more, setMore] = useState(false);
  useEffect(() => { (async () => { const k = new URLSearchParams(location.search).get('join'); if (k) { try { await api('/workspace/join?key=' + encodeURIComponent(k)); } catch (e) { alert(e.message); } history.replaceState(null, '', '/'); } setReady(true); })(); }, []);
  if (!ready) return <p className="mono dim" style={{ padding: 20 }}>Loading…</p>;
  const go = (k) => { setPage(k); setMore(false); };
  const VIEWS = { dashboard: <Dashboard go={go} />, subjects: <Subjects />, notes: <Notes />, tasks: <Tasks />, focus: <Focus />, coding: <Coding />, exams: <Exams />, projects: <Projects />, habits: <Habits />, settings: <Settings /> };
  const title = PAGES.find(p => p[0] === page)[2];
  return (
    <div className="shell">
      <aside className="side" aria-label="Main navigation">
        <p className="logo mono">NEON NEXUS</p>
        <p className="tag mono"><i className="dot" /> SYSTEM ONLINE</p>
        {PAGES.map(([k, Icon, l]) => <button key={k} className={'nav' + (page === k ? ' on' : '')} onClick={() => go(k)} aria-current={page === k ? 'page' : undefined}><Icon size={18} /> {l}</button>)}
      </aside>
      <main className="main">{page !== 'dashboard' && <h1 className="pagetitle">{title}</h1>}{VIEWS[page]}</main>
      {more && <div className="sheet" role="menu">{PAGES.map(([k, Icon, l]) => <button key={k} className={'btn' + (page === k ? ' on' : '')} onClick={() => go(k)}><Icon size={18} /> {l}</button>)}</div>}
      <nav className="bottom" aria-label="Quick navigation">
        {PAGES.filter(p => BOTTOM.includes(p[0])).map(([k, Icon, l]) => <button key={k} className={page === k ? 'on' : ''} onClick={() => go(k)}><Icon size={22} /><span>{l}</span></button>)}
        <button className={more ? 'on' : ''} onClick={() => setMore(!more)} aria-expanded={more}><Menu size={22} /><span>More</span></button>
      </nav>
    </div>
  );
}
