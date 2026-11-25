import React, { useState } from 'react';
import { SimulationEngine } from '../simulation/simulationEngine';
import { RobotStatus } from '../types/robot';
import { SimulationCanvas } from '../components/SimulationCanvas';
import { EnvironmentEditorControls } from '../components/EnvironmentEditorControls';
import { ManualControlPad } from '../components/ManualControlPad';
import {
  Play,
  Pause,
  RotateCcw,
  AlertOctagon,
  Radar,
  Gauge,
  Activity,
  Layers,
  Compass,
} from 'lucide-react';

interface LiveSimulationPageProps {
  engine: SimulationEngine;
  status: RobotStatus;
  onCommand?: (action: string) => void;
  onToggleRun?: () => void;
  onReset?: () => void;
}

export const LiveSimulationPage: React.FC<LiveSimulationPageProps> = ({
  engine,
  status,
  onCommand,
  onToggleRun,
  onReset,
}) => {
  const [selectedObstacleId, setSelectedObstacleId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'select' | 'add_box' | 'add_wall'>('select');
  const [, setRerenderKey] = useState(0);

  const forceUpdate = () => setRerenderKey((k) => k + 1);

  const handleRunClick = () => {
    if (onToggleRun) onToggleRun();
    else {
      engine.isRunning = !engine.isRunning;
      forceUpdate();
    }
  };

  const handleResetClick = () => {
    if (onReset) onReset();
    else {
      engine.resetSimulation();
      forceUpdate();
    }
  };

  const selectedObs = engine.obstacles.find((o) => o.id === selectedObstacleId);

  return (
    <div className="space-y-5">
      {/* Simulation Master Controls Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-800 tracking-tight">
              LIVE SIMULATION ARENA
            </span>
          </div>
          <span className="text-slate-300">|</span>
          <span className="text-xs text-slate-500">
            Scenario: <strong className="text-slate-700 font-semibold">{engine.activeScenario}</strong>
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRunClick}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              engine.isRunning
                ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {engine.isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{engine.isRunning ? 'Pause Simulation' : 'Start Simulation'}</span>
          </button>

          <button
            onClick={handleResetClick}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Arena</span>
          </button>

          <button
            onClick={() => {
              engine.handleManualCommand('EMERGENCY_STOP');
              forceUpdate();
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 active:scale-95 transition-all shadow-xs"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>E-STOP</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Simulation Canvas on Left, Telemetry / Control Sidebar on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Canvas + Environment Editor Toolbar */}
        <div className="lg:col-span-8 space-y-4">
          <SimulationCanvas
            engine={engine}
            selectedObstacleId={selectedObstacleId}
            onSelectObstacle={setSelectedObstacleId}
            editorMode={editorMode}
          />

          <EnvironmentEditorControls
            engine={engine}
            selectedObstacleId={selectedObstacleId}
            onClearSelected={() => setSelectedObstacleId(null)}
            editorMode={editorMode}
            setEditorMode={setEditorMode}
            onSpeedChange={() => forceUpdate()}
          />
        </div>

        {/* Right Column: Teleoperation Controls + Live Telemetry Cards */}
        <div className="lg:col-span-4 space-y-4">
          {/* Manual Teleoperation Pad */}
          <ManualControlPad engine={engine} onCommand={onCommand} />

          {/* Real-time Subsystem Status Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Radar className="w-4 h-4 text-blue-600" />
                <span>Sensor &amp; Actuator Telemetry</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">REALTIME</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Front Clearance</span>
                <span className="font-mono font-bold text-slate-800">
                  {status.sensors.front_distance_cm.toFixed(1)} cm
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Left Sonar Scan</span>
                  <span className="font-mono font-bold text-slate-800">
                    {status.sensors.left_distance_cm.toFixed(1)} cm
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Right Sonar Scan</span>
                  <span className="font-mono font-bold text-slate-800">
                    {status.sensors.right_distance_cm.toFixed(1)} cm
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Servo Turret Angle</span>
                <span className="font-mono font-bold text-blue-600">
                  {status.sensors.servo_angle_deg}°
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-500 block font-sans">Left Motor</span>
                  <div className="font-bold text-slate-800">{status.motors.left_rpm} rpm</div>
                  <div className="text-[10px] text-slate-500">
                    PWM: {status.motors.left_pwm} | {status.motors.left_dir}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-500 block font-sans">Right Motor</span>
                  <div className="font-bold text-slate-800">{status.motors.right_rpm} rpm</div>
                  <div className="text-[10px] text-slate-500">
                    PWM: {status.motors.right_pwm} | {status.motors.right_dir}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Selected Obstacle Inspector */}
          {selectedObs && (
            <div className="bg-amber-50/70 rounded-xl border border-amber-200 p-4 shadow-sm space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-700" />
                  <span>Selected Obstacle: {selectedObs.label || selectedObs.id}</span>
                </span>
                <button
                  onClick={() => setSelectedObstacleId(null)}
                  className="text-amber-700 hover:text-amber-900 text-[11px] font-semibold"
                >
                  Deselect
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-amber-900">
                <div>X: {Math.round(selectedObs.x)} px</div>
                <div>Y: {Math.round(selectedObs.y)} px</div>
                <div>Width: {Math.round(selectedObs.width)} px</div>
                <div>Height: {Math.round(selectedObs.height)} px</div>
              </div>
              <p className="text-[11px] text-amber-800 pt-1">
                Drag on the canvas to reposition this obstacle in the arena.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
