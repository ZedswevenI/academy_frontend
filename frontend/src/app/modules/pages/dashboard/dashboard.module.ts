import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardRoutingModule } from './dashboard.routing.module';

import { SampleComponent } from './sample/sample.component';
import { UiElementsModule } from '../../ui-elements/ui-elements.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DashboardComponent } from './dashboard/dashboard.component';

@NgModule({
  declarations: [
    SampleComponent,
    DashboardComponent
  ],
  imports: [
    CommonModule, 
    DashboardRoutingModule, 
    UiElementsModule,
    ReactiveFormsModule,
    FormsModule
  ],
  exports: []
})
export class DashboardModule {}