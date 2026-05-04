import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';

// Mock essential browser APIs
(globalThis as any).indexedDB = {
  open: () => ({ onsuccess: (e: any) => e.target.onsuccess({ target: { result: {
    objectStoreNames: { contains: () => true },
    transaction: () => ({ objectStore: () => ({ get: () => ({ onsuccess: () => {} }) }) })
  } } }) })
};

const cryptoMock = {
  subtle: {
    digest: async () => new Uint8Array(32).fill(1).buffer
  },
  getRandomValues: (array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) array[i] = i;
    return array;
  }
};
Object.defineProperty(globalThis, 'crypto', { value: cryptoMock, writable: true });

import { MeshRouter } from './Router.ts';
import { PacketSerializer, PacketType } from './Packet.ts';

describe('MeshRouter & Traffic Neutrality', () => {
  let router: MeshRouter;
  let receivedPacket: any = null;
  let forwardedData: Uint8Array | null = null;

  const LOCAL_ADDR = '01010101010101010101010101010101';

  beforeEach(async () => {
    router = new MeshRouter();
    await router.init(LOCAL_ADDR);
    receivedPacket = null;
    forwardedData = null;
    router.setCallbacks(
      (p) => { receivedPacket = p; },
      (d) => { forwardedData = d; }
    );
  });

  test('Router delivers packet for local node', async () => {
    const payload = new TextEncoder().encode('Hello Local');
    const rawPacket = await router.createPacket(LOCAL_ADDR, payload);

    await router.handleRawData(rawPacket);

    assert.ok(receivedPacket);
    assert.deepStrictEqual(receivedPacket.payload, payload);
    assert.strictEqual(forwardedData, null);
  });

  test('Router forwards packet for other node (Traffic Neutrality)', async () => {
    const payload = new TextEncoder().encode('Secret Content');
    const otherDest = '22222222222222222222222222222222';

    const packet = {
      version: 1,
      type: PacketType.DATA,
      sender: '33333333333333333333333333333333',
      destination: otherDest,
      hops: 0,
      payload: payload
    };
    const rawPacket = PacketSerializer.serialize(packet);

    await router.handleRawData(rawPacket);

    assert.strictEqual(receivedPacket, null);
    assert.ok(forwardedData);

    const deserialized = PacketSerializer.deserialize(forwardedData);
    assert.strictEqual(deserialized.destination, otherDest);
    assert.strictEqual(deserialized.hops, 1);
    assert.deepStrictEqual(deserialized.payload, payload);
  });

  test('Router handles broadcast packets', async () => {
    const payload = new TextEncoder().encode('Broadcast Msg');
    const broadcastAddr = 'ffffffffffffffffffffffffffffffff';

    const packet = {
      version: 1,
      type: PacketType.ANNOUNCE,
      sender: '44444444444444444444444444444444',
      destination: broadcastAddr,
      hops: 0,
      payload: payload
    };
    const rawPacket = PacketSerializer.serialize(packet);

    await router.handleRawData(rawPacket);

    assert.ok(receivedPacket);
    assert.ok(forwardedData);
    assert.strictEqual(receivedPacket.destination, broadcastAddr);
  });
});
