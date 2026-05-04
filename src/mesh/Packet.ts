import { Hex } from '../core/Hex.ts';

/**
 * CivisPacket Definition
 * Implements a neutral routing header for the CivisOS Mesh.
 * Allows routers to forward packets without knowing the encrypted content.
 */

export const PacketType = {
  DATA: 0,
  ANNOUNCE: 1,
  ROUTING: 2
} as const;

export type PacketType = typeof PacketType[keyof typeof PacketType];

export type CivisPacket = {
  version: number;
  type: PacketType;
  sender: string;       // 16-byte hex address
  destination: string;  // 16-byte hex address
  hops: number;
  payload: Uint8Array;
};

export class PacketSerializer {
  private static HEADER_SIZE = 37; // 1(v) + 1(t) + 1(h) + 16(s) + 16(d) + 2(len)

  static serialize(packet: CivisPacket): Uint8Array {
    const data = new Uint8Array(this.HEADER_SIZE + packet.payload.length);

    data[0] = packet.version;
    data[1] = packet.type;
    data[2] = packet.hops;

    const senderBytes = Hex.decode(packet.sender);
    const destBytes = Hex.decode(packet.destination);

    data.set(senderBytes, 3);
    data.set(destBytes, 19);

    const len = packet.payload.length;
    data[35] = len & 0xff;
    data[36] = (len >> 8) & 0xff;

    data.set(packet.payload, this.HEADER_SIZE);

    return data;
  }

  static deserialize(data: Uint8Array): CivisPacket {
    if (data.length < this.HEADER_SIZE) {
      throw new Error('Packet too short for header');
    }

    const version = data[0];
    const type = data[1] as PacketType;
    const hops = data[2];

    const sender = Hex.encode(data.slice(3, 19));
    const destination = Hex.encode(data.slice(19, 35));

    const len = data[35] | (data[36] << 8);
    const payload = data.slice(this.HEADER_SIZE, this.HEADER_SIZE + len);

    return {
      version,
      type,
      sender,
      destination,
      hops,
      payload
    };
  }
}
