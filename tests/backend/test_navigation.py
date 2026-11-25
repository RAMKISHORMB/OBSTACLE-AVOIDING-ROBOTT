import pytest
from backend.app.models.navigation import NavigationState, SensorZone
from backend.app.services.robot_manager import RobotSimulationManager
from backend.app.core.config import settings


def test_robot_manager_initialization():
    manager = RobotSimulationManager()
    assert manager.mode == "AUTONOMOUS"
    assert manager.state == NavigationState.IDLE
    assert len(manager.obstacles) > 0


def test_measure_distance_and_zone():
    manager = RobotSimulationManager()
    manager.load_scenario("Single Obstacle")
    
    # In Single Obstacle scenario, robot is at (200, 300) pointing right (0 rad), obstacle is at (450, 250)
    dist = manager.measure_distance(0.0)
    assert dist > 0
    assert dist < settings.SENSOR_MAX_RANGE_CM

    # Test zone evaluation
    assert manager.evaluate_zone(50.0) == SensorZone.SAFE
    assert manager.evaluate_zone(30.0) == SensorZone.CAUTION
    assert manager.evaluate_zone(15.0) == SensorZone.AVOIDANCE
    assert manager.evaluate_zone(5.0) == SensorZone.EMERGENCY


def test_navigation_state_transitions():
    manager = RobotSimulationManager()
    manager.load_scenario("Single Obstacle")
    manager.is_running = True
    manager.state = NavigationState.INITIALIZING
    
    # Step past initialization timer
    manager.step(0.6)
    assert manager.state == NavigationState.MOVING_FORWARD
    assert manager.target_linear_velocity > 0


def test_manual_mode_commands():
    manager = RobotSimulationManager()
    manager.mode = "MANUAL"
    
    manager.handle_manual_command("FORWARD")
    assert manager.target_linear_velocity > 0
    assert manager.target_angular_velocity == 0.0

    manager.handle_manual_command("LEFT")
    assert manager.target_angular_velocity < 0

    manager.handle_manual_command("STOP")
    assert manager.target_linear_velocity == 0.0
    assert manager.target_angular_velocity == 0.0

    manager.handle_manual_command("EMERGENCY_STOP")
    assert manager.emergency_stop is True


def test_collision_detection():
    manager = RobotSimulationManager()
    manager.load_scenario("Single Obstacle")
    # Place robot inside or right at the obstacle
    manager.x = 460.0
    manager.y = 260.0
    assert manager.check_robot_collision() is True
