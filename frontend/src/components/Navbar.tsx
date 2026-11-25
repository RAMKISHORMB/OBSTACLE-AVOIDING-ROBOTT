import React from 'react';
import {
  Compass,
  Activity,
  Cpu,
  Radar,
  Radio,
  Sliders,
  Terminal,
  FileText,
  AlertOctagon,
  Play,
  Pause,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { ControlMode, NavigationState } from '../types/robot';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isRunning: boolean;
  onToggleRun: () => void;
  onReset: () => void;
  onEmergencyStop: () => void;
  mode: ControlMode;
  onToggleMode: () => void;
  navState: NavigationState;
  backendConnected: boolean;
}

export const NAV_TABS = [
  { id: 'overview', label: 'Overview', icon: Compass },
  { id: 'simulation', label: 'Live Simulation', icon: Radio },
  { id: 'navigation', label: 'Autonomous Navigation', icon: Activity },
  { id: 'sensors', label: 'Sensor Monitoring', icon: Radar },
  { id: 'motors', label: 'Motor Control', icon: Sliders },
  { id: 'diagnostics', label: 'System Diagnostics', icon: Cpu },
  { id: 'firmware', label: 'Firmware Architecture', icon: Terminal },
  { id: 'logs', label: 'Activity Logs', icon: FileText },
  { id: 'docs', label: 'Documentation', icon: FileText },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isRunning,
  onToggleRun,
  onReset,
  onEmergencyStop,
  mode,
  onToggleMode,
  navState,
  backendConnected,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      {/* Top Engineering Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold tracking-tight text-slate-900">
                  AUTONOMOUS ROBOTICS CONTROL SYSTEM
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-700 border border-slate-300">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Intelligent Obstacle Avoidance & Embedded Telemetry
              </p>
            </div>
          </div>

          {/* Quick Global Action Center */}
          <div className="flex items-center space-x-3">
            {/* Backend Connection Indicator */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="font-medium text-slate-700">
                {backendConnected ? 'FastAPI Linked' : 'Local WebEngine'}
              </span>
            </div>

            {/* Mode Switcher */}
            <button
              onClick={onToggleMode}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${
                mode === 'AUTONOMOUS'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              }`}
              title="Click to toggle between Autonomous and Manual teleoperation"
            >
              Mode: {mode}
            </button>

            {/* Run / Pause Button */}
            <button
              onClick={onToggleRun}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                isRunning
                  ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRunning ? 'Pause' : 'Start'}</span>
            </button>

            {/* Reset Button */}
            <button
              onClick={onReset}
              className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
              title="Reset simulation and robot pose"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            {/* Emergency Stop Button */}
            <button
              onClick={onEmergencyStop}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-rose-600 text-white hover:bg-rose-700 active:scale-95 shadow-sm transition-all"
              title="Emergency Hard Brake (Spacebar)"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>E-STOP</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <nav className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex space-x-1 sm:space-x-2 py-1.5">
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};
