import 'zone.js';
import { platformBrowser } from '@angular/platform-browser';
import { registerAgGridModules } from './app/shared/utils/ag-grid.util';
import { AppModule } from './app/app-module';

registerAgGridModules();

platformBrowser()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err));
