import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import { meshService } from './MeshService.ts';

// Mock meshService methods BEFORE importing distributionService
let capturedHandler: ((data: Uint8Array) => void) | undefined;

mock.method(meshService, 'registerHandler', (handler: any) => {
  capturedHandler = handler;
});

const broadcastMock = mock.method(meshService, 'broadcast', async () => {});

// Dynamically import the service to ensure our mocks are in place
const { distributionService } = await import('./DistributionService.ts');

describe('DistributionService', () => {
  test('should register a handler on meshService upon initialization', () => {
    assert.ok(capturedHandler, 'Handler should have been registered and captured');
  });

  test('announceModule should broadcast an ANNOUNCE_MODULE packet', async () => {
    broadcastMock.mock.resetCalls();
    distributionService.announceModule('test-module', '1.0.0', 'Alice');

    assert.strictEqual(broadcastMock.mock.callCount(), 1);
    const arg = broadcastMock.mock.calls[0].arguments[0] as Uint8Array;
    const payload = JSON.parse(new TextDecoder().decode(arg));

    assert.deepStrictEqual(payload, {
      type: 'ANNOUNCE_MODULE',
      moduleId: 'test-module',
      version: '1.0.0',
      author: 'Alice'
    });
  });

  test('requestModule should broadcast a REQUEST_MODULE packet', async () => {
    broadcastMock.mock.resetCalls();
    distributionService.requestModule('req-module');

    assert.strictEqual(broadcastMock.mock.callCount(), 1);
    const arg = broadcastMock.mock.calls[0].arguments[0] as Uint8Array;
    const payload = JSON.parse(new TextDecoder().decode(arg));

    assert.deepStrictEqual(payload, {
      type: 'REQUEST_MODULE',
      moduleId: 'req-module'
    });
  });

  test('handleMeshPacket should update available modules on ANNOUNCE_MODULE', () => {
    const announcePacket = {
      type: 'ANNOUNCE_MODULE',
      moduleId: 'new-module',
      version: '2.0.0',
      author: 'Bob'
    };

    const data = new TextEncoder().encode(JSON.stringify(announcePacket));
    if (capturedHandler) {
      capturedHandler(data);
    }

    const available = distributionService.getAvailableModules();
    assert.ok(available.has('new-module'));
    assert.deepStrictEqual(available.get('new-module'), {
      version: '2.0.0',
      author: 'Bob',
      from: 'Mesh Peer'
    });
  });

  test('subscribe should notify listeners when a module is announced', () => {
    let notifiedModules: Map<string, any> | null = null;
    const unsubscribe = distributionService.subscribe((modules) => {
      notifiedModules = modules;
    });

    const announcePacket = {
      type: 'ANNOUNCE_MODULE',
      moduleId: 'notified-module',
      version: '1.2.3',
      author: 'Charlie'
    };

    const data = new TextEncoder().encode(JSON.stringify(announcePacket));
    if (capturedHandler) {
      capturedHandler(data);
    }

    assert.ok(notifiedModules);
    // @ts-ignore
    assert.ok(notifiedModules.has('notified-module'));

    unsubscribe();
  });

  test('handleMeshPacket should ignore malformed JSON', () => {
    const initialSize = distributionService.getAvailableModules().size;
    if (capturedHandler) {
      capturedHandler(new TextEncoder().encode('invalid-json{'));
    }
    assert.strictEqual(distributionService.getAvailableModules().size, initialSize);
  });

  test('handleMeshPacket should handle unknown packet types gracefully', () => {
    const initialSize = distributionService.getAvailableModules().size;
    const unknownPacket = { type: 'UNKNOWN_TYPE', data: 'something' };
    if (capturedHandler) {
      capturedHandler(new TextEncoder().encode(JSON.stringify(unknownPacket)));
    }
    assert.strictEqual(distributionService.getAvailableModules().size, initialSize);
  });
});
