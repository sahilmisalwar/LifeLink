// SmartHelmet/Software/src/hooks/useFakeWorkers.js
//
// ══════════════════════════════════════════════════════════════════════════════
//  FAKE WORKER SIMULATION — Phase 1: Data Layer
// ══════════════════════════════════════════════════════════════════════════════
//
//  PURPOSE:
//    Generates 4 simulated/demo workers with continuously-updating sensor
//    readings for demonstration purposes. This module is COMPLETELY ISOLATED
//    from the real worker pipeline (useLiveData, Supabase, api.js).
//
//  ISOLATION GUARANTEE:
//    • Does NOT import from services/api.js, utils/constants.js, or useLiveData.js
//    • Does NOT connect to Supabase or any external data source
//    • Does NOT share any React state, refs, or context with the real worker
//    • All data is generated in-memory and resets on page refresh
//
//  STATUS NOTE:
//    Fake worker status is hardcoded to "Normal". This is INTENTIONAL, not a
//    missing feature. Because all simulated sensor readings are constitutionally
//    bounded to safe ranges only, threshold evaluation / emergency detection
//    logic is unnecessary and deliberately omitted for fake workers.
//
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';

// ─── Configuration ───────────────────────────────────────────────────────────

/** How often (ms) fake worker readings update. Matches a reasonable real-time cadence. */
const TICK_INTERVAL_MS = 2000;

/** Maximum number of historical readings retained per sensor per worker. */
const HISTORY_BUFFER_SIZE = 60;

// ─── Sensor Safe Ranges ──────────────────────────────────────────────────────
// Each sensor defines { min, max, maxDelta } for random-walk fluctuation.
// Values are intentionally well within safe/normal thresholds so fake workers
// never trigger warnings or emergencies.

const SENSOR_RANGES = {
  temperature: { min: 24, max: 30, maxDelta: 0.3 },   // °C — safe range
  gas_level:   { min: 200, max: 400, maxDelta: 15 },   // ppm — well below warning (1000)
  force:       { min: 200, max: 2000, maxDelta: 100 },  // "no fall detected" safe range — well below warning (17000)
  heart_rate:  { min: 65, max: 85, maxDelta: 2 },       // bpm — normal resting/working
  spo2:        { min: 96, max: 99, maxDelta: 0.5 },     // % — healthy range
};

// ─── Fixed Worker Definitions ────────────────────────────────────────────────

const FAKE_WORKER_DEFINITIONS = [
  {
    id: 'W002',
    name: 'Arjun Mehta',
    zone: 'Zone A',
    position: { x: 449, y: 255 },
    rssi: -55,       // Distinct fixed RSSI — set once, never updated
  },
  {
    id: 'W003',
    name: 'Raj Gupta',
    zone: 'Zone B',
    position: { x: 1072, y: 206 },
    rssi: -62,
  },
  {
    id: 'W004',
    name: 'Vikram Singh',
    zone: 'Zone C',
    position: { x: 664, y: 811 },
    rssi: -70,
  },
  {
    id: 'W005',
    name: 'Karan Sharma',
    zone: 'Zone D',
    position: { x: 1119, y: 843 },
    rssi: -75,
  },
];

// ─── Utility Helpers ─────────────────────────────────────────────────────────

/**
 * Generate a random float between min and max (inclusive).
 */
function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Clamp a value between min and max.
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Random-walk step: take previous value, add a small random delta, clamp to range.
 * Produces naturally continuous fluctuations rather than jittery random jumps.
 */
function randomWalk(previousValue, { min, max, maxDelta }) {
  const delta = (Math.random() * 2 - 1) * maxDelta; // random value in [-maxDelta, +maxDelta]
  return clamp(previousValue + delta, min, max);
}

/**
 * Generate initial sensor readings — a random starting point within each safe range.
 */
function generateInitialReadings() {
  return {
    temperature: parseFloat(randomInRange(SENSOR_RANGES.temperature.min, SENSOR_RANGES.temperature.max).toFixed(1)),
    gas_level:   Math.round(randomInRange(SENSOR_RANGES.gas_level.min, SENSOR_RANGES.gas_level.max)),
    force:       Math.round(randomInRange(SENSOR_RANGES.force.min, SENSOR_RANGES.force.max)),
    heart_rate:  Math.round(randomInRange(SENSOR_RANGES.heart_rate.min, SENSOR_RANGES.heart_rate.max)),
    spo2:        parseFloat(randomInRange(SENSOR_RANGES.spo2.min, SENSOR_RANGES.spo2.max).toFixed(1)),
  };
}

/**
 * Advance all sensor readings by one random-walk tick.
 */
function tickReadings(prevReadings) {
  return {
    temperature: parseFloat(randomWalk(prevReadings.temperature, SENSOR_RANGES.temperature).toFixed(1)),
    gas_level:   Math.round(randomWalk(prevReadings.gas_level, SENSOR_RANGES.gas_level)),
    force:       Math.round(randomWalk(prevReadings.force, SENSOR_RANGES.force)),
    heart_rate:  Math.round(randomWalk(prevReadings.heart_rate, SENSOR_RANGES.heart_rate)),
    spo2:        parseFloat(randomWalk(prevReadings.spo2, SENSOR_RANGES.spo2).toFixed(1)),
  };
}

/**
 * Create an empty history buffer object for all sensor types.
 */
function createEmptyHistory() {
  return {
    temperature: [],
    gas_level:   [],
    force:       [],
    heart_rate:  [],
    spo2:        [],
  };
}

/**
 * Push a new reading into the rolling history buffer, dropping the oldest entry
 * if the buffer exceeds HISTORY_BUFFER_SIZE.
 */
function pushToHistory(history, readings) {
  const timestamp = Date.now();
  const newHistory = {};

  for (const sensorKey of Object.keys(history)) {
    const entry = { value: readings[sensorKey], timestamp };
    const buffer = [...history[sensorKey], entry];

    // Drop oldest entries if buffer exceeds max size
    if (buffer.length > HISTORY_BUFFER_SIZE) {
      newHistory[sensorKey] = buffer.slice(buffer.length - HISTORY_BUFFER_SIZE);
    } else {
      newHistory[sensorKey] = buffer;
    }
  }

  return newHistory;
}

// ─── Build Initial Worker State ──────────────────────────────────────────────

/**
 * Construct the full initial state array for all 4 fake workers.
 * Each worker gets: fixed identity fields, initial random readings,
 * an empty history buffer, and the hardcoded "Normal" status.
 */
function buildInitialWorkers() {
  return FAKE_WORKER_DEFINITIONS.map((def) => {
    const initialReadings = generateInitialReadings();
    const initialHistory = createEmptyHistory();
    // Seed the history with the first reading
    const seededHistory = pushToHistory(initialHistory, initialReadings);

    return {
      // ── Fixed identity fields (never change) ──
      id: def.id,
      name: def.name,
      zone: def.zone,
      position: def.position,
      rssi: def.rssi,              // Fixed at init — NEVER updated in tick loop
      isSimulated: true,           // Flag for all future phases to distinguish fake vs. real

      // ── Status: hardcoded to "Normal" ──
      // INTENTIONAL: Simulated readings are bounded to safe ranges only, so status
      // evaluation is unnecessary. This is by design, not a missing feature.
      status: 'normal',

      // ── Live sensor readings (updated every tick) ──
      readings: initialReadings,

      // ── Rolling history buffer (last HISTORY_BUFFER_SIZE readings per sensor) ──
      // Used by Phase 5 trend charts. Ephemeral — resets on page refresh.
      history: seededHistory,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HOOK: useFakeWorkers
// ═══════════════════════════════════════════════════════════════════════════════
//
//  Returns: { fakeWorkers, loading }
//    - fakeWorkers: Array of 4 fake worker objects, each with live readings,
//      fixed position/zone/RSSI, isSimulated flag, "Normal" status, and
//      rolling history buffers.
//    - loading: Always false (data is generated synchronously), included for
//      API symmetry with useLiveData.
//
// ═══════════════════════════════════════════════════════════════════════════════

export default function useFakeWorkers() {
  // Use a ref to hold the mutable worker state to avoid re-creating on every tick.
  // We copy into React state only when we want to trigger a re-render.
  const [initialData] = useState(() => buildInitialWorkers());
  const workersRef = useRef(initialData);
  const [fakeWorkers, setFakeWorkers] = useState(initialData);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const currentWorkers = workersRef.current;
      if (!currentWorkers) return;

      const updatedWorkers = currentWorkers.map((worker) => {
        // Advance sensor readings by one random-walk tick
        const newReadings = tickReadings(worker.readings);

        // Push new readings into the rolling history buffer
        const newHistory = pushToHistory(worker.history, newReadings);

        return {
          ...worker,
          readings: newReadings,
          history: newHistory,
          // NOTE: status, position, zone, rssi, isSimulated are NOT updated here.
          // They remain fixed for the lifetime of the session.
        };
      });

      workersRef.current = updatedWorkers;
      setFakeWorkers(updatedWorkers);
    }, TICK_INTERVAL_MS);

    // ── Cleanup: clear interval on unmount to prevent memory leaks ──
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return {
    fakeWorkers,
    loading: false, // Synchronous generation — always immediately available
  };
}
