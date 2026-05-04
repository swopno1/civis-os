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
  public async handleRawData(data: Uint8Array) {
    try {
      const packet = PacketSerializer.deserialize(data);

      // 1. Deduplication (Traffic Neutrality preserved: we don't look at content)
      const packetId = await this.calculatePacketId(data);
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

  private async calculatePacketId(data: Uint8Array): Promise<string> {
    // Deduplication should exclude mutable fields (like 'hops' at index 2)
    // We use SHA-256 of all immutable fields: version, type, sender, destination, and payload.
    // Immutable header parts: [0..1] and [3..36]
    const immutableHeader = new Uint8Array(1 + 1 + 16 + 16 + 2);
    immutableHeader[0] = data[0]; // version
    immutableHeader[1] = data[1]; // type
    immutableHeader.set(data.slice(3, 19), 2); // sender
    immutableHeader.set(data.slice(19, 35), 18); // destination
    immutableHeader.set(data.slice(35, 37), 34); // payload length

    const payload = data.slice(37);

    const combined = new Uint8Array(immutableHeader.length + payload.length);
    combined.set(immutableHeader);
    combined.set(payload, immutableHeader.length);

    const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
    const hashArray = new Uint8Array(hashBuffer);
    return this.bytesToCompactId(hashArray);
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
