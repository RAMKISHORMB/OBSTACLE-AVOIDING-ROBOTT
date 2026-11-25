# Autonomous Navigation & State Machine Documentation

## 1. Overview
The navigation controller implements a deterministic 14-state reactive Finite State Machine (FSM) designed to navigate unmapped 2D environments while avoiding obstacles, escaping dead ends, and eliminating limit-cycle ping-pong oscillations.

---

## 2. Navigation State Catalog

| State Index | State Name | Functional Description | Motor Output |
| :--- | :--- | :--- | :--- |
| **01** | `INITIALIZING` | Hardware self-test, sensor calibration, watchdog initiation. | 0 PWM (Stop) |
| **02** | `IDLE` | Standby awaiting active navigation trigger. | 0 PWM (Stop) |
| **03** | `MOVING_FORWARD` | Cruising along current heading; continuous 40 Hz ultrasonic polling. | Cruise PWM (~175) |
| **04** | `OBSTACLE_DETECTED` | Front clearance dropped under 20 cm avoidance bound; deceleration to stop. | Brake |
| **05** | `SCANNING_LEFT` | Ultrasonic servo turret sweeps to $+60^\circ$; measures left clearance. | 0 PWM (Stop) |
| **06** | `SCANNING_RIGHT` | Ultrasonic servo turret sweeps to $-60^\circ$; measures right clearance. | 0 PWM (Stop) |
| **07** | `EVALUATING_PATH` | Clearance score comparison, dead-end detection, anti-oscillation check. | 0 PWM (Stop) |
| **08** | `TURNING_LEFT` | Differential spin in place (CCW): Left motor reverse, Right motor forward. | Turn PWM (~160) |
| **09** | `TURNING_RIGHT` | Differential spin in place (CW): Left motor forward, Right motor reverse. | Turn PWM (~160) |
| **10** | `REVERSING` | Dead-end escape maneuver: both motors reverse slowly for 750 ms. | Reverse PWM (~150) |
| **11** | `VERIFYING_PATH` | Re-checks newly faced corridor to confirm clearance $\ge 40\text{ cm}$. | 0 PWM (Stop) |
| **12** | `RESUMING_MOVEMENT` | Smooth motor ramp-up to avoid wheel slippage. | Ramping PWM |
| **13** | `EMERGENCY_STOP` | Hard brake engaged if obstacle enters critical safety zone ($< 10\text{ cm}$). | Hard Brake (255 PWM) |
| **14** | `ERROR` | Fail-safe stop upon sensor timeout, echo drop, or watchdog fault. | Coast / Brake |

---

## 3. Anti-Oscillation Heuristics
A common vulnerability in simple reactive obstacle avoiders is symmetric corridor ping-ponging: when faced with equal left and right distances in a dead-end corridor, the robot turns left, re-scans, turns right, and oscillates indefinitely without making forward progress.

### Algorithmic Resolution
1. **Clearance Hysteresis**:
   $$\Delta d = |d_{\text{left}} - d_{\text{right}}|$$
   If $\Delta d < 5.0\text{ cm}$, the corridor is classified as symmetric.
2. **Consecutive Turn Counter**:
   The controller tracks the previous turning decision and a consecutive turn counter $k$.
3. **Symmetry Breaker**:
   If $k \ge 2$, the robot forces an alternating turn direction regardless of fractional decimal variance, breaking the limit cycle and allowing escape.

---

## 4. Dead-End Recovery Protocol
When the robot enters a cul-de-sac or U-shaped baffle:
1. Both left clearance $d_{\text{left}} < 20\text{ cm}$ and right clearance $d_{\text{right}} < 20\text{ cm}$.
2. The state machine transitions immediately to `REVERSING`.
3. The robot backs up with low speed for $750\text{ ms}$ ($~25\text{ cm}$ clearance gained).
4. Turret re-scans the environment at a wider vantage point to locate an egress vector.
