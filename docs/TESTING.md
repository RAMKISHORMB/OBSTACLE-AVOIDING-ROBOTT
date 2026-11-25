# Automated Testing & Verification Guide

## 1. Test Architecture Overview
The repository includes automated test suites covering:
1. **Backend Tests** (`tests/backend/`): Tested with `pytest` and `httpx`.
   - Kinematic forward & inverse formulations.
   - Runge-Kutta numerical integration.
   - Raycasting Euclidean distance against AABBs.
   - Navigation state transitions.
   - REST API endpoints and error responses.
2. **Frontend Tests** (`frontend/src/__tests__/`): Tested with `vitest`.
   - Wheel linear speed to RPM and PWM translation.
   - Multi-ray acoustic cone dispersion algorithms.
   - Simulation engine initialization, step updates, and emergency stop triggers.
   - Manual override behavior.

---

## 2. Running Backend Tests
```bash
# In repository root
python -m pytest tests/backend -v -o "pythonpath=."
```

Expected output:
```
tests/backend/test_api.py::test_health_endpoint PASSED
tests/backend/test_api.py::test_status_endpoint PASSED
tests/backend/test_api.py::test_sensors_endpoint PASSED
tests/backend/test_api.py::test_mode_and_commands PASSED
tests/backend/test_kinematics.py::test_kinematics_wheel_speeds PASSED
tests/backend/test_kinematics.py::test_kinematics_forward_velocities PASSED
tests/backend/test_kinematics.py::test_speed_to_rpm_and_pwm PASSED
tests/backend/test_kinematics.py::test_line_intersection PASSED
tests/backend/test_kinematics.py::test_raycast_against_box PASSED
tests/backend/test_navigation.py::test_robot_manager_initialization PASSED
tests/backend/test_navigation.py::test_measure_distance_and_zone PASSED
tests/backend/test_navigation.py::test_navigation_state_transitions PASSED
tests/backend/test_navigation.py::test_manual_mode_commands PASSED
tests/backend/test_navigation.py::test_collision_detection PASSED
======================= 14 passed in 0.70s =======================
```

---

## 3. Running Frontend Tests
```bash
# In frontend directory
cd frontend
npm test
# Or with npx vitest run
npx vitest run
```

Expected output:
```
 ✓ src/__tests__/simulation.test.ts (13 tests)
 Test Files  1 passed (1)
      Tests  13 passed (13)
```

---

## 4. Production Build Verification
```bash
cd frontend
npm run build
```
Generates optimized, type-checked bundle in `frontend/dist/`.
