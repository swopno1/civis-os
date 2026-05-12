import { test, describe } from 'node:test';
import assert from 'node:assert';
import { Hex } from './Hex.ts';

describe('Hex', () => {
  describe('encode', () => {
    test('should encode an empty Uint8Array to an empty string', () => {
      assert.strictEqual(Hex.encode(new Uint8Array([])), '');
    });

    test('should encode a single byte', () => {
      assert.strictEqual(Hex.encode(new Uint8Array([0])), '00');
      assert.strictEqual(Hex.encode(new Uint8Array([15])), '0f');
      assert.strictEqual(Hex.encode(new Uint8Array([16])), '10');
      assert.strictEqual(Hex.encode(new Uint8Array([255])), 'ff');
    });

    test('should encode multiple bytes', () => {
      assert.strictEqual(Hex.encode(new Uint8Array([0, 15, 16, 255])), '000f10ff');
    });
  });

  describe('decode', () => {
    test('should decode an empty string to an empty Uint8Array', () => {
      assert.deepStrictEqual(Hex.decode(''), new Uint8Array([]));
    });

    test('should decode a single hex pair', () => {
      assert.deepStrictEqual(Hex.decode('00'), new Uint8Array([0]));
      assert.deepStrictEqual(Hex.decode('0f'), new Uint8Array([15]));
      assert.deepStrictEqual(Hex.decode('10'), new Uint8Array([16]));
      assert.deepStrictEqual(Hex.decode('ff'), new Uint8Array([255]));
    });

    test('should decode multiple hex pairs', () => {
      assert.deepStrictEqual(Hex.decode('000f10ff'), new Uint8Array([0, 15, 16, 255]));
    });

    test('should handle uppercase hex characters', () => {
      assert.deepStrictEqual(Hex.decode('ABCDEF'), new Uint8Array([171, 205, 239]));
      assert.deepStrictEqual(Hex.decode('0A1B2C'), new Uint8Array([10, 27, 44]));
    });

    test('should handle mixed case hex characters', () => {
      assert.deepStrictEqual(Hex.decode('aBcDeF'), new Uint8Array([171, 205, 239]));
    });

    test('should throw an error for odd-length strings', () => {
      assert.throws(() => Hex.decode('0'), {
        message: 'Hex string must have an even length'
      });
      assert.throws(() => Hex.decode('abc'), {
        message: 'Hex string must have an even length'
      });
    });
  });

  describe('round-trip', () => {
    test('should correctly round-trip encode and decode', () => {
      const original = new Uint8Array([72, 101, 108, 108, 111, 32, 67, 105, 118, 105, 115, 79, 83]); // "Hello CivisOS"
      const encoded = Hex.encode(original);
      const decoded = Hex.decode(encoded);
      assert.deepStrictEqual(decoded, original);
    });

    test('should correctly round-trip random bytes', () => {
      const bytes = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        bytes[i] = i;
      }
      assert.deepStrictEqual(Hex.decode(Hex.encode(bytes)), bytes);
    });
  });
});
