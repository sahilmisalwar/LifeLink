// SmartHelmet/Software/src/pages/WorkerDetailPage.jsx
//
// ══════════════════════════════════════════════════════════════════════════════
//  WORKER DETAIL PAGE — Phase 5
// ══════════════════════════════════════════════════════════════════════════════
//
//  Shared detail page for any worker (real or simulated).
//  Resolves data source based on workerId:
//    - Real worker (W001): reads from live pipeline props
//    - Fake workers (W002-W005): reads from useFakeWorkers() props
//
//  Charts use Recharts (AreaChart) matching the existing EnvironmentalTrendsPanel.
//
// ══════════════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Thermometer, Wind, Zap, HeartPulse, Activity, Wifi, ArrowLeft } from 'lucide-react';
import '../styles/WorkerDetailPage.css';

const REAL_WORKER_ID = 'W001';

/* ── Chart metric definitions ─────────────────────────────── */
const CHART_METRICS = [
  { key: 'heart_rate', label: 'Heart Rate', unit: 'bpm', color: '#01B574', icon: <HeartPulse size={15} strokeWidth={2.5} />, type: 'ecg' },
  { key: 'temperature', label: 'Temperature', unit: '°C', color: '#f97316', icon: <Thermometer size={15} strokeWidth={2.5} /> },
  { key: 'gas_level', label: 'Gas Level', unit: 'ppm', color: '#5b8fb9', icon: <Wind size={15} strokeWidth={2.5} /> },
  { key: 'spo2', label: 'SpO₂', unit: '%', color: '#ec4899', icon: <Activity size={15} strokeWidth={2.5} /> },
  { key: 'force', label: 'Force', unit: 'N', color: '#a855f7', icon: <Zap size={15} strokeWidth={2.5} /> },
  { key: 'rssi', label: 'RSSI', unit: 'dBm', color: '#6366f1', icon: <Wifi size={15} strokeWidth={2.5} />, isRssi: true },
];

/* ── ECG waveform generator ───────────────────────────────── */
// Generates a synthetic ECG-style waveform from heart rate values.
function generateECGData(heartRateHistory) {
  if (!heartRateHistory || heartRateHistory.length === 0) return [];

  const ecgPoints = [];
  const samplesPerBeat = 30;

  heartRateHistory.forEach((entry, beatIdx) => {
    const hr = entry.value || entry;
    const beatInterval = 60 / (hr || 72); // seconds per beat
    const baseTime = beatIdx * samplesPerBeat;

    for (let i = 0; i < samplesPerBeat; i++) {
      const t = i / samplesPerBeat;
      let y = 0;

      // P wave (small bump at ~15%)
      if (t >= 0.10 && t < 0.20) {
        y = 0.15 * Math.sin((t - 0.10) * Math.PI / 0.10);
      }
      // QRS complex (sharp spike at ~35%)
      else if (t >= 0.28 && t < 0.32) {
        y = -0.15 * Math.sin((t - 0.28) * Math.PI / 0.04); // Q dip
      } else if (t >= 0.32 && t < 0.38) {
        y = 1.0 * Math.sin((t - 0.32) * Math.PI / 0.06); // R peak
      } else if (t >= 0.38 && t < 0.42) {
        y = -0.25 * Math.sin((t - 0.38) * Math.PI / 0.04); // S dip
      }
      // T wave (broader bump at ~60%)
      else if (t >= 0.52 && t < 0.68) {
        y = 0.25 * Math.sin((t - 0.52) * Math.PI / 0.16);
      }

      // Add subtle noise
      y += (Math.random() - 0.5) * 0.03;

      // Scale amplitude slightly by HR deviation from normal
      const hrScale = 0.8 + 0.4 * ((hr || 72) / 80);
      y *= hrScale;

      ecgPoints.push({
        idx: baseTime + i,
        value: parseFloat(y.toFixed(3)),
        time: `${(beatIdx * beatInterval + (i / samplesPerBeat) * beatInterval).toFixed(1)}s`,
      });
    }
  });

  // Keep last 300 points for display
  return ecgPoints.slice(-300);
}

/* ── Chart tooltip ────────────────────────────────────────── */
function ChartTooltip({ active, payload, metric }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      style={{
        background: 'rgba(6, 11, 40, 0.96)',
        border: '1px solid rgba(86, 87, 122, 0.45)',
        borderRadius: 10,
        padding: '8px 12px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={{ fontSize: '1rem', fontWeight: 800, color: metric.color }}>
          {payload[0].value != null ? Number(payload[0].value).toFixed(1) : '--'}
        </span>
        <span style={{ fontSize: '0.7rem', color: 'rgba(160, 174, 192, 0.8)', fontWeight: 600 }}>
          {metric.unit}
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   WorkerDetailPage — main component
   ══════════════════════════════════════════════════════════════ */
export default function WorkerDetailPage({
  workerId,
  worker,        // Real worker object
  reading,       // Real worker's current reading
  status,        // Real worker's status
  zone,          // Real worker's zone
  history,       // Real worker's history array
  fakeWorkers,   // Array of 4 fake workers from useFakeWorkers()
  onBack,        // Callback to go back to previous view
}) {
  // ── Resolve worker data based on ID ──
  const isRealWorker = workerId === REAL_WORKER_ID;

  const resolvedWorker = useMemo(() => {
    if (isRealWorker) {
      return {
        id: REAL_WORKER_ID,
        name: worker?.name || 'Live Worker',
        zone: zone || 'Unknown',
        status: status || 'normal',
        isSimulated: false,
        readings: {
          temperature: reading?.temperature,
          gas_level: reading?.gas_level,
          force: reading?.force,
          heart_rate: reading?.heart_rate,
          spo2: reading?.spo2,
        },
        rssi: reading?.rssi,
        history: null, // handled separately below
      };
    }
    const fw = fakeWorkers.find((w) => w.id === workerId);
    return fw || null;
  }, [isRealWorker, workerId, worker, reading, status, zone, fakeWorkers]);

  // ── Build chart data per metric ──
  const chartDataSets = useMemo(() => {
    if (!resolvedWorker) return {};

    const datasets = {};

    CHART_METRICS.forEach((metric) => {
      if (metric.isRssi) {
        // RSSI: for fake workers it's constant, for real it's from history
        if (isRealWorker && history && history.length > 0) {
          datasets[metric.key] = history.map((entry, idx) => ({
            time: entry.created_at
              ? new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : `#${idx + 1}`,
            value: entry.rssi != null ? Number(entry.rssi) : null,
          }));
        } else if (!isRealWorker) {
          // Fake workers have constant RSSI, create flat line
          datasets[metric.key] = Array.from({ length: 20 }, (_, i) => ({
            time: `#${i + 1}`,
            value: resolvedWorker.rssi,
          }));
        } else {
          datasets[metric.key] = [];
        }
        return;
      }

      if (isRealWorker) {
        // Real worker: use the history prop (array of reading objects)
        if (history && history.length > 0) {
          datasets[metric.key] = history.map((entry, idx) => ({
            time: entry.created_at
              ? new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : `#${idx + 1}`,
            value: entry[metric.key] != null ? Number(entry[metric.key]) : null,
          }));
        } else {
          datasets[metric.key] = [];
        }
      } else {
        // Fake worker: use per-sensor history buffer { value, timestamp }
        const sensorHistory = resolvedWorker.history?.[metric.key] || [];
        datasets[metric.key] = sensorHistory.map((entry, idx) => ({
          time: new Date(entry.timestamp).toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
          }),
          value: entry.value != null ? Number(entry.value) : null,
        }));
      }
    });

    return datasets;
  }, [resolvedWorker, isRealWorker, history]);

  // ── ECG data ──
  const ecgData = useMemo(() => {
    const hrData = chartDataSets['heart_rate'];
    if (!hrData || hrData.length === 0) return [];
    return generateECGData(hrData.map((d) => ({ value: d.value })));
  }, [chartDataSets]);

  // ── Not found ──
  if (!resolvedWorker) {
    return (
      <div>
        <button className="wdp-back" type="button" onClick={onBack}>
          <ArrowLeft size={14} /> Back
        </button>
        <div className="wdp-not-found">
          <div className="wdp-not-found-icon">🔍</div>
          <div className="wdp-not-found-title">Worker Not Found</div>
          <div className="wdp-not-found-text">No worker with ID "{workerId}" exists.</div>
        </div>
      </div>
    );
  }

  const r = resolvedWorker.readings || {};

  return (
    <div>
      {/* ── Back button ── */}
      <button className="wdp-back" type="button" onClick={onBack}>
        <ArrowLeft size={14} /> Back
      </button>

      {/* ── Header card ── */}
      <div className="wdp-header-card">
        <div className={`wdp-avatar ${resolvedWorker.isSimulated ? 'simulated' : 'real'}`}>
          {resolvedWorker.id}
        </div>
        <div className="wdp-header-info">
          <div className="wdp-name-row">
            <span className="wdp-name">{resolvedWorker.name}</span>
            <span className={`wdp-type-badge ${resolvedWorker.isSimulated ? 'sim' : 'live'}`}>
              {resolvedWorker.isSimulated ? 'SIMULATED' : 'LIVE'}
            </span>
          </div>
          <div className="wdp-meta-row">
            <span className="wdp-meta-item">ID:<span>{resolvedWorker.id}</span></span>
            <span className="wdp-meta-item">Zone:<span>{resolvedWorker.zone}</span></span>
          </div>
        </div>
        <div className={`wdp-status ${resolvedWorker.status}`}>
          <span className="wdp-status-dot" />
          {resolvedWorker.status === 'normal' ? 'Normal'
            : resolvedWorker.status === 'warning' ? 'Warning' : 'Emergency'}
        </div>
      </div>

      {/* ── Mini KPI strip ── */}
      <div className="wdp-kpi-strip">
        <div className="wdp-kpi">
          <Thermometer size={16} className="wdp-kpi-icon" strokeWidth={2.5} />
          <span className="wdp-kpi-value">{r.temperature != null ? Number(r.temperature).toFixed(1) : '--'}</span>
          <span className="wdp-kpi-label">Temperature</span>
          <span className="wdp-kpi-unit">°C</span>
        </div>
        <div className="wdp-kpi">
          <Wind size={16} className="wdp-kpi-icon" strokeWidth={2.5} />
          <span className="wdp-kpi-value">{r.gas_level != null ? Math.round(r.gas_level) : '--'}</span>
          <span className="wdp-kpi-label">Gas Level</span>
          <span className="wdp-kpi-unit">ppm</span>
        </div>
        <div className="wdp-kpi">
          <Zap size={16} className="wdp-kpi-icon" strokeWidth={2.5} />
          <span className="wdp-kpi-value">{r.force != null ? Math.round(r.force) : '--'}</span>
          <span className="wdp-kpi-label">Force</span>
          <span className="wdp-kpi-unit">N</span>
        </div>
        <div className="wdp-kpi">
          <HeartPulse size={16} className="wdp-kpi-icon" strokeWidth={2.5} />
          <span className="wdp-kpi-value">{r.heart_rate != null ? Math.round(r.heart_rate) : '--'}</span>
          <span className="wdp-kpi-label">Heart Rate</span>
          <span className="wdp-kpi-unit">bpm</span>
        </div>
        <div className="wdp-kpi">
          <Activity size={16} className="wdp-kpi-icon" strokeWidth={2.5} />
          <span className="wdp-kpi-value">{r.spo2 != null ? Number(r.spo2).toFixed(0) : '--'}%</span>
          <span className="wdp-kpi-label">SpO₂</span>
          <span className="wdp-kpi-unit">%</span>
        </div>
        <div className="wdp-kpi">
          <Wifi size={16} className="wdp-kpi-icon" strokeWidth={2.5} />
          <span className="wdp-kpi-value">{resolvedWorker.rssi != null ? resolvedWorker.rssi : (reading?.rssi ?? '--')}</span>
          <span className="wdp-kpi-label">RSSI</span>
          <span className="wdp-kpi-unit">dBm</span>
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="wdp-charts-grid">
        {/* ECG Waveform — spans full width */}
        <div className="wdp-chart-card ecg">
          <div className="wdp-chart-header">
            <span className="wdp-chart-title">
              <HeartPulse size={15} strokeWidth={2.5} />
              ECG Waveform
            </span>
            <span className="wdp-chart-current" style={{ color: '#01B574' }}>
              {r.heart_rate != null ? `${Math.round(r.heart_rate)} bpm` : '--'}
            </span>
          </div>
          <div className="wdp-chart-area">
            {ecgData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ecgData} margin={{ top: 8, right: 16, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(86, 87, 122, 0.12)" vertical={false} />
                  <XAxis dataKey="idx" hide />
                  <YAxis domain={[-0.5, 1.2]} hide />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#01B574"
                    strokeWidth={1.8}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8b949e', fontSize: '0.75rem' }}>
                Waiting for heart rate data…
              </div>
            )}
          </div>
        </div>

        {/* Sensor trend charts */}
        {CHART_METRICS.map((metric) => {
          if (metric.type === 'ecg') return null; // Already rendered above
          const data = chartDataSets[metric.key] || [];
          const latestValue = data.length > 0 ? data[data.length - 1].value : null;
          const gradId = `wdp-grad-${metric.key}`;

          return (
            <div key={metric.key} className="wdp-chart-card">
              <div className="wdp-chart-header">
                <span className="wdp-chart-title">
                  {metric.icon}
                  {metric.label}
                </span>
                <span className="wdp-chart-current" style={{ color: metric.color }}>
                  {latestValue != null ? `${Number(latestValue).toFixed(1)} ${metric.unit}` : '--'}
                </span>
              </div>
              <div className="wdp-chart-area">
                {data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -16 }}>
                      <defs>
                        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={metric.color} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={metric.color} stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(86, 87, 122, 0.14)" vertical={false} />
                      <XAxis
                        dataKey="time"
                        tick={{ fill: '#8da4c4', fontSize: 9, fontFamily: "ui-monospace, monospace" }}
                        axisLine={{ stroke: 'rgba(86, 87, 122, 0.20)' }}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fill: '#8da4c4', fontSize: 9, fontFamily: "ui-monospace, monospace" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<ChartTooltip metric={metric} />} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={metric.color}
                        strokeWidth={2.5}
                        fill={`url(#${gradId})`}
                        dot={false}
                        activeDot={{ r: 5, fill: metric.color, stroke: '#060B28', strokeWidth: 2 }}
                        isAnimationActive={false}
                        connectNulls
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8b949e', fontSize: '0.75rem' }}>
                    Waiting for data…
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
