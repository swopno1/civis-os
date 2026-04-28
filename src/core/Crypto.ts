import nacl from 'tweetnacl';
import { Hex } from './Hex.ts';

/**
 * CivisOS Crypto Utility
 * Provides X25519 encryption/decryption using tweetnacl.
 * Adheres to Fact 1: Neutral, open-source, and sovereign.
 */

export interface EncryptedPackage {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  ephemeralPublicKey: Uint8Array;
}

export class CryptoVault {
  /**
   * Encrypts data using X25519 (nacl.box).
   * Since this is for a local vault, we use an "anonymous" approach:
   * We generate an ephemeral keypair for the sender and encrypt to the recipient's public key.
   */
  static encrypt(
    data: Uint8Array,
    recipientPublicKey: Uint8Array
  ): EncryptedPackage {
    const ephemeralKeyPair = nacl.box.keyPair();
    const nonce = nacl.randomBytes(nacl.box.nonceLength);

    const ciphertext = nacl.box(
      data,
      nonce,
      recipientPublicKey,
      ephemeralKeyPair.secretKey
    );

    return {
      ciphertext,
      nonce,
      ephemeralPublicKey: ephemeralKeyPair.publicKey,
    };
  }

  /**
   * Decrypts data using X25519 (nacl.box.open).
   */
  static decrypt(
    encryptedPackage: EncryptedPackage,
    recipientSecretKey: Uint8Array
  ): Uint8Array | null {
    return nacl.box.open(
      encryptedPackage.ciphertext,
      encryptedPackage.nonce,
      encryptedPackage.ephemeralPublicKey,
      recipientSecretKey
    );
  }

  /**
   * Generates a new X25519 keypair.
   */
  static generateKeyPair(): nacl.BoxKeyPair {
    return nacl.box.keyPair();
  }

  /**
   * Helper to convert Uint8Array to Hex string
   */
  static toHex(bytes: Uint8Array): string {
    return Hex.encode(bytes);
  }

  /**
   * Helper to convert Hex string to Uint8Array
   */
  static fromHex(hex: string): Uint8Array {
    return Hex.decode(hex);
  }
}
