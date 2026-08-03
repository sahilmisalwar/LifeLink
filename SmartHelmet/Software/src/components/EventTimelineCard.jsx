// SmartHelmet/Software/src/components/EventTimelineCard.jsx
import { useMemo } from 'react';
import { AlertTriangle, Info, Zap } from 'lucide-react';
import '../styles/EventTimelineCard.css';

export default function EventTimelineCard({ alerts, history }) {
  const events = useMemo(() => {
    const combined = [];
    
    if (alerts && alerts.length > 0) {
      alerts.forEach(a => {
        combined.push({
          id: a.id || `alert-${a.created_at}`,
          type: a.severity === 'emergency' ? 'emergency' : 'warning',
          message: a.message || a.alert_type || 'Alert',
          time: new Date(a.created_at).getTime(),
          icon: AlertTriangle
        });
      });
    }

    if (history && history.length > 0) {
      history.forEach((h, idx) => {
        if (h.fall_detected) {
          combined.push({
            id: `fall-${h.id || idx}`,
            type: 'fall',
            message: 'Fall Detected',
            time: new Date(h.created_at || Date.now()).getTime(),
            icon: Zap
          });
        }
      });
    }

    return combined.sort((a, b) => a.time - b.time);
  }, [alerts, history]);

  const { startTime, endTime } = useMemo(() => {
    const now = Date.now();
    const tenMinsAgo = now - 10 * 60 * 1000;
    
    let start = tenMinsAgo;
    let end = now;
    
    if (history && history.length > 0) {
      const firstTime = new Date(history[0].created_at || now).getTime();
      if (firstTime < start) start = firstTime;
    }
    
    if (events.length > 0) {
      if (events[0].time < start) start = events[0].time;
    }
    
    return { startTime: start, endTime: end };
  }, [history, events]);

  const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getMarkerStyle = (type) => {
    if (type === 'emergency') return { '--marker-bg': 'rgba(239, 68, 68, 0.2)', '--marker-color': '#ef4444', '--marker-glow': 'rgba(239, 68, 68, 0.6)' };
    if (type === 'warning') return { '--marker-bg': 'rgba(245, 158, 11, 0.2)', '--marker-color': '#f59e0b', '--marker-glow': 'rgba(245, 158, 11, 0.6)' };
    if (type === 'fall') return { '--marker-bg': 'rgba(168, 85, 247, 0.2)', '--marker-color': '#a855f7', '--marker-glow': 'rgba(168, 85, 247, 0.6)' };
    return { '--marker-bg': 'rgba(255, 255, 255, 0.1)', '--marker-color': '#fff', '--marker-glow': 'transparent' };
  };

  return (
    <div className="event-timeline-card">
      <div className="etc-header">
        <h3 className="etc-title">Events Timeline</h3>
      </div>
      
      <div className="etc-timeline-wrapper">
        <div className="etc-track" />
        <div className="etc-events-container">
          {events.map((ev, i) => {
            const Icon = ev.icon || Info;
            const style = getMarkerStyle(ev.type);
            const totalDuration = Math.max(1, endTime - startTime);
            let percent = ((ev.time - startTime) / totalDuration) * 100;
            // clamp percentage
            percent = Math.max(2, Math.min(98, percent));

            return (
              <div key={ev.id + i} className="etc-event-marker" style={{ left: `${percent}%`, ...style }}>
                <div className="etc-pulse" />
                <div className="etc-marker-icon-wrap">
                  <Icon size={18} strokeWidth={2.5} />
                </div>
                <div className="etc-event-tooltip">
                  <strong>{formatTime(ev.time)}</strong>: {ev.message}
                </div>
              </div>
            );
          })}
        </div>
        <div className="etc-time-axis">
          <span>{formatTime(startTime)}</span>
          <span>{formatTime(endTime)}</span>
        </div>
      </div>
    </div>
  );
}
