import { meshService } from './MeshService.ts';
import type { ModuleBundle } from './ModuleSDK.ts';

export type DistributionPacket =
  | { type: 'ANNOUNCE_MODULE', moduleId: string, version: string, author: string }
  | { type: 'REQUEST_MODULE', moduleId: string }
  | { type: 'OFFER_MODULE', moduleId: string, bundle: ModuleBundle };

export class DistributionService {
  private static instance: DistributionService;
  private availableModules: Map<string, { version: string, author: string, from: string }> = new Map();
  private listeners: Set<(modules: Map<string, any>) => void> = new Set();

  private constructor() {
    meshService.registerHandler(this.handleMeshPacket.bind(this));
  }

  public static getInstance(): DistributionService {
    if (!DistributionService.instance) {
      DistributionService.instance = new DistributionService();
    }
    return DistributionService.instance;
  }

  private handleMeshPacket(data: Uint8Array) {
    try {
      const payload = JSON.parse(new TextDecoder().decode(data)) as DistributionPacket;

      switch (payload.type) {
        case 'ANNOUNCE_MODULE':
          this.availableModules.set(payload.moduleId, {
            version: payload.version,
            author: payload.author,
            from: 'Mesh Peer' // In real use, this would be the sender's mesh address
          });
          this.notifyListeners();
          break;

        case 'REQUEST_MODULE':
          // If we have this module and want to share it, we would respond with OFFER_MODULE
          console.log(`Peer requested module: ${payload.moduleId}`);
          break;

        case 'OFFER_MODULE':
          console.log(`Received module offer: ${payload.moduleId}`);
          // Potential installation logic here
          break;
      }
    } catch (e) {
      // Not a distribution packet or malformed
    }
  }

  public announceModule(moduleId: string, version: string, author: string) {
    const packet: DistributionPacket = {
      type: 'ANNOUNCE_MODULE',
      moduleId,
      version,
      author
    };
    meshService.sendPacket(new TextEncoder().encode(JSON.stringify(packet)));
  }

  public requestModule(moduleId: string) {
    const packet: DistributionPacket = {
      type: 'REQUEST_MODULE',
      moduleId
    };
    meshService.sendPacket(new TextEncoder().encode(JSON.stringify(packet)));
  }

  public getAvailableModules() {
    return this.availableModules;
  }

  public subscribe(listener: (modules: Map<string, any>) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(this.availableModules));
  }
}

export const distributionService = DistributionService.getInstance();
