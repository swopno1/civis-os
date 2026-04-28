import type { ComponentChildren } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { RNSIdentityManager } from '../mesh/Identity';
import type { IRNSIdentity } from '../mesh/Identity';
import './desktop.css';
import { Window } from './components/Window';
import { moduleManager } from '../core/ModuleManager';
import { HelloWorldModule } from '../modules/HelloWorldModule';

interface WindowState {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  content?: ComponentChildren;
  isModule?: boolean;
}

export function Desktop() {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [meshStatus] = useState<'Offline' | 'Local Mesh' | 'Global'>('Offline');
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [rnsIdentity, setRnsIdentity] = useState<IRNSIdentity | null>(null);
  const moduleContainers = useRef<Map<string, HTMLDivElement>>(new Map());

  // Initialize basic system stats and RNS Identity
  useEffect(() => {
    // Generate or load the local sovereign Reticulum identity
    RNSIdentityManager.loadOrGenerateIdentity().then(identity => {
      setRnsIdentity(identity);
    });

    // Initialize ModuleManager and register HelloWorldModule
    const initModules = async () => {
      try {
        await moduleManager.registerModule(new HelloWorldModule());
      } catch (e) {
        console.warn('Module registration error (likely already registered):', e);
      }
    };
    initModules();

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

  const openModule = (id: string, title: string, content: ComponentChildren, isModule: boolean = false) => {
    setWindows(prev => {
      const existing = prev.find(w => w.id === id);
      if (existing) {
        if (existing.isMinimized) {
          if (isModule) moduleManager.resumeModule(id);
        }
        return prev.map(w => w.id === id ? { ...w, isMinimized: false, isOpen: true } : w);
      }
      return [...prev, { id, title, isOpen: true, isMinimized: false, content, isModule }];
    });
  };

  const closeWindow = (id: string) => {
    const win = windows.find(w => w.id === id);
    if (win?.isModule) {
      moduleManager.unmountModule(id);
      moduleContainers.current.delete(id);
    }
    setWindows(prev => prev.filter(w => w.id !== id));
  };

  const toggleMinimize = (id: string) => {
    setWindows(prev => prev.map(w => {
      if (w.id === id) {
        const nextMinimized = !w.isMinimized;
        if (w.isModule) {
          if (nextMinimized) {
            moduleManager.suspendModule(id);
          } else {
            moduleManager.resumeModule(id);
          }
        }
        return { ...w, isMinimized: nextMinimized };
      }
      return w;
    }));
  };

  const handleModuleMount = (id: string, el: HTMLDivElement | null) => {
    if (el) {
      // Re-mount if the element is different or not yet registered
      if (moduleContainers.current.get(id) !== el) {
        moduleContainers.current.set(id, el);
        moduleManager.mountModule(id, el);
      }
    } else {
      // Element is unmounting
      moduleContainers.current.delete(id);
    }
  };

  return (
    <div className="desktop-environment">
      {/* Workspace Area */}
      <main className="workspace">
        {/* Desktop Icons */}
        <div className="desktop-icons">
          <button
            className="desktop-icon"
            onClick={() => openModule('org.civisos.helloworld', 'Hello World', null, true)}
          >
            <div className="icon-placeholder">👋</div>
            <span>Hello World</span>
          </button>
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
          <Window
            key={win.id}
            id={win.id}
            title={win.title}
            isActive={true}
            onMinimize={toggleMinimize}
            onClose={closeWindow}
            onFocus={() => {}}
          >
            {win.isModule ? (
              <div ref={(el) => handleModuleMount(win.id, el)} className="module-container" />
            ) : (
              win.content
            )}
          </Window>
        ))}
      </main>

      {/* Taskbar */}
      <footer className="taskbar">
        <div className="start-menu">
          <button className="start-btn" title={rnsIdentity ? `RNS Address: ${rnsIdentity.addressHash}` : 'Loading Identity...'}>
            ⊞ {rnsIdentity ? `CivisOS [${rnsIdentity.addressHash.substring(0, 6)}]` : 'CivisOS'}
          </button>
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
