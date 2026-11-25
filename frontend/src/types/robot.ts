export type NavigationState =
  | 'INITIALIZING'
  | 'IDLE'
  | 'MOVING_FORWARD'
  | 'OBSTACLE_DETECTED'
  | 'EMERGENCY_STOP'
  | 'SCANNING_LEFT'
  | 'SCANNING_RIGHT'
  | 'EVALUATING_PATH'
  | 'TURNING_LEFT'
  | 'TURNING_RIGHT'
  | 'REVERSING'
  | 'VERIFYING_PATH'
  | 'RESUMING_MOVEMENT'
  | 'ERROR';

export type SensorZone = 'SAFE' | 'CAUTION' | 'AVOIDANCE' | 'EMERGENCY';

export type ControlMode = 'AUTONOMOUS' | 'MANUAL';

export interface MotorState {
  left_rpm: number;
  right_rpm: number;
  left_pwm: number;
  right_pwm: number;
  left_dir: 'FORWARD' | 'REVERSE' | 'STOP' | 'BRAKE';
  right_dir: 'FORWARD' | 'REVERSE' | 'STOP' | 'BRAKE';
  current_ma: number;
}

export interface SensorReading {
  front_distance_cm: number;
  left_distance_cm: number;
  right_distance_cm: number;
  servo_angle_deg: number;
  zone: SensorZone;
  is_scanning: boolean;
  timestamp: number;
}

export interface RobotPosition {
  x: number;
  y: number;
  heading_rad: number;
  heading_deg: number;
  linear_velocity: number;
  angular_velocity: number;
}

export interface RobotStatus {
  is_running: boolean;
  mode: ControlMode;
  state: NavigationState;
  position: RobotPosition;
  sensors: SensorReading;
  motors: MotorState;
  emergency_stop: boolean;
  collision_count: number;
  uptime_sec: number;
  battery_voltage: number;
  battery_percentage: number;
  active_scenario: string;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'wall' | 'box' | 'cylinder' | 'movable';
  label?: string;
  color?: string;
}

export interface ActivityLog {
  id: number;
  timestamp: number;
  level: 'INFO' | 'WARN' | 'ERROR' | 'NAV' | 'SENSOR';
  subsystem: string;
  message: string;
}

export interface RayHit {
  hitX: number;
  hitY: number;
  distancePx: number;
  distanceCm: number;
  obstacleId?: string;
}
