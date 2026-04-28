import { useEffect, useState } from 'preact/hooks';
import { RNSIdentityManager } from '../mesh/Identity';
import type { IRNSIdentity } from '../mesh/Identity';
import './desktop.css';
import { WindowManager } from './components/WindowManager';
import { useWindowManager, type WindowState } from './hooks/useWindowManager.ts';

export function Desktop() {
  const {
    windows,
    openWindow,
    closeWindow,
    toggleMinimize,
    toggleMaximize,
    focusWindow,
    updateWindowPosition
  } = useWindowManager();

  const [meshStatus] = useState<'Offline' | 'Local Mesh' | 'Global'>('Offline');
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [rnsIdentity, setRnsIdentity] = useState<IRNSIdentity | null>(null);

  // Initialize basic system stats and RNS Identity
  useEffect(() => {
    // Generate or load the local sovereign Reticulum identity
    RNSIdentityManager.loadOrGenerateIdentity().then(identity => {
      setRnsIdentity(identity);
    });
    // Mock battery API integration
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      });
    }

    // Attempt to register Service Worker for offline capabilities
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(() => console.log('Service Worker Registered'))
        .catch(err => console.error('Service Worker Failed:', err));
    }
  }, []);

  return (
    <div className="desktop-environment">
      {/* Workspace Area */}
      <main className="workspace">
        {/* Desktop Icons */}
        <div className="desktop-icons">
          <button 
            className="desktop-icon" 
            onClick={() => openWindow('meshchat', 'MeshChat', <div>Secure P2P Messenger Loading...</div>)}
          >
            <div className="icon-placeholder">💬</div>
            <span>MeshChat</span>
          </button>
          <button 
            className="desktop-icon" 
            onClick={() => openWindow('vault', 'CivisVault', <div>Encrypted Storage Loading...</div>)}
          >
            <div className="icon-placeholder">🔒</div>
            <span>CivisVault</span>
          </button>
          <button 
            className="desktop-icon" 
            onClick={() => openWindow('board', 'LocalBoard', <div>Decentralized Bulletin Board Loading...</div>)}
          >
            <div className="icon-placeholder">📋</div>
            <span>LocalBoard</span>
          </button>
          <button 
            className="desktop-icon" 
            onClick={() => openWindow('sense', 'Sense', <div>Environmental Data Loading...</div>)}
          >
            <div className="icon-placeholder">🌡️</div>
            <span>Sense</span>
          </button>
          <button 
            className="desktop-icon urgent-icon" 
            onClick={() => openWindow('sos', 'SOS Beacon', <div>Emergency Broadcast System...</div>)}
          >
            <div className="icon-placeholder">🚨</div>
            <span>SOS Beacon</span>
          </button>
        </div>

        {/* Window Manager Component */}
        <WindowManager
          windows={windows}
          onClose={closeWindow}
          onMinimize={toggleMinimize}
          onMaximize={toggleMaximize}
          onFocus={focusWindow}
          onMove={updateWindowPosition}
        />
      </main>

      {/* Taskbar */}
      <footer className="taskbar">
        <div className="start-menu">
          <button className="start-btn" title={rnsIdentity ? `RNS Address: ${rnsIdentity.addressHash}` : 'Loading Identity...'}>
            ⊞ {rnsIdentity ? `CivisOS [${rnsIdentity.addressHash.substring(0, 6)}]` : 'CivisOS'}
          </button>
        </div>
        
        <div className="open-apps">
          {windows.filter((w: WindowState) => w.isOpen).map((win: WindowState) => (
            <button 
              key={win.id} 
              className={`taskbar-app ${!win.isMinimized ? 'active' : ''}`}
              onClick={() => {
                if (win.isMinimized) {
                  toggleMinimize(win.id);
                  focusWindow(win.id);
                } else {
                  toggleMinimize(win.id);
                }
              }}
            >
              {win.title}
            </button>
          ))}
        </div>

        {/* System Tray */}
        <div className="system-tray">
          <div className="tray-item mesh-status" title="Network Status">
            {meshStatus === 'Offline' ? '📡 ❌' : '📡 ✅'}
          </div>
          <div className="tray-item local-storage" title="Encrypted Storage Mounted">
            💽
          </div>
          <div className="tray-item battery">
            🔋 {batteryLevel !== null ? `${batteryLevel}%` : '--'}
          </div>
          <div className="tray-item clock">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </footer>
    </div>
  );
}
