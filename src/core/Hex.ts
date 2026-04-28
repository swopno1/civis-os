/**
 * Optimized Hex conversion utility.
 * Avoids intermediate array allocations and uses lookup tables for speed.
 */

const HEX_TABLE = Array.from({ length: 256 }, (_, i) =>
  i.toString(16).padStart(2, '0')
);

const REVERSE_HEX_TABLE = new Uint8Array(256);
for (let i = 0; i < 10; i++) REVERSE_HEX_TABLE[48 + i] = i; // 0-9
for (let i = 0; i < 6; i++) {
  REVERSE_HEX_TABLE[97 + i] = 10 + i; // a-f
  REVERSE_HEX_TABLE[65 + i] = 10 + i; // A-F
}

export class Hex {
  /**
   * Converts a Uint8Array to a hex string.
   */
  static encode(bytes: Uint8Array): string {
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
      result += HEX_TABLE[bytes[i]];
    }
    return result;
  }

  /**
   * Converts a hex string to a Uint8Array.
   */
  static decode(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
      throw new Error('Hex string must have an even length');
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      const high = REVERSE_HEX_TABLE[hex.charCodeAt(i)];
      const low = REVERSE_HEX_TABLE[hex.charCodeAt(i + 1)];
      bytes[i >> 1] = (high << 4) | low;
    }
    return bytes;
  }
}
