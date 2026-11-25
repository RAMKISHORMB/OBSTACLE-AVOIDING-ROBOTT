import {
  ActivityLog,
  ControlMode,
  NavigationState,
  Obstacle,
  RobotStatus,
  SensorReading,
  SensorZone,
} from '../types/robot';
import { ROBOT_CONFIG, RobotKinematics } from './kinematics';
import { castSingleRay, castUltrasonicCone } from './raycaster';

export interface SimulationEngineOptions {
  width?: number;
  height?: number;
  onLog?: (log: ActivityLog) => void;
}

export class SimulationEngine {
  public width: number;
  public height: number;
  private kinematics: RobotKinematics;

  // State
  public isRunning: boolean = true;
  public mode: ControlMode = 'AUTONOMOUS';
  public state: NavigationState = 'IDLE';
  public speedMultiplier: number = 1.0;
  public emergencyStop: boolean = false;
  public collisionCount: number = 0;
  public uptimeSec: number = 0;
  public startTime: number = Date.now();

  // Pose & Dynamics
  public x: number = 400;
  public y: number = 300;
  public headingRad: number = 0.0;
  public linearVel: number = 0.0;
  public angularVel: number = 0.0;
  public targetLinearVel: number = 0.0;
  public targetAngularVel: number = 0.0;

  // Servo & Sonar
  public servoAngleDeg: number = 0.0;
  public frontDistanceCm: number = 150.0;
  public leftDistanceCm: number = 150.0;
  public rightDistanceCm: number = 150.0;
  public isScanning: boolean = false;
  public zone: SensorZone = 'SAFE';

  // Navigation FSM internal timers
  private stateTimer: number = 0.0;
  private scanLeftReading: number = 150.0;
  private scanRightReading: number = 150.0;
  private lastTurnDirection: 'LEFT' | 'RIGHT' | null = null;
  private turnHistoryCounter: number = 0;
  private reverseDuration: number = 0.8;
  private turnDuration: number = 0.65;
  private manualLinearFactor: number = 1.0;

  // Environment
  public activeScenario: string = 'Multiple Obstacles';
  public obstacles: Obstacle[] = [];
  public pathTrail: { x: number; y: number }[] = [];
  private lastTrailTime: number = 0;

  // Activity logs
  public activityLogs: ActivityLog[] = [];
  private logIdCounter: number = 1;
  private onLogCallback?: (log: ActivityLog) => void;

  constructor(options: SimulationEngineOptions = {}) {
    this.width = options.width || 800;
    this.height = options.height || 600;
    this.kinematics = new RobotKinematics();
    this.onLogCallback = options.onLog;
    this.loadScenario('Multiple Obstacles');
  }

  public logEvent(level: ActivityLog['level'], subsystem: string, message: string) {
    const log: ActivityLog = {
      id: this.logIdCounter++,
      timestamp: Math.round(Date.now() / 1000 * 100) / 100,
      level,
      subsystem,
      message,
    };
    this.activityLogs.unshift(log);
    if (this.activityLogs.length > 300) {
      this.activityLogs.pop();
    }
    if (this.onLogCallback) {
      this.onLogCallback(log);
    }
  }

  public loadScenario(scenarioName: string) {
    this.activeScenario = scenarioName;
    this.obstacles = [];
    const pad = 16;
    const w = this.width;
    const h = this.height;

    // Outer boundary walls
    this.obstacles.push(
      { id: 'wall-top', x: 0, y: 0, width: w, height: pad, type: 'wall', label: 'Top Boundary' },
      { id: 'wall-bottom', x: 0, y: h - pad, width: w, height: pad, type: 'wall', label: 'Bottom Boundary' },
      { id: 'wall-left', x: 0, y: 0, width: pad, height: h, type: 'wall', label: 'Left Boundary' },
      { id: 'wall-right', x: w - pad, y: 0, width: pad, height: h, type: 'wall', label: 'Right Boundary' }
    );

    if (scenarioName === 'Open Space') {
      this.x = 400;
      this.y = 300;
      this.headingRad = 0.0;
    } else if (scenarioName === 'Single Obstacle') {
      this.obstacles.push({
        id: 'obs-single',
        x: 440,
        y: 240,
        width: 90,
        height: 120,
        type: 'box',
        label: 'Monolith',
      });
      this.x = 180;
      this.y = 300;
      this.headingRad = 0.0;
    } else if (scenarioName === 'Multiple Obstacles') {
      this.obstacles.push(
        { id: 'obs-1', x: 220, y: 140, width: 70, height: 130, type: 'box', label: 'Column A' },
        { id: 'obs-2', x: 480, y: 110, width: 90, height: 90, type: 'box', label: 'Crate B' },
        { id: 'obs-3', x: 330, y: 320, width: 140, height: 70, type: 'box', label: 'Barrier C' },
        { id: 'obs-4', x: 580, y: 340, width: 80, height: 140, type: 'box', label: 'Pillar D' },
        { id: 'obs-5', x: 150, y: 400, width: 110, height: 80, type: 'box', label: 'Container E' }
      );
      this.x = 120;
      this.y = 200;
      this.headingRad = 0.15;
    } else if (scenarioName === 'Narrow Corridor') {
      this.obstacles.push(
        { id: 'corr-top', x: 90, y: 210, width: 580, height: 26, type: 'wall', label: 'North Partition' },
        { id: 'corr-bottom', x: 90, y: 350, width: 580, height: 26, type: 'wall', label: 'South Partition' },
        { id: 'corr-baffle', x: 630, y: 240, width: 30, height: 85, type: 'box', label: 'Chicane' }
      );
      this.x = 130;
      this.y = 285;
      this.headingRad = 0.0;
    } else if (scenarioName === 'Complex Maze') {
      this.obstacles.push(
        { id: 'maze-1', x: 170, y: 16, width: 24, height: 270, type: 'wall' },
        { id: 'maze-2', x: 170, y: 380, width: 24, height: 204, type: 'wall' },
        { id: 'maze-3', x: 340, y: 110, width: 24, height: 350, type: 'wall' },
        { id: 'maze-4', x: 510, y: 16, width: 24, height: 280, type: 'wall' },
        { id: 'maze-5', x: 510, y: 400, width: 24, height: 184, type: 'wall' },
        { id: 'maze-6', x: 340, y: 460, width: 170, height: 24, type: 'wall' }
      );
      this.x = 80;
      this.y = 90;
      this.headingRad = 0.0;
    } else if (scenarioName === 'Dead-End Recovery') {
      this.obstacles.push(
        { id: 'dead-top', x: 280, y: 190, width: 260, height: 24, type: 'wall', label: 'Cul-de-sac Top' },
        { id: 'dead-bottom', x: 280, y: 370, width: 260, height: 24, type: 'wall', label: 'Cul-de-sac Bottom' },
        { id: 'dead-back', x: 516, y: 190, width: 24, height: 204, type: 'wall', label: 'Cul-de-sac End' }
      );
      this.x = 340;
      this.y = 280;
      this.headingRad = 0.0;
    }

    this.state = 'INITIALIZING';
    this.stateTimer = 0.0;
    this.emergencyStop = false;
    this.pathTrail = [];
    this.logEvent('INFO', 'SIMULATION', `Scenario loaded: ${scenarioName}`);
  }

  public generateRandomObstacles() {
    this.activeScenario = 'Random Generated';
    this.obstacles = this.obstacles.filter((o) => o.type === 'wall'); // keep boundaries
    const count = Math.floor(Math.random() * 4) + 4;

    for (let i = 0; i < count; i++) {
      const w = Math.floor(Math.random() * 60) + 40;
      const h = Math.floor(Math.random() * 60) + 40;
      const x = Math.floor(Math.random() * (this.width - 200)) + 80;
      const y = Math.floor(Math.random() * (this.height - 200)) + 60;
      this.obstacles.push({
        id: `random-${i + 1}`,
        x,
        y,
        width: w,
        height: h,
        type: 'box',
        label: `Obstacle ${i + 1}`,
      });
    }

    this.x = 80;
    this.y = 80;
    this.headingRad = 0.5;
    this.pathTrail = [];
    this.logEvent('INFO', 'ENVIRONMENT', `Generated ${count} randomized obstacles.`);
  }

  public evaluateZone(distCm: number): SensorZone {
    if (distCm < ROBOT_CONFIG.EMERGENCY_STOP_DISTANCE_CM) return 'EMERGENCY';
    if (distCm < ROBOT_CONFIG.AVOIDANCE_DISTANCE_CM) return 'AVOIDANCE';
    if (distCm < ROBOT_CONFIG.CAUTION_DISTANCE_CM) return 'CAUTION';
    return 'SAFE';
  }

  public measureDistance(angleOffsetDeg: number = 0.0): number {
    const totalAngle = this.headingRad + (angleOffsetDeg * Math.PI) / 180.0;
    const sensorOffset = ROBOT_CONFIG.ROBOT_RADIUS_PX * 0.9;
    const ox = this.x + Math.cos(this.headingRad) * sensorOffset;
    const oy = this.y + Math.sin(this.headingRad) * sensorOffset;

    const maxDistPx = ROBOT_CONFIG.SENSOR_MAX_RANGE_CM * ROBOT_CONFIG.CM_TO_PX;
    const result = castUltrasonicCone(ox, oy, totalAngle, maxDistPx, this.obstacles, 14.0, 5);
    return result.minHit.distanceCm;
  }

  public checkRobotCollision(x: number = this.x, y: number = this.y): boolean {
    const r = ROBOT_CONFIG.ROBOT_RADIUS_PX;
    for (const obs of this.obstacles) {
      const closestX = Math.max(obs.x, Math.min(x, obs.x + obs.width));
      const closestY = Math.max(obs.y, Math.min(y, obs.y + obs.height));
      const dx = x - closestX;
      const dy = y - closestY;
      if (dx * dx + dy * dy < r * r) {
        return true;
      }
    }
    return false;
  }

  private updateAutonomousNavigation(dt: number) {
    this.stateTimer += dt;
    this.frontDistanceCm = this.measureDistance(this.servoAngleDeg);
    this.zone = this.evaluateZone(this.frontDistanceCm);

    // Global Emergency Stop Check
    if (
      this.frontDistanceCm < ROBOT_CONFIG.EMERGENCY_STOP_DISTANCE_CM &&
      this.state !== 'REVERSING' &&
      this.state !== 'EMERGENCY_STOP'
    ) {
      this.state = 'EMERGENCY_STOP';
      this.stateTimer = 0.0;
      this.targetLinearVel = 0.0;
      this.targetAngularVel = 0.0;
      this.logEvent('ERROR', 'SAFETY', `EMERGENCY STOP engaged! Distance: ${this.frontDistanceCm.toFixed(1)} cm`);
      return;
    }

    switch (this.state) {
      case 'INITIALIZING':
        this.targetLinearVel = 0.0;
        this.targetAngularVel = 0.0;
        if (this.stateTimer > 0.5) {
          this.state = 'MOVING_FORWARD';
          this.stateTimer = 0.0;
          this.targetLinearVel = 75.0;
          this.logEvent('INFO', 'NAVIGATION', 'Subsystems initialized. Cruising forward.');
        }
        break;

      case 'IDLE':
        this.targetLinearVel = 0.0;
        this.targetAngularVel = 0.0;
        if (this.isRunning) {
          this.state = 'MOVING_FORWARD';
          this.stateTimer = 0.0;
          this.targetLinearVel = 75.0;
        }
        break;

      case 'MOVING_FORWARD':
        this.targetLinearVel = 75.0;
        this.targetAngularVel = 0.0;
        this.servoAngleDeg = 0.0;

        if (this.frontDistanceCm <= ROBOT_CONFIG.AVOIDANCE_DISTANCE_CM) {
          this.state = 'OBSTACLE_DETECTED';
          this.stateTimer = 0.0;
          this.targetLinearVel = 0.0;
          this.logEvent('WARN', 'NAVIGATION', `Obstacle detected at ${this.frontDistanceCm.toFixed(1)} cm. Halting.`);
        }
        break;

      case 'OBSTACLE_DETECTED':
        this.targetLinearVel = 0.0;
        this.targetAngularVel = 0.0;
        if (this.stateTimer > 0.15) {
          this.state = 'SCANNING_LEFT';
          this.stateTimer = 0.0;
          this.isScanning = true;
          this.logEvent('NAV', 'SENSOR', 'Panning servo left (+60 deg) for clearance scan.');
        }
        break;

      case 'SCANNING_LEFT':
        this.servoAngleDeg = 60.0;
        if (this.stateTimer > 0.28) {
          this.scanLeftReading = this.measureDistance(60.0);
          this.leftDistanceCm = this.scanLeftReading;
          this.state = 'SCANNING_RIGHT';
          this.stateTimer = 0.0;
          this.logEvent('NAV', 'SENSOR', `Left corridor clearance: ${this.scanLeftReading.toFixed(1)} cm`);
        }
        break;

      case 'SCANNING_RIGHT':
        this.servoAngleDeg = -60.0;
        if (this.stateTimer > 0.28) {
          this.scanRightReading = this.measureDistance(-60.0);
          this.rightDistanceCm = this.scanRightReading;
          this.servoAngleDeg = 0.0;
          this.isScanning = false;
          this.state = 'EVALUATING_PATH';
          this.stateTimer = 0.0;
          this.logEvent('NAV', 'SENSOR', `Right corridor clearance: ${this.scanRightReading.toFixed(1)} cm`);
        }
        break;

      case 'EVALUATING_PATH': {
        const leftClear = this.scanLeftReading;
        const rightClear = this.scanRightReading;
        const minAvoid = ROBOT_CONFIG.AVOIDANCE_DISTANCE_CM;

        // Dead-end condition: both ways blocked
        if (leftClear < minAvoid && rightClear < minAvoid) {
          this.state = 'REVERSING';
          this.stateTimer = 0.0;
          this.reverseDuration = 0.75;
          this.logEvent('WARN', 'NAVIGATION', 'Dead-end detected! Reversing to create maneuver space.');
        } else {
          let chooseLeft = leftClear > rightClear;

          // Anti-oscillation heuristics: if difference is narrow (< 6cm)
          if (Math.abs(leftClear - rightClear) < 6.0) {
            this.turnHistoryCounter++;
            if (this.turnHistoryCounter >= 2) {
              chooseLeft = this.lastTurnDirection === 'RIGHT';
              this.turnHistoryCounter = 0;
            }
          }

          if (chooseLeft) {
            this.state = 'TURNING_LEFT';
            this.lastTurnDirection = 'LEFT';
            this.turnDuration = 0.62;
            this.logEvent('INFO', 'NAVIGATION', `Selected LEFT path (L: ${leftClear.toFixed(1)}cm vs R: ${rightClear.toFixed(1)}cm)`);
          } else {
            this.state = 'TURNING_RIGHT';
            this.lastTurnDirection = 'RIGHT';
            this.turnDuration = 0.62;
            this.logEvent('INFO', 'NAVIGATION', `Selected RIGHT path (R: ${rightClear.toFixed(1)}cm vs L: ${leftClear.toFixed(1)}cm)`);
          }
          this.stateTimer = 0.0;
        }
        break;
      }

      case 'TURNING_LEFT':
        this.targetLinearVel = 0.0;
        this.targetAngularVel = -2.4; // rad/s CCW
        if (this.stateTimer >= this.turnDuration) {
          this.targetAngularVel = 0.0;
          this.state = 'VERIFYING_PATH';
          this.stateTimer = 0.0;
          this.logEvent('NAV', 'NAVIGATION', 'Rotation finished. Verifying forward corridor.');
        }
        break;

      case 'TURNING_RIGHT':
        this.targetLinearVel = 0.0;
        this.targetAngularVel = 2.4; // rad/s CW
        if (this.stateTimer >= this.turnDuration) {
          this.targetAngularVel = 0.0;
          this.state = 'VERIFYING_PATH';
          this.stateTimer = 0.0;
          this.logEvent('NAV', 'NAVIGATION', 'Rotation finished. Verifying forward corridor.');
        }
        break;

      case 'REVERSING':
        this.targetLinearVel = -48.0;
        this.targetAngularVel = 0.0;
        if (this.stateTimer >= this.reverseDuration) {
          this.targetLinearVel = 0.0;
          this.state = 'SCANNING_LEFT';
          this.stateTimer = 0.0;
          this.logEvent('NAV', 'NAVIGATION', 'Reverse escape completed. Re-scanning environment.');
        }
        break;

      case 'VERIFYING_PATH': {
        const verifyDist = this.measureDistance(0.0);
        if (verifyDist >= ROBOT_CONFIG.CAUTION_DISTANCE_CM) {
          this.state = 'RESUMING_MOVEMENT';
          this.stateTimer = 0.0;
          this.logEvent('INFO', 'NAVIGATION', `Path confirmed clear (${verifyDist.toFixed(1)} cm). Resuming.`);
        } else {
          this.state = 'SCANNING_LEFT';
          this.stateTimer = 0.0;
          this.logEvent('WARN', 'NAVIGATION', `Heading still obstructed (${verifyDist.toFixed(1)} cm). Re-scanning.`);
        }
        break;
      }

      case 'RESUMING_MOVEMENT':
        this.targetLinearVel = 75.0;
        this.targetAngularVel = 0.0;
        if (this.stateTimer > 0.15) {
          this.state = 'MOVING_FORWARD';
          this.stateTimer = 0.0;
        }
        break;

      case 'EMERGENCY_STOP':
        this.targetLinearVel = 0.0;
        this.targetAngularVel = 0.0;
        if (this.stateTimer > 0.7) {
          this.emergencyStop = false;
          this.state = 'REVERSING';
          this.stateTimer = 0.0;
          this.reverseDuration = 0.6;
          this.logEvent('INFO', 'NAVIGATION', 'Attempting automated recovery reverse.');
        }
        break;

      case 'ERROR':
        this.targetLinearVel = 0.0;
        this.targetAngularVel = 0.0;
        break;
    }
  }

  public step(dt: number) {
    if (!this.isRunning) {
      this.linearVel = 0.0;
      this.angularVel = 0.0;
      return;
    }

    const effectiveDt = dt * this.speedMultiplier;
    this.uptimeSec = (Date.now() - this.startTime) / 1000.0;

    if (this.mode === 'AUTONOMOUS') {
      this.updateAutonomousNavigation(effectiveDt);
    } else {
      // Manual mode front distance check
      this.frontDistanceCm = this.measureDistance(0.0);
      this.zone = this.evaluateZone(this.frontDistanceCm);
    }

    // Velocity Ramping
    const accel = 9.0 * effectiveDt;
    this.linearVel += (this.targetLinearVel - this.linearVel) * Math.min(1.0, accel);
    this.angularVel += (this.targetAngularVel - this.angularVel) * Math.min(1.0, accel);

    // Kinematic Integration
    const oldX = this.x;
    const oldY = this.y;
    const { x: newX, y: newY, thetaRad: newTheta } = this.kinematics.integratePose(
      this.x,
      this.y,
      this.headingRad,
      this.linearVel,
      this.angularVel,
      effectiveDt
    );

    this.x = newX;
    this.y = newY;
    this.headingRad = newTheta;

    // Collision check
    if (this.checkRobotCollision()) {
      this.x = oldX;
      this.y = oldY;
      this.collisionCount++;
      if (this.state !== 'REVERSING') {
        this.state = 'EMERGENCY_STOP';
        this.stateTimer = 0.0;
        this.targetLinearVel = 0.0;
        this.logEvent('ERROR', 'COLLISION', 'Collision prevented by physical perimeter buffer.');
      }
    }

    // Trail sampling
    const now = Date.now();
    if (now - this.lastTrailTime > 120) {
      this.lastTrailTime = now;
      this.pathTrail.push({ x: this.x, y: this.y });
      if (this.pathTrail.length > 70) {
        this.pathTrail.shift();
      }
    }
  }

  public handleManualCommand(action: 'FORWARD' | 'REVERSE' | 'LEFT' | 'RIGHT' | 'STOP' | 'EMERGENCY_STOP' | 'RESET') {
    const baseSpeed = 80.0 * this.manualLinearFactor;
    const baseTurn = 2.4;

    switch (action) {
      case 'FORWARD':
        this.targetLinearVel = baseSpeed;
        this.targetAngularVel = 0.0;
        break;
      case 'REVERSE':
        this.targetLinearVel = -baseSpeed;
        this.targetAngularVel = 0.0;
        break;
      case 'LEFT':
        this.targetLinearVel = 0.0;
        this.targetAngularVel = -baseTurn;
        break;
      case 'RIGHT':
        this.targetLinearVel = 0.0;
        this.targetAngularVel = baseTurn;
        break;
      case 'STOP':
        this.targetLinearVel = 0.0;
        this.targetAngularVel = 0.0;
        break;
      case 'EMERGENCY_STOP':
        this.targetLinearVel = 0.0;
        this.targetAngularVel = 0.0;
        this.emergencyStop = true;
        this.logEvent('ERROR', 'MANUAL', 'Manual Emergency Stop triggered!');
        break;
      case 'RESET':
        this.resetSimulation();
        break;
    }
  }

  public setManualSpeed(ratio: number) {
    this.manualLinearFactor = Math.max(0.2, Math.min(1.5, ratio));
  }

  public resetSimulation() {
    this.loadScenario(this.activeScenario);
    this.linearVel = 0.0;
    this.angularVel = 0.0;
    this.targetLinearVel = 0.0;
    this.targetAngularVel = 0.0;
    this.emergencyStop = false;
    this.collisionCount = 0;
    this.state = 'IDLE';
    this.startTime = Date.now();
    this.logEvent('INFO', 'SIMULATION', 'Simulation reset to scenario origin.');
  }

  public getStatus(): RobotStatus {
    const { vL, vR } = this.kinematics.computeWheelSpeeds(this.linearVel / 100.0, this.angularVel);
    const leftRpm = this.kinematics.speedToRpm(vL);
    const rightRpm = this.kinematics.speedToRpm(vR);
    const { pwm: leftPwm, dir: leftDir } = this.kinematics.rpmToPwm(leftRpm);
    const { pwm: rightPwm, dir: rightDir } = this.kinematics.rpmToPwm(rightRpm);

    const deg = (Math.round((this.headingRad * 180.0) / Math.PI) % 360 + 360) % 360;

    return {
      is_running: this.isRunning,
      mode: this.mode,
      state: this.state,
      position: {
        x: Math.round(this.x * 10) / 10,
        y: Math.round(this.y * 10) / 10,
        heading_rad: Math.round(this.headingRad * 1000) / 1000,
        heading_deg: deg,
        linear_velocity: Math.round(this.linearVel * 10) / 10,
        angular_velocity: Math.round(this.angularVel * 100) / 100,
      },
      sensors: {
        front_distance_cm: Math.round(this.frontDistanceCm * 10) / 10,
        left_distance_cm: Math.round(this.leftDistanceCm * 10) / 10,
        right_distance_cm: Math.round(this.rightDistanceCm * 10) / 10,
        servo_angle_deg: Math.round(this.servoAngleDeg),
        zone: this.zone,
        is_scanning: this.isScanning,
        timestamp: Math.round(Date.now() / 1000 * 10) / 10,
      },
      motors: {
        left_rpm: Math.round(leftRpm * 10) / 10,
        right_rpm: Math.round(rightRpm * 10) / 10,
        left_pwm: leftPwm,
        right_pwm: rightPwm,
        left_dir: leftDir,
        right_dir: rightDir,
        current_ma: Math.round((80 + (leftPwm + rightPwm) * 0.9) * 10) / 10,
      },
      emergency_stop: this.emergencyStop,
      collision_count: this.collisionCount,
      uptime_sec: Math.round(this.uptimeSec * 10) / 10,
      battery_voltage: Math.round((8.4 - this.uptimeSec * 0.00015) * 100) / 100,
      battery_percentage: Math.max(10, Math.round((100 - this.uptimeSec * 0.004) * 10) / 10),
      active_scenario: this.activeScenario,
    };
  }
}
