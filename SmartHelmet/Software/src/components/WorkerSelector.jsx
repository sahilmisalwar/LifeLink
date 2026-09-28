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
  evaluatedWorkers = [],
  selectedWorkerId,
  onSelect,
  onViewDetails,
  acknowledgedWorkerIds = new Set(),
  vertical = false,
}) {
  const allWorkers = evaluatedWorkers;

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
          const isAck = acknowledgedWorkerIds.has ? acknowledgedWorkerIds.has(w.id) : false;
          return (
            <div
              key={w.id}
              className={`ws-block ${w.status} ${isSelected ? 'ws-selected' : ''} ${isAck ? 'ws-acknowledged-block' : ''}`}
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
                  className={`ws-status-dot ${w.status} ${isAck && w.status !== 'normal' ? 'ws-acknowledged' : ''}`}
                  title={`Status: ${w.status}${isAck ? ' (Acknowledged)' : ''}`}
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
