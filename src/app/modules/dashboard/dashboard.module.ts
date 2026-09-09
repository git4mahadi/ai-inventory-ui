import { NgModule } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import { SharedModule } from '../../shared/shared.module';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardHomeComponent } from './components/dashboard-home/dashboard-home.component';
import { ChatWidgetComponent } from './components/chat-widget/chat-widget.component';

@NgModule({
  declarations: [DashboardHomeComponent, ChatWidgetComponent],
  imports: [SharedModule, DashboardRoutingModule, NgApexchartsModule],
})
export class DashboardModule {}
