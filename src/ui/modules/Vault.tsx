import { useState, useEffect } from 'preact/hooks';
import nacl from 'tweetnacl';
import { CryptoVault } from '../../core/Crypto';
import type { EncryptedPackage } from '../../core/Crypto';
import './Vault.css';

interface VaultFile {
  id: string;
  name: string;
  encryptedPackage: EncryptedPackage;
  timestamp: number;
}

export function Vault() {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [vaultKeyPair, setVaultKeyPair] = useState<nacl.BoxKeyPair | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load or generate vault keypair from local storage
  useEffect(() => {
    const stored = localStorage.getItem('civisos_vault_keys');
    if (stored) {
      const { publicKey, secretKey } = JSON.parse(stored);
      setVaultKeyPair({
        publicKey: CryptoVault.fromHex(publicKey),
        secretKey: CryptoVault.fromHex(secretKey)
      });
    } else {
      const keys = CryptoVault.generateKeyPair();
      localStorage.setItem('civisos_vault_keys', JSON.stringify({
        publicKey: CryptoVault.toHex(keys.publicKey),
        secretKey: CryptoVault.toHex(keys.secretKey)
      }));
      setVaultKeyPair(keys);
    }

    const storedFiles = localStorage.getItem('civisos_vault_files');
    if (storedFiles) {
      try {
        const parsed = JSON.parse(storedFiles);
        // Convert hex strings back to Uint8Arrays
        const hydratedFiles = parsed.map((f: any) => ({
          ...f,
          encryptedPackage: {
            ciphertext: CryptoVault.fromHex(f.encryptedPackage.ciphertext),
            nonce: CryptoVault.fromHex(f.encryptedPackage.nonce),
            ephemeralPublicKey: CryptoVault.fromHex(f.encryptedPackage.ephemeralPublicKey)
          }
        }));
        setFiles(hydratedFiles);
      } catch (e) {
        console.error("Failed to load vault files", e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save files to local storage when updated
  useEffect(() => {
    if (!isInitialized) return;
    const serialized = files.map(f => ({
      ...f,
      encryptedPackage: {
        ciphertext: CryptoVault.toHex(f.encryptedPackage.ciphertext),
        nonce: CryptoVault.toHex(f.encryptedPackage.nonce),
        ephemeralPublicKey: CryptoVault.toHex(f.encryptedPackage.ephemeralPublicKey)
      }
    }));
    localStorage.setItem('civisos_vault_files', JSON.stringify(serialized));
  }, [files, isInitialized]);

  const handleFileUpload = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (!target.files || !target.files[0] || !vaultKeyPair) return;

    const file = target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      const data = new Uint8Array(arrayBuffer);

      const encrypted = CryptoVault.encrypt(data, vaultKeyPair.publicKey);

      const newVaultFile: VaultFile = {
        id: crypto.randomUUID(),
        name: file.name,
        encryptedPackage: encrypted,
        timestamp: Date.now()
      };

      setFiles(prev => [...prev, newVaultFile]);
    };

    reader.readAsArrayBuffer(file);
  };

  const downloadFile = (vaultFile: VaultFile) => {
    if (!vaultKeyPair) return;

    const decrypted = CryptoVault.decrypt(vaultFile.encryptedPackage, vaultKeyPair.secretKey);
    if (!decrypted) {
      alert("Failed to decrypt file.");
      return;
    }

    const blob = new Blob([decrypted] as BlobPart[]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = vaultFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="vault-module">
      <header className="vault-header">
        <h2>Secure Document Vault</h2>
        <p>End-to-end encrypted local storage using X25519.</p>
        <div className="vault-actions">
          <label className="upload-btn">
            + Add Secure File
            <input type="file" onChange={handleFileUpload} hidden />
          </label>
        </div>
      </header>

      <div className="file-list">
        {files.length === 0 ? (
          <div className="empty-vault">
            <p>Your vault is empty. Securely store sensitive documents here.</p>
          </div>
        ) : (
          files.map(file => (
            <div key={file.id} className="file-item">
              <div className="file-info">
                <span className="file-icon">📄</span>
                <div className="file-details">
                  <span className="file-name">{file.name}</span>
                  <span className="file-date">{new Date(file.timestamp).toLocaleString()}</span>
                </div>
              </div>
              <div className="file-actions">
                <button onClick={() => downloadFile(file)}>Decrypt & Download</button>
                <button className="delete-btn" onClick={() => deleteFile(file.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
