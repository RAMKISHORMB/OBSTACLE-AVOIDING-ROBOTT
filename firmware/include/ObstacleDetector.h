/**
 * @file ObstacleDetector.h
 * @brief Multi-zone obstacle perception and clearance analysis
 */

#pragma once

#include <Arduino.h>
#include "Configuration.h"
#include "UltrasonicSensor.h"
#include "ServoController.h"

enum class HazardZone {
    SAFE,
    CAUTION,
    AVOIDANCE,
    EMERGENCY
};

enum class PathChoice {
    PATH_FORWARD,
    PATH_LEFT,
    PATH_RIGHT,
    PATH_REVERSE,
    PATH_STOP
};

struct ScanResult {
    float centerCm;
    float leftCm;
    float rightCm;
    HazardZone frontZone;
    PathChoice recommendedPath;
};

class ObstacleDetector {
public:
    ObstacleDetector(UltrasonicSensor& sensor, ServoController& servo);

    HazardZone evaluateZone(float distanceCm);
    ScanResult performSurroundScan();
    float readImmediateFront();

    HazardZone getLatestZone() const { return latestZone; }
    float getLatestFrontDistance() const { return latestFrontDist; }

private:
    UltrasonicSensor& sonar;
    ServoController& turret;
    HazardZone latestZone;
    float latestFrontDist;
};
