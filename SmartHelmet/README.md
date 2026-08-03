# LifeLink — Underground Mine Worker Safety Monitor

Real-time safety monitoring dashboard for underground mine workers using IoT-enabled smart helmets.

## Tech Stack

- **Frontend:** React 18, Recharts, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Realtime)
- **Sensors:** Temperature, Gas (MQ-135), Force (FSR), BLE RSSI

## Project Structure

```
SmartHelmet/
├── Software/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Page-level layouts
│   │   ├── services/         # API and Supabase client
│   │   ├── styles/           # Component-specific CSS files
│   │   ├── utils/            # Constants and helpers
│   │   ├── App.jsx           # Root component
│   │   └── index.js          # React entry point
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## Getting Started

```bash
cd SmartHelmet/Software
npm install
npm start
```

## Architecture Rules

1. HTML, CSS, and React logic are always in separate files
2. Each component gets its own `.jsx` file
3. Each component's CSS goes in its matching `.css` file in `styles/`
4. All API calls go in `services/api.js`
5. No inline `style={{}}` — all styling through CSS classes

## Phases

- **Phase 1:** Project scaffold and configuration ✅
- **Phase 2:** UI component implementation
- **Phase 3:** Supabase database schema and integration
- **Phase 4:** Real-time data, live charts, and demo controls
