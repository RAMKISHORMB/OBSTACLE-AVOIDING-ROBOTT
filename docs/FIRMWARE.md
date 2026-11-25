# Embedded ESP32 Firmware Documentation

## 1. Firmware Overview
The firmware is written in clean, modern C++ (C++14/17 standard) for the **Espressif ESP32** family, using the Arduino framework with PlatformIO.

## 2. Source Code Architecture

| File | Class | Primary Purpose |
| :--- | :--- | :--- |
| `Configuration.h` | `Config` | Pin mapping, LEDC PWM frequency, kinematics thresholds |
| `MotorController.h/.cpp` | `MotorController` | ESP32 LEDC dual-channel PWM control with active brake |
| `UltrasonicSensor.h/.cpp`| `UltrasonicSensor` | HC-SR04 pulse-timing driver with 3-sample median filter |
| `ServoController.h/.cpp` | `ServoController` | SG90 180-degree servo panning turret driver |
| `ObstacleDetector.h/.cpp`| `ObstacleDetector` | Multi-zone clearance perception and path scoring |
| `SafetyManager.h/.cpp`   | `SafetyManager` | Hardware Watchdog Timer (TWDT) and fail-safe triggers |
| `NavigationController.h/.cpp`| `NavigationController` | 14-state deterministic autonomous navigation FSM |
| `Communication.h/.cpp`   | `Communication` | High-speed JSON serialization over Serial UART |
| `main.cpp`               | — | Subsystem instantiations, `setup()`, and non-blocking `loop()` |

## 3. High-Frequency PWM Motor Control
Unlike basic Arduino code which relies on low-frequency 490 Hz PWM, this firmware leverages the ESP32 hardware LEDC peripheral:
- **Frequency**: 20,000 Hz (20 kHz). Ultrasonic frequency eliminates human-audible coil whine.
- **Resolution**: 8-bit resolution ($2^8 = 256$ steps, 0 to 255).
- **Channels**: Channel 0 (Left Motor), Channel 1 (Right Motor).

## 4. Hardware Watchdog Timer (TWDT)
To ensure autonomous reliability in the field:
- The Task Watchdog Timer is initialized to $3.0\text{ s}$.
- In each execution of `loop()`, `safetyManager.feedWatchdog()` resets the timer.
- If a sensor hangs during echo measurement or a motor driver browns out the MCU, the WDT resets the processor into safe initialization state.

## 5. Building & Uploading with PlatformIO
```bash
# Navigate to firmware directory
cd firmware

# Compile firmware
pio run

# Upload to physical ESP32 board
pio run --target upload

# Open Serial Monitor (115200 baud)
pio device monitor
```
