/**
 * @file UltrasonicSensor.h
 * @brief HC-SR04 Driver with Median Filtering and Non-Blocking Timeout Handling
 */

#pragma once

#include <Arduino.h>
#include "Configuration.h"

class UltrasonicSensor {
public:
    UltrasonicSensor();
    void init();

    float readDistanceCm();
    float readFilteredDistanceCm(uint8_t samples = 3);

    bool isHealthy() const { return sensorHealthy; }
    uint32_t getLastMeasureTime() const { return lastMeasureTime; }

private:
    float triggerAndMeasure();

    bool sensorHealthy;
    uint32_t lastMeasureTime;
    float lastValidDistanceCm;
};
