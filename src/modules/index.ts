import { HelloWorldModule } from './HelloWorldModule.ts';
import { ChatModule } from './ChatModule.ts';
import { SenseModule } from './SenseModule.ts';
import { VaultModule } from './VaultModule.ts';
import { BulletinModule } from './BulletinModule.ts';
import { MeshMarketModule } from './MeshMarketModule.ts';
import type { ICivisModule } from '../core/ICivisModule.ts';

export const CORE_MODULES: Record<string, new () => ICivisModule> = {
  'org.civisos.helloworld': HelloWorldModule,
  'org.civisos.chat': ChatModule,
  'org.civisos.sense': SenseModule,
  'org.civisos.vault': VaultModule,
  'org.civisos.bulletin': BulletinModule,
  'org.civisos.meshmarket': MeshMarketModule,
};
