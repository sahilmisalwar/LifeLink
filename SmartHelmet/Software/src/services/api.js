// SmartHelmet/Software/src/services/api.js

import { createClient } from '@supabase/supabase-js';
import { 
  SUPABASE_URL, 
  SUPABASE_ANON_KEY, 
  WORKER_ID, 
  RSSI_ZONE_MAP, 
  THRESHOLDS, 
  STATUS 
} from '../utils/constants';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getLatestReading() {
  try {
    const { data, error } = await supabase
      .from('sensor_readings')
      .select('*')
      .eq('worker_id', WORKER_ID)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching latest reading:', error);
      return null;
    }
    return data || null;
  } catch (err) {
    console.error('Exception in getLatestReading:', err);
    return null;
  }
}

export async function getAlerts(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('worker_id', WORKER_ID)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Exception in getAlerts:', err);
    return [];
  }
}

export async function getWorker() {
  try {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('worker_id', WORKER_ID)
      .single();

    if (error) {
      console.error('Error fetching worker:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Exception in getWorker:', err);
    return null;
  }
}

export async function insertDemoReading(data) {
  // ── SECURITY: Block database writes in production ──
  // This function is only for local development/demo purposes.
  // In production, sensor data should only come from the ESP32 gateway.
  if (process.env.NODE_ENV === 'production') {
    console.warn('[Security] insertDemoReading blocked in production.');
    return null;
  }

  try {
    const { data: insertedData, error } = await supabase
      .from('sensor_readings')
      .insert({ ...data, worker_id: WORKER_ID })
      .select()
      .single();

    if (error) {
      console.error('Error inserting demo reading:', error);
      return null;
    }
    return insertedData;
  } catch (err) {
    console.error('Exception in insertDemoReading:', err);
    return null;
  }
}

export function subscribeToReadings(callback) {
  const channel = supabase.channel('sensor_readings_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'sensor_readings',
        filter: `worker_id=eq.${WORKER_ID}`
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();
  
  return channel;
}

export function subscribeToAlerts(callback) {
  const channel = supabase.channel('alerts_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'alerts',
        filter: `worker_id=eq.${WORKER_ID}`
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();
  
  return channel;
}

export function getRSSIZone(rssi) {
  if (rssi === null || rssi === undefined) return 'Entrance';
  
  for (const map of RSSI_ZONE_MAP) {
    if (rssi >= map.threshold) {
      return map.zone;
    }
  }
  return 'Entrance';
}

/**
 * Dijkstra's shortest path algorithm.
 * 1. Maintain a priority queue (or sorted array) of unvisited nodes based on shortest known distance.
 * 2. Iteratively relax edges (update neighbor distances if a shorter path is found).
 * 3. Track predecessors to backtrack and build the final path once the destination is reached.
 */
export function runDijkstra(graph, start, end) {
  if (!graph[start] || !graph[end]) return [];

  const distances = {};
  const previous = {};
  const unvisited = [];

  for (let node in graph) {
    distances[node] = Infinity;
    previous[node] = null;
    unvisited.push(node);
  }
  distances[start] = 0;

  while (unvisited.length > 0) {
    // Array-based min extraction (sufficient for a small 7-node graph)
    unvisited.sort((a, b) => distances[a] - distances[b]);
    const closestNode = unvisited.shift();

    // If the closest node is at Infinity, remaining nodes are unreachable
    if (distances[closestNode] === Infinity) break;
    // If we've reached the target, we can stop
    if (closestNode === end) break;

    const neighbors = graph[closestNode];
    for (let neighbor in neighbors) {
      if (unvisited.includes(neighbor)) {
        const alt = distances[closestNode] + neighbors[neighbor];
        if (alt < distances[neighbor]) {
          distances[neighbor] = alt;
          previous[neighbor] = closestNode;
        }
      }
    }
  }

  // Backtrack to build path
  const path = [];
  let current = end;
  while (current) {
    path.unshift(current);
    if (current === start) break;
    current = previous[current];
  }
  
  // If the path doesn't start with our starting node, no path exists
  if (path[0] !== start) return [];
  return path;
}

export function getWorkerStatus(reading) {
  if (!reading) return STATUS.NORMAL;

  const { temperature, gas_level, force, fall_detected, heart_rate, sos_triggered } = reading;

  const hrEmergency = heart_rate > 0 &&
    (heart_rate <= THRESHOLDS.heart_rate.emergencyLow || heart_rate >= THRESHOLDS.heart_rate.emergencyHigh);

  const hrWarning = heart_rate > 0 &&
    (heart_rate <= THRESHOLDS.heart_rate.warningLow || heart_rate >= THRESHOLDS.heart_rate.warningHigh);

  if (
    temperature >= THRESHOLDS.temperature.emergency ||
    gas_level >= THRESHOLDS.gas_level.emergency ||
    force >= THRESHOLDS.force.emergency ||
    fall_detected ||
    sos_triggered ||
    hrEmergency
  ) {
    return STATUS.EMERGENCY;
  }

  if (
    temperature >= THRESHOLDS.temperature.warning ||
    gas_level >= THRESHOLDS.gas_level.warning ||
    force >= THRESHOLDS.force.warning ||
    hrWarning
  ) {
    return STATUS.WARNING;
  }

  return STATUS.NORMAL;
}
