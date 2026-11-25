import React, { useEffect, useState, useCallback } from 'react';
import { SimulationEngine } from '../simulation/simulationEngine';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Square,
  AlertOctagon,
  Gamepad2,
  Gauge,
  Lock,
} from 'lucide-react';

interface ManualControlPadProps {
  engine: SimulationEngine;
  onCommand?: (action: string) => void;
}

export const ManualControlPad: React.FC<ManualControlPadProps> = ({ engine, onCommand }) => {
  const [speedRatio, setSpeedRatio] = useState<number>(1.0);
  const isAutonomous = engine.mode === 'AUTONOMOUS';

  const sendAction = useCallback(
    (action: 'FORWARD' | 'REVERSE' | 'LEFT' | 'RIGHT' | 'STOP' | 'EMERGENCY_STOP') => {
      engine.handleManualCommand(action);
      if (onCommand) onCommand(action);
    },
    [engine, onCommand]
  );

  // Global Keyboard Controls (W/A/S/D and Arrow Keys, Space for E-Stop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Emergency stop is always accessible
      if (e.code === 'Space') {
        e.preventDefault();
        sendAction('EMERGENCY_STOP');
        return;
      }

      if (isAutonomous) return; // Directional keys locked during autonomous mode

      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          e.preventDefault();
          sendAction('FORWARD');
          break;
        case 's':
        case 'arrowdown':
          e.preventDefault();
          sendAction('REVERSE');
          break;
        case 'a':
        case 'arrowleft':
          e.preventDefault();
          sendAction('LEFT');
          break;
        case 'd':
        case 'arrowright':
          e.preventDefault();
          sendAction('RIGHT');
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isAutonomous) return;
      if (['w', 's', 'a', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
        sendAction('STOP');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isAutonomous, sendAction]);

  const handleSpeedSlider = (val: number) => {
    setSpeedRatio(val);
    engine.setManualSpeed(val);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <Gamepad2 className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">Teleoperation &amp; Manual Override</h3>
        </div>
        {isAutonomous && (
          <span className="flex items-center space-x-1 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 font-medium">
            <Lock className="w-3.5 h-3.5" />
            <span>Autonomous Lock Active</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* D-Pad Buttons */}
        <div className="flex flex-col items-center justify-center space-y-2 select-none">
          {/* Forward */}
          <button
            disabled={isAutonomous}
            onMouseDown={() => sendAction('FORWARD')}
            onMouseUp={() => sendAction('STOP')}
            className={`w-14 h-14 rounded-xl border flex flex-col items-center justify-center font-bold transition-all shadow-xs active:scale-95 ${
              isAutonomous
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border-slate-200 hover:border-blue-300'
            }`}
          >
            <ArrowUp className="w-6 h-6" />
            <span className="text-[10px] font-mono font-semibold">W</span>
          </button>

          {/* Middle Row: Left, Stop, Right */}
          <div className="flex items-center space-x-2">
            <button
              disabled={isAutonomous}
              onMouseDown={() => sendAction('LEFT')}
              onMouseUp={() => sendAction('STOP')}
              className={`w-14 h-14 rounded-xl border flex flex-col items-center justify-center font-bold transition-all shadow-xs active:scale-95 ${
                isAutonomous
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border-slate-200 hover:border-blue-300'
              }`}
            >
              <ArrowLeft className="w-6 h-6" />
              <span className="text-[10px] font-mono font-semibold">A</span>
            </button>

            <button
              onClick={() => sendAction('STOP')}
              className="w-14 h-14 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300 flex flex-col items-center justify-center font-bold transition-all shadow-xs active:scale-95"
            >
              <Square className="w-5 h-5 fill-slate-700" />
              <span className="text-[10px] font-semibold">STOP</span>
            </button>

            <button
              disabled={isAutonomous}
              onMouseDown={() => sendAction('RIGHT')}
              onMouseUp={() => sendAction('STOP')}
              className={`w-14 h-14 rounded-xl border flex flex-col items-center justify-center font-bold transition-all shadow-xs active:scale-95 ${
                isAutonomous
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border-slate-200 hover:border-blue-300'
              }`}
            >
              <ArrowRight className="w-6 h-6" />
              <span className="text-[10px] font-mono font-semibold">D</span>
            </button>
          </div>

          {/* Reverse */}
          <button
            disabled={isAutonomous}
            onMouseDown={() => sendAction('REVERSE')}
            onMouseUp={() => sendAction('STOP')}
            className={`w-14 h-14 rounded-xl border flex flex-col items-center justify-center font-bold transition-all shadow-xs active:scale-95 ${
              isAutonomous
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border-slate-200 hover:border-blue-300'
            }`}
          >
            <ArrowDown className="w-6 h-6" />
            <span className="text-[10px] font-mono font-semibold">S</span>
          </button>
        </div>

        {/* Speed Adjustment and Keyboard Reference */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
                <Gauge className="w-3.5 h-3.5 text-blue-600" />
                <span>Throttle / Linear Velocity</span>
              </span>
              <span className="font-mono font-bold text-slate-800">{Math.round(speedRatio * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="1.5"
              step="0.1"
              value={speedRatio}
              onChange={(e) => handleSpeedSlider(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Emergency Stop Dedicated Button */}
          <button
            onClick={() => sendAction('EMERGENCY_STOP')}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold text-xs tracking-wider shadow-md shadow-rose-600/20 transition-all"
          >
            <AlertOctagon className="w-4 h-4" />
            <span>TRIGGER EMERGENCY BRAKE (SPACE)</span>
          </button>

          {/* Keyboard mapping cheat sheet */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
            <span className="font-semibold text-slate-700 block">Keyboard Shortcuts:</span>
            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono">
              <div><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">W / ↑</kbd> Forward</div>
              <div><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">S / ↓</kbd> Reverse</div>
              <div><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">A / ←</kbd> Left Turn</div>
              <div><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">D / →</kbd> Right Turn</div>
              <div className="col-span-2 mt-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">Spacebar</kbd> Hard Brake / E-Stop
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
