/**
 * @file SafetyManager.cpp
 * @brief Implementation of ESP32 Hardware Watchdog and Safety Subsystem
 */

#include "SafetyManager.h"

SafetyManager::SafetyManager(MotorController& motors)
    : motorCtrl(motors), emergencyActive(false), emergencyReason("None"),
      lastBlinkTime(0), ledState(false) {}

void SafetyManager::init() {
    pinMode(Config::PIN_STATUS_LED, OUTPUT);
    pinMode(Config::PIN_BUZZER, OUTPUT);
    digitalWrite(Config::PIN_STATUS_LED, LOW);
    digitalWrite(Config::PIN_BUZZER, LOW);

    // Initialize ESP32 Task Watchdog Timer (3 seconds timeout)
    #if defined(ESP_IDF_VERSION_MAJOR) && ESP_IDF_VERSION_MAJOR >= 5
        esp_task_wdt_config_t twdt_config = {
            .timeout_ms = Config::WATCHDOG_TIMEOUT_SEC * 1000,
            .idle_core_mask = (1 << 0),
            .trigger_panic = true
        };
        esp_task_wdt_init(&twdt_config);
        esp_task_wdt_add(NULL);
    #else
        esp_task_wdt_init(Config::WATCHDOG_TIMEOUT_SEC, true);
        esp_task_wdt_add(NULL);
    #endif

    // Startup beep
    soundAlarm(2500, 80);
}

void SafetyManager::feedWatchdog() {
    esp_task_wdt_reset();
}

void SafetyManager::triggerEmergencyStop(const char* reason) {
    emergencyActive = true;
    emergencyReason = reason;
    motorCtrl.brake();
    soundAlarm(3000, 300);
}

void SafetyManager::clearEmergencyStop() {
    emergencyActive = false;
    emergencyReason = "None";
    motorCtrl.stop();
}

void SafetyManager::updateIndicators() {
    uint32_t now = millis();
    uint32_t blinkInterval = emergencyActive ? 100 : 800;

    if (now - lastBlinkTime >= blinkInterval) {
        lastBlinkTime = now;
        ledState = !ledState;
        digitalWrite(Config::PIN_STATUS_LED, ledState ? HIGH : LOW);
    }
}

void SafetyManager::soundAlarm(uint16_t freqHz, uint32_t durationMs) {
    tone(Config::PIN_BUZZER, freqHz, durationMs);
}
