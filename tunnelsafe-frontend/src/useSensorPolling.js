import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

const POLL_INTERVAL_MS = 2000;
const STATUS_INTERVAL_MS = 5000;

export default function useSensorPolling() {
  const [latest, setLatest] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [backendStatus, setBackendStatus] = useState("unknown");
  const [connected, setConnected] = useState(false);
  const [lastPing, setLastPing] = useState(null);

  const api = useMemo(
    () =>
      axios.create({
        baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
        timeout: 4000,
      }),
    []
  );

  const mountedRef = useRef(true);

  const refreshReadings = useCallback(async () => {
    try {
      const [latestResponse, alertsResponse] = await Promise.all([
        api.get("/latest"),
        api.get("/alerts"),
      ]);
      if (!mountedRef.current) return;
      setLatest(latestResponse.data || null);
      setAlerts(Array.isArray(alertsResponse.data) ? alertsResponse.data : []);
      setConnected(true);
      setLastPing(new Date());
    } catch (error) {
      if (!mountedRef.current) return;
      setConnected(false);
    }
  }, [api]);

  const refreshStatus = useCallback(async () => {
    try {
      const statusResponse = await api.get("/status");
      if (!mountedRef.current) return;
      setBackendStatus(statusResponse.data?.status || "unknown");
      setConnected(true);
      setLastPing(new Date());
    } catch (error) {
      if (!mountedRef.current) return;
      setBackendStatus("down");
      setConnected(false);
    }
  }, [api]);

  useEffect(() => {
    mountedRef.current = true;
    refreshReadings();
    refreshStatus();

    const readingsTimer = setInterval(refreshReadings, POLL_INTERVAL_MS);
    const statusTimer = setInterval(refreshStatus, STATUS_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(readingsTimer);
      clearInterval(statusTimer);
    };
  }, [refreshReadings, refreshStatus]);

  return {
    latest,
    alerts,
    backendStatus,
    connected,
    lastPing,
    refreshReadings,
    api,
  };
}
