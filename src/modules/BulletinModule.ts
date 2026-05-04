import { h, render } from 'preact';
import type { ICivisModule, ICivisModuleContext, CivisPermission } from '../core/ICivisModule';
import { Bulletin } from '../ui/modules/Bulletin';

export class BulletinModule implements ICivisModule {
  public id = 'org.civisos.bulletin';
  public name = 'CivisBulletin';
  public icon = '📋';
  public permissions: CivisPermission[] = ['mesh:read', 'mesh:write', 'storage:read', 'storage:write'];

  private context?: ICivisModuleContext;
  private container?: HTMLElement;

  public async init(context: ICivisModuleContext): Promise<void> {
    this.context = context;
    console.log(`${this.name} module initialized`);
  }

  public mount(container: HTMLElement): void {
    this.container = container;
    if (this.context) {
      render(h(Bulletin, { context: this.context }), container);
    }
    console.log(`${this.name} module mounted`);
  }

  public unmount(): void {
    if (this.container) {
      render(null, this.container);
      this.container.innerHTML = '';
    }
    console.log(`${this.name} module unmounted`);
  }

  public async suspend(): Promise<void> {
    console.log(`${this.name} module suspended`);
  }

  public async resume(): Promise<void> {
    console.log(`${this.name} module resumed`);
  }

  public async destroy(): Promise<void> {
    console.log(`${this.name} module destroyed`);
  }
}
