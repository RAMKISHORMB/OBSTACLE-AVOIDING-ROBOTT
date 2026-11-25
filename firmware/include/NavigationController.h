/**
 * @file NavigationController.h
 * @brief Autonomous Navigation State Machine Engine for ESP32 Robot
 */

#pragma once

#include <Arduino.h>
#include "Configuration.h"
#include "MotorController.h"
#include "ObstacleDetector.h"
#include "SafetyManager.h"

enum class NavState {
    INITIALIZING,
    IDLE,
    MOVING_FORWARD,
    OBSTACLE_DETECTED,
    EMERGENCY_STOP,
    SCANNING_LEFT,
    SCANNING_RIGHT,
    EVALUATING_PATH,
    TURNING_LEFT,
    TURNING_RIGHT,
    REVERSING,
    VERIFYING_PATH,
    RESUMING_MOVEMENT,
    ERROR
};

class NavigationController {
public:
    NavigationController(
        MotorController& motors,
        ObstacleDetector& detector,
        SafetyManager& safety
    );

    void init();
    void update();

    void setAutonomous(bool autonomous);
    bool isAutonomous() const { return autonomousMode; }

    NavState getState() const { return currentState; }
    const char* getStateString() const;

    void manualCommand(char command, uint8_t speed);

private:
    void transitionTo(NavState newState);

    MotorController& motors;
    ObstacleDetector& detector;
    SafetyManager& safety;

    NavState currentState;
    bool autonomousMode;
    uint32_t stateEnterTime;

    float scanLeftDist;
    float scanRightDist;
    uint8_t turnHistory; // 0=None, 1=Left, 2=Right
    uint8_t consecutiveSameTurn;
};
