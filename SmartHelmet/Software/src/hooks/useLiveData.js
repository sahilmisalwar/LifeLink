// SmartHelmet/Software/src/hooks/useLiveData.js

import { useState, useEffect } from 'react';
import { 
  getLatestReading, 
  getAlerts, 
  getWorker, 
  subscribeToReadings, 
  subscribeToAlerts, 
  getWorkerStatus,
  supabase
} from '../services/api';

export default function useLiveData() {
  const [reading, setReading] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);

  // Derived state for status based on the latest reading
  const status = getWorkerStatus(reading);

  useEffect(() => {
    let readingsChannel;
    let alertsChannel;

    const fetchInitialData = async () => {
      try {
        const [initialReading, initialAlerts, initialWorker] = await Promise.all([
          getLatestReading(),
          getAlerts(10),
          getWorker()
        ]);
        
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

    // Subscribe to real-time readings
    readingsChannel = subscribeToReadings((newReading) => {
      setReading(newReading);
    });

    // Subscribe to real-time alerts
    alertsChannel = subscribeToAlerts((newAlert) => {
      setAlerts((prevAlerts) => {
        const updatedAlerts = [newAlert, ...prevAlerts];
        return updatedAlerts.slice(0, 10); // Cap at 10 items
      });
    });

    // Cleanup function to unsubscribe from channels
    return () => {
      if (readingsChannel) supabase.removeChannel(readingsChannel);
      if (alertsChannel) supabase.removeChannel(alertsChannel);
    };
  }, []);

  return { reading, alerts, worker, status, loading };
}
