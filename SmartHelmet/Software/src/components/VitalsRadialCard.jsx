// SmartHelmet/Software/src/components/VitalsRadialCard.jsx
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { THRESHOLDS } from '../utils/constants';
import '../styles/VitalsRadialCard.css';

const getStatus = (value, thresholds, isHeartRate = false) => {
  if (!value) return 'normal';
  if (isHeartRate) {
    if (value <= thresholds.emergencyLow || value >= thresholds.emergencyHigh) return 'emergency';
    if (value <= thresholds.warningLow || value >= thresholds.warningHigh) return 'warning';
    return 'normal';
  } else {
    if (value <= thresholds.emergency) return 'emergency';
    if (value <= thresholds.warning) return 'warning';
    return 'normal';
  }
};

const getGlowColor = (status) => {
  if (status === 'emergency') return 'rgba(239, 68, 68, 0.4)';
  if (status === 'warning') return 'rgba(245, 158, 11, 0.4)';
  return 'rgba(16, 185, 129, 0.4)';
};

const Gauge = ({ value, label, unit, status, max, min = 0, history, dataKey, gradientId }) => {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const data = [{ name: label, value: percentage, fill: `url(#${gradientId})` }];
  const sparklineData = history.map((h, i) => ({ index: i, value: h[dataKey] })).filter(d => d.value != null);
  
  const glow = getGlowColor(status);
  
  const stops = status === 'emergency' 
    ? <><stop offset="0%" stopColor="#f87171"/><stop offset="100%" stopColor="#991b1b"/></>
    : status === 'warning'
    ? <><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#b45309"/></>
    : <><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#064e3b"/></>;

  const sparkColor = status === 'emergency' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#10b981';

  return (
    <div className="vrc-gauge-container" style={{ '--gauge-glow': glow }}>
      <div className="vrc-gauge-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="75%" outerRadius="100%" barSize={16} data={data} startAngle={220} endAngle={-40}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                {stops}
              </linearGradient>
            </defs>
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background={{ fill: 'rgba(255, 255, 255, 0.05)' }} dataKey="value" cornerRadius={8} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="vrc-gauge-value">
          <span className="vrc-gauge-number">{value || '--'}</span>
          <span className="vrc-gauge-unit">{unit}</span>
        </div>
      </div>
      <div className="vrc-gauge-label">{label}</div>
      <div className="vrc-sparkline-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparklineData}>
            <defs>
              <linearGradient id={`spark-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={sparkColor} stopOpacity={0.5}/>
                <stop offset="100%" stopColor={sparkColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" stroke={sparkColor} fill={`url(#spark-${gradientId})`} strokeWidth={2} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default function VitalsRadialCard({ history }) {
  const latestEntry = history && history.length > 0 ? history[history.length - 1] : null;

  if (!latestEntry) {
    return (
      <div className="vitals-radial-card">
        <div className="vrc-header"><h3 className="vrc-title">Vitals Overview</h3></div>
        <div className="vrc-empty">No data yet</div>
      </div>
    );
  }

  const hrValue = latestEntry.heart_rate;
  const hrStatus = getStatus(hrValue, THRESHOLDS.heart_rate, true);

  const spo2Value = latestEntry.spo2;
  const spo2Status = getStatus(spo2Value, THRESHOLDS.spo2);

  return (
    <div className="vitals-radial-card">
      <div className="vrc-header"><h3 className="vrc-title">Vitals Overview</h3></div>
      <div className="vrc-content">
        <Gauge value={hrValue} label="Heart Rate" unit="bpm" status={hrStatus} max={200} min={0} history={history} dataKey="heart_rate" gradientId="grad-hr" />
        <Gauge value={spo2Value} label="SpO2" unit="%" status={spo2Status} max={100} min={80} history={history} dataKey="spo2" gradientId="grad-spo2" />
      </div>
    </div>
  );
}
