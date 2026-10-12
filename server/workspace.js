import crypto from 'node:crypto';
import { runAs, validUid, userExists, userCount } from './db.js';

const MAX = Number(process.env.MAX_USERS || 200);
const cookie = (uid) => `nexus_uid=${uid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${5 * 365 * 86400}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
const read = (req) => /(?:^|;\s*)nexus_uid=([a-f0-9]{32})/.exec(req.headers.cookie || '')?.[1];

// Every visitor gets a private workspace (their own database file), identified by a random cookie.
export function workspace(req, res, next) {
  if (req.path === '/health') return next();
  if (req.path === '/workspace/join') {
    const k = String(req.query.key || '');
    if (!validUid(k) || !userExists(k)) return res.status(404).json({ error: 'That sync link is not valid.' });
    res.setHeader('Set-Cookie', cookie(k));
    return res.json({ ok: true });
  }
  let uid = read(req);
  if (!uid) {
    if (userCount() >= MAX) return res.status(503).json({ error: 'This site has reached its workspace limit.' });
    uid = crypto.randomBytes(16).toString('hex');
    res.setHeader('Set-Cookie', cookie(uid));
  }
  runAs(uid, () => next());
}
