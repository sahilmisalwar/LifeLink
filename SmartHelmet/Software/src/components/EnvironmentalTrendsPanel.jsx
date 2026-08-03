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
import { Thermometer, Wind, Zap, HeartPulse, Activity, Wifi } from 'lucide-react';
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
    icon: <Thermometer size={14} strokeWidth={2.5} />,
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
    icon: <Wind size={14} strokeWidth={2.5} />,
    color: '#00d4ff',
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
    icon: <Zap size={14} strokeWidth={2.5} />,
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
    icon: <HeartPulse size={14} strokeWidth={2.5} />,
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
    icon: <Activity size={14} strokeWidth={2.5} />,
    color: '#ec4899',
    gradientId: 'etp-grad-spo2',
    thresholds: () => null,
  },
  {
    key: 'rssi',
    label: 'RSSI',
    unit: 'dBm',
    icon: <Wifi size={14} strokeWidth={2.5} />,
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
        background: 'rgba(6, 11, 40, 0.94)',
        border: '1px solid rgba(86, 87, 122, 0.45)',
        borderRadius: 10,
        padding: '8px 14px',
        fontSize: '0.72rem',
        fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
        color: '#fff',
        boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
      }}
    >
      <div style={{ color: '#8094b0', marginBottom: 3, fontSize: '0.6rem' }}>{label}</div>
      <div style={{ color: metric.color, fontWeight: 700 }}>
        {payload[0].value != null ? Number(payload[0].value).toFixed(1) : '--'} {metric.unit}
      </div>
    </div>
  );
}

/* ── Trend analysis ──────────────────────────────────────── */
function analyzeTrend(history, metricKey) {
  if (!history || history.length < 2) return { direction: 'stable', label: 'Stable', thresholdStatus: 'normal' };

  const values = history
    .map((h) => h[metricKey])
    .filter((v) => v != null && v !== undefined);

  if (values.length < 2) return { direction: 'stable', label: 'Stable', thresholdStatus: 'normal' };

  const latest = values[values.length - 1];
  const windowSize = Math.min(5, values.length);
  const recentSlice = values.slice(-windowSize);
  const earlierAvg = recentSlice.slice(0, Math.floor(windowSize / 2)).reduce((a, b) => a + b, 0) / Math.floor(windowSize / 2);
  const laterAvg = recentSlice.slice(Math.floor(windowSize / 2)).reduce((a, b) => a + b, 0) / (windowSize - Math.floor(windowSize / 2));
  const diff = laterAvg - earlierAvg;

  // Determine direction
  const relativeDiff = earlierAvg !== 0 ? Math.abs(diff / earlierAvg) : Math.abs(diff);
  let direction = 'stable';
  let label = 'Stable';
  // Use a 2% threshold for stability
  if (relativeDiff > 0.02 || Math.abs(diff) > 0.5) {
    if (diff > 0) { direction = 'rising'; label = 'Rising'; }
    else { direction = 'falling'; label = 'Falling'; }
  }

  // Check threshold proximity
  let thresholdStatus = 'normal';
  const metric = METRICS.find((m) => m.key === metricKey);
  const thresholds = metric?.thresholds?.();

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
            <span className="etp-title">Environmental Trends</span>
            <span className="etp-subtitle">Awaiting sensor data</span>
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
          <span className="etp-title">Environmental Trends</span>
          <span className="etp-subtitle">
            Zone: {zone || 'Unknown'} · {history.length} readings
          </span>
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
            style={activeMetric === m.key ? { borderColor: `${m.color}55`, color: m.color, background: `${m.color}12` } : {}}
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
            <span className="etp-live-value" style={{ color: valueColor }}>
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
          <AreaChart data={chartData} margin={{ top: 12, right: 16, bottom: 4, left: -12 }}>
            <defs>
              <linearGradient id={metric.gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={metric.color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={metric.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(86, 87, 122, 0.12)"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fill: '#6b7fa0', fontSize: 9, fontFamily: "ui-monospace, 'JetBrains Mono', monospace" }}
              axisLine={{ stroke: 'rgba(86, 87, 122, 0.15)' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#6b7fa0', fontSize: 9, fontFamily: "ui-monospace, 'JetBrains Mono', monospace" }}
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
                strokeWidth={1}
                label={{ value: `WARN ${thresholds.warning}`, position: 'right', fill: '#f59e0b', fontSize: 9, fontFamily: "ui-monospace, monospace" }}
              />
            )}
            {thresholds?.emergency != null && (
              <ReferenceLine
                y={thresholds.emergency}
                stroke="#ef4444"
                strokeDasharray="6 4"
                strokeWidth={1}
                label={{ value: `EMRG ${thresholds.emergency}`, position: 'right', fill: '#ef4444', fontSize: 9, fontFamily: "ui-monospace, monospace" }}
              />
            )}
            {thresholds?.warningHigh != null && (
              <ReferenceLine
                y={thresholds.warningHigh}
                stroke="#f59e0b"
                strokeDasharray="6 4"
                strokeWidth={1}
                label={{ value: `HIGH ${thresholds.warningHigh}`, position: 'right', fill: '#f59e0b', fontSize: 9, fontFamily: "ui-monospace, monospace" }}
              />
            )}
            {thresholds?.warningLow != null && (
              <ReferenceLine
                y={thresholds.warningLow}
                stroke="#f59e0b"
                strokeDasharray="6 4"
                strokeWidth={1}
                label={{ value: `LOW ${thresholds.warningLow}`, position: 'right', fill: '#f59e0b', fontSize: 9, fontFamily: "ui-monospace, monospace" }}
              />
            )}
            {thresholds?.emergencyHigh != null && (
              <ReferenceLine
                y={thresholds.emergencyHigh}
                stroke="#ef4444"
                strokeDasharray="6 4"
                strokeWidth={1}
                label={{ value: `CRIT ${thresholds.emergencyHigh}`, position: 'right', fill: '#ef4444', fontSize: 9, fontFamily: "ui-monospace, monospace" }}
              />
            )}
            {thresholds?.emergencyLow != null && (
              <ReferenceLine
                y={thresholds.emergencyLow}
                stroke="#ef4444"
                strokeDasharray="6 4"
                strokeWidth={1}
                label={{ value: `CRIT ${thresholds.emergencyLow}`, position: 'right', fill: '#ef4444', fontSize: 9, fontFamily: "ui-monospace, monospace" }}
              />
            )}

            <Area
              type="monotone"
              dataKey="value"
              stroke={metric.color}
              strokeWidth={2.2}
              fill={`url(#${metric.gradientId})`}
              dot={false}
              activeDot={{ r: 4, fill: metric.color, stroke: '#060B28', strokeWidth: 2 }}
              isAnimationActive={false}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Footer: stats + legend ────────────────── */}
      <div className="etp-footer">
        <div className="etp-footer-meta">
          <div className="etp-footer-item">
            <span className="etp-footer-label">Min</span>
            <span className="etp-footer-value">{stats.min} {metric.unit}</span>
          </div>
          <div className="etp-footer-item">
            <span className="etp-footer-label">Avg</span>
            <span className="etp-footer-value">{stats.avg} {metric.unit}</span>
          </div>
          <div className="etp-footer-item">
            <span className="etp-footer-label">Max</span>
            <span className="etp-footer-value">{stats.max} {metric.unit}</span>
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
