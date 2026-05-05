import type { ICivisModule, ICivisModuleContext, CivisPermission } from '../core/ICivisModule';

export class HelloWorldModule implements ICivisModule {
  public id = 'org.civisos.helloworld';
  public name = 'Hello World';
  public version = '1.0.0';
  public author = 'CivisOS Core';
  public icon = '👋';
  public permissions: CivisPermission[] = ['storage:read', 'storage:write', 'hardware:serial', 'mesh:read', 'mesh:write'];

  private context?: ICivisModuleContext;
  private container?: HTMLElement;
  private meshCleanup?: () => void;

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

  public async onSaveState(): Promise<void> {
    console.log(`${this.name} module saving state...`);
    if (this.context) {
      const storage = await this.context.getStorageInstance('hello-world-db');
      await storage.put('last_save', new Date().toISOString());
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
        <div style="margin-top: 15px;">
          <button id="test-serial-btn" style="padding: 5px 10px; cursor: pointer; background: #2c3e50; color: white; border: none; border-radius: 4px;">
            Request Serial Port
          </button>
          <div id="serial-status" style="font-size: 0.8rem; margin-top: 5px;">Not requested</div>
        </div>
        <div style="margin-top: 15px; border-top: 1px solid #555; padding-top: 10px;">
          <strong>Mesh Networking:</strong><br/>
          <button id="test-mesh-btn" style="margin-top: 5px; padding: 5px 10px; cursor: pointer; background: #e67e22; color: white; border: none; border-radius: 4px;">
            Send Mesh Ping
          </button>
          <div id="mesh-status-log" style="font-size: 0.8rem; margin-top: 5px; max-height: 60px; overflow-y: auto; background: #222; padding: 5px;">
            Waiting for packets...
          </div>
        </div>
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

    const serialBtn = this.container.querySelector('#test-serial-btn');
    serialBtn?.addEventListener('click', async () => {
      if (this.context) {
        try {
          const serialGranted = await this.context.requestPermission('hardware:serial');
          if (!serialGranted) {
            alert('Serial permission denied');
            return;
          }
          const port = await this.context.requestSerialPort();
          const status = this.container?.querySelector('#serial-status');
          if (status) status.textContent = 'Port acquired: ' + port;
        } catch (e) {
          console.error('Serial request failed', e);
          const status = this.container?.querySelector('#serial-status');
          if (status) status.textContent = 'Error: ' + (e as Error).message;
        }
      }
    });

    const meshBtn = this.container.querySelector('#test-mesh-btn');
    meshBtn?.addEventListener('click', async () => {
      if (this.context) {
        try {
          const readGranted = await this.context.requestPermission('mesh:read');
          const writeGranted = await this.context.requestPermission('mesh:write');
          if (!readGranted || !writeGranted) {
            alert('Mesh permissions denied');
            return;
          }

          const mesh = this.context.getMeshClient();
          await mesh.send('PING from HelloWorld');

          const log = this.container?.querySelector('#mesh-status-log');
          if (log) {
            const entry = document.createElement('div');
            entry.textContent = `[${new Date().toLocaleTimeString()}] Sent PING`;
            log.appendChild(entry);
          }
        } catch (e) {
          console.error('Mesh send failed', e);
          alert('Error: ' + (e as Error).message);
        }
      }
    });

    if (this.context) {
      try {
        const mesh = this.context.getMeshClient();
        this.meshCleanup = mesh.listen((data: any) => {
          try {
            const log = this.container?.querySelector('#mesh-status-log');
            if (log) {
              const entry = document.createElement('div');
              const message = typeof data === 'string' ? data : new TextDecoder().decode(data);
              entry.textContent = `[${new Date().toLocaleTimeString()}] RECV: ${message}`;
              log.appendChild(entry);
            }
          } catch (err) {
            console.error('Error in HelloWorld mesh listener:', err);
          }
        });
      } catch (e) {
        console.warn('Mesh listen not available yet', e);
      }
    }
  }

  public unmount(): void {
    if (this.meshCleanup) {
      this.meshCleanup();
      this.meshCleanup = undefined;
    }
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
