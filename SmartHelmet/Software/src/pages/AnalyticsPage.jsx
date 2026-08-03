// SmartHelmet/Software/src/pages/AnalyticsPage.jsx
import VitalsRadialCard from '../components/VitalsRadialCard';
import EnvironmentalWaveCard from '../components/EnvironmentalWaveCard';
import EventTimelineCard from '../components/EventTimelineCard';
import SessionSummaryCard from '../components/SessionSummaryCard';
import '../styles/AnalyticsPage.css';

export default function AnalyticsPage({ history, alerts, worker }) {
  return (
    <div className="analytics-page">
      <div className="ap-header-section">
        <h1 className="ap-page-title">Analytics</h1>
        <p className="ap-page-subtitle">
          Historical sensor performance and session insights for {worker?.name || 'Worker'}
        </p>
      </div>

      <div className="ap-top-row">
        <VitalsRadialCard history={history} />
        <EnvironmentalWaveCard history={history} />
      </div>

      <EventTimelineCard history={history} alerts={alerts} />
      
      <SessionSummaryCard history={history} alerts={alerts} />
    </div>
  );
}
