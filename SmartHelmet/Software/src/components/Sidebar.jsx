// SmartHelmet/Software/src/components/Sidebar.jsx

import { useState } from 'react';
import '../styles/Sidebar.css';

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    icon: (
      <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="6" height="6" rx="1.5" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" />
      </svg>
    ),
  },
  {
    label: 'Alerts',
    icon: (
      <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 14a1.5 1.5 0 0 0 3 0" />
        <path d="M12.5 10c.15-.5.2-1.1.2-1.5A4.7 4.7 0 0 0 8 4a4.7 4.7 0 0 0-4.7 4.5c0 .4.05 1 .2 1.5L4 12h8l.5-2Z" />
      </svg>
    ),
  },
  {
    label: 'Tunnel Map',
    icon: (
      <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1C5.8 1 4 2.8 4 5c0 4 4 10 4 10s4-6 4-10c0-2.2-1.8-4-4-4Z" />
        <circle cx="8" cy="5" r="1.5" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    icon: (
      <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="2.5" />
        <path d="M13.5 10a1.4 1.4 0 0 0 .28 1.55l.05.05a1.7 1.7 0 1 1-2.41 2.41l-.05-.05A1.4 1.4 0 0 0 10 13.5a1.4 1.4 0 0 0-.85 1.28V15a1.7 1.7 0 0 1-3.4 0v-.08a1.4 1.4 0 0 0-.92-1.28 1.4 1.4 0 0 0-1.55.28l-.05.05a1.7 1.7 0 1 1-2.41-2.41l.05-.05A1.4 1.4 0 0 0 1.15 10 1.4 1.4 0 0 0 0 9.15V8.5a1.7 1.7 0 0 1 1.7-1.7h.07A1.4 1.4 0 0 0 3.05 5.88a1.4 1.4 0 0 0-.28-1.55l-.05-.05A1.7 1.7 0 1 1 5.13.87l.05.05A1.4 1.4 0 0 0 6.73 1.2H7a1.4 1.4 0 0 0 .85-1.28V0a1.7 1.7 0 0 1 3.4 0v.08a1.4 1.4 0 0 0 .85 1.28 1.4 1.4 0 0 0 1.55-.28l.05-.05a1.7 1.7 0 1 1 2.41 2.41l-.05.05A1.4 1.4 0 0 0 15.78 5a1.4 1.4 0 0 0 1.28.85H15.5a1.7 1.7 0 0 1 0 3.4h-.08a1.4 1.4 0 0 0-1.28.85Z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const [activeItem, setActiveItem] = useState('Dashboard');

  return (
    <aside className="sidebar-container">
      {/* ── Logo ──────────────────────────────────── */}
      <div className="sidebar-logo">
        <span>LifeLink</span>
      </div>

      {/* ── Navigation ────────────────────────────── */}
      <ul className="sidebar-nav">
        {NAV_ITEMS.map(({ label, icon }) => {
          const isActive = activeItem === label;
          return (
            <li
              key={label}
              className={`nav-item${isActive ? ' active' : ''}`}
              onClick={() => setActiveItem(label)}
            >
              <span className={`nav-icon-chip${isActive ? ' active' : ''}`}>
                {icon}
              </span>
              <span>{label}</span>
            </li>
          );
        })}
      </ul>

      {/* ── Worker status chip (pushed to bottom) ── */}
      <div className="worker-chip">
        <span className="worker-chip-dot" />
        <span style={{ color: '#A0AEC0' }}>Worker</span>
        <span className="ml-auto font-semibold tracking-wide">W001</span>
      </div>
    </aside>
  );
}
