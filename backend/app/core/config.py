from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "Autonomous Obstacle Avoiding Robot"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    CORS_ORIGINS: List[str] = ["*"]
    
    # Differential Drive Kinematic Parameters
    WHEEL_BASE_M: float = 0.16         # 16 cm track width between wheels
    WHEEL_RADIUS_M: float = 0.0325     # 65 mm diameter standard robot wheels
    MAX_LINEAR_SPEED_MPS: float = 0.45 # 0.45 m/s (~1.6 km/h)
    MAX_ANGULAR_SPEED_RADPS: float = 3.14 # ~180 deg/sec
    MAX_MOTOR_RPM: float = 200.0       # Standard TT Gear Motor (1:48)
    
    # Ultrasonic Sensor (HC-SR04) Parameters
    SENSOR_MAX_RANGE_CM: float = 300.0
    SENSOR_MIN_RANGE_CM: float = 2.0
    SAFE_DISTANCE_CM: float = 40.0
    CAUTION_DISTANCE_CM: float = 40.0
    AVOIDANCE_DISTANCE_CM: float = 20.0
    EMERGENCY_STOP_DISTANCE_CM: float = 10.0
    
    # Servo Scanning Angles (Degrees relative to robot heading)
    SERVO_CENTER_DEG: float = 0.0
    SERVO_LEFT_DEG: float = 60.0
    SERVO_RIGHT_DEG: float = -60.0
    
    class Config:
        case_sensitive = True


settings = Settings()
