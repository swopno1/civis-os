import type { ICivisModule, ICivisModuleContext, CivisPermission } from '../core/ICivisModule.ts';
import { distributionService } from '../core/DistributionService.ts';
import { moduleManager } from '../core/ModuleManager.ts';
import { translationService } from '../core/TranslationService.ts';

export class MeshMarketModule implements ICivisModule {
  public id = 'org.civisos.meshmarket';
  public name = 'Mesh Market';
  public version = '1.0.0';
  public author = 'CivisOS Core';
  public icon = '🏪';
  public permissions: CivisPermission[] = ['mesh:read', 'mesh:write'];
  public translations = {
    en: {
      'market.title': 'MESH MARKET',
      'market.announce': 'Announce My Modules',
      'market.scanning': 'Scanning mesh for available modules...',
      'market.caution': '* CAUTION: Only download modules from trusted peers. Module verification active.',
      'market.request': 'Request Download'
    },
    ar: {
      'market.title': 'سوق الشبكة',
      'market.announce': 'أعلن عن وحداتي',
      'market.scanning': 'جاري البحث في الشبكة عن وحدات متاحة...',
      'market.caution': '* تنبيه: قم بتحميل الوحدات من أقران موثوقين فقط. التحقق من الوحدة نشط.',
      'market.request': 'طلب تحميل'
    }
  };

  private context?: ICivisModuleContext;
  private container?: HTMLElement;
  private cleanup?: () => void;

  public async init(context: ICivisModuleContext): Promise<void> {
    this.context = context;
    console.log(`${this.name} module initialized with context:`, !!this.context);
  }

  public mount(container: HTMLElement): void {
    this.container = container;
    this.render();
    this.cleanup = distributionService.subscribe(() => this.render());
  }

  private render() {
    if (!this.container) return;

    const t = (key: string) => translationService.t(key);

    const available = distributionService.getAvailableModules();
    const modulesHtml = Array.from(available.entries()).map(([id, info]) => `
      <div style="border: 1px solid #00ff00; padding: 10px; margin-bottom: 10px; background: #111;">
        <h4 style="margin: 0; color: #00ff00;">${id}</h4>
        <p style="margin: 5px 0; font-size: 0.8rem;">Version: ${info.version} | Author: ${info.author}</p>
        <p style="margin: 5px 0; font-size: 0.8rem; color: #888;">Available from: ${info.from}</p>
        <button onclick="window.requestModule('${id}')" style="background: #00ff00; color: #000; border: none; padding: 5px 10px; cursor: pointer; font-weight: bold; text-transform: uppercase;">${t('market.request')}</button>
      </div>
    `).join('') || `<p style="color: #888; text-align: center;">${t('market.scanning')}</p>`;

    this.container.innerHTML = `
      <div style="padding: 20px; color: #fff; background: #000; font-family: monospace; height: 100%; box-sizing: border-box; display: flex; flex-direction: column;">
        <header style="border-bottom: 2px solid #00ff00; margin-bottom: 15px; padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0; color: #00ff00;">${t('market.title')}</h2>
          <button id="announce-btn" style="background: transparent; border: 1px solid #00ff00; color: #00ff00; padding: 5px 10px; cursor: pointer; text-transform: uppercase; font-weight: bold;">${t('market.announce')}</button>
        </header>
        <div style="flex: 1; overflow-y: auto;">
          ${modulesHtml}
        </div>
        <footer style="margin-top: 15px; font-size: 0.7rem; color: #ff8c00; border-top: 1px solid #333; padding-top: 10px;">
          ${t('market.caution')}
        </footer>
      </div>
    `;

    // @ts-ignore - expose for the inline onclick for simplicity in this demo module
    window.requestModule = (id: string) => {
      distributionService.requestModule(id);
      alert(`Request sent for ${id} over mesh.`);
    };

    this.container.querySelector('#announce-btn')?.addEventListener('click', () => {
      moduleManager.getModules().forEach(m => {
        distributionService.announceModule(m.id, m.version, m.author);
      });
      alert('Your modules have been announced to the mesh.');
    });
  }

  public unmount(): void {
    if (this.cleanup) this.cleanup();
    if (this.container) this.container.innerHTML = '';
    // @ts-ignore
    delete window.requestModule;
  }

  public async suspend(): Promise<void> {}
  public async resume(): Promise<void> {}
  public async destroy(): Promise<void> {}
}
