import React, { useState } from 'react';
import { SimulationEngine } from '../simulation/simulationEngine';
import { ActivityLog } from '../types/robot';
import { FileText, Filter, Trash2, Download, Search } from 'lucide-react';

interface ActivityLogsPageProps {
  engine: SimulationEngine;
}

export const ActivityLogsPage: React.FC<ActivityLogsPageProps> = ({ engine }) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [, setRerender] = useState(0);

  const logs = engine.activityLogs;

  const handleClearLogs = () => {
    engine.activityLogs = [];
    setRerender((k) => k + 1);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `robot-activity-logs-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = filterLevel === 'ALL' || log.level === filterLevel;
    const matchesSearch =
      searchQuery === '' ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.subsystem.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const getLevelBadge = (level: ActivityLog['level']) => {
    switch (level) {
      case 'INFO':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'WARN':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ERROR':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'NAV':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'SENSOR':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Real-Time Activity &amp; Navigation Logs</h2>
            </div>
            <p className="text-xs text-slate-500">
              Live audit stream of navigation decisions, sensor measurements, and safety interventions
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportJson}
              disabled={logs.length === 0}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={handleClearLogs}
              disabled={logs.length === 0}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Logs</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700">Filter Level:</span>
            {['ALL', 'INFO', 'NAV', 'SENSOR', 'WARN', 'ERROR'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  filterLevel === lvl
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search event messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Log Feed List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs text-slate-500 font-mono">
          <span>EVENT STREAM ({filteredLogs.length} events)</span>
          <span>AUTONOMOUS TELEMETRY BUFFER</span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 font-mono">
            No activity logs match the current filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto font-mono text-xs">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-3.5 flex items-start space-x-3 hover:bg-slate-50/70 transition-colors">
                <span className="text-[11px] text-slate-400 shrink-0 select-none">
                  {new Date(log.timestamp * 1000).toLocaleTimeString()}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 border ${getLevelBadge(
                    log.level
                  )}`}
                >
                  {log.level}
                </span>
                <span className="text-[11px] font-semibold text-slate-600 shrink-0">
                  [{log.subsystem}]
                </span>
                <span className="text-slate-800 break-all">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
