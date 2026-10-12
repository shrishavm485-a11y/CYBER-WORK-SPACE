import { useEffect, useState } from 'react';
export default function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <div className="clock" aria-label="Current time">
      <span className="mono big">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      <span className="mono dim">{now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}</span>
    </div>
  );
}
