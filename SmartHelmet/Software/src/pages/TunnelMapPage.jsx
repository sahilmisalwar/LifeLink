// SmartHelmet/Software/src/pages/TunnelMapPage.jsx

import { Thermometer, Wind, Zap, HeartPulse, Activity, Wifi } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
import SurveillanceTunnelMap from '../components/SurveillanceTunnelMap';
import WorkerStatusCard from '../components/WorkerStatusCard';
import { getSensorStatus } from '../utils/constants';
import '../styles/TunnelMapPage.css';

/**
 * Sensor definitions for the compact readings panel.
 * Each entry maps to a field on the live `reading` object.
 */
const SENSOR_DEFS = [
  { key: 'temperature', label: 'Temperature', unit: '°C',  icon: Thermometer, sensorKey: 'temperature' },
  { key: 'gas_level',   label: 'Gas Level',   unit: 'ppm', icon: Wind,        sensorKey: 'gas_level'   },
  { key: 'force',       label: 'Impact Force', unit: 'N',   icon: Zap,         sensorKey: 'force'       },
  { key: 'heart_rate',  label: 'Heart Rate',  unit: 'bpm', icon: HeartPulse,  sensorKey: 'heart_rate'  },
  { key: 'spo2',        label: 'SpO₂',        unit: '%',   icon: Activity,    sensorKey: 'spo2'        },
  { key: 'rssi',        label: 'RSSI',        unit: 'dBm', icon: Wifi,        sensorKey: null          },
];

/**
 * TunnelMapPage — Full-page dedicated view that reuses the existing
 * SurveillanceTunnelMap component at a larger size, alongside a compact
 * worker-status sidebar.
 *
 * All live data props are passed through from Dashboard.jsx's single
 * useLiveData() source of truth, so the map shown here is always in
 * sync with the overview page's smaller version.
 */
export default function TunnelMapPage({
  worker,
  reading,
  zone,
  status,
  isEmergencyMode,
  emergencyLevel,
}) {
  const safeStr = (val) => (val !== null && val !== undefined ? val : '--');

  const viewportRef = useRef(null);
  const wrapperRef = useRef(null);
  const scaleRef = useRef(1);
  const posRef = useRef({ x: 0, y: 0 });
  const isPinchingRef = useRef(false);
  const initialDistance = useRef(null);
  const initialScale = useRef(1);
  const initialPan = useRef({ x: 0, y: 0 });
  const lastTapTime = useRef(0);

  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    const wrapper = wrapperRef.current;
    if (!el || !wrapper) return;

    const getDistance = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const updateTransform = (s, x, y) => {
      if (window.innerWidth <= 1100) {
        wrapper.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
      } else {
        wrapper.style.transform = 'none';
      }
    };

    const resetZoom = () => {
      scaleRef.current = 1;
      posRef.current = { x: 0, y: 0 };
      wrapper.style.transition = 'transform 0.3s ease-out';
      updateTransform(1, 0, 0);
      setTimeout(() => {
        if (wrapper) wrapper.style.transition = 'none';
      }, 300);
    };

    const handleTouchStart = (e) => {
      if (window.innerWidth > 1100) return;

      if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTapTime.current < 300) {
          e.preventDefault();
          resetZoom();
          lastTapTime.current = 0;
          return;
        }
        lastTapTime.current = now;

        if (scaleRef.current > 1) {
          e.preventDefault();
          initialPan.current = {
            x: e.touches[0].clientX - posRef.current.x,
            y: e.touches[0].clientY - posRef.current.y
          };
        }
      } else if (e.touches.length === 2) {
        e.preventDefault();
        isPinchingRef.current = true;
        setShowHint(false);
        initialDistance.current = getDistance(e.touches);
        initialScale.current = scaleRef.current;
      }
    };

    const handleTouchMove = (e) => {
      if (window.innerWidth > 1100) return;

      if (e.touches.length === 2 && isPinchingRef.current) {
        e.preventDefault();
        const currentDistance = getDistance(e.touches);
        const scaleDelta = currentDistance / initialDistance.current;
        let s = initialScale.current * scaleDelta;
        s = Math.max(1, Math.min(s, 4));
        
        scaleRef.current = s;
        if (s === 1) posRef.current = { x: 0, y: 0 };
        updateTransform(scaleRef.current, posRef.current.x, posRef.current.y);
      } else if (e.touches.length === 1 && scaleRef.current > 1) {
        e.preventDefault();
        posRef.current = {
          x: e.touches[0].clientX - initialPan.current.x,
          y: e.touches[0].clientY - initialPan.current.y
        };
        updateTransform(scaleRef.current, posRef.current.x, posRef.current.y);
      }
    };

    const handleTouchEnd = (e) => {
      if (window.innerWidth > 1100) return;
      if (e.touches.length < 2) {
        isPinchingRef.current = false;
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    const handleResize = () => {
      if (window.innerWidth > 1100 && scaleRef.current !== 1) resetZoom();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="tunnel-map-page">
      {/* ── Page header ───────────────────────────────────── */}
      <div className="tmp-header">
        <div>
          <h1 className="tmp-title">Tunnel Surveillance Map</h1>
          <p className="tmp-subtitle">
            Full-screen live position and rescue route guidance
          </p>
        </div>
        <div className="tmp-zone-badge">
          <span className="tmp-zone-dot" />
          Zone: {zone || 'Unknown'}
        </div>
      </div>

      {/* ── Body: enlarged map + sidebar panel ─────────────── */}
      <div className="tmp-body">
        {/* Map — same component, same props, more room */}
        <div className="tmp-map-container" ref={viewportRef}>
          {showHint && <div className="tmp-zoom-hint">Double-tap to reset &bull; Pinch to zoom</div>}
          <div className="tmp-zoomable-wrapper" ref={wrapperRef}>
            <SurveillanceTunnelMap
              worker={worker}
              reading={reading}
              zone={zone}
              status={status}
              isEmergencyMode={isEmergencyMode}
              emergencyLevel={emergencyLevel}
            />
          </div>
        </div>

        {/* Sidebar panel */}
        <div className="tmp-sidebar-panel">
          {/* Reuse the existing WorkerStatusCard as-is */}
          <WorkerStatusCard
            worker={worker}
            status={status}
            reading={reading}
            compact
            zone={zone}
          />

          {/* Compact sensor readings card */}
          <div className="tmp-info-card">
            <h3 className="tmp-info-card-title">Live Sensor Readings</h3>
            <div className="tmp-reading-grid">
              {SENSOR_DEFS.map(({ key, label, unit, icon: Icon, sensorKey }) => {
                const sensorStatus = sensorKey
                  ? getSensorStatus(reading, sensorKey)
                  : 'normal';
                const rowClass =
                  sensorStatus === 'emergency'
                    ? 'emergency'
                    : sensorStatus === 'warning'
                    ? 'warning'
                    : '';

                return (
                  <div
                    key={key}
                    className={`tmp-reading-row ${rowClass}`}
                  >
                    <span className="tmp-reading-icon">
                      <Icon size={14} strokeWidth={2.5} />
                    </span>
                    <span className="tmp-reading-label">{label}</span>
                    <span className="tmp-reading-value">
                      {safeStr(reading?.[key])}
                      <span className="tmp-reading-unit">{unit}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
