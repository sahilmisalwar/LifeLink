// SmartHelmet/Software/src/components/WorkerStatusCard.jsx

import { Thermometer, Wind, HeartPulse, Activity, Wifi } from 'lucide-react';
import '../styles/WorkerStatusCard.css';

const STATUS_MESSAGES = {
  normal: 'All monitored values are within safe range.',
  warning: 'One or more readings are approaching unsafe levels.',
  emergency: 'Immediate attention required.',
};

export default function WorkerStatusCard({ worker, status, reading, compact, zone }) {
  const safeStatus = status || 'normal';
  const safeStr = (val) => (val !== null && val !== undefined ? val : '--');
  const initials = worker?.name
    ? worker.name.split(' ').map((w) => w[0]).join('').toUpperCase()
    : '?';

  return (
    <div className={`worker-status-card ${safeStatus}${compact ? ' wsc-compact' : ''}`}>
      {/* ── Header ────────────────────────────────── */}
      <div className="wsc-header">
        <span className="wsc-title">Worker Status</span>
        <span className={`wsc-status-badge ${safeStatus}`}>
          <span className={`wsc-status-dot ${safeStatus}`} />
          {safeStatus.toUpperCase()}
        </span>
      </div>

      {/* ── Identity ──────────────────────────────── */}
      <div className="wsc-identity">
        <div className="wsc-avatar">{initials}</div>
        <div>
          <div className="wsc-name">{safeStr(worker?.name)}</div>
          <div className="wsc-id">{safeStr(worker?.worker_id)}</div>
        </div>
      </div>

      {/* ── Info grid ─────────────────────────────── */}
      <div className="wsc-info-grid">
        <div className="wsc-info-item">
          <span className="wsc-info-label">Zone</span>
          <span className="wsc-info-value">
            {safeStr(zone || worker?.current_zone || worker?.zone || 'Unknown')}
          </span>
        </div>
        <div className="wsc-info-item">
          <span className="wsc-info-label">Last Update</span>
          <span className="wsc-info-value">
            {reading?.created_at
              ? new Date(reading.created_at).toLocaleTimeString()
              : '--'}
          </span>
        </div>
      </div>

      {/* ── Compact-only: live vitals summary ────── */}
      {compact && (
        <div className="wsc-vitals-compact">
          <div className="wsc-vital-row">
            <span className="wsc-vital-icon"><Thermometer size={12} strokeWidth={2.5} /></span>
            <span className="wsc-vital-label">Temp</span>
            <span className="wsc-vital-val">{safeStr(reading?.temperature)}<small>°C</small></span>
          </div>
          <div className="wsc-vital-row">
            <span className="wsc-vital-icon"><Wind size={12} strokeWidth={2.5} /></span>
            <span className="wsc-vital-label">Gas</span>
            <span className="wsc-vital-val">{safeStr(reading?.gas_level)}<small>ppm</small></span>
          </div>
          <div className="wsc-vital-row">
            <span className="wsc-vital-icon"><HeartPulse size={12} strokeWidth={2.5} /></span>
            <span className="wsc-vital-label">HR</span>
            <span className="wsc-vital-val">{safeStr(reading?.heart_rate)}<small>bpm</small></span>
          </div>
          <div className="wsc-vital-row">
            <span className="wsc-vital-icon"><Activity size={12} strokeWidth={2.5} /></span>
            <span className="wsc-vital-label">SpO2</span>
            <span className="wsc-vital-val">{safeStr(reading?.spo2)}<small>%</small></span>
          </div>
          <div className="wsc-vital-row">
            <span className="wsc-vital-icon"><Wifi size={12} strokeWidth={2.5} /></span>
            <span className="wsc-vital-label">RSSI</span>
            <span className="wsc-vital-val">{safeStr(reading?.rssi)}<small>dBm</small></span>
          </div>
        </div>
      )}

      {/* ── Status message ────────────────────────── */}
      <div className="wsc-message">
        {STATUS_MESSAGES[safeStatus] || STATUS_MESSAGES.normal}
      </div>
    </div>
  );
}

