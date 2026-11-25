/**
 * @file NavigationController.cpp
 * @brief Implementation of Obstacle Avoidance State Machine
 */

#include "NavigationController.h"

NavigationController::NavigationController(
    MotorController& m,
    ObstacleDetector& d,
    SafetyManager& s
) : motors(m), detector(d), safety(s),
    currentState(NavState::INITIALIZING),
    autonomousMode(true),
    stateEnterTime(0),
    scanLeftDist(100.0f),
    scanRightDist(100.0f),
    turnHistory(0),
    consecutiveSameTurn(0) {}

void NavigationController::init() {
    transitionTo(NavState::INITIALIZING);
}

const char* NavigationController::getStateString() const {
    switch (currentState) {
        case NavState::INITIALIZING:       return "INITIALIZING";
        case NavState::IDLE:               return "IDLE";
        case NavState::MOVING_FORWARD:     return "MOVING_FORWARD";
        case NavState::OBSTACLE_DETECTED:  return "OBSTACLE_DETECTED";
        case NavState::EMERGENCY_STOP:     return "EMERGENCY_STOP";
        case NavState::SCANNING_LEFT:      return "SCANNING_LEFT";
        case NavState::SCANNING_RIGHT:     return "SCANNING_RIGHT";
        case NavState::EVALUATING_PATH:    return "EVALUATING_PATH";
        case NavState::TURNING_LEFT:       return "TURNING_LEFT";
        case NavState::TURNING_RIGHT:      return "TURNING_RIGHT";
        case NavState::REVERSING:          return "REVERSING";
        case NavState::VERIFYING_PATH:     return "VERIFYING_PATH";
        case NavState::RESUMING_MOVEMENT:  return "RESUMING_MOVEMENT";
        case NavState::ERROR:              return "ERROR";
        default:                           return "UNKNOWN";
    }
}

void NavigationController::transitionTo(NavState newState) {
    currentState = newState;
    stateEnterTime = millis();
}

void NavigationController::setAutonomous(bool autonomous) {
    autonomousMode = autonomous;
    if (!autonomous) {
        motors.stop();
        transitionTo(NavState::IDLE);
    } else {
        transitionTo(NavState::MOVING_FORWARD);
    }
}

void NavigationController::update() {
    if (!autonomousMode) {
        return; // Manual control takes precedence
    }

    uint32_t elapsed = millis() - stateEnterTime;
    float frontDist = detector.readImmediateFront();

    // Global Emergency Stop Check
    if (frontDist < Config::DIST_EMERGENCY_STOP_CM && 
        currentState != NavState::REVERSING && 
        currentState != NavState::EMERGENCY_STOP) {
        safety.triggerEmergencyStop("Obstacle under emergency distance");
        transitionTo(NavState::EMERGENCY_STOP);
        return;
    }

    switch (currentState) {
        case NavState::INITIALIZING:
            if (elapsed > 800) {
                transitionTo(NavState::MOVING_FORWARD);
            }
            break;

        case NavState::IDLE:
            motors.stop();
            break;

        case NavState::MOVING_FORWARD:
            motors.forward(Config::SPEED_CRUISE);
            if (frontDist <= Config::DIST_AVOIDANCE_CM) {
                motors.stop();
                transitionTo(NavState::OBSTACLE_DETECTED);
            }
            break;

        case NavState::OBSTACLE_DETECTED:
            motors.stop();
            if (elapsed > 200) {
                transitionTo(NavState::SCANNING_LEFT);
            }
            break;

        case NavState::SCANNING_LEFT:
            if (elapsed > Config::SERVO_SETTLE_MS) {
                ScanResult scan = detector.performSurroundScan();
                scanLeftDist = scan.leftCm;
                scanRightDist = scan.rightCm;
                transitionTo(NavState::EVALUATING_PATH);
            }
            break;

        case NavState::EVALUATING_PATH: {
            // Check for dead end
            if (scanLeftDist < Config::DIST_AVOIDANCE_CM && scanRightDist < Config::DIST_AVOIDANCE_CM) {
                motors.reverse(Config::SPEED_REVERSE);
                transitionTo(NavState::REVERSING);
            } else {
                bool chooseLeft = (scanLeftDist >= scanRightDist);

                // Anti-oscillation heuristics: if difference is minor (< 4cm), check consecutive turns
                if (abs(scanLeftDist - scanRightDist) < 4.0f) {
                    if (turnHistory == 1 && consecutiveSameTurn >= 2) {
                        chooseLeft = false; // Alternate right to break oscillation
                        consecutiveSameTurn = 0;
                    } else if (turnHistory == 2 && consecutiveSameTurn >= 2) {
                        chooseLeft = true;  // Alternate left
                        consecutiveSameTurn = 0;
                    }
                }

                if (chooseLeft) {
                    motors.turnLeft(Config::SPEED_TURN);
                    turnHistory = 1;
                    consecutiveSameTurn++;
                    transitionTo(NavState::TURNING_LEFT);
                } else {
                    motors.turnRight(Config::SPEED_TURN);
                    turnHistory = 2;
                    consecutiveSameTurn++;
                    transitionTo(NavState::TURNING_RIGHT);
                }
            }
            break;
        }

        case NavState::TURNING_LEFT:
            // Turn for ~450ms for ~60 degree rotation
            if (elapsed > 450) {
                motors.stop();
                transitionTo(NavState::VERIFYING_PATH);
            }
            break;

        case NavState::TURNING_RIGHT:
            if (elapsed > 450) {
                motors.stop();
                transitionTo(NavState::VERIFYING_PATH);
            }
            break;

        case NavState::REVERSING:
            // Reverse for 650ms to create clearance
            if (elapsed > 650) {
                motors.stop();
                transitionTo(NavState::SCANNING_LEFT);
            }
            break;

        case NavState::VERIFYING_PATH:
            if (frontDist >= Config::DIST_CAUTION_CM) {
                transitionTo(NavState::RESUMING_MOVEMENT);
            } else {
                // Path still obstructed, re-scan
                transitionTo(NavState::SCANNING_LEFT);
            }
            break;

        case NavState::RESUMING_MOVEMENT:
            motors.forward(Config::SPEED_CRUISE);
            if (elapsed > 200) {
                transitionTo(NavState::MOVING_FORWARD);
            }
            break;

        case NavState::EMERGENCY_STOP:
            motors.brake();
            if (elapsed > 1200) {
                safety.clearEmergencyStop();
                motors.reverse(Config::SPEED_REVERSE);
                transitionTo(NavState::REVERSING);
            }
            break;

        case NavState::ERROR:
            motors.stop();
            break;
    }
}

void NavigationController::manualCommand(char command, uint8_t speed) {
    if (autonomousMode) return;

    switch (command) {
        case 'F': motors.forward(speed); break;
        case 'B': motors.reverse(speed); break;
        case 'L': motors.turnLeft(speed); break;
        case 'R': motors.turnRight(speed); break;
        case 'S': motors.stop(); break;
        case 'E': safety.triggerEmergencyStop("Manual emergency stop"); break;
    }
}
