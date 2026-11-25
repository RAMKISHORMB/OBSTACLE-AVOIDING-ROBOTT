/**
 * @file Communication.cpp
 * @brief Implementation of JSON Telemetry Streaming and Command Interface
 */

#include "Communication.h"

Communication::Communication(
    NavigationController& n,
    MotorController& m,
    ObstacleDetector& d,
    SafetyManager& s
) : nav(n), motors(m), detector(d), safety(s), lastTelemetryTime(0) {}

void Communication::init(uint32_t baudRate) {
    Serial.begin(baudRate);
    Serial.println(F("{\"system\":\"ESP32 Autonomous Obstacle Avoiding Robot\",\"status\":\"READY\"}"));
}

void Communication::sendTelemetry() {
    StaticJsonDocument<256> doc;

    doc["state"] = nav.getStateString();
    doc["mode"] = nav.isAutonomous() ? "AUTONOMOUS" : "MANUAL";
    doc["front_cm"] = round(detector.getLatestFrontDistance() * 10.0f) / 10.0f;
    doc["left_pwm"] = motors.getLeftPwm();
    doc["right_pwm"] = motors.getRightPwm();
    doc["emergency"] = safety.isEmergencyActive();
    doc["uptime_ms"] = millis();

    serializeJson(doc, Serial);
    Serial.println();
}

void Communication::parseIncomingStream() {
    while (Serial.available()) {
        String line = Serial.readStringUntil('\n');
        line.trim();
        if (line.isEmpty()) continue;

        StaticJsonDocument<128> doc;
        DeserializationError err = deserializeJson(doc, line);
        if (!err) {
            if (doc.containsKey("mode")) {
                const char* m = doc["mode"];
                nav.setAutonomous(strcmp(m, "AUTONOMOUS") == 0);
            }
            if (doc.containsKey("command")) {
                const char* cmd = doc["command"];
                uint8_t spd = doc["speed"] | Config::SPEED_CRUISE;
                nav.manualCommand(cmd[0], spd);
            }
        }
    }
}

void Communication::update() {
    parseIncomingStream();

    uint32_t now = millis();
    if (now - lastTelemetryTime >= Config::TELEMETRY_INTERVAL_MS) {
        lastTelemetryTime = now;
        sendTelemetry();
    }
}
