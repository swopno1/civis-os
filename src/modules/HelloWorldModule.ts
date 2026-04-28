import type { ICivisModule, ICivisModuleContext, CivisPermission } from '../core/ICivisModule';

export class HelloWorldModule implements ICivisModule {
  public id = 'org.civisos.helloworld';
  public name = 'Hello World';
  public icon = '👋';
  public permissions: CivisPermission[] = ['storage:read', 'storage:write'];

  private context?: ICivisModuleContext;
  private container?: HTMLElement;

  public async init(context: ICivisModuleContext): Promise<void> {
    this.context = context;
    console.log(`${this.name} module initialized`);

    // Request permissions
    const readGranted = await this.context.requestPermission('storage:read');
    const writeGranted = await this.context.requestPermission('storage:write');

    if (readGranted && writeGranted) {
      const storage = await this.context.getStorageInstance('hello-world-db');
      await storage.put('last_init', new Date().toISOString());
      console.log('Successfully wrote to storage during init');
    }
  }

  public mount(container: HTMLElement): void {
    this.container = container;
    this.container.innerHTML = `
      <div style="padding: 20px; color: white; background: #333; border-radius: 8px;">
        <h2>Hello, CivisOS!</h2>
        <p>This is a test module demonstrating the Module API.</p>
        <div id="storage-status">Checking storage...</div>
        <button id="test-storage-btn" style="margin-top: 10px; padding: 5px 10px; cursor: pointer;">
          Test Storage Write
        </button>
      </div>
    `;

    const btn = this.container.querySelector('#test-storage-btn');
    btn?.addEventListener('click', async () => {
      if (this.context) {
        try {
          const storage = await this.context.getStorageInstance('hello-world-db');
          await storage.put('button_click', new Date().toISOString());
          const status = this.container?.querySelector('#storage-status');
          if (status) status.textContent = 'Storage write successful! Check console.';
        } catch (e) {
          console.error('Storage access failed', e);
        }
      }
    });
  }

  public unmount(): void {
    if (this.container) {
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
