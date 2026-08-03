// SmartHelmet/Software/src/components/Header.jsx

import { useState, useEffect } from 'react';
import '../styles/Header.css';

function formatTime(date) {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export default function Header() {
  const [time, setTime] = useState(() => formatTime(new Date()));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(formatTime(new Date()));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="header-container">
      {/* ── Page title ────────────────────────────── */}


      {/* ── Right side ────────────────────────────── */}
      <div className="header-right">
        <span className="header-clock">{time}</span>
        <div className="status-pill">
          <span className="status-pill-dot" />
          <span>System Online</span>
        </div>
      </div>
    </header>
  );
}
