/**
 * @file ServoController.h
 * @brief SG90 Micro Servo Controller for Panning Ultrasonic Sensor
 */

#pragma once

#include <Arduino.h>
#include <ESP32Servo.h>
#include "Configuration.h"

class ServoController {
public:
    ServoController();
    void init();

    void setAngle(int angleDeg);
    void lookCenter();
    void lookLeft();
    void lookRight();

    int getCurrentAngle() const { return currentAngle; }

private:
    Servo servo;
    int currentAngle;
};
