import type { ICivisModule, ICivisModuleContext, CivisPermission } from './ICivisModule';
import { CivisStorage } from './Storage';
import { meshService } from './MeshService';
import { translationService } from './TranslationService.ts';

export type PermissionHandler = (moduleId: string, permission: CivisPermission) => Promise<boolean>;

export class ModuleManager {
  private modules: Map<string, ICivisModule> = new Map();
  private contexts: Map<string, ICivisModuleContext> = new Map();
  private grantedPermissions: Map<string, Set<CivisPermission>> = new Map();
  private permissionHandler: PermissionHandler | null = null;
  private claimedSerialPorts: Map<SerialPort, string> = new Map();
  private moduleStorageUsage: Map<string, number> = new Map();
  private readonly DEFAULT_QUOTA = 10 * 1024 * 1024; // 10MB per module

  constructor() {
    console.log('ModuleManager initialized');
  }

  public setPermissionHandler(handler: PermissionHandler): void {
    this.permissionHandler = handler;
  }

  public async registerModule(module: ICivisModule): Promise<void> {
    if (this.modules.has(module.id)) {
      console.warn(`Module with id ${module.id} is already registered. Skipping.`);
      return;
    }

    this.modules.set(module.id, module);
    this.grantedPermissions.set(module.id, new Set());

    // Register module translations if any
    if (module.translations) {
      Object.entries(module.translations).forEach(([lang, res]) => {
        translationService.addTranslation(lang, res);
      });
    }

    const context = this.createModuleContext(module.id);
    this.contexts.set(module.id, context);

    await module.init(context);
    console.log(`Module ${module.id} registered and initialized.`);
  }

  private createModuleContext(moduleId: string): ICivisModuleContext {
    return {
      requestPermission: async (permission: CivisPermission): Promise<boolean> => {
        if (this.grantedPermissions.get(moduleId)?.has(permission)) {
          return true;
        }

        const module = this.modules.get(moduleId);
        if (!module || !module.permissions.includes(permission)) {
          console.warn(`Permission ${permission} denied: Not requested by module ${moduleId}`);
          return false;
        }

        if (this.permissionHandler) {
          const granted = await this.permissionHandler(moduleId, permission);
          if (granted) {
            this.grantedPermissions.get(moduleId)?.add(permission);
          }
          return granted;
        }

        // Fallback if no handler is set (should not happen in production)
        console.warn(`No permission handler set. Denying ${permission} for ${moduleId}`);
        return false;
      },
      getStorageInstance: async (namespace: string): Promise<any> => {
        const perms = this.grantedPermissions.get(moduleId);
        const hasRead = perms?.has('storage:read');
        const hasWrite = perms?.has('storage:write');

        if (!hasRead && !hasWrite) {
          throw new Error(`Module ${moduleId} does not have storage permissions.`);
        }

        const getFullKey = (key: string) => `civis_os/modules/${moduleId}/storage/${namespace}/${key}`;

        return {
          dbName: namespace,
          get: async (key: string) => {
            if (!hasRead) throw new Error(`Permission storage:read denied for module ${moduleId}`);
            return await CivisStorage.get(getFullKey(key));
          },
          put: async (key: string, val: any) => {
            if (!hasWrite) throw new Error(`Permission storage:write denied for module ${moduleId}`);

            const fullKey = getFullKey(key);
            const oldVal = await CivisStorage.get(fullKey);
            const oldSize = oldVal ? JSON.stringify(oldVal).length * 2 : 0;

            const serialized = JSON.stringify(val);
            const size = serialized.length * 2; // Rough estimate in bytes (UTF-16)

            const usageKey = `quota:${moduleId}:usage`;
            let currentUsage = this.moduleStorageUsage.get(moduleId);
            if (currentUsage === undefined) {
              currentUsage = await CivisStorage.get<number>(usageKey) || 0;
            }

            const newUsage = currentUsage - oldSize + size;
            if (newUsage > this.DEFAULT_QUOTA) {
              throw new Error(`Storage quota exceeded for module ${moduleId}`);
            }

            await CivisStorage.set(fullKey, val);
            await CivisStorage.set(usageKey, newUsage);
            this.moduleStorageUsage.set(moduleId, newUsage);
          },
          delete: async (key: string) => {
            if (!hasWrite) throw new Error(`Permission storage:write denied for module ${moduleId}`);
            const fullKey = getFullKey(key);
            const oldVal = await CivisStorage.get(fullKey);
            if (oldVal) {
              const oldSize = JSON.stringify(oldVal).length * 2;
              const usageKey = `quota:${moduleId}:usage`;
              let currentUsage = this.moduleStorageUsage.get(moduleId);
              if (currentUsage === undefined) {
                currentUsage = await CivisStorage.get<number>(usageKey) || 0;
              }
              const newUsage = Math.max(0, currentUsage - oldSize);
              await CivisStorage.delete(fullKey);
              await CivisStorage.set(usageKey, newUsage);
              this.moduleStorageUsage.set(moduleId, newUsage);
            } else {
              await CivisStorage.delete(fullKey);
            }
          }
        };
      },
      getMeshClient: () => {
        const perms = this.grantedPermissions.get(moduleId);
        const hasRead = perms?.has('mesh:read');
        const hasWrite = perms?.has('mesh:write');

        if (!hasRead && !hasWrite) {
          throw new Error(`Module ${moduleId} does not have mesh permissions.`);
        }
        return {
          send: async (data: any, destination?: string) => {
            if (!hasWrite) throw new Error(`Permission mesh:write denied for module ${moduleId}`);
            const payload = typeof data === 'string' ? new TextEncoder().encode(data) : data;
            if (destination) {
              await meshService.sendPacket(destination, payload);
            } else {
              await meshService.broadcast(payload);
            }
            console.log(`[${moduleId}] Mesh packet sent`);
          },
          listen: (callback: (data: any) => void) => {
            if (!hasRead) throw new Error(`Permission mesh:read denied for module ${moduleId}`);
            meshService.registerHandler(callback);
            console.log(`[${moduleId}] Mesh listener registered`);
            return () => meshService.unregisterHandler(callback);
          }
        };
      },
      requestSerialPort: async (options?: SerialPortRequestOptions): Promise<SerialPort> => {
        const perms = this.grantedPermissions.get(moduleId);
        if (!perms?.has('hardware:serial')) {
          throw new Error(`Permission hardware:serial denied for module ${moduleId}`);
        }

        if (!navigator.serial) {
          throw new Error('Web Serial API is not supported in this browser.');
        }

        const port = await navigator.serial.requestPort(options);

        // Device Locking check
        const owner = this.claimedSerialPorts.get(port);
        if (owner && owner !== moduleId) {
          throw new Error(`Serial port is already claimed by module ${owner}`);
        }

        this.claimedSerialPorts.set(port, moduleId);
        return port;
      },
      getSerialPorts: async (): Promise<SerialPort[]> => {
        const perms = this.grantedPermissions.get(moduleId);
        if (!perms?.has('hardware:serial')) {
          throw new Error(`Permission hardware:serial denied for module ${moduleId}`);
        }

        if (!navigator.serial) {
          return [];
        }

        return await navigator.serial.getPorts();
      }
    };
  }

  public mountModule(moduleId: string, container: HTMLElement): void {
    const module = this.modules.get(moduleId);
    if (!module) throw new Error(`Module ${moduleId} not found.`);
    module.mount(container);
    console.log(`Module ${moduleId} mounted.`);
  }

  public async unmountModule(moduleId: string): Promise<void> {
    const module = this.modules.get(moduleId);
    if (!module) throw new Error(`Module ${moduleId} not found.`);

    // Call onSaveState if available before unmounting
    if (module.onSaveState) {
      await module.onSaveState();
    }

    module.unmount();
    console.log(`Module ${moduleId} unmounted.`);
  }

  public async suspendModule(moduleId: string): Promise<void> {
    const module = this.modules.get(moduleId);
    if (!module) throw new Error(`Module ${moduleId} not found.`);
    await module.suspend();
    console.log(`Module ${moduleId} suspended.`);
  }

  public async resumeModule(moduleId: string): Promise<void> {
    const module = this.modules.get(moduleId);
    if (!module) throw new Error(`Module ${moduleId} not found.`);
    await module.resume();
    console.log(`Module ${moduleId} resumed.`);
  }

  public async destroyModule(moduleId: string): Promise<void> {
    const module = this.modules.get(moduleId);
    if (!module) throw new Error(`Module ${moduleId} not found.`);
    await module.destroy();
    this.modules.delete(moduleId);
    this.contexts.delete(moduleId);
    this.grantedPermissions.delete(moduleId);

    // Unclaim serial ports
    for (const [port, owner] of this.claimedSerialPorts.entries()) {
      if (owner === moduleId) {
        this.claimedSerialPorts.delete(port);
      }
    }

    console.log(`Module ${moduleId} destroyed.`);
  }

  public getModules(): ICivisModule[] {
    return Array.from(this.modules.values());
  }
}

export const moduleManager = new ModuleManager();
