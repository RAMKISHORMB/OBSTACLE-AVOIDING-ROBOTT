import { Obstacle, RayHit } from '../types/robot';
import { ROBOT_CONFIG } from './kinematics';

/**
 * Line segment intersection algorithm
 */
export function lineSegmentIntersection(
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  q1x: number,
  q1y: number,
  q2x: number,
  q2y: number
): { hitX: number; hitY: number; t: number } | null {
  const dx = p2x - p1x;
  const dy = p2y - p1y;
  const qx = q2x - q1x;
  const qy = q2y - q1y;

  const denom = dx * qy - dy * qx;
  if (Math.abs(denom) < 1e-9) {
    return null; // Parallel segments
  }

  const t = ((q1x - p1x) * qy - (q1y - p1y) * qx) / denom;
  const u = ((q1x - p1x) * dy - (q1y - p1y) * dx) / denom;

  if (t >= 0.0 && t <= 1.0 && u >= 0.0 && u <= 1.0) {
    return {
      hitX: p1x + t * dx,
      hitY: p1y + t * dy,
      t,
    };
  }

  return null;
}

/**
 * Single raycast against an obstacle list
 */
export function castSingleRay(
  ox: number,
  oy: number,
  angleRad: number,
  maxDistPx: number,
  obstacles: Obstacle[]
): RayHit {
  const ex = ox + Math.cos(angleRad) * maxDistPx;
  const ey = oy + Math.sin(angleRad) * maxDistPx;

  let closestT = 1.0;
  let hitX = ex;
  let hitY = ey;
  let hitObstacleId: string | undefined = undefined;

  for (const obs of obstacles) {
    const x1 = obs.x;
    const y1 = obs.y;
    const x2 = obs.x + obs.width;
    const y2 = obs.y + obs.height;

    // Check 4 boundary segments of the obstacle AABB
    const segments = [
      [x1, y1, x2, y1], // Top
      [x2, y1, x2, y2], // Right
      [x2, y2, x1, y2], // Bottom
      [x1, y2, x1, y1], // Left
    ];

    for (const [sx1, sy1, sx2, sy2] of segments) {
      const hit = lineSegmentIntersection(ox, oy, ex, ey, sx1, sy1, sx2, sy2);
      if (hit && hit.t < closestT) {
        closestT = hit.t;
        hitX = hit.hitX;
        hitY = hit.hitY;
        hitObstacleId = obs.id;
      }
    }
  }

  const distancePx = Math.max(0, closestT * maxDistPx);
  const distanceCm = Math.max(
    ROBOT_CONFIG.SENSOR_MIN_RANGE_CM,
    Math.round((distancePx / ROBOT_CONFIG.CM_TO_PX) * 10) / 10
  );

  return {
    hitX,
    hitY,
    distancePx,
    distanceCm,
    obstacleId: hitObstacleId,
  };
}

/**
 * Multi-ray acoustic cone sweep (simulating HC-SR04 ~15 degree ultrasonic spread)
 */
export function castUltrasonicCone(
  ox: number,
  oy: number,
  centerAngleRad: number,
  maxDistPx: number,
  obstacles: Obstacle[],
  coneSpreadDeg: number = 15.0,
  rayCount: number = 7
): { minHit: RayHit; allHits: RayHit[] } {
  const halfSpread = (coneSpreadDeg * Math.PI) / 360.0;
  const step = (halfSpread * 2.0) / (rayCount - 1);
  const startAngle = centerAngleRad - halfSpread;

  const allHits: RayHit[] = [];
  let minDistanceCm = Infinity;
  let minHit: RayHit | null = null;

  for (let i = 0; i < rayCount; i++) {
    const rayAngle = startAngle + i * step;
    const hit = castSingleRay(ox, oy, rayAngle, maxDistPx, obstacles);
    allHits.push(hit);

    if (hit.distanceCm < minDistanceCm) {
      minDistanceCm = hit.distanceCm;
      minHit = hit;
    }
  }

  return {
    minHit: minHit || allHits[Math.floor(rayCount / 2)],
    allHits,
  };
}
