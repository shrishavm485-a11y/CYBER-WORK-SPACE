import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, currentUid } from './db.js';
import { workspace } from './workspace.js';
import { crud, str, oneOf, date, time, bool } from './routes/crud.js';
import { mountFeatures } from './features.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));
app.use('/api', workspace);

const open = (_q, _r, next) => next();
app.get('/api/health', (_q, res) => res.json({ status: 'online' }));
app.get('/api/workspace', (_q, res) => { db.prepare('SELECT 1').get(); res.json({ key: currentUid() }); });

app.use('/api/tasks', crud({
  table: 'tasks', required: ['title'], order: "COALESCE(due_date,'9999'), id",
  fields: { title: str(200, true), description: str(2000), subject: str(100),
    category: oneOf(['College', 'Coding', 'Personal', 'Projects']), priority: oneOf(['Low', 'Medium', 'High']),
    status: oneOf(['Pending', 'In Progress', 'Completed']), due_date: date, due_time: time }
}));
app.use('/api/notes', crud({
  table: 'notes', required: ['title'], order: 'pinned DESC, updated_at DESC',
  fields: { title: str(200, true), body: str(100000), subject: str(100), tags: str(200), pinned: bool }
}));
mountFeatures(app, open);

app.use('/api', (_q, res) => res.status(404).json({ error: 'Unknown endpoint' }));
const dist = path.join(__dirname, '../client/dist');
app.use(express.static(dist));
app.get('*', (_q, res) => res.sendFile(path.join(dist, 'index.html')));
app.use((err, _q, res, _n) => {
  const internal = /SQLITE|ENOENT/.test(String(err.code || err.message));
  if (internal) console.error(err);
  res.status(internal ? 500 : 400).json({ error: internal ? 'Server error' : err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`NEON NEXUS online on :${PORT}`));
