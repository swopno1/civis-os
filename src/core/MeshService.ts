import { HardwareBridge } from '../mesh/HardwareBridge.ts';
import { MeshRouter } from '../mesh/Router.ts';
import { PacketType } from '../mesh/Packet.ts';

export type MeshStatus = 'Offline' | 'Local Mesh' | 'Global';
export type PacketHandler = (data: Uint8Array) => void;

export class MeshService {
  private static instance: MeshService;
  private bridge: HardwareBridge;
  private router: MeshRouter;
  private handlers: Set<PacketHandler> = new Set();
  private status: MeshStatus = 'Offline';
  private onStatusChange: (status: MeshStatus) => void = () => {};

  private constructor() {
    this.bridge = new HardwareBridge();
    this.router = new MeshRouter();

    this.router.setCallbacks(
      (packet) => {
        // Only deliver packets for the local node to the handlers
        console.log(`[MeshService] Delivering packet from ${packet.sender} to handlers`);
        this.handlers.forEach(handler => {
          try {
            handler(packet.payload);
          } catch (e) {
            console.error('[MeshService] Error in mesh packet handler:', e);
          }
        });
      },
      (forwardData) => {
        // Forward packets as instructed by the router
        if (this.status !== 'Offline') {
          console.log(`[MeshService] Routing forward: ${forwardData.length} bytes`);
          this.bridge.sendPacket(forwardData).catch(err => {
            console.error('[MeshService] Failed to forward packet:', err);
          });
        }
      }
    );
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

      this.bridge.setOnDataReceived(async (data: Uint8Array) => {
        console.log(`[MeshService] Data received from bridge: ${data.length} bytes`);
        await this.router.handleRawData(data);
      });
    }
    return success;
  }

  public async disconnectHardware() {
    await this.bridge.disconnect();
    this.status = 'Offline';
    this.onStatusChange(this.status);
  }

  /**
   * Broadcasts a packet to all nodes
   */
  public async broadcast(data: Uint8Array): Promise<void> {
    await this.sendPacket('ffffffffffffffffffffffffffffffff', data, PacketType.ANNOUNCE);
  }

  /**
   * Sends a packet to a specific destination
   */
  public async sendPacket(destination: string, data: Uint8Array, type: PacketType = PacketType.DATA): Promise<void> {
    if (this.status === 'Offline') {
      throw new Error('Cannot send packet: Mesh is offline');
    }

    const framedPacket = await this.router.createPacket(destination, data, type);
    await this.bridge.sendPacket(framedPacket);
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
