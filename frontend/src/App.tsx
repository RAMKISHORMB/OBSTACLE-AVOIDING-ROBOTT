import React, { useState, useEffect, useMemo } from 'react';
import { SimulationEngine } from './simulation/simulationEngine';
import { ControlMode, RobotStatus } from './types/robot';
import { wsService } from './services/websocketService';
import { ApiService } from './services/apiService';
import { Navbar } from './components/Navbar';
import { QuickMetricsBar } from './components/QuickMetricsBar';
import { OverviewPage } from './pages/OverviewPage';
import { LiveSimulationPage } from './pages/LiveSimulationPage';
import { AutonomousNavigationPage } from './pages/AutonomousNavigationPage';
import { SensorMonitoringPage } from './pages/SensorMonitoringPage';
import { MotorControlPage } from './pages/MotorControlPage';
import { SystemDiagnosticsPage } from './pages/SystemDiagnosticsPage';
import { FirmwareArchitecturePage } from './pages/FirmwareArchitecturePage';
import { ActivityLogsPage } from './pages/ActivityLogsPage';
import { DocumentationPage } from './pages/DocumentationPage';

export const App: React.FC = () => {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<string>('simulation');

  // Authoritative simulation engine
  const engine = useMemo(() => new SimulationEngine({ width: 800, height: 560 }), []);

  // React state reflecting current status
  const [status, setStatus] = useState<RobotStatus>(() => engine.getStatus());
  const [backendConnected, setBackendConnected] = useState<boolean>(false);

  // Periodically update telemetry from simulation engine
  useEffect(() => {
    const timer = setInterval(() => {
      setStatus(engine.getStatus());
    }, 50); // 20 Hz UI refresh

    return () => clearInterval(timer);
  }, [engine]);

  // Connect to backend WebSocket and check health
  useEffect(() => {
    // Check backend health
    ApiService.checkHealth().then((res) => {
      if (res.connected) {
        setBackendConnected(true);
        wsService.connect();
      }
    });

    const unsubConn = wsService.onConnectionChange((connected) => {
      setBackendConnected(connected);
    });

    return () => {
      unsubConn();
      wsService.disconnect();
    };
  }, []);

  // Global actions
  const handleToggleRun = () => {
    engine.isRunning = !engine.isRunning;
    setStatus(engine.getStatus());
    if (backendConnected) {
      if (engine.isRunning) ApiService.startSimulation();
      else ApiService.pauseSimulation();
    }
  };

  const handleReset = () => {
    engine.resetSimulation();
    setStatus(engine.getStatus());
    if (backendConnected) {
      ApiService.resetSimulation();
    }
  };

  const handleEmergencyStop = () => {
    engine.handleManualCommand('EMERGENCY_STOP');
    setStatus(engine.getStatus());
    if (backendConnected) {
      ApiService.sendCommand('EMERGENCY_STOP');
    }
  };

  const handleToggleMode = () => {
    const nextMode: ControlMode = engine.mode === 'AUTONOMOUS' ? 'MANUAL' : 'AUTONOMOUS';
    engine.mode = nextMode;
    engine.logEvent('INFO', 'ROBOT', `Control mode changed to ${nextMode}`);
    setStatus(engine.getStatus());
    if (backendConnected) {
      ApiService.setMode(nextMode);
    }
  };

  const handleManualCommand = (action: string) => {
    if (backendConnected) {
      ApiService.sendCommand(action);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Engineering Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isRunning={engine.isRunning}
        onToggleRun={handleToggleRun}
        onReset={handleReset}
        onEmergencyStop={handleEmergencyStop}
        mode={engine.mode}
        onToggleMode={handleToggleMode}
        navState={status.state}
        backendConnected={backendConnected}
      />

      {/* Global Quick Telemetry Metrics Bar */}
      <QuickMetricsBar status={status} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'overview' && (
          <OverviewPage engine={engine} status={status} setActiveTab={setActiveTab} />
        )}

        {activeTab === 'simulation' && (
          <LiveSimulationPage
            engine={engine}
            status={status}
            onCommand={handleManualCommand}
            onToggleRun={handleToggleRun}
            onReset={handleReset}
          />
        )}

        {activeTab === 'navigation' && (
          <AutonomousNavigationPage engine={engine} status={status} />
        )}

        {activeTab === 'sensors' && (
          <SensorMonitoringPage engine={engine} status={status} />
        )}

        {activeTab === 'motors' && (
          <MotorControlPage engine={engine} status={status} />
        )}

        {activeTab === 'diagnostics' && (
          <SystemDiagnosticsPage
            engine={engine}
            status={status}
            backendConnected={backendConnected}
          />
        )}

        {activeTab === 'firmware' && <FirmwareArchitecturePage />}

        {activeTab === 'logs' && <ActivityLogsPage engine={engine} />}

        {activeTab === 'docs' && <DocumentationPage />}
      </main>

      {/* Engineering Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Autonomous Obstacle Avoiding Mobile Robot &bull; Differential Kinematics &amp; Embedded Firmware
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            ESP32 / PlatformIO &bull; FastAPI Python &bull; React TypeScript Vite
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
