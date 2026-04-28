import type { ComponentChildren } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { RNSIdentityManager } from '../mesh/Identity';
import type { IRNSIdentity } from '../mesh/Identity';
import { CivisStorage } from '../core/Storage';
import './desktop.css';
import { WindowManager } from './components/WindowManager';
import { useWindowManager, type WindowState } from './hooks/useWindowManager.ts';
import { Window } from './components/Window';
import { moduleManager } from '../core/ModuleManager';
import { HelloWorldModule } from '../modules/HelloWorldModule';
import { Vault } from './modules/Vault';

interface WindowState {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  content?: ComponentChildren;
  isModule?: boolean;
  content: ComponentChildren;
  x?: number;
  y?: number;
}

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
  const moduleContainers = useRef<Map<string, HTMLDivElement>>(new Map());
  const [isOfflineReady, setIsOfflineReady] = useState(false);

  // Load window state from storage
  useEffect(() => {
    CivisStorage.get<WindowState[]>('desktop_windows').then(savedWindows => {
      if (savedWindows) {
        // We can't easily serialize Preact components, so we just restore the state
        // and re-map the content based on ID if needed.
        // For now, we'll just restore the metadata and let the user re-open if content is missing.
        setWindows(savedWindows.map(w => ({ ...w, content: <div>Content lost on reload</div> })));
      }
    });
  }, []);

  // Save window state to storage when it changes
  useEffect(() => {
    const windowsToSave = windows.map(({ id, title, isOpen, isMinimized, x, y }) => ({
      id, title, isOpen, isMinimized, x, y
    }));
    CivisStorage.set('desktop_windows', windowsToSave);
  }, [windows]);

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
        .then(registration => {
          console.log('Service Worker Registered');

          // Check if it's already active and controlling the page
          if (registration.active) {
            setIsOfflineReady(true);
          }

          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'activated') {
                  setIsOfflineReady(true);
                }
              });
            }
          });
        })
        .catch(err => console.error('Service Worker Failed:', err));

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setIsOfflineReady(true);
      });
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
        return prev.map(w => w.id === id ? { ...w, isMinimized: false, isOpen: true, content } : w);
      }
      return [...prev, { id, title, isOpen: true, isMinimized: false, content, x: 50, y: 50 }];
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
          <div className={`tray-item offline-readiness ${isOfflineReady ? 'ready' : 'syncing'}`} title={isOfflineReady ? 'Safe to disconnect: OS is fully cached offline' : 'Syncing: OS is caching for offline use'}>
            {isOfflineReady ? '💾 ✅' : '💾 ⏳'}
          </div>
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
