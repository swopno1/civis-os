import { test, describe } from 'node:test';
import assert from 'node:assert';
import { PacketSerializer, PacketType } from './Packet.ts';

describe('PacketSerializer', () => {
  test('serializes and deserializes correctly', () => {
    const payload = new Uint8Array([1, 2, 3, 4, 5]);
    const packet = {
      version: 1,
      type: PacketType.DATA,
      sender: '0102030405060708090a0b0c0d0e0f10',
      destination: '100f0e0d0c0b0a090807060504030201',
      hops: 2,
      payload: payload
    };

    const serialized = PacketSerializer.serialize(packet);
    assert.strictEqual(serialized.length, 37 + payload.length);

    const deserialized = PacketSerializer.deserialize(serialized);
    assert.deepStrictEqual(deserialized, packet);
  });

  test('throws error for too short data', () => {
    const shortData = new Uint8Array(10);
    assert.throws(() => {
      PacketSerializer.deserialize(shortData);
    }, /Packet too short for header/);
  });
});
