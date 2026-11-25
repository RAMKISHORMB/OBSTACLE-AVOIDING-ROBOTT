import asyncio
import math
import time
from typing import Any, Dict, List, Optional, Set
from fastapi import WebSocket

from ..core.config import settings
from ..models.navigation import NavigationState, SensorZone, ClearanceEvaluation
from ..models.telemetry import (
    MotorState,
    RobotPosition,
    RobotStatus,
    SensorReading,
)
from .kinematics import (
    DifferentialDriveKinematics,
    line_segment_intersection,
    raycast_against_box,
)


class RobotSimulationManager:
    """
    Authoritative simulation state and autonomous navigation logic coordinator.
    Manages kinematic physics, obstacle raycasting, state machine, and WebSocket subscriptions.
    """

    def __init__(self):
        self.kinematics = DifferentialDriveKinematics()
        self.connected_websockets: Set[WebSocket] = set()

        # Canvas Dimensions (Default 800 x 600 px, scale 1 px = 0.5 cm -> 1 cm = 2 px)
        self.canvas_width = 800.0
        self.canvas_height = 600.0
        self.cm_to_px = 2.0  # 50 cm = 100 px

        # Robot Physical Dimensions
        self.robot_radius = 24.0  # ~12 cm radius
        self.robot_wheel_distance = 32.0

        # State Variables
        self.is_running = True
        self.mode = "AUTONOMOUS"  # 'AUTONOMOUS' or 'MANUAL'
        self.state = NavigationState.IDLE
        self.state_timer = 0.0
        self.uptime_sec = 0.0
        self.start_time = time.time()
        self.last_update_time = time.time()

        # Pose & Velocities
        self.x = 400.0
        self.y = 300.0
        self.heading_rad = 0.0  # Facing East (Right)
        self.linear_velocity = 0.0
        self.angular_velocity = 0.0
        self.target_linear_velocity = 0.0
        self.target_angular_velocity = 0.0

        # Motor Simulation
        self.motor_state = MotorState()

        # Sensor Simulation
        self.servo_angle_deg = 0.0
        self.sensor_reading = SensorReading(
            front_distance_cm=150.0,
            left_distance_cm=150.0,
            right_distance_cm=150.0,
            servo_angle_deg=0.0,
            zone=SensorZone.SAFE,
            is_scanning=False,
            timestamp=time.time(),
        )

        # Autonomous Navigation Internal Memory
        self.scan_left_reading = 150.0
        self.scan_right_reading = 150.0
        self.last_turn_direction: Optional[str] = None
        self.turn_count_same_dir = 0
        self.reverse_duration = 0.0
        self.turn_duration = 0.0
        self.target_heading_rad = 0.0
        self.oscillation_counter = 0

        # Environment & Obstacles
        self.active_scenario = "Multiple Obstacles"
        self.obstacles: List[Dict[str, float]] = []
        self.collision_count = 0
        self.emergency_stop = False
        self.speed_multiplier = 1.0

        # History and logs
        self.activity_logs: List[Dict[str, Any]] = []

        # Initialize Default Scenario
        self.load_scenario("Multiple Obstacles")

    def log_event(self, level: str, subsystem: str, message: str):
        """Append an activity log entry with timestamp."""
        entry = {
            "id": len(self.activity_logs) + 1,
            "timestamp": round(time.time(), 3),
            "level": level,  # 'INFO', 'WARN', 'ERROR', 'NAV', 'SENSOR'
            "subsystem": subsystem,
            "message": message,
        }
        self.activity_logs.append(entry)
        if len(self.activity_logs) > 500:
            self.activity_logs.pop(0)

    def load_scenario(self, scenario_name: str):
        """Load standard predefined obstacle environments."""
        self.active_scenario = scenario_name
        self.obstacles.clear()

        # Canvas boundary walls are standard
        pad = 20.0
        w = self.canvas_width
        h = self.canvas_height

        # Outer walls
        self.obstacles.append({"x": 0, "y": 0, "width": w, "height": pad, "type": "wall"})
        self.obstacles.append({"x": 0, "y": h - pad, "width": w, "height": pad, "type": "wall"})
        self.obstacles.append({"x": 0, "y": 0, "width": pad, "height": h, "type": "wall"})
        self.obstacles.append({"x": w - pad, "y": 0, "width": pad, "height": h, "type": "wall"})

        if scenario_name == "Open Space":
            self.x, self.y = 400.0, 300.0
            self.heading_rad = 0.0

        elif scenario_name == "Single Obstacle":
            self.obstacles.append({"x": 450, "y": 250, "width": 80, "height": 100, "type": "box"})
            self.x, self.y = 200.0, 300.0
            self.heading_rad = 0.0

        elif scenario_name == "Multiple Obstacles":
            self.obstacles.append({"x": 220, "y": 140, "width": 60, "height": 140, "type": "box"})
            self.obstacles.append({"x": 480, "y": 100, "width": 80, "height": 90, "type": "box"})
            self.obstacles.append({"x": 340, "y": 320, "width": 120, "height": 60, "type": "box"})
            self.obstacles.append({"x": 580, "y": 360, "width": 70, "height": 130, "type": "box"})
            self.obstacles.append({"x": 160, "y": 420, "width": 100, "height": 70, "type": "box"})
            self.x, self.y = 120.0, 200.0
            self.heading_rad = 0.2

        elif scenario_name == "Narrow Corridor":
            # Two long horizontal walls creating a narrow 100px corridor
            self.obstacles.append({"x": 100, "y": 200, "width": 550, "height": 30, "type": "wall"})
            self.obstacles.append({"x": 100, "y": 340, "width": 550, "height": 30, "type": "wall"})
            self.obstacles.append({"x": 620, "y": 230, "width": 30, "height": 80, "type": "box"})  # Baffle
            self.x, self.y = 140.0, 270.0
            self.heading_rad = 0.0

        elif scenario_name == "Complex Maze":
            self.obstacles.append({"x": 180, "y": 20, "width": 25, "height": 260, "type": "wall"})
            self.obstacles.append({"x": 180, "y": 380, "width": 25, "height": 200, "type": "wall"})
            self.obstacles.append({"x": 360, "y": 120, "width": 25, "height": 340, "type": "wall"})
            self.obstacles.append({"x": 520, "y": 20, "width": 25, "height": 280, "type": "wall"})
            self.obstacles.append({"x": 520, "y": 400, "width": 25, "height": 180, "type": "wall"})
            self.obstacles.append({"x": 360, "y": 460, "width": 160, "height": 25, "type": "wall"})
            self.x, self.y = 90.0, 90.0
            self.heading_rad = 0.0

        elif scenario_name == "Dead-End Recovery":
            # U-shaped cul-de-sac
            self.obstacles.append({"x": 300, "y": 180, "width": 240, "height": 25, "type": "wall"})  # Top
            self.obstacles.append({"x": 300, "y": 380, "width": 240, "height": 25, "type": "wall"})  # Bottom
            self.obstacles.append({"x": 515, "y": 180, "width": 25, "height": 225, "type": "wall"})  # Back wall
            self.x, self.y = 350.0, 280.0
            self.heading_rad = 0.0

        self.state = NavigationState.IDLE
        self.emergency_stop = False
        self.log_event("INFO", "SIMULATION", f"Scenario loaded: {scenario_name}")

    def measure_distance(self, angle_offset_deg: float = 0.0) -> float:
        """
        Raycasts from front ultrasonic sensor along heading + angle_offset_deg.
        Returns distance in centimeters.
        """
        total_angle_rad = self.heading_rad + math.radians(angle_offset_deg)
        sensor_offset = self.robot_radius * 0.9  # Placed at front of chassis
        ox = self.x + math.cos(self.heading_rad) * sensor_offset
        oy = self.y + math.sin(self.heading_rad) * sensor_offset

        # Ray reach
        max_dist_px = settings.SENSOR_MAX_RANGE_CM * self.cm_to_px
        ex = ox + math.cos(total_angle_rad) * max_dist_px
        ey = oy + math.sin(total_angle_rad) * max_dist_px

        closest_dist_px = max_dist_px

        for box in self.obstacles:
            hit = raycast_against_box((ox, oy), (ex, ey), box)
            if hit is not None:
                hx, hy, t = hit
                dist_px = t * max_dist_px
                if dist_px < closest_dist_px:
                    closest_dist_px = dist_px

        dist_cm = closest_dist_px / self.cm_to_px
        # Add realistic sensor acoustic floor
        return max(settings.SENSOR_MIN_RANGE_CM, round(dist_cm, 1))

    def evaluate_zone(self, distance_cm: float) -> SensorZone:
        """
        Map distance to safety classification zone:
        - Safe: above 40 cm
        - Caution: 20-40 cm
        - Avoidance: 10-20 cm
        - Emergency: below 10 cm
        """
        if distance_cm < settings.EMERGENCY_STOP_DISTANCE_CM:
            return SensorZone.EMERGENCY
        elif distance_cm < settings.AVOIDANCE_DISTANCE_CM:
            return SensorZone.AVOIDANCE
        elif distance_cm < settings.SAFE_DISTANCE_CM:
            return SensorZone.CAUTION
        return SensorZone.SAFE

    def check_robot_collision(self) -> bool:
        """Checks if circular robot body intersects any obstacle box."""
        for box in self.obstacles:
            bx, by, bw, bh = box["x"], box["y"], box["width"], box["height"]
            # Find closest point on AABB to circle center
            closest_x = max(bx, min(self.x, bx + bw))
            closest_y = max(by, min(self.y, by + bh))

            dx = self.x - closest_x
            dy = self.y - closest_y
            dist_sq = dx * dx + dy * dy

            if dist_sq < (self.robot_radius * self.robot_radius):
                return True
        return False

    def update_autonomous_navigation(self, dt: float):
        """
        Authentic Autonomous Navigation State Machine.
        States:
        INITIALIZING -> IDLE -> MOVING_FORWARD -> OBSTACLE_DETECTED -> EMERGENCY_STOP ->
        SCANNING_LEFT -> SCANNING_RIGHT -> EVALUATING_PATH -> TURNING_LEFT -> TURNING_RIGHT ->
        REVERSING -> VERIFYING_PATH -> RESUMING_MOVEMENT
        """
        self.state_timer += dt
        front_dist = self.measure_distance(0.0)
        self.sensor_reading.front_distance_cm = front_dist
        self.sensor_reading.zone = self.evaluate_zone(front_dist)
        self.sensor_reading.timestamp = time.time()

        # Emergency Stop Check
        if front_dist < settings.EMERGENCY_STOP_DISTANCE_CM and self.state not in (
            NavigationState.REVERSING,
            NavigationState.EMERGENCY_STOP,
        ):
            self.state = NavigationState.EMERGENCY_STOP
            self.state_timer = 0.0
            self.target_linear_velocity = 0.0
            self.target_angular_velocity = 0.0
            self.log_event("ERROR", "SAFETY", f"EMERGENCY STOP engaged! Distance: {front_dist:.1f} cm")
            return

        # State Transitions
        if self.state == NavigationState.INITIALIZING:
            if self.state_timer > 0.5:
                self.state = NavigationState.MOVING_FORWARD
                self.state_timer = 0.0
                self.target_linear_velocity = 70.0
                self.target_angular_velocity = 0.0
                self.log_event("INFO", "NAVIGATION", "Subsystems initialized. Commencing autonomous patrol.")

        elif self.state == NavigationState.IDLE:
            if self.is_running:
                self.state = NavigationState.MOVING_FORWARD
                self.state_timer = 0.0
                self.log_event("INFO", "NAVIGATION", "Resuming forward motion.")

        elif self.state == NavigationState.MOVING_FORWARD:
            self.target_linear_velocity = 70.0  # px/sec (~35 cm/sec)
            self.target_angular_velocity = 0.0
            self.servo_angle_deg = 0.0

            if front_dist <= settings.AVOIDANCE_DISTANCE_CM:
                self.state = NavigationState.OBSTACLE_DETECTED
                self.state_timer = 0.0
                self.target_linear_velocity = 0.0
                self.target_angular_velocity = 0.0
                self.log_event("WARN", "NAVIGATION", f"Obstacle detected at {front_dist:.1f} cm. Halting.")

        elif self.state == NavigationState.OBSTACLE_DETECTED:
            # Settle briefly before starting ultrasonic servo sweep
            if self.state_timer > 0.2:
                self.state = NavigationState.SCANNING_LEFT
                self.state_timer = 0.0
                self.sensor_reading.is_scanning = True
                self.log_event("NAV", "SENSOR", "Beginning left environmental sweep (+60 deg).")

        elif self.state == NavigationState.SCANNING_LEFT:
            self.servo_angle_deg = 60.0
            if self.state_timer > 0.35:
                self.scan_left_reading = self.measure_distance(60.0)
                self.sensor_reading.left_distance_cm = self.scan_left_reading
                self.state = NavigationState.SCANNING_RIGHT
                self.state_timer = 0.0
                self.log_event("NAV", "SENSOR", f"Left clearance measured: {self.scan_left_reading:.1f} cm")

        elif self.state == NavigationState.SCANNING_RIGHT:
            self.servo_angle_deg = -60.0
            if self.state_timer > 0.35:
                self.scan_right_reading = self.measure_distance(-60.0)
                self.sensor_reading.right_distance_cm = self.scan_right_reading
                self.sensor_reading.is_scanning = False
                self.servo_angle_deg = 0.0
                self.state = NavigationState.EVALUATING_PATH
                self.state_timer = 0.0
                self.log_event("NAV", "SENSOR", f"Right clearance measured: {self.scan_right_reading:.1f} cm")

        elif self.state == NavigationState.EVALUATING_PATH:
            left_clear = self.scan_left_reading
            right_clear = self.scan_right_reading
            min_threshold = settings.AVOIDANCE_DISTANCE_CM

            # Dead-end condition: both directions blocked
            if left_clear < min_threshold and right_clear < min_threshold:
                self.state = NavigationState.REVERSING
                self.state_timer = 0.0
                self.reverse_duration = 0.8  # Reverse for 0.8s
                self.log_event("WARN", "NAVIGATION", "Both corridors blocked! Commencing dead-end reverse escape.")
            else:
                # Select safest direction with oscillation prevention
                choose_left = left_clear > right_clear
                
                # Check for rapid oscillation
                if abs(left_clear - right_clear) < 5.0 and self.last_turn_direction is not None:
                    # Break symmetry by preferring previously chosen path or alternating
                    self.oscillation_counter += 1
                    if self.oscillation_counter > 2:
                        choose_left = (self.last_turn_direction == "RIGHT")
                        self.oscillation_counter = 0

                if choose_left:
                    self.state = NavigationState.TURNING_LEFT
                    self.target_heading_rad = (self.heading_rad - (math.pi * 0.45)) % (2.0 * math.pi)
                    self.last_turn_direction = "LEFT"
                    self.log_event("INFO", "NAVIGATION", f"Selected LEFT path (L: {left_clear:.1f} cm vs R: {right_clear:.1f} cm)")
                else:
                    self.state = NavigationState.TURNING_RIGHT
                    self.target_heading_rad = (self.heading_rad + (math.pi * 0.45)) % (2.0 * math.pi)
                    self.last_turn_direction = "RIGHT"
                    self.log_event("INFO", "NAVIGATION", f"Selected RIGHT path (R: {right_clear:.1f} cm vs L: {left_clear:.1f} cm)")

                self.state_timer = 0.0
                self.turn_duration = 0.65

        elif self.state == NavigationState.TURNING_LEFT:
            self.target_linear_velocity = 0.0
            self.target_angular_velocity = -2.2  # rad/s CCW
            if self.state_timer >= self.turn_duration:
                self.target_angular_velocity = 0.0
                self.state = NavigationState.VERIFYING_PATH
                self.state_timer = 0.0
                self.log_event("NAV", "NAVIGATION", "Turning complete. Verifying new corridor clearance.")

        elif self.state == NavigationState.TURNING_RIGHT:
            self.target_linear_velocity = 0.0
            self.target_angular_velocity = 2.2  # rad/s CW
            if self.state_timer >= self.turn_duration:
                self.target_angular_velocity = 0.0
                self.state = NavigationState.VERIFYING_PATH
                self.state_timer = 0.0
                self.log_event("NAV", "NAVIGATION", "Turning complete. Verifying new corridor clearance.")

        elif self.state == NavigationState.REVERSING:
            self.target_linear_velocity = -45.0  # px/s backwards
            self.target_angular_velocity = 0.0
            if self.state_timer >= self.reverse_duration or self.state_timer > 1.2:
                self.target_linear_velocity = 0.0
                self.state = NavigationState.SCANNING_LEFT
                self.state_timer = 0.0
                self.log_event("NAV", "NAVIGATION", "Reverse maneuver finished. Re-evaluating surrounding vectors.")

        elif self.state == NavigationState.VERIFYING_PATH:
            new_front = self.measure_distance(0.0)
            if new_front >= settings.CAUTION_DISTANCE_CM:
                self.state = NavigationState.RESUMING_MOVEMENT
                self.state_timer = 0.0
                self.log_event("INFO", "NAVIGATION", f"Path verified safe ({new_front:.1f} cm). Resuming cruise.")
            else:
                # Still blocked, re-evaluate
                self.state = NavigationState.SCANNING_LEFT
                self.state_timer = 0.0
                self.log_event("WARN", "NAVIGATION", f"New heading still obstructed ({new_front:.1f} cm). Re-scanning.")

        elif self.state == NavigationState.RESUMING_MOVEMENT:
            self.target_linear_velocity = 70.0
            self.target_angular_velocity = 0.0
            if self.state_timer > 0.2:
                self.state = NavigationState.MOVING_FORWARD
                self.state_timer = 0.0

        elif self.state == NavigationState.EMERGENCY_STOP:
            self.target_linear_velocity = 0.0
            self.target_angular_velocity = 0.0
            if self.state_timer > 0.8:
                # Attempt careful recovery
                self.state = NavigationState.REVERSING
                self.state_timer = 0.0
                self.reverse_duration = 0.6
                self.log_event("INFO", "NAVIGATION", "Attempting automated emergency escape reverse.")

    def step(self, dt: float):
        """Advances physics, updates state machine, and simulates motor responses."""
        if not self.is_running:
            self.linear_velocity = 0.0
            self.angular_velocity = 0.0
            self.update_motor_telemetry(0.0, 0.0)
            return

        dt = dt * self.speed_multiplier
        self.uptime_sec = time.time() - self.start_time

        # Update Navigation
        if self.mode == "AUTONOMOUS":
            self.update_autonomous_navigation(dt)

        # Smooth velocity ramping (simulates motor inertia)
        accel_rate = 8.0 * dt
        self.linear_velocity += (self.target_linear_velocity - self.linear_velocity) * min(1.0, accel_rate)
        self.angular_velocity += (self.target_angular_velocity - self.angular_velocity) * min(1.0, accel_rate)

        # Kinematic integration
        old_x, old_y, old_heading = self.x, self.y, self.heading_rad
        new_x, new_y, new_heading = self.kinematics.integrate_pose(
            self.x,
            self.y,
            self.heading_rad,
            self.linear_velocity,
            self.angular_velocity,
            dt,
        )

        self.x = new_x
        self.y = new_y
        self.heading_rad = new_heading

        # Collision prevention boundary
        if self.check_robot_collision():
            # Revert step to prevent clipping
            self.x = old_x
            self.y = old_y
            self.collision_count += 1
            if self.state != NavigationState.REVERSING:
                self.state = NavigationState.EMERGENCY_STOP
                self.state_timer = 0.0
                self.target_linear_velocity = 0.0
                self.log_event("ERROR", "COLLISION", "Collision contact prevented by safety bumper.")

        # Motor RPM and PWM calculation
        v_l, v_r = self.kinematics.compute_wheel_speeds(
            self.linear_velocity / 100.0,
            self.angular_velocity,
        )
        self.update_motor_telemetry(v_l, v_r)

    def update_motor_telemetry(self, v_l: float, v_r: float):
        """Translates wheel speeds to RPM and PWM."""
        left_rpm = self.kinematics.speed_to_rpm(v_l)
        right_rpm = self.kinematics.speed_to_rpm(v_r)
        left_pwm, left_dir = self.kinematics.rpm_to_pwm(left_rpm)
        right_pwm, right_dir = self.kinematics.rpm_to_pwm(right_rpm)

        # Current draw simulation (quiescent ~80mA + motor load)
        curr = 80.0 + (abs(left_pwm) + abs(right_pwm)) * 0.9

        self.motor_state = MotorState(
            left_rpm=round(left_rpm, 1),
            right_rpm=round(right_rpm, 1),
            left_pwm=left_pwm,
            right_pwm=right_pwm,
            left_dir=left_dir,
            right_dir=right_dir,
            current_ma=round(curr, 1),
        )

    def handle_manual_command(self, action: str, linear_speed: Optional[float] = None, angular_speed: Optional[float] = None):
        """Handles manual teleoperation commands."""
        base_speed = 70.0 if linear_speed is None else (linear_speed * 90.0)
        base_turn = 2.2 if angular_speed is None else (angular_speed * 3.0)

        if action == "FORWARD":
            self.target_linear_velocity = base_speed
            self.target_angular_velocity = 0.0
        elif action == "REVERSE":
            self.target_linear_velocity = -base_speed
            self.target_angular_velocity = 0.0
        elif action == "LEFT":
            self.target_linear_velocity = 0.0
            self.target_angular_velocity = -base_turn
        elif action == "RIGHT":
            self.target_linear_velocity = 0.0
            self.target_angular_velocity = base_turn
        elif action in ("STOP", "EMERGENCY_STOP"):
            self.target_linear_velocity = 0.0
            self.target_angular_velocity = 0.0
            if action == "EMERGENCY_STOP":
                self.emergency_stop = True
                self.log_event("ERROR", "MANUAL", "Manual Emergency Stop pressed!")
        elif action == "RESET":
            self.reset_simulation()

    def reset_simulation(self):
        """Resets the robot to the initial scenario configuration."""
        self.load_scenario(self.active_scenario)
        self.linear_velocity = 0.0
        self.angular_velocity = 0.0
        self.target_linear_velocity = 0.0
        self.target_angular_velocity = 0.0
        self.emergency_stop = False
        self.collision_count = 0
        self.start_time = time.time()
        self.state = NavigationState.IDLE
        self.log_event("INFO", "SIMULATION", "Simulation environment and robot reset.")

    def get_status(self) -> RobotStatus:
        """Returns snapshot of current robot status."""
        heading_deg = (math.degrees(self.heading_rad)) % 360.0
        return RobotStatus(
            is_running=self.is_running,
            mode=self.mode,
            state=self.state,
            position=RobotPosition(
                x=round(self.x, 2),
                y=round(self.y, 2),
                heading_rad=round(self.heading_rad, 4),
                heading_deg=round(heading_deg, 1),
                linear_velocity=round(self.linear_velocity, 2),
                angular_velocity=round(self.angular_velocity, 2),
            ),
            sensors=self.sensor_reading,
            motors=self.motor_state,
            emergency_stop=self.emergency_stop,
            collision_count=self.collision_count,
            uptime_sec=round(self.uptime_sec, 1),
            battery_voltage=round(8.4 - (self.uptime_sec * 0.0002), 2),
            battery_percentage=round(max(10.0, 100.0 - (self.uptime_sec * 0.005)), 1),
            active_scenario=self.active_scenario,
        )


# Global singleton instance
robot_manager = RobotSimulationManager()
