import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';

// Mock localStorage BEFORE importing RNSIdentityManager
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// Mock crypto.subtle
const cryptoMock = {
  subtle: {
    digest: async (algorithm: string, data: Uint8Array) => {
      // Mock SHA-256 by returning a fixed buffer
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
    localStorage.clear();
  });

  test('generateIdentity creates and persists a new identity', async () => {
    const identity = await RNSIdentityManager.generateIdentity();

    assert.ok(identity.privateKey instanceof Uint8Array);
    assert.ok(identity.publicKey instanceof Uint8Array);
    assert.ok(typeof identity.addressHash === 'string');
    assert.strictEqual(identity.addressHash.length, 32); // 16 bytes hex encoded

    const stored = localStorage.getItem('civisos_rns_identity');
    assert.ok(stored);
    const parsed = JSON.parse(stored);
    assert.strictEqual(parsed.addressHash, identity.addressHash);
  });

  test('loadOrGenerateIdentity generates new if none exists', async () => {
    const identity = await RNSIdentityManager.loadOrGenerateIdentity();
    assert.ok(identity.addressHash);
    const stored = localStorage.getItem('civisos_rns_identity');
    assert.ok(stored);
  });

  test('loadOrGenerateIdentity loads existing if it exists', async () => {
    const initialIdentity = await RNSIdentityManager.generateIdentity();
    const loadedIdentity = await RNSIdentityManager.loadOrGenerateIdentity();

    assert.deepStrictEqual(loadedIdentity.privateKey, initialIdentity.privateKey);
    assert.deepStrictEqual(loadedIdentity.publicKey, initialIdentity.publicKey);
    assert.strictEqual(loadedIdentity.addressHash, initialIdentity.addressHash);
  });

  test('loadOrGenerateIdentity generates new if existing is invalid JSON', async () => {
    localStorage.setItem('civisos_rns_identity', 'invalid-json');

    // We expect a console.error but we want it to continue
    const identity = await RNSIdentityManager.loadOrGenerateIdentity();

    assert.ok(identity.addressHash);
    // Should have overwritten invalid JSON
    const stored = localStorage.getItem('civisos_rns_identity');
    assert.notStrictEqual(stored, 'invalid-json');
    assert.ok(stored && stored.startsWith('{'));
  });

  test('destroyIdentity removes identity from storage', async () => {
    await RNSIdentityManager.generateIdentity();
    assert.ok(localStorage.getItem('civisos_rns_identity'));

    RNSIdentityManager.destroyIdentity();
    assert.strictEqual(localStorage.getItem('civisos_rns_identity'), null);
  });
});
