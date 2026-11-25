import React from 'react';
import { SimulationEngine } from '../simulation/simulationEngine';
import { RobotStatus } from '../types/robot';
import {
  Compass,
  Radio,
  Activity,
  Radar,
  Sliders,
  Cpu,
  Terminal,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface OverviewPageProps {
  engine: SimulationEngine;
  status: RobotStatus;
  setActiveTab: (tab: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ engine, status, setActiveTab }) => {
  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>Autonomous Robotics System v1.0.0</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Intelligent Autonomous Navigation &amp; Robotics Simulation
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Engineered differential-drive mobile robotics platform featuring acoustic ultrasonic raycasting,
            a deterministic 14-state autonomous navigation finite state machine, live dual-motor PWM telemetry,
            and modular ESP32 C++ embedded firmware.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => setActiveTab('simulation')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-sm"
            >
              <Radio className="w-4 h-4" />
              <span>Launch Live Simulation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTab('navigation')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium text-xs transition-all"
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Inspect State Machine</span>
            </button>
            <button
              onClick={() => setActiveTab('firmware')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium text-xs transition-all"
            >
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>ESP32 Firmware Code</span>
            </button>
          </div>
        </div>

        {/* Decorative Grid overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
      </div>

      {/* Core Architectural Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Radio className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Differential Drive Kinematics</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Runge-Kutta numerical integration calculates real-time robot pose (x, y, θ). Dual-wheel inverse kinematics
            translates linear and angular velocities to individual motor RPM and 8-bit PWM signals.
          </p>
          <div className="pt-1 text-[11px] font-mono text-slate-500 border-t border-slate-100 flex justify-between">
            <span>Wheelbase: 16 cm</span>
            <span>Max Vel: 0.45 m/s</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Radar className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Acoustic Raycasting Perception</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Raycasting simulates a 15-degree HC-SR04 ultrasonic transducer cone. Calculates geometric distance against
            static walls and dynamic obstacles in true centimeter scale with zone classification.
          </p>
          <div className="pt-1 text-[11px] font-mono text-slate-500 border-t border-slate-100 flex justify-between">
            <span>Range: 2 - 300 cm</span>
            <span>Sweep: ±60 deg</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Autonomous Navigation FSM</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Deterministic 14-state machine featuring emergency stop fail-safes, servo scanning, clearance evaluation,
            oscillation breaker heuristics, and dead-end reverse escape routines.
          </p>
          <div className="pt-1 text-[11px] font-mono text-slate-500 border-t border-slate-100 flex justify-between">
            <span>States: 14</span>
            <span>Fail-Safe: Active Watchdog</span>
          </div>
        </div>
      </div>

      {/* Subsystem Readiness Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Subsystem Diagnostics &amp; Telemetry Status</h2>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            ALL SYSTEMS NOMINAL
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Simulation Engine</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-slate-500">60 FPS RequestAnimationFrame</div>
            <div className="font-mono text-[11px] text-slate-700 font-semibold">
              Delta-Time Ticking (dt ~ 16ms)
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Kinematic Physics</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-slate-500">Differential Drive Model</div>
            <div className="font-mono text-[11px] text-slate-700 font-semibold">
              Pose: ({status.position.x.toFixed(0)}, {status.position.y.toFixed(0)}) px
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Ultrasonic Perception</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-slate-500">Geometric Raycaster</div>
            <div className="font-mono text-[11px] text-slate-700 font-semibold">
              Dist: {status.sensors.front_distance_cm.toFixed(1)} cm ({status.sensors.zone})
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Embedded ESP32 Firmware</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-slate-500">Modular C++ Architecture</div>
            <div className="font-mono text-[11px] text-slate-700 font-semibold">
              PlatformIO Ready (8 Classes)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
