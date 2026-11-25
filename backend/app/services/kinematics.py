import math
from typing import Dict, List, Optional, Tuple
from ..core.config import settings


class DifferentialDriveKinematics:
    """
    Kinematic model for two-wheel differential drive mobile robot.
    Track width L (wheelbase) and wheel radius r.
    """

    def __init__(
        self,
        wheel_base_m: float = settings.WHEEL_BASE_M,
        wheel_radius_m: float = settings.WHEEL_RADIUS_M,
        max_rpm: float = settings.MAX_MOTOR_RPM,
    ):
        self.L = wheel_base_m
        self.r = wheel_radius_m
        self.max_rpm = max_rpm
        # Maximum linear wheel speed in m/s
        self.max_wheel_speed = (2.0 * math.pi * self.r * self.max_rpm) / 60.0

    def compute_wheel_speeds(self, linear_vel_mps: float, angular_vel_radps: float) -> Tuple[float, float]:
        """
        Inverse kinematics: Given robot (v, w), calculate left and right wheel speeds (m/s).
        v_left = v - (w * L / 2)
        v_right = v + (w * L / 2)
        """
        v_l = linear_vel_mps - (angular_vel_radps * self.L / 2.0)
        v_r = linear_vel_mps + (angular_vel_radps * self.L / 2.0)
        return v_l, v_r

    def compute_robot_velocities(self, v_left_mps: float, v_right_mps: float) -> Tuple[float, float]:
        """
        Forward kinematics: Given left and right wheel speeds, calculate robot (v, w).
        v = (v_right + v_left) / 2
        w = (v_right - v_left) / L
        """
        v = (v_right_mps + v_left_mps) / 2.0
        w = (v_right_mps - v_left_mps) / self.L
        return v, w

    def speed_to_rpm(self, speed_mps: float) -> float:
        """Converts wheel linear speed to motor shaft RPM."""
        rev_per_sec = speed_mps / (2.0 * math.pi * self.r)
        return rev_per_sec * 60.0

    def rpm_to_pwm(self, rpm: float) -> Tuple[int, str]:
        """
        Converts RPM to 8-bit PWM duty cycle (0-255) and direction string.
        Includes deadband threshold representing motor stall torque.
        """
        if abs(rpm) < 1.0:
            return 0, "STOP"
        
        direction = "FORWARD" if rpm > 0 else "REVERSE"
        ratio = min(1.0, abs(rpm) / self.max_rpm)
        # Standard DC motors have a deadband around PWM ~ 45
        min_pwm = 50
        pwm = int(min_pwm + (255 - min_pwm) * ratio)
        return min(255, max(0, pwm)), direction

    def integrate_pose(
        self,
        x: float,
        y: float,
        theta_rad: float,
        linear_vel_units: float,
        angular_vel_radps: float,
        dt_sec: float,
    ) -> Tuple[float, float, float]:
        """
        Dead reckoning numerical integration using Runge-Kutta 2nd order (midpoint) method
        for smooth angular and positional trajectory updates.
        """
        theta_mid = theta_rad + (angular_vel_radps * dt_sec * 0.5)
        new_theta = (theta_rad + (angular_vel_radps * dt_sec)) % (2.0 * math.pi)
        
        new_x = x + (linear_vel_units * math.cos(theta_mid) * dt_sec)
        new_y = y + (linear_vel_units * math.sin(theta_mid) * dt_sec)
        
        return new_x, new_y, new_theta


def line_segment_intersection(
    p1: Tuple[float, float],
    p2: Tuple[float, float],
    q1: Tuple[float, float],
    q2: Tuple[float, float],
) -> Optional[Tuple[float, float, float]]:
    """
    Computes intersection of line segment (p1->p2) with line segment (q1->q2).
    Returns (hit_x, hit_y, t) where t in [0, 1] is parametric distance along p1->p2.
    """
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    qx = q2[0] - q1[0]
    qy = q2[1] - q1[1]

    denom = dx * qy - dy * qx
    if abs(denom) < 1e-9:
        return None  # Parallel lines

    t = ((q1[0] - p1[0]) * qy - (q1[1] - p1[1]) * qx) / denom
    u = ((q1[0] - p1[0]) * dy - (q1[1] - p1[1]) * dx) / denom

    if 0.0 <= t <= 1.0 and 0.0 <= u <= 1.0:
        hit_x = p1[0] + t * dx
        hit_y = p1[1] + t * dy
        return hit_x, hit_y, t

    return None


def raycast_against_box(
    ray_origin: Tuple[float, float],
    ray_end: Tuple[float, float],
    box: Dict[str, float],
) -> Optional[Tuple[float, float, float]]:
    """
    Raycast against an axis-aligned bounding box defined by x, y, width, height.
    Returns closest (hit_x, hit_y, distance).
    """
    bx, by, bw, bh = box["x"], box["y"], box["width"], box["height"]
    segments = [
        ((bx, by), (bx + bw, by)),             # Top
        ((bx + bw, by), (bx + bw, by + bh)),   # Right
        ((bx + bw, by + bh), (bx, by + bh)),   # Bottom
        ((bx, by + bh), (bx, by)),             # Left
    ]

    closest_hit = None
    min_t = 1.01

    for q1, q2 in segments:
        hit = line_segment_intersection(ray_origin, ray_end, q1, q2)
        if hit is not None:
            hx, hy, t = hit
            if t < min_t:
                min_t = t
                closest_hit = (hx, hy, t)

    return closest_hit


def circle_raycast(
    ray_origin: Tuple[float, float],
    ray_dir: Tuple[float, float],
    max_range: float,
    center: Tuple[float, float],
    radius: float,
) -> Optional[float]:
    """Raycast against a circular obstacle. Returns distance along ray or None."""
    ox, oy = ray_origin
    dx, dy = ray_dir
    cx, cy = center

    fx = ox - cx
    fy = oy - cy

    a = dx * dx + dy * dy
    b = 2.0 * (fx * dx + fy * dy)
    c = (fx * fx + fy * fy) - radius * radius

    discriminant = b * b - 4 * a * c
    if discriminant < 0:
        return None

    discriminant = math.sqrt(discriminant)
    t1 = (-b - discriminant) / (2 * a)
    t2 = (-b + discriminant) / (2 * a)

    if 0.0 <= t1 <= max_range:
        return t1
    if 0.0 <= t2 <= max_range:
        return t2
    return None
