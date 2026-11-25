import asyncio
import json
from typing import Any, Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from ..models.telemetry import (
    CommandRequest,
    ModeRequest,
    RobotStatus,
    SensorReading,
    SimulationControlRequest,
)
from ..services.robot_manager import robot_manager

router = APIRouter()


@router.get("/health")
async def health_check():
    """System health check endpoint."""
    return {
        "status": "healthy",
        "service": "Autonomous Obstacle Avoiding Robot API",
        "simulation_running": robot_manager.is_running,
        "robot_mode": robot_manager.mode,
        "active_scenario": robot_manager.active_scenario,
    }


@router.get("/robot/status", response_model=RobotStatus)
async def get_robot_status():
    """Return full state and telemetry of the autonomous robot."""
    return robot_manager.get_status()


@router.get("/sensors", response_model=SensorReading)
async def get_sensor_readings():
    """Return latest front, left, right ultrasonic readings."""
    return robot_manager.sensor_reading


@router.get("/environment")
async def get_environment():
    """Return current obstacles and dimensions."""
    return {
        "width": robot_manager.canvas_width,
        "height": robot_manager.canvas_height,
        "scenario": robot_manager.active_scenario,
        "obstacles": robot_manager.obstacles,
    }


@router.post("/environment/scenario")
async def set_environment_scenario(req: Dict[str, str]):
    """Switch active scenario (Open Space, Single Obstacle, Multiple Obstacles, etc.)."""
    scenario = req.get("scenario")
    if not scenario:
        raise HTTPException(status_code=400, detail="Missing scenario parameter")
    robot_manager.load_scenario(scenario)
    return {"status": "success", "active_scenario": robot_manager.active_scenario}


@router.post("/environment/obstacles")
async def update_obstacles(obstacles: List[Dict[str, Any]]):
    """Update custom obstacle layout from Environment Editor."""
    robot_manager.obstacles = obstacles
    robot_manager.active_scenario = "Custom Environment"
    robot_manager.log_event("INFO", "ENVIRONMENT", f"Updated custom obstacle layout ({len(obstacles)} objects)")
    return {"status": "success", "obstacle_count": len(obstacles)}


@router.post("/robot/mode")
async def set_robot_mode(req: ModeRequest):
    """Switch between AUTONOMOUS and MANUAL operation."""
    mode = req.mode.upper()
    if mode not in ("AUTONOMOUS", "MANUAL"):
        raise HTTPException(status_code=400, detail="Mode must be 'AUTONOMOUS' or 'MANUAL'")
    robot_manager.mode = mode
    robot_manager.log_event("INFO", "ROBOT", f"Control mode switched to {mode}")
    return {"status": "success", "mode": robot_manager.mode}


@router.post("/robot/command")
async def send_robot_command(req: CommandRequest):
    """Manual motion commands (FORWARD, REVERSE, LEFT, RIGHT, STOP, RESET, EMERGENCY_STOP)."""
    robot_manager.handle_manual_command(req.action, req.linear_speed, req.angular_speed)
    return {"status": "command_received", "action": req.action}


@router.post("/simulation/start")
async def start_simulation():
    """Start or unpause simulation execution."""
    robot_manager.is_running = True
    robot_manager.log_event("INFO", "SIMULATION", "Simulation started.")
    return {"status": "running", "is_running": True}


@router.post("/simulation/pause")
async def pause_simulation():
    """Pause simulation execution."""
    robot_manager.is_running = False
    robot_manager.log_event("INFO", "SIMULATION", "Simulation paused.")
    return {"status": "paused", "is_running": False}


@router.post("/simulation/reset")
async def reset_simulation():
    """Reset robot pose and environment."""
    robot_manager.reset_simulation()
    return {"status": "reset", "robot_status": robot_manager.get_status()}


@router.post("/simulation/speed")
async def set_simulation_speed(req: Dict[str, float]):
    """Set simulation speed multiplier (0.5x, 1x, 1.5x, 2x)."""
    multiplier = req.get("multiplier", 1.0)
    robot_manager.speed_multiplier = max(0.25, min(4.0, multiplier))
    robot_manager.log_event("INFO", "SIMULATION", f"Simulation speed set to {multiplier}x")
    return {"status": "success", "speed_multiplier": robot_manager.speed_multiplier}


@router.get("/logs")
async def get_activity_logs():
    """Return historical system and navigation activity logs."""
    return {"logs": robot_manager.activity_logs}


@router.delete("/logs")
async def clear_activity_logs():
    """Clear activity logs."""
    robot_manager.activity_logs.clear()
    return {"status": "cleared"}


@router.websocket("/ws/robot")
async def websocket_robot_telemetry(websocket: WebSocket):
    """
    WebSocket endpoint broadcasting real-time robot state and receiving manual commands.
    """
    await websocket.accept()
    robot_manager.connected_websockets.add(websocket)
    try:
        while True:
            # Send current telemetry snapshot
            telemetry_data = robot_manager.get_status().model_dump()
            await websocket.send_text(json.dumps(telemetry_data))

            # Non-blocking receive or brief interval (30 Hz rate)
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=0.033)
                data = json.loads(msg)
                action = data.get("action")
                if action:
                    robot_manager.handle_manual_command(
                        action,
                        data.get("linear_speed"),
                        data.get("angular_speed"),
                    )
                if "mode" in data:
                    robot_manager.mode = data["mode"]
            except asyncio.TimeoutError:
                pass
    except WebSocketDisconnect:
        pass
    except Exception as e:
        pass
    finally:
        robot_manager.connected_websockets.discard(websocket)
