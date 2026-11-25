/**
 * @file MotorController.cpp
 * @brief Implementation of ESP32 LEDC PWM Motor Controller
 */

#include "MotorController.h"

MotorController::MotorController()
    : currentLeftPwm(0), currentRightPwm(0),
      leftDir(MotorDirection::STOP), rightDir(MotorDirection::STOP) {}

void MotorController::init() {
    // Configure directional GPIO pins
    pinMode(Config::PIN_MOTOR_LEFT_IN1, OUTPUT);
    pinMode(Config::PIN_MOTOR_LEFT_IN2, OUTPUT);
    pinMode(Config::PIN_MOTOR_RIGHT_IN3, OUTPUT);
    pinMode(Config::PIN_MOTOR_RIGHT_IN4, OUTPUT);

    // Initial low
    digitalWrite(Config::PIN_MOTOR_LEFT_IN1, LOW);
    digitalWrite(Config::PIN_MOTOR_LEFT_IN2, LOW);
    digitalWrite(Config::PIN_MOTOR_RIGHT_IN3, LOW);
    digitalWrite(Config::PIN_MOTOR_RIGHT_IN4, LOW);

    // Setup ESP32 LEDC PWM Timer Channels
    ledcSetup(Config::PWM_CHANNEL_LEFT, Config::PWM_FREQUENCY, Config::PWM_RESOLUTION_BITS);
    ledcAttachPin(Config::PIN_MOTOR_LEFT_PWM, Config::PWM_CHANNEL_LEFT);

    ledcSetup(Config::PWM_CHANNEL_RIGHT, Config::PWM_FREQUENCY, Config::PWM_RESOLUTION_BITS);
    ledcAttachPin(Config::PIN_MOTOR_RIGHT_PWM, Config::PWM_CHANNEL_RIGHT);

    stop();
}

void MotorController::applyMotorChannel(uint8_t in1Pin, uint8_t in2Pin, uint8_t pwmChannel, int16_t signedSpeed) {
    uint8_t clamped = (uint8_t)constrain(abs(signedSpeed), 0, 255);

    if (signedSpeed > 0) {
        digitalWrite(in1Pin, HIGH);
        digitalWrite(in2Pin, LOW);
        ledcWrite(pwmChannel, clamped);
    } else if (signedSpeed < 0) {
        digitalWrite(in1Pin, LOW);
        digitalWrite(in2Pin, HIGH);
        ledcWrite(pwmChannel, clamped);
    } else {
        // Coasting Stop
        digitalWrite(in1Pin, LOW);
        digitalWrite(in2Pin, LOW);
        ledcWrite(pwmChannel, 0);
    }
}

void MotorController::forward(uint8_t speed) {
    currentLeftPwm = speed;
    currentRightPwm = speed;
    leftDir = MotorDirection::FORWARD;
    rightDir = MotorDirection::FORWARD;

    applyMotorChannel(Config::PIN_MOTOR_LEFT_IN1, Config::PIN_MOTOR_LEFT_IN2, Config::PWM_CHANNEL_LEFT, speed);
    applyMotorChannel(Config::PIN_MOTOR_RIGHT_IN3, Config::PIN_MOTOR_RIGHT_IN4, Config::PWM_CHANNEL_RIGHT, speed);
}

void MotorController::reverse(uint8_t speed) {
    currentLeftPwm = speed;
    currentRightPwm = speed;
    leftDir = MotorDirection::REVERSE;
    rightDir = MotorDirection::REVERSE;

    applyMotorChannel(Config::PIN_MOTOR_LEFT_IN1, Config::PIN_MOTOR_LEFT_IN2, Config::PWM_CHANNEL_LEFT, -((int16_t)speed));
    applyMotorChannel(Config::PIN_MOTOR_RIGHT_IN3, Config::PIN_MOTOR_RIGHT_IN4, Config::PWM_CHANNEL_RIGHT, -((int16_t)speed));
}

void MotorController::turnLeft(uint8_t speed) {
    // Spin in place CCW: Left motor backwards, right motor forwards
    currentLeftPwm = speed;
    currentRightPwm = speed;
    leftDir = MotorDirection::REVERSE;
    rightDir = MotorDirection::FORWARD;

    applyMotorChannel(Config::PIN_MOTOR_LEFT_IN1, Config::PIN_MOTOR_LEFT_IN2, Config::PWM_CHANNEL_LEFT, -((int16_t)speed));
    applyMotorChannel(Config::PIN_MOTOR_RIGHT_IN3, Config::PIN_MOTOR_RIGHT_IN4, Config::PWM_CHANNEL_RIGHT, (int16_t)speed);
}

void MotorController::turnRight(uint8_t speed) {
    // Spin in place CW: Left motor forwards, right motor backwards
    currentLeftPwm = speed;
    currentRightPwm = speed;
    leftDir = MotorDirection::FORWARD;
    rightDir = MotorDirection::REVERSE;

    applyMotorChannel(Config::PIN_MOTOR_LEFT_IN1, Config::PIN_MOTOR_LEFT_IN2, Config::PWM_CHANNEL_LEFT, (int16_t)speed);
    applyMotorChannel(Config::PIN_MOTOR_RIGHT_IN3, Config::PIN_MOTOR_RIGHT_IN4, Config::PWM_CHANNEL_RIGHT, -((int16_t)speed));
}

void MotorController::stop() {
    currentLeftPwm = 0;
    currentRightPwm = 0;
    leftDir = MotorDirection::STOP;
    rightDir = MotorDirection::STOP;

    applyMotorChannel(Config::PIN_MOTOR_LEFT_IN1, Config::PIN_MOTOR_LEFT_IN2, Config::PWM_CHANNEL_LEFT, 0);
    applyMotorChannel(Config::PIN_MOTOR_RIGHT_IN3, Config::PIN_MOTOR_RIGHT_IN4, Config::PWM_CHANNEL_RIGHT, 0);
}

void MotorController::brake() {
    // Active electrical braking: both terminals pulled HIGH with PWM=255
    digitalWrite(Config::PIN_MOTOR_LEFT_IN1, HIGH);
    digitalWrite(Config::PIN_MOTOR_LEFT_IN2, HIGH);
    digitalWrite(Config::PIN_MOTOR_RIGHT_IN3, HIGH);
    digitalWrite(Config::PIN_MOTOR_RIGHT_IN4, HIGH);
    ledcWrite(Config::PWM_CHANNEL_LEFT, 255);
    ledcWrite(Config::PWM_CHANNEL_RIGHT, 255);

    currentLeftPwm = 0;
    currentRightPwm = 0;
    leftDir = MotorDirection::BRAKE;
    rightDir = MotorDirection::BRAKE;
}

void MotorController::setIndividualMotors(int16_t leftPwm, int16_t rightPwm) {
    currentLeftPwm = abs(leftPwm);
    currentRightPwm = abs(rightPwm);
    leftDir = (leftPwm > 0) ? MotorDirection::FORWARD : ((leftPwm < 0) ? MotorDirection::REVERSE : MotorDirection::STOP);
    rightDir = (rightPwm > 0) ? MotorDirection::FORWARD : ((rightPwm < 0) ? MotorDirection::REVERSE : MotorDirection::STOP);

    applyMotorChannel(Config::PIN_MOTOR_LEFT_IN1, Config::PIN_MOTOR_LEFT_IN2, Config::PWM_CHANNEL_LEFT, leftPwm);
    applyMotorChannel(Config::PIN_MOTOR_RIGHT_IN3, Config::PIN_MOTOR_RIGHT_IN4, Config::PWM_CHANNEL_RIGHT, rightPwm);
}
