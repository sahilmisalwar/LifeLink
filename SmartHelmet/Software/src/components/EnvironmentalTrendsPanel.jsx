// SmartHelmet/Software/src/components/EnvironmentalTrendsPanel.jsx

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Thermometer, Wind, Zap, HeartPulse, Activity, Wifi, TrendingUp } from 'lucide-react';
import { THRESHOLDS } from '../utils/constants';
import '../styles/EnvironmentalTrendsPanel.css';

/* ══════════════════════════════════════════════════════════════
   Metric definitions — each metric's display config and thresholds
   ══════════════════════════════════════════════════════════════ */
const METRICS = [
  {
    key: 'temperature',
    label: 'Temperature',
    unit: '°C',
    icon: <Thermometer size={16} strokeWidth={2.5} />,
    color: '#f97316',
    gradientId: 'etp-grad-temp',
    thresholds: () => ({
      warning: THRESHOLDS.temperature.warning,
      emergency: THRESHOLDS.temperature.emergency,
    }),
  },
  {
    key: 'gas_level',
    label: 'Gas Level',
    unit: 'ppm',
    icon: <Wind size={16} strokeWidth={2.5} />,
    color: '#5b8fb9',
    gradientId: 'etp-grad-gas',
    thresholds: () => ({
      warning: THRESHOLDS.gas_level.warning,
      emergency: THRESHOLDS.gas_level.emergency,
    }),
  },
  {
    key: 'force',
    label: 'Force',
    unit: 'N',
    icon: <Zap size={16} strokeWidth={2.5} />,
    color: '#a855f7',
    gradientId: 'etp-grad-force',
    thresholds: () => ({
      warning: THRESHOLDS.force.warning,
      emergency: THRESHOLDS.force.emergency,
    }),
  },
  {
    key: 'heart_rate',
    label: 'Heart Rate',
    unit: 'bpm',
    icon: <HeartPulse size={16} strokeWidth={2.5} />,
    color: '#01B574',
    gradientId: 'etp-grad-hr',
    thresholds: () => ({
      warningLow: THRESHOLDS.heart_rate.warningLow,
      warningHigh: THRESHOLDS.heart_rate.warningHigh,
      emergencyLow: THRESHOLDS.heart_rate.emergencyLow,
      emergencyHigh: THRESHOLDS.heart_rate.emergencyHigh,
    }),
  },
  {
    key: 'spo2',
    label: 'SpO₂',
    unit: '%',
    icon: <Activity size={16} strokeWidth={2.5} />,
    color: '#ec4899',
    gradientId: 'etp-grad-spo2',
    thresholds: () => null,
  },
  {
    key: 'rssi',
    label: 'RSSI',
    unit: 'dBm',
    icon: <Wifi size={16} strokeWidth={2.5} />,
    color: '#6366f1',
    gradientId: 'etp-grad-rssi',
    thresholds: () => null,
  },
];

/* ── Trend tooltip ────────────────────────────────────────── */
function TrendTooltip({ active, payload, label, metric }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      style={{
        background: 'rgba(6, 11, 40, 0.96)',
        border: '1px solid rgba(86, 87, 122, 0.45)',
        borderRadius: 12,
        padding: '10px 14px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div
        style={{
          fontSize: '0.68rem',
          color: 'rgba(160, 174, 192, 0.7)',
          fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: '1.2rem', fontWeight: 800, color: metric.color }}>
          {payload[0].value != null ? Number(payload[0].value).toFixed(1) : '--'}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'rgba(160, 174, 192, 0.8)', fontWeight: 600 }}>
          {metric.unit}
        </span>
      </div>
    </div>
  );
}

/* ── Trend analysis helper ────────────────────────────────── */
function analyzeTrend(history, metricKey) {
  if (!history || history.length < 2) {
    return { direction: 'stable', label: 'Stable', thresholdStatus: 'normal' };
  }

  const validEntries = history
    .map((h) => h[metricKey])
    .filter((v) => v !== null && v !== undefined);

  if (validEntries.length < 2) {
    return { direction: 'stable', label: 'Stable', thresholdStatus: 'normal' };
  }

  const latest = validEntries[validEntries.length - 1];
  const prev = validEntries[validEntries.length - 2];
  const diff = latest - prev;

  const metric = METRICS.find((m) => m.key === metricKey);
  const thresholds = metric?.thresholds?.();

  let direction = 'stable';
  if (diff > 0.5) direction = 'rising';
  else if (diff < -0.5) direction = 'falling';

  let thresholdStatus = 'normal';
  let label = direction === 'rising' ? 'Rising' : direction === 'falling' ? 'Falling' : 'Stable';

  if (thresholds) {
    if (metricKey === 'heart_rate') {
      if (latest <= thresholds.emergencyLow || latest >= thresholds.emergencyHigh) {
        thresholdStatus = 'emergency'; label = 'Critical';
      } else if (latest <= thresholds.warningLow || latest >= thresholds.warningHigh) {
        thresholdStatus = 'warning'; label = 'Near threshold';
      }
    } else {
      if (thresholds.emergency != null && latest >= thresholds.emergency) {
        thresholdStatus = 'emergency'; label = 'Critical';
      } else if (thresholds.warning != null && latest >= thresholds.warning) {
        thresholdStatus = 'warning'; label = 'Near threshold';
      } else if (thresholds.warning != null && latest >= thresholds.warning * 0.85 && direction === 'rising') {
        thresholdStatus = 'approaching'; label = 'Approaching threshold';
      }
    }
  }

  return { direction, label, thresholdStatus };
}

/* ══════════════════════════════════════════════════════════════
   EnvironmentalTrendsPanel — main component
   ══════════════════════════════════════════════════════════════ */
export default function EnvironmentalTrendsPanel({ history, worker, status, zone }) {
  const [activeMetric, setActiveMetric] = useState('temperature');

  const metric = METRICS.find((m) => m.key === activeMetric) || METRICS[0];
  const thresholds = metric.thresholds?.();

  // Chart data
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    return history.map((entry, idx) => {
      const time = entry.created_at
        ? new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : `#${idx + 1}`;
      return {
        time,
        value: entry[metric.key] != null ? Number(entry[metric.key]) : null,
      };
    });
  }, [history, metric.key]);

  // Latest value
  const latestEntry = history && history.length > 0 ? history[history.length - 1] : null;
  const currentValue = latestEntry ? latestEntry[metric.key] : null;

  // Trend analysis
  const trend = useMemo(
    () => analyzeTrend(history, metric.key),
    [history, metric.key]
  );

  // Y-axis domain: include threshold lines if they exist
  const yDomain = useMemo(() => {
    const values = chartData.map((d) => d.value).filter((v) => v != null);
    if (values.length === 0) return ['auto', 'auto'];

    let min = Math.min(...values);
    let max = Math.max(...values);

    if (thresholds) {
      if (thresholds.emergency != null) max = Math.max(max, thresholds.emergency * 1.1);
      if (thresholds.warning != null) max = Math.max(max, thresholds.warning * 1.05);
      if (thresholds.emergencyHigh != null) max = Math.max(max, thresholds.emergencyHigh * 1.05);
      if (thresholds.emergencyLow != null) min = Math.min(min, thresholds.emergencyLow * 0.9);
    }

    const padding = (max - min) * 0.08 || 5;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [chartData, thresholds]);

  // Stats
  const stats = useMemo(() => {
    const values = (history || []).map((h) => h[metric.key]).filter((v) => v != null);
    if (values.length === 0) return { min: '--', max: '--', avg: '--' };
    const min = Math.min(...values).toFixed(1);
    const max = Math.max(...values).toFixed(1);
    const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
    return { min, max, avg };
  }, [history, metric.key]);

  // Trend chip class
  const chipClass = trend.thresholdStatus === 'emergency'
    ? 'threshold-emergency'
    : trend.thresholdStatus === 'warning' || trend.thresholdStatus === 'approaching'
      ? 'threshold-warn'
      : trend.direction;

  // Value color — use metric color normally, warning/emergency override
  const valueColor = trend.thresholdStatus === 'emergency'
    ? '#ef4444'
    : trend.thresholdStatus === 'warning' || trend.thresholdStatus === 'approaching'
      ? '#f59e0b'
      : metric.color;

  // Has threshold lines?
  const hasThresholdLines = thresholds && (thresholds.warning != null || thresholds.warningHigh != null);

  // Empty state
  if (!history || history.length === 0) {
    return (
      <div className="env-trends-panel">
        <div className="etp-header">
          <div className="etp-header-left">
            <span className="etp-title-badge"><TrendingUp size={20} strokeWidth={2.5} /></span>
            <span className="etp-title">Environmental Trends</span>
          </div>
        </div>
        <div className="etp-empty">
          <div className="etp-empty-icon">📊</div>
          No trend data available yet
        </div>
      </div>
    );
  }

  return (
    <div className="env-trends-panel" aria-label="Environmental trends panel">
      {/* ── Header ────────────────────────────────── */}
      <div className="etp-header">
        <div className="etp-header-left">
          <span className="etp-title-badge"><TrendingUp size={20} strokeWidth={2.5} /></span>
          <span className="etp-title">Environmental Trends</span>
        </div>
        <div className="etp-header-right">
          <span className="etp-live-pulse" />
          <span className="etp-live-text">Live Feed</span>
        </div>
      </div>

      {/* ── Metric toggle ─────────────────────────── */}
      <div className="etp-toggle-row" role="tablist" aria-label="Select metric">
        {METRICS.map((m) => (
          <button
            key={m.key}
            className={`etp-toggle-btn${activeMetric === m.key ? ' active' : ''}`}
            onClick={() => setActiveMetric(m.key)}
            role="tab"
            aria-selected={activeMetric === m.key}
            style={activeMetric === m.key ? { borderColor: `${m.color}66`, color: m.color, background: `${m.color}18` } : {}}
          >
            <span className="etp-toggle-icon">{m.icon}</span>
            {m.label}
            <span className="etp-toggle-unit">{m.unit}</span>
          </button>
        ))}
      </div>

      {/* ── Live value + trend chip ───────────────── */}
      <div className="etp-live-strip">
        <div>
          <div className="etp-live-label">Current {metric.label}</div>
          <div className="etp-live-value-block">
            <span className="etp-live-value" style={{ color: valueColor, textShadow: `0 0 20px ${valueColor}44` }}>
              {currentValue != null ? Number(currentValue).toFixed(1) : '--'}
            </span>
            <span className="etp-live-unit">{metric.unit}</span>
          </div>
        </div>
        <div className={`etp-trend-chip ${chipClass}`}>
          <span className="etp-trend-arrow">
            {trend.direction === 'rising' ? '▲' : trend.direction === 'falling' ? '▼' : '●'}
          </span>
          {trend.label}
        </div>
      </div>

      {/* ── Chart ─────────────────────────────────── */}
      <div className="etp-chart-area" role="img" aria-label={`${metric.label} trend chart`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 16, right: 24, bottom: 6, left: -6 }}>
            <defs>
              <linearGradient id={metric.gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={metric.color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={metric.color} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(86, 87, 122, 0.16)"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fill: '#8da4c4', fontSize: 10, fontFamily: "ui-monospace, 'JetBrains Mono', monospace" }}
              axisLine={{ stroke: 'rgba(86, 87, 122, 0.25)' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#8da4c4', fontSize: 10, fontFamily: "ui-monospace, 'JetBrains Mono', monospace" }}
              axisLine={false}
              tickLine={false}
              domain={yDomain}
            />
            <Tooltip content={<TrendTooltip metric={metric} />} />

            {/* Threshold reference lines */}
            {thresholds?.warning != null && (
              <ReferenceLine
                y={thresholds.warning}
                stroke="#f59e0b"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{ value: `WARN ${thresholds.warning}`, position: 'right', fill: '#f59e0b', fontSize: 10, fontFamily: "ui-monospace, monospace", fontWeight: 700 }}
              />
            )}
            {thresholds?.emergency != null && (
              <ReferenceLine
                y={thresholds.emergency}
                stroke="#ef4444"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{ value: `EMRG ${thresholds.emergency}`, position: 'right', fill: '#ef4444', fontSize: 10, fontFamily: "ui-monospace, monospace", fontWeight: 700 }}
              />
            )}
            {thresholds?.warningHigh != null && (
              <ReferenceLine
                y={thresholds.warningHigh}
                stroke="#f59e0b"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{ value: `HIGH ${thresholds.warningHigh}`, position: 'right', fill: '#f59e0b', fontSize: 10, fontFamily: "ui-monospace, monospace", fontWeight: 700 }}
              />
            )}
            {thresholds?.warningLow != null && (
              <ReferenceLine
                y={thresholds.warningLow}
                stroke="#f59e0b"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{ value: `LOW ${thresholds.warningLow}`, position: 'right', fill: '#f59e0b', fontSize: 10, fontFamily: "ui-monospace, monospace", fontWeight: 700 }}
              />
            )}
            {thresholds?.emergencyHigh != null && (
              <ReferenceLine
                y={thresholds.emergencyHigh}
                stroke="#ef4444"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{ value: `CRIT ${thresholds.emergencyHigh}`, position: 'right', fill: '#ef4444', fontSize: 10, fontFamily: "ui-monospace, monospace", fontWeight: 700 }}
              />
            )}
            {thresholds?.emergencyLow != null && (
              <ReferenceLine
                y={thresholds.emergencyLow}
                stroke="#ef4444"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{ value: `CRIT ${thresholds.emergencyLow}`, position: 'right', fill: '#ef4444', fontSize: 10, fontFamily: "ui-monospace, monospace", fontWeight: 700 }}
              />
            )}

            <Area
              type="monotone"
              dataKey="value"
              stroke={metric.color}
              strokeWidth={2.8}
              fill={`url(#${metric.gradientId})`}
              dot={false}
              activeDot={{ r: 6, fill: metric.color, stroke: '#060B28', strokeWidth: 2.5 }}
              isAnimationActive={false}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Footer: stats + legend ────────────────── */}
      <div className="etp-footer">
        <div className="etp-footer-meta">
          <div className="etp-footer-chip">
            <span className="etp-footer-label">Min</span>
            <span className="etp-footer-value">{stats.min} <small>{metric.unit}</small></span>
          </div>
          <div className="etp-footer-chip">
            <span className="etp-footer-label">Avg</span>
            <span className="etp-footer-value">{stats.avg} <small>{metric.unit}</small></span>
          </div>
          <div className="etp-footer-chip">
            <span className="etp-footer-label">Max</span>
            <span className="etp-footer-value">{stats.max} <small>{metric.unit}</small></span>
          </div>
        </div>
        {hasThresholdLines && (
          <div className="etp-footer-legend">
            <span className="etp-legend-item">
              <span className="etp-legend-swatch warn" />
              Warning
            </span>
            <span className="etp-legend-item">
              <span className="etp-legend-swatch emerg" />
              Emergency
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
