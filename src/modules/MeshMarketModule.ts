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

    this.container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'padding: 20px; color: #fff; background: #000; font-family: monospace; height: 100%; box-sizing: border-box; display: flex; flex-direction: column;';

    const header = document.createElement('header');
    header.style.cssText = 'border-bottom: 2px solid #00ff00; margin-bottom: 15px; padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center;';

    const title = document.createElement('h2');
    title.style.cssText = 'margin: 0; color: #00ff00;';
    title.textContent = t('market.title');
    header.appendChild(title);

    const announceBtn = document.createElement('button');
    announceBtn.id = 'announce-btn';
    announceBtn.style.cssText = 'background: transparent; border: 1px solid #00ff00; color: #00ff00; padding: 5px 10px; cursor: pointer; text-transform: uppercase; font-weight: bold;';
    announceBtn.textContent = t('market.announce');
    announceBtn.onclick = () => {
      moduleManager.getModules().forEach(m => {
        distributionService.announceModule(m.id, m.version, m.author);
      });
      alert('Your modules have been announced to the mesh.');
    };
    header.appendChild(announceBtn);
    wrapper.appendChild(header);

    const listContainer = document.createElement('div');
    listContainer.style.cssText = 'flex: 1; overflow-y: auto;';

    const available = distributionService.getAvailableModules();
    if (available.size === 0) {
      const scanningMsg = document.createElement('p');
      scanningMsg.style.cssText = 'color: #888; text-align: center;';
      scanningMsg.textContent = t('market.scanning');
      listContainer.appendChild(scanningMsg);
    } else {
      Array.from(available.entries()).forEach(([id, info]) => {
        const moduleItem = document.createElement('div');
        moduleItem.style.cssText = 'border: 1px solid #00ff00; padding: 10px; margin-bottom: 10px; background: #111;';

        const moduleId = document.createElement('h4');
        moduleId.style.cssText = 'margin: 0; color: #00ff00;';
        moduleId.textContent = id;
        moduleItem.appendChild(moduleId);

        const moduleMeta = document.createElement('p');
        moduleMeta.style.cssText = 'margin: 5px 0; font-size: 0.8rem;';
        moduleMeta.textContent = `Version: ${info.version} | Author: ${info.author}`;
        moduleItem.appendChild(moduleMeta);

        const moduleFrom = document.createElement('p');
        moduleFrom.style.cssText = 'margin: 5px 0; font-size: 0.8rem; color: #888;';
        moduleFrom.textContent = `Available from: ${info.from}`;
        moduleItem.appendChild(moduleFrom);

        const requestBtn = document.createElement('button');
        requestBtn.style.cssText = 'background: #00ff00; color: #000; border: none; padding: 5px 10px; cursor: pointer; font-weight: bold; text-transform: uppercase;';
        requestBtn.textContent = t('market.request');
        requestBtn.onclick = () => {
          distributionService.requestModule(id);
          alert(`Request sent for ${id} over mesh.`);
        };
        moduleItem.appendChild(requestBtn);

        listContainer.appendChild(moduleItem);
      });
    }
    wrapper.appendChild(listContainer);

    const footer = document.createElement('footer');
    footer.style.cssText = 'margin-top: 15px; font-size: 0.7rem; color: #ff8c00; border-top: 1px solid #333; padding-top: 10px;';
    footer.textContent = t('market.caution');
    wrapper.appendChild(footer);

    this.container.appendChild(wrapper);
  }

  public unmount(): void {
    if (this.cleanup) this.cleanup();
    if (this.container) this.container.innerHTML = '';
  }

  public async suspend(): Promise<void> {}
  public async resume(): Promise<void> {}
  public async destroy(): Promise<void> {}
}
