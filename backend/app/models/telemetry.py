from typing import List, Optional, Tuple
from pydantic import BaseModel, Field
from .navigation import NavigationState, SensorZone


class MotorState(BaseModel):
    left_rpm: float = Field(default=0.0, description="Left motor rotational speed in RPM")
    right_rpm: float = Field(default=0.0, description="Right motor rotational speed in RPM")
    left_pwm: int = Field(default=0, ge=0, le=255, description="Left PWM duty cycle (0-255)")
    right_pwm: int = Field(default=0, ge=0, le=255, description="Right PWM duty cycle (0-255)")
    left_dir: str = Field(default="STOP", description="'FORWARD', 'REVERSE', 'STOP', 'BRAKE'")
    right_dir: str = Field(default="STOP", description="'FORWARD', 'REVERSE', 'STOP', 'BRAKE'")
    current_ma: float = Field(default=120.0, description="Simulated total motor current in mA")


class SensorReading(BaseModel):
    front_distance_cm: float = Field(..., description="Front ultrasonic sensor distance in cm")
    left_distance_cm: float = Field(..., description="Left ultrasonic reading/scan in cm")
    right_distance_cm: float = Field(..., description="Right ultrasonic reading/scan in cm")
    servo_angle_deg: float = Field(default=0.0, description="Current servo scan angle in degrees (-60 to +60)")
    zone: SensorZone = Field(default=SensorZone.SAFE, description="Hazard evaluation zone")
    is_scanning: bool = Field(default=False, description="Whether ultrasonic servo is currently sweeping")
    timestamp: float = Field(..., description="Sample timestamp (epoch seconds)")


class RobotPosition(BaseModel):
    x: float = Field(default=400.0, description="X coordinate in simulation canvas units")
    y: float = Field(default=300.0, description="Y coordinate in simulation canvas units")
    heading_rad: float = Field(default=0.0, description="Robot heading angle in radians (0 = pointing right, -pi/2 = up)")
    heading_deg: float = Field(default=0.0, description="Robot heading angle in degrees (0 to 360)")
    linear_velocity: float = Field(default=0.0, description="Current linear velocity in units/sec")
    angular_velocity: float = Field(default=0.0, description="Current angular velocity in rad/sec")


class RobotStatus(BaseModel):
    is_running: bool = Field(default=False, description="Whether the simulation/robot is actively running")
    mode: str = Field(default="AUTONOMOUS", description="'AUTONOMOUS' or 'MANUAL'")
    state: NavigationState = Field(default=NavigationState.IDLE, description="Current navigation state")
    position: RobotPosition = Field(default_factory=RobotPosition)
    sensors: SensorReading
    motors: MotorState = Field(default_factory=MotorState)
    emergency_stop: bool = Field(default=False, description="Whether emergency stop fail-safe is engaged")
    collision_count: int = Field(default=0, description="Total collision encounters registered")
    uptime_sec: float = Field(default=0.0, description="Active runtime in seconds")
    battery_voltage: float = Field(default=8.2, description="Simulated 2S Li-ion battery voltage")
    battery_percentage: float = Field(default=96.5, description="Battery percentage remaining")
    active_scenario: str = Field(default="Multiple Obstacles", description="Active environment preset")


class CommandRequest(BaseModel):
    action: str = Field(..., description="'FORWARD', 'REVERSE', 'LEFT', 'RIGHT', 'STOP', 'EMERGENCY_STOP', 'RESET'")
    linear_speed: Optional[float] = Field(default=None, description="Override linear speed ratio (0.0 to 1.0)")
    angular_speed: Optional[float] = Field(default=None, description="Override angular speed ratio (-1.0 to 1.0)")


class ModeRequest(BaseModel):
    mode: str = Field(..., description="'AUTONOMOUS' or 'MANUAL'")


class SimulationControlRequest(BaseModel):
    speed_multiplier: Optional[float] = Field(default=1.0, ge=0.25, le=4.0)
    scenario: Optional[str] = None
