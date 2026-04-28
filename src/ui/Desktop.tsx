import { h, ComponentChildren } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import './desktop.css';

interface WindowState {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  content: ComponentChildren;
}

export function Desktop() {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [meshStatus, setMeshStatus] = useState<'Offline' | 'Local Mesh' | 'Global'>('Offline');
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  // Initialize basic system stats
  useEffect(() => {
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

  const openModule = (id: string, title: string, content: ComponentChildren) => {
    setWindows(prev => {
      const existing = prev.find(w => w.id === id);
      if (existing) {
        return prev.map(w => w.id === id ? { ...w, isMinimized: false, isOpen: true } : w);
      }
      return [...prev, { id, title, isOpen: true, isMinimized: false, content }];
    });
  };

  const closeWindow = (id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  };

  const toggleMinimize = (id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: !w.isMinimized } : w));
  };

  return (
    <div className="desktop-environment">
      {/* Workspace Area */}
      <main className="workspace">
        {/* Desktop Icons */}
        <div className="desktop-icons">
          <button 
            className="desktop-icon" 
            onClick={() => openModule('meshchat', 'MeshChat', <div>Secure P2P Messenger Loading...</div>)}
          >
            <div className="icon-placeholder">💬</div>
            <span>MeshChat</span>
          </button>
          <button 
            className="desktop-icon" 
            onClick={() => openModule('vault', 'CivisVault', <div>Encrypted Storage Loading...</div>)}
          >
            <div className="icon-placeholder">🔒</div>
            <span>CivisVault</span>
          </button>
          <button 
            className="desktop-icon" 
            onClick={() => openModule('board', 'LocalBoard', <div>Decentralized Bulletin Board Loading...</div>)}
          >
            <div className="icon-placeholder">📋</div>
            <span>LocalBoard</span>
          </button>
          <button 
            className="desktop-icon" 
            onClick={() => openModule('sense', 'Sense', <div>Environmental Data Loading...</div>)}
          >
            <div className="icon-placeholder">🌡️</div>
            <span>Sense</span>
          </button>
          <button 
            className="desktop-icon urgent-icon" 
            onClick={() => openModule('sos', 'SOS Beacon', <div>Emergency Broadcast System...</div>)}
          >
            <div className="icon-placeholder">🚨</div>
            <span>SOS Beacon</span>
          </button>
        </div>

        {/* Window Manager */}
        {windows.map(win => win.isOpen && !win.isMinimized && (
          <div key={win.id} className="os-window">
            <div className="window-header">
              <span className="window-title">{win.title}</span>
              <div className="window-controls">
                <button onClick={() => toggleMinimize(win.id)}>_</button>
                <button onClick={() => closeWindow(win.id)}>X</button>
              </div>
            </div>
            <div className="window-body">
              {win.content}
            </div>
          </div>
        ))}
      </main>

      {/* Taskbar */}
      <footer className="taskbar">
        <div className="start-menu">
          <button className="start-btn">⊞ CivisOS</button>
        </div>
        
        <div className="open-apps">
          {windows.filter(w => w.isOpen).map(win => (
            <button 
              key={win.id} 
              className={`taskbar-app ${!win.isMinimized ? 'active' : ''}`}
              onClick={() => toggleMinimize(win.id)}
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
