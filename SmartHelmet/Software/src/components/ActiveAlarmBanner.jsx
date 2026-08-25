// SmartHelmet/Software/src/components/ActiveAlarmBanner.jsx

import { useState } from 'react';
import { AlertTriangle, AlertOctagon, Siren } from 'lucide-react';
import '../styles/ActiveAlarmBanner.css';

/**
 * ActiveAlarmBanner — displays a prominent banner at the top of the dashboard
 * when an emergency or warning condition is active. Visually escalates in sync
 * with the global emergency mode.
 *
 * Props:
 *  - alerts:           array of alert objects from useLiveData
 *  - reading:          current sensor reading (to detect sos_triggered / fall_detected)
 *  - status:           current overall status ('normal' | 'warning' | 'emergency')
 *  - isEmergencyMode:  boolean — true when status is warning or emergency
 *  - emergencyLevel:   'none' | 'elevated' | 'critical'
 */
export default function ActiveAlarmBanner({ alerts, reading, status, isEmergencyMode, emergencyLevel, acknowledged, setAcknowledged }) {

  // Reset acknowledgement when status drops back to normal
  // (handled implicitly — banner is hidden when not in emergency mode)
  if (!isEmergencyMode) return null;

  // ── Determine the emergency reason from the live reading ──
  const isSOS = reading?.sos_triggered === true;
  const isFall = reading?.fall_detected === true;

  // ── Build reason-specific message ──
  let reasonLabel = '';
  let message = '';

  if (isSOS) {
    reasonLabel = '🚨 SOS ACTIVATED';
    message = 'Worker pressed the SOS button — immediate assistance required!';
  } else if (isFall) {
    reasonLabel = '⚠️ FALL DETECTED';
    message = 'Fall detected on helmet — check worker safety immediately!';
  } else {
    // Fallback: use alert data or generic message
    const safeAlerts = alerts || [];
    const activeAlert = safeAlerts.find(
      (a) => (a.severity || '').toLowerCase() === 'emergency' || (a.severity || '').toLowerCase() === 'critical'
    ) || safeAlerts.find(
      (a) => (a.severity || '').toLowerCase() === 'warning'
    ) || safeAlerts[0];

    reasonLabel = status === 'emergency' ? 'EMERGENCY' : 'WARNING';
    message = activeAlert
      ? (activeAlert.alert_type || activeAlert.message || 'Active alert detected')
      : status === 'emergency'
        ? 'Emergency condition detected — immediate attention required'
        : 'Warning condition detected — readings approaching unsafe levels';
  }

  const timestamp = new Date().toLocaleTimeString();

  return (
    <div
      className={`active-alarm-banner ${acknowledged ? 'aab-acknowledged' : ''} ${isSOS ? 'aab-sos' : ''}`}
      data-emergency-level={emergencyLevel}
      role="alert"
      aria-live="assertive"
    >
      <div className="aab-indicator" />

      <div className="aab-icon">
        {isSOS ? <Siren size={24} strokeWidth={2.5} /> : emergencyLevel === 'critical' ? <AlertOctagon size={24} strokeWidth={2.5} /> : <AlertTriangle size={24} strokeWidth={2.5} />}
      </div>

      <div className="aab-content">
        <div className="aab-severity">
          {reasonLabel}
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
