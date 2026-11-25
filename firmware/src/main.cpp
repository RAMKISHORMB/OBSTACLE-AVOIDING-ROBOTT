/**
 * @file main.cpp
 * @brief Autonomous Mobile Robot Firmware Main Entry Point for ESP32
 * 
 * Hardware: ESP32 DevKit V1, HC-SR04, SG90, L298N Motor Driver, Dual DC Motors
 */

#include <Arduino.h>
#include "Configuration.h"
#include "MotorController.h"
#include "UltrasonicSensor.h"
#include "ServoController.h"
#include "ObstacleDetector.h"
#include "SafetyManager.h"
#include "NavigationController.h"
#include "Communication.h"

// Subsystem Instantiations
MotorController      motorController;
UltrasonicSensor     ultrasonicSensor;
ServoController      servoController;
ObstacleDetector     obstacleDetector(ultrasonicSensor, servoController);
SafetyManager        safetyManager(motorController);
NavigationController navigationController(motorController, obstacleDetector, safetyManager);
Communication        comms(navigationController, motorController, obstacleDetector, safetyManager);

void setup() {
    // 1. Initialize Communication & Serial Diagnostics
    comms.init(115200);

    // 2. Initialize Actuators and Sensors
    motorController.init();
    ultrasonicSensor.init();
    servoController.init();

    // 3. Initialize Safety Subsystem (Hardware Watchdog)
    safetyManager.init();

    // 4. Initialize Navigation Controller
    navigationController.init();

    Serial.println(F("[SYSTEM] Initialization complete. Commencing autonomous control loop."));
}

void loop() {
    // 1. Pet the hardware watchdog to avoid brownout / lockup reboot
    safetyManager.feedWatchdog();

    // 2. Update autonomous navigation state machine
    navigationController.update();

    // 3. Process bidirectional communications (telemetry and commands)
    comms.update();

    // 4. Update status LED blink and diagnostics
    safetyManager.updateIndicators();

    // Small yield to allow FreeRTOS background tasks (WiFi/BT) to process
    yield();
}
