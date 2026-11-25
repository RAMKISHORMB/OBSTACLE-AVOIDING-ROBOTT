/**
 * @file SafetyManager.h
 * @brief Hardware Watchdog, Fail-Safe Trigger, and System Diagnostics Monitor
 */

#pragma once

#include <Arduino.h>
#include <esp_task_wdt.h>
#include "Configuration.h"
#include "MotorController.h"

class SafetyManager {
public:
    SafetyManager(MotorController& motors);
    void init();

    void feedWatchdog();
    void triggerEmergencyStop(const char* reason);
    void clearEmergencyStop();

    bool isEmergencyActive() const { return emergencyActive; }
    const char* getEmergencyReason() const { return emergencyReason; }

    void updateIndicators();
    void soundAlarm(uint16_t freqHz = 2000, uint32_t durationMs = 150);

private:
    MotorController& motorCtrl;
    bool emergencyActive;
    const char* emergencyReason;
    uint32_t lastBlinkTime;
    bool ledState;
};
