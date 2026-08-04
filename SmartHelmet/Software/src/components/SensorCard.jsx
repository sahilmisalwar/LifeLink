// SmartHelmet/Software/src/components/SensorCard.jsx

import { useState, useCallback } from 'react';
import '../styles/SensorCard.css';

export default function SensorCard({ label, value, unit, status, icon, subtitle }) {
  const safeStatus = status || 'normal';
  const displayValue = value !== null && value !== undefined ? value : '--';

  const [isClicked, setIsClicked] = useState(false);

  const handleClick = useCallback(() => {
    setIsClicked(true);
    setTimeout(() => {
      setIsClicked(false);
    }, 300);
  }, []);

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  }, []);

  return (
    <div 
      className={`sensor-card ${safeStatus} ${isClicked ? 'clicked' : ''}`}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
    >
      <div className="sc-content-layer">
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
    </div>
  );
}
