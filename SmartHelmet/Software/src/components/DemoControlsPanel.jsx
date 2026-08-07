// SmartHelmet/Software/src/components/DemoControlsPanel.jsx

import { useState, useCallback, useEffect } from 'react';
import { CheckCircle2, Wind, Flame, AlertTriangle, HeartPulse, SignalHigh, Settings, X, Beaker } from 'lucide-react';
import '../styles/DemoControlsPanel.css';

/* ══════════════════════════════════════════════════════════════
   Pre-built demo scenarios matching project THRESHOLDS:
   temperature: { warning: 30, emergency: 34 }
   gas_level:   { warning: 1000, emergency: 2000 }
   force:       { warning: 17000, emergency: 20000 }
   heart_rate:  { warningLow: 50, warningHigh: 120,
                  emergencyLow: 40, emergencyHigh: 150 }
   ══════════════════════════════════════════════════════════════ */

const DEFAULT_READING = {
  temperature: 28.5,
  gas_level: 450,
  force: 16125,
  heart_rate: 72,
  spo2: 98,
  rssi: -72,
  fall_detected: false,
};

const SCENARIOS = [
  {
    id: 'normal',
    name: 'Normal Shift',
    desc: 'All readings safe',
    icon: <CheckCircle2 size={16} strokeWidth={2.5} />,
    reading: {
      temperature: 26.2,
      gas_level: 380,
      force: 2100,
      heart_rate: 74,
      spo2: 98,
      rssi: -68,
      fall_detected: false,
    },
  },
  {
    id: 'gas_leak',
    name: 'Gas Leak',
    desc: 'Gas level critical',
    icon: <Wind size={16} strokeWidth={2.5} />,
    reading: {
      temperature: 29.1,
      gas_level: 2500,
      force: 1800,
      heart_rate: 95,
      spo2: 94,
      rssi: -78,
      fall_detected: false,
    },
  },
  {
    id: 'heat_spike',
    name: 'Heat Spike',
    desc: 'Temperature emergency',
    icon: <Flame size={16} strokeWidth={2.5} />,
    reading: {
      temperature: 36.8,
      gas_level: 620,
      force: 2200,
      heart_rate: 110,
      spo2: 96,
      rssi: -74,
      fall_detected: false,
    },
  },
  {
    id: 'fall',
    name: 'Fall Detected',
    desc: 'Impact + fall flag',
    icon: <AlertTriangle size={16} strokeWidth={2.5} />,
    reading: {
      temperature: 27.5,
      gas_level: 400,
      force: 22000,
      heart_rate: 130,
      spo2: 92,
      rssi: -82,
      fall_detected: true,
    },
  },
  {
    id: 'heart_emergency',
    name: 'Heart Rate Emergency',
    desc: 'Vitals critical',
    icon: <HeartPulse size={16} strokeWidth={2.5} />,
    reading: {
      temperature: 28.0,
      gas_level: 350,
      force: 1500,
      heart_rate: 160,
      spo2: 88,
      rssi: -70,
      fall_detected: false,
    },
  },
  {
    id: 'weak_signal',
    name: 'Weak Signal',
    desc: 'Entering deep zone',
    icon: <SignalHigh size={16} strokeWidth={2.5} />,
    reading: {
      temperature: 31.2,
      gas_level: 850,
      force: 3200,
      heart_rate: 88,
      spo2: 95,
      rssi: -105,
      fall_detected: false,
    },
  },
];

const SLIDER_CONFIG = [
  { key: 'temperature', label: 'Temp', unit: '°C', min: 18, max: 50, step: 0.5 },
  { key: 'gas_level', label: 'Gas', unit: 'ppm', min: 0, max: 4000, step: 50 },
  { key: 'force', label: 'Force', unit: 'N', min: 0, max: 30000, step: 500 },
  { key: 'heart_rate', label: 'HR', unit: 'bpm', min: 0, max: 200, step: 1 },
  { key: 'spo2', label: 'SpO₂', unit: '%', min: 50, max: 100, step: 1 },
  { key: 'rssi', label: 'RSSI', unit: 'dBm', min: -120, max: -40, step: 1 },
];

/**
 * DemoControlsPanel — collapsible panel for simulating dashboard states.
 *
 * Props:
 *  - demoMode       boolean
 *  - setDemoMode    (val) => void
 *  - demoReading    object | null
 *  - setDemoReading (val) => void
 *  - liveReading    current live reading from useLiveData
 *  - worker         worker object
 */
export default function DemoControlsPanel({
  demoMode,
  setDemoMode,
  demoReading,
  setDemoReading,
  liveReading,
  worker,
  setAcknowledged,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeScenario, setActiveScenario] = useState(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Effective demo reading with defaults
  const current = demoReading || DEFAULT_READING;

  // Toggle demo mode
  const handleToggle = useCallback(() => {
    const next = !demoMode;
    setDemoMode(next);
    setAcknowledged?.(false);
    if (next && !demoReading) {
      // Initialize demo reading from current live reading or defaults
      setDemoReading({
        ...DEFAULT_READING,
        ...(liveReading || {}),
        created_at: new Date().toISOString(),
      });
    }
  }, [demoMode, demoReading, liveReading, setDemoMode, setDemoReading, setAcknowledged]);

  // Apply a scenario
  const applyScenario = useCallback((scenario) => {
    setDemoMode(true);
    setAcknowledged?.(false);
    setDemoReading({
      ...scenario.reading,
      created_at: new Date().toISOString(),
      worker_id: worker?.worker_id || 'W001',
    });
    setActiveScenario(scenario.id);
  }, [setDemoMode, setDemoReading, worker, setAcknowledged]);

  // Update a single field
  const updateField = useCallback((field, value) => {
    setActiveScenario(null); // clear scenario highlight
    setAcknowledged?.(false);
    setDemoReading((prev) => ({
      ...(prev || DEFAULT_READING),
      [field]: value,
      created_at: new Date().toISOString(),
    }));
  }, [setDemoReading, setAcknowledged]);

  // Reset
  const handleReset = useCallback(() => {
    setDemoMode(false);
    setDemoReading(null);
    setActiveScenario(null);
  }, [setDemoMode, setDemoReading]);

  return (
    <>
      {/* ── Floating Action Button (FAB) ─────────── */}
      <button
        className={`dcp-fab ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close demo controls' : 'Open demo controls'}
      >
        {isOpen ? <X size={24} /> : <Settings size={24} />}
      </button>

      {/* ── Floating demo badge (moved so it doesn't overlap FAB) ── */}
      {demoMode && !isOpen && (
        <div className="dcp-demo-badge" aria-live="polite">
          <span className="dcp-badge-dot" />
          Demo Mode Active
        </div>
      )}

      {/* ── Backdrop ──────────────────────────────── */}
      <div
        className={`dcp-backdrop ${isOpen ? 'visible' : ''}`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* ── Slide-over Panel ──────────────────────── */}
      <div
        className={`demo-controls-panel ${isOpen ? 'open' : ''} ${demoMode ? 'demo-active' : ''}`}
        role="dialog"
        aria-label="Demo Controls Panel"
        aria-modal="true"
      >
        {/* ── Header ──────────────────────────────── */}
        <div className="dcp-header">
          <div className="dcp-header-left">
            <div className="dcp-header-icon"><Settings size={18} strokeWidth={2.5} /></div>
            <div className="dcp-header-text">
              <span className="dcp-title">Demo Controls</span>
              <span className="dcp-subtitle">
                {demoMode ? 'Simulation active' : 'Testing utility'}
              </span>
            </div>
          </div>
          <button className="dcp-close-btn" onClick={() => setIsOpen(false)} aria-label="Close panel">
            <X size={20} />
          </button>
        </div>

        {/* ── Body ────────────────────────────────── */}
        <div className="dcp-body">
          {/* ── Section 1: Demo mode toggle ──── */}
            <div className="dcp-section">
              <div className="dcp-section-title">Mode</div>
              <div className="dcp-toggle-row">
                <div>
                  <div className="dcp-toggle-label">
                    {demoMode ? 'Demo Mode ON' : 'Live Data Mode'}
                  </div>
                  <div className="dcp-toggle-hint">
                    {demoMode
                      ? 'Dashboard is using simulated readings'
                      : 'Dashboard is using live sensor data'}
                  </div>
                </div>
                <button
                  className={`dcp-switch ${demoMode ? 'on' : ''}`}
                  onClick={handleToggle}
                  aria-label={demoMode ? 'Switch to live data' : 'Switch to demo mode'}
                >
                  <div className="dcp-switch-knob" />
                </button>
              </div>
            </div>

            <div className="dcp-divider" />

            {/* ── Section 2: Quick scenarios ──── */}
            <div className="dcp-section">
              <div className="dcp-section-title">Quick Scenarios</div>
              <div className="dcp-scenarios">
                {SCENARIOS.map((s) => (
                  <button
                    key={s.id}
                    className={`dcp-scenario-btn${activeScenario === s.id && demoMode ? ' active' : ''}`}
                    onClick={() => applyScenario(s)}
                  >
                    <span className="dcp-scenario-icon">{s.icon}</span>
                    <span className="dcp-scenario-text">
                      <span className="dcp-scenario-name">{s.name}</span>
                      <span className="dcp-scenario-desc">{s.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="dcp-divider" />

            {/* ── Section 3: Manual overrides ──── */}
            <div className="dcp-section">
              <div className="dcp-section-title">Manual Sensor Overrides</div>
              <div className="dcp-sliders">
                {SLIDER_CONFIG.map((cfg) => (
                  <div key={cfg.key} className="dcp-slider-row">
                    <span className="dcp-slider-label">{cfg.label}</span>
                    <input
                      type="range"
                      className="dcp-slider-input"
                      min={cfg.min}
                      max={cfg.max}
                      step={cfg.step}
                      value={current[cfg.key] ?? cfg.min}
                      onChange={(e) => {
                        if (!demoMode) setDemoMode(true);
                        updateField(cfg.key, Number(e.target.value));
                      }}
                      aria-label={`${cfg.label} override`}
                    />
                    <span className="dcp-slider-value">
                      {current[cfg.key] != null ? Number(current[cfg.key]).toFixed(cfg.step < 1 ? 1 : 0) : '--'} {cfg.unit}
                    </span>
                  </div>
                ))}
              </div>

              {/* Fall detected toggle */}
              <div className="dcp-fall-row">
                <span className="dcp-fall-label">Fall Detected</span>
                <button
                  className={`dcp-switch ${current.fall_detected ? 'on' : ''}`}
                  onClick={() => {
                    if (!demoMode) setDemoMode(true);
                    updateField('fall_detected', !current.fall_detected);
                  }}
                  aria-label="Toggle fall detected"
                  style={current.fall_detected ? { background: 'rgba(239, 68, 68, 0.5)' } : {}}
                >
                  <div className="dcp-switch-knob" />
                </button>
                <span className={`dcp-fall-status ${current.fall_detected ? 'on' : 'off'}`}>
                  {current.fall_detected ? 'YES' : 'NO'}
                </span>
              </div>
            </div>

            <div className="dcp-divider" />

            {/* ── Section 4: Reset ────────────── */}
            <button className="dcp-reset-btn" onClick={handleReset}>
              ↩ Return to Live Data
            </button>
          </div>
      </div>
    </>
  );
}
