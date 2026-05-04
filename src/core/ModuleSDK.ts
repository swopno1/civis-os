import nacl from 'tweetnacl';
import { Hex } from './Hex.ts';

export interface ModuleBundle {
  manifest: {
    id: string;
    version: string;
    author: string;
    permissions: string[];
  };
  code: string; // Base64 or minified JS
  signature?: string;
}

export class ModuleSDK {
  /**
   * Verifies the signature of a module bundle against a public key.
   * In a real scenario, CivisOS would have a set of trusted root keys.
   */
  static verifyModule(bundle: ModuleBundle, publicKeyHex: string): boolean {
    if (!bundle.signature) return false;

    try {
      const message = JSON.stringify({
        manifest: bundle.manifest,
        code: bundle.code
      });
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = Hex.decode(bundle.signature);
      const publicKeyBytes = Hex.decode(publicKeyHex);

      return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch (e) {
      console.error('Module verification failed:', e);
      return false;
    }
  }

  /**
   * Signs a module bundle using a private key.
   */
  static signModule(bundle: Omit<ModuleBundle, 'signature'>, privateKeyHex: string): ModuleBundle {
    const message = JSON.stringify({
      manifest: bundle.manifest,
      code: bundle.code
    });
    const messageBytes = new TextEncoder().encode(message);
    const privateKeyBytes = Hex.decode(privateKeyHex);

    const signatureBytes = nacl.sign.detached(messageBytes, privateKeyBytes);
    return {
      ...bundle,
      signature: Hex.encode(signatureBytes)
    };
  }
}
