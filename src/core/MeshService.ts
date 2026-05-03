import { HardwareBridge } from '../mesh/HardwareBridge.ts';

export type MeshStatus = 'Offline' | 'Local Mesh' | 'Global';
export type PacketHandler = (data: Uint8Array) => void;

export class MeshService {
  private static instance: MeshService;
  private bridge: HardwareBridge;
  private handlers: Set<PacketHandler> = new Set();
  private status: MeshStatus = 'Offline';
  private onStatusChange: (status: MeshStatus) => void = () => {};

  private constructor() {
    this.bridge = new HardwareBridge();
  }

  public static getInstance(): MeshService {
    if (!MeshService.instance) {
      MeshService.instance = new MeshService();
    }
    return MeshService.instance;
  }

  public setStatusChangeHandler(handler: (status: MeshStatus) => void) {
    this.onStatusChange = handler;
  }

  public async connectHardware(): Promise<boolean> {
    const success = await this.bridge.connect();
    if (success) {
      this.status = 'Local Mesh';
      this.onStatusChange(this.status);

      this.bridge.setOnDataReceived((data: Uint8Array) => {
        console.log(`[MeshService] Dispatching ${data.length} bytes to handlers`);
        this.handlers.forEach(handler => handler(data));
      });
    }
    return success;
  }

  public async disconnectHardware() {
    await this.bridge.disconnect();
    this.status = 'Offline';
    this.onStatusChange(this.status);
  }

  public async sendPacket(data: Uint8Array): Promise<void> {
    if (this.status === 'Offline') {
      throw new Error('Cannot send packet: Mesh is offline');
    }
    await this.bridge.sendPacket(data);
  }

  public registerHandler(handler: PacketHandler) {
    this.handlers.add(handler);
  }

  public unregisterHandler(handler: PacketHandler) {
    this.handlers.delete(handler);
  }

  public getStatus(): MeshStatus {
    return this.status;
  }
}

export const meshService = MeshService.getInstance();
