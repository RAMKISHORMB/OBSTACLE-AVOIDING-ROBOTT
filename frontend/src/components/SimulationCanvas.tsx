import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SimulationEngine } from '../simulation/simulationEngine';
import { ROBOT_CONFIG } from '../simulation/kinematics';
import { castUltrasonicCone } from '../simulation/raycaster';
import { Obstacle } from '../types/robot';

interface SimulationCanvasProps {
  engine: SimulationEngine;
  selectedObstacleId?: string | null;
  onSelectObstacle?: (id: string | null) => void;
  editorMode?: 'select' | 'add_box' | 'add_wall';
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  engine,
  selectedObstacleId,
  onSelectObstacle,
  editorMode = 'select',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Mouse interaction state for dragging / adding obstacles
  const [isDragging, setIsDragging] = useState(false);
  const [draggedObsId, setDraggedObsId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [newBoxStart, setNewBoxStart] = useState<{ x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Animation pulse counter for ultrasonic wave ripples
  const waveAnimRef = useRef(0);

  // Convert canvas pixel coordinates to world cm
  const pxToCm = (px: number) => (px / ROBOT_CONFIG.CM_TO_PX).toFixed(1);

  // Main Canvas Render Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000.0);
      lastTime = time;

      // Advance physics simulation
      engine.step(dt);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // 1. Clear background & Draw Engineering Grid
      ctx.fillStyle = '#f8fafc'; // Clean soft-grey background
      ctx.fillRect(0, 0, width, height);

      // Subtle engineering grid (50px = 25cm grid)
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      const gridSize = 40; // 20 cm grid squares

      ctx.beginPath();
      for (let x = 0; x <= width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Major axes or origin indicator
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(16, 16, width - 32, height - 32);

      // 2. Draw Historical Navigation Path Trail
      if (engine.pathTrail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(engine.pathTrail[0].x, engine.pathTrail[0].y);
        for (let i = 1; i < engine.pathTrail.length; i++) {
          ctx.lineTo(engine.pathTrail[i].x, engine.pathTrail[i].y);
        }
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)'; // Blue trail
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Small path dots
        for (let i = 0; i < engine.pathTrail.length; i += 4) {
          ctx.fillStyle = 'rgba(37, 99, 235, 0.4)';
          ctx.beginPath();
          ctx.arc(engine.pathTrail[i].x, engine.pathTrail[i].y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3. Draw Obstacles
      for (const obs of engine.obstacles) {
        const isSelected = selectedObstacleId === obs.id;

        if (obs.type === 'wall') {
          // Boundary Wall styling
          ctx.fillStyle = '#64748b'; // Slate 500
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

          // Wall crosshatch pattern
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1;
          ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        } else {
          // Regular Box / Object Obstacle
          ctx.fillStyle = isSelected ? '#fed7aa' : '#ffffff'; // White or selected highlight
          ctx.strokeStyle = isSelected ? '#ea580c' : '#94a3b8';
          ctx.lineWidth = isSelected ? 2.5 : 1.5;

          // Shadow
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.06)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetY = 3;
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          ctx.restore();

          ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

          // Diagonal corner engineering markings
          ctx.fillStyle = isSelected ? '#ea580c' : '#cbd5e1';
          const markSize = 4;
          ctx.fillRect(obs.x + 2, obs.y + 2, markSize, markSize);
          ctx.fillRect(obs.x + obs.width - 6, obs.y + 2, markSize, markSize);
          ctx.fillRect(obs.x + 2, obs.y + obs.height - 6, markSize, markSize);
          ctx.fillRect(obs.x + obs.width - 6, obs.y + obs.height - 6, markSize, markSize);

          // Label
          if (obs.label || obs.width > 50) {
            ctx.fillStyle = '#475569';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const labelText = obs.label || `${Math.round(obs.width / ROBOT_CONFIG.CM_TO_PX)}x${Math.round(obs.height / ROBOT_CONFIG.CM_TO_PX)}cm`;
            ctx.fillText(labelText, obs.x + obs.width / 2, obs.y + obs.height / 2);
          }
        }
      }

      // 4. Draw Ultrasonic Sensor Raycasting Beam & Acoustic Cone
      const sensorOffset = ROBOT_CONFIG.ROBOT_RADIUS_PX * 0.85;
      const ox = engine.x + Math.cos(engine.headingRad) * sensorOffset;
      const oy = engine.y + Math.sin(engine.headingRad) * sensorOffset;
      const totalServoRad = engine.headingRad + (engine.servoAngleDeg * Math.PI) / 180.0;
      const maxDistPx = ROBOT_CONFIG.SENSOR_MAX_RANGE_CM * ROBOT_CONFIG.CM_TO_PX;

      const coneResult = castUltrasonicCone(ox, oy, totalServoRad, maxDistPx, engine.obstacles, 16.0, 7);

      // Acoustic Cone fill
      if (coneResult.allHits.length > 1) {
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        for (const hit of coneResult.allHits) {
          ctx.lineTo(hit.hitX, hit.hitY);
        }
        ctx.closePath();

        // Color based on hazard zone
        let coneColor = 'rgba(34, 197, 94, 0.12)'; // Safe Green
        let beamStroke = 'rgba(34, 197, 94, 0.6)';
        if (engine.zone === 'CAUTION') {
          coneColor = 'rgba(234, 179, 8, 0.15)'; // Yellow
          beamStroke = 'rgba(234, 179, 8, 0.7)';
        } else if (engine.zone === 'AVOIDANCE') {
          coneColor = 'rgba(249, 115, 22, 0.20)'; // Orange
          beamStroke = 'rgba(249, 115, 22, 0.8)';
        } else if (engine.zone === 'EMERGENCY') {
          coneColor = 'rgba(239, 68, 68, 0.25)'; // Red
          beamStroke = 'rgba(239, 68, 68, 0.9)';
        }

        ctx.fillStyle = coneColor;
        ctx.fill();

        // Individual ray lines
        ctx.strokeStyle = beamStroke;
        ctx.lineWidth = 1;
        for (const hit of coneResult.allHits) {
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(hit.hitX, hit.hitY);
          ctx.stroke();
        }

        // Animated sound wave ripples (guaranteed positive radius)
        waveAnimRef.current = ((waveAnimRef.current + Math.max(0, dt) * 2.5) % 1.0 + 1.0) % 1.0;
        const validDistPx = Math.max(5, coneResult.minHit.distancePx);
        const waveDist = Math.max(2, waveAnimRef.current * Math.min(180, validDistPx));
        
        ctx.beginPath();
        ctx.arc(
          ox,
          oy,
          waveDist,
          totalServoRad - (8 * Math.PI) / 180,
          totalServoRad + (8 * Math.PI) / 180
        );
        ctx.strokeStyle = beamStroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Ray Hit Point
        const minHit = coneResult.minHit;
        ctx.beginPath();
        ctx.arc(minHit.hitX, minHit.hitY, 4, 0, Math.PI * 2);
        ctx.fillStyle = engine.zone === 'EMERGENCY' ? '#ef4444' : '#f59e0b';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Distance Tag at hit point
        ctx.fillStyle = '#1e293b';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${minHit.distanceCm.toFixed(1)} cm`,
          minHit.hitX + (minHit.hitX > ox ? 12 : -12),
          minHit.hitY - 8
        );
      }

      // 5. Draw Safety Perimeter Rings around Robot
      ctx.save();
      ctx.translate(engine.x, engine.y);

      // Avoidance Distance Circle (20 cm = 40 px)
      ctx.beginPath();
      ctx.arc(0, 0, ROBOT_CONFIG.AVOIDANCE_DISTANCE_CM * ROBOT_CONFIG.CM_TO_PX, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.2)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      // Caution Distance Circle (40 cm = 80 px)
      ctx.beginPath();
      ctx.arc(0, 0, ROBOT_CONFIG.CAUTION_DISTANCE_CM * ROBOT_CONFIG.CM_TO_PX, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.15)';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();

      // 6. Draw Robot Body (Chassis, Wheels, HC-SR04 Turret, Heading Arrow)
      ctx.save();
      ctx.translate(engine.x, engine.y);
      ctx.rotate(engine.headingRad);

      const r = ROBOT_CONFIG.ROBOT_RADIUS_PX;

      // Robot Chassis Shadow
      ctx.save();
      ctx.shadowColor = 'rgba(15, 23, 42, 0.25)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Main Circular / Rounded Chassis
      ctx.fillStyle = '#f8fafc'; // Soft chassis surface
      ctx.strokeStyle = '#334155'; // Dark slate rim
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner Engineering Plate (PCB / Battery deck)
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(-2, 0, r * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Mounting hex standoffs / screws
      const boltDist = r * 0.6;
      ctx.fillStyle = '#64748b';
      for (const angle of [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75]) {
        const bx = Math.cos(angle) * boltDist;
        const by = Math.sin(angle) * boltDist;
        ctx.beginPath();
        ctx.arc(bx, by, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Wheels (Left and Right)
      const wheelW = 20;
      const wheelH = 7;
      const wheelOffsetY = r * 0.88;

      // Left Wheel (top in local coordinate system)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-wheelW / 2, -wheelOffsetY - wheelH / 2, wheelW, wheelH);
      // Wheel treads animation
      ctx.fillStyle = '#475569';
      for (let i = -wheelW / 2 + 2; i < wheelW / 2; i += 4) {
        ctx.fillRect(i, -wheelOffsetY - wheelH / 2, 2, wheelH);
      }

      // Right Wheel (bottom in local coordinate system)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-wheelW / 2, wheelOffsetY - wheelH / 2, wheelW, wheelH);
      // Wheel treads animation
      ctx.fillStyle = '#475569';
      for (let i = -wheelW / 2 + 2; i < wheelW / 2; i += 4) {
        ctx.fillRect(i, wheelOffsetY - wheelH / 2, 2, wheelH);
      }

      // Rear Caster Wheel
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(-r * 0.7, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Status LED on top of chassis
      let ledColor = '#10b981'; // Green
      if (engine.state === 'EMERGENCY_STOP') ledColor = '#ef4444';
      else if (engine.state.includes('TURNING') || engine.state === 'REVERSING') ledColor = '#3b82f6';
      else if (engine.state.includes('OBSTACLE') || engine.state.includes('SCANNING')) ledColor = '#f59e0b';

      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = ledColor;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Heading Arrow
      ctx.beginPath();
      ctx.moveTo(r * 0.4, 0);
      ctx.lineTo(r * 0.85, 0);
      ctx.lineTo(r * 0.7, -4);
      ctx.moveTo(r * 0.85, 0);
      ctx.lineTo(r * 0.7, 4);
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Ultrasonic Sensor Turret (Mounted at front edge, panning with servoAngleDeg)
      ctx.save();
      ctx.translate(r * 0.85, 0);
      ctx.rotate((engine.servoAngleDeg * Math.PI) / 180.0);

      // SG90 Servo horn mount plate
      ctx.fillStyle = '#334155';
      ctx.fillRect(-3, -7, 6, 14);

      // HC-SR04 Blue PCB Board
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(-2, -10, 5, 20);

      // Left Transducer Cylinder (Transmitter)
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(4, -5.5, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Center acoustic mesh dot
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(4, -5.5, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Right Transducer Cylinder (Receiver)
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(4, 5.5, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Center acoustic mesh dot
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(4, 5.5, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore(); // Turret restore

      ctx.restore(); // Robot restore

      // 7. Drawing interactive "New Box" drag preview if adding
      if (newBoxStart && editorMode !== 'select') {
        const curX = mousePos.x;
        const curY = mousePos.y;
        const bx = Math.min(newBoxStart.x, curX);
        const by = Math.min(newBoxStart.y, curY);
        const bw = Math.abs(curX - newBoxStart.x);
        const bh = Math.abs(curY - newBoxStart.y);

        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.setLineDash([]);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [engine, selectedObstacleId, editorMode, newBoxStart, mousePos]);

  // Handle Mouse Down (Drag or Add)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      if (editorMode === 'add_box' || editorMode === 'add_wall') {
        setNewBoxStart({ x: clickX, y: clickY });
        return;
      }

      // Check if clicking an obstacle (excluding permanent boundary walls)
      for (let i = engine.obstacles.length - 1; i >= 0; i--) {
        const obs = engine.obstacles[i];
        if (obs.type === 'wall' && obs.id.startsWith('wall-')) continue; // Skip boundaries

        if (
          clickX >= obs.x &&
          clickX <= obs.x + obs.width &&
          clickY >= obs.y &&
          clickY <= obs.y + obs.height
        ) {
          setIsDragging(true);
          setDraggedObsId(obs.id);
          setDragOffset({ x: clickX - obs.x, y: clickY - obs.y });
          if (onSelectObstacle) onSelectObstacle(obs.id);
          return;
        }
      }

      if (onSelectObstacle) onSelectObstacle(null);
    },
    [editorMode, engine.obstacles, onSelectObstacle]
  );

  // Handle Mouse Move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const curX = e.clientX - rect.left;
      const curY = e.clientY - rect.top;

      setMousePos({ x: curX, y: curY });

      if (isDragging && draggedObsId) {
        const obs = engine.obstacles.find((o) => o.id === draggedObsId);
        if (obs) {
          obs.x = Math.max(20, Math.min(engine.width - obs.width - 20, curX - dragOffset.x));
          obs.y = Math.max(20, Math.min(engine.height - obs.height - 20, curY - dragOffset.y));
        }
      }
    },
    [isDragging, draggedObsId, dragOffset, engine.obstacles, engine.width, engine.height]
  );

  // Handle Mouse Up
  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (newBoxStart && (editorMode === 'add_box' || editorMode === 'add_wall')) {
        const curX = mousePos.x;
        const curY = mousePos.y;
        const bx = Math.min(newBoxStart.x, curX);
        const by = Math.min(newBoxStart.y, curY);
        const bw = Math.max(25, Math.abs(curX - newBoxStart.x));
        const bh = Math.max(25, Math.abs(curY - newBoxStart.y));

        const newObs: Obstacle = {
          id: `custom-${Date.now()}`,
          x: bx,
          y: by,
          width: bw,
          height: bh,
          type: editorMode === 'add_wall' ? 'wall' : 'box',
          label: editorMode === 'add_wall' ? 'Wall' : 'Custom Obstacle',
        };

        engine.obstacles.push(newObs);
        engine.logEvent('INFO', 'ENVIRONMENT', `Added ${editorMode} at (${pxToCm(bx)}, ${pxToCm(by)})`);
        setNewBoxStart(null);
        if (onSelectObstacle) onSelectObstacle(newObs.id);
        return;
      }

      setIsDragging(false);
      setDraggedObsId(null);
    },
    [newBoxStart, editorMode, mousePos, engine, onSelectObstacle]
  );

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Top Canvas Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-700">2D KINEMATICS VIEWPORT</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500 font-mono">
            {engine.width} x {engine.height} px ({Math.round(engine.width / ROBOT_CONFIG.CM_TO_PX)} x{' '}
            {Math.round(engine.height / ROBOT_CONFIG.CM_TO_PX)} cm)
          </span>
        </div>
        <div className="flex items-center space-x-3 text-slate-500 font-mono">
          <span>
            X: <strong className="text-slate-800">{pxToCm(engine.x)}</strong> cm
          </span>
          <span>
            Y: <strong className="text-slate-800">{pxToCm(engine.y)}</strong> cm
          </span>
          <span>
            θ: <strong className="text-slate-800">{((engine.headingRad * 180) / Math.PI).toFixed(0)}°</strong>
          </span>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex justify-center p-2 bg-slate-100/70">
        <canvas
          ref={canvasRef}
          width={engine.width}
          height={engine.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="rounded-lg shadow-sm cursor-crosshair max-w-full h-auto bg-white"
          style={{ width: `${engine.width}px`, height: `${engine.height}px` }}
        />
      </div>

      {/* Bottom Canvas Footer / Legend */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Safe (&gt;40cm)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Caution (20-40cm)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span>Avoidance (10-20cm)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>E-Stop (&lt;10cm)</span>
          </span>
        </div>
        <div className="text-slate-400">
          Tip: Click &amp; drag obstacles to test dynamic avoidance in real time
        </div>
      </div>
    </div>
  );
};
