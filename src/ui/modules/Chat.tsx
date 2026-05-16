import { useState, useEffect, useRef } from 'preact/hooks';
import nacl from 'tweetnacl';
import { CryptoVault } from '../../core/Crypto';
import type { EncryptedPackage } from '../../core/Crypto';
import type { ICivisModuleContext, ICivisStorageInstance, IMeshClient } from '../../core/ICivisModule';
import { Hex } from '../../core/Hex';
import './Chat.css';

interface ChatMessage {
  id: string;
  sender: string; // Hex public key or 'me'
  recipient: string; // Hex public key
  text?: string;
  attachment?: {
    name: string;
    type: string;
    data: string; // Hex encoded binary
  };
  timestamp: number;
  isIncoming: boolean;
}

interface ChatProps {
  context: ICivisModuleContext;
}

export function Chat({ context }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [keyPair, setKeyPair] = useState<nacl.BoxKeyPair | null>(null);
  const [recipientKey, setRecipientKey] = useState('');
  const [inputText, setInputText] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [storage, setStorage] = useState<ICivisStorageInstance | null>(null);
  const [meshClient, setMeshClient] = useState<IMeshClient | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      try {
        await context.requestPermission('mesh:read');
        await context.requestPermission('mesh:write');
        await context.requestPermission('storage:read');
        await context.requestPermission('storage:write');

        const storageInstance = await context.getStorageInstance('chat-data');
        setStorage(storageInstance);

        const client = context.getMeshClient();
        setMeshClient(client);

        // Load or generate chat keypair
        const storedKeys = await storageInstance.get<{publicKey: string, secretKey: string}>('civisos_chat_keys');
        let kp: nacl.BoxKeyPair;
        if (storedKeys) {
          kp = {
            publicKey: Hex.decode(storedKeys.publicKey),
            secretKey: Hex.decode(storedKeys.secretKey)
          };
        } else {
          kp = CryptoVault.generateKeyPair();
          await storageInstance.put('civisos_chat_keys', {
            publicKey: Hex.encode(kp.publicKey),
            secretKey: Hex.encode(kp.secretKey)
          });
        }
        setKeyPair(kp);

        // Load message history
        const history = await storageInstance.get<ChatMessage[]>('civisos_chat_history') || [];
        setMessages(history);

        setIsInitialized(true);
      } catch (err) {
        console.error("Failed to initialize chat", err);
      }
    };

    initChat();
  }, [context]);

  useEffect(() => {
    if (!isInitialized || !meshClient || !keyPair) return;

    const unlisten = meshClient.listen((packet: Uint8Array) => {
      try {
        const decoder = new TextDecoder();
        const rawStr = decoder.decode(packet);
        const envelope = JSON.parse(rawStr);

        if (envelope.module === 'chat' && envelope.data) {
          const encryptedPackage: EncryptedPackage = {
            ciphertext: Hex.decode(envelope.data.ciphertext),
            nonce: Hex.decode(envelope.data.nonce),
            ephemeralPublicKey: Hex.decode(envelope.data.ephemeralPublicKey)
          };

          const decrypted = CryptoVault.decrypt(encryptedPackage, keyPair.secretKey);
          if (decrypted) {
            const payload = JSON.parse(new TextDecoder().decode(decrypted));
            const newMessage: ChatMessage = {
              id: crypto.randomUUID(),
              sender: envelope.sender || 'unknown',
              recipient: Hex.encode(keyPair.publicKey),
              text: payload.text,
              attachment: payload.attachment,
              timestamp: Date.now(),
              isIncoming: true
            };
            setMessages(prev => [...prev, newMessage]);
          }
        }
      } catch (e) {
        // Not a chat packet or failed to decrypt
      }
    });

    return () => unlisten();
  }, [isInitialized, meshClient, keyPair]);

  useEffect(() => {
    if (isInitialized && storage) {
      storage.put('civisos_chat_history', messages);
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isInitialized, storage]);

  const sendMessage = async (text?: string, attachment?: ChatMessage['attachment']) => {
    if (!keyPair || !meshClient || (!text && !attachment) || !recipientKey) return;

    try {
      const recipientPubKey = Hex.decode(recipientKey);
      const payload = JSON.stringify({ text, attachment });
      const encrypted = CryptoVault.encrypt(new TextEncoder().encode(payload), recipientPubKey);

      const envelope = {
        module: 'chat',
        sender: Hex.encode(keyPair.publicKey),
        data: {
          ciphertext: Hex.encode(encrypted.ciphertext),
          nonce: Hex.encode(encrypted.nonce),
          ephemeralPublicKey: Hex.encode(encrypted.ephemeralPublicKey)
        }
      };

      await meshClient.send(JSON.stringify(envelope), recipientKey);

      const myMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'me',
        recipient: recipientKey,
        text,
        attachment,
        timestamp: Date.now(),
        isIncoming: false
      };

      setMessages(prev => [...prev, myMessage]);
      setInputText('');
    } catch (e) {
      alert("Invalid Recipient Key or Mesh Error");
    }
  };

  const handleFileUpload = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      const hexData = Hex.encode(new Uint8Array(arrayBuffer));
      sendMessage(undefined, {
        name: file.name,
        type: file.type,
        data: hexData
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadAttachment = (attachment: ChatMessage['attachment']) => {
    if (!attachment) return;
    const data = Hex.decode(attachment.data);
    const blob = new Blob([data as any], { type: attachment.type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isInitialized) return <div className="chat-module">Initializing Secure Chat...</div>;

  return (
    <div className="chat-module">
      <header className="chat-header">
        <div className="my-info">
          <span>My Public Key:</span>
          <code title="Share this with others to receive messages">{Hex.encode(keyPair!.publicKey).substring(0, 16)}...</code>
        </div>
        <div className="recipient-config">
          <input
            type="text"
            placeholder="Recipient Public Key (Hex)"
            value={recipientKey}
            onInput={(e) => setRecipientKey((e.target as HTMLInputElement).value)}
          />
        </div>
      </header>

      <div className="message-list">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>No messages yet. Enter a recipient key to start an encrypted conversation.</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`message-item ${msg.isIncoming ? 'incoming' : 'outgoing'}`}>
            <div className="message-meta">
              <span className="sender">{msg.isIncoming ? msg.sender.substring(0, 8) : 'Me'}</span>
              <span className="time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="message-bubble">
              {msg.text && <p>{msg.text}</p>}
              {msg.attachment && (
                <div className="attachment-preview" onClick={() => downloadAttachment(msg.attachment)}>
                  <span>📎 {msg.attachment.name}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <footer className="chat-input">
        <button className="attach-btn" onClick={() => fileInputRef.current?.click()}>📎</button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <input
          type="text"
          placeholder="Type a message..."
          value={inputText}
          onInput={(e) => setInputText((e.target as HTMLInputElement).value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage(inputText)}
        />
        <button className="send-btn" onClick={() => sendMessage(inputText)} disabled={!recipientKey || (!inputText && !fileInputRef.current?.files?.length)}>Send</button>
      </footer>
    </div>
  );
}
