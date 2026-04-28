import { useState, useEffect, useRef } from 'preact/hooks';
import { RNSIdentityManager } from '../mesh/Identity';
import type { IRNSIdentity } from '../mesh/Identity';
import { CivisStorage } from '../core/Storage';
import './desktop.css';
import { WindowManager } from './components/WindowManager';
import { useWindowManager } from './hooks/useWindowManager.ts';
import { moduleManager } from '../core/ModuleManager';
import { HelloWorldModule } from '../modules/HelloWorldModule';

export function Desktop() {
  const {
    windows,
    hydrateWindows,
    openWindow,
    closeWindow: baseCloseWindow,
    toggleMinimize: baseToggleMinimize,
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
    CivisStorage.get<any[]>('desktop_windows').then(savedWindows => {
      if (savedWindows) {
        // We restore metadata. Content will be empty or generic until re-opened.
        // For actual modules, they might need re-initialization.
        hydrateWindows(savedWindows.map(w => ({
          ...w,
          content: w.isModule ? (
            <div ref={(el) => handleModuleMount(w.id, el)} className="module-container" />
          ) : (
            <div>Content lost on reload</div>
          ),
          isMaximized: w.isMaximized || false,
          zIndex: w.zIndex || 10,
          position: w.position || { x: 100, y: 100 },
          size: w.size || { width: 600, height: 400 }
        })));
      }
    });
  }, []);

  // Save window state to storage when it changes
  useEffect(() => {
    const windowsToSave = windows.map(({ id, title, isOpen, isMinimized, isMaximized, position, size, zIndex, isModule }) => ({
      id, title, isOpen, isMinimized, isMaximized, position, size, zIndex, isModule
    }));
    CivisStorage.set('desktop_windows', windowsToSave);
  }, [windows]);

  // Initialize basic system stats and RNS Identity
  useEffect(() => {
    RNSIdentityManager.loadOrGenerateIdentity().then(identity => {
      setRnsIdentity(identity);
    });

    const initModules = async () => {
      try {
        await moduleManager.registerModule(new HelloWorldModule());
      } catch (e) {
        console.warn('Module registration error:', e);
      }
    };
    initModules();

    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      });
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
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

  const handleModuleMount = (id: string, el: HTMLDivElement | null) => {
    if (el) {
      if (moduleContainers.current.get(id) !== el) {
        moduleContainers.current.set(id, el);
        moduleManager.mountModule(id, el);
      }
    } else {
      moduleContainers.current.delete(id);
    }
  };

  const openModuleWindow = (id: string, title: string) => {
    openWindow(
      id,
      title,
      <div ref={(el) => handleModuleMount(id, el)} className="module-container" />,
      true
    );
  };

  const closeWindow = (id: string) => {
    const win = windows.find(w => w.id === id);
    if (win?.isModule) {
      moduleManager.unmountModule(id);
      moduleContainers.current.delete(id);
    }
    baseCloseWindow(id);
  };

  const toggleMinimize = (id: string) => {
    const win = windows.find(w => w.id === id);
    if (win?.isModule) {
      if (!win.isMinimized) {
        moduleManager.suspendModule(id);
      } else {
        moduleManager.resumeModule(id);
      }
    }
    baseToggleMinimize(id);
  };

  return (
    <div className="desktop-environment">
      <main className="workspace">
        <div className="desktop-icons">
          <button
            className="desktop-icon"
            onClick={() => openModuleWindow('org.civisos.helloworld', 'Hello World')}
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

        <WindowManager
          windows={windows}
          onClose={closeWindow}
          onMinimize={toggleMinimize}
          onMaximize={toggleMaximize}
          onFocus={focusWindow}
          onMove={updateWindowPosition}
        />
      </main>

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
              onClick={() => {
                if (win.isMinimized) {
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
