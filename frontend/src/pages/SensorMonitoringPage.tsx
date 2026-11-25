import React, { useRef, useEffect, useState } from 'react';
import { SimulationEngine } from '../simulation/simulationEngine';
import { RobotStatus } from '../types/robot';
import { Radar, Activity, Clock, ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';

interface SensorMonitoringPageProps {
  engine: SimulationEngine;
  status: RobotStatus;
}

export const SensorMonitoringPage: React.FC<SensorMonitoringPageProps> = ({ engine, status }) => {
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [history, setHistory] = useState<{ time: number; front: number; left: number; right: number }[]>([]);

  // Collect sensor time series history
  useEffect(() => {
    const interval = setInterval(() => {
      setHistory((prev) => {
        const next = [
          ...prev,
          {
            time: Date.now(),
            front: engine.frontDistanceCm,
            left: engine.leftDistanceCm,
            right: engine.rightDistanceCm,
          },
        ];
        return next.slice(-60); // Keep last 60 samples (~30 seconds)
      });
    }, 500);

    return () => clearInterval(interval);
  }, [engine]);

  // Render Time-Series Canvas Chart
  useEffect(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let y = 0; y <= h; y += h / 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Safety threshold guide lines
    const maxCm = 200;
    const cmToY = (cm: number) => h - (Math.min(maxCm, cm) / maxCm) * (h - 20) - 10;

    // 40cm Safe / Caution line
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, cmToY(40));
    ctx.lineTo(w, cmToY(40));
    ctx.stroke();

    // 20cm Avoidance line
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.5)';
    ctx.beginPath();
    ctx.moveTo(0, cmToY(20));
    ctx.lineTo(w, cmToY(20));
    ctx.stroke();

    // 10cm Emergency stop line
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, cmToY(10));
    ctx.lineTo(w, cmToY(10));
    ctx.stroke();
    ctx.setLineDash([]);

    if (history.length < 2) return;

    // Draw Front Distance curve
    ctx.strokeStyle = '#2563eb'; // Blue
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    history.forEach((pt, idx) => {
      const x = (idx / (history.length - 1)) * w;
      const y = cmToY(pt.front);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill area under front curve
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = 'rgba(37, 99, 235, 0.08)';
    ctx.fill();

    // Draw Left Distance curve
    ctx.strokeStyle = '#10b981'; // Green
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    history.forEach((pt, idx) => {
      const x = (idx / (history.length - 1)) * w;
      const y = cmToY(pt.left);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Right Distance curve
    ctx.strokeStyle = '#f59e0b'; // Amber
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    history.forEach((pt, idx) => {
      const x = (idx / (history.length - 1)) * w;
      const y = cmToY(pt.right);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [history]);

  const { sensors } = status;

  return (
    <div className="space-y-6">
      {/* Sensor Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Front Sonar */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span className="flex items-center space-x-1.5">
              <Radar className="w-4 h-4 text-blue-600" />
              <span>FRONT ULTRASONIC SENSOR</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              HC-SR04
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-slate-900">
              {sensors.front_distance_cm.toFixed(1)}
            </span>
            <span className="text-sm font-semibold text-slate-500">cm</span>
          </div>
          <div className="text-xs flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-slate-500">Hazard Status:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                sensors.zone === 'SAFE'
                  ? 'bg-emerald-50 text-emerald-700'
                  : sensors.zone === 'CAUTION'
                  ? 'bg-amber-50 text-amber-700'
                  : sensors.zone === 'AVOIDANCE'
                  ? 'bg-orange-50 text-orange-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {sensors.zone}
            </span>
          </div>
        </div>

        {/* Left Scan Reading */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>LEFT SWEEP (+60°)</span>
            <span className="text-[10px] text-slate-400 font-mono">SERVO PAN</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-slate-900">
              {sensors.left_distance_cm.toFixed(1)}
            </span>
            <span className="text-sm font-semibold text-slate-500">cm</span>
          </div>
          <div className="text-xs flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-slate-500">Corridor Status:</span>
            <span className="font-semibold text-slate-700">
              {sensors.left_distance_cm > 25 ? 'CLEAR' : 'OBSTRUCTED'}
            </span>
          </div>
        </div>

        {/* Right Scan Reading */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>RIGHT SWEEP (-60°)</span>
            <span className="text-[10px] text-slate-400 font-mono">SERVO PAN</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-slate-900">
              {sensors.right_distance_cm.toFixed(1)}
            </span>
            <span className="text-sm font-semibold text-slate-500">cm</span>
          </div>
          <div className="text-xs flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-slate-500">Corridor Status:</span>
            <span className="font-semibold text-slate-700">
              {sensors.right_distance_cm > 25 ? 'CLEAR' : 'OBSTRUCTED'}
            </span>
          </div>
        </div>
      </div>

      {/* Live Distance History Time-Series Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Real-Time Ultrasonic Distance Telemetry Chart</span>
            </h3>
            <p className="text-xs text-slate-500">Continuous 40 Hz acoustic distance measurement history</p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-medium">
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-1 bg-blue-600 rounded-full" />
              <span>Front Distance</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-1 bg-emerald-500 rounded-full" />
              <span>Left Scan</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-1 bg-amber-500 rounded-full" />
              <span>Right Scan</span>
            </span>
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-lg border border-slate-100 bg-white">
          <canvas
            ref={chartCanvasRef}
            width={760}
            height={220}
            className="w-full h-52 block"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] text-slate-600">
          <div className="p-2 rounded bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block">Safe Threshold</span>
            <strong className="text-slate-800">&gt; 40 cm</strong>
          </div>
          <div className="p-2 rounded bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block">Caution Boundary</span>
            <strong className="text-slate-800">20 - 40 cm</strong>
          </div>
          <div className="p-2 rounded bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block">Avoidance Trigger</span>
            <strong className="text-slate-800">10 - 20 cm</strong>
          </div>
          <div className="p-2 rounded bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block">Emergency Stop</span>
            <strong className="text-slate-800">&lt; 10 cm</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
