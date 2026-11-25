# System Architecture Documentation
## Autonomous Obstacle Avoiding Mobile Robot

### 1. Architectural Philosophy
The Autonomous Obstacle Avoiding Robot system is engineered as a complete **Software-in-the-Loop (SIL)** autonomous mobile robotics (AMR) platform. It bridges high-level web visualization, physics kinematics simulation, asynchronous Python telemetry, and bare-metal ESP32 C++ firmware.

```
+-------------------------------------------------------------------------+
|                  AUTONOMOUS ROBOTICS CONTROL SYSTEM                     |
|                   (React 19 / TypeScript / Vite UI)                    |
+-------------------------------------------------------------------------+
       |                                                   |
       | HTTP REST / WebSocket                            | HTML5 Canvas
       v                                                   v
+-------------------------------+             +---------------------------+
|     Python FastAPI Backend    |             | 2D Kinematics & Acoustic  |
|  - Authoritative 40Hz Physics |             | Raycasting Engine         |
|  - Bi-directional WebSockets  |             |  - Differential Drive     |
|  - Telemetry & Event Logging  |             |  - 14-State Reactive FSM  |
+-------------------------------+             +---------------------------+
                                                           |
                                           Mirrored State & Firmware Architecture
                                                           v
                                              +---------------------------+
                                              | Embedded ESP32 C++ Core   |
                                              |  - LEDC 20kHz Motor PWM   |
                                              |  - HC-SR04 Median Filter  |
                                              |  - SG90 Servo Turret      |
                                              |  - Hardware Watchdog (WDT)|
                                              +---------------------------+
```

---

### 2. Layered Subsystems

#### Layer 1: Presentation & Teleoperation UI
- **Framework**: React 19, TypeScript, Tailwind CSS, Lucide Icons.
- **Design Paradigm**: Clean, high-density industrial robotics interface with a soft-grey/white light theme, avoiding bloated mockups or gratuitous dark glowing visuals.
- **Subsystem Views**:
  1. *Overview*: High-level system architecture, diagnostics readiness, quick scenario launch.
  2. *Live Simulation*: Interactive 2D viewport, dynamic obstacle placement, real-time telemetry sidebar.
  3. *Autonomous Navigation*: Interactive 14-state FSM inspector, anti-oscillation monitoring, sequence flowchart.
  4. *Sensor Monitoring*: Time-series acoustic distance charts, ultrasonic cone sweep visualization.
  5. *Motor Control*: Dual-wheel RPM, 8-bit PWM duty cycles, motor current consumption in mA.
  6. *System Diagnostics*: Automated integrity self-test, hardware vs simulation distinctions.
  7. *Firmware Architecture*: C++ class source viewer, ESP32 GPIO pinout mapping, PlatformIO specs.
  8. *Activity Logs*: Real-time audit log stream with severity filtering and JSON export.
  9. *Documentation*: Deep technical specifications and mathematical formulations.

#### Layer 2: Kinematic Physics & Raycasting Engine
- **Kinematic Formulation**: Two-wheel differential-drive mobile robot.
  - Track width $L = 0.16\text{ m}$ (16 cm).
  - Wheel radius $r = 0.0325\text{ m}$ (65 mm diameter).
  - Maximum linear velocity $v_{\max} = 0.45\text{ m/s}$.
  - Numerical integration: Runge-Kutta 2nd Order (Midpoint) method ensuring frame-rate independent positioning:
    $$\theta_{t+\Delta t} = \theta_t + \omega \Delta t$$
    $$x_{t+\Delta t} = x_t + v \cos\left(\theta_t + \frac{\omega \Delta t}{2}\right) \Delta t$$
    $$y_{t+\Delta t} = y_t + v \sin\left(\theta_t + \frac{\omega \Delta t}{2}\right) \Delta t$$
- **Acoustic Perception Simulation**: Multi-ray conical projection replicating an HC-SR04 ultrasonic transducer with an acoustic spread angle of $15^\circ$, computing exact Euclidean intersection with axis-aligned bounding boxes (AABBs) and arena walls.

#### Layer 3: Python FastAPI Telemetry Backend
- **Asynchronous Loop**: Background task ticking at 40 Hz ($25\text{ ms}$ interval), maintaining authoritative robot pose and sensor evaluations.
- **Protocol**: JSON-serialized WebSocket streaming (`/ws/robot`) with REST fallback (`/api/robot/status`, `/api/robot/command`, `/api/robot/mode`, etc.).
- **Data Validation**: Strict Pydantic V2 schemas guaranteeing type safety across the network boundary.

#### Layer 4: Embedded ESP32 Firmware
- **Platform**: Espressif ESP32 DevKit V1 (Tensilica Xtensa Dual-Core 32-bit LX6 @ 240 MHz).
- **Core Framework**: Arduino / ESP-IDF via PlatformIO.
- **Safety Mechanisms**:
  - Hardware Task Watchdog Timer (TWDT) set to $3.0\text{ s}$ timeout.
  - Active electrical regenerative braking across H-Bridge motor terminals.
  - Median acoustic filtering across multiple ultrasonic echo bursts.
