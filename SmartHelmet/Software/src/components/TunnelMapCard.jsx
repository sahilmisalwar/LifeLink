// SmartHelmet/Software/src/components/TunnelMapCard.jsx

import { useMemo } from 'react';
import { ZONE_COORDINATES, TUNNEL_GRAPH } from '../utils/constants';
import '../styles/TunnelMapCard.css';

/**
 * Normalize the raw ZONE_COORDINATES (designed for a ~680×680 space) into
 * a viewBox-friendly coordinate set with padding.
 */
function normalizeCoords(coords, viewWidth, viewHeight, padding) {
  const entries = Object.entries(coords);
  if (entries.length === 0) return {};

  const xs = entries.map(([, c]) => c.x);
  const ys = entries.map(([, c]) => c.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const usableW = viewWidth - padding * 2;
  const usableH = viewHeight - padding * 2;

  const normalized = {};
  entries.forEach(([name, c]) => {
    normalized[name] = {
      x: padding + ((c.x - minX) / rangeX) * usableW,
      y: padding + ((c.y - minY) / rangeY) * usableH,
    };
  });
  return normalized;
}

/**
 * Build edge list from TUNNEL_GRAPH for rendering connector lines.
 * Each edge appears only once.
 */
function getEdges(graph) {
  const seen = new Set();
  const edges = [];
  for (const from in graph) {
    for (const to in graph[from]) {
      const key = [from, to].sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({ from, to });
      }
    }
  }
  return edges;
}

const VIEW_W = 480;
const VIEW_H = 300;
const PADDING = 50;

export default function TunnelMapCard({ worker, reading, zone }) {
  const coords = useMemo(() => normalizeCoords(ZONE_COORDINATES, VIEW_W, VIEW_H, PADDING), []);
  const edges = useMemo(() => getEdges(TUNNEL_GRAPH), []);

  const currentZone = zone || null;
  const rssi = reading?.rssi ?? null;
  const workerName = worker?.name || worker?.worker_id || 'Worker';

  // Empty / fallback state
  if (!reading && !zone) {
    return (
      <div className="tunnel-map-card">
        <div className="tmc-header">
          <span className="tmc-title">Tunnel Position</span>
        </div>
        <div className="tmc-empty">
          <div className="tmc-empty-icon">🗺️</div>
          No position data available
        </div>
      </div>
    );
  }

  return (
    <div className="tunnel-map-card">
      {/* ── Header ───────────────────────────────── */}
      <div className="tmc-header">
        <span className="tmc-title">Tunnel Position</span>
        {rssi != null && (
          <span className="tmc-signal-badge">
            <span className="tmc-signal-dot" />
            {rssi} dBm
          </span>
        )}
      </div>

      {/* ── SVG Schematic Map ────────────────────── */}
      <div className="tmc-map-area">
        <svg
          className="tmc-map-svg"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Connector lines */}
          {edges.map(({ from, to }) => {
            const a = coords[from];
            const b = coords[to];
            if (!a || !b) return null;
            const isOnPath =
              (from === currentZone || to === currentZone);
            return (
              <line
                key={`${from}-${to}`}
                className={`tmc-connector${isOnPath ? ' on-path' : ''}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
              />
            );
          })}

          {/* Nodes */}
          {Object.entries(coords).map(([name, pos]) => {
            const isActive = name === currentZone;
            return (
              <g key={name} className={`tmc-node${isActive ? ' active' : ''}`}>
                {/* Pulse ring for active node */}
                {isActive && (
                  <circle className="tmc-active-ring" cx={pos.x} cy={pos.y} r={20} />
                )}

                {/* Node circle */}
                <circle
                  className="tmc-node-circle"
                  cx={pos.x}
                  cy={pos.y}
                  r={14}
                />

                {/* Node label */}
                <text
                  className="tmc-node-label"
                  x={pos.x}
                  y={pos.y + 28}
                >
                  {name}
                </text>

                {/* Worker label badge on active node */}
                {isActive && (
                  <>
                    <rect
                      className="tmc-worker-label-bg"
                      x={pos.x - 28}
                      y={pos.y - 36}
                      width={56}
                      height={16}
                    />
                    <text
                      className="tmc-worker-label-text"
                      x={pos.x}
                      y={pos.y - 25}
                    >
                      {workerName}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Zone Info Footer ─────────────────────── */}
      <div className="tmc-info">
        <div className="tmc-info-item">
          <span className="tmc-info-label">Current Zone</span>
          <span className="tmc-info-value zone-name">{currentZone || 'Unknown'}</span>
        </div>
        <div className="tmc-info-item">
          <span className="tmc-info-label">RSSI</span>
          <span className="tmc-info-value rssi-value">
            {rssi != null ? `${rssi} dBm` : '--'}
          </span>
        </div>
        <span className="tmc-info-note">Estimated by signal strength</span>
      </div>
    </div>
  );
}
