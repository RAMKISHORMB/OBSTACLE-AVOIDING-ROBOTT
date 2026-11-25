import React from 'react';
import { SimulationEngine } from '../simulation/simulationEngine';
import { NavigationState, RobotStatus } from '../types/robot';
import {
  Activity,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Compass,
  CheckCircle2,
  Sliders,
} from 'lucide-react';

interface AutonomousNavigationPageProps {
  engine: SimulationEngine;
  status: RobotStatus;
}

const ALL_FSM_STATES: { id: NavigationState; label: string; desc: string; category: string }[] = [
  { id: 'INITIALIZING', label: '1. Initializing', desc: 'Hardware self-test & posture calibration', category: 'setup' },
  { id: 'IDLE', label: '2. Idle', desc: 'Standby mode waiting for start trigger', category: 'setup' },
  { id: 'MOVING_FORWARD', label: '3. Moving Forward', desc: 'Cruising along heading with sonar monitoring', category: 'motion' },
  { id: 'OBSTACLE_DETECTED', label: '4. Obstacle Detected', desc: 'Clearance dropped under 20 cm avoidance bound', category: 'hazard' },
  { id: 'SCANNING_LEFT', label: '5. Scanning Left', desc: 'Turret servo pans +60° to assess left path', category: 'perception' },
  { id: 'SCANNING_RIGHT', label: '6. Scanning Right', desc: 'Turret servo pans -60° to assess right path', category: 'perception' },
  { id: 'EVALUATING_PATH', label: '7. Evaluating Path', desc: 'Comparing clearances, checking dead-end/oscillation', category: 'decision' },
  { id: 'TURNING_LEFT', label: '8. Turning Left', desc: 'Differential CCW spin toward wider left clearance', category: 'motion' },
  { id: 'TURNING_RIGHT', label: '9. Turning Right', desc: 'Differential CW spin toward wider right clearance', category: 'motion' },
  { id: 'REVERSING', label: '10. Reversing', desc: 'Dead-end escape: backing up to create turning space', category: 'recovery' },
  { id: 'VERIFYING_PATH', label: '11. Verifying Path', desc: 'Confirming new corridor clearance > 40 cm', category: 'verification' },
  { id: 'RESUMING_MOVEMENT', label: '12. Resuming Movement', desc: 'Re-accelerating motors to cruise speed', category: 'motion' },
  { id: 'EMERGENCY_STOP', label: '13. Emergency Stop', desc: 'Fail-safe brake engaged (< 10 cm or collision)', category: 'safety' },
  { id: 'ERROR', label: '14. Error State', desc: 'Hardware fault or sensor communication dropout', category: 'safety' },
];

export const AutonomousNavigationPage: React.FC<AutonomousNavigationPageProps> = ({
  engine,
  status,
}) => {
  const currentState = status.state;

  return (
    <div className="space-y-6">
      {/* Title Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">
                Autonomous Navigation Finite State Machine
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Deterministic 14-state reactive navigation engine with oscillation avoidance and dead-end escape
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-500 font-medium">Active State:</span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm shadow-blue-500/20">
              {currentState.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Real-time FSM Decision Heuristics Bar */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 font-medium block">Front Clearance</span>
            <div className="font-mono text-base font-bold text-slate-800">
              {status.sensors.front_distance_cm.toFixed(1)} cm
            </div>
            <div className="text-[11px] text-slate-400">Avoidance threshold: 20 cm</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 font-medium block">Left vs Right Clearance</span>
            <div className="font-mono text-base font-bold text-slate-800">
              L: {status.sensors.left_distance_cm.toFixed(0)} | R: {status.sensors.right_distance_cm.toFixed(0)} cm
            </div>
            <div className="text-[11px] text-slate-400">
              Bias: {status.sensors.left_distance_cm > status.sensors.right_distance_cm ? 'LEFT' : 'RIGHT'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 font-medium block">Anti-Oscillation Breaker</span>
            <div className="font-mono text-base font-bold text-emerald-600">ACTIVE</div>
            <div className="text-[11px] text-slate-400">Alternates direction if corridor Δ &lt; 5 cm</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 font-medium block">Dead-End Recovery Routine</span>
            <div className="font-mono text-base font-bold text-blue-600">AUTO REVERSE</div>
            <div className="text-[11px] text-slate-400">Triggers when L &amp; R both &lt; 20 cm</div>
          </div>
        </div>
      </div>

      {/* State Machine Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          State Transition Flowchart &amp; Operational States
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {ALL_FSM_STATES.map((st) => {
            const isActive = currentState === st.id;
            return (
              <div
                key={st.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-blue-50/90 border-blue-400 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-bold ${
                      isActive ? 'text-blue-700' : 'text-slate-800'
                    }`}
                  >
                    {st.label}
                  </span>
                  {isActive ? (
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                  ) : (
                    <span className="text-[10px] text-slate-400 uppercase">{st.category}</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">{st.desc}</p>
                {isActive && (
                  <div className="mt-2 text-[10px] font-mono text-blue-800 font-semibold bg-blue-100/60 px-2 py-0.5 rounded">
                    &bull; CURRENTLY EXECUTING
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Algorithmic Details & Sequence Guide */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          Navigation Execution Sequence (14-Step Procedure)
        </h3>

        <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700 leading-relaxed">
          <li><strong>Initialize Robot:</strong> Calibrate ultrasonic sensor, zero motor PWM channels, and establish hardware watchdog.</li>
          <li><strong>Start Forward Movement:</strong> Engage dual motors in differential forward cruise mode (PWM ~175, ~35 cm/s).</li>
          <li><strong>Continuously Measure Front Distance:</strong> 40 Hz ultrasonic echo polling detects objects in line of travel.</li>
          <li><strong>Detect Nearby Obstacles:</strong> If clearance drops under 20 cm, enter avoidance state.</li>
          <li><strong>Stop Safely:</strong> Decelerate linear velocity smoothly to zero with active electric motor braking.</li>
          <li><strong>Scan Left:</strong> Sweep front servo turret to +60° and measure left corridor clearance with median filtering.</li>
          <li><strong>Measure Left Clearance:</strong> Store left distance reading in memory.</li>
          <li><strong>Scan Right:</strong> Sweep front servo turret to -60° and measure right corridor clearance.</li>
          <li><strong>Measure Right Clearance:</strong> Store right distance reading in memory and re-center servo to 0°.</li>
          <li><strong>Compare Available Clearances:</strong> Evaluate which path provides safe clearance above the 20 cm avoidance bound.</li>
          <li><strong>Select Safest Direction:</strong> Pick the path with maximum distance. Apply anti-oscillation heuristic to prevent ping-ponging.</li>
          <li><strong>Rotate Robot:</strong> Execute differential spin in place (one motor forward, one reverse) for approximately 60°.</li>
          <li><strong>Verify New Direction:</strong> Sensor checks if the newly faced corridor has at least 40 cm clear path.</li>
          <li><strong>Resume Forward Movement:</strong> Smoothly accelerate motors to forward cruise mode. If both sides were blocked, reverse first.</li>
        </ol>
      </div>
    </div>
  );
};
