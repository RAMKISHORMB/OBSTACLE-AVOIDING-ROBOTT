/**
 * @file ObstacleDetector.cpp
 * @brief Implementation of Multi-Zone Clearance Perception
 */

#include "ObstacleDetector.h"

ObstacleDetector::ObstacleDetector(UltrasonicSensor& sensor, ServoController& servo)
    : sonar(sensor), turret(servo), latestZone(HazardZone::SAFE), latestFrontDist(200.0f) {}

HazardZone ObstacleDetector::evaluateZone(float distanceCm) {
    if (distanceCm < Config::DIST_EMERGENCY_STOP_CM) {
        return HazardZone::EMERGENCY;
    } else if (distanceCm < Config::DIST_AVOIDANCE_CM) {
        return HazardZone::AVOIDANCE;
    } else if (distanceCm < Config::DIST_CAUTION_CM) {
        return HazardZone::CAUTION;
    }
    return HazardZone::SAFE;
}

float ObstacleDetector::readImmediateFront() {
    latestFrontDist = sonar.readDistanceCm();
    latestZone = evaluateZone(latestFrontDist);
    return latestFrontDist;
}

ScanResult ObstacleDetector::performSurroundScan() {
    ScanResult result;

    // 1. Center reading
    turret.lookCenter();
    delay(Config::SERVO_SETTLE_MS);
    result.centerCm = sonar.readFilteredDistanceCm(3);
    result.frontZone = evaluateZone(result.centerCm);

    // 2. Left reading (+60 deg)
    turret.lookLeft();
    delay(Config::SERVO_SETTLE_MS);
    result.leftCm = sonar.readFilteredDistanceCm(3);

    // 3. Right reading (-60 deg)
    turret.lookRight();
    delay(Config::SERVO_SETTLE_MS);
    result.rightCm = sonar.readFilteredDistanceCm(3);

    // Return to center
    turret.lookCenter();

    // Clearance evaluation logic
    if (result.leftCm < Config::DIST_AVOIDANCE_CM && result.rightCm < Config::DIST_AVOIDANCE_CM) {
        result.recommendedPath = PathChoice::PATH_REVERSE;
    } else if (result.leftCm >= result.rightCm) {
        result.recommendedPath = PathChoice::PATH_LEFT;
    } else {
        result.recommendedPath = PathChoice::PATH_RIGHT;
    }

    return result;
}
