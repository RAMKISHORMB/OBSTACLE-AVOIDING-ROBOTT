import React from 'react';
import { RobotStatus } from '../types/robot';
import { Activity, Battery, Gauge, Compass, ShieldAlert, Cpu } from 'lucide-react';

interface QuickMetricsBarProps {
  status: RobotStatus;
}

export const QuickMetricsBar: React.FC<QuickMetricsBarProps> = ({ status }) => {
  const { state, mode, sensors, motors, position, battery_voltage, battery_percentage, collision_count, uptime_sec } =
    status;

  const getStateBadgeStyle = (navState: string) => {
    switch (navState) {
      case 'MOVING_FORWARD':
      case 'RESUMING_MOVEMENT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'OBSTACLE_DETECTED':
      case 'SCANNING_LEFT':
      case 'SCANNING_RIGHT':
      case 'EVALUATING_PATH':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'TURNING_LEFT':
      case 'TURNING_RIGHT':
      case 'REVERSING':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'EMERGENCY_STOP':
      case 'ERROR':
        return 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getZoneBadgeStyle = (zone: string) => {
    switch (zone) {
      case 'SAFE':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'CAUTION':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'AVOIDANCE':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'EMERGENCY':
        return 'text-rose-600 bg-rose-50 border-rose-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const formatUptime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white border-b border-slate-200 py-2.5 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        {/* Navigation State */}
        <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span className="flex items-center space-x-1">
              <Activity className="w-3.5 h-3.5" />
              <span>NAV STATE</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{mode.slice(0, 4)}</span>
          </div>
          <div className="mt-1">
            <span
              className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${getStateBadgeStyle(
                state
              )}`}
            >
              {state.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Ultrasonic Front Distance */}
        <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>FRONT DISTANCE</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${getZoneBadgeStyle(sensors.zone)}`}
            >
              {sensors.zone}
            </span>
          </div>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-lg font-bold font-mono text-slate-800">
              {sensors.front_distance_cm.toFixed(1)}
            </span>
            <span className="text-slate-500 font-medium">cm</span>
          </div>
        </div>

        {/* Dual Wheel RPM & PWM */}
        <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span className="flex items-center space-x-1">
              <Gauge className="w-3.5 h-3.5" />
              <span>MOTOR DRIVER</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">PWM 8-BIT</span>
          </div>
          <div className="mt-1 flex items-center justify-between font-mono text-xs text-slate-700">
            <div>
              <span className="text-slate-400 text-[10px]">L: </span>
              <span className="font-semibold">{motors.left_rpm.toFixed(0)}</span>
              <span className="text-[10px] text-slate-400"> rpm ({motors.left_pwm})</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px]">R: </span>
              <span className="font-semibold">{motors.right_rpm.toFixed(0)}</span>
              <span className="text-[10px] text-slate-400"> rpm ({motors.right_pwm})</span>
            </div>
          </div>
        </div>

        {/* Heading & Speed */}
        <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span className="flex items-center space-x-1">
              <Compass className="w-3.5 h-3.5" />
              <span>POSE & HEADING</span>
            </span>
          </div>
          <div className="mt-1 flex items-baseline space-x-2 font-mono">
            <div>
              <span className="text-base font-bold text-slate-800">{position.heading_deg}°</span>
            </div>
            <div className="text-slate-500 text-[11px]">
              v: <span className="text-slate-700 font-semibold">{position.linear_velocity.toFixed(0)}</span> px/s
            </div>
          </div>
        </div>

        {/* Power / Battery */}
        <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span className="flex items-center space-x-1">
              <Battery className="w-3.5 h-3.5" />
              <span>2S LI-ION POWER</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{motors.current_ma} mA</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-base font-bold font-mono text-slate-800">{battery_voltage.toFixed(2)}V</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
              {battery_percentage.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Safety & Uptime */}
        <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span className="flex items-center space-x-1">
              <Cpu className="w-3.5 h-3.5" />
              <span>SYS UPTIME</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">COLL: {collision_count}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-base font-bold font-mono text-slate-800">{formatUptime(uptime_sec)}</span>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                collision_count === 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {collision_count === 0 ? 'NOMINAL' : `${collision_count} BLOCKED`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
