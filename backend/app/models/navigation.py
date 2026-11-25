from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class NavigationState(str, Enum):
    INITIALIZING = "INITIALIZING"
    IDLE = "IDLE"
    MOVING_FORWARD = "MOVING_FORWARD"
    OBSTACLE_DETECTED = "OBSTACLE_DETECTED"
    EMERGENCY_STOP = "EMERGENCY_STOP"
    SCANNING_LEFT = "SCANNING_LEFT"
    SCANNING_RIGHT = "SCANNING_RIGHT"
    EVALUATING_PATH = "EVALUATING_PATH"
    TURNING_LEFT = "TURNING_LEFT"
    TURNING_RIGHT = "TURNING_RIGHT"
    REVERSING = "REVERSING"
    VERIFYING_PATH = "VERIFYING_PATH"
    RESUMING_MOVEMENT = "RESUMING_MOVEMENT"
    ERROR = "ERROR"


class SensorZone(str, Enum):
    SAFE = "SAFE"
    CAUTION = "CAUTION"
    AVOIDANCE = "AVOIDANCE"
    EMERGENCY = "EMERGENCY"


class ClearanceEvaluation(BaseModel):
    front_distance_cm: float = Field(..., description="Front clearance in cm")
    left_distance_cm: float = Field(..., description="Left clearance in cm")
    right_distance_cm: float = Field(..., description="Right clearance in cm")
    selected_direction: Optional[str] = Field(None, description="'LEFT', 'RIGHT', 'REVERSE', or 'STOP'")
    decision_reason: str = Field("", description="Explanation of navigation decision")
    timestamp: float = Field(..., description="Epoch timestamp of evaluation")
