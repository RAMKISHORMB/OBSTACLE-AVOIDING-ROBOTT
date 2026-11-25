import React, { useState } from 'react';
import {
  FileText,
  BookOpen,
  Cpu,
  Activity,
  Radio,
  Sliders,
  CheckCircle2,
  Terminal,
} from 'lucide-react';

export const DocumentationPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'arch' | 'nav' | 'kinematics' | 'hardware' | 'firmware'>('arch');

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-4">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">Technical Documentation &amp; Engineering Specifications</h2>
        </div>

        {/* Section Navigation Pills */}
        <div className="flex flex-wrap gap-2 mt-4 text-xs font-semibold">
          {[
            { id: 'arch', label: 'System Architecture', icon: Cpu },
            { id: 'nav', label: 'Navigation State Machine', icon: Activity },
            { id: 'kinematics', label: 'Differential Kinematics', icon: Radio },
            { id: 'hardware', label: 'Hardware Wiring & BOM', icon: Sliders },
            { id: 'firmware', label: 'Embedded C++ Firmware', icon: Terminal },
          ].map((sec) => {
            const Icon = sec.icon;
            const isCurrent = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id as any)}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg border transition-all ${
                  isCurrent
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm text-xs text-slate-700 leading-relaxed space-y-4">
        {activeSection === 'arch' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b pb-2">1. System Architecture Overview</h3>
            <p>
              The <strong>Autonomous Obstacle Avoiding Robot</strong> is architected as an integrated robotics software platform
              combining high-fidelity browser simulation, real-time Python FastAPI telemetry, and production-ready ESP32 C++ firmware.
            </p>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono text-[11px] space-y-2">
              <div className="font-bold text-slate-800">[Frontend UI / Canvas 2D Engine]</div>
              <div className="text-slate-600">
                ├── React 19 + TypeScript + Tailwind CSS UI<br />
                ├── HTML5 Canvas Differential Kinematics &amp; Acoustic Raycaster<br />
                ├── 14-State Autonomous Navigation Finite State Machine<br />
                └── WebSocket Telemetry Bridge (ws://localhost:8000/ws/robot)
              </div>
              <div className="font-bold text-slate-800 mt-2">[Backend REST &amp; Telemetry API]</div>
              <div className="text-slate-600">
                ├── FastAPI 0.110+ Asynchronous Web Server<br />
                ├── 40 Hz Authoritative Physics Loop<br />
                ├── Pydantic V2 Models for Telemetry &amp; Commands<br />
                └── Bi-directional WebSocket Telemetry Broadcast
              </div>
              <div className="font-bold text-slate-800 mt-2">[Embedded Firmware (ESP32)]</div>
              <div className="text-slate-600">
                ├── PlatformIO / Arduino C++ Core<br />
                ├── LEDC Hardware PWM Motor Drivers (20 kHz ultrasonic frequency)<br />
                ├── HC-SR04 Median Filter Pulse Timing Driver<br />
                └── Hardware Watchdog Timer &amp; Fail-Safe Emergency Brake
              </div>
            </div>
          </div>
        )}

        {activeSection === 'nav' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b pb-2">2. Autonomous Navigation Algorithm</h3>
            <p>
              The robot follows a deterministic 14-state reactive navigation state machine:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li><strong>Safe Cruising:</strong> While front distance &gt; 40 cm, robot accelerates to forward cruise speed (75 px/s, ~35 cm/s).</li>
              <li><strong>Obstacle Interception:</strong> When clearance drops below 20 cm, linear speed drops to zero with active braking.</li>
              <li><strong>Turret Servo Sweep:</strong> The SG90 servo sweeps the HC-SR04 transducer left (+60°) and right (-60°).</li>
              <li><strong>Clearance Comparison:</strong> Left and right distances are measured with 3-sample median filtering.</li>
              <li><strong>Anti-Oscillation Heuristic:</strong> If the difference between left and right is under 5 cm, consecutive turn history is evaluated to prevent ping-pong oscillation in symmetric corridors.</li>
              <li><strong>Dead-End Escape:</strong> If both left and right clearances are under 20 cm, the robot executes a timed reverse maneuver before re-scanning.</li>
              <li><strong>Verification:</strong> Once turned, the robot verifies that the new corridor offers &gt; 40 cm of open clearance before resuming forward cruise.</li>
            </ul>
          </div>
        )}

        {activeSection === 'kinematics' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b pb-2">3. Differential Drive Kinematic Model</h3>
            <p>
              The robot uses a standard two-wheel differential drive chassis with track width <em>L = 0.16 m</em> (16 cm)
              and wheel radius <em>r = 0.0325 m</em> (65 mm diameter wheels).
            </p>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono text-[11px] space-y-2">
              <div><strong>Forward Kinematics:</strong></div>
              <div>v = (v_right + v_left) / 2</div>
              <div>ω = (v_right - v_left) / L</div>
              <div className="mt-2"><strong>Inverse Kinematics:</strong></div>
              <div>v_left = v - (ω * L / 2)</div>
              <div>v_right = v + (ω * L / 2)</div>
              <div className="mt-2"><strong>Pose Numerical Integration (Runge-Kutta 2nd Order):</strong></div>
              <div>θ_mid = θ + ω * dt * 0.5</div>
              <div>x_new = x + v * cos(θ_mid) * dt</div>
              <div>y_new = y + v * sin(θ_mid) * dt</div>
              <div>θ_new = (θ + ω * dt) mod 2π</div>
            </div>
          </div>
        )}

        {activeSection === 'hardware' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b pb-2">4. Hardware Wiring &amp; Bill of Materials</h3>
            <table className="w-full text-left border-collapse font-mono text-[11px]">
              <thead>
                <tr className="border-b bg-slate-50 font-sans text-slate-900">
                  <th className="p-2">Component</th>
                  <th className="p-2">Model</th>
                  <th className="p-2">ESP32 Pin Connection</th>
                  <th className="p-2">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-2 font-sans font-semibold">Microcontroller</td>
                  <td className="p-2">ESP32 DevKit V1</td>
                  <td className="p-2">Core MCU</td>
                  <td className="p-2 font-sans">Main processor, PWM generation, FSM</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-semibold">Motor Driver</td>
                  <td className="p-2">L298N / TB6612FNG</td>
                  <td className="p-2">ENA=25, IN1=26, IN2=27, ENB=14, IN3=12, IN4=13</td>
                  <td className="p-2 font-sans">Dual DC motor H-Bridge driver</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-semibold">Ultrasonic Sensor</td>
                  <td className="p-2">HC-SR04</td>
                  <td className="p-2">Trig=GPIO 5, Echo=GPIO 18 (via 1k/2k divider)</td>
                  <td className="p-2 font-sans">Acoustic distance measurement</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-semibold">Turret Servo</td>
                  <td className="p-2">TowerPro SG90</td>
                  <td className="p-2">PWM=GPIO 19, VCC=5V, GND=GND</td>
                  <td className="p-2 font-sans">180° sensor panning bracket</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-semibold">Power Supply</td>
                  <td className="p-2">2S 18650 Li-ion (7.4V - 8.4V)</td>
                  <td className="p-2">LM2596 5V Buck Regulator to ESP32 V5</td>
                  <td className="p-2 font-sans">Independent logic &amp; motor power</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeSection === 'firmware' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b pb-2">5. Embedded C++ Firmware Design</h3>
            <p>
              The firmware in <code>firmware/</code> is organized into modular classes adhering to modern C++14/17 embedded principles:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li><strong>MotorController:</strong> Configures ESP32 <code>ledcSetup</code> at 20 kHz for silent motor operation without audible coil whine.</li>
              <li><strong>UltrasonicSensor:</strong> Non-blocking 10 microsecond trigger pulse generator and 3-sample median filter for spurious reflection rejection.</li>
              <li><strong>ServoController:</strong> Panning turret controller using ESP32 PWM pulse-width positioning (500us - 2400us).</li>
              <li><strong>SafetyManager:</strong> Initializes hardware Task Watchdog Timer (TWDT) with 3.0s timeout to prevent lockups.</li>
              <li><strong>Communication:</strong> High-speed JSON serialization conforming to the Python/React telemetry protocol.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
