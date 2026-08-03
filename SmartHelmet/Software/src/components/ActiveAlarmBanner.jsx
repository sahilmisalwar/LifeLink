// SmartHelmet/Software/src/components/ActiveAlarmBanner.jsx

import { useState } from 'react';
import { AlertTriangle, AlertOctagon } from 'lucide-react';
import '../styles/ActiveAlarmBanner.css';

/**
 * ActiveAlarmBanner — displays a prominent banner at the top of the dashboard
 * when an emergency or warning condition is active. Visually escalates in sync
 * with the global emergency mode.
 *
 * Props:
 *  - alerts:           array of alert objects from useLiveData
 *  - status:           current overall status ('normal' | 'warning' | 'emergency')
 *  - isEmergencyMode:  boolean — true when status is warning or emergency
 *  - emergencyLevel:   'none' | 'elevated' | 'critical'
 */
export default function ActiveAlarmBanner({ alerts, status, isEmergencyMode, emergencyLevel }) {
  const [acknowledged, setAcknowledged] = useState(false);

  // Reset acknowledgement when status drops back to normal
  // (handled implicitly — banner is hidden when not in emergency mode)
  if (!isEmergencyMode) return null;

  // Find the highest-severity active alert to display
  const safeAlerts = alerts || [];
  const activeAlert = safeAlerts.find(
    (a) => (a.severity || '').toLowerCase() === 'emergency' || (a.severity || '').toLowerCase() === 'critical'
  ) || safeAlerts.find(
    (a) => (a.severity || '').toLowerCase() === 'warning'
  ) || safeAlerts[0];

  const message = activeAlert
    ? (activeAlert.alert_type || activeAlert.message || 'Active alert detected')
    : status === 'emergency'
      ? 'Emergency condition detected — immediate attention required'
      : 'Warning condition detected — readings approaching unsafe levels';

  const timestamp = activeAlert?.created_at
    ? new Date(activeAlert.created_at).toLocaleTimeString()
    : new Date().toLocaleTimeString();

  return (
    <div
      className={`active-alarm-banner ${acknowledged ? 'aab-acknowledged' : ''}`}
      data-emergency-level={emergencyLevel}
      role="alert"
      aria-live="assertive"
    >
      <div className="aab-indicator" />

      <div className="aab-icon">
        {emergencyLevel === 'critical' ? <AlertOctagon size={24} strokeWidth={2.5} /> : <AlertTriangle size={24} strokeWidth={2.5} />}
      </div>

      <div className="aab-content">
        <div className="aab-severity">
          {status === 'emergency' ? 'EMERGENCY' : 'WARNING'}
        </div>
        <div className="aab-message">{message}</div>
        <div className="aab-timestamp">{timestamp}</div>
      </div>

      {!acknowledged && (
        <button
          className="aab-acknowledge-btn"
          onClick={() => setAcknowledged(true)}
          aria-label="Acknowledge this alarm"
        >
          Acknowledge
        </button>
      )}

      {acknowledged && (
        <span className="aab-ack-label">Acknowledged</span>
      )}
    </div>
  );
}
