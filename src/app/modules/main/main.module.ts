import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { MainLayoutComponent } from './components/main-layout/main-layout.component';
import { MainRoutingModule } from './main-routing.module';

/**
 * Main module — shell layout with sidebar; loads feature modules as children.
 */
@NgModule({
  declarations: [MainLayoutComponent],
  imports: [SharedModule, MainRoutingModule],
})
export class MainModule {}
