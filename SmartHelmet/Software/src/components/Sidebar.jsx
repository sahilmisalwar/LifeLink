// SmartHelmet/Software/src/components/Sidebar.jsx

import { useState, useCallback } from 'react';
import { Activity } from 'lucide-react';
import '../styles/Sidebar.css';

const VIEW_KEY_MAP = {
  'Dashboard': 'overview',
  'Alerts': 'alerts',
  'Tunnel Map': 'tunnel-map',
  'Analytics': 'analytics',
  'Workers': 'workers',
};

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
    label: 'Workers',
    icon: (
      <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="4" r="2.5" />
        <path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" />
        <circle cx="13" cy="5" r="1.5" />
        <path d="M14.5 12.5c0-1.5-0.7-2.5-1.5-3" />
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
    label: 'Analytics',
    icon: (
      <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="14" x2="12" y2="4" />
        <line x1="8" y1="14" x2="8" y2="8" />
        <line x1="4" y1="14" x2="4" y2="10" />
      </svg>
    ),
  },
];

export default function Sidebar({ activeView, setActiveView }) {
  const [clickedItem, setClickedItem] = useState(null);

  const handleNavClick = useCallback((viewKey) => {
    setActiveView(viewKey);
    setClickedItem(viewKey);
    setTimeout(() => {
      setClickedItem(null);
    }, 300); // match animation duration
  }, [setActiveView]);

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  }, []);

  return (
    <aside className="sidebar-container">
      {/* ── Logo ──────────────────────────────────── */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-content">
          <Activity className="sidebar-logo-icon" strokeWidth={2.5} />
          <span className="sidebar-logo-text">LifeLink</span>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────── */}
      <ul className="sidebar-nav">
        {NAV_ITEMS.map(({ label, icon }) => {
          const viewKey = VIEW_KEY_MAP[label];
          const isActive = activeView === viewKey;
          const isClicked = clickedItem === viewKey;
          return (
            <li
              key={label}
              className={`nav-item${isActive ? ' active' : ''}${isClicked ? ' clicked' : ''}`}
              onClick={() => handleNavClick(viewKey)}
              onMouseMove={handleMouseMove}
            >
              <span className={`nav-icon-chip${isActive ? ' active' : ''}`}>
                {icon}
              </span>
              <span className="nav-item-text">{label}</span>
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
