// SmartHelmet/Software/src/hooks/useLiveData.js

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  getLatestReading, 
  getAlerts, 
  getWorker, 
  subscribeToReadings, 
  subscribeToAlerts, 
  getWorkerStatus,
  supabase
} from '../services/api';

// Polling interval in milliseconds (matches ESP32's 4-second send interval)
const POLL_INTERVAL_MS = 4000;

export default function useLiveData() {
  const [reading, setReading] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);

  // Track whether Realtime is delivering data
  const realtimeActiveRef = useRef(false);
  const lastReadingIdRef = useRef(null);

  // Derived state for status based on the latest reading
  const status = getWorkerStatus(reading);

  // Polling function — fetches the latest reading and alerts from Supabase
  const pollForUpdates = useCallback(async () => {
    try {
      const [latestReading, latestAlerts] = await Promise.all([
        getLatestReading(),
        getAlerts(10)
      ]);

      // Only update if there's genuinely new data
      if (latestReading && latestReading.id !== lastReadingIdRef.current) {
        lastReadingIdRef.current = latestReading.id;
        setReading(latestReading);
      }

      if (latestAlerts && latestAlerts.length > 0) {
        setAlerts(latestAlerts);
      }
    } catch (err) {
      console.error('[useLiveData] Polling error:', err);
    }
  }, []);

  useEffect(() => {
    let readingsChannel;
    let alertsChannel;
    let pollTimer;

    const fetchInitialData = async () => {
      try {
        const [initialReading, initialAlerts, initialWorker] = await Promise.all([
          getLatestReading(),
          getAlerts(10),
          getWorker()
        ]);
        
        if (initialReading) {
          lastReadingIdRef.current = initialReading.id;
        }
        setReading(initialReading);
        setAlerts(initialAlerts || []);
        setWorker(initialWorker);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // ── Strategy 1: Supabase Realtime subscriptions (instant) ──
    readingsChannel = subscribeToReadings((newReading) => {
      realtimeActiveRef.current = true;
      lastReadingIdRef.current = newReading.id;
      setReading(newReading);
    });

    alertsChannel = subscribeToAlerts((newAlert) => {
      realtimeActiveRef.current = true;
      setAlerts((prevAlerts) => {
        const updatedAlerts = [newAlert, ...prevAlerts];
        return updatedAlerts.slice(0, 10);
      });
    });

    // ── Strategy 2: Polling fallback (guarantees updates) ──
    // Polls every POLL_INTERVAL_MS regardless of Realtime status,
    // but only updates state if new data is found (deduped by reading ID).
    pollTimer = setInterval(pollForUpdates, POLL_INTERVAL_MS);

    // Cleanup
    return () => {
      if (readingsChannel) supabase.removeChannel(readingsChannel);
      if (alertsChannel) supabase.removeChannel(alertsChannel);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [pollForUpdates]);

  return { reading, alerts, worker, status, loading };
}
