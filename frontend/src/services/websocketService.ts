import { RobotStatus } from '../types/robot';

export type TelemetryCallback = (telemetry: RobotStatus) => void;
export type ConnectionCallback = (connected: boolean) => void;

export class WebSocketService {
  private socket: WebSocket | null = null;
  private url: string;
  private reconnectInterval: number = 3000;
  private reconnectTimer: any = null;
  private telemetryListeners: Set<TelemetryCallback> = new Set();
  private connectionListeners: Set<ConnectionCallback> = new Set();
  public isConnected: boolean = false;

  constructor(url: string = 'ws://localhost:8000/ws/robot') {
    this.url = url;
  }

  public connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.notifyConnection(true);
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data: RobotStatus = JSON.parse(event.data);
          this.notifyTelemetry(data);
        } catch {
          // Ignore invalid frames
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.notifyConnection(false);
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.isConnected = false;
        this.notifyConnection(false);
      };
    } catch {
      this.isConnected = false;
      this.notifyConnection(false);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectInterval);
  }

  public sendCommand(action: string, linear_speed?: number, angular_speed?: number) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action, linear_speed, angular_speed }));
    }
  }

  public onTelemetry(callback: TelemetryCallback): () => void {
    this.telemetryListeners.add(callback);
    return () => this.telemetryListeners.delete(callback);
  }

  public onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionListeners.add(callback);
    callback(this.isConnected);
    return () => this.connectionListeners.delete(callback);
  }

  private notifyTelemetry(data: RobotStatus) {
    this.telemetryListeners.forEach((listener) => listener(data));
  }

  private notifyConnection(status: boolean) {
    this.connectionListeners.forEach((listener) => listener(status));
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const wsService = new WebSocketService();
