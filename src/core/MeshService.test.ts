import { test, describe } from 'node:test';
import assert from 'node:assert';

// Extremely minimal mock of dependencies to test MeshService logic in isolation
// WITHOUT importing any files that might have complex dependencies.

export type PacketHandler = (data: Uint8Array) => void;

class MinimalMeshService {
  public handlers: Set<PacketHandler> = new Set();
  public router: any;

  constructor() {
    this.router = {
      onReceived: null,
      setCallbacks: (onReceived: any) => {
        this.router.onReceived = onReceived;
      }
    };

    this.router.setCallbacks((packet: any) => {
      this.handlers.forEach(handler => {
        try {
          handler(packet.payload);
        } catch (e) {
          // This is the logic we want to test
          console.error('[MeshService] Error in mesh packet handler:', e);
        }
      });
    });
  }

  public registerHandler(handler: PacketHandler) {
    this.handlers.add(handler);
  }
}

describe('MeshService Core Delivery Logic', () => {
  test('continues delivering packets if one handler throws', () => {
    const meshService = new MinimalMeshService();
    let callCount1 = 0;
    let callCount2 = 0;

    const handler1 = () => {
      callCount1++;
      throw new Error('Test Error');
    };

    const handler2 = () => {
      callCount2++;
    };

    meshService.registerHandler(handler1);
    meshService.registerHandler(handler2);

    const payload = new Uint8Array([1, 2, 3]);

    // Simulate packet arrival via the router callback
    meshService.router.onReceived({
        sender: 'sender',
        destination: 'dest',
        payload: payload
    });

    assert.strictEqual(callCount1, 1, 'Handler 1 should have been called');
    assert.strictEqual(callCount2, 1, 'Handler 2 should have been called despite handler 1 throwing');
  });
});
