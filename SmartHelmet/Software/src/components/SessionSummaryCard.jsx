// SmartHelmet/Software/src/components/SessionSummaryCard.jsx
import { useMemo } from 'react';
import { Thermometer, Wind, HeartPulse, Activity, Wifi, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { THRESHOLDS } from '../utils/constants';
import { getWorkerStatus } from '../services/api';
import '../styles/SessionSummaryCard.css';

const STATS_CONFIG = [
  { key: 'temperature', label: 'Temperature', icon: Thermometer, unit: '°C' },
  { key: 'gas_level', label: 'Gas Level', icon: Wind, unit: 'ppm' },
  { key: 'heart_rate', label: 'Heart Rate', icon: HeartPulse, unit: 'bpm' },
  { key: 'spo2', label: 'SpO2', icon: Activity, unit: '%' },
  { key: 'rssi', label: 'RSSI', icon: Wifi, unit: 'dBm' }
];

const getStatusColor = (status) => {
  if (status === 'emergency') return { '--stat-border': 'rgba(239, 68, 68, 0.4)', '--stat-glow': 'rgba(239, 68, 68, 0.1)' };
  if (status === 'warning') return { '--stat-border': 'rgba(245, 158, 11, 0.4)', '--stat-glow': 'rgba(245, 158, 11, 0.1)' };
  return { '--stat-border': 'rgba(16, 185, 129, 0.3)', '--stat-glow': 'transparent' };
};

export default function SessionSummaryCard({ history }) {
  const stats = useMemo(() => {
    const result = {};
    STATS_CONFIG.forEach(cfg => {
      const values = (history || []).map(h => h[cfg.key]).filter(v => v != null);
      if (values.length === 0) {
        result[cfg.key] = { min: '--', max: '--', avg: '--', statusStyle: {} };
      } else {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        
        let status = 'normal';
        if (cfg.key === 'rssi') {
          status = 'normal';
        } else {
          // Use the avg to determine general status of the session for this metric
          const mockReading = { [cfg.key]: avg };
          status = getWorkerStatus(mockReading);
        }

        result[cfg.key] = {
          min: Number.isInteger(min) ? min : min.toFixed(1),
          max: Number.isInteger(max) ? max : max.toFixed(1),
          avg: avg.toFixed(1),
          statusStyle: getStatusColor(status)
        };
      }
    });
    return result;
  }, [history]);

  const counts = useMemo(() => {
    let falls = 0;
    let warnings = 0;
    let emergencies = 0;

    if (history) {
      falls = history.filter(h => h.fall_detected).length;
      warnings = history.filter(h => getWorkerStatus(h) === 'warning').length;
      emergencies = history.filter(h => getWorkerStatus(h) === 'emergency').length;
    }

    return { falls, warnings, emergencies };
  }, [history]);

  return (
    <div className="session-summary-card">
      <div className="ssc-header">
        <h3 className="ssc-title">Session Summary</h3>
      </div>
      
      <div className="ssc-grid">
        {STATS_CONFIG.map(cfg => {
          const Icon = cfg.icon;
          const data = stats[cfg.key];
          return (
            <div key={cfg.key} className="ssc-stat-box" style={data.statusStyle}>
              <div className="ssc-stat-header">
                <Icon size={16} /> {cfg.label} ({cfg.unit})
              </div>
              <div className="ssc-stat-values">
                <div className="ssc-val-group">
                  <span className="ssc-val-label">Min</span>
                  <span className="ssc-val-number">{data.min}</span>
                </div>
                <div className="ssc-val-group" style={{ alignItems: 'center' }}>
                  <span className="ssc-val-label">Avg</span>
                  <span className="ssc-val-number">{data.avg}</span>
                </div>
                <div className="ssc-val-group" style={{ alignItems: 'flex-end' }}>
                  <span className="ssc-val-label">Max</span>
                  <span className="ssc-val-number">{data.max}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="ssc-counts-row">
        <div className={`ssc-count-chip ${counts.falls > 0 ? 'fall' : 'safe'}`}>
          <div className="ssc-count-icon-wrap" style={{ color: counts.falls > 0 ? '#a855f7' : '#10b981' }}>
            {counts.falls > 0 ? <Zap size={24} /> : <CheckCircle2 size={24} />}
          </div>
          <div className="ssc-count-content">
            <span className="ssc-count-number">{counts.falls}</span>
            <span className="ssc-count-label">Falls Detected</span>
          </div>
        </div>

        <div className={`ssc-count-chip ${counts.warnings > 0 ? 'warning' : 'safe'}`}>
          <div className="ssc-count-icon-wrap" style={{ color: counts.warnings > 0 ? '#f59e0b' : '#10b981' }}>
            {counts.warnings > 0 ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
          </div>
          <div className="ssc-count-content">
            <span className="ssc-count-number">{counts.warnings}</span>
            <span className="ssc-count-label">Warnings</span>
          </div>
        </div>

        <div className={`ssc-count-chip ${counts.emergencies > 0 ? 'emergency' : 'safe'}`}>
          <div className="ssc-count-icon-wrap" style={{ color: counts.emergencies > 0 ? '#ef4444' : '#10b981' }}>
            {counts.emergencies > 0 ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
          </div>
          <div className="ssc-count-content">
            <span className="ssc-count-number">{counts.emergencies}</span>
            <span className="ssc-count-label">Emergencies</span>
          </div>
        </div>
      </div>
    </div>
  );
}
