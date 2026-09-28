// SmartHelmet/Software/src/components/ActiveAlarmBanner.jsx

import { useState } from 'react';
import { AlertTriangle, AlertOctagon, Siren, Thermometer, Wind, Zap, Heart, Activity, Wifi } from 'lucide-react';
import { THRESHOLDS } from '../utils/constants';
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
export default function ActiveAlarmBanner({ alerts, reading, status, isEmergencyMode, emergencyLevel, acknowledged, setAcknowledged, activeEmergency, activeConditions }) {

  if (!isEmergencyMode) return null;

  // ── Explicit mapping: event type → human-readable alert label ──
  const ALERT_TYPE_LABELS = {
    'SOS': 'SOS Button Detection',
    'FALL': 'Fall Detection',
    'GAS': 'Gas Detection',
    'IMPACT': 'High Impact Detection',
    'HIGH_HEART_RATE': 'High Heart Rate Detection',
    'LOW_HEART_RATE': 'Low Heart Rate Detection',
    'TEMPERATURE': 'High Temperature Detection',
    'WEAK_SIGNAL': 'Weak Signal Detection',
    'GENERIC': 'Abnormal Condition Detection',
  };

  const workerInfo = reading?.worker_id ? `WORKER: ${reading.worker_id}` : '';
  const workerSuffix = workerInfo ? ` — ${workerInfo}` : '';

  // ── Build reason-specific message from ALL active conditions ──
  let reasonLabel = status === 'warning' ? 'WARNING' : 'EMERGENCY';
  let message = '';
  // Use activeEmergency.type for icon selection (highest priority)
  let emergencyType = activeEmergency?.type || '';

  const conditions = activeConditions || [];
  if (conditions.length > 0) {
    // Filter out GENERIC if there are real conditions alongside it
    const realConditions = conditions.filter(c => c.type !== 'GENERIC');
    const displayConditions = realConditions.length > 0 ? realConditions : conditions;

    // Build combined label from all active conditions
    const labels = displayConditions.map(c => ALERT_TYPE_LABELS[c.type] || c.type.replace(/_/g, ' '));
    // Deduplicate (in case of duplicates) while preserving order
    const uniqueLabels = [...new Set(labels)];
    message = `${uniqueLabels.join(' + ')}${workerSuffix}`;
  } else if (activeEmergency) {
    // Fallback to single activeEmergency if activeConditions not provided
    message = `${ALERT_TYPE_LABELS[emergencyType] || 'Abnormal Condition Detection'}${workerSuffix}`;
  } else {
    // Last resort fallback: use alert data or generic message
    const safeAlerts = alerts || [];
    const activeAlert = safeAlerts.find(
      (a) => (a.severity || '').toLowerCase() === 'emergency' || (a.severity || '').toLowerCase() === 'critical'
    ) || safeAlerts.find(
      (a) => (a.severity || '').toLowerCase() === 'warning'
    ) || safeAlerts[0];

    const fallbackMsg = activeAlert
      ? (activeAlert.alert_type || activeAlert.message || 'ACTIVE ALERT DETECTED').toUpperCase()
      : status === 'emergency'
        ? 'EMERGENCY CONDITION DETECTED'
        : 'WARNING CONDITION DETECTED';
    message = `${fallbackMsg}${workerSuffix}`;
  }
  
  const isSOS = emergencyType === 'SOS';

  const timestamp = new Date().toLocaleTimeString();

  // ── Sensor Data Formatting ──
  const temp = reading?.temperature !== undefined ? `${Number(reading.temperature).toFixed(1)}°C` : '--';
  const gas = reading?.gas_level !== undefined ? `${reading.gas_level} ppm` : '--';
  const force = reading?.force !== undefined ? `${reading.force} N` : '--';
  const hr = reading?.heart_rate !== undefined ? `${reading.heart_rate} bpm` : '--';
  const spo2 = reading?.spo2 !== undefined ? `${reading.spo2}%` : null;
  // Note: workerInfo is now appended to the message directly.

  return (
    <div
      className={`active-alarm-banner ${acknowledged ? 'aab-acknowledged' : ''} ${isSOS ? 'aab-sos' : ''}`}
      data-emergency-level={emergencyLevel}
      role="alert"
      aria-live="assertive"
    >
      <div className="aab-bg-elements">
        <div className="aab-grid-pattern"></div>
        <div className="aab-glow-overlay"></div>
      </div>

      <div className="aab-left-section">
        <div className="aab-icon-container">
          {emergencyType === 'SOS' ? (
            <Siren size={32} strokeWidth={2} />
          ) : emergencyType === 'TEMPERATURE' ? (
            <Thermometer size={32} strokeWidth={2} />
          ) : emergencyType === 'GAS' ? (
            <Wind size={32} strokeWidth={2} />
          ) : emergencyType === 'IMPACT' ? (
            <Zap size={32} strokeWidth={2} />
          ) : emergencyType === 'HIGH_HEART_RATE' || emergencyType === 'LOW_HEART_RATE' ? (
            <Heart size={32} strokeWidth={2} />
          ) : emergencyType === 'WEAK_SIGNAL' ? (
            <Wifi size={32} strokeWidth={2} />
          ) : emergencyLevel === 'critical' || emergencyType === 'FALL' ? (
            <AlertOctagon size={32} strokeWidth={2} />
          ) : (
            <AlertTriangle size={32} strokeWidth={2} />
          )}
        </div>
      </div>

      <div className="aab-middle-section">
        <div className="aab-header-row">
          <div className="aab-label-container">
            <span className="aab-severity">{reasonLabel}</span>
            <div className="aab-severity-line"></div>
          </div>
        </div>
        
        <div className="aab-message">{message}</div>
        
        <div className="aab-telemetry-row">
          <div className="aab-metric">
            <span className="aab-metric-icon">🕒</span> {timestamp}
          </div>
          <div className="aab-separator"></div>
          <div className="aab-metric">
            <Thermometer size={14} className="aab-lucide-icon" /> Temp: {temp}
          </div>
          <div className="aab-separator"></div>
          <div className="aab-metric">
            <Wind size={14} className="aab-lucide-icon" /> Gas: {gas}
          </div>
          <div className="aab-separator"></div>
          <div className="aab-metric">
            <Zap size={14} className="aab-lucide-icon" /> Force: {force}
          </div>
          <div className="aab-separator"></div>
          <div className="aab-metric">
            <Heart size={14} className="aab-lucide-icon" /> HR: {hr}
          </div>
          {spo2 && (
            <>
              <div className="aab-separator"></div>
              <div className="aab-metric">
                <Activity size={14} className="aab-lucide-icon" /> SpO2: {spo2}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="aab-right-section">
        {!acknowledged ? (
          <button
            className="aab-acknowledge-btn"
            onClick={() => setAcknowledged(true)}
            aria-label="Acknowledge this alarm"
          >
            [ ACKNOWLEDGE ]
          </button>
        ) : (
          <div className="aab-ack-label">ACKNOWLEDGED</div>
        )}
      </div>
    </div>
  );
}
