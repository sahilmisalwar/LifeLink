// SmartHelmet/Software/src/components/SensorCard.jsx

import '../styles/SensorCard.css';

export default function SensorCard({ label, value, unit, status, icon, subtitle }) {
  const safeStatus = status || 'normal';
  const displayValue = value !== null && value !== undefined ? value : '--';

  return (
    <div className={`sensor-card ${safeStatus}`}>
      {/* ── Header row ────────────────────────────── */}
      <div className="sc-header">
        <div className="sc-icon">{icon || '📊'}</div>
        <div className={`sc-mini-badge ${safeStatus}`} />
      </div>

      {/* ── Label ─────────────────────────────────── */}
      <div className="sc-label">{label}</div>

      {/* ── Value ─────────────────────────────────── */}
      <div className="sc-value-area">
        <span className="sc-value">{displayValue}</span>
        {unit && <span className="sc-unit">{unit}</span>}
      </div>

      {/* ── Subtitle ──────────────────────────────── */}
      {subtitle && <div className="sc-subtitle">{subtitle}</div>}
    </div>
  );
}
