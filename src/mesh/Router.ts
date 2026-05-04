import { type CivisPacket, PacketType, PacketSerializer } from './Packet.ts';
import { RNSIdentityManager } from './Identity.ts';

export type OnPacketReceived = (packet: CivisPacket) => void;
export type OnPacketForward = (data: Uint8Array) => void;

/**
 * Mesh Router
 * Implements traffic neutrality: forwards packets based on header without inspecting payload.
 */
export class MeshRouter {
  private localAddress: string | null = null;
  private onReceived: OnPacketReceived | null = null;
  private onForward: OnPacketForward | null = null;
  private processedPackets: Set<string> = new Set(); // Simple deduplication

  constructor() {
    // Note: init() must be awaited or completed before use
  }

  public async init(testAddress?: string) {
    if (testAddress) {
      this.localAddress = testAddress;
    } else {
      const identity = await RNSIdentityManager.loadOrGenerateIdentity();
      this.localAddress = identity.addressHash;
    }
  }

  public setCallbacks(onReceived: OnPacketReceived, onForward: OnPacketForward) {
    this.onReceived = onReceived;
    this.onForward = onForward;
  }

  /**
   * Process an incoming raw packet from the mesh
   */
  public handleRawData(data: Uint8Array) {
    try {
      const packet = PacketSerializer.deserialize(data);

      // 1. Deduplication (Traffic Neutrality preserved: we don't look at content)
      const packetId = this.calculatePacketId(data);
      if (this.processedPackets.has(packetId)) return;
      this.processedPackets.add(packetId);
      if (this.processedPackets.size > 1000) {
        // Keep memory low
        const first = this.processedPackets.values().next().value;
        if (first) this.processedPackets.delete(first);
      }

      // 2. Routing Logic (Traffic Neutrality: Only look at destination)
      if (packet.destination === this.localAddress || packet.destination === 'ffffffffffffffffffffffffffffffff') {
        // Targeted at us or broadcast
        console.log(`[Router] Packet received for local node from ${packet.sender}`);
        if (this.onReceived) this.onReceived(packet);
      }

      if (packet.destination !== this.localAddress) {
        // Not for us (or broadcast), forward it
        if (packet.hops < 10) { // Max hops to prevent loops
          console.log(`[Router] Forwarding packet for ${packet.destination}`);
          const forwardedPacket = { ...packet, hops: packet.hops + 1 };
          if (this.onForward) {
            this.onForward(PacketSerializer.serialize(forwardedPacket));
          }
        }
      }
    } catch (err) {
      console.error('[Router] Failed to process mesh packet:', err);
    }
  }

  private calculatePacketId(data: Uint8Array): string {
    // Deduplication should exclude mutable fields (like 'hops' at index 2)
    // We'll use the sender (indices 3-18), destination (19-34), and the first 16 bytes of payload if available.
    const sender = data.slice(3, 19);
    const dest = data.slice(19, 35);
    const payloadSnippet = data.slice(37, 53);

    // Efficiently build a hex-like string for the ID
    return `${this.bytesToCompactId(sender)}-${this.bytesToCompactId(dest)}-${this.bytesToCompactId(payloadSnippet)}`;
  }

  private bytesToCompactId(bytes: Uint8Array): string {
    let res = '';
    for (let i = 0; i < bytes.length; i++) {
      res += bytes[i].toString(16).padStart(2, '0');
    }
    return res;
  }

  public async createPacket(destination: string, payload: Uint8Array, type: PacketType = PacketType.DATA): Promise<Uint8Array> {
    if (!this.localAddress) {
      const identity = await RNSIdentityManager.loadOrGenerateIdentity();
      this.localAddress = identity.addressHash;
    }

    const packet: CivisPacket = {
      version: 1,
      type,
      sender: this.localAddress,
      destination,
      hops: 0,
      payload
    };

    return PacketSerializer.serialize(packet);
  }
}
