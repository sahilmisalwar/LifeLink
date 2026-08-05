# LifeLink Smart Helmet Dashboard

**Real-time worker safety monitoring for underground mines and confined environments, powered by a sensor-equipped smart helmet and a live control-room dashboard.**

![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-3ECF8E?logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## Overview

Underground mining, tunneling, and confined-space operations expose workers to invisible dangers — toxic gas buildup, extreme heat, sudden impacts, cardiac distress, and disorientation in complex tunnel networks. Traditional safety systems rely on periodic manual checks and static alarms that respond too late to prevent harm.

**LifeLink** addresses this gap with a wearable smart helmet that continuously streams environmental and biometric sensor data over LoRa/BLE to a cloud-connected gateway. The companion **Dashboard** consumes this data in real time via Supabase Realtime subscriptions and presents it as an operator-facing monitoring console — complete with live KPI cards, a cinematic surveillance-style tunnel map showing the worker's RSSI-derived position, automated status escalation, rescue route guidance, environmental trend analysis, and a full alert history.

The system is designed for safety officers and control room operators who need to monitor worker status at a glance, detect hazardous conditions the moment they arise, and coordinate emergency response with clear situational awareness — including which tunnel path leads to the worker's last known position.

---

## Key Features

### Real-Time Monitoring
- Live sensor readings via Supabase Realtime (Postgres INSERT subscriptions)
- Six tracked metrics: **Temperature**, **Gas Level** (MQ-series), **Impact Force** (FSR), **Heart Rate**, **SpO₂**, and **RSSI** (signal strength / position proxy)
- Per-sensor status classification with configurable warning and emergency thresholds

### Surveillance Tunnel Map
- Cinematic SVG-rendered tunnel visualization with multi-layer glow, rock-edge texture, and atmospheric haze
- Smooth **RSSI-driven worker position tracking** along a continuous path using `getPointAtLength()`, with trend-based prediction that keeps the worker dot drifting between infrequent LoRa packets
- Animated **rescue route** that appears automatically during warning/emergency states with directional green glow
- Hazard zone overlay with dynamic contour and severity-dependent coloring
- HUD elements: compass, scale bar, zone region watermarks, entrance portal badge

### Emergency Response System
- Automatic **status escalation** (`normal` → `warning` → `emergency`) based on configurable thresholds for each sensor
- Global emergency mode with synchronized UI response: pulsing alarm banner, activated rescue path, red-shifted hazard zone, and audio siren
- Fall detection treated as an immediate emergency trigger
- Heart rate uses dual-sided thresholds (both critically low and critically high)

### Alerts & History
- **Dashboard card**: shows the 5 most recent alerts from a rolling 10-alert buffer
- **Dedicated Alerts page**: fetches up to 100 historical alerts independently, merged with live-pushed updates and deduplicated
- Client-side severity filtering (All / Warning / Emergency) with stats summary chips
- Sidebar navigation switches between views without a routing library

### Environmental Trends
- Time-series trend visualization (via Recharts) for temperature, gas level, force, and heart rate
- Threshold guide lines overlaid on charts for instant visual context
- Trend direction indicators showing whether each metric is rising, falling, or stable

### Demo & Testing Tools
- **Floating demo controls panel** (bottom-right FAB) for simulating scenarios without live hardware:
  - One-click presets: gas leak, fall detection, heart rate emergency, weak signal
  - Manual slider overrides for each sensor value
  - Demo/live mode toggle with visual badge indicator
- All dashboard components respond identically to demo data and real data

### Polished UX & Cinematic Animations
- **Cinematic splash screen** with animated logo, drawing ECG heartbeat path, and sequential status checklist.
- **Advanced 4-phase transition** (splash → exiting → revealing → dashboard): Pre-renders the dashboard hidden in the background while the splash exits, followed by a smooth 1-second fade and scale reveal to ensure zero stutter.
- Dark **glassmorphism design system** throughout — gradient backgrounds, blur-backed panels, glowing accents
- WebGL animated gradient wave background (via `GradientWave` component) utilizing dynamic mesh deformation.
- Responsive layout with sidebar collapse on narrow viewports

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Create React App) |
| Charts | Recharts |
| Icons | Lucide React |
| Backend / Database | Supabase (PostgreSQL + Realtime subscriptions) |
| Hosting | Vercel |
| Styling | Custom CSS — dark glassmorphism design system (no utility framework in production styles) |
| Hardware | ESP32 microcontroller + LoRa gateway, MQ-series gas sensor, FSR (force-sensitive resistor), MAX30102 (heart rate / SpO₂), temperature sensor, BLE/RSSI for indoor positioning *(see note below)* |

> **Hardware note:** The exact sensor models and wiring schematic are maintained separately in the hardware documentation. The dashboard is hardware-agnostic — it consumes any data written to the `sensor_readings` table in the expected schema.

---

## Project Structure

```
SmartHelmet/
├── README.md
└── Software/
    ├── public/                  # Static assets (index.html, sounds, icons)
    ├── package.json
    └── src/
        ├── components/          # Reusable UI components (22 files)
        │   ├── ActiveAlarmBanner.jsx
        │   ├── AlertsCard.jsx
        │   ├── DemoControlsPanel.jsx
        │   ├── EnvironmentalTrendsPanel.jsx
        │   ├── Header.jsx
        │   ├── LiveDebugPanel.jsx
        │   ├── SensorCard.jsx
        │   ├── SensorTrendsCard.jsx
        │   ├── Sidebar.jsx
        │   ├── SplashScreen.jsx
        │   ├── SurveillanceTunnelMap.jsx
        │   ├── WorkerStatusCard.jsx
        │   └── ui/
        │       └── GradientWave.jsx
        ├── pages/               # Page-level views
        │   ├── Dashboard.jsx        # Main layout + view switcher
        │   ├── AlertsPage.jsx       # Full alert history view
        │   ├── TunnelMapPage.jsx    # Dedicated tunnel map view
        │   └── AnalyticsPage.jsx    # Analytics / settings view
        ├── hooks/               # Custom React hooks
        │   └── useLiveData.js       # Realtime data subscription hook
        ├── services/            # API and Supabase client
        │   └── api.js               # All data fetching, subscriptions, and derived logic
        ├── styles/              # Component-scoped CSS files (26 files)
        │   ├── global.css
        │   ├── Dashboard.css
        │   ├── SurveillanceTunnelMap.css
        │   ├── AlertsPage.css
        │   ├── DemoControlsPanel.css
        │   ├── SplashScreen.css
        │   └── ...                  # One .css per component
        ├── utils/               # Constants and helpers
        │   └── constants.js         # Thresholds, zone maps, status logic
        ├── App.jsx              # Root component (handles cinematic splash transitions)
        └── index.js             # React entry point
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 16 and **npm** ≥ 8
- A **Supabase** project (free tier works)

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/LifeLink.git
cd "LifeLink/SmartHelmet/Software"
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

Create the following tables in your Supabase project:

**`sensor_readings`**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` (PK, default) | Auto-generated |
| `worker_id` | `text` | e.g. `W001` |
| `temperature` | `float8` | Celsius |
| `gas_level` | `float8` | ppm (MQ-series analog) |
| `force` | `float8` | Newtons (FSR reading) |
| `heart_rate` | `float8` | bpm |
| `spo2` | `float8` | % blood oxygen |
| `rssi` | `float8` | dBm (signal strength) |
| `fall_detected` | `boolean` | `true` if impact event |
| `created_at` | `timestamptz` | Auto-generated |

**`alerts`**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` (PK, default) | Auto-generated |
| `worker_id` | `text` | e.g. `W001` |
| `severity` | `text` | `warning` or `emergency` |
| `alert_type` | `text` | Description of the alert |
| `created_at` | `timestamptz` | Auto-generated |

**`workers`**

| Column | Type | Notes |
|---|---|---|
| `worker_id` | `text` (PK) | e.g. `W001` |
| `name` | `text` | Display name |
| `status` | `text` | Current status |

> Enable **Realtime** on both `sensor_readings` and `alerts` tables in the Supabase dashboard (Database → Replication).

### 4. Configure environment

The current codebase reads Supabase credentials directly from `src/utils/constants.js`. For production, extract these into environment variables:

```env
# .env (create in Software/ root)
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Run locally

**Option A (Standard)**
```bash
npm start
```
The app will open at `http://localhost:3000` (or the next available port).

**Option B (If Port 3000 is occupied)**
If you receive an error that something is running on port 3000, start the application on port 3001 using:
* In Windows Command Prompt (CMD): `set PORT=3001 && npm start`
* In Windows PowerShell: `$env:PORT="3001"; npm start`
* In macOS / Linux: `PORT=3001 npm start`

### 6. Build for production

```bash
npm run build
```

Output is written to `Software/build/`.

---

## Deployment

The dashboard is deployed on **Vercel** with automatic redeployment on push.

1. Connect your GitHub repository to a Vercel project
2. Set the **Root Directory** to `SmartHelmet/Software`
3. Set the **Build Command** to `npm run build` and **Output Directory** to `build`
4. Add environment variables (`REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`) in the Vercel project settings under **Settings → Environment Variables**
5. Every push to the connected branch triggers an automatic production build and deploy

---

## Status Logic Reference

The dashboard classifies each sensor reading into `normal`, `warning`, or `emergency` status using the thresholds defined in `src/utils/constants.js`. The global worker status is the **highest severity** across all sensors.

### Sensor Thresholds

| Metric | Warning | Emergency |
|---|---|---|
| Temperature | ≥ 30 °C | ≥ 34 °C |
| Gas Level | ≥ 1,000 ppm | ≥ 2,000 ppm |
| Impact Force | ≥ 17,000 N | ≥ 20,000 N |
| Heart Rate (high) | ≥ 120 bpm | ≥ 150 bpm |
| Heart Rate (low) | ≤ 50 bpm | ≤ 40 bpm |
| SpO₂ | ≤ 94% | ≤ 90% |
| Fall Detected | — | `true` (immediate emergency) |

### RSSI Zone Mapping

| RSSI Threshold | Mapped Zone |
|---|---|
| ≥ −55 dBm | Entrance |
| ≥ −84 dBm | Main Junction |
| ≥ −104 dBm | East Junction |
| < −104 dBm | Zone D |

**Continuous positioning range:** RSSI values between −40 dBm (entrance, 0%) and −120 dBm (farthest point, 100%) are linearly mapped to a position along the main tunnel path.

---

## License

This project is licensed under the **MIT License** — see [LICENSE](./LICENSE) for details.
