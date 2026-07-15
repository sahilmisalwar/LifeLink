import { useEffect, useMemo, useState } from "react";
import useSensorPolling from "./useSensorPolling";

const splashChecks = [
  "Helmet Connected",
  "Worker Online",
  "Sensors Active",
  "System Ready",
];

const tunnelNodes = {
  Entrance: { x: 80, y: 60 },
  "Main Junction": { x: 220, y: 60 },
  "West Junction": { x: 350, y: 130 },
  "East Junction": { x: 350, y: 20 },
  "Zone A": { x: 500, y: 160 },
  "Zone B": { x: 500, y: 20 },
  "Zone C": { x: 520, y: 100 },
};

const tunnelEdges = [
  ["Entrance", "Main Junction"],
  ["Main Junction", "West Junction"],
  ["Main Junction", "East Junction"],
  ["West Junction", "Zone A"],
  ["East Junction", "Zone B"],
  ["West Junction", "Zone C"],
  ["East Junction", "Zone C"],
];

const basePayload = {
  worker_id: "W001",
  temperature: 32.2,
  gas_level: 450,
  accel_x: 412.0,
  accel_y: -210.0,
  accel_z: 16091.0,
  fall_detected: false,
  status: "normal",
};

const navItems = ["Dashboard", "Live Monitoring", "Alert History"];

function severityColor(level, emergencyMode) {
  if (emergencyMode) return "#dc2626";
  if (level === "high") return "#f97316";
  if (level === "medium") return "#facc15";
  return "#16a34a";
}

function buildSeriesPoints(series, key, width = 300, height = 90) {
  if (!series.length) return "";
  const values = series.map((item) => item[key] || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  return series
    .map((item, index) => {
      const x = (index / Math.max(series.length - 1, 1)) * width;
      const y = height - (((item[key] || 0) - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

export default function App() {
  const [launched, setLaunched] = useState(false);
  const [completedChecks, setCompletedChecks] = useState(0);
  const [clock, setClock] = useState(new Date());
  const [selectedNav, setSelectedNav] = useState(navItems[0]);
  const [trendData, setTrendData] = useState([]);
  const [terrainView, setTerrainView] = useState(true);
  const [workersView, setWorkersView] = useState(true);
  const [fullScreenMap, setFullScreenMap] = useState(false);
  const [rescuePath, setRescuePath] = useState([]);

  const { latest, alerts, backendStatus, connected, lastPing, refreshReadings, api } =
    useSensorPolling();

  const emergencyMode = latest?.status === "emergency";

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const splashTimer = setInterval(() => {
      setCompletedChecks((count) => Math.min(count + 1, splashChecks.length));
    }, 650);
    return () => clearInterval(splashTimer);
  }, []);

  useEffect(() => {
    if (!latest) return;
    setTrendData((previous) => {
      const next = [
        ...previous,
        {
          temperature: Number(latest.temperature || 0),
          gas_level: Number(latest.gas_level || 0),
          vibration: Number(latest.totalForce || 0),
        },
      ];
      return next.slice(-20);
    });
  }, [latest]);

  useEffect(() => {
    if (!emergencyMode) {
      setRescuePath([]);
      return;
    }

    const fetchPath = async () => {
      try {
        const response = await api.get("/path", { params: { worker_zone: "Zone C" } });
        setRescuePath(response.data?.path || []);
      } catch (error) {
        setRescuePath([]);
      }
    };

    fetchPath();
  }, [api, emergencyMode]);

  const topAlert = alerts[0];

  const kpis = useMemo(() => {
    const gas = Number(latest?.gas_level || 0);
    const temp = Number(latest?.temperature || 0);
    const vibration = Number(latest?.totalForce || 0);

    return [
      {
        label: "Air Quality",
        value: gas > 1200 ? "Critical" : gas > 800 ? "Poor" : "Normal",
        level: gas > 1200 ? "high" : gas > 800 ? "medium" : "low",
      },
      {
        label: "Temperature",
        value: `${temp.toFixed(1)}°C`,
        level: temp > 40 ? "high" : temp > 38 ? "medium" : "low",
      },
      {
        label: "Gas Level",
        value: `${gas.toFixed(0)} ppm`,
        level: gas > 1200 ? "high" : gas > 800 ? "medium" : "low",
      },
      {
        label: "Vibration",
        value: `${vibration.toFixed(0)} N`,
        level: vibration > 17000 ? "high" : vibration > 12000 ? "medium" : "low",
      },
      {
        label: "Active Workers",
        value: "1",
        level: "low",
      },
    ];
  }, [latest]);

  const connectionText = connected
    ? `Connected • Last ping ${lastPing ? lastPing.toLocaleTimeString() : "-"}`
    : "Disconnected from backend";

  const sendDemoReading = async (override) => {
    try {
      await api.post("/sensor-data", { ...basePayload, ...override });
      await refreshReadings();
    } catch (error) {
      // no-op for offline demos
    }
  };

  if (!launched) {
    return (
      <div className="app-shell splash">
        <div className="splash-card">
          <h1>LifeLink / TunnelSafe</h1>
          <p>Underground Worker Safety Monitoring</p>
          <ul>
            {splashChecks.map((check, index) => (
              <li key={check} className={index < completedChecks ? "done" : "pending"}>
                {index < completedChecks ? "✓" : "…"} {check}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="launch-btn"
            onClick={() => setLaunched(true)}
            disabled={completedChecks < splashChecks.length}
          >
            Launch Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-shell ${emergencyMode ? "emergency-pulse" : ""}`}>
      <aside className="sidebar">
        <h2>LifeLink</h2>
        {navItems.map((item) => (
          <button
            type="button"
            key={item}
            className={selectedNav === item ? "active" : ""}
            onClick={() => setSelectedNav(item)}
          >
            {item}
          </button>
        ))}
      </aside>

      <main className="content">
        <section className="top-bar">
          <div>{clock.toLocaleDateString()}</div>
          <div>{clock.toLocaleTimeString()}</div>
          <div>{latest?.temperature ? `${latest.temperature}°C` : "--"}</div>
          <div>System: {backendStatus}</div>
        </section>

        <section className={`connection-bar ${connected ? "ok" : "down"}`}>{connectionText}</section>

        {emergencyMode && (
          <section className="emergency-banner">
            ⚠ Emergency detected for {latest?.worker_id || "W001"}: {topAlert?.trigger_reason || "Sensor threshold breached"}
          </section>
        )}

        <section className="kpi-grid">
          {kpis.map((kpi) => (
            <article key={kpi.label} className="kpi-card" style={{ borderColor: severityColor(kpi.level, emergencyMode) }}>
              <h3>{kpi.label}</h3>
              <p>{kpi.value}</p>
            </article>
          ))}
        </section>

        <section className={`map-panel ${fullScreenMap ? "fullscreen" : ""}`}>
          <header>
            <h3>Tunnel Map</h3>
            <div className="map-toggles">
              <button type="button" onClick={() => setTerrainView((v) => !v)}>
                Terrain {terrainView ? "On" : "Off"}
              </button>
              <button type="button" onClick={() => setWorkersView((v) => !v)}>
                Workers {workersView ? "On" : "Off"}
              </button>
              <button type="button" onClick={() => setFullScreenMap((v) => !v)}>
                {fullScreenMap ? "Exit Fullscreen" : "Fullscreen"}
              </button>
            </div>
          </header>

          <svg viewBox="0 0 620 220" className="tunnel-svg">
            <defs>
              <linearGradient id="depthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1f2937" />
                <stop offset="100%" stopColor="#111111" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="620" height="220" fill={terrainView ? "url(#depthGradient)" : "#111111"} />
            {tunnelEdges.map(([a, b]) => {
              const from = tunnelNodes[a];
              const to = tunnelNodes[b];
              const path = `M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${(from.y + to.y) / 2 - 20} ${to.x} ${to.y}`;
              return <path key={`${a}-${b}`} d={path} className="edge" />;
            })}

            {rescuePath.length > 1 &&
              rescuePath.slice(0, -1).map((node, index) => {
                const from = tunnelNodes[node];
                const to = tunnelNodes[rescuePath[index + 1]];
                return (
                  <line
                    key={`rescue-${node}-${rescuePath[index + 1]}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    className="rescue-path"
                  />
                );
              })}

            {Object.entries(tunnelNodes).map(([name, point]) => (
              <g key={name}>
                <circle cx={point.x} cy={point.y} r="8" fill="#f97316" />
                <text x={point.x + 10} y={point.y - 10} fill="#e5e7eb" fontSize="12">
                  {name}
                </text>
              </g>
            ))}

            {workersView && (
              <circle
                className="worker-dot"
                cx={tunnelNodes["Zone C"].x}
                cy={tunnelNodes["Zone C"].y}
                r="7"
              />
            )}

            <rect x="590" y="20" width="10" height="150" fill="url(#depthGradient)" />
          </svg>
        </section>

        <section className="two-col">
          <article className="panel">
            <h3>Recent Alerts</h3>
            <ul className="alerts-list">
              {alerts.length ? (
                alerts.map((alert) => (
                  <li key={`${alert.timestamp}-${alert.worker_id}`} className={alert.severity || "warning"}>
                    <strong>{alert.worker_id}</strong> — {alert.trigger_reason} ({alert.severity})
                  </li>
                ))
              ) : (
                <li className="normal">No alerts</li>
              )}
            </ul>
          </article>

          <article className="panel">
            <h3>Live Environmental Trends</h3>
            <svg viewBox="0 0 310 110" className="chart-svg">
              <polyline points={buildSeriesPoints(trendData, "temperature")} className="temp-line" />
              <polyline points={buildSeriesPoints(trendData, "gas_level")} className="gas-line" />
              <polyline points={buildSeriesPoints(trendData, "vibration")} className="vibration-line" />
            </svg>
            <p className="legend">Orange: Temperature • Yellow: Gas • Red: Vibration</p>
          </article>
        </section>
      </main>

      <section className="demo-controls">
        <h4>Demo Controls</h4>
        <button type="button" onClick={() => sendDemoReading({ fall_detected: true, accel_z: 24000 })}>
          Simulate Fall
        </button>
        <button type="button" onClick={() => sendDemoReading({ gas_level: 1600 })}>
          Simulate Gas Spike
        </button>
        <button type="button" onClick={() => sendDemoReading({ temperature: 45.5 })}>
          Simulate High Temp
        </button>
        <button type="button" onClick={() => sendDemoReading(basePayload)}>
          Reset to Normal
        </button>
      </section>
    </div>
  );
}
