// SmartHelmet/Software/src/pages/WorkersListPage.jsx
//
// ══════════════════════════════════════════════════════════════════════════════
//  WORKERS LIST PAGE — Phase 4
// ══════════════════════════════════════════════════════════════════════════════
//
//  Lists all 5 workers (1 real + 4 simulated) with condensed vitals.
//  Click behavior is intentionally unimplemented — Phase 5 will wire navigation.
//
// ══════════════════════════════════════════════════════════════════════════════

import '../styles/WorkersListPage.css';

export default function WorkersListPage({
  worker,          // Real worker object from useLiveData
  reading,         // Real worker's current reading (effectiveReading)
  status,          // Real worker's computed status
  zone,            // Real worker's current zone
  fakeWorkers,     // Array of 4 fake worker objects from useFakeWorkers()
  onViewDetails,   // Callback (workerId) => void — Phase 5 navigation
}) {
  // Build unified list: real worker first, then fake workers
  const allWorkers = [
    {
      id: 'W001',
      name: worker?.name || 'Live Worker',
      zone: zone || 'Unknown',
      status: status || 'normal',
      isSimulated: false,
      vitals: {
        temp: reading?.temperature,
        hr: reading?.heart_rate,
        spo2: reading?.spo2,
        gas: reading?.gas_level,
      },
    },
    ...fakeWorkers.map((fw) => ({
      id: fw.id,
      name: fw.name,
      zone: fw.zone,
      status: fw.status, // Always 'normal'
      isSimulated: true,
      vitals: {
        temp: fw.readings.temperature,
        hr: fw.readings.heart_rate,
        spo2: fw.readings.spo2,
        gas: fw.readings.gas_level,
      },
    })),
  ];

  return (
    <div className="wlp-page">
      {/* ── Header ── */}
      <div className="wlp-header">
        <div className="wlp-title">Workers</div>
        <div className="wlp-subtitle">
          {allWorkers.length} active workers • Real-time monitoring
        </div>
      </div>

      {/* ── Worker Grid / Blocks ── */}
      <div className="wlp-grid">
        {allWorkers.map((w) => (
          <div
            key={w.id}
            className="wlp-block-card"
            onClick={() => onViewDetails && onViewDetails(w.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (onViewDetails) onViewDetails(w.id);
              }
            }}
          >
            {/* Top row: Avatar + Name/Meta + Status */}
            <div className="wlp-block-top">
              <div className={`wlp-avatar ${w.isSimulated ? 'simulated' : 'real'}`}>
                {w.id}
              </div>
              <div className="wlp-info">
                <div className="wlp-name-row">
                  <span className="wlp-name">{w.name}</span>
                  {w.isSimulated && <span className="wlp-sim-tag">SIM</span>}
                </div>
                <div className="wlp-meta">
                  <span className="wlp-id">{w.id}</span>
                  <span className="wlp-dot-sep">•</span>
                  <span className="wlp-zone">{w.zone}</span>
                </div>
              </div>
              <div className={`wlp-status ${w.status}`} title={`Status: ${w.status}`}>
                <span className="wlp-status-dot" />
                <span className="wlp-status-text">
                  {w.status === 'normal' ? 'Normal' : w.status === 'warning' ? 'Warning' : 'Emergency'}
                </span>
              </div>
            </div>

            {/* Vitals Grid: 2x2 compact tiles */}
            <div className="wlp-vitals-grid">
              <div className="wlp-vital-tile">
                <span className="wlp-vital-label">TEMP</span>
                <span className="wlp-vital-val">
                  {w.vitals.temp != null ? `${Number(w.vitals.temp).toFixed(1)}°C` : '--'}
                </span>
              </div>
              <div className="wlp-vital-tile">
                <span className="wlp-vital-label">PULSE</span>
                <span className="wlp-vital-val">
                  {w.vitals.hr != null ? `${Math.round(w.vitals.hr)} bpm` : '--'}
                </span>
              </div>
              <div className="wlp-vital-tile">
                <span className="wlp-vital-label">SpO₂</span>
                <span className="wlp-vital-val">
                  {w.vitals.spo2 != null ? `${Number(w.vitals.spo2).toFixed(0)}%` : '--'}
                </span>
              </div>
              <div className="wlp-vital-tile">
                <span className="wlp-vital-label">GAS</span>
                <span className="wlp-vital-val">
                  {w.vitals.gas != null ? `${Math.round(w.vitals.gas)} ppm` : '--'}
                </span>
              </div>
            </div>

            {/* Footer action */}
            <div className="wlp-block-footer">
              <span className="wlp-view-link">View Details &rarr;</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
