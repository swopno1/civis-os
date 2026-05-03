import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';

// Mock essential browser APIs that Storage.ts uses.
const idbStore: Record<string, any> = {};
(globalThis as any).indexedDB = {
  open: () => {
    const req: any = {};
    setTimeout(() => {
      req.result = {
        objectStoreNames: { contains: () => true },
        transaction: () => ({
          objectStore: () => ({
            get: (key: string) => {
              const r: any = {};
              setTimeout(() => {
                r.result = idbStore[key];
                r.onsuccess();
              }, 0);
              return r;
            },
            put: (val: any, key: string) => {
              const r: any = {};
              setTimeout(() => {
                idbStore[key] = val;
                r.onsuccess();
              }, 0);
              return r;
            },
            delete: (key: string) => {
              const r: any = {};
              setTimeout(() => {
                delete idbStore[key];
                r.onsuccess();
              }, 0);
              return r;
            }
          })
        })
      };
      req.onsuccess({ target: req });
    }, 0);
    return req;
  }
};

// Mock crypto.subtle
const cryptoMock = {
  subtle: {
    digest: async (_algorithm: string, _data: Uint8Array) => {
      return new Uint8Array(32).fill(3).buffer;
    }
  },
  getRandomValues: (array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }
};

Object.defineProperty(globalThis, 'crypto', { value: cryptoMock, writable: true });

// Now import RNSIdentityManager
import { RNSIdentityManager } from './Identity.ts';

describe('RNSIdentityManager', () => {
  beforeEach(() => {
    for (const key in idbStore) delete idbStore[key];
  });

  test('generateIdentity creates and persists a new identity', async () => {
    const identity = await RNSIdentityManager.generateIdentity();

    assert.ok(identity.privateKey instanceof Uint8Array);
    assert.ok(identity.publicKey instanceof Uint8Array);
    assert.ok(typeof identity.addressHash === 'string');
    assert.strictEqual(identity.addressHash.length, 32); // 16 bytes hex encoded

    const stored = idbStore['civisos_rns_identity'];
    assert.ok(stored !== undefined);
    assert.strictEqual(stored.addressHash, identity.addressHash);
  });

  test('loadOrGenerateIdentity generates new if none exists', async () => {
    const identity = await RNSIdentityManager.loadOrGenerateIdentity();
    assert.ok(identity.addressHash);
    const stored = idbStore['civisos_rns_identity'];
    assert.ok(stored);
  });

  test('loadOrGenerateIdentity loads existing if it exists', async () => {
    const initialIdentity = await RNSIdentityManager.generateIdentity();
    const loadedIdentity = await RNSIdentityManager.loadOrGenerateIdentity();

    assert.deepStrictEqual(loadedIdentity.privateKey, initialIdentity.privateKey);
    assert.deepStrictEqual(loadedIdentity.publicKey, initialIdentity.publicKey);
    assert.strictEqual(loadedIdentity.addressHash, initialIdentity.addressHash);
  });

  test('destroyIdentity removes identity from storage', async () => {
    await RNSIdentityManager.generateIdentity();
    assert.ok(idbStore['civisos_rns_identity']);

    await RNSIdentityManager.destroyIdentity();
    assert.strictEqual(idbStore['civisos_rns_identity'], undefined);
  });
});
