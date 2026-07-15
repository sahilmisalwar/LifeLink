from collections import deque
from datetime import datetime, timezone
from math import sqrt
from typing import Any, Dict, List

import networkx as nx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="LifeLink / TunnelSafe API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

latest_reading: Dict[str, Any] = {}
alerts: deque = deque(maxlen=50)

tunnel_graph = nx.Graph()
tunnel_graph.add_weighted_edges_from(
    [
        ("Entrance", "Main Junction", 100),
        ("Main Junction", "West Junction", 120),
        ("Main Junction", "East Junction", 110),
        ("West Junction", "Zone A", 70),
        ("East Junction", "Zone B", 80),
        ("West Junction", "Zone C", 100),
        ("East Junction", "Zone C", 140),
    ]
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def detect_status(payload: Dict[str, Any]) -> Dict[str, Any]:
    accel_x = float(payload.get("accel_x", 0.0))
    accel_y = float(payload.get("accel_y", 0.0))
    accel_z = float(payload.get("accel_z", 0.0))
    total_force = sqrt(accel_x**2 + accel_y**2 + accel_z**2)

    gas_level = float(payload.get("gas_level", 0.0))
    temperature = float(payload.get("temperature", 0.0))
    fall_detected = bool(payload.get("fall_detected", False))

    emergency_reasons: List[str] = []
    warning_reasons: List[str] = []

    if fall_detected:
        emergency_reasons.append("Fall detected")
    if gas_level > 1200:
        emergency_reasons.append("Gas level above emergency threshold")
    if temperature > 40:
        emergency_reasons.append("Temperature above emergency threshold")
    if total_force > 17000:
        emergency_reasons.append("Vibration force above emergency threshold")

    if gas_level > 800:
        warning_reasons.append("Gas level above warning threshold")
    if temperature > 38:
        warning_reasons.append("Temperature above warning threshold")
    if total_force > 12000:
        warning_reasons.append("Vibration force above warning threshold")

    status = "normal"
    trigger_reason = ""

    if emergency_reasons:
        status = "emergency"
        trigger_reason = ", ".join(emergency_reasons)
    elif warning_reasons:
        status = "warning"
        trigger_reason = ", ".join(warning_reasons)

    return {
        "totalForce": round(total_force, 2),
        "status": status,
        "trigger_reason": trigger_reason,
    }


@app.post("/sensor-data")
def post_sensor_data(payload: Dict[str, Any]) -> Dict[str, Any]:
    global latest_reading

    worker_id = payload.get("worker_id")
    if not worker_id:
        raise HTTPException(status_code=400, detail="worker_id is required")

    evaluation = detect_status(payload)
    reading = {
        **payload,
        "status": evaluation["status"],
        "totalForce": evaluation["totalForce"],
        "timestamp": now_iso(),
    }
    latest_reading = reading

    if evaluation["status"] == "emergency":
        alerts.append(
            {
                "timestamp": reading["timestamp"],
                "worker_id": worker_id,
                "trigger_reason": evaluation["trigger_reason"],
                "severity": "emergency",
            }
        )

    return {
        "message": "sensor data received",
        "status": reading["status"],
        "totalForce": reading["totalForce"],
    }


@app.get("/latest")
def get_latest() -> Dict[str, Any]:
    return latest_reading


@app.get("/alerts")
def get_alerts() -> List[Dict[str, Any]]:
    return list(reversed(alerts))


@app.get("/path")
def get_path(worker_zone: str = Query(default="Zone C")) -> Dict[str, Any]:
    start = "Entrance"
    if worker_zone not in tunnel_graph.nodes:
        raise HTTPException(status_code=400, detail="Unknown worker zone")

    path = nx.shortest_path(tunnel_graph, source=start, target=worker_zone, weight="weight")
    total_distance = int(
        nx.shortest_path_length(tunnel_graph, source=start, target=worker_zone, weight="weight")
    )
    estimated_minutes = total_distance / 84

    return {
        "path": path,
        "total_distance": total_distance,
        "estimated_time": f"{estimated_minutes:.1f} minutes",
        "worker_zone": worker_zone,
    }


@app.get("/status")
def get_status() -> Dict[str, Any]:
    return {
        "status": "ok",
        "service": "LifeLink TunnelSafe Backend",
        "timestamp": now_iso(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
