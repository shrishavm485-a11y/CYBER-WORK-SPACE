import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Settings() {
  const [key, setKey] = useState(''), [s, setS] = useState(null), [status, setStatus] = useState(null), [msg, setMsg] = useState(''), [err, setErr] = useState('');
  const load = () => { api('/workspace').then(w => setKey(w.key)).catch(() => {}); api('/settings').then(setS).catch(e => setErr(e.message)); api('/status').then(setStatus).catch(() => setStatus({ database: 'unreachable' })); };
  useEffect(load, []);
  const save = async (e) => { e.preventDefault(); setErr(''); setMsg(''); try { setS(await api('/settings', { method: 'PUT', body: s })); setMsg('Settings saved.'); } catch (x) { setErr(x.message); } };
  const exportAll = async () => {
    try { const r = await fetch('/api/export', { credentials: 'same-origin' }); if (!r.ok) throw new Error('Export failed'); const a = document.createElement('a'); a.href = URL.createObjectURL(await r.blob()); a.download = `neon-nexus-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href); }
    catch (x) { setErr(x.message); }
  };
  const importFile = async (e) => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return; setErr(''); setMsg('');
    try {
      const data = JSON.parse(await file.text());
      if (data.format !== 'neon-nexus-backup') throw new Error('This is not a NEON NEXUS backup file.');
      const n = Object.values(data.tables || {}).reduce((a, t) => a + (Array.isArray(t) ? t.length : 0), 0);
      if (!confirm(`This backup has ${n} records. Importing REPLACES all current data. Export a backup first if unsure. Continue?`)) return;
      await api('/import', { method: 'POST', body: data }); setMsg('Backup imported.'); load();
    } catch (x) { setErr(x instanceof SyntaxError ? 'That file is not valid JSON.' : x.message); }
  };
  const link = key ? `${location.origin}/?join=${key}` : '';
  if (!s) return <p className="dim mono">{err || 'Loading…'}</p>;
  const F = [['dailyGoal', 'Daily focus goal (minutes)'], ['codingGoal', 'Daily coding goal (problems)'], ['focusMin', 'Focus session (min)'], ['shortMin', 'Short break (min)'], ['longMin', 'Long break (min)']];
  return (
    <div className="grid">
      {(err || msg) && <p className={(err ? 'error' : 'ok') + ' span2'} role={err ? 'alert' : 'status'}>{err || msg}</p>}
      <form className="card" onSubmit={save}><h2>Goals and timer</h2>
        {F.map(([k, n]) => <label key={k}>{n}<input type="number" min="1" value={s[k]} onChange={e => setS({ ...s, [k]: Number(e.target.value) })} /></label>)}
        <button className="btn primary">Save settings</button></form>
      <section className="card"><h2>Data status</h2>
        <p className="mono"><i className="dot" /> Database: {status?.database || 'checking…'}</p>
        {status?.counts && <p className="mono dim">{Object.entries(status.counts).filter(([k]) => k !== 'settings').map(([k, v]) => `${k}: ${v}`).join('   ')}</p>}
        <h2 style={{ marginTop: 16 }}>Backup</h2>
        <div className="row"><button className="btn" onClick={exportAll}>Export all data (JSON)</button>
          <label className="btn" style={{ margin: 0, cursor: 'pointer' }}>Import backup<input type="file" accept="application/json,.json" onChange={importFile} hidden /></label></div>
        <p className="dim">Single notes can be exported as Markdown from the Notes page.</p>
        <h2 style={{ marginTop: 16 }}>Use on another device</h2>
        <p className="dim">Open this link on your phone or another browser to see the same data. Anyone who has the link can open your workspace, so keep it private.</p>
        <div className="row"><input readOnly aria-label="Sync link" className="grow" value={link} onFocus={e => e.target.select()} /><button className="btn" onClick={() => navigator.clipboard?.writeText(link)}>Copy link</button></div></section>
    </div>
  );
}
