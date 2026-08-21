import { NgModule, Optional, SkipSelf } from '@angular/core';

/**
 * CoreModule holds singleton app-wide services and guards.
 * Import it only once from AppModule.
 */
@NgModule({})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error(
        'CoreModule is already loaded. Import it only in AppModule.',
      );
    }
  }
}
