import math
import pytest
from backend.app.services.kinematics import (
    DifferentialDriveKinematics,
    line_segment_intersection,
    raycast_against_box,
    circle_raycast,
)


def test_kinematics_wheel_speeds():
    kin = DifferentialDriveKinematics(wheel_base_m=0.16, wheel_radius_m=0.0325)
    
    # Pure forward motion (v=0.4 m/s, w=0 rad/s)
    v_l, v_r = kin.compute_wheel_speeds(0.4, 0.0)
    assert math.isclose(v_l, 0.4, rel_tol=1e-3)
    assert math.isclose(v_r, 0.4, rel_tol=1e-3)

    # Pure spin in place (v=0, w=1.0 rad/s)
    # v_l = -0.5 * 1.0 * 0.16 = -0.08
    # v_r = +0.5 * 1.0 * 0.16 = +0.08
    v_l, v_r = kin.compute_wheel_speeds(0.0, 1.0)
    assert math.isclose(v_l, -0.08, rel_tol=1e-3)
    assert math.isclose(v_r, 0.08, rel_tol=1e-3)


def test_kinematics_forward_velocities():
    kin = DifferentialDriveKinematics(wheel_base_m=0.16, wheel_radius_m=0.0325)
    v, w = kin.compute_robot_velocities(0.2, 0.4)
    # v = (0.2 + 0.4) / 2 = 0.3
    # w = (0.4 - 0.2) / 0.16 = 1.25
    assert math.isclose(v, 0.3, rel_tol=1e-3)
    assert math.isclose(w, 1.25, rel_tol=1e-3)


def test_speed_to_rpm_and_pwm():
    kin = DifferentialDriveKinematics(wheel_base_m=0.16, wheel_radius_m=0.0325, max_rpm=200.0)
    rpm = kin.speed_to_rpm(0.2)
    assert rpm > 0
    pwm, direction = kin.rpm_to_pwm(rpm)
    assert 0 <= pwm <= 255
    assert direction == "FORWARD"

    # Test reverse
    pwm_rev, dir_rev = kin.rpm_to_pwm(-50.0)
    assert 0 <= pwm_rev <= 255
    assert dir_rev == "REVERSE"

    # Test stop
    pwm_stop, dir_stop = kin.rpm_to_pwm(0.0)
    assert pwm_stop == 0
    assert dir_stop == "STOP"


def test_line_intersection():
    p1 = (0.0, 0.0)
    p2 = (10.0, 0.0)
    q1 = (5.0, -5.0)
    q2 = (5.0, 5.0)
    hit = line_segment_intersection(p1, p2, q1, q2)
    assert hit is not None
    hx, hy, t = hit
    assert math.isclose(hx, 5.0, abs_tol=1e-3)
    assert math.isclose(hy, 0.0, abs_tol=1e-3)
    assert math.isclose(t, 0.5, abs_tol=1e-3)


def test_raycast_against_box():
    origin = (0.0, 50.0)
    ray_end = (200.0, 50.0)
    box = {"x": 100.0, "y": 20.0, "width": 60.0, "height": 60.0}
    hit = raycast_against_box(origin, ray_end, box)
    assert hit is not None
    hx, hy, t = hit
    assert math.isclose(hx, 100.0, abs_tol=1e-3)
    assert math.isclose(hy, 50.0, abs_tol=1e-3)
