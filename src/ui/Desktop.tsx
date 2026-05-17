import { useState, useEffect, useRef } from 'preact/hooks';
import { RNSIdentityManager } from '../mesh/Identity';
import type { IRNSIdentity } from '../mesh/Identity';
import { CivisStorage } from '../core/Storage';
import './desktop.css';
import { WindowManager } from './components/WindowManager';
import { useWindowManager, type SavedWindowState } from './hooks/useWindowManager';
import { moduleManager } from '../core/ModuleManager';
import type { IPermissionRequest } from '../core/PermissionService';
import { permissionService } from '../core/PermissionService';
import { CORE_MODULES } from "../modules/index.ts";
import type { ICivisModule } from "../core/ICivisModule.ts";
import { useTranslation } from '../core/TranslationService.ts';
import { Button } from './components/Button';
import { Modal } from './components/Modal';
import { meshService } from '../core/MeshService';
interface BatteryManager extends EventTarget {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
}

declare global {
  interface Navigator {
    getBattery(): Promise<BatteryManager>;
  }
}


export function Desktop() {
  const {
    windows,
    hydrateWindows,
    openWindow,
    closeWindow: baseCloseWindow,
    toggleMinimize: baseToggleMinimize,
    toggleMaximize,
    focusWindow,
    updateWindowPosition,
    updateWindowSize
  } = useWindowManager();

  const [meshStatus, setMeshStatus] = useState<'Offline' | 'Local Mesh' | 'Global'>('Offline');
  const [isPairing, setIsPairing] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [rnsIdentity, setRnsIdentity] = useState<IRNSIdentity | null>(null);
  const moduleContainers = useRef<Map<string, HTMLDivElement>>(new Map());
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [highContrast, setHighContrast] = useState<boolean | null>(null);
  const [permissionRequest, setPermissionRequest] = useState<IPermissionRequest | null>(null);
  const { t, currentLang, setLanguage, supportedLanguages } = useTranslation();

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
    CivisStorage.get<SavedWindowState[]>('desktop_windows').then(savedWindows => {
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

    RNSIdentityManager.loadOrGenerateIdentity().then(id => {
      setRnsIdentity(id);
    });

    // Battery & Offline capabilities
    interface BatteryManager {
      level: number;
      addEventListener(type: 'levelchange', listener: (this: BatteryManager, ev: Event) => any): void;
    }

    interface NavigatorWithBattery extends Navigator {
      getBattery(): Promise<BatteryManager>;
    }

    if ('getBattery' in navigator) {
      (navigator as NavigatorWithBattery).getBattery().then((battery) => {
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

  const ensureModuleRegistered = async (id: string) => {
    const isRegistered = moduleManager.getModules().some(m => m.id === id);
    if (!isRegistered) {
      const ModuleClass = CORE_MODULES[id];
      if (ModuleClass) {
        const instance = new ModuleClass();
        await moduleManager.registerModule(instance);
      }
    }
  };

  const handleModuleMount = async (id: string, el: HTMLDivElement | null) => {
    if (el) {
      if (moduleContainers.current.get(id) !== el) {
        moduleContainers.current.set(id, el);
        await ensureModuleRegistered(id);
        if (moduleContainers.current.get(id) === el) {
          moduleManager.mountModule(id, el);
        }
      }
    } else {
      moduleContainers.current.delete(id);
    }
  };

  const openModuleWindow = async (id: string, title: string) => {
    await ensureModuleRegistered(id);
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
        title={t('sys.perm_request')}
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
              {t('sys.deny')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                permissionService.completeCurrentRequest(true);
                setPermissionRequest(null);
              }}
            >
              {t('sys.allow')}
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
            onClick={() => openModuleWindow('org.civisos.helloworld', t('sys.hello_world'))}
          >
            <div className="icon-placeholder">👋</div>
            <span>{t('sys.hello_world')}</span>
          </Button>
          <Button
            variant="icon"
            className="desktop-icon" 
            id="icon-chat"
            onClick={() => openModuleWindow('org.civisos.chat', t('sys.chat'))}
          >
            <div className="icon-placeholder">💬</div>
            <span>{t('sys.chat')}</span>
          </Button>
          <Button
            variant="icon"
            className="desktop-icon" 
            id="icon-vault"
            onClick={() => openModuleWindow('org.civisos.vault', t('sys.vault'))}
          >
            <div className="icon-placeholder">🔒</div>
            <span>{t('sys.vault')}</span>
          </Button>
          <Button
            variant="icon"
            className="desktop-icon" 
            id="icon-bulletin"
            onClick={() => openModuleWindow('org.civisos.bulletin', t('sys.bulletin'))}
          >
            <div className="icon-placeholder">📋</div>
            <span>{t('sys.bulletin')}</span>
          </Button>
          <Button
            variant="icon"
            className="desktop-icon" 
            id="icon-sense"
            onClick={() => openModuleWindow('org.civisos.sense', t('sys.sense'))}
          >
            <div className="icon-placeholder">🌡️</div>
            <span>{t('sys.sense')}</span>
          </Button>
          <Button
            variant="icon"
            className="desktop-icon"
            id="icon-meshmarket"
            onClick={() => openModuleWindow('org.civisos.meshmarket', t('sys.mesh_market'))}
          >
            <div className="icon-placeholder">🏪</div>
            <span>{t('sys.mesh_market')}</span>
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
          onResize={updateWindowSize}
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
          <div className="tray-item lang-selector">
            <select
              value={currentLang}
              onChange={(e) => setLanguage((e.target as HTMLSelectElement).value)}
              className="lang-select"
            >
              {supportedLanguages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>
          <div
            className={`tray-item mesh-status ${meshStatus.toLowerCase().replace(' ', '-')} ${isPairing ? 'pairing' : ''}`}
            title={`${t('sys.mesh_status')}: ${meshStatus}${isPairing ? ' (Connecting...)' : ''}`}
            onClick={async () => {
              if (meshStatus === 'Offline') {
                setIsPairing(true);
                try {
                  const success = await meshService.connectHardware();
                  if (!success) {
                    // For demo/fallback if user cancels or API missing
                    setTimeout(() => {
                      setMeshStatus('Local Mesh');
                      setIsPairing(false);
                    }, 1000);
                  } else {
                    setIsPairing(false);
                  }
                } catch (e) {
                  console.error('Failed to connect hardware:', e);
                  setMeshStatus('Local Mesh');
                  setIsPairing(false);
                }
              } else if (meshStatus === 'Local Mesh') {
                setMeshStatus('Global');
              } else {
                await meshService.disconnectHardware();
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            {isPairing ? '📡 ⏳' : (
              <>
                {meshStatus === 'Offline' && '📡 ❌'}
                {meshStatus === 'Local Mesh' && '📡 🌐'}
                {meshStatus === 'Global' && '📡 🌍'}
              </>
            )}
            <span style={{ marginInlineStart: '0.25rem' }}>{isPairing ? 'Pairing...' : meshStatus}</span>
          </div>
          <div className="tray-item local-storage" title={t('sys.storage')}>
            💽
          </div>
          <div className="tray-item battery" title={t('sys.battery')}>
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
