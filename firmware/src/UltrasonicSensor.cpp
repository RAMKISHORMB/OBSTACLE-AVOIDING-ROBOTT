/**
 * @file UltrasonicSensor.cpp
 * @brief Implementation of HC-SR04 Driver with Median Filtering
 */

#include "UltrasonicSensor.h"
#include <algorithm>

UltrasonicSensor::UltrasonicSensor()
    : sensorHealthy(true), lastMeasureTime(0), lastValidDistanceCm(200.0f) {}

void UltrasonicSensor::init() {
    pinMode(Config::PIN_SONAR_TRIG, OUTPUT);
    pinMode(Config::PIN_SONAR_ECHO, INPUT);

    digitalWrite(Config::PIN_SONAR_TRIG, LOW);
    delayMicroseconds(2);
}

float UltrasonicSensor::triggerAndMeasure() {
    // 10 microsecond trigger pulse
    digitalWrite(Config::PIN_SONAR_TRIG, LOW);
    delayMicroseconds(4);
    digitalWrite(Config::PIN_SONAR_TRIG, HIGH);
    delayMicroseconds(10);
    digitalWrite(Config::PIN_SONAR_TRIG, LOW);

    // Measure echo high duration with timeout
    uint32_t durationUs = pulseIn(Config::PIN_SONAR_ECHO, HIGH, Config::SONAR_TIMEOUT_US);
    lastMeasureTime = millis();

    if (durationUs == 0) {
        // Echo timed out or sensor disconnected
        sensorHealthy = false;
        return 400.0f; // Treat as clear or out-of-range boundary
    }

    sensorHealthy = true;
    // Speed of sound at 20 deg C: 343 m/s = 0.0343 cm/us -> roundtrip / 2
    float distanceCm = (durationUs * 0.0343f) / 2.0f;

    // Constrain to physical sensor specifications (2 cm to 400 cm)
    if (distanceCm < 2.0f) distanceCm = 2.0f;
    if (distanceCm > 400.0f) distanceCm = 400.0f;

    lastValidDistanceCm = distanceCm;
    return distanceCm;
}

float UltrasonicSensor::readDistanceCm() {
    return triggerAndMeasure();
}

float UltrasonicSensor::readFilteredDistanceCm(uint8_t samples) {
    if (samples <= 1) {
        return triggerAndMeasure();
    }

    float readings[5];
    uint8_t count = (samples > 5) ? 5 : samples;

    for (uint8_t i = 0; i < count; ++i) {
        readings[i] = triggerAndMeasure();
        delayMicroseconds(1200); // Brief acoustic settling between pings
    }

    // Sort to extract median
    std::sort(readings, readings + count);
    return readings[count / 2];
}
