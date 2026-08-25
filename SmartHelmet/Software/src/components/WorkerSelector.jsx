// SmartHelmet/Software/src/components/WorkerSelector.jsx
//
// ══════════════════════════════════════════════════════════════════════════════
//  WORKER SELECTOR — Phase 3
// ══════════════════════════════════════════════════════════════════════════════
//
//  Renders a horizontal row of clickable worker blocks (1 real + 4 simulated).
//  Clicking a block sets that worker as the "selected" worker, which controls
//  which data the dashboard KPI cards display.
//
//  Props:
//    - realWorker:       The real worker object from useLiveData (worker prop)
//    - realStatus:       The real worker's computed status ('normal'|'warning'|'emergency')
//    - realZone:         The real worker's current zone string
//    - fakeWorkers:      Array of 4 fake worker objects from useFakeWorkers()
//    - selectedWorkerId: Currently selected worker ID
//    - onSelect:         Callback (workerId) => void
//
// ══════════════════════════════════════════════════════════════════════════════

import '../styles/WorkerSelector.css';

const REAL_WORKER_ID = 'W001';

export default function WorkerSelector({
  realWorker,
  realStatus,
  realZone,
  fakeWorkers,
  selectedWorkerId,
  onSelect,
  onViewDetails,
  vertical = false,
}) {
  // Build a unified list: real worker first, then fake workers
  const allWorkers = [
    {
      id: REAL_WORKER_ID,
      name: realWorker?.name || 'Live Worker',
      zone: realZone || 'Unknown',
      status: realStatus || 'normal',
      isSimulated: false,
    },
    ...fakeWorkers.map((fw) => ({
      id: fw.id,
      name: fw.name,
      zone: fw.zone,
      status: fw.status, // Always 'normal' by Phase 1 design
      isSimulated: true,
    })),
  ];

  return (
    <div className={vertical ? 'ws-container-vertical' : ''}>
      <div className="ws-section-label">Workers</div>
      <div
        className={`worker-selector ${vertical ? 'worker-selector-vertical' : ''}`}
        role="tablist"
        aria-label="Worker selector"
      >
        {allWorkers.map((w) => {
          const isSelected = w.id === selectedWorkerId;
          return (
            <div
              key={w.id}
              className={`ws-block ${isSelected ? 'ws-selected' : ''}`}
              role="tab"
              aria-selected={isSelected}
              tabIndex={0}
              onClick={() => onSelect(w.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(w.id);
                }
              }}
            >
              {/* Header: name + status dot */}
              <div className="ws-header">
                <span className="ws-name">{w.name}</span>
                <span
                  className={`ws-status-dot ${w.status}`}
                  title={`Status: ${w.status}`}
                />
              </div>

              {/* Info: ID + zone */}
              <div className="ws-info">
                <span className="ws-id">{w.id}</span>
                <span className="ws-zone">{w.zone}</span>
              </div>

              {/* SIM badge for simulated workers */}
              {w.isSimulated && (
                <span className="ws-sim-badge">SIM</span>
              )}

              {/* View Details — Phase 5: wired to onViewDetails */}
              <button
                className="ws-details-btn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onViewDetails) onViewDetails(w.id);
                }}
              >
                View Details →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
