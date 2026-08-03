// SmartHelmet/Software/src/components/LiveDebugPanel.jsx
import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import '../styles/LiveDebugPanel.css';

export default function LiveDebugPanel({ reading, alerts, worker, status, loading }) {
  const [collapsed, setCollapsed] = useState(true);

  const getBadgeState = () => {
    if (loading) return { text: 'Loading...', className: 'loading' };
    if (reading) return { text: 'Live', className: 'live' };
    return { text: 'No Data', className: 'empty' };
  };

  const badge = getBadgeState();
  const safeStr = (val) => (val !== null && val !== undefined ? val : '--');

  return (
    <div className={`live-debug-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="debug-header" onClick={() => setCollapsed(!collapsed)} role="button" tabIndex={0}>
        <div className="debug-header-title">
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          <h3>Live Debug Panel</h3>
          {collapsed && <span className="debug-hint">Click to expand developer info</span>}
        </div>
        <span className={`debug-badge ${badge.className}`}>{badge.text}</span>
      </div>

      {!collapsed && (
        <div className="debug-body">
          <div className="debug-section">
        <h4>Worker</h4>
        <div className="debug-grid">
          <div className="debug-item">
            <span className="debug-label">ID</span>
            <span className="debug-value">{safeStr(worker?.worker_id)}</span>
          </div>
          <div className="debug-item">
            <span className="debug-label">Name</span>
            <span className="debug-value">{safeStr(worker?.name)}</span>
          </div>
          <div className="debug-item">
            <span className="debug-label">Zone</span>
            <span className="debug-value">{safeStr(worker?.current_zone)}</span>
          </div>
        </div>
      </div>

      <div className="debug-section">
        <h4>Status</h4>
        <div className={`debug-status ${status}`}>
          {status ? status.toUpperCase() : '--'}
        </div>
      </div>

      <div className="debug-section">
        <h4>Latest Reading</h4>
        <div className="debug-grid">
          <div className="debug-item">
            <span className="debug-label">Temperature</span>
            <span className="debug-value">{safeStr(reading?.temperature)} °C</span>
          </div>
          <div className="debug-item">
            <span className="debug-label">Gas Level</span>
            <span className="debug-value">{safeStr(reading?.gas_level)} ppm</span>
          </div>
          <div className="debug-item">
            <span className="debug-label">Force</span>
            <span className="debug-value">{safeStr(reading?.force)} N</span>
          </div>
          <div className="debug-item">
            <span className="debug-label">RSSI</span>
            <span className="debug-value">{safeStr(reading?.rssi)} dBm</span>
          </div>
          <div className="debug-item">
            <span className="debug-label">Heart Rate</span>
            <span className="debug-value">{safeStr(reading?.heart_rate)} bpm</span>
          </div>
          <div className="debug-item">
            <span className="debug-label">SpO2</span>
            <span className="debug-value">{safeStr(reading?.spo2)} %</span>
          </div>
          <div className="debug-item">
            <span className="debug-label">Fall Detected</span>
            <span className="debug-value">{reading?.fall_detected ? 'Yes' : 'No'}</span>
          </div>
          <div className="debug-item">
            <span className="debug-label">Created At</span>
            <span className="debug-value">{reading?.created_at ? new Date(reading.created_at).toLocaleTimeString() : '--'}</span>
          </div>
        </div>
      </div>

      <div className="debug-section">
        <h4>Recent Alerts</h4>
        <div className="debug-alerts">
          {alerts && alerts.length > 0 ? (
            alerts.slice(0, 5).map((alert, idx) => (
              <div key={idx} className="debug-alert-item">
                <span className={`alert-severity ${alert.severity?.toLowerCase() || 'normal'}`}>
                  {alert.severity || 'INFO'}
                </span>
                <span className="alert-message">{alert.alert_type || alert.message}</span>
                <span className="alert-time">{alert.created_at ? new Date(alert.created_at).toLocaleTimeString() : '--'}</span>
              </div>
            ))
          ) : (
            <div className="debug-alert-empty">No alerts yet</div>
          )}
        </div>
      </div>
        </div>
      )}
    </div>
  );
}
