// SmartHelmet/Software/src/pages/TunnelMapPage.jsx

import { Thermometer, Wind, Zap, HeartPulse, Activity, Wifi } from 'lucide-react';
import SurveillanceTunnelMap from '../components/SurveillanceTunnelMap';
import WorkerStatusCard from '../components/WorkerStatusCard';
import { getSensorStatus } from '../utils/constants';
import '../styles/TunnelMapPage.css';

/**
 * Sensor definitions for the compact readings panel.
 * Each entry maps to a field on the live `reading` object.
 */
const SENSOR_DEFS = [
  { key: 'temperature', label: 'Temperature', unit: '°C',  icon: Thermometer, sensorKey: 'temperature' },
  { key: 'gas_level',   label: 'Gas Level',   unit: 'ppm', icon: Wind,        sensorKey: 'gas_level'   },
  { key: 'force',       label: 'Impact Force', unit: 'N',   icon: Zap,         sensorKey: 'force'       },
  { key: 'heart_rate',  label: 'Heart Rate',  unit: 'bpm', icon: HeartPulse,  sensorKey: 'heart_rate'  },
  { key: 'spo2',        label: 'SpO₂',        unit: '%',   icon: Activity,    sensorKey: 'spo2'        },
  { key: 'rssi',        label: 'RSSI',        unit: 'dBm', icon: Wifi,        sensorKey: null          },
];

/**
 * TunnelMapPage — Full-page dedicated view that reuses the existing
 * SurveillanceTunnelMap component at a larger size, alongside a compact
 * worker-status sidebar.
 *
 * All live data props are passed through from Dashboard.jsx's single
 * useLiveData() source of truth, so the map shown here is always in
 * sync with the overview page's smaller version.
 */
export default function TunnelMapPage({
  worker,
  reading,
  zone,
  status,
  isEmergencyMode,
  emergencyLevel,
}) {
  const safeStr = (val) => (val !== null && val !== undefined ? val : '--');

  return (
    <div className="tunnel-map-page">
      {/* ── Page header ───────────────────────────────────── */}
      <div className="tmp-header">
        <div>
          <h1 className="tmp-title">Tunnel Surveillance Map</h1>
          <p className="tmp-subtitle">
            Full-screen live position and rescue route guidance
          </p>
        </div>
        <div className="tmp-zone-badge">
          <span className="tmp-zone-dot" />
          Zone: {zone || 'Unknown'}
        </div>
      </div>

      {/* ── Body: enlarged map + sidebar panel ─────────────── */}
      <div className="tmp-body">
        {/* Map — same component, same props, more room */}
        <div className="tmp-map-container">
          <SurveillanceTunnelMap
            worker={worker}
            reading={reading}
            zone={zone}
            status={status}
            isEmergencyMode={isEmergencyMode}
            emergencyLevel={emergencyLevel}
          />
        </div>

        {/* Sidebar panel */}
        <div className="tmp-sidebar-panel">
          {/* Reuse the existing WorkerStatusCard as-is */}
          <WorkerStatusCard
            worker={worker}
            status={status}
            reading={reading}
            compact
            zone={zone}
          />

          {/* Compact sensor readings card */}
          <div className="tmp-info-card">
            <h3 className="tmp-info-card-title">Live Sensor Readings</h3>
            <div className="tmp-reading-grid">
              {SENSOR_DEFS.map(({ key, label, unit, icon: Icon, sensorKey }) => {
                const sensorStatus = sensorKey
                  ? getSensorStatus(reading, sensorKey)
                  : 'normal';
                const rowClass =
                  sensorStatus === 'emergency'
                    ? 'emergency'
                    : sensorStatus === 'warning'
                    ? 'warning'
                    : '';

                return (
                  <div
                    key={key}
                    className={`tmp-reading-row ${rowClass}`}
                  >
                    <span className="tmp-reading-icon">
                      <Icon size={14} strokeWidth={2.5} />
                    </span>
                    <span className="tmp-reading-label">{label}</span>
                    <span className="tmp-reading-value">
                      {safeStr(reading?.[key])}
                      <span className="tmp-reading-unit">{unit}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
