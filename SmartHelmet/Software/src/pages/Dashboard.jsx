// SmartHelmet/Software/src/pages/Dashboard.jsx

import { useState, useEffect, useRef, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import BottomTabBar from '../components/BottomTabBar';
import Header from '../components/Header';
import SurveillanceTunnelMap from '../components/SurveillanceTunnelMap';
import WorkerStatusCard from '../components/WorkerStatusCard';
import SensorCard from '../components/SensorCard';
import AlertsCard from '../components/AlertsCard';
import LiveDebugPanel from '../components/LiveDebugPanel';
import ActiveAlarmBanner from '../components/ActiveAlarmBanner';
import DemoControlsPanel from '../components/DemoControlsPanel';
import WorkerSelector from '../components/WorkerSelector';
import AlertsPage from './AlertsPage';
import TunnelMapPage from './TunnelMapPage';
import AnalyticsPage from './AnalyticsPage';
import WorkersListPage from './WorkersListPage';
import WorkerDetailPage from './WorkerDetailPage';
import useLiveData from '../hooks/useLiveData';
import useFakeWorkers from '../hooks/useFakeWorkers';
import { getRSSIZone, getWorkerStatus } from '../services/api';
import { THRESHOLDS, getSensorStatus } from '../utils/constants';
import { Thermometer, Wind, Zap, HeartPulse, Activity, Wifi } from 'lucide-react';
import '../styles/Dashboard.css';

const HISTORY_LIMIT = 20;

import { GradientWave } from '../components/ui/GradientWave';

// Real worker ID — must match the constant in constants.js / api.js
const REAL_WORKER_ID = 'W001';

export default function Dashboard() {
  const { reading, alerts, worker, status, loading } = useLiveData();

  // ── Fake Workers (Phase 3) — separate data source, no coupling to useLiveData ──
  const { fakeWorkers } = useFakeWorkers();

  // ── Worker Selection State ─────────────────────────────
  // Defaults to real worker so existing behavior is unchanged on initial load.
  const [selectedWorkerId, setSelectedWorkerId] = useState(REAL_WORKER_ID);

  // ── View switching state ──────────────────────────────
  const [activeView, setActiveView] = useState('overview');

  // ── Worker Detail Navigation State (Phase 5) ─────────
  const [detailWorkerId, setDetailWorkerId] = useState(null);
  const [returnView, setReturnView] = useState('overview');

  const navigateToWorkerDetail = (workerId) => {
    setDetailWorkerId(workerId);
    setReturnView(activeView);
    setActiveView('worker-detail');
  };

  const navigateBackFromDetail = () => {
    setActiveView(returnView);
    setDetailWorkerId(null);
  };

  // ── Demo Mode state ───────────────────────────────────
  const [demoMode, setDemoMode] = useState(false);
  const [demoReading, setDemoReading] = useState(null);

  // ── Alarm Acknowledgement State ─────────────────────────
  const [acknowledged, setAcknowledged] = useState(false);

  // ── Effective reading & status (demo overrides live) ──
  const effectiveReading = demoMode && demoReading ? demoReading : reading;
  const effectiveStatus = demoMode && demoReading
    ? getWorkerStatus(demoReading)
    : status;

  // ── Rolling history of recent readings ────────────────
  const [history, setHistory] = useState([]);
  const seenIdsRef = useRef(new Set());

  // ── Emergency Siren Audio ─────────────────────────────
  const sirenAudioRef = useRef(null);

  useEffect(() => {
    sirenAudioRef.current = new Audio('/sounds/alert-siren.mp3');
    sirenAudioRef.current.loop = true;
    sirenAudioRef.current.volume = 0.75;
    
    // Prevent OS/hardware media keys from hijacking the siren
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {});
      navigator.mediaSession.setActionHandler('pause', () => {});
    }
    
    return () => {
      if (sirenAudioRef.current) {
        sirenAudioRef.current.pause();
        sirenAudioRef.current = null;
      }
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
      }
    };
  }, []);

  useEffect(() => {
    if (!sirenAudioRef.current) return;
    
    if (effectiveStatus === 'emergency' && !acknowledged) {
      sirenAudioRef.current.play().catch((err) => {
        console.warn('Siren autoplay blocked by browser policy:', err);
      });
    } else {
      sirenAudioRef.current.pause();
      sirenAudioRef.current.currentTime = 0;
    }
  }, [effectiveStatus, acknowledged]);

  useEffect(() => {
    if (!effectiveReading) return;

    // Deduplicate using id or created_at
    const key = effectiveReading.id || effectiveReading.created_at;
    if (key && seenIdsRef.current.has(key)) return;

    if (key) seenIdsRef.current.add(key);

    setHistory((prev) => {
      const updated = [...prev, effectiveReading];
      // Keep only the latest HISTORY_LIMIT entries
      if (updated.length > HISTORY_LIMIT) {
        const trimmed = updated.slice(updated.length - HISTORY_LIMIT);
        // Also trim the seen set to avoid unbounded growth
        const validKeys = new Set(
          trimmed.map((r) => r.id || r.created_at).filter(Boolean)
        );
        seenIdsRef.current = validKeys;
        return trimmed;
      }
      return updated;
    });
  }, [effectiveReading]);

  // ── Derive current zone from RSSI ─────────────────────
  const currentZone = getRSSIZone(effectiveReading?.rssi);

  // ── Active KPI Data: derived from selected worker (Phase 3) ──
  // When a fake worker is selected, KPI cards show that worker's readings.
  // When the real worker is selected, they show the live effectiveReading as before.
  // This is PURELY a display-layer switch — does NOT affect the real data pipeline.
  const isRealWorkerSelected = selectedWorkerId === REAL_WORKER_ID;

  const kpiReading = useMemo(() => {
    if (isRealWorkerSelected) {
      return effectiveReading;
    }
    const selectedFake = fakeWorkers.find((fw) => fw.id === selectedWorkerId);
    if (!selectedFake) return effectiveReading; // fallback to real if ID not found
    // Normalize fake worker readings to match the shape expected by SensorCard/getSensorStatus
    return {
      temperature: selectedFake.readings.temperature,
      gas_level: selectedFake.readings.gas_level,
      force: selectedFake.readings.force,
      heart_rate: selectedFake.readings.heart_rate,
      spo2: selectedFake.readings.spo2,
      rssi: selectedFake.rssi,
    };
  }, [isRealWorkerSelected, selectedWorkerId, fakeWorkers, effectiveReading]);

  // ── Global Emergency Mode state (single source of truth) ──
  const isEmergencyMode = effectiveStatus === 'warning' || effectiveStatus === 'emergency';
  const emergencyLevel = effectiveStatus === 'emergency' ? 'critical' : effectiveStatus === 'warning' ? 'elevated' : 'none';

  // ── Alarm Acknowledgement State ─────────────────────────
  // (State declared at top to avoid ReferenceError)

  useEffect(() => {
    if (effectiveStatus === 'normal') {
      setAcknowledged(false);
    }
  }, [effectiveStatus]);

  // ── Pinch-to-Zoom logic for Dashboard Map ─────────────
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

  // ── Render the active view content ────────────────────
  function renderActiveView() {
    switch (activeView) {
      case 'alerts':
        return <AlertsPage alerts={alerts} />;

      case 'tunnel-map':
        return (
          <TunnelMapPage
            worker={worker}
            reading={effectiveReading}
            zone={currentZone}
            status={effectiveStatus}
            isEmergencyMode={isEmergencyMode}
            emergencyLevel={emergencyLevel}
            onViewDetails={navigateToWorkerDetail}
          />
        );

      case 'analytics':
        return <AnalyticsPage history={history} alerts={alerts} worker={worker} />;

      case 'workers':
        return (
          <WorkersListPage
            worker={worker}
            reading={effectiveReading}
            status={effectiveStatus}
            zone={currentZone}
            fakeWorkers={fakeWorkers}
            onViewDetails={navigateToWorkerDetail}
          />
        );

      case 'worker-detail':
        return (
          <WorkerDetailPage
            workerId={detailWorkerId}
            worker={worker}
            reading={effectiveReading}
            status={effectiveStatus}
            zone={currentZone}
            history={history}
            fakeWorkers={fakeWorkers}
            onBack={navigateBackFromDetail}
          />
        );

      // Future views: just add more cases here

      case 'overview':
      default:
        return (
          <>
            {/* ── Active Alarm Banner (emergency mode only) ── */}
            <ActiveAlarmBanner
              alerts={alerts}
              reading={effectiveReading}
              status={effectiveStatus}
              isEmergencyMode={isEmergencyMode}
              emergencyLevel={emergencyLevel}
              acknowledged={acknowledged}
              setAcknowledged={setAcknowledged}
            />

            {/* ── Row 1: Sensor Cards Grid (KPI at-a-glance) ── */}
            {/* Data source switches based on selectedWorkerId (Phase 3) */}
            <div className="sensor-cards-grid">
              <SensorCard
                label="Temperature"
                value={kpiReading?.temperature}
                unit="°C"
                status={isRealWorkerSelected ? getSensorStatus(kpiReading, 'temperature') : 'normal'}
                icon={<Thermometer size={20} strokeWidth={2.5} />}
                subtitle="Ambient mine temperature"
              />
              <SensorCard
                label="Gas Level"
                value={kpiReading?.gas_level}
                unit="ppm"
                status={isRealWorkerSelected ? getSensorStatus(kpiReading, 'gas_level') : 'normal'}
                icon={<Wind size={20} strokeWidth={2.5} />}
                subtitle="MQ-series gas concentration"
              />
              <SensorCard
                label="Force"
                value={kpiReading?.force}
                unit="N"
                status={isRealWorkerSelected ? getSensorStatus(kpiReading, 'force') : 'normal'}
                icon={<Zap size={20} strokeWidth={2.5} />}
                subtitle="Helmet impact force"
              />
              <SensorCard
                label="Heart Rate"
                value={kpiReading?.heart_rate}
                unit="bpm"
                status={isRealWorkerSelected ? getSensorStatus(kpiReading, 'heart_rate') : 'normal'}
                icon={<HeartPulse size={20} strokeWidth={2.5} />}
                subtitle="Worker pulse rate"
              />
              <SensorCard
                label="SpO2"
                value={kpiReading?.spo2}
                unit="%"
                status="normal"
                icon={<Activity size={20} strokeWidth={2.5} />}
                subtitle="Blood oxygen saturation"
              />
              <SensorCard
                label="RSSI"
                value={kpiReading?.rssi}
                unit="dBm"
                status="normal"
                icon={<Wifi size={20} strokeWidth={2.5} />}
                subtitle="Signal strength"
              />
            </div>

            {/* ── Row 2: Tunnel Map + Worker Status side-by-side ── */}
            <div className="map-worker-row">
              <section className="map-hero-wrap dashboard-map-viewport" ref={viewportRef}>
                {showHint && <div className="dashboard-zoom-hint">Double-tap to reset &bull; Pinch to zoom</div>}
                <div className="dashboard-zoomable-wrapper" ref={wrapperRef}>
                  <SurveillanceTunnelMap
                    worker={worker}
                    reading={effectiveReading}
                    zone={currentZone}
                    status={effectiveStatus}
                    isEmergencyMode={isEmergencyMode}
                    emergencyLevel={emergencyLevel}
                    onViewDetails={navigateToWorkerDetail}
                  />
                </div>
              </section>
              <aside className="worker-status-sidebar">
                <WorkerSelector
                  realWorker={worker}
                  realStatus={effectiveStatus}
                  realZone={currentZone}
                  fakeWorkers={fakeWorkers}
                  selectedWorkerId={selectedWorkerId}
                  onSelect={setSelectedWorkerId}
                  onViewDetails={navigateToWorkerDetail}
                  vertical
                />
              </aside>
            </div>

            {/* ── Row 3: Alerts ─────────── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: 20,
                marginBottom: 24,
              }}
              className="alerts-trends-row"
            >
              <AlertsCard alerts={alerts} />
            </div>

            {/* ── Debug Panel (de-emphasized) ──────────── */}
            <div style={{ opacity: 0.6, marginTop: 32 }}>
              <LiveDebugPanel
                reading={effectiveReading}
                alerts={alerts}
                worker={worker}
                status={effectiveStatus}
                loading={loading}
              />
            </div>
          </>
        );
    }
  }

  return (
    <div className="min-h-screen dashboard-root" data-emergency-level={emergencyLevel} data-acknowledged={acknowledged} style={{ position: 'relative', background: '#080c14', overflowX: 'hidden' }}>
      {/* ── Custom Animated WebGL Background ───────────── */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          opacity: 0.6,
          overflow: 'hidden',
        }}
      >
        <GradientWave
          colors={["#0d1117", "#161b22", "#0d1117", "#2a4a6b", "#0d1117", "#161b22"]}
          isPlaying={true}
          noiseSpeed={0.00001}
          shadowPower={6}
          deform={{ incline: 0.2, noiseAmp: 150, noiseFlow: 1.5, noiseSpeed: 5 }}
        />
      </div>

      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <BottomTabBar activeView={activeView} setActiveView={setActiveView} />
      <Header />

      {/* ── Main content area ─────────────────────── */}
      <main
        className="dashboard-main-content"
        style={{
          marginLeft: 'var(--sidebar-width)',
          marginTop: 'var(--header-height)',
          minHeight: 'calc(125vh - var(--header-height))',
          padding: '0px 24px 24px 40px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {renderActiveView()}

        {/* ── Demo Controls Panel (always accessible) ── */}
        <DemoControlsPanel
          demoMode={demoMode}
          setDemoMode={setDemoMode}
          demoReading={demoReading}
          setDemoReading={setDemoReading}
          liveReading={reading}
          worker={worker}
          setAcknowledged={setAcknowledged}
        />
      </main>

      {/* Inline responsive override */}
      <style>{`
        @media (max-width: 1100px) {
          .sidebar-container {
            display: none !important;
          }
          .header-container {
            left: 0 !important;
          }
          .dashboard-main-content {
            margin-left: 0 !important;
            padding-left: 24px !important;
            padding-top: 16px !important;
            padding-bottom: calc(150px + env(safe-area-inset-bottom, 0px)) !important;
          }
        }
        @media (max-width: 900px) {
          .alerts-trends-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
