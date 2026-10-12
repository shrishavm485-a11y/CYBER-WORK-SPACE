import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs';
import path from 'node:path';

// One SQLite file per visitor: <dir of DB_PATH>/users/<workspace-id>.db
let base = path.join(path.dirname(process.env.DB_PATH || './data/nexus.db'), 'users');
try { fs.mkdirSync(base, { recursive: true }); }
catch (e) {
  console.warn(`WARNING: cannot use ${base} (${e.code}). Falling back to ./data/users. Data will be LOST on restart.`);
  base = './data/users'; fs.mkdirSync(base, { recursive: true });
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tasks(
  id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT DEFAULT '',
  subject TEXT DEFAULT '', category TEXT DEFAULT 'College', priority TEXT DEFAULT 'Medium',
  status TEXT DEFAULT 'Pending', due_date TEXT, due_time TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, completed_at TEXT);
CREATE TABLE IF NOT EXISTS notes(
  id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT DEFAULT '',
  subject TEXT DEFAULT '', tags TEXT DEFAULT '', pinned INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS subjects(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,semester TEXT DEFAULT '',module TEXT DEFAULT '',description TEXT DEFAULT '',link TEXT DEFAULT '',topics TEXT DEFAULT '[]');
CREATE TABLE IF NOT EXISTS problems(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,url TEXT DEFAULT '',difficulty TEXT DEFAULT 'Easy',language TEXT DEFAULT 'Python',topic TEXT DEFAULT 'Arrays',status TEXT DEFAULT 'Attempted',explanation TEXT DEFAULT '',revision_notes TEXT DEFAULT '',day TEXT);
CREATE TABLE IF NOT EXISTS exams(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,subject TEXT DEFAULT '',exam_date TEXT NOT NULL,coverage TEXT DEFAULT '',topics TEXT DEFAULT '[]');
CREATE TABLE IF NOT EXISTS projects(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,description TEXT DEFAULT '',stack TEXT DEFAULT '',repo_url TEXT DEFAULT '',live_url TEXT DEFAULT '',status TEXT DEFAULT 'Idea',next_action TEXT DEFAULT '',start_date TEXT,target_date TEXT,checklist TEXT DEFAULT '[]');
CREATE TABLE IF NOT EXISTS habits(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS habit_checks(habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,day TEXT NOT NULL,PRIMARY KEY(habit_id,day));
CREATE TABLE IF NOT EXISTS focus_sessions(id INTEGER PRIMARY KEY AUTOINCREMENT,subject TEXT DEFAULT '',minutes INTEGER NOT NULL,day TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
`;

const als = new AsyncLocalStorage(), open = new Map();
export const validUid = (u) => /^[a-f0-9]{32}$/.test(u);
export const userExists = (u) => fs.existsSync(path.join(base, u + '.db'));
export const userCount = () => fs.readdirSync(base).filter(f => f.endsWith('.db')).length;
export const runAs = (uid, fn) => als.run(uid, fn);
export const currentUid = () => als.getStore();

function current() {
  const uid = als.getStore();
  if (!uid) throw new Error('No workspace for this request');
  let d = open.get(uid);
  if (!d) {
    d = new DatabaseSync(path.join(base, uid + '.db'));
    d.exec('PRAGMA journal_mode = WAL'); d.exec('PRAGMA foreign_keys = ON'); d.exec(SCHEMA);
    open.set(uid, d);
    if (open.size > 100) { const [k, v] = open.entries().next().value; v.close(); open.delete(k); }
  }
  return d;
}
export const db = { prepare: (s) => current().prepare(s), exec: (s) => current().exec(s) };
