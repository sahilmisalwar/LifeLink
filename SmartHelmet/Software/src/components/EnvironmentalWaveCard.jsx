// SmartHelmet/Software/src/components/EnvironmentalWaveCard.jsx
import { useState, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Thermometer, Wind, Wifi } from 'lucide-react';
import { THRESHOLDS, getSensorStatus } from '../utils/constants';
import '../styles/EnvironmentalWaveCard.css';

const METRICS = {
  temperature: { label: 'Temp', color: '#f97316', icon: Thermometer, unit: '°C' },
  gas_level: { label: 'Gas', color: '#5b8fb9', icon: Wind, unit: 'ppm' },
  rssi: { label: 'RSSI', color: '#6366f1', icon: Wifi, unit: 'dBm' }
};

const getStatusColor = (status) => {
  if (status === 'emergency') return '#ef4444';
  if (status === 'warning') return '#f59e0b';
  return '#10b981';
};

export default function EnvironmentalWaveCard({ history }) {
  const [activeMetrics, setActiveMetrics] = useState({
    temperature: true,
    gas_level: false,
    rssi: false
  });

  const toggleMetric = (key) => {
    setActiveMetrics(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    return history.map((entry, idx) => ({
      time: entry.created_at ? new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : `#${idx + 1}`,
      temperature: entry.temperature,
      gas_level: entry.gas_level,
      rssi: entry.rssi,
    }));
  }, [history]);

  if (!history || history.length === 0) {
    return (
      <div className="environmental-wave-card">
        <div className="ewc-header"><h3 className="ewc-title">Environmental Trends</h3></div>
        <div className="ewc-empty">No data yet</div>
      </div>
    );
  }

  const latestEntry = history[history.length - 1];
  const activeKeys = Object.keys(activeMetrics).filter(k => activeMetrics[k]);

  return (
    <div className="environmental-wave-card">
      <div className="ewc-header">
        <div>
          <h3 className="ewc-title">Environmental Trends</h3>
          <div className="ewc-toggles">
            {Object.entries(METRICS).map(([key, config]) => {
              const Icon = config.icon;
              const isActive = activeMetrics[key];
              const glowColor = `${config.color}55`;
              return (
                <button
                  key={key}
                  className={`ewc-toggle-btn ${isActive ? 'active' : ''}`}
                  style={isActive ? { borderColor: glowColor, color: config.color, background: `${config.color}15`, '--btn-glow': glowColor } : {}}
                  onClick={() => toggleMetric(key)}
                >
                  <Icon size={16} strokeWidth={2.5} /> {config.label}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="ewc-current-values">
          {activeKeys.map(key => {
            const val = latestEntry[key];
            const status = key === 'rssi' ? 'normal' : getSensorStatus(latestEntry, key);
            const dotColor = getStatusColor(status);
            return (
              <div key={`live-${key}`} className="ewc-current-value-item">
                <div className="ewc-status-dot" style={{ '--dot-color': dotColor }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="ewc-live-val">{val != null ? val : '--'} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{METRICS[key].unit}</span></span>
                  <span className="ewc-live-label">{METRICS[key].label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="ewc-chart-area">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
             <defs>
              {Object.entries(METRICS).map(([key, config]) => (
                <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={config.color} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={config.color} stopOpacity={0.05}/>
                </linearGradient>
              ))}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={20} />
            
            {activeKeys.map((key, index) => (
               <YAxis
                key={key}
                yAxisId={key}
                orientation={index % 2 === 0 ? "left" : "right"}
                tick={{ fill: METRICS[key].color, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
            ))}

            <Tooltip 
              contentStyle={{ background: 'rgba(15, 23, 60, 0.9)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', color: '#e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
              itemStyle={{ fontSize: '0.85rem' }}
            />
            {Object.entries(METRICS).map(([key, config]) => {
              if (!activeMetrics[key]) return null;
              return (
                <Area
                  key={key}
                  yAxisId={key}
                  type="monotone"
                  dataKey={key}
                  stroke={config.color}
                  fillOpacity={1}
                  fill={`url(#grad-${key})`}
                  strokeWidth={3}
                  isAnimationActive={false}
                  activeDot={{ r: 6, fill: config.color, stroke: '#0f173c', strokeWidth: 2, filter: 'url(#glow)' }}
                  style={{ filter: 'url(#glow)' }}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
