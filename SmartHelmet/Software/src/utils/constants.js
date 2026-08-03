// SmartHelmet/Software/src/utils/constants.js

export const SUPABASE_URL = 'https://gcjqwragkfjqasuzevkr.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjanF3cmFna2ZqcWFzdXpldmtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNzExMDMsImV4cCI6MjEwMDY0NzEwM30.OT9kdU-Sjy86gDb0QmYr78cOn8zNTbn7klhIdM7yQqE';

export const WORKER_ID = 'W001';

export const ZONE_COORDINATES = {
  'Entrance': { x: 80, y: 620 },
  'Main Junction': { x: 240, y: 480 },
  'West Junction': { x: 380, y: 340 },
  'East Junction': { x: 520, y: 520 },
  'Zone A': { x: 300, y: 200 },
  'Zone B': { x: 480, y: 380 },
  'Zone C': { x: 600, y: 260 },
};

export const TUNNEL_GRAPH = {
  'Entrance': { 'Main Junction': 120 },
  'Main Junction': { 'Entrance': 120, 'West Junction': 100, 'East Junction': 140 },
  'West Junction': { 'Main Junction': 100, 'Zone A': 90, 'Zone B': 80 },
  'East Junction': { 'Main Junction': 140, 'Zone B': 110, 'Zone C': 95 },
  'Zone A': { 'West Junction': 90 },
  'Zone B': { 'West Junction': 80, 'East Junction': 110 },
  'Zone C': { 'East Junction': 95 },
};

export const RSSI_ZONE_MAP = [
  { threshold: -60, zone: 'Entrance' },
  { threshold: -72, zone: 'Main Junction' },
  { threshold: -82, zone: 'West Junction' },
  { threshold: -90, zone: 'East Junction' },
  { threshold: -98, zone: 'Zone B' },
  { threshold: -106, zone: 'Zone C' },
  { threshold: -999, zone: 'Zone A' },
];

export const THRESHOLDS = {
  temperature: { warning: 30, emergency: 34 },
  gas_level:   { warning: 1000, emergency: 2000 },
  force:       { warning: 17000, emergency: 20000 },
  heart_rate:  { warningLow: 50, warningHigh: 120, emergencyLow: 40, emergencyHigh: 150 },
};

export const STATUS = {
  NORMAL: 'normal',
  WARNING: 'warning',
  EMERGENCY: 'emergency',
};

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
