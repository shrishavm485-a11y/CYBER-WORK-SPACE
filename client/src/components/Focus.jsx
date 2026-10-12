import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Maximize } from 'lucide-react';
import { api, localToday } from '../api.js';

const KEY = 'nexus-timer';
const MODES = { focus: ['Focus', 'focusMin'], short: ['Short break', 'shortMin'], long: ['Long break', 'longMin'] };
const fmt = (ms) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const beep = () => { try { const c = new AudioContext(), o = c.createOscillator(); o.frequency.value = 880; o.connect(c.destination); o.start(); o.stop(c.currentTime + 0.4); } catch {} };

export default function Focus() {
  const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
  const [cfg, setCfg] = useState({ focusMin: 25, shortMin: 5, longMin: 15 });
  const [mode, setMode] = useState(saved.mode || 'focus'), [endAt, setEndAt] = useState(saved.endAt || null), [left, setLeft] = useState(saved.left ?? null);
  const [label, setLabel] = useState(saved.label || ''), [now, setNow] = useState(Date.now()), [sum, setSum] = useState({ total: 0, bySubject: [] });
  const [targets, setTargets] = useState([]), [err, setErr] = useState(''), wrap = useRef(), fin = useRef(false);

  const dur = cfg[MODES[mode][1]] * 60000, remaining = endAt ? Math.max(0, endAt - now) : (left ?? dur);
  const refresh = () => api('/focus-summary?today=' + localToday()).then(setSum).catch(e => setErr(e.message));
  useEffect(() => {
    api('/settings').then(s => setCfg({ focusMin: s.focusMin, shortMin: s.shortMin, longMin: s.longMin })).catch(e => setErr(e.message));
    refresh();
    Promise.all([api('/subjects'), api('/tasks')]).then(([s, t]) => setTargets([...s.map(x => 'Subject: ' + x.name), ...t.filter(x => x.status !== 'Completed').map(x => 'Task: ' + x.title)])).catch(() => {});
  }, []);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify({ mode, endAt, left, label })); }, [mode, endAt, left, label]);
  useEffect(() => { if (!endAt) return; const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, [endAt]);
  useEffect(() => { document.title = endAt ? `${fmt(remaining)} · NEON NEXUS` : 'NEON NEXUS'; return () => { document.title = 'NEON NEXUS'; }; }, [endAt, remaining]);

  useEffect(() => {
    if (!endAt || now < endAt || fin.current) return;
    fin.current = true; setEndAt(null); setLeft(null); beep();
    if ('Notification' in window && Notification.permission === 'granted') new Notification(mode === 'focus' ? 'Focus session complete' : 'Break over');
    (async () => {
      if (mode === 'focus') { try { await api('/focus', { method: 'POST', body: { subject: label, minutes: cfg.focusMin, day: localToday() } }); refresh(); } catch (e) { setErr('Session finished but could not be saved: ' + e.message); } }
      setMode(mode === 'focus' ? 'short' : 'focus'); fin.current = false;
    })();
  }, [now, endAt]);

  const start = () => { fin.current = false; setErr(''); setEndAt(Date.now() + remaining); setNow(Date.now()); if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); };
  const pause = () => { setLeft(Math.max(0, endAt - Date.now())); setEndAt(null); };
  const reset = () => { setEndAt(null); setLeft(null); };
  const pick = (m) => { setMode(m); reset(); };
  const saveCfg = async (e) => { e.preventDefault(); try { setCfg(await api('/settings', { method: 'PUT', body: cfg })); reset(); } catch (x) { setErr(x.message); } };

  return (
    <div className="grid">
      <section className="card span2 focus-wrap" ref={wrap}>
        <div className="row tabs" role="tablist">{Object.entries(MODES).map(([k, [n]]) => <button key={k} role="tab" aria-selected={mode === k} className={'btn' + (mode === k ? ' on' : '')} onClick={() => pick(k)}>{n}</button>)}
          <button className="btn icon" aria-label="Fullscreen" onClick={() => wrap.current?.requestFullscreen?.()}><Maximize size={18} /></button></div>
        <p className="tag mono">{mode === 'focus' ? 'STUDY MODE' : 'RECHARGE'}</p>
        <p className="timer mono" aria-live="off">{fmt(remaining)}</p>
        <div className="meter"><span style={{ width: (100 - remaining / dur * 100) + '%' }} /></div>
        <label>Studying (subject or task)<input list="targets" value={label} onChange={e => setLabel(e.target.value)} placeholder="Optional" disabled={!!endAt} /></label>
        <datalist id="targets">{targets.map(t => <option key={t} value={t} />)}</datalist>
        <div className="row">{endAt ? <button className="btn primary" style={{ marginTop: 0 }} onClick={pause}><Pause size={16} /> Pause</button>
          : <button className="btn primary" style={{ marginTop: 0 }} onClick={start}><Play size={16} /> {left != null ? 'Resume' : 'Start'}</button>}
          <button className="btn" onClick={reset}><RotateCcw size={16} /> Reset</button></div>
        {err && <p className="error" role="alert">{err}</p>}
      </section>
      <section className="card"><h2>Today: {sum.total} min focused</h2>
        {sum.bySubject.length ? <ul>{sum.bySubject.map(s => <li key={s.subject} className="mono">{s.subject}: {s.minutes} min</li>)}</ul> : <p className="dim">Finish a focus session and it is logged here.</p>}</section>
      <form className="card" onSubmit={saveCfg}><h2>Timer settings (minutes)</h2>
        <div className="formgrid">{[['focusMin', 'Focus'], ['shortMin', 'Short break'], ['longMin', 'Long break']].map(([k, n]) => <label key={k}>{n}<input type="number" min="1" max="180" value={cfg[k]} onChange={e => setCfg({ ...cfg, [k]: Number(e.target.value) })} /></label>)}</div>
        <button className="btn">Save durations</button></form>
    </div>
  );
}
