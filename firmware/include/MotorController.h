/**
 * @file MotorController.h
 * @brief Differential Drive DC Motor Controller for ESP32 with LEDC PWM
 */

#pragma once

#include <Arduino.h>
#include "Configuration.h"

enum class MotorDirection {
    FORWARD,
    REVERSE,
    STOP,
    BRAKE
};

class MotorController {
public:
    MotorController();
    void init();

    void forward(uint8_t speed = Config::SPEED_CRUISE);
    void reverse(uint8_t speed = Config::SPEED_REVERSE);
    void turnLeft(uint8_t speed = Config::SPEED_TURN);
    void turnRight(uint8_t speed = Config::SPEED_TURN);
    void stop();
    void brake();

    void setIndividualMotors(int16_t leftPwm, int16_t rightPwm);

    uint8_t getLeftPwm() const { return currentLeftPwm; }
    uint8_t getRightPwm() const { return currentRightPwm; }
    MotorDirection getLeftDirection() const { return leftDir; }
    MotorDirection getRightDirection() const { return rightDir; }

private:
    void applyMotorChannel(uint8_t in1Pin, uint8_t in2Pin, uint8_t pwmChannel, int16_t signedSpeed);

    uint8_t currentLeftPwm;
    uint8_t currentRightPwm;
    MotorDirection leftDir;
    MotorDirection rightDir;
};
