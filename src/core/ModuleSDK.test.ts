import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ModuleSDK, type ModuleBundle } from './ModuleSDK.ts';
import nacl from 'tweetnacl';
import { Hex } from './Hex.ts';

describe('ModuleSDK', () => {
  const keyPair = nacl.sign.keyPair();
  const publicKeyHex = Hex.encode(keyPair.publicKey);
  const privateKeyHex = Hex.encode(keyPair.secretKey);

  const testBundle: Omit<ModuleBundle, 'signature'> = {
    manifest: {
      id: 'test-module',
      version: '1.0.0',
      author: 'Test Author',
      permissions: ['mesh', 'storage']
    },
    code: 'console.log("hello world");'
  };

  test('should sign and verify a module bundle correctly (happy path)', () => {
    const signedBundle = ModuleSDK.signModule(testBundle, privateKeyHex);
    assert.ok(signedBundle.signature);

    const isValid = ModuleSDK.verifyModule(signedBundle, publicKeyHex);
    assert.strictEqual(isValid, true);
  });

  test('should return false when signature is missing', () => {
    const bundleWithoutSignature: ModuleBundle = { ...testBundle };
    const isValid = ModuleSDK.verifyModule(bundleWithoutSignature, publicKeyHex);
    assert.strictEqual(isValid, false);
  });

  test('should return false when manifest is tampered', () => {
    const signedBundle = ModuleSDK.signModule(testBundle, privateKeyHex);
    const tamperedBundle = {
      ...signedBundle,
      manifest: {
        ...signedBundle.manifest,
        permissions: ['mesh', 'storage', 'root'] // Added unauthorized permission
      }
    };

    const isValid = ModuleSDK.verifyModule(tamperedBundle, publicKeyHex);
    assert.strictEqual(isValid, false);
  });

  test('should return false when code is tampered', () => {
    const signedBundle = ModuleSDK.signModule(testBundle, privateKeyHex);
    const tamperedBundle = {
      ...signedBundle,
      code: signedBundle.code + '// malicious comment'
    };

    const isValid = ModuleSDK.verifyModule(tamperedBundle, publicKeyHex);
    assert.strictEqual(isValid, false);
  });

  test('should return false when verifying with the wrong public key', () => {
    const signedBundle = ModuleSDK.signModule(testBundle, privateKeyHex);
    const otherKeyPair = nacl.sign.keyPair();
    const otherPublicKeyHex = Hex.encode(otherKeyPair.publicKey);

    const isValid = ModuleSDK.verifyModule(signedBundle, otherPublicKeyHex);
    assert.strictEqual(isValid, false);
  });

  test('should return false when signature is malformed hex (odd length)', () => {
    const signedBundle = ModuleSDK.signModule(testBundle, privateKeyHex);
    const tamperedBundle = {
      ...signedBundle,
      signature: signedBundle.signature?.substring(0, (signedBundle.signature?.length || 0) - 1)
    };

    // verifyModule catches error and returns false
    const isValid = ModuleSDK.verifyModule(tamperedBundle as any, publicKeyHex);
    assert.strictEqual(isValid, false);
  });

  test('should return false when signature has invalid hex characters', () => {
    const signedBundle = ModuleSDK.signModule(testBundle, privateKeyHex);
    const tamperedBundle = {
      ...signedBundle,
      signature: 'G'.repeat(128) // 'G' is not a hex char
    };

    const isValid = ModuleSDK.verifyModule(tamperedBundle, publicKeyHex);
    assert.strictEqual(isValid, false);
  });
});
