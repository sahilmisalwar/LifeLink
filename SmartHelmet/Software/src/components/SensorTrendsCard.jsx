// SmartHelmet/Software/src/components/SensorTrendsCard.jsx

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import '../styles/SensorTrendsCard.css';

const METRICS = [
  { key: 'temperature', label: 'Temperature', unit: '°C', color: '#f97316', gradientId: 'gradTemp' },
  { key: 'gas_level',   label: 'Gas Level',   unit: 'ppm', color: '#00d4ff', gradientId: 'gradGas' },
  { key: 'heart_rate',  label: 'Heart Rate',  unit: 'bpm', color: '#01B574', gradientId: 'gradHR' },
];

/**
 * Custom tooltip styled for the dark glassmorphism theme.
 */
function TrendTooltip({ active, payload, label, metric }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      style={{
        background: 'rgba(6, 11, 40, 0.92)',
        border: '1px solid rgba(86, 87, 122, 0.4)',
        borderRadius: 10,
        padding: '8px 14px',
        fontSize: '0.75rem',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: '#FFFFFF',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ color: '#A0AEC0', marginBottom: 4, fontSize: '0.65rem' }}>{label}</div>
      <div style={{ color: metric.color, fontWeight: 700 }}>
        {payload[0].value != null ? payload[0].value.toFixed(1) : '--'} {metric.unit}
      </div>
    </div>
  );
}

export default function SensorTrendsCard({ history }) {
  const [activeMetric, setActiveMetric] = useState('temperature');

  const metric = METRICS.find((m) => m.key === activeMetric) || METRICS[0];

  // Prepare chart data: extract metric values with time labels
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

  // Current value (latest in history)
  const latestEntry = history && history.length > 0 ? history[history.length - 1] : null;
  const currentValue = latestEntry ? latestEntry[metric.key] : null;

  // Trend indicator: compare last two values
  const trend = useMemo(() => {
    if (!history || history.length < 2) return 'stable';
    const prev = history[history.length - 2][metric.key];
    const curr = history[history.length - 1][metric.key];
    if (prev == null || curr == null) return 'stable';
    const diff = curr - prev;
    if (Math.abs(diff) < 0.5) return 'stable';
    return diff > 0 ? 'up' : 'down';
  }, [history, metric.key]);

  const trendLabel = trend === 'up' ? '▲ Rising' : trend === 'down' ? '▼ Falling' : '● Stable';

  // Empty state
  if (!history || history.length === 0) {
    return (
      <div className="sensor-trends-card">
        <div className="stc-header">
          <span className="stc-title">Sensor Trends</span>
        </div>
        <div className="stc-empty">
          <div className="stc-empty-icon">📈</div>
          No trend data yet
        </div>
      </div>
    );
  }

  return (
    <div className="sensor-trends-card">
      {/* ── Header ───────────────────────────────── */}
      <div className="stc-header">
        <span className="stc-title">Sensor Trends</span>
        <div className="stc-tabs">
          {METRICS.map((m) => (
            <button
              key={m.key}
              className={`stc-tab${activeMetric === m.key ? ' active' : ''}`}
              onClick={() => setActiveMetric(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chart ────────────────────────────────── */}
      <div className="stc-chart-area">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id={metric.gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={metric.color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={metric.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(86, 87, 122, 0.15)"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fill: '#A0AEC0', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
              axisLine={{ stroke: 'rgba(86, 87, 122, 0.2)' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#A0AEC0', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<TrendTooltip metric={metric} />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={metric.color}
              strokeWidth={2}
              fill={`url(#${metric.gradientId})`}
              dot={false}
              activeDot={{ r: 4, fill: metric.color, stroke: '#060B28', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Current Value Summary ────────────────── */}
      <div className="stc-summary">
        <div>
          <span className="stc-summary-label">Current</span>
          <div>
            <span className="stc-summary-value" style={{ color: metric.color }}>
              {currentValue != null ? Number(currentValue).toFixed(1) : '--'}
            </span>
            <span className="stc-summary-unit">{metric.unit}</span>
          </div>
        </div>
        <span className={`stc-summary-trend ${trend}`}>{trendLabel}</span>
      </div>
    </div>
  );
}
