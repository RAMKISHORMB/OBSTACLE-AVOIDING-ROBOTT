import pytest
from starlette.testclient import TestClient
from backend.app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "simulation_running" in data


def test_status_endpoint(client):
    response = client.get("/api/robot/status")
    assert response.status_code == 200
    data = response.json()
    assert "position" in data
    assert "sensors" in data
    assert "motors" in data
    assert "state" in data


def test_sensors_endpoint(client):
    response = client.get("/api/sensors")
    assert response.status_code == 200
    data = response.json()
    assert "front_distance_cm" in data
    assert "zone" in data


def test_mode_and_commands(client):
    # Set to manual
    res = client.post("/api/robot/mode", json={"mode": "MANUAL"})
    assert res.status_code == 200
    assert res.json()["mode"] == "MANUAL"

    # Send command
    cmd_res = client.post("/api/robot/command", json={"action": "FORWARD", "linear_speed": 0.8})
    assert cmd_res.status_code == 200

    # Pause simulation
    pause_res = client.post("/api/simulation/pause")
    assert pause_res.status_code == 200
    assert pause_res.json()["is_running"] is False

    # Start simulation
    start_res = client.post("/api/simulation/start")
    assert start_res.status_code == 200
    assert start_res.json()["is_running"] is True

    # Reset simulation
    reset_res = client.post("/api/simulation/reset")
    assert reset_res.status_code == 200
