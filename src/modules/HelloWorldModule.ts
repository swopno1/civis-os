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

  public async mount(container: HTMLElement): Promise<void> {
    this.container = container;

    let lastInit = 'Never';
    let clickCount = 0;

    if (this.context) {
      try {
        const storage = await this.context.getStorageInstance('hello-world-db');
        lastInit = await storage.get('last_init') || 'Never';
        clickCount = await storage.get('click_count') || 0;
      } catch (e) {
        console.warn('Could not load initial data', e);
      }
    }

    this.container.innerHTML = `
      <div style="padding: 20px; color: white; background: #333; border-radius: 8px;">
        <h2>Hello, CivisOS!</h2>
        <p>This is a test module demonstrating the Module API.</p>
        <p>Module ID: <code>${this.id}</code></p>
        <div style="margin: 10px 0; padding: 10px; background: #444; border-radius: 4px;">
          <strong>Persistent State:</strong><br/>
          Last Init: <span id="last-init-display">${lastInit}</span><br/>
          Click Count: <span id="click-count-display">${clickCount}</span>
        </div>
        <div id="storage-status">Ready</div>
        <button id="test-storage-btn" style="margin-top: 10px; padding: 5px 10px; cursor: pointer; background: #2c3e50; color: white; border: none; border-radius: 4px;">
          Increment Click Count
        </button>
      </div>
    `;

    const btn = this.container.querySelector('#test-storage-btn');
    btn?.addEventListener('click', async () => {
      if (this.context) {
        try {
          const status = this.container?.querySelector('#storage-status');
          if (status) status.textContent = 'Writing to storage...';

          const storage = await this.context.getStorageInstance('hello-world-db');
          const currentCount = await storage.get('click_count') || 0;
          const nextCount = currentCount + 1;
          await storage.put('click_count', nextCount);

          const countDisplay = this.container?.querySelector('#click-count-display');
          if (countDisplay) countDisplay.textContent = nextCount.toString();
          if (status) status.textContent = 'Persistent write successful!';
        } catch (e) {
          console.error('Storage access failed', e);
          const status = this.container?.querySelector('#storage-status');
          if (status) status.textContent = 'Error: ' + (e as Error).message;
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
