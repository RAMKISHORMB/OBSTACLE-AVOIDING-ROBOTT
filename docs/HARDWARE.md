# Hardware Specifications & Wiring Guide

## 1. Bill of Materials (BOM)

| Item | Component | Specification | Quantity |
| :--- | :--- | :--- | :--- |
| 1 | Microcontroller | ESP32 DevKit V1 (30-pin) | 1 |
| 2 | Motor Driver | L298N Dual H-Bridge (or TB6612FNG) | 1 |
| 3 | Gear Motors | DC TT Gear Motor 1:48 (3-6V) | 2 |
| 4 | Wheels | 65mm Rubber Tread Drive Wheels | 2 |
| 5 | Caster Wheel | Ball Caster / Omnidirectional Caster | 1 |
| 6 | Ultrasonic Sensor | HC-SR04 (40kHz Transducer) | 1 |
| 7 | Servo Turret | TowerPro SG90 9g Micro Servo | 1 |
| 8 | Power Supply | 2x 18650 Li-ion Cells (7.4V - 8.4V) in series | 1 |
| 9 | Voltage Regulator| LM2596 Buck Converter (Step-down to 5.0V) | 1 |
| 10| Voltage Divider | 1kΩ and 2kΩ 1/4W Resistors (for Echo pin) | 2 |
| 11| Chassis | Acrylic / 3D-Printed 2WD Robotic Platform | 1 |

---

## 2. GPIO Pinout Mapping

```
ESP32 DevKit V1 Pin Assignments:

Left Motor:
  GPIO 25 ----> L298N ENA (LEDC PWM Channel 0)
  GPIO 26 ----> L298N IN1 (Direction A)
  GPIO 27 ----> L298N IN2 (Direction B)

Right Motor:
  GPIO 14 ----> L298N ENB (LEDC PWM Channel 1)
  GPIO 12 ----> L298N IN3 (Direction C)
  GPIO 13 ----> L298N IN4 (Direction D)

Ultrasonic Sensor (HC-SR04):
  GPIO 5  ----> HC-SR04 TRIG (Trigger Pulse)
  GPIO 18 <---- Voltage Divider <---- HC-SR04 ECHO (5V -> 3.3V)

Servo Turret (SG90):
  GPIO 19 ----> SG90 Orange/Yellow PWM wire

Status & Telemetry:
  GPIO 2  ----> Onboard Blue LED
  GPIO 4  ----> Active Buzzer (+)
  TX/RX0  ----> USB-UART Telemetry (115200 baud)
```

---

## 3. Power Distribution Diagram
```
+-------------------+
| 2S Li-ion Battery | (7.4V - 8.4V)
+-------------------+
          |
          +--------------------------> L298N Motor Driver VMS (Motor Power)
          |
          v
+-------------------+
| LM2596 5V Buck    |
+-------------------+
          |
          +--------------------------> ESP32 VIN (5V input)
          +--------------------------> HC-SR04 VCC (5V)
          +--------------------------> SG90 Servo VCC (5V)
          |
         GND ------------------------> Common Shared Ground Bus
```

> **IMPORTANT**: Always connect all grounds (ESP32 GND, L298N GND, LM2596 GND, Battery GND) together to establish a common reference voltage.
