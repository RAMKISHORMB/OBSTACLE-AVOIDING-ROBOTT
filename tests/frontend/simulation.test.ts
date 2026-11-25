import { describe, it, expect, beforeEach } from 'vitest';
import { RobotKinematics, ROBOT_CONFIG } from '../../frontend/src/simulation/kinematics';
import { lineSegmentIntersection, castSingleRay, castUltrasonicCone } from '../../frontend/src/simulation/raycaster';
import { SimulationEngine } from '../../frontend/src/simulation/simulationEngine';
import { Obstacle } from '../../frontend/src/types/robot';

describe('Differential Drive Kinematics', () => {
  const kin = new RobotKinematics(0.16, 0.0325, 200.0);

  it('computes symmetric wheel speeds for pure forward motion', () => {
    const { vL, vR } = kin.computeWheelSpeeds(0.3, 0.0);
    expect(vL).toBeCloseTo(0.3);
    expect(vR).toBeCloseTo(0.3);
  });

  it('computes differential wheel speeds for turning in place', () => {
    const { vL, vR } = kin.computeWheelSpeeds(0.0, 1.0);
    expect(vL).toBeCloseTo(-0.08);
    expect(vR).toBeCloseTo(0.08);
  });

  it('translates linear wheel speed to RPM and 8-bit PWM', () => {
    const rpm = kin.speedToRpm(0.25);
    expect(rpm).toBeGreaterThan(0);
    const { pwm, dir } = kin.rpmToPwm(rpm);
    expect(pwm).toBeGreaterThanOrEqual(0);
    expect(pwm).toBeLessThanOrEqual(255);
    expect(dir).toBe('FORWARD');
  });

  it('correctly reports reverse for negative RPM', () => {
    const { pwm, dir } = kin.rpmToPwm(-60.0);
    expect(pwm).toBeGreaterThan(0);
    expect(dir).toBe('REVERSE');
  });
});

describe('Ultrasonic Raycaster & Geometry', () => {
  it('detects perpendicular line intersection', () => {
    const hit = lineSegmentIntersection(0, 50, 100, 50, 50, 0, 50, 100);
    expect(hit).not.toBeNull();
    expect(hit?.hitX).toBeCloseTo(50);
    expect(hit?.hitY).toBeCloseTo(50);
    expect(hit?.t).toBeCloseTo(0.5);
  });

  it('returns null for parallel line segments', () => {
    const hit = lineSegmentIntersection(0, 0, 100, 0, 0, 10, 100, 10);
    expect(hit).toBeNull();
  });

  it('accurately measures obstacle distance in centimeters', () => {
    const obstacles: Obstacle[] = [
      { id: 'test-box', x: 200, y: 100, width: 50, height: 100, type: 'box' },
    ];
    // Ray originates at x=100, y=150, pointing right (angle 0 rad)
    // Distance to obstacle front at x=200 is 100 px = 50 cm
    const hit = castSingleRay(100, 150, 0.0, 600, obstacles);
    expect(hit.hitX).toBeCloseTo(200);
    expect(hit.hitY).toBeCloseTo(150);
    expect(hit.distanceCm).toBeCloseTo(50.0, 1);
  });

  it('sweeps an acoustic dispersion cone and returns closest hit', () => {
    const obstacles: Obstacle[] = [
      { id: 'test-barrier', x: 250, y: 100, width: 40, height: 200, type: 'box' },
    ];
    const cone = castUltrasonicCone(100, 200, 0.0, 600, obstacles, 15.0, 5);
    expect(cone.allHits.length).toBe(5);
    expect(cone.minHit.distanceCm).toBeCloseTo(75.0, 1);
  });
});

describe('Simulation Engine & Autonomous Navigation', () => {
  let engine: SimulationEngine;

  beforeEach(() => {
    engine = new SimulationEngine({ width: 800, height: 600 });
  });

  it('initializes with default Multiple Obstacles scenario', () => {
    expect(engine.activeScenario).toBe('Multiple Obstacles');
    expect(engine.mode).toBe('AUTONOMOUS');
    expect(engine.obstacles.length).toBeGreaterThanOrEqual(5);
  });

  it('transitions from INITIALIZING to MOVING_FORWARD upon timer expiration', () => {
    engine.state = 'INITIALIZING';
    engine.step(0.6); // dt = 0.6s
    expect(engine.state).toBe('MOVING_FORWARD');
    expect(engine.targetLinearVel).toBeGreaterThan(0);
  });

  it('triggers emergency stop when distance drops below emergency threshold', () => {
    // Force front distance to 5 cm by moving right next to a wall
    engine.state = 'MOVING_FORWARD';
    engine.x = 24; // Boundary wall is at x=0..16
    engine.headingRad = Math.PI; // Pointing left towards boundary
    engine.step(0.05);

    expect(engine.state).toBe('EMERGENCY_STOP');
    expect(engine.targetLinearVel).toBe(0.0);
  });

  it('handles manual teleoperation commands when engaged', () => {
    engine.mode = 'MANUAL';
    engine.handleManualCommand('FORWARD');
    expect(engine.targetLinearVel).toBeGreaterThan(0);
    expect(engine.targetAngularVel).toBe(0);

    engine.handleManualCommand('LEFT');
    expect(engine.targetAngularVel).toBeLessThan(0);

    engine.handleManualCommand('STOP');
    expect(engine.targetLinearVel).toBe(0);
    expect(engine.targetAngularVel).toBe(0);

    engine.handleManualCommand('EMERGENCY_STOP');
    expect(engine.emergencyStop).toBe(true);
  });

  it('resets simulation cleanly', () => {
    engine.collisionCount = 5;
    engine.emergencyStop = true;
    engine.resetSimulation();
    expect(engine.collisionCount).toBe(0);
    expect(engine.emergencyStop).toBe(false);
  });
});
