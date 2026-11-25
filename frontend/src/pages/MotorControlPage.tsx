import React from 'react';
import { SimulationEngine } from '../simulation/simulationEngine';
import { RobotStatus } from '../types/robot';
import { Sliders, Gauge, Battery, Cpu, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MotorControlPageProps {
  engine: SimulationEngine;
  status: RobotStatus;
}

export const MotorControlPage: React.FC<MotorControlPageProps> = ({ engine, status }) => {
  const { motors, position } = status;

  return (
    <div className="space-y-6">
      {/* Title Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">
                Dual DC Motor Driver &amp; Kinematics Controller
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              L298N / TB6612FNG Dual H-Bridge simulation with 8-bit ESP32 LEDC PWM speed regulation
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500">Driver State:</span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              H-BRIDGE ARMED
            </span>
          </div>
        </div>

        {/* Global Motor Bus Metrics */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 font-medium block">Total Motor Current Draw</span>
            <div className="font-mono text-lg font-bold text-slate-800">
              {motors.current_ma.toFixed(1)} mA
            </div>
            <div className="text-[11px] text-slate-400">Idle quiescent: ~80 mA</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 font-medium block">Linear Body Velocity</span>
            <div className="font-mono text-lg font-bold text-slate-800">
              {position.linear_velocity.toFixed(1)} px/s ({(position.linear_velocity / 2.0).toFixed(1)} cm/s)
            </div>
            <div className="text-[11px] text-slate-400">Max theoretical: 45 cm/s</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 font-medium block">Angular Yaw Rate</span>
            <div className="font-mono text-lg font-bold text-slate-800">
              {position.angular_velocity.toFixed(2)} rad/s ({((position.angular_velocity * 180) / Math.PI).toFixed(0)}°/s)
            </div>
            <div className="text-[11px] text-slate-400">Differential yaw turning</div>
          </div>
        </div>
      </div>

      {/* Dual Motor Cards: Left & Right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Motor Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-700 text-xs">
                M1
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Left Channel (Motor A)</h3>
                <span className="text-[11px] text-slate-400 font-mono">GPIO25 (PWM) | GPIO26/27 (DIR)</span>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold font-mono border ${
                motors.left_dir === 'FORWARD'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : motors.left_dir === 'REVERSE'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {motors.left_dir}
            </span>
          </div>

          {/* RPM & PWM Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-xs text-slate-500 font-medium">Rotational Speed</span>
              <div className="flex items-baseline space-x-1.5 font-mono">
                <span className="text-2xl font-bold text-slate-900">{motors.left_rpm.toFixed(1)}</span>
                <span className="text-xs text-slate-500 font-sans">RPM</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-xs text-slate-500 font-medium">PWM Duty Cycle</span>
              <div className="flex items-baseline space-x-1.5 font-mono">
                <span className="text-2xl font-bold text-blue-600">{motors.left_pwm}</span>
                <span className="text-xs text-slate-400 font-sans">/ 255</span>
              </div>
            </div>
          </div>

          {/* Duty Cycle Progress Bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1 font-mono">
              <span>Duty Cycle: {((motors.left_pwm / 255) * 100).toFixed(0)}%</span>
              <span>20 kHz LEDC</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-150"
                style={{ width: `${(motors.left_pwm / 255) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Motor Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-700 text-xs">
                M2
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Right Channel (Motor B)</h3>
                <span className="text-[11px] text-slate-400 font-mono">GPIO14 (PWM) | GPIO12/13 (DIR)</span>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold font-mono border ${
                motors.right_dir === 'FORWARD'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : motors.right_dir === 'REVERSE'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {motors.right_dir}
            </span>
          </div>

          {/* RPM & PWM Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-xs text-slate-500 font-medium">Rotational Speed</span>
              <div className="flex items-baseline space-x-1.5 font-mono">
                <span className="text-2xl font-bold text-slate-900">{motors.right_rpm.toFixed(1)}</span>
                <span className="text-xs text-slate-500 font-sans">RPM</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-xs text-slate-500 font-medium">PWM Duty Cycle</span>
              <div className="flex items-baseline space-x-1.5 font-mono">
                <span className="text-2xl font-bold text-blue-600">{motors.right_pwm}</span>
                <span className="text-xs text-slate-400 font-sans">/ 255</span>
              </div>
            </div>
          </div>

          {/* Duty Cycle Progress Bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1 font-mono">
              <span>Duty Cycle: {((motors.right_pwm / 255) * 100).toFixed(0)}%</span>
              <span>20 kHz LEDC</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-150"
                style={{ width: `${(motors.right_pwm / 255) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
