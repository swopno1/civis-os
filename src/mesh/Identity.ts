import { ed25519 } from '@noble/curves/ed25519.js';
import { Hex } from '../core/Hex.ts';

/**
 * Reticulum Network Stack (RNS) Identity Manager
 * Handles the generation, storage, and retrieval of the local node's identity.
 * Fully offline, sovereign, and decoupled from any central authority.
 */

export interface IRNSIdentity {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  addressHash: string; // The canonical RNS 16-byte address hash (hex string for UI)
}

const STORAGE_KEY = 'civisos_rns_identity';

export class RNSIdentityManager {
  
  /**
   * Loads the existing identity from local storage, or generates a new one if none exists.
   */
  static async loadOrGenerateIdentity(): Promise<IRNSIdentity> {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        return {
          privateKey: this.hexToBytes(parsed.privateKey),
          publicKey: this.hexToBytes(parsed.publicKey),
          addressHash: parsed.addressHash
        };
      } catch (err) {
        console.error('Failed to parse existing RNS identity, generating new one.', err);
      }
    }
    return await this.generateIdentity();
  }

  /**
   * Generates a new Ed25519 keypair and calculates the RNS address hash.
   */
  static async generateIdentity(): Promise<IRNSIdentity> {
    console.log('[RNS] Generating new sovereign identity...');
    
    // 1. Generate Ed25519 Keypair (No centralized servers involved)
    const privateKey = ed25519.utils.randomSecretKey();
    const publicKey = ed25519.getPublicKey(privateKey);

    // 2. Calculate RNS Address Hash (SHA-256 of public key, truncated to 16 bytes)
    const hashBuffer = await crypto.subtle.digest('SHA-256', publicKey);
    // Reticulum addresses are the first 16 bytes (128 bits) of the hash
    const addressBytes = new Uint8Array(hashBuffer).slice(0, 16);
    const addressHash = this.bytesToHex(addressBytes);

    const identity: IRNSIdentity = {
      privateKey,
      publicKey,
      addressHash
    };

    // 3. Persist locally
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      privateKey: this.bytesToHex(privateKey),
      publicKey: this.bytesToHex(publicKey),
      addressHash
    }));

    return identity;
  }

  /**
   * Wipes the identity from the device. Used in panic/SOS scenarios.
   */
  static destroyIdentity() {
    localStorage.removeItem(STORAGE_KEY);
    console.warn('[RNS] Local identity destroyed.');
  }

  // --- Utility Functions ---

  private static bytesToHex(bytes: Uint8Array): string {
    return Hex.encode(bytes);
  }

  private static hexToBytes(hex: string): Uint8Array {
    return Hex.decode(hex);
  }
}
