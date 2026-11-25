/**
 * @file ServoController.cpp
 * @brief Implementation of SG90 Ultrasonic Turret Controller
 */

#include "ServoController.h"

ServoController::ServoController() : currentAngle(Config::SERVO_ANGLE_CENTER) {}

void ServoController::init() {
    // Standard 50Hz PWM for SG90 servo
    servo.setPeriodHertz(50);
    servo.attach(Config::PIN_SERVO_PWM, 500, 2400); // 500us to 2400us pulse bounds
    lookCenter();
}

void ServoController::setAngle(int angleDeg) {
    currentAngle = constrain(angleDeg, 0, 180);
    servo.write(currentAngle);
}

void ServoController::lookCenter() {
    setAngle(Config::SERVO_ANGLE_CENTER);
}

void ServoController::lookLeft() {
    setAngle(Config::SERVO_ANGLE_LEFT);
}

void ServoController::lookRight() {
    setAngle(Config::SERVO_ANGLE_RIGHT);
}
