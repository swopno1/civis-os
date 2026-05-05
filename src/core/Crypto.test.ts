import { test, describe } from 'node:test';
import assert from 'node:assert';
import { CryptoVault } from './Crypto.ts';

describe('CryptoVault', () => {
  test('should generate a valid keypair', () => {
    const keyPair = CryptoVault.generateKeyPair();
    assert.strictEqual(keyPair.publicKey.length, 32);
    assert.strictEqual(keyPair.secretKey.length, 32);
  });

  test('should encrypt and decrypt data correctly (round-trip)', () => {
    const recipient = CryptoVault.generateKeyPair();
    const message = new TextEncoder().encode('Hello, CivisOS!');

    const encrypted = CryptoVault.encrypt(message, recipient.publicKey);
    assert.ok(encrypted.ciphertext.length > 0);
    assert.strictEqual(encrypted.nonce.length, 24);
    assert.strictEqual(encrypted.ephemeralPublicKey.length, 32);

    const decrypted = CryptoVault.decrypt(encrypted, recipient.secretKey);
    assert.deepStrictEqual(decrypted, message);
  });

  test('should return null when decrypting with the wrong secret key', () => {
    const recipient = CryptoVault.generateKeyPair();
    const wrongRecipient = CryptoVault.generateKeyPair();
    const message = new TextEncoder().encode('Secret Message');

    const encrypted = CryptoVault.encrypt(message, recipient.publicKey);
    const decrypted = CryptoVault.decrypt(encrypted, wrongRecipient.secretKey);

    assert.strictEqual(decrypted, null);
  });

  test('should return null when decrypting tampered ciphertext', () => {
    const recipient = CryptoVault.generateKeyPair();
    const message = new TextEncoder().encode('Authentic Message');

    const encrypted = CryptoVault.encrypt(message, recipient.publicKey);

    // Tamper with ciphertext
    const tamperedCiphertext = new Uint8Array(encrypted.ciphertext);
    tamperedCiphertext[0] ^= 0xFF;

    const tamperedPackage = {
      ...encrypted,
      ciphertext: tamperedCiphertext,
    };

    const decrypted = CryptoVault.decrypt(tamperedPackage, recipient.secretKey);
    assert.strictEqual(decrypted, null);
  });

  test('should convert to and from hex correctly', () => {
    const data = new Uint8Array([0, 1, 15, 16, 255]);
    const hex = CryptoVault.toHex(data);
    assert.strictEqual(hex, '00010f10ff');

    const decoded = CryptoVault.fromHex(hex);
    assert.deepStrictEqual(decoded, data);
  });
});
