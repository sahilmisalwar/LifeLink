// SmartHelmet/Software/src/components/BottomTabBar.jsx

import '../styles/BottomTabBar.css';

const TAB_ITEMS = [
  {
    label: 'Dashboard',
    viewKey: 'overview',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="6" height="6" rx="1.5" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" />
      </svg>
    ),
  },
  {
    label: 'Workers',
    viewKey: 'workers',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="4" r="2.5" />
        <path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" />
        <circle cx="13" cy="5" r="1.5" />
        <path d="M14.5 12.5c0-1.5-0.7-2.5-1.5-3" />
      </svg>
    ),
  },
  {
    label: 'Alerts',
    viewKey: 'alerts',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 14a1.5 1.5 0 0 0 3 0" />
        <path d="M12.5 10c.15-.5.2-1.1.2-1.5A4.7 4.7 0 0 0 8 4a4.7 4.7 0 0 0-4.7 4.5c0 .4.05 1 .2 1.5L4 12h8l.5-2Z" />
      </svg>
    ),
  },
  {
    label: 'Tunnel',
    viewKey: 'tunnel-map',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1C5.8 1 4 2.8 4 5c0 4 4 10 4 10s4-6 4-10c0-2.2-1.8-4-4-4Z" />
        <circle cx="8" cy="5" r="1.5" />
      </svg>
    ),
  },
  {
    label: 'Analytics',
    viewKey: 'analytics',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="14" x2="12" y2="4" />
        <line x1="8" y1="14" x2="8" y2="8" />
        <line x1="4" y1="14" x2="4" y2="10" />
      </svg>
    ),
  },
];

export default function BottomTabBar({ activeView, setActiveView }) {
  return (
    <nav className="bottom-tab-bar" aria-label="Mobile navigation">
      {TAB_ITEMS.map(({ label, viewKey, icon }) => (
        <button
          key={viewKey}
          type="button"
          className={`bottom-tab-item${activeView === viewKey ? ' active' : ''}`}
          onClick={() => setActiveView(viewKey)}
          aria-current={activeView === viewKey ? 'page' : undefined}
          aria-label={label}
        >
          <span className="bottom-tab-icon">{icon}</span>
          <span className="bottom-tab-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
