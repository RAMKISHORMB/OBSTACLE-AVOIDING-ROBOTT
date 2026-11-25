/**
 * @file Configuration.h
 * @brief Hardware Pin Mapping, Kinematics & Safety Parameters for ESP32 Robot
 */

#pragma once

#include <stdint.h>

namespace Config {

    // =========================================================================
    // GPIO Pin Assignments (ESP32 DevKit V1)
    // =========================================================================
    
    // Motor Driver (L298N / TB6612FNG Dual H-Bridge)
    // Left Motor (Channel A)
    constexpr uint8_t PIN_MOTOR_LEFT_PWM  = 25; // Speed (PWM)
    constexpr uint8_t PIN_MOTOR_LEFT_IN1  = 26; // Direction 1
    constexpr uint8_t PIN_MOTOR_LEFT_IN2  = 27; // Direction 2

    // Right Motor (Channel B)
    constexpr uint8_t PIN_MOTOR_RIGHT_PWM = 14; // Speed (PWM)
    constexpr uint8_t PIN_MOTOR_RIGHT_IN3 = 12; // Direction 1
    constexpr uint8_t PIN_MOTOR_RIGHT_IN4 = 13; // Direction 2

    // Ultrasonic Sensor (HC-SR04)
    constexpr uint8_t PIN_SONAR_TRIG = 5;       // Output Trigger pulse
    constexpr uint8_t PIN_SONAR_ECHO = 18;      // Input Echo pulse (Voltage divider 5V->3.3V)

    // Ultrasonic Panning Micro Servo (SG90)
    constexpr uint8_t PIN_SERVO_PWM  = 19;      // Servo PWM signal

    // Status Indicators & Diagnostics
    constexpr uint8_t PIN_STATUS_LED  = 2;      // Onboard Blue LED (GPIO2)
    constexpr uint8_t PIN_BUZZER      = 4;      // Active Piezo Buzzer

    // =========================================================================
    // ESP32 PWM (LEDC) Configuration
    // =========================================================================
    constexpr uint32_t PWM_FREQUENCY      = 20000; // 20 kHz ultrasonic frequency (quiet motors)
    constexpr uint8_t  PWM_RESOLUTION_BITS = 8;     // 8-bit duty cycle (0-255)
    constexpr uint8_t  PWM_CHANNEL_LEFT   = 0;
    constexpr uint8_t  PWM_CHANNEL_RIGHT  = 1;

    // =========================================================================
    // Kinematics and Speed Setpoints
    // =========================================================================
    constexpr uint8_t SPEED_CRUISE   = 175; // Forward cruising speed (0-255)
    constexpr uint8_t SPEED_TURN     = 160; // Turning speed (differential)
    constexpr uint8_t SPEED_REVERSE  = 150; // Slow reverse escape speed
    constexpr uint8_t SPEED_STOP     = 0;

    // =========================================================================
    // Ultrasonic & Safety Thresholds (cm)
    // =========================================================================
    constexpr float DIST_EMERGENCY_STOP_CM = 10.0f; // Instant hard brake
    constexpr float DIST_AVOIDANCE_CM       = 20.0f; // Trigger scan and turn
    constexpr float DIST_CAUTION_CM         = 35.0f; // Pre-warning boundary
    constexpr float DIST_SAFE_CM            = 40.0f; // Free path

    // Ultrasonic Timeout (microseconds) for 350cm max reach
    constexpr uint32_t SONAR_TIMEOUT_US = 25000; // ~400 cm acoustic timeout

    // =========================================================================
    // Servo Angles (Degrees)
    // =========================================================================
    constexpr int SERVO_ANGLE_CENTER = 90;
    constexpr int SERVO_ANGLE_LEFT   = 150; // 60 deg left from center
    constexpr int SERVO_ANGLE_RIGHT  = 30;  // 60 deg right from center
    constexpr uint32_t SERVO_SETTLE_MS = 250;

    // =========================================================================
    // Watchdog & Timing
    // =========================================================================
    constexpr uint32_t WATCHDOG_TIMEOUT_SEC = 3;
    constexpr uint32_t TELEMETRY_INTERVAL_MS = 50; // 20 Hz telemetry streaming

} // namespace Config
