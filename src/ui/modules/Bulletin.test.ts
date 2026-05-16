import { test, describe } from 'node:test';
import assert from 'node:assert';

// Mock TextDecoder as it might not be available in Node test environment if not polyfilled
if (typeof TextDecoder === 'undefined') {
  (globalThis as any).TextDecoder = class {
    decode(arr: Uint8Array) {
      return Buffer.from(arr).toString('utf-8');
    }
  };
}

describe('Bulletin Protocol Logic', () => {
  test('should correctly handle batched request packets', async () => {
    // This is a logic-only test of the expected behavior of the handler we modified
    const posts = [
      { id: '1', title: 'Post 1', content: 'Content 1', category: 'Community', timestamp: Date.now(), sender: 'Node A' },
      { id: '2', title: 'Post 2', content: 'Content 2', category: 'Community', timestamp: Date.now(), sender: 'Node A' }
    ];

    const sentMessages: any[] = [];
    const mockMeshClient = {
      send: async (data: string) => {
        sentMessages.push(JSON.parse(data));
      }
    };

    // Simulate the logic in Bulletin.tsx for 'request' type
    const handleRequest = async (envelope: any) => {
      const requestedIds = (envelope.ids as string[]) || [envelope.id as string];
      for (const id of requestedIds) {
        if (!id) continue;
        const requestedPost = posts.find(p => p.id === id);
        if (requestedPost) {
          const response = {
            module: 'bulletin',
            post: requestedPost
          };
          await mockMeshClient.send(JSON.stringify(response));
        }
      }
    };

    // Test batched request
    await handleRequest({
      module: 'bulletin',
      type: 'request',
      ids: ['1', '2']
    });

    assert.strictEqual(sentMessages.length, 2);
    assert.strictEqual(sentMessages[0].post.id, '1');
    assert.strictEqual(sentMessages[1].post.id, '2');

    sentMessages.length = 0;

    // Test legacy single request
    await handleRequest({
      module: 'bulletin',
      type: 'request',
      id: '1'
    });

    assert.strictEqual(sentMessages.length, 1);
    assert.strictEqual(sentMessages[0].post.id, '1');
  });

  test('should correctly batch missing IDs for inventory response', async () => {
    const seenPostIds = new Set(['1']);
    const peerIds = ['1', '2', '3'];

    const sentMessages: any[] = [];
    const mockMeshClient = {
      send: async (data: string) => {
        sentMessages.push(JSON.parse(data));
      }
    };

    // Simulate logic in Bulletin.tsx for 'inventory' type
    const handleInventory = async (envelope: any) => {
      const missingIds = (envelope.ids as string[]).filter(id => !seenPostIds.has(id));
      if (missingIds.length > 0) {
        const request = {
          module: 'bulletin',
          type: 'request',
          ids: missingIds
        };
        await mockMeshClient.send(JSON.stringify(request));
      }
    };

    await handleInventory({
      module: 'bulletin',
      type: 'inventory',
      ids: peerIds
    });

    assert.strictEqual(sentMessages.length, 1);
    assert.deepStrictEqual(sentMessages[0].ids, ['2', '3']);
  });
});
