import React, { useState } from 'react';
import { Terminal, Cpu, FileCode, CheckCircle2, Copy, Check } from 'lucide-react';

interface FirmwareFile {
  name: string;
  type: 'header' | 'source' | 'config';
  description: string;
  code: string;
}

const FIRMWARE_FILES: FirmwareFile[] = [
  {
    name: 'Configuration.h',
    type: 'header',
    description: 'Hardware pin mapping, PWM timer channels, speed constants, safety thresholds',
    code: `// Hardware Pin Mapping (ESP32 DevKit V1)
namespace Config {
    constexpr uint8_t PIN_MOTOR_LEFT_PWM  = 25; // Left Motor Speed (PWM)
    constexpr uint8_t PIN_MOTOR_LEFT_IN1  = 26; // Left Motor Dir 1
    constexpr uint8_t PIN_MOTOR_LEFT_IN2  = 27; // Left Motor Dir 2
    constexpr uint8_t PIN_MOTOR_RIGHT_PWM = 14; // Right Motor Speed (PWM)
    constexpr uint8_t PIN_MOTOR_RIGHT_IN3 = 12; // Right Motor Dir 1
    constexpr uint8_t PIN_MOTOR_RIGHT_IN4 = 13; // Right Motor Dir 2

    constexpr uint8_t PIN_SONAR_TRIG = 5;       // Ultrasonic Trigger
    constexpr uint8_t PIN_SONAR_ECHO = 18;      // Ultrasonic Echo (via 5V->3.3V divider)
    constexpr uint8_t PIN_SERVO_PWM  = 19;      // SG90 Servo Turret PWM

    constexpr uint32_t PWM_FREQUENCY = 20000;   // 20 kHz ultrasonic quiet PWM
    constexpr uint8_t  PWM_RESOLUTION_BITS = 8; // 0-255 duty cycle

    constexpr float DIST_EMERGENCY_STOP_CM = 10.0f;
    constexpr float DIST_AVOIDANCE_CM      = 20.0f;
    constexpr float DIST_SAFE_CM           = 40.0f;
}`,
  },
  {
    name: 'MotorController.cpp',
    type: 'source',
    description: 'ESP32 LEDC PWM dual-channel differential motor driver with active braking',
    code: `#include "MotorController.h"

void MotorController::forward(uint8_t speed) {
    applyMotorChannel(Config::PIN_MOTOR_LEFT_IN1, Config::PIN_MOTOR_LEFT_IN2, Config::PWM_CHANNEL_LEFT, speed);
    applyMotorChannel(Config::PIN_MOTOR_RIGHT_IN3, Config::PIN_MOTOR_RIGHT_IN4, Config::PWM_CHANNEL_RIGHT, speed);
}

void MotorController::turnLeft(uint8_t speed) {
    // CCW spin in place: Left motor reverse, Right motor forward
    applyMotorChannel(Config::PIN_MOTOR_LEFT_IN1, Config::PIN_MOTOR_LEFT_IN2, Config::PWM_CHANNEL_LEFT, -((int16_t)speed));
    applyMotorChannel(Config::PIN_MOTOR_RIGHT_IN3, Config::PIN_MOTOR_RIGHT_IN4, Config::PWM_CHANNEL_RIGHT, (int16_t)speed);
}

void MotorController::brake() {
    // Active electrical regenerative braking
    digitalWrite(Config::PIN_MOTOR_LEFT_IN1, HIGH);
    digitalWrite(Config::PIN_MOTOR_LEFT_IN2, HIGH);
    digitalWrite(Config::PIN_MOTOR_RIGHT_IN3, HIGH);
    digitalWrite(Config::PIN_MOTOR_RIGHT_IN4, HIGH);
    ledcWrite(Config::PWM_CHANNEL_LEFT, 255);
    ledcWrite(Config::PWM_CHANNEL_RIGHT, 255);
}`,
  },
  {
    name: 'NavigationController.cpp',
    type: 'source',
    description: '14-state autonomous navigation state machine with anti-oscillation and dead-end escape',
    code: `#include "NavigationController.h"

void NavigationController::update() {
    float frontDist = detector.readImmediateFront();

    // Emergency fail-safe
    if (frontDist < Config::DIST_EMERGENCY_STOP_CM && currentState != NavState::REVERSING) {
        safety.triggerEmergencyStop("Obstacle under emergency distance");
        transitionTo(NavState::EMERGENCY_STOP);
        return;
    }

    switch (currentState) {
        case NavState::MOVING_FORWARD:
            motors.forward(Config::SPEED_CRUISE);
            if (frontDist <= Config::DIST_AVOIDANCE_CM) {
                motors.stop();
                transitionTo(NavState::OBSTACLE_DETECTED);
            }
            break;

        case NavState::OBSTACLE_DETECTED:
            motors.stop();
            transitionTo(NavState::SCANNING_LEFT);
            break;

        case NavState::EVALUATING_PATH:
            if (scanLeftDist < Config::DIST_AVOIDANCE_CM && scanRightDist < Config::DIST_AVOIDANCE_CM) {
                motors.reverse(Config::SPEED_REVERSE);
                transitionTo(NavState::REVERSING);
            } else {
                bool chooseLeft = (scanLeftDist >= scanRightDist);
                if (chooseLeft) motors.turnLeft(Config::SPEED_TURN);
                else motors.turnRight(Config::SPEED_TURN);
            }
            break;
    }
}`,
  },
  {
    name: 'UltrasonicSensor.cpp',
    type: 'source',
    description: 'HC-SR04 pulse-timing driver with median filtering and acoustic timeout handling',
    code: `#include "UltrasonicSensor.h"

float UltrasonicSensor::readFilteredDistanceCm(uint8_t samples) {
    float readings[5];
    uint8_t count = min(samples, (uint8_t)5);

    for (uint8_t i = 0; i < count; ++i) {
        // 10us trigger pulse
        digitalWrite(Config::PIN_SONAR_TRIG, LOW);
        delayMicroseconds(4);
        digitalWrite(Config::PIN_SONAR_TRIG, HIGH);
        delayMicroseconds(10);
        digitalWrite(Config::PIN_SONAR_TRIG, LOW);

        uint32_t durationUs = pulseIn(Config::PIN_SONAR_ECHO, HIGH, Config::SONAR_TIMEOUT_US);
        readings[i] = (durationUs * 0.0343f) / 2.0f;
    }

    std::sort(readings, readings + count);
    return readings[count / 2]; // Return median
}`,
  },
  {
    name: 'platformio.ini',
    type: 'config',
    description: 'PlatformIO configuration targeting Espressif ESP32 Dev Module',
    code: `[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200

build_flags = 
    -D CORE_DEBUG_LEVEL=3
    -D FIRMWARE_VERSION=\\"1.0.0\\"

lib_deps =
    bblanchon/ArduinoJson @ ^7.0.0
    madhephaestus/ESP32Servo @ ^3.0.5`,
  },
];

export const FirmwareArchitecturePage: React.FC = () => {
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeFile = FIRMWARE_FILES[selectedFileIdx];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Title & Overview Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Terminal className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Embedded ESP32 Firmware Architecture</h2>
            </div>
            <p className="text-xs text-slate-500">
              Modular Embedded C++ for Espressif ESP32 with PlatformIO build configuration
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              PlatformIO / Arduino Core
            </span>
          </div>
        </div>

        {/* Hardware Wiring Pinout Reference */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <strong className="text-slate-800 block">L298N Motor Driver Pins</strong>
            <ul className="text-slate-600 font-mono text-[11px] space-y-0.5">
              <li>ENA (PWM Left): GPIO 25</li>
              <li>IN1 / IN2: GPIO 26 / 27</li>
              <li>ENB (PWM Right): GPIO 14</li>
              <li>IN3 / IN4: GPIO 12 / 13</li>
            </ul>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <strong className="text-slate-800 block">Ultrasonic &amp; Servo Pins</strong>
            <ul className="text-slate-600 font-mono text-[11px] space-y-0.5">
              <li>HC-SR04 Trig: GPIO 5</li>
              <li>HC-SR04 Echo: GPIO 18 (Divider)</li>
              <li>SG90 Servo PWM: GPIO 19</li>
              <li>Operating Freq: 20 kHz PWM</li>
            </ul>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <strong className="text-slate-800 block">Status &amp; Safety Pins</strong>
            <ul className="text-slate-600 font-mono text-[11px] space-y-0.5">
              <li>Buzzer Out: GPIO 4</li>
              <li>Status LED: GPIO 2</li>
              <li>Watchdog Timer: 3.0s Timeout</li>
              <li>Telemetry: UART 115200</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Code Browser */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tab Selection */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 overflow-x-auto">
          <div className="flex space-x-2">
            {FIRMWARE_FILES.map((file, idx) => (
              <button
                key={file.name}
                onClick={() => setSelectedFileIdx(idx)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  selectedFileIdx === idx
                    ? 'bg-white text-blue-600 border border-slate-200 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{file.name}</span>
              </button>
            ))}
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 px-3 py-1 rounded-md text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors ml-2"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
        </div>

        {/* File Description */}
        <div className="px-5 py-2.5 bg-slate-100/60 border-b border-slate-200 text-xs text-slate-600 font-sans">
          <strong>Purpose:</strong> {activeFile.description}
        </div>

        {/* Code Content */}
        <div className="p-4 bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
          <pre>
            <code>{activeFile.code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
