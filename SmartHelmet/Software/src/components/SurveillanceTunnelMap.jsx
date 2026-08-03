// SmartHelmet/Software/src/components/SurveillanceTunnelMap.jsx

import { useRef, useEffect, useCallback, useState } from 'react';
import { THRESHOLDS, RSSI_STRONGEST, RSSI_WEAKEST } from '../utils/constants';
import '../styles/SurveillanceTunnelMap.css';

const VIEWBOX = '0 -120 1400 1000';

// Art-directed mine tunnel paths — DO NOT CHANGE
const TUNNEL_PATHS = [
  'M 150 258 C 190 255 222 270 261 257 C 298 244 313 275 349 267 C 399 255 427 289 478 274 C 540 258 575 288 631 275 C 691 261 752 282 818 274 C 895 267 952 248 1011 207 C 1068 167 1139 161 1211 174 C 1266 184 1308 170 1344 146',
  'M 356 266 C 361 225 349 188 327 148 C 311 125 286 115 260 103 M 353 242 C 383 212 404 178 394 139 C 387 111 363 87 326 69',
  'M 728 276 C 732 228 741 182 775 143 C 808 106 840 75 894 57 C 940 40 997 39 1034 45',
  'M 727 278 C 719 323 715 366 690 400 C 666 434 636 465 603 497',
  'M 939 250 C 946 292 945 335 965 365 C 986 395 1013 416 1042 448',
  'M 151 391 C 208 385 256 414 310 449 C 365 487 424 512 491 506 C 553 500 610 507 662 513 C 718 520 755 551 804 554 C 853 559 902 543 951 558 C 989 571 1019 589 1050 587 C 1083 585 1098 557 1125 548',
  'M 309 449 C 297 490 271 526 226 537 C 181 548 141 535 104 512 M 292 453 C 306 496 322 534 304 573 C 289 605 263 623 242 649',
  'M 405 510 C 395 551 378 584 344 609 C 312 634 279 645 245 650 M 440 510 C 463 549 472 594 457 630 C 443 662 414 681 393 710',
  'M 601 499 C 640 535 662 581 659 625 C 656 665 633 699 617 722 M 696 521 C 718 565 721 609 700 644 C 680 678 647 692 617 721',
  'M 962 371 C 1006 364 1045 352 1071 322 C 1094 294 1106 255 1129 231',
  'M 1042 447 C 1011 488 991 526 1001 568 C 1009 602 1040 626 1075 647 C 1103 664 1148 672 1197 669',
  'M 1126 548 C 1172 531 1212 517 1257 521 C 1292 524 1322 539 1355 540',
];

const JUNCTIONS = [
  [354, 264], [728, 276], [940, 250], [310, 449], [601, 499],
  [804, 554], [962, 371], [1042, 447], [1001, 568], [405, 510],
];

// The main route from Entrance to worker area — used for rescue display AND worker positioning
const RESCUE_PATH = 'M 151 391 C 208 385 256 414 310 449 C 365 487 424 512 491 506 C 553 500 610 507 662 513 C 718 520 755 551 804 554 C 853 559 902 543 951 558 C 989 571 1019 589 1050 587 C 1083 585 1098 557 1125 548';

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
  // clamped is in [RSSI_WEAKEST .. RSSI_STRONGEST] i.e. [-120 .. -50]
  // (clamped - WEAKEST) / (STRONGEST - WEAKEST) gives 0 when at WEAKEST, 1 when at STRONGEST
  const ratio = (clamped - RSSI_WEAKEST) / (RSSI_STRONGEST - RSSI_WEAKEST);
  // ratio=1 means strongest → Entrance (percent=0), ratio=0 means weakest → far (percent=1)
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

function Marker({ x, y, active }) {
  return (
    <g className="stm-junction" transform={`translate(${x} ${y})`}>
      <circle r="14" className="stm-junction-halo" />
      <circle r="8" className={active ? 'stm-junction-ring stm-junction-ring-active' : 'stm-junction-ring'} />
      <circle r="2.75" className="stm-junction-core" />
    </g>
  );
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
  const [workerFallback] = useState({ x: 1125, y: 548 });

  return (
    <section className={`surveillance-map-card stm-state-${hazardState}`} data-emergency-level={emergencyLevel || 'none'} aria-label="Tunnel surveillance map">
      <div className="stm-background-layers" aria-hidden="true">
        <div className="stm-grid-overlay" />
        <div className="stm-haze stm-haze-left" />
        <div className="stm-haze stm-haze-right" />
        <div className="stm-vignette" />
      </div>

      <header className="surveillance-map-header">
        <div className="stm-header-left">
          <p className="surveillance-map-kicker">LifeLink / Mine level 03</p>
          <h2 className="surveillance-map-title">Tunnel Surveillance Map</h2>
          <p className="surveillance-map-subtitle">Live position and rescue route guidance</p>
        </div>
        <div className={`stm-status-badge ${hazardState}`}>
          <span className="stm-status-dot" />
          {isEmergency ? 'Emergency' : isDanger ? 'Warning' : 'All clear'}
        </div>
      </header>

      <div className="surveillance-map-canvas">
        <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="stm-svg-title stm-svg-description">
          <title id="stm-svg-title">Underground tunnel surveillance scene</title>
          <desc id="stm-svg-description">A glowing mine tunnel network with entrance, worker location, hazard area and a conditional rescue path.</desc>
          <defs>
            <mask id="rescue-mask">
              <path
                ref={rescueMaskPathRef}
                d={RESCUE_PATH}
                stroke="white"
                strokeWidth="100"
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
            <filter id="stm-rock-edge" x="-10%" y="-20%" width="120%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.014 0.12" numOctaves="2" seed="12" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <linearGradient id="stm-tunnel-body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7ee8ff" stopOpacity=".76" />
              <stop offset=".42" stopColor="#166a9f" stopOpacity=".8" />
              <stop offset="1" stopColor="#082947" stopOpacity=".96" />
            </linearGradient>
            <linearGradient id="stm-tunnel-core" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#3edcff" stopOpacity=".35" />
              <stop offset=".5" stopColor="#c2f8ff" stopOpacity=".96" />
              <stop offset="1" stopColor="#20aade" stopOpacity=".4" />
            </linearGradient>
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

          <g className="stm-region-labels" aria-hidden="true">
            <text x="246" y="173">A</text>
            <text x="1095" y="124">B</text>
            <text x="1288" y="426">C</text>
            <text x="904" y="684">D</text>
          </g>

          <g className="stm-tunnel-network" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <g className="stm-tunnel-aura" filter="url(#stm-cyan-haze)">
              {TUNNEL_PATHS.map((d, index) => <path d={d} stroke="#0e98d6" strokeWidth="26" key={`aura-${index}`} />)}
            </g>
            <g className="stm-tunnel-shell" filter="url(#stm-rock-edge)">
              {TUNNEL_PATHS.map((d, index) => <path d={d} stroke="#123f68" strokeWidth="18" key={`shell-${index}`} />)}
            </g>
            <g className="stm-tunnel-body">
              {TUNNEL_PATHS.map((d, index) => <path d={d} stroke="url(#stm-tunnel-body)" strokeWidth="11.5" key={`body-${index}`} />)}
            </g>
            <g className="stm-tunnel-spark">
              {TUNNEL_PATHS.map((d, index) => <path d={d} stroke="url(#stm-tunnel-core)" strokeWidth="2.3" key={`spark-${index}`} />)}
            </g>
            <g className="stm-tunnel-texture">
              {TUNNEL_PATHS.map((d, index) => <path d={d} stroke="#d4fbff" strokeWidth=".8" strokeDasharray="4 14" key={`texture-${index}`} />)}
            </g>
          </g>

          <g className={`stm-hazard-zone ${hazardState}`} aria-label={isDanger ? hazardLabel : 'Dormant hazard zone'}>
            <path className="stm-hazard-haze" d="M 1111 147 C 1174 123 1252 145 1288 198 C 1325 252 1315 331 1270 370 C 1228 407 1154 404 1108 369 C 1067 337 1056 287 1072 244 C 1086 204 1077 163 1111 147 Z" fill="url(#stm-hazard-fill)" />
            <path className="stm-hazard-contour" d="M 1100 153 C 1138 131 1189 143 1213 166 C 1248 145 1284 175 1282 209 C 1327 231 1328 275 1297 299 C 1316 339 1288 376 1247 377 C 1218 411 1171 396 1146 376 C 1099 389 1064 353 1074 314 C 1046 284 1064 246 1082 229 C 1066 190 1077 169 1100 153 Z" />
            <g className="stm-hazard-copy" transform="translate(1188 255)">
              <path d="M 0 -35 L 31 20 L -31 20 Z" />
              <path className="stm-hazard-person" d="M 0 -19 a4 4 0 1 0 0 .1 M 0 -12 v17 M -11 -2 L 0 -8 L 11 -2 M -6 15 L 0 5 L 6 15" />
              <text x="0" y="56">{hazardLabel}</text>
            </g>
          </g>

          {isDanger && (
            <g className="stm-rescue-route" strokeLinecap="round" aria-label="Active rescue path" mask="url(#rescue-mask)">
              <path d={RESCUE_PATH} className="stm-rescue-aura" />
              <path d={RESCUE_PATH} className="stm-rescue-body" />
              <path d={RESCUE_PATH} className="stm-rescue-core" />
              <path d={RESCUE_PATH} className="stm-rescue-flow" />
              {emergencyLevel === 'critical' && (
                <path d={RESCUE_PATH} className="stm-rescue-shimmer" />
              )}
            </g>
          )}

          <g className="stm-junctions" aria-hidden="true">
            {JUNCTIONS.map(([x, y], index) => <Marker x={x} y={y} active={isDanger && (index === 3 || index === 4 || index === 5)} key={`junction-${index}`} />)}
          </g>

          <g className="stm-entrance" transform="translate(30 314)" aria-label="Entrance">
            <rect width="116" height="102" rx="14" />
            <path className="stm-entrance-arch" d="M 27 58 V 40 C 27 18 67 18 67 40 V 58 M 33 58 V 40 C 33 26 61 26 61 40 V 58 M 27 49 H 67 M 39 37 V 58 M 55 37 V 58" />
            <text x="58" y="84">ENTRANCE</text>
          </g>
          <g className="stm-entrance-node" transform="translate(151 391)" aria-hidden="true">
            <circle r="17" /><circle r="9" /><circle r="3.8" />
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

          <g className="stm-compass" transform="translate(62 96)" aria-label="North orientation">
            <circle r="32" />
            <path d="M 0 -22 L 9 4 L 0 -2 L -9 4 Z" />
            <path d="M 0 22 L 9 -4 L 0 2 L -9 -4 Z" />
            <text x="0" y="-39">N</text>
          </g>
          <g className="stm-scale" transform="translate(42 690)" aria-label="Map scale">
            <path d="M 0 0 H 216 M 0 -1 V 9 M 72 0 V 6 M 144 0 V 6 M 216 -1 V 9" />
            <text x="0" y="28">0</text><text x="72" y="28">50</text><text x="144" y="28">100</text><text x="216" y="28">150m</text>
          </g>
        </svg>
      </div>

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
