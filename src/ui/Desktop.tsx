import { useState, useEffect, useRef } from 'preact/hooks';
import { RNSIdentityManager } from '../mesh/Identity';
import type { IRNSIdentity } from '../mesh/Identity';
import { CivisStorage } from '../core/Storage';
import './desktop.css';
import { WindowManager } from './components/WindowManager';
import { useWindowManager } from './hooks/useWindowManager';
import { moduleManager } from '../core/ModuleManager';
import type { IPermissionRequest } from '../core/PermissionService';
import { permissionService } from '../core/PermissionService';
import { HelloWorldModule } from '../modules/HelloWorldModule';
import { VaultModule } from '../modules/VaultModule';
import { ChatModule } from '../modules/ChatModule';
import { BulletinModule } from '../modules/BulletinModule';
import { SenseModule } from '../modules/SenseModule';
import { Button } from './components/Button';
import { Modal } from './components/Modal';
import { meshService } from '../core/MeshService';

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

  const [meshStatus, setMeshStatus] = useState<'Offline' | 'Local Mesh' | 'Global'>('Offline');
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [rnsIdentity, setRnsIdentity] = useState<IRNSIdentity | null>(null);
  const moduleContainers = useRef<Map<string, HTMLDivElement>>(new Map());
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [highContrast, setHighContrast] = useState<boolean | null>(null);
  const [permissionRequest, setPermissionRequest] = useState<IPermissionRequest | null>(null);

  // Load high contrast preference
  useEffect(() => {
    CivisStorage.get<boolean>('high_contrast').then(pref => {
      setHighContrast(pref ?? true);
    });
  }, []);

  // Save high contrast preference
  useEffect(() => {
    if (highContrast !== null) {
      CivisStorage.set('high_contrast', highContrast);
    }
  }, [highContrast]);

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
    permissionService.setOnPrompt((req) => {
      setPermissionRequest(req);
    });

    moduleManager.setPermissionHandler(async (moduleId, permission) => {
      return await permissionService.requestPermission(moduleId, permission);
    });

    meshService.setStatusChangeHandler((status) => {
      setMeshStatus(status);
    });

    RNSIdentityManager.loadOrGenerateIdentity().then(identity => {
      setRnsIdentity(identity);
    });

    const initModules = async () => {
      try {
        await moduleManager.registerModule(new HelloWorldModule());
        await moduleManager.registerModule(new VaultModule());
        await moduleManager.registerModule(new ChatModule());
        await moduleManager.registerModule(new BulletinModule());
        await moduleManager.registerModule(new SenseModule());
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

  const closeWindow = async (id: string) => {
    const win = windows.find(w => w.id === id);
    if (win?.isModule) {
      await moduleManager.unmountModule(id);
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
    <div className={`desktop-environment ${highContrast === true ? 'high-contrast' : ''}`}>
      <Modal
        isOpen={!!permissionRequest}
        title="Permission Request"
        onClose={() => {
          permissionService.completeCurrentRequest(false);
          setPermissionRequest(null);
        }}
        footer={
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', width: '100%' }}>
            <Button
              variant="secondary"
              onClick={() => {
                permissionService.completeCurrentRequest(false);
                setPermissionRequest(null);
              }}
            >
              Deny
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                permissionService.completeCurrentRequest(true);
                setPermissionRequest(null);
              }}
            >
              Allow
            </Button>
          </div>
        }
      >
        <p>
          Module <strong>{permissionRequest?.moduleId}</strong> is requesting permission for:
          <br />
          <code>{permissionRequest?.permission}</code>
        </p>
      </Modal>

      <main className="workspace">
        <div className="desktop-icons">
          <Button
            variant="icon"
            className="desktop-icon"
            id="icon-helloworld"
            onClick={() => openModuleWindow('org.civisos.helloworld', 'Hello World')}
          >
            <div className="icon-placeholder">👋</div>
            <span>Hello World</span>
          </Button>
          <Button
            variant="icon"
            className="desktop-icon" 
            id="icon-chat"
            onClick={() => openModuleWindow('org.civisos.chat', 'CivisChat')}
          >
            <div className="icon-placeholder">💬</div>
            <span>CivisChat</span>
          </Button>
          <Button
            variant="icon"
            className="desktop-icon" 
            id="icon-vault"
            onClick={() => openModuleWindow('org.civisos.vault', 'CivisVault')}
          >
            <div className="icon-placeholder">🔒</div>
            <span>CivisVault</span>
          </Button>
          <Button
            variant="icon"
            className="desktop-icon" 
            id="icon-bulletin"
            onClick={() => openModuleWindow('org.civisos.bulletin', 'CivisBulletin')}
          >
            <div className="icon-placeholder">📋</div>
            <span>CivisBulletin</span>
          </Button>
          <Button
            variant="icon"
            className="desktop-icon" 
            id="icon-sense"
            onClick={() => openModuleWindow('org.civisos.sense', 'CivisSense')}
          >
            <div className="icon-placeholder">🌡️</div>
            <span>CivisSense</span>
          </Button>
          <Button
            variant="icon"
            className="desktop-icon urgent-icon" 
            onClick={() => openWindow('sos', 'SOS Beacon', <div>Emergency Broadcast System...</div>)}
          >
            <div className="icon-placeholder">🚨</div>
            <span>SOS Beacon</span>
          </Button>
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
          <Button
            variant="primary"
            className="start-btn"
            title={rnsIdentity ? `RNS Address: ${rnsIdentity.addressHash}` : 'Loading Identity...'}
          >
            ⊞ {rnsIdentity ? `CivisOS [${rnsIdentity.addressHash.substring(0, 6)}]` : 'CivisOS'}
          </Button>
        </div>
        
        <div className="open-apps">
          {windows.filter(w => w.isOpen).map(win => (
            <Button
              key={win.id} 
              variant="secondary"
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
            </Button>
          ))}
        </div>

        <div className="system-tray">
          <Button
            variant="icon"
            className="tray-item toggle-hc"
            onClick={() => setHighContrast(!highContrast)}
            title="Toggle High Contrast Mode"
            style={{ fontSize: '1rem' }}
          >
            {highContrast ? '👁️‍🗨️' : '👁️'}
          </Button>
          <div className={`tray-item offline-readiness ${isOfflineReady ? 'ready' : 'syncing'}`} title={isOfflineReady ? 'Safe to disconnect: OS is fully cached offline' : 'Syncing: OS is caching for offline use'}>
            {isOfflineReady ? '💾 ✅' : '💾 ⏳'}
          </div>
          <div
            className={`tray-item mesh-status ${meshStatus.toLowerCase().replace(' ', '-')}`}
            title={`Mesh Status: ${meshStatus}`}
            onClick={async () => {
              if (meshStatus === 'Offline') {
                try {
                  await meshService.connectHardware();
                } catch (e) {
                  console.error('Failed to connect hardware:', e);
                  // For demo, if Serial API is not available/fails, just cycle
                  setMeshStatus('Local Mesh');
                }
              } else if (meshStatus === 'Local Mesh') {
                setMeshStatus('Global');
              } else {
                await meshService.disconnectHardware();
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            {meshStatus === 'Offline' && '📡 ❌'}
            {meshStatus === 'Local Mesh' && '📡 🌐'}
            {meshStatus === 'Global' && '📡 🌍'}
            <span style={{ marginInlineStart: '0.25rem' }}>{meshStatus}</span>
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
