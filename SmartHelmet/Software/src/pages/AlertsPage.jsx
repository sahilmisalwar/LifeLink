// SmartHelmet/Software/src/pages/AlertsPage.jsx

import { useState, useEffect } from 'react';
import { getAlerts } from '../services/api';
import '../styles/AlertsPage.css';

const FULL_ALERT_LIMIT = 100;

const SEVERITY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'warning', label: 'Warning' },
  { key: 'emergency', label: 'Emergency' },
];

function getSeverityClass(severity) {
  const s = (severity || '').toLowerCase();
  if (s === 'emergency' || s === 'critical') return 'emergency';
  if (s === 'warning') return 'warning';
  return 'normal';
}

function formatTimestamp(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function AlertsPage({ alerts: liveAlerts }) {
  const [fullAlerts, setFullAlerts] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');

  // Fetch a larger alert history independently so the dashboard's 10-item
  // cap is not affected.  Merge with any live-pushed alerts that may be
  // newer than the initial fetch.
  useEffect(() => {
    let cancelled = false;

    async function fetchFull() {
      const data = await getAlerts(FULL_ALERT_LIMIT);
      if (!cancelled) setFullAlerts(data);
    }

    fetchFull();
    return () => { cancelled = true; };
  }, []);

  // Merge live alerts (from real-time subscription) with full history,
  // deduplicating by id.
  const mergedAlerts = (() => {
    const map = new Map();
    // Full fetch first (older)
    for (const a of fullAlerts) {
      const key = a.id || a.created_at;
      if (key) map.set(key, a);
    }
    // Live alerts on top (newer, may overlap)
    for (const a of (liveAlerts || [])) {
      const key = a.id || a.created_at;
      if (key) map.set(key, a);
    }
    // Sort newest-first
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  })();

  // Client-side severity filter
  const filteredAlerts =
    activeFilter === 'all'
      ? mergedAlerts
      : mergedAlerts.filter(
          (a) => getSeverityClass(a.severity) === activeFilter
        );

  // Stats
  const warningCount = mergedAlerts.filter(
    (a) => getSeverityClass(a.severity) === 'warning'
  ).length;
  const emergencyCount = mergedAlerts.filter(
    (a) => getSeverityClass(a.severity) === 'emergency'
  ).length;

  return (
    <div className="alerts-page">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="ap-header">
        <h1 className="ap-title">Alert History</h1>
        <p className="ap-subtitle">
          Complete alert log for this worker session
        </p>
      </div>

      {/* ── Quick Stats ─────────────────────────────────── */}
      <div className="ap-stats">
        <div className="ap-stat-chip">
          <span className="ap-stat-count total">{mergedAlerts.length}</span>
          Total
        </div>
        <div className="ap-stat-chip">
          <span className="ap-stat-count warning">{warningCount}</span>
          Warnings
        </div>
        <div className="ap-stat-chip">
          <span className="ap-stat-count emergency">{emergencyCount}</span>
          Emergencies
        </div>
      </div>

      {/* ── Severity Filter Toggles ─────────────────────── */}
      <div className="ap-filters">
        {SEVERITY_FILTERS.map(({ key, label }) => {
          const isActive = activeFilter === key;
          let activeClass = '';
          if (isActive) {
            if (key === 'warning') activeClass = 'active-warning';
            else if (key === 'emergency') activeClass = 'active-emergency';
            else activeClass = 'active';
          }
          return (
            <button
              key={key}
              className={`ap-filter-btn ${activeClass}`}
              onClick={() => setActiveFilter(key)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Alert List ──────────────────────────────────── */}
      {filteredAlerts.length > 0 ? (
        <div className="ap-list-container">
          <div className="ap-list">
            {filteredAlerts.map((alert, idx) => {
              const sevClass = getSeverityClass(alert.severity);
              return (
                <div key={alert.id || idx} className="ap-alert-row">
                  <span className={`ap-severity-pip ${sevClass}`} />
                  <span className={`ap-severity-label ${sevClass}`}>
                    {alert.severity || 'INFO'}
                  </span>
                  <div className="ap-alert-body">
                    <div className="ap-alert-message">
                      {alert.alert_type || alert.message || 'Alert'}
                    </div>
                    <div className="ap-alert-meta">
                      <span className="ap-alert-worker">
                        {alert.worker_id || '—'}
                      </span>
                    </div>
                  </div>
                  <span className="ap-alert-time">
                    {formatTimestamp(alert.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="ap-list-container">
          <div className="ap-empty">
            <div className="ap-empty-icon">🔔</div>
            <p className="ap-empty-title">No alerts yet</p>
            <p className="ap-empty-text">
              {activeFilter !== 'all'
                ? `No ${activeFilter} alerts found. Try selecting "All".`
                : 'Alerts will appear here when sensor thresholds are breached.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
