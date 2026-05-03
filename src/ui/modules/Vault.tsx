import { useState, useEffect } from 'preact/hooks';
import nacl from 'tweetnacl';
import { CryptoVault } from '../../core/Crypto.ts';
import type { EncryptedPackage } from '../../core/Crypto.ts';
import type { ICivisModuleContext } from '../../core/ICivisModule.ts';
import './Vault.css';

interface VaultFile {
  id: string;
  name: string;
  encryptedPackage: EncryptedPackage;
  timestamp: number;
}

interface VaultProps {
  context: ICivisModuleContext;
}

export function Vault({ context }: VaultProps) {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [vaultKeyPair, setVaultKeyPair] = useState<nacl.BoxKeyPair | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [storage, setStorage] = useState<any>(null);

  // Initialize storage and load keys/files
  useEffect(() => {
    const initVault = async () => {
      try {
        const readGranted = await context.requestPermission('storage:read');
        const writeGranted = await context.requestPermission('storage:write');

        if (!readGranted || !writeGranted) {
          console.error("Storage permissions denied for Vault");
          return;
        }

        const storageInstance = await context.getStorageInstance('vault-data');
        setStorage(storageInstance);

        // Load or generate vault keypair
        const storedKeys = await storageInstance.get('civisos_vault_keys');
        let keyPair: nacl.BoxKeyPair;
        if (storedKeys) {
          keyPair = {
            publicKey: CryptoVault.fromHex(storedKeys.publicKey),
            secretKey: CryptoVault.fromHex(storedKeys.secretKey)
          };
        } else {
          keyPair = CryptoVault.generateKeyPair();
          await storageInstance.put('civisos_vault_keys', {
            publicKey: CryptoVault.toHex(keyPair.publicKey),
            secretKey: CryptoVault.toHex(keyPair.secretKey)
          });
        }
        setVaultKeyPair(keyPair);

        // Load files
        const storedFiles = await storageInstance.get('civisos_vault_files') as any[];
        if (storedFiles) {
          const hydratedFiles = storedFiles.map((f: any) => ({
            ...f,
            encryptedPackage: {
              ciphertext: CryptoVault.fromHex(f.encryptedPackage.ciphertext),
              nonce: CryptoVault.fromHex(f.encryptedPackage.nonce),
              ephemeralPublicKey: CryptoVault.fromHex(f.encryptedPackage.ephemeralPublicKey)
            }
          }));
          setFiles(hydratedFiles);
        }
        setIsInitialized(true);
      } catch (err) {
        console.error("Failed to initialize vault", err);
      }
    };

    initVault();
  }, [context]);

  // Save files to storage when updated
  useEffect(() => {
    if (!isInitialized || !storage) return;

    const saveFiles = async () => {
      const serialized = files.map(f => ({
        ...f,
        encryptedPackage: {
          ciphertext: CryptoVault.toHex(f.encryptedPackage.ciphertext),
          nonce: CryptoVault.toHex(f.encryptedPackage.nonce),
          ephemeralPublicKey: CryptoVault.toHex(f.encryptedPackage.ephemeralPublicKey)
        }
      }));
      await storage.put('civisos_vault_files', serialized);
    };

    saveFiles();
  }, [files, isInitialized, storage]);

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

  if (!isInitialized) {
    return <div className="vault-module">Initializing secure vault...</div>;
  }

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
