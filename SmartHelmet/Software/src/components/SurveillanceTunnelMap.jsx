// SmartHelmet/Software/src/components/SurveillanceTunnelMap.jsx

import { useRef, useEffect, useCallback, useState } from 'react';
import { THRESHOLDS, RSSI_STRONGEST, RSSI_WEAKEST } from '../utils/constants';
import tunnelMapBg from '../assets/tunnel-map-background.png';
import '../styles/SurveillanceTunnelMap.css';

/* ═══════════════════════════════════════════════════════════════
   IMAGE & COORDINATE CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

// Native image dimensions (used for aspect-ratio and SVG viewBox)
const IMG_W = 1672;
const IMG_H = 941;
const VIEWBOX = `0 0 ${IMG_W} ${IMG_H}`;

// Helper: convert normalized percentage to absolute pixel coords
const pct = (xPct, yPct) => ({ x: (xPct / 100) * IMG_W, y: (yPct / 100) * IMG_H });

// ── 4 Verified named nodes (DO NOT CHANGE) ──────────────────
const NODES = {
  entrance:      pct(8.64,  51.64),   // ≈ (144.5, 485.9)
  mainJunction:  pct(24.72, 51.65),   // ≈ (413.3, 486.0)
  eastJunction:  pct(58.56, 55.66),   // ≈ (979.1, 523.8)
  zoneE:         pct(86.97, 67.04),   // ≈ (1454.2, 630.8)
};

// ── Verified 24-point traced path (Ground Truth) ────────────────
const WAYPOINTS = [
  pct(8.63, 52.07),   // 1. Entrance (approx NODES.entrance)
  pct(10.98, 57.86),
  pct(14.24, 53.51),
  pct(16.89, 50.62),
  pct(19.64, 51.52),
  pct(22.09, 53.70),
  pct(24.84, 52.43),  // 7. near Main Junction (approx NODES.mainJunction)
  pct(28.31, 53.33),
  pct(30.35, 50.98),
  pct(33.81, 50.43),
  pct(35.85, 50.07),
  pct(40.85, 53.15),
  pct(45.23, 54.96),
  pct(48.80, 54.42),
  pct(51.45, 53.51),
  pct(54.81, 56.23),
  pct(58.58, 56.41),  // 17. near East Junction (approx NODES.eastJunction)
  pct(62.05, 58.59),
  pct(65.62, 58.77),
  pct(67.66, 59.86),
  pct(76.42, 64.93),
  pct(80.19, 66.56),
  pct(83.25, 66.92),
  pct(86.72, 67.83)   // 24. Zone E (approx NODES.zoneE)
];

/**
 * Convert a sequence of waypoints to a smooth SVG path using Catmull-Rom → Cubic Bézier.
 * Each waypoint is passed through exactly (interpolating spline), producing a smooth curve
 * that hugs the road centerline far more closely than simple 4-point cubic arcs.
 */
function catmullRomToPath(points, tension = 0.35) {
  if (points.length < 2) return '';

  const d = [`M ${points[0].x} ${points[0].y}`];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    // Catmull-Rom tangent → Bézier control points
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }

  return d.join(' ');
}

const RESCUE_PATH = catmullRomToPath(WAYPOINTS);

/* ═══════════════════════════════════════════════════════════════
   RSSI → CONTINUOUS PATH POSITION HELPERS
   ═══════════════════════════════════════════════════════════════ */

const RSSI_HISTORY_SIZE = 4;
const LERP_SPEED = 0.04;             // per-frame easing toward target (0–1)
const PREDICTION_INTERVAL_MS = 2000; // how often to nudge the predicted position
const PREDICTION_STEP_DBM = 3;       // dBm step per prediction tick

/**
 * Convert an RSSI value to a 0–1 percent along the path.
 * 0 = Entrance (strongest signal, closest to 0 dBm)
 * 1 = farthest point (weakest signal, most negative dBm)
 */
function getPercentFromRSSI(rssi) {
  const clamped = Math.max(RSSI_WEAKEST, Math.min(RSSI_STRONGEST, rssi));
  const ratio = (clamped - RSSI_WEAKEST) / (RSSI_STRONGEST - RSSI_WEAKEST);
  return 1 - ratio;
}

function getHazardLabel(reading) {
  if (reading?.gas_level >= THRESHOLDS.gas_level.warning) return 'GAS HAZARD';
  if (reading?.temperature >= THRESHOLDS.temperature.warning) return 'HEAT HAZARD';
  if (reading?.force >= THRESHOLDS.force.warning) return 'IMPACT ALERT';
  if (reading?.heart_rate > 0 && (
    reading.heart_rate <= THRESHOLDS.heart_rate.warningLow ||
    reading.heart_rate >= THRESHOLDS.heart_rate.warningHigh
  )) return 'VITAL ALERT';
  return 'HAZARD ZONE';
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function SurveillanceTunnelMap({ worker, reading, zone, status = 'normal', isEmergencyMode, emergencyLevel }) {
  const isDanger = status === 'warning' || status === 'emergency';
  const isEmergency = status === 'emergency';
  const activeZone = zone || 'Unknown';
  const rssi = reading?.rssi;
  const workerName = worker?.name || worker?.worker_id || 'Live worker';
  const hazardLabel = getHazardLabel(reading);
  const hazardState = isEmergency ? 'emergency' : isDanger ? 'warning' : 'normal';

  // ── Refs for smooth positioning ────────────────────────────────
  const refPathEl = useRef(null);          // invisible reference <path>
  const workerGroupRef = useRef(null);     // <g> element of worker marker
  const rescueMaskPathRef = useRef(null);  // <mask> for dynamic rescue path length
  const idleGlowMaskRef = useRef(null);    // <mask> for idle glow path clipping
  const rssiHistoryRef = useRef([]);       // rolling window of recent RSSI values
  const currentPercentRef = useRef(0);     // where the dot IS right now (0–1)
  const targetPercentRef = useRef(0);      // where the dot SHOULD be heading
  const trendDeltaRef = useRef(0);         // avg dBm change per reading
  const lastRealRssiRef = useRef(null);    // last actual RSSI from reading
  const predictionTimerRef = useRef(null); // interval for trend extrapolation
  const rafIdRef = useRef(null);           // requestAnimationFrame handle

  // ── On new RSSI reading: update history + target + trend ───────
  useEffect(() => {
    if (rssi == null || rssi === undefined) return;

    const history = rssiHistoryRef.current;
    lastRealRssiRef.current = rssi;

    // Push to rolling history (keep last N)
    history.push(rssi);
    if (history.length > RSSI_HISTORY_SIZE) {
      history.splice(0, history.length - RSSI_HISTORY_SIZE);
    }

    // Compute average delta across consecutive readings
    let deltaSum = 0;
    let deltaCount = 0;
    for (let i = 1; i < history.length; i++) {
      deltaSum += history[i] - history[i - 1];
      deltaCount++;
    }
    const avgDelta = deltaCount > 0 ? deltaSum / deltaCount : 0;
    trendDeltaRef.current = avgDelta;

    // Set target from real data (overrides any prediction)
    targetPercentRef.current = getPercentFromRSSI(rssi);
  }, [rssi]);

  // ── Prediction timer: extrapolate between packets ──────────────
  useEffect(() => {
    // Clear any existing timer
    if (predictionTimerRef.current) {
      clearInterval(predictionTimerRef.current);
    }

    predictionTimerRef.current = setInterval(() => {
      const delta = trendDeltaRef.current;
      const lastReal = lastRealRssiRef.current;
      if (lastReal == null || Math.abs(delta) < 0.5) return;

      // Extrapolate a small step in the current trend direction
      const direction = delta < 0 ? -1 : 1; // negative delta = moving away
      const predictedRssi = lastReal + direction * PREDICTION_STEP_DBM;

      // Clamp and update target
      const clampedPredicted = Math.max(RSSI_WEAKEST, Math.min(RSSI_STRONGEST, predictedRssi));
      targetPercentRef.current = getPercentFromRSSI(clampedPredicted);
    }, PREDICTION_INTERVAL_MS);

    return () => {
      if (predictionTimerRef.current) {
        clearInterval(predictionTimerRef.current);
      }
    };
  }, []); // runs once on mount

  // ── Position-update callback using getPointAtLength ────────────
  const updateWorkerPosition = useCallback(() => {
    const pathEl = refPathEl.current;
    const workerEl = workerGroupRef.current;
    const maskPathEl = rescueMaskPathRef.current;
    const idleGlowMaskEl = idleGlowMaskRef.current;
    if (!pathEl || !workerEl) return;

    const totalLen = pathEl.getTotalLength();
    const target = targetPercentRef.current;
    const current = currentPercentRef.current;

    // Ease toward target
    const diff = target - current;
    if (Math.abs(diff) > 0.0005) {
      currentPercentRef.current = current + diff * LERP_SPEED;
    } else {
      currentPercentRef.current = target;
    }

    const clampedPercent = Math.max(0, Math.min(1, currentPercentRef.current));
    const point = pathEl.getPointAtLength(clampedPercent * totalLen);
    workerEl.setAttribute('transform', `translate(${point.x} ${point.y})`);

    // Dynamically clip the rescue path to end exactly at the worker's current dot
    if (maskPathEl) {
      const drawnLen = clampedPercent * totalLen;
      maskPathEl.setAttribute('stroke-dasharray', `${totalLen} ${totalLen}`);
      maskPathEl.setAttribute('stroke-dashoffset', `${totalLen - drawnLen}`);
    }

    // Dynamically clip the idle glow path to end at the worker's current position
    if (idleGlowMaskEl) {
      const drawnLen = clampedPercent * totalLen;
      idleGlowMaskEl.setAttribute('stroke-dasharray', `${totalLen} ${totalLen}`);
      idleGlowMaskEl.setAttribute('stroke-dashoffset', `${totalLen - drawnLen}`);
    }
  }, []);

  // ── rAF animation loop ─────────────────────────────────────────
  useEffect(() => {
    function tick() {
      updateWorkerPosition();
      rafIdRef.current = requestAnimationFrame(tick);
    }
    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [updateWorkerPosition]);

  // ── Fallback: initialise position if no RSSI yet ───────────────
  const [workerFallback] = useState({ x: NODES.zoneE.x, y: NODES.zoneE.y });

  return (
    <section className={`surveillance-map-card stm-state-${hazardState}`} data-emergency-level={emergencyLevel || 'none'} aria-label="Tunnel surveillance map">

      {/* ── Map Layers (Image + SVG + Overlays) ── */}
      <div className="stm-map-layers">
        {/* ── Background image layer ── */}
        <div className="stm-bg-image-wrapper" aria-hidden="true">
          <img
            src={tunnelMapBg}
            alt=""
            className="stm-bg-image"
            draggable={false}
          />
        </div>

        {/* ── Status badge (top-right, overlay) ── */}
        <div className="stm-status-overlay">
          <div className={`stm-status-badge ${hazardState}`}>
            <span className="stm-status-dot" />
            {isEmergency ? 'Emergency' : isDanger ? 'Warning' : 'All clear'}
          </div>
        </div>

        {/* ── SVG overlay: only live/dynamic elements ── */}
        <div className="surveillance-map-canvas">
          <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="stm-svg-title stm-svg-description">
            <title id="stm-svg-title">Underground tunnel surveillance overlay</title>
            <desc id="stm-svg-description">Live worker position, rescue path, and hazard indicators overlaid on the tunnel map.</desc>
            <defs>
              {/* Mask for clipping rescue path to worker's position */}
              <mask id="rescue-mask">
                <path
                  ref={rescueMaskPathRef}
                  d={RESCUE_PATH}
                  stroke="white"
                  strokeWidth="200"
                  fill="none"
                  strokeLinecap="butt"
                />
              </mask>
              {/* Mask for clipping idle glow to worker's position */}
              <mask id="idle-glow-mask">
                <path
                  ref={idleGlowMaskRef}
                  d={RESCUE_PATH}
                  stroke="white"
                  strokeWidth="200"
                  fill="none"
                  strokeLinecap="butt"
                />
              </mask>
              <filter id="stm-cyan-haze" x="-30%" y="-35%" width="160%" height="170%">
                <feGaussianBlur stdDeviation="13" />
              </filter>
              <filter id="stm-tight-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="stm-idle-blur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
              <radialGradient id="stm-worker-fill">
                <stop offset="0" stopColor="#1dcdfd" stopOpacity=".75" />
                <stop offset=".55" stopColor="#075cc8" stopOpacity=".42" />
                <stop offset="1" stopColor="#06215b" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="stm-hazard-fill">
                <stop offset="0" stopColor={isEmergency ? '#fa3a37' : '#f39a39'} stopOpacity={isDanger ? '.28' : '.03'} />
                <stop offset=".64" stopColor={isEmergency ? '#d61f33' : '#e06b20'} stopOpacity={isDanger ? '.13' : '.01'} />
                <stop offset="1" stopColor="#ff3349" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* ── Hazard zone pulse (positioned near Abandoned Area in the image) ── */}
            <g className={`stm-hazard-zone ${hazardState}`} aria-label={isDanger ? hazardLabel : 'Dormant hazard zone'}>
              <circle className="stm-hazard-haze" cx="1380" cy="340" r="140" fill="url(#stm-hazard-fill)" />
              <circle className="stm-hazard-contour" cx="1380" cy="340" r="120" />
              {isDanger && (
                <g className="stm-hazard-copy" transform="translate(1380 340)">
                  <path d="M 0 -35 L 31 20 L -31 20 Z" />
                  <path className="stm-hazard-person" d="M 0 -19 a4 4 0 1 0 0 .1 M 0 -12 v17 M -11 -2 L 0 -8 L 11 -2 M -6 15 L 0 5 L 6 15" />
                  <text x="0" y="56">{hazardLabel}</text>
                </g>
              )}
            </g>

            {/* ── Idle path glow (always visible, fades out during emergency) ── */}
            <g className={`stm-idle-glow ${hazardState}`} strokeLinecap="round" mask="url(#idle-glow-mask)" aria-hidden="true">
              <path d={RESCUE_PATH} className="stm-idle-aura" />
              <path d={RESCUE_PATH} className="stm-idle-core" />
            </g>

            {/* ── Rescue route (visible only when danger is active) ── */}
            <g className={`stm-rescue-route ${hazardState}`} strokeLinecap="round" aria-label="Active rescue path" mask="url(#rescue-mask)">
              <path d={RESCUE_PATH} className="stm-rescue-aura" />
              <path d={RESCUE_PATH} className="stm-rescue-body" />
              <path d={RESCUE_PATH} className="stm-rescue-core" />
              <path d={RESCUE_PATH} className="stm-rescue-flow" />
              {emergencyLevel === 'critical' && (
                <path d={RESCUE_PATH} className="stm-rescue-shimmer" />
              )}
            </g>

            {/* ── Invisible reference path for getPointAtLength positioning ── */}
            <path
              ref={refPathEl}
              d={RESCUE_PATH}
              fill="none"
              stroke="none"
              strokeWidth="0"
              style={{ pointerEvents: 'none' }}
            />

            {/* ── Live Worker Marker (positioned by rAF loop) ── */}
            <g
              ref={workerGroupRef}
              className="stm-worker"
              transform={`translate(${workerFallback.x} ${workerFallback.y})`}
              aria-label={`Worker position, ${workerName}`}
            >
              <circle className="stm-worker-pulse stm-worker-pulse-one" r="50" />
              <circle className="stm-worker-pulse stm-worker-pulse-two" r="50" />
              <circle className="stm-worker-halo" r="66" />
              <circle className="stm-worker-field" r="57" fill="url(#stm-worker-fill)" />
              <circle className="stm-worker-ring" r="44" />
              <circle className="stm-worker-inner" r="32" />
              <g className="stm-worker-icon">
                <circle cy="-11" r="7" />
                <path d="M -12 22 V 6 C -12 -1 -7 -4 0 -4 C 7 -4 12 -1 12 6 V 22 M -12 7 L -20 16 M 12 7 L 20 16 M -7 29 L -7 18 M 7 29 L 7 18" />
              </g>
              <text className="stm-worker-label" x="0" y="84">WORKER</text>
              <text className="stm-worker-name" x="0" y="102">{workerName}</text>
            </g>
          </svg>
        </div>
      </div>

      {/* ── Footer: legend + live readouts ── */}
      <footer className="surveillance-map-footer">
        <div className="surveillance-map-legend" aria-label="Map legend">
          <span className="stm-legend-item"><i className="stm-legend-swatch tunnel" />Tunnel Network</span>
          <span className="stm-legend-item"><i className="stm-legend-swatch worker" />Worker Position</span>
          <span className="stm-legend-item"><i className="stm-legend-swatch rescue" />Rescue Path</span>
          <span className="stm-legend-item"><i className="stm-legend-swatch hazard" />Hazard Zone</span>
        </div>
        <div className="surveillance-map-summary">
          <div className="stm-summary-block"><span>Current zone</span><strong>{activeZone}</strong></div>
          <div className="stm-summary-block"><span>Signal RSSI</span><strong>{rssi ?? '—'}{rssi !== null && rssi !== undefined ? ' dBm' : ''}</strong></div>
        </div>
      </footer>
    </section>
  );
}
