import { ControlMode, Obstacle, RobotStatus, SensorReading } from '../types/robot';

const API_BASE = 'http://localhost:8000/api';

export class ApiService {
  public static async checkHealth(): Promise<{ status: string; connected: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const data = await res.json();
        return { status: data.status, connected: true };
      }
      return { status: 'error', connected: false };
    } catch {
      return { status: 'offline', connected: false };
    }
  }

  public static async getRobotStatus(): Promise<RobotStatus | null> {
    try {
      const res = await fetch(`${API_BASE}/robot/status`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  }

  public static async getSensors(): Promise<SensorReading | null> {
    try {
      const res = await fetch(`${API_BASE}/sensors`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  }

  public static async setMode(mode: ControlMode): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/robot/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public static async sendCommand(action: string, linear_speed?: number, angular_speed?: number): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/robot/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, linear_speed, angular_speed }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public static async startSimulation(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/simulation/start`, { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }

  public static async pauseSimulation(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/simulation/pause`, { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }

  public static async resetSimulation(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/simulation/reset`, { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }

  public static async setScenario(scenario: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/environment/scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public static async updateObstacles(obstacles: Obstacle[]): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/environment/obstacles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obstacles),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
