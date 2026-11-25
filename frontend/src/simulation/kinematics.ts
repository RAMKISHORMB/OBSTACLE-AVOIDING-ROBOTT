/**
 * Differential Drive Kinematics and Motor Telemetry Calculations
 */

export const ROBOT_CONFIG = {
  WHEEL_BASE_M: 0.16,          // 16 cm track width
  WHEEL_RADIUS_M: 0.0325,      // 65 mm diameter standard wheels
  MAX_LINEAR_SPEED_MPS: 0.45,  // 0.45 m/s maximum speed
  MAX_MOTOR_RPM: 200.0,        // Standard 1:48 TT Gear Motor
  CM_TO_PX: 2.0,               // Scale factor: 1 cm = 2 px (50 cm = 100 px)
  ROBOT_RADIUS_PX: 24,         // 12 cm physical robot radius
  SENSOR_MAX_RANGE_CM: 300.0,
  SENSOR_MIN_RANGE_CM: 2.0,
  SAFE_DISTANCE_CM: 40.0,
  CAUTION_DISTANCE_CM: 40.0,
  AVOIDANCE_DISTANCE_CM: 20.0,
  EMERGENCY_STOP_DISTANCE_CM: 10.0,
};

export class RobotKinematics {
  private L: number;
  private r: number;
  private maxRpm: number;

  constructor(
    wheelBaseM: number = ROBOT_CONFIG.WHEEL_BASE_M,
    wheelRadiusM: number = ROBOT_CONFIG.WHEEL_RADIUS_M,
    maxRpm: number = ROBOT_CONFIG.MAX_MOTOR_RPM
  ) {
    this.L = wheelBaseM;
    this.r = wheelRadiusM;
    this.maxRpm = maxRpm;
  }

  /**
   * Inverse Kinematics: compute wheel linear velocities (m/s) from robot (v, w)
   */
  computeWheelSpeeds(linearVelMps: number, angularVelRadps: number): { vL: number; vR: number } {
    const vL = linearVelMps - (angularVelRadps * this.L) / 2.0;
    const vR = linearVelMps + (angularVelRadps * this.L) / 2.0;
    return { vL, vR };
  }

  /**
   * Forward Kinematics: compute robot (v, w) from wheel linear velocities (m/s)
   */
  computeRobotVelocities(vLMps: number, vRMps: number): { v: number; w: number } {
    const v = (vRMps + vLMps) / 2.0;
    const w = (vRMps - vLMps) / this.L;
    return { v, w };
  }

  /**
   * Converts wheel linear speed (m/s) to motor RPM
   */
  speedToRpm(speedMps: number): number {
    const revPerSec = speedMps / (2.0 * Math.PI * this.r);
    return revPerSec * 60.0;
  }

  /**
   * Converts RPM to 8-bit PWM (0-255) and direction
   */
  rpmToPwm(rpm: number): { pwm: number; dir: 'FORWARD' | 'REVERSE' | 'STOP' } {
    if (Math.abs(rpm) < 1.0) {
      return { pwm: 0, dir: 'STOP' };
    }
    const dir = rpm > 0 ? 'FORWARD' : 'REVERSE';
    const ratio = Math.min(1.0, Math.abs(rpm) / this.maxRpm);
    const minPwm = 50; // Stall threshold
    const pwm = Math.round(minPwm + (255 - minPwm) * ratio);
    return { pwm: Math.min(255, Math.max(0, pwm)), dir };
  }

  /**
   * Runge-Kutta 2nd Order (Midpoint) Numerical Integration
   */
  integratePose(
    x: number,
    y: number,
    thetaRad: number,
    linearVelUnits: number,
    angularVelRadps: number,
    dt: number
  ): { x: number; y: number; thetaRad: number } {
    const thetaMid = thetaRad + angularVelRadps * dt * 0.5;
    const newTheta = (thetaRad + angularVelRadps * dt) % (2.0 * Math.PI);
    const normalizedTheta = newTheta < 0 ? newTheta + 2.0 * Math.PI : newTheta;

    const newX = x + linearVelUnits * Math.cos(thetaMid) * dt;
    const newY = y + linearVelUnits * Math.sin(thetaMid) * dt;

    return { x: newX, y: newY, thetaRad: normalizedTheta };
  }
}
