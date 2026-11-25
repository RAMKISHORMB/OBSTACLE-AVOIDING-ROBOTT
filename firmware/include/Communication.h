/**
 * @file Communication.h
 * @brief Telemetry Streaming and Command Interface (Serial UART and Wi-Fi)
 */

#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include "NavigationController.h"
#include "MotorController.h"
#include "ObstacleDetector.h"
#include "SafetyManager.h"

class Communication {
public:
    Communication(
        NavigationController& nav,
        MotorController& motors,
        ObstacleDetector& detector,
        SafetyManager& safety
    );

    void init(uint32_t baudRate = 115200);
    void update();
    void sendTelemetry();
    void parseIncomingStream();

private:
    NavigationController& nav;
    MotorController& motors;
    ObstacleDetector& detector;
    SafetyManager& safety;

    uint32_t lastTelemetryTime;
};
