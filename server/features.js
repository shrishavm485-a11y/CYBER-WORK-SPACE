import { db } from './db.js';
import { crud, str, oneOf, date } from './routes/crud.js';



const url = (v) => { const s = str(300)(v); if (s && !/^https?:\/\//i.test(s)) throw new Error('Links must start with http:// or https://'); return s; };
const reqDate = (v) => { const d = date(v); if (!d) throw new Error('Date is required'); return d; };
const json = (v) => {
  let a = v;
  if (typeof v === 'string') { try { a = JSON.parse(v); } catch { throw new Error('Bad list'); } }
  if (!Array.isArray(a) || a.length > 200) throw new Error('Bad list');
  return JSON.stringify(a.map(i => ({ t: str(200, true)(i?.t), s: str(20)(i?.s) })));
};
const mins = (v) => { const n = Number(v); if (!Number.isInteger(n) || n < 1 || n > 600) throw new Error('Minutes must be 1-600'); return n; };
const TOPICS = ['Arrays', 'Strings', 'Recursion', 'Sorting', 'Searching', 'Trees', 'Graphs', 'SQL', 'Networking', 'Other'];

const TABLES = {
  tasks: ['id', 'title', 'description', 'subject', 'category', 'priority', 'status', 'due_date', 'due_time', 'created_at', 'completed_at'],
  notes: ['id', 'title', 'body', 'subject', 'tags', 'pinned', 'updated_at'],
  subjects: ['id', 'name', 'semester', 'module', 'description', 'link', 'topics'],
  problems: ['id', 'title', 'url', 'difficulty', 'language', 'topic', 'status', 'explanation', 'revision_notes', 'day'],
  exams: ['id', 'name', 'subject', 'exam_date', 'coverage', 'topics'],
  projects: ['id', 'name', 'description', 'stack', 'repo_url', 'live_url', 'status', 'next_action', 'start_date', 'target_date', 'checklist'],
  habits: ['id', 'name'], habit_checks: ['habit_id', 'day'], focus_sessions: ['id', 'subject', 'minutes', 'day'], settings: ['key', 'value']
};
const DEFAULTS = { focusMin: 25, shortMin: 5, longMin: 15, dailyGoal: 120, codingGoal: 3 };
const LIMITS = { focusMin: [1, 180], shortMin: [1, 60], longMin: [1, 120], dailyGoal: [10, 1440], codingGoal: [1, 50] };
const getSettings = () => {
  const out = { ...DEFAULTS };
  for (const r of db.prepare('SELECT key,value FROM settings').all()) if (r.key in out) out[r.key] = Number(r.value);
  return out;
};
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const validDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : new Date().toISOString().slice(0, 10);

function focusToday(today) {
  const bySubject = db.prepare("SELECT COALESCE(NULLIF(subject,''),'Unassigned') AS subject, SUM(minutes) AS minutes FROM focus_sessions WHERE day=? GROUP BY 1 ORDER BY 2 DESC").all(today);
  return { total: bySubject.reduce((a, b) => a + b.minutes, 0), bySubject };
}

export function mountFeatures(app, auth) {
  const use = (p, spec) => app.use('/api/' + p, auth, crud(spec));
  use('subjects', { table: 'subjects', required: ['name'], order: 'semester, name', fields: { name: str(120, true), semester: str(30), module: str(100), description: str(2000), link: url, topics: json } });
  use('problems', { table: 'problems', required: ['title'], order: 'day DESC, id DESC', fields: { title: str(200, true), url, difficulty: oneOf(['Easy', 'Medium', 'Hard']), language: oneOf(['C', 'C++', 'Python', 'Java', 'JavaScript']), topic: oneOf(TOPICS), status: oneOf(['Attempted', 'Solved', 'Needs Revision']), explanation: str(5000), revision_notes: str(5000), day: reqDate } });
  use('exams', { table: 'exams', required: ['name', 'exam_date'], order: 'exam_date', fields: { name: str(200, true), subject: str(100), exam_date: reqDate, coverage: str(2000), topics: json } });
  use('projects', { table: 'projects', required: ['name'], order: 'id DESC', fields: { name: str(120, true), description: str(2000), stack: str(200), repo_url: url, live_url: url, status: oneOf(['Idea', 'Planning', 'Building', 'Deployed']), next_action: str(300), start_date: date, target_date: date, checklist: json } });
  use('habits', { table: 'habits', required: ['name'], order: 'id', fields: { name: str(80, true) } });
  use('focus', { table: 'focus_sessions', required: ['minutes', 'day'], order: 'id DESC', fields: { subject: str(200), minutes: mins, day: reqDate } });

  app.get('/api/habit-checks', auth, (_q, res) => res.json(db.prepare('SELECT habit_id,day FROM habit_checks').all()));
  app.post('/api/habit-checks', auth, (req, res) => {
    const { habit_id, day, done } = req.body || {};
    if (!Number.isInteger(habit_id)) throw new Error('Bad habit');
    reqDate(day);
    if (done) db.prepare('INSERT OR IGNORE INTO habit_checks(habit_id,day) VALUES(?,?)').run(habit_id, day);
    else db.prepare('DELETE FROM habit_checks WHERE habit_id=? AND day=?').run(habit_id, day);
    res.json({ ok: true });
  });
  app.get('/api/focus-summary', auth, (req, res) => res.json(focusToday(validDay(req.query.today))));

  app.get('/api/settings', auth, (_q, res) => res.json(getSettings()));
  app.put('/api/settings', auth, (req, res) => {
    const up = db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
    for (const [k, v] of Object.entries(req.body || {})) {
      if (!LIMITS[k]) continue;
      const n = Number(v);
      if (!Number.isInteger(n) || n < LIMITS[k][0] || n > LIMITS[k][1]) throw new Error(`${k} must be ${LIMITS[k][0]}-${LIMITS[k][1]}`);
      up.run(k, String(n));
    }
    res.json(getSettings());
  });

  app.get('/api/status', auth, (_q, res) => {
    const counts = {};
    for (const t of Object.keys(TABLES)) counts[t] = db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
    res.json({ database: 'connected', counts });
  });
  app.get('/api/export', auth, (_q, res) => {
    const tables = {};
    for (const t of Object.keys(TABLES)) tables[t] = db.prepare(`SELECT * FROM ${t}`).all();
    res.setHeader('Content-Disposition', 'attachment; filename="neon-nexus-backup.json"');
    res.json({ format: 'neon-nexus-backup', exportedAt: new Date().toISOString(), tables });
  });
  app.post('/api/import', auth, (req, res) => {
    const d = req.body;
    if (!d || d.format !== 'neon-nexus-backup' || typeof d.tables !== 'object' || !d.tables) return res.status(400).json({ error: 'This is not a NEON NEXUS backup file.' });
    for (const [t, cols] of Object.entries(TABLES)) {
      const rows = d.tables[t] ?? [];
      if (!Array.isArray(rows)) return res.status(400).json({ error: `Backup table "${t}" is invalid.` });
      for (const r of rows) {
        if (!r || typeof r !== 'object') return res.status(400).json({ error: `Backup table "${t}" has a bad row.` });
        for (const c of cols) if (r[c] != null && !['string', 'number'].includes(typeof r[c])) return res.status(400).json({ error: `Backup table "${t}" has a bad value in "${c}".` });
      }
    }
    try {
      db.exec('BEGIN');
      for (const t of Object.keys(TABLES).reverse()) db.exec(`DELETE FROM ${t}`);
      for (const [t, cols] of Object.entries(TABLES)) {
        const ins = db.prepare(`INSERT INTO ${t}(${cols.join(',')}) VALUES(${cols.map(c => '@' + c).join(',')})`);
        for (const r of d.tables[t] ?? []) ins.run(Object.fromEntries(cols.map(c => [c, r[c] ?? null])));
      }
      db.exec('COMMIT');
      res.json({ ok: true });
    } catch (e) {
      try { db.exec('ROLLBACK'); } catch {}
      res.status(400).json({ error: 'Import failed, nothing was changed: ' + e.message });
    }
  });

  app.get('/api/dashboard', auth, (req, res) => {
    const today = validDay(req.query.today), s = getSettings();
    const tasks = db.prepare("SELECT * FROM tasks WHERE due_date IS NOT NULL AND due_date<=? AND (status!='Completed' OR date(completed_at)=?) ORDER BY due_date").all(today, today);
    const notes = db.prepare('SELECT id,title FROM notes ORDER BY updated_at DESC LIMIT 5').all();
    const exams = db.prepare('SELECT id,name,exam_date FROM exams WHERE exam_date>=? ORDER BY exam_date LIMIT 5').all(today);
    const monday = addDays(today, -((new Date(today + 'T00:00:00Z').getUTCDay() + 6) % 7));
    const week = Array.from({ length: 7 }, (_, i) => db.prepare('SELECT COALESCE(SUM(minutes),0) AS m FROM focus_sessions WHERE day=?').get(addDays(monday, i)).m);
    const days = new Set(db.prepare('SELECT DISTINCT day FROM focus_sessions WHERE day<=?').all(today).map(r => r.day));
    let d = days.has(today) ? today : addDays(today, -1), streak = 0;
    while (days.has(d)) { streak++; d = addDays(d, -1); }
    res.json({ tasks, notes, exams, focusMinutesToday: focusToday(today).total, streak, dailyGoalMinutes: s.dailyGoal, week });
  });
}
