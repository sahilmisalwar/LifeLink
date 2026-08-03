// SmartHelmet/Software/src/components/AlertsCard.jsx

import '../styles/AlertsCard.css';

export default function AlertsCard({ alerts }) {
  const safeAlerts = alerts || [];
  const displayAlerts = safeAlerts.slice(0, 5);

  const getSeverityClass = (severity) => {
    const s = (severity || '').toLowerCase();
    if (s === 'emergency' || s === 'critical') return 'emergency';
    if (s === 'warning') return 'warning';
    return 'normal';
  };

  return (
    <div className="alerts-card">
      {/* ── Header ────────────────────────────────── */}
      <div className="ac-header">
        <span className="ac-title">Recent Alerts</span>
        <span className="ac-count">
          {safeAlerts.length} alert{safeAlerts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Alert list ────────────────────────────── */}
      {displayAlerts.length > 0 ? (
        <div className="ac-list">
          {displayAlerts.map((alert, idx) => {
            const sevClass = getSeverityClass(alert.severity);
            return (
              <div key={alert.id || idx} className="ac-item">
                <span className={`ac-severity-pip ${sevClass}`} />
                <span className={`ac-severity-label ${sevClass}`}>
                  {alert.severity || 'INFO'}
                </span>
                <span className="ac-message">
                  {alert.alert_type || alert.message || 'Alert'}
                </span>
                <span className="ac-time">
                  {alert.created_at
                    ? new Date(alert.created_at).toLocaleTimeString()
                    : '--'}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ac-empty">
          <div className="ac-empty-icon">🔔</div>
          No recent alerts
        </div>
      )}
    </div>
  );
}
