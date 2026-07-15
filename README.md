# LifeLink / TunnelSafe

Complete IoT-based underground worker safety monitoring solution with ESP32 firmware, FastAPI backend, and React dashboard.

## Project structure

- `/home/runner/work/LifeLink/LifeLink/tunnelsafe-backend/main.py`
- `/home/runner/work/LifeLink/LifeLink/tunnelsafe-frontend/src/App.jsx`
- `/home/runner/work/LifeLink/LifeLink/tunnelsafe-frontend/src/useSensorPolling.js`
- `/home/runner/work/LifeLink/LifeLink/tunnelsafe-frontend/src/index.css`
- `/home/runner/work/LifeLink/LifeLink/tunnelsafe-frontend/package.json`
- `/home/runner/work/LifeLink/LifeLink/tunnelsafe-firmware/TunnelSafe_ESP32.ino`

## Backend setup (FastAPI)

1. Open terminal in `/home/runner/work/LifeLink/LifeLink/tunnelsafe-backend`
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install fastapi uvicorn networkx
   ```
4. Run backend:
   ```bash
   python main.py
   ```
5. Backend starts on `0.0.0.0:8000`

## Frontend setup (React)

1. Open terminal in `/home/runner/work/LifeLink/LifeLink/tunnelsafe-frontend`
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start frontend dev server:
   ```bash
   npm run dev
   ```
4. Optional: set custom API URL before starting frontend:
   ```bash
   export VITE_API_BASE_URL=http://<YOUR_IP>:8000
   ```

## Find laptop IP address and configure firmware

### Linux/macOS
```bash
ip addr show | grep "inet "
```

### Windows (PowerShell)
```powershell
ipconfig
```

Then edit these constants in `/home/runner/work/LifeLink/LifeLink/tunnelsafe-firmware/TunnelSafe_ESP32.ino`:
- `WIFI_SSID`
- `WIFI_PASSWORD`
- `BACKEND_URL` (example: `http://192.168.1.15:8000/sensor-data`)

## Arduino libraries to install

Install these via Arduino Library Manager:
- `ArduinoJson`
- `OneWire`
- `DallasTemperature`
- `MPU6050` (Electronic Cats or compatible)

ESP32 board support package is also required in Arduino IDE (`ESP32 by Espressif Systems`).

## Upload firmware to ESP32

1. Connect ESP32 DevKit V1 by USB
2. Open `/home/runner/work/LifeLink/LifeLink/tunnelsafe-firmware/TunnelSafe_ESP32.ino` in Arduino IDE
3. Select board: **ESP32 Dev Module**
4. Select correct serial port
5. Click **Upload**
6. Open Serial Monitor at `115200` baud to watch telemetry and HTTP status

## Test without ESP32 (Demo Controls)

1. Start backend and frontend.
2. Open dashboard UI.
3. Use floating **Demo Controls** panel (bottom-right):
   - **Simulate Fall**
   - **Simulate Gas Spike**
   - **Simulate High Temp**
   - **Reset to Normal**
4. Verify emergency banner, KPI color changes, alert generation, and rescue path highlighting.
