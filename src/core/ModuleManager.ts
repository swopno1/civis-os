import type { ICivisModule, ICivisModuleContext, CivisPermission } from './ICivisModule';
import { CivisStorage } from './Storage';

export type PermissionHandler = (moduleId: string, permission: CivisPermission) => Promise<boolean>;

export class ModuleManager {
  private modules: Map<string, ICivisModule> = new Map();
  private contexts: Map<string, ICivisModuleContext> = new Map();
  private grantedPermissions: Map<string, Set<CivisPermission>> = new Map();
  private permissionHandler: PermissionHandler | null = null;

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

        const getFullKey = (key: string) => `mod:${moduleId}:${namespace}:${key}`;

        return {
          dbName: namespace,
          get: async (key: string) => {
            if (!hasRead) throw new Error(`Permission storage:read denied for module ${moduleId}`);
            return await CivisStorage.get(getFullKey(key));
          },
          put: async (key: string, val: any) => {
            if (!hasWrite) throw new Error(`Permission storage:write denied for module ${moduleId}`);
            await CivisStorage.set(getFullKey(key), val);
          },
          delete: async (key: string) => {
            if (!hasWrite) throw new Error(`Permission storage:write denied for module ${moduleId}`);
            await CivisStorage.delete(getFullKey(key));
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
          send: (data: any) => {
            if (!hasWrite) throw new Error(`Permission mesh:write denied for module ${moduleId}`);
            console.log(`[${moduleId}] Mesh send:`, data);
          },
          // Dummy listen method
          listen: (_callback: (data: any) => void) => {
            if (!hasRead) throw new Error(`Permission mesh:read denied for module ${moduleId}`);
            console.log(`[${moduleId}] Mesh listen registered`);
          }
        };
      }
    };
  }

  public mountModule(moduleId: string, container: HTMLElement): void {
    const module = this.modules.get(moduleId);
    if (!module) throw new Error(`Module ${moduleId} not found.`);
    module.mount(container);
    console.log(`Module ${moduleId} mounted.`);
  }

  public unmountModule(moduleId: string): void {
    const module = this.modules.get(moduleId);
    if (!module) throw new Error(`Module ${moduleId} not found.`);
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
    console.log(`Module ${moduleId} destroyed.`);
  }

  public getModules(): ICivisModule[] {
    return Array.from(this.modules.values());
  }
}

export const moduleManager = new ModuleManager();
