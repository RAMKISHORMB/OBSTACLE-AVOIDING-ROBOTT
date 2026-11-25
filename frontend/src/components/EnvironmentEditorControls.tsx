import React from 'react';
import { SimulationEngine } from '../simulation/simulationEngine';
import {
  Layers,
  Plus,
  Trash2,
  Shuffle,
  RotateCcw,
  Square,
  Minus,
  FastForward,
} from 'lucide-react';

interface EnvironmentEditorControlsProps {
  engine: SimulationEngine;
  selectedObstacleId: string | null;
  onClearSelected: () => void;
  editorMode: 'select' | 'add_box' | 'add_wall';
  setEditorMode: (mode: 'select' | 'add_box' | 'add_wall') => void;
  onSpeedChange: (speed: number) => void;
}

export const PREDEFINED_SCENARIOS = [
  'Multiple Obstacles',
  'Open Space',
  'Single Obstacle',
  'Narrow Corridor',
  'Complex Maze',
  'Dead-End Recovery',
];

export const EnvironmentEditorControls: React.FC<EnvironmentEditorControlsProps> = ({
  engine,
  selectedObstacleId,
  onClearSelected,
  editorMode,
  setEditorMode,
  onSpeedChange,
}) => {
  const handleDeleteObstacle = () => {
    if (!selectedObstacleId) return;
    engine.obstacles = engine.obstacles.filter((o) => o.id !== selectedObstacleId);
    engine.logEvent('INFO', 'ENVIRONMENT', `Removed obstacle ID ${selectedObstacleId}`);
    onClearSelected();
  };

  const handleClearAllCustom = () => {
    engine.obstacles = engine.obstacles.filter((o) => o.id.startsWith('wall-'));
    engine.activeScenario = 'Clear Canvas';
    engine.logEvent('INFO', 'ENVIRONMENT', 'Cleared all custom obstacles.');
    onClearSelected();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">Environment &amp; Scenario Editor</h3>
        </div>

        {/* Speed Controls: 0.5x, 1x, 1.5x, 2x */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg text-xs">
          <span className="px-2 text-slate-500 font-medium flex items-center space-x-1">
            <FastForward className="w-3.5 h-3.5" />
            <span>Speed:</span>
          </span>
          {[0.5, 1.0, 1.5, 2.0].map((spd) => (
            <button
              key={spd}
              onClick={() => {
                engine.speedMultiplier = spd;
                onSpeedChange(spd);
              }}
              className={`px-2.5 py-1 rounded font-semibold transition-all ${
                engine.speedMultiplier === spd
                  ? 'bg-white text-blue-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Scenario Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Predefined Scenarios
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PREDEFINED_SCENARIOS.map((sc) => {
              const isCurrent = engine.activeScenario === sc;
              return (
                <button
                  key={sc}
                  onClick={() => engine.loadScenario(sc)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all ${
                    isCurrent
                      ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {sc}
                </button>
              );
            })}
          </div>
        </div>

        {/* Object Tools */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Obstacle Placement Tools
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setEditorMode(editorMode === 'add_box' ? 'select' : 'add_box')}
              className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                editorMode === 'add_box'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              <span>{editorMode === 'add_box' ? 'Drag on Canvas...' : 'Add Box'}</span>
            </button>

            <button
              onClick={() => setEditorMode(editorMode === 'add_wall' ? 'select' : 'add_wall')}
              className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                editorMode === 'add_wall'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Minus className="w-3.5 h-3.5" />
              <span>{editorMode === 'add_wall' ? 'Drag Wall...' : 'Add Wall'}</span>
            </button>

            <button
              onClick={() => engine.generateRandomObstacles()}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <Shuffle className="w-3.5 h-3.5 text-indigo-500" />
              <span>Randomize</span>
            </button>

            <button
              onClick={handleDeleteObstacle}
              disabled={!selectedObstacleId}
              className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                selectedObstacleId
                  ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                  : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>

            <button
              onClick={handleClearAllCustom}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors ml-auto"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Clear Arena</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
