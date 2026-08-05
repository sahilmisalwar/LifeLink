// SmartHelmet/Software/src/utils/constants.js

export const SUPABASE_URL = 'https://gcjqwragkfjqasuzevkr.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjanF3cmFna2ZqcWFzdXpldmtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNzExMDMsImV4cCI6MjEwMDY0NzEwM30.OT9kdU-Sjy86gDb0QmYr78cOn8zNTbn7klhIdM7yQqE';

export const WORKER_ID = 'W001';

export const ZONE_COORDINATES = {
  'Entrance': { x: 151, y: 391 },
  'Main Junction': { x: 310, y: 449 },
  'East Junction': { x: 804, y: 554 },
  'Zone E': { x: 1125, y: 548 },
};

export const TUNNEL_GRAPH = {
  'Entrance': { 'Main Junction': 120 },
  'Main Junction': { 'Entrance': 120, 'East Junction': 260 },
  'East Junction': { 'Main Junction': 260, 'Zone E': 180 },
  'Zone E': { 'East Junction': 180 },
};

export const RSSI_ZONE_MAP = [
  { threshold: -55, zone: 'Entrance' },
  { threshold: -84, zone: 'Main Junction' },
  { threshold: -104, zone: 'East Junction' },
  { threshold: -999, zone: 'Zone E' },
];

export const THRESHOLDS = {
  temperature: { warning: 30, emergency: 34 },
  gas_level:   { warning: 1000, emergency: 2000 },
  force:       { warning: 17000, emergency: 20000 },
  heart_rate:  { warningLow: 50, warningHigh: 120, emergencyLow: 40, emergencyHigh: 150 },
  spo2:        { warning: 94, emergency: 90 },
};

export const STATUS = {
  NORMAL: 'normal',
  WARNING: 'warning',
  EMERGENCY: 'emergency',
};

// RSSI range for continuous worker positioning along the tunnel path
export const RSSI_STRONGEST = -40;   // maps to 0% along path (at Entrance)
export const RSSI_WEAKEST   = -120;  // maps to 100% along path (farthest point)

/**
 * Derive per-sensor status from the current reading using known thresholds.
 */
export function getSensorStatus(reading, field) {
  if (!reading || reading[field] === null || reading[field] === undefined) return 'normal';
  const val = reading[field];

  if (field === 'temperature') {
    if (val >= THRESHOLDS.temperature.emergency) return 'emergency';
    if (val >= THRESHOLDS.temperature.warning) return 'warning';
    return 'normal';
  }
  if (field === 'gas_level') {
    if (val >= THRESHOLDS.gas_level.emergency) return 'emergency';
    if (val >= THRESHOLDS.gas_level.warning) return 'warning';
    return 'normal';
  }
  if (field === 'force') {
    if (val >= THRESHOLDS.force.emergency) return 'emergency';
    if (val >= THRESHOLDS.force.warning) return 'warning';
    return 'normal';
  }
  if (field === 'heart_rate') {
    if (val > 0 && (val <= THRESHOLDS.heart_rate.emergencyLow || val >= THRESHOLDS.heart_rate.emergencyHigh)) return 'emergency';
    if (val > 0 && (val <= THRESHOLDS.heart_rate.warningLow || val >= THRESHOLDS.heart_rate.warningHigh)) return 'warning';
    return 'normal';
  }
  return 'normal';
}
