import { test, describe } from 'node:test';
import assert from 'node:assert';

// Mock CompressionStream and DecompressionStream for Node.js environment if not available
// Node.js 18+ has them, but we might need a more robust mock for the test environment.
if (typeof globalThis.CompressionStream === 'undefined') {
    (globalThis as any).CompressionStream = class {
        constructor(format: string) {
            if (format !== 'gzip') throw new Error('Only gzip supported in mock');
        }
    };
    (globalThis as any).DecompressionStream = class {
        constructor(format: string) {
            if (format !== 'gzip') throw new Error('Only gzip supported in mock');
        }
    };

    // This is a VERY simplified mock that doesn't actually stream,
    // but should work with the Response-based approach in Compression.ts
    // HOWEVER, a better way is to use the actual Node.js implementations if possible.
}

import { Compression } from './Compression.ts';

describe('Compression Utility', () => {
  test('should compress and decompress data correctly', async () => {
    const originalData = new TextEncoder().encode('CivisOS: Digital Lifeboat for the 21st Century. Resilience, Neutrality, Sovereignty.');

    const compressed = await Compression.compress(originalData);
    assert.ok(compressed.length > 0, 'Compressed data should not be empty');

    // For large enough data, compressed should be smaller.
    // But for very small strings, gzip header might make it larger.

    const decompressed = await Compression.decompress(compressed);
    assert.deepStrictEqual(decompressed, originalData, 'Decompressed data should match original');
  });

  test('should handle binary data', async () => {
    const originalData = new Uint8Array(1000).fill(42);

    const compressed = await Compression.compress(originalData);
    assert.ok(compressed.length < originalData.length, 'Compressed binary data should be smaller');

    const decompressed = await Compression.decompress(compressed);
    assert.deepStrictEqual(decompressed, originalData, 'Decompressed binary data should match original');
  });
});
