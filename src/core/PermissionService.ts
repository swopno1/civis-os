import type { CivisPermission } from './ICivisModule';
import { CivisStorage } from './Storage';

export interface IPermissionRequest {
  moduleId: string;
  permission: CivisPermission;
  resolve: (granted: boolean) => void;
}

export class PermissionService {
  private static instance: PermissionService;
  private queue: IPermissionRequest[] = [];
  private processing = false;
  private onPrompt: (request: IPermissionRequest) => void = () => {};

  private constructor() {}

  public static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  public setOnPrompt(handler: (request: IPermissionRequest) => void) {
    this.onPrompt = handler;
  }

  public async requestPermission(moduleId: string, permission: CivisPermission): Promise<boolean> {
    // Check persistence first
    const savedChoice = await CivisStorage.get<boolean>(`perm:${moduleId}:${permission}`);
    if (savedChoice !== null) {
      return savedChoice;
    }

    return new Promise((resolve) => {
      this.queue.push({ moduleId, permission, resolve: (granted: boolean) => {
        this.persistDecision(moduleId, permission, granted);
        resolve(granted);
        this.processNext();
      }});

      if (!this.processing) {
        this.processNext();
      }
    });
  }

  private async persistDecision(moduleId: string, permission: CivisPermission, granted: boolean) {
    await CivisStorage.set(`perm:${moduleId}:${permission}`, granted);
  }

  private processNext() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const nextRequest = this.queue[0];
    this.onPrompt(nextRequest);
  }

  public completeCurrentRequest(granted: boolean) {
    if (this.queue.length > 0) {
      const request = this.queue.shift();
      request?.resolve(granted);
    }
  }
}

export const permissionService = PermissionService.getInstance();
