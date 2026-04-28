import type { ICivisModule, ICivisModuleContext, CivisPermission } from './ICivisModule';

export class ModuleManager {
  private modules: Map<string, ICivisModule> = new Map();
  private contexts: Map<string, ICivisModuleContext> = new Map();
  private grantedPermissions: Map<string, Set<CivisPermission>> = new Map();

  constructor() {
    console.log('ModuleManager initialized');
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
        // In a real OS, this would trigger a UI prompt.
        // For now, we auto-grant if it's in the module's requested permissions.
        const module = this.modules.get(moduleId);
        if (module && module.permissions.includes(permission)) {
          this.grantedPermissions.get(moduleId)?.add(permission);
          console.log(`Permission ${permission} granted to module ${moduleId}`);
          return true;
        }
        console.warn(`Permission ${permission} denied to module ${moduleId}`);
        return false;
      },
      getStorageInstance: async (namespace: string): Promise<any> => {
        const perms = this.grantedPermissions.get(moduleId);
        const hasRead = perms?.has('storage:read');
        const hasWrite = perms?.has('storage:write');

        if (!hasRead && !hasWrite) {
          throw new Error(`Module ${moduleId} does not have storage permissions.`);
        }
        // Return a mock storage instance with granular permission checks
        return {
          dbName: namespace,
          get: async (key: string) => {
            if (!hasRead) throw new Error(`Permission storage:read denied for module ${moduleId}`);
            console.log(`[${moduleId}] Reading ${key} from ${namespace}`);
          },
          put: async (key: string, val: any) => {
            if (!hasWrite) throw new Error(`Permission storage:write denied for module ${moduleId}`);
            console.log(`[${moduleId}] Writing ${key} to ${namespace}`, val);
          },
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
